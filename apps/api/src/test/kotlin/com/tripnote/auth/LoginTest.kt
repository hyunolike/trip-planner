package com.tripnote.auth

import com.tripnote.IntegrationTest
import org.assertj.core.api.Assertions.assertThat
import com.tripnote.auth.internal.PasswordLoginService
import com.tripnote.common.ApiException
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.request.RequestPostProcessor
import org.springframework.test.web.servlet.post

class LoginTest : IntegrationTest() {
    @Autowired lateinit var loginService: PasswordLoginService

    private fun loginAttempt(email: String, password: String) =
        postJson("/api/v1/auth/login", """{"email":"$email","password":"$password"}""")

    @Test
    fun `a verified user gets a host-only secure session cookie`() {
        createVerifiedUser("mina@example.com")

        val cookie = login("MINA@example.com")

        assertThat(cookie.secure).isTrue()
        assertThat(cookie.isHttpOnly).isTrue()
        assertThat(cookie.path).isEqualTo("/")
        assertThat(cookie.maxAge).isEqualTo(30 * 24 * 60 * 60)
        assertThat(cookie.domain).isNull()
        mvc.get("/api/v1/me") { cookie(cookie) }.andExpect {
            status { isOk() }
            jsonPath("$.email") { value("mina@example.com") }
            jsonPath("$.nickname") { value("미나") }
        }
    }

    @Test
    fun `wrong password and unknown email look the same`() {
        createVerifiedUser("mina@example.com")
        val message = "이메일 또는 비밀번호를 확인해 주세요."

        loginAttempt("mina@example.com", "wrong-password-1").andExpect {
            status { isUnauthorized() }
            jsonPath("$.detail") { value(message) }
        }
        loginAttempt("nobody@example.com", "wrong-password-1").andExpect {
            status { isUnauthorized() }
            jsonPath("$.detail") { value(message) }
        }
    }

    @Test
    fun `an unverified user is asked to verify first`() {
        signup("mina@example.com")
        awaitMail("mina@example.com")

        loginAttempt("mina@example.com", "trip-note-2027").andExpect {
            status { isForbidden() }
            jsonPath("$.detail") { value("이메일 인증을 먼저 마쳐 주세요. 메일이 없다면 인증 메일을 다시 요청해 주세요.") }
        }
    }

    @Test
    fun `too many attempts for one email are throttled`() {
        createVerifiedUser("mina@example.com")
        repeat(10) { loginAttempt("mina@example.com", "wrong-password-1") }

        loginAttempt("mina@example.com", "trip-note-2027").andExpect {
            status { isTooManyRequests() }
            header { exists("Retry-After") }
            jsonPath("$.detail") { value("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.") }
        }
    }

    @Test
    fun `session cookie header is SameSite Lax without a Domain`() {
        createVerifiedUser("mina@example.com")

        val header = postJson("/api/v1/auth/login", """{"email":"mina@example.com","password":"trip-note-2027"}""")
            .andReturn().response.getHeaders("Set-Cookie").first { it.startsWith("__Host-SESSION=") }

        assertThat(header).contains("SameSite=Lax").contains("Secure").contains("HttpOnly").doesNotContain("Domain=")
    }

    @Test
    fun `failures from one client do not lock the real owner out elsewhere`() {
        createVerifiedUser("mina@example.com")
        repeat(10) { loginAttempt("mina@example.com", "wrong-password-1") }

        postJson("/api/v1/auth/login", """{"email":"mina@example.com","password":"trip-note-2027"}""") {
            with(RequestPostProcessor { it.remoteAddr = "203.0.113.7"; it })
        }.andExpect { status { isOk() } }
    }

    @Test
    fun `logout ends the session`() {
        createVerifiedUser("mina@example.com")
        val cookie = login("mina@example.com")

        mvc.post("/api/v1/auth/logout") { cookie(cookie); with(csrf()) }.andExpect { status { isNoContent() } }

        mvc.get("/api/v1/me") { cookie(cookie) }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `me without a session is unauthorized`() {
        mvc.get("/api/v1/me").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `a login whose verified hash was replaced meanwhile is rejected`() {
        val id = createVerifiedUser("mina@example.com")
        val staleHash = jdbc.sql("SELECT password_hash FROM password_credentials WHERE user_id = ?").param(id)
            .query(String::class.java).single()
        jdbc.sql("UPDATE password_credentials SET password_hash = ? WHERE user_id = ?")
            .params(passwordEncoder.encode("new-trip-note-2027")!!, id).update()

        assertThatThrownBy { loginService.completeLogin(id, staleHash) }
            .isInstanceOfSatisfying(ApiException::class.java) {
                assertThat(it.status.value()).isEqualTo(401)
            }
    }
}
