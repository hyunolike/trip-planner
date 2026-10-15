// Restaurant facts and published sample menus checked on 2026-10-08.
// Suggested eating order and itinerary buffers are family travel advice.
const breakfasts = {
  osaka: {
    name: 'MAISON VERTE · 메종 베르테', hotel: '호텔 한큐 그란 레스파이어 오사카',
    floor: '호텔 5층 · 프런트와 같은 층',
    hours: '07:00–10:00 · 09:30까지 입장·주문 권장',
    format: '일·양식 뷔페＋직원에게 주문하는 시그니처 요리',
    price: '조식 미포함 시 공식 안내 1인 4,200엔(세금 포함)',
    menus: [
      ['뷔페', '일식·양식·현지 음식에 음료까지 합쳐 약 120종. 원하는 요리를 뷔페에서 직접 가져와요.'],
      ['에그 베네딕트', '잉글리시 머핀 위 훈제연어·수란에 아보카도 소스를 얹은 개별 주문 요리예요.'],
      ['에그 샌드위치', '부드러운 스크램블에그와 소스를 넣고 발뮤다 토스터로 구운 샌드위치예요.'],
    ],
    steps: [
      '객실에서 엘리베이터로 5층에 내려와 MAISON VERTE 입구로 가요. 직원에게 객실 번호를 말하고 조식 포함 여부를 확인해요. 조식권을 받았다면 함께 보여줘요.',
      '자리 안내를 받은 뒤 에그 베네딕트 또는 에그 샌드위치 중 원하는 요리를 직원에게 먼저 주문해요. 공식 메뉴는 두 종류 중 선택하며 추가 요금이 없다고 안내해요.',
      '주문 요리를 기다리는 동안 뷔페 음식·음료를 조금씩 가져와요. 개별 주문 요리 수령은 직원 안내를 따르고, 뷔페 접시와 함께 즐겨요.',
    ],
    tips: [
      '시그니처 요리를 놓치지 않도록 착석 후 먼저 주문해요. 메뉴 이름을 말하기 어렵다면 아래 공식 메뉴 사진을 보여줘요.',
      '가족이 서로 다른 시그니처를 주문하면 두 종류를 맛보기 좋아요. 뷔페는 한 바퀴 둘러보고 작은 양부터 담아 추가 주문 요리 먹을 공간을 남겨요.',
      '10/22은 07:30 식사 시작 → 08:15 전후 식사 종료 → 08:30 전후 체크아웃 목표예요. 혼잡하면 07:00 시작으로 당기면 JR 09:00 이동 준비가 편해요.',
    ],
    sources: [
      ['공식 · 위치·시간·요금', 'https://www.hankyu-hotel.com/ko/hotel/respire/granosaka/restaurant/breakfast'],
      ['공식 · 시그니처 메뉴 사진', 'https://maison-verte.jp/pdf/menu-morning.pdf'],
    ],
  },
  kyoto: {
    name: 'KYOTO GOJO ONO · 교토 고조 오노', hotel: '더 블러썸 교토',
    floor: '호텔 1층 레스토랑',
    hours: '06:30–11:00 · 마지막 입장 10:30',
    format: '메인 6종 중 1개 선택＋뷔페＋QR로 주문하는 오믈렛',
    price: '조식 미포함 시 공식 안내 성인 1인 3,300엔(세금 포함)',
    menus: [
      ['선택 메인 · 식사형', '오니기리 정식(와규 미소·새우튀김·달걀찜·생선구이), 연어 그라탱, 베이컨·치즈 구운 샌드위치, 시소·캐슈넛 파스타.'],
      ['선택 메인 · 다른 취향', '밀크 젤라토를 곁들인 프렌치토스트 또는 쌀가루 빵의 팔라펠 버거(하루 20개 한정). 전체 6종 중 1개를 골라요.'],
      ['즉석 오믈렛', '우치노 달걀로 셰프가 만드는 오믈렛. 공식 메뉴는 원하는 때 QR 코드로 주문하도록 안내해요.'],
      ['뷔페 · 일식', '가마솥 밥, 미소시루, 고등어 미소 요리, 일본식 절임 반찬.'],
      ['뷔페 · 양식·마무리', '신신도 크루아상·빵, 샐러드·훈제연어, 베이컨·소시지, 요거트·과일·디저트, 커피·차·주스.'],
    ],
    steps: [
      '객실에서 1층 KYOTO GOJO ONO로 내려가요. 입구에서 객실 번호·조식 포함 여부를 확인하고 조식권이 있다면 보여줘요.',
      '착석 후 안내된 메인 6종 중 1개를 선택해 주문해요. 오믈렛은 현장 QR 코드로 별도 주문하고, 스마트폰 조작이 어려우면 직원에게 도와 달라고 해요.',
      '메인과 오믈렛을 기다리는 동안 밥·빵·샐러드·음료 등을 뷔페에서 직접 가져와요. 주문한 요리는 현장 안내에 따라 받아 뷔페와 함께 먹어요.',
    ],
    tips: [
      '든든한 일식을 좋아하면 오니기리 정식, 달콤한 아침을 좋아하면 프렌치토스트가 선택하기 쉬워요. 메인＋오믈렛이 있어 처음부터 뷔페를 많이 담지 않는 편이 좋아요.',
      '10/23 투어 날은 07:30 시작 → 08:30 전후 식사 종료 → 08:50 전후 호텔 출발을 권장해요. 09:30 하치조 출구 집합 목표에 맞춰 주문·이동 여유를 확보했어요.',
      '10/24은 08:00 시작 → 08:45 전후 식사 종료 → 체크아웃·짐 보관 순서예요. 두 번의 아침에 메인을 바꾸면 메뉴를 더 다양하게 즐길 수 있어요.',
      '객실에서 먹고 싶다면 Morning Box를 문의해요. 공식 안내는 수량 한정·전날 19:00까지 예약이며, 조식 포함 상품에서 대체 가능한지와 추가 비용은 직원에게 확인해요.',
    ],
    sources: [
      ['공식 · 조식 시간·방식', 'https://www.jrk-hotels.co.jp/Kyoto/restaurant/'],
      ['공식 · 메인·QR 주문 메뉴', 'https://www.jrk-hotels.co.jp/Kyoto/resources/pdf/prefix.pdf'],
      ['공식 · 뷔페 메뉴', 'https://www.jrk-hotels.co.jp/Kyoto/resources/pdf/buffet.pdf'],
      ['공식 · 1층 식당 위치', 'https://www.jrk-hotels.co.jp/hotels/pdf/kyoto_en.pdf'],
    ],
  },
};
const stopBreakfasts = { 'd2-breakfast': 'osaka', 'd3-breakfast': 'kyoto', 'd4-breakfast': 'kyoto' };
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderBreakfastGuide(stopId) {
  const breakfast = breakfasts[stopBreakfasts[stopId]];
  if (!breakfast) return '';
  return `<details class="hotel-checkin-guide breakfast-guide" id="breakfast-guide-${esc(stopId)}" open>
    <summary><i class="ti ti-coffee" aria-hidden="true"></i><span><small>${esc(breakfast.hotel)} · 아침 식사</small><b>${esc(breakfast.name)} 조식 이용 가이드</b></span><i class="ti ti-chevron-down" aria-hidden="true"></i></summary>
    <div class="hotel-checkin-body">
      <dl class="hotel-checkin-facts"><div><dt>위치</dt><dd>${esc(breakfast.floor)}</dd></div><div><dt>운영 시간</dt><dd>${esc(breakfast.hours)}</dd></div><div><dt>제공 방식</dt><dd>${esc(breakfast.format)}</dd></div><div><dt>별도 요금</dt><dd>${esc(breakfast.price)}</dd></div></dl>
      <p class="hotel-checkin-plan">체크인 때 가족 3명의 조식 포함 여부, 조식권·객실 번호 확인 방법을 물어봐요. 포함된 예약이면 중복 결제하지 않도록 먼저 예약 화면을 보여줘요.</p>
      <h4>주요 메뉴 · 이렇게 나와요</h4><dl class="breakfast-menu-list">${breakfast.menus.map(([label, description]) => `<div><dt>${esc(label)}</dt><dd>${esc(description)}</dd></div>`).join('')}</dl>
      ${stopId === 'd2-breakfast' ? `<section class="breakfast-special-photo"><h4>스페셜 오더 · 메뉴판 사진</h4><p><b>에그 베네딕트 또는 에그 샌드위치 중 한 가지</b>를 직원에게 주문해요. 메뉴판에는 추가 요금이 없다고 안내돼 있어요.</p><button type="button" data-walking-map-open="breakfast-menu" aria-label="MAISON VERTE 스페셜 메뉴 사진 확대"><img src="/images/breakfast/maison-verte-special-menu.png" alt="MAISON VERTE 조식 스페셜 메뉴판. 훈제연어와 아보카도 소스의 에그 베네딕트, 발뮤다 토스터로 구운 에그 샌드위치 사진" width="1179" height="1635" loading="lazy"><span>메뉴판 사진 크게 보기 ↗</span></button><p class="shopping-checked">조식 메뉴판 · 두 메뉴 모두 밀·달걀·유제품 포함 · 알레르기가 있으면 주문 전에 직원에게 알려요.</p></section>` : ''}
      <h4>입장부터 식사까지</h4><ol class="guide-steps">${breakfast.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
      <h4>가족 조식 꿀팁</h4><ul class="breakfast-tips">${breakfast.tips.map(tip => `<li>${esc(tip)}</li>`).join('')}</ul>
      <div class="hotel-phrase"><b>입구에서 보여줄 문장</b><p lang="en">Is breakfast included in our reservation?</p><p lang="ja">予約に朝食は含まれていますか。</p><span>우리 예약에 조식이 포함되어 있나요?</span></div>
      <div class="guide-sources">${breakfast.sources.map(([label,url]) => `<a class="source-link" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)}</a>`).join('')}</div>
      <p class="hotel-checked">2026.10.08 공식 안내·공개 메뉴 확인. 메뉴는 현재 공개된 예시이며 재료 수급·계절에 따라 바뀔 수 있어요. 시간·요금은 방문 전 재확인하고, 식사 순서·권장 시각은 가족 여행 팁으로 참고해요.</p>
    </div>
  </details>`;
}
