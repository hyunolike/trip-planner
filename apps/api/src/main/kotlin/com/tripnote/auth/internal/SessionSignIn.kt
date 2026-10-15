package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.stereotype.Component

@Component
class SessionSignIn(private val contextRepository: SecurityContextRepository) {
    fun signIn(user: SessionUser, request: HttpServletRequest, response: HttpServletResponse) {
        request.getSession(true)
        request.changeSessionId()
        val authentication = UsernamePasswordAuthenticationToken.authenticated(user, null, listOf(SimpleGrantedAuthority("ROLE_USER")))
        val context = SecurityContextHolder.createEmptyContext().apply { this.authentication = authentication }
        SecurityContextHolder.setContext(context)
        contextRepository.saveContext(context, request, response)
    }
}
