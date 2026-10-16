package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import com.tripnote.jooq.Tables.TRIP_MEMBERS
import com.tripnote.jooq.Tables.TRIPS
import com.tripnote.jooq.Tables.TRIP_DAYS
import com.tripnote.jooq.Tables.STOPS
import com.tripnote.trip.TripDocument
import org.jooq.JSONB
import org.jooq.impl.DSL
import tools.jackson.databind.json.JsonMapper
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID
import org.jooq.DSLContext
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

data class CreatedTrip(val id: UUID, val slug: String)

@Service
class TripCommandService(
    private val trips: TripRepository,
    private val days: TripDayRepository,
    private val slugs: SlugGenerator,
    private val dsl: DSLContext,
    private val access: TripAccess,
    private val queries: TripQueries,
    private val json: JsonMapper,
) {
    @Transactional
    fun create(ownerId: UUID, title: String, startDate: LocalDate, endDate: LocalDate, timezone: String?, city: String?, travelers: List<TravelerRequest>? = null): CreatedTrip {
        if (endDate.isBefore(startDate)) throw ApiException(HttpStatus.BAD_REQUEST, "돌아오는 날이 떠나는 날보다 빠를 수 없어요.")
        timezone?.let { runCatching { java.time.ZoneId.of(it) }.getOrElse { throw ApiException(HttpStatus.BAD_REQUEST, "시간대를 확인해 주세요.") } }
        val length = ChronoUnit.DAYS.between(startDate, endDate) + 1
        if (length > 30) throw ApiException(HttpStatus.BAD_REQUEST, "여행 기간은 30일까지 만들 수 있어요.")

        val trip = trips.saveAndFlush(
            TripEntity(slug = slugs.next(), ownerId = ownerId, title = title.trim(), startDate = startDate, endDate = endDate, timezone = timezone ?: "Asia/Seoul"),
        )
        (0 until length).forEach { offset ->
            days.save(TripDayEntity(tripId = trip.id, number = offset.toInt() + 1, date = startDate.plusDays(offset), city = city.orEmpty()))
        }
        dsl.insertInto(TRIP_MEMBERS)
            .set(TRIP_MEMBERS.TRIP_ID, trip.id).set(TRIP_MEMBERS.USER_ID, ownerId).set(TRIP_MEMBERS.ROLE, "owner")
            .execute()
        if (travelers != null) {
            dsl.update(TRIPS).set(TRIPS.CONTENT, JSONB.valueOf(json.writeValueAsString(mapOf("travelers" to travelers))))
                .where(TRIPS.ID.eq(trip.id)).execute()
        }
        return CreatedTrip(trip.id, trip.slug)
    }
    private val conflictMessage = "다른 곳에서 먼저 고친 내용이 있어요. 최신 내용을 확인하고 다시 저장해 주세요."

    private fun lock(tripId: UUID) {
        if (dsl.select(TRIPS.ID).from(TRIPS).where(TRIPS.ID.eq(tripId)).forUpdate().fetchOne() == null) throw access.notFound()
    }

    private fun checkVersion(tripId: UUID, version: Int, userId: UUID): String {
        val trip = dsl.selectFrom(TRIPS).where(TRIPS.ID.eq(tripId)).fetchSingle()
        if (trip.version != version) throw ApiException(HttpStatus.CONFLICT, conflictMessage, body = queries.find(trip.slug, userId))
        return trip.slug
    }

    private fun validateDates(start: LocalDate, end: LocalDate): Int {
        if (end.isBefore(start)) throw ApiException(HttpStatus.BAD_REQUEST, "돌아오는 날이 떠나는 날보다 빠를 수 없어요.")
        val length = ChronoUnit.DAYS.between(start, end) + 1
        if (length > 30) throw ApiException(HttpStatus.BAD_REQUEST, "여행 기간은 30일까지 만들 수 있어요.")
        return length.toInt()
    }

    @Transactional
    fun update(tripId: UUID, userId: UUID, command: UpdateTripRequest): TripDocument {
        lock(tripId)
        access.requireOwner(tripId, userId)
        val slug = checkVersion(tripId, command.version, userId)
        val trip = dsl.selectFrom(TRIPS).where(TRIPS.ID.eq(tripId)).fetchSingle()
        val start = command.startDate ?: trip.startDate
        val end = command.endDate ?: trip.endDate
        val length = validateDates(start, end)
        val existing = dsl.selectFrom(TRIP_DAYS).where(TRIP_DAYS.TRIP_ID.eq(tripId)).orderBy(TRIP_DAYS.NUMBER).fetch()
        val removed = existing.filter { it.number > length }
        val populated = removed.any { day ->
            day.city.isNotBlank() || day.theme.isNotBlank() || !day.note.isNullOrBlank() || !day.color.isNullOrBlank() || day.tour != null ||
                dsl.fetchExists(dsl.selectOne().from(STOPS).where(STOPS.DAY_ID.eq(day.id)))
        }
        if (populated) throw ApiException(HttpStatus.CONFLICT, "일정이나 메모가 있는 날짜는 줄일 수 없어요. 내용을 옮긴 뒤 다시 저장해 주세요.", body = queries.find(slug, userId))
        removed.forEach { dsl.deleteFrom(TRIP_DAYS).where(TRIP_DAYS.ID.eq(it.id)).execute() }
        existing.filter { it.number <= length }.forEach { day ->
            dsl.update(TRIP_DAYS).set(TRIP_DAYS.DATE, start.plusDays(day.number.toLong() - 1)).where(TRIP_DAYS.ID.eq(day.id)).execute()
        }
        ((existing.size + 1)..length).forEach { number ->
            dsl.insertInto(TRIP_DAYS).set(TRIP_DAYS.TRIP_ID, tripId).set(TRIP_DAYS.NUMBER, number)
                .set(TRIP_DAYS.DATE, start.plusDays(number.toLong() - 1)).execute()
        }
        dsl.update(TRIPS).set(TRIPS.TITLE, command.title?.trim() ?: trip.title)
            .set(TRIPS.START_DATE, start).set(TRIPS.END_DATE, end).set(TRIPS.VISIBILITY, command.visibility ?: trip.visibility)
            .set(TRIPS.VERSION, TRIPS.VERSION.plus(1)).set(TRIPS.UPDATED_AT, DSL.currentOffsetDateTime()).where(TRIPS.ID.eq(tripId)).execute()
        return queries.find(slug, userId)!!
    }

    @Transactional
    fun delete(tripId: UUID, userId: UUID, version: Int) {
        lock(tripId)
        access.requireOwner(tripId, userId)
        checkVersion(tripId, version, userId)
        dsl.deleteFrom(TRIPS).where(TRIPS.ID.eq(tripId)).execute()
    }

    @Transactional
    fun updateDay(dayId: UUID, userId: UUID, command: UpdateDayRequest): TripDocument {
        val tripId = dsl.select(TRIP_DAYS.TRIP_ID).from(TRIP_DAYS).where(TRIP_DAYS.ID.eq(dayId)).fetchOne(TRIP_DAYS.TRIP_ID) ?: throw access.notFound()
        lock(tripId)
        access.requireEdit(tripId, userId)
        val slug = checkVersion(tripId, command.version, userId)
        val day = dsl.selectFrom(TRIP_DAYS).where(TRIP_DAYS.ID.eq(dayId)).fetchOne() ?: throw access.notFound()
        dsl.update(TRIP_DAYS).set(TRIP_DAYS.CITY, command.city ?: day.city).set(TRIP_DAYS.THEME, command.theme ?: day.theme)
            .set(TRIP_DAYS.NOTE, command.note ?: day.note).where(TRIP_DAYS.ID.eq(dayId)).execute()
        dsl.update(TRIPS).set(TRIPS.VERSION, TRIPS.VERSION.plus(1)).set(TRIPS.UPDATED_AT, DSL.currentOffsetDateTime()).where(TRIPS.ID.eq(tripId)).execute()
        return queries.find(slug, userId)!!
    }
}
