# 한국 주요 테크 기업 채용 담당자가 사이드 프로젝트에서 보는 것 (2025–2026)

조사일: 2026-10-15. 대상: 네이버, 쿠팡, 우아한형제들, 카카오, 토스, 당근, 라인, 야놀자, 여기어때.
목적: 1인 개발 B2C 여행 일정 웹앱(Next.js + Kotlin/Spring Boot + PostgreSQL)이 이 회사들의 리뷰어에게 "성숙한 프로젝트"로 읽히도록 기술과 엔지니어링 관행을 고르는 근거 수집.

신뢰도 표기 규칙
- **[회사 직접]** 회사 채용 페이지, 공식 기술블로그, 공식 컨퍼런스 세션, 보도자료에서 직접 확인한 내용.
- **[2차 게시]** 원티드/리멤버/인디스워크/비즈니스피플 등 채용 플랫폼에 복제된 공고. 게시일이 불명확한 경우가 많음.
- **[커뮤니티]** 개인 블로그, 커뮤니티 답변, 설문. 특정 회사 기준을 대표하지 않음.

조사 한계: 세션 웹 검색 한도가 소진되어 네이버(recruit.navercorp.com), 쿠팡(coupang.jobs), 야놀자, 여기어때, 라인의 2025–2026 공고 원문은 충분히 확보하지 못했다. d2.naver.com, medium.com/coupang-engineering, medium.com/daangn, engineering.linecorp.com, techblog.yanolja.com은 직접 열람이 막히거나(403) 확보하지 못했다. 해당 항목은 각 질문의 Gaps에 적었다.

---

## 1. 백엔드 채용 공고에 명시된 기술 (Kotlin vs Java, Spring, JPA, Kafka, Redis, DB, K8s, MSA, gRPC, 관측성, 테스트)

### Takeaway
2025–2026 공고에서 **Java/Kotlin + Spring 계열 + JPA/Hibernate + MySQL + Redis + Kafka + AWS/Kubernetes**가 사실상 표준 조합이고, Kotlin은 토스·당근에서 1순위 언어, 우아한형제들·카카오·쿠팡·라인에서는 "Java 또는 Kotlin"으로 병기된다. PostgreSQL을 명시한 공고는 조사 범위에서 하나도 없었고(MySQL/MariaDB 일색), 관측성 스택은 Grafana/Prometheus/Loki/Pinpoint(배민), Grafana/Sentry/Datadog(당근), Grafana/ELK(토스)로 회사마다 다르지만 **Grafana가 공통**이다. Kotest·Testcontainers·ArchUnit·Spring Modulith·virtual threads 같은 세부 도구는 채용 공고 레벨에는 거의 등장하지 않고 기술블로그(ArchUnit)에서만 보인다.

### Cited Findings

