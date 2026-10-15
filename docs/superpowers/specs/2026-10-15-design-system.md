# 여행노트 디자인 시스템

작성일: 2026-10-15 · 상태: 검토 대기 · 원본: https://claude.ai/artifact/BHPfvH34YRJYhptoUbwXnh (토큰·컴포넌트 미리보기·에셋 66종)

이 문서는 아티팩트의 브랜드 북과 토큰을 저장소에 옮겨 적은 것이다. 값이 바뀌면 아티팩트를 먼저 고치고 이 문서를 다시 생성한다. 기존 `DESIGN_SYSTEM.md`는 현재 Vite 앱의 기록이며, 새 서비스는 이 시스템을 쓴다.

## 브랜드 북

여행노트는 여행 당일 손에 들고 보는 일정표다. 예약은 다른 곳에서 하고, 시간·동선·메모·체크는 여기서 본다. 이 시스템은 그 화면을 만드는 모든 사람과 에이전트를 위한 규칙이다. 토큰 이름은 `tokens.json`의 것이고, 컴포넌트는 `components/`의 가이드와 미리보기를 따른다.

## 원칙

1. **다음 행동이 먼저 보인다.** 한 화면의 질문은 하나다. "지금 어디로 가야 하지?"에 답하는 요소(시각, 제목, 지도 핀)가 가장 크고, 나머지는 그 아래에 접힌다.
2. **사용자가 쓴 내용이 주인공이다.** 색과 장식은 물러서고, 제목·메모·사진이 화면을 채운다. 액션 색은 `brand` 하나뿐이다.
3. **근거를 옆에 둔다.** 영업시간·요금·운행 정보 옆에는 출처 링크와 확인일을 `caption`으로 붙인다. 추정이면 "약", "예상", "방문 전 확인"을 쓴다.
4. **종이처럼 안정적이다.** 레이아웃은 스크롤 중에 움직이지 않고, 모션은 140ms 안에 끝나며, 로딩 중에도 틀은 먼저 그려진다.

## 콘텐츠

- 말투는 "~해요"로 끝나는 안내문이다. 명령형("확인하세요")은 꼭 해야 하는 일에만 쓴다. 기존 일정 문장이 기준이다: "가족 QR을 미리 준비하세요." / "대기가 길면 가까운 다른 식당으로 변경해요."
- 시각은 24시간 `09:50`, 날짜는 `10.21 수`, 기간은 `3박 4일`, 공항·역 코드는 대문자 `GMP → KIX`, 요금은 `¥1,200`. 이 값들은 모두 `data` 계열 스타일로 조판한다.
- 확실하지 않은 정보에는 근거 수준을 붙인다: `예약 확정`, `가족 계획`, `상품 안내`, `방문 전 확인`. 이 네 가지는 Badge 컴포넌트의 톤과 짝을 이룬다.
- 이모지는 이동 수단 표기(🚌 ✈️ 🚶)에만, 그것도 아이콘 세트로 교체 가능한 자리에서만 쓴다. 제목·버튼·섹션 마커에는 쓰지 않는다.
- 버튼 라벨은 동사로 끝낸다: `일정 추가`, `링크 복사`, `내 여행으로 복제`. 완료 토스트는 결과를 말한다: `링크를 복사했어요`.
- 오류는 원인과 다음 행동을 한 문장씩: `저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.`

## 색

- 바닥은 `canvas`, 올려진 면은 `surface`, 들어간 면은 `surface-sunken`. 섹션 구분은 이 세 단차로만 하고 그림자는 쓰지 않는다. 카드 외곽선은 `line`.
- 텍스트는 `ink`(본문), `ink-muted`(보조), `ink-faint`(플레이스홀더·비활성). `ink-faint`는 본문 크기 텍스트에 쓰지 않는다(light에서 3.3:1).
- 액션은 `brand` 하나다. 기본 버튼 채움, 링크, 선택 밑줄, 지도의 현재 위치. hover는 `brand-hover`, 그 위 텍스트는 `on-brand`(dark에서는 어두운 잉크).
- 상태색은 액션색이 아니다. `success`는 완료·확정, `warning`은 확인 필요·버퍼 경고, `danger`는 삭제·실패·승선 불가. 셋 다 반드시 단어나 아이콘과 함께 쓰고, 배경은 `-soft` 짝을 쓴다. success와 danger는 색상뿐 아니라 밝기로도 구분된다(light 기준 success 5.3:1, danger 4.9:1).
- 교통 색(`transit-*`)은 지도 경로선과 이동 수단 칩에만 쓴다. 항공 보라, 철도 파랑, 버스 갈색, 도보 초록(점선), 선박 청록. 이 다섯은 UI 액션에 쓰지 않는다.
- 두 테마는 같은 토큰 이름을 쓴다. dark에서 `brand`가 밝아지므로 `on-brand`도 함께 바뀐다. 컴포넌트는 토큰만 참조하고 hex를 직접 쓰지 않는다.

