// Building/deck positions are representative, not a surveyed indoor route.
export const hotelLucuaRoute = {
  hotel: [34.70157, 135.49180],
  destination: [34.70255, 135.49545],
  waypoints: [[34.70170, 135.49240], [34.70220, 135.49320], [34.70255, 135.49365], [34.70265, 135.49440], [34.70260, 135.49485]],
  steps: [
    ['호텔 5층 → 2층', '5층 프런트에서 짐을 맡긴 뒤 호텔 엘리베이터로 2층 호텔 출입구에 내려요.'],
    ['남관 2층 연결다리 출구', '남관 2층 통로에서 JR大阪駅 / うめきたグリーンプレイス 표지를 따라가요. 아래 공식 층별 지도에 표시한 오른쪽 연결다리 방향으로 이동해요.'],
    ['우메키타 그린플레이스 2층', '구름다리를 건너 그린플레이스 2층 통로를 지나 LUCUA 1100 / ルクア イーレ 방향의 연결 데크로 계속 이동해요.'],
    ['루쿠아 이레 2층 → B2', '루쿠아 이레 2층 서쪽 출입구로 들어가 엘리베이터 또는 에스컬레이터로 지하 2층에 내려요. 식당은 같은 루쿠아 오사카의 바르치카 구역이에요.'],
    ['바르치카의 いづも', 'B2에서 バルチカ 표지와 아래 식당 위치 표시를 확인해 うなぎ 串焼き いづも로 이동해요. 대기·주문 시간을 확인하고 장어덮밥을 주문해요.'],
  ],
};

const svgStart = (id, w, h, title, description) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-title ${id}-desc"><title id="${id}-title">${title}</title><desc id="${id}-desc">${description}</desc><rect width="${w}" height="${h}" fill="#fff"/>`;
const label = (x, y, width, text) => `<g><rect x="${x}" y="${y}" width="${width}" height="60" rx="12" fill="#fff8ee" stroke="#e88639" stroke-width="3"/><text x="${x + width / 2}" y="${y + 39}" text-anchor="middle" fill="#5b402a" font-size="26" font-weight="700" font-family="system-ui, sans-serif">${text}</text></g>`;

export function renderDeckOverview(id = 'deck-overview') {
  const nodes = [[55, 80, '① 호텔', '5F → 2F'], [335, 80, '② 구름다리', '남관 2F 출구'], [615, 80, '③ 그린플레이스', '2F 연결 통로'], [615, 340, '④ 루쿠아 이레', '2F 서쪽 입구'], [335, 340, '⑤ 이즈모우나기', 'B2 · 바르치카']];
  return svgStart(id, 900, 580, '호텔에서 루쿠아까지 · 2층 구름다리 코스', '호텔 5층에서 2층으로 내려와 남관 연결다리, 우메키타 그린플레이스 2층, 루쿠아 이레 2층을 지나 지하 2층 바르치카 이즈모우나기로 이동하는 개략도입니다.') + `<path d="M265 165 H335 M545 165 H615 M720 250 V340 M615 425 H545" fill="none" stroke="#df7a36" stroke-width="8"/><g fill="#df7a36"><path d="M320 155 L335 165 L320 175Z"/><path d="M600 155 L615 165 L600 175Z"/><path d="M710 325 L720 340 L730 325Z"/><path d="M560 415 L545 425 L560 435Z"/></g>${nodes.map(([x,y,title,subtitle]) => `<g><rect x="${x}" y="${y}" width="210" height="170" rx="24" fill="#eff7f3" stroke="#c5ded2" stroke-width="2"/><text x="${x+105}" y="${y+66}" text-anchor="middle" fill="#325a48" font-family="system-ui,sans-serif" font-size="22" font-weight="700">${title}</text><text x="${x+105}" y="${y+108}" text-anchor="middle" fill="#5c7568" font-family="system-ui,sans-serif" font-size="20">${subtitle}</text></g>`).join('')}<text x="70" y="535" fill="#647469" font-family="system-ui,sans-serif" font-size="18">2층 데크 이동 후 마지막에 B2로 내려가요 · 위치·거리는 개략 표시</text></svg>`;
}

export function renderSouthDeckMap(id = 'south-deck') {
  return svgStart(id, 1650, 1471, '그랜드 그린 남관 2층 · 호텔에서 구름다리 출구까지', '주황색 화살표는 호텔 출입구에서 남관 2층 통로를 따라 오른쪽 JR 오사카역 연결다리로 향하는 개략 이동선입니다.') + `<image href="/images/guides/grand-green-south-2f.png" width="1650" height="1471"/><defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#ea7b28"/></marker></defs><path d="M235 750 L410 732 L560 760 L750 853 L930 939 L1168 1043" fill="none" stroke="#fff" stroke-width="22" stroke-linejoin="round"/><path d="M235 750 L410 732 L560 760 L750 853 L930 939 L1168 1043" fill="none" stroke="#ea7b28" stroke-width="12" stroke-linejoin="round" marker-end="url(#${id}-arrow)"/><circle cx="235" cy="750" r="18" fill="#ea7b28" stroke="#fff" stroke-width="5"/>${label(30, 45, 530, 'ホテル 5F → 2F 출입구')}${label(75, 1040, 450, '① 호텔에서 2층 통로로')}${label(1000, 1160, 600, '② 이 연결다리 → 그린플레이스')}<path d="M1295 1160 L1195 1070" stroke="#ea7b28" stroke-width="4" fill="none"/></svg>`;
}

