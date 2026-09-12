import { test, expect } from '@playwright/test';
test('connection selection, guides, paused navigation and saved preferences', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '接続練習', exact: true }).click();
  for (const label of ['頭・首・胸郭', '胸郭・両肩', '右肩・上腕', '胸郭・骨盤', '骨盤・両大腿', '右大腿・下腿']) {
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
  await expect(page.getByRole('radio', { name: '右大腿・下腿', exact: true })).toBeChecked();
  await expect(page.getByLabel('補助表示', { exact: true })).toHaveValue('test');
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
