package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import java.time.Clock
import java.sql.SQLException
import java.util.UUID
import org.hibernate.exception.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate

fun normalizeEmail(email: String) = email.trim().lowercase()

@Service
class SignupService(
    private val users: UserRepository,
    private val identities: UserIdentityRepository,
    private val credentials: PasswordCredentialRepository,
    private val tokens: EmailTokenService,
    private val passwordEncoder: PasswordEncoder,
    private val passwordPolicy: PasswordPolicy,
    private val events: ApplicationEventPublisher,
    private val clock: Clock,
    transactionManager: PlatformTransactionManager,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val tx = TransactionTemplate(transactionManager)

    /** 정책 검사(외부 HTTP)와 해시 계산은 트랜잭션 밖에서, 모든 경로에서 똑같이 수행한다. */
    fun signup(rawEmail: String, password: String, nickname: String) {
        val email = normalizeEmail(rawEmail)
        passwordPolicy.check(password)
        val hash = passwordEncoder.encode(password)!!
        try {
            tx.executeWithoutResult { write(email, hash, nickname.trim()) }
        } catch (exception: DataIntegrityViolationException) {
            // 같은 이메일의 동시 가입: 먼저 커밋된 쪽이 인증 메일을 보낸다. 응답은 동일하다.
            if (!isDuplicateEmail(exception)) {
                log.error("signup failed with an unexpected integrity violation", exception)
                throw exception
            }
        }
    }

    private fun isDuplicateEmail(exception: Throwable): Boolean =
        generateSequence(exception) { it.cause }.any {
            (it is ConstraintViolationException && it.constraintName == "users_email_key") ||
                (it is SQLException && it.message?.contains("users_email_key") == true)
        }

    private fun write(email: String, hash: String, nickname: String) {
        val existing = users.lockByEmail(email)
        if (existing == null) {
            val user = users.saveAndFlush(UserEntity(email = email, nickname = nickname))
            identities.save(UserIdentityEntity(userId = user.id, provider = "password", providerSubject = user.id.toString()))
            credentials.save(PasswordCredentialEntity(userId = user.id, passwordHash = hash))
            events.publishEvent(VerificationMailRequested(user.id, email))
        } else if (existing.emailVerifiedAt == null) {
            // 미인증 계정에 다시 가입하면 비밀번호와 닉네임을 새 값으로 교체한다(선점 방지).
            existing.nickname = nickname
            val credential = credentials.findById(existing.id).orElse(null)
            if (credential != null) {
                credential.passwordHash = hash
                credential.updatedAt = clock.instant()
            } else {
                credentials.save(PasswordCredentialEntity(userId = existing.id, passwordHash = hash))
                if (identities.findByUserId(existing.id).none { it.provider == "password" }) {
                    identities.save(UserIdentityEntity(userId = existing.id, provider = "password", providerSubject = existing.id.toString()))
                }
            }
            events.publishEvent(VerificationMailRequested(existing.id, email))
        } else {
            events.publishEvent(AccountExistsMailRequested(email))
        }
    }

    /** 토큰을 소비하기 전에 가입 때 정한 비밀번호를 확인한다. Argon2 검증은 트랜잭션 밖에서 한다. */
    fun verify(token: String, password: String) {
        val expired = ApiException(HttpStatus.BAD_REQUEST, "링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.")
        val userId = tokens.peek(token, TokenPurpose.VERIFY) ?: throw expired
        val hash = credentials.findById(userId).orElse(null)?.passwordHash
        if (hash == null || !passwordEncoder.matches(password, hash)) {
            throw ApiException(HttpStatus.BAD_REQUEST, "비밀번호가 맞지 않아요. 가입할 때 정한 비밀번호를 입력해 주세요.")
        }
        completeVerification(userId, token, hash)
    }

    /**
     * 비밀번호 확인 뒤 이어지는 짧은 트랜잭션. users 행을 잠그고 자격 증명이 확인한 해시 그대로인지 다시 본다.
     * 재가입도 같은 users 행 잠금 아래에서만 자격 증명을 바꾸므로, users 행 하나만 잠가도 두 경로가 직렬화된다.
     */
    fun completeVerification(userId: UUID, token: String, checkedHash: String) {
        tx.executeWithoutResult {
            val user = users.lockById(userId)
            val current = credentials.findById(userId).orElse(null)?.passwordHash
            if (user == null || current != checkedHash) {
                throw ApiException(HttpStatus.BAD_REQUEST, "비밀번호가 맞지 않아요. 가입할 때 정한 비밀번호를 입력해 주세요.")
            }
            val consumed = tokens.consume(token, TokenPurpose.VERIFY)
                ?: throw ApiException(HttpStatus.BAD_REQUEST, "링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.")
            user.emailVerifiedAt = user.emailVerifiedAt ?: clock.instant()
            check(consumed == userId)
        }
    }

    @Transactional
    fun resendVerification(rawEmail: String) {
        val user = users.findByEmail(normalizeEmail(rawEmail)) ?: return
        if (user.emailVerifiedAt != null) return
        events.publishEvent(VerificationMailRequested(user.id, user.email))
    }
}
