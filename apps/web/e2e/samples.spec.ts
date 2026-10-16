import { expect, test } from '@playwright/test';
import { mapCenter } from './support';

test('a visitor finds the public sample from home and reads it', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('link', { name: /다낭·호이안 가족여행/ });
  await expect(card).toBeVisible();
  await expect(page.getByRole('link', { name: /오사카·교토/ })).toHaveCount(0);

  await card.click();
  await expect(page).toHaveURL(/\/t\/danang-hoian-family-2027/);
  await expect(page.getByRole('heading', { level: 1, name: '다낭·호이안 가족여행' })).toBeVisible();
  const days = page.getByRole('navigation', { name: '날짜 선택' }).getByRole('button');
  await expect(days).toHaveCount(5);

  // 처음 지도가 뜬 다음 날짜를 바꿔야 initialViewState만 적용하던 회귀를 잡는다.
  await mapCenter(page);

  await days.nth(2).click();
  await expect(page).toHaveURL(/\?day=3/);
  await expect(days.nth(2)).toHaveAttribute('aria-current', 'date');

  const [lng, lat] = await mapCenter(page);
  expect(lat).toBeGreaterThan(10);
  expect(lat).toBeLessThan(20);
  expect(lng).toBeGreaterThan(104);
  expect(lng).toBeLessThan(112);
});

test('the Osaka Kyoto original opens by link with its four days', async ({ page }) => {
  await page.goto('/t/osaka-kyoto-family-2026?day=2');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('오사카');
  await expect(page.getByRole('navigation', { name: '날짜 선택' }).getByRole('button').nth(1)).toHaveAttribute(
    'aria-current',
    'date',
  );

  const [lng, lat] = await mapCenter(page);
  expect(lat).toBeGreaterThan(33);
  expect(lat).toBeLessThan(37);
  expect(lng).toBeGreaterThan(134);
  expect(lng).toBeLessThan(137);

  await page.getByRole('button', { name: '상세 일정' }).click();
  await expect(page.locator('details[data-stop-detail][open]').first()).toBeVisible();

  await page.getByRole('navigation', { name: '여행 노트 섹션' }).getByRole('link', { name: '맛집' }).click();
  await expect(page).toHaveURL(/#food$/);
  await expect(page.getByRole('heading', { level: 2, name: '맛집 후보' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(10);
});

test('weather does not break a sample far in the future', async ({ page }) => {
  await page.goto('/t/danang-hoian-family-2027');
  await expect(page.getByText('아직 이 날짜의 예보가 없어요. 여행 16일 전부터 볼 수 있어요.')).toBeVisible();
});

test('an unknown or private trip shows the not found page', async ({ page }) => {
  await page.goto('/t/does-not-exist');
  await expect(page.getByRole('heading', { name: '일정을 찾을 수 없어요' })).toBeVisible();
  await page.goto('/t/..%2F..%2Fapi%2Fv1%2Fme');
  await expect(page.getByRole('heading', { name: '일정을 찾을 수 없어요' })).toBeVisible();
});

test('completion checks survive a reload on this device', async ({ page }) => {
  await page.goto('/t/danang-hoian-family-2027');
  const first = page.getByRole('button', { name: /^일정 완료 표시:/ }).first();
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByRole('button', { name: /^일정 완료 표시:/ }).first()).toHaveAttribute('aria-pressed', 'true');
});
