package com.tripnote.common

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import java.time.Duration
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.Callable
import java.util.concurrent.Future
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import org.springframework.beans.factory.ObjectProvider
import org.springframework.boot.availability.ApplicationAvailability
import org.springframework.boot.availability.ReadinessState
import org.springframework.boot.health.contributor.Status
import org.springframework.boot.health.actuate.endpoint.HealthEndpoint
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.web.filter.OncePerRequestFilter

/** Fresh parallel DB/Redis checks; a shared deadline, bounded work and no UP cache. */
class BoundedReadiness(
    private val acceptingTraffic: () -> Boolean,
    private val database: () -> Boolean,
    private val redis: () -> Boolean,
    private val budget: Duration = Duration.ofSeconds(3),
) : AutoCloseable {
    init { require(!budget.isNegative && !budget.isZero && budget <= Duration.ofSeconds(4)) }
    private val sequence = AtomicInteger()
    private val executor = ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS, ArrayBlockingQueue(2), { task ->
        Thread(task, "readiness-dependency-${sequence.incrementAndGet()}").apply { isDaemon = true }
    }, ThreadPoolExecutor.AbortPolicy())
    private data class Cycle(val deadline: Long, val checks: List<Future<Boolean>>)
    private val lock = Any()
    private var current: Cycle? = null

    fun healthy(): Boolean {
        if (!acceptingTraffic()) return false
        val cycle = synchronized(lock) {
            current ?: run {
                val deadline = System.nanoTime() + budget.toNanos()
                val checks = mutableListOf<Future<Boolean>>()
                try {
                    for (check in listOf(database, redis)) checks += executor.submit(Callable { check() })
                } catch (_: RuntimeException) {
                    cancel(checks)
                    return false
                }
                Cycle(deadline, checks).also { current = it }
            }
        }
        return try {
            cycle.checks.all { check ->
                val remaining = cycle.deadline - System.nanoTime()
                remaining > 0 && check.get(remaining, TimeUnit.NANOSECONDS)
            } && System.nanoTime() < cycle.deadline && acceptingTraffic()
        } catch (_: InterruptedException) {
            Thread.currentThread().interrupt()
            false
        } catch (_: Exception) {
            false
        } finally {
            synchronized(lock) {
                if (current === cycle) { cancel(cycle.checks); current = null }
            }
        }
    }

    private fun cancel(checks: List<Future<Boolean>>) {
        checks.filterNot { it.isDone }.forEach { it.cancel(true); executor.remove(it as Runnable) }
    }
    override fun close() { executor.shutdownNow() }
}

/** Answers the full readiness path without a second unbounded health aggregation. */
class BoundedReadinessFilter(private val readiness: BoundedReadiness) : OncePerRequestFilter() {
    override fun shouldNotFilter(request: HttpServletRequest): Boolean =
        request.method !in setOf("GET", "HEAD") ||
            request.requestURI.removePrefix(request.contextPath).trimEnd('/') != "/actuator/health/readiness"

    override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, chain: FilterChain) {
        val up = readiness.healthy()
        response.status = if (up) 200 else 503
        response.contentType = "application/json"
        response.setHeader("Cache-Control", "no-store")
        if (request.method != "HEAD") response.writer.write(if (up) "{\"status\":\"UP\"}" else "{\"status\":\"DOWN\"}")
    }
}

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = ["tripnote.readiness.bounded"], havingValue = "true")
class BoundedReadinessConfiguration {
    @Bean(destroyMethod = "close")
    fun boundedReadiness(availability: ApplicationAvailability, endpoint: ObjectProvider<HealthEndpoint>) =
        BoundedReadiness(
            { availability.readinessState == ReadinessState.ACCEPTING_TRAFFIC },
            { endpoint.getObject().healthForPath("db")?.status == Status.UP },
            { endpoint.getObject().healthForPath("redis")?.status == Status.UP },
        )
    @Bean
    fun boundedReadinessFilter(readiness: BoundedReadiness) = FilterRegistrationBean(BoundedReadinessFilter(readiness)).apply {
        order = Ordered.LOWEST_PRECEDENCE
        addUrlPatterns("/actuator/health/readiness", "/actuator/health/readiness/")
    }
}
