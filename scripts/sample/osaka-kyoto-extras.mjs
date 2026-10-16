import { JSDOM } from 'jsdom';
import { airportGuide, kyotoShopping, officialLinks, osakaDining, osakaShopping, trip } from '../../src/data.js';
import { placeGuides } from '../../src/place-guides.js';
import { renderCastleCourse } from '../../src/castle-course.js';
import { renderHotelGuide } from '../../src/hotel-guides.js';
import { renderBreakfastGuide } from '../../src/breakfast-guides.js';
import { renderBathGuide, renderTransitGuide } from '../../src/transit-guides.js';
import { renderDeckGuide } from '../../src/deck-route.js';
import { renderDotonboriHighlight } from '../../src/dotonbori-highlight.js';
import { preparationGroups, renderDonkiCoupon, renderDutyFreePickup } from '../../src/preparation.js';
import { renderAirportGuide, renderApp } from '../../src/render.js';
import { compact, toLink } from './util.mjs';

const STATE = { completedStops: [], completedPreparation: [], day4Option: 'slow-kyoto' };

const htmlBlock = (title, html) => ({ type: 'html', title, html });

// 일정 도시 코드(src/data.js의 day.city)를 다른 장소와 같은 지역 라벨로 바꾼다.
const CITY_AREA = { OSAKA: '오사카', KYOTO: '교토', 'KYOTO NORTH': '교토 북부', 'KYOTO → KIX': '교토 · 간사이공항' };

// 이름이 달라도 osakaDining에 있는 같은 가게를 가리키는 일정 식당 이름.
const RESTAURANT_ALIASES = { '이즈모우나기 루쿠아점': 'izumo' };

// 기존 맛집 항목의 값은 덮어쓰지 않고, 일정 식당에만 있는 값만 채운다.
// 두 note는 서로 다른 맥락(가게 소개 / 이 일정에서의 안내)이라 원문 그대로 줄바꿈으로 이어 붙인다.
function mergeRestaurant(place, restaurant) {
  if (restaurant.alternatives && !place.alternatives) place.alternatives = restaurant.alternatives;
  if (restaurant.menu && !place.menu) place.menu = restaurant.menu;
  if (restaurant.note) {
    if (!place.note) place.note = restaurant.note;
    else if (!place.note.includes(restaurant.note)) place.note = `${place.note}\n${restaurant.note}`;
  }
  if (restaurant.link) {
    place.sources ??= [];
    if (!place.sources.some((source) => source.url === restaurant.link.url)) place.sources.push(toLink(restaurant.link));
  }
}

export function buildPlaces() {
  const dining = osakaDining.map((item) => compact({
    id: item.id, kind: 'dining', name: item.name, branch: item.branch, area: item.area, category: item.category, icon: item.icon,
    menu: item.menu, address: item.address, hours: item.hours, mapUrl: item.mapUrl, note: item.note,
    sources: [item.source, item.menuSource].filter(Boolean).map(toLink), checkedAt: item.checkedAt,
  }));
  const diningById = new Map(dining.map((place) => [place.id, place]));
  const diningIdByName = new Map(dining.map((place) => [place.name, place.id]));

  const placeIdByRestaurant = new Map();
  const mealPlaces = [];
  for (const day of trip.days) {
    for (const stop of day.stops) {
      const restaurant = stop.restaurant;
      if (!restaurant) continue;
      const existingId = diningIdByName.get(restaurant.name) ?? RESTAURANT_ALIASES[restaurant.name];
      const existing = existingId && diningById.get(existingId);
      if (existing) {
        placeIdByRestaurant.set(restaurant.name, existing.id);
        mergeRestaurant(existing, restaurant);
        continue;
      }
      if (placeIdByRestaurant.has(restaurant.name)) continue;
      const id = `meal-${stop.id}`;
      placeIdByRestaurant.set(restaurant.name, id);
      mealPlaces.push(compact({
        id,
        kind: 'dining',
        name: restaurant.name,
        branch: restaurant.english,
        area: CITY_AREA[day.city],
        menu: restaurant.menu,
        note: restaurant.note,
        alternatives: restaurant.alternatives,
        sources: restaurant.link ? [toLink(restaurant.link)] : undefined,
      }));
    }
  }

  const shopping = [...osakaShopping, ...kyotoShopping].map((item) => compact({
    id: item.id, kind: 'shopping', name: item.name, branch: item.branch, area: item.area, category: item.category, icon: item.icon,
    items: item.items, address: item.address, hours: item.hours, mapUrl: item.mapUrl, mapQuery: item.mapQuery, note: item.note,
    facts: [['찾아가기', item.access], ['면세', item.taxFree], ['입장', item.admission], ['같이 보기', item.nearby]].filter(([, value]) => value),
    media: item.video ? [{ label: item.video.title, url: item.video.url }] : undefined,
    sources: [item.source, item.extraSource, item.admissionSource].filter(Boolean).map(toLink),
    checkedAt: item.checkedAt,
  }));

  return { places: [...mealPlaces, ...dining, ...shopping], placeIdByRestaurant };
}

