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
    @field:Size(max = 64) val timezone: String? = null,
    @field:Size(max = 40) val city: String? = null,
    @field:Valid @field:Size(max = 30) val travelers: List<TravelerRequest>? = null,
)

data class TravelerRequest(
    @field:NotBlank @field:Size(max = 30) val label: String,
    @field:Size(max = 16) val emoji: String? = null,
)

data class StopLinkRequest(
    @field:NotBlank @field:Size(max = 100) val label: String,
    @field:NotBlank @field:Size(max = 2048) val url: String,
    @field:Size(max = 1000) val note: String? = null,
)

data class UpdateTripRequest(
    val version: Int,
    @field:Size(min = 1, max = 60) @field:Pattern(regexp = ".*\\S.*") val title: String? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    @field:Pattern(regexp = "^(private|link|public)$") val visibility: String? = null,
)

data class UpdateDayRequest(
    val version: Int,
    @field:Size(max = 40) val city: String? = null,
    @field:Size(max = 200) val theme: String? = null,
    @field:Size(max = 4000) val note: String? = null,
)

data class CreateStopRequest(
    @field:NotBlank @field:Size(max = 80) val title: String,
    @field:Pattern(regexp = HHMM) val time: String,
    @field:Pattern(regexp = STOP_TYPES) val type: String? = null,
    @field:Size(max = 4000) val details: String? = null,
    @field:Size(max = 40) val duration: String? = null,
    @field:Size(min = 2, max = 2) val coordinates: List<Double?>? = null,
    val afterStopId: UUID? = null,
    @field:Valid @field:Size(max = 20) val links: List<StopLinkRequest>? = null,
    val clientMutationId: UUID? = null,
    @field:Size(max = 80) val buffer: String? = null,
)

data class UpdateStopRequest(
    val version: Int,
    @field:Size(min = 1, max = 80) @field:Pattern(regexp = ".*\\S.*") val title: String? = null,
    @field:Pattern(regexp = HHMM) val time: String? = null,
    @field:Pattern(regexp = STOP_TYPES) val type: String? = null,
    @field:Size(max = 4000) val details: String? = null,
    @field:Size(max = 40) val duration: String? = null,
    @field:Size(max = 80) val buffer: String? = null,
    @field:Size(min = 2, max = 2) val coordinates: List<Double?>? = null,
    val clearCoordinates: Boolean = false,
    @field:Valid @field:Size(max = 20) val links: List<StopLinkRequest>? = null,
)

data class ReorderRequest(@field:NotEmpty val stopIds: List<UUID>)

@RestController
class TripWriteController(private val tripsCommands: TripCommandService, private val stopCommands: StopCommandService, private val cloneService: TripCloneService) {
    @PostMapping("/api/v1/trips")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody body: CreateTripRequest, @AuthenticationPrincipal user: SessionUser): CreatedTrip =
        tripsCommands.create(user.userId, body.title, body.startDate, body.endDate, body.timezone, body.city, body.travelers)

    @PatchMapping("/api/v1/trips/{tripId}")
    fun updateTrip(@PathVariable tripId: UUID, @Valid @RequestBody body: UpdateTripRequest, @AuthenticationPrincipal user: SessionUser) =
        tripsCommands.update(tripId, user.userId, body)

    @DeleteMapping("/api/v1/trips/{tripId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteTrip(@PathVariable tripId: UUID, @RequestParam version: Int, @AuthenticationPrincipal user: SessionUser) =
        tripsCommands.delete(tripId, user.userId, version)

    @PatchMapping("/api/v1/days/{dayId}")
    fun updateDay(@PathVariable dayId: UUID, @Valid @RequestBody body: UpdateDayRequest, @AuthenticationPrincipal user: SessionUser) =
        tripsCommands.updateDay(dayId, user.userId, body)

    @PostMapping("/api/v1/trips/{slug}/clone")
    @ResponseStatus(HttpStatus.CREATED)
    fun clone(@PathVariable slug: String, @AuthenticationPrincipal user: SessionUser): CreatedTrip = cloneService.clone(slug, user.userId)

    @PostMapping("/api/v1/days/{dayId}/stops")
    @ResponseStatus(HttpStatus.CREATED)
    fun addStop(@PathVariable dayId: UUID, @Valid @RequestBody body: CreateStopRequest, @AuthenticationPrincipal user: SessionUser): StopDocument =
        stopCommands.add(dayId, user.userId, NewStop(body.title, LocalTime.parse(body.time), body.type, body.details, body.duration, body.coordinates, body.afterStopId, body.links, body.clientMutationId, body.buffer))

    @PatchMapping("/api/v1/stops/{stopId}")
    fun updateStop(@PathVariable stopId: UUID, @Valid @RequestBody body: UpdateStopRequest, @AuthenticationPrincipal user: SessionUser): StopDocument =
        stopCommands.update(
            stopId, user.userId,
            StopChanges(body.version, body.title, body.time?.let(LocalTime::parse), body.type, body.details, body.duration, body.buffer, body.coordinates, body.clearCoordinates, body.links),
        )

    @DeleteMapping("/api/v1/stops/{stopId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteStop(@PathVariable stopId: UUID, @RequestParam version: Int, @AuthenticationPrincipal user: SessionUser) =
        stopCommands.delete(stopId, user.userId, version)

    @PutMapping("/api/v1/days/{dayId}/stops/order")
    fun reorder(@PathVariable dayId: UUID, @Valid @RequestBody body: ReorderRequest, @AuthenticationPrincipal user: SessionUser): List<StopDocument> =
        stopCommands.reorder(dayId, user.userId, body.stopIds)
}
