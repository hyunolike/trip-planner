package com.tripnote.trip

import java.time.LocalDate
import java.util.UUID
import tools.jackson.databind.JsonNode

data class Permissions(val canEdit: Boolean, val canClone: Boolean)

data class StopDocument(
    val id: UUID,
    val key: String,
    val position: String,
    val time: String,
    val title: String,
    val type: String,
    val details: String,
    val duration: String?,
    val buffer: String?,
    val timing: String?,
    val transportIcon: String?,
    val coordinates: List<Double>?,
    val approximate: Boolean,
    val transit: JsonNode?,
    val photo: JsonNode?,
    val hotelPhoto: JsonNode?,
    val links: JsonNode?,
    val placeKey: String?,
    val guide: JsonNode?,
    val optional: Boolean,
    val version: Int,
)

data class DayDocument(
    val id: UUID,
    val number: Int,
    val date: LocalDate,
    val city: String,
    val theme: String,
    val note: String?,
    val color: String?,
    val tour: JsonNode?,
    val stops: List<StopDocument>,
)

data class PlaceDocument(val id: UUID, val key: String, val kind: String, val name: String, val area: String, val details: JsonNode)

data class TripDocument(
    val id: UUID,
    val slug: String,
    val title: String,
    val subtitle: String?,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val timezone: String,
    val visibility: String,
    val isSample: Boolean,
    val sourceTripId: UUID?,
    val version: Int,
    val content: JsonNode,
    val days: List<DayDocument>,
    val places: List<PlaceDocument>,
    val permissions: Permissions,
)

data class TripSummary(
    val slug: String,
    val title: String,
    val subtitle: String?,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val visibility: String,
    val isSample: Boolean,
    val coverPhoto: JsonNode?,
    val cities: List<String>,
    val stopCount: Int,
)
