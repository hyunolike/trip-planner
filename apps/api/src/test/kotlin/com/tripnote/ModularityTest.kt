package com.tripnote

import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules

class ModularityTest {
    @Test
    fun `modules have no forbidden dependencies`() {
        ApplicationModules.of(ApiApplication::class.java).verify()
    }
}
