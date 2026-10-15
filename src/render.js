import { renderDayRoute } from './day-route.js';
import { renderDeckGuide } from './deck-route.js';
import { renderDotonboriHighlight } from './dotonbori-highlight.js';
import { renderDayWeather } from './weather.js';
import { renderTripCountdown } from './countdown.js';
import { renderSharedShopping } from './shared-shopping.js';
import { createGoogleMapsUrl, getDayMapPoints, getDayRouteSegments } from './map.js';
import { renderPreparation, renderReservationShortcut, renderDonkiCoupon, renderCharacterShopping, renderDutyFreePickup } from './preparation.js';
import { shoppingPicks } from './shopping-picks.js';
import { osakaDining, osakaShopping, kyotoShopping } from './data.js';
import { placeGuides } from './place-guides.js';
import { renderCastleCourse } from './castle-course.js';
import { renderHotelGuide } from './hotel-guides.js';
import { renderBreakfastGuide } from './breakfast-guides.js';
import { renderTransitGuide, renderBathGuide } from './transit-guides.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const sourceLink = ({ label, url }) => `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)} <span aria-hidden="true">↗</span></a>`;
const typeLabels = { airport: '공항', flight: '항공편', transport: '이동', hotel: '숙소', breakfast: '조식', bath: '대욕장', meal: '식사', shopping: '쇼핑', sight: '관광', tour: '일일투어', choice: '선택 일정' };
const cityLabels = ['오사카', '교토', '교토 북부', '교토 · 귀국'];

function renderInstallPreview() {
  return `<section class="install-preview" aria-label="홈 화면 설치 후 예상 모습"><h3>홈 화면에서도 여행노트</h3><p>아이콘을 누르면 저장한 여행 일정이 바로 열려요.</p><div class="install-preview-grid"><div class="install-home-demo"><span class="ds-caption">홈 화면 아이콘</span><div class="home-screen-sample"><img src="/icons/tripnote-180.png" width="72" height="72" alt="새 여행노트 아이콘"><b>여행노트</b></div></div><div class="install-launch-demo"><span class="ds-caption">실행 화면</span><div class="mini-app"><div class="mini-app-header"><img src="/icons/tripnote.svg" width="22" height="22" alt=""><b>여행노트</b></div><div class="mini-app-content"><span>3박 4일 · 가족 3명</span><strong>오사카·교토<br>가족여행</strong><div class="mini-date-tabs"><b>1일차</b><span>2일차</span><span>3일차</span><span>4일차</span></div><img src="/images/brand/installed-app-preview.png" width="480" height="280" alt="일정 지도와 장소 순서가 보이는 여행노트 실행 화면 미리보기"></div><div class="mini-app-nav"><span>일정</span><span>맛집</span><span>쇼핑</span><span>준비물</span></div></div></div></div><p class="install-preview-note">Safari의 공유 메뉴에서 ‘홈 화면에 추가’를 선택하세요. 설치 화면은 기기와 브라우저에 따라 달라질 수 있어요.</p></section>`;
}

export function renderRouteMap(trip, activeDay = 0) {
  const activeIndex = trip.days[activeDay]?.routeIndex ?? 0;
  const progress = Math.min(100, Math.max(0, (activeIndex / (trip.route.length - 1)) * 100));
  const slides = trip.heroSlides || [{ photo: trip.heroPhoto, place: '텐류지 소겐치 정원', area: '교토 아라시야마', blogUrl: 'https://www.japan-guide.com/e/e3913.html' }];
  const slide = slides[0];
  return `<section class="trip-hero" aria-label="여행 소개">
    <div class="hero-copy"><p class="hero-kicker">일본 <span aria-hidden="true">/</span> 오사카·교토</p><h1>오사카·교토 가족여행</h1><p class="hero-subtitle">10월 21일 수요일 — 24일 토요일</p><div class="hero-tags"><span>3박 4일</span><span>가족 3명</span><span>2026년</span></div></div>
    <img class="trip-cover" src="/images/places/osaka-castle.webp" alt="오사카성" width="200" height="150">
  </section>
  <nav class="travel-shortcuts" aria-label="여행 바로가기"><button class="shortcut map-button"><i class="ti ti-map-2" aria-hidden="true"></i><span><b>이동 지도</b><small>날짜별 경로</small></span><i class="ti ti-chevron-right" aria-hidden="true"></i></button><button class="shortcut airport-button"><i class="ti ti-plane" aria-hidden="true"></i><span><b>공항 안내</b><small>출국부터 도착까지</small></span><i class="ti ti-chevron-right" aria-hidden="true"></i></button></nav>
  <details class="trip-details"><summary>여행지 사진과 전체 경로 <i class="ti ti-chevron-down" aria-hidden="true"></i></summary>
    <figure class="hero-photo" data-hero-carousel aria-label="여행 대표 사진"><a class="hero-photo-link" data-hero-link href="${escapeHtml(slide.blogUrl)}" target="_blank" rel="noopener noreferrer"><img data-hero-image src="${escapeHtml(slide.photo.src)}" alt="${escapeHtml(slide.photo.alt)}" width="960" height="639" loading="lazy"><figcaption><span data-hero-area>${escapeHtml(slide.area)}</span><strong data-hero-place>${escapeHtml(slide.place)}</strong><span class="hero-read-link">여행지 소개 ↗</span></figcaption></a><div class="hero-carousel-controls"><button class="hero-arrow" type="button" data-hero-prev aria-label="이전 여행지 사진">‹</button><span data-hero-counter>1 / ${slides.length}</span><button class="hero-arrow" type="button" data-hero-next aria-label="다음 여행지 사진">›</button></div></figure>
    <ol class="journey-route" aria-label="전체 여행 경로">${trip.route.map(place=>`<li><strong>${escapeHtml(place.label)}</strong><small>${escapeHtml(place.vehicleLabel || '')}</small></li>`).join('')}</ol>
  </details>`;
}

