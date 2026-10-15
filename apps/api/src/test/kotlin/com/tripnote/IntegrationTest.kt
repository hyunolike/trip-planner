package com.tripnote

import com.tripnote.support.MutableClock
import com.tripnote.support.RecordingMailSender
import java.time.Duration
import jakarta.servlet.http.Cookie
import java.util.UUID
import org.awaitility.core.ConditionTimeoutException
import org.awaitility.kotlin.atMost
import org.awaitility.kotlin.await
import org.awaitility.kotlin.until
import org.awaitility.kotlin.untilNotNull
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.mail.SimpleMailMessage
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.MockHttpServletRequestDsl

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
abstract class IntegrationTest {
    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var jdbc: JdbcClient
    @Autowired lateinit var mail: RecordingMailSender
    @Autowired lateinit var clock: MutableClock
    @Autowired lateinit var redis: StringRedisTemplate
    @Autowired lateinit var passwordEncoder: PasswordEncoder

    @BeforeEach
    fun cleanDatabase() {
        awaitNoInFlightEvents()
        jdbc.sql("TRUNCATE users, trips CASCADE").update()
        mail.sent.clear()
        clock.reset()
        redis.execute { it.serverCommands().flushAll(); null }
    }

    /**
     * 이전 테스트의 비동기 이벤트 리스너가 아직 users/email_tokens에 쓰고 있으면 TRUNCATE와 교착한다.
     * completion-mode가 delete라서 event_publication 행이 남아 있으면 리스너가 아직 진행 중이다.
     */
    private fun awaitNoInFlightEvents() {
        try {
            await atMost Duration.ofSeconds(10) until {
                jdbc.sql("SELECT count(*) FROM event_publication").query(Long::class.java).single() == 0L
            }
        } catch (e: ConditionTimeoutException) {
            throw IllegalStateException("event_publication rows still present after 10s; refusing to truncate under a running listener", e)
        }
    }

    fun postJson(path: String, body: String, customize: MockHttpServletRequestDsl.() -> Unit = {}): ResultActionsDsl = mvc.post(path) {
        contentType = MediaType.APPLICATION_JSON
        content = body
        with(csrf())
        customize()
    }

    fun signup(email: String, password: String = "trip-note-2027", nickname: String = "미나") =
        postJson("/api/v1/auth/signup", """{"email":"$email","password":"$password","nickname":"$nickname"}""")

    fun awaitMail(to: String): SimpleMailMessage =
        await atMost Duration.ofSeconds(10) untilNotNull { mail.sent.lastOrNull { it.to?.contains(to) == true } }

    fun tokenIn(message: SimpleMailMessage): String =
        Regex("token=([A-Za-z0-9_-]+)").find(message.text!!)!!.groupValues[1]

    fun createVerifiedUser(email: String, password: String = "trip-note-2027", nickname: String = "미나"): UUID {
        val id = jdbc.sql("INSERT INTO users (email, nickname, email_verified_at) VALUES (?, ?, now()) RETURNING id")
            .params(email, nickname).query(UUID::class.java).single()
        jdbc.sql("INSERT INTO user_identities (user_id, provider, provider_subject) VALUES (?, 'password', ?)")
            .params(id, id.toString()).update()
        jdbc.sql("INSERT INTO password_credentials (user_id, password_hash) VALUES (?, ?)")
            .params(id, passwordEncoder.encode(password)!!).update()
        return id
    }

    fun login(email: String, password: String = "trip-note-2027"): Cookie =
        postJson("/api/v1/auth/login", """{"email":"$email","password":"$password"}""")
            .andExpect { status { isOk() } }
            .andReturn().response.getCookie("__Host-SESSION")!!
}
