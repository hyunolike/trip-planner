package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import com.tripnote.common.ClientIp
import com.tripnote.common.RateLimiter
import com.tripnote.common.sha256Hex
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Duration
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

data class SignupRequest(
    @field:Email @field:NotBlank @field:Size(max = 254) val email: String,
    @field:NotBlank val password: String,
    @field:NotBlank @field:Size(max = 30) val nickname: String,
)

data class VerifyEmailRequest(@field:NotBlank val token: String, @field:NotBlank val password: String)
data class EmailRequest(@field:Email @field:NotBlank @field:Size(max = 254) val email: String)
data class MessageResponse(val message: String)

data class ResetConfirmRequest(@field:NotBlank val token: String, @field:NotBlank val password: String)

private val HOUR = Duration.ofHours(1)
private val VERIFY_FAIL_WINDOW = Duration.ofMinutes(30)

@RestController
@RequestMapping("/api/v1/auth")
class EmailAuthController(
    private val signupService: SignupService,
    private val resetService: PasswordResetService,
    private val rateLimiter: RateLimiter,
    private val clientIp: ClientIp,
) {
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun signup(@Valid @RequestBody body: SignupRequest, request: HttpServletRequest): MessageResponse {
        rateLimiter.check("signup-ip", clientIp.resolve(request), limit = 10, window = HOUR)
        signupService.signup(body.email, body.password, body.nickname)
        return MessageResponse("인증 메일을 보냈어요. 메일함을 확인해 주세요.")
    }

    @PostMapping("/verify-email")
    fun verify(@Valid @RequestBody body: VerifyEmailRequest): MessageResponse {
        // 링크 하나에 대한 비밀번호 대입을 막는다. 실패만 센다.
        val subject = sha256Hex(body.token)
        rateLimiter.ensureNotExceeded("verify-fail-token", subject, limit = 5, window = VERIFY_FAIL_WINDOW)
        try {
            signupService.verify(body.token, body.password)
        } catch (e: ApiException) {
            if (e.status == HttpStatus.BAD_REQUEST) rateLimiter.recordFailure("verify-fail-token", subject, VERIFY_FAIL_WINDOW)
            throw e
        }
        return MessageResponse("이메일을 확인했어요. 이제 로그인할 수 있어요.")
    }

    @PostMapping("/verify-email/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun resend(@Valid @RequestBody body: EmailRequest, request: HttpServletRequest): MessageResponse {
        rateLimiter.check("resend-ip", clientIp.resolve(request), limit = 20, window = HOUR)
        rateLimiter.check("resend-email", normalizeEmail(body.email), limit = 5, window = HOUR)
        signupService.resendVerification(body.email)
        return MessageResponse("가입된 이메일이면 인증 메일을 다시 보냈어요.")
    }

    @PostMapping("/password-reset")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun requestReset(@Valid @RequestBody body: EmailRequest, request: HttpServletRequest): MessageResponse {
        rateLimiter.check("reset-ip", clientIp.resolve(request), limit = 20, window = HOUR)
        rateLimiter.check("reset-email", normalizeEmail(body.email), limit = 5, window = HOUR)
        resetService.request(body.email)
        return MessageResponse("가입된 이메일이면 재설정 메일을 보냈어요.")
    }

    @PostMapping("/password-reset/confirm")
    fun confirmReset(@Valid @RequestBody body: ResetConfirmRequest, request: HttpServletRequest): MessageResponse {
        rateLimiter.check("reset-confirm-ip", clientIp.resolve(request), limit = 20, window = HOUR)
        resetService.confirm(body.token, body.password)
        return MessageResponse("비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.")
    }
}
