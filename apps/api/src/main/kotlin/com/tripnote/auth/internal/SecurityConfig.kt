package com.tripnote.auth.internal

import com.tripnote.common.TripnoteProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
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
        successHandler: GoogleLoginSuccessHandler,
        failureHandler: GoogleLoginFailureHandler,
        props: TripnoteProperties,
    ): SecurityFilterChain = http
        .csrf { it.spa() }
        .securityContext { it.securityContextRepository(contextRepository) }
        .authorizeHttpRequests {
            it.requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/trips/*", "/api/v1/samples").permitAll()
                .anyRequest().authenticated()
        }
        .oauth2Login {
            // 스프링이 만드는 /login HTML을 API 호스트에서 내지 않고 웹의 로그인 화면을 로그인 페이지로 지정한다.
            it.loginPage("${props.webBaseUrl}/login")
                .userInfoEndpoint { endpoint -> endpoint.oidcUserService(oidcUserService) }
                .authorizedClientRepository(HttpSessionOAuth2AuthorizedClientRepository())
                .successHandler(successHandler)
                .failureHandler(failureHandler)
        }
        .logout {
            it.logoutUrl("/api/v1/auth/logout")
                .logoutSuccessHandler(HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
        }
        .exceptionHandling { it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)) }
        .build()
}
