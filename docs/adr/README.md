# 아키텍처 결정 기록

여행노트의 기술 선택과 그 이유를 남긴다. 각 문서는 맥락, 결정, 고려한 대안과 기각 이유, 결과, 다시 볼 조건을 담는다. 근거 자료는 `reports/여행노트 기술 스택 트렌드 2026.md`이고, 버전과 날짜는 2026-10-15 기준이다.

| 번호 | 제목 | 상태 |
| --- | --- | --- |
| [0001](0001-runtime-baseline.md) | 런타임 기준선: Spring Boot 4.1, Java 25, Kotlin 2.3, 가상 스레드 | 제안 |
| [0002](0002-modular-monolith-without-kafka.md) | Spring Modulith 모듈러 모놀리스, Kafka 없이 아웃박스 | 제안 |
| [0003](0003-jpa-and-jooq-instead-of-querydsl.md) | 쓰기는 JPA, 읽기는 jOOQ, QueryDSL은 쓰지 않음 | 제안 |
| [0004](0004-postgresql-postgis.md) | PostgreSQL 18과 PostGIS | 제안 |
| [0005](0005-bff-session-valkey.md) | BFF 세션 인증과 Valkey | 제안 |
| [0006](0006-nextjs-frontend-stack.md) | Next.js 16.4 프론트엔드와 API 계약 | 제안 |
| [0007](0007-maplibre-map-engine.md) | 지도 엔진 MapLibre와 Protomaps | 제안 |
| [0008](0008-hosting-and-observability.md) | 호스팅과 관측성: 컨테이너 1대와 OpenTelemetry | 제안 |

상태는 `제안 → 채택 → 대체됨` 순으로 바뀐다. 결정을 바꿀 때는 기존 문서를 고치지 않고 새 번호로 쓰고, 옛 문서의 상태를 `대체됨(000N)`으로 바꾼다.
