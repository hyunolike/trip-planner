import { test } from '@playwright/test';
import { expectAccessible } from './support';

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
    await page.waitForLoadState('networkidle');
    await expectAccessible(page);
  });
}
