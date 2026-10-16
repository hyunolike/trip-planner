import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

/** Mailpit에서 받는 사람의 마지막 메일 본문을 기다려 가져온다. */
export async function latestMailText(to: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages } = (await search.json()) as { messages: { ID: string }[] };
    if (messages.length) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${messages[0]!.ID}`);
      return ((await message.json()) as { Text: string }).Text;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`no mail for ${to}`);
}

export const tokenFrom = (text: string) => {
  const match = text.match(/token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error('no token in mail');
  return match[1]!;
};

/** 심각도 serious 이상인 접근성 위반이 없어야 한다. 지도 캔버스는 MapLibre가 그리므로 뺀다. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).exclude('.maplibregl-canvas').analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

/** 지도가 기록한 중심(경도, 위도)을 읽는다. */
export async function mapCenter(page: Page): Promise<[number, number]> {
  const frame = page.locator('[data-center]');
  await expect(frame).toHaveAttribute('data-center', /,/, { timeout: 20_000 });
  const [lng, lat] = (await frame.getAttribute('data-center'))!.split(',').map(Number);
  return [lng!, lat!];
}

/** React가 폼에 붙은 뒤(하이드레이션 끝)에야 입력하고 보낸다. 그 전 제출은 일반 POST가 된다. */
export async function formReady(page: Page) {
  await expect(page.locator('form[data-hydrated="true"]:visible')).toBeVisible();
}
