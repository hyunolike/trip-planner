package com.tripnote

import com.tripnote.jooq.Tables.STOPS
import com.tripnote.jooq.Tables.TRIPS
import org.assertj.core.api.Assertions.assertThat
import org.jooq.DSLContext
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

class JooqSmokeTest : IntegrationTest() {
    @Autowired lateinit var dsl: DSLContext

    @Test
    fun `generated tables match the migrated schema`() {
        assertThat(dsl.fetchCount(TRIPS)).isZero()
        assertThat(STOPS.POSITION.dataType.type).isEqualTo(String::class.java)
    }
}