export function renderDayTabs(days, activeDay) {
  return `<nav class="day-tabs" aria-label="날짜 선택">${days.map((day, index) => {
    return `<button class="day-ticket ${index === activeDay ? `active ${day.color}` : ''}" data-day="${index}" aria-current="${index === activeDay ? 'date' : 'false'}">
      <span class="day-label">${day.number}일차</span><b>${escapeHtml(day.date.slice(5).replace("-", "."))}</b><small>${cityLabels[index]}</small>
    </button>`;
  }).join('')}</nav>`;
}

function renderRestaurant(restaurant) {
  return `<aside class="restaurant-slip">
    <div class="restaurant-label">식사 추천</div>
    <h4>${escapeHtml(restaurant.name)}</h4><p class="roman">${escapeHtml(restaurant.english)}</p>
    <p><b>${escapeHtml(restaurant.menu)}</b> — ${escapeHtml(restaurant.note)}</p>
    <div class="alternatives"><span>대안</span>${restaurant.alternatives.map((item) => `<em>${escapeHtml(item)}</em>`).join('')}</div>
    ${sourceLink(restaurant.link)}
    <a class="source-link" href="#restaurants" data-view="food"><i class="ti ti-tools-kitchen-2" aria-hidden="true"></i> 오사카 맛집 후보 보기</a>
  </aside>`;
}

function renderPlacePhoto(photo, hotel = false) {
  if (!photo) return '';
  const focusClass = photo.focus === 'top' ? ' focus-top' : '';
  const license = photo.license && photo.licenseUrl ? ` · <a href="${escapeHtml(photo.licenseUrl)}" target="_blank" rel="noreferrer">${escapeHtml(photo.license)}</a>` : '';
  return `<figure class="place-photo${focusClass}${hotel ? ' hotel-photo' : ''}">
    <img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" width="${photo.width || 1200}" height="${photo.height || 675}" loading="lazy" decoding="async">
    <figcaption>${photo.context ? `${escapeHtml(photo.context)}<br>` : ''}사진: ${escapeHtml(photo.credit)} · <a href="${escapeHtml(photo.source)}" target="_blank" rel="noreferrer">${hotel ? '호텔 공식 안내' : '원본'}</a>${license}</figcaption>
  </figure>`;
}

function renderOptions(options, selected) {
  return `<div class="option-grid" role="radiogroup" aria-label="4일차 오전 코스">${options.map((option) => `<button class="option-ticket ${option.id === selected ? 'selected' : ''}" data-option="${option.id}" role="radio" aria-checked="${option.id === selected}">
    <span class="option-icon">${option.icon}</span><b>${escapeHtml(option.title)}</b>${option.recommended ? '<i>추천</i>' : ''}<small>${escapeHtml(option.text)}</small>
  </button>`).join('')}</div>`;
}

function renderTourGuide(tour) {
  return `<section class="tour-guide" aria-labelledby="tour-guide-title"><div class="tour-guide-head"><div><span class="tour-provider">${escapeHtml(tour.seller)} · 10월 23일 금요일</span><h3 id="tour-guide-title">${escapeHtml(tour.title)}</h3></div>${sourceLink(tour.source)}</div>
  <dl class="tour-facts"><div><dt>교토 출발</dt><dd>${tour.departure}</dd></div><div><dt>교토 귀환</dt><dd>${tour.returnTime}</dd></div><div><dt>점심</dt><dd>불포함 · 자유 식사</dd></div></dl>
  <div class="tour-meeting"><i class="ti ti-map-pin" aria-hidden="true"></i><div><b>${escapeHtml(tour.meeting)}</b><p>09:30 도착 권장 · 최종 위치는 전날 안내 확인</p></div><a href="${escapeHtml(tour.meetingMap)}" target="_blank" rel="noreferrer">위치 찾기 ↗</a></div>
  <p class="tour-timing-key"><span>상품 안내</span> 투어 예정 시각 <span>가족 계획</span> 조식·점심·저녁 권장 시각</p>
  <details class="tour-details"><summary>포함 사항과 준비할 것 <i class="ti ti-chevron-down" aria-hidden="true"></i></summary><dl class="tour-inclusions"><div><dt>포함</dt><dd>${escapeHtml(tour.included)}</dd></div><div><dt>별도</dt><dd>${escapeHtml(tour.excluded)}</dd></div></dl><ul>${tour.preparation.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul></details>
  <details class="tour-details"><summary>입장료·승선료 확인 <i class="ti ti-chevron-down" aria-hidden="true"></i></summary><div class="tour-fees">${tour.fees.map(fee => `<section><h4>${escapeHtml(fee.title)}</h4><p>${escapeHtml(fee.adult)}<br>${escapeHtml(fee.child)}</p>${sourceLink(fee.source)}</section>`).join('')}</div><p>${escapeHtml(tour.feeNote)}</p><p>유람선은 약 25분, 정각·30분 출항이며 악천후에는 운항하지 않을 수 있습니다.</p></details>
  <p class="tour-checked">${tour.checkedAt} 상품·운영사 안내 확인 · 시간은 교통 상황에 따라 달라집니다.</p></section>`;
}

