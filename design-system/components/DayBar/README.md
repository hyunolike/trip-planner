DayBar는 일정표의 날짜 선택이다. 상단 바 바로 아래에 sticky로 붙어 어느 날을 보고 있는지 항상 보인다.

- 열 하나가 하루: 일차(`label`), 날짜(`data`, mono), 도시(`caption`). 4일까지는 균등 분할, 5일 이상은 가로 스크롤하며 선택한 날이 보이도록 스크롤한다.
- 선택은 `aria-current="date"`. `surface-brand` 배경과 하단 3px `brand` 밑줄, 텍스트도 `brand`. 밑줄은 220ms로 이동한다.
- 면은 `surface`, 아래에 `line` 1px. 스크롤로 떠 있을 때 `shadow-sm`.
- 도시 줄은 두 단어까지. 긴 경우 `교토 → KIX`처럼 화살표로 줄인다.
- 소비자가 넘기는 것: `[{ number, dateLabel, city }]`, 선택 인덱스, 변경 콜백. 날짜 변경 시 스크롤 위치는 일정 리스트 맨 위로 돌아간다.
