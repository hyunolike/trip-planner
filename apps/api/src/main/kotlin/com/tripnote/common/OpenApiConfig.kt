package com.tripnote.common

import com.fasterxml.jackson.annotation.JsonProperty
import kotlin.reflect.KClass
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.primaryConstructor
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider
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

    /**
     * springdoc은 Kotlin의 null 여부를 required로 옮기지 않아 생성된 TS 타입이 전부 optional이 된다.
     * 스키마 이름이 com.tripnote의 클래스 이름과 같으면, 기본값 없는 non-null 주 생성자 매개변수를 required로 표시한다.
     */
    @Bean
    fun requiredFieldsContract(): OpenApiCustomizer {
        val classes = tripnoteClasses()
        return OpenApiCustomizer { api ->
            api.components?.schemas?.forEach { (name, schema) ->
                val type = classes[name] ?: return@forEach
                val constructor = type.primaryConstructor ?: return@forEach
                val required = constructor.parameters
                    .filter { !it.type.isMarkedNullable && !it.isOptional }
                    .map { it.findAnnotation<JsonProperty>()?.value?.takeIf(String::isNotEmpty) ?: it.name!! }
                    .filter { schema.properties?.containsKey(it) == true }
                if (required.isNotEmpty()) schema.required = required
            }
        }
    }

    private fun tripnoteClasses(): Map<String, KClass<*>> {
        val scanner = object : ClassPathScanningCandidateComponentProvider(false) {
            override fun isCandidateComponent(definition: AnnotatedBeanDefinition) = true
        }
        scanner.addIncludeFilter { _, _ -> true }
        return scanner.findCandidateComponents("com.tripnote")
            .mapNotNull { it.beanClassName }
            .mapNotNull { runCatching { Class.forName(it).kotlin }.getOrNull() }
            .filter { !it.java.isAnonymousClass && it.java.simpleName.isNotEmpty() }
            .associateBy { it.java.simpleName }
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
