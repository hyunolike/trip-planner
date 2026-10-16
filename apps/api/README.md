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
- `server.forward-headers-strategy: native`는 사설 주소와 루프백 프록시만 신뢰한다. 앞단 프록시가 공인 주소라면 `server.tomcat.remoteip.internal-proxies`를 지정한다.
- 이메일 인증은 가입할 때 쓴 비밀번호가 필요하다: `POST /api/v1/auth/verify-email` 본문은 `{token, password}`다. 웹의 인증 화면이 비밀번호를 물어야 한다.

## CI

`.github/workflows/ci.yml`이 샘플 검증(Node), API 테스트(Gradle), jOOQ 생성 코드 차이를 검사한다. 액션은 전체 커밋 SHA로 고정하고 태그를 주석에 적는다.

## 모듈

| 모듈 | 공개 API | 하는 일 |
| --- | --- | --- |
| `common` | `ApiException`, `RateLimiter`, `TripnoteProperties` | 오류 응답, 레이트리밋, 설정 |
| `auth` | `SessionUser`, `SystemUsers` | 이메일 가입·인증·재설정, 구글 로그인, 세션, 탈퇴 |
| `trip` | `TripDocument` 등 응답 타입 | 샘플 적재, 일정 조회·편집, 복제 |
