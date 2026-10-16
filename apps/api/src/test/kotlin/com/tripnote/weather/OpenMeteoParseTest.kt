package com.tripnote.weather

import com.tripnote.weather.internal.parseOpenMeteo
import java.time.LocalDate
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper

class OpenMeteoParseTest {
    private val json = JsonMapper.builder().build()

    @Test
    fun `daily arrays become one forecast per date and missing numbers stay null`() {
        val payload = json.readTree(
            """
            {"daily":{
              "time":["2026-10-21","2026-10-22"],
              "weather_code":[61,null],
              "temperature_2m_max":[22.4,19.0],
              "temperature_2m_min":[15.1,12.2],
              "precipitation_probability_max":[70,null],
              "wind_speed_10m_max":[4.25,2.0]
            }}
            """.trimIndent(),
        )

        val days = parseOpenMeteo(payload)

        assertThat(days).hasSize(2)
        assertThat(days[0].date).isEqualTo(LocalDate.parse("2026-10-21"))
        assertThat(days[0].condition).isEqualTo(61)
        assertThat(days[0].rainChance).isEqualTo(70)
        assertThat(days[0].windSpeed).isEqualTo(4.25)
        assertThat(days[1].condition).isNull()
        assertThat(days[1].rainChance).isNull()
    }

    @Test
    fun `an error payload is refused`() {
        assertThatThrownBy { parseOpenMeteo(json.readTree("""{"error":true,"reason":"bad"}""")) }
            .isInstanceOf(IllegalStateException::class.java)
    }
}
