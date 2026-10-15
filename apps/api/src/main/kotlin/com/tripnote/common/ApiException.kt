package com.tripnote.common

import java.time.Duration
import org.springframework.http.HttpStatus

class ApiException(
    val status: HttpStatus,
    override val message: String,
    val retryAfter: Duration? = null,
    val body: Any? = null,
) : RuntimeException(message)
