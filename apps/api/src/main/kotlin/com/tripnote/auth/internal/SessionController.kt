package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import com.tripnote.common.RateLimiter
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import java.time.Duration
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

data class LoginRequest(@field:NotBlank val email: String, @field:NotBlank val password: String)
data class MeResponse(val id: String, val email: String, val nickname: String)

fun SessionUser.toMe() = MeResponse(userId.toString(), email, nickname)

@RestController
class SessionController(
    private val loginService: PasswordLoginService,
    private val signIn: SessionSignIn,
    private val rateLimiter: RateLimiter,
) {
    @PostMapping("/api/v1/auth/login")
    fun login(@Valid @RequestBody body: LoginRequest, request: HttpServletRequest, response: HttpServletResponse): MeResponse {
        rateLimiter.check("login-ip", request.remoteAddr, limit = 50, window = Duration.ofMinutes(15))
        rateLimiter.check("login-email", normalizeEmail(body.email), limit = 10, window = Duration.ofMinutes(15))
        val user = loginService.authenticate(body.email, body.password)
        signIn.signIn(user, request, response)
        return user.toMe()
    }

    @GetMapping("/api/v1/me")
    fun me(@AuthenticationPrincipal user: SessionUser): MeResponse = user.toMe()
}
