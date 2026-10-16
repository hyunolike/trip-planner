package com.tripnote.trip.internal

import com.tripnote.auth.SystemUsers
import com.tripnote.common.TripnoteProperties
import com.tripnote.jooq.Tables.PLACES
import com.tripnote.jooq.Tables.STOPS
import com.tripnote.jooq.Tables.TRIPS
import com.tripnote.jooq.Tables.TRIP_DAYS
import com.tripnote.jooq.Tables.TRIP_MEMBERS
import java.nio.file.Files
import java.nio.file.Path
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import org.jooq.DSLContext
import org.jooq.JSONB
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper

data class SeedResult(val slug: String, val tripId: UUID, val days: Int, val stops: Int, val places: Int)

@Service
class SampleTripSeeder(
    private val dsl: DSLContext,
    private val json: JsonMapper,
    private val systemUsers: SystemUsers,
    private val props: TripnoteProperties,
) {
    // trips 컬럼이나 자식 테이블로 가는 키를 뺀 나머지 최상위 키는 전부 content에 보관한다(샘플 데이터 손실 방지).
    private val nonContentFields = setOf("schemaVersion", "slug", "title", "subtitle", "startDate", "endDate", "timezone", "visibility", "isSample", "days", "places")
    private val placeColumns = setOf("id", "kind", "name", "area")

    @Transactional
    fun seedAll(): List<SeedResult> {
        val files = Files.list(Path.of(props.samplesDir)).use { stream ->
            stream.filter { it.fileName.toString().endsWith(".json") }.sorted().toList()
        }
        return files.map(::seed)
    }

    @Transactional
    fun seed(file: Path): SeedResult {
        val root = json.readTree(file.toFile())
        val schemaVersion = root.path("schemaVersion").asInt()
        require(schemaVersion == 1) { "$file: unsupported schemaVersion $schemaVersion" }

        val owner = systemUsers.ensure(props.systemUserEmail, "여행노트")
        val slug = root.required("slug").asString()
        val tripId = upsertTrip(root, slug, owner)

        dsl.deleteFrom(STOPS).where(STOPS.TRIP_ID.eq(tripId)).execute()
        dsl.deleteFrom(TRIP_DAYS).where(TRIP_DAYS.TRIP_ID.eq(tripId)).execute()
        dsl.deleteFrom(PLACES).where(PLACES.TRIP_ID.eq(tripId)).execute()

        val places = root.path("places")
        places.forEachIndexed { index, place -> insertPlace(tripId, place, index) }

        var stopCount = 0
        val days = root.required("days")
        for (day in days) {
            val dayId = insertDay(tripId, day)
            var position: String? = null
            for (stop in day.required("stops")) {
                position = FractionalIndex.between(position, null)
                insertStop(tripId, dayId, stop, position)
                stopCount++
            }
        }

        dsl.insertInto(TRIP_MEMBERS)
            .set(TRIP_MEMBERS.TRIP_ID, tripId).set(TRIP_MEMBERS.USER_ID, owner).set(TRIP_MEMBERS.ROLE, "owner")
            .onConflictDoNothing().execute()

        return SeedResult(slug, tripId, days.size(), stopCount, places.size())
    }

    private fun upsertTrip(root: JsonNode, slug: String, owner: UUID): UUID {
        val content = json.createObjectNode()
        root.properties().forEach { (field, value) -> if (field !in nonContentFields) content.set(field, value) }
        val values = mapOf(
            TRIPS.TITLE to root.required("title").asString(),
            TRIPS.SUBTITLE to root.get("subtitle")?.asString(),
            TRIPS.START_DATE to LocalDate.parse(root.required("startDate").asString()),
            TRIPS.END_DATE to LocalDate.parse(root.required("endDate").asString()),
            TRIPS.TIMEZONE to (root.get("timezone")?.asString() ?: "Asia/Seoul"),
            TRIPS.VISIBILITY to root.required("visibility").asString(),
            TRIPS.IS_SAMPLE to root.required("isSample").asBoolean(),
            TRIPS.CONTENT to JSONB.jsonb(content.toString()),
            TRIPS.OWNER_ID to owner,
        )
        val existing = dsl.select(TRIPS.ID, TRIPS.OWNER_ID).from(TRIPS).where(TRIPS.SLUG.eq(slug)).forUpdate().fetchOne()
        if (existing != null) {
            check(existing.get(TRIPS.OWNER_ID) == owner) { "trip '$slug' already exists and is not owned by the system user" }
            val tripId = existing.get(TRIPS.ID)!!
            dsl.update(TRIPS).set(values)
                .set(TRIPS.VERSION, TRIPS.VERSION.plus(1))
                .set(TRIPS.UPDATED_AT, java.time.OffsetDateTime.now())
                .where(TRIPS.ID.eq(tripId)).execute()
            return tripId
        }
        return dsl.insertInto(TRIPS).set(values).set(TRIPS.SLUG, slug).returning(TRIPS.ID).fetchOne()!!.id
    }

    private fun insertPlace(tripId: UUID, place: JsonNode, index: Int) {
        val details = json.createObjectNode()
        place.properties().forEach { (name, value) -> if (name !in placeColumns) details.set(name, value) }
        dsl.insertInto(PLACES)
            .set(PLACES.TRIP_ID, tripId)
            .set(PLACES.KEY, place.required("id").asString())
            .set(PLACES.KIND, place.required("kind").asString())
            .set(PLACES.NAME, place.required("name").asString())
            .set(PLACES.AREA, place.required("area").asString())
            .set(PLACES.DETAILS, JSONB.jsonb(details.toString()))
            .set(PLACES.POSITION, index)
            .execute()
    }

    private fun insertDay(tripId: UUID, day: JsonNode): UUID =
        dsl.insertInto(TRIP_DAYS)
            .set(TRIP_DAYS.TRIP_ID, tripId)
            .set(TRIP_DAYS.NUMBER, day.required("number").asInt())
            .set(TRIP_DAYS.DATE, LocalDate.parse(day.required("date").asString()))
            .set(TRIP_DAYS.CITY, day.required("city").asString())
            .set(TRIP_DAYS.THEME, day.required("theme").asString())
            .set(TRIP_DAYS.NOTE, day.get("note")?.asString())
            .set(TRIP_DAYS.COLOR, day.get("color")?.asString())
            .set(TRIP_DAYS.TOUR, day.jsonb("tour"))
            .returning(TRIP_DAYS.ID).fetchOne()!!.id

    private fun insertStop(tripId: UUID, dayId: UUID, stop: JsonNode, position: String) {
        val coordinates = stop.get("coordinates")
        dsl.insertInto(STOPS)
            .set(STOPS.TRIP_ID, tripId)
            .set(STOPS.DAY_ID, dayId)
            .set(STOPS.KEY, stop.required("id").asString())
            .set(STOPS.POSITION, position)
            .set(STOPS.START_TIME, LocalTime.parse(stop.required("time").asString()))
            .set(STOPS.TITLE, stop.required("title").asString())
            .set(STOPS.TYPE, stop.required("type").asString())
            .set(STOPS.DETAILS, stop.required("details").asString())
            .set(STOPS.DURATION, stop.get("duration")?.asString())
            .set(STOPS.BUFFER, stop.get("buffer")?.asString())
            .set(STOPS.TIMING, stop.get("timing")?.asString())
            .set(STOPS.TRANSPORT_ICON, stop.get("transportIcon")?.asString())
            .set(STOPS.LAT, coordinates?.get(0)?.asDouble())
            .set(STOPS.LNG, coordinates?.get(1)?.asDouble())
            .set(STOPS.APPROXIMATE, stop.get("approximate")?.asBoolean() ?: false)
            .set(STOPS.TRANSIT, stop.jsonb("transit"))
            .set(STOPS.PHOTO, stop.jsonb("photo"))
            .set(STOPS.HOTEL_PHOTO, stop.jsonb("hotelPhoto"))
            .set(STOPS.LINKS, stop.jsonb("links"))
            .set(STOPS.PLACE_KEY, stop.get("placeId")?.asString())
            .set(STOPS.GUIDE, stop.jsonb("guide"))
            .set(STOPS.OPTIONAL, stop.get("optional")?.asBoolean() ?: false)
            .execute()
    }

    private fun JsonNode.jsonb(field: String): JSONB? = get(field)?.let { JSONB.jsonb(it.toString()) }
}

@Component
@ConditionalOnProperty("tripnote.seed-samples", havingValue = "true")
class SampleSeedRunner(private val seeder: SampleTripSeeder) : ApplicationRunner {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        seeder.seedAll().forEach { log.info("seeded {} days={} stops={} places={}", it.slug, it.days, it.stops, it.places) }
    }
}
