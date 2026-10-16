# 여행노트 API

Spring Boot 4.1 · Kotlin 2.3 · Java 25 · PostgreSQL 18 + PostGIS · Valkey. 결정 근거는 `docs/adr/`에 있다.

## 로컬 실행

Gradle은 JDK 21 이상에서 돌아야 한다(jOOQ 플러그인 요구). 이 프로젝트는 JDK 25를 쓴다. 로컬에서는 `JAVA_HOME`을 25 JDK로 지정한다.

```bash
docker compose up -d          # db, valkey, mailpit(메일 확인 http://localhost:8025)
TRIPNOTE_SEED_SAMPLES=true ./gradlew bootRun
```

## 테스트

```bash
./gradlew test                # Docker 필요(Testcontainers)
./gradlew check
```

## 계약과 생성 코드

- API를 바꾸면 `./gradlew test --tests com.tripnote.OpenApiContractTest -Dopenapi.write=true`로 `openapi.json`을 갱신해 함께 커밋한다. 키는 정렬해서 쓰므로 실행마다 결과가 같다.
- 마이그레이션을 바꾸면 compose의 db를 띄운 채 `./gradlew flywayClean flywayMigrate jooqCodegen`으로 `src/main/generated`를 갱신해 함께 커밋한다. CI가 같은 순서로 다시 생성해 차이를 검사한다.
- jOOQ 생성기는 PostGIS 객체(`spatial_ref_sys`, `geometry_columns` 등)를 제외하고, to-many 암묵 조인 경로를 만들지 않는다.
- 생성된 OpenAPI 버전: `3.1.0` (OpenAPI 3.1. `springdoc.api-docs.version`으로 고정).

## 운영 메모

- compose의 `db` 볼륨은 `/var/lib/postgresql`에 마운트한다(PostGIS 18 이미지의 디렉터리 구조). 이전 볼륨을 가진 개발자는 `docker compose down -v`로 지우고 다시 띄워야 한다.
- 메일 헬스 인디케이터는 끈다. 메일 서버가 잠시 죽어도 인스턴스가 비정상으로 판정되지 않게 하려는 것이다.
- 세션은 `spring.session.data.redis.*`로 Valkey에 저장한다. 인덱스를 켰고 네임스페이스는 `tripnote:session`이다.
- 세션 저장소가 CONFIG 명령을 막는 관리형 Valkey라면 `spring.session.data.redis.configure-action: none`을 지정하고, 키스페이스 알림(`notify-keyspace-events`)은 제공자 설정에서 켠다.
- 헬스 프로브: `/actuator/health/liveness`(프로세스 생존)와 `/actuator/health/readiness`(db, redis 포함, mail 제외)를 인증 없이 열어 둔다. 블루/그린 배포는 readiness가 UP이 된 뒤에 트래픽을 넘긴다. `server.shutdown: graceful`이라 종료 때 진행 중인 요청을 마무리한다.
- SMTP 연결, 읽기, 쓰기 타임아웃은 5초다. 메일 리스너가 트랜잭션 안에서 돌기 때문에 SMTP가 멈추면 DB 커넥션이 묶인다.
- `server.forward-headers-strategy: none`을 유지한다. 전달된 클라이언트 IP는 `TRIPNOTE_TRUSTED_PROXY_CIDRS`에 명시한 프록시에서 온 요청에만 사용하며 기본 신뢰 대상은 없다.
- 이메일 인증은 가입할 때 쓴 비밀번호가 필요하다: `POST /api/v1/auth/verify-email` 본문은 `{token, password}`다. 웹의 인증 화면이 비밀번호를 물어야 한다.

## CI

`.github/workflows/ci.yml`이 샘플 검증(Node), API 테스트(Gradle), jOOQ 생성 코드 차이를 검사한다. 액션은 전체 커밋 SHA로 고정하고 태그를 주석에 적는다.

## 모듈

| 모듈 | 공개 API | 하는 일 |
| --- | --- | --- |
| `common` | `ApiException`, `RateLimiter`, `TripnoteProperties` | 오류 응답, 레이트리밋, 설정 |
| `auth` | `SessionUser`, `SystemUsers` | 이메일 가입·인증·재설정, 구글 로그인, 세션, 탈퇴 |
| `trip` | `TripDocument` 등 응답 타입 | 샘플 적재, 일정 조회·편집, 복제 |

## 일정 편집과 공유

- `POST /api/v1/trips`는 선택적인 `travelers: [{label, emoji?}]`를 `content.travelers`에 저장한다.
- `PATCH /api/v1/trips/{tripId}`는 `version`과 제목, 시작일, 종료일, 공개 범위를 받는다. 삭제는 `DELETE /api/v1/trips/{tripId}?version=N`이다. 소유자만 사용할 수 있고 샘플은 수정할 수 없다.
- 날짜 변경은 기존 날짜의 ID와 내용을 일차 번호 기준으로 보존한다. 일정이나 도시, 테마, 메모가 있는 날짜를 없애는 축소는 409로 거부한다. `PATCH /api/v1/days/{dayId}`는 여행의 `version`과 `city`, `theme`, `note`를 받고 갱신한 전체 `TripDocument`를 반환한다.
- 스톱 생성은 선택적인 `buffer`(최대 80자)를 저장한다. 생성과 수정은 `links: [{label, url, note?}]`를 받는다. URL은 호스트가 있는 HTTP(S) 주소만 허용한다. 빈 배열로 링크를 지운다. 생성 시 UUID `clientMutationId`를 보내면 같은 사용자와 날짜의 재시도는 기존 스톱을 반환한다. 삭제한 스톱의 재시도는 409이며 새 스톱을 만들지 않는다.
- `GET /api/v1/trips/{tripId}/completions`는 로그인한 사용자의 완료 스톱 ID 배열이다. `PUT` 또는 `DELETE /api/v1/trips/{tripId}/completions/stops/{stopId}`는 멱등이며 다른 사용자 체크에 영향을 주지 않는다.
- 소유자는 `GET/POST /api/v1/trips/{tripId}/share-links`와 `DELETE /api/v1/trips/{tripId}/share-links/{linkId}`로 공유를 관리한다. 생성 응답에만 `{id, token}`을 반환하며 목록은 `{id, createdAt}` 배열이다. 토큰은 임의 32바이트이고 DB에는 SHA-256 해시만 저장한다.
- `GET /api/v1/share/{token}`은 로그인 없이 읽기 전용 문서를 반환한다. `POST /api/v1/share/{token}/clone`은 로그인한 사용자의 비공개 복제본을 만든다. 완료 체크와 멤버, 공유 링크는 복제하지 않는다. 회수했거나 잘못된 토큰은 404다. 공유해도 원본 공개 범위는 바뀌지 않는다.
- 새 공유, 완료 체크, 생성 영수증 테이블은 JDBC로 접근하므로 jOOQ 생성 대상에서 제외한다.
