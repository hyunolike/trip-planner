# 여행노트 플랫폼·데이터·인프라 리서치 노트 (2026-10 기준)

대상 서비스: Next.js(Vercel) + Kotlin/Spring API + PostgreSQL + Redis + 오브젝트 스토리지, 1인 운영 B2C 여행 일정 서비스. 조사일 2026-10-15. 가격은 각 벤더 공식 페이지 캡처 기준이며, 2025~2026 사이 바뀐 항목은 명시했다.

조사 범위 제약: 세션의 웹 검색 한도가 소진되어 마지막 단계(국내 개인정보보호법의 소규모 사업자 의무·쿠키 동의, RDS/Cloud SQL/NCP 요금, Vercel Edge Config, Testcontainers/devcontainer)는 공식 문서를 직접 확인하지 못했다. 해당 항목은 각 섹션 Gaps에 적었다.

---

## 1. PostgreSQL 17/18/19 — 버전 선택과 핵심 기능

### Takeaway
2026년 10월 현재 PostgreSQL 18(2025-09-25 GA, 최신 마이너 18.6)이 프로덕션 기본 선택이고, 19는 Beta 4(2026-09-24)까지 나왔으나 GA는 아직이다. 18의 `uuidv7()`, 가상 생성 컬럼, 비동기 I/O, 스킵 스캔은 여행노트 스키마(정렬 가능한 PK, 좌표에서 파생되는 컬럼, 읽기 위주 트래픽)에 바로 쓸 수 있다.

