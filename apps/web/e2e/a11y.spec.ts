import { expect, test } from '@playwright/test';
import { expectAccessible, mapCenter } from './support';

for (const path of [
  '/',
  '/t/osaka-kyoto-family-2026',
  '/t/danang-hoian-family-2027#preparation',
  '/login',
  '/signup',
  '/t/does-not-exist',
]) {
  test(`no serious accessibility violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    // 해시로 지도 아래 구역을 연 쪽은 지도가 화면 밖이라 아직 그리지 않는다. 지도가 보이는 일정 쪽만 핀이 그려질 때까지 기다린다.
    if (path.startsWith('/t/') && !path.includes('#') && !path.includes('does-not-exist')) await mapCenter(page);
    else await expect(page.getByRole('heading').first()).toBeVisible();
    await expectAccessible(page);
  });
}
