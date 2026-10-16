package com.tripnote.auth

import com.tripnote.IntegrationTest
import com.tripnote.auth.internal.ExternalProfile
import com.tripnote.auth.internal.IdentityService
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import com.tripnote.auth.internal.TokenPurpose
import java.time.Duration
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import org.awaitility.kotlin.atMost
import org.awaitility.kotlin.await
import org.awaitility.kotlin.until
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.eq
import org.mockito.Mockito.doAnswer
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.test.web.servlet.get
import com.tripnote.auth.SessionUser
import com.tripnote.auth.internal.AuthMailer
import com.tripnote.auth.internal.GoogleLoginFailureHandler
import com.tripnote.auth.internal.GoogleLoginSuccessHandler
import com.tripnote.auth.internal.GoogleOidcUserService
import com.tripnote.auth.internal.TripnoteOidcUser
import com.tripnote.auth.internal.VerificationMailRequested
import com.tripnote.common.TripnoteProperties
import java.time.Instant
import com.tripnote.auth.internal.EmailTokenService
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean
import org.springframework.test.util.AopTestUtils
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.core.oidc.OidcIdToken
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser

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
    fun `the google redirect uri points at the web origin, not the api host`() {
        val expected = "${props.webBaseUrl}/login/oauth2/code/google"
        mvc.get("/oauth2/authorization/google").andExpect {
            header { string("Location", org.hamcrest.Matchers.containsString("redirect_uri=$expected")) }
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

    @Autowired lateinit var oidcUserService: GoogleOidcUserService
    @Autowired lateinit var successHandler: GoogleLoginSuccessHandler
    @Autowired lateinit var failureHandler: GoogleLoginFailureHandler
    @Autowired lateinit var mailer: AuthMailer
    @MockitoSpyBean lateinit var tokens: EmailTokenService
    @Autowired lateinit var props: TripnoteProperties

    @Test
    fun `a blank google name falls back to the email local part`() {
        val user = identities.resolveExternal(google().copy(name = "  "))

        assertThat(user.nickname).isEqualTo("mina")
    }

    @Test
    fun `a data integrity violation is retried once`() {
        var calls = 0
        val expected = identities.resolveExternal(google())
        val user = oidcUserService.resolveWithRetry(google()) {
            if (calls++ == 0) throw DataIntegrityViolationException("users_email_key")
            identities.resolveExternal(it)
        }

        assertThat(calls).isEqualTo(2)
        assertThat(user.userId).isEqualTo(expected.userId)
    }

    @Test
    fun `a repeated data integrity violation becomes an account conflict`() {
        assertThatThrownBy { oidcUserService.resolveWithRetry(google()) { throw DataIntegrityViolationException("dup") } }
            .isInstanceOf(OAuth2AuthenticationException::class.java)
            .extracting { (it as OAuth2AuthenticationException).error.errorCode }.isEqualTo("account_conflict")
    }

    @Test
    fun `a system account is never linked or deleted`() {
        jdbc.sql("INSERT INTO users (email, nickname, status) VALUES ('mina@example.com', '시스템', 'system')").update()

        assertThatThrownBy { identities.resolveExternal(google()) }
            .isInstanceOf(OAuth2AuthenticationException::class.java)
            .extracting { (it as OAuth2AuthenticationException).error.errorCode }.isEqualTo("account_unavailable")
        assertThat(count("SELECT count(*) FROM users WHERE status = 'system'")).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM user_identities")).isZero()
    }

    @Test
    fun `a second google identity for the same user is refused`() {
        val existing = createVerifiedUser("mina@example.com")
        identities.resolveExternal(google())

        assertThatThrownBy { identities.resolveExternal(google(subject = "google-sub-2")) }
            .isInstanceOf(OAuth2AuthenticationException::class.java)
            .extracting { (it as OAuth2AuthenticationException).error.errorCode }.isEqualTo("account_conflict")
        assertThat(count("SELECT count(*) FROM user_identities WHERE user_id = '$existing'")).isEqualTo(2)
    }

    @Test
    fun `the mailer skips a verification mail for a deleted user`() {
        // @Async 프록시를 거치면 호출이 바로 돌아와 아무것도 검증하지 못한다. 대상 객체를 직접 불러 동기로 실행한다.
        val target = AopTestUtils.getUltimateTargetObject<AuthMailer>(mailer)

        target.on(VerificationMailRequested(UUID.randomUUID(), "gone@example.com"))

        verifyNoInteractions(tokens)
        assertThat(mail.sent).isEmpty()
    }

    @Test
    fun `a user deleted while the verification mail is being issued does not strand the event`() {
        // 구글 로그인이 미인증 계정을 지우는 순간과 인증 메일 리스너가 겹치는 경우를 그대로 만든다.
        var deletion: CompletableFuture<Int>? = null
        doAnswer { invocation ->
            deletion = CompletableFuture.supplyAsync {
                jdbc.sql("DELETE FROM users WHERE email = 'mina@example.com'").update()
            }
            try { deletion!!.get(1, TimeUnit.SECONDS) } catch (_: TimeoutException) {}
            invocation.callRealMethod()
        }.`when`(tokens).issue(any() ?: UUID(0, 0), eq(TokenPurpose.VERIFY) ?: TokenPurpose.VERIFY)

        signup("mina@example.com")

        await atMost Duration.ofSeconds(10) until {
            count("SELECT count(*) FROM event_publication") == 0
        }
        await atMost Duration.ofSeconds(10) until { deletion?.isDone == true }
        assertThat(count("SELECT count(*) FROM users")).isZero()
        assertThat(count("SELECT count(*) FROM email_tokens")).isZero()
    }

    @Test
    fun `the generated login page is not served`() {
        mvc.get("/login").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `the success handler signs in with a session user and redirects home`() {
        val sessionUser = SessionUser(UUID.randomUUID(), "mina@example.com", "미나")
        val idToken = OidcIdToken("t", Instant.now(), Instant.now().plusSeconds(60), mapOf("sub" to "s"))
        val principal = TripnoteOidcUser(DefaultOidcUser(listOf(SimpleGrantedAuthority("OIDC_USER")), idToken), sessionUser)
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()
        try {
            successHandler.onAuthenticationSuccess(
                request, response,
                UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.authorities),
            )

            val authentication = SecurityContextHolder.getContext().authentication
            assertThat(authentication).isInstanceOf(UsernamePasswordAuthenticationToken::class.java)
            assertThat(authentication!!.principal).isEqualTo(sessionUser)
            assertThat(request.getSession(false)).isNotNull()
            assertThat(response.redirectedUrl).isEqualTo("${props.webBaseUrl}/")
        } finally {
            SecurityContextHolder.clearContext()
        }
    }

    @Test
    fun `the failure handler redirects without leaking the reason`() {
        val response = MockHttpServletResponse()

        failureHandler.onAuthenticationFailure(
            MockHttpServletRequest(), response,
            OAuth2AuthenticationException(OAuth2Error("account_conflict", "secret detail", null)),
        )

        assertThat(response.redirectedUrl).isEqualTo("${props.webBaseUrl}/login?error=google")
    }
}
