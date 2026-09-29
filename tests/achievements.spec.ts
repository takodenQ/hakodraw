import { test, expect, type Page } from '@playwright/test';

async function finishQuickSession(page: Page) {
  await page.goto('/#rotation');
  await expect(page.getByRole('button', { name: '練習スタート' })).toBeEnabled();
  await page.getByLabel('問題数', { exact: true }).fill('1');
  await page.getByLabel('1問の秒数').fill('1');
  await page.getByRole('button', { name: '練習スタート' }).click();
  await expect(page.getByRole('heading', { name: '練習完了', exact: true })).toBeVisible({ timeout: 8000 });
}
/** 指定した日数ぶん、毎日1回・10問の記録を持つバックアップ。 */
const backupOf = (sessions: number) => ({
  goal: 3, onboarded: true,
  logs: Array.from({ length: sessions }, (_, i) => ({
    id: `b${i}`, at: new Date(2026, 0, 1 + Math.floor(i / 2), 10 + (i % 2)).toISOString(), mode: 'rotation', label: '正方形の回転', count: 10, seconds: 30, done: 10, completed: true,
  })),
});
async function restore(page: Page, data: unknown) {
  await page.goto('/');
  await page.getByText('記録の保存・引き継ぎ').click();
  await page.getByLabel('バックアップファイル').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.getByText('練習記録を読み込みました。')).toBeVisible();
}

test('finishing a first session announces the medal and it shows up on the achievements screen', async ({ page }) => {
  await finishQuickSession(page);
  const announcement = page.getByRole('status', { name: '新しい実績' });
  await expect(announcement).toContainText('実績を獲得しました！');
  await expect(announcement).toContainText('はじめの一歩');
  await page.getByRole('button', { name: 'ホームへ' }).click();
  await expect(page.getByRole('heading', { name: /^実績 [1-9]\d* \/ \d+/ })).toBeVisible();
  await expect(page.getByLabel('最近獲得したメダル')).toContainText('はじめの一歩');
  await expect(page.locator('.new-badge.inline')).toHaveCount(0);
  await page.getByRole('button', { name: '実績をすべて見る' }).click();
  await expect(page).toHaveURL(/#achievements$/);
  await expect(page.getByRole('heading', { name: '実績', exact: true })).toBeVisible();
  const tile = page.getByRole('button', { name: /^はじめの一歩、ブロンズ、獲得済み/ });
  await expect(tile).toBeVisible();
  await expect(page.getByRole('button', { name: /^100回練習、ゴールド、未獲得/ })).toBeVisible();
  await tile.click();
  const detail = page.getByRole('region', { name: '実績の詳細' });
  await expect(detail).toContainText('初めて練習した');
  await expect(detail).toContainText('獲得しました');
  await page.getByRole('button', { name: '100回練習、ゴールド、未獲得' }).click();
  await expect(detail).toContainText('練習を合計100回した');
  await expect(detail.getByRole('progressbar', { name: '達成までの進み具合' })).toHaveAttribute('aria-valuenow', '1');
  await detail.getByRole('button', { name: '詳細をとじる' }).click();
  await expect(detail).toHaveCount(0);
});

test('the announcement can open the achievements screen with NEW badges', async ({ page }) => {
  await finishQuickSession(page);
  await page.getByRole('button', { name: '実績を見る' }).click();
  await expect(page).toHaveURL(/#achievements$/);
  await expect(page.getByRole('button', { name: /^はじめの一歩、ブロンズ、獲得済み、新しい実績/ })).toBeVisible();
  await page.getByRole('button', { name: 'ホームへ' }).click();
  await expect(page.locator('.new-badge.inline')).toHaveCount(0);
  await page.getByRole('button', { name: '実績をすべて見る' }).click();
  await expect(page.getByRole('button', { name: /^はじめの一歩、ブロンズ、獲得済み$/ })).toBeVisible();
});

test('restoring a large history unlocks the big milestones, and the medals persist', async ({ page }) => {
  await restore(page, backupOf(100));
  await expect(page.locator('.new-badge.inline')).toBeVisible();
  await page.getByRole('button', { name: '実績をすべて見る' }).click();
  await expect(page.getByRole('button', { name: /^100回練習、ゴールド、獲得済み、新しい実績/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^1000こ描いた、プラチナ、獲得済み/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^300回練習、プラチナ、未獲得/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^50日練習/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^30日練習、ゴールド、獲得済み/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /^100回練習、ゴールド、獲得済み$/ })).toBeVisible();
  await expect(page.locator('.new-badge')).toHaveCount(0);
});

test('clearing records starts the medals over', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await restore(page, backupOf(3));
  await page.getByRole('button', { name: '消去' }).click();
  await expect(page.getByLabel('最近獲得したメダル')).toHaveCount(0);
  await page.getByRole('button', { name: '実績をすべて見る' }).click();
  await expect(page.getByRole('button', { name: /^はじめの一歩、ブロンズ、未獲得/ })).toBeVisible();
});

test('achievements screen fits supported viewports without horizontal scroll', async ({ page }) => {
  await restore(page, backupOf(60));
  await page.getByRole('button', { name: '実績をすべて見る' }).click();
  for (const [width, height] of [[320, 640], [390, 844], [844, 390], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /^1000こ描いた/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/achievements-390.png', fullPage: true });
});
