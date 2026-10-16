package com.tripnote

import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.dao.DataIntegrityViolationException

class SchemaMigrationTest : IntegrationTest() {
    private fun newUser(email: String): UUID =
        jdbc.sql("INSERT INTO users (email, nickname) VALUES (?, '테스터') RETURNING id").param(email).query(UUID::class.java).single()

    private fun newDay(owner: UUID): Pair<UUID, UUID> {
        val tripId = jdbc.sql(
            "INSERT INTO trips (slug, owner_id, title, start_date, end_date) VALUES ('schema-test', ?, '여행', '2027-03-03', '2027-03-04') RETURNING id",
        ).param(owner).query(UUID::class.java).single()
        val dayId = jdbc.sql("INSERT INTO trip_days (trip_id, number, date) VALUES (?, 1, '2027-03-03') RETURNING id")
            .param(tripId).query(UUID::class.java).single()
        return tripId to dayId
    }

    @Test
    fun `ids default to uuid v7`() {
        assertThat(newUser("a@example.com").version()).isEqualTo(7)
    }

    @Test
    fun `email is unique regardless of case`() {
        newUser("Mina@Example.com")
        assertThatThrownBy { newUser("mina@example.com") }.isInstanceOf(DataIntegrityViolationException::class.java)
    }

    @Test
    fun `stop coordinates become a geography point`() {
        val (tripId, dayId) = newDay(newUser("b@example.com"))
        jdbc.sql(
            "INSERT INTO stops (trip_id, day_id, key, position, start_time, title, type, lat, lng) VALUES (?, ?, 'beach', 'V', '09:00', '미케 비치', 'sight', 16.0544, 108.2479)",
        ).params(tripId, dayId).update()
        val meters = jdbc.sql(
            "SELECT ST_Distance(location, ST_SetSRID(ST_MakePoint(108.2208, 16.0471), 4326)::geography) FROM stops WHERE key = 'beach'",
        ).query(Double::class.java).single()
        assertThat(meters).isBetween(2500.0, 3500.0)
    }

    @Test
    fun `stop positions sort byte-wise`() {
        val (tripId, dayId) = newDay(newUser("c@example.com"))
        listOf("a", "B", "V").forEachIndexed { index, position ->
            jdbc.sql("INSERT INTO stops (trip_id, day_id, key, position, start_time, title, type) VALUES (?, ?, ?, ?, '09:00', '스톱', 'sight')")
                .params(tripId, dayId, "s$index", position).update()
        }
        val order = jdbc.sql("SELECT position FROM stops WHERE day_id = ? ORDER BY position").param(dayId).query(String::class.java).list()
        assertThat(order).containsExactly("B", "V", "a")
    }
}
