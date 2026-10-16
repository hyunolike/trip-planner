package com.tripnote.auth.internal

import com.tripnote.common.TripnoteProperties
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.authentication.AuthenticationFailureHandler
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component

@Component
class GoogleLoginSuccessHandler(private val signIn: SessionSignIn, private val props: TripnoteProperties) : AuthenticationSuccessHandler {
    override fun onAuthenticationSuccess(request: HttpServletRequest, response: HttpServletResponse, authentication: Authentication) {
        signIn.signIn((authentication.principal as TripnoteOidcUser).sessionUser, request, response)
        response.sendRedirect("${props.webBaseUrl}/")
    }
}

/** 실패 사유는 주소에 싣지 않는다. */
@Component
class GoogleLoginFailureHandler(private val props: TripnoteProperties) : AuthenticationFailureHandler {
    override fun onAuthenticationFailure(request: HttpServletRequest, response: HttpServletResponse, exception: AuthenticationException) {
        response.sendRedirect("${props.webBaseUrl}/login?error=google")
    }
}
