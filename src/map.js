export function getDayMapPoints(day) {
  return day.stops
    .filter((stop) => Array.isArray(stop.coordinates) && stop.coordinates.length === 2)
    .map((stop) => ({
      id: stop.id,
      title: stop.title,
      time: stop.time,
      transport: stop.transport,
      coordinates: stop.coordinates,
      approximate: Boolean(stop.approximate),
    }));
}

export function createGoogleMapsUrl(coordinates) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates.join(','))}`;
}

const transitDefaults = {
  train: { label: '전철', icon: '🚆' },
  bus: { label: '버스', icon: '🚌' },
  walk: { label: '도보', icon: '🚶' },
  flight: { label: '비행기', icon: '✈️' },
  boat: { label: '배', icon: '⛴️' },
  cablecar: { label: '케이블카', icon: '🚠' },
};

const routeStyles = {
  train: { color: '#2f78a1', weight: 6, opacity: 0.92 },
  bus: { color: '#e9853c', weight: 6, opacity: 0.92 },
  walk: { color: '#557a55', weight: 5, opacity: 0.9, dashArray: '5 9' },
  flight: { color: '#c94235', weight: 5, opacity: 0.8, dashArray: '14 10' },
  boat: { color: '#3e87a8', weight: 5, opacity: 0.9, dashArray: '4 8' },
  cablecar: { color: '#8b5f3c', weight: 5, opacity: 0.9 },
};

const playbackZooms = {
  walk: 16,
  bus: 14,
  train: 13,
  boat: 13,
  cablecar: 14,
  flight: 7,
};

export function getPlaybackZoom(mode) {
  return playbackZooms[mode] ?? 14;
}

function inferTransit(transport = '') {
  if (transport.includes('✈')) return { mode: 'flight', ...transitDefaults.flight };
  if (transport.includes('🚌')) return { mode: 'bus', ...transitDefaults.bus };
  if (transport.includes('🚆') || transport.includes('🚇')) return { mode: 'train', ...transitDefaults.train };
  if (transport.includes('⛴') || transport.includes('🚤')) return { mode: 'boat', ...transitDefaults.boat };
  if (transport.includes('🚠')) return { mode: 'cablecar', ...transitDefaults.cablecar };
  return { mode: 'walk', ...transitDefaults.walk };
}

export function getDayRouteSegments(day) {
  const locatedStops = day.stops.filter((stop) => Array.isArray(stop.coordinates) && stop.coordinates.length === 2);
  return locatedStops.slice(1).map((stop, index) => {
    const previous = locatedStops[index];
    const transit = stop.transit || inferTransit(stop.transport);
    return {
      fromId: previous.id,
      toId: stop.id,
      mode: transit.mode,
      label: transit.label || transitDefaults[transit.mode]?.label || '이동',
      icon: transit.icon || transitDefaults[transit.mode]?.icon || '📍',
      coordinates: [previous.coordinates, ...(transit.waypoints || []), stop.coordinates],
    };
  });
}

export function pointAlongPath(coordinates, progress) {
  if (!coordinates.length) return null;
  if (coordinates.length === 1) return coordinates[0];
  const legs = coordinates.slice(1).map((point, index) => {
    const previous = coordinates[index];
    return Math.hypot(point[0] - previous[0], point[1] - previous[1]);
  });
  const total = legs.reduce((sum, distance) => sum + distance, 0);
  if (total === 0) return coordinates.at(-1);
  let remaining = Math.min(1, Math.max(0, progress)) * total;
  for (let index = 0; index < legs.length; index += 1) {
    if (remaining <= legs[index] || index === legs.length - 1) {
      const ratio = legs[index] === 0 ? 1 : remaining / legs[index];
      const start = coordinates[index];
      const end = coordinates[index + 1];
      return [start[0] + ((end[0] - start[0]) * ratio), start[1] + ((end[1] - start[1]) * ratio)];
    }
    remaining -= legs[index];
  }
  return coordinates.at(-1);
}

export function mountTripMap({
  L,
  container,
  day,
  focusStopId,
  reducedMotion = false,
  onSelect = () => {},
  loop = false,
  followCamera = true,
  compact = false,
  onPlaybackState = () => {},
}) {
  const points = getDayMapPoints(day);
  if (!container || !L || points.length === 0) return null;
  const segments = getDayRouteSegments(day);

  const map = L.map(container, { zoomControl: true, scrollWheelZoom: false, zoomSnap: 0.5, preferCanvas: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const route = segments.flatMap((segment) => segment.coordinates);
  segments.forEach((segment) => {
    L.polyline(segment.coordinates, routeStyles[segment.mode] || routeStyles.walk)
      .addTo(map)
      .bindTooltip(`${segment.icon} ${segment.label}`, { sticky: true });
  });
  if (route.length > 1) map.fitBounds(route, { padding: [42, 42], maxZoom: 13 });
  else map.setView(points[0].coordinates, 14);

  const familyIcon = (vehicle = '📍', label = '현재 위치') => L.divIcon({
    className: 'family-map-icon',
    html: `<div class="family-avatar"><img src="/illustrations/travel-duri.png" alt="여행 길잡이, 두리"><b class="family-vehicle" title="${label}">${vehicle}</b></div>`,
    iconSize: compact ? [52, 58] : [88, 80],
    iconAnchor: compact ? [26, 58] : [44, 80],
  });
  const initialIndex = Math.max(0, points.findIndex((point) => point.id === focusStopId));
  const initialSegment = segments.find((segment) => segment.toId === points[initialIndex].id);
  const familyMarker = L.marker(points[initialIndex].coordinates, {
    icon: familyIcon(initialSegment?.icon, initialSegment?.label),
    zIndexOffset: 1000,
  }).addTo(map);
  let animationFrame = null;
  let playbackToken = 0;
  let cancelPending = null;
  let destroyed = false;
  let playing = false;

  function cancelMovement() {
    playbackToken += 1;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    cancelPending?.();
    cancelPending = null;
    map.stop();
  }

  function pause(milliseconds, token) {
    if (reducedMotion || destroyed || token !== playbackToken) return Promise.resolve(false);
    return new Promise(resolve => {
      const timer = setTimeout(() => { cancelPending = null; resolve(token === playbackToken && !destroyed); }, milliseconds);
      cancelPending = () => { clearTimeout(timer); resolve(false); };
    });
  }

  function stop() {
    cancelMovement();
    playing = false;
    onPlaybackState(false);
  }

  async function animateSegment(segment, token) {
    if (!segment || destroyed || token !== playbackToken) return false;
    familyMarker.setIcon(familyIcon(segment.icon, segment.label));
    const hasDistance = segment.coordinates.some(point => point[0] !== segment.coordinates[0][0] || point[1] !== segment.coordinates[0][1]);
    if (hasDistance && followCamera) {
      const options = { padding: [64, 70], maxZoom: getPlaybackZoom(segment.mode), duration: 0.75 };
      if (reducedMotion) map.fitBounds(segment.coordinates, { ...options, animate: false });
      else {
        map.flyToBounds(segment.coordinates, options);
        if (!await pause(800, token)) return false;
      }
    }
    if (destroyed || token !== playbackToken) return false;
    const duration = reducedMotion ? 0 : hasDistance ? 2400 : 180;
    const started = performance.now();
    return new Promise((resolve) => {
      cancelPending = () => resolve(false);
      function frame(now) {
        if (destroyed || token !== playbackToken) { resolve(false); return; }
        const progress = duration === 0 ? 1 : Math.min(1, (now - started) / duration);
        const eased = progress * progress * (3 - 2 * progress);
        const position = pointAlongPath(segment.coordinates, eased);
        familyMarker.setLatLng(position);
        if (progress < 1) animationFrame = requestAnimationFrame(frame);
        else {
          animationFrame = null;
          cancelPending = null;
          onSelect(segment.toId);
          resolve(true);
        }
      }
      animationFrame = requestAnimationFrame(frame);
    });
  }

  function animateTo(index) {
    const point = points[index];
    if (!point) return;
    stop();
    const segment = segments.find((item) => item.toId === point.id);
    familyMarker.setIcon(familyIcon(segment?.icon, segment?.label));
    familyMarker.setLatLng(point.coordinates);
    onSelect(point.id);
    if (point.id === 'd1-lunch' && segment) {
      const options = { padding: [42, 42], maxZoom: 18 };
      if (reducedMotion) map.fitBounds(segment.coordinates, { ...options, animate: false });
      else map.flyToBounds(segment.coordinates, { ...options, duration: 0.9 });
      return;
    }
    if (reducedMotion) map.setView(point.coordinates, 15, { animate: false });
    else map.flyTo(point.coordinates, 15, { duration: 0.9 });
  }

  points.forEach((point, index) => {
    const icon = L.divIcon({
      className: 'numbered-map-icon',
      html: `<b>${index + 1}</b><span>${point.transport}</span>`,
      iconSize: compact ? [28, 28] : [42, 42],
      iconAnchor: compact ? [14, 14] : [21, 21],
    });
    L.marker(point.coordinates, { icon })
      .addTo(map)
      .bindTooltip(`${point.time} · ${point.title}${point.approximate ? ' (예상 위치)' : ''}`, { direction: 'top', offset: [0, -18] })
      .on('click', () => animateTo(index));
  });

  const resizeTimer = setTimeout(() => { if (!destroyed) map.invalidateSize(); }, 0);
  map.on('dragstart', () => { if (playing) stop(); });
  if (focusStopId) animateTo(initialIndex);
  else onSelect(points[initialIndex].id);

  return {
    stop,
    overview() {
      stop();
      if (route.length > 1) {
        const options = { padding: [54, 62], maxZoom: 13, duration: 0.9 };
        if (reducedMotion) map.fitBounds(route, { ...options, animate: false });
        else map.flyToBounds(route, options);
      }
    },
    focus(stopId) {
      const index = points.findIndex((point) => point.id === stopId);
      if (index >= 0) animateTo(index);
    },
    async play() {
      if (destroyed) return;
      stop();
      const token = ++playbackToken;
      playing = true;
      onPlaybackState(true);
      do {
        familyMarker.setLatLng(points[0].coordinates);
        familyMarker.setIcon(familyIcon('🚩', '출발'));
        onSelect(points[0].id);
        for (const segment of segments) {
          if (token !== playbackToken || destroyed) return;
          if (!await animateSegment(segment, token)) return;
          if (!reducedMotion && !await pause(280, token)) return;
        }
        if (!loop || reducedMotion || segments.length === 0) break;
        if (!await pause(1200, token)) return;
      } while (token === playbackToken && !destroyed);
      if (token === playbackToken) {
        if (!reducedMotion && !await pause(550, token)) return;
        if (destroyed || token !== playbackToken) return;
        playing = false;
        onPlaybackState(false);
      }
    },
    destroy() {
      destroyed = true;
      cancelMovement();
      clearTimeout(resizeTimer);
      map.remove();
    },
  };
}
