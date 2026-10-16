# 여행노트 MVP 로드맵

**Spec:** `docs/superpowers/specs/2026-10-15-b2c-trip-planner-design.md` (개정 2026-10-16)
**ADR:** `docs/adr/0001`~`0009`

설계는 서로 독립적으로 테스트할 수 있는 다섯 개의 하위 계획으로 나눈다. 각 계획은 끝났을 때 혼자서 동작하는 결과물을 낸다. 뒤 계획은 앞 계획이 실제로 만든 인터페이스(JSON 스키마, OpenAPI 계약)를 읽고 쓴다. 그래서 3~5번은 2번이 끝나 `openapi.json`이 커밋된 뒤에 작성한다.

| 순서 | 계획 | 결과물 | 상태 |
| --- | --- | --- | --- |
| 1 | [샘플 데이터 파이프라인](2026-10-16-sample-data-pipeline.md) | 스키마 검증기, 오사카·교토 원본을 손실 없이 JSON으로 내보내는 도구, 다낭·호이안 샘플 검증 (5개 작업) | 작성 완료 |
| 2 | [API 기반](2026-10-16-api-foundation.md) | Spring Boot 4.1 API: 이메일·구글 로그인, 여행 조회·편집, 샘플 시더, 복제, 탈퇴, OpenAPI 계약, CI (12개 작업) | 작성 완료 |
| 3 | [웹 읽기 화면](2026-10-16-web-read.md) | Next.js 16.4 앱: 홈, 로그인·가입·인증·재설정·내 정보, `/t/[slug]` 일정표(샘플 두 개), MapLibre 지도, 날씨 프록시, 디자인 토큰 패키지 (13개 작업) | 작성 완료 |
| 4 | 웹 편집 | 여행 만들기 3단계, 스톱 추가·수정·순서 변경, 오프라인 변경 큐 | 3번 완료 후 작성 |
| 5 | 공유·배포 | 공유 링크, 복제 버튼, OG 이미지, 데스크톱 2열, CI/CD, 관측성, 첫 배포 | 4번 완료 후 작성 |

## 저장소 구조 (모든 계획 공통)

```
trip-planner/
├ src/, public/, tests/, index.html     기존 오사카·교토 Vite 앱. 3번 계획 끝까지 그대로 둔다
├ sample/
│ ├ schema/trip.schema.json             샘플 여행 JSON 스키마 (1번)
│ ├ osaka-kyoto-family-2026.json        원본 내보내기 결과 (1번)
│ └ danang-hoian-family-2027.json       조사해 만든 예시 (1번에서 검증)
├ scripts/sample/                       검증기와 내보내기 도구 (1번)
├ apps/api/                             Kotlin Spring Boot API (2번)
├ apps/web/                             Next.js 앱 (3번)
├ packages/design-tokens/               DTCG 토큰과 Style Dictionary 빌드 (3번)
├ docs/adr/, docs/superpowers/
└ brand/logo/
```

## 설계 문서 3.4절 API의 배분

2번 계획은 인증, 여행 조회, 여행 만들기, 스톱 편집·순서, 복제, 탈퇴를 만든다. 나머지는 그 API를 처음 쓰는 화면과 함께 만든다.

| API | 계획 |
| --- | --- |
| `GET /weather` (Open-Meteo 프록시, Valkey 30분 캐시) | 3번. 일정표 화면의 날씨 카드와 함께 |
| `PATCH /trips/{id}`(제목·날짜), `DELETE /trips/{id}`, `PATCH /days/{id}`(도시·테마·메모) | 4번. 편집 화면과 함께 |
| 완료 체크 `PUT/DELETE /trips/{id}/completions/stops/{stopId}` | 4번. 비로그인 localStorage 체크를 로그인 후 서버로 올리는 흐름과 함께 |
| 공유 링크 `POST /trips/{id}/share-links`, `GET /share/{token}`, 공개 범위 변경 | 5번 |
| 장소·링크·체크리스트 편집 | 2단계(MVP 이후) |

기존 Vite 앱은 3번 계획에서 새 웹앱이 같은 일정을 같은 품질로 보여줄 때까지 지우지 않는다. 그 전까지 `pnpm test`는 기존 테스트와 새 스크립트 테스트를 함께 돌린다.

## 실행 방식

각 계획은 `superpowers:subagent-driven-development` 또는 `superpowers:executing-plans`로 실행한다. 계획 하나가 끝날 때마다 브랜치 전체 리뷰를 받고 다음 계획을 쓴다.
