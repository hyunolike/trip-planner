package com.tripnote

import com.tripnote.auth.internal.BreachedPasswordChecker
import com.tripnote.support.MutableClock
import com.tripnote.support.RecordingMailSender
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.testcontainers.containers.GenericContainer
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {
    @Bean
    @ServiceConnection
    fun postgres() = PostgreSQLContainer(
        DockerImageName.parse("postgis/postgis:18-3.6").asCompatibleSubstituteFor("postgres"),
    )

    @Bean
    @ServiceConnection(name = "redis")
    fun valkey() = GenericContainer(DockerImageName.parse("valkey/valkey:9.1")).withExposedPorts(6379)

    @Bean
    fun recordingMailSender() = RecordingMailSender()

    @Bean
    @Primary
    fun mutableClock() = MutableClock()

    @Bean
    @Primary
    fun fakeBreachedPasswordChecker() = BreachedPasswordChecker { it == "password1234" }
}
