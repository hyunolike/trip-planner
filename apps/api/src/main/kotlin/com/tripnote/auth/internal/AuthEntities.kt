package com.tripnote.auth.internal

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID
import org.hibernate.annotations.UuidGenerator

@Entity
@Table(name = "users")
class UserEntity(
    @Column(nullable = false, columnDefinition = "citext") var email: String,
    @Column(nullable = false) var nickname: String,
    var emailVerifiedAt: Instant? = null,
    var avatarUrl: String? = null,
    @Column(nullable = false) var status: String = "active",
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}

@Entity
@Table(name = "user_identities")
class UserIdentityEntity(
    @Column(nullable = false) val userId: UUID,
    @Column(nullable = false) val provider: String,
    @Column(nullable = false) val providerSubject: String,
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}

@Entity
@Table(name = "password_credentials")
class PasswordCredentialEntity(
    @Id val userId: UUID,
    @Column(nullable = false) var passwordHash: String,
    @Column(nullable = false) var updatedAt: Instant = Instant.now(),
)

@Entity
@Table(name = "email_tokens")
class EmailTokenEntity(
    @Column(nullable = false) val userId: UUID,
    @Column(nullable = false) val purpose: String,
    @Column(nullable = false) val tokenHash: String,
    @Column(nullable = false) val expiresAt: Instant,
    var usedAt: Instant? = null,
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}
