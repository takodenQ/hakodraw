import { test, expect } from '@playwright/test';
test('perspective drawing, answer, history and completion',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'パース練習',exact:true}).click();
 await page.getByLabel('問題数',{exact:true}).fill('2');await page.getByLabel('1問の秒数').fill('30');
 const draw=page.getByLabel('描画キャンバス'),ref=page.getByLabel('立方体のお手本');
 expect(await draw.locator('.eye-level').getAttribute('y1')).toBe(await ref.locator('.eye-level').getAttribute('y1'));
 await page.getByRole('button',{name:'練習スタート'}).click();
 await draw.scrollIntoViewIfNeeded();const b=(await draw.boundingBox())!;await page.mouse.move(b.x+b.width*.3,b.y+b.height*.3);await page.mouse.down();await page.mouse.move(b.x+b.width*.6,b.y+b.height*.6,{steps:5});await page.mouse.up();await expect(draw).toHaveAttribute('data-strokes','1');
 await page.getByRole('button',{name:'答えを重ねる'}).click();await expect(draw.locator('.answer-lines')).toBeVisible();await expect(page.getByRole('button',{name:'再開',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'次へ',exact:true}).click();await expect(draw).toHaveAttribute('data-strokes','0');await page.getByRole('button',{name:'前へ',exact:true}).click();await expect(draw).toHaveAttribute('data-strokes','1');
 await page.getByRole('button',{name:'一筆戻す'}).click();await expect(draw).toHaveAttribute('data-strokes','0');
 await page.getByRole('button',{name:'次へ',exact:true}).click();await page.getByRole('button',{name:'次へ',exact:true}).click();await expect(page.getByRole('heading',{name:'練習完了！'})).toBeVisible();
});
test('mobile pair stays side by side and timed session completes',async({page,context})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'パース練習',exact:true}).click();
 const draw=page.getByLabel('描画キャンバス'),ref=page.getByLabel('立方体のお手本');const a=(await ref.boundingBox())!,b=(await draw.boundingBox())!;expect(a.y).toBe(b.y);expect(b.x).toBeGreaterThan(a.x);expect(a.width).toBeCloseTo(b.width);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('問題数',{exact:true}).fill('1');await page.getByLabel('1問の秒数').fill('2');await page.getByRole('button',{name:'練習スタート'}).click();
 const r=(await draw.boundingBox())!;const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+20,y:r.y+20,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+70,y:r.y+50,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await expect(draw).toHaveAttribute('data-strokes','1');await expect(page.getByRole('heading',{name:'練習完了！'})).toBeVisible({timeout:6000});
});
test('only a single cube is offered, and it turns at random between questions',async({page})=>{
 await page.goto('/#perspective');
 await expect(page.getByRole('radio')).toHaveCount(0);
 await expect(page.locator('.reference-edge')).toHaveCount(12);await expect(page.locator('.guide')).toHaveCount(12);
 const shape=()=>page.locator('.reference-edge').evaluateAll(lines=>lines.map(l=>['x1','y1','x2','y2'].map(k=>(+l.getAttribute(k)!).toFixed(2)).join(',')).join(';'));
 const horizon=()=>page.getByLabel('立方体のお手本').locator('.eye-level').getAttribute('y1');
 await page.getByLabel('問題数',{exact:true}).fill('3');
 await page.getByRole('button',{name:'練習スタート'}).click();
 const first=await shape(),firstHorizon=await horizon();
 await page.getByRole('button',{name:'答えを重ねる'}).click();await expect(page.locator('.answer-lines line')).toHaveCount(12);
 await page.getByRole('button',{name:'次へ',exact:true}).click();
 const second=await shape();expect(second).not.toBe(first);
 await expect(page.locator('.reference-edge')).toHaveCount(12);
 await page.getByRole('button',{name:'前へ',exact:true}).click();
 await expect.poll(shape).toBe(first);expect(await horizon()).toBe(firstHorizon);
 await page.evaluate(()=>(document.activeElement as HTMLElement).blur());
 await page.keyboard.press('ArrowRight');
 await expect.poll(shape).toBe(second);
});
test('the perspective tab is the rightmost tab',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('navigation',{name:'練習モード'}).getByRole('button')).toHaveText(['ホーム','回転練習','接続練習','パース練習']);
});