function renderPlaceGuide(stopId) {
  const guide = placeGuides[stopId];
  if (!guide) return '';
  return `<details class="place-guide" id="guide-${escapeHtml(stopId)}">
    <summary><img src="/illustrations/travel-duri.png" alt="" width="40" height="52" loading="lazy"><span><small>이동 안내</small><b>${escapeHtml(guide.name)} ${stopId === 'd1-castle' ? '가는 방법·관람 코스 지도' : '가는 방법·방문 팁'}</b></span><i class="ti ti-chevron-down" aria-hidden="true"></i></summary>
    <div class="place-guide-body"><p class="guide-speech">${escapeHtml(guide.message)}</p><div class="guide-route-label"><i class="ti ti-route" aria-hidden="true"></i><b>${escapeHtml(guide.from)}</b><span>${escapeHtml(guide.mode)}</span></div>
    <ol class="guide-steps">${guide.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
    ${guide.alternative ? `<p class="guide-alternative">${escapeHtml(guide.alternative)}</p>` : ''}
    ${stopId === 'd1-castle' ? renderCastleCourse() : ''}
    <dl class="guide-facts">${guide.facts.map(([label, text]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(text)}</dd></div>`).join('')}</dl>
    <h4>방문 전 확인</h4><ul class="guide-tips">${guide.tips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
    <div class="guide-sources">${guide.sources.map(sourceLink).join('')}</div><p class="guide-checked">2026.10.08 공식 안내 확인 · 연결 동선과 가족 팁은 여행 계획 제안입니다. 운영·요금·운행은 방문 전 공식 안내를 확인하세요.</p></div>
  </details>`;
}

function renderGuideIndex(day) {
  const stops = day.stops.filter(stop => placeGuides[stop.id]);
  if (!stops.length) return '';
  return `<section class="sight-guide-index" id="sight-guides" aria-labelledby="sight-guide-title"><div class="guide-index-heading"><img src="/illustrations/travel-duri.png" alt="" width="52" height="68" loading="lazy"><div><h3 id="sight-guide-title">명소 가는 길</h3><p>방문할 곳을 선택해 이동 순서와 방문 팁을 확인해요.</p></div></div><div class="guide-index-links">${stops.map(stop => `<button type="button" data-scroll-stop="${escapeHtml(stop.id)}" data-open-guide><i class="ti ti-map-pin" aria-hidden="true"></i>${escapeHtml(placeGuides[stop.id].name)}</button>`).join('')}</div></section>`;
}

export function renderDay(day, state, scheduleMode = 'summary') {
  const completeCount = day.stops.filter((stop) => state.completedStops.includes(stop.id)).length;
  const next = day.stops.find((stop) => !state.completedStops.includes(stop.id));
  return `<article class="day-panel ${day.color}" aria-labelledby="day-title">
    <header class="day-heading"><div><p class="eyebrow">${day.number}일차 <span>·</span> ${escapeHtml(day.dateLabel)}</p><h2 id="day-title">${escapeHtml(day.theme)}</h2><p class="day-heading-sub">이동 방법과 예약 시간을 순서대로 확인하세요.</p></div><div class="day-score" aria-live="polite"><b>${completeCount}<small> / ${day.stops.length}</small></b><span>일정 완료</span><i style="--completion:${Math.round((completeCount / day.stops.length) * 100)}%"></i></div></header>
    ${renderDayRoute(day)}
    <div class="schedule-toolbar" aria-label="일정 보기 방식"><div class="schedule-view-switch"><button type="button" data-schedule-mode="summary" aria-pressed="${scheduleMode === 'summary'}">간략 일정</button><button type="button" data-schedule-mode="detail" aria-pressed="${scheduleMode === 'detail'}">상세 일정</button></div><button type="button" class="map-button schedule-map"><i class="ti ti-map-2" aria-hidden="true"></i> 지도 보기</button></div>
    <div class="timeline-tools"><span>${day.stops.length}개 일정</span><button type="button" data-hide-completed aria-pressed="false"><i class="ti ti-check" aria-hidden="true"></i> 완료한 일정 숨기기</button></div>
    <div class="timeline">${day.stops.map((item, index) => {
      const done = state.completedStops.includes(item.id);
      return `<section class="timeline-stop ${done ? 'done' : ''}" data-timeline-stop="${item.id}" data-stop-type="${escapeHtml(item.type)}">
        <div class="time time-ticket"><b>${item.time}</b>${item.timing ? `<small>${escapeHtml(item.timing)}</small>` : ''}</div>
        <div class="station-dot" aria-hidden="true">${index + 1}</div>
        <div class="stop-card">
          <div class="stop-top"><div><span class="stop-type">${typeLabels[item.type] || escapeHtml(item.type)}</span><h3>${escapeHtml(item.title)}</h3></div>
          <button class="stamp-button" data-stop-id="${item.id}" aria-label="${done ? '완료 표시 해제' : '일정 완료 표시'}: ${escapeHtml(item.title)}" aria-pressed="${done}"><span aria-hidden="true">${done ? '✓' : '+'}</span><small>${done ? '완료' : '체크'}</small></button></div>
          <div class="stop-quick-facts">${item.duration ? `<span><i class="ti ti-clock" aria-hidden="true"></i>${escapeHtml(item.duration)}</span>` : ''}${item.coordinates ? `<button type="button" data-map-stop="${item.id}" aria-label="${escapeHtml(item.title)} 지도 보기"><i class="ti ti-map-pin" aria-hidden="true"></i> 위치</button>` : ''}</div>
          <details class="stop-detail" data-stop-detail="${item.id}" ${scheduleMode === 'detail' ? 'open' : ''}><summary><span class="detail-show">상세 안내</span><span class="detail-hide">접기</span><span class="sr-only"> · ${escapeHtml(item.title)}</span><i class="ti ti-chevron-down" aria-hidden="true"></i></summary><div class="stop-detail-body">
          ${renderPlacePhoto(item.photo)}
          ${renderDotonboriHighlight(item.id)}
          ${renderPlacePhoto(item.hotelPhoto, true)}
          <p>${escapeHtml(item.details)}</p>
          <div class="stop-meta">${item.duration ? `<span><i class="ti ti-clock" aria-hidden="true"></i> ${escapeHtml(item.duration)}</span>` : ''}${item.buffer ? `<span><i class="ti ti-info-circle" aria-hidden="true"></i> ${escapeHtml(item.buffer)}</span>` : ''}</div>
          ${(item.links?.length || item.coordinates) ? `<div class="source-row">${item.coordinates ? `<button class="map-focus-link" data-map-stop="${item.id}"><i class="ti ti-map-2" aria-hidden="true"></i> 지도에서 보기</button><a class="source-link" href="${createGoogleMapsUrl(item.coordinates)}" target="_blank" rel="noreferrer">Google 지도 <span aria-hidden="true">↗</span></a>` : ''}${item.links?.map(sourceLink).join('') || ''}</div>` : ''}
          ${item.restaurant ? renderRestaurant(item.restaurant) : ''}
          ${item.type === 'choice' && day.options ? renderOptions(day.options, state.day4Option) : ''}
          ${renderPlaceGuide(item.id)}${item.id === 'd1-lunch' ? renderDeckGuide() : ''}
          ${renderHotelGuide(item.id)}
          ${renderBreakfastGuide(item.id)}
          ${item.id === 'd1-gmp' ? renderDutyFreePickup(true) : ''}${renderReservationShortcut(item.id)}${renderDonkiCoupon(item.id)}${renderTransitGuide(item.id)}
          ${renderBathGuide(item.id)}
          </div></details>
        </div>
      </section>`;
    }).join('')}</div>
    <section class="day-resources" aria-label="선택한 날의 여행 정보"><h3>이날의 여행 정보</h3>
    <details class="weather-disclosure"><summary><span><i class="ti ti-cloud-sun" aria-hidden="true"></i> 여행일 날씨 확인</span><i class="ti ti-chevron-down" aria-hidden="true"></i></summary>${renderDayWeather(day)}</details>
    <details class="places-disclosure"><summary>주요 장소 사진으로 보기 <i class="ti ti-chevron-down" aria-hidden="true"></i></summary><section class="day-highlights" aria-label="이날 방문하는 주요 장소">${day.stops.filter(stop => stop.photo).map(stop => `<button class="destination-card" data-scroll-stop="${stop.id}"><img src="${escapeHtml(stop.photo.src)}" alt="" width="400" height="260" loading="lazy"><span><small>${escapeHtml(stop.time)} · ${typeLabels[stop.type] || '방문'}</small><b>${escapeHtml(stop.title)}</b><em>일정 보기 <i class="ti ti-chevron-right" aria-hidden="true"></i></em></span></button>`).join('')}</section></details>
    ${day.tour ? renderTourGuide(day.tour) : ''}
    <aside class="day-companion" aria-label="여행 길잡이"><button class="companion-avatar" type="button" data-guide-tip aria-label="여행 길잡이의 다음 팁 보기"><img src="/illustrations/travel-duri.png" alt="" width="72" height="92"></button><div><span class="companion-label">이날의 참고사항 <span data-tip-count>1 / 3</span></span><p data-guide-message aria-live="polite">${escapeHtml(day.note)}</p><button class="companion-next" type="button" data-next-stop ${next ? '' : 'disabled'}>${next ? `다음 일정 · ${escapeHtml(next.title)}` : '선택한 날의 일정 완료'} <i class="ti ti-arrow-down" aria-hidden="true"></i></button></div><button class="tip-cycle" type="button" data-guide-tip aria-label="다음 여행 팁"><i class="ti ti-refresh" aria-hidden="true"></i></button></aside>
    ${renderGuideIndex(day)}
    </section>
  </article>`;
}

const checklist = (steps) => `<ol class="procedure-list">${steps.map((step, index) => `<li><b>${String(index + 1).padStart(2, '0')}</b><span>${escapeHtml(step)}</span></li>`).join('')}</ol>`;

export function renderAirportGuide(guide) {
  return `<div class="airport-sheet" role="dialog" aria-modal="true" aria-labelledby="airport-title">
    <div class="airport-toolbar"><div><p class="eyebrow">가족 3인 공항 안내</p><h2 id="airport-title">입국·출국 실전 가이드</h2></div><button class="close-guide" aria-label="공항 가이드 닫기"><i class="ti ti-x" aria-hidden="true"></i></button></div>
    <section class="vjw-block"><div><span class="big-icon" aria-hidden="true"><i class="ti ti-device-mobile-check"></i></span><div><h3>${guide.visitJapan.title}</h3><p>${escapeHtml(guide.visitJapan.intro)}</p></div></div>${checklist(guide.visitJapan.steps)}${sourceLink(guide.visitJapan.link)}</section>
    <div class="airport-grid">${['gimpo', 'kansai'].map((key) => {
      const airport = guide[key];
      return `<section class="airport-card"><div class="airport-card-head"><div><span>${key === 'gimpo' ? '출국' : '귀국'}</span><h3>${airport.title}</h3></div><div class="arrival-time"><small>권장 도착</small><b>${airport.recommendedArrival}</b></div></div>
        <p class="flight-label">✈ ${airport.flight} · ${escapeHtml(airport.officialMinimum)}</p>${checklist(airport.steps)}<p class="airport-note">${escapeHtml(airport.note)}</p><div class="source-row">${airport.links.map(sourceLink).join('')}</div>${key === 'gimpo' ? renderDutyFreePickup(true) : ''}
      </section>`;
    }).join('')}</div>
    <p class="fine-print">공항 혼잡도, 항공편, 투어 및 시설 운영시간은 변동될 수 있습니다. 출발 전날 공식 링크에서 다시 확인하세요.</p>
  </div>`;
}

function renderTripMap(day, days, activeDay) {
  const points = getDayMapPoints(day);
  const segments = getDayRouteSegments(day);
  const segmentByStop = new Map(segments.map((segment) => [segment.toId, segment]));
  return `<div class="map-sheet" role="dialog" aria-modal="true" aria-labelledby="map-title">
    <div class="map-toolbar"><div><p class="eyebrow">가족 여행 · ${escapeHtml(day.dateLabel)}</p><h2 id="map-title">날짜별 이동 경로</h2><p>${escapeHtml(day.theme)}</p></div><button class="close-map" aria-label="지도 닫기"><i class="ti ti-x" aria-hidden="true"></i></button></div>
    <nav class="map-day-switcher" aria-label="지도 날짜 선택">${days.map((item, index) => `<button data-map-day="${index}" class="${index === activeDay ? 'active' : ''}" aria-label="DAY ${item.number}, ${escapeHtml(item.dateLabel)}, ${escapeHtml(item.city)} 일정 보기"><span>DAY ${String(item.number).padStart(2, '0')}</span><small>${escapeHtml(item.dateLabel)}</small></button>`).join('')}</nav>
    <div class="map-route-controls"><div class="map-play-actions"><button class="map-play-button" data-map-play aria-pressed="false"><i class="ti ti-player-play" aria-hidden="true"></i> 경로 따라보기</button><button class="map-overview" data-map-overview><i class="ti ti-focus-2" aria-hidden="true"></i> 전체 경로</button></div><div class="transit-legend" aria-label="교통수단별 경로 색상"><span class="train"><i class="ti ti-train" aria-hidden="true"></i>전철</span><span class="bus"><i class="ti ti-bus" aria-hidden="true"></i>버스</span><span class="walk"><i class="ti ti-walk" aria-hidden="true"></i>도보</span></div></div>
    ${day.number === 1 ? '<div class="deck-map-shortcuts"><button type="button" class="map-focus-link" data-map-focus="d1-lunch">호텔 → 루쿠아 2층 구름다리 경로</button><button type="button" class="map-focus-link" data-walking-map-open="deck-overview">층별 연결 그림 보기</button></div>' : ''}<p class="deck-route-status" data-map-route-detail hidden></p><div class="map-family-status"><img src="/illustrations/travel-duri.png" alt="" width="44" height="48"><div><b>선택한 날짜의 이동 경로</b><span data-map-status role="status">장소를 선택하거나 경로를 재생해 보세요.</span></div></div>
    <div class="map-layout"><div id="trip-map" aria-label="${escapeHtml(day.dateLabel)} 이동 지도"></div>
      <aside class="map-stop-list"><p>장소를 선택하면 해당 위치와 이동 구간을 지도에서 확인할 수 있어요.</p>${points.map((point, index) => {
        const segment = segmentByStop.get(point.id);
        const transitLabel = segment ? segment.label : '출발';
        return `<div class="map-stop-row" data-map-row="${point.id}"><button data-map-focus="${point.id}"><b>${index + 1}</b><span><strong>${escapeHtml(point.time)} · ${escapeHtml(point.title)}</strong><small>${point.approximate ? '예상 위치 · ' : ''}${escapeHtml(transitLabel)}</small></span></button><a href="${createGoogleMapsUrl(point.coordinates)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(point.title)} Google 지도 열기">↗</a></div>`;
      }).join('')}</aside>
    </div><p class="map-disclaimer">색상 선은 일정과 승하차 지점을 바탕으로 만든 예상 이동 경로입니다. 실시간 운행 정보와 정확한 승강장은 당일 Google 지도 및 예약 확정서에서 확인하세요. 지도 데이터 © OpenStreetMap contributors.</p>
  </div>`;
}

function renderInstallSteps(platform) {
  const steps = platform === 'ios'
    ? ['Safari 하단의 공유 버튼을 눌러요.', '메뉴에서 ‘홈 화면에 추가’를 선택해요.', '오른쪽 위 ‘추가’를 누르면 끝이에요.']
    : platform === 'android'
      ? ['Chrome 오른쪽 위 ⋮ 메뉴를 열어요.', '‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해요.', '확인하면 홈 화면에 아이콘이 생겨요.']
      : ['브라우저 메뉴에서 ‘설치’ 또는 ‘홈 화면에 추가’를 찾아요.', '추가 확인을 누르면 홈 화면에서 바로 열 수 있어요.', '메뉴에 항목이 없으면 주소를 Safari나 Chrome에서 열어 주세요.'];
  return steps.map((text, index) => ({ number: String(index + 1).padStart(2, '0'), text }));
}

export function renderDining() {
  return `<section id="restaurants" class="dining" aria-labelledby="dining-title"><header class="dining-heading"><span class="dining-kicker">오사카 · 식사 후보 ${osakaDining.length}곳</span><h1 id="dining-title" tabindex="-1">오사카 맛집</h1><p>위치와 대표 메뉴를 확인하고 식사할 곳을 골라보세요.</p></header>
    <div class="dining-grid">${osakaDining.map(item => `<article class="dining-card" aria-labelledby="dining-${item.id}"><div class="dining-card-top"><span class="dining-category"><i class="ti ${item.icon}" aria-hidden="true"></i>${escapeHtml(item.category)}</span><span class="dining-area">${escapeHtml(item.area)}</span></div><h2 id="dining-${item.id}">${escapeHtml(item.name)}</h2><p class="dining-branch">${escapeHtml(item.branch)}</p><dl class="dining-facts"><div><dt>메뉴</dt><dd>${escapeHtml(item.menu)}</dd></div><div><dt>위치</dt><dd>${escapeHtml(item.address)}</dd></div><div><dt>영업</dt><dd>${escapeHtml(item.hours)}</dd></div></dl><p class="dining-note">${escapeHtml(item.note)}</p><div class="dining-links"><a class="dining-map" href="${escapeHtml(item.mapUrl)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-map-pin" aria-hidden="true"></i> 구글 지도 열기<span class="sr-only"> · ${escapeHtml(item.name)}</span></a>${sourceLink(item.source)}${item.menuSource ? sourceLink(item.menuSource) : ''}</div></article>`).join('')}</div><p class="dining-footnote">2026.10.08 추가 매장 공식 안내 확인 · 영업시간과 메뉴는 방문 전 매장 안내에서 다시 확인하세요.</p><a class="dining-return" href="#itinerary" data-view="itinerary"><i class="ti ti-calendar" aria-hidden="true"></i> 여행 일정 보기</a></section>`;
}

function renderShoppingPicks(item) {
  const pick = shoppingPicks[item.id];
  if (!pick) return '';
  return `<div class="shopping-products">${renderPlacePhoto(pick.photo)}<h3>${escapeHtml(pick.heading || '인기·대표 품목과 여행 추천')}</h3>${pick.intro ? `<p class="shopping-picks-intro">${escapeHtml(pick.intro)}</p>` : ''}<ul>${pick.products.map(product=>`<li>${product.photo ? renderPlacePhoto(product.photo) : ''}<small>${escapeHtml(product.tag)}</small><b>${escapeHtml(product.name)}</b><p>${escapeHtml(product.description)}</p>${product.instagram ? `<p class="shopping-instagram-credit">${escapeHtml(product.instagram.account)}${product.instagram.date ? ` · ${escapeHtml(product.instagram.date)}` : ''}</p>` : ''}<div class="shopping-product-links">${product.instagram ? `<a class="source-link" href="${escapeHtml(product.instagram.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(product.name)} 인스타 게시물">인스타 게시물 ↗</a>` : ''}<a class="source-link" href="${escapeHtml(product.url)}" target="_blank" rel="noopener noreferrer">공식 제품·참고 보기 ↗</a>${product.reference ? sourceLink(product.reference) : ''}</div></li>`).join('')}</ul><p class="shopping-tip"><i class="ti ti-bulb" aria-hidden="true"></i><span>${escapeHtml(pick.tip)}</span></p>${pick.extraLink?sourceLink(pick.extraLink):''}</div>`;
}
function renderShoppingLocation(item) {
  if (!item.mapQuery) return '';
  const embedUrl = 'https://www.google.com/maps?q=' + encodeURIComponent(item.mapQuery) + '&z=16&hl=ko&output=embed';
  const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(item.mapQuery);
  return `<section class="shopping-location" aria-label="${escapeHtml(item.name)} 위치 지도"><h3><i class="ti ti-map-pin" aria-hidden="true"></i> 여기 있어요</h3><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(item.name)} 위치 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><p>${escapeHtml(item.access)}</p><div class="shopping-location-actions"><a class="dining-map" href="${escapeHtml(item.mapUrl)}" target="_blank" rel="noopener noreferrer">지도 크게 보기 ↗</a><a class="source-link" href="${escapeHtml(directionsUrl)}" target="_blank" rel="noopener noreferrer">현재 위치에서 길찾기 ↗</a></div></section><dl class="shopping-visit-facts"><div><dt>면세</dt><dd>${escapeHtml(item.taxFree)}</dd></div><div><dt>입장</dt><dd>${escapeHtml(item.admission)}</dd></div><div><dt>같이 보기</dt><dd>${escapeHtml(item.nearby)}</dd></div></dl>`;
}

function renderShoppingVideo(video) {
  if (!video) return '';
  return `<section class="shopping-video" aria-labelledby="shopping-video-${escapeHtml(video.id)}"><h3 id="shopping-video-${escapeHtml(video.id)}">매장 둘러보기</h3><p>재생 버튼을 누르면 이 페이지에서 영상을 볼 수 있어요.</p><div class="shopping-video-frame"><iframe src="https://www.youtube.com/embed/${escapeHtml(video.id)}?playsinline=1&amp;rel=0" title="${escapeHtml(video.title)}" width="340" height="604" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div><p>영상이 열리지 않으면 아래 원본 링크로 확인하세요.</p><a class="source-link" href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">YouTube에서 원본 보기 ↗</a></section>`;
}

