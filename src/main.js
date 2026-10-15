import { walkingMaps } from './deck-route.js';
import { observeDotonboriHighlight } from './dotonbori-highlight.js';
import { refreshWeather, updateWeatherCards, WEATHER_REFRESH_MS } from './weather.js';
import { updateTripCountdown } from './countdown.js';
import 'leaflet/dist/leaflet.css';
import './design-system.css';
import L from 'leaflet';
import { airportGuide, trip } from './data.js';
import { mountTripMap } from './map.js';
import { renderApp } from './render.js';
import { createTripStore } from './state.js';
import { transitMaps } from './transit-guides.js';
import { openIllustratedMapViewer, openCastleMapViewer } from './castle-map-viewer.js';

const root = document.querySelector('#app');
const store = createTripStore();
let activeDay = 0;
let scheduleMode = 'summary';
const viewHashes = { itinerary: '#itinerary', food: '#restaurants', shopping: '#shopping', links: '#links', preparation: '#preparation' };
const viewFromHash = () => Object.keys(viewHashes).find(view => viewHashes[view] === window.location.hash) || 'itinerary';
let activeView = viewFromHash();
let airportOpen = false;
let mapOpen = window.location.hash === '#map';
let installHelpOpen = window.location.hash === '#install';
let deferredInstallPrompt = null;
const installPlatform = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ? 'ios'
  : /android/i.test(navigator.userAgent) ? 'android' : 'other';
let focusedMapStop = null;
let mapController = null;
let inlineMapController = null;
let inlineMapObserver = null;
let inlineMapPlaying = false;
let inlineMapVisible = false;
let inlineMapUserPaused = false;
let mapPlaying = false;
let lastFocused = null;
let activeHeroSlide = 0;
let tipIndex = 0;
let hideCompleted = false;
let toastTimer = null;
let countdownElement = null;
let dotonboriObserver = null;

function updateBackToTop() {
  const button = root.querySelector('.floating-top');
  if (button) button.hidden = window.scrollY < 400 || airportOpen || mapOpen || installHelpOpen;
}

window.addEventListener('scroll', updateBackToTop, { passive: true });

function updateCompanion() {
  const day = trip.days[activeDay];
  const count = day.stops.filter(stop => store.getState().completedStops.includes(stop.id)).length;
  const tips = [day.note, '지도 버튼을 누르면 이동 경로와 승하차 지점을 함께 볼 수 있어요.', count === day.stops.length ? '선택한 날짜의 일정을 모두 완료했어요.' : `${day.stops.length}개 중 ${count}개 일정을 완료했어요.`];
  root.querySelector('[data-guide-message]').textContent = tips[tipIndex];
  root.querySelector('[data-tip-count]').textContent = `${tipIndex + 1} / ${tips.length}`;
}

