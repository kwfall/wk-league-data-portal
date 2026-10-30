// 인스타그램 카드뉴스(1080×1350 PNG)를 posters/ 폴더에 만든다: 득점 5장(표지, 순위, 1위 선수 출전 기록, 90분당 득점 비교, 1위 선수 포스터), 도움 2장, 베스트 11 3장
// 사용법: node tools/cards.mjs ["@계정이름"]
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const handle = process.argv[2] || '@kwf. all';
await mkdir('posters', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
for (const [type, name] of [['goals', '득점'], ['assists', '도움']]) {
  for (const n of type === 'goals' ? [1, 2, 3, 4, 5] : [1, 2]) {
    await page.goto(`${pathToFileURL(resolve('card.html')).href}?type=${type}&page=${n}&handle=${encodeURIComponent(handle)}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    const info = await page.evaluate(() => ({ text: document.getElementById('card').innerText.replace(/\s+/g, ' ').slice(0, 90),
      clipped: [...document.querySelectorAll('.nm')].filter((e) => e.scrollWidth > e.clientWidth).map((e) => e.textContent),
      overflow: document.getElementById('card').scrollHeight > 1351 }));
    const file = `posters/카드뉴스-${name}-${n}.png`;
    await page.locator('#card').screenshot({ path: file });
    console.log(file, '|', info.text, info.clipped.length ? `| 이름 잘림: ${info.clipped}` : '', info.overflow ? '| 넘침' : '');
  }
}
// 베스트 11: 모든 경기가 끝난 가장 최근 라운드 3장(명단, 점수 내역, 선정 기준)
for (const n of [1, 2, 3]) {
  await page.goto(`${pathToFileURL(resolve('card.html')).href}?type=best&page=${n}&handle=${encodeURIComponent(handle)}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  const info = await page.evaluate(() => ({ round: (document.querySelector('#card').innerText.match(/(\d+)라운드/) || [])[1], overflow: [...document.querySelectorAll('#card .ln, #card .brow, #card .note')].some((e) => e.getBoundingClientRect().bottom > 1232),
    clipped: [...document.querySelectorAll('.nm, .why, .sl b')].filter((e) => e.scrollWidth > e.clientWidth).map((e) => e.textContent) }));
  const file = `posters/카드뉴스-베스트11-${n}.png`;
  await page.locator('#card').screenshot({ path: file });
  console.log(file, '|', info.round + 'R', info.clipped.length ? `| 글자 잘림: ${info.clipped}` : '', info.overflow ? '| 넘침' : '');
}
if (errors.length) console.log('오류:', errors);
await browser.close();