export function renderShopping() {
  return `<section id="shopping" class="dining shopping" aria-labelledby="shopping-title"><header class="dining-heading"><span class="dining-kicker">오사카 · 교토 쇼핑 후보 ${osakaShopping.length + kyotoShopping.length}곳</span><h1 id="shopping-title" tabindex="-1">쇼핑</h1><p>매장 위치, 대표 상품, 할인쿠폰을 모았어요.</p><p class="shopping-selection">영상 속 상품과 공식 제품 예시는 품번이나 색상이 다를 수 있어요. 구매 전 매장에서 확인해 주세요.</p></header>
    <div class="dining-grid">${[...kyotoShopping, ...osakaShopping].map(item => `<article id="shop-${item.id}" class="shopping-card" aria-labelledby="shopping-${item.id}"><div class="dining-card-top"><span class="dining-category"><i class="ti ${item.icon}" aria-hidden="true"></i>${escapeHtml(item.category)}</span><span class="dining-area">${escapeHtml(item.area)}</span></div><h2 id="shopping-${item.id}">${escapeHtml(item.name)}</h2><p class="dining-branch">${escapeHtml(item.branch)}</p><dl class="dining-facts"><div><dt>품목</dt><dd>${escapeHtml(item.items)}</dd></div><div><dt>위치</dt><dd>${escapeHtml(item.address)}</dd></div><div><dt>영업</dt><dd>${escapeHtml(item.hours)}</dd></div></dl><p class="dining-note">${escapeHtml(item.note)}</p><details class="shopping-details"><summary>위치·상품 자세히 보기 <i class="ti ti-chevron-down" aria-hidden="true"></i></summary>${renderShoppingLocation(item)}${renderShoppingVideo(item.video)}${renderShoppingPicks(item)}</details>${item.id === 'don-quijote' ? renderDonkiCoupon() : ''}<div class="dining-links"><a class="dining-map" href="${escapeHtml(item.mapUrl)}" target="_blank" rel="noopener noreferrer"><i class="ti ti-map-pin" aria-hidden="true"></i> 구글 지도 열기<span class="sr-only"> · ${escapeHtml(item.name)} ${escapeHtml(item.branch)}</span></a>${sourceLink(item.source)}${sourceLink(item.extraSource)}${item.admissionSource ? sourceLink(item.admissionSource) : ''}</div><p class="shopping-checked">${escapeHtml(item.checkedAt)}</p></article>`).join('')}</div>${renderSharedShopping()}${renderCharacterShopping()}<p class="dining-footnote">현재 제품 정보는 2026.10.08 공식 안내 확인 · 인스타 참고 게시물의 작성 시점은 품목별 표시. 실제 취급 품목·가격·재고와 영업시간은 방문 전 다시 확인하세요.</p><a class="dining-return" href="#itinerary" data-view="itinerary"><i class="ti ti-calendar" aria-hidden="true"></i> 여행 일정 보기</a></section>`;

}

