package com.tripnote.trip

import com.tripnote.IntegrationTest
import com.tripnote.trip.internal.SampleTripSeeder
import jakarta.servlet.http.Cookie
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.hamcrest.Matchers.hasSize
import org.hamcrest.Matchers.matchesPattern
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import tools.jackson.databind.json.JsonMapper

class TripWriteTest : IntegrationTest() {
    @Autowired lateinit var json: JsonMapper
    @Autowired lateinit var seeder: SampleTripSeeder
    lateinit var sessionCookie: Cookie

    @BeforeEach
    fun signIn() {
        createVerifiedUser("mina@example.com")
        sessionCookie = login("mina@example.com")
    }

    private fun send(method: String, path: String, body: String? = null) = when (method) {
        "POST" -> mvc.post(path) { cookie(sessionCookie); with(csrf()); contentType = MediaType.APPLICATION_JSON; body?.let { content = it } }
        "PATCH" -> mvc.patch(path) { cookie(sessionCookie); with(csrf()); contentType = MediaType.APPLICATION_JSON; body?.let { content = it } }
        "PUT" -> mvc.put(path) { cookie(sessionCookie); with(csrf()); contentType = MediaType.APPLICATION_JSON; body?.let { content = it } }
        else -> mvc.delete(path) { cookie(sessionCookie); with(csrf()) }
    }

    private fun createTrip(): Pair<String, UUID> {
        val response = send("POST", "/api/v1/trips", """{"title":"후쿠오카 주말","startDate":"2027-04-02","endDate":"2027-04-04","city":"FUKUOKA"}""")
            .andExpect { status { isCreated() } }.andReturn().response.contentAsString
        val slug = json.readTree(response).get("slug").asString()
        val dayId = jdbc.sql("SELECT d.id FROM trip_days d JOIN trips t ON t.id = d.trip_id WHERE t.slug = ? AND d.number = 1")
            .param(slug).query(UUID::class.java).single()
        return slug to dayId
    }

