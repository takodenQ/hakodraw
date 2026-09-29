import { test, expect, type Page } from '@playwright/test';

/** コースの1ステップ目をおすすめから開き、1問×1秒に縮めて最後まで練習する。 */
async function finishRecommendedStep(page: Page) {
  await page.getByRole('button', { name: 'はじめる', exact: true }).click();
  await expect(page.getByRole('button', { name: '練習スタート' })).toBeEnabled();
  await page.getByLabel('問題数', { exact: true }).fill('1');
  await page.getByLabel('1問の秒数').fill('1');
  await page.getByRole('button', { name: '練習スタート' }).click();
  await expect(page.getByRole('heading', { name: '練習完了', exact: true })).toBeVisible({ timeout: 8000 });
}

test('home guides a first-time user and remembers that onboarding was read', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'はじめての方へ' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '正方形を回す' })).toBeVisible();
  await expect(page.locator('.week-count b')).toHaveText('0');
  await page.getByRole('button', { name: 'わかった' }).click();
  await expect(page.getByRole('heading', { name: 'はじめての方へ' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'はじめての方へ' })).toHaveCount(0);
});

test('recommended step opens prefilled practice, is recorded, and advances the course', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'はじめる', exact: true }).click();
  await expect(page).toHaveURL(/#rotation$/);
  await expect(page.getByRole('region', { name: 'コースの案内' })).toContainText('正方形を回す');
  await expect(page.getByLabel('問題数', { exact: true })).toHaveValue('5');
  await expect(page.getByLabel('1問の秒数')).toHaveValue('45');
  await expect(page.getByRole('radio', { name: '正方形', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: '練習スタート' })).toBeEnabled();
  await page.getByLabel('問題数', { exact: true }).fill('1');
  await page.getByLabel('1問の秒数').fill('1');
  await page.getByRole('button', { name: '練習スタート' }).click();
  await expect(page.locator('.session-tip')).toContainText('描くコツ');
  await expect(page.getByRole('heading', { name: '練習完了', exact: true })).toBeVisible({ timeout: 8000 });
  await expect(page.locator('.week-note')).toContainText('今週 1日目');
  await page.getByRole('button', { name: 'ちょうどよかった' }).click();
  await expect(page.getByRole('button', { name: 'ちょうどよかった' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'ホームへ' }).click();
  await expect(page.locator('.week-count b')).toHaveText('1');
  await expect(page.locator('.course li[data-done=true]')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '円を回す' })).toBeVisible();
  await expect(page.locator('.history li')).toHaveCount(1);
  await expect(page.locator('.history li')).toContainText('ちょうどよかった');
  await expect(page.locator('.calendar-day[data-practiced=true]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.week-count b')).toHaveText('1');
});

test('a hard session makes the next recommendation gentler', async ({ page }) => {
  await page.goto('/');
  await finishRecommendedStep(page);
  await page.getByRole('button', { name: 'むずかしかった' }).click();
  await page.getByRole('button', { name: /^次のおすすめ：円を回す/ }).click();
  await expect(page.getByLabel('問題数', { exact: true })).toHaveValue('4');
  await expect(page.getByLabel('1問の秒数')).toHaveValue('70');
});

test('quick start records a practice day without completing the course step', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '1分だけやってみる' }).click();
  await expect(page.getByLabel('問題数', { exact: true })).toHaveValue('2');
  await expect(page.getByLabel('1問の秒数')).toHaveValue('30');
  await expect(page.getByRole('button', { name: '練習スタート' })).toBeEnabled();
  await page.getByLabel('問題数', { exact: true }).fill('1');
  await page.getByLabel('1問の秒数').fill('1');
  await page.getByRole('button', { name: '練習スタート' }).click();
  await expect(page.getByRole('heading', { name: '練習完了', exact: true })).toBeVisible({ timeout: 8000 });
  await page.getByRole('button', { name: 'ホームへ' }).click();
  await expect(page.locator('.week-count b')).toHaveText('1');
  await expect(page.locator('.course li[data-done=true]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '正方形を回す' })).toBeVisible();
});

