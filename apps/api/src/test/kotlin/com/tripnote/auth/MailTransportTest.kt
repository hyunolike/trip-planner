package com.tripnote.auth

import com.tripnote.auth.internal.*
import com.tripnote.support.RecordingMailSender
import java.util.concurrent.atomic.AtomicInteger
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.JavaMailSenderImpl

class MailTransportTest {
    private val message = TransactionalMail("sender@example.invalid", "recipient@example.invalid", "verify", "https://example.invalid/verify?token=synthetic-only")
    @Test fun `SMTP preserves sender recipient subject and token-bearing body`() {
        val sender = RecordingMailSender(); SmtpMailTransport(sender).send(message)
        val sent = sender.sent.single()
        assertThat(sent.from).isEqualTo(message.from); assertThat(sent.to).containsExactly(message.to)
        assertThat(sent.subject).isEqualTo(message.subject); assertThat(sent.text).isEqualTo(message.text)
        assertThat(message.toString()).doesNotContain(message.to, message.text)
    }
    @Test fun `HTTPS extension receives the same message and propagates rejection without retry`() {
        val calls = AtomicInteger()
        val transport = HttpsMailTransport { received ->
            assertThat(received).isSameAs(message); calls.incrementAndGet(); throw IllegalStateException("synthetic rejection")
        }
        assertThatThrownBy { transport.send(message) }.hasMessage("synthetic rejection")
        assertThat(calls.get()).isEqualTo(1)
        val smtp = object : JavaMailSenderImpl() {
            override fun send(vararg simpleMessages: SimpleMailMessage) { throw IllegalStateException("synthetic SMTP failure") }
        }
        assertThatThrownBy { SmtpMailTransport(smtp).send(message) }.hasMessage("synthetic SMTP failure")
    }
    @Test fun `HTTPS selection fails startup until an approved provider is implemented`() {
        ApplicationContextRunner().withUserConfiguration(MailTransportConfiguration::class.java)
            .withPropertyValues("tripnote.mail.transport=https")
            .run { assertThat(it.startupFailure).hasRootCauseMessage("An approved HTTPS mail provider adapter must be configured") }
    }
    @Test fun `HTTPS selection uses only the provider extension`() {
        val calls = AtomicInteger()
        ApplicationContextRunner().withUserConfiguration(MailTransportConfiguration::class.java)
            .withPropertyValues("tripnote.mail.transport=https")
            .withBean(HttpsMailProvider::class.java, { HttpsMailProvider { calls.incrementAndGet() } })
            .run { context -> context.getBean(MailTransport::class.java).send(message); assertThat(calls.get()).isEqualTo(1) }
    }
    @Test fun `Render Free rejects blocked SMTP ports while local SMTP stays available`() {
        for (port in listOf(25, 465, 587)) {
            ApplicationContextRunner().withUserConfiguration(MailTransportConfiguration::class.java)
                .withPropertyValues("tripnote.mail.transport=smtp", "tripnote.mail.render-free=true", "spring.mail.port=$port")
                .withBean(JavaMailSender::class.java, { RecordingMailSender() })
                .run { assertThat(it.startupFailure).hasRootCauseMessage("SMTP port is blocked on Render Free") }
        }
        ApplicationContextRunner().withUserConfiguration(MailTransportConfiguration::class.java)
            .withBean(JavaMailSender::class.java, { RecordingMailSender() })
            .run { assertThat(it.startupFailure).isNull(); assertThat(it.getBean(MailTransport::class.java)).isInstanceOf(SmtpMailTransport::class.java) }
    }
}
