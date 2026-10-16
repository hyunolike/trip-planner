package com.tripnote.common

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.Operation
import io.swagger.v3.oas.models.PathItem
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.media.Schema
import io.swagger.v3.oas.models.responses.ApiResponse
import io.swagger.v3.oas.models.responses.ApiResponses
import io.swagger.v3.oas.models.servers.Server
import org.springdoc.core.customizers.OpenApiCustomizer
import org.springdoc.core.utils.SpringDocUtils
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import tools.jackson.databind.JsonNode

@Configuration(proxyBeanMethods = false)
class OpenApiConfig {
    init {
        // JsonNode는 임의의 JSON이다. 기본 스키마는 JsonNode의 getter를 속성으로 노출해 웹 타입을 망가뜨린다.
        SpringDocUtils.getConfig().replaceWithSchema(JsonNode::class.java, Schema<Any>())
    }

    @Bean
    fun tripnoteOpenApi(): OpenAPI = OpenAPI()
        .info(Info().title("여행노트 API").version("v1").description("여행노트 웹 앱이 쓰는 API. 인증은 __Host-SESSION 쿠키 세션이다."))
        .servers(listOf(Server().url("/")))

    /** JsonNode 필드는 springdoc이 object로 좁혀 쓰므로, 속성 없는 object를 제약 없는 스키마({})로 바꾼다. */
    @Bean
    fun anyJsonContract(): OpenApiCustomizer = OpenApiCustomizer { api ->
        api.components?.schemas?.values?.forEach { schema ->
            schema.properties?.entries?.forEach { (name, prop) ->
                val types = prop.types ?: setOf(prop.type).filterNotNull().toSet()
                val freeObject = types.isNotEmpty() && types.all { it == "object" || it == "null" } &&
                    prop.properties.isNullOrEmpty() && prop.additionalProperties == null && prop.`$ref` == null
                if (freeObject) schema.properties[name] = Schema<Any>()
            }
        }
    }

    /** 로그아웃은 컨트롤러가 아니라 보안 필터가 처리하므로 계약에 직접 넣는다. */
    @Bean
    fun logoutContract(): OpenApiCustomizer = OpenApiCustomizer { api ->
        api.servers = listOf(Server().url("/"))
        api.path(
            "/api/v1/auth/logout",
            PathItem().post(
                Operation()
                    .operationId("logout")
                    .addTagsItem("auth")
                    .summary("로그아웃")
                    .responses(ApiResponses().addApiResponse("204", ApiResponse().description("로그아웃됨. 본문 없음"))),
            ),
        )
    }
}
