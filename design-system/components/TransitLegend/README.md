TransitLegend는 지도 경로선의 색과 이동 수단을 짝짓는다. 지도 위 또는 바로 아래에 둔다.

- 다섯 수단만 있다: 항공 `transit-flight`, 철도·지하철 `transit-train`, 버스·리무진 `transit-bus`, 도보 `transit-walk`(점선), 선박 `transit-boat`. 택시는 버스 색을 쓴다.
- 경로선은 4px, 둥근 끝. 도보는 `stroke-dasharray="2 9"` 점선이라 색약 사용자도 구분한다.
- 스톱은 `surface` 채움에 `ink` 2px 테두리 원. 현재 또는 선택된 스톱은 `brand` 채움 9px에 `surface` 3px 테두리.
- 시각 라벨은 `data-sm`(mono 12px) `ink-muted`.
- 경로선은 일정의 순서를 잇는 안내선이며 실제 도로·노선 형상이 아니다. 지도 아래에 "경로선은 일정 순서 안내이며 실제 경로와 다를 수 있어요"를 `caption`으로 둔다.
- 소비자가 넘기는 것: 사용 중인 수단 목록(쓰지 않는 수단의 칩은 숨긴다).
