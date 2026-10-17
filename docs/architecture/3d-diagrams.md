# 3D 구성도 근거와 원본

2026-10-17, develop `aca775428281b4b7d7f0c3e581e93ca4c25c599f` 기준. PR #6은 병합됐지만 운영 배포는 아직 완료되지 않았다. 이 변경은 README용 이미지와 설명만 바꾼다.

## 원본 이미지와 생성 방법

| 용도 | 한국어 | English |
| --- | --- | --- |
| 현재 구현의 핵심 흐름 | [PNG](../assets/system-architecture-3d-ko.png) | [PNG](../assets/system-architecture-3d-en.png) |
| 배포 예정 제안 | [PNG](../assets/deployment-architecture-3d-ko.png) | [PNG](../assets/deployment-architecture-3d-en.png) |

네 장 모두 내장 `image_gen`으로 생성한 원본 래스터 PNG다. `imagegen`과 `draw-cute-3d-diagrams` 지침을 적용하고, 첫 한국어 시스템 그림을 나머지 그림의 스타일 기준으로 사용했다. [프롬프트](3d-diagram-prompts.json)에 네 장의 구체적인 입력 명세를 보존했다. CLI/API 모델 fallback이나 코드로 만든 대체 그림은 사용하지 않았다.

공식 로고를 참고 이미지로 넣고, 로고 자체를 새 3D 마스코트로 변형하지 않도록 지정했다. 입체감은 브라우저·서버·저장소·봉투 오브젝트에 주고 마크는 식별용 배지로 배치했다. Valkey와 메일은 일반 키·봉투 오브젝트이며 새 공식 마크를 만들지 않았다. Spring Boot는 기술명으로 표기하고 API에는 Kotlin 마크를 사용했다.

## 실제 코드에 대응하는 흐름

| 그림의 관계·상태 | 저장소 근거 |
| --- | --- |
| 브라우저 → Next.js → API, 결과는 역방향 | `apps/web/next.config.ts`, `apps/web/src/lib/api/client.ts`, `server-client.ts`의 같은 출처 rewrite·서버 요청 |
| API → PostgreSQL/PostGIS, 조회·저장 결과 | API `application.yml`, Flyway 마이그레이션, `trip/internal`의 JPA·jOOQ |
| API ↔ Valkey: 세션·요청 제한·날씨 캐시 | indexed Spring Session 설정, `SessionRevoker`, `RateLimiter`, `weather/internal/WeatherService.kt` |
| 기기에 남는 초안·편집 큐 | `apps/web/src/components/edit/useEditorQueue.ts`, `StopForm.tsx`, `lib/edit/queue.ts`의 localStorage |
| 로컬 SMTP/Mailpit, HTTPS 구현 대기 | `auth/internal/AuthMail.kt`, `MailTransport.kt`; 실제 `HttpsMailProvider` 어댑터 없음 |
| 제안: Vercel 웹 → Render API → Neon DB | `deploy/free/render.yaml`, Dockerfile, free profile의 pooled runtime/direct Flyway·TLS 설정. Blueprint 자동 배포는 off |
| Upstash는 검증 후보 | `deploy/free/README.md`의 native TCP/TLS와 실제 indexed session 호환성 검증 대기 |
| 현재 보호된 API 미연결 Preview | `TRIPNOTE_UI_PREVIEW` 분기와 기존 README 배포 상태 기록. 이 작업에서 새 배포 확인·생성은 하지 않음 |

현재 구현도는 핵심 흐름만 표시한다. 지도 타일의 브라우저 직접 호출, 날씨·유출 비밀번호 조회, Google OAuth 같은 외부 경로는 기존 본문과 코드에 남아 있으며 DB나 Next.js 내부로 옮긴 것으로 해석하지 않는다. 메일의 화살표는 이벤트 이후 발송 방향이며 수신·전달 성공을 보장하지 않는다.