## 타이포그래피

- 세 가족을 역할로 나눈다. `display`(Gowun Batang)는 여행 제목과 날짜 테마 문장에만, `sans`(IBM Plex Sans KR)는 UI와 본문, `mono`(IBM Plex Mono)는 시각·코드·요금 같은 데이터에. 명조는 한 화면에 한 번만 나오고, 버튼이나 라벨에는 절대 쓰지 않는다.
- 세 가족 모두 Google Fonts에서 받는다. `<link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap">`. 폴백은 Apple SD Gothic Neo와 Noto.
- 스톱 제목은 `title-md`, 상세 본문은 `body-lg`(17/28), 보조 정보는 `body-sm`, 출처·확인일은 `caption`. 시각은 `data-lg`에 `font-variant-numeric: tabular-nums`.
- 본문 한 줄은 한글 기준 34~40자(약 640px)를 넘지 않는다. 제목에는 `text-wrap: balance`.

## 간격·모서리·높이

- 4px 체계. 컴포넌트 안은 `space-1`~`space-4`, 컴포넌트 사이 `space-4`~`space-6`, 섹션 사이 `space-8`(모바일)·`space-10`(데스크톱).
- 좌우 거터는 모바일 `space-5`(20px), 360px 미만 `space-4`, 데스크톱 `space-6`.
- 모서리는 역할로 고정한다. 버튼·입력 `radius-sm`, 카드·썸네일 `radius-md`, 시트·모달 `radius-lg`, 칩·아바타 `radius-full`. 같은 화면에서 역할이 다른 요소가 같은 둥글기를 갖지 않게 한다.
- 터치 타깃은 `control-md`(44px) 이상. 시각적으로 36px인 칩도 터치 영역은 44px로 확장한다.

## 레이아웃

- 모바일(<600px): 1열, 하단 BottomNav, 상단 DayBar sticky. 지도는 `map-mobile`(45vh) 또는 전체화면.
- 태블릿(600–1023px): 1열, 본문 `container-sm`(640px) 중앙. BottomNav가 상단 탭으로 올라간다.
- 데스크톱(≥1024px): 2열. 왼쪽 일정 리스트 최대 640px, 오른쪽 지도 sticky. 전체 폭 `container-lg`.
- 항상 safe-area를 더한다: 하단 내비는 `padding-bottom: env(safe-area-inset-bottom)`, 좌우 거터는 `max(거터, env(safe-area-inset-*))`.

## 모션

- 두 길이만 쓴다. 140ms(압축, 체크, 색 변화)와 220ms(시트 열림, 디스클로저, 날짜 전환). 이징은 `cubic-bezier(.2,.8,.2,1)`.
- 사용자의 행동은 즉시 반영하고 모션은 그 뒤를 따른다. 저장 대기 때문에 UI를 늦추지 않는다.
- 지도 경로 재생은 유일한 장식적 모션이다. 보이는 지도에서만 돌고, 스크롤로 벗어나면 멈추고, `prefers-reduced-motion`에서는 끈다.

## 상태

- 로딩: 스켈레톤은 `surface-sunken` 면, 모션 없음. 첫 화면 틀(상단 바·날짜 바)은 데이터 전에 그린다.
- 빈 상태: `assets/Illustrations`의 스팟 일러스트 1장(최대 200px) + 한 문장 + 버튼 1개. EmptyState 컴포넌트.
- 저장 상태: 편집 모드 상단 바에 `저장됨` / `저장 중` / `저장 실패 · 다시 시도`. 실패해도 입력은 지우지 않는다.
- 포커스: `focus-ring` 2px 실선, 2px 오프셋. 마우스 클릭에는 `:focus-visible`로만 보인다.
- 완료: StopRow가 `success` 체크와 `ink-muted` 제목으로 바뀌고, 행은 사라지지 않는다("완료 숨기기"는 별도 토글).

