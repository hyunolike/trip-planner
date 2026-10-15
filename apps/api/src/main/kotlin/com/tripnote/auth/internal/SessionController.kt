package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import com.tripnote.common.ApiException
import com.tripnote.common.RateLimiter
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import java.time.Duration
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

data class LoginRequest(@field:NotBlank val email: String, @field:NotBlank val password: String)
data class MeResponse(val id: String, val email: String, val nickname: String)

fun SessionUser.toMe() = MeResponse(userId.toString(), email, nickname)

private val WINDOW = Duration.ofMinutes(15)

@RestController
class SessionController(
    private val loginService: PasswordLoginService,
    private val signIn: SessionSignIn,
    private val rateLimiter: RateLimiter,
) {
    @PostMapping("/api/v1/auth/login")
    fun login(@Valid @RequestBody body: LoginRequest, request: HttpServletRequest, response: HttpServletResponse): MeResponse {
        val email = normalizeEmail(body.email)
        val client = "$email|${request.remoteAddr}"
        rateLimiter.check("login-ip", request.remoteAddr, limit = 50, window = WINDOW)
        // 실패만 센다. 시도 횟수로 막으면 남이 피해자의 로그인을 막을 수 있다.
        rateLimiter.ensureNotExceeded("login-fail-client", client, limit = 10, window = WINDOW)
        rateLimiter.ensureNotExceeded("login-fail-email", email, limit = 100, window = WINDOW)
        val user = try {
            loginService.authenticate(body.email, body.password)
        } catch (e: ApiException) {
            if (e.status == HttpStatus.UNAUTHORIZED) {
                rateLimiter.recordFailure("login-fail-client", client, WINDOW)
                rateLimiter.recordFailure("login-fail-email", email, WINDOW)
            }
            throw e
        }
        signIn.signIn(user, request, response)
        return user.toMe()
    }

    @GetMapping("/api/v1/me")
    fun me(@AuthenticationPrincipal user: SessionUser): MeResponse = user.toMe()
}
