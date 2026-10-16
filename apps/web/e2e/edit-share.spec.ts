import { expect, type Page, test } from '@playwright/test';
import { expectAccessible, formReady, latestMailText, mapCenter, tokenFrom } from './support';

async function register(page: Page, suffix: string) {
  const email = `mvp-${suffix}-${Date.now()}@example.com`;
  const password = 'trip-note-mvp-2027!';
  await page.goto('/signup');
  await formReady(page);
  await page.getByLabel(/닉네임/).fill('민아');
  await page.getByLabel(/이메일/).fill(email);
  await page.getByLabel(/비밀번호/).fill(password);
  await page.getByRole('button', { name: '가입하기' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  const token = tokenFrom(await latestMailText(email));
  await page.goto(`/verify-email?token=${token}`);
  await formReady(page);
  await page.getByLabel('가입할 때 정한 비밀번호').fill(password);
  await page.getByRole('button', { name: '가입 마치기' }).click();
  await expect(page.getByRole('heading', { name: '가입이 끝났어요' })).toBeVisible();
  await page.goto('/login');
  await formReady(page);
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인하기' }).click();
  await expect(page.getByRole('heading', { name: '민아님의 여행' })).toBeVisible();
}

async function saved(page: Page) {
  await expect(page.getByText('편집 중 · 저장됨', { exact: true })).toBeVisible();
}
async function addStop(page: Page, title: string, coordinates = false) {
  await page.getByRole('button', { name: '＋ 일정 추가' }).click();
  const dialog = page.getByRole('dialog', { name: '일정 추가' });
  await dialog.getByLabel('제목', { exact: true }).fill(title);
  if (coordinates) {
    await dialog.getByLabel('위도').fill('34.68');
    await dialog.getByLabel('경도').fill('135.52');
  }
  await dialog.getByRole('button', { name: '일정 추가', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await saved(page);
}

test('create, edit three stops, queue offline, share anonymously, revoke and clone', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(120_000);
  await register(page, info.project.name);
  await page.getByRole('link', { name: '여행 만들기', exact: true }).click();
  await formReady(page);
  await page.getByLabel('도시 이름').fill('오사카');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByLabel('시작 날짜').fill('2027-04-01');
  await page.getByLabel('종료 날짜').fill('2027-04-03');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByLabel('동행 이름 1').fill('엄마');
  await page.getByRole('button', { name: '여행 만들기', exact: true }).click();
  await expect(page).toHaveURL(/\/t\/[^/]+\/edit\?day=1/);
  const slug = new URL(page.url()).pathname.split('/')[2]!;
  await expect(page.locator('main[data-hydrated="true"]:visible')).toBeVisible();
  await addStop(page, '오사카성', true);
  await addStop(page, '점심 식사');
  await addStop(page, '호텔 체크인');
  await page.getByRole('button', { name: '위로 이동: 호텔 체크인' }).click();
  await saved(page);
  await expect(page.getByRole('list', { name: '1일차 일정' }).getByRole('heading')).toHaveText([
    '오사카성',
    '호텔 체크인',
    '점심 식사',
  ]);

  await page.getByRole('button', { name: '수정: 오사카성' }).click();
  const edit = page.getByRole('dialog', { name: '일정 수정' });
  await edit.getByLabel('메모', { exact: true }).fill('성 입장권 확인');
  await expect(page.getByText('입력한 변경사항을 저장했어요.')).toBeVisible();
  await edit.getByRole('button', { name: '저장하고 닫기' }).click();
  await saved(page);
  await page.context().setOffline(true);
  await addStopOffline(page, '오프라인 메모');
  await page.context().setOffline(false);
  await saved(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: '오프라인 메모' })).toBeVisible();
  await page.getByRole('button', { name: '삭제: 오프라인 메모' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '일정 삭제', exact: true }).click();
  await saved(page);
  await expect(page.getByRole('heading', { name: '오프라인 메모' })).toHaveCount(0);
  await mapCenter(page);
  await page.screenshot({ path: info.outputPath('editor.png'), fullPage: true });
  await expectAccessible(page);
  await page.getByRole('link', { name: '편집 마치기' }).click();
  await page.getByRole('button', { name: '공유하기' }).click();
  const share = page.getByRole('dialog');
  await share.getByLabel('개인정보를 확인했어요').check();
  await share.getByRole('button', { name: '보기 링크 만들기' }).click();
  const url = await share.getByLabel('보기 링크').inputValue();
  expect(url).toContain('/s/');
  const guest = await browser.newContext({ viewport: page.viewportSize()! });
  const visitor = await guest.newPage();
  await visitor.goto(url);
  await expect(visitor.getByRole('heading', { name: '오사카 여행', exact: true })).toBeVisible();
  await expect(visitor.getByRole('link', { name: '일정 편집하기' })).toHaveCount(0);
  await mapCenter(visitor);
  await visitor.screenshot({ path: info.outputPath('shared-trip.png'), fullPage: true });
  await visitor.goto(`/t/${slug}`);
  await expect(visitor.getByRole('heading', { name: '일정을 찾을 수 없어요' })).toBeVisible();
  await share.getByRole('button', { name: '링크 1 회수하기' }).click();
  await expect(share.getByText('활성 공유 링크 0개')).toBeVisible();
  await visitor.goto(url);
  await expect(visitor.getByRole('heading', { name: '일정을 찾을 수 없어요' })).toBeVisible();
  await guest.close();
  await share.getByRole('button', { name: '편집 창 닫기' }).click();
  await page.goto('/t/danang-hoian-family-2027');
  await page.getByRole('button', { name: '내 여행으로 복제하기' }).click();
  await expect(page).toHaveURL(/\/t\/[^/]+\/edit$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('다낭');
  await expect(page.getByRole('button', { name: '＋ 일정 추가' })).toBeVisible();
});

async function addStopOffline(page: Page, title: string) {
  await page.getByRole('button', { name: '＋ 일정 추가' }).click();
  const dialog = page.getByRole('dialog', { name: '일정 추가' });
  await dialog.getByLabel('제목', { exact: true }).fill(title);
  await dialog.getByRole('button', { name: '일정 추가', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('편집 중 · 연결 대기 · 이 기기에 저장됨', { exact: true })).toBeVisible();
}
