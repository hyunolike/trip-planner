# B2C 여행 일정표 서비스 설계

작성일: 2026-10-15 · 개정: 2026-10-16(기술 리서치 반영, 결정 질문 답변 반영) · 상태: 검토 대기 · 기반 코드: `8f855f8` (Osaka Kyoto trip planner site) · 디자인 시스템: `2026-10-15-design-system.md`

## 0. 이해한 내용 (확인 요청)

| 구분 | 내용 |
| --- | --- |
| 목표 | 가족 1팀용으로 만든 오사카·교토 일정 웹앱을, 누구나 가입해 자기 여행 일정표를 만들고 보는 B2C 서비스로 확장한다. |
| 조건 1 | 기존 오사카·교토 여행 정보는 DB 등 별도 저장소에 보관하고, 서비스 안에서 일정표 1개로 계속 보인다. |
| 조건 2 | 반응형 웹사이트로 개발한다. 네이티브 앱은 범위 밖이다. |
| 기존 자산 | 일정 4일 50스톱, 맛집·쇼핑·공식 링크·준비물 체크리스트, 명소 가는 길 가이드 9종, Leaflet 동선 지도와 재생, 날씨, D-day, PWA 설치, 디자인 시스템(`DESIGN_SYSTEM.md`), Vitest 16개 파일. |

아래는 요청에 없어서 **가정**한 것이다. 틀리면 설계가 바뀌므로 먼저 확인이 필요하다.

- 한국어 사용자, 해외여행 중심. 다국어는 범위 밖.
- 무료 서비스. 결제·예약 중개 없음. 예약은 다른 서비스에서 하고 "일정과 메모"만 여기서 관리한다.
- 로그인은 구글 로그인과 이메일 가입. 카카오·네이버·애플은 같은 구조로 나중에 붙인다. (2026-10-16 결정)
- 공개 샘플은 하나투어·모두투어의 상품 구성을 참고해 새로 조사한 **다낭·호이안 가족여행**이다. 기존 오사카·교토 일정은 원본 그대로 DB에 보관하고 링크 공개로 계속 보인다. 로그인한 사용자는 두 일정 모두 "내 여행으로 복제"할 수 있다. (2026-10-16 결정)
- 호스팅은 이전 프로젝트(한적, 오구오구)와 같은 Vercel + 별도 API 서버 구성.

## 1. 서비스 기획 (기획 관점)

### 1.1 포지셔닝

놀(NOL), 여기어때, 하나투어는 **상품을 판다**. 사용자가 상품을 산 뒤 실제 여행 당일에 보는 화면은 예약 확인서와 카카오톡 메모, 구글 맵 즐겨찾기로 흩어진다. 이 서비스는 그 빈자리인 **"여행 당일 손에 들고 보는 일정표"**를 맡는다.

한 줄 가치: **예약은 어디서든, 일정은 여기서.**

기존 앱이 이미 증명한 차별점 4가지를 그대로 핵심 기능으로 승격한다.

1. **시간과 버퍼가 있는 일정**: 스톱마다 소요시간, 출발 목표, 늦으면 생략할 항목이 적혀 있다. 패키지 상품의 "간략/상세 일정" 구조와 같아 익숙하다.
2. **동선 지도와 재생**: 하루 경로를 지도에서 순서대로 따라가며 본다. 구글 맵 길찾기 링크를 구간마다 단다.
3. **현장 체크**: 방문 완료, 준비물 완료를 체크하고 동행과 함께 본다.
4. **근거 링크와 확인일**: 영업시간·요금 옆에 공식 출처와 "2026.10.12 확인"이 붙는다. 블로그 짜깁기와 구분되는 신뢰 장치다.

### 1.2 대상 사용자

| 페르소나 | 상황 | 필요한 것 |
| --- | --- | --- |
| 가족 여행 총무 (30~40대) | 부모님·아이와 3박 4일. 본인이 계획하고 가족은 따라온다. | 가족에게 링크 하나로 공유, 당일 "다음에 뭐 해?"에 답하는 화면 |
| 친구 여행 공동 계획 (20~30대) | 3~4명이 각자 가고 싶은 곳을 던진다. | 함께 편집, 후보 → 확정 |
| 혼자 가는 여행자 | 꼼꼼히 준비하고 기록한다. | 빠른 입력, 지도, 준비물 |

