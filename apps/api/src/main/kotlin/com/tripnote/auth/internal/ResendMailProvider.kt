package com.tripnote.auth.internal

import com.tripnote.common.sha256Hex
import java.net.http.HttpClient
import java.time.Duration
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.MediaType
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.web.client.RestClient

/** Raised when Resend does not accept a mail. Carries only the status and Resend's error name. */
class ResendRejectedException(status: Int, errorName: String?) :
    RuntimeException("Resend rejected mail: HTTP $status ${errorName ?: "unknown_error"}")

/**
 * Sends through Resend's HTTPS API (https://resend.com/docs/api-reference/emails/send-email).
 *
 * The listener holds a DB transaction while sending, so timeouts stay short and nothing is retried here.
 * A failure rolls back the issued token and leaves the event for Modulith to republish.
 *
 * The Idempotency-Key is a hash of the whole message. If Resend accepted a mail but the response was lost,
 * a replay of the *same* content within 24 hours returns the original result instead of sending twice.
 * Token mails get a fresh token on replay, so their content differs and a second mail can still go out;
 * the first link is then dead because its token was rolled back.
 */
class ResendMailProvider(builder: RestClient.Builder, private val apiKey: String) : HttpsMailProvider {
    private val client = builder.build()

    override fun send(message: TransactionalMail) {
        client.post().uri("/emails")
            .header("Authorization", "Bearer $apiKey")
            .header("Idempotency-Key", idempotencyKey(message))
            .contentType(MediaType.APPLICATION_JSON)
            .body(mapOf("from" to message.from, "to" to listOf(message.to), "subject" to message.subject, "text" to message.text))
            .retrieve()
            .onStatus({ !it.is2xxSuccessful }) { _, response ->
                // Only the error name is kept: Resend's message can echo the recipient address.
                val name = runCatching {
                    Regex("\"name\"\\s*:\\s*\"([a-z_]{1,64})\"").find(response.body.readNBytes(4096).decodeToString())?.groupValues?.get(1)
                }.getOrNull()
                throw ResendRejectedException(response.statusCode.value(), name)
            }
            .toBodilessEntity()
    }

    private fun idempotencyKey(message: TransactionalMail) =
        sha256Hex(listOf(message.from, message.to, message.subject, message.text).joinToString("\u0000"))

    companion object {
        val CONNECT_TIMEOUT: Duration = Duration.ofSeconds(5)
        val READ_TIMEOUT: Duration = Duration.ofSeconds(10)
    }
}

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = ["tripnote.mail.https-provider"], havingValue = "resend")
class ResendMailConfiguration {
    @Bean
    fun resendMailProvider(
        builder: RestClient.Builder,
        @Value("\${tripnote.mail.resend.api-key:}") apiKey: String,
        @Value("\${tripnote.mail.resend.base-url:https://api.resend.com}") baseUrl: String,
    ): HttpsMailProvider {
        require(apiKey.isNotBlank()) { "RESEND_API_KEY must be set when the resend mail provider is selected" }
        val factory = JdkClientHttpRequestFactory(
            HttpClient.newBuilder().connectTimeout(ResendMailProvider.CONNECT_TIMEOUT).build(),
        ).apply { setReadTimeout(ResendMailProvider.READ_TIMEOUT) }
        return ResendMailProvider(builder.clone().baseUrl(baseUrl).requestFactory(factory), apiKey)
    }
}
