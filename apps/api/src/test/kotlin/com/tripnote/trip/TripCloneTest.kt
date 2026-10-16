package com.tripnote.trip

import com.tripnote.IntegrationTest
import com.tripnote.trip.internal.SampleTripSeeder
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import tools.jackson.databind.json.JsonMapper

class TripCloneTest : IntegrationTest() {
    @Autowired lateinit var seeder: SampleTripSeeder
    @Autowired lateinit var json: JsonMapper

    @BeforeEach
    fun seed() { seeder.seedAll() }

    private fun one(sql: String, vararg params: Any) = jdbc.sql(sql).params(*params).query(Int::class.java).single()

    @Test
    fun `a logged-in user clones the sample into a private editable trip`() {
        createVerifiedUser("mina@example.com")
        val session = login("mina@example.com")

        val body = mvc.post("/api/v1/trips/danang-hoian-family-2027/clone") { cookie(session); with(csrf()) }
            .andExpect { status { isCreated() } }.andReturn().response.contentAsString
        val slug = json.readTree(body).get("slug").asString()

        assertThat(one("SELECT count(*) FROM stops s JOIN trips t ON t.id = s.trip_id WHERE t.slug = ?", slug))
            .isEqualTo(one("SELECT count(*) FROM stops s JOIN trips t ON t.id = s.trip_id WHERE t.slug = 'danang-hoian-family-2027'"))
        assertThat(one("SELECT count(*) FROM places p JOIN trips t ON t.id = p.trip_id WHERE t.slug = ?", slug))
            .isEqualTo(one("SELECT count(*) FROM places p JOIN trips t ON t.id = p.trip_id WHERE t.slug = 'danang-hoian-family-2027'"))
        assertThat(one("SELECT count(*) FROM trips WHERE slug = ? AND visibility = 'private' AND NOT is_sample AND source_trip_id IS NOT NULL", slug)).isEqualTo(1)
        mvc.get("/api/v1/trips/$slug") { cookie(session) }.andExpect {
            status { isOk() }
            jsonPath("$.permissions.canEdit") { value(true) }
        }
    }

    @Test
    fun `the Osaka Kyoto original can be cloned too`() {
        createVerifiedUser("mina@example.com")
        val session = login("mina@example.com")

        mvc.post("/api/v1/trips/osaka-kyoto-family-2026/clone") { cookie(session); with(csrf()) }.andExpect { status { isCreated() } }
    }

    @Test
    fun `reseeding after a clone keeps the clone linked to its source`() {
        createVerifiedUser("mina@example.com")
        val session = login("mina@example.com")
        mvc.post("/api/v1/trips/danang-hoian-family-2027/clone") { cookie(session); with(csrf()) }

        seeder.seedAll()

        assertThat(one("SELECT count(*) FROM trips c JOIN trips s ON s.id = c.source_trip_id WHERE s.slug = 'danang-hoian-family-2027'")).isEqualTo(1)
    }

    @Test
    fun `anonymous users cannot clone and private trips are not found`() {
        mvc.post("/api/v1/trips/danang-hoian-family-2027/clone") { with(csrf()) }.andExpect { status { isUnauthorized() } }

        val owner = createVerifiedUser("owner@example.com")
        val tripId = jdbc.sql("INSERT INTO trips (slug, owner_id, title, start_date, end_date) VALUES ('secret-trip', ?, '비밀', '2027-01-01', '2027-01-01') RETURNING id")
            .param(owner).query(UUID::class.java).single()
        jdbc.sql("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'owner')").params(tripId, owner).update()
        createVerifiedUser("other@example.com")
        val other = login("other@example.com")

        mvc.post("/api/v1/trips/secret-trip/clone") { cookie(other); with(csrf()) }.andExpect { status { isNotFound() } }
    }
}
