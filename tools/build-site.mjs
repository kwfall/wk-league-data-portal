// 배포용 사이트 폴더(_site)를 만든다: 사이트가 실제로 쓰는 파일만 골라 복사한다
// 사용법: node tools/build-site.mjs   (SITE_URL 환경 변수가 있으면 링크 미리보기 이미지 주소를 그 주소로 바꾼다)
import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const OUT = '_site';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

let html = await readFile('index.html', 'utf8');
// index.html 이 불러오는 내 파일들 (스크립트, 스타일, 아이콘)
const own = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|#|mailto:)/.test(u));
// 화면 코드가 그때그때 불러오는 폴더
const dirs = ['assets', 'logos', 'cardnews'];
const files = new Set(own);
for (const d of dirs) if (existsSync(d)) for (const f of await readdir(d, { recursive: true })) { const p = path.join(d, f).replace(/\\/g, '/'); if ((await stat(p)).isFile() && !/README|_draft/.test(p)) files.add(p); }
// 선수 사진: 기록에 나오는 사진만
{ const w = {}; new Function('window', await readFile('data.js', 'utf8'))(w);
  for (const s of Object.values(w.WK_DATA.seasons)) for (const m of s.matches) for (const side of ['home', 'away']) for (const p of (m.players && m.players[side]) || []) if (p.photo && existsSync(p.photo)) files.add(p.photo); }
// 카드뉴스 이미지: cardnews.js 목록에 있는 것만
{ const w = {}; new Function('window', await readFile('cardnews.js', 'utf8'))(w); for (const c of w.WK_CARDS || []) if (existsSync(c.src)) files.add(c.src); }

// 링크 미리보기(인스타그램·카카오톡 등)는 이미지 주소가 전체 주소여야 잘 뜬다
const site = (process.env.SITE_URL || '').replace(/\/?$/, '/').replace(/^https?:\/\/[^/]+/, (h) => h.toLowerCase());
if (process.env.SITE_URL) html = html.replace(/(<meta property="og:(?:image|url)" content=")([^"]*)"/g, (m, a, v) => `${a}${site}${v.replace(/^\.?\//, '')}"`);
await writeFile(path.join(OUT, 'index.html'), html);
files.delete('index.html');
let n = 0;
for (const f of files) { if (!existsSync(f)) { console.log('없는 파일:', f); continue; } await mkdir(path.join(OUT, path.dirname(f)), { recursive: true }); await cp(f, path.join(OUT, f)); n++; }
await writeFile(path.join(OUT, '.nojekyll'), '');
console.log(`_site 준비: index.html + 파일 ${n}개${process.env.SITE_URL ? ' · 주소 ' + site : ''}`);