function renderTravelLinks() {
  return `<section id="links" class="dining travel-links" aria-labelledby="links-title">
    <header class="dining-heading"><span class="dining-kicker">여행 중 바로 꺼내 쓰는 링크</span><h1 id="links-title" tabindex="-1">쿠폰·링크</h1><p>돈키호테 계산대에서 쿠폰 페이지를 바로 열어보세요.</p></header>
    <article class="travel-link-card" aria-labelledby="donki-link-title">
      <div class="dining-card-top"><span class="dining-category"><i class="ti ti-ticket" aria-hidden="true"></i> 쇼핑 쿠폰</span><span class="dining-area">마이리얼트립</span></div>
      <h2 id="donki-link-title">돈키호테 할인쿠폰</h2>
      <p class="travel-link-description">결제 전에 아래 버튼을 눌러 쿠폰을 확인하고, 계산할 때 쿠폰 화면을 직원에게 보여주세요.</p>
      <a class="dining-map travel-link-button" href="https://www.myrealtrip.com/promotions/Japan_donki_coupon" target="_blank" rel="noopener noreferrer">결제 전 쿠폰 열기 <i class="ti ti-external-link" aria-hidden="true"></i><span class="sr-only"> · 돈키호테 할인쿠폰, 새 탭에서 열기</span></a>
      <p class="travel-link-note">유효기간과 적용 조건은 쿠폰 페이지의 최신 안내를 확인해 주세요.</p>
    </article>
    <article class="travel-link-card" aria-labelledby="pickup-link-title"><span class="dining-category"><i class="ti ti-plane-departure" aria-hidden="true"></i> 출국 전 수령</span><h2 id="pickup-link-title">김포공항 면세품 인도장</h2><p class="travel-link-description">34번 게이트 방향에서 구매처별 인도장 위치와 준비물을 확인해요.</p><a class="dining-map travel-link-button" href="#preparation" data-view="preparation">면세품 수령 안내 보기 <i class="ti ti-arrow-right" aria-hidden="true"></i></a></article>
    <a class="dining-return" href="#shopping" data-view="shopping"><i class="ti ti-shopping-bag" aria-hidden="true"></i> 쇼핑 정보 보기</a>
  </section>`;
}

