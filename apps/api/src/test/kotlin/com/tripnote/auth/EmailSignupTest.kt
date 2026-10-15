package com.tripnote.auth

import com.tripnote.IntegrationTest
import com.tripnote.common.sha256Hex
import java.time.Duration
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class EmailSignupTest : IntegrationTest() {
    private fun count(sql: String, vararg params: Any) =
        jdbc.sql(sql).params(*params).query(Int::class.java).single()

    @Test
    fun `signup stores a normalized unverified user and mails a verification link`() {
        signup("Mina@Example.com").andExpect {
            status { isAccepted() }
            jsonPath("$.message") { value("인증 메일을 보냈어요. 메일함을 확인해 주세요.") }
        }

        val message = awaitMail("mina@example.com")
        val token = tokenIn(message)
        assertThat(message.text).contains("http://localhost:3000/verify-email?token=")
        assertThat(count("SELECT count(*) FROM users WHERE email = 'mina@example.com' AND email_verified_at IS NULL")).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM user_identities WHERE provider = 'password'")).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM email_tokens WHERE token_hash = ?", sha256Hex(token))).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM email_tokens WHERE token_hash = ?", token)).isZero()
    }

    @Test
    fun `verifying the link marks the email verified once`() {
        signup("mina@example.com")
        val token = tokenIn(awaitMail("mina@example.com"))

        postJson("/api/v1/auth/verify-email", """{"token":"$token"}""").andExpect { status { isOk() } }
        assertThat(count("SELECT count(*) FROM users WHERE email_verified_at IS NOT NULL")).isEqualTo(1)

        postJson("/api/v1/auth/verify-email", """{"token":"$token"}""").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.") }
        }
    }

    @Test
    fun `an expired verification link is rejected`() {
        signup("mina@example.com")
        val token = tokenIn(awaitMail("mina@example.com"))
        clock.advance(Duration.ofHours(25))

        postJson("/api/v1/auth/verify-email", """{"token":"$token"}""").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `short and breached passwords are rejected with a reason`() {
        signup("mina@example.com", password = "short").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("비밀번호는 10자 이상이어야 해요.") }
        }
        signup("mina@example.com", password = "password1234").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("유출된 적 있는 비밀번호예요. 다른 비밀번호를 써 주세요.") }
        }
        assertThat(count("SELECT count(*) FROM users")).isZero()
    }

    @Test
    fun `signing up with a verified email answers the same and mails a notice instead`() {
        signup("mina@example.com")
        postJson("/api/v1/auth/verify-email", """{"token":"${tokenIn(awaitMail("mina@example.com"))}"}""")
        mail.sent.clear()

        signup("MINA@example.com", nickname = "다른사람").andExpect { status { isAccepted() } }

        assertThat(awaitMail("mina@example.com").text).contains("이미 가입된 이메일이에요")
        assertThat(count("SELECT count(*) FROM users")).isEqualTo(1)
    }

    @Test
    fun `resend issues a new link for an unverified account and stays silent otherwise`() {
        signup("mina@example.com")
        awaitMail("mina@example.com")
        mail.sent.clear()

        postJson("/api/v1/auth/verify-email/resend", """{"email":"mina@example.com"}""").andExpect { status { isAccepted() } }
        assertThat(awaitMail("mina@example.com").text).contains("verify-email?token=")

        postJson("/api/v1/auth/verify-email/resend", """{"email":"nobody@example.com"}""").andExpect { status { isAccepted() } }
    }

    @Test
    fun `invalid input is rejected before touching the database`() {
        postJson("/api/v1/auth/signup", """{"email":"not-an-email","password":"trip-note-2027","nickname":"미나"}""").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("입력값을 확인해 주세요.") }
        }
    }
}
