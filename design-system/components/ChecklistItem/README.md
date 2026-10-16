ChecklistItem은 준비물 한 가지다. 체크박스, 제목, 우선순위 배지, 한 줄 설명으로 이루어진다. 그룹(출발 전·기내 가방·캐리어) 안에 목록으로 쌓인다.

- 체크박스 24px `radius-xs`, `line-strong` 테두리. 완료는 `success` 채움에 흰 체크, 제목은 `ink-muted` 500.
- 우선순위는 Badge로: `필수`(danger), `필수 확인`(check), `개인 필수`(check), `권장`(기본). 색만이 아니라 단어로 구분한다.
- 행 전체가 `label`이라 어디를 눌러도 토글된다. 행 높이는 최소 44px.
- 설명은 `body-sm` `ink-muted`, 두 줄까지. 링크가 필요하면 설명 끝에 `tn-link`.
- 완료 상태는 사용자별로 저장되고 그룹 머리에 `3/8`로 합산해 보여준다.
- 소비자가 넘기는 것: `{ id, title, priority, description, done }`, 토글 콜백.
