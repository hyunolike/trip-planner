package com.tripnote.trip

import com.tripnote.IntegrationTest
import jakarta.servlet.http.Cookie
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.*
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper

class MvpEditingTest : IntegrationTest() {
    @Autowired lateinit var json: JsonMapper
    lateinit var sessionCookie: Cookie
    lateinit var owner: UUID
    @BeforeEach fun signIn() { owner = createVerifiedUser("owner@example.com"); sessionCookie = login("owner@example.com") }
    private fun send(method: String, path: String, body: String = "{}") = when(method) {
        "POST" -> mvc.post(path) { cookie(sessionCookie); with(csrf()); contentType = MediaType.APPLICATION_JSON; content = body }
        "PATCH" -> mvc.patch(path) { cookie(sessionCookie); with(csrf()); contentType = MediaType.APPLICATION_JSON; content = body }
        "PUT" -> mvc.put(path) { cookie(sessionCookie); with(csrf()) }
        "GET" -> mvc.get(path) { cookie(sessionCookie) }
        else -> mvc.delete(path) { cookie(sessionCookie); with(csrf()) }
    }
    private fun create(): JsonNode {
        val created = json.readTree(send("POST", "/api/v1/trips", """{"title":"여행","startDate":"2027-04-02","endDate":"2027-04-04","travelers":[{"label":"엄마","emoji":"🌷"}]}""").andExpect { status { isCreated() } }.andReturn().response.contentAsString)
        return json.readTree(send("GET", "/api/v1/trips/${created["slug"].asString()}").andReturn().response.contentAsString)
    }
    private fun add(day: String, extra: String = ""): JsonNode = json.readTree(send("POST", "/api/v1/days/$day/stops", """{"title":"관광","time":"09:00"$extra}""").andExpect { status { isCreated() } }.andReturn().response.contentAsString)
    @Test fun `travelers persist and date edits preserve days and reject populated day removal`() {
        val trip = create(); val id = trip["id"].asString(); val day = trip["days"][0]["id"].asString()
        assertThat(trip["content"]["travelers"][0]["label"].asString()).isEqualTo("엄마")
        add(trip["days"][2]["id"].asString())
        send("PATCH", "/api/v1/trips/$id", """{"version":1,"endDate":"2027-04-03"}""").andExpect { status { isConflict() } }
        send("PATCH", "/api/v1/trips/$id", """{"version":1,"startDate":"2027-05-02","endDate":"2027-05-05","title":"새 여행"}""").andExpect {
            status { isOk() }; jsonPath("$.days[0].id") { value(day) }; jsonPath("$.days[2].stops[0].title") { value("관광") }; jsonPath("$.days[3].date") { value("2027-05-05") }
        }
        send("PATCH", "/api/v1/trips/$id", """{"version":1,"title":"오래된 변경"}""").andExpect { status { isConflict() } }
        send("PATCH", "/api/v1/days/$day", """{"version":2,"city":"교토","theme":"산책","note":"메모"}""").andExpect { status { isOk() }; jsonPath("$.version") { value(3) }; jsonPath("$.days[0].note") { value("메모") } }
        send("DELETE", "/api/v1/trips/$id?version=2").andExpect { status { isConflict() } }
        send("DELETE", "/api/v1/trips/$id?version=3").andExpect { status { isNoContent() } }
    }
    @Test fun `only owner manages trip metadata deletion and shares while editors may edit day metadata`() {
        val trip = create(); val id = trip["id"].asString(); val day = trip["days"][0]["id"].asString()
        val editor = createVerifiedUser("editor@example.com")
        jdbc.sql("INSERT INTO trip_members (trip_id,user_id,role) VALUES (?,?,'editor')").params(UUID.fromString(id), editor).update()
        sessionCookie = login("editor@example.com")
        send("PATCH", "/api/v1/trips/$id", """{"version":0,"title":"침입"}""").andExpect { status { isForbidden() } }
        send("DELETE", "/api/v1/trips/$id?version=0").andExpect { status { isForbidden() } }
        send("POST", "/api/v1/trips/$id/share-links").andExpect { status { isForbidden() } }
        send("GET", "/api/v1/trips/$id/share-links").andExpect { status { isForbidden() } }
        send("PATCH", "/api/v1/days/$day", """{"version":0,"city":"교토"}""").andExpect { status { isOk() } }
    }
    @Test fun `stop create mutation survives retry and safe links can be updated or cleared`() {
        val trip = create(); val day = trip["days"][0]["id"].asString(); val mutation = UUID.randomUUID()
        val extra = ""","clientMutationId":"$mutation","links":[{"label":"공식","url":"https://example.com","note":"확인"}]"""
        val first = add(day, extra); val retry = add(day, extra)
        assertThat(retry["id"].asString()).isEqualTo(first["id"].asString())
        assertThat(jdbc.sql("SELECT count(*) FROM stops WHERE day_id=?").param(UUID.fromString(day)).query(Int::class.java).single()).isEqualTo(1)
        assertThat(first["links"][0]["note"].asString()).isEqualTo("확인")
        send("PATCH", "/api/v1/stops/${first["id"].asString()}", """{"version":0,"links":[]}""").andExpect { status { isOk() }; jsonPath("$.links.length()") { value(0) }; jsonPath("$.version") { value(1) } }
        send("PATCH", "/api/v1/stops/${first["id"].asString()}", """{"version":0,"title":"오래된 변경"}""").andExpect { status { isConflict() } }
        for (url in listOf("javascript:alert(1)", "data:text/html,test", "//evil.example")) {
            send("POST", "/api/v1/days/$day/stops", """{"title":"X","time":"09:00","links":[{"label":"X","url":"$url"}]}""").andExpect { status { isBadRequest() } }
        }
    }
    @Test fun `completions are idempotent user scoped and validate trip stop membership`() {
        val trip = create(); val id = trip["id"].asString(); val stop = add(trip["days"][0]["id"].asString())["id"].asString()
        repeat(2) { send("PUT", "/api/v1/trips/$id/completions/stops/$stop").andExpect { status { isNoContent() } } }
        send("GET", "/api/v1/trips/$id/completions").andExpect { status { isOk() }; jsonPath("$[0]") { value(stop) } }
        val otherTrip = create(); val otherId = otherTrip["id"].asString()
        send("PUT", "/api/v1/trips/$otherId/completions/stops/$stop").andExpect { status { isNotFound() } }
        val viewer = createVerifiedUser("viewer@example.com")
        jdbc.sql("INSERT INTO trip_members (trip_id,user_id,role) VALUES (?,?,'viewer')").params(UUID.fromString(id), viewer).update()
        sessionCookie = login("viewer@example.com")
        send("GET", "/api/v1/trips/$id/completions").andExpect { status { isOk() }; jsonPath("$.length()") { value(0) } }
        repeat(2) { send("DELETE", "/api/v1/trips/$id/completions/stops/$stop").andExpect { status { isNoContent() } } }
        sessionCookie = login("owner@example.com")
        send("GET", "/api/v1/trips/$id/completions").andExpect { jsonPath("$[0]") { value(stop) } }
        repeat(2) { send("DELETE", "/api/v1/trips/$id/completions/stops/$stop").andExpect { status { isNoContent() } } }
        send("GET", "/api/v1/trips/$id/completions").andExpect { jsonPath("$.length()") { value(0) } }
    }
    @Test fun `private shares are hashed read only revocable and clone grants never copy links or progress`() {
        val trip = create(); val id = trip["id"].asString(); val slug = trip["slug"].asString()
        val stop = add(trip["days"][0]["id"].asString())["id"].asString()
        send("PUT", "/api/v1/trips/$id/completions/stops/$stop").andExpect { status { isNoContent() } }
        val link = json.readTree(send("POST", "/api/v1/trips/$id/share-links").andExpect { status { isCreated() } }.andReturn().response.contentAsString)
        val token = link["token"].asString(); val linkId = link["id"].asString()
        assertThat(java.util.Base64.getUrlDecoder().decode(token)).hasSize(32)
        val hash = jdbc.sql("SELECT token_hash FROM share_links WHERE id=?").param(UUID.fromString(linkId)).query(String::class.java).single()
        assertThat(hash).hasSize(64).isNotEqualTo(token)
        send("GET", "/api/v1/trips/$id/share-links").andExpect { status { isOk() }; jsonPath("$[0].token") { doesNotExist() }; jsonPath("$[0].tokenHash") { doesNotExist() } }
        mvc.get("/api/v1/share/$token").andExpect { status { isOk() }; jsonPath("$.permissions.canEdit") { value(false) }; jsonPath("$.visibility") { value("private") } }
        mvc.get("/api/v1/trips/$slug").andExpect { status { isNotFound() } }
        createVerifiedUser("copy@example.com"); sessionCookie = login("copy@example.com")
        val copy = json.readTree(send("POST", "/api/v1/share/$token/clone").andExpect { status { isCreated() } }.andReturn().response.contentAsString)
        send("GET", "/api/v1/trips/${copy["slug"].asString()}").andExpect { status { isOk() }; jsonPath("$.visibility") { value("private") }; jsonPath("$.permissions.canEdit") { value(true) } }
        val copyId = UUID.fromString(copy["id"].asString())
        assertThat(jdbc.sql("SELECT count(*) FROM share_links WHERE trip_id=?").param(copyId).query(Int::class.java).single()).isZero()
        assertThat(jdbc.sql("SELECT count(*) FROM stop_completions WHERE trip_id=?").param(copyId).query(Int::class.java).single()).isZero()
        assertThat(jdbc.sql("SELECT count(*) FROM trip_members WHERE trip_id=?").param(copyId).query(Int::class.java).single()).isEqualTo(1)
        sessionCookie = login("owner@example.com")
        send("DELETE", "/api/v1/trips/$id/share-links/$linkId").andExpect { status { isNoContent() } }
        mvc.get("/api/v1/share/$token").andExpect { status { isNotFound() } }
        send("POST", "/api/v1/share/$token/clone").andExpect { status { isNotFound() } }
        mvc.get("/api/v1/share/invalid").andExpect { status { isNotFound() } }
    }
    @Test fun `empty trailing days can be shortened and existing metadata is preserved`() {
        val trip = create(); val id = trip["id"].asString(); val day = trip["days"][0]["id"].asString()
        send("PATCH", "/api/v1/days/$day", """{"version":0,"city":"교토","theme":"산책"}""").andExpect { status { isOk() } }
        send("PATCH", "/api/v1/trips/$id", """{"version":1,"endDate":"2027-04-02"}""").andExpect {
            status { isOk() }; jsonPath("$.days.length()") { value(1) }; jsonPath("$.days[0].city") { value("교토") }; jsonPath("$.days[0].id") { value(day) }
        }
        send("PATCH", "/api/v1/days/$day", """{"version":0,"note":"오래된 메모"}""").andExpect { status { isConflict() }; jsonPath("$.current.version") { value(2) } }
    }

