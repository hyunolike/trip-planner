buildscript {
    dependencies { classpath(libs.flyway.postgresql.plugin) }
}

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.spring.dependency.management)
    alias(libs.plugins.jooq.codegen)
    alias(libs.plugins.flyway)
}

extra["jooq.version"] = libs.versions.jooq.get()

val localDb = mapOf(
    "url" to (System.getenv("JOOQ_DB_URL") ?: "jdbc:postgresql://localhost:5432/tripnote"),
    "user" to "tripnote",
    "password" to "tripnote",
)

flyway {
    url = localDb["url"]
    user = localDb["user"]
    password = localDb["password"]
    locations = arrayOf("filesystem:src/main/resources/db/migration")
    cleanDisabled = false
}

jooq {
    configuration {
        jdbc {
            driver = "org.postgresql.Driver"
            url = localDb["url"]
            user = localDb["user"]
            password = localDb["password"]
        }
        generator {
            database {
                name = "org.jooq.meta.postgres.PostgresDatabase"
                inputSchema = "public"
                excludes = "flyway_schema_history|event_publication.*|spatial_ref_sys|geography_columns|geometry_columns|postgis_.*|regexp_.*|st_.*|geometry_dump|valid_detail"
            }
            generate {
                isJavaTimeTypes = true
                isPojos = false
                isDaos = false
                isRoutines = false
                isUdts = false
                isImplicitJoinPathsToMany = false
            }
            target {
                packageName = "com.tripnote.jooq"
                directory = "src/main/generated"
            }
        }
    }
}

sourceSets {
    main { java { srcDir("src/main/generated") } }
}

group = "com.tripnote"
version = "0.1.0"

java {
    toolchain { languageVersion = JavaLanguageVersion.of(25) }
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

repositories { mavenCentral() }

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.boot:spring-boot-starter-session-data-redis")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation(platform(libs.spring.modulith.bom))
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    implementation("org.springframework.modulith:spring-modulith-starter-jdbc")
    implementation("org.springframework.boot:spring-boot-starter-jooq")
    jooqCodegen("org.postgresql:postgresql")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    implementation("org.springframework.boot:spring-boot-starter-restclient")
    implementation(libs.bouncycastle)
    runtimeOnly("org.postgresql:postgresql")
    runtimeOnly("org.flywaydb:flyway-database-postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation(libs.awaitility.kotlin)
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> { useJUnitPlatform() }
