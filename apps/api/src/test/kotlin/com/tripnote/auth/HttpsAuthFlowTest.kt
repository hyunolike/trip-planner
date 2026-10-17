package com.tripnote.auth

import com.tripnote.IntegrationTest
import com.tripnote.auth.internal.HttpsMailProvider
import com.tripnote.auth.internal.TransactionalMail
import com.tripnote.common.sha256Hex
import com.tripnote.support.RecordingMailSender
import java.time.Duration
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import org.assertj.core.api.Assertions.assertThat
import org.awaitility.Awaitility.await
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.mail.SimpleMailMessage
import org.springframework.modulith.events.IncompleteEventPublications
import org.springframework.test.web.servlet.get
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager

/** Real auth, DB/event transactions and Redis sessions; no network mail provider. */
@SpringBootTest(properties = ["tripnote.mail.transport=https"])
@Import(HttpsAuthFlowTest.ProviderConfiguration::class)
class HttpsAuthFlowTest : IntegrationTest() {
    @Autowired lateinit var provider: SyntheticProvider
    @Autowired lateinit var publications: IncompleteEventPublications

    @Test
    fun `HTTPS selection preserves verification single-use tokens and reset session revocation`() {
        signup("https@example.invalid").andExpect { status { isAccepted() } }
        val verification = tokenIn(awaitMail("https@example.invalid"))
        await().atMost(Duration.ofSeconds(5)).untilAsserted {
            assertThat(count("SELECT count(*) FROM email_tokens WHERE token_hash = ?", sha256Hex(verification))).isEqualTo(1)
        }
        assertThat(count("SELECT count(*) FROM email_tokens WHERE token_hash = ?", verification)).isZero()
        val verifyBody = """{"token":"$verification","password":"trip-note-2027"}"""
        postJson("/api/v1/auth/verify-email", verifyBody).andExpect { status { isOk() } }
        postJson("/api/v1/auth/verify-email", verifyBody).andExpect { status { isBadRequest() } }
        val oldSession = login("https@example.invalid")
        mail.sent.clear()
        postJson("/api/v1/auth/password-reset", """{"email":"https@example.invalid"}""")
            .andExpect { status { isAccepted() } }
        val reset = tokenIn(awaitMail("https@example.invalid"))
        val resetBody = """{"token":"$reset","password":"new-trip-note-2027"}"""
        postJson("/api/v1/auth/password-reset/confirm", resetBody).andExpect { status { isOk() } }
        postJson("/api/v1/auth/password-reset/confirm", resetBody).andExpect { status { isBadRequest() } }
        mvc.get("/api/v1/me") { cookie(oldSession) }.andExpect { status { isUnauthorized() } }
        login("https@example.invalid", "new-trip-note-2027")
        await().atMost(Duration.ofSeconds(5)).untilAsserted { assertThat(count("SELECT count(*) FROM event_publication")).isZero() }
    }

    @Test
    fun `provider rejection rolls back issued token and retains a replayable mail event`() {
        provider.reject = true
        try {
            signup("retry@example.invalid").andExpect { status { isAccepted() } }
            assertThat(provider.rolledBack.await(5, TimeUnit.SECONDS)).isTrue()
            assertThat(mail.sent).isEmpty()
            assertThat(count("SELECT count(*) FROM email_tokens")).isZero()
            assertThat(count("SELECT count(*) FROM event_publication")).isEqualTo(1)
        } finally { provider.reject = false }
        publications.resubmitIncompletePublications { true }
        val token = tokenIn(awaitMail("retry@example.invalid"))
        await().atMost(Duration.ofSeconds(5)).untilAsserted { assertThat(count("SELECT count(*) FROM event_publication")).isZero() }
        assertThat(count("SELECT count(*) FROM email_tokens WHERE token_hash = ?", sha256Hex(token))).isEqualTo(1)
        postJson("/api/v1/auth/verify-email", """{"token":"$token","password":"trip-note-2027"}""")
            .andExpect { status { isOk() } }
    }

    private fun count(sql: String, vararg params: Any): Int = jdbc.sql(sql).params(*params).query(Int::class.java).single()

    class SyntheticProvider(private val recording: RecordingMailSender) : HttpsMailProvider {
        @Volatile var reject = false
        val rolledBack = CountDownLatch(1)
        override fun send(message: TransactionalMail) {
            if (reject) {
                TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
                    override fun afterCompletion(status: Int) {
                        if (status == TransactionSynchronization.STATUS_ROLLED_BACK) rolledBack.countDown()
                    }
                })
                throw IllegalStateException("Synthetic provider rejection")
            }
            recording.send(SimpleMailMessage().apply {
                from = message.from; setTo(message.to); subject = message.subject; text = message.text
            })
        }
    }
    @TestConfiguration(proxyBeanMethods = false)
    class ProviderConfiguration {
        @Bean fun syntheticProvider(recording: RecordingMailSender) = SyntheticProvider(recording)
    }
}
