# 백엔드 기술 스택 트렌드 2026 — Kotlin + Spring Boot API (여행노트)

기준 시점: 2026-10-15. 2025년 이전 사실은 "(배경)"으로 표시. 모든 날짜는 1차 소스(spring.io, docs.spring.io, openjdk.org, kotlinlang.org, jooq.org 등) 우선, 2차 소스는 명시.

서비스 전제: B2C 여행 일정 웹서비스, PostgreSQL + Redis + Flyway + Spring Modulith, 카카오/구글 소셜 로그인(BFF 쿠키), 공유 링크, 여행 복제, 사용자별 완료 체크, Open-Meteo 날씨 프록시. "100개 MSA"가 아닌 "채용 담당자가 납득하는 프로덕션 품질의 사이드 프로젝트" 규모.

---

## 1. Spring Boot 4.0 / Spring Framework 7 — 무엇이 바뀌었고 3.x에서 어떻게 올라가나

### Takeaway
Spring Boot 4.0(2025-11-20 GA)은 Framework 7 + Jakarta EE 11 + Jackson 3 + JSpecify 널 안전성 + 모듈화된 JAR 구조가 핵심이고, 3.5는 2026-06-30에 OSS 지원이 끝났다. 2026년 10월 현재 새 프로젝트의 정답은 Boot 4.1.x(2026-06-10 GA, OSS 지원 2027-06까지)이며, 4.0.x는 2026-12-31에 OSS 지원이 끝나 수명이 짧다.

