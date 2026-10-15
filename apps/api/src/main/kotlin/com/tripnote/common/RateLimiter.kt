package com.tripnote.common

import java.time.Clock
import java.time.Duration
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component

/** 고정 창 카운터. 주체(이메일, IP)는 해시해서 키에 넣는다. */
@Component
class RateLimiter(private val redis: StringRedisTemplate, private val clock: Clock) {
    fun check(name: String, subject: String, limit: Int, window: Duration) {
        val bucket = clock.millis() / window.toMillis()
        val key = "tripnote:rl:$name:${sha256Hex(subject).take(16)}:$bucket"
        val count = redis.opsForValue().increment(key) ?: 0
        if (count == 1L) redis.expire(key, window)
        if (count > limit) {
            throw ApiException(HttpStatus.TOO_MANY_REQUESTS, "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", retryAfter = window)
        }
    }
}
