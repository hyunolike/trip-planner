package com.tripnote

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.get

class HealthTest : IntegrationTest() {
    @org.springframework.beans.factory.annotation.Autowired lateinit var env: org.springframework.core.env.Environment


    @Test
    fun `health is up with database and valkey`() {
        mvc.get("/actuator/health").andExpect {
            status { isOk() }
            jsonPath("$.status") { value("UP") }
        }
    }

    @Test
    fun `readiness and liveness probes are public and up`() {
        for (probe in listOf("readiness", "liveness")) {
            mvc.get("/actuator/health/$probe").andExpect {
                status { isOk() }
                jsonPath("$.status") { value("UP") }
            }
        }
    }

    @Test
    fun `readiness group includes database and valkey but not mail`() {
        val include = env.getProperty("management.endpoint.health.group.readiness.include")!!.split(",").map { it.trim() }
        org.assertj.core.api.Assertions.assertThat(include).contains("readinessState", "db", "redis").doesNotContain("mail")
    }
}
