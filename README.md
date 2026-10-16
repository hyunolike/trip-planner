# 여행노트

예약은 어디서든, 일정은 여기서. 여행 당일 손에 들고 보는 한국어 여행 일정표입니다. 기존 오사카·교토 가족여행 Vite 사이트를 보존하면서 Next.js 웹과 Kotlin API로 확장하고 있습니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `apps/web` | Next.js 웹. 홈, 인증, 일정 조회와 편집, 공유 |
| `apps/api` | Spring Boot API. 인증, 여행 권한, 편집, 복제, 공유, 완료 체크, 날씨 |
| `packages/design-tokens` | DTCG 토큰에서 CSS와 지도 색상 생성 |
| `sample`, `scripts/sample` | 오사카·교토 원본과 다낭·호이안 예시의 검증·이관 |
| `src`, `public`, `tests` | 기존 Vite 사이트와 테스트. 새 서비스와 별도로 유지 |
| `docs/adr`, `docs/superpowers` | 아키텍처 결정과 설계·구현 계획 |

## 구현된 흐름

- 이메일 가입·인증·재발송, 로그인, 비밀번호 재설정, Google 로그인 진입, 로그아웃과 탈퇴
- 목적지 → 날짜 → 동행의 세 단계로 비공개 여행 만들기
- 날짜별 일정 추가·자동 저장·수정·삭제, 순서 이동과 드래그, 메모·링크·좌표 입력
- 여행과 날짜 정보 편집. 일정이 들어 있는 날짜를 줄일 때는 충돌을 반환해 데이터 손실 방지
- 기기 저장소에 사용자별 변경 큐 보관, 연결 복구 시 순서대로 재전송. 계정 변경·인증 만료·버전 충돌 시 전송 중지
- 비로그인 완료 체크를 로그인 후 한 번 이관하고 방문 완료를 회원별 서버에 저장. 준비물 체크는 기기에 보관
- 지도 날짜 변경, 한국어 지도와 경로 재생, 날씨, 맛집·쇼핑·링크·준비물 읽기 화면
- 로그인 없이 열 수 있는 보기 전용 공유 링크 생성·회수. 토큰은 DB에 해시만 저장
- 샘플과 공유된 여행을 내 비공개 여행으로 복제. 원본·멤버·공유 링크·완료 체크를 변경하거나 재사용하지 않음

## 로컬 실행

Node.js 22, pnpm 10, JDK 25, 실행 중인 Docker가 필요합니다. 버전은 잠금 파일과 `apps/api/gradle/libs.versions.toml`을 따릅니다.

```bash
pnpm install --frozen-lockfile
pnpm --filter @tripnote/design-tokens build
```

API 터미널:

```bash
cd apps/api
docker compose up -d --wait
export JAVA_HOME=/Users/hyuno/Library/Java/JavaVirtualMachines/openjdk-25.0.2/Contents/Home
TRIPNOTE_SEED_SAMPLES=true ./gradlew bootRun
```

`JAVA_HOME`은 사용하는 Mac의 JDK 25 경로로 바꿉니다. 샘플 시드는 기존 샘플을 다시 적재하므로 개발 DB에서만 사용합니다. 새 빈 개발 DB의 첫 실행 후에는 `TRIPNOTE_SEED_SAMPLES`를 생략해도 됩니다. 개발 메일은 Mailpit의 `http://localhost:8025`에서 확인합니다.

웹 터미널:

```bash
pnpm --filter @tripnote/web dev
```

웹은 `http://localhost:3000`, API는 `http://localhost:8080`입니다. 브라우저의 API 요청은 웹과 같은 출처를 거칩니다. `apps/web/.env.example`과 [API README](apps/api/README.md)에 설정이 있습니다. Google 실제 인증에는 별도 제공자 설정이 필요하며, 로컬 기본값은 리다이렉트 흐름 검사에만 사용합니다.