MVP는 첫 번째 페르소나를 기준으로 만든다. 기존 앱이 이 페르소나를 위한 것이고, 공동 편집은 2단계에서 더한다.

### 1.3 핵심 사용 흐름

```
둘러보기 ──▶ 여행 만들기 ──▶ 일정 채우기 ──▶ 공유 ──▶ 여행 당일 사용
(샘플 보기)   (목적지·날짜)   (날짜별 스톱)   (링크)   (체크·지도·날씨)
                 ▲                                        │
                 └──────── 샘플을 내 여행으로 복제 ◀────────┘
```

### 1.4 정보 구조

```
/                      홈: 서비스 소개 + 샘플 일정 카드 + 로그인 시 내 여행 목록
/trips/new             여행 만들기 (3단계: 목적지 → 날짜 → 동행)
/t/{slug}              일정표 (기존 화면 구조 유지)
  ├ #itinerary         날짜별 일정 · 지도 · 날씨 · 명소 가는 길
  ├ #food              맛집 후보
  ├ #shopping          쇼핑 후보
  ├ #links             예약·공식 링크 모음
  └ #preparation       준비물 체크리스트
/t/{slug}/edit         편집 모드 (같은 화면에 편집 컨트롤이 켜짐)
/t/{slug}/map          전체 지도 (모바일 전체화면)
/s/{token}             공유 링크 진입 → 권한 부여 후 /t/{slug}로 이동
/me                    내 정보 · 내 여행 · 로그아웃
/login                 구글 · 이메일 로그인
/signup                이메일 가입 (인증 메일 발송)
/verify-email          인증 링크 진입
/reset-password        비밀번호 재설정 요청·변경
```

기존 앱의 5탭(일정·맛집·쇼핑·링크·준비)은 "여행 노트"의 섹션으로 그대로 남긴다. 사용자가 만드는 여행도 같은 5섹션을 가지며, 비어 있으면 빈 상태 안내를 보여준다.

### 1.5 범위와 단계

| 단계 | 포함 | 제외 |
| --- | --- | --- |
| **1단계 MVP** | 소셜 로그인, 여행 생성, 날짜별 스톱 추가·수정·순서 변경·삭제, 스톱별 메모·링크·좌표, 동선 지도, 보기 전용 공유 링크, 샘플 일정 공개 노출, 샘플 복제, 반응형 | 공동 편집, 장소 검색 API, 사진 업로드 |
| **2단계 협업** | 편집 권한 공유 링크, 동행 멤버 목록, 맛집·쇼핑·링크·준비물 섹션 편집, 완료 체크 서버 저장(동행과 동기화), 날씨, PWA 설치 | 실시간 동시 편집(충돌은 마지막 저장 우선) |
| **3단계 탐색** | 장소 검색(Google Places 또는 Kakao Local), 사진 업로드, 공개 일정 탐색·좋아요, 명소 가이드 템플릿 | 추천 알고리즘, 결제 |

### 1.6 경쟁 서비스에서 가져올 것과 버릴 것

- **가져옴**: 하나투어·모두투어의 "간략 일정 / 상세 일정" 토글(이미 구현됨). 놀의 카테고리 탭 구조. 여기어때의 큰 사진 카드 한 장으로 여행을 대표하는 방식.
- **버림**: 상품 가격·예약 버튼 중심 레이아웃. 광고 배너. 타임딜. 이 서비스는 사용자가 쓴 내용이 주인공이다.

## 2. UX 설계 (디자인 관점)

### 2.1 디자인 시스템

새 디자인 시스템 "여행노트"를 별도로 구축했다. 원본은 https://claude.ai/artifact/BHPfvH34YRJYhptoUbwXnh 이고 저장소 사본은 `docs/superpowers/specs/2026-10-15-design-system.md`다. 방향은 "손에 든 여행 노트": 액션 색 `brand` 하나, UI는 IBM Plex Sans KR, 시각·코드는 IBM Plex Mono, 여행 제목만 Gowun Batang. 토큰 2테마(light·dark), 컴포넌트 15종, 에셋 66종(로고 7·아이콘 53·일러스트 6)이 포함된다. 아래는 그 위에 이 서비스 화면이 더하는 규칙이다.

