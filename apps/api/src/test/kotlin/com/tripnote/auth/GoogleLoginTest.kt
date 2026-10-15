package com.tripnote.auth

import com.tripnote.IntegrationTest
import com.tripnote.auth.internal.ExternalProfile
import com.tripnote.auth.internal.IdentityService
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.test.web.servlet.get

class GoogleLoginTest : IntegrationTest() {
    @Autowired lateinit var identities: IdentityService

    private fun google(subject: String = "google-sub-1", email: String? = "Mina@Example.com", verified: Boolean = true) =
        ExternalProfile(provider = "google", subject = subject, email = email, emailVerified = verified, name = "미나", picture = "https://lh3.googleusercontent.com/a/photo")

    private fun count(sql: String) = jdbc.sql(sql).query(Int::class.java).single()

    @Test
    fun `the authorization endpoint redirects to google`() {
        mvc.get("/oauth2/authorization/google").andExpect {
            status { is3xxRedirection() }
            header { string("Location", org.hamcrest.Matchers.startsWith("https://accounts.google.com/o/oauth2/v2/auth")) }
        }
    }

    @Test
    fun `a first google login creates a verified user`() {
        val user = identities.resolveExternal(google())

        assertThat(user.email).isEqualTo("mina@example.com")
        assertThat(count("SELECT count(*) FROM users WHERE email_verified_at IS NOT NULL AND avatar_url IS NOT NULL")).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM user_identities WHERE provider = 'google' AND provider_subject = 'google-sub-1'")).isEqualTo(1)
    }

    @Test
    fun `the same google subject returns the same user`() {
        val first = identities.resolveExternal(google())
        val second = identities.resolveExternal(google(email = "changed@example.com"))

        assertThat(second.userId).isEqualTo(first.userId)
    }

    @Test
    fun `google links to an existing verified email account`() {
        val existing = createVerifiedUser("mina@example.com")

        val user = identities.resolveExternal(google())

        assertThat(user.userId).isEqualTo(existing)
        assertThat(count("SELECT count(*) FROM user_identities WHERE user_id = '$existing'")).isEqualTo(2)
    }

    @Test
    fun `google replaces an unverified email account instead of linking to it`() {
        signup("mina@example.com")
        val squatter = jdbc.sql("SELECT id FROM users WHERE email = 'mina@example.com'").query(UUID::class.java).single()

        val user = identities.resolveExternal(google())

        assertThat(user.userId).isNotEqualTo(squatter)
        assertThat(count("SELECT count(*) FROM users")).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM password_credentials")).isZero()
    }

    @Test
    fun `a google account without a verified email is refused`() {
        assertThatThrownBy { identities.resolveExternal(google(verified = false)) }
            .isInstanceOf(OAuth2AuthenticationException::class.java)
        assertThat(count("SELECT count(*) FROM users")).isZero()
    }
}
