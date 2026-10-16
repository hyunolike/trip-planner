package com.tripnote.weather.internal

import com.tripnote.common.ApiException
import com.tripnote.common.RateLimiter
import com.tripnote.weather.WeatherResponse
import jakarta.servlet.http.HttpServletRequest
import java.time.Duration
import java.time.LocalDate
import java.time.ZoneId
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
class WeatherController(private val weather: WeatherService, private val rateLimiter: RateLimiter) {
    @GetMapping("/api/v1/weather")
    fun weather(
        @RequestParam lat: Double,
        @RequestParam lng: Double,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) date: LocalDate,
        @RequestParam(defaultValue = "Asia/Seoul") timezone: String,
        request: HttpServletRequest,
    ): WeatherResponse {
        if (!lat.isFinite() || !lng.isFinite() || lat !in -90.0..90.0 || lng !in -180.0..180.0) {
            throw ApiException(HttpStatus.BAD_REQUEST, "위치를 확인해 주세요.")
        }
        val zone = runCatching { ZoneId.of(timezone) }
            .getOrElse { throw ApiException(HttpStatus.BAD_REQUEST, "시간대를 확인해 주세요.") }
        rateLimiter.check("weather-ip", request.remoteAddr, limit = 60, window = Duration.ofMinutes(1))
        return weather.forecast(lat, lng, date, zone)
    }
}
