// 경기장 가는 길: 위치 검색 → 경기 선택 → 경로 계산까지 실제로 눌러 확인한다
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const browser = await chromium.launch({ channel: 'msedge' });
for (const [w, h] of [[1440, 1000], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(pathToFileURL(resolve('index.html')).href + '#/go');
  await page.waitForSelector('.leaflet-container', { timeout: 20000 });
  await page.fill('#goQ', '서울역');
  await page.click('#goForm button[type=submit]');
  await page.waitForFunction(() => document.querySelector('.go-side .desc b'), null, { timeout: 20000 });
  const me = await page.textContent('.go-side .desc b');
  await page.locator('.gm', { hasText: process.env.VENUE || '세종시민운동장' }).first().click();
  await page.waitForFunction(() => /km/.test(document.getElementById('goKm')?.textContent || ''), null, { timeout: 30000 });
  await page.waitForTimeout(2500); // 지도 타일이 그려질 시간
  const r = await page.evaluate(() => ({ tiles: [...document.querySelectorAll('#goTiles .tile')].map((x) => x.innerText.replace(/\n/g, ' | ')), pins: document.querySelectorAll('.pin').length, route: document.querySelectorAll('.leaflet-overlay-pane path').length, overflow: document.documentElement.scrollWidth - innerWidth,
    links: [...document.querySelectorAll('.go-main a.btn')].map((a) => a.href) }));
  await page.screenshot({ path: `screenshots/go-${w}.png`, fullPage: true });
  console.log(w, '| 내 위치:', me, '\n ', r.tiles.join('\n  '), '\n  표식', r.pins, '경로선', r.route, '가로넘침', r.overflow, errors.length ? '오류 ' + errors : '');
  if (w === 1440) console.log(' ', r.links.join('\n  '));
  await page.close();
}
await browser.close();
