package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import java.util.UUID
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate

@Service
class AccountDeletionService(
    private val users: UserRepository,
    private val revoker: GoogleTokenRevoker,
    private val sessionRevoker: SessionRevoker,
    private val tx: TransactionTemplate,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * 구글 토큰 회수(실패해도 진행) -> users 행을 잠그고 삭제(소유 여행, 멤버, 로그인 수단, 이메일 토큰은 DB가 연쇄 삭제) -> 전체 세션 폐기.
     * 네트워크 호출은 잠금과 트랜잭션 밖에서 한다. 업로드 이미지 삭제는 사진 업로드를 만드는 3단계에서 추가한다.
     */
    fun delete(userId: UUID, googleAccessToken: String?) {
        // 잠금 없는 선확인: 시스템 계정이나 없는 계정이면 구글을 건드리기 전에 답한다. 잠금 아래에서 다시 확인한다.
        val existing = users.findById(userId).orElse(null) ?: throw ApiException(HttpStatus.NOT_FOUND, "계정을 찾을 수 없어요.")
        if (existing.status == "system") throw ApiException(HttpStatus.FORBIDDEN, "시스템 계정은 삭제할 수 없어요.")
        googleAccessToken?.let { token ->
            runCatching { revoker.revoke(token) }.onFailure { log.warn("google token revoke failed for {}: {}", userId, it.message) }
        }
        tx.executeWithoutResult {
            val user = users.lockById(userId) ?: return@executeWithoutResult
            if (user.status == "system") throw ApiException(HttpStatus.FORBIDDEN, "시스템 계정은 삭제할 수 없어요.")
            users.delete(user)
            users.flush()
        }
        sessionRevoker.revokeAll(userId)
    }
}
