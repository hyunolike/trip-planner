package com.tripnote

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.health.contributor.Health
import org.springframework.boot.health.contributor.HealthIndicator
import org.springframework.boot.health.registry.HealthContributorRegistry
import org.springframework.boot.health.registry.ReactiveHealthContributorRegistry
import org.springframework.boot.health.contributor.ReactiveHealthIndicator
import reactor.core.publisher.Mono
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.get
import java.time.Duration

@SpringBootTest(properties = ["tripnote.readiness.bounded=true"])
class BoundedReadinessIntegrationTest : IntegrationTest() {
    @Autowired lateinit var registry: HealthContributorRegistry
    @Autowired lateinit var reactive: ReactiveHealthContributorRegistry
    @Test fun `real actuator readiness uses both actual database and redis contributors`() {
        mvc.get("/actuator/health/readiness").andExpect { status { isOk() }; jsonPath("$.status") { value("UP") } }
        val originalDb = registry.unregisterContributor("db")!!
        try {
            registry.registerContributor("db", HealthIndicator { Health.down().build() })
            mvc.get("/actuator/health/readiness").andExpect { status { isServiceUnavailable() } }
            registry.unregisterContributor("db")
            mvc.get("/actuator/health/readiness").andExpect { status { isServiceUnavailable() } }
        } finally { registry.unregisterContributor("db"); registry.registerContributor("db", originalDb) }
        val originalRedis = reactive.unregisterContributor("redis")!!
        try {
            reactive.registerContributor("redis", ReactiveHealthIndicator { Mono.just(Health.down().build()) })
            mvc.get("/actuator/health/readiness").andExpect { status { isServiceUnavailable() } }
            reactive.unregisterContributor("redis")
            mvc.get("/actuator/health/readiness").andExpect { status { isServiceUnavailable() } }
        } finally { reactive.unregisterContributor("redis"); reactive.registerContributor("redis", originalRedis) }
        mvc.get("/actuator/health/readiness").andExpect { status { isOk() } }
    }
    @Test fun `the complete secured HTTP readiness path returns before five seconds on slow redis`() {
        val original = reactive.unregisterContributor("redis")!!
        try {
            reactive.registerContributor("redis", ReactiveHealthIndicator { Mono.fromCallable { Thread.sleep(15000); Health.up().build() } })
            val start = System.nanoTime()
            mvc.get("/actuator/health/readiness").andExpect { status { isServiceUnavailable() }; jsonPath("$.status") { value("DOWN") } }
            assertThat(Duration.ofNanos(System.nanoTime()-start)).isLessThan(Duration.ofMillis(4500))
            mvc.get("/api/v1/me").andExpect { status { isUnauthorized() } }
        } finally { reactive.unregisterContributor("redis"); reactive.registerContributor("redis", original) }
    }
}
