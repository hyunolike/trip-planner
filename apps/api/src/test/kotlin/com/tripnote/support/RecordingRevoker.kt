package com.tripnote.support

import com.tripnote.auth.internal.GoogleTokenRevoker
import java.util.concurrent.CopyOnWriteArrayList

class RecordingRevoker : GoogleTokenRevoker {
    val revoked = CopyOnWriteArrayList<String>()
    @Volatile var failNext = false

    override fun revoke(token: String) {
        if (failNext) { failNext = false; throw IllegalStateException("google unavailable") }
        revoked += token
    }
}
