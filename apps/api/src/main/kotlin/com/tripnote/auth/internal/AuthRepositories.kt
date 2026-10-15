package com.tripnote.auth.internal

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<UserEntity, UUID> {
    fun findByEmailIgnoreCase(email: String): UserEntity?
}

interface UserIdentityRepository : JpaRepository<UserIdentityEntity, UUID> {
    fun findByProviderAndProviderSubject(provider: String, providerSubject: String): UserIdentityEntity?
    fun findByUserId(userId: UUID): List<UserIdentityEntity>
}

interface PasswordCredentialRepository : JpaRepository<PasswordCredentialEntity, UUID>

interface EmailTokenRepository : JpaRepository<EmailTokenEntity, UUID> {
    fun findByTokenHash(tokenHash: String): EmailTokenEntity?
}
