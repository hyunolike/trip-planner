package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import com.tripnote.common.sha1Hex
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException

fun interface BreachedPasswordChecker {
    fun isBreached(password: String): Boolean
}

/** Have I Been Pwned 범위 조회. 해시 앞 5자리만 보내고, 실패하면 가입을 막지 않는다. */
@Component
class HibpBreachedPasswordChecker(builder: RestClient.Builder) : BreachedPasswordChecker {
    private val log = LoggerFactory.getLogger(javaClass)
    private val client = builder.baseUrl("https://api.pwnedpasswords.com").build()

    override fun isBreached(password: String): Boolean {
        val hash = sha1Hex(password).uppercase()
        val prefix = hash.take(5)
        val suffix = hash.drop(5)
        return try {
            val body = client.get().uri("/range/{prefix}", prefix).header("Add-Padding", "true")
                .retrieve().body(String::class.java) ?: return false
            body.lineSequence().any { line ->
                val (candidate, count) = line.trim().split(':').let { it[0] to it.getOrElse(1) { "0" } }
                candidate == suffix && count.trim() != "0"
            }
        } catch (exception: RestClientException) {
            log.warn("breached password check unavailable: {}", exception.message)
            false
        }
    }
}

@Component
class PasswordPolicy(private val breached: BreachedPasswordChecker) {
    fun check(password: String) {
        if (password.length < 10) throw ApiException(HttpStatus.BAD_REQUEST, "비밀번호는 10자 이상이어야 해요.")
        if (password.length > 128) throw ApiException(HttpStatus.BAD_REQUEST, "비밀번호는 128자 이하여야 해요.")
        if (breached.isBreached(password)) throw ApiException(HttpStatus.BAD_REQUEST, "유출된 적 있는 비밀번호예요. 다른 비밀번호를 써 주세요.")
    }
}
