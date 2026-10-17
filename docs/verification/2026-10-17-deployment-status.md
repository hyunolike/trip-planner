# 실제 배포 현황 재확인

2026-10-17 11:06 UTC 기준 조회. 대상은 `hyunolike/trip-planner`와 기존 README의 공개 사이트다.
문서 수정 요청에 따라 읽기만 했으며 계정 생성, 키 설정, 배포, DNS 변경은 하지 않았다.

## 외부 기록과 응답

| 조회 | 확인한 사실 | 판단 범위 |
| --- | --- | --- |
| Vercel 프로젝트 목록과 기존 CLI project inspect | `trip-planner-web`, `prj_HYw5ODmtOB93vbGo2SzkOatyRrDz`, `hyunho-jangs-projects`, root `apps/web`, Next.js | 대상 프로젝트 일치 |
| 같은 프로젝트 CLI deployment list | 전체 2건, pagination.next=null. Preview Ready 1건, Production Canceled 1건 | 이 프로젝트에서 활성 Ready Production 기록 없음 |
| CLI deployment inspect | Preview ID `dpl_86gZucCn5cpnDwqrRFggfGyufywp`, target=preview, Ready | 배포 상태이지 API 정상 동작 증거는 아님 |
| Preview 화면 `/`와 읽기 경로 `/api/trips` GET | 둘 다 HTTP 302, Vercel Authentication 보호 응답 | 앱 화면·API 응답·현재 연결 상태 확인 불가 |
| 기존 Sites GET | HTTP 200, 제목 '오사카·교토 가족여행 2026 · 10.21–24' | 기존 페이지 접근만 확인. 새 API 연결 증거가 아님 |
| Render / Neon / Upstash | 현재 도구 목록에 제공자 계정 조회 도구 없음. 해당 CLI·표준 자격증명 환경변수·확인한 CLI 설정도 없음 | 배포 여부 미확인. 조회 불가를 미배포로 바꾸지 않음 |

Vercel 연결 도구는 프로젝트 검색에는 성공했지만 팀 단위 프로젝트/배포 읽기에 403을 반환했다.
도구가 안내한 같은 팀·프로젝트의 기존 CLI 읽기 경로로 확인했다. 재로그인·권한 변경은 하지 않았다.
설치된 CLI의 인증된 curl도 인증 보호 응답을 반환했다. 보호를 끄거나 우회 토큰을 새로 만들지 않았다.

확인한 Preview:
https://trip-planner-adkdt83ne-hyunho-jangs-projects.vercel.app

취소된 Production 기록:
https://trip-planner-i9zdcujrs-hyunho-jangs-projects.vercel.app

기존 별도 사이트:
https://osaka-kyoto-family-2026.hyunolike.chatgpt.site/

Preview 메타데이터의 소스 기준은 `bb1201eb8857cf66d5e3cbecf3e850ad93a31e38`이고
`sourceState=uncommitted-preview-safety`다. 현재 PR HEAD가 배포됐다고 해석하지 않는다.
취소된 Production 기록은 실행 중인 운영 배포가 아니다.

## 저장소 근거와 남은 확인

- `apps/web/next.config.ts`: `TRIPNOTE_UI_PREVIEW=1`이면 API rewrite 없음. 코드 분기의 존재는 현재 배포 환경변수의 증거가 아니다.
- `deploy/free/render.yaml`: 검토용 Blueprint, autoDeployTrigger=off. 파일 존재로 Render 리소스 생성을 추정하지 않는다.
- Free profile은 HTTPS 메일을 선택하지만 실제 제공자 어댑터가 없어 해당 구성 그대로는 시작할 수 없다.
- Docker 및 로컬 제약 시험은 실행 가능한 로컬 구성의 근거이며 운영 인벤토리가 아니다.
- Render API 주소와 배포 기록, Neon/Upstash 리소스 및 API와의 연결은 읽기 권한이 있는 기록이 필요하다.
- 보호된 Preview 앱 응답과 API 응답을 확인해야 현재 `TRIPNOTE_UI_PREVIEW` 모드와 웹→API 경로를 확정할 수 있다.
- 실제 연결·운영 검증은 [이슈 #7](https://github.com/hyunolike/trip-planner/issues/7)에서 추적한다.

## 그림 및 문서

한·영 배포 그림을 기존 Sites와 보호된 Preview의 현재 상태로 다시 생성했다.
공식 로고를 유지하고, 실선은 확인된 HTTP 경로만 표시했다.
Render/Neon/Upstash는 연결선 없는 '배포 여부 미확인' 목록이다.
[프롬프트](../architecture/3d-diagram-prompts.json)의 deployment-ko/en을 갱신했다.
기존 시스템 그림은 로컬 구현의 논리 흐름으로 유지하며 클라우드 배포 확인에 사용하지 않는다.

검증: 전체 PNG 네 장 각1672×941, signature/chunk CRC/IEND 통과. 문서 상대 파일 링크 54개와 alt 네 개, 한·영 상호 링크, 프롬프트 JSON 및 git diff --check 통과. 새 배포 그림 두 장은 텍스트·잘림·로고 식별·화살표·미확인 상태를 직접 검수했다. 앱 코드·배포 설정 변경은 없으며 서버 시작이나 로컬 전체 테스트 재실행은 하지 않았다. 최종 PR HEAD의 표준 CI 결과는 PR에서 확인한다.
