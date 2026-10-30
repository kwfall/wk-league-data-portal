// 해외파 선수의 위키미디어 공용 사진 후보를 모아 한 장으로 보여 준다 (사람이 경기 사진을 고르기 위한 도구)
// 사용법: node tools/abroad-photo-candidates.mjs  → cache/cand/ 에 후보와 sheet-*.png 가 생긴다
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';

const UA = 'wk-league-stats (personal analysis project)', sleep = (ms) => new Promise((r) => setTimeout(r, ms));
globalThis.window = {}; createRequire(import.meta.url)('../abroad.js');
const players = window.WK_ABROAD.players, dir = 'cache/cand';
fs.mkdirSync(dir, { recursive: true });
async function get(u, n = 0) { const res = await fetch(u, { headers: { 'User-Agent': UA } }); await sleep(900); if (res.status === 429 && n < 5) { await sleep(10000 * (n + 1)); return get(u, n + 1); } return res; }
const api = async (params) => (await get(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`)).json();

const all = [];
for (const p of players) {
  const found = new Map();
  for (const q of [`"${p.en}"`, p.ko && `"${p.ko}"`].filter(Boolean)) {
    const j = await api({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '300' });
    for (const pg of j.query?.pages || []) { const ii = pg.imageinfo?.[0]; if (ii?.thumburl) found.set(pg.title, ii); }
  }
  let i = 0;
  for (const [title, ii] of [...found].slice(0, 14)) {
    const file = path.join(dir, `${p.en.replace(/[^A-Za-z0-9]+/g, '-')}-${++i}.jpg`);
    if (!fs.existsSync(file)) { const res = await get(ii.thumburl); if (!res.ok) continue; fs.writeFileSync(file, Buffer.from(await res.arrayBuffer())); }
    all.push({ en: p.en, ko: p.ko, n: i, title, file, license: ii.extmetadata?.LicenseShortName?.value || '', author: (ii.extmetadata?.Artist?.value || '').replace(/<[^>]+>/g, '').trim(), page: ii.descriptionurl });
  }
  console.log(p.ko || p.en, found.size);
}
fs.writeFileSync(path.join(dir, 'list.json'), JSON.stringify(all, null, 1));

const b = await chromium.launch({ channel: 'msedge' }), pg = await b.newPage({ viewport: { width: 1500, height: 600 } });
const names = [...new Set(all.map((x) => x.en))];
for (let k = 0; k < names.length; k += 3) {
  const html = '<body style="margin:8px;font:12px sans-serif">' + names.slice(k, k + 3).map((en) => `<h3 style="margin:6px 0">${en} ${all.find((x) => x.en === en).ko}</h3><div style="display:flex;flex-wrap:wrap;gap:6px">` + all.filter((x) => x.en === en).map((x) => `<div style="width:200px"><img src="${pathToFileURL(path.resolve(x.file)).href}" style="width:200px;height:200px;object-fit:contain;background:#eee"><div>#${x.n} ${x.license}<br>${x.title.slice(5, 60)}</div></div>`).join('') + '</div>').join('') + '</body>';
  fs.writeFileSync(path.join(dir, '_sheet.html'), html);
  await pg.goto(pathToFileURL(path.resolve(dir, '_sheet.html')).href); await pg.waitForTimeout(400);
  await pg.screenshot({ path: path.join(dir, `sheet-${k / 3 + 1}.png`), fullPage: true });
}
await b.close();
console.log('후보', all.length, '장');
