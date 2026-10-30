// 화면 캡처와 체크리스트 자동 점검
// 사용법: node tools/shot.mjs <이름> <주소 뒤 경로> [모바일에서 누를 버튼 글자]
//   예) node tools/shot.mjs table table "전체 열 보기"   (경로는 # 없이: table, team/서울시청)
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [name = 'home', route = '', clickText] = process.argv.slice(2);
const url = pathToFileURL(resolve('index.html')).href + '#/' + route;
const browser = await chromium.launch({ channel: 'msedge' });
let failed = false;

async function shoot(label, width, height, after) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  if (process.env.UI_LANG || process.env.THEME) await page.addInitScript(([l, th]) => { if (l) localStorage.setItem('wk-lang', l); if (th) localStorage.setItem('wk-theme', th); }, [process.env.UI_LANG, process.env.THEME]);
  await page.goto(url);
  if (process.env.SEASON) await page.selectOption('#season', process.env.SEASON); // 다른 시즌 확인용
  if (process.env.CLICK_LANG) await page.click(`#lang button[data-lang="${process.env.CLICK_LANG}"]`); // 언어 버튼 동작 확인용
  if (process.env.CLICK) await page.click(process.env.CLICK); // 임의 요소 클릭 확인용 (CSS 선택자)
  if (process.env.PICK) { const [sel, val] = process.env.PICK.split('='); await page.selectOption(`[data-bind="${sel}"]`, val); } // 필터 확인용
  await page.evaluate(() => document.fonts.ready);
  if (after) await after(page);
  const r = await page.evaluate(() => {
    const vis = (el) => el.offsetParent !== null;
    const tds = [...document.querySelectorAll('main td')].filter((td) => vis(td) && !td.matches('.l, .c, .cell') && td.textContent.trim());
    const cards = [...document.querySelectorAll('main table')].filter(vis);
    const first = document.querySelector('main table tbody tr');
    const cells = first ? [...first.children].filter(vis).map((c) => { const b = c.getBoundingClientRect(); return { t: c.textContent.trim().slice(0, 12), left: Math.round(b.left), right: Math.round(b.right) }; }) : [];
    return {
      overflow: document.documentElement.scrollWidth - innerWidth,
      numNotRight: tds.filter((td) => getComputedStyle(td).textAlign !== 'right').length,
      numNotTabular: tds.filter((td) => !getComputedStyle(td).fontVariantNumeric.includes('tabular-nums')).length,
      numCells: tds.length,
      tablesWithoutSource: cards.filter((t) => !t.closest('.card')?.querySelector('.src')).length,
      tables: cards.length,
      fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))],
      firstRow: cells,
      width: innerWidth,
    };
  });
  const file = `screenshots/${name}${['SEASON', 'UI_LANG', 'THEME'].map((k) => (process.env[k] ? '-' + process.env[k] : '')).join('')}-${label}.png`;
  await page.screenshot({ path: file, fullPage: true });
  const checks = [
    ['페이지 가로 넘침 없음', r.overflow <= 0],
    ['숫자 칸 오른쪽 정렬', r.numNotRight === 0],
    ['숫자 칸 고정폭 숫자', r.numNotTabular === 0],
    ['모든 표에 출처·기준 시각', r.tablesWithoutSource === 0],
    ['스크립트 오류 없음', errors.length === 0],
  ];
  console.log(`\n[${label}] ${width}px → ${file}  (표 ${r.tables}개, 숫자 칸 ${r.numCells}개, 글꼴 ${r.fonts.join(', ') || '불러오지 못함'})`);
  for (const [k, ok] of checks) { console.log(`  ${ok ? '통과' : '실패'}  ${k}`); if (!ok) failed = true; }
  if (errors.length) console.log('  오류:', errors.slice(0, 3));
  console.log('  첫 행:', r.firstRow.map((c) => `${c.t}[${c.left}~${c.right}]`).join(' '));
  await page.close();
}

await shoot('1440', 1440, 900);
await shoot('390', 390, 844);
if (clickText) await shoot('390-wide', 390, 844, async (page) => { await page.getByText(clickText, { exact: true }).click(); await page.locator('main .scroll').first().evaluate((el) => { el.scrollLeft = 120; }); });
await browser.close();
process.exit(failed ? 1 : 0);
