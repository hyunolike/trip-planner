package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import com.tripnote.common.ApiException
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class PasswordLoginService(
    private val users: UserRepository,
    private val credentials: PasswordCredentialRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    // 없는 이메일에도 같은 시간을 쓰도록 비교할 더미 해시
    private val dummyHash = passwordEncoder.encode("tripnote-dummy-password")!!

    // 트랜잭션 없이 짧은 조회 두 번만 하고, 느린 Argon2 비교 동안 DB 연결을 잡지 않는다.
    fun authenticate(rawEmail: String, password: String): SessionUser {
        val user = users.findByEmail(normalizeEmail(rawEmail))
        val hash = user?.let { credentials.findById(it.id).orElse(null)?.passwordHash }
        val matches = passwordEncoder.matches(password, hash ?: dummyHash)
        if (user == null || hash == null || !matches || user.status != "active") {
            throw ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요.")
        }
        if (user.emailVerifiedAt == null) {
            throw ApiException(HttpStatus.FORBIDDEN, "이메일 인증을 먼저 마쳐 주세요. 메일이 없다면 인증 메일을 다시 요청해 주세요.")
        }
        return SessionUser(user.id, user.email, user.nickname)
    }
}
