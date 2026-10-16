package com.tripnote.weather

import com.tripnote.IntegrationTest
import com.tripnote.support.FakeForecastSource
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.get

class WeatherApiTest : IntegrationTest() {
    @Autowired lateinit var forecasts: FakeForecastSource

    @BeforeEach
    fun resetFake() = forecasts.reset()

    private fun weather(
        lat: String = "34.6937",
        lng: String = "135.5023",
        date: String = "2026-10-18",
        timezone: String = "Asia/Tokyo",
    ) = mvc.get("/api/v1/weather") {
        param("lat", lat)
        param("lng", lng)
        param("date", date)
        param("timezone", timezone)
    }

    @Test
    fun `a date inside the forecast window returns that day without logging in`() {
        weather().andExpect {
            status { isOk() }
            jsonPath("$.status") { value("ready") }
            jsonPath("$.date") { value("2026-10-18") }
            jsonPath("$.condition") { value(3) }
            jsonPath("$.high") { value(21.5) }
            jsonPath("$.low") { value(14.0) }
            jsonPath("$.rainChance") { value(40) }
            jsonPath("$.windSpeed") { value(3.2) }
            jsonPath("$.checkedAt") { value("2026-10-16T00:00:00Z") }
        }
        assertThat(forecasts.calls).containsExactly(Triple(34.69, 135.5, "Asia/Tokyo"))
    }

    @Test
    fun `nearby points share one upstream call and the cache lives for 30 minutes`() {
        weather(lat = "34.6937", lng = "135.5023")
        weather(lat = "34.6912", lng = "135.4981", date = "2026-10-20")

        assertThat(forecasts.calls).hasSize(1)
        val ttl = redis.getExpire("tripnote:weather:34.69:135.5:Asia/Tokyo")
        assertThat(ttl).isBetween(1700L, 1800L)
    }

    @Test
    fun `a date outside the forecast window does not call upstream`() {
        weather(date = "2027-03-02").andExpect {
            status { isOk() }
            jsonPath("$.status") { value("out_of_range") }
            jsonPath("$.high") { doesNotExist() }
        }
        weather(date = "2026-10-15").andExpect { jsonPath("$.status") { value("out_of_range") } }
        weather(date = "2026-11-01").andExpect { jsonPath("$.status") { value("out_of_range") } }
        weather(date = "2026-10-31").andExpect { jsonPath("$.status") { value("ready") } }

        assertThat(forecasts.calls).hasSize(1)
    }

    @Test
    fun `an upstream failure is reported in the body and not cached`() {
        forecasts.failNext = true

        weather().andExpect {
            status { isOk() }
            jsonPath("$.status") { value("unavailable") }
        }
        weather().andExpect { jsonPath("$.status") { value("ready") } }

        assertThat(forecasts.calls).hasSize(2)
    }

    @Test
    fun `invalid coordinates, dates and time zones are rejected before upstream`() {
        weather(lat = "91").andExpect { status { isBadRequest() } }
        weather(lng = "-181").andExpect { status { isBadRequest() } }
        weather(lat = "NaN").andExpect { status { isBadRequest() } }
        weather(timezone = "Mars/Base").andExpect { status { isBadRequest() } }
        weather(date = "2026-13-40").andExpect { status { isBadRequest() } }

        assertThat(forecasts.calls).isEmpty()
    }

    @Test
    fun `one client is limited to 60 requests a minute`() {
        repeat(60) { weather().andExpect { status { isOk() } } }

        weather().andExpect { status { isTooManyRequests() } }
    }
}
