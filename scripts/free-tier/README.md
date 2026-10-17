# API 단독 무료 한도 검증

격리 checkout에서 실행한다. Docker와 기존 `tripnote-api:prep-20261017`, `tripnote-sizing:local` 테스트 이미지가 필요하다.
API 애플리케이션 JAR은 develop 63da5cd와 동일하다. cloud free profile의 TLS/external endpoint는 이 시험에 적용하지 않는다.
외부 배포 이미지는 별도 `deploy/free/Dockerfile`로 빌드 검증한다.

```sh
python3 scripts/free-tier/run.py
```

새 고유 Compose project에 PostGIS18, Valkey9.1(AOF/noeviction), Mailpit, API를 띄운다.
호스트 port 없음, network internal=true, 실제 메일/Google/외부 API/개인 sample 없음.
DB/캐시/메일/시험 client와 readiness client는 API cgroup 밖에 있다. 기존 개발 컨테이너는 변경하지 않는다.
API는 512MiB, swap 추가 없음, cpu_period=100000/cpu_quota=10000이다.
구형 Compose에서 `cpus: 0.1`을 무시하는 문제가 있어 `docker update`로도 명시하고
실제 HostConfig를 assert한다. `cpu.max` 값도 결과에 보존한다.

공개 고정 테스트 비밀번호만 사용한다. 생성된 테스트 session/share token은 `.local-*` 안에만 저장하고 출력하지 않는다.
이 디렉터리는 ignore 대상이며 PR에 넣지 않는다. 단독 0.1CPU의 JVM 시작은 느리므로 최대 900초 기다린다.
메모리는 heap192/metaspace192/code32/direct16MiB, SerialGC, processor1, stack512KiB, C1 JIT로 제한한다.
로그인 Argon2 비용/알고리즘, 세션 유효성, CSRF는 낮추지 않는다.

준비 완료 후 signup→Mailpit 인증→login→여행 생성/조회/수정→익명 share→5 동시 client 15요청,
API만 stop/start→동일 session/trip/share 유지→share 취소→logout→비밀번호 초기화로 5개 세션 전체 취소를 검사한다.
서버 재시작과 cache 영속성은 서로 다른 검증이다. 외부 Upstash 서비스 restart는 실행하지 않는다.
HTTP에서 Secure 쿠키를 수동 전달하므로 브라우저 HTTPS/Vercel chain 검증을 대체하지 않는다.

결과/로그/컨테이너/볼륨은 보존한다. 종료 시 해당 project만 stop한다. `down -v`, prune은 하지 않는다.
`memory.peak`가 없는 오래된 VM 커널에서는 해당 파일을 peak 증거로 쓰지 않는다.
공유 Mac의 AMD64 에뮬레이션은 Render 성능을 재현하지 않으므로 현장 cold-start 시간은 별도 확인해야 한다.

ARM Mac native 진단은 같은 Java 25.0.4.1 JRE와 동일 JAR의 ARM64 이미지가 준비된 경우에만 실행한다.
`API_PLATFORM=linux/arm64 API_IMAGE=<검증할 ARM64 이미지> python3 scripts/free-tier/run.py`
로 이미지/플랫폼을 명시하며 AMD64 결과와 구분한다. 기본 이미지는 Render 배포 이미지와 별도이다.

`API_EXTRA_JAVA_OPTIONS`는 추가 JVM 기동 비교용이며 기본값은 비어 있다.
현재 기본 설정은 `TieredStopAtLevel=1`을 포함한다. 처리량/로그인 지연은 별도로 확인한다.
