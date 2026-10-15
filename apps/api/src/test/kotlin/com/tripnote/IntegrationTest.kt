package com.tripnote

import com.tripnote.support.MutableClock
import com.tripnote.support.RecordingMailSender
import java.time.Duration
import org.awaitility.kotlin.atMost
import org.awaitility.kotlin.await
import org.awaitility.kotlin.untilNotNull
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.mail.SimpleMailMessage
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.post

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
abstract class IntegrationTest {
    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var jdbc: JdbcClient
    @Autowired lateinit var mail: RecordingMailSender
    @Autowired lateinit var clock: MutableClock

    @BeforeEach
    fun cleanDatabase() {
        jdbc.sql("TRUNCATE users, trips CASCADE").update()
        mail.sent.clear()
        clock.reset()
    }

    fun postJson(path: String, body: String): ResultActionsDsl = mvc.post(path) {
        contentType = MediaType.APPLICATION_JSON
        content = body
        with(csrf())
    }

    fun signup(email: String, password: String = "trip-note-2027", nickname: String = "미나") =
        postJson("/api/v1/auth/signup", """{"email":"$email","password":"$password","nickname":"$nickname"}""")

    fun awaitMail(to: String): SimpleMailMessage =
        await atMost Duration.ofSeconds(10) untilNotNull { mail.sent.lastOrNull { it.to?.contains(to) == true } }

    fun tokenIn(message: SimpleMailMessage): String =
        Regex("token=([A-Za-z0-9_-]+)").find(message.text!!)!!.groupValues[1]
}
