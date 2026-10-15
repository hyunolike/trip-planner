# AI 기능 · 실시간 협업 · 한국 플랫폼 연동 (2026-10 기준)

> 조사 범위: 여행노트(Next.js + Kotlin/Spring Boot + PostgreSQL, 1인 사이드 프로젝트)에 붙일 (a) LLM 기능, (b) 2~5인 동시 편집, (c) 카카오/네이버/구글/애플 로그인·지도·공유·대중교통·날씨, (d) 알림, (e) 분석 도구. 조사일 2026-10-15. 세션 웹검색 한도(200회)를 모두 소진해 일부 항목(ODsay 단가, 네이버 로그인 공식 검수 문서, 국내 기술블로그의 CRDT/LLM 사례)은 1차 출처를 열지 못했고 Gaps에 적었다.

---

## 1. AI 기능: 일정 생성·편집에 어떤 LLM 스택과 패턴이 현재 표준인가

### Takeaway
2026-10 시점의 표준은 "구조화 출력(JSON Schema 제약 디코딩) + strict tool use + 프롬프트 캐싱 + 스트리밍"이며, Claude는 `output_config.format`(베타 헤더 불필요), OpenAI/Gemini도 동급 기능을 제공한다. 자바/코틀린 백엔드라면 Spring AI 2.0(2026-06-12 GA, Spring Boot 4 필수) 또는 Anthropic Java SDK 직접 호출, Next.js 쪽이라면 AI SDK 7(2026-06-25, Node 22+)이 현역이다. 여행 앱에서 "면접관이 인정할" AI는 자유 생성 챗봇이 아니라 비정형 입력(블로그·예약 메일)을 스키마로 정규화하고, 시간·동선 타당성을 결정론적 계산과 결합해 검증하는 기능이다.

### Cited Findings

