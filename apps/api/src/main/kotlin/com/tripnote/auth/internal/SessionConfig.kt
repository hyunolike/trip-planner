package com.tripnote.auth.internal

import java.time.Duration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.session.web.http.CookieSerializer
import org.springframework.session.web.http.DefaultCookieSerializer

@Configuration(proxyBeanMethods = false)
class SessionConfig {
    @Bean
    fun cookieSerializer(): CookieSerializer = DefaultCookieSerializer().apply {
        setCookieName("__Host-SESSION")
        setUseSecureCookie(true)
        setUseHttpOnlyCookie(true)
        setCookiePath("/")
        setSameSite("Lax")
        setCookieMaxAge(Duration.ofDays(30).toSeconds().toInt())
    }

    @Bean
    fun securityContextRepository(): SecurityContextRepository = HttpSessionSecurityContextRepository()
}
