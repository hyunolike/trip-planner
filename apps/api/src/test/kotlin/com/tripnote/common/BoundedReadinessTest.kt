package com.tripnote.common

import java.time.Duration
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse

class BoundedReadinessTest {
    private fun request(probe: BoundedReadiness): MockHttpServletResponse {
        val response = MockHttpServletResponse()
        BoundedReadinessFilter(probe).doFilter(MockHttpServletRequest("GET", "/actuator/health/readiness"), response) { _, _ -> error("unbounded chain must not run") }
        return response
    }

    @Test fun `both dependencies and accepting state must be up, without a healthy cache`() {
        val db = AtomicBoolean(true); val redis = AtomicBoolean(true); val ready = AtomicBoolean(true)
        BoundedReadiness(ready::get, db::get, redis::get).use { probe ->
            assertThat(request(probe).status).isEqualTo(200)
            db.set(false); assertThat(request(probe).status).isEqualTo(503)
            db.set(true); redis.set(false); assertThat(request(probe).status).isEqualTo(503)
            redis.set(true); ready.set(false); assertThat(request(probe).status).isEqualTo(503)
            ready.set(true); assertThat(request(probe).status).isEqualTo(200)
        }
    }

    @Test fun `exception and delayed dependencies fail within a single total budget`() {
        for (slowDatabase in listOf(true, false)) {
            val slow = { Thread.sleep(5000); true }
            BoundedReadiness({ true }, if (slowDatabase) slow else { { true } }, if (slowDatabase) { { true } } else slow, Duration.ofMillis(150)).use { probe ->
                val start = System.nanoTime(); val response = request(probe)
                assertThat(response.status).isEqualTo(503)
                assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofSeconds(1))
                assertThat(response.contentAsString).isEqualTo("{\"status\":\"DOWN\"}")
                assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store")
            }
        }
        BoundedReadiness({ true }, { throw IllegalStateException("sensitive backend diagnostics") }, { true }).use {
            assertThat(request(it).contentAsString).doesNotContain("sensitive")
            assertThat(request(it).status).isEqualTo(503)
        }
    }

    @Test fun `parallel checks share the total budget and recheck readiness before success`() {
        val ready = AtomicBoolean(true)
        val gate = CountDownLatch(1)
        BoundedReadiness(ready::get, { gate.await(); true }, { ready.set(false); gate.countDown(); true }).use {
            assertThat(request(it).status).isEqualTo(503)
        }
    }

    @Test fun `load shares one probe and interruption resistant failures cannot grow workers`() {
        val release = CountDownLatch(1); val active = AtomicInteger(); val peak = AtomicInteger(); val entered = CountDownLatch(2)
        val stuck = {
            val n = active.incrementAndGet(); peak.accumulateAndGet(n, ::maxOf); entered.countDown()
            try {
                while (release.count > 0) try { release.await() } catch (_: InterruptedException) { /* Simulate a driver ignoring cancellation. */ }
                true
            } finally { active.decrementAndGet() }
        }
        val clients = Executors.newFixedThreadPool(16)
        try {
            BoundedReadiness({ true }, stuck, stuck, Duration.ofMillis(150)).use { probe ->
                val requests = (1..16).map { clients.submit<Int> { request(probe).status } }
                assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue()
                requests.forEach { assertThat(it.get(2, TimeUnit.SECONDS)).isEqualTo(503) }
                repeat(3) { assertThat(request(probe).status).isEqualTo(503) }
                assertThat(peak.get()).isEqualTo(2)
                release.countDown()
                val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2)
                while (active.get() != 0 && System.nanoTime() < deadline) Thread.sleep(5)
                assertThat(request(probe).status).isEqualTo(200)
            }
        } finally { release.countDown(); clients.shutdownNow() }
    }

    @Test fun `the HTTP response uses a production budget below Render five seconds`() {
        BoundedReadiness({ true }, { Thread.sleep(15000); true }, { true }).use { probe ->
            val start = System.nanoTime()
            assertThat(request(probe).status).isEqualTo(503)
            assertThat(Duration.ofNanos(System.nanoTime() - start)).isLessThan(Duration.ofMillis(4500))
        }
        assertThatThrownBy { BoundedReadiness({ true }, { true }, { true }, Duration.ofSeconds(5)) }.isInstanceOf(IllegalArgumentException::class.java)
    }
}
