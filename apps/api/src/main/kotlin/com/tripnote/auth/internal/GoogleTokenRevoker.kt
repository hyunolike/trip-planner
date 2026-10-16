package com.tripnote.auth.internal

import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient

fun interface GoogleTokenRevoker {
    fun revoke(token: String)
}

@Component
class HttpGoogleTokenRevoker(builder: RestClient.Builder) : GoogleTokenRevoker {
    private val client = builder.baseUrl("https://oauth2.googleapis.com").build()

    override fun revoke(token: String) {
        client.post().uri("/revoke")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(LinkedMultiValueMap<String, String>().apply { add("token", token) })
            .retrieve().toBodilessEntity()
    }
}