### Cited Findings
- Spring Boot 4.0은 2025-11-20 GA, Spring Framework 7과 Jakarta EE 11 위에 구축 — [BellSoft 마이그레이션 가이드](https://bell-sw.com/blog/how-to-migrate-a-spring-boot-3-project-to-spring-boot-4/); [InfoQ 2025-11](https://www.infoq.com/news/2025/11/spring-7-spring-boot-4)
- Java 17 최소, Java 25 지원; Jackson 3가 기본 JSON 라이브러리이고 Jackson 2는 deprecated 형태로만 제공; 포트폴리오 전체가 JSpecify 어노테이션을 사용해 NullAway 검증 가능; spring-core에 내장 retry API 추가; 선언적 HTTP 클라이언트; OpenTelemetry 스타터; 코드베이스가 다수의 작은 JAR로 모듈화; Undertow 제거 — [InfoQ](https://www.infoq.com/news/2025/11/spring-7-spring-boot-4); [spring.io release highlights](https://spring.io/projects/release-highlights/)
- Framework 7의 API 버저닝: Spring MVC/WebFlux에 1급 지원, path/header/query/media type 전략, RFC 9745 기반 deprecation 처리 — [InfoQ](https://www.infoq.com/news/2025/11/spring-7-spring-boot-4); Boot 4.0 신규 프로퍼티 `spring.mvc.apiversion.*`, `spring.webflux.apiversion.*` — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- Boot 4.0 관리 의존성 버전: Spring Framework 7.0, Security 7.0, Data 2025.1, Session 4.0, Kafka 4.0, GraphQL 2.0, Micrometer 1.16, Micrometer Tracing 1.6, Reactor 2025.0, Jackson 3.0, Hibernate ORM 7.2, Hibernate Validator 9.0, HikariCP 7.0, Jakarta Persistence 3.2, Jakarta Validation 3.1, Jakarta Servlet 6.1, Kotlin 2.2.20, Kotlin Serialization 1.9, Flyway 11.11, Liquibase 5.0, Tomcat 11.0, Jetty 12.1, Kafka 4.1.0, Mockito 5.20, Testcontainers 2.0, H2 2.4; Gradle 9 지원(8.14+도 지원) — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- 마이그레이션 가이드의 기준선: Java 17+(최신 LTS 권장), Kotlin 2.2+, GraalVM native-image 25+, Jakarta EE 11, Servlet 6.1 — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- 제거된 것: Undertow(Servlet 6.1 미호환), 리액티브 Pulsar 자동설정, 내장 실행 스크립트, Spring Session Hazelcast/MongoDB 지원, Spock 통합, 클래식 uber-jar 로더, Spring Retry 의존성 관리(명시 버전 필요), `@MockBean`/`@SpyBean` — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Jersey는 제거되지 않음(Jersey 4.0 지원, 단 Jackson 3 미지원이라 `spring-boot-jackson2` 병행) — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide); InfoQ 요약은 Jersey 제거라고 적었으나 공식 가이드와 상충 — [InfoQ](https://www.infoq.com/news/2025/11/spring-7-spring-boot-4)
- 스타터 재편: 모듈은 `spring-boot-<tech>`, 패키지 `org.springframework.boot.<tech>`; `spring-boot-starter-web` → `spring-boot-starter-webmvc`(구 이름 deprecated), `-aop` → `-aspectj`, OAuth2 스타터에 `security-` 접두어(`spring-boot-starter-security-oauth2-client`), Flyway/Liquibase는 `spring-boot-starter-flyway`/`-liquibase` 필요, 테스트 스타터는 기술별 `spring-boot-starter-<tech>-test`; 마이그레이션 보조 `spring-boot-starter-classic`, `spring-boot-starter-test-classic` — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Jackson 3 마이그레이션: 그룹/패키지 `com.fasterxml.jackson` → `tools.jackson`(`jackson-annotations`는 유지); `Jackson2ObjectMapperBuilderCustomizer` → `JsonMapperBuilderCustomizer`; `@JsonComponent` → `@JacksonComponent`; `spring.jackson.read/write.*` → `spring.jackson.json.read/write.*`; 모듈 자동 등록(`spring.jackson.find-and-add-modules=false`로 끔); `ObjectMapper` 대신 `JsonMapper` 빈 정의; `spring.jackson.use-jackson2-defaults=true`로 구 동작 근사 — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Jackson 3는 날짜를 ISO-8601 문자열로 기본 직렬화; 마이그레이션 가이드들은 Jackson 3 기본값을 "직렬화 테스트가 조용히 깨지는 가장 흔한 원인"으로 지목 — [Kellton 마이그레이션 가이드](https://www.kellton.com/kellton-tech-blog/spring-boot-4-migration-guide) (2차 소스)
- 테스트 변경: `@SpringBootTest`가 MockMvc를 더 이상 기본 제공하지 않음(`@AutoConfigureMockMvc` 필요); `@MockBean` → `@MockitoBean`, `@SpyBean` → `@MockitoSpyBean`(테스트 필드에서만, `@Configuration`에서는 불가); `RestTestClient` + `@AutoConfigureRestTestClient` 신설, `TestRestTemplate`은 `@AutoConfigureTestRestTemplate` 필요 — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Actuator: liveness/readiness 프로브가 기본 활성(`management.endpoint.health.probes.enabled`로 끔); `management.tracing.enabled` → `management.tracing.export.enabled` — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide); [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- 기타: `spring.session.redis.*` → `spring.session.data.redis.*`; `hibernate-jpamodelgen` → `hibernate-processor`; 새 `spring-boot-persistence` 모듈에 `@EntityScan` 이동; `HttpMessageConverters` deprecated(`ClientHttpMessageConvertersCustomizer`/`ServerHttpMessageConvertersCustomizer`); DevTools LiveReload 기본 비활성; Logback 로그 파일 UTF-8 기본 — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Framework 7 HTTP 서비스 클라이언트 레지스트리: `@ImportHttpServices`로 인터페이스 그룹을 선언 등록, `HttpServiceProxyRegistry`로 노출, `HttpServiceGroupConfigurer`/`RestClientHttpServiceGroupConfigurer`로 그룹별 base URL 설정, 7.0-M8에서 `@HttpServiceClient` 추가(스캔 제외용) — [spring.io 2025-09-23 HTTP Service Client Enhancements](https://spring.io/blog/2025/09/23/http-service-client-enhancements/); [Framework 7.0.0-M8](https://spring.io/blog/2025/08/14/spring-framework-7-0-0-M8-available-now)
- Framework 7 코어 resilience: `@Retryable`(기본 maxRetries=3, 1초 지연, 모든 예외 재시도), `@ConcurrencyLimit`, 프로그래밍 방식 retry; `@EnableResilientMethods`로 활성화; `@ConcurrencyLimit`은 "스레드 풀 한계가 없는 Virtual Threads 환경에서 특히 유용"; `@Retryable`은 리액티브 메서드도 호환; Spring Retry 프로젝트에서 영감 — [docs.spring.io Resilience Features](https://docs.spring.io/spring-framework/reference/7.0/core/resilience.html)
- Spring Boot 4.1.0은 2026-06-10 GA: Spring gRPC 지원, Jackson 설정 프로퍼티/커스터마이징 개선, HTTP 클라이언트 SSRF 완화용 `InetAddressFilter`, OpenTelemetry 업데이트 등 관측성 개선, Log4j 파일 로테이션; 4.0.7의 버그/보안 수정 포함 — [spring.io 2026-06-10](https://spring.io/blog/2026/06/10/spring-boot-4/)
- 4.1의 OSS 지원 종료 2027-06, 엔터프라이즈 2028-06 — [spring.io 2026-06-10](https://spring.io/blog/2026/06/10/spring-boot-4/) (검색 요약 기반; 원문은 위키 링크로 위임)
- Spring Boot 4.1.1은 2026-08-20, 98건 버그 수정 — [spring.io 2026-08-20](https://spring.io/blog/2026/08/20/spring-boot-4-1-1-available-now/)
- 4.1.0-M1(2026-01-22)에 웹 서버가 필요한 슬라이스 테스트용 `@AutoConfigureWebServer` 추가; M4(2026-03-26)에서 Rabbit/AMQP 변경을 4.2로 연기 — [4.1.0-M1](https://spring.io/blog/2026/01/22/spring-boot-4-1-0-M1-available-now/); [4.1.0-M4](https://spring.io/blog/2026/03/26/spring-boot-4-1-0-M4-available-now/)
- 4.1이 Hibernate 7.4, Spring Security 7.1, Framework 7.0.8로 올라갔다는 주장과, lazy JDBC 연결(`spring.datasource.connection-fetch=lazy`), `@RedisListener` 자동설정 추가 주장 — [CSDN 요약](https://aicoding.csdn.net/6a5def2b662f9a54cb9153b5.html) (3차 소스, 미검증)
- Spring Boot 3.5.16(2026-06-25)이 3.5.x의 마지막 OSS 릴리스, 4.0.x/4.1.x로 이동 권고, 상용 지원은 별도 — [spring.io 2026-06-25](https://spring.io/blog/2026/06/25/spring-boot-3-5-16-available-now/)
- 3.5 OSS 지원 종료 2026-06-30; 같은 날 Spring Framework 6.2, Security 6.5, Spring Cloud 2025.0도 종료 — [endoflife.ai](https://endoflife.ai/article-spring-june-30-eol-wave); [eosl.date](https://eosl.date/eol/product/spring-boot/)
- Boot 4.0 OSS 지원 종료 2026-12-31, 4.1은 2027-07-31까지(HeroDevs 타임라인; spring.io 블로그의 "2027-06"과 한 달 차이) — [HeroDevs](https://www.herodevs.com/blog-posts/spring-boot-versions-eol-dates-and-latest-releases-april-2026)
- 2026년 CVE-2026-22729/22730이 Boot 3.5 EOL과 겹쳐 Spring AI 팀의 업그레이드 압박 요인 — [HeroDevs](https://www.herodevs.com/blog-posts/cve-2026-22729-cve-2026-22730-and-the-spring-boot-3-5-eol-crunch-facing-spring-ai-teams) (벤더 블로그)
- 신규 스타터/모듈: `spring-boot-starter-opentelemetry`(OTLP 메트릭/트레이스, OpenTelemetry SDK 1.54.0), `spring-boot-starter-kotlin-serialization` — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- Danvega의 4.0/4.1 통합 정리 글 존재 — [danvega.dev 2025-11-24](https://www.danvega.dev/blog/2025/11/24/spring-boot-4-is-here) (2차)

### Inferences
- 여행노트는 그린필드이므로 3.x 마이그레이션 비용이 없다. 바로 Boot 4.1.x + Framework 7 + Kotlin 2.3 + Java 25로 시작하는 것이 2026-10 시점에서 "최신이면서 안전한" 선택이며, 4.0.x는 두 달 뒤 OSS 지원이 끝나므로 피한다.
- Jackson 3 전환은 그린필드에도 영향: `tools.jackson` 패키지, `JsonMapper` 빈, `@JacksonComponent` 등 새 이름을 처음부터 쓰고, 날짜는 ISO-8601 문자열 기본값을 그대로 받아들여 Next.js 쪽 타입과 맞춘다. 블로그/튜토리얼 대부분이 아직 Jackson 2 예제라는 점을 이력서/면접에서 "실제로 겪은 변화"로 쓸 수 있다.
- Open-Meteo 프록시는 Framework 7의 `@HttpExchange` 인터페이스 + `@ImportHttpServices` + `RestClient` 조합이 정석이며, OpenFeign을 넣을 이유가 없다. 여기에 코어 `@Retryable`/`@ConcurrencyLimit`을 얹으면 외부 의존 없이 재시도·동시성 제한이 된다(섹션 6 참조).
- API 버저닝은 B2C 단일 프론트에는 필요 이상일 수 있지만, 공유 링크처럼 외부에 노출되는 URL이 있고 Framework 7이 1급으로 지원하므로 `/api/v1` 경로 전략만 선언해 두는 정도가 적정.

### Gaps
- Spring Boot 4.1 Release Notes 위키(관리 의존성 버전 표)를 직접 열지 못해 4.1의 정확한 Hibernate/Security/Kotlin 버전은 3차 소스(CSDN)와 Deleuze 블로그의 "계획"에 의존.
- Boot 4.2 일정은 미확인(docs 스냅샷에 "4.2 개발 중" 표기만 확인).

---

## 2. Java 21/25 가상 스레드·구조적 동시성, Kotlin 2.2/2.3(K2), 코루틴 vs 가상 스레드

### Takeaway
Java 25(2025-09-16 GA)는 LTS이며 가상 스레드는 이미 final(21), 핀닝 문제는 JDK 24(JEP 491)에서 해소됐고, 구조적 동시성은 25에서도 5차 프리뷰라 프로덕션 코드에 쓰지 않는다. Kotlin 2.3.0(2025-12-16)이 Java 25를 지원하고 Spring Boot 4.1이 Kotlin 2.3을 쓰며, Spring MVC + 블로킹 JDBC 스택에서는 `spring.threads.virtual.enabled=true`가 코드 변경 없는 기본 선택이고 코루틴은 WebFlux/R2DBC가 아니면 정당화가 약하다.

### Cited Findings
- JDK 25 GA 2025-09-16. JEP 목록: 505 Structured Concurrency(5차 프리뷰), 506 Scoped Values(final), 502 Stable Values(프리뷰), 507 Primitive Types in Patterns(3차 프리뷰), 511 Module Import Declarations, 512 Compact Source Files and Instance Main Methods, 513 Flexible Constructor Bodies, 514 AOT Command-Line Ergonomics, 515 AOT Method Profiling, 519 Compact Object Headers, 521 Generational Shenandoah, 520 JFR Method Timing & Tracing, 509 JFR CPU-Time Profiling(실험) — [openjdk.org/projects/jdk/25](https://openjdk.org/projects/jdk/25/)
- 가상 스레드는 Java 21에서 final; Java 24에서 `synchronized` 사용 시 캐리어 스레드 핀닝 제거(JEP 491) — [Microsoft Learn "reasons to move to Java 25"](https://learn.microsoft.com/en-us/java/openjdk/reasons-to-move-to-java-25); [danvega JDK 24 virtual threads without pinning](https://www.danvega.dev/blog/jdk-24-virtual-threads-without-pinning)
- (배경) JEP 444 Virtual Threads 정의: OS 스레드에 묶이지 않는 `java.lang.Thread`, 블로킹 I/O 시 자동 언마운트, CPU 바운드에는 이점 없음 — [openjdk JEP 444](https://openjdk.org/jeps/444)
- Spring I/O 2026에 "Get the most out of virtual threads in Java 25" 세션 — [2026.springio.net](https://2026.springio.net/sessions/get-the-most-out-of-virtual-threads-in-java-25/)
- Kotlin 2.3.0은 2025-12-16 릴리스; Java 25 지원; Gradle 9.0 호환; 미사용 반환값 체커, 중첩 타입 별칭 stable, when 데이터플로우 기반 exhaustiveness stable, 시간 추적 API stable, UUID 개선 — [JetBrains 블로그](https://blog.jetbrains.com/kotlin/2025/12/kotlin-2-3-0-released/); [kotlinlang whatsnew23](https://kotlinlang.org/docs/whatsnew23.html)
- (배경) Kotlin 2.2: when 가드 조건, multi-dollar interpolation, non-local break/continue, context parameters — [SD Times KotlinConf 2025](https://sdtimes.com/softwaredev/upcoming-kotlin-language-features-teased-at-kotlinconf-2025/)
- Spring Framework 7.0/Boot 4.0은 Kotlin 1 → Kotlin 2.2 기준선; Kotlin 2.1부터 JSpecify→Kotlin 널 가능성 변환이 기본이라 2.2를 택함; 정책상 Boot 4.1은 Kotlin 2.3(2.2 기준선 유지), Framework 7.1/Boot 4.2는 Kotlin 2.4; Spring 기반 라이브러리는 `apiVersion=2.2`, `languageVersion=2.2` 권장; IntelliJ 2025.3 권장 — [Deleuze, spring.io 2025-12-18](https://spring.io/blog/2025/12/18/next-level-kotlin-support-in-spring-boot-4/)
- JSpecify는 제네릭 타입/배열 원소 널 가능성까지 커버, Spring·Reactor·Micrometer API에서 unsafe platform type이 사라짐; NullAway로 빌드 시 검사 — [Deleuze](https://spring.io/blog/2025/12/18/next-level-kotlin-support-in-spring-boot-4/)
- Boot 4.0: kotlinx.serialization과 Jackson이 공존할 때 `@Serializable` 타입만 kotlinx가 처리; `spring-boot-kotlinx-serialization-json` 모듈과 스타터(4.0.1에서 이름 변경); Kotlin Serialization은 범용 JSON 라이브러리가 아니므로 Actuator 등을 위해 Jackson은 여전히 필요 — [Deleuze](https://spring.io/blog/2025/12/18/next-level-kotlin-support-in-spring-boot-4/)
- 코루틴 자동 컨텍스트 전파: `spring.reactor.context-propagation=auto` + `io.micrometer:context-propagation`으로 suspend 함수에서 관측성/트레이싱 동작; 로드맵(미확정): 리액티브 브리지 없는 Spring MVC 네이티브 코루틴 지원, 가상 스레드 디스패처 — [Deleuze](https://spring.io/blog/2025/12/18/next-level-kotlin-support-in-spring-boot-4/)
- `BeanRegistrar`/`BeanRegistrarDsl`로 조건·루프 기반 빈 등록 가능; Spring Fu는 은퇴; 공식 Kotlin 튜토리얼은 Spring Data JPA에서 Spring Data JDBC로 교체 — [Deleuze](https://spring.io/blog/2025/12/18/next-level-kotlin-support-in-spring-boot-4/)
- Spring I/O 2025 "Next level Kotlin support in Spring Boot 4", Spring I/O 2026 "Idiomatic Kotlin applications with Spring Boot 4" 슬라이드 존재 — [2025 슬라이드](https://2025.springio.net/slides/next-level-kotlin-support-in-spring-boot-4-springio25.pdf); [2026 슬라이드](https://2026.springio.net/slides/idiomatic-kotlin-applications-with-spring-boot-4-springio16.pdf)
- Devoxx UK 발표(Java 21 이후 경험): 일부 코드는 코루틴을 제거하고 가상 스레드로 대체하는 게 맞고, 다른 곳은 코루틴이 여전히 정당 — [devoxx.co.uk talk 22669](https://devoxx.co.uk/talk?id=22669)
- Kotlin 포럼(Servlet/Tomcat 레거시): 가상 스레드는 기존 코드 변경 불필요, 코루틴은 `suspend` 추가 + R2DBC 이전 필요, ThreadLocal 컨텍스트 전파 우려 — [discuss.kotlinlang.org 29949](https://discuss.kotlinlang.org/t/spring-coroutines-virtual-threads/29949)
- `spring.threads.virtual.enabled=true`면 임베디드 Tomcat이 요청마다 가상 스레드, `@Async`/`@Scheduled`도 가상 스레드로 — [sohamkamani](https://sohamkamani.com/java/virtual-threads-spring-boot) (2차)
- Java 25 + Boot 4 전환 사례: 병목이 스레드 고갈에서 HikariCP 커넥션 풀 고갈로 이동, "스레드가 아니라 희소 자원(DB 커넥션, HTTP 클라이언트)을 직접 제한하라" — [besthub](https://www.besthub.dev/articles/virtual-threads-eliminated-thread-pools-until-mysql-connections-ran-out-0a7185b57756) (2차)
- Spring Boot 이슈 #38883: mail 스타터 사용 시 다수의 `jdk.VirtualThreadPinned` 이벤트 보고, 문서에 한계 경고 요청 — [GitHub spring-boot#38883](https://github.com/spring-projects/spring-boot/issues/38883)
- jOOQ 3.17부터 `jooq-kotlin-coroutines` 모듈로 리액티브 스트림↔코루틴 브리지 — [jooq.org manual](https://www.jooq.org/doc/3.19/manual/sql-building/kotlin-sql-building/kotlin-coroutines/)
- JUnit 6.0은 Kotlin `suspend` 테스트 메서드 네이티브 지원 — [docs.junit.org 6.0.0](https://docs.junit.org/6.0.0/release-notes/)
- "Boot 4.1이 Java 21+에서 가상 스레드를 자동 활성화한다"는 CSDN 주장은 공식 소스로 확인 불가 — [CSDN](https://aicoding.csdn.net/6a5de83d10ee7a33f28f6e70.html) (미검증)

### Inferences
- 여행노트는 JPA/JDBC 블로킹 스택 + Spring MVC이므로 Java 25 + `spring.threads.virtual.enabled=true`가 가장 설명하기 쉬운 선택. 코루틴을 도입하면 R2DBC·WebFlux까지 끌려가 사이드 프로젝트 규모를 넘어선다. Open-Meteo 호출 1~2개 때문에 코루틴을 쓰지 않는다.
- 가상 스레드를 켜면 "무한 동시성"이 Hikari 풀(기본 10)과 Open-Meteo 외부 호출로 밀려들기 때문에 Hikari 풀 크기 명시 + Framework 7 `@ConcurrencyLimit`으로 외부 호출 동시성 제한을 설계에 명시하는 것이 면접에서 "가상 스레드를 이해하고 썼다"를 보여주는 포인트.
- 구조적 동시성(JEP 505)은 프리뷰이므로 코드에 쓰지 않고, 필요하면 `ExecutorService` + 가상 스레드로 충분.
- K2 컴파일러는 Kotlin 2.0부터 기본(배경)이라 2.3에서 별도 의사결정 없음.

### Gaps
- JEP 505의 JDK 26/27 상태(JetBrains 글은 "JEP 533, 7차 프리뷰 in Java 27"을 언급)는 openjdk.org에서 직접 확인하지 못함.
- 우아콘 2025·인프콘 2025·DEVIEW의 Kotlin/가상 스레드 세션은 검색으로 찾지 못함(한국어 컨퍼런스 세션 페이지가 검색 인덱스에 거의 없음). 카카오페이·토스·우아한형제들 기술블로그의 가상 스레드/코루틴 글도 이번 검색으로는 확인 불가.
- Spring MVC 네이티브 코루틴 지원·가상 스레드 디스패처는 2025-12 시점 로드맵이며 2026-10 현재 출시 여부 미확인.

---

## 3. Spring Modulith 2.x, Spring Security 7, Spring Session, Spring AI

### Takeaway
Spring Modulith는 2.0 GA(2025-11-21) → 2.1 GA(2026-06-11, 현재 2.1.1)로 Boot 4.x 라인을 따라가며 이벤트 퍼블리케이션 레지스트리 개편·슬라이스 테스트 통합·아웃박스 외부화가 핵심이다. Spring Security 7.0은 MFA·`csrf.spa()`·OAuth2 비밀번호 그랜트 제거·HTTP 서비스 클라이언트용 OAuth2 지원이 핵심이고 패스키(WebAuthn)는 6.4부터의 기능(배경)으로 7.x에 그대로 있으나 2026년 CVE-2026-47841이 분산 세션 저장소 사용 시 영향을 준다. Spring AI는 2.0 GA(2026-06-12)이지만 여행노트 스코프에는 불필요.

### Cited Findings
**Spring Modulith**
- 2.0 GA 2025-11-21(동시에 1.4.5, 1.3.11); Boot 4/Framework 7 기준선 — [spring.io 2025-11-21](https://spring.io/blog/2025/11/21/spring-modulith-2-0-ga-1-4-5-and-1-3-11-released/)
- 2.0의 핵심은 Event Publication Registry 개편; 마일스톤에서 Jackson 3 기반 이벤트 직렬화/외부화 지원 추가 — [2.0 M3](https://spring.io/blog/2025/09/19/spring-modulith-2-0-m3-released); [2.0 M2](https://spring.io/blog/2025/08/22/spring-modulith-2-0-0-m2-1-4-3-and-1-3-9-released/)
- 2.0.1/1.4.6/1.3.12 2025-12-20; 1.3.12가 1.3 세대 마지막(기반 Boot 세대 OSS 지원 종료) — [spring.io 2025-12-20](https://spring.io/blog/2025/12/20/spring-modulith-2-0-1-1-4-6-and-1-3-12-released/)
- 2.1 M1 2026-01-23(Boot 4.1 M1 기준), M4 2026-03-27, RC1 2026-04-24 — [2.1 M1](https://spring.io/blog/2026/01/23/spring-modulith-2-1-m-1-2-0-2-and-1-4-7-released/); [M4](https://spring.io/blog/2026/03/27/spring-modulith-2-1-m4-2-0-5-and-1-4-10-released/); [RC1](https://spring.io/blog/2026/04/24/spring-modulith-2-1-rc1-2-0-6-and-1-4-11-released/)
- 2.1 GA 2026-06-11(동시에 2.0.7, 1.4.12): 이벤트 외부화 아웃박스 지원(Namastack, JobRunr; GH-1517/1637), Boot 슬라이스 테스트와 함께 동작하는 애플리케이션 모듈 테스트(GH-1537), `PublishedEvents`/`Scenario`가 기본으로 모든 스레드의 이벤트를 봄(#1564), 관측성 인프라 간소화(#1567); GitHub 노트에 JDBC 이벤트 퍼블리케이션 스키마 생성 기본 활성, 관측성 API/core 아티팩트 분리, "마이그레이션 없는 모듈에 Flyway 실행 회피(#1684)" — [spring.io 2026-06-11](https://spring.io/blog/2026/06/11/spring-modulith-2-1-ga-2-0-7-and-1-4-12-released/); [GitHub releases](https://github.com/spring-projects/spring-modulith/releases)
- 프로젝트 페이지 현재 버전 2.1.1; 기능: 패키지 구조에서 `ApplicationModules` 모델 생성·구조 검증, Asciidoctor 스니펫(컴포넌트 다이어그램, 모듈 캔버스)을 `target/modulith-docs`에 생성, 모듈 단위 관측, 개별 모듈 통합 테스트 — [spring.io/projects/spring-modulith](https://spring.io/projects/spring-modulith)
- JetBrains 블로그 "Building modular monoliths with Kotlin and Spring"(2026-02): 모듈 간 통신은 네트워크 호출보다 빠르고 오류가 적은 인프로세스 호출 — [blog.jetbrains.com 2026-02](https://blog.jetbrains.com/kotlin/2026/02/building-modular-monoliths-with-kotlin-and-spring/) (본문 상세는 미열람)
- 한국어 velog 글: 메인 패키지 바로 아래 서브패키지가 각각 모듈로 인식되는 논리 모듈과 Gradle 물리 멀티모듈 비교 — [velog 멀티모듈](https://velog.io/@tl1l1l1s/architecture-multimodule); [velog Spring Modulith 도메인 모듈화](https://velog.io/@ljh098/Spring-Modulith로-도메인-모듈화하기) (개인 블로그)

**Spring Security 7.0**
- Core: MFA 지원 추가, `AuthorizationManager#check` 제거(→`authorize`), `AuthorizationManagerFactory`, `Authentication.Builder`, Access API를 `spring-security-access` 모듈로 분리 — [docs.spring.io 7.0 What's New](https://docs.spring.io/spring-security/reference/7.0/whats-new.html)
- Config: Servlet/WebFlux 모듈형 설정, `and()` 제거, `authorizeRequests` 제거(→`authorizeHttpRequests`), SPA용 CSRF `http.csrf((csrf) -> csrf.spa())`, `DelegatingMissingAuthorityAccessDeniedHandler` — [docs.spring.io 7.0 What's New](https://docs.spring.io/spring-security/reference/7.0/whats-new.html)
- OAuth 2.0: 비밀번호 그랜트 제거, HTTP Service Client용 OAuth2 지원, `NimbusJwtDecoder` 커스텀 `JwkSource`, `NimbusJwtEncoder` 빌더, 타입 레벨 `@ClientRegistrationId`, Dynamic Client Registration 지원, Authorization Server에서 PKCE 기본 활성; Spring Authorization Server와 Kerberos가 Spring Security에 편입 — [docs.spring.io 7.0 What's New](https://docs.spring.io/spring-security/reference/7.0/whats-new.html)
- Web: `MvcRequestMatcher`/`AntPathRequestMatcher` 제거(→`PathPatternRequestMatcher`), `LoginUrlAuthenticationEntryPoint` 상대 리다이렉트 기본; Crypto: Password4j 기반 Argon2/Bcrypt/Scrypt/Pbkdf2 인코더 — [docs.spring.io 7.0 What's New](https://docs.spring.io/spring-security/reference/7.0/whats-new.html)
- 7.0 What's New 페이지에 패스키/WebAuthn 항목 없음(내비게이션에 passkeys 문서 링크만 존재) — [docs.spring.io 7.0 What's New](https://docs.spring.io/spring-security/reference/7.0/whats-new.html)
- (배경) WebAuthn `webAuthn()` DSL은 6.4(Boot 3.4.0+)에서 도입, webauthn4j-core 의존; 6.5에서 JDBC 자격증명 영속화 — [Baeldung passkeys](https://www.baeldung.com/spring-security-integrate-passkeys); [OWASP Stuttgart 2025-06-03 슬라이드](https://owasp.org/www-chapter-stuttgart/assets/slides/2025-06-03_What_is_new_in_spring_security.pdf); [docs 6.5 passkeys](https://docs.spring.io/spring-security/reference/6.5-SNAPSHOT/servlet/authentication/passkeys.html)
- CVE-2026-47841: WebAuthn relying-party에서 사용자 검증 우회; 영향 7.1.0, 7.0.0–7.0.6, 6.5.0–6.5.11, 6.4.0–6.4.18; WebAuthn 세션 데이터가 분산 세션 저장소에 직렬화될 때 발생 — [HeroDevs CVE-2026-47841](https://www.herodevs.com/vulnerability-directory/cve-2026-47841); [OpenCVE](https://app.opencve.io/cve/CVE-2026-47841)
- 7.0 docs 스냅샷은 최신 안정 버전을 Spring Security 7.1.0으로 표기 — [docs.spring.io 7.0-SNAPSHOT](https://docs.spring.io/spring-security/reference/7.0-SNAPSHOT/whats-new.html)
- Spring I/O 2025 "Modern authentication demystified" 슬라이드 — [2025.springio.net](https://2025.springio.net/slides/modern-authentication-demystified-a-deep-dive-into-spring-securitys-latest-innovations-springio.pdf)

**Spring Session**
- Boot 4.0은 Spring Session 4.0 관리; Hazelcast/MongoDB 세션 지원 제거; `spring.session.redis.*` → `spring.session.data.redis.*` — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Spring Session은 기본 Java 직렬화; `springSessionDefaultRedisSerializer` 빈으로 교체(예: `GenericJackson2JsonRedisSerializer`); 만료 세션 정리는 Redis Keyspace Events 의존 — [docs.spring.io Spring Session 4.0 Redis](https://docs.spring.io/spring-session/reference/4.0/configuration/redis.html)
- 4.0 docs가 최신 안정 버전을 4.1.0으로, 4.2 스냅샷은 4.1.1로 표기 — [docs.spring.io 4.2 redis](https://docs.spring.io/spring-session/reference/4.2/configuration/redis.html)

**Spring AI**
- 2.0.0 GA 2026-06-12, Boot 4.1 + Framework 7 기반, JSpecify, Jackson 3; 코어는 OpenAI/Anthropic/Google GenAI(벤더 SDK), 나머지는 별도 저장소; `ToolCallingAdvisor` 자동 등록; MCP 공식 Java SDK·streamable HTTP — [spring.io 2026-06-12](https://spring.io/blog/2026/06/12/spring-ai-2-0-0-GA-available-now/)
- 2.0.0-M2 2026-01-23, M8 2026-05-27 — [M2](https://spring.io/blog/2026/01/23/spring-ai-2-0-0-M2-available-now/); [M8](https://spring.io/blog/2026/05/27/spring-ai-2-0-0-M8-available-now/)

### Inferences
- Modulith 2.1은 여행노트의 "Modulith 채택" 근거를 강화한다: (a) 모듈 경계 검증 테스트(`ApplicationModules.verify()`)로 trip/share/user/weather 모듈 간 의존을 빌드에서 잡고, (b) 이벤트 퍼블리케이션 레지스트리(JDBC, 스키마 자동 생성)가 사실상 "Kafka 없는 아웃박스"라 "여행 복제 완료 → 통계 갱신" 같은 모듈 간 비동기 작업을 Kafka 없이 신뢰성 있게 처리했다고 설명 가능, (c) Flyway 모듈별 마이그레이션을 2.1이 다듬었으므로 모듈별 `db/migration/<module>` 구조를 써볼 수 있다.
- 소셜 로그인만 있는 서비스에 패스키/MFA는 스코프 밖. 다만 Security 7의 `csrf.spa()`는 BFF 쿠키 패턴에서 Next.js가 CSRF 토큰을 읽는 방식(쿠키→헤더)에 바로 맞는 공식 DSL이므로 채택 가치가 높다.
- Spring Session + Redis를 세션 저장소로 쓰면 "세션 삭제 = 즉시 폐기"가 되어 JWT 폐기 문제를 피할 수 있고(섹션 9), Redis가 이미 스택에 있으므로 추가 비용이 없다. 단 기본 Java 직렬화 대신 JSON 직렬화를 명시한다(Jackson 3 전환 시 `GenericJackson2JsonRedisSerializer`의 Jackson 3 대응 이름은 미확인).
- Spring AI는 넣지 않는다. "AI 일정 추천" 같은 기능을 붙일 유혹이 있지만 면접에서 핵심(Modulith·인증·데이터 모델)을 흐린다.

### Gaps
- Spring Security 7.1 What's New 내용 미확인; Boot 4.1이 Security 7.1을 관리한다는 것은 3차 소스.
- Spring Data Redis의 Jackson 3용 JSON 시리얼라이저 클래스명(`GenericJackson2JsonRedisSerializer`의 후속) 미확인.
- 우아한형제들 기술블로그의 Spring Modulith/모듈러 모놀리스 글은 검색에서 나오지 않음.

---

## 4. 영속성: Spring Data JPA 4 vs jOOQ vs Exposed vs Kotlin JDSL vs QueryDSL, Hibernate 7, Flyway vs Liquibase, jsonb

### Takeaway
Boot 4.x는 Hibernate ORM 7.2(4.0)/7.4(4.1, 3차 소스) + Jakarta Persistence 3.2 + Spring Data 2025.1(JPA 4.0)이며 Hibernate 7은 detached 엔티티 처리와 레거시 API를 엄격하게 바꿨다. 원본 QueryDSL은 2021-07 이후 릴리스가 없고 Spring Data 공식 문서가 "OpenFeign 포크를 best-effort로 지원"이라고 명시하므로 QueryDSL은 피하고, 복잡 조회는 jOOQ(3.21.0, 2026-03-24; 3.21.9, 2026-09-24)를, 단순 CRUD는 Spring Data JPA를 쓰는 조합이 2026년의 보수적 정답이다. Kotlin JDSL 3.9.0과 Exposed 1.0(2026-01-23)도 Boot 4를 지원하지만 채용 시장 인지도는 jOOQ가 높다. Flyway는 Boot 4에서 전용 스타터가 필요하고 12.x(2026-01-28~)가 최신이며, PostgreSQL 단일 DB·SQL 파일 선호 조건에서 Liquibase 대비 기본 선택이다.

### Cited Findings
**Hibernate 7 / JPA 3.2 / Spring Data**
- Boot 4.0: Hibernate ORM 7.2, Jakarta Persistence 3.2, Spring Data 2025.1, HikariCP 7.0 — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- Hibernate 7.0 마이그레이션 가이드: Java 17 기준; JPA 3.2로 Criteria/EntityGraph 타입 파라미터 변경 및 `Nulls` vs `NullPrecedence` 이름 충돌; detached 엔티티 refresh/lock 불가(`IllegalArgumentException`, `hibernate.allow_refresh_detached_entity` 제거); cascade 연관이 detached 인스턴스를 참조하면 persist/flush 시 `EntityExistsException`(먼저 `merge()`); `@Id`/`@MapsId` 연관이 더 이상 PERSIST를 암묵 cascade하지 않음; `Session#save/update/saveOrUpdate/delete/load` 제거(→`persist/merge/remove/getReference`); `@Proxy`, `@Where`, `@OrderBy`(Hibernate), `@LazyToOne`, `@LazyCollection` 등 제거; 결과 타입 없는 모호한 `createQuery()` 거부; 불변 엔티티 update/delete 기본 예외; 네이티브 쿼리가 `java.time` 타입 기본 반환; `char`가 `varchar(1)` 기본 — [Hibernate 7.0 Migration Guide](https://docs.hibernate.org/orm/7.0/migration-guide/migration-guide.html)
- "Hibernate 7은 detached 엔티티를 영속성 컨텍스트에 재연결하는 것을 허용하지 않으므로 HTTP 경계를 넘어 엔티티를 merge하던 코드가 깨짐 → 변경은 DTO로" — [Stackademic](https://blog.stackademic.com/spring-boot-4-is-here-the-3-legacy-apis-you-must-delete-today-ab5c68d2e571) (2차)
- (배경) Spring Data 2025-01 마일스톤이 JPA 3.2(Hibernate 7.0 Beta3) 기준선으로 이동 — [spring.io 2025-01-17](https://spring.io/blog/2025/01/17/spring-data-2024-1-2-and-2024-0-8-released)
- Hibernate 포럼: Hibernate 8.0.0.Alpha1이 JPA 4 첫 마일스톤 구현(Spring Boot 4 + Kotlin 사용자 질문) — [discourse.hibernate.org](https://discourse.hibernate.org/t/spring-boot-4-kotlin-app-using-hibernate-preparing-for-jpa-4/12148)
- `hibernate-jpamodelgen` → `hibernate-processor` — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Spring 공식 Kotlin 튜토리얼이 Spring Data JPA → Spring Data JDBC로 교체됨 — [Deleuze](https://spring.io/blog/2025/12/18/next-level-kotlin-support-in-spring-boot-4/)

**QueryDSL (유지보수 불확실 — 플래그)**
- Spring Data 공식 문서: "Querydsl 유지보수가 느려져 커뮤니티가 OpenFeign 아래로 포크(github.com/OpenFeign/querydsl)했고, Spring Data는 포크를 best-effort로 지원" — [docs.spring.io Spring Data JPA core-extensions](https://docs.spring.io/spring-data/jpa/reference/repositories/core-extensions.html)
- 원본 QueryDSL 마지막 릴리스 2021-07, 마지막 커밋 2022-10; 포크로 전환 제안 이슈는 declined — [spring-data-jpa#3335](https://github.com/spring-projects/spring-data-jpa/issues/3335)
- OpenFeign 포크 7.0 릴리스 2025-06-09(hibernate-core 7.0.0.Beta1 동반), 7.1 2025-10-27(hibernate-core 7.0.9.Final, hibernate-validator 9.0.1.Final); 7.4, 7.5, 7.6 릴리스 존재(7.6은 hibernate-validator 9.1.3) — [mvnrepository 7.1 changes](https://badges.mvnrepository.com/artifact/io.github.openfeign.querydsl/querydsl-sql/7.1/changes); [OpenFeign/querydsl releases](https://github.com/OpenFeign/querydsl/releases); [newreleases 7.5](https://newreleases.io/project/github/OpenFeign/querydsl/release/7.5)
- 포크 메인테이너는 Feign과 QueryDSL 둘 다 전담하는 1인(velo) — [sponsors.ecosyste.ms/velo](https://sponsors.ecosyste.ms/accounts/velo)

**jOOQ**
- 3.20.0 2025-02-19(실험적 ClickHouse 다이얼렉트 등); 3.21.0 2026-03-24(Databricks·Spanner는 Enterprise, UDT 확장, 모든 컬럼 자동 embeddable, DDL 추가, `executeLarge`/`countLarge()`; Redacted columns·`Meta::dependencies`·equi join 진단은 상용 전용; Kotlin 의존성 1.9로 업그레이드; Jackson 3 지원 추가); 3.21.9 2026-09-24 패치 — [jooq.org/notes](https://jooq.org/notes)
- 3.19.39/3.20.20/3.21.9 패치 공지 2026-09-24 — [jooq-user 그룹](https://groups.google.com/g/jooq-user/c/YPktuwLUjwQ)
- 3.22 개발 라인: 윈도우 함수·CREATE TABLE 변경 — [jooq.org dev whats-new](https://www.jooq.org/doc/dev/manual/whats-new/)
- Wolt 엔지니어링: jOOQ+Kotlin 타입 안전 데이터 접근, Kotlin 코드 생성 설정 — [careers.wolt.com](https://careers.wolt.com/en/blog/engineering/type-safe-data-access-with-jooq-and-kotlin)
- jOOQ Kotlin SQL building 매뉴얼(3.22) — [jooq.org kotlin-sql-building](https://www.jooq.org/doc/3.22/manual/sql-building/kotlin-sql-building/)
- 인프런 "코드처럼 작성 SQL"(Kotlin + jOOQ) 강의 존재 — [inflearn](https://www.inflearn.com/course/코드처럼-작성-sql?cid=336592)

**Exposed**
- Exposed 1.0 2026-01-23 릴리스: R2DBC 지원, 다음 메이저까지 breaking change 없는 stable API, DSL/DAO 두 API, PostgreSQL 포함 지원, 0.61.0→1.0 마이그레이션 가이드, Ktor/Spring 샘플 — [JetBrains 블로그](https://blog.jetbrains.com/kotlin/2026/01/exposed-1-0-is-now-available/); [heise](https://heise.de/-11157447)

**Kotlin JDSL (LINE)**
- 3.6.0(10-14) JPA 3.2 지원(intersect 등); 3.7.0(01-10) Spring Data JPA 4.0/Boot 4 지원; 3.8.0(02-27) Spring Batch 6; 3.9.0(05-11, Latest) `spring-data-jpa-boot4` 프록시 빈으로 Boot 4 호환 — [line/kotlin-jdsl releases](https://github.com/line/kotlin-jdsl/releases) (페이지에 연도 미표기; 순서상 3.6.0=2025-10, 3.7.0~3.9.0=2026으로 추정)

**Flyway / Liquibase**
- Boot 4.0 관리 버전 Flyway 11.11, Liquibase 5.0; Boot 4에서 `spring-boot-starter-flyway` 명시 필요 — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes); [Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Flyway 12.0.0 2026-01-28(설정 파라미터 `plugin` 네임스페이스 제거, 라이선스 permit 환경변수 `FLYWAY_OFFLINE_PERMIT_PATH`로 변경); 12.1.0 2026-03-09; 12.4.0 2026-04-14(pg_stat_statements 호환 개선); 12.8.0(API 사용자가 Redgate 에디션 인식을 위해 Licensing 모듈 필요); 12.11.0 2026-07-09(PostgreSQL `disable-constraints-for-static-data`) — [componentsource 12.0.0](https://www.componentsource.com/product/flyway/releases/2945096); [12.8.0](https://www.componentsource.com/ko/product/flyway/releases/2965701); [12.11.0](https://www.componentsource.com/product/flyway/releases/2972431)
- 2026 비교(PostgreSQL 18에서 테스트): "기본은 Flyway, 롤백·멀티 DB 추상화가 필요하면 Liquibase" — [stevenpg.com](https://stevenpg.com/posts/flyway-vs-liquibase-2026/) (개인 블로그); Bytebase 비교(경쟁사) — [bytebase](https://www.bytebase.com/blog/flyway-vs-liquibase)
- (배경) Flyway V10부터 Community 사용자에 DB 하위 호환 도입 — [Redgate 블로그](https://www.red-gate.com/blog/database-devops/why-every-user-can-now-fly-first-class-with-flyway)
- Spring Modulith 2.1: 마이그레이션 없는 모듈에 대한 Flyway 실행 회피(#1684) — [Modulith releases](https://github.com/spring-projects/spring-modulith/releases)

**jsonb / PostgreSQL**
- (배경, Hibernate 6) `@JdbcTypeCode(SqlTypes.JSON)`로 내장 JSON 매핑; 클래스패스의 JSON 라이브러리 자동 감지, `hibernate.type.json_format_mapper`로 재정의; `columnDefinition = "jsonb"` — [Thorben Janssen](https://thorben-janssen.com/?p=3224); [Hibernate 6.6 SqlTypes javadoc](https://docs.jboss.org/hibernate/orm/6.6/javadocs/org/hibernate/type/SqlTypes.html)
- Hibernate 7.0 마이그레이션 가이드에는 JSON/jsonb 매핑 변경 언급 없음(배열 타입이 MySQL/MariaDB에서 JSON_ARRAY로 바뀌는 것만) — [Hibernate 7.0 Migration Guide](https://docs.hibernate.org/orm/7.0/migration-guide/migration-guide.html)
- PostgreSQL 18 2025-09-25 릴리스: `uuidv7()` 내장(RFC 9562, 타임스탬프 정렬), 비동기 I/O로 스토리지 읽기 최대 3배, 가상 생성 컬럼 기본, OAuth 2.0 인증, 시간 제약(WITHOUT OVERLAPS) — [postgresql.org 릴리스](https://postgresql.org/about/news/postgresql-18-released-3142/); [Bytebase PG18 개발자 관점](https://www.bytebase.com/blog/what-is-new-in-postgres-18-for-developer/)

### Inferences
- 추천 조합: Spring Data JPA(Hibernate 7.x)로 애그리거트 CRUD + jOOQ 3.21로 "공유 링크 조회(여행+일정+완료 체크 조인)", "복제" 같은 읽기/벌크 쿼리. jOOQ OSS 에디션은 PostgreSQL을 지원(상용 전용은 Databricks/Spanner/Redacted 등)하므로 비용 없음. 두 라이브러리를 모두 쓰는 이유를 "JPA는 쓰기 모델, jOOQ는 읽기 모델" 식으로 설명하면 CQRS-lite 서사가 된다.
- QueryDSL은 2026년에 "원본 사망 + 1인 유지 포크 + Spring Data best-effort"라는 세 가지 리스크가 겹쳐 이력서에서 오히려 감점 요인이 될 수 있다. 한국 채용 시장에서 여전히 QueryDSL을 묻는 경우가 많으므로, "왜 안 썼는지"를 Spring Data 문서 문구로 답할 수 있게 준비.
- Hibernate 7의 detached 엔티티 엄격화는 "컨트롤러에 엔티티를 노출하지 않고 DTO/커맨드로 받는다"는 설계 원칙과 맞물려 자연스럽게 지켜진다. Kotlin 엔티티는 `allopen`/`noarg` 플러그인(배경)이 여전히 필요하다.
- jsonb는 "일정 항목의 유연한 메타데이터(위치, 메모, 외부 링크)" 정도에 한정해 `@JdbcTypeCode(SqlTypes.JSON)` + Flyway에서 `jsonb` 컬럼 선언. Hibernate 7에서 JSON 매퍼가 Jackson 3를 감지하는지 확인 필요(gap).
- PK는 PostgreSQL 18의 `uuidv7()` 또는 앱 레벨 UUIDv7을 써서 공유 링크 ID(비추측성)와 인덱스 지역성을 동시에 얻는 것이 2025~2026의 모범 사례.
- Flyway 선택 근거: 단일 PostgreSQL, SQL-first, Boot 4 스타터 지원, Modulith 2.1의 모듈별 마이그레이션 개선. Liquibase는 롤백 자동화·멀티 DB가 필요 없으므로 제외.

### Gaps
- Hibernate 7.x에서 `SqlTypes.JSON`이 Jackson 3(`tools.jackson`)를 자동 감지하는지, Boot 4의 `JsonMapper` 빈을 쓰는지 1차 소스로 확인하지 못함.
- Boot 4.1이 관리하는 Hibernate 정확 버전(7.4 주장)은 3차 소스.
- Kotlin JDSL 릴리스 연도는 GitHub 페이지에 표기되지 않아 추정.
- jOOQ OSS 에디션의 PostgreSQL 버전 지원 범위(18 포함 여부)는 notes 페이지 첫 10만자에서 확인 불가.
- Flyway 12.x Community 에디션의 PostgreSQL 18 공식 지원 여부 미확인.
- 카카오페이·토스의 jOOQ 글은 검색으로 확인되지 않음.

---

## 5. API 계약: springdoc-openapi 3, OpenAPI 3.1, Spring REST Docs, 계약 테스트, TypeScript 클라이언트 생성

### Takeaway
Boot 4에는 springdoc-openapi v3 라인(3.0.x → 3.1.0은 Boot 4.1.0 + swagger-core 2.2.52)을 쓰며, Scalar UI 지원이 추가됐다. 프론트(Next.js) 클라이언트는 `@hey-api/openapi-ts`(OpenAPI 3.0/3.1 지원)로 생성하는 것이 2026년의 표준 경로이고, 구 `openapi-typescript-codegen`은 비권장이다. springdoc 3.x의 OpenAPI 3.1 출력 여부는 이번 검색에서 1차 소스로 확인하지 못했다.

### Cited Findings
- Spring Boot 4 ↔ springdoc v3 계열 매핑(아티팩트명 `springdoc-openapi-starter-webmvc-ui` 유지), Boot 3 ↔ v2 — [issoh.co.jp 정리](https://www.issoh.co.jp/tech/details/3749/) (2차, 일본어)
- springdoc 3.0.1: Scalar 지원, 정적 리소스 서빙 추가 — [KeycloakSecurity Dependabot PR](https://github.com/dschadow/KeycloakSecurity/pull/147)
- springdoc v3.1.0: Spring Boot 4.1.0, swagger-core 2.2.52로 업그레이드 — [newreleases springdoc v3.1.0](https://newreleases.io/project/github/springdoc/springdoc-openapi/release/v3.1.0)
- Spring I/O 2026 세션 "OpenAPI and Spring Boot 4: what's new"(springdoc의 Scalar 지원 등) — [2026.springio.net](https://2026.springio.net/sessions/openapi-and-spring-boot-4-whats-new/)
- Framework 7의 API 버저닝(섹션 1 참조) — [InfoQ](https://www.infoq.com/news/2025/11/spring-7-spring-boot-4)
- Boot 4의 `RestTestClient` + `@AutoConfigureRestTestClient`(통합 테스트에서 HTTP 계약 검증) — [Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- `@hey-api/openapi-ts`: OpenAPI 2.0/3.0/3.1 지원, JSON/YAML 입력, Fetch/Axios/Angular/Node/XHR 클라이언트 — [hey-api/openapi-ts](https://redirect.github.com/hey-api/openapi-ts)
- `openapi-typescript-codegen`은 더 이상 유지보수되지 않으며 README가 `@hey-api/openapi-ts`로 이전 요청 — [yarnpkg openapi-typescript-codegen](https://classic.yarnpkg.com/en/package/openapi-typescript-codegen)
- 2026년 실제 프로젝트(Jungfraujoch)가 구 생성기를 `@hey-api/openapi-ts`(fetch client + typescript + sdk 플러그인)로 교체, enum은 `mode: 'javascript'`로 const 객체 생성 — [gitea.psi.ch client.gen.ts](https://gitea.psi.ch/mx/Jungfraujoch/src/commit/237de5a0fca548daa0f2acdb42c7a4dd997b1fdb/frontend/src/client/client.gen.ts)
- Boot 4.0 Jackson 3는 날짜를 ISO-8601 문자열로 기본 직렬화 — [Kellton](https://www.kellton.com/kellton-tech-blog/spring-boot-4-migration-guide) (2차)

### Inferences
- 파이프라인: Kotlin 컨트롤러 → springdoc 3.1 `/v3/api-docs` → CI에서 JSON을 커밋 또는 아티팩트로 저장 → Next.js 레포에서 `@hey-api/openapi-ts`로 `fetch` 클라이언트 생성. 스펙 파일을 Git에 넣고 PR diff로 API 변경을 리뷰하는 것이 "계약 테스트"의 가장 가벼운 형태다.
- Kotlin의 널 가능성(`String?`)이 JSpecify 기반으로 스펙의 `required`/`nullable`에 정확히 반영되는지를 테스트로 고정해 두면(스냅샷 테스트) TypeScript 타입 신뢰도가 올라간다.
- Spring REST Docs는 테스트 주도 문서화라는 장점이 있지만 TypeScript 생성 파이프라인과 연결이 약해 이 서비스에는 springdoc가 맞다. Scalar UI는 Swagger UI보다 가볍고 최근 선호가 높아 springdoc 3.0.1+의 Scalar 지원을 켜면 된다.

### Gaps
- springdoc 3.x가 `openapi: 3.1.0` 문서를 기본 출력하는지 1차 소스 미확인(샘플 앱의 `/v3/api-docs`로 확인 필요).
- Spring REST Docs의 Boot 4 호환 버전, Spring Cloud Contract 상태는 조사하지 못함.
- springdoc 3.1.0 릴리스 날짜 미확인("3 hours ago"로만 표기).

---

## 6. 회복탄력성과 관측성: Micrometer Observation + OpenTelemetry, Resilience4j, 구조화 로깅, Actuator

### Takeaway
Boot 4.0의 공식 `spring-boot-starter-opentelemetry`(OTLP 메트릭+트레이스, 로그는 OTLP 지원하나 Logback appender는 수동)와 3.4부터의 구조화 로깅(`logging.structured.format.console=ecs|logstash|gelf`, 배경)이 기본 관측성 스택이다. 재시도·동시성 제한은 Framework 7 코어 `@Retryable`/`@ConcurrencyLimit`으로 충분하며, 서킷브레이커가 꼭 필요하면 Resilience4j 2.4.0(Boot 4 지원)을 쓴다.

### Cited Findings
- Boot 4.0 신규 `spring-boot-starter-opentelemetry`: OTLP 메트릭/트레이스, OpenTelemetry SDK 1.54.0 — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- Spring 공식 블로그(2025-11-18): Boot는 OTLP로 로그 전송도 지원하지만 Logback/Log4j2 appender를 기본 설치하지 않음 — [spring.io OpenTelemetry with Spring Boot](https://spring.io/blog/2025/11/18/opentelemetry-with-spring-boot/)
- 스타터는 OpenTelemetry API + Micrometer tracing bridge + OTLP exporter를 포함하고 커뮤니티 OTel 스타터와 별개이며 프로퍼티는 `otel.*`이 아니라 `management.*`; 4.0.1에 로그 export 핵심 수정 포함 — [danvega 2025-12-23](https://www.danvega.dev/blog/2025/12/23/opentelemetry-spring-boot); [NLJUG 가이드](https://nljug.org/?p=10928) (2차)
- Spring I/O 2026 "Demystifying observability": Boot 4.1에 Micrometer 경유 OTLP exemplar 지원 — [2026.springio.net 슬라이드](https://2026.springio.net/slides/demystifying-observability-for-spring-applications-springio26.pdf)
- Boot 4.0: Redis 관측이 `MicrometerCommandLatencyRecorder` 대신 `MicrometerTracing` 사용; `management.tracing.enabled` → `management.tracing.export.enabled`; Micrometer 1.16, Micrometer Tracing 1.6 — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- Boot 4.0 Actuator: liveness/readiness 프로브 기본 활성; SSL 헬스에 `expiringChains` 추가 — [Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide); [Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- Boot 4.1: 관측성 업데이트(OpenTelemetry 지원 갱신), Log4j 파일 로테이션 — [spring.io 2026-06-10](https://spring.io/blog/2026/06/10/spring-boot-4/)
- (배경) Boot 3.4 구조화 로깅: `logging.structured.format.console=ecs`(ECS), `logstash`, `gelf`; 파일용 `logging.structured.format.file`; 커스텀 포맷 가능 — [spring.io 2024-08-23](https://spring.io/blog/2024/08/23/structured-logging-in-spring-boot-3-4)
- Framework 7 코어 resilience: `@Retryable`(기본 3회/1초), `@ConcurrencyLimit`, `@EnableResilientMethods`, Virtual Threads에서 특히 유용 — [docs.spring.io Resilience](https://docs.spring.io/spring-framework/reference/7.0/core/resilience.html); Spring I/O 2026 세션 슬라이드 — [core resilience features springio26](https://2026.springio.net/slides/core-resilience-features-in-spring-framework-7-springio26.pdf)
- Boot 4.0은 Spring Retry 의존성 관리를 제거(명시 버전 필요) — [Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Resilience4j v2.4.0(03-14, Latest): Spring Boot 4 / Spring Cloud 5 지원 추가, Boot 3 customizer 순서 수정, core에서 Kotlin stdlib 의존 제거, JDK 타깃 17 유지; v2.3.0(01-03): 가상 스레드·lock-free 변경, Clock 지원; v2.0.1 Boot 3 스타터 — [resilience4j releases](https://github.com/resilience4j/resilience4j/releases) (연도 미표기; 순서상 2.3.0=2026-01, 2.4.0=2026-03 추정); Boot 4 모듈 요청 이슈 — [resilience4j#2371](https://github.com/resilience4j/resilience4j/issues/2371)
- Boot 4.1 HTTP 클라이언트 SSRF 완화 `InetAddressFilter` — [spring.io 2026-06-10](https://spring.io/blog/2026/06/10/spring-boot-4/)

### Inferences
- Open-Meteo 프록시 한 곳이 유일한 외부 의존이라면 Resilience4j를 넣을 이유가 약하다. Framework 7 `@Retryable`(지수 백오프) + `@ConcurrencyLimit` + Redis 캐시(TTL)로 "외부 API 장애가 서비스 전체로 번지지 않는다"를 보여줄 수 있고, 면접에서 "서킷브레이커를 왜 안 넣었나"에 "코어 기능으로 충분했고 의존성 하나를 줄였다"로 답할 수 있다. 서킷브레이커 상태 전이를 꼭 보여주고 싶다면 Resilience4j 2.4.0 + `resilience4j-spring-boot3` 스타터.
- 관측성 최소 구성: `spring-boot-starter-opentelemetry` + 구조화 로깅(ECS) + Actuator 프로브(기본 활성) + 로컬 Grafana LGTM 컨테이너. 코루틴을 안 쓰면 컨텍스트 전파 설정이 필요 없어 단순해진다.
- 외부 OTel Java 에이전트보다 공식 스타터가 2026년의 Spring 권장 경로(프로퍼티 `management.*`로 통일).

### Gaps
- Resilience4j 릴리스 연도 미표기(추정). 2.4.0이 `resilience4j-spring-boot4` 아티팩트를 제공하는지, 아니면 boot3 스타터로 Boot 4를 지원하는지 미확인.
- 구조화(JSON) 로깅과 OTLP 로그 export가 함께 쓰일 때의 설정 조합은 공식 문서에서 확인하지 못함.
- OpenTelemetry Java 에이전트 최신 버전·Boot 4 호환 상태는 조사하지 않음.

---

## 7. 테스트: JUnit 6, Kotest, MockK, Testcontainers 2, ArchUnit, Modulith 테스트, 부하 테스트

### Takeaway
JUnit 6.0.0(2025-09-30, Java 17/Kotlin 2.2 최소, suspend 테스트 지원) → 6.1.0(2026-05-19), Testcontainers 2.0.0(2025-10-14, JUnit 4 제거·모듈명 `testcontainers-` 접두어), Kotest 6.2.x(KSP 기반, Gradle 플러그인 `io.kotest`), MockK 1.14.11(2026-05-29)이 2026년의 Kotlin 테스트 스택이다. Boot 4는 `@MockitoBean`과 기술별 테스트 스타터를 쓰며, Modulith 2.1이 슬라이스 테스트와 통합된 모듈 테스트를 제공한다.

### Cited Findings
- JUnit 6.0.0 GA 2025-09-30: Platform/Jupiter/Vintage 버전 통일, Java 17 최소, Kotlin 2.2 최소, Kotlin `suspend` 테스트 메서드, `CancellationToken` API와 fail-fast, 전 모듈 JSpecify, `junit-platform-runner`/`junit-platform-jfr` 제거, Vintage deprecated, FastCSV 채택 — [docs.junit.org 6.0.0](https://docs.junit.org/6.0.0/release-notes/); [InfoQ 2025-10](https://www.infoq.com/news/2025/10/junit6-java17-kotlin)
- 6.0.2 2026-01-06, 6.0.3 2026-02-15; 6.1.0 2026-05-19; 최신 안정 6.1.3 — [docs.junit.org 6.0.3](https://docs.junit.org/6.0.3/release-notes); [6.1.1 notes](https://docs.junit.org/6.1.1/release-notes/)
- Testcontainers Java 2.0.0 2025-10-14: JUnit 4 지원 제거, 모든 모듈에 `testcontainers-` 접두어, 컨테이너 클래스가 `org.testcontainers.<module>` 패키지로 이동(1.x 좌표 `org.testcontainers:mysql` 등은 2.x에서 해석 불가); 1.x 마지막 1.21.4(2025-12-15); 2.0.1에 R2DBC 컨테이너 클래스 추가; 최신 2.0.5(2026-04-20) — [issoh.co.jp 정리](https://www.issoh.co.jp/tech/details/4629/) (2차, 일본어; 단일 소스); [mvnrepository 2.0.1](https://mvnrepository.com/artifact/com.github.testcontainers/testcontainers-java/2.0.1)
- Boot 4.0은 Testcontainers 2.0, Mockito 5.20 관리; Testcontainers 참조 문서는 컨테이너를 Spring 빈으로 선언하는 방식 설명 — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes); [docs.spring.io 4.0 testcontainers](https://docs.spring.io/spring-boot/4.0/reference/testing/testcontainers.html)
- Boot 4 테스트 변경: `@MockitoBean`/`@MockitoSpyBean`, `@AutoConfigureMockMvc` 필요, `RestTestClient`, 기술별 `spring-boot-starter-<tech>-test`, Spock 통합 제거 — [Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Boot 4.1.0-M1: 웹 서버가 필요한 슬라이스 테스트용 `@AutoConfigureWebServer` — [4.1.0-M1](https://spring.io/blog/2026/01/22/spring-boot-4-1-0-M1-available-now/)
- Kotest 6.x: 6.0에서 Gradle 플러그인이 `io.kotest`로 개명, 컴파일러 플러그인이 KSP 기반으로 교체 — [kotest.io 6.1 project-setup](https://kotest.io/docs/6.1/framework/project-setup.html); 릴리스: 6.1.9(03-24, Gradle 9.4 `--tests` 필터 변경), 6.1.10(03-30, AGP 9+), 6.1.11(04-04), 6.2.0(06-15, KSP가 abstract/sealed spec 처리), 6.2.4(08-11, Koin 모듈 팩토리, "spring extension improvements", kotlinx-datetime 0.8.0), 6.2.5(09-10), 6.2.6(10-14, Gradle 플러그인과 코어 동시 릴리스, `TestCoroutineInterceptor` 코루틴 컨텍스트 전파) — [kotest releases](https://github.com/kotest/kotest/releases) (연도 미표기; 2026으로 추정)
- MockK 1.14.0 2025-04-09, 1.14.2 2025-04-29, 1.14.6 2025-10, 1.14.7 2025-12, 1.14.9 2026-01-26, 1.14.11 2026-05-29(`@InjectMockKs` 수정, context parameters 지원 모듈) — [klibs.io mockk-context-parameters](https://klibs.io/package/io.mockk/mockk-context-parameters); [mvnrepository mockk-jvm](https://badges.mvnrepository.com/artifact/io.mockk/mockk-jvm); [CERN Nexus 1.14.0](https://nexus.web.cern.ch/nexus/content/groups/public/io/mockk/mockk-core-jvm/1.14.0)
- Spring Modulith 2.1: Boot 슬라이스 테스트와 동작하는 모듈 테스트(GH-1537), `PublishedEvents`/`Scenario`가 모든 스레드 이벤트를 봄 — [spring.io 2026-06-11](https://spring.io/blog/2026/06/11/spring-modulith-2-1-ga-2-0-7-and-1-4-12-released/)
- Modulith `ApplicationModules` 모델로 구조 검증 — [spring.io/projects/spring-modulith](https://spring.io/projects/spring-modulith)

### Inferences
- 스택 추천: JUnit 6.1 + Kotlin test(또는 Kotest 6.2 assertions만) + MockK 1.14 + Testcontainers 2.0(PostgreSQL 18, Redis/Valkey) + Modulith `ApplicationModules.verify()`(ArchUnit은 Modulith가 내부적으로 쓰므로 별도 규칙이 필요할 때만). Kotest 런너까지 쓰면 Spring 슬라이스 테스트와의 마찰(KSP 설정, `@MockitoBean` 조합)이 늘어나므로 JUnit 6 Jupiter 런너 + Kotest/strikt 어서션 정도가 안전.
- Testcontainers 2.0의 좌표 변경은 튜토리얼 대부분과 다르므로 `org.testcontainers:testcontainers-postgresql`처럼 새 좌표를 써야 한다(정확 좌표는 공식 문서 확인 필요).
- Modulith 2.1의 `@ApplicationModuleTest` + 슬라이스 통합으로 "모듈별 테스트가 다른 모듈 컨텍스트를 안 띄운다"를 측정(테스트 시간)해 보여줄 수 있다.
- 부하 테스트는 k6 스크립트 하나로 공유 링크 조회 p95를 측정하는 정도가 적정(조사 범위 밖, 아래 gap).

### Gaps
- ArchUnit 최신 버전/릴리스, k6·Gatling 2025~2026 버전은 조사하지 않음.
- Testcontainers 2.0.0 날짜는 일본어 블로그 단일 소스; 공식 릴리스 노트 미확인.
- Kotest 6.0.0 날짜·Kotlin 최소 버전·Spring 확장(`kotest-extensions-spring`)의 Boot 4 호환 상태 미확인.
- MockK와 Kotlin 2.2/2.3 호환성에 대한 공식 언급 없음(사실상 호환이나 소스 없음).

---

## 8. 빌드/배포: Gradle 9 Kotlin DSL, GraalVM native, CDS/AOT cache(Leyden), Buildpacks, Docker

### Takeaway
Gradle 9.0.0(2025-07-31, Java 17+, Kotlin 2, configuration cache 선호, SemVer)이 Boot 4와 Kotlin 2.3 모두에서 지원되며, 시작 시간 최적화는 GraalVM native(Boot 4는 GraalVM 25+ 필요)보다 JDK 24+의 AOT cache(JEP 483, Spring 공식 권장)가 코드 변경 없이 얻는 2026년의 실용 경로다.

### Cited Findings
- Gradle 9.0.0 2025-07-31: `.kts` 스크립트 재컴파일을 Kotlin ABI 핑거프린팅으로 회피, Configuration Cache를 선호 실행 모드로, Java 17+ 필요, Kotlin 2·Groovy 4, SemVer 채택 — [docs.gradle.org 9.0.0 release notes](https://docs.gradle.org/9.0.0/release-notes.html)
- Boot 4.0은 Gradle 9 지원(8.14+도 지원); CycloneDX Gradle 플러그인 최소 3.0.0 — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes); [Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Kotlin 2.3.0이 Gradle 9.0 호환, 생성 소스 등록 API 추가 — [JetBrains 블로그](https://blog.jetbrains.com/kotlin/2025/12/kotlin-2-3-0-released/)
- Kotest 6.1.9가 Gradle 9.4의 `--tests` 필터 변경 반영(Gradle 9.4 존재) — [kotest releases](https://github.com/kotest/kotest/releases)
- Boot 4.0 native image는 GraalVM 25 이상 필요(GraalVM Community 25) — [docs.spring.io 4.0 system requirements](https://docs.spring.io/spring-boot/4.0/system-requirements.html); [Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- JEP 483(JDK 24, Project Leyden): CDS를 확장해 로드·링크된 클래스를 "AOT cache"로 저장, Spring PetClinic 최대 40% 빠른 시작, 코드 변경 불필요; 학습 실행(`-XX:AOTMode=record` → `create` → `-XX:AOTCache`) — [InfoQ 2025-03](https://www.infoq.com/news/2025/03/java-24-leyden-ships)
- Spring Framework 문서: CDS와 AOT cache 모두 지원하며 JVM이 지원하면(Java 24+) AOT cache 권장; 캐시는 애플리케이션 클래스패스에 맞춰 생성(배포 인스턴스 또는 패키징 시 학습 실행); Boot의 실행 가능 JAR 언팩 지원이 AOT cache/CDS의 클래스 로딩 요구를 충족 — [docs.spring.io AOT cache](https://docs.spring.io/spring-framework/reference/integration/aot-cache.html)
- JDK 25: JEP 514 AOT Command-Line Ergonomics, JEP 515 AOT Method Profiling, JEP 519 Compact Object Headers — [openjdk JDK 25](https://openjdk.org/projects/jdk/25/)
- Boot 4.0: 클래식 uber-jar 로더 제거, 내장 실행 스크립트 제거(`java -jar`는 유지), Maven optional 의존성은 uber jar에서 제외 — [Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- Spring Boot GraalVM 위키(2025-10 수정): Groovy 미지원 등 일반 제약, Kotlin 특유 제약 없음 — [spring-boot wiki GraalVM](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-with-GraalVM/Spring-Boot-Config-Data-Migration-Guide)

### Inferences
- 배포 이미지: Java 25 런타임 + 레이어드 JAR 언팩 + 빌드 단계에서 AOT cache 학습 실행(`-XX:AOTMode=record/create`) → 컨테이너 시작 1~2초대. Boot 4 Buildpacks(`bootBuildImage`)로도 가능하지만 AOT cache 학습 단계를 넣으려면 Dockerfile 멀티스테이지가 더 설명하기 쉽다.
- GraalVM native는 Kotlin + Hibernate + jOOQ 조합에서 리플렉션 힌트 비용이 크고, B2C 웹 API는 cold start가 치명적이지 않으므로 "검토했으나 AOT cache로 충분"이 합리적 결론. 이력서에는 "JEP 483 AOT cache로 시작 시간 N% 단축"처럼 측정값을 쓴다.
- Gradle 9 + Kotlin DSL + version catalog(`libs.versions.toml`) + configuration cache 활성이 2026년 표준 빌드 설정.

### Gaps
- Buildpacks(Paketo)의 Java 25/AOT cache 지원 현황, Boot 4 `bootBuildImage` 변경점은 조사하지 않음.
- GraalVM 25 + Kotlin 2.3 native 빌드의 실제 제약(kotlin-reflect, 코루틴) 사례 미확인.
- Gradle 9.x 최신 패치 버전(9.4 이상?) 미확인.

---

## 9. 인증: 카카오/구글 OAuth2, BFF로 `__Host-` httpOnly 쿠키, 세션 폐기

### Takeaway
Spring Security 7 `oauth2Login()`에 카카오를 수동 provider로 등록(`client-authentication-method: client_secret_post`)하고, 토큰은 서버(Redis 세션)에만 두고 브라우저에는 HttpOnly+Secure+SameSite 세션 쿠키만 주는 BFF 패턴이 2025~2026의 권장 구조다. 세션을 서버에 두면 "세션 삭제 = 즉시 폐기"가 되어 JWT 폐기 문제가 사라지며, Security 7의 `csrf.spa()`가 SPA CSRF를 공식 지원한다. `__Host-` 접두어 자체에 대한 Spring 전용 소스는 찾지 못했다.

### Cited Findings
- BFF 패턴(Auth0): 세션 쿠키는 Secure+HttpOnly 필수, 토큰은 서버 측 저장 또는 암호화된 쿠키 — [auth0.com BFF](https://auth0.com/blog/the-backend-for-frontend-pattern-bff/)
- Baeldung(Spring Cloud Gateway BFF): 토큰이 백엔드를 떠나지 않으면 BFF의 사용자 세션 삭제로 즉시 접근 폐기 가능, 브라우저로 보낸 JWT로는 불가능; confidential OAuth2 클라이언트 + TokenRelay; SPA와 BFF가 같은 origin이 되도록 리버스 프록시 권장; Next.js/Angular/Vue 예제 — [baeldung spring-cloud-gateway-bff-oauth2](https://www.baeldung.com/spring-cloud-gateway-bff-oauth2)
- 예제 프로젝트: 토큰은 Redis/메모리 저장, 브라우저는 세션 ID만 담은 HttpOnly 쿠키, SameSite=Lax로 CSRF 완화 — [mintlify sgivu bff-pattern](https://www.mintlify.com/stevenrq/sgivu/security/bff-pattern); [michaelvl/oidc-oauth2-bff](https://github.com/michaelvl/oidc-oauth2-bff)
- 대안 아키텍처: Next.js + Auth.js가 OAuth 클라이언트가 되고 Spring은 stateless 리소스 서버(Spring Security 6.x + Next.js 16) — [rabinarayanpatra.com](https://www.rabinarayanpatra.com/blogs/full-stack-social-identity-spring-nextjs) (개인 블로그)
- Duende(2026-04-14) "The Cookie Apocalypse Already Happened": 서드파티 쿠키 차단 맥락에서 BFF 논의 — [duendesoftware.com](https://duendesoftware.com/blog/20260414-the-cookie-apocalypse-already-happened)
- Spring Security 7: SPA CSRF `http.csrf((csrf) -> csrf.spa())`; 비밀번호 그랜트 제거; `PathPatternRequestMatcher`로 통일; OAuth2 스타터명 `spring-boot-starter-security-oauth2-client` — [docs.spring.io 7.0 What's New](https://docs.spring.io/spring-security/reference/7.0/whats-new.html); [Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- 카카오는 Google/Facebook/GitHub처럼 내장 provider가 아니라 수동 설정 필요 — [velog 소셜 로그인](https://velog.io/@on-n-on-turtle/소셜-로그인) (개인 블로그, 2024)
- 카카오 `invalid_token_response` 401 "[no body]" 오류는 클라이언트 인증 방식 때문이며 `client-authentication-method: client_secret_post`(Spring Security 6+)로 해결; 구 버전은 `post` — [velog 카카오 OAuth2 오류](https://velog.io/@zosungwoo/Spring-Boot-카카오-OAuth2-로그인-오류-1.-authorizationrequestnotfound-2.-invalidtokenresponse) (2024)
- `authorization_request_not_found`는 카카오 콘솔(127.0.0.1)과 앱 설정(localhost)의 redirect URI 불일치가 원인 — [velog 카카오 OAuth2 오류](https://velog.io/@zosungwoo/Spring-Boot-카카오-OAuth2-로그인-오류-1.-authorizationrequestnotfound-2.-invalidtokenresponse)
- 카카오 devtalk: client_secret 옵션이 켜져 있으면 `client_secret` 파라미터 누락 시 KOE010 — [devtalk.kakao.com](https://devtalk.kakao.com/t/spring-security-oauth2-401-no-body/127960)
- Spring Session Redis: 세션 만료는 Keyspace Events 의존, 직렬화는 기본 Java 직렬화(교체 권장) — [docs.spring.io Spring Session 4.0 Redis](https://docs.spring.io/spring-session/reference/4.0/configuration/redis.html)
- CVE-2026-47841은 WebAuthn + 분산 세션 저장소 조합에만 해당 — [HeroDevs](https://www.herodevs.com/vulnerability-directory/cve-2026-47841)

### Inferences
- 여행노트 설계안이 "JWT in `__Host-` httpOnly cookie via BFF"라면, 2026년 소스가 수렴하는 방향은 두 가지 중 하나다: (a) 쿠키에 불투명 세션 ID만 두고 Spring Session(Redis)에 사용자/토큰을 저장(즉시 폐기, 로그아웃-모든-기기 구현 쉬움, Redis 이미 보유), (b) 자체 서명 JWT를 쿠키에 두되 Redis에 `jti` 블랙리스트/세션 버전을 둬 폐기. (a)가 코드가 적고 Baeldung·Auth0 문구로 근거 제시가 쉬우며, 면접에서 "왜 JWT가 아닌가"를 "폐기 가능성과 BFF 패턴의 본질"로 답할 수 있다. (b)는 "stateless JWT를 써봤다"는 이력서 키워드에는 유리하나 폐기 로직이 추가된다.
- `__Host-` 접두어(Secure, Path=/, Domain 없음 강제)는 브라우저 표준이라 Spring 쪽은 `server.servlet.session.cookie.name=__Host-SESSION` + `secure=true` + `path=/`로 충분하다(표준 근거는 조사 범위 밖, gap).
- Next.js와 Spring이 다른 origin(예: Vercel vs 자체 서버)이면 SameSite=Lax 쿠키가 API 호출에 안 붙으므로, Next.js rewrites 또는 리버스 프록시로 same-origin(`/api/*`)을 만든다는 Baeldung 권고를 따른다.
- 카카오 provider 설정은 Boot 4에서도 `spring.security.oauth2.client.registration/provider` 구조가 동일하며(검색에서 Boot 4 변경 없음), `client_secret_post`와 redirect URI 정확 일치가 가장 흔한 함정.

### Gaps
- `__Host-` 쿠키 접두어와 Spring Session의 조합에 대한 1차 소스 없음(RFC 6265bis/MDN 미조회).
- Boot 4/Security 7 기준 카카오 로그인 Kotlin 예제는 찾지 못함(2024 Boot 3 예제만).
- Spring Security 7에서 `oauth2Login()` 성공 후 Next.js로 리다이렉트하는 공식 가이드·`SecurityContextRepository` 변경 여부 미확인.

---

## 10. 캐싱/큐: Redis 8 vs Valkey, Spring Cache, Lettuce, Kafka/아웃박스의 적정성

### Takeaway
Redis 8(2025-05, AGPLv3 옵션 추가)과 Valkey(BSD-3, 9.0은 2025-10)는 프로토콜 호환이라 Spring Data Redis + Lettuce로 둘 다 쓸 수 있고 Valkey용 공식 Spring Data Valkey도 GA다. 이 규모에서 Kafka는 과하며, 모듈 간 비동기는 Spring Modulith의 이벤트 퍼블리케이션 레지스트리(JDBC 아웃박스)로 처리하는 것이 "아웃박스 패턴을 이해했다"를 보여주면서 인프라를 늘리지 않는 길이다.

### Cited Findings
- Redis 8은 2025-05에 AGPLv3를 RSALv2/SSPLv1에 더한 세 번째 라이선스 옵션으로 추가; Valkey는 마지막 BSD 릴리스 Redis 7.2.4의 포크로 BSD-3-Clause와 중립 거버넌스 유지; RESP2/RESP3 호환; Redis 8은 search/JSON/vector/time-series를 코어에 번들, Valkey는 valkey-search/valkey-json 모듈 — [oneuptime Redis vs Valkey 2026-03-31](https://oneuptime.com/blog/post/2026-03-31-redis-redis-vs-valkey-understanding-the-fork/view); [techplained](https://www.techplained.com/valkey-vs-redis) (2차)
- Valkey 성능 주장(약 8% 처리량, 22% p99 개선)은 Percona 등의 벤치마크이며 독립 검증 아님 — [Percona](https://experience.percona.com/valkey-redis/valkey-vs-redis/performance-and-capabilities)
- Valkey 9.0.0: Multipath TCP, 클러스터 모드 멀티 DB, 해시 필드 만료, `DELIFEQ`, 2,000+ 노드/10억 rps 클러스터 스케일 — [LWN](https://lwn.net/Articles/1042851); [Aiven changelog](https://aiven.io/changelog/d0000912-2e85-43a0-8a73-4c2e8ed9e799); [remirepo 2025-10-17](https://blog.remirepo.net/post/2025/10/17/Valkey-version-9.0)
- Spring Data Valkey GA: Spring Data 템플릿/리포지토리 모델 유지, Valkey 프로젝트 공식 지원, Valkey GLIDE 클라이언트 선택 가능 — [valkey.io 블로그](https://valkey.io/blog/spring-data-valkey/)
- Boot 4.0: `spring.data.redis.masterreplica.nodes` 프로퍼티 신설, Redis 관측이 `MicrometerTracing`으로 — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)
- Boot 4.1에 `@RedisListener` 자동설정 + 기본 `RedisMessageListenerContainer` 추가 주장 — [CSDN](https://aicoding.csdn.net/6a5def2b662f9a54cb9153b5.html) (3차, 미검증)
- 아웃박스 패턴은 DB와 Kafka에 각각 쓰는 dual-write 문제(커밋 후 브로커 장애로 이벤트 유실)를 해결; 같은 트랜잭션에 아웃박스 테이블 기록 후 별도 프로세스가 전달 — [Confluent 강의](https://developer.confluent.io/courses/microservices/the-transactional-outbox-pattern/); [designgurus](https://www.designgurus.io/blog/transactional-outbox-pattern)
- 모듈러 모놀리스에서 모듈별 아웃박스/인박스 적용 사례(ABP) — [abp.io](https://abp.io/community/articles/using-outboxinbox-pattern-for-reliable-event-handling-in-a-multimodule-monolithic-application-eurs9own)
- Clear Street의 첫 아웃박스 설계: 2PC는 느리고 복잡해 배제, 수동 프로세스/CDC/Kafka 커넥터 대안 검토 — [clearstreet.io](https://www.clearstreet.io/insights/transactional-outboxes)
- Spring Modulith 2.0의 핵심이 Event Publication Registry 개편; 2.1에서 JDBC 이벤트 퍼블리케이션 스키마 자동 생성 기본, Namastack/JobRunr 아웃박스 외부화 — [2.0 GA](https://spring.io/blog/2025/11/21/spring-modulith-2-0-ga-1-4-5-and-1-3-11-released/); [2.1 GA](https://spring.io/blog/2026/06/11/spring-modulith-2-1-ga-2-0-7-and-1-4-12-released/)
- Boot 4.0이 Kafka 4.1.0, Spring Kafka 4.0 관리(쓸 경우의 버전) — [Boot 4.0 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes)

### Inferences
- 캐시 용도(날씨 응답 TTL 캐시, 공유 링크 조회 캐시, 세션)에는 Redis 8이든 Valkey든 기능 차이가 없다. 라이선스 설명이 가능한 쪽(AGPL 의무 vs BSD)을 고르면 되고, 자체 호스팅이면 Valkey 9 + Lettuce가 "라이선스 리스크 없음"으로 설명이 깔끔하다. 관리형(AWS ElastiCache)은 Valkey 쪽으로 기울었다는 점도 언급 가치(소스 없음, 상식 수준).
- Spring Cache 추상화(`@Cacheable`) + Redis + TTL 설정, 날씨는 좌표/일자 키로 캐시해 Open-Meteo 호출을 줄이는 것이 핵심 캐시 서사.
- Kafka/RabbitMQ 도입은 "B2C 사이드 프로젝트 + 단일 배포 단위"에서는 운영 부담 대비 효과가 없다. 면접관이 "왜 Kafka를 안 썼나"를 물으면 Modulith의 `@ApplicationModuleListener` + JDBC 퍼블리케이션 레지스트리가 "트랜잭션 내 이벤트 기록 → 커밋 후 비동기 처리 → 실패 시 재전송"이라는 아웃박스의 본질을 그대로 구현한다고 답하면 된다. 반대로 Kafka를 넣고 토픽 1개만 쓰면 "이력서용 키워드"로 읽힐 위험이 크다(이 판단은 인용 소스가 아닌 추론).

### Gaps
- Lettuce의 Valkey 9 공식 호환 선언, Spring Data Redis 4.x가 Valkey를 공식 지원 범위에 넣었는지 미확인.
- "면접관이 Kafka/아웃박스를 과잉 설계로 보는지"에 대한 직접 소스(한국 채용 블로그·커뮤니티)는 찾지 못함.
- Redis 8의 정확한 GA 날짜와 2026년 최신 버전(8.2?) 미확인.
- Spring Cache + Jackson 3 직렬화 설정 변경 여부 미확인.

---

## 부록: 한 장 요약 — 2026-10 기준 추천 버전표

| 영역 | 선택 | 버전/날짜 | 근거 소스 |
|---|---|---|---|
| 런타임 | Java 25 LTS | 2025-09-16 GA | [openjdk](https://openjdk.org/projects/jdk/25/) |
| 언어 | Kotlin 2.3.x | 2.3.0 2025-12-16 | [JetBrains](https://blog.jetbrains.com/kotlin/2025/12/kotlin-2-3-0-released/) |
| 프레임워크 | Spring Boot 4.1.x / Framework 7.0.x | 4.1.0 2026-06-10, 4.1.1 2026-08-20 | [spring.io](https://spring.io/blog/2026/06/10/spring-boot-4/) |
| 모듈화 | Spring Modulith 2.1.x | 2.1 GA 2026-06-11 | [spring.io](https://spring.io/blog/2026/06/11/spring-modulith-2-1-ga-2-0-7-and-1-4-12-released/) |
| 보안 | Spring Security 7.x | 7.0 (Boot 4.0), 7.1 (Boot 4.1, 3차) | [docs.spring.io](https://docs.spring.io/spring-security/reference/7.0/whats-new.html) |
| ORM | Hibernate 7.2+ / Spring Data 2025.1 | Boot 4.0 관리 | [Boot 4.0 notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes) |
| 쿼리 | jOOQ 3.21.x | 3.21.0 2026-03-24, 3.21.9 2026-09-24 | [jooq.org/notes](https://jooq.org/notes) |
| 마이그레이션 | Flyway 11.11(Boot 관리) 또는 12.x | 12.0.0 2026-01-28 | [componentsource](https://www.componentsource.com/product/flyway/releases/2945096) |
| DB | PostgreSQL 18 | 2025-09-25 | [postgresql.org](https://postgresql.org/about/news/postgresql-18-released-3142/) |
| 캐시 | Valkey 9.x 또는 Redis 8 | Valkey 9.0 2025-10 | [LWN](https://lwn.net/Articles/1042851) |
| JSON | Jackson 3.0 (`tools.jackson`) | Boot 4.0 기본 | [Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide) |
| API 문서 | springdoc-openapi 3.1.x | Boot 4.1 대응 | [newreleases](https://newreleases.io/project/github/springdoc/springdoc-openapi/release/v3.1.0) |
| TS 클라이언트 | @hey-api/openapi-ts | OpenAPI 3.0/3.1 | [hey-api](https://redirect.github.com/hey-api/openapi-ts) |
| 관측성 | spring-boot-starter-opentelemetry + ECS 구조화 로깅 | OTel SDK 1.54.0 | [Boot 4.0 notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes) |
| 회복탄력성 | Framework 7 `@Retryable`/`@ConcurrencyLimit` (필요 시 Resilience4j 2.4.0) | 2.4.0 2026-03(추정) | [docs.spring.io](https://docs.spring.io/spring-framework/reference/7.0/core/resilience.html) |
| 테스트 | JUnit 6.1 + MockK 1.14.11 + Testcontainers 2.0.x (+Kotest 6.2 어서션) | JUnit 6.1.0 2026-05-19 | [docs.junit.org](https://docs.junit.org/6.1.1/release-notes/) |
| 빌드 | Gradle 9.x Kotlin DSL | 9.0.0 2025-07-31 | [docs.gradle.org](https://docs.gradle.org/9.0.0/release-notes.html) |
| 시작 최적화 | JDK AOT cache (JEP 483/514/515) | JDK 24+/25 | [docs.spring.io AOT cache](https://docs.spring.io/spring-framework/reference/integration/aot-cache.html) |
| 피할 것 | 원본 QueryDSL, Spring Retry(의존성 관리 제거), Undertow, `@MockBean`, Kafka(이 규모), 코루틴+R2DBC 전환 | — | 각 섹션 참조 |
