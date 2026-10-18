# 무료 배포 준비

2026-10-17 기준. 이 폴더는 **검토용**이며 외부 계정/리소스/자격증명을 만들지 않는다.
Lightsail 작업은 별도 브랜치에 보존했다. API의 Java 25, PG18/PostGIS,
Redis indexed session, 비밀번호 초기화 시 전체 세션 취소 구조는 유지한다.

## 구성과 무료 범위

| 역할 | 대상 | 확인한 한도와 운영 영향 |
| --- | --- | --- |
| 웹 | 기존 Vercel Hobby `trip-planner-web` | 실제 계정 plan=hobby 확인. 개인 비상업 용도와 기존 계정 사용량을 배포 전에 확인한다. |
| API | Render Free, Singapore 후보 | 512MB / 0.1 CPU, 15분 유휴 후 sleep, 월 workspace 합산 750시간. 디스크는 임시 저장소이며 세션/데이터를 두지 않는다. |
| DB | Neon Free, PG18 | 공식 문서상 PG18 및 PostGIS 3.6.4/citext 지원. 문서 현재 1GB/project, 100 CU-hour/project/month, 5GB egress/project/month, 5분 유휴 후 suspend. 생성 화면의 실제 Free 한도와 기존 사용량을 다시 확인한다. |
| 캐시/인증 상태 | Upstash Free 후보, native Redis TCP/TLS | 현재 250MB, 월 500K commands, 10GB bandwidth, Free DB 1개. persistence는 기본 활성화. eviction은 끈 상태를 유지한다. |

Render 무료 PostgreSQL(30일 만료)과 메모리 전용 Free Key Value는 사용하지 않는다.
카드 추가, 유료 업그레이드, Marketplace 설치, AWS 생성은 하지 않는다.
Render에 이미 카드가 등록돼 있으면 Free compute여도 bandwidth/build 초과 과금 가능성이 있다.
카드를 추가하지 않고 기존 결제 상태와 초과 시 중단 조건을 확인하기 전에는 생성하지 않는다.
Neon의 유료 snapshot/추가 제품과 Upstash의 PAYG/Prod Pack/auto-upgrade도 활성화하지 않는다.
이 구성은 무료 체험용이며 무중단 운영이나 영구 무료 사용량을 보장하지 않는다.

## 외부 연결 전에 필요한 승인/직접 입력

이 Mac에서 Render/Neon/Upstash CLI는 없고 관련 표준 API credential 환경변수 및 알려진 CLI config도 없다.
이 도구 경로에서 계정 연결을 확인하지 못했으며, 계정 자체가 없다는 뜻은 아니다.
새 로그인/OAuth/계정 생성/임시 DB 발급 API는 실행하지 않았다.

1. Render: 사용자가 dashboard.render.com에서 직접 로그인. 필요하면 GitHub OAuth/App의
   **hyunolike/trip-planner 저장소 한 개** 읽기와 deploy 연결만 검토한다. 전체 저장소 접근은 승인하지 않는다.
   새 Free web service의 공개 onrender.com 주소/TLS 발급과 env secret 등록은 별도 승인 대상이다.
2. Neon: 사용자가 console.neon.tech에서 직접 로그인하고 Free project 1개/PG18/동일 또는 인접 지역을 선택한다.
   이 단계는 DB role/password를 자동 생성하므로 사전 승인이 필요하다. pooled/direct endpoint를 구분한다.
3. Upstash: 사용자가 console.upstash.com에서 Free DB 1개를 선택한다.
   native TCP password 및 REST token 자동 생성도 사전 승인 대상이다. REST token으로 Lettuce에 연결하지 않는다.
   namespace는 tripnote 전용. 기존 다른 앱 DB는 사용하지 않는다. eviction/auto-upgrade는 끈다.
4. 비밀값은 채팅/PR/.env 커밋/터미널 인자로 보내지 않는다. Render Environment 화면에 직접 입력한다.
   로컬 검증에 필요하면 사용자 전용 안전 입력 경로를 먼저 정한다. DB/캐시 초기화와 테스트 쓰기도 해당 신규 자원 범위로 승인받는다.
5. 메일: Render Free의 outbound SMTP 25/465/587은 차단된다. Free profile은 HTTPS 전송을 선택한다.
   제공자는 Resend로 정했고 `ResendMailProvider`를 구현했다(`TRIPNOTE_MAIL_HTTPS_PROVIDER=resend`).
   `RESEND_API_KEY`를 Render Environment에 입력하지 않으면 **시작에 실패한다**.
   임시 no-op, 로컬 SMTP 우회나 발송 성공으로 가장하는 fallback은 없다.
   발신 도메인 검증과 실제 발송 확인이 남아 있다.
   무료 후보와 요구 사항은 [메일 연결 검토](mail.md)를 참고한다.
   Google OAuth도 callback 등록과 실제 자격증명 입력 전에는 완료로 보지 않는다.

## 제한 시간 안의 readiness

