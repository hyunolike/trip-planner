package com.tripnote.trip.internal

import com.tripnote.jooq.Tables.PLACES
import com.tripnote.jooq.Tables.STOPS
import com.tripnote.jooq.Tables.TRIPS
import com.tripnote.jooq.Tables.TRIP_DAYS
import com.tripnote.jooq.Tables.TRIP_MEMBERS
import com.tripnote.jooq.tables.records.StopsRecord
import com.tripnote.jooq.tables.records.TripsRecord
import com.tripnote.trip.DayDocument
import com.tripnote.trip.Permissions
import com.tripnote.trip.PlaceDocument
import com.tripnote.trip.StopDocument
import com.tripnote.trip.TripDocument
import com.tripnote.trip.TripSummary
import java.time.format.DateTimeFormatter
import java.util.UUID
import org.jooq.DSLContext
import org.jooq.JSONB
import org.jooq.impl.DSL
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper

@Component
@Transactional(readOnly = true)
class TripQueries(private val dsl: DSLContext, private val json: JsonMapper) {
    // STOPS.LOCATION(geography)은 문서에 쓰지 않으므로 읽지 않는다.
    private val stopColumns = STOPS.fields().filter { it != STOPS.LOCATION }
    private val hhmm = DateTimeFormatter.ofPattern("HH:mm")

    fun role(tripId: UUID, userId: UUID?): String? = userId?.let {
        dsl.select(TRIP_MEMBERS.ROLE).from(TRIP_MEMBERS)
            .where(TRIP_MEMBERS.TRIP_ID.eq(tripId), TRIP_MEMBERS.USER_ID.eq(it))
            .fetchOne(TRIP_MEMBERS.ROLE)
    }

    fun find(slug: String, viewer: UUID?, shareGrant: Boolean = false): TripDocument? {
        val trip = dsl.selectFrom(TRIPS).where(TRIPS.SLUG.eq(slug)).fetchOne() ?: return null
        val role = role(trip.id, viewer)
        if (trip.visibility == "private" && role == null && !shareGrant) return null

        val stopsByDay = dsl.select(stopColumns).from(STOPS).where(STOPS.TRIP_ID.eq(trip.id)).orderBy(STOPS.POSITION).fetchInto(STOPS).groupBy { it.dayId }
        val days = dsl.selectFrom(TRIP_DAYS).where(TRIP_DAYS.TRIP_ID.eq(trip.id)).orderBy(TRIP_DAYS.NUMBER).fetch().map { day ->
            DayDocument(day.id, day.number, day.date, day.city, day.theme, day.note, day.color, day.tour.node(), stopsByDay[day.id].orEmpty().map(::toStop))
        }
        val places = dsl.selectFrom(PLACES).where(PLACES.TRIP_ID.eq(trip.id)).orderBy(PLACES.POSITION).fetch().map { place ->
            PlaceDocument(place.id, place.key, place.kind, place.name, place.area, place.details.node()!!)
        }
        val permissions = Permissions(
            canEdit = !shareGrant && role in setOf("owner", "editor") && !trip.isSample,
            canClone = viewer != null && (trip.visibility != "private" || shareGrant),
        )
        return trip.toDocument(days, places, permissions)
    }

    fun stop(stopId: UUID): StopDocument = toStop(dsl.select(stopColumns).from(STOPS).where(STOPS.ID.eq(stopId)).fetchSingleInto(STOPS))

    fun stopsOfDay(dayId: UUID): List<StopDocument> =
        dsl.select(stopColumns).from(STOPS).where(STOPS.DAY_ID.eq(dayId)).orderBy(STOPS.POSITION).fetchInto(STOPS).map(::toStop)

    fun publicSamples(): List<TripSummary> = summaries(TRIPS.VISIBILITY.eq("public").and(TRIPS.IS_SAMPLE.isTrue))

    fun tripsOf(userId: UUID): List<TripSummary> = summaries(
        TRIPS.ID.`in`(dsl.select(TRIP_MEMBERS.TRIP_ID).from(TRIP_MEMBERS).where(TRIP_MEMBERS.USER_ID.eq(userId))),
    )

    private fun summaries(condition: org.jooq.Condition): List<TripSummary> {
        val cities = DSL.arrayAggDistinct(TRIP_DAYS.CITY)
        val stopCount = DSL.select(DSL.count()).from(STOPS).where(STOPS.TRIP_ID.eq(TRIPS.ID)).asField<Int>("stop_count")
        return dsl.select(TRIPS.asterisk(), DSL.field(DSL.select(cities).from(TRIP_DAYS).where(TRIP_DAYS.TRIP_ID.eq(TRIPS.ID))).`as`("cities"), stopCount)
            .from(TRIPS).where(condition).orderBy(TRIPS.START_DATE.desc())
            .fetch { record ->
                val trip = record.into(TRIPS)
                @Suppress("UNCHECKED_CAST")
                val cityList = (record.get("cities") as Array<String>?)?.toList().orEmpty()
                TripSummary(
                    trip.slug, trip.title, trip.subtitle, trip.startDate, trip.endDate, trip.visibility, trip.isSample,
                    trip.content.node()?.get("coverPhoto"), cityList, record.get("stop_count", Int::class.java),
                )
            }
    }

    private fun TripsRecord.toDocument(days: List<DayDocument>, places: List<PlaceDocument>, permissions: Permissions) = TripDocument(
        id, slug, title, subtitle, startDate, endDate, timezone, visibility, isSample, sourceTripId, version, content.node()!!, days, places, permissions,
    )

    private fun toStop(stop: StopsRecord) = StopDocument(
        id = stop.id,
        key = stop.key,
        position = stop.position,
        time = stop.startTime.format(hhmm),
        title = stop.title,
        type = stop.type,
        details = stop.details,
        duration = stop.duration,
        buffer = stop.buffer,
        timing = stop.timing,
        transportIcon = stop.transportIcon,
        coordinates = if (stop.lat != null && stop.lng != null) listOf(stop.lat, stop.lng) else null,
        approximate = stop.approximate,
        transit = stop.transit.node(),
        photo = stop.photo.node(),
        hotelPhoto = stop.hotelPhoto.node(),
        links = stop.links.node(),
        placeKey = stop.placeKey,
        guide = stop.guide.node(),
        optional = stop.optional,
        version = stop.version,
    )

    private fun JSONB?.node(): JsonNode? = this?.let { json.readTree(it.data()) }
}