**우아한형제들 [회사 직접, 2차 게시]**
- 배민공통서비스개발팀 백엔드 개발자(2025-10-01 게시, 경력 7년+): 기술스택 "Java, Kotlin, Spring (MVC, WebFlux, Batch), JPA, Gradle, gRPC, Thrift / AWS / MySQL, Elasticsearch, DynamoDB, Redis / JUnit, GitLab CI, Jenkins / Grafana, Prometheus, Loki, Pinpoint / Docker, GitHub Copilot". 우대: "JPA/Hibernate 등 ORM 사용 경험과 도메인 모델링", "빌드·테스트·배포 자동화 경험", "시스템 모니터링 및 알림 구축 경험", "대용량 트래픽 서비스 안정 운영 경험", "gRPC 또는 Thrift 개발 경험" — [지행 복제 공고](https://zighang.com/recruitment/bfc89828-b8c5-491e-a2d9-baef444500e5)
- CS 프로덕트실 백엔드 개발자(경력 7년+): 자격요건에 "Java/Kotlin과 Spring Framework 기반 웹 애플리케이션 개발 경험", "JPA, Hibernate 등 ORM 사용 경험과 도메인 모델링 역량", "MSA 개념을 이해하고 개발 및 운영을 수행한 경험", **"테스트 프레임워크를 활용한 테스트 코드 작성 경험"**이 자격요건(우대 아님)으로 들어감 — [원티드](https://www.wanted.co.kr/wd/254673)
- 2026-09 기술블로그 ArchUnit 글의 팀 스택은 Java 11 / Spring Boot 2.4.5 / Gradle 6.8 / Lombok — 대형 서비스도 레거시 버전을 운영 중임을 보여줌 — [techblog.woowahan.com/26835](https://techblog.woowahan.com/26835/)
- 2026-09 워크플로 글: Kotlin coroutines + Spring WebFlux + Reactive MongoDB(DocumentDB)로 자체 라이브러리 Flowkit 구축. Temporal은 "학습 곡선, 별도 인프라 운영, 엔진 디버깅 난이도, 벤더 락인"을 이유로 도입하지 않음 — [techblog.woowahan.com/26832](https://techblog.woowahan.com/26832/)

**토스 [회사 직접]**
- Server Developer (Product): 기술스택 "Java, Kotlin, Spring Framework, JPA/Hibernate, Netty, Golang / MySQL, Oracle, Redis, MongoDB, Kafka, Elasticsearch, Grafana". 주요업무에 "Redis, Kafka, Kubernetes, ELK를 활용한 대용량 트래픽과 동시성 처리". "더 좋아요"에 "Spring Framework, Tomcat, JVM, OS, 네트워크, 인프라 등 다양한 레이어에서의 트러블 슈팅 경험", "모니터링 및 성능 튜닝 경험". 전형에 **라이브 코딩 테스트** 포함 — [toss.im/career job_id=4076140003](https://toss.im/career/job-detail?job_id=4076140003)
- Server Developer (생산성): 기술스택 "Kotlin, Spring / MySQL, MongoDB, Hadoop, Redis, Kafka". 자격요건에 "장애를 겪고 해결해 본 경험", "데이터 모델과 API를 능숙하게 설계". 이력서 작성 권장: "프로젝트를 나열하기보다, 기여도가 높은 프로젝트의 문제의식, 가설, 해결 방식, 결과, 어려웠던 점을 자세히" — [toss.im/career job_id=6288478003](https://toss.im/career/job-detail?job_id=6288478003)
- 토스 서버 챕터 FAQ(2022-02, 오래됨): "Java/Kotlin, Spring Boot, JPA/Hibernate, MySQL, MongoDB, Elasticsearch"; 면접에서 "코드의 유지보수성", "서비스 운영과 장애 대응 경험", "대용량 트래픽", "새 서버 아키텍처 설계와 적합한 기술 스택 선택"을 봄 — [toss.im/tossfeed](https://toss.im/tossfeed/article/toss-serverchapter-faq10)
- TMC 25(Toss Makers Conference, 2025-07-25) 서버 트랙 제목: "현장결제 서비스의 분산 트랜잭션 관리학 개론", "수천 개의 API/BATCH 서버를 하나의 설정 체계로 관리하기", "확장성과 회복 탄력성을 갖춘 결제 시스템 만들기", "레거시 정산 개편기: … 대규모 배치 운영 노하우", "'주식모으기' 서비스로 살펴보는, 대용량 트래픽 처리 노하우", **"Spring Boot 확장 라이브러리: 자율과 안전을 위한 가드레일 전략"**, "토스페이먼츠의 Open API 생태계" — [toss.im/tmc-25](https://toss.im/tmc-25/sessions/engineering/server-21)
- 토스 계열사 2차 게시 공고(게시일 불명): 토스페이먼츠 Server Developer 스택 "Java, Kotlin, Gradle, Spring MVC, Spring Webflux, Spring Batch, JPA, Spring Cloud Gateway, MySQL, Redis, Kafka"; 토스플레이스는 "공통 기능(Metric, Logging, Distributed Lock 등)을 Spring 기반으로 모듈화", "Redis, Kafka, ELK 우대"; 토스뱅크 플랫폼 공고는 "Kotlin, Java, Spring Boot, Spring WebFlux, Kafka, Kubernetes" — [리멤버/원티드 검색 결과(개별 URL 매핑 불확실)](https://www.wanted.co.kr/wd/347509) **[2차 게시, 저신뢰]**
- 토스뱅크 2026-08 서버 개발자 채용연계형 인턴(신입~3년): 전형 "서류 → 자유 인터뷰 → 직무 인터뷰 → 컬처 인터뷰" — [머니투데이 2026-08-04](https://www.mt.co.kr/finance/2026/08/04/2026080408500984209)

**당근 [회사 직접]**
- Backend – 당근페이(경력 3년+): "Kotlin 등 JVM 기반 환경에서 당근페이의 백엔드 서비스를 개발하고 운영"; 스택 "Kotlin, Spring Boot, Spring Batch, JPA, HTTP, gRPC, GraphQL, Netty / MySQL, Redis, Kafka, Central Dogma, Apache Flink / Grafana, Sentry, Datadog / AWS, Kubernetes, Argo CD, Argo Workflow, GitHub Actions". 업무에 "내결함성(Fault Tolerance)과 탄력성(Resilience)", "MSA 환경에서 분산 트랜잭션", "동시성 상황에서도 금융 데이터의 정합성". 전형에 "시스템 디자인 인터뷰" 포함 — [careers.daangn.com/jobs/role/4511184003](https://careers.daangn.com/jobs/role/4511184003/)
- Backend – 서비스 코어(Identity Service, 3년+): 스택 "Go, gRPC, gRPC-Gateway / MySQL, Redis, Kafka / k8s, Istio". 자격요건: "분산 시스템에서 정합성과 장애 전파를 고민해본 경험", **"성능·비용·보안처럼 서로 충돌하는 요구 사이에서, 근거를 갖고 결정을 내리고 그 결정을 설명해본 경험"** — [careers.daangn.com/jobs/role/5046759003](https://careers.daangn.com/jobs/role/5046759003/)
- Backend – 인프라(공통 서비스, 콘텐츠 서빙, 5년+): 언어 "Kotlin, Go", 인프라 "Kubernetes, GCP, AWS". 자격요건에 **"AI 도구를 적극적으로 활용해 만들고 검증하는 속도를 높이고 계신 분"**. "기술은 문제를 해결하는 수단이라고 생각해요". 팀 문화: "AI 컨텍스트를 저장소에 적용하고, 코드리뷰에 AI를 활용하며, 반복 워크플로를 AI로 자동화" — [careers.daangn.com/jobs/role/7644271003](https://careers.daangn.com/jobs/role/7644271003/)
- Backend – 광고(2026-03-25 게시, 5년+): "마이크로서비스 아키텍처를 직접 설계하고 운영하는 경험", "REST, gRPC 등 서비스 간 통신 이해", **"코드 리뷰와 테스트 가능하고 이해하기 쉬운 코드 작성에 관심"**; 우대 "레이어드/클린 아키텍처 같은 코드 레벨 아키텍처 이해", "Kubernetes, AWS, GCP 운영 경험", "간단한 백오피스 도구를 만들 수 있는 능력" — [비즈니스피플 복제](https://www.bzpp.co.kr/biz/businessDetailView/BR260325A00153)
- 2026-10 기준 당근 채용 페이지에는 백엔드 공고 20개, 프론트엔드 6개, ML 3개가 열려 있고 "Test Automation Engineer", "Design Engineer – 디자인 시스템" 포지션도 별도 존재 — [careers.daangn.com/jobs](https://careers.daangn.com/jobs/)

**쿠팡 [2차 게시]**
- Senior Back-end Engineer (Eats Merchant): Basic "4+ years coding in Java or another OO language", "Proficiency with AWS and the Spring Framework", "Proven experience designing, building, and operating large-scale services". Tech stack "AWS, MSA, Spring Boot, JPA, Elastic Stack, Docker, Kafka, Redis, MySQL, Cassandra". 2026-02-17에 공고 내려감 — [builtin.com](https://builtin.com/job/senior-back-end-engineer-eats-merchant/7929628)
- 검색 요약상 쿠팡 공고는 "Java 및 Spring Framework 기반 웹 애플리케이션 7년 이상", "AWS 클라우드 사용 경험, Kubernetes 환경 개발 경험"을 요구하고 **Kotlin을 명시한 공고는 발견되지 않음** — [coupang.jobs 예시](https://www.coupang.jobs/cn/jobs/8081147/sr-staff-backend-engineer-core-member-infra-platform-team/) **[요약 기반, 개별 확인 못함]**

**카카오 [회사 직접 + 2차 게시]**
- 카카오모빌리티 물류&에이전트 개발실 백엔드(3년+): 필수 "Kotlin 또는 Java 기반 서비스 개발 경험, MySQL 등 RDBMS, Docker와 Kubernetes 이해"; 우대 "Redis, Kafka 같은 메시징·캐싱" — [인디스워크](https://inthiswork.com/archives/353734) **[검색 요약 기반]**
- 2026년도 카카오그룹 신입 공채(2025-09 발표): 전형 "서류 심사 → 코딩 테스트(테크 직군) → 면접". 기술 스택 요건은 보도자료에 없음 — [kakaocorp.com](https://www.kakaocorp.com/page/detail/11688)

**네이버 [회사 직접, 오래된 자료]**
- 2025 팀네이버 신입 공채 Tech 직군: "온라인 코딩/CS테스트, 기술 역량 인터뷰, 종합 역량 인터뷰" — 기술 스택 요건 없음 — [바이라인네트워크 2025-03](https://byline.network/2025/03/5-283/)
- 2022 네이버 월간영입 백엔드 PDF(오래됨): 공통 기술 스택 "Kotlin, Java, Spring Cloud, QueryDSL, Gradle, Junit5" — [recruit.navercorp.com PDF](https://recruit.navercorp.com/nufiles/naver/11-backend.pdf)
- 네이버파이낸셜 2023 인턴(오래됨): 개발환경 "Spring, Kafka, Kubernetes, Docker / Java, Kotlin"; 우대 "Spring Boot 및 Spring Cloud, Kafka·MQ, Kotlin 및 coroutine" — [catch.co.kr](https://www.catch.co.kr/naverfinancial/)

**라인 [2차 게시]**
- LINE Pay Plus 서버 엔지니어: 필수 "Java, Spring, Spring Boot, JPA 기반 개발 경험, 서버 개발 3년+"; **Kotlin은 우대** — [인디스워크](https://inthiswork.com/archives/358823)
- LINE Plus 커머스 플랫폼 서버: "Java 숙련도, Spring Framework, RDBMS 및 NoSQL, MSA와 RESTful API" — [theteams](https://www.theteams.kr/recruit/wanted/25576)

**생태계 신호**
- JetBrains–Spring 공식 파트너십(2025-06): Kotlin 백엔드 지원 강화 — [blog.jetbrains.com](https://blog.jetbrains.com/ko/kotlin/2025/06/strengthening-kotlin-for-backend-development-a-strategic-partnership-with-spring/)
- Spring Modulith 공식 문서: "도메인 중심 모듈형 애플리케이션용 opinionated 툴킷", 구조 검증 테스트·모듈별 통합 테스트·문서화 지원, BOM 2.1.0 — [docs.spring.io](https://docs.spring.io/spring-modulith/reference/). 한국 대기업 공고/블로그에서 Spring Modulith 언급은 **발견하지 못함**.

### Inferences
- 여행노트가 Kotlin + Spring Boot를 쓰는 것은 토스·당근 공고와 정확히 일치하고, 배민·카카오·라인·쿠팡은 "Java 또는 Kotlin"이라 불이익이 없다. 다만 쿠팡은 Java 중심이므로 Kotlin 선택 이유를 한 줄로 적어두면 좋다.
- PostgreSQL은 어느 공고에도 없지만 "RDBMS 설계·운영·쿼리 튜닝"이 공통 요구이므로, DB 종류보다 **인덱스 설계, 트랜잭션 격리, 마이그레이션(Flyway), 슬로우 쿼리 분석** 같은 운영 증거가 더 중요하다. PostgreSQL을 고른 이유(예: JSONB, PostGIS로 여행지 좌표 검색)를 ADR로 남기면 "왜 MySQL이 아닌가" 질문에 대비된다.
- JPA/Hibernate + 도메인 모델링은 배민 두 공고 모두 자격요건이다. QueryDSL은 네이버 2022 자료에만, jOOQ는 어디에도 없었다. JPA를 주력으로 하고 복잡 조회만 QueryDSL/jOOQ로 보강하는 구성이 가장 "읽히는" 선택이다.
- Kafka·Kubernetes는 공고에 자주 등장하지만 전부 **대용량 트래픽 맥락**이다. 1인 프로젝트에서 Kafka 없이도 "분산 락, 멱등성, 재시도, 타임아웃" 같은 개념을 코드로 보여주는 것이 공고 문구("동시성", "정합성", "장애 전파")와 더 직접 맞는다.
- 관측성은 Grafana 계열(Prometheus/Loki)이 배민·토스·당근 공통이므로 Spring Boot Actuator + Micrometer + Prometheus + Grafana + Loki 조합이 "어느 회사에서도 익숙한" 스택이다. Pinpoint(배민), Datadog/Sentry(당근)는 회사별 추가.
- gRPC는 배민·당근 공고에 반복 등장하지만 서비스 간 통신 맥락이다. 단일 서비스에는 불필요하며 REST + OpenAPI 명세가 적절하다.

### Gaps
- 네이버 2025–2026 경력 공고 원문(recruit.navercorp.com)은 확보하지 못했다. 2022 자료만 있다.
- 쿠팡 공고의 게시일과 Kotlin 사용 여부는 2차 게시 요약에 의존했다.
- 야놀자/NOL, 여기어때 공고는 검색 결과에 전혀 나오지 않았다.
- Spring Boot 버전, virtual threads, Kotest, Testcontainers, ArchUnit, DDD/헥사고날을 **공고 레벨**에서 명시한 사례는 없었다(기술블로그에는 ArchUnit·헥사고날 등장, 3번 질문 참고).
- MSA vs 모듈러 모놀리스에 대한 한국 대기업의 2025–2026 공식 입장은 찾지 못했다. 공고에는 "MSA 이해/운영 경험"만 반복된다.

---

## 2. 프론트엔드 채용 공고에 명시된 기술 (React, Next.js, TypeScript, 상태관리, 디자인 시스템, 테스트, 모노레포, Core Web Vitals)

### Takeaway
**React + TypeScript + SSR 경험**이 공통 자격요건이고, 상태/데이터 계층은 TanStack Query(React Query) + Zustand/Jotai가 명시된다. Next.js를 자격요건에 적은 대기업 공고는 조사 범위에서 **하나도 없었다**(토스는 자체 SSR 프레임워크, 당근은 fastify + react-dom/server Streaming SSR, 배민은 Module Federation 프레임워크). 디자인 시스템은 세 회사 모두 자체 보유(배민 우아한공방, 토스 TDS, 당근 디자인 시스템 전담 포지션)이고, 테스트는 토스 TMC 25에서 "접근성 기반 E2E 테스트"가 세션으로 다뤄졌다.

### Cited Findings
- **당근 Frontend – 커뮤니티(모임팀, 3년+)** [회사 직접]: 자격요건 "React를 활용하는 SSR 웹 서비스의 개발 경험이 있으신 분", "JavaScript, TypeScript에 대한 깊은 이해". 스택 "React, TypeScript, TanStack Query, vanilla-extract, Vite, fastify와 react-dom/server 기반 Streaming SSR". 우대 "모바일 앱 내 웹뷰 개발 경험", **"Claude Code, Codex 같은 코딩 에이전트로 본인만의 AI 워크플로우를 만들어 일하시는 분"**, "A/B 테스트 설계 및 분석", "모니터링 등 주요 지표를 측정하고 개선한 경험". "AI 네이티브를 지향해요". Next.js·Storybook·테스트 언급 없음 — [careers.daangn.com/jobs/role/7689088003](https://careers.daangn.com/jobs/role/7689088003/)
- **우아한형제들 운영도구개발팀 Frontend Engineer(5년+)** [2차 게시]: 개발환경 "TypeScript, JavaScript, React, Vue.js, Jotai, Zustand, React Query, Node.js, pnpm, yarn" — [devision.co.kr/job/259](https://devision.co.kr/job/259) **[검색 요약 기반, 페이지 직접 확인 실패]**
- **우아한형제들 배민공통서비스 웹프론트엔드(2024-03, 7년+)** [2차 게시]: "디자인시스템(우아한공방), 사내 공통 라이브러리, Module Federation 기반 프레임워크" 개발, "Node 기반 서버에서 전사 대상 서비스" — [비즈니스피플](https://www.bzpp.co.kr/biz/businessDetailView/BR240330A00096)
- **토스 프론트엔드 챕터 공고** [2차 게시]: "WebView 기반의 서비스들을 개발하는 사내 Framework", "React Native Framework", "수백 대의 SSR 서버를 안정적으로 운영", "SSR 개발환경 도입으로 로딩 속도를 2초대로", "하루 40회 이상 라이브 배포", "수백 개의 동시 A/B 테스트" — [rocketpunch](https://www.rocketpunch.com/en/jobs/153161)
- 토스 계열 공고 우대: "모노레포 같은 복잡한 프론트엔드 코드 구조를 실제 서비스에 운영해 본 경험" — [인디스워크(토스플레이스 Frontend Platform Engineer)](https://inthiswork.com/archives/343286) **[본문 확인 실패, 검색 요약]**
- **토스 TMC 25 프론트엔드 트랙(2025-07-25)** [회사 직접]: "60개 React Native 패키지, 하나의 프레임워크로", "Native ESM에 올라탄 마이크로 프론트엔드", **"언제나, 누구에게나, 평등하게 빠른 웹"**, "100년 가는 프론트엔드 코드, SDK", **"알림부터 대응까지, 장애 대응을 시스템으로"**, **"누구나 작성하는 E2E 테스트를 향하여: 접근성에서 찾은 답"** — [toss.im/tmc-25](https://toss.im/tmc-25/sessions/engineering/server-21)
- 토스뱅크 프론트엔드 챕터(2026): "패키지를 ESM으로만 제공하기로 했어요" — [toss.tech/article/package-management-1](https://toss.tech/article/package-management-1)
- **우아콘 2025 프론트엔드 세션** [회사 직접]: "'어드민스튜디오' 웹 에디터 설계하기: 스키마 기반 렌더링", "앱 기반 화면을 웹으로 전환", **"당연해진 디자인시스템, 그다음 이야기: AST와 MCP로 여는 미래"**(디자인 시스템 가이드 MCP 서버, 컴포넌트 실제 사용 여부 대시보드) — [techblog.woowahan.com/24289](https://techblog.woowahan.com/24289/), [velog 후기](https://velog.io/@qorgkr26/woowacon-2025)
- **우아한형제들 2026-09 전자계약서 개편기** [회사 직접]: Bootstrap/Ant Design → 자체 디자인 시스템 "우아한공방" + react-hook-form, View/Form/Store 계층 분리, Store 의존성 주입으로 fake API 테스트, **Storybook**에서 뷰 검증, "Lint 규칙으로 계층 경계 강제", "폼/스토어 파일마다 spec과 test 파일이 같은 폴더에 있는지 검사하는 테스트" — [techblog.woowahan.com/27604](https://techblog.woowahan.com/27604/)
- 우아한형제들 2026-09 "집 나간 네트워크는 돌아왔는데 React.lazy는 왜 안 돌아올까" — 네트워크 복구 후 lazy chunk 복구 실패 사례 — [techblog.woowahan.com/27330](https://techblog.woowahan.com/27330/)

### Inferences
- Next.js는 "리뷰어가 아는 프레임워크"지만 세 회사 모두 자체 SSR/프레임워크를 쓰므로, Next.js 자체보다 **SSR/스트리밍/캐싱/번들 분할을 왜 이렇게 했는지 설명할 수 있는 것**이 평가 포인트다. App Router의 RSC/스트리밍을 "React SSR 이해"의 증거로 포장하는 것이 당근 자격요건("React를 활용하는 SSR 웹 서비스")에 직접 대응한다.
- TanStack Query는 당근·배민 공고에 명시되어 있어 안전한 선택이다. Zustand/Jotai도 배민 공고에 있다. Redux는 이번 공고들에 없었다.
- 디자인 시스템은 회사마다 자체 보유이므로 특정 외부 시스템(TDS 등)을 쓰는 게 아니라, **토큰 → 컴포넌트 → Storybook 문서화**라는 구조를 작게라도 갖춘 것이 신호다. 여행노트 디자인 시스템 문서가 이미 있다면 Storybook과 연결하면 된다.
- 토스가 "평등하게 빠른 웹", "접근성 기반 E2E"를 컨퍼런스 세션으로 올린 것은 Core Web Vitals와 접근성(ARIA 기반 셀렉터로 Playwright 테스트)이 평가 어휘에 들어와 있다는 뜻이다. Playwright E2E를 접근성 셀렉터(getByRole)로 쓰면 두 신호를 한 번에 낸다.
- pnpm 모노레포는 배민 공고(pnpm, yarn)와 토스 우대(모노레포 운영)에 맞다. 1인 프로젝트라면 `apps/web`, `packages/ui`, `packages/api-client` 정도의 최소 구성이면 충분하다.

### Gaps
- 네이버·카카오·쿠팡·라인의 프론트엔드 공고 원문은 확보하지 못했다.
- React 19, Vite(당근만 명시), Turborepo/Nx 명시 공고는 찾지 못했다.
- React Native/Flutter: 토스는 React Native 프레임워크를 자체 개발(공고 명시), 당근 Frontend 공고는 웹뷰 우대. Flutter 언급은 없었다.
- Core Web Vitals라는 단어 자체를 공고에서 확인하지는 못했다(토스 세션 제목으로만 간접 확인).

---

## 3. 기술블로그와 컨퍼런스(2025–2026)가 강조하는 엔지니어링 관행

### Takeaway
2025–2026 블로그와 컨퍼런스의 지배적 주제는 **AI 도입(코딩 에이전트, 코드리뷰 보조, MCP, LLM 평가/플랫폼)**이고, 그 다음이 **아키텍처 규칙의 코드화(ArchUnit, lint로 계층 경계 강제)**, **장애 대응의 시스템화(알림→대응, Kafka 장애 분석, 분산 트랜잭션, 회복 탄력성)**, **운영 효율(배치→워크플로, 설정 체계 통합, 비용 가시화)**이다. 테스트는 "AI가 쓴 코드를 통제하는 수단"으로 재조명되고 있다.

### Cited Findings

**우아한형제들**
- 2026-09-07 "문서로만 지키던 아키텍처 규칙, 테스트 코드로 강제하기": ArchUnit 1.3.0 + JUnit 5로 헥사고날 변형(인바운드 포트 없음, 도메인에 아웃포트 인터페이스, infra/external 어댑터) 계층 규칙을 CI에서 강제. **"규칙은 리뷰가 아닌 코드 레벨에서 지켜야 한다."** FreezingArchRule로 레거시 위반은 동결하고 신규 위반만 빌드 실패. 팀 규칙을 `.claude/rules/`(아키텍처, 네이밍, 코딩 스타일, 테스트, 예외, 로깅, 커밋)로 관리하고 AI 에이전트가 규칙 문서를 테스트로 변환. 결과: `@Builder` 위반 823→10. 저자 주의: "작은 단일 모듈 프로젝트는 설정 비용이 가치를 넘을 수 있다" — [techblog.woowahan.com/26835](https://techblog.woowahan.com/26835/)
- 2026-09-18 "전자계약서 화면 개편기: AI에게 맡긴 것과 사람이 챙긴 것": Claude Code로 스펙(`index.spec.md`)·테스트 초안·구현 생성, 사람은 "컴포넌트 선택", "스펙 변경과 테스트 케이스 목록 승인", "중복 로직 방지", "핵심 경로 코드 직접 읽기". **"경계를 먼저 정해 두자 AI가 만든 코드도 그 안에 들어왔습니다."**, **"코드가 나오는 속도보다 사람이 그 코드를 이해하는 속도가 먼저 한계에 닿았습니다."** 스펙 diff가 주요 리뷰 산출물. 구현 속도 약 2배, 테스트 코드 약 8.5배 증가, 출시 후 2주간 버그 4건(이전 2건) — [techblog.woowahan.com/27604](https://techblog.woowahan.com/27604/)
- 2026-09-08 배치→워크플로: 주문 1건 = 워크플로 인스턴스 1개, `await(timeout) { predicate }`, 체크포인트·결정적 리플레이·CAS 중복 실행 방지·`@WorkflowVersion`. 관측성: 상태를 `workflow_instance` 한 컬렉션에 모으고 Temporal Web UI를 본뜬 어드민에서 traceId까지 추적. "Claude helped build the Flowkit library quickly" — [techblog.woowahan.com/26832](https://techblog.woowahan.com/26832/)
- 2026-10-06 "플랫폼 행성에 떨어진 서비스 개발자": 어드민 50개 메뉴의 이벤트 로깅을 Tracker 모듈로 표준화해 사용 데이터로 우선순위 결정, BigQuery를 MCP로 연결, LLM Wiki/Skills로 에이전트 컨텍스트 제공, Playwright로 AI 에이전트가 실제 브라우저 테스트 실행. **"플랫폼이란 여러 서비스와 조직에 공통 기능과 규칙을 제공하는 기반입니다."** — [techblog.woowahan.com/27821](https://techblog.woowahan.com/27821/)
- 2026-09-23 "사장님 입점신청 자동승인 주기를 10분에서 10초로" — [techblog.woowahan.com/27678](https://techblog.woowahan.com/27678/); 2026-09-14 "AI 전환, 우리가 도운 건 돕는 사람이었습니다" — [techblog.woowahan.com/27640](https://techblog.woowahan.com/27640/). 2026-08~10 최근 10개 글 중 4개가 AI 주제 — [techblog.woowahan.com](https://techblog.woowahan.com/)
- 우아콘 2025(2025-10-28, 11개 분야 41세션 58명): 백엔드 세션에 **"처리 지연과 주문 취소로 이어진 Kafka 장애 분석과 조치"**, "데이터 연금술: 데이터 레이크 + 메달리온 아키텍처"; AI 세션 "AI Agent로 문제 해결", "'물어보새' RAG·MCP 1년 진화"; "배달의민족 주문~!: ServerSentEvents로 실시간 알림 전송하기"(브로커 빈 메시지 + 2차 API 호출 구조를 SSE + AWS IoT 푸시로 대체) — [techblog.woowahan.com/24289](https://techblog.woowahan.com/24289/), [velog 후기](https://velog.io/@qorgkr26/woowacon-2025), [머니투데이](https://www.mt.co.kr/tech/2025/10/28/2025102811583661564)
- 우아콘 2025 박경태 서버그룹 기술이사: "AI가 생산성을 50%, 100% 높일 것이라는 외부 기대와 달리" 현장은 그만큼 체감 못 함. Copilot 도입 후에도 **"테스트·리뷰·자동화 영역에서 근본적인 병목은 해소되지 않았다"**, "의무감"으로 불필요한 곳에 AI 사용. 이후 "작게 계획 → PoC → 검증 기반 재계획" 반복. 에이전트 예시: 에러 알림 분석, Jira 티켓 생성, 코드리뷰 보조(해커톤 산출) — [바이라인네트워크 2025-10-30](https://byline.network/2025/10/1030/)

**토스**
- 2026-02-26 "Software 3.0 시대, Harness를 통한 조직 생산성 저점 높이기"(토스페이먼츠): Claude Code 플러그인/훅/슬래시 명령으로 팀 규율을 배포. **"같은 모델, 같은 IDE를 쓰는데도 결과물의 차이는 극심합니다."**, **"차이는 단 하나, 작업 전에 컨텍스트를 설계했느냐의 여부입니다."**, "문서 관리의 패러다임이 '기록'에서 '실행'으로". 지식을 Global/Domain/Local 3계층으로, 플러그인 리뷰를 코드 리뷰처럼 — [toss.tech/article/45519](https://toss.tech/article/45519)
- 2026-09-16 "리더보드 1등 LLM, 토스에서도 1등일까? – Toss Benchmark 구축기": **"범용 시험을 잘 푸는 것과 토스 도메인 업무를 처리하는 것은 다른 능력입니다."** 한국어로 바꾸면 순위가 바뀌고, reasoning off 시 코딩 점수 6.0~30.6점 하락. 공개 벤치마크(AAII)와 실제 업무 상관 ρ +0.02, 자체 IFBench ρ +0.71. 권장: 실제 배포 언어·추론 설정으로 평가, 서비스 로그 기반 평가 데이터 구축, 모든 모델에 같은 기준 — [toss.tech/article/toss-benchmark](https://toss.tech/article/toss-benchmark)
- 2026-10-13 "서비스 개발에 집중할 수 있는 AI 플랫폼 만들기": GenAI Portal(예산·사용량 한도·API 키·승인), LLM Gateway(권한, 가드레일, 어댑터), MCP Gateway(도구 실행 권한 분리), Langfuse 트레이스, 로그 PII 마스킹, TPM 한도, PTU→PAYG 전환. **"모델을 호출할 권한과 사내 도구를 실행할 권한은 별개입니다."**, "본문을 가리더라도 호출 상태와 지연 시간, 사용량, 실패한 단계는 따로 확인할 수 있게" — [toss.tech/article/ai-platform-foundation](https://toss.tech/article/ai-platform-foundation)
- TMC 25 세션(2025-07): "알림부터 대응까지, 장애 대응을 시스템으로", "확장성과 회복 탄력성을 갖춘 결제 시스템", "Spring Boot 확장 라이브러리: 자율과 안전을 위한 가드레일 전략", "비싼 GPU, 낭비 없이 제대로 운영하는 법" — [toss.im/tmc-25](https://toss.im/tmc-25/sessions/engineering/server-21)

**카카오**
- tech.kakao.com 2026-09~10 최신 글: "데이터 분석 에이전트를 만들며 배운 컨텍스트 설계"(2026-10-02), "개인화 추천을 위한 랭킹 모델 개발기"(2026-09-23) — [tech.kakao.com](https://tech.kakao.com/)
- if(kakao)24(2024-11) 발표 "CodeBuddy": KCP/KAP 기반 온프레미스 AI 코드리뷰 도구, "결함 탐지보다 AI를 새로운 동료로" — [speakerdeck](https://speakerdeck.com/kakao/ifkakao24-28)
- if(kakao)25(2025-09-23~25): 카카오톡 개편·신규 AI 서비스·OpenAI 공동 프로덕트 중심 — [kakaocorp.com](https://www.kakaocorp.com/page/detail/11684); if(kakao)26(2026-10-13~14) 주제 "모든 연결에 지능을" — [kakaocorp.com](https://www.kakaocorp.com/page/detail/12131)

### Inferences
- 1인 프로젝트에 가장 직접 이식 가능한 관행은 (a) **ArchUnit/Konsist 수준의 계층 규칙 테스트**(배민이 "작은 프로젝트엔 과할 수 있다"고 경고했으니 규칙 3~5개로 최소화), (b) **스펙 파일 + 테스트 목록을 먼저 승인하고 AI가 구현**하는 워크플로(배민 FE 글 방식), (c) **장애 알림 → 대응 → 회고의 흐름을 작게라도 시스템화**(토스 세션, 우아콘 Kafka 장애 분석), (d) **LLM 기능은 게이트웨이·예산 한도·가드레일·트레이스·평가 데이터**를 갖춘 상태로 배포(토스 AI 플랫폼·벤치마크 글)이다.
- "AI 생산성 50~100%"에 회의적인 박경태 발언과 "테스트 8.5배 증가/버그 2배" 수치가 공개된 것은, 리뷰어가 **AI 사용 자체가 아니라 AI 산출물을 통제한 증거(테스트, 스펙, 리뷰 기록)**를 본다는 뜻이다.
- SSE로 실시간 알림을 보내는 우아콘 세션은 여행노트의 실시간 협업/알림에 SSE를 쓰는 선택이 "배민이 실제로 쓰는 패턴"으로 읽힐 수 있음을 보여준다.
- Kotlin 전환, 모듈러 모놀리스, OpenTelemetry 도입을 다룬 2025–2026 한국 대기업 블로그 글은 이번 조사에서 확보하지 못했다. 이 주제들은 "유행"보다는 조용한 기본값이 된 것으로 보이나 근거가 없으므로 단정할 수 없다.

### Gaps
- d2.naver.com(DEVIEW 2025), medium.com/coupang-engineering, medium.com/daangn(403), engineering.linecorp.com/ko, techblog.yanolja.com은 열람하지 못했다.
- 우아콘 2025 공식 세션 목록 페이지(2025.woowacon.com)는 DNS 해석 실패로 접근 불가. 세션 제목은 기술블로그 후기와 참관기에서 간접 확인했다.
- 인프콘 2025 세션 목록은 확보하지 못했다(인프런 페이지 404).
- 관측성(OpenTelemetry) 도입 사례, Kotlin 마이그레이션 사례, 포스트모템 공개 글은 2025–2026 범위에서 찾지 못했다.

---

## 4. 채용 담당자와 시니어가 사이드 프로젝트를 평가하는 기준

### Takeaway
회사가 직접 밝힌 기준은 "**문제의식 → 가설 → 해결 → 결과 → 어려웠던 점**"의 서술(토스), "**근거를 갖고 결정하고 설명한 경험**"(당근), "**장애를 겪고 해결한 경험**"(토스·당근), "**테스트 가능하고 이해하기 쉬운 코드와 코드 리뷰에 대한 관심**"(당근), "**모니터링·알림 구축, 빌드/테스트/배포 자동화**"(배민)로 수렴한다. 커뮤니티 의견은 "기술 선택 이유와 트레이드오프를 말할 수 있는가", "README에 실행 방법·기술 선택 이유·트러블슈팅", "배포까지 끝낸 프로젝트"를 반복한다.

### Cited Findings

**회사 직접**
- 토스 Server Developer(생산성) 이력서 가이드: "복잡한 비즈니스 문제를 찾아 적극적으로 개선한 경험과, 사용한 기술 스택 및 개선 정도를 구체적으로", **"프로젝트를 나열하기보다, 기여도가 높은 프로젝트의 문제의식, 가설, 해결 방식, 결과, 어려웠던 점을 자세히"**, "서비스 초기 단계에 참여한 경험" — [toss.im/career](https://toss.im/career/job-detail?job_id=6288478003)
- 토스 Server Developer(Product): "어려운 문제라도 끈기를 가지고 해결한 경험", "코드와 함께 성장하시는 분", 전형에 라이브 코딩 — [toss.im/career](https://toss.im/career/job-detail?job_id=4076140003)
- 토스뱅크 플랫폼 서버 공고(2차 게시): "구체적인 프로젝트 예시를 포함하고, 운영 문제를 어떻게 다뤘는지 기술" 요청 — [리멤버 검색 요약](https://career.rememberapp.co.kr/job/posting/313506) **[URL 매핑 불확실]**
- 당근 Identity Service: "성능·비용·보안처럼 서로 충돌하는 요구 사이에서, 근거를 갖고 결정을 내리고 그 결정을 설명해본 경험", "사용자 니즈를 파악하고 이를 기반으로 서비스를 지속적으로 개선해본 경험" — [careers.daangn.com](https://careers.daangn.com/jobs/role/5046759003/)
- 당근 광고 백엔드(2026-03): "코드 리뷰와 테스트 가능하고 이해하기 쉬운 코드 작성에 관심", 우대 "간단한 백오피스 도구를 만들 수 있는 능력" — [비즈니스피플](https://www.bzpp.co.kr/biz/businessDetailView/BR260325A00153)
- 당근 Frontend: 우대 "A/B 테스트 설계 및 분석 결과로 프로덕트를 개선", "모니터링 등 주요 지표를 측정하고 개선한 경험" — [careers.daangn.com](https://careers.daangn.com/jobs/role/7689088003/)
- 당근 인프라 백엔드: "레거시 시스템과 과거의 선택을 존중하면서 더 나은 방향으로 개선", "기술은 문제를 해결하는 수단" — [careers.daangn.com](https://careers.daangn.com/jobs/role/7644271003/)
- 배민 배민공통서비스 우대: "빌드·테스트·배포 자동화 경험", "시스템 모니터링 및 알림 구축 경험", "대용량 트래픽 서비스 안정 운영 경험" — [지행](https://zighang.com/recruitment/bfc89828-b8c5-491e-a2d9-baef444500e5)
- 토스 서버 챕터 FAQ(2022): 면접은 "이력서와 과거 프로젝트 중심", "어떤 프로젝트를 오너십 갖고 했고 비즈니스 문제를 어떻게 풀었는지", "코드 유지보수성", "운영·장애 대응·대용량 트래픽 경험", "자료구조·시간/공간 복잡도" — [toss.im/tossfeed](https://toss.im/tossfeed/article/toss-serverchapter-faq10)
- 당근 백엔드 엔지니어 인터뷰(2023-12, 홍보성): "주도적으로 일하는 걸 좋아하신다면", 탈락 후 "경험과 이력을 쌓고 합류하신 분들도 많아요", 도메인 경험 중시 — [careers.daangn.com/blog](https://careers.daangn.com/blog/post/%EB%8B%B9%EA%B7%BC-%EB%B0%B1%EC%97%94%EB%93%9C%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4-%EC%B1%84%EC%9A%A9-%EC%9D%B8%ED%84%B0%EB%B7%B0/)

**커뮤니티 [커뮤니티]**
- 인프런 커뮤니티 답변: 포트폴리오에 Kubernetes·Kafka·Redis·MSA가 나열되어 있으면 면접관은 "Kafka를 쓴 이유를 RabbitMQ나 Redis Pub/Sub과 비교해서", "MSA라면 서비스 간 트랜잭션과 데이터 일관성을 어떻게 보장했는지" 묻고, 신입 대부분이 "트렌드라서" 수준으로 답한다고 지적. "결과"보다 "과정과 사고흐름"에 초점 — [inflearn 커뮤니티](https://www.inflearn.com/vi/community/questions/1742305/이것도-포트폴리오에-넣어야할까요)
- 같은 스레드: "README를 잘 정리하고 실행 방법, 기술 선택 이유, 트러블슈팅까지 포함하면" 평가에 도움; "MSA라는 단어를 통해서 컴퓨터 기초 CS를 보게 되는 것"; "개인 프로젝트는 기본적으로 '유사 실무'로 보이기 때문에 퀄리티가 효과를 좌우" — 같은 출처
- 코멘토 현직자 답변(2026-07): 신입 백엔드는 "PDF를 기본으로 두고 GitHub나 웹사이트는 보조", **"백엔드는 '보이지 않는 영역에서 어떤 고민을 했는지', '어떻게 구조화하고 성능을 개선했는지'가 핵심"** — [comento.kr](https://comento.kr/job-questions/모든회사/sw개발/개발직군_신입%20공채%20지원%20시%20포트폴리오%20관련%20질문%20있습니다-632217)
- 이력서 작성 가이드(개인 블로그): "문제(왜) → 역할(누가) → 기술(어떻게, 왜 그걸 골랐는지) → 성과(뭐가 나아졌는지)" 순서, 성과는 수치로 — [youngju.dev](https://www.youngju.dev/blog/culture/2026-04-15-ai-era-developer-survival-strategy-complete-guide-copilot-cursor-claude-code-devin-context-engineering-career-portfolio-deep-dive-guide-2025) **[출처 불명확한 개인 글]**
- AI 개발자 취업 가이드(스파르타, 홍보성): "신입 서류 통과의 실질 조건은 학력이 아니라 배포까지 끝낸 포트폴리오", "배포된 URL" — [brunch.co.kr/@sparta/112](https://brunch.co.kr/@sparta/112)
- 이준 웍스피어 전무(TF미래전략포럼): "수시채용 시대에는 실제 경험과 문제 해결 능력이 스펙보다 중요" — [더팩트](https://news.tf.co.kr/read/economy/2357893.htm)
- GeekNews에 소개된 Addy Osmani 글(2026-03 주간 포함): "잘 문서화된 최소 하나의 실질적 프로젝트", AI API 통합 프로젝트 포함 권장; 댓글 kandk "도구만 바뀔뿐 본질은 같음"(CS 기본기) — [news.hada.io/topic?id=25769](https://news.hada.io/topic?id=25769)

### Inferences
- 회사 문구를 그대로 README/ADR 구조로 옮기면 된다: **문제의식 → 가설 → 선택지와 트레이드오프(근거) → 결과(수치) → 어려웠던 점/장애 회고**. 토스 가이드와 당근 자격요건이 정확히 이 순서다.
- "장애를 겪고 해결한 경험"은 토스·당근 모두 자격요건이다. 1인 프로젝트라도 실제 사용자(지인 포함)에게 배포한 뒤 알림(Grafana alert/Sentry) → 대응 → 포스트모템 문서 1~2건을 남기면 이 항목을 직접 충족한다.
- "A/B 테스트·지표 측정·개선"(당근 FE), "사용 데이터로 우선순위 결정"(배민 플랫폼 글)이 반복되므로, 이벤트 로깅 + 간단한 대시보드(PostHog/자체 Grafana)로 실제 사용 지표를 보여주는 것이 "진짜 운영"의 증거가 된다.
- "간단한 백오피스 도구"(당근)와 "어드민 스튜디오"(배민)가 등장하는 것을 보면 여행노트에 작은 어드민 화면(사용자/일정 조회, 피처 플래그)을 두는 것도 좋은 신호다.
- 테스트 코드 작성은 배민 CS프로덕트실에서 **자격요건**, 당근 광고에서 "관심"으로 명시되어 있다. 커버리지 숫자보다 "테스트 피라미드가 어떻게 생겼고 어떤 버그를 잡았는지"가 읽힌다.

### Gaps
- 네이버·쿠팡·카카오·라인이 사이드 프로젝트 평가 기준을 **직접** 밝힌 2025–2026 자료는 찾지 못했다(전형 절차만 확인).
- 우아한테크코스/부스트캠프 2025 평가 후기, 인프콘 2025 커리어 세션, 개발바닥 등 유튜브 발언은 검색 한도 소진으로 확인하지 못했다.
- "실제 사용자 수"나 "비용 인식"을 명시적으로 평가한다는 1차 자료는 없다(당근 인프라 공고의 "비용 가시화", 토스 AI 플랫폼의 "예산 한도"가 간접 증거).

---

## 5. 2026년에 과대평가되거나 부정 신호로 여겨지는 것 (오버엔지니어링, 이력서 주도 기술, 테스트/모니터링 부재)

### Takeaway
회사가 "레드 플래그"를 직접 명문화한 자료는 없지만, 회사 블로그 스스로가 **Temporal 미도입(과한 인프라)**, **ArchUnit은 작은 프로젝트엔 과할 수 있음**, **AI 의무감 사용의 비효율**, **AI 코드 이해 속도 한계**를 경고하고 있다. 커뮤니티는 "트렌드라서 쓴 Kafka/MSA", "왜 되는지 모르는 코드", "설명 못하는 기술 선택"을 가장 흔한 탈락 패턴으로 꼽는다.

### Cited Findings
- 우아한형제들(2026-09): Temporal 도입을 "학습 곡선, 별도 인프라 운영, 엔진 디버깅 난이도, 벤더 락인" 때문에 보류하고 필요한 4개 개념만 자체 구현. **"Temporal이 모든 악기를 갖춘 풀편성 오케스트라라면, Flowkit은 이 곡에 필요한 몇 악기만 뽑아 가벼운 실내악으로 편곡한 셈입니다."** — [techblog.woowahan.com/26832](https://techblog.woowahan.com/26832/)
- 우아한형제들(2026-09): ArchUnit 글의 주의사항 — "freezing 남용은 레거시 부채 보존", "규칙 세트가 커질수록 유지 비용 증가, 핵심 규칙부터", **"작은 단일 모듈 프로젝트는 설정이 노력 대비 가치가 없을 수 있다"** — [techblog.woowahan.com/26835](https://techblog.woowahan.com/26835/)
- 우아한형제들 박경태(우아콘 2025): "의무감" 때문에 불필요한 곳에도 AI를 억지로 써서 효과가 작았다; 외부 기대(50~100%)와 현장 체감 괴리 — [바이라인네트워크](https://byline.network/2025/10/1030/)
- 우아한형제들 FE(2026-09): 초반에 코드를 안 읽고 넘겨 디버깅이 느려졌고, AI는 "묻지 않으면 확인하지 않았습니다"(중복 로직). 출시 후 버그가 이전 폼(2건)보다 많은 4건 — [techblog.woowahan.com/27604](https://techblog.woowahan.com/27604/)
- 당근 인프라 공고: "기술은 문제를 해결하는 수단이라고 생각해요", "레거시 시스템과 과거의 선택을 존중" — [careers.daangn.com](https://careers.daangn.com/jobs/role/7644271003/)
- 커뮤니티: 포트폴리오에 "쿠버네티스, Kafka, Redis, MSA" 나열 시 "RabbitMQ·Redis Pub/Sub 대비 Kafka 선택 이유", "분산 환경에서의 데이터 일관성은 어떻게 보장하셨나요?"를 묻고 대부분 "트렌드라서"로 답한다는 지적 — [inflearn 커뮤니티](https://www.inflearn.com/vi/community/questions/1742305/이것도-포트폴리오에-넣어야할까요) **[커뮤니티]**
- 바이브코딩 가이드(위키독스, 개인): "AI가 보안 조치를 스스로 챙겨주지 않는 경우가 많다", "'왜 되는지 모르는 코드'를 피하라", "프로토타입·개인 도구는 가능하지만 상용 서비스급 품질에는 설계·검증 역량 필요", 면접에서 "AI가 만든 코드를 디버깅하고 검증할 최소 역량" 필요 — [wikidocs](https://wikidocs.net/295243) **[커뮤니티]**
- 마이크로서비스 2025 가이드(개인 블로그, 2차 인용): Amazon Prime Video 모놀리스 회귀 사례, DHH의 과잉 엔지니어링 비판, Shopify 모듈러 모놀리스; "조직 규모와 도메인 복잡도에 따라 MSA가 맞는 경우가 분명히 있다" — [youngju.dev](https://www.youngju.dev/transcribe/culture/2026-03-23-microservices-architecture-2025-complete-guide) **[커뮤니티, 수치 미검증]**
- 진학사 캐치 김정현 본부장(2026-09): "AI 사용 자체는 보편화됐지만, 업무 문제를 정의하고 프롬프트를 설계하거나 AI와 협업해 복합적인 문제를 해결하는 능력에는 분명한 차이가 있다" — [한국경제 2026-09-21](https://www.hankyung.com/article/202609218172H)

### Inferences
- 1인 B2C 앱에서 MSA·Kafka·Kubernetes를 넣는 것은 공고 키워드와는 맞지만, 면접에서 "왜"를 못 버티면 역효과다. 대신 **"모놀리스를 모듈 경계(패키지/ArchUnit 규칙)로 나누고, 필요 시 분리 가능한 구조"**를 ADR로 남기는 편이 배민의 Flowkit 사례와 같은 "필요한 만큼만" 서사가 된다.
- 레드 플래그를 피하는 가장 효과적인 장치는 **ADR 파일에 "고려한 대안과 기각 이유"를 적는 것**이다. 커뮤니티가 꼽는 탈락 질문("RabbitMQ 대비 Kafka?")이 전부 "대안 비교" 질문이기 때문이다.
- "AI 코드 이해 속도 한계"(배민), "AI가 보안을 안 챙김"(커뮤니티)은 AI로 만든 사이드 프로젝트에서 **보안 체크(의존성 스캔, 시크릿 관리, 인증 흐름 설명)**와 **핵심 경로 직접 작성/리뷰 기록**이 없으면 부정 신호가 될 수 있음을 시사한다.
- 테스트·모니터링 부재가 레드 플래그라는 **직접 문장**은 찾지 못했으나, 배민·당근 공고가 이를 자격요건/우대로 명시하므로 부재는 곧 "요건 미충족"으로 읽힌다.

### Gaps
- "레드 플래그 목록"을 공개한 한국 대기업 채용 담당자 자료는 없다. 위 내용은 블로그 경고와 커뮤니티 의견의 조합이다.
- "AI 래퍼 앱"을 부정적으로 평가한다는 한국 1차 자료는 찾지 못했다.

---

## 6. AI 시대의 기대치 (코딩 에이전트 활용, LLM 기능, 평가, AI 코드리뷰)

### Takeaway
2025 하반기부터 공고와 공채에 "AI 네이티브"(카카오·당근)가 명문화됐고, 당근은 **"Claude Code, Codex 같은 코딩 에이전트로 본인만의 AI 워크플로우"**를 우대, **"AI 도구를 적극적으로 활용해 만들고 검증하는 속도"**를 자격요건으로 적었다. 기업 블로그는 AI 사용 자체보다 **컨텍스트 설계(규칙 파일·스킬·플러그인), 스펙·테스트로 AI 통제, LLM 기능의 게이트웨이·예산·가드레일·도메인 평가**를 성숙도 지표로 제시한다. "AI 코드리뷰를 CI에"는 카카오(CodeBuddy, 2024)·당근(공고 문구)·배민(해커톤 산출)에서 확인된다.

### Cited Findings
- 카카오 2026년도 그룹 신입 공채(2025-09-03 발표): **"AI 기술 활용에 익숙하고 적극적인 'AI 네이티브' 인재 선발에 초점"**; 정신아 의장 "남다른 질문으로 창의적인 답을 찾아낼 줄 아는 젊은 인재". 6개 계열사, 전형은 서류·코딩테스트·면접 — [kakaocorp.com](https://www.kakaocorp.com/page/detail/11688)
- 당근 Frontend 공고: "AI 네이티브를 지향해요"; 우대 "Claude Code, Codex 같은 코딩 에이전트로 본인만의 AI 워크플로우를 만들어 일하시는 분" — [careers.daangn.com](https://careers.daangn.com/jobs/role/7689088003/)
- 당근 인프라 백엔드 공고: 자격요건 "AI 도구를 적극적으로 활용해 만들고 검증하는 속도를 높이고 계신 분"; 팀 문화 "AI 컨텍스트를 저장소에 적용", "코드리뷰에 AI를 활용", "반복 워크플로를 AI로 자동화" — [careers.daangn.com](https://careers.daangn.com/jobs/role/7644271003/)
- 우아한형제들 공고 기술스택에 "GitHub Copilot" 명시(2025-10) — [지행](https://zighang.com/recruitment/bfc89828-b8c5-491e-a2d9-baef444500e5)
- 우아한형제들 ArchUnit 글: 팀 규칙을 `.claude/rules/`로 관리, AI 에이전트가 "세션 컨텍스트에 따라 규칙을 어기기도" 해서 테스트로 강제; AI가 규칙 문서→테스트 변환, 레거시 위반 분류, 생성자 주입 전환 같은 기계적 수정 수행 — [techblog.woowahan.com/26835](https://techblog.woowahan.com/26835/)
- 우아한형제들 FE 글: Claude Code 스킬로 "디자인 시스템 문서에서 컴포넌트 선택 → 뷰 구현 → Storybook 스크린샷을 디자인과 비교, 최대 5회 반복" 워크플로; 스펙(`index.spec.md`)과 테스트 목록을 사람이 승인 후 구현 — [techblog.woowahan.com/27604](https://techblog.woowahan.com/27604/)
- 우아한형제들 플랫폼 글(2026-10): LLM Wiki·Skills로 에이전트에 정책/도메인/코드 컨텍스트 제공, BigQuery MCP, Playwright로 에이전트가 브라우저 테스트 실행, Jira·MR diff로 테스트 케이스 생성, "핵심 시나리오는 사람 리뷰 유지" — [techblog.woowahan.com/27821](https://techblog.woowahan.com/27821/)
- 우아콘 2025 디자인시스템 세션: 사내 디자인 시스템 가이드 MCP 서버 — [velog 후기](https://velog.io/@qorgkr26/woowacon-2025)
- 토스 Harness 글(2026-02): Claude Code 플러그인·훅·슬래시 명령·Claude Agent SDK; "작업 전에 컨텍스트를 설계했느냐"가 결과 차이; 사람 승인(HITL)·프롬프트 리뷰 강조 — [toss.tech/article/45519](https://toss.tech/article/45519)
- 토스 Benchmark(2026-09): 공개 리더보드와 실제 업무 상관 ρ +0.02; 자체 평가(정책 준수 IFBench, 도메인 지식)를 서비스 로그로 구축 — [toss.tech/article/toss-benchmark](https://toss.tech/article/toss-benchmark)
- 토스 AI 플랫폼(2026-10): 데이터 등급 L1~L4, 예산·TPM 한도, 입력 가드레일, 모델 호출 권한과 도구 실행 권한 분리, Langfuse 트레이스, PII 마스킹 — [toss.tech/article/ai-platform-foundation](https://toss.tech/article/ai-platform-foundation)
- 카카오 CodeBuddy(if(kakao)24): 온프레미스 AI 코드리뷰, "AI를 새로운 동료로" — [speakerdeck](https://speakerdeck.com/kakao/ifkakao24-28); 카카오 2026-10 글 "데이터 분석 에이전트를 만들며 배운 컨텍스트 설계" — [tech.kakao.com/posts/838](https://tech.kakao.com/posts/838)
- 우아콘 2025 박경태: AI는 5단계 중 3단계 "에이전트" 단계, "사람이 문제를 정의하면 독립 작업 수행", AI가 문제를 스스로 정의하지는 못함 — [바이라인네트워크](https://byline.network/2025/10/1030/)
- 한국경제·진학사 캐치 설문(2026-09-21, 20대 1,026명): 69% "바이브코딩 활용 능력이 취업 경쟁력에 영향"; 중요 역량 1위 "AI에 정확하게 요구사항을 전달"(35%), 2위 "문제 정의·기획"(18%), "코딩 등 IT 기본 지식" 10%. 넥슨 관계자 "부서 상관없이 AI를 활용해 어떤 일을 해봤는지, 바이브코딩을 해봤는지를 물어본다"; LG전자 자소서에 AI 경험 문항 추가, 두산 전 직군 AI 역량 테스트 — [한국경제](https://www.hankyung.com/article/202609218172H)
- GeekNews(Addy Osmani 글 소개): Cursor, Claude Code, Gemini CLI, Antigravity 언급; "개발자의 84%가 AI 보조 도구를 정기적으로 사용"; 주니어 채용 9~10% 감소(Harvard 연구 인용) — [news.hada.io/topic?id=25769](https://news.hada.io/topic?id=25769) **[2차 인용]**

### Inferences
- 리뷰어가 볼 수 있는 "AI를 잘 쓴 증거"는 레포 안에 있다: **`CLAUDE.md`/`.claude/rules/`/`AGENTS.md`(컨텍스트 설계), 스펙 파일과 테스트 목록이 구현보다 먼저 커밋된 이력, AI 리뷰 코멘트가 남은 PR, 아키텍처 규칙 테스트**. 배민·토스 글이 이것을 "하네스"·"경계"라고 부른다.
- 여행노트에 LLM 기능(일정 추천 등)을 넣는다면 토스 AI 플랫폼 글의 최소 축소판 — **프로바이더 어댑터, 예산/레이트 한도, 입력 가드레일, 트레이스(Langfuse 등), PII 마스킹, 프롬프트 버전 관리** — 과 토스 벤치마크 글의 **"실제 서비스 로그 기반 평가 세트 + 같은 기준으로 모델 비교"**를 작게라도 갖추면 "책임 있게 배포한 AI 기능"으로 읽힌다.
- "AI 네이티브"는 카카오·당근 공식 어휘이므로 README 상단에 AI 워크플로 섹션(어떤 도구, 어떤 규칙, 무엇은 사람이 직접)을 두는 것은 과하지 않다. 단, 배민 FE 글처럼 **"사람이 챙긴 것"**을 같이 적어야 "왜 되는지 모르는 코드" 의심을 피한다.
- AI 코드리뷰를 CI에 붙이는 것(예: PR마다 에이전트 리뷰)은 카카오·당근·배민이 모두 하고 있는 일이라 "실무에서 쓰는 관행"으로 읽히지만, 사람 리뷰 대체가 아니라 보조라는 점(배민 "핵심 시나리오는 사람 리뷰")을 문서에 남겨야 한다.

### Gaps
- "Claude Code/Cursor 활용 우대"를 명시한 네이버·쿠팡·카카오·라인·토스의 **공고 원문**은 확인하지 못했다(당근만 직접 확인, 카카오는 공채 보도자료).
- "evals 작성 능력"을 채용 요건으로 적은 공고는 없었다(토스 블로그에서 관행으로만 확인).
- 토스 Harness 글은 저자 스스로 "방향성과 가설에 가깝다"고 밝혀, 조직 전체의 공식 정책으로 보기는 어렵다.

---

## 7. 종합: 여행노트(Next.js + Kotlin/Spring Boot + PostgreSQL)에 대한 함의 (추론)

이 섹션은 위 근거에서 도출한 추론이며 새 인용은 없다.

**채택하면 "읽히는" 것 (공고·블로그 어휘와 직접 일치)**
- Kotlin + Spring Boot + JPA/Hibernate(+ 복잡 조회만 QueryDSL) — 토스·당근·배민 공통.
- 도메인 모델링과 계층 규칙을 ArchUnit/Konsist 테스트 3~5개로 강제 — 배민 2026-09 글 그대로. 단일 모듈이면 규칙 수를 최소화.
- Spring Boot Actuator + Micrometer + Prometheus + Grafana + Loki, 에러는 Sentry — 배민/토스/당근 공고의 Grafana 공통분모.
- CI에서 테스트·ArchUnit·lint·보안 스캔, GitHub Actions + 컨테이너 배포 — 배민 "빌드·테스트·배포 자동화", 당근 스택 GitHub Actions/Argo CD.
- 실시간 알림/협업에 SSE — 우아콘 2025 세션과 동일 패턴.
- React + TypeScript + TanStack Query + Zustand, 접근성 셀렉터 기반 Playwright E2E, Storybook 디자인 시스템 — 당근/배민 공고 + 토스 세션.
- README/ADR: 문제의식 → 가설 → 대안과 기각 이유 → 결과 수치 → 어려웠던 점 → 장애 회고. PostgreSQL·Next.js·Kotlin 선택 이유를 각각 ADR 1건으로.
- AI 워크플로: `CLAUDE.md`/`.claude/rules/`, 스펙·테스트 목록 선승인, PR에 AI 리뷰 보조 + 사람 리뷰, "사람이 챙긴 것" 명시.
- LLM 기능은 어댑터·예산/레이트 한도·가드레일·트레이스·PII 마스킹·로그 기반 평가 세트를 갖춰서.

**피하거나 "왜"를 준비해야 하는 것**
- Kafka, Kubernetes, MSA, gRPC, GraphQL — 공고에는 있지만 전부 대용량/다서비스 맥락. 1인 B2C 앱에서는 ADR에 "현재 불필요, 분리 지점은 여기" 수준으로 언급만.
- Temporal 같은 무거운 워크플로 엔진 — 배민도 보류.
- 테스트 없는 AI 생성 코드, 보안 점검 없는 인증 흐름 — 배민 FE 글과 커뮤니티 경고에 정확히 해당.

---

## 출처 색인 (회사 직접 자료만)
- 토스: [Server Developer Product](https://toss.im/career/job-detail?job_id=4076140003), [Server Developer 생산성](https://toss.im/career/job-detail?job_id=6288478003), [서버 챕터 FAQ 2022](https://toss.im/tossfeed/article/toss-serverchapter-faq10), [TMC 25 세션](https://toss.im/tmc-25/sessions/engineering/server-21), [Harness 2026-02](https://toss.tech/article/45519), [Toss Benchmark 2026-09](https://toss.tech/article/toss-benchmark), [AI 플랫폼 2026-10](https://toss.tech/article/ai-platform-foundation)
- 당근: [채용 목록](https://careers.daangn.com/jobs/), [당근페이 Backend](https://careers.daangn.com/jobs/role/4511184003/), [Identity Service](https://careers.daangn.com/jobs/role/5046759003/), [인프라 Backend](https://careers.daangn.com/jobs/role/7644271003/), [Frontend 커뮤니티](https://careers.daangn.com/jobs/role/7689088003/)
- 우아한형제들: [ArchUnit 2026-09](https://techblog.woowahan.com/26835/), [전자계약서 AI 2026-09](https://techblog.woowahan.com/27604/), [배치→워크플로 2026-09](https://techblog.woowahan.com/26832/), [플랫폼 2026-10](https://techblog.woowahan.com/27821/), [우아콘 2025 후기 2025-11](https://techblog.woowahan.com/24289/), [블로그 목록](https://techblog.woowahan.com/)
- 카카오: [2026 신입 공채 보도자료](https://www.kakaocorp.com/page/detail/11688), [if(kakao)25](https://www.kakaocorp.com/page/detail/11684), [if(kakao)26](https://www.kakaocorp.com/page/detail/12131), [tech.kakao.com](https://tech.kakao.com/)
- 네이버: [2025 공채 기사](https://byline.network/2025/03/5-283/), [2022 백엔드 월간영입 PDF](https://recruit.navercorp.com/nufiles/naver/11-backend.pdf)
