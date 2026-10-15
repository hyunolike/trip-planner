package com.tripnote.trip

import com.tripnote.IntegrationTest
import com.tripnote.trip.internal.SampleTripSeeder
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

class SampleTripSeederTest : IntegrationTest() {
    @Autowired lateinit var seeder: SampleTripSeeder

    private fun one(sql: String) = jdbc.sql(sql).query(Int::class.java).single()

    @Test
    fun `seeds both samples with their visibility rules`() {
        val results = seeder.seedAll().associateBy { it.slug }

        assertThat(results.keys).containsExactlyInAnyOrder("osaka-kyoto-family-2026", "danang-hoian-family-2027")
        assertThat(results.getValue("osaka-kyoto-family-2026")).extracting("days", "stops").containsExactly(4, 50)
        assertThat(one("SELECT count(*) FROM trips WHERE slug = 'osaka-kyoto-family-2026' AND visibility = 'link' AND NOT is_sample")).isEqualTo(1)
        assertThat(one("SELECT count(*) FROM trips WHERE slug = 'danang-hoian-family-2027' AND visibility = 'public' AND is_sample")).isEqualTo(1)
        assertThat(one("SELECT count(*) FROM trip_members m JOIN users u ON u.id = m.user_id WHERE u.status = 'system' AND m.role = 'owner'")).isEqualTo(2)
    }

    @Test
    fun `keeps stop order, keys, coordinates and guides`() {
        seeder.seedAll()

        val firstKeys = jdbc.sql(
            """
            SELECT s.key FROM stops s JOIN trip_days d ON d.id = s.day_id JOIN trips t ON t.id = s.trip_id
            WHERE t.slug = 'osaka-kyoto-family-2026' AND d.number = 1 ORDER BY s.position LIMIT 3
            """.trimIndent(),
        ).query(String::class.java).list()
        assertThat(firstKeys).containsExactly("d1-gmp", "d1-flight", "d1-kix")
        assertThat(one("SELECT count(*) FROM stops WHERE key = 'd1-castle' AND location IS NOT NULL AND guide->>'kind' = 'place'")).isEqualTo(1)
        // JdbcClient는 '?'를 바인드 자리로 읽으므로 jsonb의 ? 연산자 대신 jsonb_exists를 쓴다
        assertThat(one("SELECT count(*) FROM trips WHERE jsonb_exists(content, 'checklistGroups') AND jsonb_exists(content, 'sections')")).isGreaterThanOrEqualTo(1)
    }

    @Test
    fun `reseeding is idempotent and keeps the trip id`() {
        seeder.seedAll()
        val before = jdbc.sql("SELECT id FROM trips WHERE slug = 'danang-hoian-family-2027'").query(UUID::class.java).single()
        val stopsBefore = one("SELECT count(*) FROM stops")

        seeder.seedAll()

        assertThat(jdbc.sql("SELECT id FROM trips WHERE slug = 'danang-hoian-family-2027'").query(UUID::class.java).single()).isEqualTo(before)
        assertThat(one("SELECT count(*) FROM stops")).isEqualTo(stopsBefore)
        assertThat(one("SELECT count(*) FROM users WHERE status = 'system'")).isEqualTo(1)
    }

    @Test
    fun `reseeding keeps a single owner membership per trip`() {
        seeder.seedAll()
        seeder.seedAll()
        assertThat(one("SELECT count(*) FROM trip_members")).isEqualTo(2)
    }

    @Test
    fun `content keeps every non-column top-level key of each sample`() {
        seeder.seedAll()
        val columnKeys = setOf("schemaVersion", "slug", "title", "subtitle", "startDate", "endDate", "timezone", "visibility", "isSample", "days", "places")
        val mapper = tools.jackson.databind.json.JsonMapper.builder().build()
        Files.list(Path.of("../../sample")).use { it.filter { f -> f.fileName.toString().endsWith(".json") }.toList() }.forEach { file ->
            val root = mapper.readTree(file.toFile())
            val expected = root.propertyNames().filter { it !in columnKeys }
            val content = jdbc.sql("SELECT content::text FROM trips WHERE slug = ?").param(root.get("slug").asString())
                .query(String::class.java).single().let { mapper.readTree(it) }
            assertThat(content.propertyNames().toList()).containsAll(expected)
        }
    }

    @Test
    fun `rejects an unknown schema version without writing anything`() {
        val file = Files.createTempFile("bad-sample", ".json")
        Files.writeString(file, """{"schemaVersion":2,"slug":"bad-sample"}""")

        assertThatThrownBy { seeder.seed(file) }.hasMessageContaining("schemaVersion")
        assertThat(one("SELECT count(*) FROM trips")).isZero()
        Files.delete(file)
    }
}
