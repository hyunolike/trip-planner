PlaceCard는 맛집·쇼핑·숙소 후보 하나를 보여준다. 이름, 지점, 사실 세 줄, 메모, 출처와 확인일의 순서가 고정이다.

- 머리: 이름 `title-md`, 지점·원어명 `body-sm`(`ink-muted`), 오른쪽에 카테고리 Badge(pill).
- 사실 목록은 `dl`로 위치·영업·메뉴(또는 품목). 영업시간은 mono로 조판하고 괄호 안 주문 마감은 `ink-muted`.
- 메모는 `body` 한 단락. 추정은 "후보", "확인해 주세요"로 표현한다.
- 바닥: 왼쪽 출처 링크(`tn-link`, 링크 아이콘), 오른쪽 `caption` 확인일. 확인일 없는 정보는 "미확인"으로 적는다.
- 면 `surface`, 테두리 `line`, 그림자 없음. 최대 너비 420px, 데스크톱에서 2~3열.
- 소비자가 넘기는 것: `{ name, branch, category, area, hours, items|menu, note, sources[], mapUrl, checkedAt }`.
