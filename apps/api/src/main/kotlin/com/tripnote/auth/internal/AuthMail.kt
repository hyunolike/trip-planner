package com.tripnote.auth.internal

import com.tripnote.common.TripnoteProperties
import org.springframework.modulith.events.ApplicationModuleListener
import java.util.UUID
import org.slf4j.LoggerFactory
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Component

data class VerificationMailRequested(val userId: UUID, val email: String)
data class AccountExistsMailRequested(val email: String)
data class PasswordResetMailRequested(val userId: UUID, val email: String)
data class SocialOnlyAccountMailRequested(val email: String, val provider: String)

@Component
class AuthMailer(
    private val sender: MailTransport,
    private val props: TripnoteProperties,
    private val tokens: EmailTokenService,
    private val jdbc: JdbcClient,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @ApplicationModuleListener
    fun on(event: VerificationMailRequested) = ifUserExists(event.userId) { send(
        event.email,
        "[여행노트] 이메일 주소를 확인해 주세요",
        """
        아래 링크를 열면 가입이 끝나요. 링크 페이지에서 가입할 때 정한 비밀번호를 한 번 더 입력해야 해요.
        링크는 24시간 동안 쓸 수 있어요.

        ${props.webBaseUrl}/verify-email?token=${tokens.issue(event.userId, TokenPurpose.VERIFY)}

        직접 가입하지 않았다면 이 메일은 무시해 주세요.
        """.trimIndent(),
    ) }

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
    fun on(event: PasswordResetMailRequested) = ifUserExists(event.userId) { send(
        event.email,
        "[여행노트] 비밀번호 재설정 링크",
        """
        아래 링크에서 새 비밀번호를 정할 수 있어요. 링크는 30분 동안 한 번만 쓸 수 있어요.

        ${props.webBaseUrl}/reset-password?token=${tokens.issue(event.userId, TokenPurpose.RESET)}

        직접 요청하지 않았다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.
        """.trimIndent(),
    ) }

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

    /**
     * 그 사이 계정이 지워졌으면(예: 구글 로그인이 미인증 계정을 대체) 메일을 보내지 않고 정상 종료한다.
     * 사용자 행을 FOR KEY SHARE로 잡아 두어 리스너 트랜잭션이 끝날 때까지 삭제가 기다리게 한다.
     * 토큰 INSERT는 커밋 시점에 flush되므로, 잠그지 않으면 삭제와 겹쳤을 때 커밋이 FK 위반으로 실패하고
     * 이벤트 발행 기록이 미완료로 남아 재시작마다 다시 발행된다.
     */
    private fun ifUserExists(userId: UUID, action: () -> Unit) {
        val locked = jdbc.sql("SELECT 1 FROM users WHERE id = ? FOR KEY SHARE")
            .param(userId).query(Int::class.java).optional().isPresent
        if (!locked) {
            log.info("skipping mail for deleted user {}", userId)
            return
        }
        action()
    }

    private fun send(to: String, subject: String, text: String) {
        sender.send(TransactionalMail(props.mailFrom, to, subject, text))
    }
}
