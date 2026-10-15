package com.tripnote.auth

import com.tripnote.IntegrationTest
import java.time.Duration
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.get

class PasswordResetTest : IntegrationTest() {
    private fun requestReset(email: String) =
        postJson("/api/v1/auth/password-reset", """{"email":"$email"}""")

    private fun confirm(token: String, password: String) =
        postJson("/api/v1/auth/password-reset/confirm", """{"token":"$token","password":"$password"}""")

    @Test
    fun `reset replaces the password and ends existing sessions`() {
        createVerifiedUser("mina@example.com")
        val oldSession = login("mina@example.com")

        requestReset("Mina@Example.com").andExpect { status { isAccepted() } }
        val token = tokenIn(awaitMail("mina@example.com"))
        confirm(token, "new-trip-note-2027").andExpect { status { isOk() } }

        mvc.get("/api/v1/me") { cookie(oldSession) }.andExpect { status { isUnauthorized() } }
        postJson("/api/v1/auth/login", """{"email":"mina@example.com","password":"trip-note-2027"}""")
            .andExpect { status { isUnauthorized() } }
        login("mina@example.com", "new-trip-note-2027")
    }

    @Test
    fun `a reset link works once and expires after 30 minutes`() {
        createVerifiedUser("mina@example.com")
        requestReset("mina@example.com")
        val first = tokenIn(awaitMail("mina@example.com"))
        confirm(first, "new-trip-note-2027").andExpect { status { isOk() } }
        confirm(first, "another-trip-note").andExpect { status { isBadRequest() } }

        mail.sent.clear()
        requestReset("mina@example.com")
        val second = tokenIn(awaitMail("mina@example.com"))
        clock.advance(Duration.ofMinutes(31))
        confirm(second, "another-trip-note").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `unknown emails get the same answer and no mail`() {
        requestReset("nobody@example.com").andExpect {
            status { isAccepted() }
            jsonPath("$.message") { value("가입된 이메일이면 재설정 메일을 보냈어요.") }
        }
        Thread.sleep(500)
        assertThat(mail.sent).isEmpty()
    }

    @Test
    fun `a google-only account is told to use google`() {
        val id = jdbc.sql("INSERT INTO users (email, nickname, email_verified_at) VALUES ('g@example.com', '구글', now()) RETURNING id")
            .query(java.util.UUID::class.java).single()
        jdbc.sql("INSERT INTO user_identities (user_id, provider, provider_subject) VALUES (?, 'google', 'google-sub-1')").param(id).update()

        requestReset("g@example.com").andExpect {
            status { isAccepted() }
            jsonPath("$.message") { value("가입된 이메일이면 재설정 메일을 보냈어요.") }
        }

        assertThat(awaitMail("g@example.com").text).contains("구글로 계속하기")
    }

    @Test
    fun `a weak new password is rejected and the token stays usable`() {
        createVerifiedUser("mina@example.com")
        requestReset("mina@example.com")
        val token = tokenIn(awaitMail("mina@example.com"))

        confirm(token, "short").andExpect { status { isBadRequest() } }
        confirm(token, "new-trip-note-2027").andExpect { status { isOk() } }
    }

    @Test
    fun `resetting an unverified account also verifies the email`() {
        signup("mina@example.com")
        awaitMail("mina@example.com")
        mail.sent.clear()
        requestReset("mina@example.com")
        val token = tokenIn(awaitMail("mina@example.com"))

        confirm(token, "new-trip-note-2027").andExpect { status { isOk() } }

        login("mina@example.com", "new-trip-note-2027")
    }

    @Test
    fun `reset requests are limited per email`() {
        createVerifiedUser("mina@example.com")
        repeat(5) { requestReset("mina@example.com").andExpect { status { isAccepted() } } }

        requestReset("mina@example.com").andExpect { status { isTooManyRequests() } }
    }

    @Test
    fun `signups are limited per ip`() {
        repeat(10) { signup("user$it@example.com").andExpect { status { isAccepted() } } }

        signup("user10@example.com").andExpect { status { isTooManyRequests() } }
    }

    @Test
    fun `verification resends are limited per email`() {
        signup("mina@example.com")
        repeat(5) {
            postJson("/api/v1/auth/verify-email/resend", """{"email":"mina@example.com"}""").andExpect { status { isAccepted() } }
        }

        postJson("/api/v1/auth/verify-email/resend", """{"email":"mina@example.com"}""").andExpect { status { isTooManyRequests() } }
    }

    @Test
    fun `verification resends are limited per ip`() {
        repeat(20) {
            postJson("/api/v1/auth/verify-email/resend", """{"email":"user$it@example.com"}""").andExpect { status { isAccepted() } }
        }

        postJson("/api/v1/auth/verify-email/resend", """{"email":"another@example.com"}""").andExpect { status { isTooManyRequests() } }
    }

    @Test
    fun `wrong passwords on one verification link are throttled`() {
        signup("mina@example.com")
        val token = tokenIn(awaitMail("mina@example.com"))
        val verify = { password: String ->
            postJson("/api/v1/auth/verify-email", """{"token":"$token","password":"$password"}""")
        }
        repeat(5) { verify("wrong-password-$it").andExpect { status { isBadRequest() } } }

        verify("trip-note-2027").andExpect {
            status { isTooManyRequests() }
            jsonPath("$.detail") { value("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.") }
        }
    }
}
