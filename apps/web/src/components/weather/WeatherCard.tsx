'use client';

import { useQuery } from '@tanstack/react-query';
import { Button, Icon } from '@/components/ui';
import { api } from '@/lib/api/client';
import type { DayView, WeatherResponse } from '@/lib/trip/content';
import { todayIn } from '@/lib/trip/day';
import { formatDayDate } from '@/lib/trip/format';
import { describeWeather, weatherTips } from '@/lib/weather/describe';
import { weatherPointForDay } from '@/lib/weather/point';
import styles from './WeatherCard.module.css';

const FAILED = '날씨를 가져오지 못했어요. 잠시 후 다시 확인해 주세요.';
const round = (v?: number | null) => (typeof v === 'number' ? `${Math.round(v)}°` : '–');

function checkedLabel(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return `${parts.month}.${parts.day} ${parts.hour}:${parts.minute} 조회`;
}

export function WeatherCard({ day, timezone }: { day: DayView; timezone: string }) {
  const point = weatherPointForDay(day);
  const query = useQuery({
    queryKey: ['weather', point?.coordinates[0], point?.coordinates[1], day.date, timezone],
    enabled: Boolean(point),
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<WeatherResponse> => {
      const [lat, lng] = point!.coordinates;
      const { data, error } = await api.GET('/api/v1/weather', {
        params: { query: { lat, lng, date: day.date, timezone } },
      });
      if (!data) throw error ?? new Error('weather failed');
      return data;
    },
  });
  if (!point) return null;

  const weather = query.data;
  const description = describeWeather(weather?.condition);
  const failed = query.isError || weather?.status === 'unavailable';

  return (
    <section className={styles.card} aria-labelledby={`weather-${day.number}`}>
      <div className={styles.head}>
        <h3 id={`weather-${day.number}`} className={styles.title}>
          <Icon name={weather?.status === 'ready' ? description.icon : 'weather-partly'} />
          {point.label} 여행일 날씨
        </h3>
        <span className={styles.date}>{formatDayDate(day.date)} 예상</span>
      </div>

      {query.isPending ? <p className={styles.empty}>예보를 가져오는 중이에요.</p> : null}

      {failed ? (
        <>
          <p className={styles.empty}>{FAILED}</p>
          <Button size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            새로 조회
          </Button>
        </>
      ) : null}

      {weather?.status === 'out_of_range' ? (
        <p className={styles.empty}>
          {day.date < todayIn(timezone)
            ? '지난 여행 날짜의 예보는 보여 드리지 않아요.'
            : '아직 이 날짜의 예보가 없어요. 여행 16일 전부터 볼 수 있어요.'}
        </p>
      ) : null}

      {weather?.status === 'ready' ? (
        <>
          <div className={styles.summary}>
            <strong className={styles.condition}>{description.label}</strong>
            <span>
              <span className={styles.temps}>
                {round(weather.high)} / {round(weather.low)}
              </span>{' '}
              <span className={styles.date}>최고 / 최저</span>
            </span>
          </div>
          <dl className={styles.metrics}>
            <div>
              <dt>최대 강수확률</dt>
              <dd>{typeof weather.rainChance === 'number' ? `${weather.rainChance}%` : '제공 없음'}</dd>
            </div>
            <div>
              <dt>최대 풍속</dt>
              <dd>{typeof weather.windSpeed === 'number' ? `${weather.windSpeed.toFixed(1)} m/s` : '제공 없음'}</dd>
            </div>
          </dl>
          {weatherTips(weather, description.label).map((tip) => (
            <p key={tip} className={styles.tip}>
              {tip}
            </p>
          ))}
          <div className={styles.source}>
            <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
              Open-Meteo<span className="visually-hidden"> (새 창)</span>
            </a>
            {weather.checkedAt ? <span>{checkedLabel(weather.checkedAt, timezone)}</span> : null}
          </div>
        </>
      ) : null}

      <p className={styles.note}>
        현지 날짜 기준 예보예요. 강수확률은 하루 중 가장 높은 값이고, 먼 날짜의 예보는 달라질 수 있어요.
      </p>
    </section>
  );
}