| 추가 요소 | 규칙 |
| --- | --- |
| 편집 모드 표시 | 상단에 얇은 파란 바 "편집 중 · 저장됨/저장 중". 편집 컨트롤은 회색 아이콘 버튼, 삭제만 빨강 텍스트. |
| 빈 상태 | 두리 일러스트 1장 + 한 문장 + 액션 버튼 1개. 섹션마다 같은 구조. |
| 여행 카드 | 대표 사진 16:9, 제목, 날짜, 도시, 멤버 아바타. 홈과 내 여행 목록에서 같은 컴포넌트. |
| 권한 배지 | 보기 전용으로 열었을 때 상단에 "보기 전용 · 복제해서 내 일정으로 만들기". |

### 2.2 반응형 레이아웃

| 범위 | 레이아웃 |
| --- | --- |
| 모바일 < 600px | 기존 구조 유지. 하단 5탭, 날짜 바 sticky, 지도는 섹션 안 45vh 또는 전체화면. |
| 태블릿 600~1023px | 하단 탭이 상단 탭으로 올라간다. 본문 최대 720px 중앙 정렬. |
| 데스크톱 ≥ 1024px | 2열. 왼쪽 일정 리스트(최대 640px), 오른쪽 지도 sticky. 선택한 스톱이 지도에서 하이라이트된다. 맛집·쇼핑은 카드 그리드 2~3열. |

```
데스크톱 일정표
┌────────────────────────────────────────────────────────────┐
│ 로고   오사카·교토 가족여행 2026        [공유] [편집] [아바타]│
├─────────────────────────┬──────────────────────────────────┤
│ 10.21 수 │10.22 목│10.23 금│10.24 토                          │
│ [간략 일정] [상세 일정]  │                                  │
│ 06:00 김포공항 도착   ☐  │          지도 (sticky)            │
│ 08:10 김포 → 간사이   ☐  │   ①──②──③──④                      │
│ 09:50 간사이공항 도착 ☐  │          ⑤──⑥                    │
│   ▸ 상세·가이드          │   [▶ 하루 경로 재생]               │
│ 10:55 ICOCA·리무진    ☐  │                                  │
│ ...                      │                                  │
├─────────────────────────┴──────────────────────────────────┤
│ 날씨 · 명소 가는 길 · 메모                                   │
└────────────────────────────────────────────────────────────┘

모바일 (기존과 동일, 편집 모드만 추가)
┌──────────────────────────┐
│ ‹ 오사카·교토  [공유][⋯] │
│ 편집 중 · 저장됨          │
├ 10.21 │10.22│10.23│10.24 ┤
│ [간략] [상세]             │
│ 06:00 김포공항 도착  ⋮ ☐ │
│ 08:10 김포 → 간사이  ⋮ ☐ │
│ ＋ 일정 추가              │
├──────────────────────────┤
│ 일정 맛집 쇼핑 링크 준비   │
└──────────────────────────┘
```

### 2.3 여행 만들기 (3단계)

1. **어디로**: 도시 이름 입력(자유 텍스트, 3단계에서 검색으로 교체). 여러 도시 가능.
2. **언제**: 시작·종료 날짜. 날짜 수만큼 빈 날이 생긴다.
3. **누구와**: 동행 라벨·이모지(엄마·아빠·아들처럼). 건너뛰기 가능.

완료하면 바로 1일차 편집 화면으로 간다. 입력 전체가 1분 안에 끝나야 한다.

### 2.4 스톱 편집

- "＋ 일정 추가"는 바텀시트(모바일) 또는 사이드 패널(데스크톱)로 연다.
- 필수 입력은 **제목** 하나. 시간은 직전 스톱 시간 + 소요시간으로 기본 채운다.
- 선택 입력: 유형(관광·식사·이동·숙소·공항·쇼핑), 소요시간, 메모, 링크, 좌표(지도에서 핀 찍기), 출발 목표 버퍼.
- 순서 변경은 손잡이 드래그. 모바일은 길게 눌러 드래그.
- 저장은 필드 단위 자동 저장(debounce 800ms). 실패 시 상단 바가 "저장 실패 · 다시 시도"로 바뀌고 입력은 유지한다.

### 2.5 공유