export function buildGuide(stop) {
  const blocks = [];
  let kind;
  let title;

  const place = placeGuides[stop.id];
  if (place) {
    kind = 'place';
    title = `${place.name} 가는 방법·방문 팁`;
    blocks.push({ type: 'paragraph', text: place.message });
    blocks.push({ type: 'facts', items: [['출발', place.from], ['이동', place.mode]] });
    blocks.push({ type: 'steps', items: place.steps });
    if (place.alternative) blocks.push({ type: 'paragraph', text: place.alternative });
    if (stop.id === 'd1-castle') blocks.push(htmlBlock('오사카성 관람 코스 지도', renderCastleCourse()));
    blocks.push({ type: 'facts', items: place.facts });
    blocks.push({ type: 'tips', items: place.tips });
    blocks.push({ type: 'links', items: place.sources.map(toLink) });
  }

  const extras = [
    ['place', '도톤보리 사진 포인트', renderDotonboriHighlight(stop.id)],
    ['place', '호텔에서 식당까지 연결 동선', stop.id === 'd1-lunch' ? renderDeckGuide() : ''],
    ['hotel', '숙소 안내', renderHotelGuide(stop.id)],
    ['breakfast', '조식 안내', renderBreakfastGuide(stop.id)],
    ['airport', '출국 전 면세품 수령', stop.id === 'd1-gmp' ? renderDutyFreePickup(true) : ''],
    ['place', '돈키호테 할인쿠폰', renderDonkiCoupon(stop.id)],
    ['transit', '이동 안내', renderTransitGuide(stop.id)],
    ['transit', '목욕·휴식 안내', renderBathGuide(stop.id)],
  ];
  for (const [extraKind, extraTitle, html] of extras) {
    if (!html) continue;
    kind ??= extraKind;
    title ??= extraTitle;
    blocks.push(htmlBlock(extraTitle, html));
  }

  return blocks.length ? { kind, title, blocks } : undefined;
}

export function buildChecklistGroups() {
  return preparationGroups.map((group) => compact({
    id: group.id,
    title: group.title,
    hint: group.hint,
    items: group.items.map(([id, priority, title, description]) => compact({ id, priority, title, description })),
  }));
}

export function buildLinkGroups() {
  return [
    { label: '공식 안내', links: Object.values(officialLinks).map(toLink) },
    { label: '여행지 소개', links: trip.heroSlides.map((slide) => ({ label: slide.place, url: slide.blogUrl })) },
    // Weather attribution link rendered by src/weather.js renderCard; the forecast itself is fetched live.
    { label: '날씨 출처', links: [{ label: 'Open-Meteo', url: 'https://open-meteo.com/' }] },
  ];
}

function viewHtml(view, selector) {
  const html = renderApp(trip, airportGuide, 0, STATE, false, false, false, 'other', false, view, 'summary');
  const root = new JSDOM(html).window.document.querySelector(selector);
  // The countdown is live UI that depends on the current time; the new app recomputes it from startDate.
  root.querySelectorAll('.trip-countdown').forEach((element) => element.remove());
  return root.innerHTML;
}

export function buildSections() {
  return [
    { id: 'overview', title: '여행 개요', legacy: true, blocks: [htmlBlock('항공편·경로·카운트다운', viewHtml('itinerary', '.trip-overview'))] },
    { id: 'airport', title: '공항 이용 안내', legacy: true, blocks: [htmlBlock('공항 이용 안내', renderAirportGuide(airportGuide))] },
    { id: 'food', title: '맛집', legacy: true, blocks: [htmlBlock('맛집', viewHtml('food', '.dining-view'))] },
    { id: 'shopping', title: '쇼핑', legacy: true, blocks: [htmlBlock('쇼핑', viewHtml('shopping', '.shopping-view'))] },
    { id: 'links', title: '예약·공식 링크', legacy: true, blocks: [htmlBlock('예약·공식 링크', viewHtml('links', '.links-view'))] },
    { id: 'preparation', title: '준비물', legacy: true, blocks: [htmlBlock('준비물', viewHtml('preparation', '.preparation-view'))] },
  ];
}
