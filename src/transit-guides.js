import { renderHarukaGuide, renderHarukaMap } from './haruka-guide.js';
import { renderKixAirsideGuide, renderKixAirsideMap, renderKixShoppingGuide } from './kix-airside.js';
const sources = {
  kix: 'https://www.kansai-airport.or.jp/en/faq/1016',
  icoca: 'https://www.jr-odekake.net/icoca/purchase/icoca.html',
  machine: 'https://www.westjr.co.jp/travel-information/en/train-usage-guide/howto/ticket-vending-machine/',
  bus: 'https://www.kate.co.jp/en/kix_busstop/',
  timetable: 'https://www.kate.co.jp/en/timetable/detail/UM',
  busHow: 'https://www.kate.co.jp/en/guide/',
  atom: 'https://kansaionepass.com/kf_pr/kf_pr_sale_en.html',
  blog: 'https://m.blog.naver.com/a828/224420772191',
  osaka: 'https://eki.jr-odekake.net/premises?id=0610130',
  kyoto: 'https://eki.jr-odekake.net/premises?id=0610116',
  route: 'https://www.jr-odekake.net/station/pdf/teisya_03.pdf',
  hotel: 'https://www.hankyu-hotel.com/ko/hotel/respire/granosaka/access',
};
const links = (items) => `<div class="castle-course-links">${items.map(([key,label])=>`<a href="${sources[key]}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`).join('')}</div>`;
const marker = (id) => `<defs><marker id="${id}-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="#1254c8"/></marker></defs>`;
const line = (id,d,color='#1254c8') => `<path d="${d}" fill="none" stroke="white" stroke-width="15" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="7" stroke-linejoin="round" marker-end="url(#${id}-arrow)"/>`;
const pin = (x,y,n) => `<circle cx="${x}" cy="${y}" r="22" fill="#1254c8" stroke="white" stroke-width="4"/><text x="${x}" y="${y+8}" text-anchor="middle" fill="white" font-size="23" font-weight="800">${n}</text>`;
const box = (x,y,w,title,sub) => `<rect x="${x}" y="${y}" width="${w}" height="95" rx="12" fill="#edf4ff" stroke="#cadbf2"/><text x="${x+18}" y="${y+36}" font-size="25" font-weight="700">${title}</text><text x="${x+18}" y="${y+70}" font-size="20" fill="#526176">${sub}</text>`;
export function renderAirportMap(id='airport-inline') {
 return `<svg class="castle-course-map" viewBox="0 0 1280 1080" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">간사이공항 입국부터 ICOCA 구매와 버스 탑승까지</title><desc id="${id}-desc">입국장 1층에서 2층으로 올라가 연결다리를 건너 JR역에서 ICOCA를 구입하고, 터미널 1층으로 돌아와 C 매표소에서 예약 바우처를 제시하거나 표를 준비한 뒤 5번 정류장에 갑니다. 위쪽은 층별 개략도, 아래쪽은 공식 버스 정류장 지도입니다.</desc>${marker(id)}<rect width="1280" height="1080" fill="white"/><g fill="#18304b" font-family="sans-serif"><text x="40" y="48" font-size="29" font-weight="800">T1 도착 → 2F 교통카드 → 1F 리무진</text><text x="40" y="82" font-size="20">위: 층별 동선 개략도 · 아래: KATE 공식 버스 정류장 지도</text>
${box(50,125,300,'① 1F 국제선 도착장','수하물·세관 후 입국 완료')}${box(480,125,310,'② 터미널 2F','Railways / 鉄道 표지 따라가기')}${box(920,125,310,'③ JR 간사이공항역','연결다리 건너 ICOCA 구매')}
${line(id,'M360 172L465 172')}${line(id,'M800 172L905 172')}
<text x="375" y="140" font-size="20">엘리베이터 ↑</text><text x="804" y="140" font-size="20">연결다리</text>
${line(id,'M1070 234L1070 290L635 290L635 325')}
${box(480,335,310,'④ 터미널 1F 복귀','다리 되돌아와 엘리베이터 ↓')}
<text x="60" y="470" font-size="24" font-weight="700">⑤ C 매표소: 예약 표 확인 → ⑥ 5번 · 하비스행</text>
<image href="/images/guides/kix-t1-bus-stops.png" x="0" y="505" width="1280" height="432"/>
${line(id,'M640 879L640 846L538 846L538 810')}${line(id,'M538 810L490 810L490 754')}${pin(538,840,5)}${pin(440,748,6)}
<rect x="40" y="956" width="1200" height="89" rx="12" fill="#eff8f5"/><text x="60" y="991" font-size="25" font-weight="700">5番から HERBIS OSAKA へ → ホテルまで徒歩10–15分</text><text x="60" y="1024" font-size="20">GRAN RESPIREはGRAND GREEN南館。停留所の「Hotel Hankyu RESPIRE」と別のホテルです。</text></g></svg>`;
}
export function renderJrMap(id='jr-inline') {
 return `<svg class="castle-course-map" viewBox="0 0 1440 1300" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">ホテルからJR 오사카역 신쾌속·교토역까지 이동 안내</title><desc id="${id}-desc">호텔에서 오사카역 북쪽으로 이동하고 3층 연결교 개찰구에서 ICOCA를 찍습니다. 공식 지도에 표시한 교토 방면 지상 승강장에서 전광판의 신쾌속과 승강장 번호를 확인합니다. 신오사카, 다카쓰키를 지나 교토에서 하차하고 중앙출구로 나옵니다. 경로는 개략 표시입니다.</desc>${marker(id)}<rect width="1440" height="1300" fill="white"/><g fill="#18304b" font-family="sans-serif"><text x="40" y="48" font-size="31" font-weight="800">호텔 → JR 오사카역 → 신쾌속 → 교토역</text><text x="40" y="82" font-size="21">도보·개찰구 탐색 20–30분 확보 · 09:00 승차는 계획 시각</text>
${box(40,112,360,'① 호텔 5F 체크아웃','지상으로 내려와 오사카역 방향')}${box(540,112,360,'② 오사카역 북쪽','LUCUA / North Gate 표지 확인')}${box(1040,112,360,'③ 3F 연결교 개찰구','連絡橋口 · ICOCA 터치')}${line(id,'M410 160L525 160')}${line(id,'M910 160L1025 160')}
<text x="40" y="270" font-size="25" font-weight="700">3F · 개찰구 통과 후 교토 방면 표지 따라 내려가기</text><text x="760" y="270" font-size="25" font-weight="700">2F · JR 교토선 지상 승강장</text>
<image href="/images/guides/osaka-station-3f.png" x="0" y="290" width="720" height="530"/><image href="/images/guides/osaka-station-2f.png" x="720" y="290" width="720" height="540"/>
${line(id,'M313 435L313 570L350 570L350 516L376 516')}${pin(295,570,3)}
<rect x="1020" y="469" width="305" height="37" rx="12" fill="#1254c8" fill-opacity=".13" stroke="#1254c8" stroke-width="4"/>
${pin(1360,487,4)}
<text x="760" y="859" font-size="22" font-weight="700">④ 新快速 / Special Rapid ＋ 京都方面 を確認</text><text x="760" y="893" font-size="20">8・9番を目安に、当日の発車標の番号を優先</text>
<rect x="40" y="928" width="1360" height="142" rx="14" fill="#edf4ff"/>
<text x="64" y="965" font-size="24" font-weight="700">⑤ 보통칸 탑승 · 환승 없이 약 30분 (계획 기준)</text>
${line(id,'M105 1024L1320 1024')}
${[[105,'오사카'],[490,'신오사카'],[875,'다카쓰키'],[1320,'교토']].map(([x,t])=>`<circle cx="${x}" cy="1024" r="10" fill="white" stroke="#1254c8" stroke-width="5"/><text x="${x}" y="1000" text-anchor="middle" font-size="22">${t}</text>`).join('')}
${box(40,1100,580,'⑥ 교토역에서 하차 → 중앙출구','中央口 / Karasuma 쪽 · 같은 ICOCA로 출구 터치')}${box(760,1100,640,'⑦ 더 블라썸 교토까지 이동','북쪽 가라스마도리로 도보 약 15–20분 · 가족 계획')}
${line(id,'M630 1148L745 1148')}
<text x="40" y="1256" font-size="20">층별 지도 © JR-West · 표시 경로는 개략 안내. 우메키타 지하 특급 승강장과 구분하세요.</text></g></svg>`;
}
const steps = (items) => `<ol class="castle-course-stops">${items.map(([title,text])=>`<li><b>${title}</b><span>${text}</span></li>`).join('')}</ol>`;
const preview = (key,render,caption) => `<figure class="castle-course-figure"><button type="button" class="castle-map-preview" data-transit-map-open="${key}" aria-label="${caption} 전체 지도 확대">${render()}<span class="castle-map-open-label"><i class="ti ti-maximize" aria-hidden="true"></i> 눌러서 전체 지도 크게 보기</span></button><figcaption>${caption} · 원형 숫자는 이동 순서예요. 확대 후 지도를 밀어볼 수 있어요.</figcaption></figure>`;
export const transitMaps = {
 airside:{size:[1600,1550],title:'간사이공항 · 출국 후 식사와 면세 쇼핑',summary:'출국심사 → 중앙 면세점 → 식사 한 곳 → 짧은 쇼핑 → 당일 안내된 게이트',render:renderKixAirsideMap,note:'2026 확장 상업구역 전체 지도에 구역 위치를 표시했어요. 중앙 기존 구역의 세부 점포와 윙 전체는 생략된 원본이며, 점선은 이동 방향입니다. 탑승구·시각은 당일 전광판과 탑승권 우선.'},
 haruka:{size:[1440,2020],title:'교토 → 간사이공항 · 하루카',summary:'호텔 → 교토역 중앙출구 → 티켓·좌석 확인 → 하루카 → KIX T1',render:renderHarukaMap,note:'공식 전체 역 지도에 30번 방향을 표시한 개략도예요. 실제 하루카 승강장은 6·7·30번 중 당일 전광판을 우선해요.'},
 airport:{size:[1280,1080],title:'간사이공항 · ICOCA와 리무진',summary:'1F 입국장 → 2F JR역 → 1F C 매표소 바우처 확인 → 5번 승차장',render:renderAirportMap,note:'윗부분은 층별 개략도, 아래는 KATE 공식 지도에 표시한 동선입니다. 현장 Railways와 버스 표지를 따라가세요.'},
 jr:{size:[1440,1300],title:'오사카 → 교토 · JR 신쾌속',summary:'호텔 → 3F 연결교 개찰구 → JR 교토선 → 교토역 중앙출구',render:renderJrMap,note:'JR-West 공식 층별 지도에 개략 동선을 표시했습니다. 승강장은 당일 전광판 확인. 신쾌속 보통칸은 ICOCA로 이용해요.'},
};
export function renderTransitGuide(stopId) {
 if(stopId==='d4-dinner')return renderKixAirsideGuide();
 if(stopId==='d4-shopping')return renderKixShoppingGuide();
 if(stopId==='d4-haruka')return renderHarukaGuide();
 if(stopId==='d1-icoca') return `<section class="castle-course transit-guide"><div class="castle-course-heading"><img src="/illustrations/travel-duri.png" alt="" width="48" height="62"><div><h4>공항에서 교통카드 사고 버스 타기</h4><p>짐을 찾은 뒤 2층에 한 번 올라갔다가 1층으로 돌아와요.</p></div></div>${preview('airport',renderAirportMap,'공항 층별 동선 / 버스 지도 © KATE')}${steps([
 ['① 입국 후 2F로','세관을 나온 1층 도착장에서 엘리베이터를 타고 2층으로 올라갑니다. Railways / 鉄道 표지를 따라 연결다리를 건너 JR 간사이공항역으로 가요.'],
 ['② ICOCA 구입 · 1명당 1장','ICOCA 표시가 있는 JR 발매기에서 English → Purchase ICOCA → 금액 선택 → 현금 투입 → 카드·거스름돈 수령. 기본 2,000엔(보증금 500엔＋사용 잔액 1,500엔)입니다. 카드 구입은 현금을 준비해요.'],
 ['③ 1,000엔 추가 충전 추천','발매기의 Charge로 1,000엔을 추가하면 사용 잔액은 2,500엔. 성인 3명 카드 구입＋추가 충전은 현금 9,000엔입니다. 출입 개찰구는 같은 카드를 각각 터치하세요.'],
 ['④ 다시 터미널 1F · 예약 바우처 확인','연결다리로 되돌아와 1층으로 내려갑니다. 클룩 예약 완료로 기록되어 있으니 C 매표소 직원에게 바우처를 먼저 보여줘요. 실제 상품 안내에 따라 표를 교환하거나 승차권을 준비하고, Osaka Station / Umeda 노선의 HERBIS OSAKA행을 확인해요.'],
 ['⑤ 5번 정류장 · 목적지 확인','이미 구매한 티켓으로 탑승하므로 중복 결제하지 않아요. 바우처가 특정 편을 지정하는지 먼저 확인하고, 승차는 현장 안내를 따릅니다. 직원에게 “HERBIS OSAKA?”라고 확인해요. 미구매일 때만 성인 편도 1,800엔의 현장 구매 안내를 참고해요.'],
 ['⑥ 짐표 보관 → 하비스에서 하차','큰 가방은 직원에게 맡기고 짐표를 받습니다. 여권·지갑은 작은 가방에 챙겨요. 하비스에서 내려 짐을 찾고 GRAND GREEN OSAKA 남관의 그란 레스파이어까지 가족 기준 10–15분 걷습니다.'],
 ])}<div class="castle-inside"><h4>교통카드·버스 꿀팁</h4><p>예약 바우처로 준비한 버스표가 있다면 ICOCA로 중복 결제하지 않아요. ICOCA로 바로 버스 요금을 낼 수도 있지만 탑승 전 잔액이 1,800엔 이상이어야 하고 차 안에서는 충전할 수 없습니다. 처음 산 기본 카드의 잔액 1,500엔만으로는 부족해요.</p><p>현재 시간표상 11:30 T1 출발 → 12:40 하비스 도착을 기본 목표로 잡았어요. 11:20편은 기존 Hotel Hankyu RESPIRE 정류장으로 가며 하비스에 서지 않습니다. 당일 목적지·시각을 다시 확인하세요.</p><p>구매 후기 속 아톰 카드는 KANSAI ONE PASS예요. 공식 안내상 재고 소진에 따라 판매가 종료됩니다. 원하면 JR 창구에서 여권을 제시해 재고를 문의하고, 없거나 줄이 길면 일반 ICOCA를 구매하세요. 아톰 카드는 3,000엔(보증금 포함)입니다.</p></div>${links([['kix','공항 교통카드 위치'],['icoca','ICOCA 가격'],['machine','발매기 화면 안내'],['bus','승차장 공식 지도'],['timetable','하비스행 시간표'],['busHow','버스 구매·결제'],['atom','아톰 카드 판매 안내'],['blog','구매 후기'],['hotel','하비스 → 호텔 공식 안내']])}<p class="shopping-checked">2026.10.08 공식 안내 확인 · 입국·구매가 늦어지면 다음 버스와 오사카성 단축 코스로 조정</p></section>`;
 if(stopId==='d2-jr') return `<section class="castle-course transit-guide"><div class="castle-course-heading"><img src="/illustrations/travel-duri.png" alt="" width="48" height="62"><div><h4>JR 신쾌속 · 표지판 그대로 따라가기</h4><p>JR Kyoto Line / 新快速 / 京都方面 세 가지를 확인해요.</p></div></div>${preview('jr',renderJrMap,'오사카역 공식 지도 + 호텔·교토 이동 개략도')}${steps([
 ['① 08:30 체크아웃 → 역 북쪽','5층에서 체크아웃하고 지상으로 내려와 JR 오사카역의 LUCUA / North Gate 방향으로 걸어요. 짐과 부모님을 고려해 도보·역 탐색·대기에 20–30분을 확보합니다.'],
 ['② 3F 연결교 개찰구 (連絡橋口)','역 북쪽에서 3층 연결교 개찰구를 찾아 ICOCA를 1인 1장 터치합니다. 잔액이 부족하면 개찰 전 충전하세요. 가까운 다른 JR 개찰구를 이용해도 교토선 표지를 따라갈 수 있어요.'],
 ['③ 전광판에서 신쾌속과 번호 확인','JR 교토선 지상 승강장으로 이동해 新快速 / Special Rapid와 京都方面을 찾습니다. 8·9번을 탐색할 때의 목표로 삼되, 공식 안내의 교토선은 7–10번을 사용하므로 당일 전광판의 번호를 우선해요.'],
 ['④ 목적지가 교토 너머여도 확인','교토에 정차하는 신쾌속이면 탑승 가능해요. 행선지가 米原(마이바라)·野洲(야스)·長浜(나가하마) 등으로 보일 수 있습니다. 정차역 화면의 京都를 확인하거나 직원에게 “Kyoto, Special Rapid?”라고 물어보세요.'],
 ['⑤ 보통칸으로 약 30분','오사카 → 신오사카 → 다카쓰키 → 교토, 환승 없이 이동합니다. 보통칸은 ICOCA만으로 탑승 가능하고 별도 특급권은 필요 없어요. Aシート 등 유료 좌석을 선택하면 추가 지정석권이 필요합니다. 09:00은 계획 시각이고 열차는 당일 검색해요.'],
 ['⑥ 교토역 중앙출구 → 호텔','교토에서 내려 中央口 / Karasuma 표지를 따라 북쪽으로 나와 같은 ICOCA를 터치합니다. 호텔까지 도보 약 15–20분을 잡고, 짐이 무겁거나 피곤하면 역 택시 승차장을 이용해요.'],
 ])}<div class="castle-inside"><h4>부모님과 타는 팁</h4><p>출근 시간이라 자리 확보가 어려울 수 있어요. 엘리베이터 표지를 따라 이동하고, 열차 도착 전에 가족이 같은 문 앞에 모여요. 승강장 바닥의 해당 열차 승차 위치와 줄을 따르고 캐리어는 통로를 막지 않게 세웁니다.</p><p>호텔에서 가까운 우메키타 지하 승강장은 특급·다른 노선도 이용합니다. 이번 이동은 지상의 JR 교토선 신쾌속을 찾아가요. 운임과 출발 시각은 아래 공식 검색으로 확인하세요.</p></div>${links([['osaka','오사카역 공식 층별 지도'],['kyoto','교토역 공식 지도'],['route','신쾌속 정차역']])}<div class="castle-course-links"><a href="https://www.westjr.co.jp/travel-information/en/tickets-passes/route-search/?LANG=en" target="_blank" rel="noopener noreferrer">JR 시각·운임 검색 ↗</a></div><p class="shopping-checked">2026.10.08 공식 역 안내 확인 · 실제 승강장·엘리베이터 동선은 현장 표지 우선</p></section>`;
 return '';
}
export function renderBathGuide(stopId) {
 if(!['d2-bath','d3-bath'].includes(stopId))return '';
 return `<details class="hotel-checkin-guide bath-guide" open><summary><i class="ti ti-bath" aria-hidden="true"></i> 대욕장 위치·이용 순서·꿀팁 <i class="ti ti-chevron-down" aria-hidden="true"></i></summary><div class="hotel-checkin-body"><h4>THE BLOSSOM KYOTO · B1</h4><p><b>투숙객 전용 대욕장</b> · 저녁 15:00–다음 날 01:00 / 아침 06:00–09:00. 호텔 안에서 내려가면 됩니다.</p><ol><li>객실에서 갈아입을 옷과 객실키를 챙겨요. 타월 준비 방식과 입장 방법은 체크인 때 프런트에서 확인합니다.</li><li>지하 1층 남녀 대욕장을 확인하고 탈의실에서 옷과 귀중품을 보관해요.</li><li>먼저 샤워하고 탕에 들어갑니다. 작은 타월은 탕 밖에 두고 휴대폰 촬영은 삼가요.</li><li>씻기·입욕·머리 말리기를 포함해 40분 정도 잡고, 몸이 뜨거워지면 나와 쉬어요.</li></ol><p><b>휴식까지 한 코스:</b> 이용 후 B1 게스트 라운지에서 물이나 음료를 마시며 10–15분 쉬어요. 라운지는 음료·스낵 제공, 저녁 15:00–01:00 / 아침 06:00–11:00입니다. 부모님 컨디션에 맞춰 입욕 시간을 짧게 조절해요.</p><a class="source-link" href="https://www.jrk-hotels.co.jp/Kyoto/facilities/" target="_blank" rel="noopener noreferrer">호텔 공식 대욕장·라운지 안내 ↗</a></div></details>`;
}
