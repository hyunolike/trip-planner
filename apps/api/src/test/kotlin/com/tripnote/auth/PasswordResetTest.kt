package com.tripnote.auth

import com.tripnote.IntegrationTest
import java.time.Duration
import org.assertj.core.api.Assertions.assertThat
import org.awaitility.kotlin.atMost
import org.awaitility.kotlin.await
import org.awaitility.kotlin.until
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.get

class PasswordResetTest : IntegrationTest() {
    private fun requestReset(email: String) =
        postJson("/api/v1/auth/password-reset", """{"email":"$email"}""")

    private fun confirm(token: String, password: String) =
        postJson("/api/v1/auth/password-reset/confirm", """{"token":"$token","password":"$password"}""")

    /** 비동기 메일 리스너가 이 테스트의 메일을 모두 보낸 뒤에 끝나, 다음 테스트로 메일이 새지 않게 한다. */
    private fun settleMails(count: Int) {
        await atMost Duration.ofSeconds(10) until { mail.sent.size >= count }
    }

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
        settleMails(5)
    }

    @Test
    fun `signups are limited per ip`() {
        repeat(10) { signup("user$it@example.com").andExpect { status { isAccepted() } } }

        signup("user10@example.com").andExpect { status { isTooManyRequests() } }
        settleMails(10)
    }

    @Test
    fun `verification resends are limited per email`() {
        signup("mina@example.com")
        repeat(5) {
            postJson("/api/v1/auth/verify-email/resend", """{"email":"mina@example.com"}""").andExpect { status { isAccepted() } }
        }

        postJson("/api/v1/auth/verify-email/resend", """{"email":"mina@example.com"}""").andExpect { status { isTooManyRequests() } }
        settleMails(6)
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

    @Test
    fun `reset requests are limited per ip`() {
        repeat(20) { requestReset("user$it@example.com").andExpect { status { isAccepted() } } }

        requestReset("another@example.com").andExpect { status { isTooManyRequests() } }
    }

    @Test
    fun `confirm attempts are limited per ip`() {
        repeat(20) { confirm("bogus-token-$it", "new-trip-note-2027").andExpect { status { isBadRequest() } } }

        confirm("bogus-token-x", "new-trip-note-2027").andExpect { status { isTooManyRequests() } }
    }

    @Test
    fun `an unknown token is rejected before the password is even checked`() {
        confirm("bogus-token", "short").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.") }
        }
    }

    @Test
    fun `a non-active account cannot get a credential through reset`() {
        val id = createVerifiedUser("mina@example.com")
        requestReset("mina@example.com")
        val token = tokenIn(awaitMail("mina@example.com"))
        jdbc.sql("UPDATE users SET status = 'system' WHERE id = ?").param(id).update()

        confirm(token, "new-trip-note-2027").andExpect { status { isBadRequest() } }

        postJson("/api/v1/auth/login", """{"email":"mina@example.com","password":"new-trip-note-2027"}""")
            .andExpect { status { isUnauthorized() } }
    }
}
