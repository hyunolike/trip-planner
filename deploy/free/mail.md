# Render Free 메일 전송 연결 검토

2026-10-17 공식 문서 기준의 후보 검토다. 제공자를 선정하거나 계정·키·DNS를 만들지 않았다.

## 구현된 경계

`AuthMailer`의 네 가지 이벤트와 본문, 사용자 행 잠금, 토큰 발급과 리스너 트랜잭션은 유지한다.
전송만 `MailTransport`에 위임한다. 일반 로컬 실행은 기존 `JavaMailSender` 기반 SMTP이며
Mailpit에서 확인한다. Free profile은 HTTPS를 선택하고 `HttpsMailProvider` 구현이 없으면
시작을 거부한다. Render Free에서 SMTP를 명시하더라도 25/465/587이면 시작을 거부한다.

HTTPS 확장점은 성공적으로 수락된 경우 반환하고 timeout/거절에는 예외를 던져야 한다.
현재 특정 제공자의 SDK/HTTP 호출은 없으며 전송 성공을 흉내 내는 구현도 없다.
전송 예외는 토큰 발급 트랜잭션을 롤백하고 미완료 이벤트를 남긴다.
기존 Modulith의 재시작 재발행을 유지한다. HTTP POST를 transport에서 맹목적으로 재시도하지 않는다.
공급자가 수락했지만 응답을 잃은 경우 이벤트 재처리로 중복 메일이 생길 수 있으므로
실제 어댑터 구현 때 제공자의 idempotency 지원과 timeout을 검토해야 한다.
이벤트와 mail 객체의 수신자/본문/토큰/키는 로그에 남기지 않는다(`toString`은 redacted).

## 무료 HTTPS 후보

| 후보 | 공식 무료량 | 도메인과 검토 사항 |
| --- | --- | --- |
| [Resend](https://resend.com/pricing) | 월 3,000통, 일 100통, 도메인 3개 | [소유 도메인 검증](https://resend.com/docs/add-a-domain)과 생성된 DKIM/SPF 레코드 필요. 트랜잭션 메일용 하위 도메인 권장. DMARC도 검토. |
| [MailerSend](https://www.mailersend.com/pricing) | Free 월 500통, 일 API 요청 100회, 발신 도메인 1개 | [발신 도메인 인증](https://www.mailersend.com/help/how-to-verify-and-authenticate-a-sending-domain)에 DNS 접근과 SPF/DKIM/Return-Path 설정 필요. Free와 14일 Professional trial을 구분. |

현재 소규모 인증 메일에는 무료량이 더 큰 Resend를 우선 검토할 수 있지만 선택은 미확정이다.
위량은 메일/요청/도메인 기준을 구분한 문서 수치이며 실제 계정의 승인·잔여량·이용약관을 대신하지 않는다.
자동 유료 전환, overage, 추가 상품 또는 카드를 활성화하지 않는다.
메일 발신 하위 도메인 후보도 기존 웹 wildcard/apex/MX를 바꾸지 않고 별도로 검토해야 한다.

## 다음 승인 후 검증

제공자 확정 → 한정된 HTTPS 어댑터 구현 → 안전한 자격증명 입력 → 발신 도메인 DNS 변경 검토 →
승인된 테스트 주소의 가입/재발송/재설정 수신과 만료·단회성·세션 취소 확인 순서다.
추적 기능은 인증 링크와 개인정보에 미치는 영향을 검토한 뒤 선택한다.
현재 실제 메일, 가입, 키 발급, DNS 변경은 수행하지 않았다.

[Render Free SMTP 제한](https://render.com/docs/free)에 따라 25/465/587을 사용하지 않는다.
제공자가 대체 SMTP 포트를 제공한다고 실제 Free 환경에서 검증된 것으로 간주하지 않는다.
