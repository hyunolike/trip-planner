package com.tripnote.auth.internal

import java.net.http.HttpClient
import java.time.Duration
import org.springframework.http.MediaType
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient

internal val REVOKE_CONNECT_TIMEOUT: Duration = Duration.ofSeconds(3)
internal val REVOKE_READ_TIMEOUT: Duration = Duration.ofSeconds(3)

internal fun revokeRequestFactory() =
    JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(REVOKE_CONNECT_TIMEOUT).build())
        .apply { setReadTimeout(REVOKE_READ_TIMEOUT) }

fun interface GoogleTokenRevoker {
    fun revoke(token: String)
}

@Component
class HttpGoogleTokenRevoker(builder: RestClient.Builder) : GoogleTokenRevoker {
    private val client = builder.baseUrl("https://oauth2.googleapis.com").requestFactory(revokeRequestFactory()).build()

    override fun revoke(token: String) {
        client.post().uri("/revoke")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(LinkedMultiValueMap<String, String>().apply { add("token", token) })
            .retrieve().toBodilessEntity()
    }
}
