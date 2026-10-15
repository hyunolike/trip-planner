// The official base map and overlay coordinates share a 1800 × 1273 canvas.
// Overlays are a planning aid; follow local exits, crossings and signs.
export function renderCastleMap(prefix = "castle-inline") {
  const pins = [[350,860,1],[451,851,2],[675,843,3],[754,797,4],[652,584,5]];
  const outward = 'M350 860 L444 852 Q464 853 465 830 L515 831 L552 856 L567 874 L675 874 L675 838 L710 813 L754 797 M754 797 L710 813 L710 716 L710 686 L686 662 L658 657 L652 620 L652 584';
  const back = 'M640 584 L640 626 L646 666 L698 697 L698 809 L663 827 L663 864 L572 862 L558 846 L520 819 L453 819 L436 840 L350 848';
  const stationPath = 'M125 1180 L155 1155 L285 1155 L352 1148 L334 1095 L325 1040 L305 974 L282 909 L290 874 L350 860';
  return `<svg class="castle-course-map" viewBox="0 0 1800 1273" role="img" aria-labelledby="${prefix}-title ${prefix}-desc">
          <title id="${prefix}-title">오사카성 공식 공원 지도 위 가족 관람 동선</title>
          <desc id="${prefix}-desc">출발 다니마치욘초메역에서 혼마치도리를 따라 동쪽으로 이동하고 공원 서쪽 길을 북쪽으로 걸어 1 공원 입구에서 2 오테몬, 3 사쿠라몬을 지나 4 미라이자 1층에서 10분 쉬고 5 천수각을 관람합니다. 파란 실선은 방문 방향, 보라 점선은 복귀 방향입니다. 경로는 개략 표시입니다.</desc>
          <defs><marker id="${prefix}-forward-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5 Z" fill="#1254c8"/></marker><marker id="${prefix}-return-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5 Z" fill="#773aa7"/></marker></defs>
          <image href="/images/guides/osaka-park-base.webp" width="1800" height="1273"/>
          <path d="${stationPath}" fill="none" stroke="white" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${stationPath}" fill="none" stroke="#1254c8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${prefix}-forward-arrow)"/>
          <path d="M320 982 L311 955" stroke="#1254c8" stroke-width="6" marker-end="url(#${prefix}-forward-arrow)"/>
          <circle cx="125" cy="1180" r="20" fill="#1254c8" stroke="white" stroke-width="3"/><text x="125" y="1186" text-anchor="middle" fill="white" font-size="16" font-weight="800">출발</text>
          <path d="${outward}" fill="none" stroke="white" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="${outward}" fill="none" stroke="#1254c8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${prefix}-forward-arrow)"/>
          <path d="${back}" fill="none" stroke="white" stroke-width="8"/>
          <path d="${back}" fill="none" stroke="#773aa7" stroke-width="4" stroke-dasharray="9 7" marker-end="url(#${prefix}-return-arrow)"/>
          <path d="M581 874 L604 874 M710 743 L710 720" stroke="#1254c8" stroke-width="6" marker-end="url(#${prefix}-forward-arrow)"/>
          ${pins.map(([x,y,n]) => `<g><circle cx="${x}" cy="${y}" r="18" fill="${n===4?'#087a68':'#1254c8'}" stroke="white" stroke-width="3"/><text x="${x}" y="${y+6}" text-anchor="middle" fill="white" font-size="18" font-weight="800">${n}</text></g>`).join('')}
          <g class="castle-map-labels" font-size="17" font-weight="700" fill="#182f4a" paint-order="stroke" stroke="white" stroke-width="5" stroke-linejoin="round">
            <text x="322" y="958">1 공원 입구</text><text x="410" y="910">2 오테몬</text><text x="620" y="917">3 사쿠라몬</text><text x="756" y="761" fill="#087a68">4 휴식 10분</text><text x="690" y="546">5 천수각</text>
          </g>
          <g transform="translate(145 1082)"><rect width="252" height="66" rx="10" fill="white" stroke="#d4dfec"/><text x="14" y="27" font-size="20" font-weight="700" fill="#182f4a">출발 · 다니마치욘초메역</text><text x="14" y="51" font-size="18" fill="#44556a">谷町四丁目 T23 · 1-A 출구</text></g>
        </svg>`;
}

