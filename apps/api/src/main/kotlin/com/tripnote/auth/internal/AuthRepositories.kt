package com.tripnote.auth.internal

import jakarta.persistence.LockModeType
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query

interface UserRepository : JpaRepository<UserEntity, UUID> {
    fun findByEmail(email: String): UserEntity?

    /** 가입과 인증이 같은 사용자 행을 두고 직렬화되도록 거는 잠금. 두 경로 모두 users 행만 잠근다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserEntity u where u.email = :email")
    fun lockByEmail(email: String): UserEntity?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from UserEntity u where u.id = :id")
    fun lockById(id: UUID): UserEntity?
}

interface UserIdentityRepository : JpaRepository<UserIdentityEntity, UUID> {
    fun findByProviderAndProviderSubject(provider: String, providerSubject: String): UserIdentityEntity?
    fun findByUserId(userId: UUID): List<UserIdentityEntity>
}

interface PasswordCredentialRepository : JpaRepository<PasswordCredentialEntity, UUID>

interface EmailTokenRepository : JpaRepository<EmailTokenEntity, UUID> {
    fun findByTokenHash(tokenHash: String): EmailTokenEntity?
}
