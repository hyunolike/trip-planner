# 0006. Next.js 16.4 프론트엔드와 API 계약

- 상태: 제안
- 날짜: 2026-10-16

## 맥락

화면은 두 종류다. 공유 링크로 열리는 일정표는 로그인 없이 빨리 떠야 하고 미리보기 이미지가 필요하다. 편집 화면은 상호작용이 많고, 여행 당일에는 통신이 끊겨도 체크와 메모가 동작해야 한다. 한국 대기업 공고는 Next.js를 명시하지 않지만 React, TypeScript, SSR 경험과 TanStack Query, Zustand를 직접 언급한다.

## 결정

- Next.js 16.4 App Router를 쓰고 `cacheComponents: true`와 `partialPrefetching: true`를 켠다. 공유 일정표는 `'use cache'`와 `cacheLife`로 캐시하고, 편집 후 `updateTag()`로 무효화한다.
- 요청 가로채기는 `proxy.ts`(Node 런타임)로 한다. Edge 런타임은 쓰지 않는다.
- React 19.3과 React Compiler를 켠다. 날짜 전환에는 View Transitions를 쓴다.
- 서버 상태는 TanStack Query v5다. `persistQueryClient`로 IndexedDB에 저장하고(`maxAge`는 여행 기간 이상, `buster`는 배포 버전), 오프라인에서 쌓인 변경은 `resumePausedMutations()`로 다시 보낸다.
- 편집 화면의 UI 상태는 Zustand 5로 둔다.
- 폼은 react-hook-form과 Zod 4로 검증한다.
- 디자인 토큰은 DTCG 2025.10 형식 JSON을 원본으로 두고 Style Dictionary 5로 `tokens.css`를 만든다. 컴포넌트 스타일은 CSS Modules다. 디자인 시스템 아티팩트의 `bundle.css`를 컴포넌트별로 나눠 옮긴다.
- API 타입은 springdoc-openapi 3가 만든 `openapi.json`을 CI에서 커밋하고 `openapi-typescript`와 `openapi-fetch`로 생성한다. 경로는 `/api/v1`로 버전을 둔다.
- PWA는 Serwist 9로 서비스 워커를 만든다. 웹 푸시는 VAPID로 직접 구현한다.
- 공유 미리보기 이미지는 `next/og`로 만들고 한글 서체를 서브셋해 500KB 제한 안에 넣는다.
- 린트는 Biome으로 하고, 접근성 규칙처럼 Biome에 없는 것만 ESLint로 보완한다.

## 고려한 대안

| 대안 | 기각 이유 |
| --- | --- |
| 기존 Vite 바닐라 앱 확장 | 로그인, 라우팅, 서버 렌더링, OG 이미지를 직접 만들어야 한다. |
| SWR | 오프라인 변경 큐(paused mutations)와 영속화 플러그인이 TanStack Query에 더 잘 갖춰져 있다. |
| Server Actions만으로 데이터 처리 | 오프라인 재시도와 낙관적 갱신을 직접 짜야 한다. 단발성 쓰기(공유 설정 등)에만 쓴다. |
| Tailwind v4 | 디자인 시스템이 이미 토큰 CSS와 컴포넌트 CSS로 완결되어 있다. 두 체계를 섞으면 값의 출처가 둘이 된다. |
| next-pwa | 2022-08 이후 배포가 없다. |
| Jotai 3 | 2026-09에 나온 메이저 버전이라 6개월 뒤 다시 본다. |

## 결과

- 좋은 점: 공유 일정표는 캐시된 HTML로 빠르게 뜨고, 편집은 오프라인에서도 동작한다. API 타입이 백엔드와 어긋나면 빌드가 실패한다.
- 감수할 점: Cache Components는 16.4에서 권장으로 바뀐 기능이라 사례가 적다. 서비스 워커는 Turbopack 개발 모드에서 검증하기 어려워 프로덕션 빌드 CI에서 확인한다.

## 확인 필요

- springdoc 3.x가 OpenAPI 3.1을 기본으로 출력하는지 샘플 앱에서 확인한다.
