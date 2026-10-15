package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import java.time.Clock
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
    private val tx = TransactionTemplate(transactionManager)

    /** 정책 검사(외부 HTTP)와 해시 계산은 트랜잭션 밖에서, 모든 경로에서 똑같이 수행한다. */
    fun signup(rawEmail: String, password: String, nickname: String) {
        val email = normalizeEmail(rawEmail)
        passwordPolicy.check(password)
        val hash = passwordEncoder.encode(password)!!
        try {
            tx.executeWithoutResult { write(email, hash, nickname.trim()) }
        } catch (_: DataIntegrityViolationException) {
            // 같은 이메일의 동시 가입: 먼저 커밋된 쪽이 인증 메일을 보낸다. 응답은 동일하다.
        }
    }

    private fun write(email: String, hash: String, nickname: String) {
        val existing = users.findByEmail(email)
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
            }
            events.publishEvent(VerificationMailRequested(existing.id, email))
        } else {
            events.publishEvent(AccountExistsMailRequested(email))
        }
    }

    @Transactional
    fun verify(token: String) {
        val userId = tokens.consume(token, TokenPurpose.VERIFY)
            ?: throw ApiException(HttpStatus.BAD_REQUEST, "링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.")
        users.findById(userId).ifPresent { it.emailVerifiedAt = it.emailVerifiedAt ?: clock.instant() }
    }

    @Transactional
    fun resendVerification(rawEmail: String) {
        val user = users.findByEmail(normalizeEmail(rawEmail)) ?: return
        if (user.emailVerifiedAt != null) return
        events.publishEvent(VerificationMailRequested(user.id, user.email))
    }
}
