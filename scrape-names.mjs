// 선수·팀·경기장의 영어 표기 수집 + 일본어(가타카나) 표기 생성 → names.js
// 사용법: node scrape-names.mjs [시즌]   (기본 2026)
// 영어: 연맹 사이트 영문 페이지(?lang=en)의 표기를 그대로 쓰고 대소문자만 정리한다.
// 일본어: 공식 표기가 없어 한글 발음을 가타카나로 자동 변환한다. 틀린 표기는 names-override.json에서 고친다.
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const BASE = 'https://www.kwff.or.kr';
const UA = 'Mozilla/5.0 (wk-league-stats; personal analysis project)';
const season = process.argv[2] || '2026';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const text = (h) => decode(h.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|')).split('|').map((t) => t.trim()).filter(Boolean);

// ---------- 한글 → 가타카나 ----------
const CHO = ['k', 'kk', 'n', 't', 'tt', 'r', 'm', 'p', 'pp', 's', 'ss', '', 'ch', 'jj', 'chh', 'kh', 'th', 'ph', 'h'];
const JUNG = ['a', 'e', 'ya', 'ye', 'o', 'e', 'yo', 'ye', 'o', 'wa', 'we', 'we', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'u', 'wi', 'i'];
const JONG = ['', 'ク', 'ク', 'ク', 'ン', 'ン', 'ン', 'ッ', 'ル', 'ク', 'ム', 'ル', 'ル', 'ル', 'プ', 'ル', 'ム', 'プ', 'プ', 'ッ', 'ッ', 'ン', 'ッ', 'ッ', 'ク', 'ッ', 'プ', 'ッ'];
const ROW = {
  '': ['ア', 'イ', 'ウ', 'エ', 'オ'], k: ['カ', 'キ', 'ク', 'ケ', 'コ'], g: ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'], n: ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  t: ['タ', 'ティ', 'トゥ', 'テ', 'ト'], d: ['ダ', 'ディ', 'ドゥ', 'デ', 'ド'], r: ['ラ', 'リ', 'ル', 'レ', 'ロ'], m: ['マ', 'ミ', 'ム', 'メ', 'モ'],
  p: ['パ', 'ピ', 'プ', 'ペ', 'ポ'], b: ['バ', 'ビ', 'ブ', 'ベ', 'ボ'], s: ['サ', 'シ', 'ス', 'セ', 'ソ'], h: ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
  ch: ['チャ', 'チ', 'チュ', 'チェ', 'チョ'], j: ['ジャ', 'ジ', 'ジュ', 'ジェ', 'ジョ'],
};
const VI = { a: 0, i: 1, u: 2, e: 3, o: 4 };
const Y = { ya: 'ャ', yu: 'ュ', yo: 'ョ' }, W = { wa: 'ァ', wi: 'ィ', we: 'ェ', wo: 'ォ' };
function kana(c, v) {
  const row = ROW[c];
  if (v in VI) return row[VI[v]];
  if (v === 'ye') return c === '' ? 'イェ' : row[3];
  if (v in Y) {
    if (c === '') return { ya: 'ヤ', yu: 'ユ', yo: 'ヨ' }[v];
    if (c === 'ch' || c === 'j') return row[VI[v[1]]];
    return row[1].replace(/ィ$/, '') + Y[v] || row[1] + Y[v];
  }
  // w 계열: 와 워 위 웨
  if (c === '') return { wa: 'ワ', wi: 'ウィ', we: 'ウェ', wo: 'ウォ' }[v];
  if (c === 'h') return 'フ' + W[v];
  if (v === 'we') return row[3]; // 최 → チェ, 회 → フェ 관례
  return row[2].replace(/ゥ$/, '') + W[v];
}
// 한 단어(띄어쓰기 없는 덩어리)를 가타카나로. 유성음 사이의 ㄱㄷㅂㅈ은 탁음으로 바꾼다.
function word(w) {
  const syl = [...w].map((ch) => { const n = ch.charCodeAt(0) - 0xac00; return n < 0 || n > 11171 ? { raw: ch } : { c: Math.floor(n / 588), v: Math.floor((n % 588) / 28), f: n % 28 }; });
  let out = '';
  syl.forEach((s, i) => {
    if (s.raw) { out += s.raw; return; }
    const prev = syl[i - 1], next = syl[i + 1];
    let c = CHO[s.c];
    // 앞 음절 받침이 이 음절의 ㅇ 자리로 넘어온 경우(연음)
    if (c === '' && prev && !prev.raw && prev.f && [4, 8, 16, 1, 17, 19, 7].includes(prev.f)) c = { 4: 'n', 8: 'r', 16: 'm', 1: 'g', 17: 'b', 19: 's', 7: 'd' }[prev.f];
    const voiced = prev && !prev.raw && (prev.f === 0 || [4, 8, 16, 21].includes(prev.f));
    let v = JUNG[s.v];
    if (s.v === 19 && c !== '') v = 'i'; // 자음 뒤의 ㅢ는 ㅣ로 읽는다 (희 → ヒ)
    c = { kk: 'k', tt: 't', pp: 'p', ss: 's', jj: 'ch', chh: 'ch', kh: 'k', th: 't', ph: 'p' }[c] ?? c;
    if (voiced && CHO[s.c].length === 1 || voiced && CHO[s.c] === 'ch') c = { k: 'g', t: 'd', p: 'b', ch: 'j' }[c] ?? c;
    out += kana(c, v);
    const liaison = next && !next.raw && CHO[next.c] === '' && [4, 8, 16, 1, 17, 19, 7].includes(s.f);
    if (s.f && !liaison) out += JONG[s.f];
  });
  return out;
}
const DOUBLE = ['남궁', '황보', '선우', '제갈', '독고', '사공'];
function toKatakana(name, foreign) {
  if (name.includes(' ')) return name.split(/\s+/).map(word).join('・');
  if (foreign) return word(name);
  const n = DOUBLE.some((d) => name.startsWith(d)) ? 2 : 1; // 성과 이름을 ・로 나눈다
  return name.length > n ? `${word(name.slice(0, n))}・${word(name.slice(n))}` : word(name);
}

// ---------- 영문 페이지 수집 ----------
const cap = (s) => s.replace(/[A-Za-zÀ-ÿ]+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
const data = JSON.parse(await readFile(`data/wk-${season}.json`, 'utf8'));
const done = data.matches.filter((m) => m.finished && m.players && m.players.home.length);
await mkdir('cache', { recursive: true });
const players = {}, teams = {}, venues = {}, conflicts = [];
let fetched = 0;
for (const m of done) {
  const file = `cache/match-${m.id}.en.html`;
  let html;
  if (existsSync(file)) html = await readFile(file, 'utf8');
  else {
    const res = await fetch(`${BASE}/matches/${m.id}?lang=en`, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.log('받지 못함', m.id, res.status); continue; }
    html = await res.text(); await writeFile(file, html); await sleep(700);
    if (++fetched % 20 === 0) console.log(`  영문 페이지 ${fetched}개 받음`);
  }
  // 점수판: [날짜, 시각, 경기장, 홈팀, 점수…, 원정팀] — 한글 페이지와 같은 순서
  const board = html.slice(html.indexOf('<main'), html.indexOf('<tbody'));
  const spans = [...board.matchAll(/<span class="[^"]*font-(?:semibold|medium)[^"]*text-white">([^<]+)<\/span>/g)].map((x) => decode(x[1]).trim()).filter((s) => !/^[\d:]+$/.test(s));
  const head = text(board.slice(0, board.indexOf('<img')));
  const venue = head[head.findIndex((s) => /^\d\d:\d\d$/.test(s)) + 1];
  if (spans.length >= 2) { teams[m.home] = spans[0]; teams[m.away] = spans[spans.length - 1]; }
  if (m.venue && venue && !/^\d/.test(venue)) venues[m.venue] = venue;
  const bodies = html.split('<tbody').slice(1).map((b) => b.slice(0, b.indexOf('</tbody>')));
  ['home', 'away'].forEach((side, i) => {
    const rows = (bodies[i] || '').split('<tr').slice(1).filter((r) => r.split('<td').length > 9);
    m.players[side].forEach((p, idx) => {
      const mm = rows[idx] && rows[idx].match(/<span>(\d+)\.\s*([^<]+)<\/span>/);
      if (!mm || +mm[1] !== p.number) return; // 줄 순서가 어긋나면 넣지 않는다
      const key = `${m[side]}|${p.name}|${p.number}`, en = decode(mm[2]).trim();
      if (players[key] && players[key].raw !== en) conflicts.push(`${key}: ${players[key].raw} / ${en}`);
      players[key] ||= { raw: en, en: cap(en) };
    });
  });
}

// 영문 표기에 한글 성의 로마자가 따로 떨어져 있지 않으면 외국인 선수로 본다 (가타카나 변환 시 성·이름을 나누지 않기 위함)
let override = {};
if (existsSync('names-override.json')) override = JSON.parse(await readFile('names-override.json', 'utf8'));
for (const [key, v] of Object.entries(players)) {
  const ko = key.split('|')[1], o = (override.players || {})[key] || {};
  v.foreign = o.foreign ?? (ko.includes(' ') || !/^[가-힣]{2,4}$/.test(ko));
  v.ja = o.ja || toKatakana(ko, v.foreign);
  v.jaAuto = !o.ja;
  if (o.en) v.en = o.en;
}
// 구단 로고: 수집해 둔 경기 페이지의 점수판에서 홈·원정 순서로 읽는다. 여러 시즌이 있으면 최근 시즌 로고를 쓴다.
await mkdir('logos', { recursive: true });
const logos = {};
for (const f of (await readdir('data')).filter((x) => /^wk-\d+\.json$/.test(x)).sort()) {
  const d = JSON.parse(await readFile(`data/${f}`, 'utf8'));
  for (const m of d.matches.filter((x) => x.finished)) {
    const file = `cache/match-${m.id}.html`;
    if (!existsSync(file)) continue;
    const h = await readFile(file, 'utf8');
    const imgs = [...h.slice(h.indexOf('<main'), h.indexOf('<!-- 골 기록 -->')).matchAll(/<img src="(https:\/\/www\.kwff\.or\.kr\/images\/teams\/[^"]+)"/g)].map((x) => x[1]);
    if (imgs.length >= 2) { logos[m.home] = imgs[0]; logos[m.away] = imgs[1]; }
  }
}
for (const [team, url] of Object.entries(logos)) {
  const file = 'logos/' + url.split('/').pop();
  if (!existsSync(file)) { const res = await fetch(url, { headers: { 'User-Agent': UA } }); if (res.ok) await writeFile(file, Buffer.from(await res.arrayBuffer())); else { delete logos[team]; continue; } await sleep(300); }
  logos[team] = file;
}
console.log(`구단 로고 ${Object.keys(logos).length}개`);

const out = { season, logos, players: Object.fromEntries(Object.entries(players).map(([k, v]) => [k, { en: v.en, ja: v.ja, jaAuto: v.jaAuto }])), teams, venues };
await writeFile('names.js', `window.WK_NAMES = ${JSON.stringify(out)};\n`);
await writeFile('data/names-review.tsv', '키\t영문(연맹 원문)\t영문(표시)\t일본어\t외국인 추정\n' + Object.entries(players).map(([k, v]) => [k, v.raw, v.en, v.ja, v.foreign ? 'Y' : ''].join('\t')).join('\n'));
console.log(`선수 ${Object.keys(players).length}명, 팀 ${Object.keys(teams).length}개, 경기장 ${Object.keys(venues).length}곳 → names.js`);
if (conflicts.length) console.log('영문 표기가 경기마다 다른 선수:', conflicts.length, conflicts.slice(0, 5));
