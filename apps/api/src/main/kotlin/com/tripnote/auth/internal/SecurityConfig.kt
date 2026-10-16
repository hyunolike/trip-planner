package com.tripnote.auth.internal

import com.tripnote.common.TripnoteProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.http.ProblemDetail
import tools.jackson.databind.json.JsonMapper
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler
import org.springframework.security.web.context.SecurityContextRepository

private val problemMapper = JsonMapper()

/** 보안 필터는 MVC 밖이라 ProblemDetail을 직접 JSON으로 쓴다. */
private fun writeProblem(response: HttpServletResponse, status: HttpStatus, detail: String) {
    response.status = status.value()
    response.contentType = MediaType.APPLICATION_PROBLEM_JSON_VALUE
    response.characterEncoding = "UTF-8"
    response.writer.write(problemMapper.writeValueAsString(ProblemDetail.forStatusAndDetail(status, detail)))
}

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
                .requestMatchers("/v3/api-docs/**").permitAll()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/trips/*", "/api/v1/samples", "/api/v1/weather").permitAll()
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
        .exceptionHandling {
            it.authenticationEntryPoint { _, response, _ -> writeProblem(response, HttpStatus.UNAUTHORIZED, "로그인이 필요해요.") }
                .accessDeniedHandler { _, response, _ -> writeProblem(response, HttpStatus.FORBIDDEN, "이 작업을 할 권한이 없어요.") }
        }
        .build()
}