- 공유 버튼 → 시트: "보기 링크 복사", "편집 링크 복사(2단계)", 카카오톡 공유(카카오 JavaScript SDK, 로그인과 무관하게 사용 가능).
- 보기 링크는 로그인 없이 열린다. 완료 체크는 로그인 전까지 localStorage에만 남는다.
- 공유 전 경고 1회: "예약번호·여권 정보가 메모에 있으면 지워 주세요." 기존 준비물 문구와 같은 톤.

### 2.6 접근성과 성능

기존 앱이 지키던 것(skip link, 포커스 트랩, reduced motion, 44px 터치 타깃, safe-area)을 모두 유지한다. 일정표 페이지는 서버 렌더링으로 첫 화면을 그리고, 지도는 클라이언트에서 지연 로드한다.

## 3. 기술 아키텍처

### 3.1 접근 방식 비교

| | A. Next.js + Supabase | **B. Next.js + Spring Boot(Kotlin) + PostgreSQL** (권장) | C. 기존 Vite 앱 유지 + 얇은 API |
| --- | --- | --- | --- |
| 배포 단위 | 1 (Vercel) + Supabase | 2 (Vercel + API 서버) | 2 |
| 권한·공유 로직 | RLS 정책으로 작성. 복제·공유 토큰 같은 흐름은 Edge Function 필요 | 서비스 계층에서 작성. 테스트 쉬움 | 같음 |
| 기존 경험 재사용 | 적음 | 오구오구의 BFF 쿠키 인증, Flyway, Modulith, Sentry 구성을 그대로 복사 | 프론트만 재사용 |
| 다중 페이지·SEO | 좋음 | 좋음 | 바닐라 JS로 라우팅·인증 화면을 직접 만들어야 함 |
| MVP 속도 | 가장 빠름 | 중간 | 처음엔 빠르나 2단계부터 느려짐 |

**B를 권장한다.** 공유·복제·멤버 권한은 서버 로직이 중심이고, 이미 같은 구조로 서비스 두 개를 운영해 본 경험이 있다. 몇 주 안에 띄우는 것이 최우선이면 A로 가되, 테이블 설계는 동일하게 쓴다.

### 3.1.1 기술 기준선 (2026-10 리서치 반영)

`reports/여행노트 기술 스택 트렌드 2026.md`의 권고를 반영했다. 버전은 2026-10-15 기준이며 Renovate가 갱신한다. 각 선택의 대안과 기각 이유는 `docs/adr/`에 있다.

| 영역 | 선택 | 대신 쓰지 않은 것 | ADR |
| --- | --- | --- | --- |
| 런타임 | Spring Boot 4.1.x, Spring Framework 7, Java 25, Kotlin 2.3.x | Boot 3.5(2026-06-30 OSS 종료), 4.0.x(2026-12-31 종료) | 0001 |
| 동시성 | Spring MVC + 가상 스레드, Hikari 풀 크기 명시, 외부 호출에 `@ConcurrencyLimit`·`@Retryable` | 코루틴 + WebFlux + R2DBC, Resilience4j | 0001 |
| 모듈 | Spring Modulith 2.1. auth, trip, share, progress, weather 모듈과 `ApplicationModules.verify()` 테스트 | MSA, Kafka | 0002 |
| 비동기 이벤트 | Modulith JDBC 이벤트 퍼블리케이션 레지스트리(아웃박스) | Kafka, RabbitMQ | 0002 |
| 영속성 | 쓰기는 Spring Data JPA(Hibernate 7), 읽기는 jOOQ 3.21. 컨트롤러는 DTO만 노출 | QueryDSL(원본 2021-07 이후 릴리스 없음) | 0003 |
| DB | PostgreSQL 18 + PostGIS 3.6. PK `uuidv7()`, 좌표 `geography(Point,4326)` + GiST, 동선 `geography(LineString)`. Flyway 12 | MySQL | 0004 |
| 세션·캐시 | Valkey 9.1 + Spring Session(불투명 세션 ID). 날씨 캐시와 레이트리밋 버킷도 같은 인스턴스 | JWT 쿠키, Redis 8(AGPL) | 0005 |
| 프론트 | Next.js 16.4 Cache Components, React 19.3 + React Compiler, TanStack Query v5 persist + paused mutations, Zustand 5 | SWR, Edge 런타임 | 0006 |
| 지도 | MapLibre GL JS 6 + `react-map-gl/maplibre`, Protomaps PMTiles(`name:ko`)를 R2에서 서빙. Google Places·Routes는 서버에서만 호출 | Leaflet(2023-05 이후 릴리스 없음), 카카오맵(국내 지도만) | 0007 |
| 편집 | `@dnd-kit/core` 6.3 + sortable, 순서는 fractional index, `version` 컬럼 낙관적 잠금 | `@dnd-kit/react` 0.x | 0007 |
| 디자인 토큰 | DTCG 2025.10 JSON → Style Dictionary 5 → `tokens.css`. 컴포넌트는 CSS Modules | Tailwind v4(디자인 시스템이 이미 토큰 CSS로 완결) | 0006 |
| API 계약 | springdoc-openapi 3 → `openapi.json` CI 커밋 → `openapi-typescript` + `openapi-fetch`. `/api/v1` | 수동 타입 | 0006 |
| 관측성 | `spring-boot-starter-opentelemetry` → Grafana Cloud Free(OTLP 직결), ECS 구조화 로그, Sentry(프론트·API), Speed Insights | Datadog, OTel Collector | 0008 |
| 배포 | Vercel Pro. API는 도쿄 컨테이너 1대(Docker Compose blue/green + Caddy). DB는 Supabase 서울 Pro | Kubernetes, AWS App Runner(2026-04-30 신규 중단) | 0008 |

