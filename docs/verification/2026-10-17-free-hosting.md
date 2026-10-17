# 무료 호스팅 준비 검증 — 2026-10-17

상태: 외부 서비스 생성/배포 전. 로컬 제약 시험과 계정 연결 조사 결과를 기록한다.

## 기준과 데이터

기준 develop `63da5cd293fe606cca9f48391fb3a1d14f49d967`.
최초 준비 커밋 `9d69659`의 아래 제약 시험에서는 API 소스와 인증 알고리즘을 변경하지 않았다.
별도 `codex/free-hosting-prep-20261017` 브랜치에서 작업했다. 이후 readiness/메일 경계 변경의 추가 검증은 마지막 절에 구분한다.
기존 Claude checkout과 Lightsail 준비는 보존했다.

기존 로컬 개발 DB의 집계 조회는 21,165,759 bytes(약 21.2MB), 여행14/사용자37/일정항목467이다.
개발/테스트 누적 데이터의 스냅샷이며 운영 데이터나 새 배포의 이관 대상이라고 해석하지 않는다.
행 내용/이메일/비밀번호/개인 일정은 조회하거나 복사하지 않았다.
공개 저장소 sample JSON 두 개는 합계400,732 bytes(약0.40MB), 여행2/일자9/일정항목107이다.
배포 기본 seed=false이므로 새 DB는 마이그레이션만 적용하며 실제 사용자 데이터는 아직 없다.
깨끗한 local DB의 마이그레이션 직후 크기는 20395711 bytes였다.
public relation 합계는 7749632 bytes이며 PostGIS 확장 테이블도 포함한다.
이전 1.4GB 합성 padding은 이 시험과 무료 저장 용량 판정에 사용하지 않았다.

## API 512MiB / 0.1CPU

공유 ARM64 Mac의 Docker Linux VM(4CPU/약8GB). API cgroup만 memory.max=536870912,
memory.swap.max=0, cpu.max=`10000 100000`. DB/PostGIS, Valkey(AOF/noeviction), Mailpit 및
부하 client는 API 제한 밖이다. host port와 외부 연결 없이 internal network에서 실행했다.
Java 25.0.4.1, Spring Boot4.1.1, PostgreSQL18.6, Valkey9.1이다.

시험:

| 실행 | 조건 | 결과 |
| --- | --- | --- |
| fd885132 | 최초 Compose cpus 설정 | 실제 quota 미적용을 발견하고 중단. 유효한 0.1CPU 결과로 사용하지 않음. |
| 09bf1d03 | AMD64 에뮬레이션, 실제 quota, heap192/meta128/code48/direct32MiB | 900초 내 readiness 실패. 종료/볼륨 보존. Render native 실패로 일반화하지 않음. |
| a7c5281f | native ARM64, 같은 quota/JVM 상한 | JVM Metaspace 상한128MiB에서 OOM, exit3. cgroup OOM kill과 구분. Redis 연결 오류도 앞서 관찰됨. |
| 087e8a87 | native ARM64, meta128, C1 비교 | 이전 meta 상한 결함 확인 후 중단. 완료된 기능 시험으로 세지 않음. |
| c45f8fbc | native ARM64, heap192/meta192/code32/direct16MiB, C1 | 아래 결과 참조. |

128MiB는 클래스 metadata와 compressed class space를 함께 수용하기에 작았다.
기존 NMT 자료의 ready 시 metadata 약121MiB와 class space 약19MiB가 이 제한을 넘는다.
메타데이터 상한192MiB로 조정하고 `TieredStopAtLevel=1`을 비교한다.
Argon2 파라미터와 indexed Redis session/사용자별 세션 취소는 유지했다.
초기 두 제약 실행은 readiness curl도 API cgroup 안에서 실행했다. 최종 재현 harness는
readiness client까지 별도 컨테이너로 옮겼다. 시작 시간은 host/아키텍처/프로브 방식에 영향을 받는다.
구형 VM 커널에 memory.peak가 없어 최대치로 보고하지 않는다.

### 최종 로컬 기능 시험

기동 probe 232.62초. JVM 로그는 process running 224.99초/Boot initialization 215.799초였다.
CSRF, 가입, Mailpit 이메일 확인, Argon2 로그인, 여행 생성/조회/수정, 익명 공유 읽기가 통과했다.
5 동시 client의 조회10회/로그인5회 작업에서 오류0, 작업 latency p95=9470.6ms.
로그인별 CSRF priming 조회5회는 별도이므로 실제 이 동시 구간의 HTTP 호출은20회다.
첫 기능 구간 직후 charged memory=401,952,768 bytes(약383.3MiB), cgroup OOM/OOM-kill0이다.
이는 한 번의 snapshot이며 memory peak나 장시간 부하 보장이 아니다.
재시작 probe 252.44초. 재시작 뒤 원래 session, 수정된 여행, 공유 링크 유지가 통과했고,
공유 취소, 로그아웃, 살아 있는 5개 세션 확인, 비밀번호 초기화로 그 5개 세션 전체 취소,
새 비밀번호 로그인까지 통과했다. API만 동일 JAR/동일 유효 JVM 옵션으로 재생성했다.
재생성 뒤에도 memory=536870912/swap 추가0/cpu.max=10000 100000을 재확인했다.
이때 CLI에 C1 옵션이 두 번 들어갔지만 같은 값이며 유효 설정은 동일하다.
최종 harness는 소스/Compose/client를 실행 시작 때 동결하고 단순 stop/start를 사용한다.
외부 DB/캐시가 유지됐으므로 앱 process에 인증/여행 상태를 두지 않았다는 점을 확인했다.
초기화 도중 Redis 연결 오류가 잠시 났지만 readiness 이후 위 검사는 통과했다.
Render 외부 TLS/latency에서는 해당 연결·subscription timeout을 다시 검증해야 한다.
실행 후 이 시험 project 컨테이너만 정지했고 volume과 원본 로그는 보존했다.
local HTTP fixture는 __Host-SESSION의 Secure 쿠키를 수동으로 보존하므로 실제 브라우저 TLS 테스트를 대신하지 않는다.
Neon/Upstash로 연결한 시험도 아니다. Render의 sleep/cold start와 외부 TLS/프록시 경로는 남아 있다.