export function renderCastleCourse() {
  return `<section class="castle-course" aria-labelledby="castle-course-title">
    <div class="castle-course-heading"><img src="/illustrations/travel-duri.png" alt="" width="48" height="62" loading="lazy"><div><h4 id="castle-course-title">역에서 공원·천수각까지</h4><p>다니마치욘초메역에서 출발해 오테몬으로 들어가요.</p></div></div>
    <div class="castle-course-budget"><b>기본 약 55분</b><span>외관·휴식 중심 · 내부 포함 시 약 75분＋대기 · 공원 입구부터 왕복</span></div>
    <figure class="castle-course-figure">
      <button type="button" class="castle-map-preview" data-castle-map-open aria-haspopup="dialog" aria-label="역부터 천수각까지 전체 지도 크게 보기">
${renderCastleMap()}<span class="castle-map-open-label"><i class="ti ti-maximize" aria-hidden="true"></i> 지도 크게 보기</span>
      </button>
      <div class="castle-map-key"><span><i class="castle-key-out"></i>방문 순서 1–5</span><span><i class="castle-key-back"></i>같은 길로 복귀</span><span><i class="ti ti-coffee" aria-hidden="true"></i>4번에서 잠깐 휴식</span></div>
      <figcaption>지도를 누르면 전체 화면에서 확대·축소하며 볼 수 있어요. 바탕 지도: 오사카성 공식 공원 MAP · 번호와 동선은 가족 관람 계획을 위한 개략 표시입니다. 현장 표지판을 따라 이동해요.</figcaption>
    </figure>
    <ol class="castle-course-stops">
      <li><b>출발 · 다니마치욘초메역 T23 → 공원 서쪽 길</b><span>다니마치선 1-A 출구 엘리베이터에서 지상으로 나와 혼마치도리를 따라 동쪽으로 가요. 공원 입구에서 북쪽으로 걸으면 오른쪽에 오테몬이 보여요. 횡단보도·현장 표지판을 따라 이동하며, 지도상 역 위치와 경로는 개략 표시예요.</span></li>
      <li><b>1–2 공원 입구 → 오테몬 大手門</b><span>이동 5분 · 성문과 해자를 보며 들어가요. 역에서 공원 입구까지 걷는 시간은 별도로 잡아요.</span></li>
      <li><b>2–3 오테몬 → 사쿠라몬 桜門</b><span>이동·사진 10분 · 혼마루·천수각 표지를 따라 사쿠라몬을 통과해요. 큰 돌과 성문에서 사진 한 장!</span></li>
      <li class="castle-rest-stop"><b>4 미라이자 MIRAIZA 1층 · 휴식 10분</b><span>사쿠라몬 안쪽 천수각 앞 건물이에요. 실내 휴게 공간에서 앉아 쉬고 화장실·물을 챙겨요. 카페 이용은 선택이며 비용은 별도예요.</span></li>
      <li><b>4–5 미라이자 → 천수각 天守閣</b><span>도보 약 5분 · 매표·입장 줄을 확인해요. 외관 사진 후 입장하고 아래의 짧은 관람 순서로 둘러봐요.</span></li>
      <li><b>5 천수각 · 핵심 관람 25분</b><span>8층 전망을 먼저 보고 내려오며 관심 있는 전시만 골라요. 전시를 충분히 보려면 관람 시간을 더 잡아요.</span></li>
      <li><b>천수각 → 사쿠라몬 → 오테몬 → 공원 입구</b><span>복귀 약 20분 · 보라 점선을 따라 돌아와 다니마치욘초메역으로 이동해요. 하루카스로 갈 땐 다니마치선 야오미나미 방면 → 덴노지 T27.</span></li>
    </ol>
    <section class="castle-inside" aria-labelledby="castle-inside-title"><h4 id="castle-inside-title">천수각 안에서는 이렇게 둘러봐요</h4><ol><li><b>1층 입장 → 엘리베이터로 5층</b><span>대기 줄과 직원 안내를 확인해요. 일반 관람객의 5–8층 이동은 계단이며, 보행이 어려우면 직원에게 상층부 엘리베이터 이용을 문의해요.</span></li><li><b>계단으로 8층 전망대 · 10분</b><span>공원과 오사카 풍경을 먼저 봐요. 계단이 부담되면 5층 이하 전시와 외관 관람으로 줄여도 좋아요.</span></li><li><b>내려오며 7층·5층 → 3층·2층 → 1층 출구 · 15분</b><span>7층 히데요시 이야기, 5층 전투 모형, 3층 황금 다실, 2층 장식 복제품 중 관심 있는 곳만 선택해요. 6층은 출입할 수 없고 3·4층은 촬영 금지예요. 하행 이동도 직원 안내를 따라요.</span></li></ol><p><i class="ti ti-armchair" aria-hidden="true"></i> 관내 벤치에서 잠깐 앉을 수 있어요. 천수각 안에서는 음식·음료를 먹지 않아요.</p></section>
    <p class="castle-course-time-note"><b>하루카스 일정에 맞추기</b> · 공항에서 교통카드를 구매하므로 이번 계획은 14:50 공원 도착 → 휴식 10분·외관 사진 → 15:45 입구 복귀입니다. 천수각 내부 관람 25분은 일찍 도착했을 때만 추가해요. 역 도착이 늦으면 공원 접근·복귀 시간을 확보하고 오사카성 방문을 생략해도 좋아요. 입장·엘리베이터 대기가 길면 휴식은 유지하고 외관 사진 중심으로 전환해요.</p>
    <div class="castle-course-links"><a href="https://www.osakacastle.net/pdf/access/park_map_en.pdf" target="_blank" rel="noreferrer">공식 공원 지도</a><a href="https://www.osakacastle.net/pdf/access/bf_map_eng_a4.pdf" target="_blank" rel="noreferrer">공식 휴게 공간·엘리베이터 안내</a><a href="https://www.osakacastle.net/exhibition/" target="_blank" rel="noreferrer">천수각 층별 전시</a></div>
  </section>`;
}
