package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import java.time.Clock
import org.springframework.context.ApplicationEventPublisher
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

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
) {
    @Transactional
    fun signup(rawEmail: String, password: String, nickname: String) {
        val email = normalizeEmail(rawEmail)
        passwordPolicy.check(password)

        val existing = users.findByEmailIgnoreCase(email)
        if (existing != null) {
            if (existing.emailVerifiedAt == null) {
                events.publishEvent(VerificationMailRequested(email, tokens.issue(existing.id, TokenPurpose.VERIFY)))
            } else {
                events.publishEvent(AccountExistsMailRequested(email))
            }
            return
        }

        val user = users.saveAndFlush(UserEntity(email = email, nickname = nickname.trim()))
        identities.save(UserIdentityEntity(userId = user.id, provider = "password", providerSubject = user.id.toString()))
        credentials.save(PasswordCredentialEntity(userId = user.id, passwordHash = passwordEncoder.encode(password)!!))
        events.publishEvent(VerificationMailRequested(email, tokens.issue(user.id, TokenPurpose.VERIFY)))
    }

    @Transactional
    fun verify(token: String) {
        val userId = tokens.consume(token, TokenPurpose.VERIFY)
            ?: throw ApiException(HttpStatus.BAD_REQUEST, "링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.")
        users.findById(userId).ifPresent { it.emailVerifiedAt = it.emailVerifiedAt ?: clock.instant() }
    }

    @Transactional
    fun resendVerification(rawEmail: String) {
        val user = users.findByEmailIgnoreCase(normalizeEmail(rawEmail)) ?: return
        if (user.emailVerifiedAt != null) return
        events.publishEvent(VerificationMailRequested(user.email, tokens.issue(user.id, TokenPurpose.VERIFY)))
    }
}
