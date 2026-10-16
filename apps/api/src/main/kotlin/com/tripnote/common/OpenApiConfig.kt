package com.tripnote.common

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration(proxyBeanMethods = false)
class OpenApiConfig {
    @Bean
    fun tripnoteOpenApi(): OpenAPI = OpenAPI().info(
        Info().title("여행노트 API").version("v1").description("여행노트 웹 앱이 쓰는 API. 인증은 __Host-SESSION 쿠키 세션이다."),
    )
}