**실시간 협업(2단계)**은 CRDT 없이 필드 단위 마지막 저장 우선 + `version` 충돌 감지 + SSE presence로 시작한다. **AI 기능**은 MVP에서 제외하고, 3단계에서 "블로그 글·예약 메일 → 스톱" 구조화 추출과 결정론적 시간 검증, Promptfoo 골든셋을 함께 넣는 경우에만 도입한다.

### 3.2 시스템 구성

```
브라우저 ──▶ Next.js (Vercel)
              ├ /app 라우트 · 서버 컴포넌트 · OG 태그
              ├ /api/* same-origin rewrite (__Host- httpOnly 세션 쿠키)
              └ 클라이언트: MapLibre 지도, 편집 UI(dnd-kit), TanStack Query
                     │
                     ▼
            Spring Boot 4.1 API (Kotlin 2.3, Java 25, Modulith 2.1)
              ├ auth      구글 OAuth, 이메일·비밀번호, Spring Session
              ├ trip      여행·날짜·스톱·섹션 CRUD, 권한
              ├ share     공유 토큰, 복제
              ├ progress  완료 체크
              └ weather   Open-Meteo 프록시 (Valkey 30분 캐시)
                     │   모듈 간 이벤트: JDBC 이벤트 레지스트리(아웃박스)
            PostgreSQL 18 + PostGIS (Flyway) · Valkey · R2(이미지·지도 타일)
```

### 3.3 데이터 모델

기존 `data.js`의 구조를 그대로 테이블로 옮긴다. 샘플 일정이 들어가는지가 모델 검증 기준이다.

```
users            id, email(citext, unique), email_verified_at, nickname, avatar_url, status, created_at
user_identities  id, user_id, provider(google|password|kakao|naver|apple), provider_subject, created_at
                 unique(provider, provider_subject)
password_credentials user_id, password_hash(argon2id), updated_at
email_tokens     id, user_id, purpose(verify|reset), token_hash, expires_at, used_at
trips            id, slug, owner_id, title, subtitle, start_date, end_date,
                 cover_image_url, visibility(private|link|public),
                 is_sample, source_trip_id, created_at, updated_at
trip_members     trip_id, user_id, role(owner|editor|viewer), joined_at
trip_travelers   id, trip_id, label, emoji, sort
trip_flights     id, trip_id, direction(outbound|return), airline, from_code, to_code,
                 depart_time, arrive_time, date
trip_route       id, trip_id, sort, code, label, vehicle, vehicle_label
trip_days        id, trip_id, day_number, date, city, theme, note, color, sort
stops            id, day_id, sort, time, title, type(airport|flight|transport|hotel|
                 meal|sight|shopping|free), details, duration, buffer, timing,
                 transport_icon, lat, lng, approximate, transit jsonb,
                 photo jsonb, links jsonb, place_id
places           id, trip_id, kind(dining|shopping|hotel|sight), name, branch, area,
                 category, icon, address, hours, map_url, note, items, menu,
                 sources jsonb, checked_at, sort
guides           id, trip_id, stop_id, kind(place|hotel|breakfast|transit|course|airport),
                 title, blocks jsonb
links            id, trip_id, group_label, label, url, note, sort
checklist_groups id, trip_id, title, hint, sort
checklist_items  id, group_id, priority, title, description, sort
stop_completions trip_id, user_id, stop_id, completed_at
item_completions trip_id, user_id, item_id, completed_at
share_links      id, trip_id, token, role(viewer|editor), expires_at, created_by
```

