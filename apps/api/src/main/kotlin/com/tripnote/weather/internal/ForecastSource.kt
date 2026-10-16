package com.tripnote.weather.internal

import java.net.http.HttpClient
import java.time.Duration
import java.time.LocalDate
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper

data class DailyForecast(
    val date: LocalDate,
    val condition: Int?,
    val high: Double?,
    val low: Double?,
    val rainChance: Int?,
    val windSpeed: Double?,
)

fun interface ForecastSource {
    /** 오늘부터 16일치 일별 예보. 실패하면 예외를 던진다. */
    fun daily(lat: Double, lng: Double, timezone: String): List<DailyForecast>
}

private const val DAILY_FIELDS =
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max"

@Component
class OpenMeteoForecastSource(builder: RestClient.Builder, private val json: JsonMapper) : ForecastSource {
    private val client = builder
        .baseUrl("https://api.open-meteo.com")
        .requestFactory(
            JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build())
                .apply { setReadTimeout(Duration.ofSeconds(5)) },
        )
        .build()

    override fun daily(lat: Double, lng: Double, timezone: String): List<DailyForecast> {
        val body = client.get()
            .uri {
                it.path("/v1/forecast")
                    .queryParam("latitude", lat)
                    .queryParam("longitude", lng)
                    .queryParam("daily", DAILY_FIELDS)
                    .queryParam("timezone", timezone)
                    .queryParam("forecast_days", 16)
                    .queryParam("wind_speed_unit", "ms")
                    .build()
            }
            .retrieve()
            .body(String::class.java) ?: error("empty forecast")
        return parseOpenMeteo(json.readTree(body))
    }
}

internal fun parseOpenMeteo(root: JsonNode): List<DailyForecast> {
    val daily = root.path("daily")
    val dates = daily.path("time")
    check(dates.isArray && dates.size() > 0) { "forecast has no days" }
    fun number(field: String, index: Int): Double? =
        daily.path(field).path(index).takeIf { it.isNumber }?.asDouble()
    return (0 until dates.size()).map { index ->
        DailyForecast(
            date = LocalDate.parse(dates.path(index).asString()),
            condition = number("weather_code", index)?.toInt(),
            high = number("temperature_2m_max", index),
            low = number("temperature_2m_min", index),
            rainChance = number("precipitation_probability_max", index)?.toInt(),
            windSpeed = number("wind_speed_10m_max", index),
        )
    }
}