기존 Vite 사이트만 보려면 루트에서 `pnpm dev`를 실행합니다. 기존 [Sites 서비스](https://osaka-kyoto-family-2026.hyunolike.chatgpt.site/)와 이 저장소 사이의 자동 동기화·자동 배포는 구성되어 있지 않습니다.

## 검증

```bash
pnpm test
pnpm sample:validate
pnpm --filter @tripnote/design-tokens test
pnpm --filter @tripnote/web lint
pnpm --filter @tripnote/web typecheck
pnpm --filter @tripnote/web test
pnpm --filter @tripnote/web build
cd apps/api && ./gradlew check
```

실제 API와 DB·Valkey·Mailpit이 준비된 상태에서:

```bash
pnpm --filter @tripnote/web e2e
```

Playwright는 프로덕션 빌드를 사용해 모바일 375px와 데스크톱 1280px를 검사합니다. 브라우저를 처음 설치하는 환경에서는 `pnpm --filter @tripnote/web exec playwright install chromium`이 필요합니다.

API를 변경하면 `apps/api/openapi.json`을 기존 계약 테스트로 갱신한 뒤 `pnpm --filter @tripnote/web gen:api`로 타입을 생성합니다. CI는 계약·토큰·jOOQ 생성 결과의 드리프트와 API·웹·E2E를 검사합니다.

## 저장과 충돌

편집 큐와 입력 초안은 사용자와 여행별로 브라우저에 저장됩니다. 저장소가 차단되거나 가득 차면 저장 실패를 표시합니다. 이 경우 탭을 닫기 전에 입력을 보관하고 저장을 다시 시도해야 합니다. 새 일정 추가에는 고유 작업 ID를 사용해 응답을 받지 못한 재시도가 중복 일정을 만들지 않게 합니다.

동시에 여러 탭이나 기기에서 편집하면 버전 충돌이 날 수 있습니다. 다른 변경을 덮어쓰지 않고 초안을 유지하며, 최신 일정 확인과 재시도·변경 버리기를 제공합니다. 브라우저 탭 사이의 단일 전송 잠금과 동시 공동 편집은 아직 범위 밖입니다. 완전한 오프라인 최초 접속·서비스워커 설치는 구현하지 않았으며, 이미 연 편집 화면의 변경 보존·복구가 대상입니다.

## 배포 전에 할 일

### API가 없는 화면 미리보기

프론트만 배포해 화면을 확인할 때는 빌드와 런타임에 모두 `TRIPNOTE_UI_PREVIEW=1`을 지정합니다. 모든 앱 경로는 백엔드 미연결 안내로 바뀌며 로그인, 샘플 조회, 여행 만들기 버튼을 비활성화합니다. API 요청과 서버 액션은 503 안내를 반환하고 API rewrite를 만들지 않습니다. 개인 일정이나 로컬 API를 대신 공개하지 않습니다. 이 배포는 동작하는 여행 서비스가 아닙니다.

스위치를 생략하면 기존 앱과 인증 경계가 그대로 동작합니다. 실제 API를 연결할 때는 이 스위치를 빌드와 런타임에서 함께 제거한 새 배포를 검증해야 합니다. `.vercelignore`는 웹 배포 입력에서 개인 일정 JSON, API 소스, 테스트 fixture, 환경 파일과 로컬 설정을 제외합니다. Vercel의 Root Directory는 `apps/web`로 지정하고 workspace의 토큰 빌드와 이미지/MapLibre worker 복사가 완료되는지 확인합니다. 루트 `build`는 기존 Vite 앱이므로 새 Next.js 배포 명령으로 사용하지 않습니다.

### 운영 연결

웹과 API는 별도로 배포합니다. 아래 운영 설정과 실제 환경 검증을 마친 뒤 배포합니다.

- 실제 웹·API 주소에 맞춰 `API_ORIGIN`, `SITE_ORIGIN`, `TRIPNOTE_WEB_BASE_URL`과 Google 리다이렉트 URI 설정
- 운영 DB 마이그레이션, SMTP, Valkey, 백업과 복구 절차 검증
- API ingress에서 전달 헤더를 정리하고 실제 소켓 피어인 프록시 CIDR만 `TRIPNOTE_TRUSTED_PROXY_CIDRS`에 명시. 기본은 아무 프록시도 신뢰하지 않으며 직접 받은 위조 `X-Forwarded-For`는 무시함. Vercel을 경유한다고 모든 주소를 신뢰하도록 설정하면 안 됨
- HTTPS와 실제 프록시 체인을 통과한 사용자별 요청 제한·세션·공유 회수 검증
- 타일·이미지 호스팅, 관측성 연결, 운영 배포 파이프라인과 개인정보처리방침의 실제 운영 정보 확정

이미지·폰트·외부 자료의 출처와 이용 조건은 각 데이터와 크레딧을 따릅니다. 원본 오사카·교토 일정은 공개 샘플 목록에 노출하지 않고 기존 링크로만 보존합니다.
