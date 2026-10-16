package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import com.tripnote.trip.StopDocument
import java.time.LocalTime
import java.util.UUID
import com.tripnote.jooq.Tables.TRIPS
import com.tripnote.jooq.Tables.TRIP_DAYS
import com.tripnote.jooq.Tables.STOPS
import org.jooq.JSONB
import tools.jackson.databind.json.JsonMapper
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
    val links: List<StopLinkRequest>? = null,
    val clientMutationId: UUID? = null,
    val buffer: String? = null,
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
    val links: List<StopLinkRequest>? = null,
)

@Service
class StopCommandService(
    private val stops: StopRepository,
    private val days: TripDayRepository,
    private val access: TripAccess,
    private val queries: TripQueries,
    private val dsl: DSLContext,
    private val json: JsonMapper,
) {
    private val conflictMessage = "다른 곳에서 먼저 고친 내용이 있어요. 최신 내용을 확인하고 다시 저장해 주세요."

    @Transactional
    fun add(dayId: UUID, userId: UUID, command: NewStop): StopDocument {
        lockTripOfDay(dayId)
        val day = days.lockById(dayId) ?: throw access.notFound()
        access.requireEdit(day.tripId, userId)
        command.clientMutationId?.let { mutation ->
            val record = dsl.fetchOne("SELECT stop_id FROM stop_create_mutations WHERE user_id = ? AND day_id = ? AND client_mutation_id = ?", userId, dayId, mutation)
            if (record != null) {
                val existing = record.get("stop_id", UUID::class.java) ?: throw ApiException(HttpStatus.CONFLICT, "이미 삭제한 일정이에요.")
                return queries.stop(existing)
            }
        }
        checkLinks(command.links)
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
            buffer = command.buffer
            command.coordinates?.let { lat = it[0]; lng = it[1] }
        }
        val saved = try {
            stops.saveAndFlush(stop)
        } catch (exception: DataIntegrityViolationException) {
            throw positionConflict(exception, day.id)
        }
        command.links?.let { dsl.update(STOPS).set(STOPS.LINKS, JSONB.valueOf(json.writeValueAsString(it))).where(STOPS.ID.eq(saved.id)).execute() }
        command.clientMutationId?.let { dsl.execute("INSERT INTO stop_create_mutations(user_id, day_id, client_mutation_id, stop_id) VALUES (?, ?, ?, ?)", userId, dayId, it, saved.id) }
        touchTrip(day.tripId)
        return queries.stop(saved.id)
    }

    @Transactional
    fun update(stopId: UUID, userId: UUID, changes: StopChanges): StopDocument {
        lockTripOfStop(stopId)
        val stop = stops.findById(stopId).orElseThrow { access.notFound() }
        access.requireEdit(stop.tripId, userId)
        checkLinks(changes.links)
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
        if (changes.links != null && stop.version == changes.version) {
            dsl.update(STOPS).set(STOPS.VERSION, STOPS.VERSION.plus(1)).where(STOPS.ID.eq(stopId)).execute()
        }
        changes.links?.let { dsl.update(STOPS).set(STOPS.LINKS, JSONB.valueOf(json.writeValueAsString(it))).where(STOPS.ID.eq(stopId)).execute() }
        touchTrip(stop.tripId)
        return queries.stop(stopId)
    }

    @Transactional
    fun delete(stopId: UUID, userId: UUID, version: Int) {
        lockTripOfStop(stopId)
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
        lockTripOfDay(dayId)
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

    private fun lockTripOfDay(dayId: UUID) {
        val tripId = dsl.select(TRIP_DAYS.TRIP_ID).from(TRIP_DAYS).where(TRIP_DAYS.ID.eq(dayId)).fetchOne(TRIP_DAYS.TRIP_ID) ?: throw access.notFound()
        dsl.select(TRIPS.ID).from(TRIPS).where(TRIPS.ID.eq(tripId)).forUpdate().fetchOne() ?: throw access.notFound()
    }

    private fun lockTripOfStop(stopId: UUID) {
        val tripId = dsl.select(STOPS.TRIP_ID).from(STOPS).where(STOPS.ID.eq(stopId)).fetchOne(STOPS.TRIP_ID) ?: throw access.notFound()
        dsl.select(TRIPS.ID).from(TRIPS).where(TRIPS.ID.eq(tripId)).forUpdate().fetchOne() ?: throw access.notFound()
    }

    private fun checkLinks(links: List<StopLinkRequest>?) {
        links?.forEach { link ->
            val uri = runCatching { java.net.URI(link.url) }.getOrNull()
            if (uri == null || uri.scheme?.lowercase() !in setOf("https", "http") || uri.host.isNullOrBlank() || uri.userInfo != null) {
                throw ApiException(HttpStatus.BAD_REQUEST, "링크는 http 또는 https 주소로 입력해 주세요.")
            }
        }
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