**Claude 모델·가격 (1차 출처)**
- 현행 모델 ID와 단가(입력/출력 $/MTok): Claude Fable 5.1 `claude-fable-5-1` $10/$50, Claude Opus 5.5 `claude-opus-5-5` $4/$20, Claude Sonnet 5.5 `claude-sonnet-5-5` $2/$10, Claude Haiku 5.5 `claude-haiku-5-5` $0.10/$0.50(프롬프트 10만 토큰 이하; 초과 시 $0.50/$2.50). 모두 1M 컨텍스트, 4.6 이후 모델은 1M 전체가 표준 단가(장문 할증 없음, Haiku 5.5 제외) — [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing); 모델 ID 표는 Claude API 스킬 캐시(2026-10-06)와 일치.
- 프롬프트 캐시: 5분 쓰기 1.25x, 1시간 쓰기 2x, 읽기는 기본 0.1x이지만 Opus 5.5/Sonnet 5.5는 0.05x($0.20/$0.10 per MTok), Fable 5.1은 0.025x($0.25). 배치 API는 입력·출력 모두 50% 할인(Sonnet 5.5 배치 $1/$5, Haiku 5.5 배치 $0.05/$0.25) — [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing).
- 서버 도구: 웹 검색 $10/1,000회, 웹 페치 무료(토큰 비용만), 웹검색/페치와 함께 쓰는 코드 실행 무료. Fast mode(Opus 5.5 $8/$40)는 1st-party API 전용 — [Claude Pricing](https://platform.claude.com/docs/en/about-claude/pricing).
- 구조화 출력: `output_config: {format: {type: "json_schema", schema: ...}}`로 제약 디코딩. 베타 헤더 불필요(구 `output_format` 파라미터는 deprecated). `strict: true` 툴과 병행 가능. 지원 모델에 Opus 5.5·Sonnet 5.5·Haiku 5.5·Fable 5.1 포함. 제약: 재귀 스키마, `minimum/maximum`, `minLength/maxLength`, `minItems` 2 이상 불가, `additionalProperties`는 `false`만 허용. 문법 컴파일 결과는 24시간 캐시, 스키마 또는 툴 셋 변경 시 무효화. strict 툴 20개/옵셔널 파라미터 24개 상한. Python SDK는 `client.messages.parse()`, TS는 `zodOutputFormat()` 헬퍼 제공 — [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).
- API 변경점(스킬 기준): 4.6+ 모델은 어시스턴트 프리필 400 에러, `budget_tokens` 대신 `thinking: {type: "adaptive"}` + `output_config.effort`, Opus 5.5/Sonnet 5.5/Fable 5.1은 강제 `tool_choice: any/tool`이 400(`auto` + `strict: true` 또는 구조화 출력으로 대체). MCP 커넥터는 `mcp_servers` + `tools: [{type: "mcp_toolset"}]` 양쪽 필요(베타 `mcp-client-2025-11-20`) — Claude API 스킬(캐시 2026-10-06), 문서 루트 [platform.claude.com/docs](https://platform.claude.com/docs).

**OpenAI / Gemini 가격 (2차 출처, 상충 있음)**
- BenchLM(2026-07): GPT-5.6 계열이 2026-07-09 GA, Sol $5/$30, Terra $2.50/$15, Luna $1/$6, 캐시 입력 10%, 배치 50% — [BenchLM](https://benchlm.ai/openai/api-pricing). Morph(2026-06): GPT-5.5 $5/$30, GPT-5.4 $2.50/$15, GPT-5.4-nano 입력 $0.20 — [morphllm](https://morphllm.com/openai-api-pricing). 두 집계가 "현재 모델"을 다르게 쓰므로 공식 페이지 재확인 필요.
- Gemini: 2.5 Flash $0.30/$2.50, 2.5 Flash-Lite $0.10/$0.40, 3 Flash $0.50/$3.00, 3.1 Flash-Lite $0.25/$1.50 — [morphllm Gemini](https://www.morphllm.com/gemini-api-pricing). Gemini 3.6 Flash는 $1.50/$7.50([Hashnode](https://hashnode.com/blog/gemini-api-pricing-2026))와 $0.75/$3.75([anotherwrapper](https://anotherwrapper.com/llm-pricing/gemini-3.6-flash))로 2배 차이. CloudZero는 2026-03-23부터 Prepay/Postpay 요금제로 전환됐다고 보도 — [CloudZero](https://www.cloudzero.com/blog/gemini-pricing/). 모두 2차 출처.

**프레임워크**
- Spring AI 2.0.0 GA 2026-06-12. Spring Boot 4.0/4.1 + Framework 7.0 필수, Jackson 3, JSpecify. 툴 호출 루프가 `ToolCallingAdvisor`로 advisor 체인에 편입, `ToolSearchToolCallingAdvisor`로 점진적 툴 노출. provider-native 구조화 출력 + `StructuredOutputValidationAdvisor`(검증 실패 시 자동 재시도). Anthropic은 SDK 변형만 남기고 HTTP 변형 제거. MCP Java SDK 2.0.0 번들(2025-11-25 스펙 준수), `@McpTool/@McpResource/@McpPrompt` 애노테이션, Streamable HTTP 기본(SSE 전송 deprecated), stateless 변형 제공, mcp-security로 OAuth2/API 키 — [Spring AI 2.0.0 GA](https://spring.io/blog/2026/06/12/spring-ai-2-0-0-GA-available-now/).
- Spring Boot 현행 GA는 4.1.1 — [spring.io/projects/spring-boot](https://spring.io/projects/spring-boot).
- Spring AI 2.0은 1.x에서 drop-in 업그레이드가 아니다(모듈 이름 변경, 옵션 불변화, 프로퍼티 키에서 `.options` 제거) — [Spring AI 2.0.0 GA](https://spring.io/blog/2026/06/12/spring-ai-2-0-0-GA-available-now/), [VS Magazine](https://visualstudiomagazine.com/articles/2026/06/29/spring-ai-2-0-goes-ga-giving-java-developers-a-more-mature-ai-app-stack.aspx).
- Vercel AI SDK 7 2026-06-25 출시: `WorkflowAgent`(내구성 있는 재개 가능 에이전트), `HarnessAgent`(실험, Claude Code/Codex 하네스 구동), `registerTelemetry()` OpenTelemetry 통합, 툴별 `contextSchema`, MCP Apps(샌드박스 iframe), HMAC 서명 툴 승인. 마이그레이션은 `npx @ai-sdk/codemod v7` — [Vercel blog](https://vercel.com/blog/ai-sdk-7). npm `ai` 최신 7.0.141, `engines.node >= 22` — [npm registry](https://registry.npmjs.org/ai/latest). 2차 출처는 ESM 전용(CJS `require` 미지원)이라 보도 — [Vercel changelog](https://vercel.com/changelog/page/21).
- AI SDK 6(2025-10 Ship AI 베타 → 2025-12 출시): `ToolLoopAgent`, 휴먼 승인(`needsApproval`), 안정화된 MCP, 통합 구조화 출력 — [v6 docs](https://v6.ai-sdk.dev/docs/foundations), [InfoQ](https://infoq.com/news/2025/10/vercel-ship-ai).

**MCP**
- MCP 스펙 2026-07-28 개정(직전 2025-11-25): 프로토콜 세션과 `Mcp-Session-Id` 제거, `initialize` 핸드셰이크 제거(매 요청 `_meta`에 버전·capability 포함), `server/discover` 필수, 서버→클라이언트 요청(sampling/roots/elicitation) 대신 Multi Round-Trip Requests(`resultType: "input_required"`), SSE 재개(`Last-Event-ID`) 제거, Roots/Sampling/Logging deprecated(12개월 유예), Dynamic Client Registration 대신 Client ID Metadata Documents, `tools/list`는 결정적 순서 권장(프롬프트 캐시 적중률), `ttlMs/cacheScope` 필수 — [MCP changelog 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog).
- 따라서 Spring AI 2.0 GA가 번들한 MCP Java SDK 2.0.0(2025-11-25 스펙)은 최신 개정보다 한 단계 뒤다 — [Spring AI 2.0.0 GA](https://spring.io/blog/2026/06/12/spring-ai-2-0-0-GA-available-now/) vs [MCP changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog).

**평가·관측 도구**
- Langfuse Cloud: Hobby 무료(월 5만 유닛, 30일, 2명), Core $29(10만 유닛, 90일), Pro $199, Enterprise $2,499; 초과 $8/10만 유닛; EU 리전 전 플랜; 셀프호스트 무료 — [Langfuse pricing](https://langfuse.com/pricing). 2026-01 ClickHouse 인수설은 2차 출처만 확인 — [futureagi](https://futureagi.com/blog/best-promptfoo-alternatives-2026).
- Promptfoo는 MIT·무료 CLI로 CI에서 빌드 실패 게이트로 쓸 수 있는 유일한 도구라는 평가, Braintrust 최저 유료 $249/월 — [beri.net 비교](https://www.beri.net/article/braintrust-vs-langfuse-vs-promptfoo-llm-eval-regression-gate-2026) (2차).

**한국어 품질**
- KMMLU(45과목 35,030문항) 원 논문 시점(2024) GPT-4 59.95%, HyperCLOVA X 53.40% — [arXiv 2402.11548](https://arxiv.org/abs/2402.11548). BenchLM 2026-07 스냅샷: Claude Sonnet 4.6 85%, GPT-5.4 83.7%, Solar Pro 2 80.1%(출처 첨부 미완이라 "완전 검증 아님" 명시) — [BenchLM KMMLU](https://www.benchlm.ai/benchmarks/kmmlu). Artificial Analysis 다국어 지수 한국어 항목은 상위 5개가 Claude Opus 4.5/4.6, Gemini 3.1 Pro Preview 92점 — [Artificial Analysis](https://artificialanalysis.ai/ko/models/multilingual/korean).

**여행 앱 AI 기능 현황 (2차)**
- Mindtrip: 1,100만 POI DB + 지도 위 챗, Sabre 항공 예약, "관광지 편향 맛집 추천" 비판. Layla: 실시간 호텔가 + PriceLock 알림, 후속 수정 유연성은 ChatGPT보다 낮다는 평. Wanderlog: 지도 중심 수동 계획 + 그룹 협업, AI 보조, Pro 약 $40/년 — [fast.io](https://fast.io/resources/best-ai-for-travel-planning-2026/), [unite.ai](https://www.unite.ai/best-ai-tools-for-travel-planning/). 2026 가이드는 "리서치 도구 / 일정 구조화 도구 / 예약 사이트"를 나눠 쓰라고 권함 — [fast.io](https://fast.io/resources/best-ai-for-travel-planning-2026/).

### Inferences
- 여행노트의 데이터 모델(day → stops{time,title,memo,lat,lng})은 구조화 출력에 이상적이지만, Claude 스키마 제약 때문에 `time`은 `format: "time"` 문자열, 좌표는 `number`만 쓰고 범위 검증(위도 −90~90 등)은 서버에서 해야 한다. `additionalProperties: false`와 `required` 전부 지정이 필수.
- 비용 감각: 블로그 글 1편(약 5K 토큰 입력) → stops 추출(약 1K 출력)은 Sonnet 5.5로 약 $0.02, Haiku 5.5로 약 $0.001. 1인 사이드 프로젝트 트래픽(월 수천 건)에서는 모델 선택이 비용을 좌우하지 않고, 캐시 가능한 시스템 프롬프트(장소 포맷 규칙·예시)를 앞에 고정하는 것이 더 중요하다. Claude API 스킬은 코드 생성 시 기본 모델로 `claude-opus-5-5`를 지정하므로 구현 단계에서 모델 선택을 명시적으로 결정해야 한다.
- 아키텍처 선택: LLM 호출은 데이터와 검증 로직이 있는 Spring 쪽에 두고 SSE로 브라우저에 스트리밍하는 편이 "AI 결과를 도메인 규칙으로 검증한다"는 서사를 만들기 쉽다. 단 Spring AI 2.0은 Boot 4가 전제이므로, Boot 3.x를 유지한다면 Spring AI 1.x 또는 Anthropic Java SDK(`com.anthropic`) 직접 호출이 현실적이다. Next.js 쪽 UI 스트리밍(`useChat`)이 핵심이라면 AI SDK 7 BFF 패턴이 더 적은 코드로 끝난다.
- "앱을 MCP 서버로 노출"은 2026-07-28 개정으로 stateless HTTP가 표준이 되어 구현 난도가 내려갔고, Spring AI의 `@McpTool` 한 줄로 가능하다. 다만 Spring AI 2.0 번들 SDK가 2025-11-25 스펙이라 "최신 개정 준수"를 내세우려면 SDK 업데이트를 확인해야 한다. 포트폴리오 신호로는 "내 일정을 Claude/ChatGPT에서 읽고 수정" 데모가 되므로 가성비는 좋지만, 사용자 가치보다는 기술 시연 성격이 강하다.
- 실제로 유용한 AI 기능 우선순위(시니어 관점): (1) 블로그/예약 메일/캡처 텍스트 → stops 정규화(구조화 출력, 사람 확인 UI 필수), (2) 시간 타당성 검사(인접 stop 간 이동시간은 경로 API 같은 결정론적 소스로 계산하고 LLM은 설명·제안만), (3) 버퍼/휴식 제안. "AI가 일정 전체 생성"은 2차 출처에서도 관광지 편향 비판이 있어 차별점이 되기 어렵다.
- 평가는 Promptfoo(CI 게이트, 무료) + 추출 정확도 골든셋 20~50건이면 1인 프로젝트 규모에 충분하다. Langfuse Hobby(5만 유닛)는 트레이싱용으로 무료 범위 안에 들어온다.
- 한국어 품질은 Claude/GPT/Gemini 상위 모델 간 차이가 벤치마크상 수 %p 이내라 모델 선택보다 프롬프트 예시(한국어 지명·일본어 지명 혼용 처리)가 더 큰 변수다.

### Gaps
- OpenAI·Gemini 공식 가격 페이지를 직접 열지 못해 집계 사이트 수치만 확보(서로 상충). Claude 외 모델의 구조화 출력 세부 제약(2026 기준)도 미확인.
- Spring AI 1.x의 지원 종료 일정, Spring AI 2.0의 Anthropic 구조화 출력 지원 범위(어떤 모델/`strict` 매핑)는 공식 업그레이드 노트를 열지 못해 미확인.
- toss.tech, 우아한형제들, D2, 카카오 기술블로그의 2025~2026 LLM 적용 글은 검색 한도 소진으로 확보하지 못함.
- MCP Java SDK가 2026-07-28 개정을 지원하는 버전/일자 미확인.

---

## 2. 실시간 협업: 2~5인 동시 편집에 CRDT가 필요한가, 2026년의 실용적 선택은

### Takeaway
2026년 CRDT 생태계는 Yjs 13.6.33(MIT) + Hocuspocus 4(2026-05-08 안정, Node 22+) 조합이 가장 범용적이고, Automerge 3(2025-07, 메모리 10배+ 감소)와 Loro 1.16(안정 포맷)이 대안이다. 동기화 엔진(Zero 1.0 2026-06, Electric, PowerSync)과 TanStack DB 0.6(2026-03, 아직 베타)은 "쿼리 기반 부분 동기화"로 다른 문제를 푼다. 2~5명이 day/stop 리스트를 편집하는 여행노트에는 "서버 권위 + 버전 기반 낙관적 잠금 + 필드 단위 LWW + WebSocket/SSE 브로드캐스트"가 가장 작고 설명 가능하며, CRDT는 memo 같은 장문 텍스트 동시 편집이나 오프라인 편집이 요구될 때만 정당화된다.

### Cited Findings

**CRDT 라이브러리**
- Yjs 최신 13.6.33, MIT — [npm yjs](https://registry.npmjs.org/yjs/latest). 네트워크 비종속, 오프라인 편집·스냅샷·undo/redo·공유 커서 지원 — [docs.yjs.dev](https://docs.yjs.dev).
- Hocuspocus 4 안정 발표 2026-05-08: Node(ws 또는 uWebSockets.js)·Bun·Deno·Cloudflare Workers 지원, Node 22 이상 필수, 훅 페이로드가 웹 표준 `Request/Headers`로 변경, 트랜잭션 origin이 `{source: 'connection'|'redis'|'local'}` 구조체, SQLite 확장이 better-sqlite3로 이동, 와이어 프로토콜은 v3와 양방향 호환, Tiptap 외 Slate/Quill/Monaco/ProseMirror 등 모든 Yjs 클라이언트와 동작 — [Hocuspocus 4 release](https://tiptap.dev/blog/release-notes/hocuspocus-4-stable-release). `@hocuspocus/provider` 4.3.0이 2026-06-18 갱신 — [socket.dev](https://socket.dev/npm/package/@hocuspocus/provider/overview/4.3.0).
- Automerge 3.0(2025-07): 압축 컬럼 포맷을 메모리에 그대로 유지해 메모리 10배 이상 감소(Moby Dick 붙여넣기 700MB → 1.3MB), `Text` 클래스 제거, `next` API가 기본, `@automerge/automerge-repo` 2.1.0이 3.0을 기본 사용, 마이그레이션은 거의 하위호환 — [Automerge 3 blog](https://automerge.org/blog/automerge-3/), [migration guide](https://automerge.org/docs/migrating-from-automerge-2-to-automerge-3).
- Loro 1.0(2024-10-23) 안정 인코딩 포맷, 수백만 op 문서 로드 16ms → 1ms(shallow snapshot 0.37ms), Rust/JS(WASM)/Swift — [Loro 1.0](https://loro.dev/blog/v1.0). npm `loro-crdt` 최신 1.16.4, MIT — [npm loro-crdt](https://registry.npmjs.org/loro-crdt/latest).
- Notion은 LWW에서 한 사람의 편집이 통째로 사라지는 문제 때문에 RGA 계열 CRDT로 이동(문자마다 안정 ID, 삭제는 tombstone) — [Notion blog](https://www.notion.com/blog/how-notion-handles-concurrent-editing-with-crdts). Velt(2025-11-10)는 OT가 대규모 텍스트 에디터에서 여전히 흔하다고 정리 — [Velt](https://velt.dev/blog/crdt-implementation-guide-conflict-free-apps).

**호스팅형 협업 SaaS**
- Liveblocks: Free $0(협업 분 3,000/월, 댓글 200, 룸당 10 연결, 브랜딩 필수), Pro $30/월(크레딧 $30, 연간 $25), Team $600/월부터. 과금은 "실시간 협업 분" $0.002/user-minute(2명 이상 접속 시만 과금, 1인 세션 무료), 댓글 $0.01, 스토리지 업데이트 $1/1M. MAU/MAR 과금이 아니라 크레딧 기반 — [Liveblocks pricing](https://liveblocks.io/pricing.md). (검색 결과에 남아 있는 "500 룸 포함/$0.03 룸당"이나 "$230/1,000 MAU"는 구 요금 스냅샷.)
- PartyKit은 Cloudflare 인수 후 PartyServer(Durable Objects 기반)로 이어짐: `partyserver` 0.5.x, `partysocket`(재연결·버퍼링), `y-partyserver`(Yjs) — [cloudflare/partykit](https://github.com/cloudflare/partykit), [socket.dev partyserver](https://socket.dev/npm/package/partyserver/overview/0.5.4).
- Supabase Free: DB 500MB, MAU 5만, 1주 비활성 시 일시정지; Pro $25/월(Realtime 포함, $10 컴퓨트 크레딧). Convex Free: 함수 호출 100만/월, DB 0.5GB; Pro $25/개발자/월 — [makerkit](https://makerkit.dev/blog/saas/supabase-pricing), [jetadmin](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/), [toolradar Convex](https://toolradar.com/tools/convex/pricing) (모두 2차).

**동기화 엔진·로컬 퍼스트**
- Zero 1.0(InfoQ 2026-06-08): 0.26.2 대비 breaking change 없는 첫 안정판, zero-client + zero-cache(Postgres 읽기 복제본을 SQLite로 유지), 클라이언트 번들 718KB(압축 232KB) 비판, SSR 미지원(로드맵) — [InfoQ](https://infoq.com/news/2026/06/zero-version-1). 적합: 쿼리 기반 부분 동기화, Postgres 기존 스키마, "Linear 같은" 생산성 앱. 부적합: 오프라인 쓰기/장기 오프라인, 네이티브 모바일(TS 클라이언트만), 백엔드 100GB 초과; Automerge를 "로컬 퍼스트·브랜치 기반 오프라인" 대안으로, Convex를 "동기화 엔진이 아닌 반응형 DB"로 분류 — [Zero when-to-use](https://zero.rocicorp.dev/docs/when-to-use).
- Electric Cloud: PAYG(월 $5 미만 면제, 쓰기 $1/1M, 보존 $0.10/GB-월), Pro $249/월, Scale $1,999/월; 읽기·egress·fan-out 항상 무료; Postgres Sync 추가 요금 +$2/1M. 사이트는 Apache 2.0 고지 — [electric.ax/pricing](https://electric.ax/pricing). electric-sql.com은 electric.ax로 301 리다이렉트.
- PowerSync Cloud: Free(월 2GB 동기화, 500MB 호스팅, 동시 50 클라이언트, 1주 비활성 시 비활성화), Pro $49/월부터(30GB, 1,000 동시, 초과 $1/GB), Team $599/월; Open Edition 셀프호스트 무료(source-available); Postgres/MongoDB/MySQL/SQL Server 지원 — [PowerSync pricing](https://www.powersync.com/pricing).
- TanStack DB 0.6(2026-03-25): SQLite 기반 로컬 영속·오프라인, `includes`로 정규화 데이터를 UI 트리로 재구성, PowerSync·Trailbase 증분 동기화 지원; 1.0 전 베타, SSR 설계 파트너 모집 중 — [TanStack blog](https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes).

**전송 계층·서버**
- WebTransport는 Safari 26.4(2026-03)에서 활성화돼 4대 브라우저 Baseline이 됐으나, Chrome/Safari가 legacy `:protocol = "webtransport"` 토큰을 보내 draft-15 엄격 서버가 거부할 수 있다는 지적 — [utsubo 2026](https://www.utsubo.com/blog/frontier-web-apis-2026-production-ready) (2차).
- Spring WebSocket/STOMP는 `spring-boot-starter-websocket`으로 2026년에도 표준 경로(2026-01 가이드) — [oneuptime](https://oneuptime.com/blog/post/2026-01-25-real-time-apps-websocket-stomp-spring/view); Spring Boot 4 전용 변경점은 검색에서 확인되지 않음.
- Redis는 8.0부터 AGPLv3를 추가 라이선스로 제공(2025-05-01 발표), JSON·TimeSeries·Query Engine이 코어에 통합; 2024-03 SSPL 전환으로 AWS/Google이 Valkey 포크 유지 — [Redis blog](https://redis.io/blog/agplv3/).

### Inferences
- 여행노트의 충돌 지점은 (a) 같은 stop의 같은 필드 동시 수정, (b) stop 순서 재배열 동시 수행, (c) 삭제 vs 수정이다. 필드 단위 LWW + 서버 버전 번호(`If-Match`/`version` 컬럼)로 (a)(c)는 "마지막 저장이 이기되 상대에게 토스트로 알림"이 되고, (b)는 정수 인덱스 대신 fractional index(문자열 순서 키)를 쓰면 재배열 충돌이 대부분 자연 병합된다. 이 수준은 Spring + Postgres만으로 끝나고 CRDT 라이브러리가 필요 없다.
- CRDT(Yjs)가 정당화되는 경우: memo 필드를 여러 명이 동시에 타이핑하는 UX를 제공하거나, 여행 당일 오프라인에서 체크·수정 후 재접속 병합을 약속할 때. 이때도 "문서 전체를 Y.Doc으로" 가 아니라 memo 텍스트만 Y.Text로 두고 나머지는 서버 권위 모델로 두는 하이브리드가 설명하기 쉽다. Hocuspocus 4는 Node 22+ 별도 프로세스이므로 Spring 단일 서버 구성에 운영 대상 하나가 추가된다는 점을 과잉설계 리스크로 명시해야 한다.
- Zero/Electric/PowerSync/TanStack DB는 "쿼리 결과를 클라이언트에 미러링"하는 인프라로, Postgres 논리 복제 + 별도 서비스(zero-cache 등)를 요구한다. 1인 운영 사이드 프로젝트에서 2~5명 동시 편집을 위해 도입하면 운영 복잡도 대비 이득이 없다. 단 "로컬 퍼스트 동향을 알고 있고 왜 안 썼는지"를 설명하는 것은 좋은 면접 소재다.
- Liveblocks는 1인 세션 무료·2명 이상 접속 시 분당 $0.002라 소규모엔 사실상 무료지만, 룸당 10 연결 제한과 브랜딩 요구(Free)가 있고 데이터가 외부 SaaS에 있다. 자체 WebSocket으로 presence(접속자 아바타, 편집 중 표시)만 구현해도 시니어 관점의 "협업 감각"은 충분히 전달된다.
- 전송: 서버→클라이언트 변경 브로드캐스트만 필요하면 SSE(`SseEmitter` 또는 WebFlux `Flux<ServerSentEvent>`)가 Spring에서 가장 단순하고 로드밸런서/프록시 친화적이다. 커서·타이핑 presence처럼 클라이언트→서버 고빈도 이벤트가 있으면 WebSocket(STOMP는 선택). WebTransport는 Baseline이 됐지만 서버 생태계·프록시 호환이 미성숙해 2026년에도 이 규모엔 과하다. 다중 인스턴스로 확장할 때만 Redis pub/sub(Redis 8 AGPL 또는 Valkey)이 필요하다.
- 선택 요약(시니어 눈높이): "LWW + 버전 충돌 감지 + fractional index + SSE/WS presence"는 **신뢰할 수 있는 차별점**(설계 근거를 설명할 수 있음), "Yjs memo 동시 편집"은 **조건부 차별점**(오프라인·장문 요구가 있을 때), "Zero/Electric 도입"은 이 규모에선 **기믹**에 가깝다.

### Gaps
- 국내 기술블로그(토스·우아한형제들·네이버 D2·카카오)의 CRDT/동시편집 실무 글은 두 차례 검색 모두 미검출, 도메인 제한 검색은 한도 소진으로 실행 불가.
- Yjs/Automerge/Loro 번들 크기·성능 2026 비교는 검색 한도로 미확인.
- Spring Boot 4.x에서의 WebSocket/SSE 변경점(있다면)은 공식 릴리스 노트를 열지 못함.
- Hocuspocus 라이선스 명시(페이지에 없음), Supabase/Convex 공식 요금 페이지 미확인(2차 출처만).

---

## 3. 한국 플랫폼 연동: 로그인·지도·공유·대중교통·날씨의 2026년 요구사항과 비용

### Takeaway
카카오맵 API는 2026-07-21부터 "개발자 계정당 첫 번째 활성화 앱에만 무료 쿼터"로 바뀌었고(지도 SDK 일 30만, 로컬 API 각 일 10만, 신규 경로/정적지도 일 1,000건), 초과분은 비즈월렛 연결 후 건당 0.1~10원이다. 구글맵은 2025-03-01부터 $200 크레딧 대신 SKU별 월 무료량(Essentials 10,000건 등)으로 바뀌었다. 카카오톡 공유는 일 3만 건 무료, 초과 건당 50원(2026-02-02~12-31 한시 10원). 카카오 로그인은 비즈 앱 전환 + 비즈니스 정보 심사(영업일 3~5일) 없이는 이메일 필수 동의·이름·전화번호를 못 받는다. 날씨는 Open-Meteo 무료 티어가 비상업용 한정(일 1만 건)이고 KMA·JMA 모델을 모두 제공한다. 일본 대중교통(Ekispert·NAVITIME)은 공개 단가를 확인하지 못했다.

### Cited Findings

**카카오맵·로컬 API**
- 정책 변경 공지(2026-06-16 게시, 2026-07-21 시행): 신규 공개 API 4종(대중교통·도보·자전거 경로, 정적지도)은 일 1,000건 무료, 초과 시 경로 건당 10원, 정적지도 건당 2원. 지도/로컬 API는 기존 무료량 유지. 두 번째 활성화 앱부터 또는 쿼터 초과 시 비즈월렛 연결 + 유료 API 설정 필요. 2026-07-21 이전 활성화 앱은 별도 안내 전까지 기존 무료 쿼터 유지. 사업자 등록 요건은 공지에 없음 — [Kakao DevTalk 공지](https://devtalk.kakao.com/t/api-notice-on-new-kakao-map-api-features-and-free-quota-policy/150222).
- 무료 쿼터표(일간, 첫 번째 활성화 앱): 지도 Web(JavaScript) SDK 300,000건, Android/iOS SDK 300,000건, 주소→좌표·좌표→행정구역·좌표→주소·좌표계 변환 각 100,000건, 키워드/카테고리 장소 검색 각 100,000건, 대중교통·도보·자전거 경로·정적지도 각 1,000건. 전체 API 공통 월간 쿼터 3,000,000건. 추가 요금(건당): 지도 SDK 0.1원, 좌표/주소 변환 0.5원, 장소 검색 2원, 경로 10원, 정적지도 2원 — [Kakao 쿼터 문서](http://developers.kakao.com/docs/ko/getting-started/quota).
- 무료량 소진 시 429 에러, 사용량은 앱 관리 [통계] > [쿼터]에서 확인. 지도 SDK에 REST API 키를 쓰면 안 되고 JavaScript 키 + "JavaScript SDK 도메인" 등록 필요 — [Kakao 로컬 공통](http://developers.kakao.com/docs/ko/local/common), [카카오맵 공통](http://developers.kakao.com/docs/ko/kakaomap/common).

**네이버 지도(NCP)**
- Web Dynamic Map은 대표 계정 1개에 월 6,000,000건 무료(캐시된 요금표), Client ID당 월 최대 Web 1,000만 건·Mobile 1억 건, 상향은 고객지원 문의; Maps 문서 갱신 2026-04-23 — [NCP Maps](https://m.ncloud.com/product/applicationService/maps), [api.ncloud-docs](https://api.ncloud-docs.com/docs/application-maps-overview). 건당 초과 단가는 검색 결과에서 비어 있어 미확인.

**구글맵 플랫폼**
- 2025-03-01: $200 월 크레딧 폐지 → Core SKU별 월 무료량(Essentials 10,000, Pro 5,000, Enterprise 1,000; Map Tiles 100,000 등 예외), 볼륨 할인 구간이 10만 → 500만+ 이벤트로 확대 — [Google March 2025 changes](https://developers.google.com/maps/billing-and-pricing/march-2025), [Billing FAQ](https://developers.google.com/maps/billing-and-pricing/faq).
- 현행 단가(1,000건당, 무료량 초과 첫 구간): Dynamic Maps(JS) $7.00(무료 10,000), Places Autocomplete 요청 $2.83(무료 10,000), Place Details Essentials $5.00(무료 10,000)/Pro $17/Enterprise $20, Text Search Pro $32(무료 5,000), Routes Compute Routes Essentials $5.00(무료 10,000), Geocoding $5.00(무료 10,000), Static Maps $2.00(무료 10,000) — [Google Maps pricing](https://developers.google.com/maps/billing-and-pricing/pricing).

**로그인**
- 카카오: 카카오 로그인 ON(아니면 KOE004), Redirect URI 필수(KOE006), 클라이언트 시크릿. 일부 개인정보 동의항목은 "추가 기능 신청"(비즈 앱 전환 → 자격 확인 → 비즈니스 정보 심사) 후에만 설정 가능. 심사는 영업일 3~5일, 반려 시 재심사도 3~5일. OpenID Connect는 카카오 로그인 활성화 후 ON 하면 ID 토큰 발급. 간편가입은 카카오싱크 도입 서비스만(카카오톡 채널 연결 + 약관 등록 필요) — [Kakao 로그인 사전 설정](http://developers.kakao.com/docs/ko/kakaologin/prerequisite). 카카오 로그인은 일/월 쿼터 없이 사용자당 액세스 토큰 10분당 20개, 리프레시 토큰 60분당 30개 제한 — [Kakao 쿼터 문서](http://developers.kakao.com/docs/ko/getting-started/quota).
- 카카오 개발자 포럼 사례(2026): 비즈 앱 전환 후에도 이름·성별·생일·출생연도·전화번호·CI는 승인 전까지 `null`; phone_number 신청 반려 사례, 회사명 불일치로 비즈니스 정보 반려 사례; 개인정보 항목 심사가 카카오비즈니스에서 디벨로퍼스로 이관 — [DevTalk 150606](https://devtalk.kakao.com/t/topic/150606), [DevTalk 134565](https://devtalk.kakao.com/t/topic/134565), [DevTalk appreview](https://devtalk.kakao.com/c/appreview/220?page=2).
- 네이버: 연동 후 네이버 최종 검수 필수(회원가입 화면·로그인 버튼 클릭부터 완료까지 전체 캡처 제출), 검수 전에는 기능 사용 불가 — [채널톡 가이드](https://docs.channel.io/clickn/ko/articles/네이버-아이디로-로그인-261c8aeb) (2차). 이름·이메일·별명·프로필사진 외 항목(성별·연령대·생일·출생연도)은 별도 승인 전까지 빈 값 — [naver-login-kmp](https://klibs.io/project/yjyoon-dev/naver-login-kmp) (2차). developers.naver.com은 이 환경에서 직접 열 수 없었음.
- 구글: GIS 라이브러리가 FedCM으로 하위호환 전환 중, One Tap/자동 로그인은 "가능한 빨리 FedCM 이전" 권고, Button 플로우 FedCM은 선택, 명시적 마감일 없음, 크로스오리진 iframe은 `allow="identity-credentials-get"` 필요 — [Google FedCM migration](https://developers.google.com/identity/gsi/web/guides/fedcm-migration).
- 애플: App Store 심사 지침 4.8 — 서드파티/소셜 로그인으로 주 계정을 만드는 앱은 "이름·이메일만 수집, 이메일 비공개 허용, 동의 없는 광고 추적 없음"을 만족하는 동등한 로그인을 함께 제공해야 함(자사 계정 시스템만 쓰는 앱, 정부 eID 등은 예외). 지침은 App Review/Notarization 대상 앱에 적용되며 웹사이트 적용 여부는 명시 없음 — [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

**카카오톡 공유**
- 서비스 자체 버튼에는 `sendDefault()`(피드·리스트·위치·커머스·텍스트)와 `sendCustom()`(메시지 템플릿 도구에서 만든 템플릿 ID, 앱별 관리) 사용; JS SDK 1.43.0부터 공유 모듈명 변경; 공유 대상 화면을 친구/채팅방만으로 제한하는 파라미터는 JS SDK 2.8.0+ 및 카카오톡 26.2.0+에서 별도 권한 필요 — [Kakao 공유 JS](https://developers.kakao.com/docs/latest/ko/kakaotalk-share/js-link), [공유 공통](https://developers.kakao.com/docs/latest/ko/kakaotalk-share/common), [사용자 정의 템플릿](https://developers.kakao.com/docs/latest/ko/message-template/custom).
- 공유 쿼터: 일 30,000건, 추가 요금 기본/사용자 정의/스크랩 모두 건당 50원이며 2026-02-02~2026-12-31은 건당 10원 한시 적용(변경 가능). 카카오톡 메시지 전송 API는 일 30,000건, 발신자당 100건·수신자당 100건·쌍당 20건 — [Kakao 쿼터 문서](http://developers.kakao.com/docs/ko/getting-started/quota).

**대중교통·일본**
- ODsay: 대중교통 길찾기 `searchPubTransPathT`(SX,SY,EX,EY 필수), 버스노선 `searchBusLane`, 노선 그래픽 `loadLane` 등 제공; 무료/유료(Standard·Flex) 구분, 서비스 타입별 "제한 호출수"가 있으나 수치·단가는 페이지에 없음; 데이터는 한국 한정(서울·수도권·부산 등) — [ODsay 가이드](https://lab.odsay.com/guide/guide).
- 카카오 대중교통 경로 API가 2026-07-21부터 공개(일 1,000건 무료, 초과 건당 10원) — [DevTalk 공지](https://devtalk.kakao.com/t/api-notice-on-new-kakao-map-api-features-and-free-quota-policy/150222).
- Ekispert(駅すぱあと) Web Service: フリープラン/スタンダードプラン 존재, 90일 무료 평가판(MCP 서버 포함), 경로 탐색·정기권 요금·역 검색 API; 단가는 별도 플랜 페이지(미열람) — [api-info.ekispert.com](https://api-info.ekispert.com/). NAVITIME은 2026-05-15 "拠点間コスト一括高速計算API" 공개, 2024-01 API Hub 전환; 단가 미공개 — [cloud.watch](https://cloud.watch.impress.co.jp/docs/news/2109088.html), [NAVITIME API](https://api-sdk.navitime.co.jp/information).
- 무료 대안 Transitous(커뮤니티 운영, 자유 SW + 공개 데이터 기반 대중교통 라우팅, GLT26 발표) — [media.ccc.de](https://media.ccc.de/v/glt26-679-transitous-free-and-open-public-transport-routing/audio); 한국·일본 커버리지는 미확인.

**날씨**
- Open-Meteo Free: 분당 600·시간당 5,000·일 10,000·월 300,000(월 한도는 포털 개발 중이라 미집행), 비상업용 한정. 유료 Standard 1M/월, Professional 5M/월, Enterprise 50M+(정액, 초과 과금 없음; 금액 미기재). 데이터 CC BY 4.0(상업 이용 가능, 출처 표기), 서버 코드 AGPLv3. 모델에 ECMWF·JMA·KMA 명시 — [Open-Meteo pricing](https://open-meteo.com/en/pricing). 독일 리뷰 사이트(2026-06)는 Standard €29/월, Professional €99/월로 기재 — [ki-syndikat](https://www.ki-syndikat.de/tools/open-meteo/) (2차).
- 기상청 단기예보(공공데이터포털, API허브 연계): 무료, 개발계정 일 10,000건, 운영계정은 활용사례 등록 시 증량, 자동승인; 5km 격자·3시간 간격, 2024-11-28부터 글피 예보 — [data.go.kr 15084084](https://www.data.go.kr/data/15084084/openapi.do), [data.go.kr 15139470](https://www.data.go.kr/data/15139470/openapi.do).

### Inferences
- 지도 선택: 한국 국내 여행은 카카오맵 JS SDK(일 30만 무료, 초과 0.1원)로 비용이 사실상 0원이고, 장소 검색(키워드 일 10만)도 넉넉하다. 일본(오사카·교토) 여행은 카카오/네이버 데이터가 약하므로 구글맵 JS(무료 10,000 로드/월, 초과 $7/1,000)가 불가피한데, 월 1만 로드는 사이드 프로젝트 트래픽에서도 넘길 수 있어 지도 로드를 뷰어 페이지에서 지연 로딩하거나 정적지도($2/1,000)로 대체하는 설계가 필요하다. "국가별로 지도 공급자를 추상화"하는 어댑터는 실용적 차별점이다.
- 카카오맵 "첫 번째 활성화 앱만 무료" 규칙은 개발/운영 앱을 분리하면 두 번째 앱이 유료가 되므로, 하나의 앱에 dev/prod 도메인을 모두 등록하거나 2026-07-21 이전 활성화 앱을 유지하는 편이 안전하다.
- 로그인 우선순위: 카카오(이메일은 선택 동의로도 받을 수 있지만 "필수"로 만들려면 비즈 앱 심사), 구글(FedCM 전환 외 추가 심사 없음)을 1차로, 네이버는 검수 제출 캡처 준비 비용이 있어 2차, 애플은 웹 전용 서비스에는 지침 4.8이 적용되지 않으므로(iOS 앱을 낼 때만 의무) 보류가 합리적이다. 개인 개발자가 사업자 없이 카카오 비즈니스 인증을 받을 수 있는지는 미확인이므로 설계 문서에 리스크로 표기.
- 카카오톡 공유는 일 3만 건 무료라 "링크 공유" 핵심 기능 비용이 0원이고, `sendDefault` 피드 템플릿(일정 제목·커버 이미지·링크)이면 템플릿 심사 없이 바로 쓸 수 있다. 사용자 정의 템플릿은 디자인 자유도는 높지만 템플릿 도구 관리가 추가된다.
- 대중교통: 한국 구간은 2026-07에 공개된 카카오 경로 API(일 1,000건 무료)가 ODsay보다 계약 절차가 단순해 "시간 타당성 검사"의 결정론적 소스로 적합하다. 일본 구간은 유료 API 단가를 확인하지 못했으므로 1인 프로젝트에서는 "이동시간은 사용자 입력 또는 구글 Routes($5/1,000, 무료 10,000)"로 두는 편이 현실적이다.
- 날씨: 사이드 프로젝트가 광고·결제 없이 운영되면 Open-Meteo 무료 티어(일 1만 건)로 충분하고 JMA·KMA 모델을 한 API로 받는다. 수익화 시 Open-Meteo 유료 또는 KMA 공공데이터(국내 한정, 무료)로 분리해야 한다. 날씨 자체는 기믹이 아니라 "여행 당일 화면"의 기본 요소다.

### Gaps
- ODsay 무료 호출 한도·Standard/Flex 단가, 네이버 지도 초과 단가, Ekispert/NAVITIME 단가는 1차 페이지를 열지 못하거나 수치가 없어 미확인.
- 네이버 로그인 공식 검수 가이드(developers.naver.com)는 이 환경에서 fetch가 차단되어 2차 출처만 확보.
- 카카오 비즈 앱 전환에 사업자등록이 필수인지, 개인 개발자 예외가 있는지 공식 문구 미확인.
- Visit Japan Web은 검색 한도 소진으로 조사하지 못함(공개 API가 있다는 근거도 없음).
- 카카오 JS SDK 최신 버전 번호와 1.x 지원 종료 일정(SDK 다운로드 페이지 404).
- 기상청 API허브(apihub.kma.go.kr) 자체의 2026 트래픽 정책은 공공데이터포털 수치로만 대체.

---

## 4. 알림: Web Push(iOS Safari)·FCM·카카오 알림톡

### Takeaway
iOS 웹 푸시는 2023년(iOS 16.4) 이후 "홈 화면에 추가한 웹앱"에서만 동작하고 Apple Developer Program 가입이 필요 없으며 VAPID 표준을 그대로 쓴다(2026년에도 이 조건이 바뀌었다는 근거는 없음). Safari 18.4/18.5부터 서비스워커 없이 보내는 Declarative Web Push가 추가됐다. FCM 웹은 같은 VAPID 기반이라 사이드 프로젝트에서는 web-push 라이브러리 직접 구현으로 충분하다. 카카오 알림톡은 건당 약 8~10원 수준이지만 카카오톡 채널·템플릿 심사·공식 딜러사 계약이 필요해 1인 B2C 프로젝트에는 비용보다 절차가 장벽이다.

### Cited Findings
- Apple 공식: "Add web push to Home Screen web apps in iOS 16.4 or later and Webpages in Safari 16 for macOS 13 or later." Apple Developer Program 가입 불필요. 권한 요청은 버튼 탭 같은 제스처 핸들러에서 즉시 `subscribe` 호출. Safari는 보이지 않는 푸시를 지원하지 않으며 수신 즉시 표시하지 않으면 권한을 회수. 서버는 VAPID 키 쌍 준비, RFC 8030, `https://*.push.apple.com` 허용, TLS SNI 필수, 페이로드 4KB 제한, JWT 갱신은 1시간에 1회 이하, `Urgency`/`Topic`/`TTL` 헤더 지원 — [Apple: Sending web push notifications](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers).
- Declarative Web Push: 서비스워커 없이 표준 JSON(`web_push` + `notification`)으로 알림 표시, JS 처리 실패 시 선언형 메시지가 폴백, iOS 18.4/iPadOS 18.4·macOS 15.5(Safari 18.5)에서 제공, WWDC25 세션 235에서 "기존 Web Push 지식이 그대로 적용되는 점진적 개선"으로 소개 — [WebKit: Meet Declarative Web Push](https://webkit.org/?p=16535), [WWDC25 235](https://developer.apple.com/videos/play/wwdc2025/235). iOS 26에서 홈 화면 요건이 바뀌었다는 1차 근거는 없음.
- FCM JS SDK: Push API 지원 브라우저에서 동작, HTTPS 필수, `firebase-messaging-sw.js` 루트 배치, Firebase 콘솔 "Web Push certificates"에서 VAPID 키 쌍 생성 후 `register()`에 전달(`getToken()`은 deprecated); 문서에 Safari/iOS 언급 없음 — [Firebase Cloud Messaging JS](https://firebase.google.com/docs/cloud-messaging/js/client).
- 알림톡 단가: Hackle 문서(2026-01 기준) 정가 10원·프로모션가 8원 — [Hackle message price](https://docs.hackle.io/crm-marketing/message-price); 딜러사 블로그는 6원/건 예시 시뮬레이션(실계약 단가 아님), 2026-07 기준 공식 딜러사 15개, LMS 대비 약 80% 저렴 — [bizgo 가격](https://blog.bizgo.io/inside/alimtalk-price-by-volume/), [bizgo 업체 비교](https://blog.bizgo.io/inside/alimtalk-provider-selection-guide/) (2차, 카카오 공식 단가표 아님).
- 카카오톡 메시지 API(친구에게 보내기)는 일 30,000건, 발신자/수신자 제한 — [Kakao 쿼터 문서](http://developers.kakao.com/docs/ko/getting-started/quota).

### Inferences
- 여행노트의 알림 유스케이스("출발 30분 전", "동행이 일정 수정")는 빈도가 낮고 긴급도가 높지 않다. Web Push(VAPID, Spring에서 `web-push` 계열 라이브러리 또는 직접 RFC 8030 구현)로 안드로이드 Chrome·데스크톱은 바로 커버되고, iOS는 "홈 화면에 추가" 안내 UX가 필요하다. 이 안내 UX 자체가 PWA 완성도를 보여주는 포트폴리오 요소다.
- FCM은 VAPID를 감싼 래퍼에 불과하고 Safari 안내가 없으므로, Firebase 의존을 추가하는 이익이 없다. 네이티브 앱을 낼 때만 FCM/APNs가 의미 있다.
- 알림톡은 건당 단가(약 10원)보다 "카카오톡 채널 개설 + 템플릿 사전 심사 + 딜러사 계약 + 수신자 전화번호 수집(비즈 앱 심사 필요)" 절차가 1인 B2C 서비스에 과하다. 동행 초대 같은 1:1 메시지는 카카오톡 공유(일 3만 건 무료)로 대체하는 것이 정당하다. 알림톡 도입은 이 규모에서 기믹으로 분류.
- Declarative Web Push를 지원하면 "서비스워커 없이도 iOS에서 알림이 표시된다"는 안정성 서사를 만들 수 있지만, Chrome/Android는 기존 방식이 필요하므로 두 포맷을 모두 보내는 추가 작업이 생긴다. 2차 우선순위.

### Gaps
- iOS 26/Safari 26 릴리스 노트에서 웹 푸시 관련 변경 유무를 직접 확인하지 못함.
- 카카오 공식 알림톡 단가표(카카오비즈니스)는 검색에서 나오지 않았고 모든 수치는 딜러사/플랫폼 문서 기준.
- FCM HTTP v1 전환 이후 2026년의 웹 푸시 브라우저 지원 매트릭스 페이지는 열지 않음.

---

## 5. 분석·프로덕트 도구: PostHog, Amplitude, GA4, Mixpanel, 세션 리플레이

### Takeaway
1인 B2C 프로젝트 규모에서는 PostHog Cloud 무료 티어(월 이벤트 약 100만, 세션 리플레이 5,000건, 피처 플래그 100만 요청, 제품별 독립 과금)가 세션 리플레이·플래그·분석을 한 번에 커버하고 EU 리전도 제공한다. Mixpanel 무료는 월 100만 이벤트, Amplitude 무료는 출처에 따라 MTU 1만/5만으로 상충, GA4는 무료·무제한이지만 제품 분석 깊이가 낮다. LLM 호출 관측은 Langfuse Hobby(월 5만 유닛 무료)로 분리하는 것이 깔끔하다.

### Cited Findings
- PostHog 무료: 월 100만 이벤트, 세션 리플레이 5,000건, 피처 플래그 100만 요청, 좌석 무제한; 제품별 독립 과금(한 제품 초과가 다른 제품 과금을 유발하지 않음); 리플레이 초과분 5k~15k 구간 $0.005/건; 이벤트 $0.000248/건, 익명 웹 이벤트 $0.00005/건; 셀프호스트 무료 — [toolradar](https://toolradar.com/tools/posthog/pricing), [ripples.sh](https://ripples.sh/blog/posthog-free-tier-real-cost), [costbench](https://costbench.com/software/product-analytics/posthog/) (모두 2차; 공식 페이지는 JS 렌더링으로 본문 추출 실패). TemperStack(2026-04)은 리플레이 1,000건으로 기재해 상충 — [temperstack](https://www.temperstack.com/plans/posthog/).
- Mixpanel 무료: 월 100만 이벤트, 좌석 무제한, 한도 도달 시 추적 일시정지 — [agentdeals](https://agentdeals.dev/analytics-free-tier-comparison-2026), [cut-the-saas](https://cut-the-saas.com/guides/amplitude-vs-mixpanel) (2차).
- Amplitude 무료: 출처별로 MTU 1만(이벤트 1,000만, 리플레이 1,000) 또는 MTU 5만(이벤트 1,000만), 초과 시 1.2x 과금 리스크 — [agentdeals](https://agentdeals.dev/amplitude-vs-mixpanel), [checkthat](https://checkthat.ai/brands/amplitude/pricing) (2차, 상충).
- GA4: 무료, 이벤트 무제한(고볼륨 쿼리 샘플링), 데이터 보존 14개월 — [agentdeals](https://agentdeals.dev/analytics-free-tier-comparison-2026) (2차).
- Langfuse Hobby 무료(월 5만 유닛), EU 리전 — [Langfuse pricing](https://langfuse.com/pricing).

### Inferences
- 세션 리플레이는 "여행 당일 체크 UX"처럼 모바일 브라우저 인터랙션이 핵심인 서비스에서 실제 개선 근거를 만들어 주므로 기믹이 아니다. 다만 메모·좌표·이메일 같은 개인정보가 리플레이에 녹화되지 않도록 마스킹 설정을 문서화해야 시니어 리뷰에서 감점이 없다.
- 1인 프로젝트에서 Amplitude/Mixpanel을 추가로 붙일 이유는 없고, PostHog 하나 + GA4(마케팅 유입 보조) 정도가 적정선이다. PostHog 셀프호스트는 운영 부담이 커서 Cloud 무료 티어가 맞다.
- 쿠키 동의·개인정보: 익명 이벤트 단가가 훨씬 낮고(2차), 로그인 전 사용자는 익명으로 두면 비용·규제 양쪽에서 유리하다.

### Gaps
- PostHog·Amplitude·Mixpanel·GA4 공식 요금 페이지를 직접 파싱하지 못해 모든 수치가 2차 집계이며 일부 상충(PostHog 리플레이 5,000 vs 1,000, Amplitude MTU 1만 vs 5만).
- 한국 개인정보보호법 관점의 세션 리플레이 동의 요건은 이번 조사 범위에서 다루지 않음.

---

## 6. 2025~2026 변경·폐기 플래그와 과잉설계 리스크 요약

### Takeaway
설계 문서에 반드시 반영할 변경점은 카카오맵 쿼터 정책(2026-07-21), 구글맵 과금 모델(2025-03-01), 카카오톡 공유 한시 단가(2026-02-02~12-31), Claude API의 프리필·`budget_tokens`·강제 tool_choice 제거, MCP 2026-07-28 stateless 개정, Spring AI 2.0의 Boot 4 요구, AI SDK 7의 Node 22/ESM 요구, Redis 8 AGPL이다. 과잉설계 후보는 CRDT 전면 도입, 동기화 엔진(Zero/Electric/PowerSync), 알림톡, 멀티 분석 도구, WebTransport다.

### Cited Findings
- 카카오맵 2026-07-21 정책 변경과 첫 앱 한정 무료 — [DevTalk 공지](https://devtalk.kakao.com/t/api-notice-on-new-kakao-map-api-features-and-free-quota-policy/150222).
- 구글맵 2025-03-01 $200 크레딧 폐지 — [Google March 2025](https://developers.google.com/maps/billing-and-pricing/march-2025).
- 카카오톡 공유 초과 단가 50원, 2026-02-02~12-31 한시 10원 — [Kakao 쿼터 문서](http://developers.kakao.com/docs/ko/getting-started/quota).
- Claude: `output_format` deprecated → `output_config.format`; 4.6+ 프리필 400; Opus 5.5/Sonnet 5.5 강제 tool_choice 400 — [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), Claude API 스킬(2026-10-06).
- MCP 2026-07-28: 세션·initialize·SSE 재개 제거, Roots/Sampling/Logging deprecated(12개월), DCR deprecated — [MCP changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog).
- Spring AI 2.0은 Boot 4.0/4.1·Framework 7 필수, SSE MCP 전송 deprecated — [Spring AI 2.0.0 GA](https://spring.io/blog/2026/06/12/spring-ai-2-0-0-GA-available-now/).
- AI SDK 7: Node >= 22 — [npm ai](https://registry.npmjs.org/ai/latest); ESM 전용 보도 — [Vercel changelog](https://vercel.com/changelog/page/21).
- Hocuspocus 4: Node 22+ — [Hocuspocus 4](https://tiptap.dev/blog/release-notes/hocuspocus-4-stable-release).
- Redis 8 AGPLv3 추가(2025-05-01) — [Redis blog](https://redis.io/blog/agplv3/).
- Zero 클라이언트 번들 718KB/232KB gz, SSR 미지원 — [InfoQ](https://infoq.com/news/2026/06/zero-version-1).
- Open-Meteo 무료 티어 비상업용 한정 — [Open-Meteo pricing](https://open-meteo.com/en/pricing).

### Inferences
- "신뢰할 수 있는 차별점"(시니어가 설계 근거를 물었을 때 답이 있는 것): 구조화 출력 기반 비정형→stops 정규화 + 결정론적 타당성 검사, 서버 권위 LWW + 버전 충돌 + fractional index + presence, 국가별 지도 공급자 어댑터(카카오/구글)와 쿼터 가드, PWA 홈 화면 설치 유도 + VAPID 웹 푸시, 카카오톡 공유 피드 템플릿.
- "조건부 차별점": Yjs memo 동시 편집(오프라인·장문 요구 시), 앱을 MCP 서버로 노출(기술 시연 가치), Declarative Web Push.
- "기믹/과잉설계"(이 규모에서): CRDT 전면 도입, Zero/Electric/PowerSync/TanStack DB 동기화 엔진, Liveblocks 유료 플랜, 알림톡, Amplitude+Mixpanel 병행, WebTransport, 자체 LLM 평가 플랫폼(Braintrust $249/월).

### Gaps
- Redis 외 "라이선스 변경" 사례(예: 다른 인프라 컴포넌트)는 이번 조사에서 추가 확인하지 않음.
- 카카오 JS SDK 1.x 지원 종료 일정, 네이버 지도 초과 단가, ODsay 단가, 일본 교통 API 단가, 국내 기술블로그 사례는 검색 한도 소진으로 미확인(섹션별 Gaps 참조).