    @Test fun `mutation receipt is scoped by day and user and remains after deletion`() {
        val trip = create(); val id = trip["id"].asString(); val day = trip["days"][0]["id"].asString(); val dayTwo = trip["days"][1]["id"].asString()
        val mutation = UUID.randomUUID(); val extra = ""","clientMutationId":"$mutation""""
        val first = add(day, extra); val second = add(dayTwo, extra)
        assertThat(second["id"].asString()).isNotEqualTo(first["id"].asString())
        val editor = createVerifiedUser("editor@example.com")
        jdbc.sql("INSERT INTO trip_members (trip_id,user_id,role) VALUES (?,?,'editor')").params(UUID.fromString(id), editor).update()
        sessionCookie = login("editor@example.com")
        val other = add(day, extra)
        assertThat(other["id"].asString()).isNotEqualTo(first["id"].asString())
        sessionCookie = login("owner@example.com")
        send("DELETE", "/api/v1/stops/${first["id"].asString()}?version=0").andExpect { status { isNoContent() } }
        send("POST", "/api/v1/days/$day/stops", """{"title":"다시","time":"09:00","clientMutationId":"$mutation"}""").andExpect { status { isConflict() } }
    }

    @Test fun `concurrent retries create one stop and trip version changes only once`() {
        val trip = create(); val day = trip["days"][0]["id"].asString(); val mutation = UUID.randomUUID()
        val pool = java.util.concurrent.Executors.newFixedThreadPool(4)
        val results = try {
            (1..4).map { pool.submit<String> { add(day, ""","clientMutationId":"$mutation"""")["id"].asString() } }.map { it.get() }
        } finally { pool.shutdown() }
        assertThat(results.toSet()).hasSize(1)
        assertThat(jdbc.sql("SELECT version FROM trips WHERE id=?").param(UUID.fromString(trip["id"].asString())).query(Int::class.java).single()).isEqualTo(1)
    }

    @Test fun `private outsiders cannot write completions or inspect metadata`() {
        val trip = create(); val id = trip["id"].asString(); val stop = add(trip["days"][0]["id"].asString())["id"].asString()
        createVerifiedUser("outsider@example.com"); sessionCookie = login("outsider@example.com")
        send("GET", "/api/v1/trips/$id/completions").andExpect { status { isNotFound() } }
        send("PUT", "/api/v1/trips/$id/completions/stops/$stop").andExpect { status { isNotFound() } }
        send("GET", "/api/v1/trips/$id/share-links").andExpect { status { isNotFound() } }
        send("PATCH", "/api/v1/trips/$id", """{"version":1,"title":"침입"}""").andExpect { status { isNotFound() } }
    }

    @Test fun `sample owners cannot change metadata delete or create share links`() {
        val trip = create(); val id = trip["id"].asString(); val day = trip["days"][0]["id"].asString()
        jdbc.sql("UPDATE trips SET is_sample=true WHERE id=?").param(UUID.fromString(id)).update()
        send("PATCH", "/api/v1/trips/$id", """{"version":0,"visibility":"public"}""").andExpect { status { isForbidden() } }
        send("PATCH", "/api/v1/days/$day", """{"version":0,"note":"메모"}""").andExpect { status { isForbidden() } }
        send("DELETE", "/api/v1/trips/$id?version=0").andExpect { status { isForbidden() } }
        send("POST", "/api/v1/trips/$id/share-links").andExpect { status { isForbidden() } }
    }

    @Test fun `creating a stop persists departure buffer and rejects oversized buffer`() {
        val trip = create(); val day = trip["days"][0]["id"].asString()
        val stop = add(day, ""","buffer":"출발 20분 전"""")
        assertThat(stop["buffer"].asString()).isEqualTo("출발 20분 전")
        send("POST", "/api/v1/days/$day/stops", """{"title":"X","time":"09:00","buffer":"${"x".repeat(81)}"}""").andExpect { status { isBadRequest() } }
    }

}
