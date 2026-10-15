# API 기반 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 여행노트 API의 첫 버전을 만든다. 이메일 가입과 구글 로그인, 세션 인증, 샘플 일정 두 개 적재, 일정 조회와 스톱 편집, 복제, 회원 탈퇴, OpenAPI 계약까지 포함한다.

**Architecture:** Spring Boot 4.1 단일 애플리케이션을 Spring Modulith로 `common`, `auth`, `trip` 세 모듈로 나눈다. 쓰기는 Spring Data JPA, 읽기·적재·복제는 jOOQ와 SQL로 한다. 세션은 Spring Session이 Valkey에 저장하고 브라우저에는 `__Host-SESSION` 쿠키만 준다. 메일은 Modulith 이벤트로 커밋 뒤 보낸다.

**Tech Stack:** Kotlin 2.3, Java 25, Spring Boot 4.1.1, Spring Framework 7, Spring Security 7, Spring Session Data Redis, Spring Modulith 2.1.1, Hibernate 7, jOOQ 3.21.9, Flyway, PostgreSQL 18 + PostGIS 3.6, Valkey 9.1, Jackson 3, springdoc-openapi 3, JUnit 6, Testcontainers 2, Awaitility, Gradle 9 (Kotlin DSL)

**Spec:** `docs/superpowers/specs/2026-10-15-b2c-trip-planner-design.md` 3.1.1, 3.3, 3.4, 3.6, 3.7, 3.8절. ADR `docs/adr/0001`~`0005`, `0009`.

**선행 조건:** 1번 계획(샘플 데이터 파이프라인)이 끝나 `sample/osaka-kyoto-family-2026.json`과 `sample/danang-hoian-family-2027.json`이 검증을 통과한 상태다. Task 8부터 이 파일을 읽는다.

## Global Constraints

- 모든 코드는 `apps/api/` 아래에 둔다. 패키지 루트는 `com.tripnote`, 모듈은 `com.tripnote.common`, `com.tripnote.auth`, `com.tripnote.trip`이다. 모듈의 공개 API는 모듈 최상위 패키지의 타입이고, `internal` 하위 패키지는 다른 모듈이 참조하지 않는다.
- 버전: Spring Boot 4.1.1, Kotlin 2.3.x, Java 25 toolchain, Spring Modulith 2.1.1, jOOQ 3.21.9. 버전은 `apps/api/gradle/libs.versions.toml` 한 곳에 둔다.
- `spring.threads.virtual.enabled=true`, Hikari `maximum-pool-size: 10`.
- API 경로는 `/api/v1/...`. JSON 필드는 camelCase, 시각은 `HH:mm`, 날짜는 ISO-8601.
- 오류 응답은 `ProblemDetail`이고 `detail`은 사용자에게 보여줄 한국어 문장이다. 원인과 다음 행동을 함께 말한다. 예: `링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.`
- 계정 존재 여부를 응답으로 드러내지 않는다. 가입·재설정 요청은 이메일이 있든 없든 같은 상태 코드와 문구를 준다. 로그인 실패 문구는 `이메일 또는 비밀번호를 확인해 주세요.` 하나다.
- 이메일은 저장 전 `trim().lowercase()`. DB 컬럼은 `citext`.
- 비밀번호: Argon2id, 10자 이상 128자 이하, 유출 목록 검사. 토큰 원문은 DB에 두지 않고 SHA-256 해시만 둔다. 인증 링크 24시간, 재설정 링크 30분, 1회용.
- 세션 쿠키: 이름 `__Host-SESSION`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`.
- 남의 비공개 여행은 404로 답한다(존재 여부를 숨긴다). 읽을 수는 있지만 고칠 수 없으면 403.
- 샘플 여행(`is_sample=true`)은 소유자도 고칠 수 없다. 복제만 된다.
- 스톱 순서 키(`stops.position`)는 `COLLATE "C"` 문자열 fractional index다.

## Review Focus

- 대소문자만 다른 이메일(`Mina@Example.com`과 `mina@example.com`): 가입, 로그인, 구글 연결이 모두 같은 계정으로 취급해야 한다. Task 4와 Task 7 테스트가 대문자 입력을 쓴다.
- 두 기기에서 같은 스톱을 동시에 고친 경우: 늦게 저장한 쪽은 조용히 덮어쓰지 말고 409와 현재 값을 받아야 한다. Task 10 테스트가 오래된 `version`으로 PATCH한다.
- 순서 변경 요청에 다른 날짜나 다른 여행의 스톱 id가 섞인 경우: 스톱이 다른 날로 옮겨지면 안 되고 400이어야 한다. Task 10 테스트가 다른 날의 id를 섞어 보낸다.
- 샘플을 복제한 뒤 샘플을 다시 적재한 경우: 복제본의 `sourceTripId`가 끊기면 안 된다. Task 8 테스트가 재적재 후 trip id가 같은지 확인하고, Task 11 테스트가 복제 후 재적재해도 원본 연결이 남는지 확인한다.
- 비밀번호를 재설정했는데 다른 기기의 로그인 세션이 살아 있는 경우: 재설정 직후 기존 세션은 모두 끊겨야 한다. Task 6 테스트가 재설정 전 쿠키로 `/me`를 호출해 401을 확인한다.

---

### Task 1: 프로젝트 골격과 헬스 체크

**Files:**
- Create: `apps/api/settings.gradle.kts`
- Create: `apps/api/gradle/libs.versions.toml`
- Create: `apps/api/build.gradle.kts`
- Create: `apps/api/compose.yaml`
- Create: `apps/api/src/main/kotlin/com/tripnote/ApiApplication.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/common/TripnoteProperties.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/common/TimeConfig.kt`
- Create: `apps/api/src/main/resources/application.yml`
- Create: `apps/api/src/test/kotlin/com/tripnote/TestcontainersConfiguration.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/IntegrationTest.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/HealthTest.kt`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `TripnoteProperties(webBaseUrl, mailFrom, samplesDir, systemUserEmail, seedSamples)` (`com.tripnote.common`)
- Produces: `Clock` 빈 (`TimeConfig`)
- Produces: 테스트 기반 클래스 `IntegrationTest` (`mvc: MockMvc`, `jdbc: JdbcClient`). 이후 작업이 필드와 헬퍼를 추가한다.

- [ ] **Step 1: Gradle 래퍼와 설정 파일 만들기**

```bash
mkdir -p apps/api && cd apps/api
gradle wrapper --gradle-version 9.1.0
```

`gradle`이 없으면 `brew install gradle` 후 실행한다. 9.1.0이 없다고 나오면 `gradle wrapper --gradle-version 9.0.0`으로 만든다.

`apps/api/settings.gradle.kts`:

```kotlin
rootProject.name = "tripnote-api"
```

`apps/api/gradle/libs.versions.toml`:

```toml
[versions]
kotlin = "2.3.0"
spring-boot = "4.1.1"
spring-dependency-management = "1.1.7"
spring-modulith = "2.1.1"
jooq = "3.21.9"
flyway = "12.0.0"
springdoc = "3.1.0"
bouncycastle = "1.81"
awaitility = "4.3.0"

[libraries]
spring-modulith-bom = { module = "org.springframework.modulith:spring-modulith-bom", version.ref = "spring-modulith" }
springdoc-webmvc = { module = "org.springdoc:springdoc-openapi-starter-webmvc-api", version.ref = "springdoc" }
bouncycastle = { module = "org.bouncycastle:bcprov-jdk18on", version.ref = "bouncycastle" }
awaitility-kotlin = { module = "org.awaitility:awaitility-kotlin", version.ref = "awaitility" }
flyway-postgresql-plugin = { module = "org.flywaydb:flyway-database-postgresql", version.ref = "flyway" }

[plugins]
kotlin-jvm = { id = "org.jetbrains.kotlin.jvm", version.ref = "kotlin" }
kotlin-spring = { id = "org.jetbrains.kotlin.plugin.spring", version.ref = "kotlin" }
kotlin-jpa = { id = "org.jetbrains.kotlin.plugin.jpa", version.ref = "kotlin" }
spring-boot = { id = "org.springframework.boot", version.ref = "spring-boot" }
spring-dependency-management = { id = "io.spring.dependency-management", version.ref = "spring-dependency-management" }
jooq-codegen = { id = "org.jooq.jooq-codegen-gradle", version.ref = "jooq" }
flyway = { id = "org.flywaydb.flyway", version.ref = "flyway" }
```

`apps/api/build.gradle.kts`:

```kotlin
plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    alias(libs.plugins.spring.boot)
    alias(libs.plugins.spring.dependency.management)
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
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    runtimeOnly("org.postgresql:postgresql")
    runtimeOnly("org.flywaydb:flyway-database-postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> { useJUnitPlatform() }
```

`apps/api/compose.yaml` (로컬 개발용):

```yaml
services:
  db:
    image: postgis/postgis:18-3.6
    environment:
      POSTGRES_DB: tripnote
      POSTGRES_USER: tripnote
      POSTGRES_PASSWORD: tripnote
    ports: ["5432:5432"]
    volumes: ["db-data:/var/lib/postgresql/data"]
  valkey:
    image: valkey/valkey:9.1
    command: ["valkey-server", "--appendonly", "yes"]
    ports: ["6379:6379"]
  mail:
    image: axllent/mailpit:v1.27
    ports: ["1025:1025", "8025:8025"]
volumes:
  db-data:
```

`.gitignore`에 추가:

```
apps/api/build/
apps/api/.gradle/
apps/api/.kotlin/
```

- [ ] **Step 2: 의존성 좌표 확인**

Run: `cd apps/api && ./gradlew dependencies --configuration runtimeClasspath -q | head -40`
Expected: `spring-boot-starter-webmvc:4.1.1`이 보이고 오류가 없다. 좌표를 못 찾는 의존성이 있으면 Spring Boot 4.1 문서의 "Starters" 표에서 이름을 확인해 고친다. Testcontainers 2.x는 모듈 이름에 `testcontainers-` 접두어가 붙는다.

- [ ] **Step 3: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/TestcontainersConfiguration.kt`:

```kotlin
package com.tripnote

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.context.annotation.Bean
import org.testcontainers.containers.GenericContainer
import org.testcontainers.postgresql.PostgreSQLContainer
import org.testcontainers.utility.DockerImageName

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfiguration {
    @Bean
    @ServiceConnection
    fun postgres() = PostgreSQLContainer(
        DockerImageName.parse("postgis/postgis:18-3.6").asCompatibleSubstituteFor("postgres"),
    )

    @Bean
    @ServiceConnection(name = "redis")
    fun valkey() = GenericContainer(DockerImageName.parse("valkey/valkey:9.1")).withExposedPorts(6379)
}
```

`PostgreSQLContainer`의 패키지가 다르다는 컴파일 오류가 나면 Testcontainers 2 문서의 PostgreSQL 모듈 페이지에서 패키지를 확인해 import만 고친다.

`apps/api/src/test/kotlin/com/tripnote/IntegrationTest.kt`:

```kotlin
package com.tripnote

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
abstract class IntegrationTest {
    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var jdbc: JdbcClient
}
```

`apps/api/src/test/kotlin/com/tripnote/HealthTest.kt`:

```kotlin
package com.tripnote

import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.get

class HealthTest : IntegrationTest() {
    @Test
    fun `health is up with database and valkey`() {
        mvc.get("/actuator/health").andExpect {
            status { isOk() }
            jsonPath("$.status") { value("UP") }
        }
    }
}
```

- [ ] **Step 4: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.HealthTest`
Expected: FAIL — `Unable to find a @SpringBootConfiguration`

- [ ] **Step 5: 애플리케이션과 설정 구현**

`apps/api/src/main/kotlin/com/tripnote/ApiApplication.kt`:

```kotlin
package com.tripnote

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@SpringBootApplication
@ConfigurationPropertiesScan
class ApiApplication

fun main(args: Array<String>) {
    runApplication<ApiApplication>(*args)
}
```

`apps/api/src/main/kotlin/com/tripnote/common/TripnoteProperties.kt`:

```kotlin
package com.tripnote.common

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("tripnote")
data class TripnoteProperties(
    val webBaseUrl: String,
    val mailFrom: String,
    val samplesDir: String,
    val systemUserEmail: String,
    val seedSamples: Boolean = false,
)
```

`apps/api/src/main/kotlin/com/tripnote/common/TimeConfig.kt`:

```kotlin
package com.tripnote.common

import java.time.Clock
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration(proxyBeanMethods = false)
class TimeConfig {
    @Bean
    fun clock(): Clock = Clock.systemUTC()
}
```

`apps/api/src/main/resources/application.yml`:

```yaml
spring:
  application:
    name: tripnote-api
  threads:
    virtual:
      enabled: true
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/tripnote}
    username: ${DATABASE_USER:tripnote}
    password: ${DATABASE_PASSWORD:tripnote}
    hikari:
      maximum-pool-size: 10
  data:
    redis:
      host: ${VALKEY_HOST:localhost}
      port: ${VALKEY_PORT:6379}
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
  flyway:
    locations: classpath:db/migration
server:
  forward-headers-strategy: framework
management:
  endpoints:
    web:
      exposure:
        include: health,info
