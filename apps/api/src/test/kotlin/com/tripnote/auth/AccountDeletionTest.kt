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

    @Test
    fun `the revoke client is bounded by connect and read timeouts`() {
        assertThat(com.tripnote.auth.internal.REVOKE_CONNECT_TIMEOUT).isEqualTo(java.time.Duration.ofSeconds(3))
        assertThat(com.tripnote.auth.internal.REVOKE_READ_TIMEOUT).isEqualTo(java.time.Duration.ofSeconds(3))
        val factory = com.tripnote.auth.internal.revokeRequestFactory()
        val client = org.springframework.test.util.ReflectionTestUtils.getField(factory, "httpClient") as java.net.http.HttpClient
        assertThat(client.connectTimeout().get()).isEqualTo(java.time.Duration.ofSeconds(3))
        assertThat(org.springframework.test.util.ReflectionTestUtils.getField(factory, "readTimeout")).isEqualTo(java.time.Duration.ofSeconds(3))
    }

    @Test
    fun `a system user is refused before google is contacted`() {
        val id = createVerifiedUser("sys@example.com")
        jdbc.sql("UPDATE users SET status = 'system' WHERE id = ?").param(id).update()
        revoker.revoked.clear()

        org.junit.jupiter.api.assertThrows<com.tripnote.common.ApiException> { deletion.delete(id, "ya29.token") }

        assertThat(revoker.revoked).isEmpty()
    }

    @Test
    fun `deleting an editor leaves the owner's trip and membership intact`() {
        val owner = createVerifiedUser("owner@example.com")
        val editor = createVerifiedUser("editor@example.com")
        val tripId = jdbc.sql("INSERT INTO trips (slug, owner_id, title, start_date, end_date) VALUES ('shared-trip', ?, '공유', '2027-01-01', '2027-01-01') RETURNING id")
            .param(owner).query(java.util.UUID::class.java).single()
        jdbc.sql("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'owner'), (?, ?, 'editor')").params(tripId, owner, tripId, editor).update()

        deletion.delete(editor, null)

        assertThat(jdbc.sql("SELECT count(*) FROM trips WHERE slug = 'shared-trip'").query(Int::class.java).single()).isEqualTo(1)
        assertThat(jdbc.sql("SELECT count(*) FROM trip_members WHERE trip_id = ? AND user_id = ? AND role = 'owner'").params(tripId, owner).query(Int::class.java).single()).isEqualTo(1)
        assertThat(jdbc.sql("SELECT count(*) FROM trip_members WHERE user_id = ?").param(editor).query(Int::class.java).single()).isZero()
    }

    @Test
    fun `deleting an owner keeps another user's clone and clears its source`() {
        val owner = createVerifiedUser("owner@example.com")
        val source = jdbc.sql("INSERT INTO trips (slug, owner_id, title, start_date, end_date, visibility) VALUES ('orig-trip', ?, '원본', '2027-01-01', '2027-01-01', 'public') RETURNING id")
            .param(owner).query(java.util.UUID::class.java).single()
        val cloner = createVerifiedUser("cloner@example.com")
        jdbc.sql("INSERT INTO trips (slug, owner_id, title, start_date, end_date, source_trip_id) VALUES ('clone-trip', ?, '복제', '2027-01-01', '2027-01-01', ?)")
            .params(cloner, source).update()

        deletion.delete(owner, null)

        assertThat(jdbc.sql("SELECT count(*) FROM trips WHERE slug = 'orig-trip'").query(Int::class.java).single()).isZero()
        assertThat(jdbc.sql("SELECT count(*) FROM trips WHERE slug = 'clone-trip' AND source_trip_id IS NULL").query(Int::class.java).single()).isEqualTo(1)
    }

    @Test
    fun `deleting the account without csrf is forbidden`() {
        createVerifiedUser("mina@example.com")
        val session = login("mina@example.com")

        mvc.delete("/api/v1/me") { cookie(session) }.andExpect { status { isForbidden() } }

        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Int::class.java).single()).isEqualTo(1)
    }
}