## 코드와 설정 검증

- 웹 전체42파일/211테스트 통과. 타입 검사 통과.
- lint 오류0. 기존 warning80개와 config deprecation info1개.
- TRIPNOTE_UI_PREVIEW=1, TRIPNOTE_FREE_HOSTING=1로 Next 빌드 통과.
- 새 timeout/재시도 테스트: 조회 503 한 번 재시도, 쓰기/네트워크 실패 replay 방지, 연결 timeout.
- Python syntax, Free profile YAML 및 Blueprint의 plan=free/autoDeployTrigger=off 구조 확인.
- 최종 API Dockerfile의 linux/amd64 빌드 통과. 이미지 `sha256:c6253227334c99afdeaf3c12290f6b65d8c2213e4d5482bfeb9d1ce62d238f67`.
  이 빌드는 외부 연결 검증을 뜻하지 않는다. 빌드 JAR와 native 시험 JAR의 SHA-256은 둘 다
  `163c7bbe16c75f262e35514d143fcc890ee17571b1562756a624c6bb6abca950`으로 일치한다.

## 외부 검증/게시 차단사항

Render/Neon/Upstash CLI 및 표준 credential 연결을 현재 도구에서 찾지 못했다. 로그인/계정 생성/
OAuth/새 DB/캐시 password 자동 발급/secret 등록은 실행하지 않았다. 무료 자원이라도 이 단계는 별도 승인 대상이다.
Vercel 기존 팀은 실제 plan=hobby. DNS 후보 tripnote/api-tripnote 명시 레코드 없고 alias365개 전체에서 중복 없음.
wildcard 및 타 앱은 수정하지 않았다. pending project domain assignment는 생성 직전 재확인한다.

공식 Neon 문서의 PG18/PostGIS3.6.4 지원, pooled runtime/direct Flyway/TLS verify-full 연결을 설계했다.
Upstash native TCP/TLS, EVAL/EVALSHA, notification CONFIG, Pub/Sub는 공식 명령 문서에서 확인했다.
실제 무료 DB의 auth/index/session revoke/restart/TTL/command quota 검증은 아직 하지 못했다.
primitive probe만으로 실제 Spring 인증 호환 완료를 선언하지 않는다.

Render Free의 SMTP25/465/587 차단 때문에 메일 제공자의 허용된 무료 발송 경로 확인이 필요하다.
외부 계정의 현재 무료량/결제 상태 확인과 계정 연결, 실제 HTTPS 로그인/여행/공유 확인,
도메인 연결 및 운영 게시 승인이 남아 있다. 관련 절차와 출처는 `deploy/free/README.md`에 있다.

## 추가 검증: readiness와 메일 경계

위 512MiB/0.1CPU의 JAR·기동·메모리 수치는 `9d69659` 당시의 결과다.
이후 API 변경을 같은 cgroup이나 실제 Render에서 다시 측정한 수치로 사용하지 않는다.

추가 변경은 DB/Redis 검사를 제거하지 않고 HTTP readiness의 공통 3초 deadline과 bounded worker를
도입하고, AuthMailer의 전송을 SMTP/HTTPS 확장점으로 분리한다. 인증 알고리즘·토큰 TTL·단회성·
이벤트 트랜잭션·사용자 행 잠금은 유지한다. Free profile은 HTTPS 어댑터가 없으면 시작을 거부한다.

JDK25, 격리된 Testcontainers PostGIS/Valkey에서 `./apps/api/gradlew -p apps/api check` 통과:
**25 suites / 166 tests / failures 0 / errors 0 / skipped 0**.

- `BoundedReadinessTest` 5개: DB/Redis와 수신 상태, 예외와 지연, 16 동시 요청, 취소에 응하지 않는
  드라이버의 최대 worker2 유지 및 복구. 기본3초 예산의 전체 filter 응답을 4.5초 미만으로 검사.
- `BoundedReadinessIntegrationTest` 2개: 실제 contributor와 보안/filter 경로, DB/Redis DOWN·누락·복구,
  reactive Redis 15초 지연에도 503을 4.5초 안에 반환. 비인증 개인 경로는 계속401.
- `MailTransportTest` 5개: SMTP 필드 보존, HTTPS 전달/거절 예외/무재시도, provider 미구현 startup 실패,
  로컬 SMTP 유지, Free에서25/465/587 차단. 문맥에 실 SMTP나 HTTP를 연결하지 않음.
- `HttpsAuthFlowTest` 2개: 가짜 HTTPS provider + 실제 auth/DB/Redis로 인증 토큰 해시·단회성,
  재설정 후 세션 취소, 발송 거절 시 토큰 롤백/미완료 이벤트 유지/복구 후 재발행 확인.
- 기존 이메일·Google·여행·공유·모듈 경계·OpenAPI 회귀 검사도 전체 check에 포함.

HTTP 제한 테스트는 MockMvc와 synthetic delay/load이며 외부 네트워크·실제 Free CPU의 end-to-end
성능 검증은 아니다. 실 제공자/계정/키/도메인/실제 메일 발송은 추가하지 않았다.