## 아이콘과 이미지

- 아이콘은 `assets/Icons`의 24px 라인 세트(1.75px, 둥근 끝). 잉크는 `#171b22`로 고정 그려져 있으므로 색을 바꾸려면 인라인 SVG로 넣고 `stroke`를 토큰으로 교체한다. 텍스트 옆 아이콘은 20px, 내비게이션은 24px, 빈 상태 일러스트는 최대 200px.
- 로고는 `assets/Logos`. 마크 주변 여백은 마크 높이의 25%. 어두운 면 위에는 흰색 단색 마크. 워드마크는 별도 파일 없이 `display-lg`로 "여행노트"를 조판한다.
- 사진은 `radius-md`, 16:9 또는 4:3. 외부 사진에는 출처 캡션을 붙인다. 사진 위 텍스트는 두지 않는다.

## 색 토큰

| 이름 | Light | Dark | 용도 |
| --- | --- | --- | --- |
| `canvas` | `#f7f8fa` | `#0f1216` | 페이지 배경. 모든 화면의 바닥면. 섹션 사이 구분은 이 색과 surface의 단차로만 한다. |
| `surface` | `#ffffff` | `#161a20` | 카드, 시트, 상단 바, 목록 행의 면. canvas 위에 놓인다. |
| `surface-sunken` | `#eef1f5` | `#1e232b` | 입력창 배경, 세그먼트 컨트롤 트랙, 비활성 칩, 지도 플레이스홀더. |
| `surface-brand` | `#e7edfb` | `#1c2740` | 선택된 날짜, 선택된 탭, 브랜드 톤 알림면. 위에는 brand 텍스트(light) 또는 brand(dark)를 올린다. |
| `line` | `#e2e6ec` | `#2a313b` | 구분선, 카드 외곽선, 입력창 기본 테두리. 의미를 전달하지 않는 선. |
| `line-strong` | `#c9cfd8` | `#3a4350` | 체크박스·라디오 기본 테두리, 드래그 핸들 점. 의미를 가진 선이라 3:1 이상을 지킨다. |
| `ink` | `#171b22` | `#eceff3` | 본문·제목 텍스트, 아이콘. surface와 canvas 위에서 15:1 이상. |
| `ink-muted` | `#5b6472` | `#a4adba` | 보조 텍스트: 소요시간, 위치, 확인일, 캡션. surface·canvas·surface-sunken 위 4.5:1 이상. |
| `ink-faint` | `#8a93a2` | `#717b89` | 플레이스홀더, 비활성 텍스트, 장식 아이콘. 본문에는 쓰지 않는다(3.3:1). 24px 이상 또는 비활성 상태에만. |
| `brand` | `#2456d6` | `#7a9bf7` | 하나뿐인 액션 색. 기본 버튼 채움, 링크, 선택된 날짜 밑줄, 지도 현재 스톱. surface 위 6.2:1(light), 6.6:1(dark). |
| `brand-hover` | `#1b45b3` | `#93aefa` | brand의 hover·active. 포커스 링은 별도 focus-ring을 쓴다. |
| `on-brand` | `#ffffff` | `#0f1216` | brand 채움 위 텍스트와 아이콘. dark에서는 brand가 밝아지므로 어두운 잉크를 쓴다. |
| `focus-ring` | `#2456d6` | `#93aefa` | 키보드 포커스 링. 2px 실선, 2px 오프셋. 모든 면 위에서 3:1 이상. |
| `success` | `#177a44` | `#5cc48a` | 방문 완료 체크, 저장됨 상태, 예약 확정 배지. 항상 아이콘이나 단어와 함께 쓴다. |
| `success-soft` | `#e3f3ea` | `#15301f` | success 배지와 완료 행의 배경. |
| `warning` | `#a3570a` | `#e39a3b` | 출발 목표·버퍼 경고, 방문 전 확인 필요, 면세 조건 확인. 텍스트로 쓸 때 surface 위 5.3:1. |
| `warning-soft` | `#fbeedd` | `#3a2710` | warning 배지와 안내면의 배경. |
| `danger` | `#cf3a32` | `#f0756c` | 삭제, 저장 실패, 티켓 없이는 승선 불가 같은 되돌릴 수 없는 경고. 텍스트 버튼과 배지에만. |
| `danger-soft` | `#fde8e6` | `#3d1a18` | danger 배지와 오류 안내면의 배경. |
| `transit-flight` | `#6d4bd8` | `#a48cf2` | 지도 경로선과 이동 수단 칩: 항공. 교통 색은 brand와 별개로 의미를 유지한다. |
| `transit-train` | `#2456d6` | `#7a9bf7` | 지도 경로선과 이동 수단 칩: 철도·지하철. |
| `transit-bus` | `#a3570a` | `#e39a3b` | 지도 경로선과 이동 수단 칩: 버스·리무진. |
| `transit-walk` | `#177a44` | `#5cc48a` | 지도 경로선과 이동 수단 칩: 도보. 점선으로 그린다. |
| `transit-boat` | `#0a7a8c` | `#4fc3d6` | 지도 경로선과 이동 수단 칩: 선박·크루즈. |
| `overlay` | `#171b2299` | `#00000099` | 바텀시트·모달 뒤 딤 처리. 60% 불투명. |

