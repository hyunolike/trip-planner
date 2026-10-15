package com.tripnote.auth.internal

import com.tripnote.common.sha256Hex
import java.security.SecureRandom
import java.time.Clock
import java.time.Duration
import java.util.Base64
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

enum class TokenPurpose(val dbValue: String, val ttl: Duration) {
    VERIFY("verify", Duration.ofHours(24)),
    RESET("reset", Duration.ofMinutes(30)),
}

@Service
class EmailTokenService(private val tokens: EmailTokenRepository, private val clock: Clock) {
    private val random = SecureRandom()

    @Transactional
    fun issue(userId: UUID, purpose: TokenPurpose): String {
        val bytes = ByteArray(32).also(random::nextBytes)
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        tokens.save(
            EmailTokenEntity(
                userId = userId,
                purpose = purpose.dbValue,
                tokenHash = sha256Hex(token),
                expiresAt = clock.instant().plus(purpose.ttl),
            ),
        )
        return token
    }

    /** 유효하면 사용 처리하고 사용자 id를 돌려준다. 없거나, 용도가 다르거나, 만료됐거나, 이미 썼으면 null. */
    @Transactional
    fun consume(token: String, purpose: TokenPurpose): UUID? {
        val entity = tokens.findByTokenHash(sha256Hex(token)) ?: return null
        val now = clock.instant()
        if (entity.purpose != purpose.dbValue || entity.usedAt != null || !entity.expiresAt.isAfter(now)) return null
        entity.usedAt = now
        return entity.userId
    }
}
