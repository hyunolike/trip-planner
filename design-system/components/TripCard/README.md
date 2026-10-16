TripCard는 여행 하나를 대표한다. 홈의 공개 샘플, 내 여행 목록, 공유 링크 미리보기에 같은 모양으로 쓴다.

- 대표 사진 16:9(`radius-md` 카드 안에서 위쪽만 둥글게). 사진이 없으면 `surface-brand` 면에 로고 마크, 비공개 여행은 `surface-sunken` 면.
- 제목은 `display-md`(명조 22px). 이 카드가 화면에서 명조를 쓰는 유일한 자리이며, 제목은 두 줄까지.
- 날짜 줄은 `data`(mono): `2026.10.21 — 10.24 · 3박 4일`. 바닥 줄은 도시와 동행 아바타(최대 3개 + `+n`) 또는 권한 배지.
- 카드 전체가 링크다. hover에 2px 떠오르고, 포커스 링은 카드 바깥.
- 최대 너비 360px. 목록은 모바일 1열, 태블릿 2열, 데스크톱 3열 격자.
- 소비자가 넘기는 것: `{ title, coverUrl, startDate, endDate, nights, cities, travelers | visibility }`, href.