Render는 HTTP health 응답을 5초 안에 받아야 한다. 시작 허용 시간 15분과는 별도 조건이다.
Free profile은 `tripnote.readiness.bounded=true`로 DB와 Redis의 실제 Actuator contributor를
동시에 조회하고, 두 검사에 **공통 3초 예산**을 적용한다. 둘 다 UP이고 앱이 요청 수신 상태일 때만
200을 반환한다. 누락·예외·시간 초과·수신 중지 상태는 503이며 상세 정보나 UP 캐시는 노출하지 않는다.
Spring Boot 4의 reactive Redis health도 같은 `HealthEndpoint` 경로로 조회한다.
검사는 2 worker/2 queue로 제한하고 동시 probe는 진행 중인 검사 한 번을 공유한다.
취소에 반응하지 않는 드라이버도 worker 수를 늘리지 않는다. 포화 상태에서는 503으로 실패한다.

MockMvc의 전체 보안/filter 경로와 15초 지연, 동시 16요청, DB/Redis 장애·누락·복구를 테스트한다.
이 테스트는 실제 Render의 0.1CPU 스케줄링과 외부 TLS/네트워크를 포함하지 않는다.
로컬의 이전 232초 기동 기록은 현재 readiness 변경을 검증한 수치가 아니며,
실제 Free 인스턴스에서 HTTP 왕복 5초와 cold start를 별도로 확인해야 한다.

## DB 연결과 마이그레이션

