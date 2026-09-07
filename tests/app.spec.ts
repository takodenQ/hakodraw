import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '練習スタート' })).toBeEnabled();
});
test('Three.js renders the square and session flow, axes, storage, completion work', async ({ page }) => {
  const errors: string[] = [];page.on('pageerror', e => errors.push(e.message));
  await expect(page.locator('canvas')).toHaveCount(1);
  const view = page.getByTestId('model-view');
  const before = await view.boundingBox();
  await page.getByLabel('問題数', { exact: true }).fill('2');
  await page.getByLabel('1問の秒数').fill('2');
  await page.locator('.view-settings summary').click();
  const grid = page.getByLabel('模写用グリッド');
  await expect(grid.locator('option')).toHaveText(['非表示', '2 × 2', '3 × 3', '4 × 4']);
  await page.getByRole('switch').uncheck();
  await expect(page.getByTestId('local-axes')).toBeVisible();
  await page.getByRole('button', { name: '練習スタート' }).click();
  expect(await view.boundingBox()).toEqual(before);
  await expect(page.getByTestId('local-axes')).toBeHidden();
  await page.getByRole('button', { name: '一時停止', exact: true }).click();
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(view).toHaveAttribute('data-phase', 'rotating');
  await expect(page.getByRole('button', { name: '次へ', exact: true })).toBeDisabled();
  await expect(view).toHaveAttribute('data-phase', 'paused');
  await expect(page.locator('.seconds')).toHaveText('残り2秒');
  await expect(view).toHaveAttribute('data-angle', Math.PI.toFixed(4));
  await page.getByRole('switch').check();
  await expect(page.getByTestId('local-axes')).toBeVisible();
  await grid.selectOption('2');
  await expect(page.locator('.seconds')).toHaveText('残り2秒');
  await page.getByRole('button', { name: '前へ', exact: true }).click();
  await expect(view).toHaveAttribute('data-angle', '0.0000');
  await page.getByRole('button', { name: '再開', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'セッション完了' })).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId('local-axes')).toBeHidden();
  await page.getByRole('button', { name: '同じ設定でもう一度' }).click();
  await expect(view).toHaveAttribute('data-phase', 'running');
  await expect(page.locator('.celebration')).toHaveCount(0);
  await page.getByRole('button', { name: '練習を終了', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('問題数', { exact: true })).toHaveValue('2');
  await page.locator('.view-settings summary').click();
  await expect(grid).toHaveValue('2');
  expect(errors).toEqual([]);
});
test('single theme button follows device until manually changed and persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'ライトモードに切り替える' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('header button')).toHaveCount(1);
});
test('invalid input, denied storage and reduced motion remain usable', async ({ page }) => {
  await page.getByLabel('問題数', { exact: true }).fill('0');await expect(page.getByRole('button', { name: '練習スタート' })).toBeDisabled();
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await page.reload();await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByLabel('問題数', { exact: true }).fill('1');await page.getByLabel('1問の秒数').fill('1');
  await page.getByRole('button', { name: '練習スタート' }).click();
  await expect(page.locator('.storage-warning')).toBeVisible();
  await expect(page.locator('.cheer')).toBeVisible();await expect(page.locator('.confetti')).toHaveCount(0);
});
for (const [width, height] of [[320, 640], [390, 844], [844, 390], [1280, 900]]) {
  test(`responsive ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const box = await page.getByTestId('model-view').boundingBox();expect(box).not.toBeNull();expect(Math.abs(box!.width - box!.height)).toBeLessThan(1);
    await page.getByRole('button', { name: '練習スタート' }).click();
    await page.getByRole('button', { name: '一時停止', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const end = await page.getByRole('button', { name: '練習を終了', exact: true }).boundingBox();expect(end!.y + end!.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `test-results/viewport-${width}.png`, fullPage: true });
  });
}
test('shape selection updates the renderer, persists, and stays fixed during practice', async ({ page }) => {
  const errors: string[] = [];page.on('pageerror', error => errors.push(error.message));
  for (const [shape, label] of [['circle', '円'], ['cube', '立方体'], ['cuboid', '直方体'], ['square', '正方形']]) {
    await page.getByRole('radio', { name: label, exact: true }).check();
    await expect(page.locator('canvas')).toHaveAttribute('aria-label', 'Three.jsで描画した' + label);
    await expect(page.getByTestId('model-view')).toHaveAttribute('data-shape', shape);
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  await page.getByRole('radio', { name: '立方体', exact: true }).check();
  await page.reload();
  await expect(page.getByRole('radio', { name: '立方体', exact: true })).toBeChecked();
  await page.getByRole('button', { name: '練習スタート' }).click();
  await expect(page.getByRole('group', { name: '練習する形' })).toHaveCount(0);
  await page.getByRole('button', { name: '一時停止', exact: true }).click();
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(page.getByTestId('model-view')).toHaveAttribute('data-phase', 'paused');
  await expect(page.getByTestId('model-view')).toHaveAttribute('data-shape', 'cube');
  await expect(page.getByTestId('model-view')).toHaveAttribute('data-angle', (Math.PI / 6).toFixed(4));
  expect(errors).toEqual([]);
});
test('figure, camera and face controls persist without changing a paused session', async ({ page }) => {
  await page.getByRole('radio', { name: '人体', exact: true }).check();
  await page.getByRole('slider', { name: '視点の高さ', exact: true }).focus();await page.keyboard.press('Home');
  await expect(page.getByTestId('model-view')).toHaveAttribute('data-elevation', '-60');
  await page.getByRole('button', { name: '練習スタート' }).click();
  await page.getByRole('button', { name: '一時停止', exact: true }).click();
  await expect(page.getByRole('slider', { name: '視点の高さ', exact: true })).toHaveCount(0);
  await page.locator('.view-settings summary').click();
  const view = page.getByTestId('model-view');
  const before = await page.locator('.seconds').textContent();
  const filled = await page.locator('canvas').screenshot();
  await page.getByRole('slider', { name: '面の不透明度', exact: true }).focus();await page.keyboard.press('Home');
  await expect(view).toHaveAttribute('data-opacity', '0');
  const wire = await page.locator('canvas').screenshot();expect(wire.equals(filled)).toBe(false);
  await page.getByRole('slider', { name: '面の明度', exact: true }).focus();await page.keyboard.press('End');
  await expect(view).toHaveAttribute('data-brightness', '100');
  await expect(view).toHaveAttribute('data-phase', 'paused');await expect(page.locator('.seconds')).toHaveText(before!);
  await page.reload();await expect(page.getByRole('radio', { name: '人体', exact: true })).toBeChecked();
  await expect(view).toHaveAttribute('data-opacity', '0');await expect(view).toHaveAttribute('data-elevation', '-60');
});