설계 메모:

- `transit`, `photo`, `links`는 스톱마다 모양이 달라 jsonb로 둔다. 조회 조건으로 쓰지 않는다.
- `guides.blocks`는 `[{type:'paragraph'|'steps'|'facts'|'tips'|'image'|'figure'|'links', ...}]` 구조다. 기존 가이드 모듈이 HTML 문자열을 만들던 것을 블록 렌더러 하나로 바꾼다. 이관 시에만 `type:'html'`을 허용하고 사용자 입력에서는 막는다.
- 완료 체크는 사용자별이다. 같은 여행을 보는 가족이 각자 체크하되, 2단계에서 "동행 전체 진행률"을 합산해 보여준다.
- `slug`는 공개 URL이다. 샘플은 `osaka-kyoto-family-2026`, 사용자 여행은 8자 랜덤.

### 3.4 API

```
GET   /oauth2/authorization/google  →  /login/oauth2/code/google   (Spring Security OAuth2 Client)
POST  /auth/signup {email, password, nickname}       인증 메일 발송, 계정은 미인증 상태
POST  /auth/verify-email {token}                     POST /auth/verify-email/resend
POST  /auth/login {email, password}                  미인증 계정은 로그인 거부
POST  /auth/password-reset {email}                   POST /auth/password-reset/confirm {token, password}
GET   /me   POST /logout   DELETE /me
GET   /trips                      내 여행 (멤버인 것)
POST  /trips                      만들기 → 날짜 수만큼 trip_days 생성
GET   /trips/{slug}               전체 트리 (days, stops, places, guides, links, checklists)
PATCH /trips/{id}                 제목·날짜·공개 범위
DELETE /trips/{id}
POST  /trips/{id}/clone           샘플·공개 여행 복제 (완료 체크·멤버 제외)
PATCH /days/{id}
POST  /days/{id}/stops            PATCH /stops/{id}   DELETE /stops/{id}
PUT   /days/{id}/stops/order      [stopId...]
POST  /trips/{id}/places          PATCH/DELETE /places/{id}      (links, checklists 동일)
PUT   /trips/{id}/completions/stops/{stopId}        DELETE 같은 경로
POST  /trips/{id}/share-links     GET /share/{token}  POST /share/{token}/join
GET   /weather?lat&lng&date       Redis 30분 캐시
```

권한 규칙은 한 곳에 둔다. `visibility=public` 또는 유효한 share 토큰이면 읽기 허용, `trip_members.role`이 owner·editor면 쓰기 허용, 샘플(`is_sample`)은 owner라도 쓰기 불가(복제만).

### 3.5 프론트엔드 구조와 기존 코드 재사용

| 기존 파일 | 처리 |
| --- | --- |
| `src/map.js` (285줄) | 로직 함수(`getDayRouteSegments`, `pointAlongPath`, `createGoogleMapsUrl`)는 그대로 `lib/map/`으로. `mountTripMap`의 Leaflet 렌더링은 MapLibre 훅으로 다시 쓰고, 경로 재생은 `pointAlongPath`를 재사용한다. 테스트 유지. |
| `src/weather.js`, `countdown.js`, `day-route.js` | 순수 함수라 그대로 옮긴다. |
| `src/render.js`, `main.js` | 문자열 템플릿을 React 컴포넌트로 다시 쓴다. 구조(날짜 바, 간략/상세, 스톱 행, 디스클로저)는 1:1 대응. |
| `src/design-system.css` (1,447줄) | 새 디자인 시스템으로 대체한다. 토큰은 DTCG JSON에서 Style Dictionary로 `tokens.css`를 생성하고, 컴포넌트 스타일은 `bundle.css`를 CSS Modules로 나눈다. safe-area, sticky, 포커스 트랩 같은 레이아웃 규칙만 가져온다. Tailwind는 쓰지 않는다. |
| `src/state.js` | 비로그인 완료 체크용으로 남긴다. 로그인 후 서버 저장으로 전환하며 localStorage 값을 1회 올린다. |
| `src/*-guides.js`, `place-guides.js` | 데이터는 `guides.blocks`로 이관. 렌더 함수는 블록 렌더러 1개로 대체. |
| `public/images/*` | 샘플 여행 이미지는 객체 저장소로 올리고 DB에는 URL만 둔다. 출처 표기 유지. |

