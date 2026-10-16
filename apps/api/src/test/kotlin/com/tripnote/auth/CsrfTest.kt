package com.tripnote.auth

import com.tripnote.IntegrationTest
import jakarta.servlet.http.Cookie
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.security.test.web.support.WebTestUtils
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.web.context.WebApplicationContext
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

class CsrfTest : IntegrationTest() {
    @Autowired lateinit var context: WebApplicationContext

    /**
     * 다른 테스트의 csrf() 후처리기가 공유 CsrfFilter의 저장소를 테스트용으로 바꿔 둔다.
     * 실제 쿠키 저장소로 되돌려야 이 경로의 쿠키 발급을 검증할 수 있다.
     */
    @BeforeEach
    fun restoreCookieRepository() {
        WebTestUtils.setCsrfTokenRepository(
            MockHttpServletRequest(context.servletContext!!),
            CookieCsrfTokenRepository.withHttpOnlyFalse(),
        )
    }

    @Test
    fun `the csrf endpoint hands out a readable XSRF-TOKEN cookie`() {
        mvc.get("/api/v1/auth/csrf").andExpect {
            status { isNoContent() }
            cookie {
                exists("XSRF-TOKEN")
                httpOnly("XSRF-TOKEN", false)
                path("XSRF-TOKEN", "/")
            }
        }
    }

    @Test
    fun `a write that echoes the cookie token in the header passes`() {
        val token = mvc.get("/api/v1/auth/csrf").andReturn().response.getCookie("XSRF-TOKEN")!!.value

        mvc.post("/api/v1/auth/password-reset") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"nobody@example.com"}"""
            cookie(Cookie("XSRF-TOKEN", token))
            header("X-XSRF-TOKEN", token)
        }.andExpect { status { isAccepted() } }
    }

    @Test
    fun `a write without the header is refused`() {
        mvc.post("/api/v1/auth/password-reset") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"nobody@example.com"}"""
        }.andExpect { status { isForbidden() } }
    }
}