## 서체

| 가족 | 스택 |
| --- | --- |
| `display` | "Gowun Batang", "Apple SD Gothic Neo", "Noto Serif KR", serif |
| `sans` | "IBM Plex Sans KR", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif |
| `mono` | "IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace |

| 스타일 | 가족 | 크기/행간 | 굵기 | 용도 |
| --- | --- | --- | --- | --- |
| `display-xl` | display | 40px / 48px | 700 | 데스크톱 여행 제목, 홈 헤드라인. 한 화면에 하나. |
| `display-lg` | display | 28px / 36px | 700 | 모바일 여행 제목, 여행 카드의 큰 제목. |
| `display-md` | display | 22px / 30px | 700 | 날짜별 테마 문장. 일정 리스트 맨 위 한 줄. |
| `title-lg` | sans | 22px / 30px | 600 | 섹션 제목(일정·맛집·쇼핑·링크·준비). |
| `title-md` | sans | 18px / 26px | 600 | 스톱 제목(모바일), 카드 제목, 시트 제목. |
| `title-sm` | sans | 16px / 24px | 600 | 체크리스트 그룹 제목, 목록 소제목. |
| `body-lg` | sans | 17px / 28px | 400 | 스톱 상세 본문. 긴 안내문은 이 크기로 읽힌다. |
| `body` | sans | 15px / 24px | 400 | 기본 본문, 카드 설명, 입력 텍스트. |
| `body-sm` | sans | 14px / 22px | 400 | 소요시간·위치 같은 보조 정보, 버튼 라벨(보조). |
| `label` | sans | 13px / 18px | 500 | 배지, 탭 라벨, 상태 라벨. 대문자 영문은 0.04em. |
| `caption` | sans | 12px / 16px | 400 | 확인일, 출처, 사진 캡션. ink-muted로. |
| `data-lg` | mono | 20px / 24px | 500 | 스톱 시각, 카운트다운 숫자. tabular-nums. |
| `data` | mono | 14px / 20px | 500 | 공항 코드, 편명, 날짜 바의 날짜, 가격(¥1,200). |
| `data-sm` | mono | 12px / 16px | 500 | 역 코드, 좌표, 작은 타임스탬프. |

## 간격

4px 기준. 컴포넌트 안은 1–4, 컴포넌트 사이는 4–6, 섹션 사이는 8–12.