    private fun addStop(dayId: UUID, title: String, time: String, after: String? = null): Map<String, Any?> {
        val afterJson = after?.let { ""","afterStopId":"$it"""" } ?: ""
        val body = send("POST", "/api/v1/days/$dayId/stops", """{"title":"$title","time":"$time"$afterJson}""")
            .andExpect { status { isCreated() } }.andReturn().response.contentAsString
        @Suppress("UNCHECKED_CAST")
        return json.readValue(body, Map::class.java) as Map<String, Any?>
    }

    private fun titlesOf(dayId: UUID) =
        jdbc.sql("SELECT title FROM stops WHERE day_id = ? ORDER BY position").param(dayId).query(String::class.java).list()

    @Test
    fun `creating a trip makes one day per date and a private random slug`() {
        val (slug, _) = createTrip()

        assertThat(slug).matches("[a-z0-9]{8}")
        assertThat(jdbc.sql("SELECT count(*) FROM trip_days d JOIN trips t ON t.id = d.trip_id WHERE t.slug = ?").param(slug).query(Int::class.java).single()).isEqualTo(3)
        assertThat(jdbc.sql("SELECT visibility FROM trips WHERE slug = ?").param(slug).query(String::class.java).single()).isEqualTo("private")
    }

    @Test
    fun `an end date before the start date is rejected`() {
        send("POST", "/api/v1/trips", """{"title":"거꾸로","startDate":"2027-04-04","endDate":"2027-04-02"}""").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("돌아오는 날이 떠나는 날보다 빠를 수 없어요.") }
        }
    }

    @Test
    fun `stops append by default and can be inserted after another stop`() {
        val (_, dayId) = createTrip()
        val first = addStop(dayId, "공항 도착", "09:00")
        addStop(dayId, "숙소 체크인", "15:00")
        addStop(dayId, "점심", "12:00", after = first["id"] as String)

        assertThat(titlesOf(dayId)).containsExactly("공항 도착", "점심", "숙소 체크인")
    }

    @Test
    fun `a stale version is refused with the current stop`() {
        val (_, dayId) = createTrip()
        val stop = addStop(dayId, "공항 도착", "09:00")
        val id = stop["id"]

        send("PATCH", "/api/v1/stops/$id", """{"version":0,"title":"후쿠오카 공항 도착"}""").andExpect {
            status { isOk() }
            jsonPath("$.version") { value(1) }
        }
        send("PATCH", "/api/v1/stops/$id", """{"version":0,"title":"다른 기기에서 고친 제목"}""").andExpect {
            status { isConflict() }
            jsonPath("$.detail") { value("다른 곳에서 먼저 고친 내용이 있어요. 최신 내용을 확인하고 다시 저장해 주세요.") }
            jsonPath("$.current.title") { value("후쿠오카 공항 도착") }
        }
    }

    @Test
    fun `reorder accepts exactly the day's stops`() {
        val (_, dayId) = createTrip()
        val a = addStop(dayId, "A", "09:00")["id"]
        val b = addStop(dayId, "B", "10:00")["id"]
        val c = addStop(dayId, "C", "11:00")["id"]

        send("PUT", "/api/v1/days/$dayId/stops/order", """{"stopIds":["$c","$a","$b"]}""").andExpect {
            status { isOk() }
            jsonPath("$", hasSize<Any>(3))
            jsonPath("$[0].title") { value("C") }
        }
        assertThat(titlesOf(dayId)).containsExactly("C", "A", "B")

        send("PUT", "/api/v1/days/$dayId/stops/order", """{"stopIds":["$c","$a"]}""").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("이 날짜의 일정 전체를 한 번씩 순서대로 보내 주세요.") }
        }
    }

    @Test
    fun `reorder refuses stops from another day`() {
        val (slug, dayOne) = createTrip()
        val dayTwo = jdbc.sql("SELECT d.id FROM trip_days d JOIN trips t ON t.id = d.trip_id WHERE t.slug = ? AND d.number = 2").param(slug).query(UUID::class.java).single()
        val a = addStop(dayOne, "A", "09:00")["id"]
        val other = addStop(dayTwo, "다른 날", "09:00")["id"]

        send("PUT", "/api/v1/days/$dayOne/stops/order", """{"stopIds":["$other"]}""").andExpect { status { isBadRequest() } }
        send("PUT", "/api/v1/days/$dayOne/stops/order", """{"stopIds":["$a","$other"]}""").andExpect { status { isBadRequest() } }
        assertThat(titlesOf(dayTwo)).containsExactly("다른 날")
    }

    @Test
    fun `deleting needs the current version`() {
        val (_, dayId) = createTrip()
        val id = addStop(dayId, "A", "09:00")["id"]

        send("DELETE", "/api/v1/stops/$id?version=3").andExpect { status { isConflict() } }
        send("DELETE", "/api/v1/stops/$id?version=0").andExpect { status { isNoContent() } }
        assertThat(titlesOf(dayId)).isEmpty()
    }

    @Test
    fun `samples cannot be edited even by a member`() {
        seeder.seedAll()
        val dayId = jdbc.sql("SELECT d.id FROM trip_days d JOIN trips t ON t.id = d.trip_id WHERE t.slug = 'danang-hoian-family-2027' AND d.number = 1").query(UUID::class.java).single()

        send("POST", "/api/v1/days/$dayId/stops", """{"title":"추가","time":"09:00"}""").andExpect {
            status { isForbidden() }
            jsonPath("$.detail") { value("샘플 일정은 고칠 수 없어요. 내 여행으로 복제한 뒤 고쳐 주세요.") }
        }
    }

    @Test
    fun `someone else's private trip is not found`() {
        val (_, dayId) = createTrip()
        createVerifiedUser("other@example.com")
        sessionCookie = login("other@example.com")

        send("POST", "/api/v1/days/$dayId/stops", """{"title":"침입","time":"09:00"}""").andExpect { status { isNotFound() } }
    }

    @Test
    fun `invalid time is rejected`() {
        val (_, dayId) = createTrip()
        send("POST", "/api/v1/days/$dayId/stops", """{"title":"A","time":"9:00"}""").andExpect { status { isBadRequest() } }
    }

    private fun tripVersion(slug: String) =
        jdbc.sql("SELECT version FROM trips WHERE slug = ?").param(slug).query(Int::class.java).single()

    private fun asViewerOf(slug: String) {
        val viewer = createVerifiedUser("viewer@example.com")
        jdbc.sql("INSERT INTO trip_members (trip_id, user_id, role) SELECT id, ?, 'viewer' FROM trips WHERE slug = ?").params(viewer, slug).update()
        sessionCookie = login("viewer@example.com")
    }

    @Test
    fun `every kind of stop write bumps the trip version`() {
        val (slug, dayId) = createTrip()
        var last = tripVersion(slug)
        fun expectBump() { val now = tripVersion(slug); assertThat(now).isGreaterThan(last); last = now }

        val a = addStop(dayId, "A", "09:00"); expectBump()
        val b = addStop(dayId, "B", "10:00"); expectBump()
        send("PATCH", "/api/v1/stops/${a["id"]}", """{"version":0,"title":"A2"}""").andExpect { status { isOk() } }; expectBump()
        send("PUT", "/api/v1/days/$dayId/stops/order", """{"stopIds":["${b["id"]}","${a["id"]}"]}""").andExpect { status { isOk() } }; expectBump()
        val version = jdbc.sql("SELECT version FROM stops WHERE id = ?").param(UUID.fromString(b["id"] as String)).query(Int::class.java).single()
        send("DELETE", "/api/v1/stops/${b["id"]}?version=$version").andExpect { status { isNoContent() } }; expectBump()
    }

    @Test
    fun `a viewer cannot add or edit stops`() {
        val (slug, dayId) = createTrip()
        val id = addStop(dayId, "A", "09:00")["id"]
        asViewerOf(slug)

        send("POST", "/api/v1/days/$dayId/stops", """{"title":"X","time":"09:00"}""").andExpect { status { isForbidden() } }
        send("PATCH", "/api/v1/stops/$id", """{"version":0,"title":"X"}""").andExpect { status { isForbidden() } }
    }

    @Test
    fun `a non-member gets 404 when patching or deleting a private trip's stop`() {
        val (_, dayId) = createTrip()
        val id = addStop(dayId, "A", "09:00")["id"]
        createVerifiedUser("other@example.com")
        sessionCookie = login("other@example.com")

        send("PATCH", "/api/v1/stops/$id", """{"version":0,"title":"X"}""").andExpect { status { isNotFound() } }
        send("DELETE", "/api/v1/stops/$id?version=0").andExpect { status { isNotFound() } }
    }

    @Test
    fun `afterStopId from another day is refused with its own message`() {
        val (slug, dayOne) = createTrip()
        val dayTwo = jdbc.sql("SELECT d.id FROM trip_days d JOIN trips t ON t.id = d.trip_id WHERE t.slug = ? AND d.number = 2").param(slug).query(UUID::class.java).single()
        val other = addStop(dayTwo, "다른 날", "09:00")["id"]

        send("POST", "/api/v1/days/$dayOne/stops", """{"title":"A","time":"09:00","afterStopId":"$other"}""").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("이 날짜에 없는 일정 뒤에는 추가할 수 없어요.") }
        }
    }

    @Test
    fun `a trip longer than 30 days is refused`() {
        send("POST", "/api/v1/trips", """{"title":"길다","startDate":"2027-04-01","endDate":"2027-05-15"}""").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `invalid timezone and oversized timezone are refused`() {
        send("POST", "/api/v1/trips", """{"title":"A","startDate":"2027-04-01","endDate":"2027-04-02","timezone":"Mars/Base"}""").andExpect { status { isBadRequest() } }
        send("POST", "/api/v1/trips", """{"title":"A","startDate":"2027-04-01","endDate":"2027-04-02","timezone":"${"x".repeat(65)}"}""").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `bad coordinates are refused`() {
        val (_, dayId) = createTrip()
        val id = addStop(dayId, "A", "09:00")["id"]
        send("POST", "/api/v1/days/$dayId/stops", """{"title":"A","time":"09:00","coordinates":[91.0,10.0]}""").andExpect { status { isBadRequest() } }
        send("POST", "/api/v1/days/$dayId/stops", """{"title":"A","time":"09:00","coordinates":[null,10.0]}""").andExpect { status { isBadRequest() } }
        send("PATCH", "/api/v1/stops/$id", """{"version":0,"coordinates":[10.0,null]}""").andExpect { status { isBadRequest() } }
        send("PATCH", "/api/v1/stops/$id", """{"version":0,"coordinates":[10.0,20.0],"clearCoordinates":true}""").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `whitespace-only title and oversized details are refused on patch`() {
        val (_, dayId) = createTrip()
        val id = addStop(dayId, "A", "09:00")["id"]
        send("PATCH", "/api/v1/stops/$id", """{"version":0,"title":"   "}""").andExpect { status { isBadRequest() } }
        send("PATCH", "/api/v1/stops/$id", """{"version":0,"details":"${"x".repeat(4001)}"}""").andExpect { status { isBadRequest() } }
        send("POST", "/api/v1/days/$dayId/stops", """{"title":"B","time":"09:00","details":"${"x".repeat(4001)}"}""").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `an empty string clears duration and buffer while null leaves them`() {
        val (_, dayId) = createTrip()
        val id = addStop(dayId, "A", "09:00")["id"]
        send("PATCH", "/api/v1/stops/$id", """{"version":0,"duration":"2시간","buffer":"30분"}""").andExpect { status { isOk() } }
        send("PATCH", "/api/v1/stops/$id", """{"version":1,"title":"A2"}""").andExpect {
            status { isOk() }
            jsonPath("$.duration") { value("2시간") }
        }
        send("PATCH", "/api/v1/stops/$id", """{"version":2,"duration":"","buffer":""}""").andExpect {
            status { isOk() }
            jsonPath("$.duration") { doesNotExist() }
            jsonPath("$.buffer") { doesNotExist() }
        }
    }

    @Test
    fun `concurrent appends to one day both succeed with distinct positions`() {
        val (_, dayId) = createTrip()
        addStop(dayId, "첫째", "09:00")
        val pool = java.util.concurrent.Executors.newFixedThreadPool(6)
        val results = (1..6).map { n ->
            pool.submit<Int> {
                send("POST", "/api/v1/days/$dayId/stops", """{"title":"동시 $n","time":"10:00"}""").andReturn().response.status
            }
        }.map { it.get() }
        pool.shutdown()

        assertThat(results).containsOnly(201)
        assertThat(titlesOf(dayId)).hasSize(7)
    }
}
