package com.tripnote.auth.internal

import org.springframework.http.HttpStatus
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
class CsrfController {
    /**
     * csrf.spa()는 토큰을 지연 로드해서 보호 대상 요청이 오기 전에는 XSRF-TOKEN 쿠키를 쓰지 않는다.
     * 웹은 첫 쓰기 요청 전에 이 경로를 불러 쿠키를 받는다. 토큰 값을 읽는 순간 저장소가 쿠키를 쓴다.
     */
    @GetMapping("/api/v1/auth/csrf")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun csrf(token: CsrfToken) {
        token.token
    }
}
