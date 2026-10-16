package com.tripnote.trip.internal

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface TripRepository : JpaRepository<TripEntity, UUID> {
    fun existsBySlug(slug: String): Boolean
}

interface TripDayRepository : JpaRepository<TripDayEntity, UUID>

interface StopRepository : JpaRepository<StopEntity, UUID> {
    fun findByDayIdOrderByPositionAsc(dayId: UUID): List<StopEntity>
}
