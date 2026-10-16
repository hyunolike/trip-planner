package com.tripnote.common

import java.time.Clock
import java.time.Duration
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component

/** 고정 창 카운터. 주체(이메일, IP)는 해시해서 키에 넣는다. */
@Component
class RateLimiter(private val redis: StringRedisTemplate, private val clock: Clock) {
    /** 호출마다 횟수를 올리고, 한도를 넘으면 429. */
    fun check(name: String, subject: String, limit: Int, window: Duration) {
        if (increment(name, subject, window) > limit) throw tooMany(window)
    }

    /** 횟수를 올리지 않고, 이미 한도에 도달했으면 429. 실패만 세는 카운터를 확인할 때 쓴다. */
    fun ensureNotExceeded(name: String, subject: String, limit: Int, window: Duration) {
        val count = redis.opsForValue().get(key(name, subject, window))?.toLongOrNull() ?: 0
        if (count >= limit) throw tooMany(window)
    }

    /** 실패 한 번을 기록한다. */
    fun recordFailure(name: String, subject: String, window: Duration) {
        increment(name, subject, window)
    }

    private fun increment(name: String, subject: String, window: Duration): Long {
        val key = key(name, subject, window)
        val count = redis.opsForValue().increment(key) ?: 0
        if (count == 1L) redis.expire(key, window)
        return count
    }

    private fun key(name: String, subject: String, window: Duration) =
        "tripnote:rl:$name:${sha256Hex(subject).take(16)}:${clock.millis() / window.toMillis()}"

    private fun tooMany(window: Duration) =
        ApiException(HttpStatus.TOO_MANY_REQUESTS, "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", retryAfter = window)
}
