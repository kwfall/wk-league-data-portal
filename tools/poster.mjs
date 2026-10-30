// 순위 포스터(1080×1350 PNG)를 posters/ 폴더에 만든다
// 사용법: node tools/poster.mjs [언어=ko] [테마=light] [인원=5]
//   예) node tools/poster.mjs ko light 5     → posters/득점순위-ko-light.png, posters/도움순위-ko-light.png
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const [lang = 'ko', theme = 'light', n = '5'] = process.argv.slice(2);
await mkdir('posters', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
for (const [type, name] of [['goals', '득점순위'], ['assists', '도움순위']]) {
  await page.goto(`${pathToFileURL(resolve('poster.html')).href}?type=${type}&lang=${lang}&theme=${theme}&n=${n}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  const info = await page.evaluate(() => ({ rows: document.querySelectorAll('.row').length, sub: document.querySelector('.sub').textContent,
    clipped: [...document.querySelectorAll('.nm')].filter((e) => e.scrollWidth > e.clientWidth).map((e) => e.textContent),
    overflow: document.querySelector('.list').scrollHeight > document.querySelector('.list').clientHeight + 1 }));
  const file = `posters/${name}-${lang}-${theme}.png`;
  await page.locator('#poster').screenshot({ path: file });
  console.log(file, '|', info.sub, '|', `${info.rows}명`, info.clipped.length ? `| 이름 잘림: ${info.clipped.join(', ')}` : '', info.overflow ? '| 목록 넘침' : '');
}
if (errors.length) console.log('오류:', errors);
await browser.close();