라우트는 Next.js App Router. `/t/[slug]`는 서버 컴포넌트에서 전체 트리를 받아 첫 화면을 그리고, 편집·지도·체크는 클라이언트 컴포넌트가 React Query로 다룬다.

### 3.6 기존 오사카·교토 데이터 이관

1. `scripts/export-sample-trip.mjs`가 `src/data.js`와 가이드 모듈을 import해 `sample/osaka-kyoto-family-2026.json`을 만든다. 기존 모듈은 그대로 두고 읽기만 한다.
2. API의 `SampleTripSeeder`가 JSON을 읽어 트랜잭션 1개로 적재한다. 다시 실행해도 slug 기준으로 덮어쓴다(멱등).
3. 검증은 기존 `DESIGN_SYSTEM.md`가 하던 방식과 같다. 스톱 50개, 링크 482건, 미디어 72건이 모두 응답에 남아 있는지 테스트로 고정한다.
4. 두 일정의 소유자는 운영 계정 1개다. 오사카·교토는 `provenance.kind=family-original`, `is_sample=false`, `visibility=link`로 적재해 기존 URL과 같은 경로(`/t/osaka-kyoto-family-2026`)로 계속 보인다. 원본 문구는 고치지 않는다.
5. 다낭·호이안은 `sample/danang-hoian-family-2027.json`에 조사해 만든 예시다. `provenance.kind=researched-example`, `is_sample=true`, `visibility=public`으로 홈에 노출한다. 참고한 상품 페이지와 검증하지 못한 사실은 같은 이름의 `.sources.md`에 남긴다.
6. 두 JSON은 `sample/schema/trip.schema.json`(JSON Schema 2020-12)으로 CI에서 검증한다. 시더는 검증을 통과한 파일만 적재한다.
7. 복제는 두 일정 모두 허용한다. 복제본은 복제한 사용자 소유의 `private` 여행이 되고, `source_trip_id`로 원본을 가리킨다. 완료 체크, 멤버, 공유 링크는 복사하지 않는다.

### 3.7 보안·운영

- 인증은 BFF 세션 방식이다. `__Host-` httpOnly 쿠키에는 불투명 세션 ID만 두고, 세션은 Spring Session이 Valkey에 저장한다. 로그아웃과 강제 만료가 즉시 반영된다. CSRF는 Security 7 `csrf.spa()`.
- 로그인 수단은 `user_identities`의 행 하나다. 구글과 이메일 비밀번호로 시작하고, 카카오·네이버·애플은 OAuth 클라이언트 등록과 행 추가만으로 붙인다(ADR 0009).
- 이메일 가입: 비밀번호는 Argon2id(Spring Security `Argon2PasswordEncoder`)로 해시한다. 최소 10자, 유출 비밀번호 목록 검사(k-익명성 범위 조회). 인증 메일 링크는 24시간, 재설정 링크는 30분 유효하고 1회용이며 DB에는 토큰 해시만 둔다. 메일 발송은 트랜잭션 이벤트로 커밋 후 보낸다.
- 계정 연결: 구글 로그인 이메일이 인증된 이메일 계정과 같으면, 구글의 `email_verified=true`일 때만 같은 사용자에 identity를 붙인다. 미인증 이메일 계정과는 자동 연결하지 않는다(계정 탈취 방지).
- 무차별 대입 방지: 로그인·가입·재설정 요청에 IP와 이메일 기준 레이트리밋(Valkey 버킷). 응답 문구는 계정 존재 여부를 드러내지 않는다("가입된 이메일이면 메일을 보냈어요").
- 탈퇴는 세 단계로 처리한다. 계정과 여행 삭제, 구글 토큰 revoke, 업로드 이미지 삭제 큐. 2025-02 개인정보위 소셜 로그인 점검에서 지적된 항목이다.
- 공유 토큰은 32바이트 랜덤, 기본 만료 없음, owner가 회수 가능.
- 쓰기 API는 사용자당 분당 제한. 이미지 업로드(3단계)는 5MB·webp 변환.
- 관측성은 OpenTelemetry로 Grafana Cloud에 보내고, 오류는 Sentry로 받는다. SLO는 세 개다. 일정표 조회 성공률 99.5%, 일정표 첫 화면 LCP p75 2.5초 이하, 스톱 저장 p95 500ms 이하. 에러 버짓을 다 쓰면 기능 작업을 멈추고 안정화한다.
- 개인정보처리방침(2025-04 작성지침 기준)과 위탁·국외 이전 업체 목록은 첫 배포 전에 둔다.
- CI 공급망: 액션 SHA 고정 + Renovate, 클라우드 인증은 OIDC, 이미지는 Trivy 검사와 빌드 증명(Artifact Attestation).
- 샘플 외 여행은 기본 `private`. 검색 엔진에는 `public`만 노출한다.

