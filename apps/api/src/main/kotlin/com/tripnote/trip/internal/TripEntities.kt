package com.tripnote.trip.internal

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import org.hibernate.annotations.UuidGenerator

@Entity
@Table(name = "trips")
class TripEntity(
    @Column(nullable = false, updatable = false) val slug: String,
    @Column(nullable = false, updatable = false) val ownerId: UUID,
    @Column(nullable = false) var title: String,
    @Column(nullable = false) var startDate: LocalDate,
    @Column(nullable = false) var endDate: LocalDate,
    @Column(nullable = false) var timezone: String,
    @Column(nullable = false) var visibility: String = "private",
    @Column(nullable = false) val isSample: Boolean = false,
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    var subtitle: String? = null
    var sourceTripId: UUID? = null
    @Version var version: Int = 0
    var createdAt: Instant = Instant.now()
    var updatedAt: Instant = Instant.now()
}

@Entity
@Table(name = "trip_days")
class TripDayEntity(
    @Column(nullable = false, updatable = false) val tripId: UUID,
    @Column(nullable = false) var number: Int,
    @Column(nullable = false) var date: LocalDate,
    @Column(nullable = false) var city: String = "",
    @Column(nullable = false) var theme: String = "",
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID
}

@Entity
@Table(name = "stops")
class StopEntity(
    @Column(nullable = false, updatable = false) val tripId: UUID,
    @Column(nullable = false) var dayId: UUID,
    @Column(nullable = false, updatable = false) val key: String,
    @Column(nullable = false) var position: String,
    @Column(name = "start_time", nullable = false) var time: LocalTime,
    @Column(nullable = false) var title: String,
    @Column(nullable = false) var type: String = "sight",
    @Column(nullable = false) var details: String = "",
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    var duration: String? = null
    var buffer: String? = null
    var lat: Double? = null
    var lng: Double? = null
    @Version var version: Int = 0
}
