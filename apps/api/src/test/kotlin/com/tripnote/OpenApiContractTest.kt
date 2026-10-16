package com.tripnote

import java.nio.file.Files
import java.nio.file.Path
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.get
import tools.jackson.databind.json.JsonMapper

class OpenApiContractTest : IntegrationTest() {
    @Autowired lateinit var json: JsonMapper
    private val file = Path.of("openapi.json")

    @Test
    fun `the committed contract matches the running API`() {
        val raw = mvc.get("/v3/api-docs").andExpect { status { isOk() } }.andReturn().response.contentAsString
        val pretty = json.writerWithDefaultPrettyPrinter().writeValueAsString(json.readTree(raw)) + "\n"

        if (System.getProperty("openapi.write") == "true") Files.writeString(file, pretty)

        assertThat(json.readTree(raw).get("openapi").asString()).startsWith("3.")
        assertThat(pretty).contains("/api/v1/trips/{slug}", "/api/v1/auth/signup", "/api/v1/days/{dayId}/stops/order", "/api/v1/auth/logout")
        assertThat(pretty).doesNotContain("bigDecimal", "\"JsonNode\"")
        assertThat(json.readTree(raw).get("servers").size()).isEqualTo(1)
        assertThat(json.readTree(raw).get("servers").get(0).get("url").asString()).isEqualTo("/")
        val schemas = json.readTree(raw).get("components").get("schemas")
        for (name in listOf("TripDocument", "TripSummary")) {
            assertThat(schemas.get(name).get("properties").propertyNames().toList()).contains("isSample").doesNotContain("sample")
        }
        assertThat(pretty).contains("\"isSample\"")
        val required = schemas.get("TripDocument").get("required").values().map { it.asString() }
        assertThat(required).contains("id", "slug", "title", "isSample", "days", "permissions").doesNotContain("subtitle", "sourceTripId")

        assertThat(Files.readString(file))
            .withFailMessage("openapi.json is stale. Run: ./gradlew test --tests com.tripnote.OpenApiContractTest -Dopenapi.write=true")
            .isEqualTo(pretty)
    }
}
