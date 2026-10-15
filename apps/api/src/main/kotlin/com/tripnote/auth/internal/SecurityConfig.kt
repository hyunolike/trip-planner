package com.tripnote.auth.internal

import com.tripnote.common.TripnoteProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler
import org.springframework.security.web.context.SecurityContextRepository

@Configuration(proxyBeanMethods = false)
class SecurityConfig {
    @Bean
    fun passwordEncoder(): PasswordEncoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        contextRepository: SecurityContextRepository,
        oidcUserService: GoogleOidcUserService,
        signIn: SessionSignIn,
        props: TripnoteProperties,
    ): SecurityFilterChain = http
        .csrf { it.spa() }
        .securityContext { it.securityContextRepository(contextRepository) }
        .authorizeHttpRequests {
            it.requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .anyRequest().authenticated()
        }
        .oauth2Login {
            it.userInfoEndpoint { endpoint -> endpoint.oidcUserService(oidcUserService) }
                .authorizedClientRepository(HttpSessionOAuth2AuthorizedClientRepository())
                .successHandler { request, response, authentication ->
                    signIn.signIn((authentication.principal as TripnoteOidcUser).sessionUser, request, response)
                    response.sendRedirect("${props.webBaseUrl}/")
                }
                .failureHandler { _, response, _ -> response.sendRedirect("${props.webBaseUrl}/login?error=google") }
        }
        .logout {
            it.logoutUrl("/api/v1/auth/logout")
                .logoutSuccessHandler(HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
        }
        .exceptionHandling { it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)) }
        .build()
}
