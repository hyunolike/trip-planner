// Hotel-specific facts checked against official hotel information on 2026-10-08.
// Registration, luggage requests and phrases below are practical travel guidance.
const hotels = {
  osaka: {
    name: '호텔 한큐 그란 레스파이어 오사카', english: 'Hotel Hankyu GRAN RESPIRE OSAKA',
    front: '5층 프런트·로비', checkin: '15:00부터', checkout: '12:00까지',
    entrance: 'GRAND GREEN OSAKA 남관(5-54 Ofuka-cho)의 호텔 입구에서 로비행 엘리베이터로 5층에 올라가요. 1층·2층 입구가 있으며 2층은 06:00–00:30에 이용할 수 있어요. 지도·택시에는 GRAN이 포함된 호텔명을 보여줘요. LINKS UMEDA의 한큐 레스파이어와는 다른 호텔이에요.',
    plan: '10/21 12:55 전후 짐 보관을 요청하고, 관광·저녁 후 22:00–22:15 전후 객실 체크인을 할 계획이에요. 낮에 짐을 맡길 때 늦은 도착 예정도 전달해요.',
    registration: '5층 프런트 직원에게 체크인을 요청하고 예약 화면을 보여줘요. 낮에 맡긴 짐이 있다면 보관표를 함께 보여줘요.',
    departure: '10/22 아침 조식 후 계획한 시간에 체크아웃해요. 카드키를 반납하고 추가 결제 여부를 확인한 뒤 오사카역으로 이동해요.',
    phone: '+81-6-6372-8506', tel: '+81663728506',
    sources: [['공식 · 프런트·체크인 시간', 'https://www.hankyu-hotel.com/ko/hotel/respire/granosaka/info'], ['공식 · 입구·오시는 길', 'https://www.hankyu-hotel.com/ko/hotel/respire/granosaka/access']],
  },
  kyoto: {
    name: '더 블러썸 교토', english: 'THE BLOSSOM KYOTO',
    front: '1층 프런트·로비', checkin: '15:00부터', checkout: '11:00까지',
    entrance: 'THE BLOSSOM KYOTO 표지가 있는 호텔 입구로 들어가 1층 프런트로 가요. 고조역 1번 출구에서 호텔까지 공식 안내는 도보 약 2분이에요. 짐이 크면 역의 엘리베이터를 이용하고 추가 이동 시간을 잡아요.',
    plan: '10/22 09:45에는 짐 보관을 요청하고, 아라시야마 관람 후 16:00 전후 돌아와 객실 체크인을 할 계획이에요. 객실에서 약 30분 쉬고 저녁 산책을 준비해요.',
    registration: '1층 프런트에 예약 대표자 이름과 예약 확인서를 보여 주고 체크인을 요청해요. 아침에 맡긴 짐이 있다면 보관표를 함께 보여줘요.',
    departure: '10/24 조식 후 체크아웃하고 후시미이나리 관람 동안 짐 보관을 요청해요. 14:30 전후 다시 와서 찾는 계획이므로 당일 보관 가능 시간과 수령 장소를 직원에게 확인해요.',
    phone: '+81-75-754-8735', tel: '+81757548735',
    sources: [['공식 · 체크인·서비스', 'https://www.jrk-hotels.co.jp/Kyoto/facilities/'], ['공식 · 1층 프런트 안내', 'https://www.jrk-hotels.co.jp/hotels/pdf/kyoto_en.pdf'], ['공식 · 호텔 교통', 'https://www.jrk-hotels.co.jp/Kyoto/access/']],
  },
};
const stopHotels = { 'd1-hotel': 'osaka', 'd1-return': 'osaka', 'd2-hotel': 'kyoto', 'd2-checkin': 'kyoto' };
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function renderHotelGuide(stopId) {
  const hotel = hotels[stopHotels[stopId]];
  if (!hotel) return '';
  return `<details class="hotel-checkin-guide" id="hotel-guide-${esc(stopId)}"><summary><i class="ti ti-building-skyscraper" aria-hidden="true"></i><span><small>호텔 도착 후 이렇게 해요</small><b>${esc(hotel.name)} 체크인·짐 보관</b></span><i class="ti ti-chevron-down" aria-hidden="true"></i></summary><div class="hotel-checkin-body"><p class="hotel-checkin-plan">${esc(hotel.plan)}</p><dl class="hotel-checkin-facts"><div><dt>프런트</dt><dd>${esc(hotel.front)}</dd></div><div><dt>체크인</dt><dd>${esc(hotel.checkin)}</dd></div><div><dt>체크아웃</dt><dd>${esc(hotel.checkout)}</dd></div></dl><h4>체크인 순서</h4><ol class="guide-steps"><li>${esc(hotel.entrance)}</li><li>예약 확인서·앱 화면과 예약 대표자 영문 이름을 준비해요. 가족 3명의 여권 원본을 꺼내 직원 안내에 따라 제시하고, 숙박 인원·날짜·객실·조식 포함 여부를 확인해요.</li><li>${esc(hotel.registration)}</li><li>예약의 선결제 여부를 확인하고, 미결제 숙박비나 별도 숙박세가 있는지 물어봐요. 예약 상품에 따라 다르므로 이미 낸 항목과 현장 결제할 항목을 구분해요.</li><li>카드키를 받고 객실 번호, 엘리베이터 이용 방법, 조식 장소·시간을 확인해요. 맡긴 짐을 찾고 객실로 올라가요.</li></ol><h4>체크인 시간 전에 도착했다면</h4><p>프런트에 오늘 숙박 예약이 있다고 말하고 짐 보관을 요청해요. 보관 가능 시간·방법을 확인하고 보관표가 발급되면 잃어버리지 않게 챙겨요. 여권·지갑·약은 작은 가방에 넣어 가지고 나가요. 15시 전 객실 입실은 확정된 것으로 생각하지 않고, 가능 여부와 추가 비용을 확인해요.</p><h4>프런트에 보여줄 문장</h4><div class="hotel-phrase"><b>체크인 요청</b><p lang="en">I have a reservation. I'd like to check in.</p><p lang="ja">予約しています。チェックインをお願いします。</p><span>예약했습니다. 체크인 부탁드립니다.</span></div><div class="hotel-phrase"><b>먼저 짐 맡기기</b><p lang="en">Could you keep our luggage before check-in?</p><p lang="ja">チェックイン前に荷物を預けてもいいですか。</p><span>체크인 전에 짐을 맡겨도 될까요?</span></div>${stopHotels[stopId] === 'osaka' ? '<div class="hotel-phrase"><b>밤에 돌아올 예정 전달</b><p lang="en">We plan to check in around 10 p.m.</p><span>밤 10시쯤 체크인할 예정입니다. 더 늦어지면 호텔에 도착 예정 시각을 알려요.</span></div>' : ''}<h4>체크아웃 때</h4><p>${esc(hotel.departure)}</p><div class="hotel-contact"><span>${esc(hotel.english)}</span><a href="tel:${hotel.tel}"><i class="ti ti-phone" aria-hidden="true"></i>${esc(hotel.phone)}</a></div><div class="guide-sources">${hotel.sources.map(([label,url]) => `<a class="source-link" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)}</a>`).join('')}</div><p class="hotel-checked">2026.10.08 공식 호텔 안내 확인 · 프런트 위치·기본 시간은 공식 정보이며, 절차·대화 문장은 여행 준비 안내예요. 실제 예약 확인서의 조건을 함께 확인해요.</p></div></details>`;
}