function animateFeedback(element, kind = 'enter') {
  if (!element?.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const frames = kind === 'complete'
    ? [{ transform: 'scale(.86)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }]
    : [{ opacity: .45, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }];
  element.animate(frames, { duration: kind === 'complete' ? 260 : 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

function showToast(message) {
  clearTimeout(toastTimer);
  document.querySelector('.travel-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'travel-toast';
  toast.setAttribute('role', 'status');
  const text = document.createElement('span');
  text.textContent = message;
  toast.append(text);
  document.body.append(toast);
  toastTimer = setTimeout(() => toast.remove(), 2600);
}

function showHeroSlide(index) {
  const slides = trip.heroSlides || [];
  const carousel = root.querySelector('[data-hero-carousel]');
  if (!carousel || !slides.length) return;
  activeHeroSlide = (index + slides.length) % slides.length;
  const slide = slides[activeHeroSlide];
  const image = carousel.querySelector('[data-hero-image]');
  image.classList.add('is-changing');
  image.src = slide.photo.src;
  image.alt = slide.photo.alt;
  image.style.objectPosition = slide.photo.focus === 'top' ? 'center top' : 'center';
  image.onload = () => image.classList.remove('is-changing');
  carousel.querySelector('[data-hero-link]').href = slide.blogUrl;
  carousel.querySelector('[data-hero-link]').setAttribute('aria-label', `${slide.place} 여행 소개 글 새 탭에서 읽기`);
  carousel.querySelector('[data-hero-area]').textContent = slide.area;
  carousel.querySelector('[data-hero-place]').textContent = slide.place;
  carousel.querySelector('[data-hero-counter]').textContent = `${activeHeroSlide + 1} / ${slides.length}`;
  carousel.querySelectorAll('[data-hero-slide]').forEach((dot, dotIndex) => dot.setAttribute('aria-current', String(dotIndex === activeHeroSlide)));
}


let renderedDay = -1;
function restoreLastFocus() {
  if (!lastFocused) { root.querySelector('.brand')?.focus({preventScroll:true}); return; }
  if (lastFocused.isConnected) { lastFocused.focus({ preventScroll: true }); return; }
  const candidates = [...root.querySelectorAll('button, a')];
  const same = candidates.find(el => el.outerHTML === lastFocused.outerHTML)
    || candidates.find(el => el.className === lastFocused.className && el.textContent === lastFocused.textContent);
  (same || root.querySelector('.brand'))?.focus({ preventScroll: true });
}
function draw({ preserveScroll = true } = {}) {
  const keepExpanded = preserveScroll && renderedDay === activeDay;
  const expanded = keepExpanded
    ? [...root.querySelectorAll('main details')].map((el, i) => el.open ? i : -1).filter(i => i >= 0) : [];
  renderedDay = activeDay;
  const y = window.scrollY;
  dotonboriObserver?.disconnect();
  inlineMapObserver?.disconnect();
  inlineMapController?.destroy();
  inlineMapController = null;
  inlineMapPlaying = false;
  inlineMapVisible = false;
  mapController?.destroy();
  mapController = null;
  mapPlaying = false;
  root.innerHTML = renderApp(trip, airportGuide, activeDay, store.getState(), airportOpen, mapOpen, installHelpOpen, installPlatform, Boolean(deferredInstallPrompt), activeView, scheduleMode);
  if (keepExpanded) root.querySelectorAll('main details').forEach((el, i) => { el.open = expanded.includes(i); });
  const dialogOpen = airportOpen || mapOpen || installHelpOpen;
  root.querySelectorAll('.site-header, .trip-menu, main, .floating-top').forEach(el => { el.inert = dialogOpen; });
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const installCallout = root.querySelector('[data-install-callout]');
  if (installed || localStorage.getItem('tripnote-install-dismissed') === '1') installCallout?.remove();
  showHeroSlide(activeHeroSlide);
  updateCompanion();
  root.querySelector('.timeline').classList.toggle('hide-completed', hideCompleted);
  root.querySelector('[data-hide-completed]').setAttribute('aria-pressed', String(hideCompleted));
  document.body.classList.toggle('modal-open', airportOpen || mapOpen || installHelpOpen);
  if (preserveScroll) window.scrollTo(0, y);
  updateBackToTop();
  if (airportOpen) root.querySelector('.close-guide')?.focus();
  if (installHelpOpen) root.querySelector('.install-close')?.focus();
  if (mapOpen) {
    requestAnimationFrame(() => {
      mapController = mountTripMap({
        L,
        container: root.querySelector('#trip-map'),
        day: trip.days[activeDay],
        focusStopId: focusedMapStop,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        onSelect: selectMapRow,
        onPlaybackState: setMapPlaybackState,
      });
      root.querySelector('.close-map')?.focus();
    });
  }
  const inlineContainer = root.querySelector('#day-route-map');
  if (activeView === 'itinerary' && !dialogOpen && inlineContainer) {
    inlineMapController = mountTripMap({
      L, container: inlineContainer, day: trip.days[activeDay],
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      loop: true, followCamera: true, compact: true,
      onSelect: id => {
        const point = trip.days[activeDay].stops.find(stop => stop.id === id);
        const status = root.querySelector('[data-inline-map-status]');
        if (status && point) status.textContent = `${point.time} · ${point.title}`;
        root.querySelectorAll('[data-inline-map-focus]').forEach(button => button.setAttribute('aria-current',String(button.dataset.inlineMapFocus===id)));
      },
      onPlaybackState: playing => {
        inlineMapPlaying = playing;
        const button = root.querySelector('[data-inline-map-play]');
        if (button) {
          button.setAttribute('aria-pressed',String(playing));
          button.setAttribute('aria-label',playing?'이동 경로 반복 재생 일시정지':'이동 경로 반복 재생');
          button.innerHTML = `<i class="ti ti-player-${playing?'pause':'play'}" aria-hidden="true"></i><span>${playing?'일시정지':'재생'}</span>`;
        }
      },
    });
    inlineContainer.querySelector('.map-load-note')?.remove();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.querySelector('[data-inline-map-play] span').textContent = '순서 보기';
    } else if (globalThis.IntersectionObserver) {
      inlineMapObserver = new IntersectionObserver(entries => {
        inlineMapVisible = entries.some(entry=>entry.isIntersecting);
        if (inlineMapVisible && !inlineMapUserPaused && !document.hidden && !inlineMapPlaying) inlineMapController?.play();
        else if (!inlineMapVisible) inlineMapController?.stop();
      },{threshold:.25});
      inlineMapObserver.observe(inlineContainer);
    }
  }
  countdownElement = root.querySelector('.trip-countdown');
  updateTripCountdown(countdownElement, trip);
  dotonboriObserver = observeDotonboriHighlight(root);
}

function selectMapRow(stopId) {
  root.querySelectorAll('[data-map-row]').forEach((row) => row.classList.toggle('active', row.dataset.mapRow === stopId));
  const point = trip.days[activeDay].stops.find(stop => stop.id === stopId);
  const status = root.querySelector('[data-map-status]');
  if (status && point) status.textContent = `${point.time} · ${point.title}`;
  const detail = root.querySelector('[data-map-route-detail]');
  if (detail) {
    detail.hidden = stopId !== 'd1-lunch';
    detail.textContent = '호텔 5층 짐 보관 → 2층 출입구 → 남관 연결다리 → 우메키타 그린플레이스 2층 → 루쿠아 이레 서쪽 입구 → B2 바르치카 いづも. 지도 선은 연결 구간의 대표 위치이며 실내 길은 층별 그림을 확인해요.';
  }
}

function setMapPlaybackState(isPlaying) {
  mapPlaying = isPlaying;
  const button = root.querySelector('[data-map-play]');
  if (!button) return;
  button.setAttribute('aria-pressed', String(isPlaying));
  button.innerHTML = isPlaying ? '<i class="ti ti-player-stop" aria-hidden="true"></i> 경로 재생 멈추기' : '<i class="ti ti-player-play" aria-hidden="true"></i> 경로 따라보기';
}

root.addEventListener('click', (event) => {
  const inlinePlay = event.target.closest('[data-inline-map-play]');
  if (inlinePlay) {
    inlineMapUserPaused = inlineMapPlaying;
    if (inlineMapPlaying) inlineMapController?.stop();
    else inlineMapController?.play();
    return;
  }
  const inlineFocus = event.target.closest('[data-inline-map-focus]');
  if (inlineFocus) { inlineMapUserPaused = true; inlineMapController?.focus(inlineFocus.dataset.inlineMapFocus); return; }
  const modeButton = event.target.closest('[data-schedule-mode]');
  if (modeButton) {
    scheduleMode = modeButton.dataset.scheduleMode;
    root.querySelectorAll('[data-schedule-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scheduleMode === scheduleMode)));
    root.querySelectorAll('.stop-detail').forEach(detail => { detail.open = scheduleMode === 'detail'; });
    return;
  }
  if (event.target.closest('[data-weather-refresh]')) {
    refreshWeather(() => updateWeatherCards(root, trip), { force: true });
    return;
  }
  const walkingMap = event.target.closest('[data-walking-map-open]');
  if (walkingMap && walkingMaps[walkingMap.dataset.walkingMapOpen]) { openIllustratedMapViewer(walkingMap, walkingMaps[walkingMap.dataset.walkingMapOpen]); return; }
  const transitMap = event.target.closest('[data-transit-map-open]');
  if (transitMap && transitMaps[transitMap.dataset.transitMapOpen]) { openIllustratedMapViewer(transitMap, transitMaps[transitMap.dataset.transitMapOpen]); return; }
  const castleMap = event.target.closest('[data-castle-map-open]');
  if (castleMap) { openCastleMapViewer(castleMap); return; }
  const viewLink = event.target.closest('[data-view]');
  if (viewLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    activeView = viewLink.dataset.view;
    history.pushState(null, '', viewHashes[activeView]);
    draw({ preserveScroll: false });
    animateFeedback(root.querySelector(activeView === 'itinerary' ? '.trip-overview' : `.${activeView === 'food' ? 'dining' : activeView}-view`));
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (activeView === 'shopping') root.querySelector('#shopping-title').focus({ preventScroll: true });
    else if (activeView === 'food') root.querySelector('#dining-title').focus({ preventScroll: true });
    else if (activeView === 'links') root.querySelector('#links-title').focus({ preventScroll: true });
    else if (activeView === 'preparation') root.querySelector('#preparation-title').focus({ preventScroll: true });
    else root.querySelector('[data-view="itinerary"]').focus({ preventScroll: true });
    return;
  }

  const day = event.target.closest('[data-day]');
  const stamp = event.target.closest('[data-stop-id]');
  const option = event.target.closest('[data-option]');
  const mapStop = event.target.closest('[data-map-stop]');
  const mapFocus = event.target.closest('[data-map-focus]');
  const mapDay = event.target.closest('[data-map-day]');
  const mapPlay = event.target.closest('[data-map-play]');
  const heroDot = event.target.closest('[data-hero-slide]');

  if (event.target.closest('.trip-share')) {
    // Use the same copy as the HTML metadata crawlers receive without JavaScript.
    // A versioned URL gives the updated preview a new scrap URL; keep it stable.
    const shareUrl = new URL(document.querySelector('link[rel="canonical"]').href);
    shareUrl.searchParams.set('share', '20261008');
    shareUrl.hash = viewHashes[activeView];
    const share = {
      title: document.querySelector('meta[property="og:title"]').content,
      text: document.querySelector('meta[property="og:description"]').content,
      url: shareUrl.href,
    };
    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(share.url);
        showToast('여행 링크를 복사했어요. 대화창에 붙여 넣어 공유하세요.');
      } catch {
        showToast('주소창의 여행 페이지 링크를 복사해 공유해 주세요.');
      }
    };
    if (navigator.share) navigator.share(share).catch(error => {
      if (error.name !== 'AbortError') copyLink();
    });
    else copyLink();
    return;
  }

  const destination = event.target.closest('[data-scroll-stop]');
  if (destination) {
    const section = root.querySelector(`[data-timeline-stop="${destination.dataset.scrollStop}"]`);
    if (hideCompleted && section?.classList.contains('done')) {
      hideCompleted = false;
      root.querySelector('.timeline').classList.remove('hide-completed');
      root.querySelector('[data-hide-completed]').setAttribute('aria-pressed', 'false');
    }
    const stopDetail = section?.querySelector('.stop-detail');
    if (stopDetail) stopDetail.open = true;
    const guide = destination.hasAttribute('data-open-guide') ? section?.querySelector('.place-guide') : null;
    if (guide) guide.open = true;
    (guide || section)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    (guide?.querySelector('summary') || section?.querySelector('.stamp-button'))?.focus({ preventScroll: true });
    return;
  }

  if (event.target.closest('[data-guide-tip]')) {
    tipIndex = (tipIndex + 1) % 3;
    updateCompanion();
    const avatar = root.querySelector('.companion-avatar');
    avatar.classList.remove('is-waving');
    requestAnimationFrame(() => avatar.classList.add('is-waving'));
    return;
  }
  if (event.target.closest('[data-next-stop]')) {
    const next = trip.days[activeDay].stops.find(stop => !store.getState().completedStops.includes(stop.id));
    const section = next && root.querySelector(`[data-timeline-stop="${next.id}"]`);
    if (section?.querySelector('.stop-detail')) section.querySelector('.stop-detail').open = true;
    section?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    section?.querySelector('.stamp-button')?.focus({ preventScroll: true });
    return;
  }
  if (event.target.closest('[data-hide-completed]')) {
    hideCompleted = !hideCompleted;
    root.querySelector('.timeline').classList.toggle('hide-completed', hideCompleted);
    event.target.closest('[data-hide-completed]').setAttribute('aria-pressed', String(hideCompleted));
    return;
  }

  if (event.target.closest('.install-dismiss')) {
    localStorage.setItem('tripnote-install-dismissed', '1');
    root.querySelector('[data-install-callout]')?.remove();
    return;
  }
  if (event.target.closest('.install-button')) {
    lastFocused = event.target.closest('.install-button');
    installHelpOpen = true;
    draw();
    root.querySelector('.install-close')?.focus();
    return;
  }
  if (event.target.closest('[data-native-install]') && deferredInstallPrompt) {
    const prompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    prompt.prompt();
    prompt.userChoice.then(() => {}, () => {});
    return;
  }
  if (event.target.closest('.install-close') || event.target.closest('.install-done') || event.target.closest('.install-backdrop')) {
    installHelpOpen = false;
    if (window.location.hash === '#install') history.replaceState(null,'','#itinerary');
    draw();
    restoreLastFocus();
    return;
  }

  if (day) {
    activeDay = Number(day.dataset.day);
    inlineMapUserPaused = false;
    tipIndex = 0;
    draw();
    animateFeedback(root.querySelector('.day-panel'));
    root.querySelector(`[data-day="${activeDay}"]`)?.focus({ preventScroll: true });
    root.querySelector('.day-tabs')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
    return;
  }
  if (event.target.closest('[data-hero-prev]')) { showHeroSlide(activeHeroSlide - 1); return; }
  if (event.target.closest('[data-hero-next]')) { showHeroSlide(activeHeroSlide + 1); return; }
  if (heroDot) { showHeroSlide(Number(heroDot.dataset.heroSlide)); return; }
  if (stamp) {
    const id = stamp.dataset.stopId;
    const title = trip.days[activeDay].stops.find(stop => stop.id === id)?.title;
    const wasDone = store.getState().completedStops.includes(id);
    store.toggleStop(id);
    draw();
    root.querySelector(`[data-stop-id="${id}"]`)?.focus({ preventScroll: true });
    animateFeedback(root.querySelector(`[data-stop-id="${id}"] span`), 'complete');
    showToast(wasDone ? '완료 표시를 해제했어요.' : `${title} · 완료했어요!`);
    return;
  }
  if (option) {
    store.selectDay4(option.dataset.option);
    draw();
    return;
  }
  if (mapStop) {
    lastFocused = mapStop;
    focusedMapStop = mapStop.dataset.mapStop;
    mapOpen = true;
    airportOpen = false;
    draw();
    return;
  }
  if (mapFocus) {
    focusedMapStop = mapFocus.dataset.mapFocus;
    mapController?.focus(focusedMapStop);
    selectMapRow(focusedMapStop);
    return;
  }
  if (mapPlay) {
    if (mapPlaying) mapController?.stop();
    else mapController?.play();
    return;
  }
  if (event.target.closest('[data-map-overview]')) {
    mapController?.overview();
    return;
  }
  if (mapDay) {
    activeDay = Number(mapDay.dataset.mapDay);
    focusedMapStop = null;
    draw();
    return;
  }
  if (event.target.closest('.map-button')) {
    lastFocused = event.target.closest('.map-button');
    mapOpen = true;
    airportOpen = false;
    focusedMapStop = null;
    draw();
    return;
  }
  if (event.target.closest('.airport-button')) {
    lastFocused = event.target.closest('.airport-button');
    airportOpen = true;
    mapOpen = false;
    draw();
    return;
  }
  if (event.target.closest('.close-map') || event.target.closest('.map-backdrop')) {
    mapOpen = false;
    draw();
    restoreLastFocus();
    return;
  }
  if (event.target.closest('.close-guide') || event.target.closest('.modal-backdrop')) {
    airportOpen = false;
    draw();
    restoreLastFocus();
    return;
  }
  if (event.target.closest('.to-top')) {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    root.querySelector('.brand')?.focus({ preventScroll: true });
  }
});

root.addEventListener('toggle', event => {
  const detail = event.target;
  if (detail.matches?.('.stop-detail') && detail.open) animateFeedback(detail.querySelector('.stop-detail-body'));
}, true);

root.addEventListener('change', event => {
  const input = event.target.closest('[data-preparation-id]');
  if (!input) return;
  store.togglePreparation(input.dataset.preparationId);
  const inputs = [...root.querySelectorAll('[data-preparation-id]')];
  const count = inputs.filter(item=>item.checked).length;
  root.querySelector('[data-prep-total]').textContent = `${count} / ${inputs.length}개 준비 완료`;
  root.querySelector('[data-prep-progress]').value = count;
  root.querySelectorAll('[data-prep-group]').forEach(group => {
    const items = [...group.querySelectorAll('[data-preparation-id]')];
    group.querySelector('[data-prep-group-count]').textContent = `${items.filter(item=>item.checked).length} / ${items.length}`;
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && (airportOpen || mapOpen || installHelpOpen)) {
    const dialog = root.querySelector('[role="dialog"]');
    const items = [...(dialog?.querySelectorAll('button:not([disabled]), a[href], input, summary, [tabindex="0"]') || [])].filter(el => !el.closest('[hidden]') && !el.closest('details:not([open]) > :not(summary)'));
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
  }
  if (event.key === 'Escape'  && (airportOpen || mapOpen || installHelpOpen)) {
    airportOpen = false;
    mapOpen = false;
    installHelpOpen = false;
    if (window.location.hash === '#install') history.replaceState(null,'','#itinerary');
    draw();
    restoreLastFocus();
  }
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  localStorage.setItem('tripnote-install-dismissed', '1');
  root.querySelector('[data-install-callout]')?.remove();
});

window.addEventListener('popstate', () => {
  activeView = viewFromHash();
  draw({ preserveScroll: false });
});

draw({ preserveScroll: false });
window.dispatchEvent(new Event('tripnote:ready'));
setInterval(() => {
  if (!document.hidden) updateTripCountdown(countdownElement, trip);
}, 1000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) inlineMapController?.stop();
  else if (inlineMapVisible && !inlineMapUserPaused && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) inlineMapController?.play();
  if (!document.hidden) {
    updateTripCountdown(countdownElement, trip);
    refreshWeather(() => updateWeatherCards(root, trip));
  }
});
refreshWeather(() => updateWeatherCards(root, trip));
setInterval(() => {
  if (!document.hidden) refreshWeather(() => updateWeatherCards(root, trip));
}, WEATHER_REFRESH_MS);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}), { once: true });
}
