package com.tripnote.trip.internal

import java.security.SecureRandom
import org.springframework.stereotype.Component

@Component
class SlugGenerator(private val trips: TripRepository) {
    private val alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
    private val random = SecureRandom()

    fun next(): String {
        repeat(10) {
            val slug = (1..8).map { alphabet[random.nextInt(alphabet.length)] }.joinToString("")
            if (!trips.existsBySlug(slug)) return slug
        }
        error("could not generate a unique slug")
    }
}