tripnote:
  web-base-url: ${TRIPNOTE_WEB_BASE_URL:http://localhost:3000}
  mail-from: ${TRIPNOTE_MAIL_FROM:no-reply@tripnote.local}
  samples-dir: ${TRIPNOTE_SAMPLES_DIR:../../sample}
  system-user-email: ${TRIPNOTE_SYSTEM_USER_EMAIL:ops@tripnote.local}
  seed-samples: ${TRIPNOTE_SEED_SAMPLES:false}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.HealthTest`
Expected: PASS. Docker가 실행 중이어야 한다.

- [ ] **Step 7: Commit**

```bash
git add apps/api .gitignore
git commit -m "feat(api): scaffold Spring Boot 4.1 API with PostGIS and Valkey test containers"
```

---

### Task 2: 스키마 V1과 모듈 경계

**Files:**
- Create: `apps/api/src/main/resources/db/migration/V1__core_schema.sql`
- Modify: `apps/api/build.gradle.kts` (Modulith 의존성)
- Modify: `apps/api/src/main/resources/application.yml` (Modulith 이벤트 설정)
- Modify: `apps/api/src/test/kotlin/com/tripnote/IntegrationTest.kt` (테스트 사이 데이터 정리)
- Create: `apps/api/src/test/kotlin/com/tripnote/ModularityTest.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/SchemaMigrationTest.kt`

**Interfaces:**
- Produces: 테이블 `users`, `user_identities`, `password_credentials`, `email_tokens`, `trips`, `trip_members`, `trip_days`, `places`, `stops`. 컬럼 이름은 아래 SQL 그대로다. 이후 작업의 JPA 엔티티와 jOOQ 코드가 이 이름을 쓴다.
- Produces: `IntegrationTest.cleanDatabase()` (`@BeforeEach`)

설계 문서 3.3의 `trip_travelers`, `trip_flights`, `trip_route`, `links`, `checklist_*`, `guides` 테이블은 MVP에서 편집하지 않는다. 그래서 여행 단위 부가 정보는 `trips.content` jsonb에, 스톱 가이드는 `stops.guide` jsonb에 둔다. 체크리스트와 링크를 편집하는 2단계에서 별도 테이블로 옮긴다. `share_links`와 완료 체크 테이블은 그 기능을 만드는 계획에서 추가한다.

- [ ] **Step 1: Modulith 의존성과 설정 추가**

`apps/api/build.gradle.kts`의 `dependencies`에 추가:

```kotlin
    implementation(platform(libs.spring.modulith.bom))
    implementation("org.springframework.modulith:spring-modulith-starter-core")
    implementation("org.springframework.modulith:spring-modulith-starter-jdbc")
    testImplementation("org.springframework.modulith:spring-modulith-starter-test")
```

`application.yml`의 `spring:` 아래에 추가:

```yaml
  modulith:
    events:
      completion-mode: delete
      republish-outstanding-events-on-restart: true
      jdbc:
        schema-initialization:
          enabled: true
```

`completion-mode: delete`는 처리가 끝난 이벤트를 바로 지운다. 메일 이벤트에는 인증 토큰 원문이 들어가므로 완료 후 남기지 않는다.

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/ModularityTest.kt`:

```kotlin
package com.tripnote

import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules

class ModularityTest {
    @Test
    fun `modules have no forbidden dependencies`() {
        ApplicationModules.of(ApiApplication::class.java).verify()
    }
}
```

`apps/api/src/test/kotlin/com/tripnote/SchemaMigrationTest.kt`:

```kotlin
package com.tripnote

import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.dao.DataIntegrityViolationException

class SchemaMigrationTest : IntegrationTest() {
    private fun newUser(email: String): UUID =
        jdbc.sql("INSERT INTO users (email, nickname) VALUES (?, '테스터') RETURNING id").param(email).query(UUID::class.java).single()

    private fun newDay(owner: UUID): Pair<UUID, UUID> {
        val tripId = jdbc.sql(
            "INSERT INTO trips (slug, owner_id, title, start_date, end_date) VALUES ('schema-test', ?, '여행', '2027-03-03', '2027-03-04') RETURNING id",
        ).param(owner).query(UUID::class.java).single()
        val dayId = jdbc.sql("INSERT INTO trip_days (trip_id, number, date) VALUES (?, 1, '2027-03-03') RETURNING id")
            .param(tripId).query(UUID::class.java).single()
        return tripId to dayId
    }

    @Test
    fun `ids default to uuid v7`() {
        assertThat(newUser("a@example.com").version()).isEqualTo(7)
    }

    @Test
    fun `email is unique regardless of case`() {
        newUser("Mina@Example.com")
        assertThatThrownBy { newUser("mina@example.com") }.isInstanceOf(DataIntegrityViolationException::class.java)
    }

    @Test
    fun `stop coordinates become a geography point`() {
        val (tripId, dayId) = newDay(newUser("b@example.com"))
        jdbc.sql(
            "INSERT INTO stops (trip_id, day_id, key, position, start_time, title, type, lat, lng) VALUES (?, ?, 'beach', 'V', '09:00', '미케 비치', 'sight', 16.0544, 108.2479)",
        ).params(tripId, dayId).update()
        val meters = jdbc.sql(
            "SELECT ST_Distance(location, ST_SetSRID(ST_MakePoint(108.2208, 16.0471), 4326)::geography) FROM stops WHERE key = 'beach'",
        ).query(Double::class.java).single()
        assertThat(meters).isBetween(2500.0, 3500.0)
    }

    @Test
    fun `stop positions sort byte-wise`() {
        val (tripId, dayId) = newDay(newUser("c@example.com"))
        listOf("a", "B", "V").forEachIndexed { index, position ->
            jdbc.sql("INSERT INTO stops (trip_id, day_id, key, position, start_time, title, type) VALUES (?, ?, ?, ?, '09:00', '스톱', 'sight')")
                .params(tripId, dayId, "s$index", position).update()
        }
        val order = jdbc.sql("SELECT position FROM stops WHERE day_id = ? ORDER BY position").param(dayId).query(String::class.java).list()
        assertThat(order).containsExactly("B", "V", "a")
    }
}
```

`IntegrationTest.kt`에 데이터 정리를 추가:

```kotlin
import org.junit.jupiter.api.BeforeEach

    @BeforeEach
    fun cleanDatabase() {
        jdbc.sql("TRUNCATE users, trips CASCADE").update()
    }
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.SchemaMigrationTest`
Expected: FAIL — `relation "users" does not exist`

- [ ] **Step 4: 마이그레이션 작성**

`apps/api/src/main/resources/db/migration/V1__core_schema.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id                uuid PRIMARY KEY DEFAULT uuidv7(),
    email             citext NOT NULL UNIQUE,
    email_verified_at timestamptz,
    nickname          text NOT NULL CHECK (char_length(nickname) BETWEEN 1 AND 30),
    avatar_url        text,
    status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'system')),
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_identities (
    id               uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id          uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider         text NOT NULL CHECK (provider IN ('password', 'google', 'kakao', 'naver', 'apple')),
    provider_subject text NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_subject)
);
CREATE INDEX user_identities_user_idx ON user_identities (user_id);

CREATE TABLE password_credentials (
    user_id       uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    password_hash text NOT NULL,
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_tokens (
    id         uuid PRIMARY KEY DEFAULT uuidv7(),
    user_id    uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose    text NOT NULL CHECK (purpose IN ('verify', 'reset')),
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trips (
    id             uuid PRIMARY KEY DEFAULT uuidv7(),
    slug           text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,64}$'),
    owner_id       uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title          text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
    subtitle       text,
    start_date     date NOT NULL,
    end_date       date NOT NULL,
    timezone       text NOT NULL DEFAULT 'Asia/Seoul',
    visibility     text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'link', 'public')),
    is_sample      boolean NOT NULL DEFAULT false,
    source_trip_id uuid REFERENCES trips (id) ON DELETE SET NULL,
    content        jsonb NOT NULL DEFAULT '{}'::jsonb,
    version        integer NOT NULL DEFAULT 0,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);
CREATE INDEX trips_public_samples_idx ON trips (start_date) WHERE visibility = 'public' AND is_sample;

CREATE TABLE trip_members (
    trip_id   uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role      text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX trip_members_user_idx ON trip_members (user_id);

CREATE TABLE trip_days (
    id      uuid PRIMARY KEY DEFAULT uuidv7(),
    trip_id uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    number  integer NOT NULL CHECK (number >= 1),
    date    date NOT NULL,
    city    text NOT NULL DEFAULT '',
    theme   text NOT NULL DEFAULT '',
    note    text,
    color   text,
    tour    jsonb,
    UNIQUE (trip_id, number)
);

CREATE TABLE places (
    id       uuid PRIMARY KEY DEFAULT uuidv7(),
    trip_id  uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    key      text NOT NULL,
    kind     text NOT NULL CHECK (kind IN ('dining', 'shopping', 'hotel', 'sight')),
    name     text NOT NULL,
    area     text NOT NULL,
    details  jsonb NOT NULL DEFAULT '{}'::jsonb,
    position integer NOT NULL,
    UNIQUE (trip_id, key)
);

CREATE TABLE stops (
    id             uuid PRIMARY KEY DEFAULT uuidv7(),
    trip_id        uuid NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
    day_id         uuid NOT NULL REFERENCES trip_days (id) ON DELETE CASCADE,
    key            text NOT NULL,
    position       text COLLATE "C" NOT NULL,
    start_time     time NOT NULL,
    title          text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
    type           text NOT NULL CHECK (type IN ('airport', 'flight', 'transport', 'hotel', 'meal', 'sight', 'shopping', 'free', 'breakfast', 'bath', 'tour')),
    details        text NOT NULL DEFAULT '',
    duration       text,
    buffer         text,
    timing         text,
    transport_icon text,
    lat            double precision CHECK (lat BETWEEN -90 AND 90),
    lng            double precision CHECK (lng BETWEEN -180 AND 180),
    approximate    boolean NOT NULL DEFAULT false,
    location       geography(Point, 4326) GENERATED ALWAYS AS (
                       CASE WHEN lat IS NULL OR lng IS NULL THEN NULL
                            ELSE ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography END
                   ) STORED,
    transit        jsonb,
    photo          jsonb,
    hotel_photo    jsonb,
    links          jsonb,
    place_key      text,
    guide          jsonb,
    optional       boolean NOT NULL DEFAULT false,
    version        integer NOT NULL DEFAULT 0,
    UNIQUE (trip_id, key),
    CONSTRAINT stops_day_position_key UNIQUE (day_id, position) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX stops_day_order_idx ON stops (day_id, position);
CREATE INDEX stops_location_idx ON stops USING gist (location);
```

`stops_day_position_key`를 `DEFERRABLE INITIALLY DEFERRED`로 둔 이유: 순서 변경은 한 트랜잭션에서 여러 행의 `position`을 바꾸므로 중간 상태에서 값이 겹칠 수 있다. 검사는 커밋 시점에만 한다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.SchemaMigrationTest --tests com.tripnote.ModularityTest --tests com.tripnote.HealthTest`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): add core schema with PostGIS stops and Modulith verification"
```

---

### Task 3: jOOQ 코드 생성

생성 코드는 저장소에 커밋한다. 빌드가 데이터베이스 없이 돌아가고, CI는 마이그레이션에서 다시 생성해 커밋된 코드와 다른지 확인한다(Task 12).

**Files:**
- Modify: `apps/api/build.gradle.kts`
- Create: `apps/api/src/main/generated/com/tripnote/jooq/**` (생성 결과)
- Create: `apps/api/src/test/kotlin/com/tripnote/JooqSmokeTest.kt`

**Interfaces:**
- Produces: `com.tripnote.jooq.Tables.{USERS, USER_IDENTITIES, PASSWORD_CREDENTIALS, EMAIL_TOKENS, TRIPS, TRIP_MEMBERS, TRIP_DAYS, PLACES, STOPS}`와 각 `*Record` 클래스. 컬럼 필드는 대문자 스네이크 케이스(`TRIPS.SLUG`, `STOPS.START_TIME`), 레코드 속성은 카멜 케이스(`record.startTime`)다.
- Produces: `DSLContext` 빈 (`spring-boot-starter-jooq`)

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/JooqSmokeTest.kt`:

```kotlin
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
        assertThat(STOPS.POSITION.dataType.typeName).isEqualTo("text")
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.JooqSmokeTest`
Expected: FAIL — `Unresolved reference: jooq`

- [ ] **Step 3: 코드 생성 설정**

`apps/api/build.gradle.kts` 맨 위(plugins 앞)에 추가:

```kotlin
buildscript {
    dependencies { classpath(libs.flyway.postgresql.plugin) }
}
```

`plugins`에 추가:

```kotlin
    alias(libs.plugins.jooq.codegen)
    alias(libs.plugins.flyway)
```

`plugins` 블록 아래에 추가:

```kotlin
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
                excludes = "flyway_schema_history|event_publication.*|spatial_ref_sys|geography_columns|geometry_columns"
            }
            generate {
                isJavaTimeTypes = true
                isPojos = false
                isDaos = false
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
```

`dependencies`에 추가:

```kotlin
    implementation("org.springframework.boot:spring-boot-starter-jooq")
    jooqCodegen("org.postgresql:postgresql")
```

- [ ] **Step 4: 생성 실행**

```bash
cd apps/api
docker compose up -d db
./gradlew flywayClean flywayMigrate jooqCodegen
```

Expected: `src/main/generated/com/tripnote/jooq/Tables.java`가 생긴다. Flyway Gradle 플러그인이 Gradle 9에서 실패하면 `./gradlew bootRun`을 한 번 실행해 애플리케이션이 마이그레이션하게 한 뒤 종료하고 `./gradlew jooqCodegen`만 실행한다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.JooqSmokeTest`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/build.gradle.kts apps/api/src/main/generated apps/api/src/test/kotlin/com/tripnote/JooqSmokeTest.kt
git commit -m "build(api): generate jOOQ classes from Flyway schema"
```

---

### Task 4: 이메일 가입과 인증

**Files:**
- Modify: `apps/api/build.gradle.kts`
- Modify: `apps/api/src/main/kotlin/com/tripnote/ApiApplication.kt` (`@EnableAsync`)
- Create: `apps/api/src/main/kotlin/com/tripnote/common/ApiException.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/common/ApiExceptionHandler.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/common/Hashing.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/AuthEntities.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/AuthRepositories.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/EmailTokenService.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/PasswordPolicy.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/AuthMail.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SignupService.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SecurityConfig.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/EmailAuthController.kt`
- Modify: `apps/api/src/main/resources/application.yml` (mail)
- Create: `apps/api/src/test/kotlin/com/tripnote/support/RecordingMailSender.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/support/MutableClock.kt`
- Modify: `apps/api/src/test/kotlin/com/tripnote/TestcontainersConfiguration.kt`
- Modify: `apps/api/src/test/kotlin/com/tripnote/IntegrationTest.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/auth/EmailSignupTest.kt`

**Interfaces:**
- Produces: `ApiException(status: HttpStatus, message: String, retryAfter: Duration? = null)` (`com.tripnote.common`). 컨트롤러와 서비스가 사용자에게 보일 오류를 이 예외로 던진다.
- Produces: `sha256Hex(value: String): String`, `sha1Hex(value: String): String` (`com.tripnote.common`)
- Produces: `TokenPurpose { VERIFY, RESET }`, `EmailTokenService.issue(userId: UUID, purpose: TokenPurpose): String`, `EmailTokenService.consume(token: String, purpose: TokenPurpose): UUID?`
- Produces: `PasswordPolicy.check(password: String)` — 약하면 `ApiException(400)`
- Produces: `BreachedPasswordChecker` (fun interface, `isBreached(password: String): Boolean`)
- Produces: 엔티티 `UserEntity`, `UserIdentityEntity`, `PasswordCredentialEntity`, `EmailTokenEntity`와 저장소 `UserRepository.findByEmailIgnoreCase(email)`, `UserIdentityRepository.findByProviderAndProviderSubject(provider, subject)`, `UserIdentityRepository.findByUserId(userId)`, `EmailTokenRepository.findByTokenHash(hash)`
- Produces: 이벤트 `VerificationMailRequested(email, token)`, `AccountExistsMailRequested(email)`
- Produces: HTTP `POST /api/v1/auth/signup`, `POST /api/v1/auth/verify-email`, `POST /api/v1/auth/verify-email/resend`
- Produces (test): `IntegrationTest.signup(email, password, nickname)`, `awaitMail(to)`, `tokenIn(message)`, `clock: MutableClock`, `mail: RecordingMailSender`

- [ ] **Step 1: 의존성과 메일 설정 추가**

`build.gradle.kts`의 `dependencies`에 추가:

```kotlin
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    implementation(libs.bouncycastle)
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation(libs.awaitility.kotlin)
```

`application.yml`의 `spring:` 아래에 추가:

```yaml
  mail:
    host: ${MAIL_HOST:localhost}
    port: ${MAIL_PORT:1025}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
```

- [ ] **Step 2: 테스트 지원 코드 작성**

`apps/api/src/test/kotlin/com/tripnote/support/RecordingMailSender.kt`:

```kotlin
package com.tripnote.support

import java.util.concurrent.CopyOnWriteArrayList
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSenderImpl

class RecordingMailSender : JavaMailSenderImpl() {
    val sent = CopyOnWriteArrayList<SimpleMailMessage>()

    override fun send(vararg simpleMessages: SimpleMailMessage) {
        sent.addAll(simpleMessages)
    }
}
```

`apps/api/src/test/kotlin/com/tripnote/support/MutableClock.kt`:

```kotlin
package com.tripnote.support

import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset

class MutableClock : Clock() {
    private val start = Instant.parse("2026-10-16T00:00:00Z")
    @Volatile private var now = start

    override fun getZone(): ZoneId = ZoneOffset.UTC
    override fun withZone(zone: ZoneId): Clock = this
    override fun instant(): Instant = now

    fun advance(duration: Duration) { now = now.plus(duration) }
    fun reset() { now = start }
}
```

`TestcontainersConfiguration.kt`에 빈 추가:

```kotlin
import com.tripnote.auth.internal.BreachedPasswordChecker
import com.tripnote.support.MutableClock
import com.tripnote.support.RecordingMailSender
import org.springframework.context.annotation.Primary

    @Bean
    fun recordingMailSender() = RecordingMailSender()

    @Bean
    @Primary
    fun mutableClock() = MutableClock()

    @Bean
    @Primary
    fun fakeBreachedPasswordChecker() = BreachedPasswordChecker { it == "password1234" }
```

`IntegrationTest.kt` 전체를 다음으로 바꾼다:

```kotlin
package com.tripnote

import com.tripnote.support.MutableClock
import com.tripnote.support.RecordingMailSender
import java.time.Duration
import org.awaitility.kotlin.atMost
import org.awaitility.kotlin.await
import org.awaitility.kotlin.untilNotNull
import org.junit.jupiter.api.BeforeEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.mail.SimpleMailMessage
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.post

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration::class)
abstract class IntegrationTest {
    @Autowired lateinit var mvc: MockMvc
    @Autowired lateinit var jdbc: JdbcClient
    @Autowired lateinit var mail: RecordingMailSender
    @Autowired lateinit var clock: MutableClock

    @BeforeEach
    fun cleanDatabase() {
        jdbc.sql("TRUNCATE users, trips CASCADE").update()
        mail.sent.clear()
        clock.reset()
    }

    fun postJson(path: String, body: String): ResultActionsDsl = mvc.post(path) {
        contentType = MediaType.APPLICATION_JSON
        content = body
        with(csrf())
    }

    fun signup(email: String, password: String = "trip-note-2027", nickname: String = "미나") =
        postJson("/api/v1/auth/signup", """{"email":"$email","password":"$password","nickname":"$nickname"}""")

    fun awaitMail(to: String): SimpleMailMessage =
        await atMost Duration.ofSeconds(10) untilNotNull { mail.sent.lastOrNull { it.to?.contains(to) == true } }

    fun tokenIn(message: SimpleMailMessage): String =
        Regex("token=([A-Za-z0-9_-]+)").find(message.text!!)!!.groupValues[1]
}
```

- [ ] **Step 3: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/auth/EmailSignupTest.kt`:

```kotlin
package com.tripnote.auth

import com.tripnote.IntegrationTest
import com.tripnote.common.sha256Hex
import java.time.Duration
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class EmailSignupTest : IntegrationTest() {
    private fun count(sql: String, vararg params: Any) =
        jdbc.sql(sql).params(*params).query(Int::class.java).single()

    @Test
    fun `signup stores a normalized unverified user and mails a verification link`() {
        signup("Mina@Example.com").andExpect {
            status { isAccepted() }
            jsonPath("$.message") { value("인증 메일을 보냈어요. 메일함을 확인해 주세요.") }
        }

        val message = awaitMail("mina@example.com")
        val token = tokenIn(message)
        assertThat(message.text).contains("http://localhost:3000/verify-email?token=")
        assertThat(count("SELECT count(*) FROM users WHERE email = 'mina@example.com' AND email_verified_at IS NULL")).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM user_identities WHERE provider = 'password'")).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM email_tokens WHERE token_hash = ?", sha256Hex(token))).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM email_tokens WHERE token_hash = ?", token)).isZero()
    }

    @Test
    fun `verifying the link marks the email verified once`() {
        signup("mina@example.com")
        val token = tokenIn(awaitMail("mina@example.com"))

        postJson("/api/v1/auth/verify-email", """{"token":"$token"}""").andExpect { status { isOk() } }
        assertThat(count("SELECT count(*) FROM users WHERE email_verified_at IS NOT NULL")).isEqualTo(1)

        postJson("/api/v1/auth/verify-email", """{"token":"$token"}""").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.") }
        }
    }

    @Test
    fun `an expired verification link is rejected`() {
        signup("mina@example.com")
        val token = tokenIn(awaitMail("mina@example.com"))
        clock.advance(Duration.ofHours(25))

        postJson("/api/v1/auth/verify-email", """{"token":"$token"}""").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `short and breached passwords are rejected with a reason`() {
        signup("mina@example.com", password = "short").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("비밀번호는 10자 이상이어야 해요.") }
        }
        signup("mina@example.com", password = "password1234").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("유출된 적 있는 비밀번호예요. 다른 비밀번호를 써 주세요.") }
        }
        assertThat(count("SELECT count(*) FROM users")).isZero()
    }

    @Test
    fun `signing up with a verified email answers the same and mails a notice instead`() {
        signup("mina@example.com")
        postJson("/api/v1/auth/verify-email", """{"token":"${tokenIn(awaitMail("mina@example.com"))}"}""")
        mail.sent.clear()

        signup("MINA@example.com", nickname = "다른사람").andExpect { status { isAccepted() } }

        assertThat(awaitMail("mina@example.com").text).contains("이미 가입된 이메일이에요")
        assertThat(count("SELECT count(*) FROM users")).isEqualTo(1)
    }

    @Test
    fun `resend issues a new link for an unverified account and stays silent otherwise`() {
        signup("mina@example.com")
        awaitMail("mina@example.com")
        mail.sent.clear()

        postJson("/api/v1/auth/verify-email/resend", """{"email":"mina@example.com"}""").andExpect { status { isAccepted() } }
        assertThat(awaitMail("mina@example.com").text).contains("verify-email?token=")

        postJson("/api/v1/auth/verify-email/resend", """{"email":"nobody@example.com"}""").andExpect { status { isAccepted() } }
    }

    @Test
    fun `invalid input is rejected before touching the database`() {
        postJson("/api/v1/auth/signup", """{"email":"not-an-email","password":"trip-note-2027","nickname":"미나"}""").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("입력값을 확인해 주세요.") }
        }
    }
}
```

- [ ] **Step 4: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.auth.EmailSignupTest`
Expected: FAIL — 컴파일 오류 `Unresolved reference: BreachedPasswordChecker`, `sha256Hex`

- [ ] **Step 5: 공용 코드 구현**

`apps/api/src/main/kotlin/com/tripnote/common/ApiException.kt`:

```kotlin
package com.tripnote.common

import java.time.Duration
import org.springframework.http.HttpStatus

class ApiException(
    val status: HttpStatus,
    override val message: String,
    val retryAfter: Duration? = null,
    val body: Any? = null,
) : RuntimeException(message)
```

`apps/api/src/main/kotlin/com/tripnote/common/ApiExceptionHandler.kt`:

```kotlin
package com.tripnote.common

import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(ApiException::class)
    fun handle(exception: ApiException): ResponseEntity<ProblemDetail> {
        val problem = ProblemDetail.forStatusAndDetail(exception.status, exception.message)
        exception.body?.let { problem.setProperty("current", it) }
        val builder = ResponseEntity.status(exception.status)
        exception.retryAfter?.let { builder.header(HttpHeaders.RETRY_AFTER, it.toSeconds().toString()) }
        return builder.body(problem)
    }

    @ExceptionHandler(MethodArgumentNotValidException::class, HttpMessageNotReadableException::class)
    fun invalid(exception: Exception): ProblemDetail {
        val problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "입력값을 확인해 주세요.")
        if (exception is MethodArgumentNotValidException) {
            problem.setProperty("fields", exception.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "") })
        }
        return problem
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/common/Hashing.kt`:

```kotlin
package com.tripnote.common

import java.security.MessageDigest

private fun digestHex(algorithm: String, value: String): String =
    MessageDigest.getInstance(algorithm).digest(value.toByteArray()).joinToString("") { "%02x".format(it) }

fun sha256Hex(value: String): String = digestHex("SHA-256", value)

fun sha1Hex(value: String): String = digestHex("SHA-1", value)
```

`ApiApplication.kt`에 `@EnableAsync` 추가(Modulith의 `@ApplicationModuleListener`는 비동기 리스너다):

```kotlin
import org.springframework.scheduling.annotation.EnableAsync

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
class ApiApplication
```

- [ ] **Step 6: 인증 엔티티와 저장소 구현**

`apps/api/src/main/kotlin/com/tripnote/auth/internal/AuthEntities.kt`:

```kotlin
package com.tripnote.auth.internal

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID
import org.hibernate.annotations.UuidGenerator

@Entity
@Table(name = "users")
class UserEntity(
    @Column(nullable = false) var email: String,
    @Column(nullable = false) var nickname: String,
    var emailVerifiedAt: Instant? = null,
    var avatarUrl: String? = null,
    @Column(nullable = false) var status: String = "active",
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}

@Entity
@Table(name = "user_identities")
class UserIdentityEntity(
    @Column(nullable = false) val userId: UUID,
    @Column(nullable = false) val provider: String,
    @Column(nullable = false) val providerSubject: String,
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}

@Entity
@Table(name = "password_credentials")
class PasswordCredentialEntity(
    @Id val userId: UUID,
    @Column(nullable = false) var passwordHash: String,
    @Column(nullable = false) var updatedAt: Instant = Instant.now(),
)

