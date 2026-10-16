package com.tripnote.auth

import com.tripnote.IntegrationTest
import com.tripnote.auth.internal.AccountDeletionService
import com.tripnote.support.RecordingRevoker
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

class AccountDeletionTest : IntegrationTest() {
    @Autowired lateinit var deletion: AccountDeletionService
    @Autowired lateinit var revoker: RecordingRevoker

    @Test
    fun `deleting my account removes my trips and ends every session`() {
        createVerifiedUser("mina@example.com")
        val laptop = login("mina@example.com")
        val phone = login("mina@example.com")
        mvc.post("/api/v1/trips") {
            cookie(laptop); with(csrf()); contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"title":"지울 여행","startDate":"2027-04-02","endDate":"2027-04-02"}"""
        }

        mvc.delete("/api/v1/me") { cookie(laptop); with(csrf()) }.andExpect { status { isNoContent() } }

        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Int::class.java).single()).isZero()
        assertThat(jdbc.sql("SELECT count(*) FROM trips").query(Int::class.java).single()).isZero()
        mvc.get("/api/v1/me") { cookie(phone) }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `a google token is revoked when one is present`() {
        val id = createVerifiedUser("mina@example.com")
        revoker.revoked.clear()

        deletion.delete(id, googleAccessToken = "ya29.token")

        assertThat(revoker.revoked).containsExactly("ya29.token")
    }

    @Test
    fun `a failing revoke does not block deletion`() {
        val id = createVerifiedUser("mina@example.com")
        revoker.failNext = true

        deletion.delete(id, googleAccessToken = "ya29.token")

        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Int::class.java).single()).isZero()
    }

    @Test
    fun `system users and unused tokens`() {
        val id = createVerifiedUser("sys@example.com")
        jdbc.sql("UPDATE users SET status = 'system' WHERE id = ?").param(id).update()

        org.junit.jupiter.api.assertThrows<com.tripnote.common.ApiException> { deletion.delete(id, null) }

        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Int::class.java).single()).isEqualTo(1)
    }
}
