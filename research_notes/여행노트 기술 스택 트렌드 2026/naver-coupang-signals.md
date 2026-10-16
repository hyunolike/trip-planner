# NAVER · Coupang (+ 야놀자/여기어때) 2025–2026 채용·기술블로그 시그널

조사일: 2026-10-15. 범위: 네이버(계열사 포함), 쿠팡, 그리고 빠르게 닿는 범위에서 야놀자/여기어때. 토스·당근·우아한형제들·카카오는 제외(다른 조사자 담당).

태그: [회사 직접] = 회사 도메인/공식 피드에서 직접 확인, [2차 게시] = 채용 미러 사이트·검색 스니펫, [커뮤니티] = 개인/제3자 정리.

접근 메모(어떤 소스를 못 읽었는지):
- `recruit.navercorp.com` 공고 목록은 JS 렌더링이라 빈 페이지("진행 중인 공고가 없습니다")만 보였고, 내부 목록 API(`/rcrt/loadJobList.do`)는 "접근권한이 없습니다"로 거부됨. 네이버 본사 경력 공고 원문은 못 읽었고, 계열사(네이버클라우드·네이버웹툰) 공고의 채용 미러본으로 대체.
- `coupang.jobs`는 curl/WebFetch 모두 403이거나, 목록 페이지는 열리지만 검색 필터가 동작하지 않아(687건 전체 노출) 공고 원문은 전부 미러 사이트(dreamworkhq, builtin, simplify, zighang, wanted)로 확인.
- `medium.com/coupang-engineering` 본문은 403이지만 RSS 피드는 읽힘.
- `d2.naver.com`은 WebFetch 차단이지만 Atom 피드와 `api/v1/contents` JSON이 읽혀 2025-02 ~ 2026-10 게시물 120건의 제목·날짜·본문을 확보.
- `deview.kr/2025`는 404(DEVIEW 2025는 열리지 않았고 팀네이버 통합 컨퍼런스 DAN25가 그 자리를 차지), `dan.naver.com/25`는 SPA 셸만 내려옴.
- `techblog.yanolja.com`은 `nol.yanolja.com`(소비자 사이트)으로 302 리다이렉트, `techblog.gccompany.co.kr`은 본문 403이지만 RSS는 읽힘.
- WebSearch 세션 예산이 중간에 소진되어 쿠팡 프론트엔드 공고와 DAN25 세션 목록은 추가 검색을 못 했음.

---

## KQ1. 네이버(계열사 포함) 2025–2026 백엔드/프론트엔드 공고가 요구하는 스택과 문구

### Takeaway
네이버 계열 공고는 "Java/Kotlin & Spring + RDB"를 기본으로 두고, Kubernetes 배포·운영, MySQL/Redis/Kafka/OpenSearch, 비동기·동시성 처리를 우대로 두며, 2026년 3월 네이버웹툰 공고에는 "Claude, Codex 등 AI 활용하여 개발 효율을 증대시킨 경험"이 우대사항으로 명시됐다. 네이버 본사 신입 공채는 백엔드를 "대규모 트래픽과 대용량 데이터… 최선의 성능과 보안"으로, 프론트엔드를 "JavaScript 등의 웹 기술… 고성능, 확장성"으로 정의하고 CS/코딩테스트 → 기술 역량 인터뷰 → 종합 역량 인터뷰 순으로 뽑는다.

