package com.tripnote.trip.internal

import com.tripnote.auth.SessionUser
import com.tripnote.trip.StopDocument
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

private const val HHMM = "^([01][0-9]|2[0-3]):[0-5][0-9]$"
private const val STOP_TYPES = "^(airport|flight|transport|hotel|meal|sight|shopping|free|breakfast|bath|tour)$"

data class CreateTripRequest(
    @field:NotBlank @field:Size(max = 60) val title: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val timezone: String? = null,
    @field:Size(max = 40) val city: String? = null,
)

data class CreateStopRequest(
    @field:NotBlank @field:Size(max = 80) val title: String,
    @field:Pattern(regexp = HHMM) val time: String,
    @field:Pattern(regexp = STOP_TYPES) val type: String? = null,
    val details: String? = null,
    @field:Size(max = 40) val duration: String? = null,
    @field:Size(min = 2, max = 2) val coordinates: List<Double>? = null,
    val afterStopId: UUID? = null,
)

data class UpdateStopRequest(
    val version: Int,
    @field:Size(min = 1, max = 80) @field:Pattern(regexp = ".*\\S.*") val title: String? = null,
    @field:Pattern(regexp = HHMM) val time: String? = null,
    @field:Pattern(regexp = STOP_TYPES) val type: String? = null,
    val details: String? = null,
    @field:Size(max = 40) val duration: String? = null,
    @field:Size(max = 80) val buffer: String? = null,
    @field:Size(min = 2, max = 2) val coordinates: List<Double>? = null,
    val clearCoordinates: Boolean = false,
)

data class ReorderRequest(@field:NotEmpty val stopIds: List<UUID>)

@RestController
class TripWriteController(private val tripsCommands: TripCommandService, private val stopCommands: StopCommandService) {
    @PostMapping("/api/v1/trips")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody body: CreateTripRequest, @AuthenticationPrincipal user: SessionUser): CreatedTrip =
        tripsCommands.create(user.userId, body.title, body.startDate, body.endDate, body.timezone, body.city)

    @PostMapping("/api/v1/days/{dayId}/stops")
    @ResponseStatus(HttpStatus.CREATED)
    fun addStop(@PathVariable dayId: UUID, @Valid @RequestBody body: CreateStopRequest, @AuthenticationPrincipal user: SessionUser): StopDocument =
        stopCommands.add(dayId, user.userId, NewStop(body.title, LocalTime.parse(body.time), body.type, body.details, body.duration, body.coordinates, body.afterStopId))

    @PatchMapping("/api/v1/stops/{stopId}")
    fun updateStop(@PathVariable stopId: UUID, @Valid @RequestBody body: UpdateStopRequest, @AuthenticationPrincipal user: SessionUser): StopDocument =
        stopCommands.update(
            stopId, user.userId,
            StopChanges(body.version, body.title, body.time?.let(LocalTime::parse), body.type, body.details, body.duration, body.buffer, body.coordinates, body.clearCoordinates),
        )

    @DeleteMapping("/api/v1/stops/{stopId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteStop(@PathVariable stopId: UUID, @RequestParam version: Int, @AuthenticationPrincipal user: SessionUser) =
        stopCommands.delete(stopId, user.userId, version)

    @PutMapping("/api/v1/days/{dayId}/stops/order")
    fun reorder(@PathVariable dayId: UUID, @Valid @RequestBody body: ReorderRequest, @AuthenticationPrincipal user: SessionUser): List<StopDocument> =
        stopCommands.reorder(dayId, user.userId, body.stopIds)
}