test('ending early records only sessions that got past the first question', async ({ page }) => {
  await page.goto('/#rotation');
  await expect(page.getByRole('button', { name: '練習スタート' })).toBeEnabled();
  await page.getByLabel('問題数', { exact: true }).fill('3');
  await page.getByRole('button', { name: '練習スタート' }).click();
  await page.getByRole('button', { name: '練習を終了', exact: true }).click();
  await page.getByRole('button', { name: 'ホーム', exact: true }).click();
  await expect(page.locator('.history')).toHaveCount(0);
  await page.getByRole('button', { name: '回転練習', exact: true }).click();
  await page.getByRole('button', { name: '練習スタート' }).click();
  await page.getByRole('button', { name: '次へ', exact: true }).click();
  await expect(page.getByTestId('model-view')).toHaveAttribute('data-phase', 'running');
  await page.getByRole('button', { name: '練習を終了', exact: true }).click();
  await page.getByRole('button', { name: 'ホーム', exact: true }).click();
  await expect(page.locator('.history li')).toHaveCount(1);
  await expect(page.locator('.history li')).toContainText('1/3問で終了');
});

test('keyboard shortcuts pause and move between questions', async ({ page }) => {
  await page.goto('/#rotation');
  await expect(page.getByRole('button', { name: '練習スタート' })).toBeEnabled();
  await page.getByLabel('問題数', { exact: true }).fill('3');
  await page.getByRole('button', { name: '練習スタート' }).click();
  const view = page.getByTestId('model-view');
  await page.keyboard.press('Space');
  await expect(view).toHaveAttribute('data-phase', 'paused');
  await page.keyboard.press('ArrowRight');
  await expect(view).toHaveAttribute('data-angle', (2 * Math.PI / 3).toFixed(4));
  await expect(view).toHaveAttribute('data-phase', 'paused');
  await page.keyboard.press('ArrowLeft');
  await expect(view).toHaveAttribute('data-angle', '0.0000');
  await page.keyboard.press('Space');
  await expect(view).toHaveAttribute('data-phase', 'running');
});

test('the address hash keeps the current screen across reloads and history', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '接続練習', exact: true }).click();
  await expect(page).toHaveURL(/#connection$/);
  await page.reload();
  await expect(page.getByRole('group', { name: '練習の量' })).toBeVisible();
  await expect(page.getByRole('button', { name: '接続練習', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.goBack();
  await expect(page.getByRole('button', { name: 'ホーム', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('presets fill the practice amount and show the total time', async ({ page }) => {
  await page.goto('/#rotation');
  await page.getByRole('button', { name: /^じっくり/ }).click();
  await expect(page.getByLabel('問題数', { exact: true })).toHaveValue('6');
  await expect(page.getByLabel('1問の秒数')).toHaveValue('90');
  await expect(page.locator('.total-time')).toContainText('約9分');
  await page.getByRole('button', { name: /^おためし/ }).click();
  await expect(page.locator('.total-time')).toContainText('約3分');
  const sound = page.getByRole('button', { name: /切り替え音/ });
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await expect(page.getByRole('button', { name: /切り替え音/ })).toHaveAttribute('aria-pressed', 'false');
});

test('perspective practice is logged and offers the next step', async ({ page }) => {
  await page.goto('/#perspective');
  await page.getByLabel('問題数', { exact: true }).fill('1');
  await page.getByLabel('1問の秒数').fill('1');
  await page.getByRole('button', { name: '練習スタート' }).click();
  await expect(page.getByRole('heading', { name: '練習完了！' })).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('button', { name: /^次のおすすめ：/ })).toBeVisible();
  await page.getByRole('button', { name: 'ホームへ' }).click();
  await expect(page.locator('.history li')).toContainText('パース：立方体');
});

test('backup can be restored and cleared', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());
  await page.goto('/');
  const at = new Date().toISOString();
  const backup = { logs: [{ id: 'a', at, mode: 'rotation', label: '正方形の回転', count: 5, seconds: 45, done: 5, completed: true, stepId: 'square' }], goal: 5, onboarded: true };
  await page.getByText('記録の保存・引き継ぎ').click();
  await page.getByLabel('バックアップファイル').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByText('練習記録を読み込みました。')).toBeVisible();
  await expect(page.locator('.week-count b')).toHaveText('1');
  await expect(page.getByLabel('週の目標')).toHaveValue('5');
  await expect(page.locator('.course li[data-done=true]')).toHaveCount(1);
  await page.getByLabel('バックアップファイル').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('not json') });
  await expect(page.getByText('読み込めませんでした')).toBeVisible();
  await expect(page.locator('.week-count b')).toHaveText('1');
  await page.getByRole('button', { name: '消去' }).click();
  await expect(page.locator('.week-count b')).toHaveText('0');
  await expect(page.locator('.course li[data-done=true]')).toHaveCount(0);
});

test('home fits supported viewports without horizontal scroll', async ({ page }) => {
  await page.goto('/');
  for (const [width, height] of [[320, 640], [390, 844], [844, 390], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
