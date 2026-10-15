package com.tripnote.common

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("tripnote")
data class TripnoteProperties(
    val webBaseUrl: String,
    val mailFrom: String,
    val samplesDir: String,
    val systemUserEmail: String,
    val seedSamples: Boolean = false,
)