`application-free.yml`은 opt-in profile이다. Dockerfile이 `/opt/config/`를 추가 위치로 읽는다.
Render env `DATABASE_URL`은 **JDBC URL**(postgres:// URI가 아님)이며 runtime은 `-pooler` hostname,
`MIGRATION_DATABASE_URL`은 direct hostname을 사용한다. user/password는 URL에 넣지 않고 별도 secret으로 입력한다.
두 URL 모두 `sslmode=verify-full`과 신뢰할 CA 설정을 적용한다. 인증서 검사 우회는 금지한다.
예시의 호스트/DB는 실제로 사용하지 않는다:

```text
jdbc:postgresql://<pooled-or-direct-host>/<database>?sslmode=verify-full&sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory&connectTimeout=10&socketTimeout=30&tcpKeepAlive=true
```

Hikari max=3, minIdle=0이다. runtime JDBC transaction pooling을 사용하며 session-level SQL 상태에 의존하지 않는다.
Flyway는 direct endpoint로 애플리케이션 시작 시 실행한다(Free에서 유료 pre-deploy job을 추가하지 않는다).
V1이 `CREATE EXTENSION postgis`, `citext`, `uuidv7()`을 사용하므로 PG18을 고른다.
Neon의 실제 role extension 권한, TLS hostname 검증, Flyway lock/restart, schema validate,
공간 쿼리는 새 DB가 승인된 후 확인해야 한다. 앱 role을 불필요하게 superuser로 만들지 않는다.
샘플 시드는 기본 false이고 Docker build에 개인 sample 파일은 포함하지 않는다.
기존 DB 전체 복제는 승인하지 않았으며 테스트 계정/개인 데이터는 자동 이관하지 않는다.

## Upstash 호환성

직접 사용은 rate limit의 GET/INCR/EXPIRE, weather GET/SET+TTL이다.
Spring Session의 indexed repository는 binary hash, set/sorted-set 인덱스,
TTL, Pub/Sub와 `CONFIG GET/SET notify-keyspace-events`가 추가로 필요하다.
현재 애플리케이션과 spring-session-data-redis 4.1.1 JAR에는 직접 Lua/RedisScript 참조가 없다.
Lua/EVALSHA는 요청받은 서비스 호환성 범위로 별도 probe에 포함했으며 현재 앱의 필수 사용 명령이라고 단정하지 않는다.
특정 사용자의 전체 세션 취소는 `SessionRevoker`가 indexed repository에 의존한다.
따라서 default repository/메모리 세션으로 바꾸거나 Redis 역할을 삭제하지 않았다.

공식 native 명령 문서에 EVAL/EVALSHA, CONFIG GET/SET notify-keyspace-events,
PSUBSCRIBE/PUBLISH가 있다. Java Lettuce 연결은 `VALKEY_HOST/PORT/USERNAME/PASSWORD`와 SSL을 사용한다.
Spring이 시작할 때 전용 DB의 notification flags(Egx)를 설정할 수 있으므로 이 변경도 자원 승인에 포함한다.
별도 보안 설정 변경 없이 확인하려면 flags가 이미 준비된 후 `scripts/free-tier/redis_probe.py`를 사용한다.
이 probe는 TLS 인증/명령/Lua/binary hash/인덱스/만료 알림을 확인하고 무작위 전용 prefix에만 TTL 키를 쓴다.
CONFIG SET/FLUSH/기존 인증 키 조회는 하지 않는다. 자동 실행하지 않는다.
**이 primitive probe 통과만으로 호환 완료가 아니다.** 실제 API로 로그인/재시작/로그아웃/비밀번호 초기화의
전체 세션 취소/계정 삭제/세션 TTL 및 무료 command 소모량을 추가 확인한다.

indexed session 정리 스케줄/health check도 무료 commands 및 Neon compute를 소모할 수 있다.
Render가 깨어 있는 15분 동안의 Hikari/health 요청이 Neon의 5분 suspend를 늦출 수 있다.
무료량 초과 시 upgrade 대신 서비스를 중단하고 사용자에게 알린다. keep-alive cron은 추가하지 않는다.

## 기존 외부 API의 비용 범위

현재 API는 Open-Meteo free endpoint와 Pwned Passwords range API를 사용한다.
Open-Meteo는 비상업 용도, 600회/분·5,000회/시간·10,000회/일·300,000회/월 범위다.
Pwned Passwords range API는 무료이며 별도 API key가 필요 없다(유료 이메일 유출 조회를 호출하지 않는다).
지도 기본값은 OpenFreeMap liberty이고 Google Maps는 외부 링크다.
새 지도/날씨/메일 유료 key나 subscription을 추가하지 않았다. 게시 전에 attribution/무료 사용 조건을 확인한다.
메일 발송 제공자와 Google OAuth 연결은 아직 미정/미검증이다.

## 도메인과 게시 절차

기존 `hyunolike.dev` Vercel DNS는 apex와 wildcard ALIAS, CAA 3개를 사용 중이다.
`tripnote.hyunolike.dev`, `api-tripnote.hyunolike.dev`는 명시 DNS 레코드가 없고,
전체 365개 alias 조회에서도 일치 항목이 없었다. wildcard 응답 때문에 DNS 응답만으로 미사용을 판정하지 않는다.
프로젝트 domain의 pending assignment까지 생성 직전 재확인한다. apex/wildcard/다른 앱은 수정하지 않는다.
현재 DNS 쓰기나 Vercel domain 추가는 실행하지 않았다.

`render.yaml`은 plan=free, autoDeployTrigger=off, custom domains 미설정인 검토용 Blueprint다.
첫 staging 소스는 `develop` 브랜치다(준비 PR #6이 머지돼 Dockerfile이 있다). autoDeploy는 꺼 두고 수동으로 배포한다.
계정/자격증명 및 실제 API 검증 승인 전에는 apply하지 않는다. Initial apply 자체는 deploy를 시작할 수 있다.
검증은 staging 주소에서 수행하고, 기존 Vercel Preview는 계속 API 분리 상태로 둔다.
실제 HTTPS와 __Host-SESSION, CSRF, Vercel rewrite → Render의 IP 신뢰 경로,
메일 확인, 여행 생성/일정 수정/공유 읽기·취소, 로그아웃/전체 세션 취소까지 확인한 다음에만
사용자 도메인 연결과 운영 게시를 승인받는다. proxy CIDR을 광범위하게 열지 않는다.
실패하면 새 리소스만 중단하고 이전 Preview를 유지한다. 리소스 삭제는 데이터 보존을 확인하고 별도 승인한다.

웹 env `TRIPNOTE_FREE_HOSTING=1`이 대기 안내를 표시한다. 플랫폼 wake-up에 앱 초기화 시간이 더해져 첫 요청은 몇 분 걸릴 수 있다.
요청은 15초마다 제한하며 502/503/504인 GET/HEAD만 1초 후 한 번 재시도한다.
네트워크 오류와 mutation은 자동 replay하지 않는다. 기존 CSRF 403 재시도는 유지한다.
편집 queue의 mutation ID/version 충돌 처리와 명시적 재시도를 유지한다.
브라우저 취소는 서버 commit 취소를 뜻하지 않으므로 결과를 확인한 뒤 다시 저장한다.
Render loading HTML/프록시 timeout은 별도 staging 검증 대상이다.

## 검증

로컬 제약 시험과 결과는 `scripts/free-tier/README.md`와 `docs/verification/2026-10-17-free-hosting.md`에 기록한다.
계정 생성이나 공개 배포 없이 로컬 시험/CI/Draft PR까지만 진행한다. merge는 별도 승인이다.

## 공식 자료 (2026-10-17 조회)

- https://render.com/docs/free
- https://render.com/articles/from-side-project-to-production-scaling-your-first-app
- https://render.com/docs/blueprint-spec
- https://neon.com/docs/introduction/plans
- https://neon.com/docs/postgresql/postgres-version-support
- https://neon.com/docs/extensions/pg-extensions
- https://neon.com/docs/connect/connect-securely
- https://neon.com/docs/connect/connection-pooling
- https://jdbc.postgresql.org/documentation/ssl/
- https://upstash.com/pricing/redis
- https://upstash.com/docs/redis/overall/compatibility
- https://upstash.com/docs/redis/features/durability
- https://upstash.com/docs/redis/features/eviction
- https://upstash.com/docs/redis/commands/scripting/eval
- https://upstash.com/docs/redis/commands/server/config-get
- https://upstash.com/docs/redis/commands/server/config-set
- https://upstash.com/docs/redis/commands/pub-sub/psubscribe
- https://docs.spring.io/spring-session/reference/configuration/redis.html

- https://render.com/docs/git-provider
- https://render.com/docs/web-services
- https://vercel.com/docs/plans/hobby
- https://open-meteo.com/en/pricing
- https://haveibeenpwned.com/API/v3#PwnedPasswords
