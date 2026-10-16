StopRow는 일정표의 기본 단위다. 한 줄에 "언제, 무엇을, 했는지"가 보이고, 나머지(안내문, 사진, 가이드, 링크)는 접혀 있다.

- 격자 세 열: 시각 64px(`data-lg`, 아래 소요시간 `caption`), 내용(제목 `title-md`, 메타 `body-sm`), 완료 버튼 44px.
- 완료 버튼은 원형 44px, 기본 `line-strong` 테두리. 완료(`tn-stop--done`)는 `success` 채움에 체크, 제목은 `ink-muted` 취소선. 행은 사라지지 않는다.
- 펼침(`tn-stop--open`)은 본문 `body-lg`(17/28)를 두 번째 열 아래로 넓게 편다. 버퍼·출발 목표는 `tn-stop__buffer`(`warning-soft` 위 `warning` 텍스트, 시계 아이콘).
- 근거 배지(`예약 확정`, `가족 계획`)는 메타 줄 끝에 Badge로.
- 간략 모드에서 사용자가 수동으로 펼친 행은 같은 날 다시 그려져도 펼친 채로 남는다. 상세 모드는 모든 행을 펼친다.
- 편집 모드에서는 왼쪽에 드래그 핸들(`tn-stop__handle`)이 나타나고 드래그 중인 행은 `tn-stop--dragging`으로 `shadow-md`가 붙는다.
- 소비자가 넘기는 것: `{ time, duration, title, location, badge, body, buffer, completed, expanded }`, 완료 토글과 펼침 토글 콜백.
