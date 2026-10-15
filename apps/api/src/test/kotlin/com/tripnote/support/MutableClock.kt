package com.tripnote.support

import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

class MutableClock : Clock() {
    private val start = Instant.parse("2026-10-16T00:00:00Z")
    @Volatile private var now = start

    override fun getZone(): ZoneId = ZoneOffset.UTC
    override fun withZone(zone: ZoneId): Clock = this
    override fun instant(): Instant = now

    fun advance(duration: Duration) { now = now.plus(duration) }
    fun reset() { now = start }
}