### 3.8 테스트

| 층 | 도구 | 대상 |
| --- | --- | --- |
| 순수 함수 | Vitest 5 (기존 테스트 유지) | map, weather, countdown, day-route |
| 컴포넌트 | Vitest 5 Browser Mode + Testing Library, `toMatchScreenshot` | 날짜 바, 스톱 행, 편집 시트, 빈 상태 |
| 모듈 경계 | Spring Modulith `ApplicationModules.verify()` | 모듈 간 금지 의존 |
| API | JUnit 6 + MockK + Testcontainers 2(PostgreSQL 18 + PostGIS, Valkey) | 권한 규칙, 복제, 순서 변경, 시더 멱등성, 이벤트 재전송 |
| E2E | Playwright 1.64 + `@axe-core/playwright`, `getByRole` 기반 | 로그인 → 여행 생성 → 스톱 3개 추가 → 공유 링크로 비로그인 열기 → 샘플 복제. 모바일 375px과 데스크톱 1280px |
| 부하 | k6 2.1 | 일정표 조회와 스톱 저장. 결과 그래프를 README에 둔다 |

## 4. 단계별 작업 (추정)

| 순서 | 작업 | 산출물 |
| --- | --- | --- |
| 1 | 샘플 데이터 추출 스크립트와 JSON 스키마 확정 | `sample/*.json`, 스키마 검증 테스트 |
| 2 | API 골격: 인증, trips/days/stops CRUD, 시더 | Flyway V1, 권한 테스트 |
| 3 | Next.js 골격: 로그인, 홈, `/t/[slug]` 읽기 전용 렌더 (샘플이 기존과 같게 보여야 함) | 기존 화면과 비교 스크린샷 |
| 4 | 편집: 여행 만들기 3단계, 스톱 추가·수정·순서 | E2E 1차 |
| 5 | 공유 링크, 복제, 반응형 데스크톱 2열 | MVP 배포 |
| 6 | 2단계: 섹션 편집, 완료 체크 서버화, 편집 권한 공유, 날씨, PWA | |

1~5가 MVP다. 각 순서는 별도 구현 계획(`docs/superpowers/plans/`)으로 쪼갠다.

## 5. 결정 기록 (2026-10-16)

| 질문 | 결정 |
| --- | --- |
| 스택 | B. Next.js + Kotlin/Spring Boot + PostgreSQL. 기술 기준선은 3.1.1, 근거는 ADR 0001~0008 |
| 로그인 | 구글 로그인 + 이메일 가입. 다른 제공자는 나중에 같은 구조로 확장(ADR 0009) |
| 샘플 공개 범위 | 하나투어·모두투어 구성을 참고해 새로 조사한 다낭·호이안 일정을 공개 샘플로 쓴다. 오사카·교토 원본은 그대로 보관하고 링크 공개로 보인다 |
| 복제 허용 | 허용. 두 일정 모두 복제 가능 |
| 호스팅 | Vercel Pro + 도쿄 컨테이너 1대 + Supabase 서울(ADR 0008) |
| 브랜드 | "여행노트" 유지 |

**가정**: 오사카·교토 원본을 홈 목록에 노출하지 않고 링크로만 보이게 했다. 가족의 실제 예약 정보가 들어 있어서다. 홈에도 노출하려면 `visibility`를 `public`으로 바꾸면 된다.
