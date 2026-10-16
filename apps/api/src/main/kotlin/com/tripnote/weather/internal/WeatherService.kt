package com.tripnote.weather.internal

import com.tripnote.weather.WeatherResponse
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import kotlin.math.roundToLong
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import tools.jackson.databind.json.JsonMapper

data class CachedForecast(val fetchedAt: Instant, val days: List<DailyForecast>)

@Service
class WeatherService(
    private val source: ForecastSource,
    private val redis: StringRedisTemplate,
    private val json: JsonMapper,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun forecast(lat: Double, lng: Double, date: LocalDate, zone: ZoneId): WeatherResponse {
        val today = clock.instant().atZone(zone).toLocalDate()
        if (date.isBefore(today) || date.isAfter(today.plusDays(LAST_DAY_OFFSET))) {
            return WeatherResponse.empty(date, "out_of_range")
        }
        val roundedLat = round2(lat)
        val roundedLng = round2(lng)
        val key = "tripnote:weather:$roundedLat:$roundedLng:${zone.id}"
        val forecast = cached(key) ?: try {
            CachedForecast(clock.instant(), source.daily(roundedLat, roundedLng, zone.id))
                .also { redis.opsForValue().set(key, json.writeValueAsString(it), TTL) }
        } catch (exception: Exception) {
            log.warn("weather upstream unavailable for {}: {}", key, exception.message)
            return WeatherResponse.empty(date, "unavailable")
        }
        val day = forecast.days.firstOrNull { it.date == date } ?: return WeatherResponse.empty(date, "unavailable")
        return WeatherResponse(date, "ready", day.condition, day.high, day.low, day.rainChance, day.windSpeed, forecast.fetchedAt)
    }

    private fun cached(key: String): CachedForecast? =
        redis.opsForValue().get(key)?.let { runCatching { json.readValue(it, CachedForecast::class.java) }.getOrNull() }

    private fun round2(value: Double) = (value * 100).roundToLong() / 100.0

    companion object {
        /** Open-Meteo는 오늘을 포함해 16일을 준다. */
        const val LAST_DAY_OFFSET = 15L
        val TTL: Duration = Duration.ofMinutes(30)
    }
}
