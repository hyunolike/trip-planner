# Trip Planner

> 이전 작업 진행 중: 자동 승인 검토로 `src/data.js`와 이미지 3개가 아직 포함되지 않았습니다. 이 브랜치는 검토용이며 현재 상태로는 빌드할 수 없습니다. 기본 브랜치 반영은 보류했습니다.

오사카·교토 가족여행을 위한 모바일 중심 여행 일정 웹앱입니다.

**서비스:** https://osaka-kyoto-family-2026.hyunolike.chatgpt.site/

## 주요 기능

- 날짜별 일정, 방문 완료 체크와 지도 기반 이동 경로
- 숙소·관광지·맛집·쇼핑·공항 이용 안내 및 확대 지도
- 오사카·교토 날씨와 여행 D-day 카운트다운
- 모바일 반응형 화면, 홈 화면 설치, 공유 미리보기
- 캐릭터 모션과 도톤보리 사진 포인트 강조

## 로컬 실행

Node.js 22 이상과 pnpm을 사용합니다.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

## 빌드 및 테스트

```bash
pnpm test
pnpm build
pnpm exec vite preview
```

빌드 결과는 `dist/`에 생성됩니다. 정적 호스팅 시 이 디렉터리를 배포합니다.

## 프로젝트 구조

| 경로 | 내용 |
| --- | --- |
| `src/data.js` | 여행 일정과 장소 정보 |
| `src/render.js`, `src/main.js` | 화면과 상호작용 |
| `src/map.js` | Leaflet 지도와 이동 경로 재생 |
| `src/*-guides.js` | 교통·호텔·조식 등 이용 안내 |
| `src/weather.js` | Open-Meteo 예보 조회와 갱신 |
| `src/styles.css`, `src/theme.css` | 화면 스타일 |
| `public/` | 이미지·폰트·아이콘·설치 관련 파일 |
| `tests/` | Vitest 테스트 |
| `.openai/hosting.json` | 기존 Sites 프로젝트 배포 설정 |

## 데이터 및 운영 참고

- 날씨는 사이트를 열 때 조회하고, 화면을 보고 있는 동안 약 30분 간격으로 갱신합니다.
- 방문 완료 등 개인 상태는 브라우저에 저장됩니다.
- 이미지·폰트 등 외부 자료의 출처와 이용 조건은 각 화면·관련 크레딧을 참고하세요. 이 저장소가 외부 자료에 별도 재배포 권리를 부여하지는 않습니다.
- 이 저장소는 현재 Sites 소스의 스냅샷입니다. GitHub 커밋과 기존 Sites 서비스의 자동 동기화·자동 배포는 구성되어 있지 않습니다.

## 소스 기준

- Sites 프로젝트: `appgprj_6aaf9e359e7c8191acaf4c5b81e4e944`
- 원본 소스 커밋: `c7990fac3b0a4d3c2e7f37f19747e03ebe654f9a`
- 반영일: 2026-10-15

