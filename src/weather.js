export const weatherLocations = {
  osaka: { name: '오사카', latitude: 34.6937, longitude: 135.5023 },
  kyoto: { name: '교토', latitude: 35.0116, longitude: 135.7681 },
  amanohashidate: { name: '아마노하시다테', latitude: 35.5573, longitude: 135.1828 },
  ine: { name: '이네 후나야', latitude: 35.6765, longitude: 135.2878 },
};
const entries = new Map();
let pending = null;
let attemptedAt = 0;
export const WEATHER_REFRESH_MS = 30 * 60 * 1000;
const escape = (value) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const number = (value, unit = '') => Number.isFinite(value) ? `${Math.round(value)}${unit}` : '제공 없음';

export function describeWeather(code) {
  if (code === 0 || code === 1) return { label: '맑음', icon: 'ti-sun' };
  if (code === 2) return { label: '구름 조금', icon: 'ti-cloud-sun' };
  if (code === 3) return { label: '흐림', icon: 'ti-cloud' };
  if ([45, 48].includes(code)) return { label: '안개', icon: 'ti-mist' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: '이슬비', icon: 'ti-cloud-rain' };
  if ([61, 63, 65, 66, 67].includes(code)) return { label: '비', icon: 'ti-cloud-rain' };
  if ([80, 81, 82].includes(code)) return { label: '소나기', icon: 'ti-cloud-rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: '눈', icon: 'ti-snowflake' };
  if ([95, 96, 97, 99].includes(code)) return { label: '뇌우', icon: 'ti-cloud-storm' };
  return { label: '날씨 정보 없음', icon: 'ti-cloud' };
}

export function getForecastUrl(key) {
  const location = weatherLocations[key];
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
    timezone: 'Asia/Tokyo',
    forecast_days: '16',
    wind_speed_unit: 'ms',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export function parseForecast(payload) {
  const daily = payload?.daily;
  if (payload?.error || !Array.isArray(daily?.time) || !Array.isArray(daily?.temperature_2m_max) || !Array.isArray(daily?.temperature_2m_min)) throw new Error('Invalid forecast');
  return new Map(daily.time.map((date, index) => [date, {
    code: daily.weather_code?.[index],
    high: daily.temperature_2m_max[index],
    low: daily.temperature_2m_min[index],
    rain: daily.precipitation_probability_max?.[index],
    wind: daily.wind_speed_10m_max?.[index],
  }]));
}

export function getWeatherLocationsForDay(day) {
  return day.number === 1 ? ['osaka'] : day.number === 3 ? ['amanohashidate', 'ine'] : ['kyoto'];
}

function renderCard(key, date) {
  const location = weatherLocations[key];
  const entry = entries.get(key);
  const forecast = entry?.days?.get(date);
  const description = describeWeather(forecast?.code);
  const source = '<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo ↗</a>';
  const header = `<div class="weather-card-head"><span><i class="ti ${description.icon}" aria-hidden="true"></i><b>${location.name}</b></span><small>${escape(date.slice(5).replace('-', '.'))} 예상 날씨</small></div>`;
  if (!forecast) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const text = entry?.status === 'error' ? '날씨를 가져오지 못했어요. 잠시 후 다시 확인해 주세요.' : entry?.status === 'ready' ? (date < today ? '지난 여행 날짜의 예보는 제공하지 않아요.' : '아직 이 날짜의 예보가 없어요. 최대 16일 범위에서 제공돼요.') : '최신 여행일 예보를 가져오는 중이에요…';
    return `<article class="weather-card">${header}<p class="weather-empty">${text}</p><div class="weather-source">${source}</div></article>`;
  }
  const checked = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(entry.checkedAt));
  const tips = [];
  if ((Number.isFinite(forecast.rain) && forecast.rain >= 50) || ['비', '소나기', '이슬비', '뇌우'].includes(description.label)) tips.push('우산·우비를 챙기고 실내 휴식도 고려해요.');
  if (Number.isFinite(forecast.low) && forecast.low < 18) tips.push('아침·저녁용 겉옷을 챙겨요.');
  if (['amanohashidate', 'ine'].includes(key)) tips.push('해안 바람과 유람선 운항은 당일 현장 안내를 확인해요.');
  return `<article class="weather-card">${header}<div class="weather-summary"><strong>${description.label}</strong><div><b>${number(forecast.high, '°')}</b><span> / ${number(forecast.low, '°')}</span><small>최고 / 최저</small></div></div><dl class="weather-metrics"><div><dt>최대 강수확률</dt><dd>${number(forecast.rain, '%')}</dd></div><div><dt>최대 풍속</dt><dd>${Number.isFinite(forecast.wind) ? `${forecast.wind.toFixed(1)} m/s` : '제공 없음'}</dd></div></dl>${tips.length ? `<p class="weather-tip"><i class="ti ti-bulb" aria-hidden="true"></i>${tips.join(' ')}</p>` : ''}<div class="weather-source">${source}<span>${escape(checked)} 조회${entry.status === 'error' ? ' · 갱신 실패, 이전 예보' : entry.status === 'loading' ? ' · 갱신 중' : ''}</span></div></article>`;
}

export function renderDayWeather(day) {
  const keys = getWeatherLocationsForDay(day);
  return `<section class="day-weather" data-weather-date="${escape(day.date)}" data-weather-day="${day.number}" aria-label="${escape(day.dateLabel)} 여행 날씨"><div class="weather-heading"><h3><i class="ti ti-cloud-sun" aria-hidden="true"></i> 여행일 날씨</h3><button type="button" data-weather-refresh ${pending ? 'disabled aria-busy="true"' : 'aria-busy="false"'}><i class="ti ti-refresh" aria-hidden="true"></i> 새로 조회</button></div><div class="weather-grid">${keys.map(key => renderCard(key, day.date)).join('')}</div><p class="weather-note">${day.number === 3 ? '교토 시내와 떨어진 투어 지역을 각각 조회해요. ' : ''}일본 현지 날짜 기준 예보 · 강수확률은 하루 최대값 · 멀리 있는 날짜의 예보는 달라질 수 있어요.</p></section>`;
}

export function updateWeatherCards(root, trip) {
  root.querySelectorAll('[data-weather-date]').forEach(section => {
    const day = trip.days.find(day => day.date === section.dataset.weatherDate);
    if (!day) return;
    section.querySelector('.weather-grid').innerHTML = getWeatherLocationsForDay(day).map(key => renderCard(key, day.date)).join('');
    const button = section.querySelector('[data-weather-refresh]');
    button.disabled = Boolean(pending);
    button.setAttribute('aria-busy', String(Boolean(pending)));
  });
}

export function refreshWeather(onUpdate = () => {}, { force = false, fetcher = globalThis.fetch } = {}) {
  if (pending) return pending;
  if (!force && attemptedAt && Date.now() - attemptedAt < WEATHER_REFRESH_MS) return Promise.resolve();
  attemptedAt = Date.now();
  pending = Promise.allSettled(Object.keys(weatherLocations).map(async key => {
    const previous = entries.get(key);
    entries.set(key, { ...previous, status: 'loading' });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetcher(getForecastUrl(key), { signal: controller.signal });
      if (!response.ok) throw new Error('Weather request failed');
      const days = parseForecast(await response.json());
      entries.set(key, { days, checkedAt: Date.now(), status: 'ready' });
    } catch {
      entries.set(key, { ...previous, status: 'error' });
    } finally {
      clearTimeout(timeout);
      onUpdate();
    }
  })).finally(() => { pending = null; onUpdate(); });
  onUpdate();
  return pending;
}
