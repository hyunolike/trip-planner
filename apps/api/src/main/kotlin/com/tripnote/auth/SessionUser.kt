package com.tripnote.auth

import java.io.Serializable
import java.security.Principal
import java.util.UUID

/** 로그인한 사용자. 세션에 저장되며 다른 모듈은 이 타입으로 현재 사용자를 받는다. */
data class SessionUser(val userId: UUID, val email: String, val nickname: String) : Principal, Serializable {
    override fun getName(): String = userId.toString()

    companion object {
        private const val serialVersionUID = 1L
    }
}
