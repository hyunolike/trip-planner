package com.tripnote

import java.util.UUID
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf

class ProblemDetailTest : IntegrationTest() {
    private fun session() = run {
        createVerifiedUser("mina@example.com")
        login("mina@example.com")
    }

    @Test
    fun `a malformed path id is a 400 problem`() {
        val cookie = session()
        mvc.delete("/api/v1/stops/not-a-uuid?version=1") { cookie(cookie); with(csrf()) }.andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("입력값을 확인해 주세요.") }
            jsonPath("$.status") { value(400) }
        }
    }

    @Test
    fun `a missing request parameter is a 400 problem`() {
        val cookie = session()
        mvc.delete("/api/v1/stops/${UUID.randomUUID()}") { cookie(cookie); with(csrf()) }.andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("입력값을 확인해 주세요.") }
        }
    }

    @Test
    fun `an unsupported method is a 405 problem`() {
        mvc.get("/api/v1/auth/login").andExpect {
            status { isMethodNotAllowed() }
            jsonPath("$.detail") { value("지원하지 않는 요청이에요.") }
        }
    }

    @Test
    fun `an anonymous request to a protected route is a 401 problem`() {
        mvc.get("/api/v1/me").andExpect {
            status { isUnauthorized() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.detail") { value("로그인이 필요해요.") }
            jsonPath("$.status") { value(401) }
        }
    }

    @Test
    fun `a missing csrf token is a 403 problem`() {
        val cookie = session()
        mvc.post("/api/v1/trips/some-slug/clone") { cookie(cookie) }.andExpect {
            status { isForbidden() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.detail") { value("이 작업을 할 권한이 없어요.") }
            jsonPath("$.status") { value(403) }
        }
    }
}