제안도는 배포 예정 상태를 제목·자막·점선·프레임으로 표시하고, 현재 Preview는 별도 배너로 분리한다. Upstash 검증과 HTTPS 메일 구현은 완료로 표시하지 않는다. free profile은 HTTPS provider bean이 없으면 시작을 거부한다. DB 비밀값이 브라우저로 가지 않는 표기는 설계 경계이며 실제 브라우저 번들·네트워크·운영 로그 검증은 [후속 이슈 #7](https://github.com/hyunolike/trip-planner/issues/7)의 대상이다.

## 공식 시스템 구성 자료

검색한 공식 문서의 패턴을 코드와 대조했으며, 외부 서비스가 이미 연결됐다는 근거로 사용하지 않았다.

- [Next.js 외부 URL rewrite](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites): 같은 출처에서 외부 API로 요청을 전달하는 관계.
- [Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend): 화면의 서버 계층과 별도 데이터·API 계층 구분. 이 프로젝트의 구체적인 구현은 자체 rewrite/API 클라이언트를 기준으로 한다.
- [Render Web Services](https://render.com/docs/web-services): HTTP 서버/Docker 앱 배포 단위. 제안도의 Java API 실행 위치에 대응한다.
- [Neon Java/JDBC 연결](https://neon.com/docs/guides/java), [connection pooling](https://neon.com/docs/connect/connection-pooling): API 서버의 DB 연결, pooled runtime/direct migration의 구분.
- [Spring Session Redis 구성](https://docs.spring.io/spring-session/reference/configuration/redis.html): 세션 저장소·인덱스·이벤트가 있는 별도 상태 저장 역할.
- [Upstash Redis 호환성](https://upstash.com/docs/redis/overall/compatibility): Redis 호환 서비스를 제안할 근거이며 실제 앱 호환 완료의 증거는 아니다.

## 공식 로고 출처

아래 공식 페이지에서 원본을 확인하고 실제 파일을 열어 생성 참고로 사용했다. 기술 식별을 위한 표기이며 제휴·인증을 주장하지 않는다. 마크 권리는 각 소유자에게 있다.

| 기술 | 공식 자료 |
| --- | --- |
| Next.js / Vercel | [Geist Brands](https://vercel.com/geist/brands)의 공식 Next.js·Vercel SVG |
| Kotlin | [Kotlin brand assets](https://kotlinlang.org/docs/kotlin-brand-assets.html)의 공식 Kotlin icon PNG |
| PostgreSQL | [PostgreSQL 18 Press Kit](https://www.postgresql.org/about/press/presskit18/)의 Elephant PNG |
| Render | [Render 공식 홈페이지](https://render.com/) footer의 Brand Kit ZIP, black logomark |
| Neon | [Neon Brand Guidelines](https://neon.com/brand)의 color logomark SVG |
| Upstash | [Upstash Brand Assets](https://upstash.com/brand)의 공식 icon PNG |
| Spring Boot 텍스트 | [Spring trademark guidelines](https://spring.io/trademarks/)를 참고해 기술명만 사용 |

Vercel과 Next.js 이름·로고는 Vercel 및 계열사의 상표다. Kotlin, PostgreSQL, Render, Neon, Upstash 등의 마크도 각각의 권리자에게 속한다. 생성된 설명 그림은 해당 회사가 제작하거나 승인한 공식 자료가 아니다.

## 검수와 이전 도식

- 네 PNG를 실제로 열어 로고 식별, 한·영 텍스트, 글자 잘림·겹침, 노드 간 요청/결과 방향과 상태 표기를 확인했다.
- 현재 구현은 실선, 연결 전 제안은 점선으로 표시하고 민트 요청·파랑 결과를 시리즈 전체에서 유지했다.
- PNG signature, chunk CRC, 픽셀 크기, 파일 해시와 README 상대 경로·alt·언어 링크를 검사한다. 전체 그림은 1672×941 픽셀이고 앱 코드나 운영 설정은 변경하지 않는다.
- 이전 SVG 네 장과 `scripts/docs/render_architecture.py`는 과거 문서 근거·편집 가능한 자료로 보존한다. README에서는 새 PNG만 사용하며, 과거 검증 문서에 보존 이유를 연결했다. 이 스크립트가 현재 PNG를 재생성한다고 안내하지 않는다.

검증 결과: PNG 네 장 모두 1672×941, signature/chunk CRC/IEND 검사 통과. 문서 상대 파일 경로53개,
README alt 네 개와 언어 상호 링크, 프롬프트 JSON, `git diff --check` 통과.
애플리케이션 코드·배포 설정 변경이 없어 로컬 API/웹 전체 테스트와 서버 실행은 추가하지 않았다.