### Cited Findings
- [회사 직접] 2025 팀네이버 신입 공채 Tech(접수 2025-03-05~03-17, 입사 2025-07-07). 전형: 서류 → 기업문화 적합도 검사 → "온라인 CS/코딩테스트"(3.22) → "기술 역량 인터뷰"(4월) → "종합 역량 인터뷰"(5월, NAVER 1784/그린팩토리 대면). Back-end 직무 정의: "클라이언트의 요청에 따라 저장된 데이터를 활용하거나 비즈니스 로직을 처리하여 정확한 응답을 전달하는 서버를 개발합니다. 또한, 대규모 트래픽과 대용량 데이터를 다루는 시스템을 효율적으로 개발 관리하고 최선의 성능과 보안을 적용하여 안정적으로 서비스를 제공합니다." Front-end: "JavaScript 등의 웹 기술을 바탕으로 고성능, 확장성을 갖춘 시스템을 구축합니다… 다양한 엔지니어링, 디자인 팀과 협업합니다." 지원 자격은 2026년 2월 이내 졸업 예정 또는 경력 1년 이하. — [recruit.navercorp.com/micro/teamnaver2025/tech](https://recruit.navercorp.com/micro/teamnaver2025/tech)
- [2차 게시] 같은 공채의 코딩테스트 언어 선택지가 "C, C++, Java, JavaScript, Python3, Swift, Kotlin"으로 안내됐다는 검색 스니펫(원문 페이지에서는 직접 확인 못 함). — [recruit.navercorp.com/micro/teamnaver2025/tech](https://recruit.navercorp.com/micro/teamnaver2025/tech) (스니펫)
- [2차 게시] 네이버웹툰 "라인망가 Back-End 개발 담당자" (게시 2026-03-05, 정자동 그린팩토리). 자격: "백엔드 개발 관련 경력을 최소 3년 이상", "Java/Kotlin & Spring 기반 서버 개발 경험이 있으신 분", "수십만 라인 이상의 프로젝트에 대한 빠른 분석 능력", "백엔드 및 RDB 기반 시스템 구현 경험과 웹 서비스 인프라에 대한 이해". 우대: "대용량 트래픽 처리 및 비동기/동시성 프로그래밍 경험", "MySQL, Redis, OpenSearch, Kafka 등 다양한 데이터 처리 기술 경험", "Kubernetes 환경에서 서비스를 배포하고 운영해본 경험", "전자상거래/결제 또는 글로벌 서비스 개발 경험", "Claude, Codex 등 AI 활용하여 개발 효율을 증대시킨 경험이 있으신 분". 담당업무에 "Kubernetes 기반 서비스 무중단 배포", "CI/CD 파이프라인 구축", "모니터링 및 성능 개선"; 스택에 ArgoCD, Jenkins, GitHub Actions. 테스트 관련 문구 없음. — [bzpp.co.kr BR260305A00042](https://www.bzpp.co.kr/biz/businessDetailView/BR260305A00042)
- [2차 게시] 네이버클라우드 "NCP BE 개발 (경력)" (게시 2026-02-02, 마감 2026-02-20, 경력 1~3년, 경기). 담당: "백엔드 API 및 서버 어플리케이션 개발", "클라우드 인프라 구성 및 운영 자동화 지원", "서비스 성능 개선 및 안정성 확보", "대용량 트래픽 서비스의 확장 가능하고 적응력 있는 아키텍처 연구 개발". 자격: "Java, Kotlin, Python, Go 중 하나 이상의 프로그래밍 언어 사용 능력", "Linux 환경에 대한 기본적인 이해", "Git 등 형상 관리 도구 활용 능력". 우대: "Docker, Kubernetes 등 컨테이너 기술 활용 경험", "CI/CD 파이프라인 구축 및 운영 경험", "RESTful API 설계 및 개발 경험", "고성능 서비스 개발 및 성능 개선 경험". Spring·DB·테스트·AI 문구 없음. — [zighang.com/recruitment/40d66934…](https://zighang.com/recruitment/40d66934-8776-4486-b208-ec39c9b1a8f7)
- [회사 직접, 날짜 주의] NAVER Careers 팀 소개 정적 사이트(naver-career.github.io, MkDocs). GitHub API 기준 해당 백엔드 페이지 파일의 마지막 커밋은 2026-05-18이지만 본문에 "vlive" 등 옛 서비스명이 남아 있어 문구 자체는 더 오래됐을 수 있음. 뉴스플랫폼 Back-end 자격: "Java/Spring 혹은 Node.js 프레임워크 기반의 웹서비스 개발 경험", "RDBMS 기반의 데이터 모델링 및 개발 경험", "객체지향, 리팩토링, 자동화 테스트에 대한 기본 지식", "웹 사이트 및 API 운영, 개발 경험"; 우대: "MongoDB, Redis 기반의 응용 개발 혹은 성능 개선 경험", "이벤트 기반 데이터 파이프라인 구축이나 MQ를 활용한 어플리케이션 개발 경험", "Restful, GraphQL API 구축 및 개발 경험", "Docker, Kubernetes 등 컨테이너 플랫폼에서의 빌드 및 운영 경험". 콘텐츠피드백플랫폼: "Java, Spring Framework 에 익숙하신분", "RDBMS(MySQL/MSSQL/Oracle 등) 모델링", "Redis 기반의 응용 개발 혹은 성능 개선 경험", "객체지향, 리팩토링, 자동화 테스트에 대한 기본 지식"; 우대 "Reactive Streams… Reactor", "Message Queue", "kubernetes 기반의 응용 프로그램 개발 경험". 스포츠플랫폼: "MSA 기반의 백엔드 시스템 개발 및 React 기반의 UI 개발", "Spring Framework 기반의 웹어플리케이션 개발/운영 경험", 우대 "Docker 및 Kubernetes", "React 기반의 웹개발 경험". — [naver-career.github.io/kr/service/media/back-end/](https://naver-career.github.io/kr/service/media/back-end/)
- [2차 게시, 범위 밖 참고] 2022년 네이버 월간영입 Back-End PDF는 "Java, Kotlin, Spring Framework 기반 서버 개발에 익숙하신 분"과 RESTful API 설계를 필수로 둠(2025 이전 자료라 배경 참고만). — [recruit.navercorp.com/nufiles/naver/11-backend.pdf](https://recruit.navercorp.com/nufiles/naver/11-backend.pdf)
- [2차 게시, 날짜 미확인] 네이버파이낸셜 프론트엔드 공고(원티드, 마감): 경력 2년 이상, "JavaScript(ES5 이상)와 CS 기본 지식", "React.js 실무 경험 1년 이상", 전형은 서류 → 코딩테스트 → 1차면접 → 인성검사 → 최종면접. — [wanted.co.kr/wd/39693](https://www.wanted.co.kr/wd/39693)

### Inferences
- 네이버 계열 공고에서 Kotlin은 "Java/Kotlin"으로 병기되는 수준이며 Spring은 공통분모다. Kotlin+Spring Boot 선택은 안전하되, Java 독해·상호운용성을 README나 코드에서 보여주면 손해가 없다.
- "Kubernetes 환경에서 배포·운영", "CI/CD 파이프라인", "모니터링 및 성능 개선"이 반복되므로 사이드 프로젝트에 Dockerfile + k8s 매니페스트(또는 최소 compose) + GitHub Actions 파이프라인 + 메트릭 대시보드가 있으면 공고 문구와 1:1로 대응된다.
- 네이버 쪽 공고가 명시적으로 요구하는 테스트 문구는 "객체지향, 리팩토링, 자동화 테스트에 대한 기본 지식" 정도이고, 세부 도구를 지정하지 않는다. 테스트는 "있다"보다 "어떤 경계를 어떻게 검증했는가"가 평가축이 될 가능성이 크다(KQ2의 D2 글과 일관).
- 2026년 공고에 AI 도구 활용 경험이 우대사항으로 들어왔으므로, 프로젝트에 AGENTS.md/CLAUDE.md 같은 에이전트 지침과 AI가 만든 코드를 어떻게 검증했는지 기록을 남기는 것이 실제 공고 문구에 대응된다.

### Gaps
- 네이버 본사(검색·쇼핑·지도·파이낸셜)의 2025–2026 경력 공고 원문은 접근 거부로 확보하지 못했다. 위 계열사 공고와 신입 공채 정의로 추정만 가능.
- 네이버 계열 2025–2026 프론트엔드 경력 공고(React/TypeScript 요건 문구)는 찾지 못했다. 네이버파이낸셜 공고는 날짜 미확인.
- Spring Boot 버전, 가상 스레드, PostgreSQL 언급은 어느 공고에도 없었다(네이버는 MySQL/Redis/Oracle 중심).

---

## KQ2. 쿠팡 2025–2026 Software Engineer / Backend / Frontend 공고가 요구하는 스택과 문구

### Takeaway
쿠팡 백엔드 공고는 "Java/Kotlin/Spring + MSA + AWS + Kubernetes + Kafka"를 일관되게 요구하고, 가장 최근(2026년 10월 갱신) Staff 공고는 "명확한 경계, 강력한 계약, 포괄적인 테스트를 갖춘 시스템 설계"와 별도의 "AI & Harness Engineering" 섹션(Copilot, Claude Code, Devin, Cursor를 구현·테스트·코드 리뷰·문서화에 활용한 실무 경험, 측정 가능한 생산성 향상 실적)을 넣었다. 스택 한 줄은 거의 고정이다: "Cloud Native (AWS), MSA, Spring Boot, JPA, Elastic Stack, Docker, Kafka, Redis, MySQL, Cassandra". 프론트엔드 공고는 2025–2026분을 찾지 못했다.

### Cited Findings
- [2차 게시] Staff Back-end Engineer (eCommerce Engineering; Interstellar), Seoul, "zz-Evergreen Requisition", 미러 기준 "Updated today"(2026-10 조회). 팀: "쿠팡의 모바일 앱과 웹에서 가장 핵심적인 페이지인 홈, 검색, 카테고리, 상세 페이지, 장바구니, 결제, 주문을 구동하는 핵심 백엔드 플랫폼을 구축, 운영, 확장합니다." 책임: "명확한 경계, 강력한 계약, 포괄적인 테스트를 갖춘 시스템을 설계하여 깊은 아키텍처 문제를 해결하고", "팀 전반에 걸쳐 AI 활용 사례와 자동화 도입을 주도하고", "다른 팀의 블로커를 해소하고 엔지니어의 커리어 성장과 엔지니어링 기본기에 대해 코칭함으로써 force multiplier 역할". 자격: "5년 이상의 Java/Kotlin/Spring 기반 서비스 개발 및 아키텍처 리더십 경험", "마이크로서비스 아키텍처 경험 및 이를 웹 스케일로 확장한 경험", "크리티컬 시스템 이슈에 대한 딥다이브 및 처리 경험". 우대: "Spark, Cassandra, Kafka, Airflow를 활용한 데이터 파이프라인 개발 경험", "Kubernetes 환경 개발 경험", "AWS 기반 클라우드 컴퓨팅 경험", "Java / IntelliJ / Spring 환경 경험". 별도 섹션 "AI & Harness Engineering": "AI 보조 소프트웨어 엔지니어링 도구(Copilot, Claude Code, Devin, Cursor)를 구현, 테스트, 코드 리뷰, 문서화 전반에 활용한 실무 경험", "팀 내 AI 모범 사례 수립 및 도입 주도 경험", "AI 도구 도입을 통한 측정 가능한 생산성 향상 실적"(PR 처리량, 사이클 타임, 코드 품질). 관측성·온콜 문구는 없음. — [dreamworkhq.com/job/ee6f6e1e…](https://www.dreamworkhq.com/job/ee6f6e1e-926b-460f-8188-bb144c1becdd)
- [2차 게시] Senior Back-end Engineer (Eats Merchant), 본사 기준, 2026-02-17 마감 표시. "Own end-to-end development of Eats Merchant services", "Ensure site reliability to deliver a seamless shopping experience". 자격: "4+ years of coding experience in Java or other object-oriented programming languages", "Proficiency with AWS and the Spring Framework", 대규모 분산 시스템 4년+. 스택: "Cloud Native (AWS), MSA, Spring Boot, JPA, Elastic Stack, Docker, Kafka, Redis, MySQL, Cassandra". 문화: "fast-paced, startup-like culture within a large organization", "we are bold and ambitious people that like to get our hands dirty". 테스트·관측성·온콜 문구 없음. — [builtin.com/job/senior-back-end-engineer-eats-merchant/7929628](https://builtin.com/job/senior-back-end-engineer-eats-merchant/7929628)
- [2차 게시] Staff Software Engineer (Merchant Systems, Coupang Eats), Bengaluru, 게시 2026-06-10(현재 INACTIVE). "Serve as a key engineer who makes decisions on the system design", "Obsesses over data consistency and availability to guarantee great merchant experience", "Taking responsibility of code review/design review, and raise up the bar of engineering excellence". 자격: "Over 10 years of experience in back-end development", "Proficient in Java/Kotlin and Spring framework, data processing frameworks (Spark, Airflow, etc.)". 스택 동일("Cloud Native (AWS), MSA, Spring boot, JPA, Elastic stack, Docker, Kafka, Redis, MySQL, Cassandra etc"). — [simplify.jobs/p/d14db8e7…](https://simplify.jobs/p/d14db8e7-623d-413d-a120-98c3b0327294/Staff-Software-Engineer)
- [2차 게시] 백엔드 개발자 (8년 이상), Global Operations Technology, 서울, 게시 2025-09-02(마감). 자격: "Java 및 Spring 프레임웍을 이용한 Web Application 개발 경험", "관계형 데이터베이스 경험", "객체지향 설계 및 개발 능력". 우대: "Microservices 아키텍처 기반의 시스템 개발 경험이나 이해", "Cloud 환경에서의 서비스 개발 및 운영", "대용량 처리를 위한 비동기 Event Driven Architecture 경험", "코드 품질을 향상 시키기 위한 개발 경험", "JPA, Hibernate등 ORM사용과 도메인 모델링 경험", "빌드/테스트/배포 자동화 경험", "NoSQL(Memcached, Redis)을 이용한 대용량 데이터 처리 경험", "Agile 경험". — [zighang.com/recruitment/f23f3d21…](https://zighang.com/recruitment/f23f3d21-915d-4ba2-bcd8-e66df2880df7)
- [2차 게시, 날짜 미확인·마감] Coupang Pay Staff Backend Engineer (Risk Engineering), 송파: "Java(kotlin), Spring, MSA환경의 이해도 높으신 분", "6년 이상의 backend architecture 설계 및 구현 경험", FDS/AML에 "AI, ML기술을 접목". — [wanted.co.kr/wd/199916](https://www.wanted.co.kr/wd/199916)
- [2차 게시, 스니펫만] 검색 스니펫상 Senior Backend (Core Data-Serving, Seoul)는 Java, Kotlin, MSA, AWS, Kubernetes, Spark, Hadoop, Cassandra, Kafka, Airflow를 Required Skills로 나열; Senior Staff Back-end (eCommerce)는 "7+ years of experience in Java/Kotlin/Spring-based service development… Hands-on experience with AWS and Kubernetes"; Senior Ads Backend는 "RESTful, GraphQL, or gRPC APIs"와 메시지 기반 분산 아키텍처를 요구하고 Java/Kotlin을 명시하지 않음; 쿠팡미디어그룹 Senior Back-end (Advertiser Platform)는 Java, Spring, Kotlin, AWS, MySQL, Kafka, Spring Boot 배치를 언급(원문 403으로 미확인). — [remoteleaf.com …senior-staff-back-end-engineer-ecommerce](https://remoteleaf.com/company/coupang/senior-staff-back-end-engineer-ecommerce-engineering-south-korea/), [remoteleaf.com …senior-back-end-engineer-coupang-ads](https://remoteleaf.com/company/coupang/senior-back-end-engineer-coupang-ads-engineering-south-korea/), [startup.jobs …advertiser-platform](https://startup.jobs/senior-back-end-engineer-advertiser-platform-coupang-1879090)
- [2차 게시, 범위 밖 참고] Staff 백엔드 Fulfillment Optimization(사람인, 2023-12~2024-05)은 사용 기술을 "Java 8, Spring Framework, AWS"로 적고 "코딩 핸즈온, 코드 리뷰, 개발 프로세스, 테스트 및 서비스 운영을 포함하여 End-to-End 어플리케이션 개발 사이클"을 우대. 2025 이전 자료. — [saramin.co.kr rec_idx=47207544](https://www.saramin.co.kr/zf_user/jobs/view?rec_idx=47207544)
- [커뮤니티, 날짜 미확인] 연차별 요구사항 정리 사이트의 쿠팡 FE 항목: "Web Frontend 개발 분야 8년 이상", JavaScript/TypeScript/React/Redux/Vue.js/Angular, Webpack/Babel/Jest/Storybook, "재사용 가능한 UI 컴포넌트 제작 경험". 원 공고 날짜 미상. — [rbye.vercel.app/t/frontend](https://rbye.vercel.app/t/frontend)
- [회사 직접] coupang.jobs Technology 팀 페이지(2026-10 조회)는 "29 Technology jobs" 중 12건을 노출하며 PM/데이터사이언스/ML/보안 위주. 서울 FE/BE 공고는 노출된 목록에 없음. — [coupang.jobs/en/teams/technology/](https://www.coupang.jobs/en/teams/technology/)

### Inferences
- 쿠팡 백엔드는 Java 우선·Kotlin 병기이며, JPA·Kafka·Redis·MySQL·Cassandra·AWS·Docker·Kubernetes가 반복되는 고정 스택이다. 사이드 프로젝트가 PostgreSQL을 쓰더라도 JPA 기반 도메인 모델링, 이벤트 발행(Kafka 또는 최소 outbox 패턴), Redis 캐시, 컨테이너 배포를 갖추면 문구 대부분에 대응한다.
- "명확한 경계, 강력한 계약, 포괄적인 테스트"는 모듈 경계(멀티모듈 또는 패키지 경계 검증), API 계약(OpenAPI 스펙 + 계약 테스트), 테스트 피라미드가 README에 드러나야 한다는 신호로 읽힌다.
- 2026년 쿠팡 공고는 AI 도구 사용을 "구현·테스트·코드 리뷰·문서화" 네 영역으로 쪼개서 묻고 "측정 가능한 생산성 향상 실적"을 요구한다. 프로젝트에 AI 활용 범위와 검증 방식, 가능하면 PR 수·리드타임 같은 숫자를 기록해 두는 것이 공고 문구에 직접 대응된다.
- 관측성·온콜은 공고 문구에 거의 없지만(“Ensure site reliability”, “크리티컬 시스템 이슈 딥다이브” 정도) 인터뷰 가이드류는 운영 모니터링·장애 대응 설명을 요구한다고 적는다. 런북과 장애 대응 기록이 있으면 차별점.

### Gaps
- 쿠팡 2025–2026 프론트엔드 공고 원문을 찾지 못했다(coupang.jobs 검색 필터가 fetch로 동작하지 않았고 builtin 검색은 0건, 검색 예산 소진). Next.js를 명시한 쿠팡 공고도 확인되지 않음.
- Spring Boot 버전, Java 버전(2024년 공고에 Java 8 표기만), PostgreSQL, 가상 스레드, 테스트 프레임워크 이름은 어떤 공고에도 없었다.

---

## KQ3. d2.naver.com 2025–2026 게시물과 DAN25에서 드러나는 기술·관행

### Takeaway
D2의 2025–2026 글은 (1) JVM/Spring 운영 디테일(요청 범위 캐시 애너테이션, 라이브러리 웜업, Spring Cloud Config HA, Kafka 프로듀서/Consumer Group v2), (2) 무중단 DB 전환(Oracle→MySQL 이중 쓰기, CDC 복제 도구 교체), (3) 관측성(OpenTelemetry Collector, VictoriaMetrics, Telegraf, RUM, 지능형 로그 파이프라인), (4) 테스트 철학(험블 객체 패턴, "커버리지만 올리는 건 곰팡이 위 벽지")과 AI 에이전트용 Playwright E2E 하네스, (5) 프론트엔드 성능(LCP p95 목표 2.5초)과 디자인시스템+AI 마크업 자동화, (6) AI 에이전트 전면 도입(Engineering Day 2026 전 직군 AI 해커톤, Claude Code 사용, "무엇을 AI에게 맡기지 않을 것인가")에 집중된다. DEVIEW 2025는 열리지 않았고 DAN25(2025-11-06~07)가 35개 기술 세션을 공개했다.

### Cited Findings
D2 피드·API 기준 날짜(UTC). 모두 [회사 직접].

**백엔드/JVM/Spring**
- "@RequestCache: HTTP 요청 범위 캐싱을 위한 커스텀 애너테이션 개발기" (2025-11-26): "하나의 HTTP 요청 내에서 동일한 외부 API를 여러 번 호출하거나 동일한 연산을 반복하는 경우"를 막는 "Spring 기반의 커스텀 애너테이션"; RequestAttribute 기반(FrameworkServlet이 요청 종료 시 자동 정리)을 택했고 ThreadLocal 방식은 "HTTP 요청, Kafka 메시지 처리 등 각 생명주기마다 수동으로 clear()"가 필요하고 "메모리 누수 위험"이 있어 배제. — [d2.naver.com/helloworld/7610642](https://d2.naver.com/helloworld/7610642)
- "API 호출식 웜업의 부작용을 넘어서 : 라이브러리만 데우는 JVM 웜업" (2025-11-19, Engineering Day 2025-10 세션): JIT 웜업을 API 호출 대신 라이브러리 단위로. — [d2.naver.com/helloworld/1580651](https://d2.naver.com/helloworld/1580651)
- "Spring Cloud Config HA 적용을 위한 커스터마이징" (2025-07-09): "배포없이 프로퍼티 동적 변경", SPOF 해소. — [d2.naver.com/helloworld/6269411](https://d2.naver.com/helloworld/6269411)
- "서비스 조직에서 Kafka를 사용할 때 알아 두어야 할 것들" (3)(4) 2025-06-27 "Kafka 프로듀서 최적화하기 + 압축 기능 활용하기", (5) 2025-11-20 "Consumer Group Protocol v2". — [helloworld/1025526](https://d2.naver.com/helloworld/1025526), [helloworld/3974242](https://d2.naver.com/helloworld/3974242)
- "스마트스토어센터 Oracle에서 MySQL로의 무중단 전환기" (2026-01-21): "기존 서비스는 Oracle DBMS 환경에서 JPA와 MyBatis를 사용", "Kubernetes 환경에서 MyBatis 및 Spring JPA를 사용하는 기존 Oracle DB 기반 서비스를 MySQL로 무중단 전환하고 롤백 가능성을 확보하기 위해 이중 쓰기(dual write) 기법을 채택", 마이그레이션 배치는 "Spring Batch로 작성… JdbcPagingItemReader". — [d2.naver.com/helloworld/6512234](https://d2.naver.com/helloworld/6512234)
- "6개월 만에 연간 수십조를 처리하는 DB CDC 복제 도구 무중단/무장애 교체하기" (2025-11-18): 네이버페이 차세대 아키텍처 Plasma 프로젝트가 7년 만에 2025년 7월 종료. — [d2.naver.com/helloworld/6388660](https://d2.naver.com/helloworld/6388660)
- "늘어가는 조회트래픽 Elasticsearch로 분산시키기" (2025-06-25, Feature Flag 언급), "SNOW의 Automatic Sharding 도입기" (2026-06-23), "Docusaurus를 이용한 API 문서 플랫폼의 진화" (2025-07-07, Redoc 기반 커머스 API 문서를 Docusaurus+Typesense로). — [helloworld/3675627](https://d2.naver.com/helloworld/3675627), [helloworld/4394359](https://d2.naver.com/helloworld/4394359), [helloworld/6196427](https://d2.naver.com/helloworld/6196427)

**관측성**
- "처음 만나는 OpenTelemetry (feat. Collector)" (2025-11-17): 검색 모니터링 플랫폼 SEER를 "OpenTelemetry, OpenSource 기반으로 전환"하며 OTel 생태계에 기여. — [d2.naver.com/helloworld/1104856](https://d2.naver.com/helloworld/1104856)
- "네이버 검색의 대규모 메트릭 저장소, VictoriaMetrics 운영기" (2025-04-22), "Inside VictoriaMetrics" (2026-06-02), "VictoriaMetrics 운영기 2편 — 장비 증설 없이 리소스 위기를 해결한 3단계 최적화 전략" (2026-07-21). — [helloworld/6475419](https://d2.naver.com/helloworld/6475419), [helloworld/5788040](https://d2.naver.com/helloworld/5788040)
- "Telegraf로 커스텀 지표 수집하기" (2025-11-18), "비용, 성능, 안정성을 목표로 한 지능형 로그 파이프라인 도입" (2025-12-17, 사내 통합 데이터 플랫폼 AIDA의 Logiss), "NELO Alaska: 대용량 로그 데이터 저장을 위한 Apache Iceberg 도입기" (2025-03-11). — [helloworld/8677833](https://d2.naver.com/helloworld/8677833), [helloworld/0004394](https://d2.naver.com/helloworld/0004394), [helloworld/8998207](https://d2.naver.com/helloworld/8998207)
- "End to End 유저 모니터링 RUM 으로 한방에 해결!!" (2026-06-29): 내부 솔루션 nFront RUM, "별도의 비용 없이 AI report까지 제공되는 Real User Monitoring". — [d2.naver.com/helloworld/9227131](https://d2.naver.com/helloworld/9227131)
- "SaaS 대체하기: AI와 함께한 광고SDK 에러 모니터링 시스템 구축기" (2026-06-16): "AI Agent를 활용해 전용 Javascript 에러 모니터링 시스템을 직접 구축". — [d2.naver.com/helloworld/8319114](https://d2.naver.com/helloworld/8319114)

**테스트**
- "테스트는 어떻게 좋은 코드를 만드는가(feat. 험블 객체 패턴)" (2025-03-18): "'테스트하기 좋은 코드가 좋은 코드다'… 프로그램 코드가 나쁘면 테스트 코드도 함께 나빠진다", "나쁜 테스트 코드를 방치한 채로 테스트 커버리지만 올리는 것은 곰팡이 핀 벽 위에 벽지를 바르는 것과 다름 없는 일", "테스트하기 어려운 행위와 테스트하기 쉬운 행위를… 분리"(험블 객체). — [d2.naver.com/helloworld/9921217](https://d2.naver.com/helloworld/9921217)
- "AI로 E2E 테스트를 찍어내다: MAFT" (2025-10-28): "API 문서만 주면 테스트 코드가 생성되고 자동으로 PR까지 생성", LLM 멀티 에이전트가 E2E 테스트 생성을 서브태스크로 분할. — [d2.naver.com/helloworld/3088532](https://d2.naver.com/helloworld/3088532)
- "AI 에이전트를 위한 Playwright E2E 테스트 하네스 구축하기" (2026-06-15, Engineering Day 2026-05): "AI 에이전트가 코드를 짜는 시대, 우리는 그 코드를 어떻게 믿을 수 있을까요? Playwright 기반 E2E 테스트를 구축하고, 에이전트가 직접 테스트 코드를 작성 및 검증하는 워크플로우"; 대상 독자 문구 "테스트가 실패하면 에이전트가 알아서 고치게 하고 싶어요". — [d2.naver.com/helloworld/6811215](https://d2.naver.com/helloworld/6811215)

**프론트엔드/성능/디자인시스템**
- "2024 네이버 통합검색의 웹 성능 리뷰" (2025-03-10): "LCP(Largest Contentful Paint)를 핵심 성능 지표로 삼아… LCP p95 기준 2.31초를 달성". — [d2.naver.com/helloworld/9582944](https://d2.naver.com/helloworld/9582944)
- "네이버 통합검색 AIB 도입과 웹 성능 변화 분석" (2026-01-19): "최근 네이버 통합검색의 LCP p95는 약 3.1초… 목표인 'LCP p95 2.5초 이하'를 상회"; AIB 영역이 LCP일 때 p75 4,573ms / p95 6,921ms vs 지도 영역 1,270ms / 3,369ms; 채팅형 UI에서는 스켈레톤·텍스트 애니메이션 때문에 LCP가 실제 체감을 반영하지 못한다고 분석. — [d2.naver.com/helloworld/4241703](https://d2.naver.com/helloworld/4241703)
- "디자인시스템이 AI를 만났을 때: FE 개발 패러다임의 변화" (2025-12-09, Engineering Day 2025-10): "네이버파이낸셜 디자인시스템과 AI를 이용하여 마크업 자동화"; 목차에 "디자인 토큰", "디자인 시스템 컴포넌트", "디자인시스템 Code Connect", "디자인시스템 instruction". — [d2.naver.com/helloworld/3442203](https://d2.naver.com/helloworld/3442203)
- "윈도잉(windowing) 기법을 적용한 고성능 표 컴포넌트 개발기" (2025-07-01/07-23). — [helloworld/4706492](https://d2.naver.com/helloworld/4706492)
- "[State of FE·JS Korea 2025] 설문조사 결과" (2025-06-09, 네이버 FE News 주관, 249명): "TypeScript를 주로 사용(74.7%)", "React를 계속 사용하겠다고 답변한 비율이 무려 94.38%", "Next.js의 사용률이 73%", "Zustand에 대한 긍정 답변… 85.08%로 1위", "Vite가 92.77%… Webpack… 34.54%가 다시 사용하지 않을 것", AI 도구 "ChatGPT(31.31%), Claude(18.47%), Cursor(17.03%)", 용도 "코드 어시스트(35.48%), 리팩토링(22.29%), 프로토타이핑(20.09%)". — [d2.naver.com/news/1353647](https://d2.naver.com/news/1353647), 전체 결과 [naver.github.io/fe-news/stateof-fejs/2025/](http://naver.github.io/fe-news/stateof-fejs/2025/)
- 네이버 FE 개발자 모임 H26y의 첫 공개 밋업 "[FE Ground] AI × Front-End: 코딩의 미래를 묻다" (2025-08-29). — [d2.naver.com/news/6518915](https://d2.naver.com/news/6518915)
- 여행 도메인 참고: "호텔 검색, 어떻게 달라졌을까요?" 1~4편 (2025-03-10: 문제와 해결 / 지식 증류 / 검색 시스템 / 이미지 검색), "홈피드: 네이버의 진입점에서 추천 피드를 외치다" (2025-06-26). — [helloworld/8366976](https://d2.naver.com/helloworld/8366976), [helloworld/0207214](https://d2.naver.com/helloworld/0207214)

**AI 에이전트 도입(개발 프로세스)**
- "나만의 Visual Studio Code Copilot 지침 만들고 활용하기" (2025-03-24). — [helloworld/6615449](https://d2.naver.com/helloworld/6615449)
- "AI와 함께하는 프로젝트 자동화" (2025-11-26, MCP 언급), "경험이 쌓일수록 똑똑해지는 네이버 통합검색 LLM Devops Agent" (2025-11-27). — [helloworld/3691494](https://d2.naver.com/helloworld/3691494), [helloworld/4199466](https://d2.naver.com/helloworld/4199466)
- "모두의 NAVER Engineering Day! D2에서 이어집니다." (2026-05-28): "한해동안 200개가 넘는 기술 세션", "올해는 AI 도구의 발달과 함께 전 직군이 더 다양한 기술 경험을 할 수 있는 행사로 확장", "약 150개의 온라인 기술 세션… 전 직군이 참여할 수 있는 AI 도구 핸즈온 워크숍… 마지막 날에는 다양한 직군이 한 팀을 이뤄 현업의 문제를 직접 풀어보는 해커톤". — [d2.naver.com/news/0766161](https://d2.naver.com/news/0766161)
- "[AI 해커톤 후기] AI 해커톤 1위 팀이 AI에게 맡기지 않은 것" (2026-07-24): "낯선 재무 업무를 이해하고 Claude Code를 활용해 실제로 동작하는 결과물을 만들어야 하는 상황"; 질문이 "AI가 할 수 있는 일보다 어떤 일을 맡겨도 되는지, 결과가 그럴듯한지보다 틀렸을 때 발견하고 설명할 수 있는지, 자동화할 수 있는지보다 AI가 멈춰도 업무가 계속될 수 있는지"로 바뀜; 작업 루프 "짧은 설계 문서 작성 → 구현 → 스크린샷·로그 등 테스트 증거 수집 → 발표 자료와 README 반영 → 문서와 실제 실행 흐름의 일치 여부 재검증"; 체크리스트 질문 "발표에서 설명한 기능이 코드에도 있는가", "보안상 위험한 동작은 없는가", "부분 구현을 완성된 기능처럼 설명하지 않았는가"; 사고: "로컬 테스트 데이터만 지우기 위해 만든 초기화 코드가 공용 개발 데이터베이스에 연결된 상태에서 실행… 최종 복구까지 20분 이상"; 결론 "무엇을 AI에게 맡기고, 무엇은 끝까지 맡기지 않을 것인가". 같은 시리즈: "AI 시대의 해커톤과 인간의 역할: AI의 계획과 사람의 전략" (2026-07-13), "코드와 문서만 읽은 LLM은 어떻게 사람과 같은 팀을 1위로 골랐을까" (2026-07-06). — [helloworld/4821538](https://d2.naver.com/helloworld/4821538), [helloworld/1883072](https://d2.naver.com/helloworld/1883072), [helloworld/2541696](https://d2.naver.com/helloworld/2541696)
- 에이전트 인프라 글: "Kelos - 쿠버네티스 네이티브 자율 코딩 에이전트 프레임워크" (2026-06-24), "사람과 AI Agent를 위한 통합 Context Provider 구축" (2026-06-22), "도구에서 동료로 — AI 에이전트 자율 성장 프레임워크" (2026-06-18), "AI 에이전트가 코드를 실험하고 개선하는 법" (2026-06-01), "AI 에이전트 회사 차리기" (2026-06-30, Claude Code 언급), "에이전트, 개념부터 같이 정리해봐요 - 워크플로우 · 하네스 · Context/Memory · MCP/A2A" (2026-10-01), "비개발자가 한 달 동안 풀스택으로 개발하면서 배운 것" (2026-06-04). — [helloworld/3015479](https://d2.naver.com/helloworld/3015479), [helloworld/7056385](https://d2.naver.com/helloworld/7056385), [helloworld/4399330](https://d2.naver.com/helloworld/4399330), [helloworld/8061804](https://d2.naver.com/helloworld/8061804), [helloworld/3897377](https://d2.naver.com/helloworld/3897377), [helloworld/8118359](https://d2.naver.com/helloworld/8118359), [helloworld/0107009](https://d2.naver.com/helloworld/0107009)

**DEVIEW/DAN**
- deview.kr/2025는 404. 네이버는 2025-11-06~07 코엑스에서 팀네이버 통합 컨퍼런스 DAN25를 열었고, D2 공지(2025-11-28)에 따르면 "총 35개의 기술세션" 영상이 DAN25 홈페이지와 네이버TV에 전부 공개됐다. 현장 참여율 TOP5 1위는 "네이버 PersonA - 지금 나를 이해하는 AI (LLM 기반 사용자 메모리 구축과 실시간 사용자 로그 반영 시스템 구현)", 2위 "데이터 속 숨은 트렌드, LLM이 답하다 : 랭킹 기반 플레이스 트렌드 분석 시스템"; 로그 파이프라인 세션(피크 트래픽 분산, 장애 시 로그 우선순위 차등 처리, 샘플링)도 포함. 키워드: "AI 에이전트, 소버린 AI, AX". — [d2.naver.com/news/9333656](https://d2.naver.com/news/9333656), [navercorp.com press seq=32102](https://navercorp.com/media/pressReleasesDetail?seq=32102)
- [2차 게시] DAN25에 "딥다이브 세션과 서비스&비즈니스 세션이 신설"; 전년 DAN24에는 80명 이상의 개발자가 42개 발표. — [byline.network 2025/09/30](https://byline.network/2025/09/30_naver/)

### Inferences
- 네이버 백엔드 글의 공통 관심은 "운영 중인 시스템을 무중단으로 바꾸는 법"(이중 쓰기, CDC 교체, 롤백 가능성)과 "요청 단위 성능 디테일"(요청 범위 캐시, 웜업)이다. 사이드 프로젝트라도 스키마 마이그레이션 전략, 롤백 경로, 요청 단위 중복 호출 제거 같은 운영 관점이 README에 있으면 네이버 톤과 맞는다.
- 관측성은 OpenTelemetry Collector + 메트릭 저장소(VictoriaMetrics) + RUM이 표준 어휘다. OTel SDK로 trace/metric을 내보내고 Grafana로 보는 구성이 가장 직접적으로 "읽힌다".
- 프론트엔드는 LCP p95 2.5초라는 구체 목표치와 디자인 토큰 기반 디자인시스템, Figma Code Connect/AI instruction이 핵심 어휘. 여행노트의 디자인 시스템 문서에 토큰을 정의하고 Web Vitals 측정값을 적으면 바로 대응된다.
- 테스트는 "커버리지 숫자"보다 "테스트하기 어려운 경계를 분리했는가"(험블 객체)와 "에이전트가 만든 코드를 E2E로 신뢰할 수 있게 했는가"(Playwright 하네스)가 2025–2026의 관심사다.
- 2026년 네이버 글들은 AI 사용 자체보다 "AI에게 맡기지 않을 것을 정했는가", "증거(스크린샷·로그)로 검증했는가", "공용 DB 같은 위험 동작을 차단했는가"를 강조한다. 사이드 프로젝트의 에이전트 지침에 금지 동작·검증 루프를 명문화하면 네이버 글이 말하는 성숙도와 일치한다.

### Gaps
- D2 API 본문에는 Kotlin, Spring Boot 3, Java 21, 가상 스레드, PostgreSQL, Next.js 언급이 0건이었다(요약 길이 제한 때문일 수 있음). 네이버 D2 2025–2026에서 Kotlin 전환이나 가상 스레드 글은 확인되지 않음.
- DAN25 35개 세션의 전체 목록·백엔드/FE 세션 제목은 SPA 셸만 내려와 확보하지 못했다(TOP5와 로그 파이프라인 세션만 확인).
- "[무물보] 응답하라, 백엔드 개발자를 꿈꾸는 2025 학생 개발자!" (2025-11-14)는 질문 접수 공지만 있고 정상혁 님의 답변 본편은 2026-10-08 기준 피드에 아직 없다.

---

## KQ4. medium.com/coupang-engineering 2025–2026 글과 쿠팡 엔지니어링 문화

### Takeaway
쿠팡 엔지니어링 Medium은 2024-10-14 "Accelerating Coupang's AI Journey with LLMs" 이후 2025–2026 게시물이 피드에 없다(영문·한국어 계정 모두). 2025–2026의 회사 직접 신호는 coupang.jobs 직원 스토리(2026-07-03)에 있다: "Agentic AI platform and event-sourced systems", "highly reliable inventory ledger", "engineers are trusted to take ownership… from day one", 사내 AI로 "accelerate software development, refine project specifications", 문서화·온콜 리뷰에 AI 사용, 단 "critical decisions continue to be guided by human judgment".

### Cited Findings
- [회사 직접] Medium 영문 피드의 최신 10건 중 가장 최근은 2024-10-14 "Accelerating Coupang's AI Journey with LLMs"(ML Platform Team; 검색 스니펫상 표시일 2024-11-14), 그 다음이 2023-11-23 "쿠팡의 머신러닝 플랫폼을 통한 ML 개발 가속화". 2025–2026 게시물 없음. — [medium.com/feed/coupang-engineering](https://medium.com/feed/coupang-engineering), [accelerating-coupangs-ai-journey-with-llms](https://medium.com/coupang-engineering/accelerating-coupangs-ai-journey-with-llms-2817d55004d3)
- [회사 직접] 한국어 계정(@coupang-engineering-kr) 피드 최신은 2023-11-23. — [medium.com/feed/@coupang-engineering-kr](https://medium.com/feed/@coupang-engineering-kr)
- [회사 직접] 직원 스토리 "From high-scale inventory to building digital twins" (2026-07-03): "our team introduced new infrastructure paradigms, including an Agentic AI platform and event-sourced systems", "To manage extreme concurrent workloads and build a highly reliable inventory ledger", 레거시 SQL→NoSQL 재고 ID 무중단 이전과 노드 헬스 추적 프레임워크로 특허 출원, "Engineers are encouraged to challenge assumptions, evaluate alternative approaches", "engineers are trusted to take ownership, innovate, and turn ideas into reality from day one", "multi-tenant digital twin simulation architecture", "I develop microservices that serve optimization models", "we use AI internally to accelerate software development, refine project specifications"(기술 문서화·온콜 리뷰에도 사용), "critical decisions continue to be guided by human judgment". 테스트·관측성·구체 스택 언급 없음. — [coupang.jobs …lakshmanan-s-journey-at-coupang](https://www.coupang.jobs/en/life-at-coupang/employee-stories/from-high-scale-inventory-to-building-digital-twins-lakshmanan-s-journey-at-coupang/)
- [회사 직접, 범위 밖 배경] "The way engineers work at Coupang" (2021-06-17): "All Coupang services are implemented on MSA", "we aim to always maintain 99.99% availability", "we also share performance test results before deployment to further solicit feedback", "poka yoke"(고객 증상에서 시작해 "Why?"를 5단계), "we are working on automating testing as a significant amount of QA efforts are required for every deployment". — [coupang.jobs …the-way-engineers-work-at-coupang](https://www.coupang.jobs/en/life-at-coupang/employee-stories/the-way-engineers-work-at-coupang/)
- [2차 게시, 스니펫] 다른 직원 스토리(Nikhilesh, Global Ops Tech) 스니펫: 개발자 생산성을 "분기마다 기술 부채 감소·리팩토링 시간"과 "코드 리뷰, 테스트, 관측성을 위한 내부 플랫폼"으로 개선한다는 요지(원문 403으로 미확인, 날짜 미상). — [coupang.jobs …meet-nikhilesh](https://www.coupang.jobs/en/life-at-coupang/employee-stories/revolutionizing-global-operations-technology-with-engineering-excellence-meet-nikhilesh/)
- [회사 직접] Technology 팀 페이지: "Scaling AI at Coupang"(Director of ML Behdad Dehghani) 스토리 노출; 문구 "We are at the forefront of using the latest tech innovations". 스택·워크플로 설명 없음. — [coupang.jobs/en/teams/technology/](https://www.coupang.jobs/en/teams/technology/)
- [커뮤니티] 쿠팡 광고 엔지니어링 팀이 AWS Summit Seoul 2025에서 생성형 AI의 실서비스 통합을 발표했다는 LinkedIn 글. — [kr.linkedin.com/in/jakemj3](https://kr.linkedin.com/in/jakemj3)

### Inferences
- 쿠팡은 2025–2026에 기술 블로그 대신 채용 페이지 직원 스토리로 메시지를 내보낸다. 거기서 반복되는 키워드는 ownership, 이벤트 소싱/원장(ledger)의 일관성, 동시성 하의 신뢰성, AI는 가속 도구이되 판단은 사람. 여행노트에서 "일정 변경 이력을 이벤트로 남기고 현재 상태를 재계산"하는 설계는 이 어휘와 맞물린다.
- 2021 글의 "배포 전 성능 테스트 결과 공유", "5 whys", "99.99%"는 오래됐지만 2026 공고의 "크리티컬 시스템 이슈 딥다이브"와 이어진다. 부하 테스트 결과와 장애 분석 기록이 있으면 쿠팡 쪽에서 읽히는 신호가 된다.

### Gaps
- 2025–2026 쿠팡 기술 블로그 글은 존재하지 않는 것으로 보이며(피드 기준), 신뢰성·마이그레이션·성능 주제의 쿠팡 자체 기술 글은 확보 불가.
- 쿠팡 Leadership Principles 페이지는 404, 채용 프로세스 페이지는 접근 못 함. 인터뷰 평가 기준은 제3자 가이드(interviewquery 등 [커뮤니티])뿐이라 인용 가치가 낮아 생략.

---

## KQ5. 네이버/쿠팡 엔지니어가 밝힌 후보자·사이드 프로젝트 평가 관점, 그리고 AI 시대 기대치

### Takeaway
두 회사 모두 "사이드 프로젝트를 이렇게 평가한다"는 직접 문서는 2025–2026에 없다. 대신 공고와 사내 글에서 읽히는 기대치는 (a) 2026년 공고에 AI 도구 활용 경험이 우대/요건으로 들어옴(네이버웹툰 "Claude, Codex", 쿠팡 "Copilot, Claude Code, Devin, Cursor… 측정 가능한 생산성 향상 실적"), (b) 네이버 내부는 "AI에게 맡기지 않을 것"과 증거 기반 검증 루프를 강조, (c) 야놀자 채용 프로세스 페이지는 포트폴리오에서 "어떤 임팩트를 만들었는지", "어떤 고민과 과정이 있었는지"를, 코딩테스트에서 "정답 여부만을 평가하는 것이 아니라" 접근 방식·가독성·구조·엣지 케이스를 본다고 명시.

### Cited Findings
- [2차 게시] 네이버웹툰 라인망가 BE 공고(2026-03-05) 우대: "Claude, Codex 등 AI 활용하여 개발 효율을 증대시킨 경험이 있으신 분". — [bzpp.co.kr BR260305A00042](https://www.bzpp.co.kr/biz/businessDetailView/BR260305A00042)
- [2차 게시] 쿠팡 Staff Back-end (Interstellar, 2026-10 갱신) "AI & Harness Engineering": "AI 보조 소프트웨어 엔지니어링 도구(Copilot, Claude Code, Devin, Cursor)를 구현, 테스트, 코드 리뷰, 문서화 전반에 활용한 실무 경험", "AI 도구 도입을 통한 측정 가능한 생산성 향상 실적"; 책임에 "팀 전반에 걸쳐 AI 활용 사례와 자동화 도입을 주도". — [dreamworkhq.com/job/ee6f6e1e…](https://www.dreamworkhq.com/job/ee6f6e1e-926b-460f-8188-bb144c1becdd)
- [회사 직접] 쿠팡 직원 스토리(2026-07-03): AI를 "accelerate software development, refine project specifications", 문서화·온콜 리뷰에 쓰되 "critical decisions continue to be guided by human judgment". — [coupang.jobs …lakshmanan](https://www.coupang.jobs/en/life-at-coupang/employee-stories/from-high-scale-inventory-to-building-digital-twins-lakshmanan-s-journey-at-coupang/)
- [회사 직접] 네이버 AI 해커톤 1위 팀 후기(2026-07-24)의 검증 루프와 "무엇을 AI에게 맡기고, 무엇은 끝까지 맡기지 않을 것인가"; Engineering Day 2026이 "전 직군" AI 도구 핸즈온과 해커톤으로 확장(2026-05-28). — [helloworld/4821538](https://d2.naver.com/helloworld/4821538), [news/0766161](https://d2.naver.com/news/0766161)
- [회사 직접] 네이버 Developer Experience 팀 인터뷰 공지(2026-09-02): "D2를 비롯한 기술 콘텐츠를 만들고, 네이버 개발자의 성장 단계에 맞는 교육과 기술 공유 프로그램", "네이버의 공유 문화, 그리고 AI 시대" — [d2.naver.com/news/3092933](https://d2.naver.com/news/3092933)
- [회사 직접] 2025 팀네이버 신입 공채 전형: "온라인 CS/코딩테스트" → "기술 역량 인터뷰" → "종합 역량 인터뷰"(대면). 지원서에 "관심, 자신 있는 분야는 지원서 자기소개 항목에 답변". — [recruit.navercorp.com/micro/teamnaver2025/tech](https://recruit.navercorp.com/micro/teamnaver2025/tech)
- [2차 게시] 부스트캠프 웹·모바일 10기 모집 공고(2025, 서울대 공지 게시): 입과는 "정원 없이 절대 기준", "기술 역량의 최소 기준과, 커뮤니티에서 스스로 학습하고 동료와 성장할 수 있는지"를 봄. 채용 면접 기준은 아님. — [cse.snu.ac.kr/community/notice/23983](https://cse.snu.ac.kr/community/notice/23983)
- [회사 직접] 야놀자 채용 프로세스(2026-10 조회): 서류(이력서 필수, 경력기술서/포트폴리오 선택)에서 포트폴리오는 "어떤 임팩트를 만들었는지", "어떤 고민과 과정이 있었는지"를 보여주라고 안내; R&D 온라인 코딩테스트 또는 과제는 "정답 여부만을 평가하는 것이 아니라" 문제 접근 방식, 코드 가독성과 구조, 엣지 케이스 처리를 봄; R&D는 Live Coding 인터뷰 1차 통과 시 같은 날 2차; "정확함"을 "빠름"보다 우선. 사이드 프로젝트·AI 사용에 대한 언급 없음. — [careers.yanolja.co/ko/hiringprocess](https://careers.yanolja.co/ko/hiringprocess)
- [회사 직접] State of FE·JS Korea 2025(네이버 FE News 주관): AI 도구 사용 1위 ChatGPT 31.31%, Claude 18.47%, Cursor 17.03%; 용도 코드 어시스트·리팩토링·프로토타이핑. — [d2.naver.com/news/1353647](https://d2.naver.com/news/1353647)

### Inferences
- "AI를 썼다"는 2026년 공고에서 이미 전제이고, 차별 요소는 쿠팡 문구 그대로 "구현·테스트·코드 리뷰·문서화" 네 영역 중 어디에 어떻게 썼는지와 "측정 가능한" 결과다. 프로젝트에 AI 사용 로그(어떤 PR을 에이전트가 만들고 어떤 테스트로 검증했는지)와 간단한 수치(PR 수, 리드타임)를 남기면 두 회사 공고 문구에 모두 걸린다.
- 네이버 내부 글의 기준(맡기지 않을 것 정의, 증거 수집, 위험 동작 차단)은 그대로 에이전트 지침 파일의 섹션 제목으로 옮겨도 된다.
- 야놀자 문구("임팩트", "고민과 과정", "엣지 케이스")는 README를 "무엇을 만들었다"가 아니라 "어떤 문제를 어떻게 결정했고 결과가 무엇인지"로 쓰라는 구체 지침으로 쓸 수 있다.

### Gaps
- 네이버·쿠팡 엔지니어가 사이드 프로젝트/포트폴리오 평가 기준을 직접 밝힌 2025–2026 문서는 찾지 못했다. 정상혁 님의 "백엔드 개발자를 꿈꾸는 학생 개발자" 후속편(2025-11 질문 접수)이 공개되면 가장 직접적인 1차 자료가 될 것.
- 쿠팡 면접 평가 기준은 제3자 가이드뿐이라 신뢰도가 낮아 인용하지 않았다.

---

## KQ6. 야놀자(NOL) / 여기어때 2025–2026 스택과 관행(간략)

### Takeaway
야놀자는 기술 블로그가 사라졌고(techblog.yanolja.com → nol.yanolja.com 리다이렉트, Medium은 2022년 이후 멈춤) Workday 채용 사이트에 2026-10 기준 Backend/Frontend 공고가 0건이라 2025–2026 신호가 거의 없다. 여기어때 기술블로그는 2026년 9~10월에 활발하며 Kafka→MongoDB 동기화를 원천 API 직접 호출로 바꾸면서 쉐도잉 검증, Pinpoint 중심에서 OpenTelemetry+Grafana(Mimir/Tempo/Loki)로의 관측성 전환, Next.js/TSX에 Feature-Sliced Design 적용, 전사 바이브코딩 확산과 AI 생성 코드 리뷰 문제를 다룬다.

### Cited Findings
- [회사 직접] techblog.yanolja.com은 nol.yanolja.com으로 302 리다이렉트(2026-10 확인); medium.com/yanolja 피드 최신 글은 2022-12-29(문화 글). — [medium.com/feed/yanolja](https://medium.com/feed/yanolja)
- [회사 직접] 야놀자 Workday 채용 검색(2026-10): "Backend" 0건, "Frontend" 0건, "개발" 1건(Product Owner, Enterprise Solutions). — [yanolja.wd102.myworkdayjobs.com/ko-KR/External_Yanolja](https://yanolja.wd102.myworkdayjobs.com/ko-KR/External_Yanolja)
- [회사 직접] 야놀자 채용 프로세스 문구는 KQ5 참조. — [careers.yanolja.co/ko/hiringprocess](https://careers.yanolja.co/ko/hiringprocess)
- [회사 직접] 여기어때 "쉐도잉 검증 개선기" (2026-10-10, 전시개발팀): "레거시 API와 신규 API의 응답이 같은지 비교하기 위해 쉐도잉"; 제휴점 상품 정보가 "원천 데이터에서 Kafka로 변경분을 받아 전시 쪽 MongoDB에 저장"하던 구조를 "MongoDB를 거치지 않고 원천 데이터에서 제공하는 API를 직접 호출"로 전환; "테스트는 통과하는데 운영에서 어떤 숙소의 어떤 날짜에서만 가격이 다르게 나오는 식의 문제는 테스트로 잡히지 않았습니다"; 사용자에게는 기존 결과를 주고 "별도 스레드에서 개선한 로직을 한 번 더 호출한 뒤 두 결과를 비교". — [techblog.gccompany.co.kr/쉐도잉-검증-개선기-cef1ddc8318d](https://techblog.gccompany.co.kr/%EC%89%90%EB%8F%84%EC%9E%89-%EA%B2%80%EC%A6%9D-%EA%B0%9C%EC%84%A0%EA%B8%B0-cef1ddc8318d)
- [회사 직접] 여기어때 "새로운 팀에 기여하기… 전시개발팀 옵저버빌리티 향상 시키기" (2026-10-10): 전시개발팀은 "게이트웨이 이후 서비스의 가장 많은 트래픽을 수용", "Fail-open과 Fail-close를 관리"; 장애 알림 시 첫 질문 "이게 우리 문제인가, 아니면 우리가 호출하는 어딘가의 문제인가"; "옵저버빌리티 환경은 아직 기존 APM인 핀포인트의 사용성에 의존"; 저자는 이전 팀에서 "OpenTelemetry와 Grafana를 기반으로 Metrics(Mimir), Traces(Tempo), Logs(Loki)를 유기적으로 연결하는 옵저버빌리티 플랫폼"을 구축했고 이를 전시개발팀 대시보드에 적용. — [techblog.gccompany.co.kr/새로운-팀에-기여하기…c39614694661](https://techblog.gccompany.co.kr/%EC%83%88%EB%A1%9C%EC%9A%B4-%ED%8C%80%EC%97%90-%EA%B8%B0%EC%97%AC%ED%95%98%EA%B8%B0-%EA%B7%B8%EB%A6%AC%EA%B3%A0-%EA%B8%B0%EC%97%AC%EC%9D%98-%ED%99%95%EC%9E%A5-feat-%EC%A0%84%EC%8B%9C%EA%B0%9C%EB%B0%9C%ED%8C%80-%EC%98%B5%EC%A0%80%EB%B2%84%EB%B9%8C%EB%A6%AC%ED%8B%B0-%ED%96%A5%EC%83%81-%EC%8B%9C%ED%82%A4%EA%B8%B0-c39614694661)
- [회사 직접] 여기어때 "항공 프론트엔드 구축기 (10/10)" (2026-09-10, 서비스웹개발팀): TSX 섹션 컴포넌트 수십 개의 영향 범위 문제에 "FSD(Feature-Sliced Design)를 도입… 코드를 레이어로 나누고, 위 레이어만 아래 레이어를 참조할 수 있게 방향을 강제… 그 규칙은 lint로 검사". — [techblog.gccompany.co.kr/항공-프론트엔드-구축기-10-10…c74c85a0e3e0](https://techblog.gccompany.co.kr/%ED%95%AD%EA%B3%B5-%ED%94%84%EB%A1%A0%ED%8A%B8%EC%97%94%EB%93%9C-%EA%B5%AC%EC%B6%95%EA%B8%B0-10-10-%ED%8F%B4%EB%8D%94-%EC%9D%B4%EB%A6%84-%EC%95%9E%EC%9D%98-%EA%B8%B0%ED%98%B8-%ED%95%98%EB%82%98-c74c85a0e3e0)
- [회사 직접] 여기어때 "'배포해줘' 한 줄로 끝나는 배포" (2026-09-17, Service Factory팀): "회사가 전사적으로 AI와 바이브코딩을 막 확산하기 시작한 시기", 비개발자도 결과물을 사내에 배포할 수 있는 플랫폼 '바이브독'; "복잡한 쿠버네티스 환경을 구축하는 대신, 서버 한 대에… 심플한 정적 웹 호스팅 구조로 시작", "첫 커밋에서 첫 사용자 유입까지 7일". — [techblog.gccompany.co.kr/배포해줘…25ddb8336796](https://techblog.gccompany.co.kr/%EB%B0%B0%ED%8F%AC%ED%95%B4%EC%A4%98-%ED%95%9C-%EC%A4%84%EB%A1%9C-%EB%81%9D%EB%82%98%EB%8A%94-%EB%B0%B0%ED%8F%AC-%EC%A0%84-%EC%A7%81%EC%9B%90%EC%9D%B4-%EC%93%B0%EB%8A%94-%EC%82%AC%EB%82%B4-%ED%94%8C%EB%9E%AB%ED%8F%BC-%EA%B5%AC%EC%B6%95%EA%B8%B0-25ddb8336796)
- [회사 직접] 여기어때 "QA 티켓 280건, AI와 함께 처리한 기록" (2026-09-17, FE): 해외투어 오픈 QA 280건 중 "56%는 하루 만에… 81%는 3일 안에" 처리; 이전 QA(2024 가을 77건: 23%/48%, 2025 봄 55건: 42%/62%)와 비교; "사람은 원인과 방향을 판단하고, 에이전트는 재현·조사·기록처럼 확인에 드는 시간을 줄였습니다"; 저자는 수치만으로 AI 효과를 단정할 수 없다고 명시. — [techblog.gccompany.co.kr/qa-티켓-280건…447b8b8b0f99](https://techblog.gccompany.co.kr/qa-%ED%8B%B0%EC%BC%93-280%EA%B1%B4-ai%EC%99%80-%ED%95%A8%EA%BB%98-%EC%B2%98%EB%A6%AC%ED%95%9C-%EA%B8%B0%EB%A1%9D-447b8b8b0f99)
- [회사 직접] 여기어때 "AI 시대 당신의 팀은 안녕하신가요" (2026-10-10): "사람의 검토 없이 AI가 작성한 결과물을 그대로 올리는 것에 시니어가 불만", "사람이 볼 수 있게 커밋을 잘게 나누자는 의견", "팀에서 합의한 적 없는 방식이 AI 결과물에 섞여 들어옵니다", 원인은 "결정이 각자의 AI 대화 안에서 일어나기 때문". 같은 날 "AI가 쓰는 ERD 도구 제작기": "매번 같아야 하는 일까지 AI에게 맡기지 말고, 매번 같은 결과를 내는 도구를 AI에게 쥐여 주면". — [techblog.gccompany.co.kr/ai-시대-당신의-팀…c59f982d5add](https://techblog.gccompany.co.kr/ai-%EC%8B%9C%EB%8C%80-%EB%8B%B9%EC%8B%A0%EC%9D%98-%ED%8C%80-%EC%A1%B0%EC%A7%81%EC%9D%80-%EC%95%88%EB%85%95%ED%95%98%EC%8B%A0%EA%B0%80%EC%9A%94-c59f982d5add), [ERD 도구 제작기 f97eefa26354](https://techblog.gccompany.co.kr/%EC%8B%9C%ED%82%AC-%EB%95%8C%EB%A7%88%EB%8B%A4-%EB%8B%A4%EB%A5%B8-%EA%B2%B0%EA%B3%BC%EB%A5%BC-%EB%82%B4%EB%8A%94-ai%EC%97%90%EA%B2%8C-%EB%8F%84%EA%B5%AC%EB%A5%BC-%EC%A5%90%EC%97%AC-%EC%A3%BC%EC%97%88%EC%8A%B5%EB%8B%88%EB%8B%A4-ai%EA%B0%80-%EC%93%B0%EB%8A%94-erd-%EB%8F%84%EA%B5%AC-%EC%A0%9C%EC%9E%91%EA%B8%B0-f97eefa26354)
- [2차 게시, 스니펫] 여기어때 2025 아카이브: EKS 팀의 ExternalDNS 도메인 관리(2025-08-07), Next.js 패키지여행 기능 개발 중 Hydration Error, Helm Chart Registry 도입 CI/CD 시리즈(원문 403). — [techblog.gccompany.co.kr/archive/2025](https://techblog.gccompany.co.kr/archive/2025)
- [2차 게시, 날짜 미확인] 여기어때컴퍼니 Backend Engineer 공고(원티드): "Java 또는 Kotlin 기반 Spring 대규모 애플리케이션 개발·운영 경험", "JPA/Hibernate 등 ORM과 도메인 모델링 경험", "AWS(EKS, RDS, ElastiCache) 기반 인프라 설계·운영 경험", "대용량 트래픽 처리를 위한 시스템 설계 경험이 있는 분". — [wanted.co.kr/wd/383046](https://www.wanted.co.kr/wd/383046)

### Inferences
- 같은 여행/숙박 도메인인 여기어때의 2026년 글은 여행노트에 직접 쓸 수 있는 패턴을 준다: 가격·재고 화면의 데이터 출처를 바꿀 때 쉐도잉으로 검증, OTel+Grafana 스택, Next.js에 FSD 레이어 규칙을 lint로 강제, AI 생성 코드의 "결정 근거"를 대화 밖(문서·커밋)에 남기기.
- 야놀자는 2025–2026 공개 신호가 없어 타깃 조정의 근거로 쓰기 어렵다.

### Gaps
- 야놀자 2025–2026 기술 글과 엔지니어 공고는 확보 못 함.
- 여기어때 2025년 글 본문(EKS, Next.js Hydration, Helm)은 403으로 제목만 확인.
