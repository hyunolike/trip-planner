package com.tripnote.trip.internal

import com.tripnote.auth.SessionUser
import com.tripnote.common.sha256Hex
import com.tripnote.trip.TripDocument
import java.security.SecureRandom
import java.time.OffsetDateTime
import java.util.Base64
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.annotation.Isolation
import org.springframework.web.bind.annotation.*

data class CreatedShareLink(val id: UUID, val token: String)
data class ShareLinkSummary(val id: UUID, val createdAt: OffsetDateTime)

@Service
class ShareService(
    private val jdbc: JdbcClient,
    private val access: TripAccess,
    private val queries: TripQueries,
    private val clones: TripCloneService,
) {
    private val random = SecureRandom()

    @Transactional
    fun create(tripId: UUID, userId: UUID): CreatedShareLink {
        access.requireOwner(tripId, userId)
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(32).also(random::nextBytes))
        val id = jdbc.sql("INSERT INTO share_links(trip_id, token_hash, created_by) VALUES (?, ?, ?) RETURNING id")
            .params(tripId, sha256Hex(token), userId).query(UUID::class.java).single()
        return CreatedShareLink(id, token)
    }

    @Transactional(readOnly = true)
    fun list(tripId: UUID, userId: UUID): List<ShareLinkSummary> {
        access.requireOwner(tripId, userId)
        return jdbc.sql("SELECT id, created_at FROM share_links WHERE trip_id=? ORDER BY created_at, id").param(tripId)
            .query { rs, _ -> ShareLinkSummary(rs.getObject("id", UUID::class.java), rs.getObject("created_at", OffsetDateTime::class.java)) }.list()
    }

    @Transactional
    fun revoke(tripId: UUID, linkId: UUID, userId: UUID) {
        access.requireOwner(tripId, userId)
        jdbc.sql("DELETE FROM share_links WHERE trip_id=? AND id=?").params(tripId, linkId).update()
    }

    private fun grant(token: String, lock: Boolean = false): Pair<UUID, String> {
        if (!token.matches(Regex("[A-Za-z0-9_-]{43}"))) throw access.notFound()
        return jdbc.sql("SELECT t.id,t.slug FROM share_links s JOIN trips t ON t.id=s.trip_id WHERE s.token_hash=?" + if (lock) " FOR UPDATE OF s" else "")
            .param(sha256Hex(token)).query { rs, _ -> rs.getObject("id", UUID::class.java) to rs.getString("slug") }
            .optional().orElseThrow { access.notFound() }
    }

    @Transactional(readOnly = true)
    fun read(token: String, userId: UUID?): TripDocument {
        val (_, slug) = grant(token)
        return queries.find(slug, userId, shareGrant = true) ?: throw access.notFound()
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    fun clone(token: String, userId: UUID): CreatedTrip {
        val (tripId, _) = grant(token, lock = true)
        return clones.cloneShared(tripId, userId)
    }
}

@RestController
class ShareController(private val shares: ShareService) {
    @PostMapping("/api/v1/trips/{tripId}/share-links")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@PathVariable tripId: UUID, @AuthenticationPrincipal user: SessionUser): CreatedShareLink = shares.create(tripId, user.userId)

    @GetMapping("/api/v1/trips/{tripId}/share-links")
    fun list(@PathVariable tripId: UUID, @AuthenticationPrincipal user: SessionUser): List<ShareLinkSummary> = shares.list(tripId, user.userId)

    @DeleteMapping("/api/v1/trips/{tripId}/share-links/{linkId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun revoke(@PathVariable tripId: UUID, @PathVariable linkId: UUID, @AuthenticationPrincipal user: SessionUser) = shares.revoke(tripId, linkId, user.userId)

    @GetMapping("/api/v1/share/{token}")
    fun read(@PathVariable token: String, @AuthenticationPrincipal user: SessionUser?): TripDocument = shares.read(token, user?.userId)

    @PostMapping("/api/v1/share/{token}/clone")
    @ResponseStatus(HttpStatus.CREATED)
    fun clone(@PathVariable token: String, @AuthenticationPrincipal user: SessionUser): CreatedTrip = shares.clone(token, user.userId)
}