@Entity
@Table(name = "email_tokens")
class EmailTokenEntity(
    @Column(nullable = false) val userId: UUID,
    @Column(nullable = false) val purpose: String,
    @Column(nullable = false) val tokenHash: String,
    @Column(nullable = false) val expiresAt: Instant,
    var usedAt: Instant? = null,
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    @Column(nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()
}
```

`UuidGenerator.Style.VERSION_7`이 없다는 컴파일 오류가 나면 Hibernate 7 문서에서 v7 스타일 이름을 확인한다. 없으면 `@Id @Column(insertable = false, updatable = false) @Generated` 조합으로 DB의 `uuidv7()` 기본값을 쓰도록 바꾼다.

`apps/api/src/main/kotlin/com/tripnote/auth/internal/AuthRepositories.kt`:

```kotlin
package com.tripnote.auth.internal

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<UserEntity, UUID> {
    fun findByEmailIgnoreCase(email: String): UserEntity?
}

interface UserIdentityRepository : JpaRepository<UserIdentityEntity, UUID> {
    fun findByProviderAndProviderSubject(provider: String, providerSubject: String): UserIdentityEntity?
    fun findByUserId(userId: UUID): List<UserIdentityEntity>
}

interface PasswordCredentialRepository : JpaRepository<PasswordCredentialEntity, UUID>

interface EmailTokenRepository : JpaRepository<EmailTokenEntity, UUID> {
    fun findByTokenHash(tokenHash: String): EmailTokenEntity?
}
```

- [ ] **Step 7: 토큰, 비밀번호 정책, 메일 구현**

`apps/api/src/main/kotlin/com/tripnote/auth/internal/EmailTokenService.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.common.sha256Hex
import java.security.SecureRandom
import java.time.Clock
import java.time.Duration
import java.util.Base64
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

enum class TokenPurpose(val dbValue: String, val ttl: Duration) {
    VERIFY("verify", Duration.ofHours(24)),
    RESET("reset", Duration.ofMinutes(30)),
}

@Service
class EmailTokenService(private val tokens: EmailTokenRepository, private val clock: Clock) {
    private val random = SecureRandom()

    @Transactional
    fun issue(userId: UUID, purpose: TokenPurpose): String {
        val bytes = ByteArray(32).also(random::nextBytes)
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        tokens.save(
            EmailTokenEntity(
                userId = userId,
                purpose = purpose.dbValue,
                tokenHash = sha256Hex(token),
                expiresAt = clock.instant().plus(purpose.ttl),
            ),
        )
        return token
    }

    /** 유효하면 사용 처리하고 사용자 id를 돌려준다. 없거나, 용도가 다르거나, 만료됐거나, 이미 썼으면 null. */
    @Transactional
    fun consume(token: String, purpose: TokenPurpose): UUID? {
        val entity = tokens.findByTokenHash(sha256Hex(token)) ?: return null
        val now = clock.instant()
        if (entity.purpose != purpose.dbValue || entity.usedAt != null || !entity.expiresAt.isAfter(now)) return null
        entity.usedAt = now
        return entity.userId
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/PasswordPolicy.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import com.tripnote.common.sha1Hex
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException

fun interface BreachedPasswordChecker {
    fun isBreached(password: String): Boolean
}

/** Have I Been Pwned 범위 조회. 해시 앞 5자리만 보내고, 실패하면 가입을 막지 않는다. */
@Component
class HibpBreachedPasswordChecker(builder: RestClient.Builder) : BreachedPasswordChecker {
    private val log = LoggerFactory.getLogger(javaClass)
    private val client = builder.baseUrl("https://api.pwnedpasswords.com").build()

    override fun isBreached(password: String): Boolean {
        val hash = sha1Hex(password).uppercase()
        val prefix = hash.take(5)
        val suffix = hash.drop(5)
        return try {
            val body = client.get().uri("/range/{prefix}", prefix).header("Add-Padding", "true")
                .retrieve().body(String::class.java) ?: return false
            body.lineSequence().any { line ->
                val (candidate, count) = line.trim().split(':').let { it[0] to it.getOrElse(1) { "0" } }
                candidate == suffix && count.trim() != "0"
            }
        } catch (exception: RestClientException) {
            log.warn("breached password check unavailable: {}", exception.message)
            false
        }
    }
}

@Component
class PasswordPolicy(private val breached: BreachedPasswordChecker) {
    fun check(password: String) {
        if (password.length < 10) throw ApiException(HttpStatus.BAD_REQUEST, "비밀번호는 10자 이상이어야 해요.")
        if (password.length > 128) throw ApiException(HttpStatus.BAD_REQUEST, "비밀번호는 128자 이하여야 해요.")
        if (breached.isBreached(password)) throw ApiException(HttpStatus.BAD_REQUEST, "유출된 적 있는 비밀번호예요. 다른 비밀번호를 써 주세요.")
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/AuthMail.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.common.TripnoteProperties
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.modulith.events.ApplicationModuleListener
import org.springframework.stereotype.Component

data class VerificationMailRequested(val email: String, val token: String)
data class AccountExistsMailRequested(val email: String)
data class PasswordResetMailRequested(val email: String, val token: String)
data class SocialOnlyAccountMailRequested(val email: String, val provider: String)

@Component
class AuthMailer(private val sender: JavaMailSender, private val props: TripnoteProperties) {
    @ApplicationModuleListener
    fun on(event: VerificationMailRequested) = send(
        event.email,
        "[여행노트] 이메일 주소를 확인해 주세요",
        """
        아래 링크를 열면 가입이 끝나요. 링크는 24시간 동안 쓸 수 있어요.

        ${props.webBaseUrl}/verify-email?token=${event.token}

        직접 가입하지 않았다면 이 메일은 무시해 주세요.
        """.trimIndent(),
    )

    @ApplicationModuleListener
    fun on(event: AccountExistsMailRequested) = send(
        event.email,
        "[여행노트] 이미 가입된 이메일이에요",
        """
        이 이메일로 가입 요청이 들어왔지만 이미 가입된 이메일이에요.
        비밀번호가 기억나지 않으면 아래에서 재설정할 수 있어요.

        ${props.webBaseUrl}/reset-password

        직접 요청하지 않았다면 이 메일은 무시해 주세요.
        """.trimIndent(),
    )

    @ApplicationModuleListener
    fun on(event: PasswordResetMailRequested) = send(
        event.email,
        "[여행노트] 비밀번호 재설정 링크",
        """
        아래 링크에서 새 비밀번호를 정할 수 있어요. 링크는 30분 동안 한 번만 쓸 수 있어요.

        ${props.webBaseUrl}/reset-password?token=${event.token}

        직접 요청하지 않았다면 이 메일은 무시해 주세요. 비밀번호는 바뀌지 않아요.
        """.trimIndent(),
    )

    @ApplicationModuleListener
    fun on(event: SocialOnlyAccountMailRequested) = send(
        event.email,
        "[여행노트] 구글 계정으로 가입된 이메일이에요",
        """
        이 이메일은 구글 로그인으로 가입돼 있어 비밀번호가 없어요.
        로그인 화면에서 "구글로 계속하기"를 눌러 주세요.

        ${props.webBaseUrl}/login
        """.trimIndent(),
    )

    private fun send(to: String, subject: String, text: String) {
        sender.send(SimpleMailMessage().apply {
            from = props.mailFrom
            setTo(to)
            this.subject = subject
            this.text = text
        })
    }
}
```

- [ ] **Step 8: 가입 서비스, 보안 설정, 컨트롤러 구현**

`apps/api/src/main/kotlin/com/tripnote/auth/internal/SignupService.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import java.time.Clock
import org.springframework.context.ApplicationEventPublisher
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

fun normalizeEmail(email: String) = email.trim().lowercase()

@Service
class SignupService(
    private val users: UserRepository,
    private val identities: UserIdentityRepository,
    private val credentials: PasswordCredentialRepository,
    private val tokens: EmailTokenService,
    private val passwordEncoder: PasswordEncoder,
    private val passwordPolicy: PasswordPolicy,
    private val events: ApplicationEventPublisher,
    private val clock: Clock,
) {
    @Transactional
    fun signup(rawEmail: String, password: String, nickname: String) {
        val email = normalizeEmail(rawEmail)
        passwordPolicy.check(password)

        val existing = users.findByEmailIgnoreCase(email)
        if (existing != null) {
            if (existing.emailVerifiedAt == null) {
                events.publishEvent(VerificationMailRequested(email, tokens.issue(existing.id, TokenPurpose.VERIFY)))
            } else {
                events.publishEvent(AccountExistsMailRequested(email))
            }
            return
        }

        val user = users.saveAndFlush(UserEntity(email = email, nickname = nickname.trim()))
        identities.save(UserIdentityEntity(userId = user.id, provider = "password", providerSubject = user.id.toString()))
        credentials.save(PasswordCredentialEntity(userId = user.id, passwordHash = passwordEncoder.encode(password)!!))
        events.publishEvent(VerificationMailRequested(email, tokens.issue(user.id, TokenPurpose.VERIFY)))
    }

    @Transactional
    fun verify(token: String) {
        val userId = tokens.consume(token, TokenPurpose.VERIFY)
            ?: throw ApiException(HttpStatus.BAD_REQUEST, "링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.")
        users.findById(userId).ifPresent { it.emailVerifiedAt = it.emailVerifiedAt ?: clock.instant() }
    }

    @Transactional
    fun resendVerification(rawEmail: String) {
        val user = users.findByEmailIgnoreCase(normalizeEmail(rawEmail)) ?: return
        if (user.emailVerifiedAt != null) return
        events.publishEvent(VerificationMailRequested(user.email, tokens.issue(user.id, TokenPurpose.VERIFY)))
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/SecurityConfig.kt`:

```kotlin
package com.tripnote.auth.internal

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint

@Configuration(proxyBeanMethods = false)
class SecurityConfig {
    @Bean
    fun passwordEncoder(): PasswordEncoder = Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain = http
        .csrf { it.spa() }
        .authorizeHttpRequests {
            it.requestMatchers("/actuator/health/**", "/api/v1/auth/**").permitAll()
                .anyRequest().authenticated()
        }
        .exceptionHandling { it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)) }
        .build()
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/EmailAuthController.kt`:

```kotlin
package com.tripnote.auth.internal

import jakarta.validation.Valid
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

data class SignupRequest(
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank val password: String,
    @field:NotBlank @field:Size(max = 30) val nickname: String,
)

data class TokenRequest(@field:NotBlank val token: String)
data class EmailRequest(@field:Email @field:NotBlank val email: String)
data class MessageResponse(val message: String)

@RestController
@RequestMapping("/api/v1/auth")
class EmailAuthController(private val signupService: SignupService) {
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun signup(@Valid @RequestBody body: SignupRequest): MessageResponse {
        signupService.signup(body.email, body.password, body.nickname)
        return MessageResponse("인증 메일을 보냈어요. 메일함을 확인해 주세요.")
    }

    @PostMapping("/verify-email")
    fun verify(@Valid @RequestBody body: TokenRequest): MessageResponse {
        signupService.verify(body.token)
        return MessageResponse("이메일을 확인했어요. 이제 로그인할 수 있어요.")
    }

    @PostMapping("/verify-email/resend")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun resend(@Valid @RequestBody body: EmailRequest): MessageResponse {
        signupService.resendVerification(body.email)
        return MessageResponse("가입된 이메일이면 인증 메일을 다시 보냈어요.")
    }
}
```

- [ ] **Step 9: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.auth.EmailSignupTest --tests com.tripnote.ModularityTest`
Expected: PASS (8 tests). `ModularityTest`가 `common`과 `auth` 사이 순환을 보고하면, `common`의 코드가 `auth`를 참조하지 않는지 확인한다.

- [ ] **Step 10: Commit**

```bash
git add apps/api
git commit -m "feat(api): add email signup and verification with hashed one-time tokens"
```

---

### Task 5: 로그인, 세션, 로그아웃, 레이트리밋

**Files:**
- Modify: `apps/api/build.gradle.kts`
- Modify: `apps/api/src/main/resources/application.yml`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/SessionUser.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/common/RateLimiter.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SessionConfig.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SessionSignIn.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/PasswordLoginService.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SessionController.kt`
- Modify: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SecurityConfig.kt`
- Modify: `apps/api/src/test/kotlin/com/tripnote/IntegrationTest.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/auth/LoginTest.kt`

**Interfaces:**
- Consumes: `UserRepository`, `PasswordCredentialRepository`, `normalizeEmail` (Task 4), `ApiException` (Task 4)
- Produces: `SessionUser(userId: UUID, email: String, nickname: String) : Principal, Serializable` (`com.tripnote.auth`, 공개 API). `getName()`은 `userId.toString()`이다. 다른 모듈의 컨트롤러는 `@AuthenticationPrincipal user: SessionUser?`로 현재 사용자를 받는다.
- Produces: `SessionSignIn.signIn(user: SessionUser, request, response)` — 세션을 만들고 보안 컨텍스트를 저장한다. Task 7의 구글 로그인도 이것을 쓴다.
- Produces: `RateLimiter.check(name: String, subject: String, limit: Int, window: Duration)` (`com.tripnote.common`) — 초과하면 `ApiException(429)`
- Produces: HTTP `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/me`
- Produces (test): `IntegrationTest.createVerifiedUser(email, password, nickname): UUID`, `login(email, password): Cookie`

- [ ] **Step 1: 의존성과 세션 설정**

`build.gradle.kts`의 `dependencies`에 추가:

```kotlin
    implementation("org.springframework.boot:spring-boot-starter-session-data-redis")
```

좌표를 못 찾으면 `org.springframework.session:spring-session-data-redis`로 바꾼다.

`application.yml`의 `spring:` 아래에 추가:

```yaml
  session:
    timeout: 30d
    redis:
      namespace: tripnote:session
      repository-type: indexed
```

`repository-type: indexed`는 사용자별 세션 목록을 찾을 수 있게 한다. 비밀번호 재설정과 탈퇴 때 그 사용자의 세션을 모두 끊는 데 쓴다.

- [ ] **Step 2: 실패하는 테스트 작성**

`IntegrationTest.kt`에 필드와 헬퍼를 추가하고 `cleanDatabase()`에 Valkey 비우기를 넣는다:

```kotlin
import jakarta.servlet.http.Cookie
import java.util.UUID
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.security.crypto.password.PasswordEncoder

    @Autowired lateinit var redis: StringRedisTemplate
    @Autowired lateinit var passwordEncoder: PasswordEncoder

    // cleanDatabase() 맨 끝에 추가
    //     redis.execute { it.serverCommands().flushAll(); null }

    fun createVerifiedUser(email: String, password: String = "trip-note-2027", nickname: String = "미나"): UUID {
        val id = jdbc.sql("INSERT INTO users (email, nickname, email_verified_at) VALUES (?, ?, now()) RETURNING id")
            .params(email, nickname).query(UUID::class.java).single()
        jdbc.sql("INSERT INTO user_identities (user_id, provider, provider_subject) VALUES (?, 'password', ?)")
            .params(id, id.toString()).update()
        jdbc.sql("INSERT INTO password_credentials (user_id, password_hash) VALUES (?, ?)")
            .params(id, passwordEncoder.encode(password)).update()
        return id
    }

    fun login(email: String, password: String = "trip-note-2027"): Cookie =
        postJson("/api/v1/auth/login", """{"email":"$email","password":"$password"}""")
            .andExpect { status { isOk() } }
            .andReturn().response.getCookie("__Host-SESSION")!!
```

`apps/api/src/test/kotlin/com/tripnote/auth/LoginTest.kt`:

```kotlin
package com.tripnote.auth

import com.tripnote.IntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

class LoginTest : IntegrationTest() {
    private fun loginAttempt(email: String, password: String) =
        postJson("/api/v1/auth/login", """{"email":"$email","password":"$password"}""")

    @Test
    fun `a verified user gets a host-only secure session cookie`() {
        createVerifiedUser("mina@example.com")

        val cookie = login("MINA@example.com")

        assertThat(cookie.secure).isTrue()
        assertThat(cookie.isHttpOnly).isTrue()
        assertThat(cookie.path).isEqualTo("/")
        mvc.get("/api/v1/me") { cookie(cookie) }.andExpect {
            status { isOk() }
            jsonPath("$.email") { value("mina@example.com") }
            jsonPath("$.nickname") { value("미나") }
        }
    }

    @Test
    fun `wrong password and unknown email look the same`() {
        createVerifiedUser("mina@example.com")
        val message = "이메일 또는 비밀번호를 확인해 주세요."

        loginAttempt("mina@example.com", "wrong-password-1").andExpect {
            status { isUnauthorized() }
            jsonPath("$.detail") { value(message) }
        }
        loginAttempt("nobody@example.com", "wrong-password-1").andExpect {
            status { isUnauthorized() }
            jsonPath("$.detail") { value(message) }
        }
    }

    @Test
    fun `an unverified user is asked to verify first`() {
        signup("mina@example.com")
        awaitMail("mina@example.com")

        loginAttempt("mina@example.com", "trip-note-2027").andExpect {
            status { isForbidden() }
            jsonPath("$.detail") { value("이메일 인증을 먼저 마쳐 주세요. 메일이 없다면 인증 메일을 다시 요청해 주세요.") }
        }
    }

    @Test
    fun `too many attempts for one email are throttled`() {
        createVerifiedUser("mina@example.com")
        repeat(10) { loginAttempt("mina@example.com", "wrong-password-1") }

        loginAttempt("mina@example.com", "trip-note-2027").andExpect {
            status { isTooManyRequests() }
            header { exists("Retry-After") }
            jsonPath("$.detail") { value("요청이 너무 많아요. 잠시 후 다시 시도해 주세요.") }
        }
    }

    @Test
    fun `logout ends the session`() {
        createVerifiedUser("mina@example.com")
        val cookie = login("mina@example.com")

        mvc.post("/api/v1/auth/logout") { cookie(cookie); with(csrf()) }.andExpect { status { isNoContent() } }

        mvc.get("/api/v1/me") { cookie(cookie) }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `me without a session is unauthorized`() {
        mvc.get("/api/v1/me").andExpect { status { isUnauthorized() } }
    }
}
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.auth.LoginTest`
Expected: FAIL — 로그인 요청이 404 또는 401(엔드포인트 없음)

- [ ] **Step 4: 공개 타입과 레이트리밋 구현**

`apps/api/src/main/kotlin/com/tripnote/auth/SessionUser.kt`:

```kotlin
package com.tripnote.auth

import java.io.Serializable
import java.security.Principal
import java.util.UUID

/** 로그인한 사용자. 세션에 저장되며 다른 모듈은 이 타입으로 현재 사용자를 받는다. */
data class SessionUser(val userId: UUID, val email: String, val nickname: String) : Principal, Serializable {
    override fun getName(): String = userId.toString()
}
```

`apps/api/src/main/kotlin/com/tripnote/common/RateLimiter.kt`:

```kotlin
package com.tripnote.common

import java.time.Clock
import java.time.Duration
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component

/** 고정 창 카운터. 주체(이메일, IP)는 해시해서 키에 넣는다. */
@Component
class RateLimiter(private val redis: StringRedisTemplate, private val clock: Clock) {
    fun check(name: String, subject: String, limit: Int, window: Duration) {
        val bucket = clock.millis() / window.toMillis()
        val key = "tripnote:rl:$name:${sha256Hex(subject).take(16)}:$bucket"
        val count = redis.opsForValue().increment(key) ?: 0
        if (count == 1L) redis.expire(key, window)
        if (count > limit) {
            throw ApiException(HttpStatus.TOO_MANY_REQUESTS, "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", retryAfter = window)
        }
    }
}
```

- [ ] **Step 5: 세션과 로그인 구현**

`apps/api/src/main/kotlin/com/tripnote/auth/internal/SessionConfig.kt`:

```kotlin
package com.tripnote.auth.internal

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.session.web.http.CookieSerializer
import org.springframework.session.web.http.DefaultCookieSerializer

@Configuration(proxyBeanMethods = false)
class SessionConfig {
    @Bean
    fun cookieSerializer(): CookieSerializer = DefaultCookieSerializer().apply {
        setCookieName("__Host-SESSION")
        setUseSecureCookie(true)
        setUseHttpOnlyCookie(true)
        setCookiePath("/")
        setSameSite("Lax")
    }

    @Bean
    fun securityContextRepository(): SecurityContextRepository = HttpSessionSecurityContextRepository()
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/SessionSignIn.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.stereotype.Component

@Component
class SessionSignIn(private val contextRepository: SecurityContextRepository) {
    fun signIn(user: SessionUser, request: HttpServletRequest, response: HttpServletResponse) {
        request.getSession(true)
        request.changeSessionId()
        val authentication = UsernamePasswordAuthenticationToken.authenticated(user, null, listOf(SimpleGrantedAuthority("ROLE_USER")))
        val context = SecurityContextHolder.createEmptyContext().apply { this.authentication = authentication }
        SecurityContextHolder.setContext(context)
        contextRepository.saveContext(context, request, response)
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/PasswordLoginService.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import com.tripnote.common.ApiException
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class PasswordLoginService(
    private val users: UserRepository,
    private val credentials: PasswordCredentialRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    // 없는 이메일에도 같은 시간을 쓰도록 비교할 더미 해시
    private val dummyHash = passwordEncoder.encode("tripnote-dummy-password")!!

    @Transactional(readOnly = true)
    fun authenticate(rawEmail: String, password: String): SessionUser {
        val user = users.findByEmailIgnoreCase(normalizeEmail(rawEmail))
        val hash = user?.let { credentials.findById(it.id).orElse(null)?.passwordHash }
        val matches = passwordEncoder.matches(password, hash ?: dummyHash)
        if (user == null || hash == null || !matches || user.status != "active") {
            throw ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요.")
        }
        if (user.emailVerifiedAt == null) {
            throw ApiException(HttpStatus.FORBIDDEN, "이메일 인증을 먼저 마쳐 주세요. 메일이 없다면 인증 메일을 다시 요청해 주세요.")
        }
        return SessionUser(user.id, user.email, user.nickname)
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/SessionController.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import com.tripnote.common.RateLimiter
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import java.time.Duration
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

data class LoginRequest(@field:NotBlank val email: String, @field:NotBlank val password: String)
data class MeResponse(val id: String, val email: String, val nickname: String)

fun SessionUser.toMe() = MeResponse(userId.toString(), email, nickname)

@RestController
class SessionController(
    private val loginService: PasswordLoginService,
    private val signIn: SessionSignIn,
    private val rateLimiter: RateLimiter,
) {
    @PostMapping("/api/v1/auth/login")
    fun login(@Valid @RequestBody body: LoginRequest, request: HttpServletRequest, response: HttpServletResponse): MeResponse {
        rateLimiter.check("login-ip", request.remoteAddr, limit = 50, window = Duration.ofMinutes(15))
        rateLimiter.check("login-email", normalizeEmail(body.email), limit = 10, window = Duration.ofMinutes(15))
        val user = loginService.authenticate(body.email, body.password)
        signIn.signIn(user, request, response)
        return user.toMe()
    }

    @GetMapping("/api/v1/me")
    fun me(@AuthenticationPrincipal user: SessionUser): MeResponse = user.toMe()
}
```

`SecurityConfig.kt`의 `securityFilterChain`을 다음으로 바꾼다:

```kotlin
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler
import org.springframework.security.web.context.SecurityContextRepository

    @Bean
    fun securityFilterChain(http: HttpSecurity, contextRepository: SecurityContextRepository): SecurityFilterChain = http
        .csrf { it.spa() }
        .securityContext { it.securityContextRepository(contextRepository) }
        .authorizeHttpRequests {
            it.requestMatchers("/actuator/health/**").permitAll()
                .requestMatchers("/api/v1/auth/logout").authenticated()
                .requestMatchers("/api/v1/auth/**").permitAll()
                .anyRequest().authenticated()
        }
        .logout {
            it.logoutUrl("/api/v1/auth/logout")
                .logoutSuccessHandler(HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
        }
        .exceptionHandling { it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)) }
        .build()
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.auth.LoginTest --tests com.tripnote.auth.EmailSignupTest --tests com.tripnote.ModularityTest`
Expected: PASS (14 tests)

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): add password login with Valkey sessions, logout, and rate limits"
```

---

### Task 6: 비밀번호 재설정

**Files:**
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SessionRevoker.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/PasswordResetService.kt`
- Modify: `apps/api/src/main/kotlin/com/tripnote/auth/internal/EmailAuthController.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/auth/PasswordResetTest.kt`

**Interfaces:**
- Consumes: `EmailTokenService`, `TokenPurpose.RESET`, `PasswordPolicy`, `PasswordResetMailRequested`, `SocialOnlyAccountMailRequested` (Task 4), `RateLimiter` (Task 5)
- Produces: `SessionRevoker.revokeAll(userId: UUID)` — 그 사용자의 세션을 모두 지운다. Task 11의 탈퇴도 쓴다.
- Produces: HTTP `POST /api/v1/auth/password-reset`, `POST /api/v1/auth/password-reset/confirm`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/auth/PasswordResetTest.kt`:

```kotlin
package com.tripnote.auth

import com.tripnote.IntegrationTest
import java.time.Duration
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.get

class PasswordResetTest : IntegrationTest() {
    private fun requestReset(email: String) =
        postJson("/api/v1/auth/password-reset", """{"email":"$email"}""")

    private fun confirm(token: String, password: String) =
        postJson("/api/v1/auth/password-reset/confirm", """{"token":"$token","password":"$password"}""")

    @Test
    fun `reset replaces the password and ends existing sessions`() {
        createVerifiedUser("mina@example.com")
        val oldSession = login("mina@example.com")

        requestReset("Mina@Example.com").andExpect { status { isAccepted() } }
        val token = tokenIn(awaitMail("mina@example.com"))
        confirm(token, "new-trip-note-2027").andExpect { status { isOk() } }

        mvc.get("/api/v1/me") { cookie(oldSession) }.andExpect { status { isUnauthorized() } }
        postJson("/api/v1/auth/login", """{"email":"mina@example.com","password":"trip-note-2027"}""")
            .andExpect { status { isUnauthorized() } }
        login("mina@example.com", "new-trip-note-2027")
    }

    @Test
    fun `a reset link works once and expires after 30 minutes`() {
        createVerifiedUser("mina@example.com")
        requestReset("mina@example.com")
        val first = tokenIn(awaitMail("mina@example.com"))
        confirm(first, "new-trip-note-2027").andExpect { status { isOk() } }
        confirm(first, "another-trip-note").andExpect { status { isBadRequest() } }

        mail.sent.clear()
        requestReset("mina@example.com")
        val second = tokenIn(awaitMail("mina@example.com"))
        clock.advance(Duration.ofMinutes(31))
        confirm(second, "another-trip-note").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `unknown emails get the same answer and no mail`() {
        requestReset("nobody@example.com").andExpect {
            status { isAccepted() }
            jsonPath("$.message") { value("가입된 이메일이면 재설정 메일을 보냈어요.") }
        }
        Thread.sleep(500)
        assertThat(mail.sent).isEmpty()
    }

    @Test
    fun `a google-only account is told to use google`() {
        val id = jdbc.sql("INSERT INTO users (email, nickname, email_verified_at) VALUES ('g@example.com', '구글', now()) RETURNING id")
            .query(java.util.UUID::class.java).single()
        jdbc.sql("INSERT INTO user_identities (user_id, provider, provider_subject) VALUES (?, 'google', 'google-sub-1')").param(id).update()

        requestReset("g@example.com").andExpect { status { isAccepted() } }

        assertThat(awaitMail("g@example.com").text).contains("구글로 계속하기")
    }

    @Test
    fun `a weak new password is rejected and the token stays usable`() {
        createVerifiedUser("mina@example.com")
        requestReset("mina@example.com")
        val token = tokenIn(awaitMail("mina@example.com"))

        confirm(token, "short").andExpect { status { isBadRequest() } }
        confirm(token, "new-trip-note-2027").andExpect { status { isOk() } }
    }
}
```

마지막 테스트가 요구하는 동작: 비밀번호 정책 검사를 토큰 소비보다 먼저 한다. 약한 비밀번호 때문에 링크를 버리게 하지 않는다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.auth.PasswordResetTest`
Expected: FAIL — `/api/v1/auth/password-reset`이 404

- [ ] **Step 3: 구현**

`apps/api/src/main/kotlin/com/tripnote/auth/internal/SessionRevoker.kt`:

```kotlin
package com.tripnote.auth.internal

import java.util.UUID
import org.springframework.session.FindByIndexNameSessionRepository
import org.springframework.session.Session
import org.springframework.stereotype.Component

@Component
class SessionRevoker(private val sessions: FindByIndexNameSessionRepository<out Session>) {
    fun revokeAll(userId: UUID) {
        sessions.findByPrincipalName(userId.toString()).keys.forEach(sessions::deleteById)
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/PasswordResetService.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.common.ApiException
import java.time.Clock
import org.springframework.context.ApplicationEventPublisher
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class PasswordResetService(
    private val users: UserRepository,
    private val identities: UserIdentityRepository,
    private val credentials: PasswordCredentialRepository,
    private val tokens: EmailTokenService,
    private val passwordPolicy: PasswordPolicy,
    private val passwordEncoder: PasswordEncoder,
    private val sessionRevoker: SessionRevoker,
    private val events: ApplicationEventPublisher,
    private val clock: Clock,
) {
    @Transactional
    fun request(rawEmail: String) {
        val user = users.findByEmailIgnoreCase(normalizeEmail(rawEmail)) ?: return
        if (user.status != "active") return
        val providers = identities.findByUserId(user.id).map { it.provider }
        if ("password" !in providers && providers.isNotEmpty()) {
            events.publishEvent(SocialOnlyAccountMailRequested(user.email, providers.first()))
            return
        }
        events.publishEvent(PasswordResetMailRequested(user.email, tokens.issue(user.id, TokenPurpose.RESET)))
    }

    @Transactional
    fun confirm(token: String, newPassword: String) {
        passwordPolicy.check(newPassword)
        val userId = tokens.consume(token, TokenPurpose.RESET)
            ?: throw ApiException(HttpStatus.BAD_REQUEST, "링크가 만료됐거나 이미 사용됐어요. 새 링크를 요청해 주세요.")
        val hash = passwordEncoder.encode(newPassword)!!
        val credential = credentials.findById(userId).orElse(null)
        if (credential == null) {
            credentials.save(PasswordCredentialEntity(userId = userId, passwordHash = hash))
            identities.save(UserIdentityEntity(userId = userId, provider = "password", providerSubject = userId.toString()))
        } else {
            credential.passwordHash = hash
            credential.updatedAt = clock.instant()
        }
        users.findById(userId).ifPresent { it.emailVerifiedAt = it.emailVerifiedAt ?: clock.instant() }
        sessionRevoker.revokeAll(userId)
    }
}
```

재설정 링크를 연 사람은 그 메일함의 주인이므로, 미인증 계정이면 여기서 인증된 것으로 처리한다.

`EmailAuthController.kt`에 추가(생성자에 서비스 두 개를 더한다):

```kotlin
import com.tripnote.common.RateLimiter
import jakarta.servlet.http.HttpServletRequest
import java.time.Duration

data class ResetConfirmRequest(@field:NotBlank val token: String, @field:NotBlank val password: String)

@RestController
@RequestMapping("/api/v1/auth")
class EmailAuthController(
    private val signupService: SignupService,
    private val resetService: PasswordResetService,
    private val rateLimiter: RateLimiter,
) {
    // signup, verify, resend는 그대로 두고 아래 두 메서드를 추가한다

    @PostMapping("/password-reset")
    @ResponseStatus(HttpStatus.ACCEPTED)
    fun requestReset(@Valid @RequestBody body: EmailRequest, request: HttpServletRequest): MessageResponse {
        rateLimiter.check("reset-ip", request.remoteAddr, limit = 20, window = Duration.ofHours(1))
        rateLimiter.check("reset-email", normalizeEmail(body.email), limit = 5, window = Duration.ofHours(1))
        resetService.request(body.email)
        return MessageResponse("가입된 이메일이면 재설정 메일을 보냈어요.")
    }

    @PostMapping("/password-reset/confirm")
    fun confirmReset(@Valid @RequestBody body: ResetConfirmRequest): MessageResponse {
        resetService.confirm(body.token, body.password)
        return MessageResponse("비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.")
    }
}
```

`signup` 메서드에도 가입 남용 방지를 넣는다. `signup(...)` 시그니처에 `request: HttpServletRequest`를 추가하고 첫 줄에:

```kotlin
        rateLimiter.check("signup-ip", request.remoteAddr, limit = 10, window = Duration.ofHours(1))
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests "com.tripnote.auth.*"`
Expected: PASS (18 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): add password reset that revokes existing sessions"
```

---

### Task 7: 구글 로그인과 계정 연결

**Files:**
- Modify: `apps/api/build.gradle.kts`
- Modify: `apps/api/src/main/resources/application.yml`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/IdentityService.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/GoogleOidcUserService.kt`
- Modify: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SecurityConfig.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/auth/GoogleLoginTest.kt`
- Modify: `docs/adr/0009-login-identities.md`

**Interfaces:**
- Consumes: `UserRepository`, `UserIdentityRepository` (Task 4), `SessionSignIn` (Task 5), `TripnoteProperties` (Task 1)
- Produces: `ExternalProfile(provider: String, subject: String, email: String?, emailVerified: Boolean, name: String?, picture: String?)`, `IdentityService.resolveExternal(profile: ExternalProfile): SessionUser` — 이후 카카오·네이버도 이 함수로 붙인다.
- Produces: HTTP `GET /oauth2/authorization/google` (구글로 이동), `GET /login/oauth2/code/google` (콜백). 성공하면 `${webBaseUrl}/`, 실패하면 `${webBaseUrl}/login?error=google`로 리다이렉트한다.

ADR 0009는 "미인증 이메일 계정과 자동 연결하지 않고 구글 쪽을 새 계정으로 만든 뒤 7일 뒤 정리"라고 적었지만, `users.email`이 유일해서 같은 이메일로 두 계정을 만들 수 없다. 그래서 구글이 이메일 소유를 확인해 주면 미인증 계정을 지우고 구글 계정을 만든다. 미인증 계정은 소유를 증명한 적이 없으므로 잃는 데이터가 없다. Step 5에서 ADR을 이 규칙으로 고친다.

- [ ] **Step 1: 의존성과 등록 정보**

`build.gradle.kts`의 `dependencies`에 추가:

```kotlin
    implementation("org.springframework.boot:spring-boot-starter-oauth2-client")
```

`application.yml`의 `spring:` 아래에 추가:

```yaml
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID:local-google-client-id}
            client-secret: ${GOOGLE_CLIENT_SECRET:local-google-client-secret}
            scope: [openid, email, profile]
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/auth/GoogleLoginTest.kt`:

```kotlin
package com.tripnote.auth

import com.tripnote.IntegrationTest
import com.tripnote.auth.internal.ExternalProfile
import com.tripnote.auth.internal.IdentityService
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.test.web.servlet.get

class GoogleLoginTest : IntegrationTest() {
    @Autowired lateinit var identities: IdentityService

    private fun google(subject: String = "google-sub-1", email: String? = "Mina@Example.com", verified: Boolean = true) =
        ExternalProfile(provider = "google", subject = subject, email = email, emailVerified = verified, name = "미나", picture = "https://lh3.googleusercontent.com/a/photo")

    private fun count(sql: String) = jdbc.sql(sql).query(Int::class.java).single()

    @Test
    fun `the authorization endpoint redirects to google`() {
        mvc.get("/oauth2/authorization/google").andExpect {
            status { is3xxRedirection() }
            header { string("Location", org.hamcrest.Matchers.startsWith("https://accounts.google.com/o/oauth2/v2/auth")) }
        }
    }

    @Test
    fun `a first google login creates a verified user`() {
        val user = identities.resolveExternal(google())

        assertThat(user.email).isEqualTo("mina@example.com")
        assertThat(count("SELECT count(*) FROM users WHERE email_verified_at IS NOT NULL AND avatar_url IS NOT NULL")).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM user_identities WHERE provider = 'google' AND provider_subject = 'google-sub-1'")).isEqualTo(1)
    }

    @Test
    fun `the same google subject returns the same user`() {
        val first = identities.resolveExternal(google())
        val second = identities.resolveExternal(google(email = "changed@example.com"))

        assertThat(second.userId).isEqualTo(first.userId)
    }

    @Test
    fun `google links to an existing verified email account`() {
        val existing = createVerifiedUser("mina@example.com")

        val user = identities.resolveExternal(google())

        assertThat(user.userId).isEqualTo(existing)
        assertThat(count("SELECT count(*) FROM user_identities WHERE user_id = '$existing'")).isEqualTo(2)
    }

    @Test
    fun `google replaces an unverified email account instead of linking to it`() {
        signup("mina@example.com")
        val squatter = jdbc.sql("SELECT id FROM users WHERE email = 'mina@example.com'").query(UUID::class.java).single()

        val user = identities.resolveExternal(google())

        assertThat(user.userId).isNotEqualTo(squatter)
        assertThat(count("SELECT count(*) FROM users")).isEqualTo(1)
        assertThat(count("SELECT count(*) FROM password_credentials")).isZero()
    }

    @Test
    fun `a google account without a verified email is refused`() {
        assertThatThrownBy { identities.resolveExternal(google(verified = false)) }
            .isInstanceOf(OAuth2AuthenticationException::class.java)
        assertThat(count("SELECT count(*) FROM users")).isZero()
    }
}
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.auth.GoogleLoginTest`
Expected: FAIL — `Unresolved reference: IdentityService`

- [ ] **Step 4: 구현**

`apps/api/src/main/kotlin/com/tripnote/auth/internal/IdentityService.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import java.time.Clock
import org.springframework.security.oauth2.core.OAuth2AuthenticationException
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

data class ExternalProfile(
    val provider: String,
    val subject: String,
    val email: String?,
    val emailVerified: Boolean,
    val name: String?,
    val picture: String?,
)

@Service
class IdentityService(
    private val users: UserRepository,
    private val identities: UserIdentityRepository,
    private val clock: Clock,
) {
    @Transactional
    fun resolveExternal(profile: ExternalProfile): SessionUser {
        identities.findByProviderAndProviderSubject(profile.provider, profile.subject)?.let { identity ->
            return users.findById(identity.userId).orElseThrow().toSession()
        }

        val email = profile.email?.let(::normalizeEmail)
        if (email == null || !profile.emailVerified) {
            throw OAuth2AuthenticationException(OAuth2Error("email_not_verified", "이메일 인증이 된 구글 계정으로 로그인해 주세요.", null))
        }

        val existing = users.findByEmailIgnoreCase(email)
        if (existing != null && existing.emailVerifiedAt != null) {
            identities.save(UserIdentityEntity(userId = existing.id, provider = profile.provider, providerSubject = profile.subject))
            return existing.toSession()
        }
        if (existing != null) {
            // 소유를 증명하지 않은 미인증 계정은 연결하지 않고 지운다. 연결하면 남의 이메일로 먼저 가입한 사람이 계정을 가로챌 수 있다.
            users.delete(existing)
            users.flush()
        }

        val user = users.saveAndFlush(
            UserEntity(
                email = email,
                nickname = (profile.name ?: email.substringBefore('@')).take(30),
                emailVerifiedAt = clock.instant(),
                avatarUrl = profile.picture,
            ),
        )
        identities.save(UserIdentityEntity(userId = user.id, provider = profile.provider, providerSubject = profile.subject))
        return user.toSession()
    }

    private fun UserEntity.toSession() = SessionUser(id, email, nickname)
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/GoogleOidcUserService.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.auth.SessionUser
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.stereotype.Component

class TripnoteOidcUser(delegate: OidcUser, val sessionUser: SessionUser) :
    DefaultOidcUser(delegate.authorities, delegate.idToken, delegate.userInfo, "sub")

@Component
class GoogleOidcUserService(private val identityService: IdentityService) : OAuth2UserService<OidcUserRequest, OidcUser> {
    private val delegate = OidcUserService()

    override fun loadUser(request: OidcUserRequest): OidcUser {
        val oidc = delegate.loadUser(request)
        val sessionUser = identityService.resolveExternal(
            ExternalProfile(
                provider = request.clientRegistration.registrationId,
                subject = oidc.subject,
                email = oidc.email,
                emailVerified = oidc.emailVerified == true,
                name = oidc.fullName,
                picture = oidc.picture,
            ),
        )
        return TripnoteOidcUser(oidc, sessionUser)
    }
}
```

`SecurityConfig.kt`의 `securityFilterChain`에 인자와 `oauth2Login`을 추가한다(`logout` 앞에 넣는다):

```kotlin
import com.tripnote.common.TripnoteProperties
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        contextRepository: SecurityContextRepository,
        oidcUserService: GoogleOidcUserService,
        signIn: SessionSignIn,
        props: TripnoteProperties,
    ): SecurityFilterChain = http
        // csrf, securityContext, authorizeHttpRequests는 Task 5와 같다
        .oauth2Login {
            it.userInfoEndpoint { endpoint -> endpoint.oidcUserService(oidcUserService) }
                .authorizedClientRepository(HttpSessionOAuth2AuthorizedClientRepository())
                .successHandler { request, response, authentication ->
                    signIn.signIn((authentication.principal as TripnoteOidcUser).sessionUser, request, response)
                    response.sendRedirect("${props.webBaseUrl}/")
                }
                .failureHandler { _, response, _ -> response.sendRedirect("${props.webBaseUrl}/login?error=google") }
        }
        // logout, exceptionHandling은 Task 5와 같다
        .build()
```

`oauth2Login`은 `/oauth2/authorization/**`와 `/login/oauth2/code/**`를 스스로 허용한다. 성공 핸들러가 보안 컨텍스트를 `SessionUser` 인증으로 바꾸므로, 이후 요청에서 `@AuthenticationPrincipal SessionUser`가 구글 로그인 사용자에게도 같은 타입으로 들어온다.

- [ ] **Step 5: ADR 0009 고치기**

`docs/adr/0009-login-identities.md`의 "계정 연결" 둘째 항목을 다음으로 바꾼다:

```markdown
- 기존 계정이 미인증이면 연결하지 않는다. 구글이 이메일 소유를 확인해 주었으므로 미인증 계정을 지우고 구글 계정을 새로 만든다. `users.email`이 유일해서 두 계정을 함께 둘 수 없고, 미인증 계정은 소유를 증명한 적이 없어 잃는 데이터가 없다.
```

같은 문서의 "고려한 대안" 표에 한 줄 추가:

```markdown
| 미인증 계정을 두고 구글 계정을 따로 만든 뒤 7일 뒤 정리 | 이메일 유일 제약 때문에 같은 이메일로 두 계정을 둘 수 없다. |
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests "com.tripnote.auth.*" --tests com.tripnote.ModularityTest`
Expected: PASS (25 tests)

- [ ] **Step 7: Commit**

```bash
git add apps/api docs/adr/0009-login-identities.md
git commit -m "feat(api): add Google login with safe account linking"
```

---

### Task 8: 샘플 여행 적재

**Files:**
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/SystemUsers.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SystemUsersImpl.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/FractionalIndex.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/SampleTripSeeder.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/trip/FractionalIndexTest.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/trip/SampleTripSeederTest.kt`

**Interfaces:**
- Consumes: jOOQ `TRIPS`, `TRIP_DAYS`, `STOPS`, `PLACES`, `TRIP_MEMBERS` (Task 3), `TripnoteProperties.samplesDir`, `systemUserEmail`, `seedSamples` (Task 1), `sample/*.json` (1번 계획)
- Produces: `SystemUsers.ensure(email: String, nickname: String): UUID` (`com.tripnote.auth`, 공개 API)
- Produces: `FractionalIndex.between(before: String?, after: String?): String` (`com.tripnote.trip.internal`). Task 10의 스톱 추가와 순서 변경이 쓴다.
- Produces: `SampleTripSeeder.seed(file: Path): SeedResult`, `seedAll(): List<SeedResult>`, `SeedResult(slug: String, tripId: UUID, days: Int, stops: Int, places: Int)`
- Produces: `trips.content` jsonb에 담기는 키: `coverPhoto`, `gallery`, `travelers`, `flights`, `route`, `linkGroups`, `checklistGroups`, `sections`, `provenance`. 스톱의 샘플 id는 `stops.key`가 된다.

- [ ] **Step 1: 순서 키 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/trip/FractionalIndexTest.kt`:

```kotlin
package com.tripnote.trip

import com.tripnote.trip.internal.FractionalIndex
import kotlin.random.Random
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class FractionalIndexTest {
    @Test
    fun `appending produces increasing keys`() {
        var previous: String? = null
        val keys = (1..200).map { FractionalIndex.between(previous, null).also { key -> previous = key } }
        assertThat(keys).isSorted()
        assertThat(keys).doesNotHaveDuplicates()
    }

    @Test
    fun `a key fits between two neighbours`() {
        assertThat(FractionalIndex.between("A", "B")).isGreaterThan("A").isLessThan("B")
        assertThat(FractionalIndex.between(null, "1")).isLessThan("1")
        assertThat(FractionalIndex.between("AZ", "B0")).isGreaterThan("AZ").isLessThan("B0")
    }

    @Test
    fun `random inserts keep a total order`() {
        val random = Random(42)
        val keys = mutableListOf(FractionalIndex.between(null, null))
        repeat(2_000) {
            val index = random.nextInt(keys.size + 1)
            val key = FractionalIndex.between(keys.getOrNull(index - 1), keys.getOrNull(index))
            keys.add(index, key)
        }
        assertThat(keys).isSorted()
        assertThat(keys).doesNotHaveDuplicates()
        assertThat(keys).allSatisfy { assertThat(it).doesNotEndWith("0") }
    }

    @Test
    fun `wrong order is rejected`() {
        assertThatThrownBy { FractionalIndex.between("B", "A") }.isInstanceOf(IllegalArgumentException::class.java)
    }
}
```

`isSorted()`는 `String`의 자연 순서(UTF-16 코드 단위)로 비교한다. 키 문자가 ASCII뿐이라 PostgreSQL `COLLATE "C"` 순서와 같다.

- [ ] **Step 2: 실패 확인 후 구현**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.trip.FractionalIndexTest`
Expected: FAIL — `Unresolved reference: FractionalIndex`

`apps/api/src/main/kotlin/com/tripnote/trip/internal/FractionalIndex.kt`:

```kotlin
package com.tripnote.trip.internal

/**
 * 두 키 사이에 들어갈 문자열 키를 만든다. 문자는 base-62이고 비교는 바이트 순서다(DB 컬럼은 COLLATE "C").
 * 마지막 문자는 항상 가장 작은 숫자 '0'보다 크다. 그래서 어떤 키 앞에도 새 키가 들어갈 자리가 남는다.
 */
object FractionalIndex {
    private const val DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

    fun between(before: String?, after: String?): String {
        require(before == null || after == null || before < after) { "before must sort before after: $before, $after" }
        require(before?.endsWith('0') != true && after?.endsWith('0') != true) { "keys must not end with '0'" }
        val low = before ?: ""
        val result = StringBuilder()
        var index = 0
        while (true) {
            val lowDigit = if (index < low.length) DIGITS.indexOf(low[index]) else 0
            val highDigit = if (after != null && index < after.length) DIGITS.indexOf(after[index]) else DIGITS.length
            if (highDigit - lowDigit > 1) {
                result.append(DIGITS[(lowDigit + highDigit) / 2])
                return result.toString()
            }
            result.append(DIGITS[lowDigit])
            index++
        }
    }
}
```

Run: `cd apps/api && ./gradlew test --tests com.tripnote.trip.FractionalIndexTest`
Expected: PASS (4 tests)

- [ ] **Step 3: 적재 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/trip/SampleTripSeederTest.kt`:

```kotlin
package com.tripnote.trip

import com.tripnote.IntegrationTest
import com.tripnote.trip.internal.SampleTripSeeder
import java.nio.file.Files
import java.nio.file.Path
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired

class SampleTripSeederTest : IntegrationTest() {
    @Autowired lateinit var seeder: SampleTripSeeder

    private fun one(sql: String) = jdbc.sql(sql).query(Int::class.java).single()

    @Test
    fun `seeds both samples with their visibility rules`() {
        val results = seeder.seedAll().associateBy { it.slug }

        assertThat(results.keys).containsExactlyInAnyOrder("osaka-kyoto-family-2026", "danang-hoian-family-2027")
        assertThat(results.getValue("osaka-kyoto-family-2026")).extracting("days", "stops").containsExactly(4, 50)
        assertThat(one("SELECT count(*) FROM trips WHERE slug = 'osaka-kyoto-family-2026' AND visibility = 'link' AND NOT is_sample")).isEqualTo(1)
        assertThat(one("SELECT count(*) FROM trips WHERE slug = 'danang-hoian-family-2027' AND visibility = 'public' AND is_sample")).isEqualTo(1)
        assertThat(one("SELECT count(*) FROM trip_members m JOIN users u ON u.id = m.user_id WHERE u.status = 'system' AND m.role = 'owner'")).isEqualTo(2)
    }

    @Test
    fun `keeps stop order, keys, coordinates and guides`() {
        seeder.seedAll()

        val firstKeys = jdbc.sql(
            """
            SELECT s.key FROM stops s JOIN trip_days d ON d.id = s.day_id JOIN trips t ON t.id = s.trip_id
            WHERE t.slug = 'osaka-kyoto-family-2026' AND d.number = 1 ORDER BY s.position LIMIT 3
            """.trimIndent(),
        ).query(String::class.java).list()
        assertThat(firstKeys).containsExactly("d1-gmp", "d1-flight", "d1-kix")
        assertThat(one("SELECT count(*) FROM stops WHERE key = 'd1-castle' AND location IS NOT NULL AND guide->>'kind' = 'place'")).isEqualTo(1)
        // JdbcClient는 '?'를 바인드 자리로 읽으므로 jsonb의 ? 연산자 대신 jsonb_exists를 쓴다
        assertThat(one("SELECT count(*) FROM trips WHERE jsonb_exists(content, 'checklistGroups') AND jsonb_exists(content, 'sections')")).isGreaterThanOrEqualTo(1)
    }

    @Test
    fun `reseeding is idempotent and keeps the trip id`() {
        seeder.seedAll()
        val before = jdbc.sql("SELECT id FROM trips WHERE slug = 'danang-hoian-family-2027'").query(UUID::class.java).single()
        val stopsBefore = one("SELECT count(*) FROM stops")

        seeder.seedAll()

        assertThat(jdbc.sql("SELECT id FROM trips WHERE slug = 'danang-hoian-family-2027'").query(UUID::class.java).single()).isEqualTo(before)
        assertThat(one("SELECT count(*) FROM stops")).isEqualTo(stopsBefore)
        assertThat(one("SELECT count(*) FROM users WHERE status = 'system'")).isEqualTo(1)
    }

    @Test
    fun `rejects an unknown schema version without writing anything`() {
        val file = Files.createTempFile("bad-sample", ".json")
        Files.writeString(file, """{"schemaVersion":2,"slug":"bad-sample"}""")

        assertThatThrownBy { seeder.seed(file) }.hasMessageContaining("schemaVersion")
        assertThat(one("SELECT count(*) FROM trips")).isZero()
        Files.delete(file)
    }
}
```

`application.yml`의 `samples-dir` 기본값 `../../sample`은 Gradle이 `apps/api`에서 테스트를 실행할 때 저장소의 `sample/`을 가리킨다.

- [ ] **Step 4: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.trip.SampleTripSeederTest`
Expected: FAIL — `Unresolved reference: SampleTripSeeder`

- [ ] **Step 5: 시스템 사용자 구현**

`apps/api/src/main/kotlin/com/tripnote/auth/SystemUsers.kt`:

```kotlin
package com.tripnote.auth

import java.util.UUID

/** 샘플 여행처럼 사람이 아닌 소유자가 필요할 때 쓰는 운영 계정. 로그인 수단이 없어 로그인할 수 없다. */
interface SystemUsers {
    fun ensure(email: String, nickname: String): UUID
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/SystemUsersImpl.kt`:

```kotlin
package com.tripnote.auth.internal

import com.tripnote.auth.SystemUsers
import java.time.Clock
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class SystemUsersImpl(private val users: UserRepository, private val clock: Clock) : SystemUsers {
    @Transactional
    override fun ensure(email: String, nickname: String): UUID {
        val normalized = normalizeEmail(email)
        val existing = users.findByEmailIgnoreCase(normalized)
        if (existing != null) return existing.id
        return users.saveAndFlush(
            UserEntity(email = normalized, nickname = nickname, emailVerifiedAt = clock.instant(), status = "system"),
        ).id
    }
}
```

- [ ] **Step 6: 적재기 구현**

`apps/api/src/main/kotlin/com/tripnote/trip/internal/SampleTripSeeder.kt`:

```kotlin
package com.tripnote.trip.internal

import com.tripnote.auth.SystemUsers
import com.tripnote.common.TripnoteProperties
import com.tripnote.jooq.Tables.PLACES
import com.tripnote.jooq.Tables.STOPS
import com.tripnote.jooq.Tables.TRIPS
import com.tripnote.jooq.Tables.TRIP_DAYS
import com.tripnote.jooq.Tables.TRIP_MEMBERS
import java.nio.file.Files
import java.nio.file.Path
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import org.jooq.DSLContext
import org.jooq.JSONB
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper

data class SeedResult(val slug: String, val tripId: UUID, val days: Int, val stops: Int, val places: Int)

@Service
class SampleTripSeeder(
    private val dsl: DSLContext,
    private val json: JsonMapper,
    private val systemUsers: SystemUsers,
    private val props: TripnoteProperties,
) {
    private val contentFields = listOf("coverPhoto", "gallery", "travelers", "flights", "route", "linkGroups", "checklistGroups", "sections", "provenance")
    private val placeColumns = setOf("id", "kind", "name", "area")

    @Transactional
    fun seedAll(): List<SeedResult> {
        val files = Files.list(Path.of(props.samplesDir)).use { stream ->
            stream.filter { it.fileName.toString().endsWith(".json") }.sorted().toList()
        }
        return files.map(::seed)
    }

    @Transactional
    fun seed(file: Path): SeedResult {
        val root = json.readTree(file.toFile())
        val schemaVersion = root.path("schemaVersion").asInt()
        require(schemaVersion == 1) { "$file: unsupported schemaVersion $schemaVersion" }

        val owner = systemUsers.ensure(props.systemUserEmail, "여행노트")
        val slug = root.required("slug").asString()
        val tripId = upsertTrip(root, slug, owner)

        dsl.deleteFrom(STOPS).where(STOPS.TRIP_ID.eq(tripId)).execute()
        dsl.deleteFrom(TRIP_DAYS).where(TRIP_DAYS.TRIP_ID.eq(tripId)).execute()
        dsl.deleteFrom(PLACES).where(PLACES.TRIP_ID.eq(tripId)).execute()

        val places = root.path("places")
        places.forEachIndexed { index, place -> insertPlace(tripId, place, index) }

        var stopCount = 0
        val days = root.required("days")
        for (day in days) {
            val dayId = insertDay(tripId, day)
            var position: String? = null
            for (stop in day.required("stops")) {
                position = FractionalIndex.between(position, null)
                insertStop(tripId, dayId, stop, position)
                stopCount++
            }
        }

        dsl.insertInto(TRIP_MEMBERS)
            .set(TRIP_MEMBERS.TRIP_ID, tripId).set(TRIP_MEMBERS.USER_ID, owner).set(TRIP_MEMBERS.ROLE, "owner")
            .onConflictDoNothing().execute()

        return SeedResult(slug, tripId, days.size(), stopCount, places.size())
    }

    private fun upsertTrip(root: JsonNode, slug: String, owner: UUID): UUID {
        val content = json.createObjectNode()
        contentFields.forEach { field -> root.get(field)?.let { content.set(field, it) } }
        val values = mapOf(
            TRIPS.TITLE to root.required("title").asString(),
            TRIPS.SUBTITLE to root.get("subtitle")?.asString(),
            TRIPS.START_DATE to LocalDate.parse(root.required("startDate").asString()),
            TRIPS.END_DATE to LocalDate.parse(root.required("endDate").asString()),
            TRIPS.TIMEZONE to (root.get("timezone")?.asString() ?: "Asia/Seoul"),
            TRIPS.VISIBILITY to root.required("visibility").asString(),
            TRIPS.IS_SAMPLE to root.required("isSample").asBoolean(),
            TRIPS.CONTENT to JSONB.jsonb(content.toString()),
            TRIPS.OWNER_ID to owner,
        )
        val existing = dsl.select(TRIPS.ID).from(TRIPS).where(TRIPS.SLUG.eq(slug)).fetchOne(TRIPS.ID)
        if (existing != null) {
            dsl.update(TRIPS).set(values).where(TRIPS.ID.eq(existing)).execute()
            return existing
        }
        return dsl.insertInto(TRIPS).set(values).set(TRIPS.SLUG, slug).returning(TRIPS.ID).fetchOne()!!.id
    }

    private fun insertPlace(tripId: UUID, place: JsonNode, index: Int) {
        val details = json.createObjectNode()
        place.properties().forEach { (name, value) -> if (name !in placeColumns) details.set(name, value) }
        dsl.insertInto(PLACES)
            .set(PLACES.TRIP_ID, tripId)
            .set(PLACES.KEY, place.required("id").asString())
            .set(PLACES.KIND, place.required("kind").asString())
            .set(PLACES.NAME, place.required("name").asString())
            .set(PLACES.AREA, place.required("area").asString())
            .set(PLACES.DETAILS, JSONB.jsonb(details.toString()))
            .set(PLACES.POSITION, index)
            .execute()
    }

    private fun insertDay(tripId: UUID, day: JsonNode): UUID =
        dsl.insertInto(TRIP_DAYS)
            .set(TRIP_DAYS.TRIP_ID, tripId)
            .set(TRIP_DAYS.NUMBER, day.required("number").asInt())
            .set(TRIP_DAYS.DATE, LocalDate.parse(day.required("date").asString()))
            .set(TRIP_DAYS.CITY, day.required("city").asString())
            .set(TRIP_DAYS.THEME, day.required("theme").asString())
            .set(TRIP_DAYS.NOTE, day.get("note")?.asString())
            .set(TRIP_DAYS.COLOR, day.get("color")?.asString())
            .set(TRIP_DAYS.TOUR, day.jsonb("tour"))
            .returning(TRIP_DAYS.ID).fetchOne()!!.id

    private fun insertStop(tripId: UUID, dayId: UUID, stop: JsonNode, position: String) {
        val coordinates = stop.get("coordinates")
        dsl.insertInto(STOPS)
            .set(STOPS.TRIP_ID, tripId)
            .set(STOPS.DAY_ID, dayId)
            .set(STOPS.KEY, stop.required("id").asString())
            .set(STOPS.POSITION, position)
            .set(STOPS.START_TIME, LocalTime.parse(stop.required("time").asString()))
            .set(STOPS.TITLE, stop.required("title").asString())
            .set(STOPS.TYPE, stop.required("type").asString())
            .set(STOPS.DETAILS, stop.required("details").asString())
            .set(STOPS.DURATION, stop.get("duration")?.asString())
            .set(STOPS.BUFFER, stop.get("buffer")?.asString())
            .set(STOPS.TIMING, stop.get("timing")?.asString())
            .set(STOPS.TRANSPORT_ICON, stop.get("transportIcon")?.asString())
            .set(STOPS.LAT, coordinates?.get(0)?.asDouble())
            .set(STOPS.LNG, coordinates?.get(1)?.asDouble())
            .set(STOPS.APPROXIMATE, stop.get("approximate")?.asBoolean() ?: false)
            .set(STOPS.TRANSIT, stop.jsonb("transit"))
            .set(STOPS.PHOTO, stop.jsonb("photo"))
            .set(STOPS.HOTEL_PHOTO, stop.jsonb("hotelPhoto"))
            .set(STOPS.LINKS, stop.jsonb("links"))
            .set(STOPS.PLACE_KEY, stop.get("placeId")?.asString())
            .set(STOPS.GUIDE, stop.jsonb("guide"))
            .set(STOPS.OPTIONAL, stop.get("optional")?.asBoolean() ?: false)
            .execute()
    }

    private fun JsonNode.jsonb(field: String): JSONB? = get(field)?.let { JSONB.jsonb(it.toString()) }
}

@Component
@ConditionalOnProperty("tripnote.seed-samples", havingValue = "true")
class SampleSeedRunner(private val seeder: SampleTripSeeder) : ApplicationRunner {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        seeder.seedAll().forEach { log.info("seeded {} days={} stops={} places={}", it.slug, it.days, it.stops, it.places) }
    }
}
```

Jackson 3에서 문자열 값은 `asString()`이다. `JsonNode`의 반복(`for (day in days)`)이나 `properties()`가 컴파일되지 않으면 Jackson 3 API 문서에서 `values()`·`properties()` 이름을 확인해 그 부분만 고친다.

- [ ] **Step 7: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests "com.tripnote.trip.*" --tests com.tripnote.ModularityTest`
Expected: PASS (9 tests). `ModularityTest`가 `trip → auth.internal` 의존을 보고하면, `trip`이 `com.tripnote.auth.SystemUsers`(공개 API)만 import하는지 확인한다.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): seed sample trips idempotently with fractional stop order"
```

---

### Task 9: 일정 조회 API

**Files:**
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/TripDocuments.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/TripQueries.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/TripReadController.kt`
- Modify: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SecurityConfig.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/trip/TripReadTest.kt`

**Interfaces:**
- Consumes: jOOQ 테이블 (Task 3), `SessionUser` (Task 5), `SampleTripSeeder` (Task 8)
- Produces: 응답 타입 (`com.tripnote.trip`, 공개 API — 웹 앱이 OpenAPI로 이 모양을 받는다)
  - `TripDocument(id, slug, title, subtitle, startDate, endDate, timezone, visibility, isSample, sourceTripId, version, content: JsonNode, days: List<DayDocument>, places: List<PlaceDocument>, permissions: Permissions)`
  - `DayDocument(id, number, date, city, theme, note, color, tour: JsonNode?, stops: List<StopDocument>)`
  - `StopDocument(id, key, position, time: String, title, type, details, duration, buffer, timing, transportIcon, coordinates: List<Double>?, approximate, transit, photo, hotelPhoto, links, placeKey, guide, optional, version)` — jsonb 필드는 `JsonNode?`
  - `PlaceDocument(id, key, kind, name, area, details: JsonNode)`
  - `Permissions(canEdit: Boolean, canClone: Boolean)`
  - `TripSummary(slug, title, subtitle, startDate, endDate, visibility, isSample, coverPhoto: JsonNode?, cities: List<String>, stopCount: Int)`
- Produces: `TripQueries.find(slug: String, viewer: UUID?): TripDocument?` (읽을 수 없으면 null), `TripQueries.stop(stopId: UUID): StopDocument`, `TripQueries.role(tripId: UUID, userId: UUID?): String?`, `TripQueries.publicSamples(): List<TripSummary>`, `TripQueries.tripsOf(userId: UUID): List<TripSummary>`
- Produces: HTTP `GET /api/v1/trips/{slug}`, `GET /api/v1/samples`, `GET /api/v1/trips`

권한 규칙: `public`과 `link`는 누구나 읽는다. `private`은 멤버만 읽고, 아니면 404다. `canEdit`은 owner·editor 멤버이면서 샘플이 아닐 때만 참이다. `canClone`은 로그인했고 `private`이 아닐 때 참이다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/trip/TripReadTest.kt`:

```kotlin
package com.tripnote.trip

import com.tripnote.IntegrationTest
import com.tripnote.trip.internal.SampleTripSeeder
import java.util.UUID
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.get

class TripReadTest : IntegrationTest() {
    @Autowired lateinit var seeder: SampleTripSeeder

    @BeforeEach
    fun seed() { seeder.seedAll() }

    private fun privateTripOf(owner: UUID, slug: String = "private-trip"): UUID {
        val tripId = jdbc.sql("INSERT INTO trips (slug, owner_id, title, start_date, end_date) VALUES (?, ?, '비밀 여행', '2027-01-01', '2027-01-02') RETURNING id")
            .params(slug, owner).query(UUID::class.java).single()
        jdbc.sql("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'owner')").params(tripId, owner).update()
        return tripId
    }

    @Test
    fun `anyone can read the public sample in order`() {
        mvc.get("/api/v1/trips/danang-hoian-family-2027").andExpect {
            status { isOk() }
            jsonPath("$.isSample") { value(true) }
            jsonPath("$.days[0].number") { value(1) }
            jsonPath("$.days[0].stops[0].time") { exists() }
            jsonPath("$.permissions.canEdit") { value(false) }
            jsonPath("$.permissions.canClone") { value(false) }
        }
    }

    @Test
    fun `the original Osaka Kyoto trip is readable by link with all 50 stops and guides`() {
        mvc.get("/api/v1/trips/osaka-kyoto-family-2026").andExpect {
            status { isOk() }
            jsonPath("$.visibility") { value("link") }
            jsonPath("$.days", hasSize<Any>(4))
            jsonPath("$.days[0].stops[0].key") { value("d1-gmp") }
            jsonPath("$.days[0].stops[0].coordinates", hasSize<Any>(2))
            jsonPath("$.content.checklistGroups") { exists() }
            jsonPath("$.places[0].details") { exists() }
        }
    }

    @Test
    fun `a logged-in user may clone a sample but not edit it`() {
        createVerifiedUser("mina@example.com")
        val session = login("mina@example.com")

        mvc.get("/api/v1/trips/danang-hoian-family-2027") { cookie(session) }.andExpect {
            jsonPath("$.permissions.canEdit") { value(false) }
            jsonPath("$.permissions.canClone") { value(true) }
        }
    }

    @Test
    fun `someone else's private trip is indistinguishable from a missing one`() {
        privateTripOf(createVerifiedUser("owner@example.com"))
        createVerifiedUser("other@example.com")
        val other = login("other@example.com")

        mvc.get("/api/v1/trips/private-trip").andExpect { status { isNotFound() } }
        mvc.get("/api/v1/trips/private-trip") { cookie(other) }.andExpect { status { isNotFound() } }
        mvc.get("/api/v1/trips/no-such-trip").andExpect {
            status { isNotFound() }
            jsonPath("$.detail") { value("일정을 찾을 수 없어요. 링크를 다시 확인해 주세요.") }
        }
    }

    @Test
    fun `the owner reads and may edit a private trip`() {
        privateTripOf(createVerifiedUser("owner@example.com"))
        val owner = login("owner@example.com")

        mvc.get("/api/v1/trips/private-trip") { cookie(owner) }.andExpect {
            status { isOk() }
            jsonPath("$.permissions.canEdit") { value(true) }
        }
    }

    @Test
    fun `samples list shows only public samples`() {
        mvc.get("/api/v1/samples").andExpect {
            status { isOk() }
            jsonPath("$", hasSize<Any>(1))
            jsonPath("$[0].slug") { value("danang-hoian-family-2027") }
            jsonPath("$[0].stopCount") { value(57) }
        }
    }

    @Test
    fun `my trips list needs a session and shows trips I belong to`() {
        mvc.get("/api/v1/trips").andExpect { status { isUnauthorized() } }
        privateTripOf(createVerifiedUser("owner@example.com"))
        val owner = login("owner@example.com")

        mvc.get("/api/v1/trips") { cookie(owner) }.andExpect {
            status { isOk() }
            jsonPath("$", hasSize<Any>(1))
            jsonPath("$[0].slug") { value("private-trip") }
        }
    }
}
```

다낭 샘플의 스톱 수(57)는 조사 결과 파일 기준이다. 샘플을 고쳐 수가 바뀌면 이 숫자도 함께 고친다.

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.trip.TripReadTest`
Expected: FAIL — `/api/v1/trips/...`가 401(아직 permitAll이 아님) 또는 404

- [ ] **Step 3: 응답 타입 구현**

`apps/api/src/main/kotlin/com/tripnote/trip/TripDocuments.kt`:

```kotlin
package com.tripnote.trip

import java.time.LocalDate
import java.util.UUID
import tools.jackson.databind.JsonNode

data class Permissions(val canEdit: Boolean, val canClone: Boolean)

data class StopDocument(
    val id: UUID,
    val key: String,
    val position: String,
    val time: String,
    val title: String,
    val type: String,
    val details: String,
    val duration: String?,
    val buffer: String?,
    val timing: String?,
    val transportIcon: String?,
    val coordinates: List<Double>?,
    val approximate: Boolean,
    val transit: JsonNode?,
    val photo: JsonNode?,
    val hotelPhoto: JsonNode?,
    val links: JsonNode?,
    val placeKey: String?,
    val guide: JsonNode?,
    val optional: Boolean,
    val version: Int,
)

data class DayDocument(
    val id: UUID,
    val number: Int,
    val date: LocalDate,
    val city: String,
    val theme: String,
    val note: String?,
    val color: String?,
    val tour: JsonNode?,
    val stops: List<StopDocument>,
)

data class PlaceDocument(val id: UUID, val key: String, val kind: String, val name: String, val area: String, val details: JsonNode)

data class TripDocument(
    val id: UUID,
    val slug: String,
    val title: String,
    val subtitle: String?,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val timezone: String,
    val visibility: String,
    val isSample: Boolean,
    val sourceTripId: UUID?,
    val version: Int,
    val content: JsonNode,
    val days: List<DayDocument>,
    val places: List<PlaceDocument>,
    val permissions: Permissions,
)

data class TripSummary(
    val slug: String,
    val title: String,
    val subtitle: String?,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val visibility: String,
    val isSample: Boolean,
    val coverPhoto: JsonNode?,
    val cities: List<String>,
    val stopCount: Int,
)
```

Jackson은 `isSample` 같은 Kotlin `Boolean` 속성을 `sample`로 직렬화할 수 있다. Step 6에서 JSON 이름이 `isSample`인지 확인하고, 아니면 해당 속성에 `@get:JsonProperty("isSample")`을 붙인다.

- [ ] **Step 4: 조회 구현**

`apps/api/src/main/kotlin/com/tripnote/trip/internal/TripQueries.kt`:

```kotlin
package com.tripnote.trip.internal

import com.tripnote.jooq.Tables.PLACES
import com.tripnote.jooq.Tables.STOPS
import com.tripnote.jooq.Tables.TRIPS
import com.tripnote.jooq.Tables.TRIP_DAYS
import com.tripnote.jooq.Tables.TRIP_MEMBERS
import com.tripnote.jooq.tables.records.StopsRecord
import com.tripnote.jooq.tables.records.TripsRecord
import com.tripnote.trip.DayDocument
import com.tripnote.trip.Permissions
import com.tripnote.trip.PlaceDocument
import com.tripnote.trip.StopDocument
import com.tripnote.trip.TripDocument
import com.tripnote.trip.TripSummary
import java.time.format.DateTimeFormatter
import java.util.UUID
import org.jooq.DSLContext
import org.jooq.JSONB
import org.jooq.impl.DSL
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper

@Component
@Transactional(readOnly = true)
class TripQueries(private val dsl: DSLContext, private val json: JsonMapper) {
    private val hhmm = DateTimeFormatter.ofPattern("HH:mm")

    fun role(tripId: UUID, userId: UUID?): String? = userId?.let {
        dsl.select(TRIP_MEMBERS.ROLE).from(TRIP_MEMBERS)
            .where(TRIP_MEMBERS.TRIP_ID.eq(tripId), TRIP_MEMBERS.USER_ID.eq(it))
            .fetchOne(TRIP_MEMBERS.ROLE)
    }

    fun find(slug: String, viewer: UUID?): TripDocument? {
        val trip = dsl.selectFrom(TRIPS).where(TRIPS.SLUG.eq(slug)).fetchOne() ?: return null
        val role = role(trip.id, viewer)
        if (trip.visibility == "private" && role == null) return null

        val stopsByDay = dsl.selectFrom(STOPS).where(STOPS.TRIP_ID.eq(trip.id)).orderBy(STOPS.POSITION).fetch().groupBy { it.dayId }
        val days = dsl.selectFrom(TRIP_DAYS).where(TRIP_DAYS.TRIP_ID.eq(trip.id)).orderBy(TRIP_DAYS.NUMBER).fetch().map { day ->
            DayDocument(day.id, day.number, day.date, day.city, day.theme, day.note, day.color, day.tour.node(), stopsByDay[day.id].orEmpty().map(::toStop))
        }
        val places = dsl.selectFrom(PLACES).where(PLACES.TRIP_ID.eq(trip.id)).orderBy(PLACES.POSITION).fetch().map { place ->
            PlaceDocument(place.id, place.key, place.kind, place.name, place.area, place.details.node()!!)
        }
        val permissions = Permissions(
            canEdit = role in setOf("owner", "editor") && !trip.isSample,
            canClone = viewer != null && trip.visibility != "private",
        )
        return trip.toDocument(days, places, permissions)
    }

    fun stop(stopId: UUID): StopDocument = toStop(dsl.selectFrom(STOPS).where(STOPS.ID.eq(stopId)).fetchSingle())

    fun stopsOfDay(dayId: UUID): List<StopDocument> =
        dsl.selectFrom(STOPS).where(STOPS.DAY_ID.eq(dayId)).orderBy(STOPS.POSITION).fetch().map(::toStop)

    fun publicSamples(): List<TripSummary> = summaries(TRIPS.VISIBILITY.eq("public").and(TRIPS.IS_SAMPLE.isTrue))

    fun tripsOf(userId: UUID): List<TripSummary> = summaries(
        TRIPS.ID.`in`(dsl.select(TRIP_MEMBERS.TRIP_ID).from(TRIP_MEMBERS).where(TRIP_MEMBERS.USER_ID.eq(userId))),
    )

    private fun summaries(condition: org.jooq.Condition): List<TripSummary> {
        val cities = DSL.arrayAggDistinct(TRIP_DAYS.CITY)
        val stopCount = DSL.select(DSL.count()).from(STOPS).where(STOPS.TRIP_ID.eq(TRIPS.ID)).asField<Int>("stop_count")
        return dsl.select(TRIPS.asterisk(), DSL.field(DSL.select(cities).from(TRIP_DAYS).where(TRIP_DAYS.TRIP_ID.eq(TRIPS.ID))).`as`("cities"), stopCount)
            .from(TRIPS).where(condition).orderBy(TRIPS.START_DATE.desc())
            .fetch { record ->
                val trip = record.into(TRIPS)
                @Suppress("UNCHECKED_CAST")
                val cityList = (record.get("cities") as Array<String>?)?.toList().orEmpty()
                TripSummary(
                    trip.slug, trip.title, trip.subtitle, trip.startDate, trip.endDate, trip.visibility, trip.isSample,
                    trip.content.node()?.get("coverPhoto"), cityList, record.get("stop_count", Int::class.java),
                )
            }
    }

    private fun TripsRecord.toDocument(days: List<DayDocument>, places: List<PlaceDocument>, permissions: Permissions) = TripDocument(
        id, slug, title, subtitle, startDate, endDate, timezone, visibility, isSample, sourceTripId, version, content.node()!!, days, places, permissions,
    )

    private fun toStop(stop: StopsRecord) = StopDocument(
        id = stop.id,
        key = stop.key,
        position = stop.position,
        time = stop.startTime.format(hhmm),
        title = stop.title,
        type = stop.type,
        details = stop.details,
        duration = stop.duration,
        buffer = stop.buffer,
        timing = stop.timing,
        transportIcon = stop.transportIcon,
        coordinates = if (stop.lat != null && stop.lng != null) listOf(stop.lat, stop.lng) else null,
        approximate = stop.approximate,
        transit = stop.transit.node(),
        photo = stop.photo.node(),
        hotelPhoto = stop.hotelPhoto.node(),
        links = stop.links.node(),
        placeKey = stop.placeKey,
        guide = stop.guide.node(),
        optional = stop.optional,
        version = stop.version,
    )

    private fun JSONB?.node(): JsonNode? = this?.let { json.readTree(it.data()) }
}
```

조회는 여행 1번, 멤버 1번, 날짜 1번, 스톱 1번, 장소 1번으로 끝난다. 스톱 수가 늘어도 쿼리 수는 그대로다.

`apps/api/src/main/kotlin/com/tripnote/trip/internal/TripReadController.kt`:

```kotlin
package com.tripnote.trip.internal

import com.tripnote.auth.SessionUser
import com.tripnote.common.ApiException
import com.tripnote.trip.TripDocument
import com.tripnote.trip.TripSummary
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

@RestController
class TripReadController(private val queries: TripQueries) {
    @GetMapping("/api/v1/trips/{slug}")
    fun trip(@PathVariable slug: String, @AuthenticationPrincipal user: SessionUser?): TripDocument =
        queries.find(slug, user?.userId) ?: throw ApiException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없어요. 링크를 다시 확인해 주세요.")

    @GetMapping("/api/v1/samples")
    fun samples(): List<TripSummary> = queries.publicSamples()

    @GetMapping("/api/v1/trips")
    fun myTrips(@AuthenticationPrincipal user: SessionUser): List<TripSummary> = queries.tripsOf(user.userId)
}
```

`SecurityConfig.kt`의 `authorizeHttpRequests`에서 `.anyRequest()` 앞에 추가:

```kotlin
                .requestMatchers(HttpMethod.GET, "/api/v1/trips/*", "/api/v1/samples").permitAll()
```

(`import org.springframework.http.HttpMethod`). `/api/v1/trips/*`는 `/api/v1/trips`(내 여행 목록)와 맞지 않으므로 목록은 계속 로그인이 필요하다.

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.trip.TripReadTest`
Expected: PASS (7 tests)

- [ ] **Step 6: JSON 이름 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.trip.TripReadTest` 결과에서 `$.isSample` 검사가 통과했는지 확인한다. 실패했다면 `TripDocument.isSample`과 `TripSummary.isSample`에 `@get:JsonProperty("isSample")`를 붙이고 다시 실행한다.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): read trips with visibility rules in constant queries"
```

---

### Task 10: 여행 만들기와 스톱 편집

**Files:**
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/TripEntities.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/TripRepositories.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/SlugGenerator.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/TripAccess.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/TripCommandService.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/StopCommandService.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/TripWriteController.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/trip/TripWriteTest.kt`

**Interfaces:**
- Consumes: `FractionalIndex` (Task 8), `TripQueries.role`, `TripQueries.stop`, `TripQueries.stopsOfDay` (Task 9), `SessionUser` (Task 5)
- Produces: `TripAccess.requireEdit(tripId: UUID, userId: UUID)` — 읽을 수 없으면 404, 샘플이면 403, 권한이 없으면 403
- Produces: `SlugGenerator.next(): String` — 8자 `[a-z0-9]`, 중복 없음. Task 11의 복제가 쓴다.
- Produces: HTTP
  - `POST /api/v1/trips` `{title, startDate, endDate, timezone?, city?}` → 201 `{id, slug}`
  - `POST /api/v1/days/{dayId}/stops` `{title, time, type?, details?, duration?, coordinates?, afterStopId?}` → 201 `StopDocument`. `afterStopId`가 없으면 그날 마지막에 붙인다.
  - `PATCH /api/v1/stops/{stopId}` `{version, title?, time?, type?, details?, duration?, buffer?, coordinates?, clearCoordinates?}` → 200 `StopDocument`. `version`이 다르면 409와 `current`(현재 스톱)
  - `DELETE /api/v1/stops/{stopId}?version=N` → 204
  - `PUT /api/v1/days/{dayId}/stops/order` `{stopIds: [...]}` → 200 `List<StopDocument>`. 그날 스톱 전체를 정확히 한 번씩 담아야 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/trip/TripWriteTest.kt`:

```kotlin
package com.tripnote.trip

import com.tripnote.IntegrationTest
import com.tripnote.trip.internal.SampleTripSeeder
import jakarta.servlet.http.Cookie
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.hamcrest.Matchers.hasSize
import org.hamcrest.Matchers.matchesPattern
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import tools.jackson.databind.json.JsonMapper

class TripWriteTest : IntegrationTest() {
    @Autowired lateinit var json: JsonMapper
    @Autowired lateinit var seeder: SampleTripSeeder
    lateinit var session: Cookie

    @BeforeEach
    fun signIn() {
        createVerifiedUser("mina@example.com")
        session = login("mina@example.com")
    }

    private fun send(method: String, path: String, body: String? = null) = when (method) {
        "POST" -> mvc.post(path) { cookie(session); with(csrf()); contentType = MediaType.APPLICATION_JSON; body?.let { content = it } }
        "PATCH" -> mvc.patch(path) { cookie(session); with(csrf()); contentType = MediaType.APPLICATION_JSON; body?.let { content = it } }
        "PUT" -> mvc.put(path) { cookie(session); with(csrf()); contentType = MediaType.APPLICATION_JSON; body?.let { content = it } }
        else -> mvc.delete(path) { cookie(session); with(csrf()) }
    }

    private fun createTrip(): Pair<String, UUID> {
        val response = send("POST", "/api/v1/trips", """{"title":"후쿠오카 주말","startDate":"2027-04-02","endDate":"2027-04-04","city":"FUKUOKA"}""")
            .andExpect { status { isCreated() } }.andReturn().response.contentAsString
        val slug = json.readTree(response).get("slug").asString()
        val dayId = jdbc.sql("SELECT d.id FROM trip_days d JOIN trips t ON t.id = d.trip_id WHERE t.slug = ? AND d.number = 1")
            .param(slug).query(UUID::class.java).single()
        return slug to dayId
    }

    private fun addStop(dayId: UUID, title: String, time: String, after: String? = null): Map<String, Any?> {
        val afterJson = after?.let { ""","afterStopId":"$it"""" } ?: ""
        val body = send("POST", "/api/v1/days/$dayId/stops", """{"title":"$title","time":"$time"$afterJson}""")
            .andExpect { status { isCreated() } }.andReturn().response.contentAsString
        @Suppress("UNCHECKED_CAST")
        return json.readValue(body, Map::class.java) as Map<String, Any?>
    }

    private fun titlesOf(dayId: UUID) =
        jdbc.sql("SELECT title FROM stops WHERE day_id = ? ORDER BY position").param(dayId).query(String::class.java).list()

    @Test
    fun `creating a trip makes one day per date and a private random slug`() {
        val (slug, _) = createTrip()

        assertThat(slug).matches("[a-z0-9]{8}")
        assertThat(jdbc.sql("SELECT count(*) FROM trip_days d JOIN trips t ON t.id = d.trip_id WHERE t.slug = ?").param(slug).query(Int::class.java).single()).isEqualTo(3)
        assertThat(jdbc.sql("SELECT visibility FROM trips WHERE slug = ?").param(slug).query(String::class.java).single()).isEqualTo("private")
    }

    @Test
    fun `an end date before the start date is rejected`() {
        send("POST", "/api/v1/trips", """{"title":"거꾸로","startDate":"2027-04-04","endDate":"2027-04-02"}""").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("돌아오는 날이 떠나는 날보다 빠를 수 없어요.") }
        }
    }

    @Test
    fun `stops append by default and can be inserted after another stop`() {
        val (_, dayId) = createTrip()
        val first = addStop(dayId, "공항 도착", "09:00")
        addStop(dayId, "숙소 체크인", "15:00")
        addStop(dayId, "점심", "12:00", after = first["id"] as String)

        assertThat(titlesOf(dayId)).containsExactly("공항 도착", "점심", "숙소 체크인")
    }

    @Test
    fun `a stale version is refused with the current stop`() {
        val (_, dayId) = createTrip()
        val stop = addStop(dayId, "공항 도착", "09:00")
        val id = stop["id"]

        send("PATCH", "/api/v1/stops/$id", """{"version":0,"title":"후쿠오카 공항 도착"}""").andExpect {
            status { isOk() }
            jsonPath("$.version") { value(1) }
        }
        send("PATCH", "/api/v1/stops/$id", """{"version":0,"title":"다른 기기에서 고친 제목"}""").andExpect {
            status { isConflict() }
            jsonPath("$.detail") { value("다른 곳에서 먼저 고친 내용이 있어요. 최신 내용을 확인하고 다시 저장해 주세요.") }
            jsonPath("$.current.title") { value("후쿠오카 공항 도착") }
        }
    }

    @Test
    fun `reorder accepts exactly the day's stops`() {
        val (_, dayId) = createTrip()
        val a = addStop(dayId, "A", "09:00")["id"]
        val b = addStop(dayId, "B", "10:00")["id"]
        val c = addStop(dayId, "C", "11:00")["id"]

        send("PUT", "/api/v1/days/$dayId/stops/order", """{"stopIds":["$c","$a","$b"]}""").andExpect {
            status { isOk() }
            jsonPath("$", hasSize<Any>(3))
            jsonPath("$[0].title") { value("C") }
        }
        assertThat(titlesOf(dayId)).containsExactly("C", "A", "B")

        send("PUT", "/api/v1/days/$dayId/stops/order", """{"stopIds":["$c","$a"]}""").andExpect {
            status { isBadRequest() }
            jsonPath("$.detail") { value("이 날짜의 일정 전체를 한 번씩 순서대로 보내 주세요.") }
        }
    }

    @Test
    fun `reorder refuses stops from another day`() {
        val (slug, dayOne) = createTrip()
        val dayTwo = jdbc.sql("SELECT d.id FROM trip_days d JOIN trips t ON t.id = d.trip_id WHERE t.slug = ? AND d.number = 2").param(slug).query(UUID::class.java).single()
        val a = addStop(dayOne, "A", "09:00")["id"]
        val other = addStop(dayTwo, "다른 날", "09:00")["id"]

        send("PUT", "/api/v1/days/$dayOne/stops/order", """{"stopIds":["$other"]}""").andExpect { status { isBadRequest() } }
        send("PUT", "/api/v1/days/$dayOne/stops/order", """{"stopIds":["$a","$other"]}""").andExpect { status { isBadRequest() } }
        assertThat(titlesOf(dayTwo)).containsExactly("다른 날")
    }

    @Test
    fun `deleting needs the current version`() {
        val (_, dayId) = createTrip()
        val id = addStop(dayId, "A", "09:00")["id"]

        send("DELETE", "/api/v1/stops/$id?version=3").andExpect { status { isConflict() } }
        send("DELETE", "/api/v1/stops/$id?version=0").andExpect { status { isNoContent() } }
        assertThat(titlesOf(dayId)).isEmpty()
    }

    @Test
    fun `samples cannot be edited even by a member`() {
        seeder.seedAll()
        val dayId = jdbc.sql("SELECT d.id FROM trip_days d JOIN trips t ON t.id = d.trip_id WHERE t.slug = 'danang-hoian-family-2027' AND d.number = 1").query(UUID::class.java).single()

        send("POST", "/api/v1/days/$dayId/stops", """{"title":"추가","time":"09:00"}""").andExpect {
            status { isForbidden() }
            jsonPath("$.detail") { value("샘플 일정은 고칠 수 없어요. 내 여행으로 복제한 뒤 고쳐 주세요.") }
        }
    }

    @Test
    fun `someone else's private trip is not found`() {
        val (_, dayId) = createTrip()
        createVerifiedUser("other@example.com")
        session = login("other@example.com")

        send("POST", "/api/v1/days/$dayId/stops", """{"title":"침입","time":"09:00"}""").andExpect { status { isNotFound() } }
    }

    @Test
    fun `invalid time is rejected`() {
        val (_, dayId) = createTrip()
        send("POST", "/api/v1/days/$dayId/stops", """{"title":"A","time":"9:00"}""").andExpect { status { isBadRequest() } }
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.trip.TripWriteTest`
Expected: FAIL — `POST /api/v1/trips`가 404 또는 405

- [ ] **Step 3: 엔티티와 저장소 구현**

`apps/api/src/main/kotlin/com/tripnote/trip/internal/TripEntities.kt`:

```kotlin
package com.tripnote.trip.internal

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.annotations.UuidGenerator
import org.hibernate.type.SqlTypes

@Entity
@Table(name = "trips")
class TripEntity(
    @Column(nullable = false, updatable = false) val slug: String,
    @Column(nullable = false, updatable = false) val ownerId: UUID,
    @Column(nullable = false) var title: String,
    @Column(nullable = false) var startDate: LocalDate,
    @Column(nullable = false) var endDate: LocalDate,
    @Column(nullable = false) var timezone: String,
    @Column(nullable = false) var visibility: String = "private",
    @Column(nullable = false) val isSample: Boolean = false,
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false) var content: String = "{}",
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    var subtitle: String? = null
    var sourceTripId: UUID? = null
    @Version var version: Int = 0
    var createdAt: Instant = Instant.now()
    var updatedAt: Instant = Instant.now()
}

@Entity
@Table(name = "trip_days")
class TripDayEntity(
    @Column(nullable = false, updatable = false) val tripId: UUID,
    @Column(nullable = false) var number: Int,
    @Column(nullable = false) var date: LocalDate,
    @Column(nullable = false) var city: String = "",
    @Column(nullable = false) var theme: String = "",
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID
}

@Entity
@Table(name = "stops")
class StopEntity(
    @Column(nullable = false, updatable = false) val tripId: UUID,
    @Column(nullable = false) var dayId: UUID,
    @Column(nullable = false, updatable = false) val key: String,
    @Column(nullable = false) var position: String,
    @Column(name = "start_time", nullable = false) var time: LocalTime,
    @Column(nullable = false) var title: String,
    @Column(nullable = false) var type: String = "sight",
    @Column(nullable = false) var details: String = "",
) {
    @Id
    @UuidGenerator(style = UuidGenerator.Style.VERSION_7)
    lateinit var id: UUID

    var duration: String? = null
    var buffer: String? = null
    var lat: Double? = null
    var lng: Double? = null
    @Version var version: Int = 0
}
```

`StopEntity`는 편집 화면이 고치는 필드만 매핑한다. `location`(생성 컬럼)과 jsonb 필드(사진, 가이드 등)는 매핑하지 않으므로 JPA가 건드리지 않는다.

`apps/api/src/main/kotlin/com/tripnote/trip/internal/TripRepositories.kt`:

```kotlin
package com.tripnote.trip.internal

import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface TripRepository : JpaRepository<TripEntity, UUID> {
    fun existsBySlug(slug: String): Boolean
}

interface TripDayRepository : JpaRepository<TripDayEntity, UUID>

interface StopRepository : JpaRepository<StopEntity, UUID> {
    fun findByDayIdOrderByPositionAsc(dayId: UUID): List<StopEntity>
}
```

- [ ] **Step 4: 권한, 슬러그, 명령 서비스 구현**

`apps/api/src/main/kotlin/com/tripnote/trip/internal/SlugGenerator.kt`:

```kotlin
package com.tripnote.trip.internal

import java.security.SecureRandom
import org.springframework.stereotype.Component

@Component
class SlugGenerator(private val trips: TripRepository) {
    private val alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
    private val random = SecureRandom()

    fun next(): String {
        repeat(10) {
            val slug = (1..8).map { alphabet[random.nextInt(alphabet.length)] }.joinToString("")
            if (!trips.existsBySlug(slug)) return slug
        }
        error("could not generate a unique slug")
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/trip/internal/TripAccess.kt`:

```kotlin
package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component

@Component
class TripAccess(private val trips: TripRepository, private val queries: TripQueries) {
    fun requireEdit(tripId: UUID, userId: UUID): TripEntity {
        val trip = trips.findById(tripId).orElseThrow { notFound() }
        val role = queries.role(tripId, userId)
        if (trip.visibility == "private" && role == null) throw notFound()
        if (trip.isSample) throw ApiException(HttpStatus.FORBIDDEN, "샘플 일정은 고칠 수 없어요. 내 여행으로 복제한 뒤 고쳐 주세요.")
        if (role !in setOf("owner", "editor")) throw ApiException(HttpStatus.FORBIDDEN, "이 일정을 고칠 권한이 없어요.")
        return trip
    }

    fun notFound() = ApiException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없어요. 링크를 다시 확인해 주세요.")
}
```

예외는 던질 때마다 `notFound()`로 새로 만든다. 공용 예외 인스턴스를 재사용하면 스택 추적이 처음 만든 위치를 가리킨다.

`apps/api/src/main/kotlin/com/tripnote/trip/internal/TripCommandService.kt`:

```kotlin
package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import com.tripnote.jooq.Tables.TRIP_MEMBERS
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.util.UUID
import org.jooq.DSLContext
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

data class CreatedTrip(val id: UUID, val slug: String)

@Service
class TripCommandService(
    private val trips: TripRepository,
    private val days: TripDayRepository,
    private val slugs: SlugGenerator,
    private val dsl: DSLContext,
) {
    @Transactional
    fun create(ownerId: UUID, title: String, startDate: LocalDate, endDate: LocalDate, timezone: String?, city: String?): CreatedTrip {
        if (endDate.isBefore(startDate)) throw ApiException(HttpStatus.BAD_REQUEST, "돌아오는 날이 떠나는 날보다 빠를 수 없어요.")
        val length = ChronoUnit.DAYS.between(startDate, endDate) + 1
        if (length > 30) throw ApiException(HttpStatus.BAD_REQUEST, "여행 기간은 30일까지 만들 수 있어요.")

        val trip = trips.saveAndFlush(
            TripEntity(slug = slugs.next(), ownerId = ownerId, title = title.trim(), startDate = startDate, endDate = endDate, timezone = timezone ?: "Asia/Seoul"),
        )
        (0 until length).forEach { offset ->
            days.save(TripDayEntity(tripId = trip.id, number = offset.toInt() + 1, date = startDate.plusDays(offset), city = city.orEmpty()))
        }
        dsl.insertInto(TRIP_MEMBERS)
            .set(TRIP_MEMBERS.TRIP_ID, trip.id).set(TRIP_MEMBERS.USER_ID, ownerId).set(TRIP_MEMBERS.ROLE, "owner")
            .execute()
        return CreatedTrip(trip.id, trip.slug)
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/trip/internal/StopCommandService.kt`:

```kotlin
package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import com.tripnote.trip.StopDocument
import java.time.LocalTime
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.orm.ObjectOptimisticLockingFailureException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

data class NewStop(
    val title: String,
    val time: LocalTime,
    val type: String?,
    val details: String?,
    val duration: String?,
    val coordinates: List<Double>?,
    val afterStopId: UUID?,
)

data class StopChanges(
    val version: Int,
    val title: String?,
    val time: LocalTime?,
    val type: String?,
    val details: String?,
    val duration: String?,
    val buffer: String?,
    val coordinates: List<Double>?,
    val clearCoordinates: Boolean,
)

@Service
class StopCommandService(
    private val stops: StopRepository,
    private val days: TripDayRepository,
    private val access: TripAccess,
    private val queries: TripQueries,
) {
    private val conflictMessage = "다른 곳에서 먼저 고친 내용이 있어요. 최신 내용을 확인하고 다시 저장해 주세요."

    @Transactional
    fun add(dayId: UUID, userId: UUID, command: NewStop): StopDocument {
        val day = days.findById(dayId).orElseThrow { access.notFound() }
        access.requireEdit(day.tripId, userId)
        val ordered = stops.findByDayIdOrderByPositionAsc(dayId)
        val afterIndex = command.afterStopId?.let { id -> ordered.indexOfFirst { it.id == id }.also { if (it < 0) throw invalidOrder() } }
        val before = afterIndex?.let { ordered[it].position } ?: ordered.lastOrNull()?.position
        val after = afterIndex?.let { ordered.getOrNull(it + 1)?.position }
        val stop = StopEntity(
            tripId = day.tripId,
            dayId = dayId,
            key = "s-${UUID.randomUUID().toString().take(8)}",
            position = FractionalIndex.between(before, after),
            time = command.time,
            title = command.title.trim(),
            type = command.type ?: "sight",
            details = command.details.orEmpty(),
        ).apply {
            duration = command.duration
            command.coordinates?.let { lat = it[0]; lng = it[1] }
        }
        val saved = stops.saveAndFlush(stop)
        return queries.stop(saved.id)
    }

    @Transactional
    fun update(stopId: UUID, userId: UUID, changes: StopChanges): StopDocument {
        val stop = stops.findById(stopId).orElseThrow { access.notFound() }
        access.requireEdit(stop.tripId, userId)
        if (stop.version != changes.version) throw ApiException(HttpStatus.CONFLICT, conflictMessage, body = queries.stop(stopId))
        changes.title?.let { stop.title = it.trim() }
        changes.time?.let { stop.time = it }
        changes.type?.let { stop.type = it }
        changes.details?.let { stop.details = it }
        changes.duration?.let { stop.duration = it }
        changes.buffer?.let { stop.buffer = it }
        changes.coordinates?.let { stop.lat = it[0]; stop.lng = it[1] }
        if (changes.clearCoordinates) { stop.lat = null; stop.lng = null }
        try {
            stops.saveAndFlush(stop)
        } catch (exception: ObjectOptimisticLockingFailureException) {
            throw ApiException(HttpStatus.CONFLICT, conflictMessage, body = queries.stop(stopId))
        }
        return queries.stop(stopId)
    }

    @Transactional
    fun delete(stopId: UUID, userId: UUID, version: Int) {
        val stop = stops.findById(stopId).orElseThrow { access.notFound() }
        access.requireEdit(stop.tripId, userId)
        if (stop.version != version) throw ApiException(HttpStatus.CONFLICT, conflictMessage, body = queries.stop(stopId))
        stops.delete(stop)
    }

    @Transactional
    fun reorder(dayId: UUID, userId: UUID, stopIds: List<UUID>): List<StopDocument> {
        val day = days.findById(dayId).orElseThrow { access.notFound() }
        access.requireEdit(day.tripId, userId)
        val current = stops.findByDayIdOrderByPositionAsc(dayId)
        if (stopIds.size != current.size || stopIds.toSet() != current.map { it.id }.toSet()) throw invalidOrder()
        val byId = current.associateBy { it.id }
        var position: String? = null
        stopIds.forEach { id ->
            position = FractionalIndex.between(position, null)
            byId.getValue(id).position = position!!
        }
        stops.flush()
        return queries.stopsOfDay(dayId)
    }

    private fun invalidOrder() = ApiException(HttpStatus.BAD_REQUEST, "이 날짜의 일정 전체를 한 번씩 순서대로 보내 주세요.")
}
```

`queries.stop`과 `queries.stopsOfDay`는 jOOQ로 같은 트랜잭션의 연결에서 읽는다. JPA가 먼저 `flush`해야 바뀐 값이 보이므로 `saveAndFlush`와 `stops.flush()`를 쓴다.

`apps/api/src/main/kotlin/com/tripnote/trip/internal/TripWriteController.kt`:

```kotlin
package com.tripnote.trip.internal

import com.tripnote.auth.SessionUser
import com.tripnote.trip.StopDocument
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.time.LocalTime
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

private const val HHMM = "^([01][0-9]|2[0-3]):[0-5][0-9]$"
private const val STOP_TYPES = "^(airport|flight|transport|hotel|meal|sight|shopping|free|breakfast|bath|tour)$"

data class CreateTripRequest(
    @field:NotBlank @field:Size(max = 60) val title: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val timezone: String? = null,
    @field:Size(max = 40) val city: String? = null,
)

data class CreateStopRequest(
    @field:NotBlank @field:Size(max = 80) val title: String,
    @field:Pattern(regexp = HHMM) val time: String,
    @field:Pattern(regexp = STOP_TYPES) val type: String? = null,
    val details: String? = null,
    @field:Size(max = 40) val duration: String? = null,
    @field:Size(min = 2, max = 2) val coordinates: List<Double>? = null,
    val afterStopId: UUID? = null,
)

data class UpdateStopRequest(
    val version: Int,
    @field:Size(min = 1, max = 80) val title: String? = null,
    @field:Pattern(regexp = HHMM) val time: String? = null,
    @field:Pattern(regexp = STOP_TYPES) val type: String? = null,
    val details: String? = null,
    @field:Size(max = 40) val duration: String? = null,
    @field:Size(max = 80) val buffer: String? = null,
    @field:Size(min = 2, max = 2) val coordinates: List<Double>? = null,
    val clearCoordinates: Boolean = false,
)

data class ReorderRequest(@field:NotEmpty val stopIds: List<UUID>)

@RestController
class TripWriteController(private val tripsCommands: TripCommandService, private val stopCommands: StopCommandService) {
    @PostMapping("/api/v1/trips")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody body: CreateTripRequest, @AuthenticationPrincipal user: SessionUser): CreatedTrip =
        tripsCommands.create(user.userId, body.title, body.startDate, body.endDate, body.timezone, body.city)

    @PostMapping("/api/v1/days/{dayId}/stops")
    @ResponseStatus(HttpStatus.CREATED)
    fun addStop(@PathVariable dayId: UUID, @Valid @RequestBody body: CreateStopRequest, @AuthenticationPrincipal user: SessionUser): StopDocument =
        stopCommands.add(dayId, user.userId, NewStop(body.title, LocalTime.parse(body.time), body.type, body.details, body.duration, body.coordinates, body.afterStopId))

    @PatchMapping("/api/v1/stops/{stopId}")
    fun updateStop(@PathVariable stopId: UUID, @Valid @RequestBody body: UpdateStopRequest, @AuthenticationPrincipal user: SessionUser): StopDocument =
        stopCommands.update(
            stopId, user.userId,
            StopChanges(body.version, body.title, body.time?.let(LocalTime::parse), body.type, body.details, body.duration, body.buffer, body.coordinates, body.clearCoordinates),
        )

    @DeleteMapping("/api/v1/stops/{stopId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteStop(@PathVariable stopId: UUID, @RequestParam version: Int, @AuthenticationPrincipal user: SessionUser) =
        stopCommands.delete(stopId, user.userId, version)

    @PutMapping("/api/v1/days/{dayId}/stops/order")
    fun reorder(@PathVariable dayId: UUID, @Valid @RequestBody body: ReorderRequest, @AuthenticationPrincipal user: SessionUser): List<StopDocument> =
        stopCommands.reorder(dayId, user.userId, body.stopIds)
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.trip.TripWriteTest`
Expected: PASS (10 tests)

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): create trips and edit stops with optimistic locking and fractional order"
```

---

### Task 11: 복제와 회원 탈퇴

**Files:**
- Create: `apps/api/src/main/kotlin/com/tripnote/trip/internal/TripCloneService.kt`
- Modify: `apps/api/src/main/kotlin/com/tripnote/trip/internal/TripWriteController.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/GoogleTokenRevoker.kt`
- Create: `apps/api/src/main/kotlin/com/tripnote/auth/internal/AccountDeletionService.kt`
- Modify: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SessionController.kt`
- Modify: `apps/api/src/test/kotlin/com/tripnote/TestcontainersConfiguration.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/trip/TripCloneTest.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/auth/AccountDeletionTest.kt`

**Interfaces:**
- Consumes: `TripQueries.find` (Task 9), `SlugGenerator` (Task 10), `SessionRevoker` (Task 6), `SampleTripSeeder` (Task 8)
- Produces: HTTP `POST /api/v1/trips/{slug}/clone` → 201 `{id, slug}`, `DELETE /api/v1/me` → 204
- Produces: `GoogleTokenRevoker.revoke(token: String)` (fun interface), `AccountDeletionService.delete(userId: UUID, googleAccessToken: String?)`

복제는 SQL 다섯 문장으로 한다. 여행, 날짜, 스톱, 장소를 `INSERT ... SELECT`로 복사하고 소유자 멤버를 넣는다. 스톱 수와 상관없이 문장 수가 같다. 완료 체크, 멤버, 공유 링크는 복사하지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/trip/TripCloneTest.kt`:

```kotlin
package com.tripnote.trip

import com.tripnote.IntegrationTest
import com.tripnote.trip.internal.SampleTripSeeder
import java.util.UUID
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import tools.jackson.databind.json.JsonMapper

class TripCloneTest : IntegrationTest() {
    @Autowired lateinit var seeder: SampleTripSeeder
    @Autowired lateinit var json: JsonMapper

    @BeforeEach
    fun seed() { seeder.seedAll() }

    private fun one(sql: String, vararg params: Any) = jdbc.sql(sql).params(*params).query(Int::class.java).single()

    @Test
    fun `a logged-in user clones the sample into a private editable trip`() {
        createVerifiedUser("mina@example.com")
        val session = login("mina@example.com")

        val body = mvc.post("/api/v1/trips/danang-hoian-family-2027/clone") { cookie(session); with(csrf()) }
            .andExpect { status { isCreated() } }.andReturn().response.contentAsString
        val slug = json.readTree(body).get("slug").asString()

        assertThat(one("SELECT count(*) FROM stops s JOIN trips t ON t.id = s.trip_id WHERE t.slug = ?", slug))
            .isEqualTo(one("SELECT count(*) FROM stops s JOIN trips t ON t.id = s.trip_id WHERE t.slug = 'danang-hoian-family-2027'"))
        assertThat(one("SELECT count(*) FROM places p JOIN trips t ON t.id = p.trip_id WHERE t.slug = ?", slug))
            .isEqualTo(one("SELECT count(*) FROM places p JOIN trips t ON t.id = p.trip_id WHERE t.slug = 'danang-hoian-family-2027'"))
        assertThat(one("SELECT count(*) FROM trips WHERE slug = ? AND visibility = 'private' AND NOT is_sample AND source_trip_id IS NOT NULL", slug)).isEqualTo(1)
        mvc.get("/api/v1/trips/$slug") { cookie(session) }.andExpect {
            status { isOk() }
            jsonPath("$.permissions.canEdit") { value(true) }
        }
    }

    @Test
    fun `the Osaka Kyoto original can be cloned too`() {
        createVerifiedUser("mina@example.com")
        val session = login("mina@example.com")

        mvc.post("/api/v1/trips/osaka-kyoto-family-2026/clone") { cookie(session); with(csrf()) }.andExpect { status { isCreated() } }
    }

    @Test
    fun `reseeding after a clone keeps the clone linked to its source`() {
        createVerifiedUser("mina@example.com")
        val session = login("mina@example.com")
        mvc.post("/api/v1/trips/danang-hoian-family-2027/clone") { cookie(session); with(csrf()) }

        seeder.seedAll()

        assertThat(one("SELECT count(*) FROM trips c JOIN trips s ON s.id = c.source_trip_id WHERE s.slug = 'danang-hoian-family-2027'")).isEqualTo(1)
    }

    @Test
    fun `anonymous users cannot clone and private trips are not found`() {
        mvc.post("/api/v1/trips/danang-hoian-family-2027/clone") { with(csrf()) }.andExpect { status { isUnauthorized() } }

        val owner = createVerifiedUser("owner@example.com")
        val tripId = jdbc.sql("INSERT INTO trips (slug, owner_id, title, start_date, end_date) VALUES ('secret-trip', ?, '비밀', '2027-01-01', '2027-01-01') RETURNING id")
            .param(owner).query(UUID::class.java).single()
        jdbc.sql("INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'owner')").params(tripId, owner).update()
        createVerifiedUser("other@example.com")
        val other = login("other@example.com")

        mvc.post("/api/v1/trips/secret-trip/clone") { cookie(other); with(csrf()) }.andExpect { status { isNotFound() } }
    }
}
```

`apps/api/src/test/kotlin/com/tripnote/auth/AccountDeletionTest.kt`:

```kotlin
package com.tripnote.auth

import com.tripnote.IntegrationTest
import com.tripnote.auth.internal.AccountDeletionService
import com.tripnote.support.RecordingRevoker
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

class AccountDeletionTest : IntegrationTest() {
    @Autowired lateinit var deletion: AccountDeletionService
    @Autowired lateinit var revoker: RecordingRevoker

    @Test
    fun `deleting my account removes my trips and ends every session`() {
        createVerifiedUser("mina@example.com")
        val laptop = login("mina@example.com")
        val phone = login("mina@example.com")
        mvc.post("/api/v1/trips") {
            cookie(laptop); with(csrf()); contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"title":"지울 여행","startDate":"2027-04-02","endDate":"2027-04-02"}"""
        }

        mvc.delete("/api/v1/me") { cookie(laptop); with(csrf()) }.andExpect { status { isNoContent() } }

        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Int::class.java).single()).isZero()
        assertThat(jdbc.sql("SELECT count(*) FROM trips").query(Int::class.java).single()).isZero()
        mvc.get("/api/v1/me") { cookie(phone) }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `a google token is revoked when one is present`() {
        val id = createVerifiedUser("mina@example.com")
        revoker.revoked.clear()

        deletion.delete(id, googleAccessToken = "ya29.token")

        assertThat(revoker.revoked).containsExactly("ya29.token")
    }

    @Test
    fun `a failing revoke does not block deletion`() {
        val id = createVerifiedUser("mina@example.com")
        revoker.failNext = true

        deletion.delete(id, googleAccessToken = "ya29.token")

        assertThat(jdbc.sql("SELECT count(*) FROM users").query(Int::class.java).single()).isZero()
    }
}
```

`TestcontainersConfiguration.kt`에 추가하고 `support/RecordingRevoker.kt`를 만든다:

```kotlin
    @Bean
    @Primary
    fun recordingRevoker() = com.tripnote.support.RecordingRevoker()
```

```kotlin
package com.tripnote.support

import com.tripnote.auth.internal.GoogleTokenRevoker
import java.util.concurrent.CopyOnWriteArrayList

class RecordingRevoker : GoogleTokenRevoker {
    val revoked = CopyOnWriteArrayList<String>()
    @Volatile var failNext = false

    override fun revoke(token: String) {
        if (failNext) { failNext = false; throw IllegalStateException("google unavailable") }
        revoked += token
    }
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.trip.TripCloneTest --tests com.tripnote.auth.AccountDeletionTest`
Expected: FAIL — 컴파일 오류 `Unresolved reference: AccountDeletionService`, `GoogleTokenRevoker`

- [ ] **Step 3: 복제 구현**

`apps/api/src/main/kotlin/com/tripnote/trip/internal/TripCloneService.kt`:

```kotlin
package com.tripnote.trip.internal

import com.tripnote.common.ApiException
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TripCloneService(
    private val jdbc: JdbcClient,
    private val queries: TripQueries,
    private val slugs: SlugGenerator,
    private val access: TripAccess,
) {
    @Transactional
    fun clone(sourceSlug: String, userId: UUID): CreatedTrip {
        val source = queries.find(sourceSlug, userId) ?: throw access.notFound()
        if (!source.permissions.canClone) throw ApiException(HttpStatus.FORBIDDEN, "이 일정은 복제할 수 없어요.")
        val slug = slugs.next()

        val newId = jdbc.sql(
            """
            INSERT INTO trips (slug, owner_id, title, subtitle, start_date, end_date, timezone, visibility, is_sample, source_trip_id, content)
            SELECT :slug, :owner, title, subtitle, start_date, end_date, timezone, 'private', false, id, content FROM trips WHERE id = :source
            RETURNING id
            """.trimIndent(),
        ).param("slug", slug).param("owner", userId).param("source", source.id).query(UUID::class.java).single()

        jdbc.sql(
            """
            INSERT INTO trip_days (trip_id, number, date, city, theme, note, color, tour)
            SELECT :target, number, date, city, theme, note, color, tour FROM trip_days WHERE trip_id = :source
            """.trimIndent(),
        ).param("target", newId).param("source", source.id).update()

        jdbc.sql(
            """
            INSERT INTO stops (trip_id, day_id, key, position, start_time, title, type, details, duration, buffer, timing, transport_icon,
                               lat, lng, approximate, transit, photo, hotel_photo, links, place_key, guide, optional)
            SELECT :target, nd.id, s.key, s.position, s.start_time, s.title, s.type, s.details, s.duration, s.buffer, s.timing, s.transport_icon,
                   s.lat, s.lng, s.approximate, s.transit, s.photo, s.hotel_photo, s.links, s.place_key, s.guide, s.optional
            FROM stops s
            JOIN trip_days od ON od.id = s.day_id
            JOIN trip_days nd ON nd.trip_id = :target AND nd.number = od.number
            WHERE s.trip_id = :source
            """.trimIndent(),
        ).param("target", newId).param("source", source.id).update()

        jdbc.sql(
            """
            INSERT INTO places (trip_id, key, kind, name, area, details, position)
            SELECT :target, key, kind, name, area, details, position FROM places WHERE trip_id = :source
            """.trimIndent(),
        ).param("target", newId).param("source", source.id).update()

        jdbc.sql("INSERT INTO trip_members (trip_id, user_id, role) VALUES (:target, :owner, 'owner')")
            .param("target", newId).param("owner", userId).update()

        return CreatedTrip(newId, slug)
    }
}
```

`TripWriteController.kt`에 생성자 인자 `private val cloneService: TripCloneService`를 더하고 메서드를 추가한다:

```kotlin
    @PostMapping("/api/v1/trips/{slug}/clone")
    @ResponseStatus(HttpStatus.CREATED)
    fun clone(@PathVariable slug: String, @AuthenticationPrincipal user: SessionUser): CreatedTrip = cloneService.clone(slug, user.userId)
```

`SecurityConfig`에서 `GET /api/v1/trips/*`만 공개했으므로 `POST .../clone`은 로그인이 필요하다. 익명 요청은 401이 된다.

- [ ] **Step 4: 탈퇴 구현**

`apps/api/src/main/kotlin/com/tripnote/auth/internal/GoogleTokenRevoker.kt`:

```kotlin
package com.tripnote.auth.internal

import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient

fun interface GoogleTokenRevoker {
    fun revoke(token: String)
}

@Component
class HttpGoogleTokenRevoker(builder: RestClient.Builder) : GoogleTokenRevoker {
    private val client = builder.baseUrl("https://oauth2.googleapis.com").build()

    override fun revoke(token: String) {
        client.post().uri("/revoke")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(LinkedMultiValueMap<String, String>().apply { add("token", token) })
            .retrieve().toBodilessEntity()
    }
}
```

`apps/api/src/main/kotlin/com/tripnote/auth/internal/AccountDeletionService.kt`:

```kotlin
package com.tripnote.auth.internal

import java.util.UUID
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AccountDeletionService(
    private val users: UserRepository,
    private val revoker: GoogleTokenRevoker,
    private val sessionRevoker: SessionRevoker,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * 탈퇴 세 단계 중 지금 있는 두 단계: 구글 토큰 회수(실패해도 진행), 계정 삭제(소유 여행·멤버·로그인 수단은 DB가 연쇄 삭제).
     * 업로드 이미지 삭제는 사진 업로드를 만드는 3단계에서 이 서비스에 추가한다.
     */
    @Transactional
    fun delete(userId: UUID, googleAccessToken: String?) {
        googleAccessToken?.let { token ->
            runCatching { revoker.revoke(token) }.onFailure { log.warn("google token revoke failed for {}: {}", userId, it.message) }
        }
        users.deleteById(userId)
        sessionRevoker.revokeAll(userId)
    }
}
```

`SessionController.kt`에 추가(생성자에 `private val deletion: AccountDeletionService` 추가):

```kotlin
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizedClientRepository
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.ResponseStatus

    private val authorizedClients = HttpSessionOAuth2AuthorizedClientRepository()

    @DeleteMapping("/api/v1/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteMe(@AuthenticationPrincipal user: SessionUser, request: HttpServletRequest) {
        val token = authorizedClients.loadAuthorizedClient<org.springframework.security.oauth2.client.OAuth2AuthorizedClient>(
            "google", SecurityContextHolder.getContext().authentication, request,
        )?.accessToken?.tokenValue
        deletion.delete(user.userId, token)
        request.getSession(false)?.invalidate()
    }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd apps/api && ./gradlew test`
Expected: 전체 PASS. 실패하면 해당 테스트의 메시지를 읽고 고친다. 다른 작업의 테스트를 고쳐 맞추지 않는다.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): clone trips set-wise and delete accounts with token revoke"
```

---

### Task 12: OpenAPI 계약과 CI

**Files:**
- Modify: `apps/api/build.gradle.kts`
- Create: `apps/api/src/main/kotlin/com/tripnote/common/OpenApiConfig.kt`
- Modify: `apps/api/src/main/kotlin/com/tripnote/auth/internal/SecurityConfig.kt`
- Create: `apps/api/src/test/kotlin/com/tripnote/OpenApiContractTest.kt`
- Create: `apps/api/openapi.json` (테스트가 생성)
- Create: `.github/workflows/ci.yml`
- Create: `apps/api/README.md`

**Interfaces:**
- Produces: `apps/api/openapi.json` — 3번 계획의 웹 앱이 `openapi-typescript`로 타입을 만든다. API를 바꾸면 이 파일도 바뀌어야 테스트가 통과한다.
- Produces: GitHub Actions `ci` 워크플로: 샘플 검증(Node), API 테스트(Gradle), jOOQ 생성 코드 차이 검사

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/test/kotlin/com/tripnote/OpenApiContractTest.kt`:

```kotlin
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
```

`build.gradle.kts`의 `tasks.withType<Test>`를 바꾼다:

```kotlin
tasks.withType<Test> {
    useJUnitPlatform()
    systemProperty("openapi.write", System.getProperty("openapi.write") ?: "false")
}
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd apps/api && ./gradlew test --tests com.tripnote.OpenApiContractTest`
Expected: FAIL — `/v3/api-docs`가 401 또는 404

- [ ] **Step 3: springdoc 추가**

`build.gradle.kts`의 `dependencies`에 추가:

```kotlin
    implementation(libs.springdoc.webmvc)
```

`apps/api/src/main/kotlin/com/tripnote/common/OpenApiConfig.kt`:

```kotlin
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
```

`SecurityConfig.kt`의 `authorizeHttpRequests`에 추가:

```kotlin
                .requestMatchers("/v3/api-docs/**").permitAll()
```

- [ ] **Step 4: 계약 파일 생성과 테스트 통과 확인**

```bash
cd apps/api
./gradlew test --tests com.tripnote.OpenApiContractTest -Dopenapi.write=true
./gradlew test --tests com.tripnote.OpenApiContractTest
```

Expected: 두 번째 실행이 PASS. `openapi.json` 첫 부분의 `"openapi"` 값을 확인해 `3.1.x`인지 `3.0.x`인지 `apps/api/README.md`에 적는다(ADR 0006의 확인 필요 항목).

- [ ] **Step 5: CI 워크플로 작성**

`.github/workflows/ci.yml`:

```yaml
name: ci

on:
  push:
    branches: [develop, main]
  pull_request:

permissions:
  contents: read

jobs:
  samples:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm sample:validate

  api:
    runs-on: ubuntu-24.04
    defaults:
      run:
        working-directory: apps/api
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-java@v5
        with:
          distribution: temurin
          java-version: 25
      - uses: gradle/actions/setup-gradle@v5
      - run: ./gradlew check
      - name: jOOQ generated code is up to date
        run: |
          docker compose up -d db
          until docker compose exec -T db pg_isready -U tripnote; do sleep 1; done
          ./gradlew flywayMigrate jooqCodegen
          git diff --exit-code -- src/main/generated
```

`pnpm/action-setup`은 루트 `package.json`의 `packageManager` 필드에서 pnpm 버전을 읽는다. 필드가 없으면 `with: { version: 10 }`을 넣는다.

액션은 태그로 적었다. 커밋 전에 SHA로 고정한다:

```bash
npx --yes pin-github-action .github/workflows/ci.yml
```

Expected: 각 `uses:`가 `owner/action@<40자 SHA> # vX` 형태로 바뀐다. 이후 갱신은 Renovate(5번 계획)가 맡는다.

- [ ] **Step 6: README 작성**

`apps/api/README.md`:

````markdown
# 여행노트 API

Spring Boot 4.1 · Kotlin 2.3 · Java 25 · PostgreSQL 18 + PostGIS · Valkey. 결정 근거는 `docs/adr/`에 있다.

## 로컬 실행

```bash
docker compose up -d          # db, valkey, mailpit(메일 확인 http://localhost:8025)
TRIPNOTE_SEED_SAMPLES=true ./gradlew bootRun
```

## 테스트

```bash
./gradlew test                # Docker 필요(Testcontainers)
```

## 계약과 생성 코드

- API를 바꾸면 `./gradlew test --tests com.tripnote.OpenApiContractTest -Dopenapi.write=true`로 `openapi.json`을 갱신해 함께 커밋한다.
- 마이그레이션을 바꾸면 `./gradlew flywayClean flywayMigrate jooqCodegen`으로 `src/main/generated`를 갱신해 함께 커밋한다. CI가 차이를 검사한다.
- 생성된 OpenAPI 버전: (Step 4에서 확인한 값을 적는다)

## 모듈

| 모듈 | 공개 API | 하는 일 |
| --- | --- | --- |
| `common` | `ApiException`, `RateLimiter`, `TripnoteProperties` | 오류 응답, 레이트리밋, 설정 |
| `auth` | `SessionUser`, `SystemUsers` | 이메일 가입·인증·재설정, 구글 로그인, 세션, 탈퇴 |
| `trip` | `TripDocument` 등 응답 타입 | 샘플 적재, 일정 조회·편집, 복제 |
````

- [ ] **Step 7: 전체 확인과 Commit**

Run: `cd apps/api && ./gradlew check`
Expected: 전체 PASS

```bash
git add apps/api .github/workflows/ci.yml
git commit -m "build(api): publish OpenAPI contract and add CI for samples, API and jOOQ drift"
```
