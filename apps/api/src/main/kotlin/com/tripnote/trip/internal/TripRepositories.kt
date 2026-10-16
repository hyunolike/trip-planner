package com.tripnote.trip.internal

import jakarta.persistence.LockModeType
import java.util.UUID
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.jpa.repository.JpaRepository

interface TripRepository : JpaRepository<TripEntity, UUID> {
    fun existsBySlug(slug: String): Boolean
}

interface TripDayRepository : JpaRepository<TripDayEntity, UUID> {
    /** 같은 날짜의 스톱 편집을 직렬화한다. 위치 계산 전에 호출한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from TripDayEntity d where d.id = :id")
    fun lockById(id: UUID): TripDayEntity?
}

interface StopRepository : JpaRepository<StopEntity, UUID> {
    fun findByDayIdOrderByPositionAsc(dayId: UUID): List<StopEntity>
}
