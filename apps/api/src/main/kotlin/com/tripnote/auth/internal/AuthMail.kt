package com.tripnote.auth.internal

import com.tripnote.common.TripnoteProperties
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.modulith.events.ApplicationModuleListener
import java.util.UUID
import org.springframework.stereotype.Component

data class VerificationMailRequested(val userId: UUID, val email: String)
data class AccountExistsMailRequested(val email: String)
data class PasswordResetMailRequested(val userId: UUID, val email: String)
data class SocialOnlyAccountMailRequested(val email: String, val provider: String)

@Component
class AuthMailer(
    private val sender: JavaMailSender,
    private val props: TripnoteProperties,
    private val tokens: EmailTokenService,
) {
    @ApplicationModuleListener
    fun on(event: VerificationMailRequested) = send(
        event.email,
        "[여행노트] 이메일 주소를 확인해 주세요",
        """
        아래 링크를 열면 가입이 끝나요. 링크 페이지에서 가입할 때 정한 비밀번호를 한 번 더 입력해야 해요.
        링크는 24시간 동안 쓸 수 있어요.

        ${props.webBaseUrl}/verify-email?token=${tokens.issue(event.userId, TokenPurpose.VERIFY)}

        직접 가입하지 않았다면 이 메일은 무시해 주세요.
        """.trimIndent(),
    )

    @ApplicationModuleListener
    fun on(event: AccountExistsMailRequested) = send(
        event.email,
        "[여행노트] 이미 가입된 이메일이에요",
        """
        이 이메일로 가입 요청이 들어왔지만 이미 가입된 이메일이에요.
        비밀번호가 기억나지 않으면 아래에서 재설정할 수 있어요.

        ${props.webBaseUrl}/reset-password

        직접 요청하지 않았다면 이 메일은 무시해 주세요.
        """.trimIndent(),
    )

    @ApplicationModuleListener
    fun on(event: PasswordResetMailRequested) = send(
        event.email,
        "[여행노트] 비밀번호 재설정 링크",
        """
        아래 링크에서 새 비밀번호를 정할 수 있어요. 링크는 30분 동안 한 번만 쓸 수 있어요.

        ${props.webBaseUrl}/reset-password?token=${tokens.issue(event.userId, TokenPurpose.RESET)}

        직접 요청하지 않았다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.
        """.trimIndent(),
    )

    @ApplicationModuleListener
    fun on(event: SocialOnlyAccountMailRequested) = send(
        event.email,
        "[여행노트] 구글 계정으로 가입된 이메일이에요",
        """
        이 이메일은 구글 로그인으로 가입돼 있어 비밀번호가 없어요.
        로그인 화면에서 "구글로 계속하기"를 눌러 주세요.

        ${props.webBaseUrl}/login
        """.trimIndent(),
    )

    private fun send(to: String, subject: String, text: String) {
        sender.send(SimpleMailMessage().apply {
            from = props.mailFrom
            setTo(to)
            this.subject = subject
            this.text = text
        })
    }
}
