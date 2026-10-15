# 여행노트 프론트엔드 기술 스택 트렌드 (2026-10 기준)

조사 범위: Next.js(App Router) + React + TanStack Query + 지도 + 디자인 토큰 기반 디자인 시스템 + PWA + Playwright/Vitest 스택으로 반응형 B2C 여행 일정 서비스를 만들 때 2026년 10월 현재 무엇이 안정적이고 채택할 만한지. 버전·날짜·다운로드 수는 2026-10-15에 npm 레지스트리(`registry.npmjs.org`, `api.npmjs.org/downloads/point/last-week`)와 GitHub API(`gh api repos/...`)를 직접 조회한 값이며, 아래에서 "npm 조회"/"GitHub 조회"로 표기한다. 2025년 이전 사실은 "배경"으로 표시했다.

> 조사 중 세션의 웹 검색 할당량이 소진되어 일부 항목(Panda CSS 2.0 릴리스 노트, 우아한형제들/토스 기술 블로그의 프레임워크 선택 글, State of JS 2025 테스트 도구 수치)은 검색하지 못했다. 해당 항목은 각 섹션 Gaps에 남겼다.

---

## 1. Next.js 15/16과 React 19: 2026년에 무엇이 안정인가 (RSC, Server Actions, PPR, React Compiler, Turbopack, `use cache`, Node vs Edge)

### Takeaway
2026년 10월 현재 Next.js 16.4(2026-10-06)와 React 19.3(2026-09-09)이 최신 안정 버전이다. Turbopack과 React Compiler 지원은 16.0에서 안정화됐고, PPR은 별도 플래그가 사라지고 `'use cache'` 기반 "Cache Components" 모델로 흡수되어 16.4부터 Vercel이 모든 앱에 공식 권장하며 Next.js 17에서 기본값이 된다. 미들웨어는 Node 런타임의 `proxy.ts`로 바뀌어 Edge 런타임은 사실상 레거시 경로가 됐다.

### Cited Findings

