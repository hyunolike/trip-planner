import { expect, test } from '@playwright/test';
import { latestMailText, tokenFrom } from './support';

test('email signup, verification, login, account and logout', async ({ page }, info) => {
  const email = `e2e-${info.project.name}-${Date.now()}@example.com`;
  const password = 'trip-note-e2e-2027!';

  // 새 브라우저 컨텍스트라 XSRF-TOKEN 쿠키가 없다. 첫 POST가 통과해야 한다.
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/닉네임/).fill('미나');
  await page.getByLabel(/이메일/).fill(email);
  await page.getByLabel(/비밀번호/).fill(password);
  await page.getByRole('button', { name: '가입하기' }).click();
  await expect(page.getByRole('status')).toBeVisible();

  const token = tokenFrom(await latestMailText(email));
  await page.goto(`/verify-email?token=${token}`);
  await page.getByLabel('가입할 때 정한 비밀번호').fill(password);
  await page.getByRole('button', { name: '가입 마치기' }).click();
  await expect(page.getByRole('heading', { name: '가입이 끝났어요' })).toBeVisible();

  await page.getByRole('link', { name: '로그인하기' }).click();
  await page.waitForLoadState('networkidle');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: '미나님의 여행' })).toBeVisible();
  await expect(page.getByText('아직 만든 여행이 없어요')).toBeVisible();

  await page.getByRole('link', { name: '내 정보' }).click();
  await expect(page.getByRole('heading', { name: '미나님' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: '로그인하기' })).toBeVisible();

  // 로그아웃 뒤 같은 브라우저로 다시 로그인해도 CSRF 토큰이 맞아야 한다.
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(page.getByRole('heading', { name: '미나님의 여행' })).toBeVisible();
});

test('a wrong password is explained without saying whether the account exists', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('이메일').fill('nobody@example.com');
  await page.getByLabel('비밀번호').fill('not-the-password');
  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('the google button starts the OAuth redirect on the web origin', async ({ request }) => {
  const response = await request.get('/oauth2/authorization/google', { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  const location = response.headers().location ?? '';
  expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
  expect(decodeURIComponent(location)).toContain('redirect_uri=http://localhost:3000/login/oauth2/code/google');
});

test('the account page sends visitors to login', async ({ page }) => {
  await page.goto('/me');
  await expect(page).toHaveURL(/\/login$/);
});
