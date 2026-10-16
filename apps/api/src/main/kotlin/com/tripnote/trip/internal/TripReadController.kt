package com.tripnote.trip.internal

import com.tripnote.auth.SessionUser
import com.tripnote.common.ApiException
import com.tripnote.trip.TripDocument
import com.tripnote.trip.TripSummary
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

@RestController
class TripReadController(private val queries: TripQueries) {
    @GetMapping("/api/v1/trips/{slug}")
    fun trip(@PathVariable slug: String, @AuthenticationPrincipal user: SessionUser?): TripDocument =
        queries.find(slug, user?.userId) ?: throw ApiException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없어요. 링크를 다시 확인해 주세요.")

    @GetMapping("/api/v1/samples")
    fun samples(): List<TripSummary> = queries.publicSamples()

    @GetMapping("/api/v1/trips")
    fun myTrips(@AuthenticationPrincipal user: SessionUser): List<TripSummary> = queries.tripsOf(user.userId)
}
