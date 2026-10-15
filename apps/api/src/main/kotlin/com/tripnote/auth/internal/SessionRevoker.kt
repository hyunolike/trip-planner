package com.tripnote.auth.internal

import java.util.UUID
import org.springframework.session.FindByIndexNameSessionRepository
import org.springframework.stereotype.Component

@Component
class SessionRevoker(private val sessions: FindByIndexNameSessionRepository<*>) {
    fun revokeAll(userId: UUID) {
        sessions.findByPrincipalName(userId.toString()).keys.forEach(sessions::deleteById)
    }
}
