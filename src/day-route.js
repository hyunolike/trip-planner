import { getDayMapPoints, getDayRouteSegments, createGoogleMapsUrl } from './map.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createGoogleDirectionsUrl(segment) {
  const points = segment.coordinates;
  const query = new URLSearchParams({api:'1',origin:points[0].join(','),destination:points.at(-1).join(',')});
  const mode = segment.mode === 'walk' ? 'walking' : segment.mode === 'train' || (segment.mode === 'bus' && !/투어|전용/.test(segment.label)) ? 'transit' : segment.mode === 'bus' ? 'driving' : null;
  if (mode) query.set('travelmode', mode);
  if (mode && mode !== 'transit' && points.length > 2) query.set('waypoints',points.slice(1,-1).slice(0,3).map(p=>p.join(',')).join('|'));
  return 'https://www.google.com/maps/dir/?'+query.toString();
}
export function renderDayRoute(day) {
  const points = getDayMapPoints(day), segments = getDayRouteSegments(day);
  const byId = new Map(points.map(p=>[p.id,p]));
  if (!points.length) return '';
  return `<section class="day-route" aria-labelledby="day-route-title">
    <div class="day-route-heading"><div><span class="ds-caption">${day.number}일차 · ${escape(day.dateLabel)}</span><h3 id="day-route-title">오늘의 이동 경로</h3></div><button type="button" class="ds-icon-button map-button" aria-label="이날의 이동 지도 크게 보기"><i class="ti ti-maximize" aria-hidden="true"></i></button></div>
    <div class="day-route-canvas" id="day-route-map" role="region" aria-label="${escape(day.dateLabel)} 첫 출발지부터 마지막 목적지까지의 이동 지도"><div class="map-load-note">지도를 불러오는 중입니다.</div></div>
    <div class="day-route-playback"><div><span class="route-live-dot" aria-hidden="true"></span><span data-inline-map-status role="status">${escape(points[0].title)}에서 출발</span></div><button type="button" data-inline-map-play aria-pressed="false" aria-label="이동 경로 반복 재생"><i class="ti ti-player-play" aria-hidden="true"></i><span>재생</span></button></div>
    <ol class="day-route-stops" aria-label="이날의 이동 순서">${points.map((p,i)=>`<li><button type="button" data-inline-map-focus="${escape(p.id)}" aria-label="${i+1}번째 장소 ${escape(p.title)} 지도에서 보기"><span>${String(i+1).padStart(2,'0')}</span>${escape(p.title)}</button></li>`).join('')}</ol>
    <details class="google-route-details"><summary>Google 지도로 구간별 길찾기 <i class="ti ti-chevron-down" aria-hidden="true"></i></summary><div>${segments.map((s,i)=>`<a class="google-route-link" href="${escape(s.mode==='flight'?createGoogleMapsUrl(s.coordinates.at(-1)):createGoogleDirectionsUrl(s))}" target="_blank" rel="noopener noreferrer"><span><small>${String(i+1).padStart(2,'0')} · ${escape(s.label)}</small><b>${escape(byId.get(s.fromId)?.title)} → ${escape(byId.get(s.toId)?.title)}</b></span><i class="ti ti-external-link" aria-hidden="true"></i><span class="sr-only">${s.mode==='flight'?'도착 공항 위치':'실제 길찾기'} 새 창에서 열기</span></a>`).join('')}</div></details>
    <p class="day-route-note">지도 선은 일정의 장소·경유지를 연결한 안내 동선입니다. 실제 도보·대중교통 경로와 소요시간은 위 Google 길찾기에서 확인하세요.</p>
  </section>`;
}
