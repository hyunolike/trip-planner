# MVP Follow-up Implementation Plan

**Goal:** Fix PR #3's E2E regression, then finish the approved local MVP editing, offline queue, and read-only sharing flows.
**Spec:** `docs/superpowers/specs/2026-10-15-b2c-trip-planner-design.md`, roadmap plans 4 and 5.
**Architecture:** Keep Next.js and the Spring modular monolith. API responses remain generated OpenAPI types. Persist a user-scoped offline queue; pause on auth or version conflicts. Shared links grant read access only and can be revoked.
**Tech Stack:** Existing pinned Node 22 / pnpm 10 / React 19 / Next 16 / Kotlin / Java 25 / PostgreSQL / Valkey stack.

## Constraints and rulings

- Local code and tests only. No commits, push, PR mutations, merge, production deployment, paid services or credentials.
- Work in the isolated `codex/mvp-followup` worktree; leave the Claude checkout untouched.
- Preserve original samples and the legacy Vite app. Private is the default. Only owner manages visibility, deletion and share links; samples are immutable.
- Keep Korean copy, CSS Modules and design tokens, 44px targets, focus visibility and accessible dialog controls.
- Date shortening must never silently delete populated days; return a conflict instead.
- Share tokens: 32 random bytes, hashed at rest, revocable. Sharing never grants write access; do not turn a private trip public to share it.
- Proxy IP: trust explicitly configured proxy hops only. Never trust arbitrary forwarded headers.
- Existing specification approval and the user's explicit request to implement the remaining roadmap are the execution authority. No new product policies are introduced.

## Review focus

1. Another account must never replay a previous account's offline edits.
2. Lost responses must not duplicate newly created stops; conflicts must preserve drafts and stop dependent operations.
3. Anonymous access must stop immediately after share revocation; private trips remain absent from public listings.
4. Date edits must preserve existing stops, and stale versions must return 409.
5. Spoofed forwarded IP headers must not bypass rate limits on direct API access.

## Tasks

- [x] **1. Map regression.** Add a component regression and a ready-before-day-switch E2E. Observe failure with `pnpm test src/components/map/TripMap.test.tsx`, fit loaded maps to updated bounds, then run actual sample E2E on mobile and desktop.
- [x] **2. API editing and share foundation.** Test owner-only trip/day metadata edits, date preservation, travelers, completions, stop links/idempotency, token creation/read/revoke and cloning through a share grant. Implement Flyway changes and controllers/services using existing conventions. Regenerate OpenAPI. Verify `./gradlew check` and contract tests.
- [x] **3. Durable offline queue.** Test serial replay, reload recovery, network pause, no replay across users, conflict/auth pause, and idempotent stop creation. Implement `lib/edit/queue.ts` with a small storage/transport boundary and browser integration. Queues are keyed by user ID and trip ID.
- [x] **4. Web create/edit/share flows.** Test 3-step creation, stop CRUD, metadata editing, accessible reorder, auto-save, errors, offline recovery, shared anonymous reading, revocation, and cloning. Use the generated API schema, existing component patterns, native accessible dialogs and map coordinate selection. Add desktop two-column layout and OG metadata using existing assets.
- [x] **5. Proxy and documentation.** Test direct-client spoof rejection and configured trusted-hop resolution, forward web client IP safely, then update README with monorepo commands, capabilities, deployment requirements and honest limitations.
- [x] **6. Verify.** Root and token tests; web test, lint, typecheck, production build; API check/OpenAPI drift; actual API-backed Playwright flows at 375px/1280px. Report checks as passed, failed or not run. Review changed files and original checkout status.

## Interface agreements

- Existing `POST /trips`, stop create/update/delete/order and `GET /trips/{slug}` stay compatible.
- `CreateTripRequest.travelers`: optional list of `{label, emoji?}`. `CreateStopRequest.clientMutationId`: optional UUID; same ID/user/day returns the same stop. Stop requests accept safe `links` with label/url/note.
- `PATCH /trips/{id}`: version and optional title/startDate/endDate/visibility; `DELETE /trips/{id}?version=N`; `PATCH /days/{id}`: version (trip version), city/theme/note; return updated `TripDocument`.
- `GET /trips/{id}/completions`: stop IDs; `PUT/DELETE /trips/{id}/completions/stops/{stopId}` is idempotent and user-scoped.
- `GET/POST /trips/{id}/share-links`, `DELETE /trips/{id}/share-links/{linkId}`. Creation alone returns `{id, token}`; list never returns token/hash.
- `GET /share/{token}` returns read-only `TripDocument`; `POST /share/{token}/clone` creates private copy for the authenticated user. Invalid/revoked tokens return 404.
- Queue module owns generic durable serial operations; UI owns typed API dispatch and draft rendering.

## Progress

- Baseline: original checkout clean at `23f16a4`; PR #3 open, CI 28 E2E pass / 2 fail due to stale day-map bounds. Original Claude process left running.
- Map RED: added day-change regression; failed because `fitBounds` was never called.

- API final check: 152 tests, 21 suites, 0 failures/errors/skips. OpenAPI drift verified; jOOQ regeneration leaves generated files unchanged.
- Root 95 tests, both samples validated, design tokens 5 tests, web197 tests/typecheck/build pass. Lint exits0 with80 warnings and1info.
- Independent review found stale-tab queue overwrite and unversioned saved-draft overwrite. Both reproduced, fixed, and independently rechecked.
- Actual integration E2E added. Initial run: existing30 pass; new2 hit hidden retained Next route forms in hydration helper. Restrict helper to visible hydrated forms; rerun in progress.

- Final: web199 tests/typecheck/lint0errors/build pass. Actual production-build E2E32/32 pass after adding a readiness gate for completion controls; component RED→GREEN and hook transition tests cover the lost first click. Independent scoped re-review found no residual blockers. No commits, push, PR changes, merge or production deployment.

## 후속 통합 승인

사용자 요청으로 커밋·푸시·Draft PR 생성과 최종 커밋 CI/정책 통과 후 develop 병합을 진행한다. 기존 PR #3은 같은 여행노트 구현 범위로 diff를 확인한 뒤 선행 수정·검증·병합한다. 운영 배포·자격증명·권한 변경은 수행하지 않는다.
