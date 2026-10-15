package com.tripnote.auth.internal

import com.tripnote.common.sha256Hex
import java.security.SecureRandom
import java.time.Clock
import java.time.Duration
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Base64
import java.util.UUID
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

enum class TokenPurpose(val dbValue: String, val ttl: Duration) {
    VERIFY("verify", Duration.ofHours(24)),
    RESET("reset", Duration.ofMinutes(30)),
}

@Service
class EmailTokenService(
    private val tokens: EmailTokenRepository,
    private val jdbc: JdbcClient,
    private val clock: Clock,
) {
    private val random = SecureRandom()

    private fun now(): OffsetDateTime = OffsetDateTime.ofInstant(clock.instant(), ZoneOffset.UTC)

    /** 새 토큰을 발급하고, 같은 용도로 이 사용자에게 발급된 이전의 미사용 토큰은 모두 무효화한다. */
    @Transactional
    fun issue(userId: UUID, purpose: TokenPurpose): String {
        jdbc.sql("UPDATE email_tokens SET used_at = :now WHERE user_id = :userId AND purpose = :purpose AND used_at IS NULL")
            .param("now", now()).param("userId", userId).param("purpose", purpose.dbValue).update()
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

    /** 유효하면 원자적으로 사용 처리하고 사용자 id를 돌려준다. 없거나, 용도가 다르거나, 만료됐거나, 이미 썼으면 null. */
    @Transactional
    fun consume(token: String, purpose: TokenPurpose): UUID? =
        jdbc.sql(
            """
            UPDATE email_tokens SET used_at = :now
            WHERE token_hash = :hash AND purpose = :purpose AND used_at IS NULL AND expires_at > :now
            RETURNING user_id
            """.trimIndent(),
        ).param("now", now()).param("hash", sha256Hex(token)).param("purpose", purpose.dbValue)
            .query(UUID::class.java).optional().orElse(null)
}