export function renderApp(trip, guide, activeDay, state, airportOpen = false, mapOpen = false, installHelpOpen = false, installPlatform = 'other', installPromptAvailable = false, activeView = 'itinerary', scheduleMode = 'summary') {
  return `<header class="site-header"><a class="brand" href="#itinerary" data-view="itinerary" aria-label="여행 홈"><img class="brand-mark" src="/icons/tripnote.svg" alt="" width="32" height="32"><span><b>여행노트</b><small>오사카 · 교토</small></span></a><p class="header-date">${trip.dates}</p><div class="header-actions"><button class="trip-share" type="button" aria-label="여행 링크 공유하기"><i class="ti ti-share" aria-hidden="true"></i><span>공유</span></button><button class="map-button" aria-label="가족 이동 지도 열기" aria-expanded="${mapOpen}"><span class="action-icon" aria-hidden="true"><i class="ti ti-map-2"></i></span><span class="action-label-wide">이동 지도</span><span class="action-label-short">지도</span></button><button class="airport-button" aria-label="입국·출국 공항 가이드 열기" aria-expanded="${airportOpen}"><span class="action-icon" aria-hidden="true"><i class="ti ti-plane"></i></span><span class="action-label-wide">공항 가이드</span><span class="action-label-short">공항</span></button></div></header>
    <nav class="trip-menu" aria-label="여행 메뉴"><a href="#itinerary" data-view="itinerary" aria-current="${activeView === 'itinerary' ? 'page' : 'false'}"><i class="ti ti-calendar" aria-hidden="true"></i> 일정</a><a href="#restaurants" data-view="food" aria-current="${activeView === 'food' ? 'page' : 'false'}"><i class="ti ti-tools-kitchen-2" aria-hidden="true"></i> 맛집</a><a href="#shopping" data-view="shopping" aria-current="${activeView === 'shopping' ? 'page' : 'false'}"><i class="ti ti-shopping-bag" aria-hidden="true"></i> 쇼핑</a><a href="#links" data-view="links" aria-current="${activeView === 'links' ? 'page' : 'false'}"><i class="ti ti-link" aria-hidden="true"></i> 쿠폰·링크</a><a href="#preparation" data-view="preparation" aria-current="${activeView === 'preparation' ? 'page' : 'false'}"><i class="ti ti-luggage" aria-hidden="true"></i> 준비물</a></nav>
    <main id="top"><div class="trip-overview" ${activeView === 'itinerary' ? '' : 'hidden'}>${renderRouteMap(trip, activeDay)}${renderTripCountdown(trip)}<details class="flight-details"><summary>항공편 시간 확인 <i class="ti ti-chevron-down" aria-hidden="true"></i></summary><section class="flight-strip" aria-label="항공편 정보"><div><span>가는 편 <i aria-hidden="true">·</i> ${trip.flights.outbound.date}</span><b>${trip.flights.outbound.from} ${trip.flights.outbound.depart}</b><i aria-hidden="true">✈</i><b>${trip.flights.outbound.to} ${trip.flights.outbound.arrive}</b></div><div><span>오는 편 <i aria-hidden="true">·</i> ${trip.flights.return.date}</span><b>${trip.flights.return.from} ${trip.flights.return.depart}</b><i aria-hidden="true">✈</i><b>${trip.flights.return.to} ${trip.flights.return.arrive}</b></div></section></details>
    </div><section id="itinerary" class="planner" ${activeView === 'itinerary' ? '' : 'hidden'}><div class="planner-intro"><h2>날짜별 일정</h2><span>현지 시간 기준</span></div>${renderDayTabs(trip.days, activeDay)}${renderDay(trip.days[activeDay], state, scheduleMode)}</section>
    <div class="dining-view" ${activeView === 'food' ? '' : 'hidden'}>${renderDining()}</div>
    <div class="shopping-view" ${activeView === 'shopping' ? '' : 'hidden'}>${renderShopping()}</div>
    <div class="links-view" ${activeView === 'links' ? '' : 'hidden'}>${renderTravelLinks()}</div>
    <div class="preparation-view" ${activeView === 'preparation' ? '' : 'hidden'}>${renderPreparation(state)}</div><footer><button type="button" class="install-button"><i class="ti ti-device-mobile-down" aria-hidden="true"></i> 홈 화면에 추가</button><b>여행노트</b><p>일정은 현지 상황과 가족 컨디션에 맞춰 여유 있게 조정하세요.</p><button class="to-top">↑ 맨 위로</button></footer></main>
    <button class="floating-top to-top" type="button" aria-label="페이지 맨 위로 이동" hidden><i class="ti ti-arrow-up" aria-hidden="true"></i><span>맨 위로</span></button>
    <div class="modal-layer ${airportOpen ? 'open' : ''}" aria-hidden="${!airportOpen}"><div class="modal-backdrop"></div>${airportOpen ? renderAirportGuide(guide) : ''}</div>
    <div class="map-layer ${mapOpen ? 'open' : ''}" aria-hidden="${!mapOpen}"><div class="map-backdrop"></div>${mapOpen ? renderTripMap(trip.days[activeDay], trip.days, activeDay) : ''}</div>
    <div class="install-layer ${installHelpOpen ? 'open' : ''}" aria-hidden="${!installHelpOpen}"><div class="install-backdrop"></div>${installHelpOpen ? `<section class="install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-title"><div class="install-sheet-head"><img src="/icons/tripnote.svg" alt="" width="48" height="48"><button class="install-close" type="button" aria-label="설치 안내 닫기"><i class="ti ti-x" aria-hidden="true"></i></button></div><p class="eyebrow">여행노트 바로가기</p><h2 id="install-title">홈 화면에 추가하기</h2><p class="install-intro">브라우저에서 한 번만 추가하면 다음부터 앱처럼 바로 열 수 있어요.</p>${renderInstallPreview()}<ol class="install-steps">${renderInstallSteps(installPlatform).map((step) => `<li><b>${step.number}</b><span>${step.text}</span></li>`).join('')}</ol>${installPlatform === 'android' && installPromptAvailable ? '<button class="install-native" type="button" data-native-install><i class="ti ti-download" aria-hidden="true"></i> 지금 설치</button>' : ''}<p class="install-footnote">설치 후에도 인터넷 연결이 필요해요. 여행 일정과 지도는 최신 정보로 열립니다.</p><button class="install-done" type="button">확인</button></section>` : ''}</div>`;
}