| 이름 | 값 | 용도 |
| --- | --- | --- |
| `space-1` | `4px` | 아이콘과 라벨 사이, 배지 안 세로 여백. |
| `space-2` | `8px` | 칩 사이, 버튼 안 아이콘 간격, 목록 행 안 세로 간격. |
| `space-3` | `12px` | 버튼 가로 안쪽 여백(sm), 카드 안 요소 간격. |
| `space-4` | `16px` | 카드·시트 안쪽 여백, 360px 미만 화면의 좌우 거터. |
| `space-5` | `20px` | 모바일 좌우 거터, 스톱 행 세로 여백. |
| `space-6` | `24px` | 데스크톱 좌우 거터, 섹션 안 블록 간격. |
| `space-8` | `32px` | 섹션 사이(모바일). |
| `space-10` | `40px` | 섹션 사이(데스크톱), 빈 상태 위아래. |
| `space-12` | `48px` | 페이지 상단 여백(데스크톱), 히어로 아래. |
| `space-16` | `64px` | 하단 내비게이션 높이 + 안전 영역을 위한 페이지 바닥 여백. |

## 모서리

| 이름 | 값 | 용도 |
| --- | --- | --- |
| `radius-xs` | `4px` | 체크박스, 작은 배지, 코드 칩. |
| `radius-sm` | `6px` | 버튼, 입력창, 세그먼트 컨트롤 트랙. |
| `radius-md` | `10px` | 카드, 사진 썸네일, 알림면. |
| `radius-lg` | `16px` | 바텀시트 상단, 모달, 큰 사진. |
| `radius-full` | `999px` | 칩, 아바타, 플로팅 버튼, 진행 막대. |

## 그림자

| 이름 | 값 | 용도 |
| --- | --- | --- |
| `shadow-sm` | `0 1px 2px #171b220f · dark 0 1px 2px #00000066` | sticky 날짜 바, 상단 바가 스크롤 위에 떠 있을 때. |
| `shadow-md` | `0 4px 12px #171b2214 · dark 0 4px 12px #00000080` | 토스트, 드롭다운, 드래그 중인 스톱 행. |
| `shadow-sheet` | `0 -8px 24px #171b221f · dark 0 -8px 24px #00000099` | 바텀시트. 카드에는 그림자 대신 line 테두리를 쓴다. |

## 크기

높이와 너비 기준값. 터치 타깃은 44px 아래로 내려가지 않는다.

| 이름 | 값 | 용도 |
| --- | --- | --- |
| `control-sm` | `36px` | 칩, 보조 버튼, 세그먼트 컨트롤 높이. 터치 영역은 44px로 늘린다. |
| `control-md` | `44px` | 기본 버튼·입력창 높이. 최소 터치 타깃. |
| `control-lg` | `52px` | 주요 액션 버튼(시트 하단), 로그인 버튼. |
| `nav-height` | `56px` | 상단 바와 하단 내비게이션 높이(안전 영역 제외). |
| `container-sm` | `640px` | 모바일·태블릿 본문 최대 너비. 일정 리스트 열 너비. |
| `container-lg` | `1200px` | 데스크톱 2열 레이아웃 최대 너비. |
| `map-mobile` | `45vh` | 모바일 섹션 안 지도 높이. |

## 컴포넌트

Button, TextField, SegmentedControl, TopBar(편집 바), DayBar, BottomNav, StopRow, ChecklistItem, TripCard, PlaceCard, Badge, Toast, EmptyState, BottomSheet, TransitLegend. 각 컴포넌트의 가이드와 라이브 미리보기는 아티팩트의 `components/<이름>/`에 있다. 스타일은 `components/bundle.css` 한 파일이며 모든 값이 토큰을 참조한다.

## 에셋

Codex CLI(`codex exec`)로 제작한 벡터 66종. 모두 명시적 hex 색, `currentColor` 없음, xmllint·rsvg-convert 검증 통과.

- Logos 7: mark, mark-mono-ink, mark-mono-white, app-icon, app-icon-maskable, favicon, og-frame. 마크는 접힌 노트 위 점선 경로와 핀.
- Icons 53: 24px 라인, 1.75px, 둥근 끝. 일정 유형 12 · 동작 18 · 여행 정보 12 · 날씨 6 · 내비 5. 잉크 `#171b22` 고정이라 색을 바꾸려면 인라인 SVG.
- Illustrations 6: empty-itinerary, empty-checklist, empty-search, empty-share, offline(240×160), hero-route(640×360).

저장소에 가져오려면 아티팩트의 Assets 탭에서 내려받거나 `scratchpad`의 제작 폴더를 `public/brand/`로 복사한다. PNG 앱 아이콘(192·512)은 `rsvg-convert`로 생성한다.
