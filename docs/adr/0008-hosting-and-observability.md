# 0008. 호스팅과 관측성: 컨테이너 1대와 OpenTelemetry

- 상태: 제안
- 날짜: 2026-10-16

## 맥락

운영자는 한 명이고 예산은 월 10만 원 이내다. 그래도 장애를 알아차리고, 원인을 찾고, 되돌릴 수 있어야 한다. 대기업 공고는 "빌드·테스트·배포 자동화"와 "모니터링 및 알림 구축"을 우대 사항으로 적는다. Vercel Hobby 요금제는 상업적 사용을 금지한다. AWS App Runner는 2026-04-30부터 신규 고객을 받지 않는다.

## 결정

- 프론트엔드는 Vercel Pro($20/월)에 배포한다. Speed Insights로 실제 사용자의 Web Vitals를 수집한다.
- API는 도쿄 리전 상시 컨테이너 한 대(Fly.io 1GB 기준 약 $9/월)에 Docker Compose로 띄운다. 배포는 blue/green이다. 새 컨테이너의 readiness 프로브가 통과하면 Caddy가 트래픽을 넘기고, 실패하면 이전 컨테이너를 그대로 둔다. 롤백은 스크립트 한 줄이다.
- DB는 Supabase 서울 Pro($25/월)다. 예상 총비용은 월 $55~75다.
- 이미지와 지도 타일은 Cloudflare R2에 둔다.
- 관측성은 `spring-boot-starter-opentelemetry`로 트레이스와 지표를 Grafana Cloud Free에 OTLP로 직접 보낸다. 로그는 ECS 형식 구조화 로그다. 오류는 프론트와 API 모두 Sentry Developer 요금제로 받는다.
- SLO는 세 개다. 일정표 조회 성공률 99.5%, 일정표 첫 화면 LCP p75 2.5초 이하, 스톱 저장 p95 500ms 이하. 에러 버짓을 다 쓰면 기능 작업을 멈추고 안정화한다.
- CI는 GitHub Actions다. 액션은 커밋 SHA로 고정하고 Renovate로 갱신한다. 클라우드 인증은 OIDC로 하고 장기 비밀키를 두지 않는다. 이미지는 Trivy로 검사하고 CycloneDX SBOM과 빌드 증명(Artifact Attestation)을 남긴다. 이미지 태그는 git SHA다.
- 인프라 리소스(DNS, R2 버킷, 컨테이너)는 OpenTofu로 관리한다.
- 부하 테스트는 k6로 일정표 조회와 스톱 저장을 측정하고 결과를 README에 둔다.

## 고려한 대안

| 대안 | 기각 이유 |
| --- | --- |
| Kubernetes | 컨테이너가 하나다. 롤링 배포와 readiness는 Compose와 Caddy로 충분하다. |
| Vercel 컨테이너 함수에 API 배치 | 5분 유휴 후 0으로 줄어 JVM 콜드 스타트가 반복된다. |
| Cloud Run 서울 | 서울은 가격 등급이 높은 리전이고, 최소 인스턴스 유휴 요금을 확인하지 못했다. |
| AWS App Runner | 신규 가입이 중단됐다. |
| Datadog | 호스트당 APM $31과 로그 요금이 1인 프로젝트 예산에 맞지 않는다. |
| OTel Collector 별도 운영 | 호스트 한 대에 관리 대상만 늘어난다. 직결로 시작한다. |

## 결과

- 좋은 점: 월 비용이 예측 가능하고, 배포 실패가 사용자에게 보이지 않는다. 장애가 나면 트레이스에서 느린 구간을 찾을 수 있다.
- 감수할 점: API 서버가 한 대라 호스트 장애 시 다운타임이 생긴다. 복구 절차를 런북으로 남기고, 실제 장애가 나면 포스트모템을 쓴다.

## 다시 볼 조건

- API 호스트가 두 대 이상이 되면 OTel Collector와 로드밸런서를 둔다.
- 월 비용이 $100을 넘으면 호스팅 조합을 다시 비교한다.
