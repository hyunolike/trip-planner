# 0001. 런타임 기준선: Spring Boot 4.1, Java 25, Kotlin 2.3, 가상 스레드

- 상태: 제안
- 날짜: 2026-10-16

## 맥락

여행노트 API는 새로 만드는 코드라 마이그레이션 비용이 없다. 2026년 10월 현재 Spring Boot 3.5는 2026-06-30에 OSS 지원이 끝났고, 4.0.x는 2026-12-31에 끝난다. 4.1.0은 2026-06-10에 나왔고 OSS 지원이 2027-06까지 이어진다. Java 25는 2025-09-16에 나온 LTS이고, Kotlin 2.3.0은 2025-12-16에 Java 25를 지원하며 나왔다.

워크로드는 블로킹 I/O가 대부분이다. 일정 조회와 저장은 PostgreSQL, 날씨는 Open-Meteo HTTP 호출이다. 사용자가 몰리는 시간대는 여행 당일 아침과 저녁이다.

## 결정

- Spring Boot 4.1.x, Spring Framework 7, Java 25, Kotlin 2.3.x로 시작한다. 버전은 `gradle/libs.versions.toml` 한 곳에 두고 Renovate로 갱신한다.
- 동시성은 Spring MVC와 가상 스레드로 처리한다. `spring.threads.virtual.enabled=true`.
- 가상 스레드를 켜면 병목이 스레드에서 DB 커넥션으로 옮겨가므로 Hikari 최대 풀 크기를 명시한다.
- 외부 호출(Open-Meteo)에는 Framework 7 코어의 `@ConcurrencyLimit`과 `@Retryable`을 붙인다.
- JSON은 Boot 4 기본인 Jackson 3를 쓴다. 패키지는 `tools.jackson`, 날짜는 ISO-8601 문자열이다.

## 고려한 대안

| 대안 | 기각 이유 |
| --- | --- |
| Spring Boot 3.5 | OSS 지원이 이미 끝났다. 새 프로젝트를 지원 종료 버전으로 시작할 이유가 없다. |
| Spring Boot 4.0.x | 두 달 뒤 지원이 끝난다. 4.1과 마이그레이션 차이는 작다. |
| Kotlin 코루틴 + WebFlux + R2DBC | JPA를 버리고 리액티브 드라이버로 바꿔야 한다. 가상 스레드로 같은 효과를 블로킹 코드 그대로 얻는다. |
| Resilience4j | 외부 의존이 Open-Meteo 하나다. 코어의 `@Retryable`과 `@ConcurrencyLimit`으로 충분하다. |
| GraalVM native image | Kotlin, Hibernate, jOOQ의 리플렉션 힌트 비용이 크다. 시작 시간은 JDK AOT cache로 먼저 줄인다. |

## 결과

- 좋은 점: 지원 기간이 가장 길고, 1년 안에 버전을 올릴 일이 없다. 가상 스레드로 코드는 동기식 그대로 둔다.
- 감수할 점: Boot 4와 Jackson 3를 다룬 블로그 자료가 아직 적다. Hibernate 7은 detached 엔티티 재부착을 막으므로 DTO와 커맨드 객체를 철저히 쓴다.

## 다시 볼 조건

- 스트리밍 응답처럼 가상 스레드로 풀리지 않는 워크로드가 생기면 WebFlux를 다시 검토한다.
- 외부 API가 둘 이상이 되고 서킷브레이커 상태를 대시보드에 보여야 하면 Resilience4j를 넣는다.

## 확인 필요

- Boot 4.1이 관리하는 Hibernate, Security, Kotlin의 정확한 버전은 Boot 4.1 Release Notes의 관리 의존성 표에서 확인한다.
