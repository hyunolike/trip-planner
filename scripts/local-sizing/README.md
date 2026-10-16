# 로컬 공통 메모리 검증

API, PostgreSQL/PostGIS, Valkey, 부하 클라이언트, 백업과 복원을 **하나의 1,664MiB cgroup**에서 실행한다. CPU는 2코어로 제한하고 스왑을 끈다. 2,048MiB에서 뺀 384MiB는 측정하지 않은 OS 여유분 가정이다. 실제 2GB 서버나 Caddy/TLS를 검증하는 도구는 아니다.

## 실행

Docker, Python 3, JDK 25가 필요하다. 저장소 루트에서 다음 명령을 실행한다. API 실행 JAR만 이미지로 복사하며 호스트에 패키지를 설치하지 않는다.

```sh
cd apps/api
./gradlew bootJar
cd ../..
cp apps/api/build/libs/tripnote-api-0.1.0.jar scripts/local-sizing/app.jar
cd scripts/local-sizing
python3 run_named.py
python3 analyze.py results/<실행-ID>
```

기본값은 임의 payload 960MiB(245,760행 × 4,096바이트)와 구간별 120초다. 실제 DB는 TOAST와 인덱스 등을 포함해 더 크다. 짧게 확인하려면 `PHASE_SECONDS=60 PADDING_ROWS=4096 python3 run_named.py`를 사용한다. 실행마다 UUID를 포함한 컨테이너와 named volume 두 개를 새로 만든다. 기존 PostgreSQL 디렉터리에는 초기화하지 않는다.

데이터와 덤프, 로그를 모두 Docker의 Linux named volume에 쓴다. Mac 공유 폴더를 DB나 백업 경로로 사용하지 않는다. 결과가 끝나면 작은 JSON, 로그, NMT 진단만 로컬 `results/<실행-ID>`로 복사한다. 원시 DB와 덤프는 두 볼륨에 남으며 자동 삭제하지 않는다. 실행 ID, 볼륨 이름, 이미지 ID, JAR와 하네스 SHA-256은 `run-config.json`과 `image.txt`에 기록한다. 이미지 태그는 바뀔 수 있으므로 다른 날짜 재실행은 기록된 이미지 ID와 버전도 비교해야 한다.

## 부하와 백업

1. API readiness와 Flyway 완료를 기다린다.
2. 외부 서비스와 무관한 합성 사용자 10명과 임의 데이터 테이블을 만든다.
3. 사용자 5명이 로그인, 여행/일정 생성, 조회, 일정 편집과 완료 처리를 반복한다.
4. 같은 5명 부하의 시작 10초 후 전체 `pg_dump -Fc -Z 0`을 실행한다.
5. 10명 부하와 두 번째 전체 덤프를 실행한다.
6. 첫 덤프를 새 DB로 실제 복원한다. `pg_restore --exit-on-error`와 행 수로 확인한다.

사용자 루프에는 1초 대기가 있다. 측정 요청 수는 readiness와 CSRF 프라이밍을 제외한다. 백업 시작/종료와 요청 완료 시각을 기록하므로 실제 겹친 요청도 확인할 수 있다. 구간을 연속 실행해 JVM과 DB가 따뜻해지므로 구간 간 지연 차이를 백업의 인과 효과로 해석하지 않는다. 각 백업과 복원은 600초 제한이다. 백업이 120초를 넘으면 사용자 부하가 끝난 후에도 백업 완료를 기다린다.

Java는 `-Xms128m -Xmx384m`와 NMT를 사용한다. PostgreSQL은 `shared_buffers=64MB`, 연결 20개와 `work_mem=4MB`, API 풀은 5개다. Valkey는 64MB 한도, noeviction, AOF everysec을 사용한다. 힙 외 메모리는 NMT와 RSS로 함께 확인한다.

## 관측과 한계

- `metrics.jsonl`: 1초 간격 cgroup 전체 메모리, anon/file, swap, OOM/제한 도달, CPU throttling과 서비스 종료 상태.
- `*-requests.json`: 작업 이름, 상태, 기대 상태, 소요 시간, 완료 시각. 쿠키와 응답 본문은 저장하지 않는다.
- `*-native.txt`, `*-heap.txt`: readiness와 각 구간 이후 JVM 진단.
- `summary.json`: 모든 단계가 끝난 결과. `partial-summary.json`만 있으면 전체 성공으로 보지 않는다.
- `container-final.json`: Docker 종료 코드, OOMKilled, RestartCount와 실제 공통 자원 제한.
- `analysis.json`: 표본 최고 메모리, 오류와 p95, CPU/메모리 집계.

프로세스 RSS 합계에는 PostgreSQL 공유 페이지가 중복된다. 일반 컨테이너 권한으로 PostgreSQL PSS를 읽지 못하므로 합산 RAM은 cgroup 값으로 판단한다. 현재 Docker 커널에는 `memory.peak`가 없어 1초 표본이 순간 최고값을 놓칠 수 있다. 제한 도달/OOM 카운터도 같이 본다. NMT는 JVM이 추적하는 할당이며 RSS 전체와 같지 않다.

컨테이너는 `--network none`이며 포트, Docker 소켓, 호스트 PID 또는 추가 권한을 노출하지 않는다. SMTP, OAuth, 외부 날씨, HTTPS/브라우저 경로는 실행하지 않는다. 합성 계정은 외부 서비스에 등록하지 않는다. Secure 쿠키는 격리된 loopback 테스트 클라이언트가 직접 전달하며 서버 쿠키나 CSRF 정책은 바꾸지 않는다. 임시 DB의 loopback trust는 이 네트워크 격리 fixture에서만 쓰는 설정이다.

960MiB 테이블은 임의 bytea padding이다. 실제 여행 데이터가 1GB인 작업 집합이나 복잡한 인덱스 부하를 대체하지 않는다. ARM Mac의 AMD64 에뮬레이션과 약 8GB Docker VM에서 실행한 결과는 native Linux의 응답 시간, CPU 크레딧, 실제 2GB OS/Caddy 여유 또는 장시간 운영을 보증하지 않는다.

## 정리와 자료 보존

`run_named.py`는 정상 종료 시 본인이 시작한 API, Valkey, PostgreSQL과 관측 프로세스를 끝내고 컨테이너와 볼륨을 남긴다. 중단할 때는 해당 실행의 `run-config.json`에 적힌 컨테이너만 `docker stop <container>`로 종료한다. 다른 컨테이너를 멈추거나 `docker system prune`, 볼륨 일괄 삭제를 하지 않는다. `.gitignore`로 JAR, 측정 원본, DB, 덤프와 로그를 게시 대상에서 제외한다. PR에는 도구와 합성 측정 요약만 포함한다.

측정 결과는 [검증 기록](../../docs/verification/2026-10-16-local-memory.md)에 정리한다.
