package com.tripnote.auth.internal

import com.tripnote.auth.SystemUsers
import java.time.Clock
import java.time.OffsetDateTime
import java.util.UUID
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SystemUsersImpl(
    private val users: UserRepository,
    private val jdbc: JdbcClient,
    private val clock: Clock,
) : SystemUsers {
    @Transactional
    override fun ensure(email: String, nickname: String): UUID {
        val normalized = normalizeEmail(email)
        users.findByEmail(normalized)?.let { return verified(it, normalized) }
        // 첫 기동 경합: 유니크 위반 예외는 트랜잭션을 망가뜨리므로 ON CONFLICT로 흡수하고 다시 읽는다.
        jdbc.sql("INSERT INTO users (email, nickname, email_verified_at, status) VALUES (?, ?, ?, 'system') ON CONFLICT (email) DO NOTHING")
            .params(normalized, nickname, OffsetDateTime.ofInstant(clock.instant(), java.time.ZoneOffset.UTC))
            .update()
        return verified(users.findByEmail(normalized)!!, normalized)
    }

    private fun verified(user: UserEntity, email: String): UUID {
        check(user.status == "system") { "system user email $email belongs to a non-system account" }
        return user.id
    }
}
