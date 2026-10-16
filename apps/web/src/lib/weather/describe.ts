import type { IconName } from '@/components/ui/icons.generated';
import type { WeatherResponse } from '@/lib/trip/content';

const RAINY = new Set(['이슬비', '비', '소나기', '뇌우']);

export function describeWeather(code?: number | null): { label: string; icon: IconName } {
  if (code === 0 || code === 1) return { label: '맑음', icon: 'weather-sun' };
  if (code === 2) return { label: '구름 조금', icon: 'weather-partly' };
  if (code === 3) return { label: '흐림', icon: 'weather-cloud' };
  if (code === 45 || code === 48) return { label: '안개', icon: 'weather-cloud' };
  if (code !== undefined && code !== null && [51, 53, 55, 56, 57].includes(code))
    return { label: '이슬비', icon: 'weather-rain' };
  if (code !== undefined && code !== null && [61, 63, 65, 66, 67].includes(code))
    return { label: '비', icon: 'weather-rain' };
  if (code !== undefined && code !== null && [80, 81, 82].includes(code))
    return { label: '소나기', icon: 'weather-rain' };
  if (code !== undefined && code !== null && [71, 73, 75, 77, 85, 86].includes(code))
    return { label: '눈', icon: 'weather-snow' };
  if (code !== undefined && code !== null && [95, 96, 97, 99].includes(code))
    return { label: '뇌우', icon: 'weather-rain' };
  return { label: '날씨 정보 없음', icon: 'weather-cloud' };
}

export function weatherTips(w: WeatherResponse, label: string): string[] {
  const tips: string[] = [];
  if ((typeof w.rainChance === 'number' && w.rainChance >= 50) || RAINY.has(label)) {
    tips.push('우산이나 우비를 챙겨요. 실내에서 쉴 곳도 생각해 둬요.');
  }
  if (typeof w.low === 'number' && w.low < 18) tips.push('아침저녁용 겉옷을 챙겨요.');
  return tips;
}
