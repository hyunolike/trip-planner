const esc = (value = '') => String(value).replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'})[char]);
const external = (label, url) => `<a class="source-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;

export const preparationGroups = [
 {id:'before',title:'출발 전 준비',hint:'10월 21일 출발 전에 가족이 함께 확인해요.',items:[
  ['passports','필수','가족 3명 여권 원본','유효기간과 항공권 영문명을 확인하고, 여권 사본은 원본과 따로 보관해요.'],
  ['flights','필수','항공권·호텔 예약 확인서','10/21 김포 08:10 출발, 10/24 간사이 20:30 출발. 가족 이름·조식 포함 여부·짐 허용량을 실제 예약서에서 확인해요.'],
  ['vjw','필수','Visit Japan Web 등록','가족별 입국·세관 QR을 준비해요. 공식 사이트에서 정보를 확인하고 여권과 함께 꺼내기 쉬운 곳에 둬요.'],
  ['tickets','필수','리무진·하루카·입장권 사용 방법','아래 예약 모음에서 사용 날짜·방향·인원과 바우처의 교환 방법을 확인해요. WEST QR은 등록과 좌석 예약을 마쳐도 사용개시는 탑승 당일에 해요.'],
  ['dutyfree','필수 확인','면세품 교환권·출국 정보','구매한 면세점 앱에서 출국일 10/21·김포공항·여권 정보를 확인하고 교환권을 준비해요. 출국심사 후 인도장에서 수령하므로 기내 가방에 넣을 공간을 남겨요.'],
  ['connection','필수','일본에서 쓸 인터넷','eSIM·로밍·유심 중 준비한 방식의 개통 안내를 저장해요. WEST QR은 인터넷 연결이 필요해요.'],
  ['money','필수','엔화 현금·결제 카드','ICOCA 구입·충전용 현금을 따로 준비해요. 코나카드·트래블월렛·토스 중 실제 사용할 카드의 해외 사용 가능 여부와 잔액을 앱에서 확인해요.'],
  ['insurance','권장','여행자보험·긴급 연락처','가입했다면 증권과 연락처를 저장하고, 호텔 주소·전화번호도 가족끼리 공유해요.'],
 ]},
 {id:'cabin',title:'기내 가방 · 손에 가까이',hint:'위탁하지 않고 직접 챙길 물건이에요.',items:[
  ['wallet','필수','여권·지갑·예약 화면','버스와 호텔에서 바로 꺼낼 수 있게 작은 가방에 모아요. 여권·예약 QR은 공개 공유하지 않아요.'],
  ['phone','필수','휴대폰·충전 케이블','출발 전 완충하고, 가족 연락 방법과 일본 데이터 연결을 확인해요.'],
  ['powerbank','필수 확인','보조배터리·개별 보호 파우치','보조배터리는 위탁하지 않아요. 용량 표시를 확인하고 1개씩 분리 포장하거나 단자를 보호해요. 아래 아시아나 규정도 확인하세요.'],
  ['medicines','개인 필수','평소 복용약·안경','필요한 약은 원래 포장과 복용 정보를 함께 챙겨요. 일본 반입 제한이 있는 약은 출발 전에 공식 안내를 확인해요.'],
  ['liquids','필수 확인','100mL 이하 용기·1L 투명 지퍼백','기내 액체류는 용기당 100mL 이하, 1인당 1L 이하 투명 지퍼백 1개에 모아요.'],
  ['comfort','권장','휴지·물티슈·마스크·빈 물병','공항과 이동 중 사용할 것만 소량 챙겨요. 물은 보안검색 뒤 채워요.'],
 ]},
 {id:'case',title:'캐리어 · 3박 4일 짐',hint:'수량은 1인 기준 제안이에요. 세탁·취향에 맞춰 줄여도 좋아요.',items:[
  ['clothes','필수','상의 3–4장·하의 2장','편한 옷 위주로 고르고 호텔·여행용 옷을 구분해요.'],
  ['underwear','필수','속옷·양말 각 4세트','갈아입을 여유분 1세트는 작은 가방에 따로 넣어도 좋아요.'],
  ['jacket','필수','가벼운 겉옷·편한 운동화','오사카성·아라시야마·후시미이나리에서 많이 걸어요. 새 신발보다 익숙한 신발을 신고, 겉옷은 아침·저녁에 꺼내요.'],
  ['toiletries','개인 필수','세면·보습·선크림·잠옷','호텔 비품을 확인해 필요한 것만 챙기고, 큰 액체 용기는 위탁 짐에 넣어요.'],
  ['adapter','필수','일본용 A형 플러그 어댑터','한국 플러그용 어댑터와 충전기를 준비해요. 어댑터는 전압을 바꾸지 않으므로 기기의 100–240V 표시를 확인해요.'],
  ['rain','권장','접이식 우산·작은 크로스백','비에 대비하고, 관광 때는 여권·휴대폰·물만 가볍게 들고 다녀요.'],
  ['souvenirs','권장','접는 가방·지퍼백·여유 공간','기념품과 갈아입은 옷을 구분해요. 유리병·도자기는 완충 포장하고 캐리어 무게를 확인해요.'],
 ]},
 {id:'last',title:'전날 밤 · 집에서 나가기 전',hint:'10월 20일 밤에 정리하고, 21일 아침에 다시 확인해요.',items:[
  ['weather','필수','날씨·교통 운행·공항 이동 확인','일본 날씨를 보고 겉옷을 조절해요. 김포공항 국제선 06:00 도착 목표에 맞춰 이동편과 알람을 준비해요.'],
  ['screens','필수','예약서 저장·WEST QR 로그인 확인','예약 확인서는 저장해 두되 WEST QR 승차용 QR은 캡처본으로 탈 수 없어요. 현장에서 실시간 화면을 열 수 있는지 확인해요.'],
  ['bagweight','필수','짐 무게·배터리 위치 확인','허용량은 항공권 조건으로 확인해요. 보조배터리는 기내 가방, 큰 액체는 위탁 짐으로 나눠요.'],
  ['home','필수','여권 3권·휴대폰·카드 마지막 확인','가족이 각자 한 번씩 확인하고 집의 전기·가스·문 잠금도 살펴요.'],
 ]},
];

export const reservationCards = [
 {title:'10/21 · 공항 리무진',status:'저장된 예약 · 클룩 예약 완료',text:'9/3 예약 완료 메모가 있어요. 클룩 바우처에서 이용일·우메다 노선·교환 장소를 확인해요. 상품에 따라 표 교환 방식이 달라 C 매표소 직원에게 바우처를 먼저 보여주고, 하비스 정차편인지 확인해요. 추가 구매·ICOCA 결제는 하지 않아요.',url:'https://www.klook.com/ko/faq/category-31-question-9774/',label:'클룩 예약 확인 안내'},
 {title:'10/21 · 하루카스 300',status:'저장된 예약 · 클룩 예약 메모',text:'현재 일정은 16:30–18:15 관람 계획이에요. 예약 화면의 날짜·유효기간·인원과 QR 또는 티켓 교환 안내를 확인해요. 예약 시각이 따로 있으면 해당 시각을 우선해요.',url:'https://www.abenoharukas-300.jp/en/observatory/information.html',label:'하루카스 공식 입장 안내'},
 {title:'10/21 · 원더크루즈 20:00',status:'예약 확정 · 가족 3명',text:'닛폰바시 선착장 19:40 도착 목표, 19:50까지 접수·티켓 수령. 예약 메일과 완료 화면을 준비해요.',url:'https://wondercruise.jp/',label:'원더크루즈 안내'},
 {title:'10/24 · 교토 → 간사이공항 하루카',status:'저장된 예약 · 구매·e-ticket 등록 완료',text:'구매·등록 메모가 있어요. 열차 시각·호차·좌석은 실제 티켓에서 확인해야 합니다. 일정의 16:00은 계획 시각이에요. WEST QR이면 사이트에서 지정석을 예약하고 당일 사용개시, 종이표 교환형이면 발매기·창구에서 표를 받아요.',url:'https://www.westjr.co.jp/global/kr/ticket/westqr/userguide/',label:'WEST QR 사용·좌석 예약 안내'},
];

export function renderDutyFreePickup(compact = false) {
 const mapUrl = 'https://static.lottedfs.com/contents/images/store-img/pc-menu-img/20260423000010177bf0963b0917b4524909c4f939408e3e4.webp';
 const location = '국제선 출국심사 후 34번 게이트 방향으로 이동해요. 롯데·신라아이파크는 맞은편 에스컬레이터로 올라가는 4층 인도장이에요.';
 if (compact) return `<aside class="donki-coupon dutyfree-shortcut"><h3><i class="ti ti-shopping-bag" aria-hidden="true"></i> 출국 전 면세품 수령</h3><p>${location} 구매처에 따라 안내가 다르므로 교환권의 위치를 먼저 확인해요.</p><p><b>여권 원본 + 탑승권 + 구매처 교환권</b>을 준비하고, 수령 뒤 탑승구로 이동해요.</p><div class="guide-sources"><a class="source-link" href="#preparation" data-view="preparation">구매처별 인도장·수령 순서 보기</a>${external('롯데 공식 위치 지도 확대',mapUrl)}</div></aside>`;
 return `<section id="dutyfree-pickup" class="dutyfree-pickup" aria-labelledby="dutyfree-title"><header class="dining-heading"><span class="dining-kicker">10/21 · 김포공항 국제선 · 08:10 출발</span><h2 id="dutyfree-title">미리 산 면세품 · 출국 전 수령</h2><p>온라인·시내 면세점 주문은 구매처의 인도장 창구에서 받아요. 공항 면세 매장과 수령 창구를 구분해요.</p></header><p class="dutyfree-location"><i class="ti ti-map-pin" aria-hidden="true"></i><b>${location}</b></p>
 <ol class="procedure-list"><li><b>01</b><span>06:00 공항 도착 목표 → 체크인·수하물 위탁 → 보안검색·출국심사</span></li><li><b>02</b><span>34번 게이트 방향으로 이동 → 교환권에 적힌 구매처·층·창구 확인</span></li><li><b>03</b><span>여권 원본·탑승권·교환권 제시 → 상품명·수량·상태 확인 후 수령</span></li><li><b>04</b><span>수령 후 탑승구 이동 → 07:30 도착 목표. 실제 탑승권 시각을 우선해요.</span></li></ol>
 <div class="dutyfree-table-wrap"><table class="dutyfree-table"><caption>구매한 면세점별 위치 안내</caption><thead><tr><th scope="col">구매처</th><th scope="col">공식 안내 위치</th><th scope="col">인도장 전화</th></tr></thead><tbody><tr><th scope="row">롯데</th><td>34번 게이트 맞은편 에스컬레이터 → 4층</td><td><a href="tel:0226661058">02-2666-1058</a></td></tr><tr><th scope="row">신라아이파크</th><td>34번 게이트 맞은편 에스컬레이터 → 4층</td><td><a href="tel:0226662686">02-2666-2686</a></td></tr><tr><th scope="row">신라</th><td>공식 페이지에는 34번 게이트 앞 안내. 교환권의 최신 층·창구를 확인해요.</td><td><a href="tel:0226662730">02-2666-2730</a></td></tr></tbody></table></div>
 <p class="dining-note"><b>아침 수령 시간을 먼저 확보해요.</b> 롯데 안내 운영시간은 07:00–20:00이며 당일 운항에 따라 변동될 수 있어요. 가족 계획은 07:00 전후 수령, 07:30 탑승구 도착 목표예요. 대기하면 식사·추가 쇼핑보다 수령과 탑승을 우선해요. 다른 구매처는 교환권과 앱에서 운영시간을 확인해요.</p>
 <p class="travel-link-description">주문자 본인의 여권 정보와 출국 정보가 맞는지 전날 확인해요. 여러 면세점에서 샀다면 구매처별 교환권을 각각 준비하고, 각 창구에서 모두 받았는지 확인해요.</p><div class="guide-sources">${external('롯데 공식 위치 지도 확대',mapUrl)}${external('롯데 수령·인도장 안내','https://kor.lottedfs.com/kr/product/productDetail?prdNo=20000725440&previewYn=Y')}${external('신라아이파크 인도장 안내','https://shillaipark.com/estore/kr/ko/shilladfscustomercenter/centerguidereceive')}${external('신라 인도장 안내','https://www.shilladfs.com/comm/kr/ko/shoppingGuideStep3')}</div><p class="guide-checked">2026.10.11 공식 안내 확인 · 위치와 시간은 구매처의 교환권·당일 안내를 최종 확인해요.</p></section>`;
}

export function renderPreparation(state = {}) {
 const checked = state.completedPreparation || [];
 const all = preparationGroups.flatMap(group=>group.items);
 const count = all.filter(item=>checked.includes(item[0])).length;
 return `<section id="preparation" class="dining preparation" aria-labelledby="preparation-title"><header class="dining-heading"><span class="dining-kicker">10.21–10.24 · 가족 3명 · 3박 4일</span><h1 id="preparation-title" tabindex="-1">출발 준비</h1><p>필수 서류부터 캐리어까지, 챙긴 항목을 체크해요.</p></header>${renderDutyFreePickup()}<div class="preparation-progress"><b data-prep-total aria-live="polite">${count} / ${all.length}개 준비 완료</b><progress data-prep-progress max="${all.length}" value="${count}" aria-label="출발 준비 완료율"></progress><p>체크는 이 기기·브라우저에 저장돼요. 가족의 다른 기기와 자동 공유되지는 않아요.</p></div><div class="preparation-grid">${preparationGroups.map(group=>`<section class="preparation-group" data-prep-group="${group.id}"><header><h2>${group.title}</h2><span data-prep-group-count>${group.items.filter(item=>checked.includes(item[0])).length} / ${group.items.length}</span></header><p>${group.hint}</p><ul>${group.items.map(([id,tag,title,note])=>`<li><label><input type="checkbox" data-preparation-id="${id}" ${checked.includes(id)?'checked':''}><span><small>${tag}</small><b>${title}</b><span>${note}</span></span></label></li>`).join('')}</ul></section>`).join('')}</div><section class="preparation-rules"><h2>기내 짐 · 헷갈리는 세 가지</h2><dl><div><dt>보조배터리</dt><dd>아시아나 2026.4.20 시행 안내 기준, 100Wh 이하 최대 2개. 100Wh 초과–160Wh 이하는 항공사 승인 필요, 160Wh 초과는 운송 불가예요. 위탁·기내 사용·충전·머리 위 선반 보관은 금지하며 직접 소지하거나 앞 좌석 주머니에 보관해요.</dd></div><div><dt>액체류</dt><dd>용기당 100mL 이하를 1L 이하 투명 지퍼백 1개에 모아요. 내용물이 조금 남아 있어도 용기 크기를 확인해요. 디퓨저 같은 큰 액체 제품은 반입 가능 여부를 확인하고 위탁 짐에 포장해요.</dd></div><div><dt>평소 복용약</dt><dd>여행에 필요한 양과 복용 정보를 준비해요. 일본 반입 제한·사전 절차가 필요한지 공식 안내로 확인하고, 필요한 약은 손에 가까운 가방에 둬요.</dd></div></dl><div class="guide-sources">${external('아시아나 배터리 규정','https://flyasiana.com/C/DE/KO/customer/notice/detail?id=CM202604100002528761')}${external('아시아나 액체·제한 물품','https://m.flyasiana.com/C/KR/KO/contents/restricted-transport-items')}${external('일본 의약품 반입 안내','https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iyakuhin/kojinyunyu/topics/tp010401-1_00001.html')}${external('Visit Japan Web','https://www.digital.go.jp/en/policies/visit_japan_web')}${external('일본 플러그·전압 / JNTO','https://www.japan.travel/ko/plan/plug-and-electricity/')}</div><p class="guide-checked">2026.10.08 공식 안내 확인 · 실제 수하물 허용량은 항공권 조건을 확인해요.</p></section><section id="reservations" class="reservation-section"><h2>예약·티켓 한곳에 모아 보기</h2><p>저장한 예약 정보입니다. 이용일, 탑승 시간, 좌석은 실제 예약 화면에서 확인하세요.</p><div class="preparation-grid">${reservationCards.map(card=>`<article class="reservation-card"><small>${card.status}</small><h3>${card.title}</h3><p>${card.text}</p>${external(card.label,card.url)}</article>`).join('')}</div><p class="reservation-note">바우처 원본은 클룩 앱·예약 이메일에 보관해요. WEST QR은 인터넷과 실시간 QR 화면이 필요하며 캡처본으로는 개찰할 수 없어요. 개인 예약번호·승차 QR은 이 공개 페이지에 올리지 않아요.</p></section><a class="dining-return" href="#itinerary" data-view="itinerary">여행 일정 보기</a></section>`;
}

export function renderReservationShortcut(stopId) {
 if (!['d1-icoca','d1-bus','d1-harukas','d1-cruise','d4-haruka'].includes(stopId)) return '';
 return '<a class="source-link reservation-shortcut" href="#preparation" data-view="preparation">예약·티켓 준비사항 보기</a>';
}

export function renderDonkiCoupon(stopId) {
 if (stopId && stopId !== 'd3-shopping') return '';
 return `<aside class="donki-coupon"><h3>돈키호테 · 결제 전에 쿠폰 확인</h3><p>할인쿠폰을 쇼핑 전에 열어두고 계산 전에 직원에게 보여줘요. 유효기간·최소 구매액·제외 품목·중복 적용 조건은 열린 쿠폰의 최신 안내를 확인해요. 면세를 이용하려면 여권 원본을 챙겨요.</p><div class="guide-sources">${external('돈키호테 한국어 쿠폰','https://japanportal.donki-global.com/coupon/cp001_ko.html')}${external('제휴 할인쿠폰','https://www.donki.com/campaign/hikikae/myreal-trip.php')}</div></aside>`;
}

export function renderCharacterShopping() {
 const shops=[
  {name:'나가노마켓 신사이바시',place:'신사이바시 PARCO 5층',hours:'10:00–20:00 · 공식 안내 기준',items:'나가노의 곰·치이카와 등 캐릭터 굿즈',tip:'노션에 공룡 인형 메모가 있어요. 원하는 인형의 사진을 보여주고 취급·재고를 먼저 물어봐요. 1일차는 촘촘하므로 관광을 줄일 때만 20–30분 선택 코스로 두세요.',url:'https://nagano-info.jp/tenpo_nm/shinsaibashi/',query:'ナガノマーケット 心斎橋PARCO'},
  {name:'Nintendo OSAKA',place:'LUCUA SOUTH 13층 · JR 오사카역 근처',hours:'10:00–20:00 · 공식 안내 기준',items:'마리오·젤다·스플래툰 등 닌텐도 굿즈',tip:'노션의 ‘다이마루 우메다’ 메모는 현재 공식 명칭 LUCUA SOUTH로 갱신했어요. 호텔·오사카역 주변에 여유가 생기면 20–30분 방문 후보예요. 혼잡일에는 입장 정리권 안내를 확인해요.',url:'https://www.nintendo.com/jp/officialstore/index.html',query:'Nintendo OSAKA LUCUA SOUTH 13F'},
 ];
 return `<section class="character-shopping"><h2>캐릭터 쇼핑 · 여유 있을 때 선택</h2><p>첫날 관광·휴식을 먼저 지키고, 아래 두 곳을 모두 넣기보다는 원하는 한 곳만 골라요.</p><div class="preparation-grid">${shops.map(shop=>`<article class="character-card"><span class="dining-category">선택 쇼핑 · 일정 고정 아님</span><h3>${shop.name}</h3><p><b>${shop.place}</b><br>${shop.hours}</p><p>${shop.items}</p><p>${shop.tip}</p><div class="guide-sources">${external('공식 매장·입장 안내',shop.url)}${external('Google 지도','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(shop.query))}</div></article>`).join('')}</div><p class="shopping-checked">2026.10.08 공식 안내 확인 · 상품 재고와 입장 방식은 방문 전 다시 확인해요.</p></section>`;
}
