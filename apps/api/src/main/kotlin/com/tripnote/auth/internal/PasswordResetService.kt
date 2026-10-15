package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import java.time.Clock
import org.springframework.context.ApplicationEventPublisher
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate

@Service
class PasswordResetService(
    private val users: UserRepository,
    private val identities: UserIdentityRepository,
    private val credentials: PasswordCredentialRepository,
    private val tokens: EmailTokenService,
    private val passwordPolicy: PasswordPolicy,
    private val passwordEncoder: PasswordEncoder,
    private val sessionRevoker: SessionRevoker,
    private val events: ApplicationEventPublisher,
    private val clock: Clock,
    transactionManager: PlatformTransactionManager,
) {
    private val tx = TransactionTemplate(transactionManager)

    /** 어떤 경우에도 호출자에게 계정 존재 여부를 드러내지 않는다. 토큰은 메일 리스너가 발급한다. */
    @Transactional
    fun request(rawEmail: String) {
        val user = users.findByEmail(normalizeEmail(rawEmail)) ?: return
        if (user.status != "active") return
        val providers = identities.findByUserId(user.id).map { it.provider }
        if ("password" !in providers && providers.isNotEmpty()) {
            events.publishEvent(SocialOnlyAccountMailRequested(user.email, providers.first()))
            return
        }
        events.publishEvent(PasswordResetMailRequested(user.id, user.email))
    }

    /**
     * 정책 검사(외부 HTTP)와 Argon2 해시는 트랜잭션 밖에서, 토큰을 소비하기 전에 한다.
     * 이어지는 짧은 트랜잭션은 users 행을 먼저 잠그고 토큰 소비, 자격 증명 쓰기, 세션 폐기를 한다.
     */
    fun confirm(token: String, newPassword: String) {
        val expired = ApiException(HttpStatus.BAD_REQUEST, "링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.")
        passwordPolicy.check(newPassword)
        val hash = passwordEncoder.encode(newPassword)!!
        val userId = tokens.peek(token, TokenPurpose.RESET) ?: throw expired
        tx.executeWithoutResult {
            val user = users.lockById(userId) ?: throw expired
            val consumed = tokens.consume(token, TokenPurpose.RESET) ?: throw expired
            check(consumed == userId)
            val credential = credentials.findById(userId).orElse(null)
            if (credential == null) {
                credentials.save(PasswordCredentialEntity(userId = userId, passwordHash = hash))
            } else {
                credential.passwordHash = hash
                credential.updatedAt = clock.instant()
            }
            if (identities.findByUserId(userId).none { it.provider == "password" }) {
                identities.save(UserIdentityEntity(userId = userId, provider = "password", providerSubject = userId.toString()))
            }
            // 재설정 링크를 연 사람은 그 메일함의 주인이므로 미인증 계정이면 인증된 것으로 처리한다.
            user.emailVerifiedAt = user.emailVerifiedAt ?: clock.instant()
            sessionRevoker.revokeAll(userId)
        }
    }
}
