package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.stereotype.Component

class TripnoteOidcUser(delegate: OidcUser, val sessionUser: SessionUser) :
    DefaultOidcUser(delegate.authorities, delegate.idToken, delegate.userInfo, "sub")

@Component
class GoogleOidcUserService(private val identityService: IdentityService) : OAuth2UserService<OidcUserRequest, OidcUser> {
    private val delegate = OidcUserService()

    override fun loadUser(request: OidcUserRequest): OidcUser {
        val oidc = delegate.loadUser(request)
        val sessionUser = resolveWithRetry(
            ExternalProfile(
                provider = request.clientRegistration.registrationId,
                subject = oidc.subject ?: throw OAuth2AuthenticationException(OAuth2Error("invalid_id_token", "sub claim is missing", null)),
                email = oidc.email,
                emailVerified = oidc.emailVerified == true,
                name = oidc.fullName,
                picture = oidc.picture,
            ),
        )
        return TripnoteOidcUser(oidc, sessionUser)
    }

    /** 동시 최초 로그인이 유일 제약에 부딪히면 한 번 다시 시도한다. 다시 시도하면 이미 생긴 행을 찾는다. */
    fun resolveWithRetry(
        profile: ExternalProfile,
        resolve: (ExternalProfile) -> SessionUser = identityService::resolveExternal,
    ): SessionUser {
        try {
            return resolve(profile)
        } catch (first: DataIntegrityViolationException) {
            try {
                return resolve(profile)
            } catch (second: DataIntegrityViolationException) {
                throw OAuth2AuthenticationException(OAuth2Error("account_conflict"), second)
            }
        }
    }
}
