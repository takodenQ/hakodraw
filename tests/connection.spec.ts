import { test, expect } from '@playwright/test';
const LABELS = ['頭・首・胸郭', '胸郭・肩・上腕', '上腕・肘・前腕・手', '胸郭・腹部・腰', '腰・太もも', '太もも・膝・ふくらはぎ・足'];

test('connection selection, guides, paused navigation and saved preferences', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '接続練習', exact: true }).click();
  for (const label of LABELS) {
    await page.getByRole('radio', { name: label, exact: true }).check();
    await expect(page.getByRole('img', { name: 'Three.jsで描画した' + label })).toBeVisible();
  }
  await page.getByLabel('補助表示', { exact: true }).selectOption('learning');
  await page.getByLabel('問題数', { exact: true }).fill('2');
  await page.getByRole('button', { name: '練習スタート', exact: true }).click();
  await page.getByRole('button', { name: '一時停止', exact: true }).click();
  await page.getByLabel('補助表示', { exact: true }).selectOption('test');
  await expect(page.getByTestId('model-view')).toHaveAttribute('data-phase', 'paused');
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(page.getByTestId('model-view')).toHaveAttribute('data-phase', 'paused');
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(page.getByRole('heading', { name: '練習完了', exact: true })).toBeVisible();
  await page.reload();await page.getByRole('button', { name: '接続練習', exact: true }).click();
  await expect(page.getByRole('radio', { name: '太もも・膝・ふくらはぎ・足', exact: true })).toBeChecked();
  await expect(page.getByLabel('補助表示', { exact: true })).toHaveValue('test');
});

test('each question shows a new random pose and view, and going back restores it', async ({ page }) => {
  const errors: string[] = [];page.on('pageerror', e => errors.push(e.message));
  await page.goto('/#connection');
  const view = page.getByTestId('model-view');
  await page.getByRole('radio', { name: '上腕・肘・前腕・手', exact: true }).check();
  // 向きは問題ごとにランダムなので、回転軸の選択と初期回転は出さない
  await expect(page.getByRole('group', { name: '回転軸', exact: true })).toHaveCount(0);
  await expect(page.getByText('関節の曲げ・ひねり')).toBeVisible();
  await page.locator('summary').filter({ hasText: 'オブジェクトの調整' }).click();
  await expect(page.getByRole('button', { name: '回転', exact: true })).toBeDisabled();
  await expect(view).toHaveAttribute('data-pose', 'rest');
  await expect(page.getByRole('button', { name: '練習スタート' })).toBeEnabled();
  await page.getByLabel('問題数', { exact: true }).fill('3');
  await page.getByRole('button', { name: '練習スタート' }).click();
  await expect(view).toHaveAttribute('data-pose', /^\d+:0$/);
  const first = await view.getAttribute('data-pose');
  const seed = first!.split(':')[0];
  await expect(page.locator('.angle')).toContainText('ランダムな向き・ポーズ');
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(view).toHaveAttribute('data-pose', `${seed}:1`);
  await page.getByRole('button', { name: '前へ', exact: true }).click();
  await expect(view).toHaveAttribute('data-pose', `${seed}:0`);
  await page.getByRole('button', { name: '練習を終了', exact: true }).click();
  await expect(view).toHaveAttribute('data-pose', 'rest');
  // もう一度始めると、別のポーズの組み合わせになる
  await page.getByRole('button', { name: '練習スタート' }).click();
  await expect(view).toHaveAttribute('data-pose', /^\d+:0$/);
  expect(await view.getAttribute('data-pose')).not.toBe(first);
  expect(errors).toEqual([]);
});

test('connection layout fits supported viewports', async ({ page }) => {
  await page.goto('/');await page.getByRole('button', { name: '接続練習', exact: true }).click();
  for (const [width, height] of [[320,640],[390,844],[844,390],[1280,900]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByLabel('補助表示', { exact: true }).selectOption('learning');
  await page.screenshot({ path: 'test-results/connection-preview.png', fullPage: true });
});
