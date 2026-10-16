package com.tripnote.trip.internal

import com.tripnote.auth.SessionUser
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*

@Service
class CompletionService(private val jdbc: JdbcClient, private val queries: TripQueries, private val access: TripAccess) {
    private fun requireRead(tripId: UUID, userId: UUID) {
        val slug = jdbc.sql("SELECT slug FROM trips WHERE id=?").param(tripId).query(String::class.java).optional().orElseThrow { access.notFound() }
        queries.find(slug, userId) ?: throw access.notFound()
    }

    @Transactional(readOnly = true)
    fun list(tripId: UUID, userId: UUID): List<UUID> {
        requireRead(tripId, userId)
        return jdbc.sql("SELECT stop_id FROM stop_completions WHERE trip_id=? AND user_id=? ORDER BY stop_id").params(tripId, userId).query(UUID::class.java).list().filterNotNull()
    }

    @Transactional
    fun set(tripId: UUID, stopId: UUID, userId: UUID, completed: Boolean) {
        requireRead(tripId, userId)
        if (jdbc.sql("SELECT count(*) FROM stops WHERE trip_id=? AND id=?").params(tripId, stopId).query(Int::class.java).single() != 1) throw access.notFound()
        if (completed) jdbc.sql("INSERT INTO stop_completions(trip_id,user_id,stop_id) VALUES (?,?,?) ON CONFLICT DO NOTHING").params(tripId, userId, stopId).update()
        else jdbc.sql("DELETE FROM stop_completions WHERE trip_id=? AND user_id=? AND stop_id=?").params(tripId, userId, stopId).update()
    }
}

@RestController
class CompletionController(private val completions: CompletionService) {
    @GetMapping("/api/v1/trips/{tripId}/completions")
    fun list(@PathVariable tripId: UUID, @AuthenticationPrincipal user: SessionUser): List<UUID> = completions.list(tripId, user.userId)

    @PutMapping("/api/v1/trips/{tripId}/completions/stops/{stopId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun complete(@PathVariable tripId: UUID, @PathVariable stopId: UUID, @AuthenticationPrincipal user: SessionUser) = completions.set(tripId, stopId, user.userId, true)

    @DeleteMapping("/api/v1/trips/{tripId}/completions/stops/{stopId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun clear(@PathVariable tripId: UUID, @PathVariable stopId: UUID, @AuthenticationPrincipal user: SessionUser) = completions.set(tripId, stopId, user.userId, false)
}
