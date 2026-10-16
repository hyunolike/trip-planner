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
        assertThat(pretty).contains("/api/v1/trips/{slug}", "/api/v1/auth/signup", "/api/v1/days/{dayId}/stops/order")
        assertThat(Files.readString(file))
            .withFailMessage("openapi.json is stale. Run: ./gradlew test --tests com.tripnote.OpenApiContractTest -Dopenapi.write=true")
            .isEqualTo(pretty)
    }
}
