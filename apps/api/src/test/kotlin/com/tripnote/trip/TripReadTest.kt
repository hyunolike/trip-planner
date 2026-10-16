package com.tripnote.trip

import com.tripnote.IntegrationTest
import com.tripnote.trip.internal.SampleTripSeeder
import java.util.UUID
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.get

class TripReadTest : IntegrationTest() {
    @Autowired lateinit var seeder: SampleTripSeeder

    @BeforeEach
    fun seed() { seeder.seedAll() }

    private fun privateTripOf(owner: UUID, slug: String = "private-trip"): UUID {
        val tripId = jdbc.sql("INSERT INTO trips (slug, owner_id, title, start_date, end_date) VALUES (?, ?, '비밀 여행', '2027-01-01', '2027-01-02') RETURNING id")
            .params(slug, owner).query(UUID::class.java).single()
        jdbc.sql("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'owner')").params(tripId, owner).update()
        return tripId
    }

    @Test
    fun `anyone can read the public sample in order`() {
        mvc.get("/api/v1/trips/danang-hoian-family-2027").andExpect {
            status { isOk() }
            jsonPath("$.isSample") { value(true) }
            jsonPath("$.days[0].number") { value(1) }
            jsonPath("$.days[0].stops[0].time") { exists() }
            jsonPath("$.permissions.canEdit") { value(false) }
            jsonPath("$.permissions.canClone") { value(false) }
        }
    }

    @Test
    fun `the original Osaka Kyoto trip is readable by link with all 50 stops and guides`() {
        mvc.get("/api/v1/trips/osaka-kyoto-family-2026").andExpect {
            status { isOk() }
            jsonPath("$.visibility") { value("link") }
            jsonPath("$.days", hasSize<Any>(4))
            jsonPath("$.days[0].stops[0].key") { value("d1-gmp") }
            jsonPath("$.days[0].stops[0].coordinates", hasSize<Any>(2))
            jsonPath("$.content.checklistGroups") { exists() }
            jsonPath("$.places[0].details") { exists() }
        }
    }

    @Test
    fun `a logged-in user may clone a sample but not edit it`() {
        createVerifiedUser("mina@example.com")
        val session = login("mina@example.com")

        mvc.get("/api/v1/trips/danang-hoian-family-2027") { cookie(session) }.andExpect {
            jsonPath("$.permissions.canEdit") { value(false) }
            jsonPath("$.permissions.canClone") { value(true) }
        }
    }

    @Test
    fun `someone else's private trip is indistinguishable from a missing one`() {
        privateTripOf(createVerifiedUser("owner@example.com"))
        createVerifiedUser("other@example.com")
        val other = login("other@example.com")

        mvc.get("/api/v1/trips/private-trip").andExpect { status { isNotFound() } }
        mvc.get("/api/v1/trips/private-trip") { cookie(other) }.andExpect { status { isNotFound() } }
        mvc.get("/api/v1/trips/no-such-trip").andExpect {
            status { isNotFound() }
            jsonPath("$.detail") { value("일정을 찾을 수 없어요. 링크를 다시 확인해 주세요.") }
        }
    }

    @Test
    fun `the owner reads and may edit a private trip`() {
        privateTripOf(createVerifiedUser("owner@example.com"))
        val owner = login("owner@example.com")

        mvc.get("/api/v1/trips/private-trip") { cookie(owner) }.andExpect {
            status { isOk() }
            jsonPath("$.permissions.canEdit") { value(true) }
        }
    }

    @Test
    fun `samples list shows only public samples`() {
        mvc.get("/api/v1/samples").andExpect {
            status { isOk() }
            jsonPath("$", hasSize<Any>(1))
            jsonPath("$[0].slug") { value("danang-hoian-family-2027") }
            jsonPath("$[0].stopCount") { value(57) }
            jsonPath("$[0].isSample") { value(true) }
        }
    }

    @Test
    fun `my trips list needs a session and shows trips I belong to`() {
        mvc.get("/api/v1/trips").andExpect { status { isUnauthorized() } }
        privateTripOf(createVerifiedUser("owner@example.com"))
        val owner = login("owner@example.com")

        mvc.get("/api/v1/trips") { cookie(owner) }.andExpect {
            status { isOk() }
            jsonPath("$", hasSize<Any>(1))
            jsonPath("$[0].slug") { value("private-trip") }
        }
    }
}
