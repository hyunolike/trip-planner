package com.tripnote.auth.internal

import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
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

@RestController
@RequestMapping("/api/v1/auth")
class EmailAuthController(private val signupService: SignupService) {
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun signup(@Valid @RequestBody body: SignupRequest): MessageResponse {
        signupService.signup(body.email, body.password, body.nickname)
        return MessageResponse("인증 메일을 보냈어요. 메일함을 확인해 주세요.")
    }

    @PostMapping("/verify-email")
    fun verify(@Valid @RequestBody body: VerifyEmailRequest): MessageResponse {
        signupService.verify(body.token, body.password)
        return MessageResponse("이메일을 확인했어요. 이제 로그인할 수 있어요.")
    }

    @PostMapping("/verify-email/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun resend(@Valid @RequestBody body: EmailRequest): MessageResponse {
        signupService.resendVerification(body.email)
        return MessageResponse("가입된 이메일이면 인증 메일을 다시 보냈어요.")
    }
}
