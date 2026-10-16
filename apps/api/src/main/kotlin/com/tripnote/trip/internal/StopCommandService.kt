package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import com.tripnote.trip.StopDocument
import java.time.LocalTime
import java.util.UUID
import com.tripnote.jooq.Tables.TRIPS
import org.jooq.DSLContext
import org.jooq.impl.DSL
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.orm.ObjectOptimisticLockingFailureException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

data class NewStop(
    val title: String,
    val time: LocalTime,
    val type: String?,
    val details: String?,
    val duration: String?,
    val coordinates: List<Double?>?,
    val afterStopId: UUID?,
)

data class StopChanges(
    val version: Int,
    val title: String?,
    val time: LocalTime?,
    val type: String?,
    val details: String?,
    val duration: String?,
    val buffer: String?,
    val coordinates: List<Double?>?,
    val clearCoordinates: Boolean,
)

@Service
class StopCommandService(
    private val stops: StopRepository,
    private val days: TripDayRepository,
    private val access: TripAccess,
    private val queries: TripQueries,
    private val dsl: DSLContext,
) {
    private val conflictMessage = "다른 곳에서 먼저 고친 내용이 있어요. 최신 내용을 확인하고 다시 저장해 주세요."

    @Transactional
    fun add(dayId: UUID, userId: UUID, command: NewStop): StopDocument {
        val day = days.lockById(dayId) ?: throw access.notFound()
        access.requireEdit(day.tripId, userId)
        checkCoordinates(command.coordinates)
        val ordered = stops.findByDayIdOrderByPositionAsc(dayId)
        val afterIndex = command.afterStopId?.let { id -> ordered.indexOfFirst { it.id == id }.also { if (it < 0) throw ApiException(HttpStatus.BAD_REQUEST, "이 날짜에 없는 일정 뒤에는 추가할 수 없어요.") } }
        val before = afterIndex?.let { ordered[it].position } ?: ordered.lastOrNull()?.position
        val after = afterIndex?.let { ordered.getOrNull(it + 1)?.position }
        val stop = StopEntity(
            tripId = day.tripId,
            dayId = dayId,
            key = "s-${UUID.randomUUID().toString().take(8)}",
            position = FractionalIndex.between(before, after),
            time = command.time,
            title = command.title.trim(),
            type = command.type ?: "sight",
            details = command.details.orEmpty(),
        ).apply {
            duration = command.duration
            command.coordinates?.let { lat = it[0]; lng = it[1] }
        }
        val saved = try {
            stops.saveAndFlush(stop)
        } catch (exception: DataIntegrityViolationException) {
            throw positionConflict(exception, day.id)
        }
        touchTrip(day.tripId)
        return queries.stop(saved.id)
    }

    @Transactional
    fun update(stopId: UUID, userId: UUID, changes: StopChanges): StopDocument {
        val stop = stops.findById(stopId).orElseThrow { access.notFound() }
        access.requireEdit(stop.tripId, userId)
        checkCoordinates(changes.coordinates)
        if (changes.clearCoordinates && changes.coordinates != null) throw ApiException(HttpStatus.BAD_REQUEST, "좌표를 지우면서 동시에 지정할 수 없어요.")
        if (stop.version != changes.version) throw ApiException(HttpStatus.CONFLICT, conflictMessage, body = queries.stop(stopId))
        changes.title?.let { stop.title = it.trim() }
        changes.time?.let { stop.time = it }
        changes.type?.let { stop.type = it }
        changes.details?.let { stop.details = it }
        changes.duration?.let { stop.duration = it.ifEmpty { null } }
        changes.buffer?.let { stop.buffer = it.ifEmpty { null } }
        changes.coordinates?.let { stop.lat = it[0]; stop.lng = it[1] }
        if (changes.clearCoordinates) { stop.lat = null; stop.lng = null }
        try {
            stops.saveAndFlush(stop)
        } catch (exception: ObjectOptimisticLockingFailureException) {
            throw ApiException(HttpStatus.CONFLICT, conflictMessage, body = queries.stop(stopId))
        }
        touchTrip(stop.tripId)
        return queries.stop(stopId)
    }

    @Transactional
    fun delete(stopId: UUID, userId: UUID, version: Int) {
        val stop = stops.findById(stopId).orElseThrow { access.notFound() }
        access.requireEdit(stop.tripId, userId)
        if (stop.version != version) throw ApiException(HttpStatus.CONFLICT, conflictMessage, body = queries.stop(stopId))
        try {
            stops.delete(stop)
            stops.flush()
        } catch (exception: ObjectOptimisticLockingFailureException) {
            throw ApiException(HttpStatus.CONFLICT, conflictMessage, body = runCatching { queries.stop(stopId) }.getOrNull())
        }
        touchTrip(stop.tripId)
    }

    @Transactional
    fun reorder(dayId: UUID, userId: UUID, stopIds: List<UUID>): List<StopDocument> {
        val day = days.lockById(dayId) ?: throw access.notFound()
        access.requireEdit(day.tripId, userId)
        val current = stops.findByDayIdOrderByPositionAsc(dayId)
        if (stopIds.size != current.size || stopIds.toSet() != current.map { it.id }.toSet()) throw invalidOrder()
        val byId = current.associateBy { it.id }
        var position: String? = null
        stopIds.forEach { id ->
            position = FractionalIndex.between(position, null)
            byId.getValue(id).position = position!!
        }
        try {
            stops.flush()
        } catch (exception: ObjectOptimisticLockingFailureException) {
            throw ApiException(HttpStatus.CONFLICT, conflictMessage, body = queries.stopsOfDay(dayId))
        } catch (exception: DataIntegrityViolationException) {
            throw positionConflict(exception, dayId)
        }
        touchTrip(day.tripId)
        return queries.stopsOfDay(dayId)
    }

    /** 스톱 쓰기마다 여행 버전을 올린다. 클라이언트는 이 값을 변경 표지로 쓴다. */
    private fun touchTrip(tripId: UUID) {
        dsl.update(TRIPS).set(TRIPS.VERSION, TRIPS.VERSION.plus(1)).set(TRIPS.UPDATED_AT, DSL.currentOffsetDateTime())
            .where(TRIPS.ID.eq(tripId)).execute()
    }

    private fun positionConflict(exception: DataIntegrityViolationException, dayId: UUID): ApiException {
        if (exception.mostSpecificCause.message?.contains("stops_day_position_key") != true) throw exception
        return ApiException(HttpStatus.CONFLICT, conflictMessage, body = queries.stopsOfDay(dayId))
    }

    private fun checkCoordinates(coordinates: List<Double?>?) {
        if (coordinates != null && (coordinates.size != 2 || coordinates.any { it == null } ||
                coordinates[0]!! !in -90.0..90.0 || coordinates[1]!! !in -180.0..180.0)) {
            throw ApiException(HttpStatus.BAD_REQUEST, "좌표 값을 확인해 주세요.")
        }
    }

    private fun invalidOrder() = ApiException(HttpStatus.BAD_REQUEST, "이 날짜의 일정 전체를 한 번씩 순서대로 보내 주세요.")
}
