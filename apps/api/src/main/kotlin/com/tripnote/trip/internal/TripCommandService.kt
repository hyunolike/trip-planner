package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import com.tripnote.jooq.Tables.TRIP_MEMBERS
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
) {
    @Transactional
    fun create(ownerId: UUID, title: String, startDate: LocalDate, endDate: LocalDate, timezone: String?, city: String?): CreatedTrip {
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
        return CreatedTrip(trip.id, trip.slug)
    }
}
