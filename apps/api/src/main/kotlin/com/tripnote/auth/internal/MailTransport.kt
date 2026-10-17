package com.tripnote.auth.internal

import org.springframework.beans.factory.ObjectProvider
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender

/** Prevent accidental diagnostics from exposing a token-bearing message. */
class TransactionalMail(val from: String, val to: String, val subject: String, val text: String) {
    override fun toString() = "TransactionalMail(redacted)"
}
fun interface MailTransport { fun send(message: TransactionalMail) }

/** Approved HTTPS provider extension. Return after acceptance; throw on timeout/rejection.
 * Never log credentials, recipients, tokens or raw bodies. No blind POST retries.
 */
fun interface HttpsMailProvider { fun send(message: TransactionalMail) }

class SmtpMailTransport(private val sender: JavaMailSender) : MailTransport {
    override fun send(message: TransactionalMail) = sender.send(SimpleMailMessage().apply {
        from = message.from
        setTo(message.to)
        subject = message.subject
        text = message.text
    })
}
class HttpsMailTransport(private val provider: HttpsMailProvider) : MailTransport {
    override fun send(message: TransactionalMail) = provider.send(message)
}

@Configuration(proxyBeanMethods = false)
class MailTransportConfiguration {
    @Bean
    fun mailTransport(
        @Value("\${tripnote.mail.transport:smtp}") transport: String,
        @Value("\${tripnote.mail.render-free:false}") renderFree: Boolean,
        @Value("\${spring.mail.port:25}") smtpPort: Int,
        smtp: ObjectProvider<JavaMailSender>,
        https: ObjectProvider<HttpsMailProvider>,
    ): MailTransport = when (transport) {
        "smtp" -> {
            require(!renderFree || smtpPort !in setOf(25, 465, 587)) { "SMTP port is blocked on Render Free" }
            SmtpMailTransport(smtp.getObject())
        }
        "https" -> HttpsMailTransport(https.getIfAvailable {
            throw IllegalStateException("An approved HTTPS mail provider adapter must be configured")
        })
        else -> throw IllegalArgumentException("Unsupported mail transport")
    }
}
