package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component

@Component
class TripAccess(private val trips: TripRepository, private val queries: TripQueries) {
    fun requireEdit(tripId: UUID, userId: UUID): TripEntity {
        val trip = trips.findById(tripId).orElseThrow { notFound() }
        val role = queries.role(tripId, userId)
        if (trip.visibility == "private" && role == null) throw notFound()
        if (trip.isSample) throw ApiException(HttpStatus.FORBIDDEN, "샘플 일정은 고칠 수 없어요. 내 여행으로 복제한 뒤 고쳐 주세요.")
        if (role !in setOf("owner", "editor")) throw ApiException(HttpStatus.FORBIDDEN, "이 일정을 고칠 권한이 없어요.")
        return trip
    }

    fun notFound() = ApiException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없어요. 링크를 다시 확인해 주세요.")
}
