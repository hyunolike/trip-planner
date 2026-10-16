package com.tripnote.common

import jakarta.servlet.http.HttpServletRequest
import java.net.InetAddress
import org.springframework.security.web.util.matcher.IpAddressMatcher
import org.springframework.stereotype.Component

@Component
class ClientIp(private val props: TripnoteProperties) {
    private val trusted = props.trustedProxyCidrs.filter(String::isNotBlank).map {
        require(literal(it.substringBefore('/')) != null) { "trusted-proxy-cidrs must contain IP literals, not hostnames" }
        IpAddressMatcher(it)
    }

    /** Socket peer stays authoritative unless every removed hop is explicitly trusted. */
    fun resolve(request: HttpServletRequest): String {
        val peer = request.remoteAddr
        if (!isTrusted(peer)) return peer
        val headers = request.getHeaders("X-Forwarded-For").toList()
        if (headers.size != 1 || headers[0].length > 4096) return peer
        val parts = headers[0].split(',')
        if (parts.size > 20) return peer
        val chain = parts.map { literal(it.trim()) ?: return peer }
        var current = peer
        for (hop in chain.asReversed()) {
            if (!isTrusted(current)) break
            current = hop
        }
        return current
    }

    private fun isTrusted(address: String) = literal(address)?.let { ip -> trusted.any { it.matches(ip) } } ?: false

    private fun literal(value: String): String? {
        val v4 = value.split('.').let { parts ->
            parts.size == 4 && parts.all { it.isNotEmpty() && it.all(Char::isDigit) && (it.toIntOrNull() ?: -1) in 0..255 }
        }
        val v6 = ':' in value && value.all { it in "0123456789abcdefABCDEF:." }
        if (!v4 && !v6) return null
        // Only literals reach InetAddress; forwarded input can never cause DNS lookups.
        return runCatching { InetAddress.getByName(value).hostAddress }.getOrNull()
    }
}
