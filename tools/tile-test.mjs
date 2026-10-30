// 지도 타일이 실제로 그려지는지(차단 안내 이미지가 아닌지) 라이트·다크에서 확인한다
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const browser = await chromium.launch({ channel: 'msedge' });
for (const theme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const bad = [];
  page.on('response', (r) => { if (/arcgisonline|openstreetmap\.org\/\d/.test(r.url()) && r.status() !== 200) bad.push(r.status() + ' ' + r.url()); });
  await page.addInitScript((t) => { localStorage.setItem('wk-theme', t); localStorage.setItem('wk-team', '수원FC위민'); localStorage.setItem('wk-me', JSON.stringify({ lat: 37.2636, lng: 127.0286, label: '수원시청' })); }, theme);
  await page.goto(pathToFileURL(resolve('index.html')).href + '#/go');
  await page.waitForSelector('.leaflet-tile-loaded', { timeout: 20000 });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => { const t = [...document.querySelectorAll('.leaflet-tile')]; return { tiles: t.length, loaded: t.filter((i) => i.complete && i.naturalWidth > 0).length, host: t[0] && new URL(t[0].src).host }; });
  await page.locator('#goMap').screenshot({ path: `screenshots/map-${theme}.png` });
  console.log(theme, JSON.stringify(r), bad.length ? '실패한 요청 ' + bad.slice(0, 3) : '실패한 요청 없음');
  await page.close();
}
await browser.close();