**Next.js 16 계열**
- Next.js 16 정식 릴리스 2025-10-21. 핵심: Cache Components(`cacheComponents: true`, `'use cache'` 지시어, 컴파일러가 캐시 키 자동 생성), Turbopack 안정화 및 기본 번들러(프로덕션 빌드 2~5배, Fast Refresh 최대 10배; 15.3+ 기준 개발 세션 50%·프로덕션 빌드 20%가 이미 Turbopack), React Compiler 지원 안정화(`reactCompiler: true`, 기본 off, Babel 의존이라 빌드 느려짐), `proxy.ts`가 `middleware.ts` 대체(Node.js 런타임에서 실행; `middleware.ts`는 Edge 용도로 남지만 deprecated), React 19.2 + canary 기능(View Transitions, `useEffectEvent`, `<Activity/>`) — [Next.js 16](https://nextjs.org/blog/next-16)
- Next.js 16에서 `experimental.ppr` 플래그와 라우트 단위 `experimental_ppr` export가 제거되고 Cache Components 모델로 "진화"함. `experimental.dynamicIO`는 `cacheComponents`로 이름 변경 — [Next.js 16](https://nextjs.org/blog/next-16)
- Cache Components는 "완전 opt-in": 모든 동적 코드는 기본적으로 요청 시점에 실행되며, 이전 App Router의 암묵적 캐싱이 사라짐 — [Next.js 16](https://nextjs.org/blog/next-16)
- 새 캐시 API: `revalidateTag(tag, cacheLifeProfile)`(2번째 인자 필수, SWR 동작, `'max'` 권장), Server Actions 전용 `updateTag()`(read-your-writes), `refresh()`(비캐시 데이터만 갱신) — [Next.js 16](https://nextjs.org/blog/next-16)
- 브레이킹: Node.js 20.9+, TypeScript 5.1+, Chrome/Edge/Firefox 111+ · Safari 16.4+; `params`/`searchParams`/`cookies()`/`headers()` 비동기 필수; `next lint` 제거("Biome 또는 ESLint를 직접 사용"); `@next/eslint-plugin-next`가 Flat Config 기본(ESLint v10이 legacy config 폐기 예정); `images.qualities` 기본 `[75]`, `minimumCacheTTL` 4시간; 병렬 라우트 슬롯에 `default.js` 필수; `next dev`/`next build` 출력 디렉터리 분리 — [Next.js 16](https://nextjs.org/blog/next-16)
- 라우팅 개편: 레이아웃 중복 제거 프리페치, 증분 프리페치(뷰포트 이탈 시 취소, hover 우선) — [Next.js 16](https://nextjs.org/blog/next-16)
- Next.js 16.1(2025-12-18): Turbopack 파일시스템 캐시(dev), 번들 분석기, Node 디버깅 개선 — [Next.js Blog](https://nextjs.org/blog)
- 보안: CVE-2025-66478(2025-12-03) React Server Components 프로토콜의 인증 없는 원격 코드 실행 취약점, 19.0.1/19.1.2/19.2.1에서 패치; 2025-12-11 추가 RSC 취약점 2건(DoS, 소스 노출) — [React Blog](https://react.dev/blog), [Next.js Blog](https://nextjs.org/blog)
- Next.js 16.2(2026-03-18): Adapters API 안정화, 렌더링 성능, 디버깅/에러 페이지 개선; 2026-03-25 "Next.js Across Platforms" 글에서 OpenNext 및 공개 어댑터 테스트 스위트·워킹그룹 약속 — [Next.js Blog](https://nextjs.org/blog)
- Next.js 16.3(2026-08-03): 개발 서버 메모리 최대 90% 절감(디스크 캐시+메모리 eviction 기본 on), `next build` 디스크 캐시 기본 on(CI 최대 5.5배), TypeScript 7로 타입체크 가능(`pnpm add -D typescript@^7`), App Router SSR을 Node 네이티브 스트림으로 교체해 부하 시 22% 더 많은 요청 처리, `catchError` 커스텀 에러 바운더리(`retry()`로 서버 컴포넌트 재렌더), `import.meta.glob`, `next/root-params`(예: `lang()`), **Instant Navigations**(`cacheComponents: true` + `partialPrefetching: true`), Instant Insights 데브툴, Navigation Inspector, `@next/playwright`의 `instant()` 테스트 헬퍼, 실험적 Rust React Compiler(`experimental.turbopackRustReactCompiler`, v0 기준 cold 34%/warm 46% 단축), 실험적 `experimental.useOffline` + `useOffline()` 훅 — [Next.js 16.3](https://nextjs.org/blog/next-16-3)
- 16.3 글의 명시: "Instant Navigations 뒤의 동작은 향후 메이저 버전에서 기본값이 된다… dynamic by default, 숨겨진/암묵적 캐싱 없음" — [Next.js 16.3](https://nextjs.org/blog/next-16-3)
- Next.js 16.4(2026-10-06): "**Starting with Next.js 16.4, we're excited to recommend Cache Components as the best choice for every Next.js app.**" `create-next-app`으로 만든 새 앱은 Cache Components 기본 활성. "Cache Components … will become the default in Next.js 17." 추가: `ensureStatic`('navigation'|'prefetch'|'shell')로 라우트 정적성 빌드 시 강제, `navigation()`/`prefetch()` await로 프리페치에서 제외, React 19.3 동봉, `next upgrade --agent`, Turbopack 디스크 캐시 20~25% 축소(Zstd), 프로덕션 CSS Module 클래스명 단축 + export mangling, 실험적 `turbopackGc`/`turbopackLazyDynamicImports`/worker threads/`turbopackAdditionalRoots`(pnpm global virtual store 연동) — [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- Next.js 17 공식 발표 글은 2026-10-15 현재 nextjs.org/blog에 없음 — [Next.js Blog](https://nextjs.org/blog)
- npm 조회: `next` 16.4.1(2026-10-14 게시), 주간 다운로드 67,469,854; GitHub 조회: vercel/next.js 143,024 stars, 2026-10-15 push.

**React 19.x**
- React 19.2(2025-10-01): `<Activity>`, React Performance Tracks(Chrome DevTools), `useEffectEvent`, `cacheSignal`, Partial Pre-rendering용 API — [React 19.2](https://react.dev/blog/2025/10/01/react-19-2); [React Blog 색인](https://react.dev/blog)
- React Compiler v1.0 안정 릴리스 2025-10-07. Meta 대형 앱에서 검증, Babel 플러그인, Expo/Vite/Next.js와 협력해 신규 앱에서 기본 활성 가능, 컴파일러 기반 lint 규칙이 `eslint-plugin-react-hooks` recommended 프리셋에 포함 — [React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1)
- React Foundation: 2025-10-07 발표, 2026-02-24 Linux Foundation 산하로 출범 — [React Blog](https://react.dev/blog)
- React 19.3(2026-09-09): **View Transitions(`<ViewTransition>`)와 Fragment Refs가 실험 → 안정**, `browser()`(`use(browser())`로 서버 렌더 opt-out), Trusted Types 지원, Server Component에서 `<Context>` 직접 렌더(Provider 래퍼 불필요), Flight에서 `<Activity>` 지원. React 20 언급 없음 — [React 19.3](https://react.dev/blog/2026/09/09/react-19-3)
- Create React App 2025-02-14 sunset(Vite/Parcel/RSBuild 또는 프레임워크 권고) — [React Blog](https://react.dev/blog)
- npm 조회: `react` 19.3.1(2026-10-14), 주간 187,962,192.

**설문/채택 신호**
- State of React 2025(Devographics, 3,760명, 2025-11~2026-01 응답): React 19 일상 사용 48%, React 18 41%; SPA 84%, SSR 61%, SSG 44%; Suspense가 신규 API 중 채택·만족 최고; Server Components와 Server Functions는 "polarizing"하며 각각 3·4번째로 싫어하는 기능; `useEffect`가 훅 불만 1위(37%) — [certificates.dev 분석](https://certificates.dev/blog/breaking-down-state-of-react-2025-results), [Strapi 요약](https://strapi.io/blog/state-of-react-2025-key-takeaways)
- State of React 2025 라이브러리: Next.js 사용률 80%(가장 많이 코멘트된 라이브러리), TanStack Query 68.1%(가장 긍정적 평가), shadcn/ui 20%→56%(2년), TanStack Start 인지도 55%→81%(1년) — [State of React 2025 Libraries](https://2025.stateofreact.com/en-US/libraries/)
- Netlify 비교 가이드: Next.js는 "가장 성숙한 기본값", TanStack Start는 2026년 1.0 도달했지만 "a credible choice, not yet a default one" — [Netlify KB](https://www.netlify.com/knowledge-base/tanstack-start-vs-nextjs.md)

### Inferences
- 여행노트처럼 "공개 콘텐츠(공유 링크, 일정 열람) + 로그인 사용자 에디터"가 섞인 앱은 Cache Components 모델이 정확히 겨냥한 사례다. 16.4부터 Vercel이 greenfield에 "no reservations"로 권장하므로 새 프로젝트는 `cacheComponents: true` + `partialPrefetching: true`로 시작하고, 공유 페이지에는 `'use cache'`+`cacheLife`, 에디터 저장에는 Server Action + `updateTag()`를 쓰는 구조가 공식 가이드와 일치한다.
- React Compiler는 Next 16에서 안정이지만 기본 off이고 Babel 경로라 빌드가 느려진다. 16.3+의 Rust 컴파일러(`turbopackRustReactCompiler`)는 아직 experimental이므로, 초기에는 Babel 경로로 켜서 드래그·지도 같은 리렌더 민감 UI의 수동 memo를 줄이고, Rust 경로는 안정화 후 전환하는 게 안전하다.
- Edge 런타임은 `proxy.ts`가 Node 고정이 되면서 Next.js 공식 로드맵에서 비중이 줄었다. Vercel 배포라면 Node 런타임을 기본으로 두고 Edge는 선택 사항으로만 남기는 것이 16.x 방향과 맞는다.
- Server Components/Server Functions에 대한 커뮤니티 호불호가 뚜렷하므로(설문), 에디터의 클라이언트 상호작용(드래그, 지도)은 명확히 `'use client'` 경계로 분리하고 서버 쪽은 데이터 로딩·공유 페이지에 한정하는 식으로 팀 학습 비용을 통제할 필요가 있다.
- 2025-12 RSC RCE 취약점 사례는 Next/React 패치 추적(16.4의 `experimental.agentUpgrade: 'security'`가 이를 자동 알림)을 운영 절차에 넣어야 함을 시사한다.

### Gaps
- Next.js 17 출시 시기·내용은 공식 글이 없어 확인 불가(16.4 글의 "Cache Components가 17에서 기본값" 언급만 있음).
- React 19.3의 `browser()` API의 안정/실험 라벨은 릴리스 글에 명시되지 않음.
- Vercel/React 팀의 "콘텐츠+에디터 앱" 전용 권고 문서는 찾지 못했고, 위 추론은 16.3/16.4 릴리스 글의 일반 가이드에서 도출한 것.

---

## 2. 데이터/상태: TanStack Query v5 vs SWR vs Server Actions-only, Zustand/Jotai, TanStack Form/react-hook-form + Zod 4, 타입 API 클라이언트

### Takeaway
TanStack Query v5(5.104, 주간 6,500만)가 SWR(2.5, 1,940만)을 다운로드와 설문 선호 양쪽에서 크게 앞서며 React 생태계에서 "가장 긍정적인 라이브러리"로 꼽힌다. 클라이언트 상태는 Zustand 5가 압도적이고 Jotai는 2026-09 v3가 나왔다. 폼은 react-hook-form 7.90 + Zod 4가 여전히 주류이며 TanStack Form은 1.x 안정이지만 다운로드가 1/14 수준이다. OpenAPI 타입 생성은 openapi-typescript(+openapi-fetch)가 타입 전용으로 가장 널리 쓰이고, 훅까지 생성하려면 Orval 8 또는 Hey API가 현실적 선택이다.

### Cited Findings

**서버 상태**
- npm 조회(2026-10-15): `@tanstack/react-query` 5.104.3(2026-10-15 게시) 주간 65,108,522; `swr` 2.5.1(2026-08-12) 주간 19,431,590. GitHub: TanStack/query 50,435 stars(2026-10-15 push), vercel/swr 32,490 stars(2026-09-22 push).
- State of React 2025: TanStack Query 사용률 68.1%, "garnered the most positive opinions overall" — [State of React 2025 Libraries](https://2025.stateofreact.com/en-US/libraries/); 작년에 Next.js를 제치고 가장 인기 있는 React 라이브러리 — [Strapi 요약](https://strapi.io/blog/state-of-react-2025-key-takeaways)
- 제3자 비교(PkgPulse): SWR 약 4.2KB gzip vs TanStack Query 약 13.4KB; TanStack Query는 mutation API(낙관적 업데이트·롤백), 공식 devtools, 다중 프레임워크 지원에서 우위; 2024년에 SWR을 추월. 단, 이 사이트의 다운로드 수치(12.3M vs 7.7M)는 위 레지스트리 조회값과 다름 — [PkgPulse](https://www.pkgpulse.com/guides/tanstack-query-vs-swr-2026)
- TanStack Query v5 오프라인 관련: `networkMode`, `throwOnError`(구 `useErrorBoundary`), `useMutationState` — [skills.sh 요약](https://www.skills.sh/fellipeutaka/leon/tanstack-query)
- `persistQueryClient`: 동기/비동기 스토리지 persister(IndexedDB 예제 포함, 1초 스로틀), `maxAge` 기본 24시간(`gcTime`을 그 이상으로 설정 필요, 기본 gcTime은 5분), `buster` 문자열로 캐시 무효화, `PersistQueryClientProvider`로 복원 중 fetch 보류 후 복원 완료 시 `onSuccess`에서 `resumePausedMutations()` 호출 가능, `useIsRestoring` — [TanStack Query persistQueryClient](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)
- Server Actions 쪽 캐시 갱신 API: Next.js 16의 `updateTag()`(read-your-writes), `refresh()`(비캐시 데이터 갱신), `revalidateTag(tag, profile)` — [Next.js 16](https://nextjs.org/blog/next-16)

**클라이언트 상태**
- npm 조회: `zustand` 5.0.15(2026-08-13) 주간 62,716,006, GitHub 58,817 stars; `jotai` 3.0.1(2026-09-29) 주간 6,707,835, GitHub 21,294 stars.
- Jotai v3 릴리스(GitHub 릴리스 페이지 "08 Sep", 2026): "mostly backward-compatible update"로 레거시 지원·deprecated API 제거, Node 20 지원 종료, 마이그레이션 가이드 `docs/guides/migrating-to-v3.mdx` — [Jotai v3.0.0 release](https://github.com/pmndrs/jotai/releases/tag/v3.0.0)
- Jotai 3.0.0-alpha.0 체인지로그: 구 TypeScript/UMD/SystemJS/CJS/구 React 지원 및 `atomFamily`, `loadable`, `setSelf` 제거 — [3.0.0-alpha.0 notes](https://newreleases.io/project/npm/jotai/release/3.0.0-alpha.0); v2.20이 v3를 위한 스토어 내부 재작업 — [InfoQ](https://infoq.com/news/2026/07/jotai-rework-performance)
- State of React 2025에서 Zustand가 TanStack Query 다음으로 긍정 평가 상위 — [State of React 2025 Libraries](https://2025.stateofreact.com/en-US/libraries/)

**폼/검증**
- npm 조회: `react-hook-form` 7.90.0(2026-10-11) 주간 53,723,170(44,858 stars); `@tanstack/react-form` 1.33.5(2026-08-11) 주간 3,873,924(6,729 stars); `zod` 4.6.7(2026-10-12) 주간 346,947,379(44,128 stars).
- Zod 4: 일본 개발 블로그는 2025-07-10 릴리스로 기술하며, Zod 3의 `required_error` 옵션이 v4에서 조용히 무시되어 커스텀 메시지가 영어 기본값으로 되돌아갈 수 있다고 경고 — [issoh.co.jp](https://www.issoh.co.jp/tech/details/2371/). (공식 체인지로그로 날짜를 검증하지 못함 — Gaps 참조)
- PkgPulse: 신규 프로젝트에는 React Hook Form + Zod 조합 권장; TanStack Form은 2026-03 기준 "아직 v0"라고 기술했으나 npm 조회상 1.33.5이므로 이 서술은 오래된 정보 — [PkgPulse RHF vs Formik](https://www.pkgpulse.com/guides/react-hook-form-vs-formik-2026)

**타입 API 클라이언트**
- npm 조회: `openapi-typescript` 7.13.0(2026-02-11) 주간 9,487,722(8,401 stars, 2026-09-25 push); `openapi-fetch` 0.17.0(2026-02-11) 주간 10,996,464; `orval` 8.43.0(2026-10-14) 주간 2,450,692(6,541 stars); `@hey-api/openapi-ts` 0.99.0(2026-06-22) 주간 5,382,330(hey-api/hey-api 5,497 stars).
- 역할 구분: openapi-typescript는 런타임 의존성 없는 타입 전용("gold standard"), Orval은 React Query/SWR/Axios 코드·목·Zod 생성까지 "batteries-included", Hey API는 SDK+Zod+TanStack Query 훅+20개 이상 플러그인; 2025년 단일 대형 스펙 벤치마크에서 생성 시간 openapi-typescript 약 1.5초, Hey API 약 8초, Orval 약 5.5초 — [OpenReplay](https://blog.openreplay.com/type-safe-openapi-typescript-client/), [PkgPulse](https://www.pkgpulse.com/guides/orval-vs-openapi-typescript-vs-kubb-openapi-client-2026)
- deprecated `openapi-typescript-codegen` 유지보수자가 Hey API를 후속으로 권장 — [OpenReplay](https://blog.openreplay.com/type-safe-openapi-typescript-client/)

### Inferences
- 일정 에디터는 "오프라인 캐시 + 낙관적 재정렬 + 재접속 시 변경 재전송"이 필요하므로 TanStack Query v5의 `networkMode`·paused mutations·`persistQueryClient`(IndexedDB) 조합이 SWR보다 직접적으로 들어맞는다. SWR은 번들이 작지만 오프라인 mutation 큐 개념이 없다.
- Server Actions만으로 쓰기를 처리하는 방식(Next 16의 `updateTag`)은 공유 페이지·설정 저장처럼 단발성 쓰기에 적합하고, 드래그 재정렬처럼 초당 여러 번 일어나는 상호작용은 클라이언트 캐시(TanStack Query mutation + 디바운스)로 처리하는 하이브리드가 설문의 "Server Functions polarizing" 신호와 공식 API 설계 양쪽에 부합한다.
- Zustand 5는 에디터의 UI 상태(선택된 day 탭, 드래그 중 상태, 지도 재생 위치)에 충분하고 다운로드 규모가 Jotai의 9배라 채용·학습 리스크가 낮다. Jotai 3은 막 나온 메이저라 6개월 정도는 관망할 가치가 있다.
- 폼은 react-hook-form + `zodResolver`(Zod 4)가 가장 검증된 조합이다. 단, Zod 4 마이그레이션 시 에러 메시지 옵션 변경(`required_error` 무시)을 확인해야 한국어 메시지가 영어로 새지 않는다.
- 백엔드가 OpenAPI를 내면 `openapi-typescript` + `openapi-fetch`를 TanStack Query의 `queryFn` 안에서 쓰는 조합이 가장 가볍고 생성 속도도 빠르다. 훅까지 자동 생성하려면 Orval(최근 push 2026-10-14로 가장 활발)을 쓰되, 생성 코드량이 커지는 점을 감안한다.

### Gaps
- Zod 4의 공식 릴리스 일자는 공식 체인지로그를 열지 못해 제3자(2025-07-10) 기술만 확보. 공식 `zod.dev` 체인지로그로 재확인 필요.
- SWR 3.x 존재 여부: 한 아그리게이터가 "SWR v3"라 적었으나 npm `latest`는 2.5.1 — 3.x는 미확인.
- TanStack Query v5의 `networkMode`와 paused mutation 동작 상세는 persistQueryClient 문서에 없어 별도 문서(`network-mode`, `mutations` 페이지)를 보지 못함.
- Jotai v3의 React 최소 버전은 릴리스 페이지에 없음.

---

## 3. 지도: MapLibre GL JS vs Leaflet vs Google Maps JS vs Kakao/Naver (한국 사용자, 일본 목적지), 벡터 타일(Protomaps, OpenFreeMap), 경로 애니메이션, 비용

### Takeaway
Kakao 지도는 공식 답변으로 "국내 지도만" 제공하므로 일본 목적지 앱에는 쓸 수 없고, Naver 지도도 국내 중심이라 후보에서 제외된다. 현실적 선택지는 MapLibre GL JS 6(2026, ESM-only·WebGL2 필수, 주간 620만)과 Leaflet 1.9.4(2023년 5월 이후 npm 릴리스 없음, 주간 820만), 그리고 Google Maps JS(2025-03부터 Dynamic Maps 월 1만 로드 무료, 이후 $7/1,000)다. 벡터 타일은 OpenFreeMap(무료·키 없음·상업 이용 가능)이나 Protomaps PMTiles(한국어 `name:ko` 라벨 지원, 정적 파일 셀프호스팅)로 비용을 거의 0에 가깝게 만들 수 있다.

### Cited Findings

**한국 지도 API의 해외 커버리지**
- 카카오 데브톡 "카카오 MAP API 일본"(2024-04-03): 질문자가 일본 지원 여부를 묻자 "네, 카카오 지도는 국내 지도만 서비스하고 있습니다"라는 답변 — [devtalk.kakao.com/t/map-api/136213](https://devtalk.kakao.com/t/map-api/136213) (배경: 2024년 자료)
- 데브톡 다른 스레드: 해외 좌표로 지도를 옮기면 "위치는 이동하지만 흰 화면만 보임", "해외지도 제공에 대해서는 구체적인 계획이 없음"(약 2,400일 전 게시) — [devtalk 96897](https://devtalk.kakao.com/t/topic/96897), [devtalk 129890](https://devtalk.kakao.com/t/map/129890)
- 1인 개발자 비교 메모(Threads, 비공식): Google Map은 전세계 커버리지이나 국내 길찾기 정확도 낮음; Naver Map은 "국내 지도", 동적 지도 월 10,000,000건 무료; Kakao Map은 "국내 지도", 키워드 검색 API, 1일 300,000건 무료 — [Threads @dong_hun_leee](https://www.threads.com/@dong_hun_leee/post/DIG-00MydQN/)
- Naver 지도 API의 해외 지역 제한을 명시한 공식 문서는 이번 조사에서 찾지 못함(NCP Maps 제품 페이지는 네비게이션만 반환) — Gaps 참조.

**MapLibre GL JS**
- npm 조회: `maplibre-gl` 6.14.0(2026-10-11) 주간 6,207,524; GitHub maplibre/maplibre-gl-js 11,868 stars, 2026-10-14 push.
- v6.0.0 브레이킹: **ESM-only 배포(UMD·CSP 번들 중단)**, **WebGL2 필수(WebGL1 제거)**, `Map`이 `Camera`를 상속 대신 합성(`map.transform` 제거), 모든 이벤트가 타입 클래스(`MapDataEvent` 제거), TypeScript 타깃 ES2022, `GeoJSONSource.setData` 2번째 인자 제거, `zoomLevelsToOverscale` 기본 4. 기능: 스타일 스펙 검증 non-fatal, `setMissingStyleImageResolver`, `fill-layer-opacity`/`line-layer-opacity`, `terrainSkirtLength`, Rolldown 번들링·TypeScript 7 beta·정수 vertex attribute — [maplibre-gl-js CHANGELOG](https://raw.githubusercontent.com/maplibre/maplibre-gl-js/main/CHANGELOG.md)
- v5.0은 2025-01-05 뉴스레터에서 공식 릴리스 발표(글로브 렌더링) — [MapLibre Newsletter Dec 2024](https://maplibre.org/news/2025-01-05-maplibre-newsletter-december-2024/); 5.12(2025-11경) MLT 지원 추가 — [OSM rails-dev 알림](https://lists.openstreetmap.org/pipermail/rails-dev/2025-November/045046.html)
- 2026-07 뉴스레터(2026-08-02): "v6 just shipped" — [MapLibre News](https://maplibre.org/news/). (같은 요약이 "v5가 2025-12에 나온 지 8개월"이라 적었는데 v5.0 발표는 2025-01이므로 날짜 서술이 충돌함)
- MLT(MapLibre Tile) 포맷 2026-01-23 발표; 거버넌스: MapTiler Silver 스폰서(2025-03-31), YellowMap(2026-05-15), 2026 Governing Board 선출(2026-09-10), 바운티 프로그램 2026-03-31 종료 — [MapLibre News](https://maplibre.org/news/)
- Jawg 비교: MapLibre GL JS는 BSD-3, Mapbox GL JS가 2020-12 라이선스 변경 후 포크(배경); Leaflet은 BSD-2 — [Jawg blog](https://blog.jawg.io/maplibre-gl-vs-leaflet-choosing-the-right-tool-for-your-interactive-map/); Geoapify: Leaflet은 npm 의존성 0 — [Geoapify](https://www.geoapify.com/map-libraries-comparison-leaflet-vs-maplibre-gl-vs-openlayers-trends-and-statistics/)
- `maplibre-gl-leaflet` 바인딩은 회전·bearing·pitch 미지원, 속도 저하 — [maplibre-gl-leaflet](https://classic.yarnpkg.com/en/package/@maplibre/maplibre-gl-leaflet)

**Leaflet / React 래퍼**
- npm 조회: `leaflet` latest 1.9.4(**2023-05-18 게시**) 주간 8,200,328, GitHub 45,755 stars(2026-10-13 push); `react-leaflet` 5.0.0(2024-12-14) 주간 3,967,514; `react-map-gl` 8.1.3(2026-09-02) 주간 2,297,291(8,507 stars); `@vis.gl/react-google-maps` 1.10.1(2026-09-21) 주간 2,422,354.
- react-map-gl은 `react-map-gl/maplibre` 엔트리로 MapLibre를 `mapLib`로 받아 deck.gl 오버레이와 함께 사용 — [PkgPulse maps 2026](https://www.pkgpulse.com/guides/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026)

**Google Maps Platform 비용**
- 2025-03-01부터 월 $200 크레딧을 SKU별 월간 무료 사용량으로 대체: Essentials 10,000건, Pro 5,000건, Enterprise 1,000건; Map Tiles API 2D/Street View는 100,000건; 볼륨 할인이 5,000,000+건까지 확대 — [Google Maps March 2025 changes](https://developers.google.com/maps/billing-and-pricing/march-2025), [Pricing FAQ](https://developers.google.com/maps/billing-and-pricing/faq)
- 가격표(2026-10-14 갱신, USD/1,000건): Maps JavaScript API Dynamic Maps = Essentials, 무료 10,000, 이후 $7.00; Routes API Compute Routes Essentials 무료 10,000, $5.00(Pro $10, Enterprise $15); Places API(New) Place Details Essentials 무료 10,000, $5.00(Pro $17); Text Search Pro 무료 5,000, $32.00; Map Tiles 2D Essentials 무료 100,000, $0.60 — [Google Maps Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)

**오픈 벡터 타일**
- OpenFreeMap: 공개 인스턴스 무료, 등록·API 키·쿠키 없음, 맵뷰/요청 제한 없음, 상업 이용 허용, 저작자 표시 필수(MapLibre는 자동), 오프라인 다운로드는 1회 3,000타일 또는 50MB·4병렬·고유 UA까지, 스타일 Positron/Bright/Liberty/Dark/Fiord/3D, 주간 planet 다운로드(Btrfs/MBTiles), 완전 오픈소스 셀프호스팅 가능, 기부·지원 플랜 기반(SLA 없음, Pro 플랜 가능성 언급) — [openfreemap.org](https://openfreemap.org/); GitHub hyperknot/openfreemap 6,210 stars, 2026-10-14 push.
- Protomaps 베이스맵 로컬라이제이션: 41개 언어 `name:{code}` 번역 수록, **한국어 `name:ko`(Hangul) 지원**, 일본어 `name:ja`(Han/Katakana/Hiragana, 혼합은 `Mixed-Japanese` 스크립트 태그), 언어별 MapLibre 스타일 제공, 대상 번역이 없으면 `name:en` 폴백, 한 라벨에 두 언어 조합 가능 — [Protomaps localization](https://docs.protomaps.com/basemaps/localization); npm `pmtiles` 4.5.0(2026-08-10) 주간 1,140,224.
- 비용 사례(배경, 2024): Pinball Map이 Mapbox(할인가 월 약 $20)에서 Cloudflare 셀프호스팅 PMTiles로 옮긴 첫 달 청구액이 "very small" — [Pinball Map blog](https://blog.pinballmap.com/2024/11/05/protomaps-tile-hosting/); NPR은 자체 OSM 빌드 대신 Protomaps 일간 다운로드 권장 — [NPR apps blog](https://blog.apps.npr.org/2024/11/26/slippy-maps.html)

### Inferences
- 한국 사용자·일본 목적지라는 조건에서 Kakao는 공식적으로 탈락, Naver는 공식 해외 지원 근거가 없어 리스크가 크다. 남는 선택은 (a) MapLibre + 오픈 타일, (b) Google Maps JS 두 갈래다.
- 경로 재생(route playback)·pitch/bearing 카메라 연출·커스텀 라벨 언어(한국어 지명)는 MapLibre의 강점 영역이고, Protomaps가 `name:ko`를 지원하므로 일본 지명을 한글 병기로 보여줄 수 있다. Leaflet은 npm 기준 2023년 이후 릴리스가 없고 래스터 중심이라 신규 채택 근거가 약하다. 다만 기존 사이트(오사카·교토 플래너)가 Leaflet이면 `react-map-gl/maplibre`로의 이행 비용을 별도로 산정해야 한다.
- MapLibre v6는 WebGL2 필수라 구형 기기에서 폴백이 없다. Next 16의 브라우저 최소 요건(Safari 16.4+, Chrome 111+)과 겹치므로 실무 영향은 작지만, 저사양 안드로이드 여행자 기기를 위한 정적 이미지 폴백은 고려 대상이다.
- Google Maps는 장소 검색(Places Text Search Pro, $32/1,000)과 경로(Routes $5/1,000)가 과금 포인트다. 지도 표시는 MapLibre로 하고 Google은 Places/Routes API만 서버에서 호출해 결과를 캐시하는 하이브리드가 비용 효율적이다.
- OpenFreeMap은 SLA가 없으므로 공개 인스턴스는 개발·초기 트래픽용으로 쓰고, 트래픽이 늘면 Protomaps PMTiles(일본 영역만 추출)를 Vercel Blob/Cloudflare R2에 올려 셀프호스팅하는 경로가 "비용 ≈ 저장소+대역폭"으로 가장 예측 가능하다.

### Gaps
- Naver Maps(NCP)의 해외/일본 지도 표시 제한과 무료 쿼터는 공식 문서를 열지 못해 미확인(비공식 메모만 확보).
- Leaflet 2.0(알파) 상태는 검증하지 못함. npm `latest`가 2023-05-18의 1.9.4라는 사실만 확인.
- MapLibre v6.0.0의 정확한 릴리스 일자는 CHANGELOG에 날짜가 없어 "2026-07경"으로만 특정.
- OpenFreeMap 스타일의 한국어 라벨(`name:ko`) 지원 여부는 사이트에 언급이 없음(OpenMapTiles 스키마 기반이라 가능성은 있으나 미확인).
- MapLibre 경로 애니메이션(라인 그리기, 마커 이동) 공식 예제·성능 데이터는 조사하지 못함.
- youngju.dev의 2026-05-16 지도 도구 심층 비교(한국어)는 본문이 비어 있어 내용을 확보하지 못함.

---

## 4. 드래그 앤 드롭: dnd-kit vs Atlassian pragmatic-drag-and-drop vs 네이티브, 모바일 long-press 재정렬

### Takeaway
레거시 `@dnd-kit/core` 6.3.1은 2024-12 이후 릴리스가 없지만 주간 2,870만 다운로드로 여전히 사실상 표준이고, 후속인 새 dnd-kit(`@dnd-kit/react` 0.5.0, 2026-06)은 2025-12~2026-06 사이 활발히 릴리스됐으나 아직 0.x다. Pragmatic DnD는 4.0.0(2026-09-24)까지 왔지만 3.0/4.0은 Atlassian 내부 엔트리포인트 정리(Volt)이지 기능 변화가 아니며 다운로드는 dnd-kit의 1/17 수준이다.

### Cited Findings
- npm 조회: `@dnd-kit/core` 6.3.1(**2024-12-05 게시**) 주간 28,737,569; `@dnd-kit/react` 0.5.0(2026-06-11) 주간 1,759,888; `@atlaskit/pragmatic-drag-and-drop` 4.0.0(2026-09-24) 주간 1,653,248. GitHub: clauderic/dnd-kit 17,712 stars(2026-10-15 push), atlassian/pragmatic-drag-and-drop 12,784 stars(2026-10-15 push).
- 새 dnd-kit 체인지로그: v0.1.x "Initial beta releases"; v0.2.0(2025-12) PointerSensor 리팩터링 + Delay/Distance 활성화 제약 조합 가능(마우스·터치·텍스트 입력별 기본값), cross-iframe; v0.2.4(2026-02) reduced-motion 존중, 드롭 애니메이션 설정; v0.3.0(2026-02) 함수형 plugin/sensor/modifier 설정, Android `pointercancel` 크래시 수정; v0.4.0(2026-04) 이벤트 타입 재설계, 가상화 정렬 안정화; v0.5.0(2026-06) sortable의 draggable/droppable 개별 disable, 인덱스 gap 허용. React/Vue/Svelte/Solid 지원, 마우스·터치·키보드 센서 — [dndkit.com/changelog](https://dndkit.com/changelog), [dndkit.com](https://dndkit.com/)
- Pragmatic DnD 3.0.0: Volt 엔트리포인트 표준에 맞춘 직접 export 경로 추가(구 경로는 deprecated shim, 예: `reorder` → `utils/reorder`); 4.0.0: deprecated shim 제거. 두 메이저 모두 신규 기능 없음 — [pragmatic-drag-and-drop CHANGELOG](https://cdn.jsdelivr.net/npm/@atlaskit/pragmatic-drag-and-drop@4.0.0/CHANGELOG.md)
- 제3자 비교: dnd-kit은 "modern default"(경량·접근성·모바일·sortable 프리셋, 설정은 다소 많음), Pragmatic은 "Jira/Trello 규모 성능" 포지셔닝, 애니메이션 opinion 없음; Atlassian이 react-beautiful-dnd 유지보수를 중단한 뒤 생태계가 dnd-kit으로 수렴 — [PkgPulse DnD 2026](https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026), [Puck blog](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
- 한 아그리게이터는 Pragmatic이 "pointer 이벤트로 드래그를 시뮬레이션해 네이티브 HTML5 DnD를 우회"한다고 적었으나 다른 자료들과 상충하며 Atlassian 공식 문서로 검증하지 못함 — [PkgPulse](https://www.pkgpulse.com/guides/dnd-kit-vs-react-beautiful-dnd-vs-pragmatic-drag-drop-2026) (신뢰도 낮음)

### Inferences
- "day 탭 안에서 stop 순서 바꾸기 + 탭 간 이동"은 리스트 정렬 문제라 dnd-kit sortable 프리셋이 가장 적은 코드로 끝난다. 신규 프로젝트라면 새 dnd-kit(`@dnd-kit/react`)의 터치 Delay 제약(= long-press 활성화)과 reduced-motion 지원이 모바일 요구와 맞지만, 0.x이므로 API 변경(0.4에서 이벤트 타입 재설계)을 감수해야 한다. 보수적으로 가려면 `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable`의 `TouchSensor`/`PointerSensor` `activationConstraint: { delay, tolerance }`가 검증된 경로다.
- Pragmatic DnD는 Atlassian의 내부 모노레포 리듬(Volt 리팩터)에 묶여 메이저가 올라가는 구조라 버전 번호가 성숙도를 뜻하지 않는다. 지도 위 마커 드래그처럼 비-리스트 DnD가 많다면 어댑터 자유도가 큰 Pragmatic이 유리하지만, 이 서비스에서는 과한 선택이다.
- 네이티브 HTML5 DnD는 iOS Safari 터치에서 long-press 재정렬 UX를 직접 구현하기 어렵다는 점이 라이브러리 채택 근거다(출처 없음, 일반 경험 기반 추론).

### Gaps
- `@dnd-kit/react`의 1.0/안정화 로드맵 발표를 찾지 못함(체인지로그에 beta/RC 라벨이 v0.1.x "initial beta" 외에는 없음).
- Pragmatic DnD의 네이티브 HTML5 DnD 기반 여부는 공식 문서로 확인하지 못함(검색 할당량 소진).
- 두 라이브러리의 모바일 long-press 성능 비교 벤치마크는 신뢰할 만한 자료가 없음.

---

## 5. 스타일링/디자인 토큰: Tailwind v4, Panda CSS, vanilla-extract, CSS Modules; Style Dictionary/DTCG; Storybook 10과 비주얼 테스트

### Takeaway
Tailwind v4(2025-01-22, CSS-first `@theme`)가 4.3(2026-05-08)까지 이어지며 주간 1억 3,700만 다운로드로 독보적이고, 2026-09-09 Tailwind Labs가 Shopify에 합류했다. 디자인 토큰 표준은 DTCG 2025.10이 2025-10-28 첫 안정판이 되었고 Style Dictionary 5가 이를 구현한다. Storybook은 10(2025-10, ESM-only, 29% 경량화)에서 10.6까지 왔고 Vitest 4/5의 `toMatchScreenshot`이 비주얼 회귀를 내장한다.

### Cited Findings
- Tailwind CSS v4.0 2025-01-22 릴리스, `tailwind.config.js` 대신 CSS `@theme` 지시어로 CSS-first 설정 — [Tailwind Blog](https://tailwindcss.com/blog), [Laravel News](https://laravel-news.com/tailwind-css-v4-is-now-released); v4.1 2025-04-03(text shadow, mask); v4.3 2026-05-08(스크롤바 스타일링, logical property 유틸리티, `zoom`·`tab-size`, `@variant` 개선); 2026-09-09 "Tailwind Labs is joining Shopify"; v5 글 없음 — [Tailwind Blog](https://tailwindcss.com/blog)
- npm 조회: `tailwindcss` 4.3.3(2026-07-16) 주간 137,279,787, GitHub 97,870 stars; `@pandacss/dev` 2.2.0(2026-10-09) 주간 528,079(6,226 stars, 2026-10-15 push); `@vanilla-extract/css` 1.21.3(2026-10-08) 주간 2,704,409(10,436 stars); `style-dictionary` 5.6.1(2026-10-10) 주간 2,163,280(4,861 stars, Apache-2.0).
- Next.js 16 `create-next-app` 기본 템플릿에 Tailwind CSS·TypeScript·ESLint 포함 — [Next.js 16](https://nextjs.org/blog/next-16); Next.js 16.4에서 Turbopack이 프로덕션 CSS Module 클래스명을 단축 — [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- DTCG: 2025-10-28 "Design Tokens specification reaches first stable version" — 2025.10 Format/Color/Resolver 모듈 — [W3C DTCG 공지](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/); W3C 표준 트랙이 아님(Community Group 산출물), 핵심 포맷은 "production use에 안정"이나 계속 진화 중 — [designtokens.org FAQ](https://www.designtokens.org/faq/)
- zeroheight가 토큰 매니저를 Style Dictionary v5 + DTCG 2025.10으로 업그레이드하고 CSS/SCSS/iOS/Android/Compose/Flutter/JS 익스포트를 SD v5로 생성 — [zeroheight help](https://help.zeroheight.com/hc/en-us/articles/48049028236187)
- Storybook 10.0(2025-10): 유일한 브레이킹은 ESM-only, 설치 크기 29% 축소, 모듈 automocking(Vite/Webpack), 타입세이프 CSF Factories(React 프리뷰) — [Storybook 10.0](https://storybook.js.org/releases/10.0); 10.1(2025-11) 설치·접근성 개선 — [Storybook 10.1](https://storybook.js.org/releases/10.1); 10.3 Storybook MCP 프리뷰, Vite 8·Next.js 16.2 지원; 10.4 agentic setup CLI; 10.5 Claude/Codex 플러그인 — [yrkan 10.3](https://yrkan.com/tools-updates/storybook-v10-3-whats-new/), [newreleases 10.5.0](https://newreleases.io/project/github/storybookjs/storybook/release/v10.5.0). npm 조회: `storybook` 10.6.2(2026-10-12) 주간 24,855,609, GitHub 91,301 stars.
- Vitest 4.0(2025-10-22) Browser Mode 안정화와 함께 `toMatchScreenshot` 비주얼 회귀 어서션 추가 — [VoidZero Vitest 4](https://voidzero.dev/posts/announcing-vitest-4), [heise](https://heise.de/-10814342)

### Inferences
- 커스텀 디자인 토큰 기반 시스템이라면 "DTCG 2025.10 JSON을 단일 소스로 두고 Style Dictionary 5로 CSS 변수를 생성 → Tailwind v4의 `@theme`에서 그 CSS 변수를 참조"하는 파이프라인이 2026년 표준 조합이다. Tailwind v4가 CSS-first라 JS config 변환 없이 토큰 CSS를 그대로 흡수할 수 있다.
- Panda CSS(주간 53만)와 vanilla-extract(270만)는 Tailwind(1억 3,700만)와 규모 차이가 커서, 채용·AI 도구 지원·shadcn/ui(설문 56% 사용) 생태계를 고려하면 Tailwind가 안전하다. 다만 Tailwind Labs의 Shopify 합류(2026-09)는 오픈소스 거버넌스 변화 가능성이 있어 체크 포인트로 남긴다.
- 디자인 시스템 패키지의 문서화·시각 검증은 Storybook 10 + Vitest Browser Mode의 `toMatchScreenshot`으로 Chromatic 없이도 기본 비주얼 회귀를 돌릴 수 있다. Chromatic은 리뷰 워크플로가 필요할 때 추가한다.

### Gaps
- Chromatic 2025~2026 가격·기능 변화는 조사하지 못함.
- Panda CSS 2.0 릴리스 노트(npm상 2.2.0 존재)는 검색 할당량 소진으로 미확인.
- Tailwind v4.2 세부 내용은 블로그 색인에 별도 글이 없음.
- Figma Variables ↔ DTCG 변환 도구(Tokens Studio 등)의 2026 상태는 조사 범위 밖.

---

## 6. PWA/오프라인: Serwist, Workbox, Next.js의 2026 PWA 지원, 백그라운드 싱크

### Takeaway
Next.js는 매니페스트(`app/manifest.ts`)와 웹 푸시(Server Action + `web-push`)까지는 공식 가이드로 다루지만 서비스 워커 캐싱은 내장하지 않고 Serwist(Turbopack·webpack 예제)를 지목한다. `next-pwa`는 2022-08 이후 게시가 없어 사실상 폐기됐고, Serwist 9.5.13(2026-10-04)이 Next.js용 현역이다. 16.3의 `experimental.useOffline`은 네비게이션/Server Action 재시도를 담당하지만 데이터 캐싱은 아니며, 일정 데이터 오프라인은 TanStack Query persist + IndexedDB로 별도 처리해야 한다.

### Cited Findings
- Next.js PWA 가이드(2026-07-30 갱신): `app/manifest.ts`로 매니페스트 생성; 웹 푸시는 iOS 16.4+(홈 화면 설치 앱), Safari 16/macOS 13+, Chromium, Firefox 지원; VAPID 키 + `web-push` + Server Actions로 구독·발송 예제; `beforeinstallprompt`는 iOS Safari 미지원이라 커스텀 설치 버튼 비권장; "Offline Support: Next.js provides an experimental `useOffline` hook… For full service-worker-based offline caching, one option is Serwist(Turbopack/webpack 예제)" — [Next.js PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- Next.js 16.3 `experimental.useOffline`: 네트워크 끊김 시 소프트 네비게이션·데이터 fetch·Server Action을 throw 대신 pending 유지 후 재접속 시 재시도; Partial Prefetching으로 캐시된 라우트 shell은 오프라인에서도 렌더되고 데이터는 재연결 후 스트리밍; `useOffline()` 훅으로 배너 표시 — [Next.js 16.3](https://nextjs.org/blog/next-16-3)
- Serwist Next.js 가이드: `@serwist/next`의 `withSerwist({ swSrc, swDest })`, `defaultCache` 런타임 캐시, 오프라인 폴백 문서, `additionalPrecacheEntries`; 퀵 가이드는 webpack 대상이며 Turbopack은 별도 가이드 — [Serwist docs](https://serwist.pages.dev/docs/next/getting-started)
- npm 조회: `serwist` 9.5.13(2026-10-04) 주간 693,339; `@serwist/next` 9.5.13 주간 457,598; GitHub serwist/serwist 1,494 stars(2026-10-04 push). `next-pwa` latest 5.6.0(**2022-08-23**) 주간 233,002. `workbox-window` 7.4.1(2026-05-04) 주간 9,626,085; GoogleChrome/workbox 13,025 stars(2026-10-13 push).
- Workbox README "Maintenance update": "Chrome's Aurora team will be the new owners of Workbox" — [GoogleChrome/workbox](https://github.com/GoogleChrome/workbox)
- 커뮤니티 메모(2025-11): Serwist 안정 9.2.1+, 10.0.0-preview 개발 중; 예제 레포는 Turbopack 호환 문제로 개발 모드에서 Serwist 비활성 — [skills.sh nextjs-pwa](https://skills.sh/just-mpm/conformai/nextjs-pwa) (비공식)
- TanStack Query `persistQueryClient` + IndexedDB persister, `resumePausedMutations` — [TanStack persistQueryClient](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)

### Inferences
- "여행 당일 오프라인" 요구는 세 층으로 나뉜다: (1) 앱 셸·정적 자산 → Serwist precache, (2) 일정 데이터 → TanStack Query persist(IndexedDB, `maxAge`를 여행 기간 이상으로, `buster`에 배포 버전), (3) 지도 타일 → OpenFreeMap 정책상 50MB/3,000타일 이내의 일본 도시 영역만 사전 캐시하거나 Protomaps PMTiles를 범위 요청으로 캐시. 셋 다 각각의 도구가 필요하고 Next.js 단독으로는 해결되지 않는다.
- Background Sync API는 Chromium 전용이고 iOS Safari 미지원이므로(일반 지식, 출처 없음), 오프라인 중 변경은 TanStack Query paused mutation 큐로 보관했다가 `useOffline()`/`online` 이벤트에서 `resumePausedMutations()`로 재전송하는 패턴이 브라우저 중립적이다.
- Serwist는 저자 1인 중심의 작은 프로젝트(1.5k stars)이고 Turbopack 개발 모드 제약이 있어, 서비스 워커는 프로덕션 빌드에서만 검증하는 CI 스텝(Playwright + `--webpack` 또는 Turbopack 가이드)을 둬야 한다. Workbox 소유권이 Chrome Aurora 팀으로 이전된 점은 Workbox 자체가 유지된다는 신호다(Serwist는 Workbox 포크).

### Gaps
- Serwist 10 정식 릴리스 여부는 npm `latest`가 9.5.13이라 미출시로 보이나 공식 로드맵을 열지 못함.
- Serwist Turbopack 가이드 본문(개발 모드 제약의 공식 설명)은 열지 못함.
- Background Sync/Periodic Sync의 2026 브라우저 지원 매트릭스는 조사하지 못함.

---

## 7. 품질: Playwright, Vitest, Testing Library, Lighthouse CI, Core Web Vitals(INP), Biome vs ESLint, TypeScript 7(tsgo)

### Takeaway
Playwright 1.64(주간 7,600만)와 Vitest 5.0(2026-09-03, Vite ≥6.4·Node ≥22.12, 주간 1억 2,500만)이 현역이며 Vitest Browser Mode는 4.0(2025-10)에서 안정화됐다. TypeScript 7.0(2026-07-08)은 Go 네이티브 `tsc`로 8~12배 빨라졌고 Next.js 16.3이 빌드 타입체크에 지원하지만 7.0에는 프로그램 API가 없어 typescript-eslint 등은 6.0 병행이 필요하다. Next 16이 `next lint`를 없애고 "Biome 또는 ESLint"를 권하며, Biome 2.5(500+ 규칙)와 ESLint 10(flat config 전용)이 공존한다. Lighthouse CI는 2025-06 이후 릴리스가 없어 모멘텀이 약하고, Vercel은 실사용자 INP(≤200ms)를 보는 Speed Insights와 `vercel metrics` CLI를 밀고 있다.

### Cited Findings

**E2E/단위 테스트**
- npm 조회: `@playwright/test` 1.64.1(2026-10-14) 주간 76,227,910, GitHub 97,766 stars; `vitest` 5.0.4(2026-10-12) 주간 125,253,587(17,234 stars); `@testing-library/react` 16.3.3(2026-08-27) 주간 70,309,317; `axe-core` 4.14.0 주간 79,734,817; `@axe-core/playwright` 4.13.0 주간 14,281,826.
- Playwright 1.64: `webmcp` API, 비디오 fps·액션 데코레이션(Chromium 156/Firefox 157/WebKit 27.2); 1.63: 테스트 lock, 프레임 횡단 locator, `locator.visible()`, **`@playwright/experimental-ct-react`·`-ct-vue` 더 이상 업데이트 안 함**, Ubuntu 20.04 지원 종료; 1.62: 컴포넌트 테스트용 stories-and-galleries 모델, `AbortSignal` 취소; 1.61: 가상 WebAuthn, `WebStorage` API — [Playwright release notes](https://playwright.dev/docs/release-notes)
- Next.js 16.3의 `@next/playwright` `instant()` 헬퍼로 네비게이션 즉시 표시 콘텐츠를 회귀 테스트 — [Next.js 16.3](https://nextjs.org/blog/next-16-3)
- Vitest 4.0(2025-10-22): Browser Mode experimental 해제, 프로바이더 패키지 분리(`@vitest/browser-playwright` 등), `vitest/browser` 컨텍스트, `toMatchScreenshot`, Playwright Trace 지원 — [VoidZero](https://voidzero.dev/posts/announcing-vitest-4), [InfoQ](https://www.infoq.com/news/2025/12/vitest-4-browser-mode); 4.1 2026-03-12 — [Vitest Blog](https://vitest.dev/blog)
- Vitest 5.0(2026-09-03): 성능 초점(vm pool·Browser Mode·대형 isolated suite), `vitest doctor`, Browser Mode Trace View, 중첩 프로젝트 설정 상속 기본, `vi.when`, `Temporal` 모킹; 브레이킹: **Vite ≥6.4.0·Node ≥22.12.0**, await 없는 `resolves/rejects/toMatchFileSnapshot`은 실패 처리, `clearMocks` 기본 true, `Matchers<R, T>` 제네릭 변경, `bench`가 테스트 컨텍스트 fixture로 — [Vitest 5](https://vitest.dev/blog/vitest-5)

**린트/포맷**
- Next.js 16: `next lint` 제거, "Use Biome or ESLint directly", `@next/eslint-plugin-next` flat config 기본(ESLint v10이 legacy config 폐기) — [Next.js 16](https://nextjs.org/blog/next-16)
- npm 조회: `@biomejs/biome` 2.5.15(2026-09-30) 주간 17,944,016(25,953 stars); `eslint` 10.12.0(2026-10-02) 주간 158,743,826.
- Biome 2.4(2026-02-10): CSS/GraphQL 임베디드 포맷, HTML 접근성 규칙 15개, Vue/Svelte/Astro 개선, 24개 규칙 stable 승격; 2.5(2026-06-05): 500개 린트 규칙 돌파, GritQL 플러그인 코드 픽스, cross-file linting, watcher 모드, 70+ 규칙 stable; Vercel과 타입 추론 협력 글 존재; GritQL이 Biome 조직에 합류(2025-12-18) — [Biome Blog](https://biomejs.dev/blog/)
- 제3자: Biome 2가 type-aware linting 도입(이전엔 typescript-eslint만 가능); ESLint는 플러그인·프레임워크 규칙에서 우위, "둘을 같이 쓰는" 패턴 — [reintech](https://reintech.io/blog/eslint-vs-biome-javascript-linting-comparison-2026), [BetterStack](https://betterstack.com/community/guides/scaling-nodejs/biome-eslint/)
- React Compiler 1.0 lint 규칙은 `eslint-plugin-react-hooks` recommended 프리셋에 포함 — [React Compiler v1.0](https://react.dev/blog/2025/10/07/react-compiler-1)

**TypeScript 7**
- TypeScript 7.0 2026-07-08: Go 네이티브 포트, 전체 빌드 8~12배(vscode 125.7s→10.6s, playwright 12.8s→1.47s), 메모리 6~26% 절감, VS Code 첫 에러 17.5s→1.3s; `tsc`가 npm `typescript` 패키지로 배포, 파싱·체크·emit 병렬, `--checkers`(기본 4); 기본값 변경 `strict` on·`module: esnext`·`types: []`; **7.0에 프로그램 API 없음(7.1 예정)**, Volar 기반(Vue/Astro/Svelte/MDX)·Angular는 6.0 유지, `@typescript/typescript6` 패키지로 `tsc6` 병행(typescript-eslint 등에 6.0 alias) — [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- npm 조회: `typescript` 7.0.2(2026-07-08) 주간 307,015,402; GitHub microsoft/typescript-go **archived=true**(마지막 push 2026-08-31, 26,129 stars).
- 제3자: 스테이징 레포 2026-09 영구 아카이브, nightly는 `typescript@next` — [Visual Studio Magazine](https://visualstudiomagazine.com/articles/2026/06/22/typescript-7-0-rc-moves-microsofts-go-rewrite-into-the-mainline-compiler.aspx), [arg.software](https://arg.software/blog/typescript-7-rewritten-in-go/)
- Next.js 16.3: `next build`에서 TypeScript 7로 타입체크 가능 — [Next.js 16.3](https://nextjs.org/blog/next-16-3); MapLibre v6는 TypeScript 7 beta로 빌드 — [maplibre CHANGELOG](https://raw.githubusercontent.com/maplibre/maplibre-gl-js/main/CHANGELOG.md)

**성능 측정**
- npm 조회: `@lhci/cli` 0.15.1(**2025-06-25**) 주간 1,856,318; GitHub GoogleChrome/lighthouse-ci 7,113 stars, 마지막 push **2026-03-27**.
- Vercel Speed Insights: Lighthouse 같은 랩 도구는 시뮬레이션 추정, Real Experience Score는 실제 기기 데이터; INP 목표 200ms 이하 — [Speed Insights Metrics](https://vercel.com/docs/speed-insights/metrics); 2026-06-29 `vercel metrics` CLI로 LCP/INP/CLS 조회 — [Vercel changelog](https://vercel.com/changelog/query-speed-insights-from-the-vercel-cli); 2026-08-18 갱신 가이드: Lighthouse 올그린이어도 필드 데이터는 제자리일 수 있음, 2025 Web Almanac 기준 모바일 사이트 23%가 "good" INP 미달 — [Vercel KB](https://vercel.com/kb/guide/how-to-improve-core-web-vitals)

### Inferences
- 테스트 피라미드: Vitest 5(jsdom 대신 Browser Mode로 컴포넌트 테스트, `toMatchScreenshot`으로 디자인 시스템 비주얼 회귀) + Playwright 1.64(E2E, `@axe-core/playwright` 접근성, `@next/playwright instant()`로 네비게이션 회귀). Playwright의 실험적 컴포넌트 테스트 패키지가 중단됐으므로 컴포넌트 테스트는 Vitest Browser Mode 쪽으로 모으는 게 맞다.
- 린트는 Next 16이 Biome을 공식 선택지로 명시했으므로 "Biome(포맷+일반 규칙, 빠름) + ESLint(eslint-plugin-react-hooks의 React Compiler 규칙, `@next/eslint-plugin-next`)" 병행이 2026년 현실적 구성이다. Biome만으로는 React Compiler lint를 대체하지 못한다(출처상 해당 규칙은 ESLint 플러그인에 있음).
- TypeScript 7은 `tsc` 타입체크·Next 빌드에는 바로 쓸 수 있지만 typescript-eslint가 6.0 API에 의존하므로 `@typescript/typescript6` alias 구성이 필요하다. 모노레포라면 두 버전 공존 설정을 루트에서 한 번만 하면 된다.
- Lighthouse CI는 2025-06 이후 릴리스가 없고 저장소 push도 2026-03이 마지막이라 모멘텀이 약하다. INP처럼 상호작용 중심 지표는 랩 측정으로 잡기 어렵기도 해서, Vercel 배포라면 Speed Insights(필드)와 PR 단계의 Lighthouse 1회 점검(상한선 가드)으로 역할을 나누는 편이 낫다.

### Gaps
- State of JS 2025의 테스트 도구(Vitest/Playwright) 만족도·사용률 수치는 검색 할당량 소진으로 미확보.
- Biome 2.0 정식 릴리스 일자·type-aware linting의 Next.js 규칙 커버리지는 공식 글을 열지 못함(2.4/2.5 글만 확인).
- ESLint 10의 정확한 릴리스 일자와 legacy config 제거 범위는 공식 블로그를 확인하지 못함.
- Lighthouse CI의 공식 "maintenance mode" 선언 여부는 확인되지 않음(릴리스 공백만 확인).

---

## 8. 모노레포: Turborepo, pnpm workspaces, Nx — web + design-system 패키지에 모노레포가 정당한가

### Takeaway
Turborepo 2.11(2026-09, 주간 2,990만)과 pnpm 12가 활발하고, Next.js 16.4가 pnpm global virtual store·심링크 패키지(`turbopackAdditionalRoots`)를 직접 지원하기 시작했다. 패키지가 "web + design-system" 둘뿐이라면 pnpm workspaces만으로 충분하고, Turborepo는 CI 캐시·Storybook/Vitest 병렬 실행이 느려질 때 추가하는 것이 2026년 기준 비용 대비 합리적이다.

### Cited Findings
- npm 조회: `turbo` 2.11.8(2026-10-13) 주간 29,886,059; GitHub vercel/turborepo 31,201 stars(2026-10-15 push).
- Turborepo 2.11(2026-09 중순): 저장소 introspection(Remix/Nuxt 추론, uv/Python 워크스페이스); 2.11.2 CLI 반복 플래그 회귀 수정; 2.10.x nub/aube 패키지 매니저 지원, `turbo prune`이 pnpm 루트·alias 의존성 보존; 2026-09 말 보안 패치 2건 — [releases.sh 9/14](https://releases.sh/collections/js-toolchain/digest/2026-09-14), [releases.sh 6/29](https://releases.sh/collections/js-toolchain/digest/2026-06-29), [releases.sh 9/21](https://releases.sh/collections/js-toolchain/digest/2026-09-21) (아그리게이터)
- pnpm 11.11~11.14 워크스페이스 릴리스 명령(`pnpm change`, `pnpm lane`, `pnpm version -r`), `pnpm doctor`; pnpm 12.4 Cargo/Python 패키지 동시 설치, 12.5 머신 단위 작업 동시성 그룹, 설치 시 자동 dedupe — [releases.sh 7/13](https://releases.sh/collections/js-toolchain/digest/2026-07-13.md), [releases.sh 9/7](https://releases.sh/collections/js-toolchain/digest/2026-09-07)
- Next.js 16.4 `turbopackAdditionalRoots`로 프로젝트 루트 밖 심링크 패키지 추적, pnpm/Bun/Nub/aube global virtual store 수동 연동(자동 연동은 향후) — [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- Next.js 16.3 Turbopack 빌드 디스크 캐시 기본 on(CI 최대 5.5배) — [Next.js 16.3](https://nextjs.org/blog/next-16-3)

### Inferences
- 디자인 시스템을 별도 npm 패키지로 분리하는 목적(Storybook 독립 빌드, 토큰 파이프라인 분리, 향후 다른 앱 재사용)이 있다면 pnpm workspace 2패키지 구성은 정당하다. Turborepo는 그 위에 `build`/`test`/`storybook` 태스크 그래프와 원격 캐시를 얹는 얇은 층이므로 초기에 넣어도 부담이 작지만, Next 16.3+의 자체 빌드 캐시가 이미 큰 몫을 하므로 "필수"는 아니다.
- Nx는 이번 조사에서 1차 자료를 확보하지 못했고, Vercel 배포·Next.js 중심 스택에서는 Turborepo가 통합(Vercel Remote Cache, Turbopack 추가 루트)이 더 직접적이다.

### Gaps
- Nx 2026 상태(버전, Next.js 플러그인, 라이선스 변화)는 조사하지 못함.
- Turborepo 공식 릴리스 노트(아그리게이터 외)는 열지 못함.
- "2패키지 모노레포 vs 단일 레포 + `src/design-system` 폴더"에 대한 공식 권고 자료는 없음.

---

## 9. 국제화와 접근성 도구 (next-intl, axe)

### Takeaway
next-intl 4.x(4.0 2025-03-12, 4.14.9 2026-10, 주간 700만)가 Next.js App Router i18n의 사실상 표준이며 Next.js 16.3의 `next/root-params`(`lang()`)를 공식 지원한다. 접근성은 axe-core 4.14(주간 8,000만)·`@axe-core/playwright`가 표준이고 Biome 2.4가 HTML 접근성 규칙 15개를 추가했다. OG 이미지는 `next/og` `ImageResponse`가 내장이나 Satori 제약(flexbox만, 500KB, ttf/otf/woff)상 한국어 폰트 서브셋 준비가 필요하다.

### Cited Findings
- npm 조회: `next-intl` 4.14.9(2026-10-02) 주간 6,988,855; GitHub amannn/next-intl 4,380 stars(2026-10-02 push).
- next-intl 블로그: 4.0(2025-03-12), `useExtracted: The Tailwind of i18n?`(2025-11-07), AOT 컴파일(2026-01-19), "Using next/root-params in Next.js 16.3"(2026-08-04) — [next-intl blog](https://next-intl.dev/blog)
- Next.js 16.3 `next/root-params`: `[lang]` 같은 루트 파라미터를 어떤 Server Component에서든 `await lang()`으로 접근, `'use cache'` 스코프 안에서도 동작, i18n 유틸리티의 prop drilling 제거가 명시된 목적 — [Next.js 16.3](https://nextjs.org/blog/next-16-3)
- npm 조회: `axe-core` 4.14.0(2026-10-05) 주간 79,734,817; `@axe-core/playwright` 4.13.0(2026-08-11) 주간 14,281,826.
- Biome 2.4 HTML 접근성 규칙 15개 — [Biome Blog](https://biomejs.dev/blog/); Storybook 10.1 접근성 초점 — [Storybook 10.1](https://storybook.js.org/releases/10.1)
- `next/og` `ImageResponse`(문서 2026-08-06 갱신): `@vercel/og`+Satori+Resvg로 JSX/CSS→PNG, flexbox·절대 위치 등 CSS 일부만 지원(`display: grid` 불가), **번들 500KB 제한(JSX·CSS·폰트·이미지 포함)**, 폰트는 ttf/otf/woff만(ttf/otf 권장), `opengraph-image.tsx`에서 빌드 시 또는 요청 시 생성, 폰트는 모듈 스코프에서 한 번 읽기 권장 — [ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response); npm `@vercel/og` 1.0.3(2026-09-22) 주간 2,142,440.

### Inferences
- 한국어 단일 언어로 출발하더라도 `[lang]` 루트 세그먼트 + next-intl 4 구조를 처음부터 잡아두면 16.3의 `root-params`·`'use cache'`와 맞물려 공유 페이지의 일본어/영어 확장 비용이 낮다.
- OG 이미지는 한글 폰트가 수 MB라 500KB 제한에 걸린다. 공유 링크용 OG 이미지는 일정 제목·날짜만 넣는 서브셋 폰트(예: 필요한 글리프만 추출한 ttf)를 쓰거나, 폰트를 런타임에 fetch하는 방식으로 제한을 우회해야 한다(문서가 "fetching at runtime" 제안).
- 접근성 게이트는 Storybook(개발 중) → Vitest Browser Mode + axe(컴포넌트) → Playwright + `@axe-core/playwright`(페이지) 3단으로 자동화할 수 있다.

### Gaps
- next-intl 4.0의 구체적 변경 사항(블로그 색인에 제목만 있음)은 미확인.
- Satori의 한글 폴백·서브셋 공식 가이드는 열지 못함.
- 한국 엔지니어링 블로그(토스, 우아한형제들, 카카오, 네이버 D2)에서 Next.js 16/Cache Components 채택 사례는 검색 할당량 소진 전까지 1차 자료를 찾지 못했다. 확보한 것은 토스 TMC 25(2025-07-25) 세션 목록(Native ESM 마이크로프론트엔드, 웹 성능) 뿐이며 프레임워크 선택 논의는 없었다 — [toss.im TMC 25](https://toss.im/tmc-25/sessions/engineering/frontend-32).
