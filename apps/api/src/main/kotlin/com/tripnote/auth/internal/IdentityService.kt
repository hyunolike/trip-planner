package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import java.time.Clock
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

data class ExternalProfile(
    val provider: String,
    val subject: String,
    val email: String?,
    val emailVerified: Boolean,
    val name: String?,
    val picture: String?,
)

@Service
class IdentityService(
    private val users: UserRepository,
    private val identities: UserIdentityRepository,
    private val clock: Clock,
) {
    @Transactional
    fun resolveExternal(profile: ExternalProfile): SessionUser {
        identities.findByProviderAndProviderSubject(profile.provider, profile.subject)?.let { identity ->
            return users.findById(identity.userId).orElseThrow().toSession()
        }

        val email = profile.email?.let(::normalizeEmail)
        if (email == null || !profile.emailVerified) {
            throw OAuth2AuthenticationException(OAuth2Error("email_not_verified", "이메일 인증이 된 구글 계정으로 로그인해 주세요.", null))
        }

        // 가입, 인증 메일 확인과 같은 users 행을 먼저 잠근 뒤에 연결, 삭제, 생성을 결정한다(잠금 순서: users -> identities).
        val existing = users.lockByEmail(email)
        if (existing != null && existing.emailVerifiedAt != null) {
            identities.save(UserIdentityEntity(userId = existing.id, provider = profile.provider, providerSubject = profile.subject))
            return existing.toSession()
        }
        if (existing != null) {
            // 소유를 증명하지 않은 미인증 계정은 연결하지 않고 지운다. 연결하면 남의 이메일로 먼저 가입한 사람이 계정을 가로챌 수 있다.
            users.delete(existing)
            users.flush()
        }

        val user = users.saveAndFlush(
            UserEntity(
                email = email,
                nickname = (profile.name ?: email.substringBefore('@')).take(30),
                emailVerifiedAt = clock.instant(),
                avatarUrl = profile.picture,
            ),
        )
        identities.save(UserIdentityEntity(userId = user.id, provider = profile.provider, providerSubject = profile.subject))
        return user.toSession()
    }

    private fun UserEntity.toSession() = SessionUser(id, email, nickname)
}
