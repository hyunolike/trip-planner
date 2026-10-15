package com.tripnote.common

import java.security.MessageDigest

private fun digestHex(algorithm: String, value: String): String =
    MessageDigest.getInstance(algorithm).digest(value.toByteArray()).joinToString("") { "%02x".format(it) }

fun sha256Hex(value: String): String = digestHex("SHA-256", value)

fun sha1Hex(value: String): String = digestHex("SHA-1", value)
