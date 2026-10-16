// 기존 Vite 앱(5173)과 새 앱(3000)의 같은 날을 같은 크기로 찍는다. 픽셀 일치가 아니라 정보와 순서를 사람이 비교하는 자료다.
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';

const out = new URL('../test-results/compare/', import.meta.url);
mkdirSync(out, { recursive: true });

const sizes = { mobile: { width: 375, height: 812 }, desktop: { width: 1280, height: 800 } };
const browser = await chromium.launch();
for (const [name, viewport] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport });
  for (let day = 1; day <= 4; day += 1) {
    await page.goto(`http://localhost:5173/`);
    await page.locator(`[data-day="${day - 1}"]`).click();
    await page.screenshot({ path: new URL(`legacy-${name}-day${day}.png`, out).pathname, fullPage: true });
    await page.goto(`http://localhost:3000/t/osaka-kyoto-family-2026?day=${day}`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: new URL(`web-${name}-day${day}.png`, out).pathname, fullPage: true });
  }
  await page.close();
}
await browser.close();
console.log(`screens saved to ${out.pathname}`);
