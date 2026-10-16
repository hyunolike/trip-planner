package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import com.tripnote.common.ApiException
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate

@Service
class PasswordLoginService(
    private val users: UserRepository,
    private val credentials: PasswordCredentialRepository,
    private val passwordEncoder: PasswordEncoder,
    transactionManager: PlatformTransactionManager,
) {
    // 없는 이메일에도 같은 시간을 쓰도록 비교할 더미 해시
    private val dummyHash = passwordEncoder.encode("tripnote-dummy-password")!!
    private val tx = TransactionTemplate(transactionManager)

    private fun unauthorized() = ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요.")

    // 느린 Argon2 비교는 트랜잭션 밖에서 하고, 비교가 끝난 뒤 짧은 트랜잭션으로 해시가 그대로인지 다시 확인한다.
    fun authenticate(rawEmail: String, password: String): SessionUser {
        val user = users.findByEmail(normalizeEmail(rawEmail))
        val hash = user?.let { credentials.findById(it.id).orElse(null)?.passwordHash }
        val matches = passwordEncoder.matches(password, hash ?: dummyHash)
        if (user == null || hash == null || !matches || user.status != "active") throw unauthorized()
        if (user.emailVerifiedAt == null) {
            throw ApiException(HttpStatus.FORBIDDEN, "이메일 인증을 먼저 마쳐 주세요. 메일이 없다면 인증 메일을 다시 요청해 주세요.")
        }
        return completeLogin(user.id, hash)
    }

    /**
     * 비밀번호 재설정은 users 행을 잠근 채 세션을 폐기하고 커밋한다. 같은 행을 잠그고 확인한 해시가
     * 아직 저장된 값인지 보면, 재설정 직전에 읽은 옛 해시로 새 세션이 만들어지는 경쟁을 막을 수 있다.
     */
    fun completeLogin(userId: UUID, checkedHash: String): SessionUser =
        tx.execute {
            val user = users.lockById(userId)
            val current = credentials.findById(userId).orElse(null)?.passwordHash
            if (user == null || user.status != "active" || current != checkedHash) throw unauthorized()
            SessionUser(user.id, user.email, user.nickname)
        }!!
}
