# 여행노트 라인 아이콘

24×24px viewBox, 선 굵기 1.75px, 둥근 선 끝과 꺾임을 사용한다. 잉크는 #171B22이다. 기본 채움은 none이며 작은 점만 잉크로 채운다. 선이 차지하는 영역까지 2~22px 안에 들어가도록 설계했다. 24px 표시를 기준으로 하며 48px 시트에서는 두 배로 확대한다.

색을 CSS로 바꾸려면 `<img>` 대신 인라인 SVG를 사용하고 `stroke`와 채워진 점의 `fill`을 함께 덮어쓴다. 원본은 명시적인 hex 색을 사용하며 currentColor에 의존하지 않는다. 배경을 칠해 선을 가리는 요소는 없다.

파일명은 소문자 kebab-case이다. 일정 유형은 type-, 날씨는 weather-, 내비게이션은 nav- 접두어를 사용한다. 동작과 여행 정보는 의미를 나타내는 단어를 사용한다. 각 파일의 한국어 aria-label은 단독 이미지용이다. 버튼 안 장식으로 넣을 때는 버튼에 접근 가능한 이름을 제공하고 중복 낭독을 막는다.


| 파일 | 의미 | 분류 |
| --- | --- | --- |
| type-airport.svg | 공항 관제탑 | 일정 유형 |
| type-flight.svg | 상승하는 비행기 | 일정 유형 |
| type-train.svg | 정면 열차 | 일정 유형 |
| type-bus.svg | 정면 버스 | 일정 유형 |
| type-walk.svg | 걷기 | 일정 유형 |
| type-boat.svg | 배 | 일정 유형 |
| type-taxi.svg | 택시 | 일정 유형 |
| type-hotel.svg | 숙소 침대 | 일정 유형 |
| type-meal.svg | 식사 그릇과 젓가락 | 일정 유형 |
| type-sight.svg | 관광 사진 프레임 | 일정 유형 |
| type-shopping.svg | 쇼핑 가방 | 일정 유형 |
| type-free.svg | 자유 일정 별 | 일정 유형 |
| check.svg | 완료 | 동작과 상태 |
| check-circle.svg | 원 안 완료 | 동작과 상태 |
| plus.svg | 추가 | 동작과 상태 |
| minus.svg | 빼기 | 동작과 상태 |
| close.svg | 닫기 | 동작과 상태 |
| edit.svg | 편집 | 동작과 상태 |
| trash.svg | 삭제 | 동작과 상태 |
| share.svg | 공유 | 동작과 상태 |
| link.svg | 링크 | 동작과 상태 |
| copy.svg | 복사 | 동작과 상태 |
| more-horizontal.svg | 더 보기 | 동작과 상태 |
| drag-handle.svg | 순서 이동 손잡이 | 동작과 상태 |
| chevron-down.svg | 아래로 펼치기 | 동작과 상태 |
| chevron-right.svg | 오른쪽으로 이동 | 동작과 상태 |
| chevron-left.svg | 왼쪽으로 이동 | 동작과 상태 |
| arrow-up.svg | 위로 이동 | 동작과 상태 |
| search.svg | 검색 | 동작과 상태 |
| filter.svg | 필터 | 동작과 상태 |
| map.svg | 지도 | 여행 정보 |
| map-pin.svg | 지도 위치 핀 | 여행 정보 |
| route.svg | 출발점과 도착점 경로 | 여행 정보 |
| clock.svg | 시간 | 여행 정보 |
| calendar.svg | 달력 | 여행 정보 |
| timer.svg | 이동 여유 시간 타이머 | 여행 정보 |
| ticket.svg | 탑승권 | 여행 정보 |
| wallet.svg | 지갑 | 여행 정보 |
| passport.svg | 여권 | 여행 정보 |
| luggage.svg | 여행 캐리어 | 여행 정보 |
| users.svg | 동행 두 명 | 여행 정보 |
| note.svg | 접힌 여행 노트 | 여행 정보 |
| weather-sun.svg | 맑음 | 날씨 |
| weather-cloud.svg | 흐림 | 날씨 |
| weather-rain.svg | 비 | 날씨 |
| weather-snow.svg | 눈 | 날씨 |
| weather-partly.svg | 구름 조금 | 날씨 |
| weather-wind.svg | 바람 | 날씨 |
| nav-itinerary.svg | 일정표 메뉴 | 내비게이션 |
| nav-food.svg | 식당 메뉴 | 내비게이션 |
| nav-shopping.svg | 쇼핑 메뉴 | 내비게이션 |
| nav-links.svg | 저장 링크 메뉴 | 내비게이션 |
| nav-prep.svg | 여행 준비 메뉴 | 내비게이션 |
