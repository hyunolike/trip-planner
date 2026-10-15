package com.tripnote.auth.internal

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler
import org.springframework.security.web.context.SecurityContextRepository

@Configuration(proxyBeanMethods = false)
class SecurityConfig {
    @Bean
    fun passwordEncoder(): PasswordEncoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()

    @Bean
    fun securityFilterChain(http: HttpSecurity, contextRepository: SecurityContextRepository): SecurityFilterChain = http
        .csrf { it.spa() }
        .securityContext { it.securityContextRepository(contextRepository) }
        .authorizeHttpRequests {
            it.requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/api/v1/auth/logout").authenticated()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .anyRequest().authenticated()
        }
        .logout {
            it.logoutUrl("/api/v1/auth/logout")
                .logoutSuccessHandler(HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
        }
        .exceptionHandling { it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)) }
        .build()
}
