package com.tripnote.auth

import com.tripnote.auth.internal.HttpsMailProvider
import com.tripnote.auth.internal.HttpsMailTransport
import com.tripnote.auth.internal.MailTransport
import com.tripnote.auth.internal.MailTransportConfiguration
import com.tripnote.auth.internal.ResendMailConfiguration
import com.tripnote.auth.internal.ResendMailProvider
import com.tripnote.auth.internal.TransactionalMail
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.boot.restclient.autoconfigure.RestClientAutoConfiguration
import org.springframework.boot.autoconfigure.AutoConfigurations
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.ExpectedCount.once
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.content
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient

class ResendMailProviderTest {
    private val message = TransactionalMail(
        "여행노트 <no-reply@mail.example.invalid>", "recipient@example.invalid", "verify",
        "https://example.invalid/verify?token=synthetic-only",
    )
    private val apiKey = "re_synthetic_key"

    private fun provider(): Pair<ResendMailProvider, MockRestServiceServer> {
        val builder = RestClient.builder().baseUrl("https://resend.example.invalid")
        val server = MockRestServiceServer.bindTo(builder).build()
        return ResendMailProvider(builder, apiKey) to server
    }

    @Test fun `posts the message as plain text with bearer auth and a content-derived idempotency key`() {
        val (provider, server) = provider()
        var firstKey: String? = null
        server.expect(once(), requestTo("https://resend.example.invalid/emails"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer $apiKey"))
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.from").value(message.from))
            .andExpect(jsonPath("$.to[0]").value(message.to))
            .andExpect(jsonPath("$.to.length()").value(1))
            .andExpect(jsonPath("$.subject").value(message.subject))
            .andExpect(jsonPath("$.text").value(message.text))
            .andExpect(jsonPath("$.html").doesNotExist())
            .andExpect { request -> firstKey = request.headers.getFirst("Idempotency-Key") }
            .andRespond(withSuccess("""{"id":"synthetic-id"}""", MediaType.APPLICATION_JSON))
        provider.send(message)
        server.verify()
        assertThat(firstKey).matches("[0-9a-f]{64}")
        assertThat(firstKey).doesNotContain("synthetic-only")

        val (again, againServer) = provider()
        val keys = mutableListOf<String?>()
        againServer.expect(org.springframework.test.web.client.ExpectedCount.twice(), requestTo("https://resend.example.invalid/emails"))
            .andExpect { request -> keys += request.headers.getFirst("Idempotency-Key") }
            .andRespond(withSuccess("""{"id":"synthetic-id"}""", MediaType.APPLICATION_JSON))
        again.send(message)
        again.send(TransactionalMail(message.from, message.to, message.subject, message.text + "-other"))
        assertThat(keys[0]).isEqualTo(firstKey)
        assertThat(keys[1]).isNotEqualTo(firstKey)
    }

    @Test fun `rejection throws once with status and error name but without recipient body or key`() {
        for (status in listOf(HttpStatus.UNPROCESSABLE_ENTITY, HttpStatus.TOO_MANY_REQUESTS, HttpStatus.INTERNAL_SERVER_ERROR)) {
            val (provider, server) = provider()
            server.expect(once(), requestTo("https://resend.example.invalid/emails"))
                .andRespond(withStatus(status).contentType(MediaType.APPLICATION_JSON).body(
                    """{"statusCode":${status.value()},"name":"validation_error","message":"recipient@example.invalid is invalid"}""",
                ))
            assertThatThrownBy { provider.send(message) }
                .hasMessageContaining(status.value().toString())
                .hasMessageContaining("validation_error")
                .satisfies({ error ->
                    assertThat(error.toString()).doesNotContain(message.to, message.text, apiKey)
                })
            server.verify()
        }
    }

    @Test fun `resend selection requires an api key and wires the HTTPS transport`() {
        val runner = ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(RestClientAutoConfiguration::class.java))
            .withUserConfiguration(ResendMailConfiguration::class.java, MailTransportConfiguration::class.java)
            .withPropertyValues("tripnote.mail.transport=https", "tripnote.mail.https-provider=resend")
        runner.withPropertyValues("tripnote.mail.resend.api-key=")
            .run { assertThat(it.startupFailure).hasRootCauseMessage("RESEND_API_KEY must be set when the resend mail provider is selected") }
        runner.withPropertyValues("tripnote.mail.resend.api-key=$apiKey").run { context ->
            assertThat(context.startupFailure).isNull()
            assertThat(context.getBean(HttpsMailProvider::class.java)).isInstanceOf(ResendMailProvider::class.java)
            assertThat(context.getBean(MailTransport::class.java)).isInstanceOf(HttpsMailTransport::class.java)
        }
    }

    @Test fun `resend provider is not created unless selected`() {
        ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(RestClientAutoConfiguration::class.java))
            .withUserConfiguration(ResendMailConfiguration::class.java)
            .run { assertThat(it).doesNotHaveBean(HttpsMailProvider::class.java) }
    }
}
