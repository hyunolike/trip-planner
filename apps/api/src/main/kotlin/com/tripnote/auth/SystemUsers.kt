package com.tripnote.auth

import java.util.UUID

/** 샘플 여행처럼 사람이 아닌 소유자가 필요할 때 쓰는 운영 계정. 로그인 수단이 없어 로그인할 수 없다. */
interface SystemUsers {
    fun ensure(email: String, nickname: String): UUID
}