export function renderIzumoFloorMap(id = 'izumo-floor') {
  return svgStart(id, 2560, 1050, '루쿠아 B2 · 이즈모우나기 위치', '루쿠아 공식 지하 2층 지도 위에 주황색으로 이즈모우나기 매장 위치를 표시했습니다. 바르치카 구역의 서쪽 경계 부근입니다.') + `<image href="/images/guides/lucua-b2-izumo.png" width="2560" height="1050"/><rect x="1060" y="670" width="65" height="125" rx="8" fill="#fb8b3733" stroke="#eb792d" stroke-width="10"/>${label(850, 75, 650, '⑤ いづも · 이즈모우나기 B2')}<path d="M1170 135 L1140 245 L1092 650" fill="none" stroke="#eb792d" stroke-width="7" stroke-dasharray="15 10"/></svg>`;
}

export const walkingMaps = {
  'deck-overview': { size: [900, 580], title: '호텔 → 루쿠아 · 2층 구름다리 전체 동선', summary: '5층 프런트 → 2층 데크 → 루쿠아 이레 → B2 いづも', render: renderDeckOverview, note: '층별 연결을 설명하는 개략도입니다. 실내 이동은 현장 LUCUA 1100 / バルチカ 표지를 따라가요.' },
  'south-deck': { size: [1650, 1471], title: '호텔 2층 → 구름다리 출구', summary: '그랜드 그린 오사카 남관 공식 2층 지도에 이동선을 표시했어요.', render: renderSouthDeckMap, note: '바탕 지도 © GRAND GREEN OSAKA · 주황색 선은 통로를 바탕으로 표시한 개략 동선입니다. 오른쪽 연결다리에서 그린플레이스 방향으로 이동해요.' },
  'izumo-floor': { size: [2560, 1050], title: '루쿠아 B2 · 이즈모우나기 매장 위치', summary: '주황색 테두리가 うなぎ 串焼き いづも예요.', render: renderIzumoFloorMap, note: '바탕 지도 © LUCUA osaka · 주황색 테두리: 식당 위치. 입구·엘리베이터에서의 실제 이동은 현장 안내를 확인해요.' },
  'breakfast-menu': { size: [1179, 1635], title: '2일차 조식 · MAISON VERTE 스페셜 메뉴', summary: '에그 베네딕트 또는 에그 샌드위치 중 한 가지 · 추가 요금 없음', render: (id) => svgStart(id,1179,1635,'MAISON VERTE 조식 스페셜 메뉴 사진','사용자가 제공한 메뉴판. 에그 베네딕트와 에그 샌드위치의 사진과 주문 안내입니다.') + '<image href="/images/breakfast/maison-verte-special-menu.png" width="1179" height="1635"/></svg>', note: '조식 메뉴판입니다. 조식 이용 시 두 시그니처 중 한 가지를 선택하며, 밀·달걀·유제품이 포함돼요. 당일 제공 메뉴는 직원에게 확인해요.' },
};

export function renderDeckGuide() {
  const previews = [['deck-overview', '전체 층별 연결 동선'], ['south-deck', '호텔 2층에서 나가는 길'], ['izumo-floor', 'B2 식당 위치']];
  return `<section class="deck-guide" aria-labelledby="deck-guide-title"><h4 id="deck-guide-title">호텔 → 이즈모우나기 · 2층 구름다리로 가요</h4><p class="deck-plan">5층에서 짐 보관 후 2층으로 내려와요. 1층 지상길 대신 연결 데크를 이용하고, 루쿠아 이레 안에서 B2로 내려갑니다.</p><div class="deck-map-previews">${previews.map(([key, title]) => `<button type="button" class="deck-map-preview" data-walking-map-open="${key}" aria-label="${title} 확대">${walkingMaps[key].render(key+'-inline')}<span>${title} · 눌러서 확대 ↗</span></button>`).join('')}</div><ol class="guide-steps">${hotelLucuaRoute.steps.map(([title, detail]) => `<li><div class="deck-step-content"><b>${title}</b><p>${detail}</p></div></li>`).join('')}</ol><p class="deck-plan">가족 이동은 층 이동을 포함해 약 10–15분 예상 · 호텔 공식 LUCUA 도보 안내는 약 9분입니다. 2층 호텔 출입구는 공식 안내상 06:00–00:30에 이용 가능해요.</p><button type="button" class="map-focus-link" data-map-stop="d1-lunch"><i class="ti ti-map-2" aria-hidden="true"></i> 이동 지도에서 구름다리 경로 보기</button><div class="guide-sources"><a class="source-link" href="https://www.hankyu-hotel.com/hotel/respire/granosaka/access" target="_blank" rel="noreferrer">호텔 공식 출입구·교통 ↗</a><a class="source-link" href="https://umekita.com/floor/south/?floor=2F" target="_blank" rel="noreferrer">남관 공식 2층 지도 ↗</a><a class="source-link" href="https://www.lucua.jp/shopguide/id924.html" target="_blank" rel="noreferrer">이즈모우나기 공식 B2 지도 ↗</a><a class="source-link" href="https://osaka-news.jp/life/osaka-grandgreen-south2f/" target="_blank" rel="noreferrer">역 → 호텔 방향 사진 안내 ↗</a></div><p class="shopping-checked">2026.10.13 공식 출입구·층별 지도 확인 · 연결 순서는 제공하신 후기와 공개 동선 안내를 바탕으로 정리. 지도 점·이동선은 대표 위치·개략 표시이며, 일부 데크 구간의 비바람 차단은 보장하지 않아요.</p></section>`;
}
