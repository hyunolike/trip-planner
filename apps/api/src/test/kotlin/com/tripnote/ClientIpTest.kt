package com.tripnote

import com.tripnote.common.ClientIp
import com.tripnote.common.TripnoteProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest

class ClientIpTest {
    private fun resolver(vararg cidrs: String) = ClientIp(TripnoteProperties("http://localhost", "a@b.test", ".", "ops@b.test", trustedProxyCidrs = cidrs.toList()))
    private fun request(peer: String, forwarded: String) = MockHttpServletRequest().apply {
        remoteAddr = peer
        addHeader("X-Forwarded-For", forwarded)
    }

    @Test fun `direct clients cannot spoof forwarded addresses`() {
        assertThat(resolver().resolve(request("203.0.113.9", "198.51.100.8"))).isEqualTo("203.0.113.9")
    }
    @Test fun `only explicitly trusted proxy hops are removed from the right`() {
        val ips = resolver("127.0.0.1/32", "10.0.0.0/8")
        assertThat(ips.resolve(request("127.0.0.1", "192.0.2.1, 198.51.100.7, 10.1.2.3"))).isEqualTo("198.51.100.7")
    }
    @Test fun `an untrusted intermediate hop cannot spoof the leftmost client`() {
        assertThat(resolver("127.0.0.1/32").resolve(request("127.0.0.1", "192.0.2.1, 198.51.100.7"))).isEqualTo("198.51.100.7")
    }
    @Test fun `malformed hostnames and oversized chains fall back to the socket peer`() {
        val ips = resolver("127.0.0.1/32")
        for (header in listOf("attacker.example", "127.0.0.1,", "198.51.100.1,".repeat(30))) {
            assertThat(ips.resolve(request("127.0.0.1", header))).isEqualTo("127.0.0.1")
        }
    }
    @Test fun `IPv6 trusted proxies resolve IPv6 client addresses`() {
        assertThat(resolver("::1/128").resolve(request("::1", "2001:db8::7"))).isEqualTo("2001:db8:0:0:0:0:0:7")
    }
    @Test fun `duplicate forwarded headers fail closed`() {
        val req = request("127.0.0.1", "198.51.100.1").apply { addHeader("X-Forwarded-For", "198.51.100.2") }
        assertThat(resolver("127.0.0.1/32").resolve(req)).isEqualTo("127.0.0.1")
    }
}
