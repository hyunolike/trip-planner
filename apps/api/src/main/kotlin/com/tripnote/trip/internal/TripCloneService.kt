package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional

@Service
class TripCloneService(
    private val jdbc: JdbcClient,
    private val queries: TripQueries,
    private val slugs: SlugGenerator,
    private val access: TripAccess,
) {
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    fun clone(sourceSlug: String, userId: UUID): CreatedTrip {
        val source = queries.find(sourceSlug, userId) ?: throw access.notFound()
        if (!source.permissions.canClone) throw ApiException(HttpStatus.FORBIDDEN, "이 일정은 복제할 수 없어요.")
        val slug = slugs.next()

        val newId = jdbc.sql(
            """
            INSERT INTO trips (slug, owner_id, title, subtitle, start_date, end_date, timezone, visibility, is_sample, source_trip_id, content)
            SELECT :slug, :owner, title, subtitle, start_date, end_date, timezone, 'private', false, id, content FROM trips WHERE id = :source
            RETURNING id
            """.trimIndent(),
        ).param("slug", slug).param("owner", userId).param("source", source.id).query(UUID::class.java).optional().orElseThrow { access.notFound() }

        jdbc.sql(
            """
            INSERT INTO trip_days (trip_id, number, date, city, theme, note, color, tour)
            SELECT :target, number, date, city, theme, note, color, tour FROM trip_days WHERE trip_id = :source
            """.trimIndent(),
        ).param("target", newId).param("source", source.id).update()

        jdbc.sql(
            """
            INSERT INTO stops (trip_id, day_id, key, position, start_time, title, type, details, duration, buffer, timing, transport_icon,
                               lat, lng, approximate, transit, photo, hotel_photo, links, place_key, guide, optional)
            SELECT :target, nd.id, s.key, s.position, s.start_time, s.title, s.type, s.details, s.duration, s.buffer, s.timing, s.transport_icon,
                   s.lat, s.lng, s.approximate, s.transit, s.photo, s.hotel_photo, s.links, s.place_key, s.guide, s.optional
            FROM stops s
            JOIN trip_days od ON od.id = s.day_id
            JOIN trip_days nd ON nd.trip_id = :target AND nd.number = od.number
            WHERE s.trip_id = :source
            """.trimIndent(),
        ).param("target", newId).param("source", source.id).update()

        jdbc.sql(
            """
            INSERT INTO places (trip_id, key, kind, name, area, details, position)
            SELECT :target, key, kind, name, area, details, position FROM places WHERE trip_id = :source
            """.trimIndent(),
        ).param("target", newId).param("source", source.id).update()

        jdbc.sql("INSERT INTO trip_members (trip_id, user_id, role) VALUES (:target, :owner, 'owner')")
            .param("target", newId).param("owner", userId).update()

        return CreatedTrip(newId, slug)
    }
}
