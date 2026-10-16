package com.tripnote.support

import com.tripnote.weather.internal.DailyForecast
import com.tripnote.weather.internal.ForecastSource
import java.time.LocalDate
import java.util.concurrent.CopyOnWriteArrayList

/** 2026-10-16부터 16일치 같은 예보를 돌려준다. 호출 기록과 1회 실패를 흉내 낸다. */
class FakeForecastSource : ForecastSource {
    val calls = CopyOnWriteArrayList<Triple<Double, Double, String>>()
    @Volatile var failNext = false

    fun reset() {
        calls.clear()
        failNext = false
    }

    override fun daily(lat: Double, lng: Double, timezone: String): List<DailyForecast> {
        calls += Triple(lat, lng, timezone)
        if (failNext) {
            failNext = false
            throw IllegalStateException("upstream down")
        }
        val start = LocalDate.parse("2026-10-16")
        return (0L until 16L).map {
            DailyForecast(start.plusDays(it), condition = 3, high = 21.5, low = 14.0, rainChance = 40, windSpeed = 3.2)
        }
    }
}