### Cited Findings
- PostgreSQL 18은 2025-09-25 릴리스. 새 비동기 I/O(AIO) 서브시스템은 `io_method` 설정(`worker` / `io_uring` / `sync`)으로 선택하며, 순차 스캔·비트맵 힙 스캔·VACUUM에 적용되어 "스토리지 읽기에서 최대 3배" 성능 향상을 보였다 — [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- `uuidv7()` 함수가 추가되어 타임스탬프 순서의 UUID를 생성하고, `uuidv4()`는 `gen_random_uuid()`의 별칭이 됐다 — [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- 가상 생성 컬럼(virtual generated column)이 추가되어 쿼리 시점에 계산하며, 생성 컬럼의 기본값이 됐다. STORED 생성 컬럼은 논리 복제가 가능해졌다 — [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- 17 기준으로 작성한 DDL이 암묵적 STORED 동작에 의존했다면 18에서는 `STORED`를 명시해야 한다 — [Bytebase: What's new in Postgres 18](https://bytebase.com/blog/what-is-new-in-postgres-18)
- 시간 제약(temporal constraints): `PRIMARY KEY`/`UNIQUE`에 `WITHOUT OVERLAPS`, `FOREIGN KEY`에 `PERIOD` 절 지원 — [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- 다중 컬럼 B-tree 인덱스의 스킵 스캔, `OR` 조건의 인덱스 활용 개선, `RETURNING`에서 old/new 값 접근 — [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/); [Neon: PostgreSQL 18 new features](https://neon.com/postgresql/postgresql-18-new-features)
- 인증: `oauth` 인증 방식 추가, `md5` 비밀번호 인증은 deprecated("향후 릴리스에서 제거") — [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- `pg_upgrade`가 플래너 통계를 유지하고, `--swap` 옵션과 병렬 체크(`--jobs`)가 추가됐다. 새 클러스터는 페이지 체크섬이 기본 활성화 — [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- 와이어 프로토콜 3.2는 PostgreSQL 7.4(2003) 이후 첫 새 버전이며 libpq는 여전히 3.0이 기본 — [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- 쓰기 중심 OLTP에서는 AIO로 인한 급격한 변화는 없다는 DBA 관점 — [DEV: What's New in PostgreSQL 18 — a DBA's perspective](https://dev.to/bytebase/whats-new-in-postgresql-18-a-dbas-perspective-2bp6)
- 2026-08-13 마이너 릴리스: 18.6, 17.11, 16.15, 15.19, 14.24. PostgreSQL 14는 2026-11-12에 지원 종료 — [postgresql.org 홈](https://www.postgresql.org/)
- PostgreSQL 19 Beta 1은 2026-06-04 공개. 병렬 autovacuum 워커(`autovacuum_max_parallel_workers`), 새 autovacuum 우선순위 점수, `REPACK ... CONCURRENTLY` 명령이 포함됐고 "2026년 9월/10월경" GA 예정 — [PostgreSQL 19 Beta 1 Released](https://postgresql.org/about/news/postgresql-19-beta-1-released-3313/)
- 2026-10-15 기준 postgresql.org 최신 19 소식은 Beta 4(2026-09-24)이며 GA 공지는 없다 — [postgresql.org 홈](https://www.postgresql.org/)
- 2026-10-14 주변 생태계 보안 업데이트: PgBouncer 1.26.1(CVE 3건), psqlODBC 18.00.0005, PostgreSQL JDBC 42.7.14(2026-10-09, 다수 CVE) — [postgresql.org 홈](https://www.postgresql.org/)

### Inferences
- 여행노트 PK는 18의 `uuidv7()`으로 DB에서 생성하면 B-tree 지역성이 좋고 공유 링크 ID로도 추측 불가능하다. 다만 공개 URL 슬러그는 별도 랜덤 토큰을 쓰는 게 안전하다(uuidv7은 생성 시각이 노출된다).
- 가상 생성 컬럼은 `stops` 테이블의 좌표(lat/lng)에서 `geography` 값을 파생하거나, jsonb 가이드 블록에서 검색용 텍스트를 뽑는 데 적합하다. 인덱스를 걸어야 하면 STORED로 바꿔야 한다.
- 2026년 10월 시점에서 "18.6 + 19 GA 직후 업그레이드 계획"을 README에 적어두면 버전 추적을 하고 있다는 신호가 된다. JDBC 42.7.14 이상 고정은 보안 패치 추적의 증거로 쓸 수 있다.
- 면접에서 `md5` deprecated, 페이지 체크섬 기본 활성화, `pg_upgrade --swap`은 18을 실제로 써봤는지 가르는 디테일이다.

### Gaps
- PostgreSQL 18의 JSON 관련 변경 사항은 보도자료에 없었고 공식 release-18.html을 직접 읽지 못했다.
- PostgreSQL 19 GA가 2026-10-15 이후 며칠 내에 나올 가능성은 있으나 확인되지 않았다.

---

## 2. jsonb 설계, PostGIS, pgvector — 여행노트 데이터 모델 적합성

### Takeaway
가이드 블록은 jsonb + 필요한 키만 표현식 인덱스, 좌표는 PostGIS 3.6 `geography`로 두는 것이 2026년 표준이다. pgvector는 0.8.x(0.8.1이 PG18 지원)로 "미래의 장소 유사도" 확장 여지만 열어두면 된다.

### Cited Findings
- PostGIS 3.6.0은 2025년 9월 릴리스, PostgreSQL 12~18beta3, GEOS 3.8+, Proj 6.1+를 지원하며 전체 기능에는 GEOS 3.14+가 필요. 호환성 변경: `ST_TileEnvelope`가 타일 평면 범위로 클리핑, `geometry_columns` 뷰에서 제약 조건 검사 제거 — [PostGIS 3.6.0](https://www.postgis.net/2025/09/PostGIS-3.6.0/)
- PostGIS 3.6.1(2025-11)은 버그 수정 릴리스(geometry_columns 제약 파싱, ST_AsGeoJsonRow null 포인터) — [PostGIS 3.6.1](https://www.postgis.net/2025/11/PostGIS-3.6.1/)
- PostGIS 다운로드 페이지는 3.6.2를 2026-02-06 릴리스로 표시 — [PostGIS released versions](https://postgis.net/documentation/getting_started/install_windows/released_versions/)
- pgvector 0.8.0은 2024-11 공개(변경 로그 2024-10-30). 반복 인덱스 스캔(`hnsw.iterative_scan`, `ivfflat.iterative_scan`)으로 필터 후 결과가 부족한 "overfiltering" 문제를 해결하고, 필터 쿼리에서 플래너가 B-tree 등 다른 인덱스를 고르도록 비용 추정을 바꿨다. HNSW 스캔·삽입·디스크 빌드 성능 개선, PG12 지원 중단 — [pgvector 0.8.0 released](https://www.postgresql.org/about/news/pgvector-0.8.0-released-2952/); [Nile: pgvector 0.8.0](https://www.thenile.dev/blog/pgvector-080)
- pgvector 0.8.1은 PostgreSQL 18 RC1 지원과 `binary_quantize` 개선을 포함 — [SUSE PackageHub postgresql18-pgvector 0.8.1](https://packagehub.suse.com/packages/postgresql18-pgvector/0_8_1-160000_1_1)
- Amazon RDS for PostgreSQL은 2024-11-21부터 pgvector 0.8.0 지원 — [AWS What's New](https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-rds-for-postgresql-pgvector-080/)
- jsonb GIN 인덱스: 기본 `jsonb_ops`는 키 존재(`?`) 포함 넓은 연산자를, `jsonb_path_ops`는 `@>`, `@?`, `@@`만 지원하되 인덱스가 작고 포함 검색이 빠르다. `jsonb_path_ops` 인덱스에 `?` 쿼리를 날리면 인덱스를 못 타고 순차 스캔으로 떨어진다 — [StackHarbor: pg jsonb indexing GIN jsonpath](https://stackharbor.com/en/knowledge-base/pg-jsonb-indexing-gin-jsonpath/)
- 항상 한두 개 스칼라 키로 필터·정렬한다면 전체 GIN 대신 추출값에 B-tree 표현식 인덱스가 더 작고 범위·정렬까지 지원. 쿼리 식이 인덱스 식(캐스트 포함)과 정확히 일치해야 한다 — [SitePoint: PostgreSQL JSONB query performance & indexing](https://www.sitepoint.com/postgresql-jsonb-query-performance-indexing/)
- 자주 갱신·필터되는 jsonb 키는 접근 패턴이 안정되면 타입 컬럼으로 승격하라는 권고; JSON 타입은 관계형 모델링의 보완이지 대체가 아니다 — [pulse.support: PostgreSQL JSONB performance](https://pulse.support/kb/postgresql-jsonb-performance); [Galaxy: Limitations of JSON data types](https://www.getgalaxy.io/learn/glossary/limitations-of-json-data-types-in-postgresql)

### Inferences
- 여행노트 모델 제안: `trips`, `days`, `stops`(lat/lng + `geography(Point,4326)` 생성 컬럼 + GiST 인덱스), `routes`(`geography(LineString)`), `guide_blocks jsonb`(블록 타입별 스키마는 애플리케이션 레벨 검증). 거리 계산은 `ST_Distance(geography)`로 미터 단위 반환이 가능하다(PostGIS 일반 지식, 출처 미확인).
- jsonb 가이드 블록은 "구조가 자주 바뀌는 콘텐츠"라서 jsonb가 맞지만, 블록 타입·순서·공개 여부처럼 필터링하는 필드는 일반 컬럼으로 두고 jsonb에는 본문만 남기는 것이 면접에서 방어하기 쉬운 설계다.
- pgvector는 지금 당장 테이블에 넣지 말고 "장소 임베딩 테이블을 추가할 때 0.8.x 반복 스캔으로 필터+유사도 조합이 가능하다"는 설계 노트만 두는 편이 과잉 설계를 피한다.
- Neon/Supabase/RDS 모두 PostGIS와 pgvector를 지원하므로(일반 지식) 호스팅 선택이 이 결정을 막지 않는다.

### Gaps
- PostGIS 3.6의 공간 함수 성능 개선 수치나 3.6.2 변경 로그는 확인하지 못했다.
- `geography` vs `geometry` 거리 정확도 및 인덱스 전략에 대한 2025~2026 공식 문서를 직접 읽지 않았다.

---

## 3. 관리형 Postgres: Neon, Supabase, RDS/Aurora, Cloud SQL, NCP, 브랜칭

### Takeaway
한국 사용자 대상 서비스라면 Supabase(서울 리전, Pro $25/월, 브랜치 $0.01344/시간)와 Neon(싱가포르만, Launch $0.106/CU-시간, 브랜치 10개 무료)이 현실적인 두 선택지다. Neon은 2025-05 Databricks 인수 발표 이후에도 독립 요금제를 유지하고 있고 프리뷰 환경용 브랜칭은 Neon이 더 자연스럽다.

### Cited Findings
- Neon 요금(공식): Free $0, 프로젝트당 100 CU-시간, 자동 확장 최대 2 CU, 프로젝트당 1 GB(전체 20 GB), 브랜치 10개, 5분 후 scale-to-zero 고정. Launch는 최소 요금 없이 $0.106/CU-시간, 스토리지 $0.35/GB-월, 브랜치 10개 포함(추가 $1.50/브랜치-월), 최대 16 CU. Scale은 $0.222/CU-시간, 브랜치 25개, 고정 크기 최대 56 CU — [Neon Pricing](https://neon.com/pricing)
- Neon 공식 페이지는 자신을 "from Databricks"로 소개 — [Neon Pricing](https://neon.com/pricing)
- Databricks의 Neon 인수는 2025년 5월 발표, 약 $1B 규모, 당시 "규제 승인 등 종결 조건 대상" — [TechTarget](https://www.techtarget.com/searchdatamanagement/news/366623864/Databricks-adds-Postgres-database-with-1B-Neon-acquisition)
- Neon 리전: US East(버지니아·오하이오), US West(오리건), 프랑크푸르트, 런던, 싱가포르, 시드니, 상파울루. 아시아는 싱가포르만 — [Neon Regions](https://neon.com/docs/introduction/regions)
- Neon 커뮤니티에서 한국→싱가포르 RTT 약 200ms 보고, 서울·도쿄 리전은 출시일 미정 — [Neon Community: ETA on Northeast Asia regions](https://community.neon.tech/t/eta-on-northeast-asia-regions/541)
- Supabase 요금(공식): Free는 500 MB DB, 50,000 MAU, 5 GB egress, 1 GB 파일 스토리지, 공유 CPU/500 MB RAM, 1주 비활성 시 일시정지, 활성 프로젝트 2개 제한. Pro는 $25/월부터, 8 GB 디스크(초과 $0.125/GB), 100,000 MAU(초과 $0.00325/MAU), 250 GB egress(초과 $0.09/GB), 100 GB 스토리지, $10 컴퓨트 크레딧(Micro 1 GB RAM 1대), 브랜칭 $0.01344/브랜치-시간, 비활성 정지 없음, 지출 상한 기본 활성 — [Supabase Pricing](https://supabase.com/pricing)
- Supabase 리전에 Northeast Asia (Seoul) `ap-northeast-2`, Tokyo `ap-northeast-1`, Singapore `ap-southeast-1` 포함 — [Supabase Regions](https://supabase.com/docs/guides/platform/regions)
- 제3자 비교: Supabase는 상시 가동 전용 컴퓨트, Neon은 소비 기반·scale-to-zero라 버스트/개발 워크로드에 저렴 — [Bytebase: Neon vs Supabase](https://bytebase.com/blog/neon-vs-supabase)
- Neon은 "프리뷰 배포마다 일회용 DB 브랜치"를 만드는 워크플로를 내세운다 — [Kunal Ganglani: Neon vs Supabase 2026](https://www.kunalganglani.com/blog/neon-vs-supabase-2026.md)
- GCP Compute Engine 무료 티어: 미국 3개 리전(us-west1, us-central1, us-east1)에서 e2-micro 1대 상당(월 총 시간 기준), 30 GB 표준 디스크, 월 1 GB 북미발 egress. 외부 IP 요금은 무료 티어에서 청구되지 않음 — [GCP Free Tier: Compute getting started](https://cloud.google.com/free/docs/compute-getting-started)

### Inferences
- 여행노트의 사용자는 한국에 있고 API는 Spring(서울/도쿄 리전)에 둘 것이므로, DB까지 싱가포르(Neon)에 두면 API↔DB 왕복마다 수십 ms씩 더 붙는다. 프로덕션 DB는 Supabase 서울 또는 자체 운영 Postgres가 지연 측면에서 낫고, Neon은 "PR 프리뷰용 브랜치 DB"로만 쓰는 하이브리드도 가능하다(단 두 벤더 관리 비용 발생).
- Supabase를 "Postgres 호스팅"으로만 쓰고 Auth/Storage/Edge Functions는 안 쓰는 선택은 면접에서 "왜 BaaS를 골랐나"를 설명해야 한다. 서울 리전 + 브랜칭 + PITR 가능성 + 가격 상한을 근거로 설명하면 된다.
- Neon 무료 티어(100 CU-시간/프로젝트)는 개발·프리뷰용으로 충분하고 비용 0원이므로, PR별 브랜치 DB를 GitHub Actions로 생성·삭제하는 워크플로를 보여주면 "프리뷰 환경 자동화"라는 성숙도 신호가 된다.
- GCP e2-micro 무료 VM은 미국 리전 한정이라 한국 사용자 API 서버로는 지연이 커서 부적합하다. 이전 프로젝트의 "GCP VM + Vercel" 조합은 서울/도쿄 리전 유료 VM이었을 가능성이 높다.

### Gaps
- AWS RDS/Aurora(서울), GCP Cloud SQL, Naver Cloud Platform Cloud DB for PostgreSQL의 2026년 요금과 최소 인스턴스 비용은 검색 한도로 확인하지 못했다.
- Databricks-Neon 인수의 최종 종결일은 확인되지 않았다(발표 기준 2025-05).
- Supabase 브랜칭의 현재 GA 여부(검색 결과 상충: "네이티브 브랜칭 없음" vs "브랜칭 워크플로 있음")는 공식 요금표에 브랜치 시간당 요금이 있는 것으로 보아 제공 중으로 보이나 기능 범위는 미확인.

---

## 4. Redis 8 vs Valkey 9, 그리고 Redis가 필요 없는 경우

### Takeaway
Redis 8.0(2025-05-01)이 AGPLv3를 추가하며 다시 오픈소스가 됐고, Valkey는 9.0(2025-10-21)·9.1(2026-05-19)로 독자 노선을 굳혔다. 여행노트 규모에서는 날씨 캐시·레이트리밋·세션 정도라 Redis/Valkey 1대도 충분하지만, "Caffeine 로컬 캐시 + Postgres UNLOGGED"로 Redis를 아예 빼는 선택도 2026년에는 설명 가능한 설계다.

### Cited Findings
- Redis 8.0은 2025-05-01 릴리스, 기존 RSALv2·SSPLv1에 AGPLv3를 추가한 3중 라이선스 — [Phoronix](https://www.phoronix.com/news/Redis-8.0-Goes-AGPLv3); [InfoQ](https://www.infoq.com/news/2025/05/redis-agpl-license)
- Redis는 2024-03 BSD→SSPL 전환으로 Valkey 포크를 촉발했다 — [InfoQ](https://www.infoq.com/news/2025/05/redis-agpl-license)
- Dockerfile·Helm 차트·CI 파이프라인이 대거 Valkey로 옮겨갔고 일부 기여자는 여전히 Redis 라이선스 변경을 경계한다는 평 — [support.tools](https://support.tools/redis-open-source-again/)
- Redis 8.4 기능(Redis Software 릴리스 노트): 문자열 atomic compare-and-set, 스트림 idle-entry claiming, 하이브리드 검색, 비트·벡터 연산 SIMD 가속, JSON 메모리 사용량 감소 — [Redis Software 8.0.10-64 release notes](https://redis.io/docs/latest/operate/rs/release-notes/rs-8-0-releases/rs-8-0-10-64/)
- Redis Cloud 변경 로그: 8.2는 2025-11 Pro 제공, 8.4는 2026-01 Essentials·2026-03 Pro 제공, 8.6은 2026-05 Essentials·2026-07 Pro — [Redis Cloud changelog January 2026](https://redis.io/docs/latest/operate/rc/changelog/january-2026/)
- Valkey 9.0은 2025-10-21 발표("두 번째 메이저 릴리스"). 클러스터 모드의 번호 데이터베이스(namespacing), 해시 필드 단위 만료, Atomic Slot Migration, 클러스터 10억 RPS 스케일링 글 — [Valkey Blog](https://valkey.io/blog/)
- Valkey 9.1은 2026-05-19 발표, 80명 이상 기여, 데이터베이스 수준 ACL, 문자열 키당 메모리 오버헤드 최대 44% 절감(설정 변경 없이) — [Valkey Blog](https://valkey.io/blog/)
- Valkey 8.1 GA는 2025-04-02 — [Valkey Blog](https://valkey.io/blog/)
- Postgres를 캐시로 쓰는 패턴: UNLOGGED 테이블은 WAL을 건너뛰어 쓰기가 빨라지지만 크래시 시 비워지고 복제되지 않는다. 조회 지연은 한 자릿수 ms로 Redis(µs)보다 느리지만 웹 앱에서는 2ms와 5ms 차이가 보이지 않는다는 주장 — [Martin Heinz: PostgreSQL as a Cache](https://martinheinz.dev/blog/105); [Raphael De Lio: Can Postgres replace Redis as a cache?](https://dev.to/raphaeldelio/can-postgres-replace-redis-as-a-cache-2ne1)
- freeCodeCamp 벤치마크에서 UNLOGGED 테이블은 일반 테이블 대비 약 12~13% 처리량 향상에 그쳤다 — [freeCodeCamp: PostgreSQL as cache, queue, search](https://www.freecodecamp.org/news/how-to-use-postgresql-as-a-cache-queue-and-search-engine/)
- Redis 전용 자료구조(sorted set, HyperLogLog, stream)가 필요하면 전용 캐시가 맞다 — [bitdoze: What Postgres can replace (2026)](https://www.bitdoze.com/what-postgres-replaces/)

### Inferences
- 여행노트의 Redis 사용처는 (1) 날씨 API 응답 캐시(TTL 30분~1시간), (2) 레이트리밋 버킷, (3) OG 이미지·공유 페이지 렌더 캐시 정도다. 세 가지 모두 API 인스턴스가 1대일 때는 Caffeine(JVM 인프로세스)으로 충분하고, 2대 이상으로 늘릴 때만 외부 캐시가 필요하다. "인스턴스 1대 → Caffeine, 수평 확장 시 Valkey로 교체" 경로를 ADR로 남기는 것이 과잉 설계 없이 성숙도를 보여주는 방법이다.
- Spring Data Redis/Lettuce는 RESP 프로토콜 호환이라 Valkey에도 그대로 붙는다(일반 지식, 출처 미확인). 면접에서는 "Valkey 9를 쓴 이유 = 라이선스 중립 + Linux Foundation 거버넌스"가 설명 가능하다. 반대로 Redis 8 AGPL도 SaaS로 재배포하지 않는 1인 서비스에는 아무 제약이 없다.
- 날씨 캐시는 "도시×날짜" 키로 Postgres UNLOGGED 테이블에 두면 Redis 없이도 되고, 복제·백업 대상에서 자동으로 빠진다는 점을 설명할 수 있다.

### Gaps
- Redis 8.2/8.6/8.8의 공식 "What's new" 페이지는 확인하지 못했다(8.8 GA 2026-05-25는 패키지 미러 기준이라 미검증).
- Valkey 9.x의 Spring Data Redis 공식 호환성 명시 문서는 찾지 못했다.
- Caffeine 자체의 2025~2026 릴리스는 조사하지 않았다.

---

## 5. 호스팅: Vercel, Cloudflare, Fly.io, Railway, Cloud Run, App Runner/Fargate, GCP VM, NCP

### Takeaway
프론트는 Vercel Pro($20/월, $20 사용 크레딧 포함, Hobby는 상업 이용 금지), API는 "서울/도쿄 리전의 컨테이너 1대 + 헬스체크 기반 블루/그린"이 1인 운영에 가장 설명하기 쉬운 조합이다. Fly.io 도쿄 1 GB $8.76/월, Cloud Run 서울은 Tier 2 요금, AWS App Runner는 2026-04-30 이후 신규 가입 불가라 제외한다.

### Cited Findings
**Vercel**
- Fluid compute 요금(2026-06-16 갱신): Hobby는 Active CPU 4시간, Provisioned Memory 360 GB-시간, 호출 100만 건 포함. Pro는 온디맨드 과금(월 사용 크레딧으로 상쇄). 서울(icn1) Active CPU $0.169/시간, 메모리 $0.0140/GB-시간; 도쿄(hnd1) $0.202/$0.0167; 워싱턴(iad1) $0.128/$0.0106. Pro 호출 $0.60/100만 건 — [Vercel Fluid compute pricing](https://vercel.com/docs/fluid-compute/pricing)
- Active CPU는 코드 실행 중에만 과금, I/O 대기 중에는 메모리만 과금 — [Vercel Fluid compute pricing](https://vercel.com/docs/fluid-compute/pricing)
- 검색 스냅샷 간 상충: 한 버전은 Pro에 Active CPU 16시간·1440 GB-시간 포함으로, 다른 버전(2026-06-16)은 "N/A"로 표시 — [Vercel Fluid compute pricing](https://vercel.com/docs/fluid-compute/pricing); [Makerkit calculator](https://makerkit.dev/pricing-calculator/vercel)
- Pro 플랜: $20/월 플랫폼 요금 + $20 월 사용 크레딧 + 배포 시트 1개. 포함량 1 TB Fast Data Transfer, 1,000만 Edge Requests. 2025-09-09 이후 생성 팀은 자동으로 새 모델 — [Vercel Pro plan](https://vercel.com/docs/plans/pro); [Vercel blog: A more flexible Pro plan](https://vercel.com/blog/new-pro-pricing-plan)
- Hobby는 비상업·개인 용도 한정. "모든 상업적 사용은 Pro 또는 Enterprise 필요"이며 결제 수취, 광고(AdSense), 유료 제작 모두 상업 사용. 현재 버전은 "기부 요청은 상업 사용 아님"(구 미러는 반대) — [Vercel Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
- Speed Insights: Pro에서 프로젝트당 $10/월 유료 애드온; Hobby는 월 10,000 데이터 포인트·1개 프로젝트 포함 — [Vercel Pro switching](https://vercel.com/docs/plans/pro-plan/switching); [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- Vercel은 OCI 컨테이너 이미지를 Vercel Functions로 실행 가능(`Dockerfile.vercel`, 기본 포트 80, Vercel Container Registry에 저장). 프로덕션은 5분 무트래픽 시 축소, SIGTERM 후 30초 유예. Active CPU 요금 동일. Secure Compute·Static IP 미지원. 문서 2025-11-03 게시, 2026-09-07 갱신 — [Vercel KB: Docker deployments](https://vercel.com/kb/guide/does-vercel-support-docker-deployments)

**Cloudflare**
- Workers Free: 하루 100,000 요청, 호출당 CPU 10ms. Paid $5/월: 1,000만 요청 포함(초과 $0.30/100만), CPU 3,000만 ms 포함(초과 $0.02/100만 ms) — [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- R2: 무료 10 GB-월, Class A 100만·Class B 1,000만 회. 표준 스토리지 $0.015/GB-월, Class A $4.50/100만, Class B $0.36/100만, egress 무료 — [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- Next.js는 `@opennextjs/cloudflare`로 Workers에 배포하며 V8 isolate 런타임이라 일부 Node API가 없다 — [freeCodeCamp: Next.js on Cloudflare Workers with GitHub Actions](https://www.freecodecamp.org/news/how-to-deploy-a-full-stack-next-js-app-on-cloudflare-workers-with-github-actions-ci-cd/)

**Fly.io**
- shared-cpu-1x 월 요금: 256 MB $2.19(iad)/$2.78(sin)/$2.87(nrt), 512 MB $3.69/$4.69/$4.83, 1 GB $6.70/$8.50/$8.76. 볼륨 $0.15/GB-월. 아시아 egress $0.04/GB, 리전 간 사설망 $0.015/GB. Managed Postgres Basic $38/월부터 + $0.28/GB-월. 신규 조직 무료 티어 없음(체험 2시간 또는 7일). 2026-01-01부터 볼륨 스냅샷 $0.08/GB-월(월 10 GB 무료) 과금 시작 — [Fly.io Pricing](https://docs.fly.io/about/pricing)

**Railway / Render**
- Railway: Free(1 vCPU/0.5 GB 상한), Hobby $5 최소(=$5 크레딧), Pro $20 최소. 초 단위 과금 약 $20/vCPU-월, $10/GB-월. Hobby는 카드 등록 필요. 1 vCPU/1~2 GB 상시 가동 시 Fly $7~11 vs Railway $30~40 추정(제3자) — [costbench: Railway vs Fly.io 2026](https://costbench.com/compare/railway-vs-fly-io/); [findstack](https://findstack.com/resources/railway-vs-fly-io)

**Google Cloud Run**
- 요청 기반 무료 티어: 월 180,000 vCPU-초, 360,000 GiB-초, 200만 요청(us-central1 요금 기준). 인스턴스 기반 무료: 240,000 vCPU-초, 450,000 GiB-초 — [Cloud Run pricing](https://cloud.google.com/run/pricing)
- 서울(asia-northeast3)은 Tier 2 요금, 도쿄·오사카는 Tier 1 — [Cloud Run locations](https://docs.cloud.google.com/run/docs/locations)
- 제3자 요약 Tier 1 요청 기반 요율: $0.000024/vCPU-초, $0.0000025/GiB-초, $0.40/100만 요청 — [nOps: Cloud Run functions pricing](https://www.nops.io/blog/cloud-run-functions-pricing/)

**AWS**
- App Runner는 2026-04-30 이후 신규 고객을 받지 않으며 기존 고객은 계속 사용 가능. 신규 기능 추가 없음. 마이그레이션 경로로 Amazon ECS Express Mode(단일 API 호출로 Fargate 서비스+ALB+오토스케일링 프로비저닝, 추가 요금 없음)를 권고 — [AWS App Runner availability change](https://docs.aws.amazon.com/ja_jp/apprunner/latest/dg/apprunner-availability-change.html); [Encore: End of App Runner](https://encore.dev/articles/end-of-app-runner)
- Terraform AWS provider에 `aws_apprunner_*` 리소스 deprecate 이슈가 열려 있음 — [terraform-provider-aws #47161](https://github.com/hashicorp/terraform-provider-aws/issues/47161)
- App Runner 요율(미국 기준, 제3자): $0.064/vCPU-시간, $0.007/GB-시간, 1 vCPU/2 GB 50% 활성 시 약 $33.58/월 — [wring.co App Runner pricing guide](https://wring.co/blog/aws-app-runner-pricing-guide)
- Fargate 서울 리전 제공 — [AWS 한국 블로그](https://aws.amazon.com/ko/blogs/korea/aws-fargate-now-available-in-seoul-region)

**단일 서버 블루/그린(국내 자료)**
- 같은 서버에서 포트가 다른 Spring Boot 2개(예: 8081/8082)를 프로필로 구분하고, 새 버전을 띄워 정상 확인 후 `nginx reload`로 전환, 문제 시 이전 포트로 되돌리는 방식. "추가 EC2 없이 가장 저렴" — [velog: Nginx+Spring Boot 무중단 배포](https://velog.io/@mw310/NginxSpring-Boot-무중단-배포-구축하기); [velog: SpringBoot, Nginx 무중단 배포](https://velog.io/@eeheaven/SpringBootNginx-무중단-배포)
- 우아한형제들: 기능 플래그로 노출 비율을 점진적으로 늘리는 카나리 배포와 런타임 롤백을 수행 — [우아한형제들: 실험과 기능플래그를 위한 실험플랫폼 구축하기](https://techblog.woowahan.com/9935/)
- 우아한형제들 AI 서빙: Minor/Patch 변경은 Rolling Update로 무중단 자동 배포, 이미지 태그 변경 감지로 배포 — [우아한형제들: 안정적인 AI 서빙 시스템](https://techblog.woowahan.com/19548/)
- 토스페이먼츠: 동일 K8s 클러스터 4개를 AWS AZ와 IDC의 서로 다른 장애 격리 영역에 분산 배치 — [Toss Tech: 20년 레거시를 넘어](https://toss.tech/article/payments-legacy-1)

### Inferences
- 비용 밴드(1인 프로덕션, 월): Vercel Pro $20 + API 컨테이너(Fly nrt 1 GB $8.76 또는 GCP/NCP 소형 VM 1~2만 원대) + Supabase Pro $25 또는 Neon Launch 종량 + Cloudflare R2 무료~$1 + Grafana Cloud/Sentry 무료 = 대략 $55~75(약 7~10만 원). Vercel Hobby로 운영하는 "프로덕션"은 약관상 상업 이용 금지이므로, 광고·결제가 없더라도 포트폴리오로 공개 운영할 거면 Pro를 쓰는 편이 면접에서 깔끔하다.
- JVM(Spring Boot) API를 Vercel 컨테이너 함수로 올리는 것은 기술적으로는 가능하지만 5분 무트래픽 축소 → JVM 콜드 스타트(수 초) 문제가 있어 권장하지 않는다. 상시 가동 컨테이너(Fly/VM/Cloud Run min-instances=1)가 맞다.
- "GCP VM + Vercel"은 이전 프로젝트와 연속성이 있고 국내 면접관에게 익숙하다. 성숙도 신호는 플랫폼 이름이 아니라 (1) 이미지 태그 불변성(SHA 태그), (2) 헬스체크(`/actuator/health/readiness`) 기반 전환, (3) 롤백 절차 문서화, (4) 배포 1회가 GitHub Actions 한 번으로 끝나는 것이다. 단일 VM이라도 Docker Compose로 blue/green 컨테이너 두 개와 nginx/Caddy를 두고 스크립트로 전환하면 K8s 없이도 충분히 설명 가능하다.
- Cloud Run은 서울이 Tier 2라 도쿄보다 비싸고, JVM 콜드 스타트 때문에 `min-instances=1`을 켜야 해서 무료 티어의 의미가 줄어든다. 그래도 "컨테이너 → 리비전 → 트래픽 분할(카나리 %)"을 플랫폼이 제공하므로 카나리 배포 데모용으로는 가장 저렴한 선택지다(요율은 공식 페이지 재확인 필요).
- App Runner는 2026-04-30 이후 신규 가입 불가이므로 2026년 설계서에 넣으면 오히려 최신 동향을 모른다는 신호가 된다. AWS를 쓴다면 ECS Express Mode를 언급하는 편이 낫다.
- Cloudflare Workers(OpenNext) + R2는 egress 무료가 큰 장점이지만, Next.js 기능 호환(ISR, 이미지 최적화, Node API)을 본인이 책임져야 한다. "Vercel 1차, Cloudflare는 DNS/WAF/R2만" 구성이 1인 운영에서 가장 안정적이다.

### Gaps
- Cloud Run의 Tier 2(서울) 정확한 요율, min-instance 유휴 요금은 공식 페이지가 잘려 확인하지 못했다.
- Naver Cloud Platform의 2026년 서버 요금·무료 크레딧 조건은 공식 자료를 찾지 못했다(블로그는 "신규 가입 1년 무료 서버" 언급, 미검증).
- Render, Koyeb 요금은 조사하지 못했다.
- GCP 서울/도쿄 리전 소형 VM(e2-small/e2-medium)의 2026년 요금은 확인하지 못했다.

---

## 6. CI/CD와 공급망 보안: GitHub Actions, OIDC, Renovate, SLSA/Sigstore, Trivy

### Takeaway
2026년 기준 "SHA 고정 액션 + Renovate 자동 갱신 + OIDC로 클라우드 인증 + Trivy SBOM/스캔 + GitHub Artifact Attestations(Sigstore)"가 비용 0원으로 갖출 수 있는 공급망 보안 세트다. GitHub Actions는 2026-01-01 호스티드 러너 가격을 최대 39% 인하했고, 셀프호스티드 러너 과금($0.002/분)은 연기됐다.

### Cited Findings
- GitHub Actions 2026 요금: 호스티드 러너 가격 2026-01-01부터 머신 타입별 최대 39% 인하(약 40% 인하에 $0.002/분 플랫폼 요금이 포함된 결과). 셀프호스티드 러너 $0.002/분 과금(원래 2026-03-01 예정)은 "재검토를 위해 연기", 새 날짜 미정. 공개 저장소는 계속 무료. 96% 고객은 청구 변화 없음 — [GitHub: 2026 pricing changes for GitHub Actions](https://github.com/resources/insights/2026-pricing-changes-for-github-actions)
- 2025-12-15 GitHub 공지로 셀프호스티드 과금 연기; 그 이전 기사들은 원안($0.002/분, 3월 시행)을 그대로 보도하고 있어 주의 — [The Platform Engineering Substack](https://theplatformengineering.substack.com/p/github-actions-2026-pricing-changes); [IT Brief](https://itbrief.co.uk/story/github-cuts-actions-runner-prices-adds-new-usage-fee)
- OIDC: 잡마다 GitHub OIDC 프로바이더가 JWT를 발급하고 클라우드가 클레임을 검증해 단기 토큰을 반환. 장기 시크릿 복제 불필요, 토큰은 "단일 잡에서만 유효". AWS·Azure·GCP·HashiCorp Vault 지원. 신뢰 조건에 `sub`(예: `repo:org/repo:environment:prod`), `aud`, `repository`, `ref`, `environment`, `actor`, `workflow`, `job_workflow_ref`, `repo_property_*` 사용. 2026-07-15 이후 생성 저장소는 소유자·저장소 ID를 포함한 불변 `sub` 형식 사용 — [GitHub Docs: OpenID Connect](https://docs.github.com/en/actions/concepts/security/openid-connect)
- Artifact Attestations는 Sigstore 기반. 공개 저장소는 public-good 인스턴스와 투명성 로그에, 비공개 저장소는 GitHub 전용 Sigstore 인스턴스(투명성 로그 없음)에 기록 — [GitHub Docs: Artifact attestations](https://docs.github.com/ru/actions/concepts/security/artifact-attestations)
- 공개 저장소에서 attestation 생성이 옵트인에서 기본 동작으로 바뀌고 있다는 2026-02 분석 — [Tenki: GitHub Actions artifact attestations SLSA](https://tenki.cloud/blog/github-actions-artifact-attestations-slsa)
- attestation만으로는 가시성이 올라갈 뿐 보증이 아니며, 배포 시점 검증(Kyverno 등 admission control)이 필요 — [Nirmata (2026-03-16)](https://nirmata.com/2026/03/16/supply-chain-security-with-github-artifact-attestations-and-kyverno/)
- 실제 예: Trivy로 CycloneDX SBOM 생성 → attest 액션으로 GitHub attestation store와 OCI 레지스트리에 첨부, 액션은 전체 커밋 SHA로 고정 — [Verity compliance](https://verity.supply/compliance/)
- Sigstore 키리스 서명은 10분짜리 임시 인증서와 불변 투명성 로그를 사용 — [OneUptime: Sigstore supply chain security (2026-01-25)](https://oneuptime.com/blog/post/2026-01-25-sigstore-supply-chain-security/markdown)
- SLSA 목표는 대부분 조직에 Level 2~3이 권장되며, GitHub 호스티드 + 플랫폼 생성 provenance는 Level 3을 지향 — [devopsboys: Supply chain security guide 2026](https://devopsboys.com/blog/software-supply-chain-security-sbom-slsa-guide-2026)
- SHA 고정 이유: 태그 재지정 공격 방지, `tj-actions/changed-files` 침해가 계기 — [Zenn: Renovateで第三者Actionをピン留め](https://zenn.dev/tasshi/articles/renovate-pin-third-party-actions)
- Renovate `helpers:pinGitHubActionDigests` 프리셋으로 다이제스트 자동 고정·갱신. 버전 주석 없는 bare SHA는 기본 비활성(브랜치/태그 판별 불가) — [Renovate Docs: GitHub Actions manager](https://docs.renovatebot.com/modules/manager/github-actions)
- Renovate는 90개 이상 패키지 매니저와 GitHub·GitLab·Bitbucket·Azure DevOps·Gitea 지원, Dependabot은 GitHub 전용 30여 개 — [turbostarter: Renovate vs Dependabot](https://www.turbostarter.dev/blog/renovate-vs-dependabot-whats-the-best-tool-to-automate-your-dependency-updates)
- 2026년 전환 사례는 패치 업데이트 그룹핑(단일 PR)이 주요 이유 — [tianpan.co forum](https://tianpan.co/forum/t/renovate-vs-dependabot-in-2026-we-switched-and-heres-why-renovate-won/611)
- GitLab은 2025-05 라이선스 문제로 Terraform CI/CD 템플릿을 deprecate — [jorijn: OpenTofu vs Terraform 2026](https://jorijn.com/en/blog/opentofu-vs-terraform-2026-the-fork-finally-diverged/)

### Inferences
- 여행노트 CI 파이프라인(권장): PR → Gradle 테스트(Testcontainers Postgres) + `next build` → Trivy fs/config 스캔 → main 머지 시 Docker 이미지 빌드(`ghcr.io`, 태그 = git SHA) → `actions/attest-build-provenance` + SBOM → OIDC로 GCP/AWS 인증 → 배포 스크립트. 시크릿은 GitHub Environments(`production`)에 두고 OIDC `sub`에 `environment:production` 조건을 건다.
- 면접 신호: "GitHub Secrets에 클라우드 키를 넣지 않았다(OIDC)", "모든 액션이 SHA 고정이고 Renovate가 갱신한다", "이미지에 provenance attestation이 붙어 있어 `gh attestation verify`로 검증 가능하다". 세 문장이면 공급망 보안을 이해한다는 인상을 준다.
- 공개 저장소면 Actions 무료 + public-good Sigstore 투명성 로그 기록이라 비용 0. 비공개면 월 2,000분 무료 범위를 넘기 어렵다(1인 프로젝트).
- release-please/semantic-release는 조사하지 못했으나, 1인 프로젝트에서는 Conventional Commits + release-please로 CHANGELOG·태그를 자동화하는 것이 과하지 않다(일반 지식).

### Gaps
- GitHub Actions 비공개 저장소 무료 분수(2,000분/월)와 캐시 용량 한도의 2026년 수치는 공식 문서를 재확인하지 못했다.
- release-please vs semantic-release 2026 동향, GitHub reusable workflows 모범 사례는 조사하지 못했다.
- Trivy 최신 버전과 Gradle 플러그인(SBOM 생성) 상태는 확인하지 않았다.

---

## 7. 관측성: OpenTelemetry, Grafana Cloud, Sentry, Datadog, SLO, RUM

### Takeaway
Spring Boot 4(현재 4.1.1)는 `spring-boot-starter-opentelemetry`로 OTLP 트레이스·메트릭을 네이티브 내보내고, OTel Java agent는 2.32.0(2026-10-03)이다. Grafana Cloud Free(10k 시리즈, 로그·트레이스·프로파일 각 50 GB, 14일 보관, k6 500 VUh, 프론트엔드 5만 세션)와 Sentry Developer(5k 에러, 5M span, 50 리플레이)를 합치면 1인 프로젝트는 관측성 비용이 0원이다.

### Cited Findings
- Grafana Cloud Free(영구 무료): 메트릭 10k 활성 시리즈, 로그 50 GB, 트레이스 50 GB, 프로파일 50 GB(각 14일 보관), k6 500 가상 사용자 시간, Synthetics API 10만·브라우저 1만 회, Frontend Observability 5만 세션, Grafana/IRM/AI 각 3명. Pro는 $19/월 + 사용량, 메트릭 13개월·로그 등 30일 보관, 초과 메트릭 $6.50/1k 시리즈, 로그·트레이스 $0.05/GB 처리 + $0.40/GB 기록 + $0.10/GB 보관, 프론트엔드 $0.75/1k 세션, k6 $0.15/VUh — [Grafana Cloud Pricing](https://grafana.com/pricing/)
- Sentry Developer(무료, 1명): 에러 5k, 로그 5 GB, 메트릭 5 GB, 트레이싱 5M span, 세션 리플레이 50, 업타임 모니터 1, 크론 모니터 1, 메트릭 모니터 20, 대시보드 10, 첨부 1 GB, 30일 조회. MCP 접근 포함, Seer 미포함. Team $26/월: 무제한 사용자, 에러 50k, 로그 5 GB(+$0.50/GB), 90일 조회, Seer는 별도 구독 — [Sentry Pricing](https://sentry.io/pricing/)
- Spring Boot 4의 `spring-boot-starter-opentelemetry`는 OTel API, Micrometer tracing 브리지, 메트릭·트레이스 OTLP exporter를 묶으며 설정은 `otel.*`이 아니라 `management.*` 접두사. 커뮤니티 OTel starter와 혼용 불가 — [Dan Vega: OpenTelemetry with Spring Boot 4](https://www.danvega.dev/blog/opentelemetry-spring-boot); [NLJUG: Spring Boot 4 OpenTelemetry guide](https://nljug.org/?p=10928)
- OTel Java agent는 코드 변경 없이 모든 Spring Boot 버전에서 동작하고, 커뮤니티 starter는 GraalVM 네이티브 이미지에 적합 — [Uptrace: OpenTelemetry Spring Boot](https://uptrace.dev/blog/opentelemetry-spring-boot.html)
- spring.io 프로젝트 페이지 헤더의 현재 Spring Boot 버전은 4.1.1 — [spring.io/projects/spring-boot](https://spring.io/projects/spring-boot)
- opentelemetry-java-instrumentation 최신 2.32.0(10-03, SDK 1.66.0), 2.31.1(08-23), 2.31.0(08-20), 2.30.0(07-22, SDK 1.64.0) — [GitHub Releases](https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases)
- OTel Collector 1.49.0 / 0.143.0이 2026-01-05~06 릴리스(core는 1.x 트랙) — [FusionReactor: Collector v1.49.0/v0.143.0](https://fusion-reactor.com/blog/opentelemetry-collector-v1-49-0-v0-143-0-whats-new-in-january-2026/)
- Grafana Labs 2025 관측성 설문: OTel 프로덕션 사용률 41%(Prometheus보다 낮음), 38%가 도입 검토 중, 6%만 계획 없음. 벤더 중립성·유연성이 최우선 요건 — [BusinessWire: Grafana Labs 2025 Observability Survey](https://businesswire.com/news/home/20250325540050/en/Grafana-Labs-Unveils-2025-Observability-Survey-Findings-and-Open-Source-Updates-at-KubeCon-Europe)
- Datadog: Free는 최대 5 호스트. Infrastructure Pro 약 $15/호스트/월, Enterprise $23. APM $31/호스트/월(연간), 호스트당 150 GB 수집 span·100만 인덱스 span(15일), 초과 $1.70/100만. 로그 수집 $0.10/GB. 상위 1% 제외 시간별 호스트 수 최대치로 월 과금(high-water mark). 실제 청구가 초기 추정의 2~3배 되는 경우가 흔함 — [DoiT: Datadog pricing explained](https://www.doit.com/blog/datadog-pricing-explained); [Motadata: Datadog pricing](https://www.motadata.com/blog/datadog-pricing)
- 토스페이먼츠: "장애 대응의 시작은 감지"라는 전제로 Zabbix·Prometheus·Mimir로 메트릭 수집, Grafana 시각화·알람, 여러 센터 Active-Active — [Toss Tech: 레거시 인프라 작살내고 하이브리드 클라우드 만든 썰](https://toss.tech/article/payments-legacy-9)
- 토스 최다 트래픽 서비스의 서버 관리 전략(모니터링 기반) — [Toss Tech: 가장 많은 트래픽을 받는 토스 서비스의 서버 관리 전략](https://toss.tech/article/monitoring-traffic)
- 토스 해외주식 안정화: Grafana·Kibana 규칙으로 브로커 상태(정상/주의/중단) 판정 → Kafka 이벤트로 전파해 각 시스템이 자율 대응 — [Toss Tech: 해외주식 서비스 안정화](https://toss.tech/article/28738)
- 토스증권 실시간 파이프라인: 파이프라인별 SLA(지연 최소화, 무중단, 유실·중복 최소화) 준수 모니터링 — [Toss Tech: Visualize Lineage](https://toss.tech/article/toss-securities-visualize-lineage)
- k6 2.1.0이 2026-06-30 안정 릴리스, AGPL-3, Grafana Labs 개발 — [Wikipedia: K6](https://en.wikipedia.org/wiki/K6_(software))
- Grafana Cloud k6는 테스트별 k6 메이저 버전 선택 가능, 신규 테스트 기본 v1.x — [Grafana What's new 2026-07-02](https://grafana.com/whats-new/2026-07-02-choose-your-k6-runtime-version-when-you-create-tests-in-grafana-cloud-k6/)

### Inferences
- 권장 구성: Spring Boot 4.1 + `spring-boot-starter-opentelemetry`(OTLP → Grafana Cloud OTLP 엔드포인트 직결, Collector 생략) + Next.js는 Sentry(에러·리플레이) + Vercel Speed Insights(Hobby 1만 포인트/월 무료 또는 web-vitals 라이브러리 → Grafana Faro 5만 세션). Collector는 호스트가 1대일 때 운영 부담만 늘리므로, "Collector를 안 둔 이유"를 ADR로 적는 편이 오히려 성숙한 판단으로 읽힌다.
- SLO 예시(서비스 규모에 맞춘 것): 공유 페이지 가용성 99.5%/30일(허용 다운 약 3.6시간), API p95 < 400ms, OG 이미지 생성 성공률 99%. 에러 버짓 소진 시 "기능 배포 중단, 안정화 작업"이라는 규칙을 README에 적으면 국내 대기업 면접의 SRE 질문에 바로 답할 수 있다. 토스 블로그가 SLA 모니터링·상태 판정 규칙을 설명하는 방식과 같은 어휘를 쓰는 것이 유리하다.
- Datadog은 무료 5호스트로 가능하지만 APM·로그가 유료로 번지기 쉽고, 1인 프로젝트에서 Datadog을 고르면 "비용 감각"을 의심받을 수 있다. Grafana LGTM 스택 + OTel이 국내 대기업(토스페이먼츠 사례)과 겹치는 어휘라 면접 친화적이다.
- OTel Java agent(2.32.0)는 재배포 없이 `-javaagent`로 붙일 수 있어 롤백이 쉽지만, Spring Boot 4 네이티브 starter를 쓰면 Micrometer Observation API로 커스텀 span/metric을 코드에서 만들 수 있어 "직접 계측했다"는 근거가 남는다.

### Gaps
- Spring Boot 4.x/3.5.x의 공식 지원 종료일과 Java 베이스라인(17 vs 21)은 페이지가 잘려 확인하지 못했다.
- Sentry의 OpenTelemetry 네이티브 지원 범위, Vercel Speed Insights와 Grafana Faro의 비교는 조사하지 못했다.
- Gatling 2025~2026 동향, OTel Collector 1.0 GA 시점은 확인하지 못했다.
- 우아한형제들·네이버 D2의 OpenTelemetry 도입 글은 검색으로 찾지 못했다.

---

## 8. IaC와 로컬 개발: Terraform vs OpenTofu vs Pulumi, Docker Compose, devcontainer

### Takeaway
OpenTofu(MPL 2.0, CNCF 2025-04 가입, 1.10은 2025-06-23·1.11은 2025-12, 상태 암호화·OCI 레지스트리·OTel 트레이싱·ephemeral 리소스)가 1인 프로젝트에서 라이선스 걱정 없이 쓸 수 있는 기본값이다. 2026년 기준 Terraform을 쓰면 BSL이 질문거리가 되고, OpenTofu를 쓰면 "왜"를 한 줄로 답할 수 있다.

### Cited Findings
- Terraform 1.6+는 BSL 1.1(OSI 미승인), OpenTofu는 MPL 2.0. OpenTofu는 2025-04 CNCF 가입. 대부분 구성은 바이너리 교체만으로 전환 가능하며 Terraform Cloud·HCP Stacks 의존 시 마찰 — [jorijn: OpenTofu vs Terraform 2026](https://jorijn.com/en/blog/opentofu-vs-terraform-2026-the-fork-finally-diverged/); [encore: OpenTofu vs Terraform 2026](https://encore.dev/articles/opentofu-vs-terraform-2026)
- OpenTofu 1.9+는 내장 상태 암호화(AES-GCM), Terraform 1.9+는 없음. 2026-06 기준 OpenTofu 프로바이더 3,900+·모듈 23,600+ — [OneUptime: OpenTofu vs Terraform feature parity (2026-03-20)](https://oneuptime.com/blog/post/2026-03-20-opentofu-vs-terraform-feature-parity/markdown)
- OpenTofu 1.10.0(2025-06-23): OCI 레지스트리 프로바이더 배포, 네이티브 S3 상태 잠금(DynamoDB 불필요), OpenTelemetry 트레이싱, 모듈 deprecation — [releasebot: OpenTofu release notes](https://releasebot.io/updates/opentofu)
- OpenTofu 1.11(2025-12): ephemeral 리소스·write-only 속성(plan/state에 기록 안 됨), `enabled` 메타 인자, 모듈 deprecation 안정화, S3 백엔드 태깅 — [Linuxiac: OpenTofu 1.11](https://linuxiac.com/opentofu-1-11-introduces-ephemerality-for-safer-temporary-credentials/); [OpenTofu Docs](https://opentofu.org/docs/main/)
- 2026-04-08 기준 OpenTofu 1.11.6 안정, 1.12.0-rc1 파이프라인 — [env.dev OpenTofu guide](https://env.dev/guides/opentofu)
- Fidelity가 5만 개 이상 state 파일을 OpenTofu로 이전; "IaC 실무자 과반이 OpenTofu 사용"이라는 2026-06 기사는 수치·설문 출처 없음 — [cloudmagazin (2026-06-05)](https://www.cloudmagazin.com/en/2026/06/05/opentofu-vs-terraform-which-iac-tool-really-delivers/); [jorijn](https://jorijn.com/en/blog/opentofu-vs-terraform-2026-the-fork-finally-diverged/)
- Pulumi CLI/SDK는 Apache 2.0, 단일 상업 회사. 개인 무료(배포 500분/월) 언급; 유료가는 출처별 상이 — [encore: Pulumi vs OpenTofu](https://encore.dev/articles/pulumi-vs-opentofu); [OneUptime: OpenTofu vs Pulumi (2026-03-20)](https://oneuptime.com/blog/post/2026-03-20-opentofu-vs-pulumi-choice/markdown)
- SOPS+age 패턴: 암호화된 시크릿을 저장소에 커밋하고 CI 전용 age 키를 GitHub secret에 보관, dev/prod 파일 분리·수신자 분리, 키 분실 시 복구 불가라 오프라인 백업 키 권장, 협력자 제거 후에도 git 이력의 옛 blob은 복호화 가능하므로 원천 자격증명 회전 필요 — [Protea ADR-D28: Secrets management](https://protea.readthedocs.io/en/stable/adr/D28-secrets-management.html); [Protea runbook](https://protea.readthedocs.io/en/stable/runbooks/secrets-management.html)

### Inferences
- 1인 프로젝트에 IaC가 필요한 범위는 DNS(Cloudflare), 오브젝트 스토리지 버킷(R2), VM/컨테이너 서비스 1개, 시크릿 1묶음 정도다. OpenTofu 1.11 + 원격 state(R2 또는 S3 호환) + 상태 암호화 조합이면 "인프라가 코드로 재현된다"는 것을 20줄 안에 보여줄 수 있다. Vercel·Supabase도 Terraform 프로바이더가 있으나(일반 지식) 환경변수 관리가 복잡해지므로 범위를 선택해서 적용하는 편이 낫다.
- 시크릿: 프로덕션 시크릿은 클라우드 시크릿 매니저보다 GitHub Environments + SOPS/age(저장소 내 암호화)가 1인 운영에서 추적 가능성과 비용 모두 유리하다. Doppler는 조사하지 못했다.
- 로컬 개발은 Docker Compose(Postgres 18 + PostGIS, Valkey, 선택적으로 Grafana LGTM 단일 컨테이너) + Testcontainers 기반 통합 테스트가 국내 백엔드 면접에서 자주 묻는 "테스트 환경 재현성"의 답이다(이 문장은 일반 지식이며 출처 미확인).

### Gaps
- OpenTofu 1.12 GA 여부(2026-10 기준)는 확인하지 못했다.
- Pulumi Cloud 2026 요금, Terraform 1.13/1.14 기능, devcontainer·Testcontainers 2026 동향은 검색하지 못했다.
- Doppler 요금·무료 티어는 확인하지 못했다.

---

## 9. 이미지와 OG: Vercel Image Optimization, Cloudflare Images/R2, Satori/ImageResponse, AVIF/WebP

### Takeaway
Vercel은 2025-02-18 이후 이미지 과금을 "소스 이미지 수"에서 "변환 횟수(transformation) + 캐시 읽기/쓰기"로 바꿨고(Hobby 5K 변환/월, 초과 $0.05~0.0812/1K), Cloudflare Images는 월 5,000 고유 변환 무료·초과 $0.50/1K에 R2 egress 무료다. 여행노트처럼 사용자 업로드 이미지가 쌓이는 서비스는 R2(저장) + Cloudflare Images 변환 또는 `next/image`에 `loader`를 붙이는 구성이 비용 폭주를 막는다. OG 이미지는 `next/og` ImageResponse(번들 500KB 제한, flexbox만 지원, ttf/otf 권장)로 충분하다.

### Cited Findings
- Vercel Image Optimization 현행 요금: Image transformations Hobby 5K/월 포함, 초과 $0.05~$0.0812/1K; 캐시 읽기 300K 포함, 초과 $0.40~0.64/100만; 캐시 쓰기 100K 포함, 초과 $4.00~6.40/100만. 변환은 캐시 MISS/STALE마다 과금. 2025-02-18 이전 생성 팀은 레거시(소스 이미지 1,000장당 $5) 유지 가능 — [Vercel: Image Optimization limits and pricing](https://vercel.com/docs/concepts/image-optimization/limits-and-pricing); [Vercel: Legacy pricing](https://examples.vercel.com/docs/image-optimization/legacy-pricing)
- Cloudflare Images: Free는 월 5,000 고유 변환, 초과 시 과금 대신 새 변환은 오류 9422(캐시된 것은 계속 동작). Paid는 5,000 변환 포함 후 $0.50/1K, 저장 $5/10만 장, 전송 $1/10만 장(HTTP 200·1,024바이트 초과만). 같은 변환의 반복 요청은 달력 월 기준 1회 과금. R2 등 외부 저장 이미지를 변환하면 "Images Transformed"만 과금 — [Cloudflare Images pricing](https://developers.cloudflare.com/images/pricing/)
- R2 요금은 5장 참조(무료 10 GB, egress 무료) — [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- `ImageResponse`(next/og): 기본 1200×630, `fonts`(name/data/weight/style), emoji 옵션. @vercel/og + Satori + Resvg로 PNG 생성. flexbox와 CSS 일부만 지원(grid 불가). JSX·CSS·폰트·이미지 포함 번들 최대 500KB, 초과 시 자산 축소 또는 런타임 fetch. 폰트는 ttf/otf/woff만, 파싱 속도는 ttf/otf 우선. `opengraph-image.tsx` 파일 규약으로 빌드 시 또는 요청 시 생성. v14.0.0에서 `next/server`→`next/og` 이동 — [Next.js Docs: ImageResponse (2026-08-06 갱신)](https://nextjs.org/docs/app/api-reference/functions/image-response)
- 시스템 폰트 사용 불가, 폰트는 번들 또는 CDN fetch; @vercel/og는 Node·Edge 런타임 모두 지원; Next.js 프로젝트에서는 next/og 우선 — [Makerkit: Dynamic OG images with Next.js 16](https://makerkit.dev/blog/md/tutorials/dynamic-og-image)

### Inferences
- 여행노트 공유 링크 OG: 여행 제목·일정·대표 스톱 3개를 ImageResponse로 그리고, 한글 폰트(Pretendard 서브셋)를 500KB 한도 안에 넣어야 하므로 서브셋 ttf를 `assets/`에 두고 모듈 스코프에서 1회 읽는 패턴이 맞다. 결과를 R2 또는 Vercel 캐시(`Cache-Control: public, s-maxage`)로 캐시하면 변환 비용이 공유 1건당 1회로 끝난다.
- 사용자 업로드 이미지는 브라우저에서 R2 presigned URL로 직접 업로드 → Spring API는 메타데이터만 저장 → 표시는 Cloudflare Images 변환 URL(또는 next/image의 커스텀 loader). 이렇게 하면 Vercel 변환 과금(캐시 MISS마다)과 egress를 모두 피하고, "이미지 파이프라인에서 Vercel 402/과금 폭주를 설계로 막았다"는 서사가 생긴다.
- AVIF/WebP: Vercel과 Cloudflare 변환 모두 `Accept` 헤더 기반 포맷 협상을 지원한다(일반 지식, 이번 조사에서 공식 문서 미확인). 직접 변환을 한다면 imgproxy를 API 옆 컨테이너로 두는 선택지도 있으나 1인 운영에서는 관리 부담이 늘어난다.

### Gaps
- Vercel 이미지 최적화에서 보고되는 402 오류(사용량 초과)의 2025~2026 사례는 직접 확인하지 못했다.
- imgproxy, Cloudinary의 2026 요금과 AVIF 기본 지원 여부는 조사하지 못했다.
- Cloudflare Images의 "Polish"나 Workers 기반 변환(`cf.image`) 세부 요금은 보지 못했다.

---

## 10. 보안·개인정보: 개인정보보호법, 소셜 로그인, 레이트리밋, 봇 방어, 시크릿, CSP

### Takeaway
개인정보보호위원회는 2025-04-21 개인정보 처리방침 작성지침 개정본을 공개했고(법령 필수사항과 권장사항 구분, 계약 이행 목적은 동의 없이 처리 가능), 2025-02-13에는 네이버·카카오·구글·메타·애플 소셜 로그인 점검 결과를 발표하며 탈퇴 시 토큰 폐기가 거의 쓰이지 않는 문제를 지적했다. 소규모 서비스라고 처리방침 의무가 면제된다는 근거는 찾지 못했다. 레이트리밋은 Cloudflare Free의 1개 규칙(IP 기준, 10초 창)과 bucket4j 조합이면 된다.

### Cited Findings
- 개인정보 처리방침 작성지침 개정본(2025-04-21 공개): 2025년 처리방침 평가 시행 대비, 법령상 필수사항과 정책상 권장사항을 구분. '회원서비스 운영', 'A/S 상담' 등 계약 체결·이행 사항은 동의 없이 처리 가능, 민감정보·고유식별정보·제3자 제공은 계약 이행이어도 동의 필요. 처리 항목·보유기간은 특별한 사정 시 유형별 기재 허용. 고충처리 담당자명·직위·연락처 병기 가능. 생성형 AI 부록 추가 — [대륜 법률사무소 뉴스레터](https://www.daeryunlaw.com/newsletter/news/151); [뉴스서울](https://www.newsseoul.co.kr/news/view/1065585619471455); [작성지침 PDF(2025.04)](https://www.catchsecu.com/archives/download-category/%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8)
- 개인정보위 소셜 로그인 점검(2024-04~11 실시, 2025-02-13 발표, 네이버·카카오·구글·메타·애플): 소셜 계정 탈퇴 시 개인정보가 제대로 파기되지 않음. 5개 사업자 모두 토큰 폐기(revoke) 기능을 제공하지만 개발자 문서가 길고 찾기 어려워 거의 사용되지 않음, 폐기되지 않은 토큰은 해킹 위험. 메타는 연동 사이트에 탈퇴를 일괄 통지하는 기능 부재. '연동 해지' 기능 사용률 저조. 국내 소셜 로그인 사용 사이트 약 50만 개 — [보안뉴스: 네이버 등 소셜로그인 탈퇴 시 개인정보 파기 부실](http://www.boannews.com/news/articleView.html?idxno=135941)
- 소셜 로그인 구조상 플랫폼→서비스로 정보가 전달되므로 서비스 제공자는 전달받은 정보의 활용 목적을 고지하고 동의를 받아야 하며, 처리방침은 공시 문서이고 동의는 별도 수집·이용 동의서로 받아야 함 — [Alchera: 간편가입과 신원보호](https://www.alchera.ai/resource/blog/easy-signup-identity-protection)
- 처리방침 미수립·미공개 시 개인정보보호법 제75조에 따라 3,000만 원 이하 과태료(블로그형 도구 페이지의 설명, 조문 원문 미확인) — [Demoday 개인정보처리방침 도구](https://demoday.co.kr/tools/privacy-policy)
- 개인·소규모 팀이 서비스 공개 전 확인할 법적 준비 체크리스트(2026) — [braindetox: 서비스를 열기 전에 확인할 다섯 가지 질문](https://braindetox.kr/posts/web_service_launch_legal_checklist_2026.html)
- Cloudflare Rate Limiting Free 플랜: 규칙 1개, 카운팅 특성 IP만, 카운팅 기간 10초, 완화 시간 10초, 표현식 필드는 Path·Verified Bot, 요청 수 기준, 스로틀링·캐시 제외 불가 — [Cloudflare WAF Rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- Bucket4j: 토큰 버킷 기반 Java 라이브러리, 단일 JVM·클러스터 모두 스레드 안전. 서블릿 필터/인터셉터로 429 반환, 다중 인스턴스는 Redis로 버킷 공유, 특정 엔드포인트만 제한할 때는 AOP 애노테이션 — [innoQ: Distributed rate limiting with Spring Boot and Redis](https://innoq.com/en/blog/2024/03/distributed-rate-limiting-with-spring-boot-and-redis/); [Steven PG: Bucket4j and Redis](https://stevenpg.com/posts/rate-limiting-spring-boot-bucket4j-redis/)
- Spring Boot 4 기준 튜토리얼은 `bucket4j-core`/`bucket4j-redis` 8.10.1 사용(2026-01) — [OneUptime: Rate limiting Bucket4j Spring Boot (2026-01-25)](https://oneuptime.com/blog/post/2026-01-25-rate-limiting-bucket4j-spring-boot/view)
- PostgreSQL 18에서 `md5` 인증 deprecated, SCRAM 사용 권고 — [PostgreSQL 18 Released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- 토스페이먼츠의 경계 보안→제로트러스트 고도화 여정 — [Toss Tech: 경계 보안부터 제로트러스트 보안까지](https://toss.tech/article/payments-legacy-10)

### Inferences
- 여행노트 개인정보 최소화 설계: 소셜 로그인에서 이메일·닉네임·프로필 이미지 URL만 받고(생년·전화번호 불요청), 처리방침에 수집 항목·보유기간(탈퇴 즉시 파기, 로그는 N일)·제3자 제공 없음·위탁(Vercel, Supabase/클라우드, Sentry, Grafana)·국외 이전(미국 리전 벤더)을 명시. 회원 탈퇴 API는 (1) DB 레코드 삭제/익명화, (2) 소셜 제공자 토큰 revoke 호출(개인정보위가 2025-02에 지적한 바로 그 부분), (3) R2 이미지 삭제 작업을 큐잉하는 세 단계로 구현하고, 이를 README에 적으면 "개인정보위 점검 결과를 반영했다"는 구체적 근거가 된다.
- 위탁·국외 이전 고지는 Vercel(미국), Supabase(서울이지만 미국 법인), Sentry(미국), Grafana Cloud(리전 선택) 모두 해당하므로 처리방침에 벤더 목록을 적어야 한다. 이 목록을 코드 저장소의 `PRIVACY.md`와 동기화하면 면접에서 "개인정보 흐름을 설계 단계에서 추적했다"는 답이 가능하다.
- 쿠키 동의 배너: 한국 개인정보보호법은 EU ePrivacy처럼 쿠키 배너를 직접 요구하지 않는다는 것이 일반적 이해이나 이번 조사에서 공식 근거를 확보하지 못했다(Gaps). 분석 도구(Speed Insights, Sentry 리플레이)가 행태정보에 해당할 수 있으므로 처리방침에 수집 사실을 적고, 세션 리플레이는 PII 마스킹 기본값을 유지하는 것이 안전하다.
- 레이트리밋 계층: Cloudflare Free 규칙 1개는 로그인/공유 링크 생성 경로(`/api/auth/*`, `/api/share`)에 IP 기준으로 걸고, 세밀한 사용자별 제한은 bucket4j(인스턴스 1대면 인메모리, 확장 시 Redis/Valkey)로 처리. 두 계층을 나눈 이유를 설명할 수 있어야 한다.
- CSP: Next.js nonce 기반 CSP + `next/image` 도메인 허용 목록 + Sentry 리포팅 URI 구성은 일반 지식이며 2026 특화 자료는 조사하지 못했다.

### Gaps
- 개인정보보호법상 소규모(1인) 개인정보처리자의 개인정보 보호책임자 지정 의무, 안전성 확보조치 기준의 소규모 사업자 완화 조항, 2026년 개정 사항은 검색 한도로 확인하지 못했다. pipc.go.kr 원문 확인 필요.
- 한국의 쿠키/행태정보 동의 요건(온라인 맞춤형 광고 가이드라인)에 대한 공식 자료는 찾지 못했다.
- Cloudflare Free 플랜의 Bot Fight Mode·WAF 관리형 규칙 포함 여부는 문서에서 확인되지 않았다.
- CSP, Doppler, 클라우드 시크릿 매니저 요금은 조사하지 못했다.

---

## 11. 기능 플래그·설정·점검 모드

### Takeaway
2026년에도 오픈소스 기능 플래그는 Unleash(AGPL, 거버넌스 기능은 Enterprise)와 Flagsmith(원격 설정·identity traits 강점)가 양강이고, OpenFeature는 백엔드가 아니라 벤더 중립 SDK 표준이라 둘 중 하나와 조합한다. 1인 프로젝트에서는 OpenFeature SDK + 환경변수/DB 기반 자체 프로바이더로 시작하고 점검 모드 플래그 하나만 운영하는 것이 적정이다.

### Cited Findings
- 2026-07 오픈소스 가이드: 보편적 승자는 없음. Unleash는 "AGPL 운영 또는 상용 구매가 가능한 조직"에 권장, Flagsmith는 원격 설정·identity traits·호스팅/프라이빗 배포 선택이 핵심일 때 권장. GO Feature Flag는 파일 기반 플래그 정의와 relay proxy를 갖춘 경량 OpenFeature 지향 시스템 — [FeatBit: Open source feature flag tools 2027 guide](https://www.featbit.co/blogs/open-source-feature-flag-tools-2027)
- Unleash OSS는 플래그 수명주기·stale 플래그 추적 포함, 변경 요청·RBAC·SSO·감사 로그는 Enterprise — [FeatBit guide](https://www.featbit.co/blogs/open-source-feature-flag-tools-2027)
- Flagsmith 자체 비교(벤더 자료): Unleash보다 네이티브 통합이 많다고 주장 — [Flagsmith vs Unleash](https://www.flagsmith.com/compare/flagsmith-vs-unleash)
- 우아한형제들은 실험 플랫폼에서 기능 플래그로 노출 비율 설정·조건부 노출·런타임 롤백을 구현 — [우아한형제들: 실험과 기능플래그를 위한 실험플랫폼 구축하기](https://techblog.woowahan.com/9935/)
- 토스: 수천 개 API/BATCH 서버를 하나의 설정 체계로 관리 — [Toss Tech: 수천 개의 API/BATCH 서버를 하나의 설정 체계로 관리하기](https://toss.tech/article/42683)

### Inferences
- 여행노트에 필요한 플래그는 (1) 점검 모드(쓰기 차단 + 안내 페이지), (2) 새 가이드 블록 타입 점진 공개, (3) 날씨 캐시 공급자 전환 정도다. Spring 쪽은 OpenFeature Java SDK + DB 테이블 프로바이더(또는 Spring Boot `@ConfigurationProperties` + Actuator refresh), Next.js 쪽은 Vercel Edge Config(조사 못 함) 또는 API에서 플래그를 내려받는 방식으로 통일하면 된다. Unleash 서버를 띄우는 것은 1인 운영에서 과하다.
- 점검 모드 패턴: 리버스 프록시(nginx/Cloudflare) 레벨에서 503 + `Retry-After`를 주는 1차와, API가 쓰기 요청만 503으로 거절하고 읽기는 허용하는 2차를 분리하면 "부분 점검"을 설명할 수 있다. 블루/그린 전환 스크립트와 같은 자리에 두면 운영 절차가 한 곳에 모인다.
- 면접 신호: 우아한형제들·토스 글처럼 "플래그 = 배포와 릴리스의 분리"라는 어휘를 쓰고, 플래그 수명(제거 일정)을 관리한다고 말하는 것이 성숙도로 읽힌다.

### Gaps
- Vercel Edge Config 요금·한도·2026 변경 사항은 조사하지 못했다.
- OpenFeature 1.0 이후 Java/JS SDK 버전과 2026 동향은 확인하지 않았다.

---

## 12. 부하 테스트와 용량 가정

### Takeaway
k6 2.1.0(2026-06-30, AGPL-3)이 1인 프로젝트 부하 테스트의 기본이고, Grafana Cloud Free에 k6 500 VUh가 포함되어 결과를 같은 대시보드에서 볼 수 있다. 사이드 프로젝트의 현실적 트래픽 가정은 "DAU 수십~수백, 공유 링크 유입 버스트(SNS 공유 시 분당 수백 요청)"이며, 이를 수치로 명시하고 k6 시나리오로 재현한 것 자체가 면접 신호가 된다.

### Cited Findings
- k6 2.1.0 안정 릴리스 2026-06-30, AGPL-3, Grafana Labs — [Wikipedia: K6](https://en.wikipedia.org/wiki/K6_(software))
- Grafana Cloud Free에 k6 500 가상 사용자 시간 포함, Pro 초과 $0.15/VUh — [Grafana Cloud Pricing](https://grafana.com/pricing/)
- Grafana Cloud k6는 테스트 생성 시 k6 런타임 메이저 버전 선택 가능(신규 기본 v1.x, v2.x 선택 가능) — [Grafana What's new 2026-07-02](https://grafana.com/whats-new/2026-07-02-choose-your-k6-runtime-version-when-you-create-tests-in-grafana-cloud-k6/)
- Grafana Cloud k6 플랜 한도 사전 안내 기능(2026-08-06) — [Grafana What's new 2026-08-06](https://grafana.com/whats-new/2026-08-06-know-your-grafana-cloud-k6-plan-limits-before-you-hit-them/)
- Vercel Fluid compute 과금 예시: 4 GB 함수, 상파울루, CPU 4초·인스턴스 10초 생존 시 호출당 약 $0.00045 — [Vercel Fluid compute pricing](https://vercel.com/docs/fluid-compute/pricing)
- 우아한형제들: 배포 단위를 작게 유지하려고 매주 배포 — [우아한형제들: 전체 서비스를 관통하는 도메인 모듈을 안전하게 분리하기](https://techblog.woowahan.com/22151/)

### Inferences
- 용량 가정 제시 방식(제안): "일상 트래픽 10 RPS 이하, 공유 링크 바이럴 시 100 RPS 5분 버스트, 공유 페이지는 캐시 적중률 90% 이상 목표"처럼 세 숫자를 README에 쓰고, k6 시나리오(ramping-arrival-rate)로 API p95·에러율·DB 커넥션 풀 포화 지점을 측정한 그래프를 첨부한다. 측정 결과 "1 vCPU/1 GB 컨테이너 1대로 100 RPS까지 p95 400ms 이내"처럼 한계를 숫자로 말할 수 있으면 대기업 면접에서 "규모는 작아도 방법을 안다"는 평가를 받는다.
- JVM 콜드 스타트와 HikariCP 풀 크기(기본 10)가 소형 컨테이너에서 가장 먼저 걸리는 병목이므로, k6 결과에서 이 두 가지를 짚는 것이 현실적인 분석이다(일반 지식).
- Gatling은 조사하지 못했지만 Kotlin DSL이 있어 Spring 개발자에게 익숙하다. 다만 Grafana Cloud 통합과 무료 VUh는 k6 쪽이 유리하다.

### Gaps
- Gatling 2025~2026 버전과 라이선스 변화는 확인하지 못했다.
- 국내 대기업이 포트폴리오 부하 테스트를 어떻게 평가하는지에 대한 공개 자료는 없다(인터뷰 관점은 추론).

---

## 13. 종합: 1인 프로덕션 사이드 프로젝트의 "성숙도 신호" 체크리스트 (추론 요약)

이 섹션은 위 섹션들의 사실에서 끌어낸 추론을 한데 모은 것이다. 각 항목의 근거는 해당 섹션의 Cited Findings를 참조한다.

- 버전 명시: PostgreSQL 18.6, PostGIS 3.6.x, pgvector 0.8.1(선택), Valkey 9.1 또는 Redis 8.x, Spring Boot 4.1.x, OTel Java 2.32, OpenTofu 1.11.x, k6 2.1. 버전을 README에 적고 Renovate로 갱신하는 것 자체가 신호다.
- 데이터: uuidv7 PK, PostGIS geography + GiST, jsonb는 본문만, 필터 키는 컬럼 승격, 표현식 인덱스, `EXPLAIN (ANALYZE, BUFFERS)` 결과를 문서에 남기기.
- 캐시: "인스턴스 1대 → Caffeine, 확장 시 Valkey"를 ADR로. 날씨 캐시는 UNLOGGED 테이블도 가능.
- 호스팅: Vercel Pro($20, 상업 이용 조건 준수) + 서울/도쿄 리전 상시 컨테이너 1대 + Supabase 서울 또는 Neon(싱가포르, 프리뷰용). App Runner는 제외(2026-04-30 신규 중단).
- 배포: GitHub Actions 한 번으로 끝나는 SHA 태그 이미지 → 헬스체크 기반 블루/그린(nginx/Caddy 또는 Cloud Run 리비전 분할) → 롤백 절차 문서.
- 공급망: 액션 SHA 고정 + Renovate, OIDC(시크릿 없는 클라우드 인증), Trivy + SBOM + Artifact Attestations.
- 관측성: Spring Boot 4 OTel starter → Grafana Cloud Free(OTLP), Sentry Developer, Speed Insights/Faro. SLO 3개와 에러 버짓 규칙을 README에.
- 개인정보: 처리방침(2025-04 작성지침 기준), 위탁·국외 이전 벤더 목록, 탈퇴 시 소셜 토큰 revoke + 파기 3단계, 최소 수집.
- 비용: 월 $55~75 밴드를 표로 제시하고, 어떤 항목이 트래픽에 비례하는지(Vercel 변환·Active CPU, Supabase MAU/egress) 설명.
- 부하: 트래픽 가정 세 숫자 + k6 그래프 + 병목(HikariCP, JVM 콜드 스타트) 분석.
