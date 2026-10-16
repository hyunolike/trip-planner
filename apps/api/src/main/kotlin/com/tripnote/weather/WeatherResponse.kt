package com.tripnote.weather

import java.time.Instant
import java.time.LocalDate

/**
 * 여행일 하루의 예보.
 * status: ready(예보 있음), out_of_range(오늘부터 15일 뒤까지가 아님, 상류를 부르지 않음), unavailable(상류 실패 또는 그날 값 없음).
 */
data class WeatherResponse(
    val date: LocalDate,
    val status: String,
    val condition: Int?,
    val high: Double?,
    val low: Double?,
    val rainChance: Int?,
    val windSpeed: Double?,
    val checkedAt: Instant?,
) {
    companion object {
        fun empty(date: LocalDate, status: String) = WeatherResponse(date, status, null, null, null, null, null, null)
    }
}
