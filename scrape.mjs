// WK리그 기록 수집기
// 사용법: node scrape.mjs [시즌 ...]   예) node scrape.mjs 2026 2025
// 출처: 한국여자축구연맹(https://www.kwff.or.kr) — 개인 분석용으로만 사용하고, 요청 간격을 둡니다.
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const BASE = 'https://www.kwff.or.kr';
const UA = 'Mozilla/5.0 (wk-league-stats; personal analysis project)';
const DELAY_MS = 800;
const seasons = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [2026];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  const res = await fetch(BASE + path, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  await sleep(DELAY_MS);
  return res.text();
}

const decode = (s) =>
  s.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

// 태그를 걷어내고 화면에 보이는 글자 조각만 배열로 돌려준다
function tokens(html) {
  return decode(
    html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, '')
      .replace(/<[^>]+>/g, '|')
  )
    .split('|')
    .map((t) => t.trim())
    .filter(Boolean);
}

const num = (s) => {
  const n = parseInt(String(s).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

function parseMatchList(html) {
  const out = [];
  const parts = html.split('data-match-datetime="').slice(1);
  for (const part of parts) {
    const datetime = part.slice(0, part.indexOf('"'));
    const id = (part.match(/href="\/matches\/(\d+)"/) || [])[1];
    if (!id) continue;
    const card = part.slice(0, part.indexOf(`/matches/${id}`));
    const t = tokens(card.slice(card.indexOf('>') + 1));
    const colon = t.indexOf(':');
    const vs = t.indexOf('VS');
    const m = { id: +id, datetime, round: t[0] };
    if (colon > 0) {
      m.home = t[colon - 2];
      m.homeScore = num(t[colon - 1]);
      m.awayScore = num(t[colon + 1]);
      m.status = t[colon + 2];
      m.away = t[colon + 3];
      m.venue = colon - 2 > 2 ? t[2] : null;
    } else if (vs > 0) {
      m.home = t[vs - 1];
      m.status = t[vs + 1];
      m.away = t[vs + 2];
      m.venue = vs - 1 > 2 ? t[2] : null;
    } else continue;
    m.finished = m.status === '종료';
    out.push(m);
  }
  return out;
}

const STAT_LABELS = { 점유율: 'possession', 슈팅: 'shots', 유효슈팅: 'shotsOnTarget', 코너킥: 'corners', 오프사이드: 'offsides', 파울: 'fouls', 경고: 'yellows', 퇴장: 'reds' };

function parseCardCell(cell, color) {
  const marks = (cell.match(new RegExp(`bg-${color}`, 'g')) || []).length;
  const n = num(tokens(cell)[0] ?? '');
  return Math.max(marks ? Math.max(marks, n) : 0, n);
}

function parseDetail(html) {
  const detail = { goals: { home: [], away: [] }, stats: {}, players: { home: [], away: [] } };

  // 골 기록: 왼쪽 목록이 홈, 오른쪽이 원정
  const gStart = html.indexOf('<!-- 골 기록 -->');
  if (gStart > 0) {
    const gEnd = html.indexOf('<!--', gStart + 20);
    const uls = html.slice(gStart, gEnd > 0 ? gEnd : gStart + 20000).split('<ul').slice(1);
    ['home', 'away'].forEach((side, i) => {
      if (!uls[i]) return;
      for (const text of tokens('<ul' + uls[i])) {
        const g = text.match(/^(.*?)\s*(\d+)(?:\+(\d+))?'(.*)$/);
        // 자책골은 이름 뒤에 '(자책골)'이 붙고, 득점이 인정된 팀 쪽 목록에 들어 있다
        if (g) detail.goals[side].push({ player: g[1].replace(/\s*\(자책골\)/, '').trim(), own: /자책골/.test(g[1]), minute: +g[2], added: g[3] ? +g[3] : 0, note: g[4].replace(/'/g, '').trim(), raw: text });
        else detail.goals[side].push({ player: text, minute: null, added: 0, note: '', raw: text });
      }
    });
  }

  // 경기 비교: [홈 값, 항목, 원정 값] 순서
  const cStart = html.indexOf('경기 비교');
  if (cStart > 0) {
    const t = tokens(html.slice(cStart, html.indexOf('<table', cStart)));
    t.forEach((label, i) => {
      const key = STAT_LABELS[label];
      if (key && i > 0 && i < t.length - 1 && /^\d/.test(t[i - 1]) && /^\d/.test(t[i + 1])) {
        const val = key === 'possession' ? parseFloat : num;
        detail.stats[key] = { home: val(t[i - 1]), away: val(t[i + 1]) };
      }
    });
  }

  // 선수 기록: 첫 번째 tbody가 홈, 두 번째가 원정
  const bodies = html.split('<tbody').slice(1).map((b) => b.slice(0, b.indexOf('</tbody>')));
  ['home', 'away'].forEach((side, i) => {
    const rows = (bodies[i] || '').split('<tr').slice(1);
    rows.forEach((row, idx) => {
      const tds = row.split('<td').slice(1).map((c) => '<td' + c);
      if (tds.length < 9) return;
      const head = tokens(tds[0]).filter((x) => x !== 'Ⓒ');
      const nm = (head[0] || '').match(/^(\d+)\.\s*(.+)$/);
      detail.players[side].push({
        number: nm ? +nm[1] : null,
        name: nm ? nm[2] : head[0],
        position: head[1] || '',
        captain: /Ⓒ|&#9400;/.test(tds[0]),
        photo: (tds[0].match(/<img src="(\/uploads\/players\/[^"]+)"/) || [])[1] || null,
        starter: idx < 11,
        goals: num(tokens(tds[1])[0]),
        assists: num(tokens(tds[2])[0]),
        shots: num(tokens(tds[3])[0]),
        shotsOnTarget: num(tokens(tds[4])[0]),
        fouls: num(tokens(tds[5])[0]),
        yellows: parseCardCell(tds[6], 'yellow'),
        reds: parseCardCell(tds[7], 'red'),
        minutes: num(tokens(tds[8])[0]),
      });
    });
  });
  return detail;
}

function parseOfficialTable(html) {
  const body = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>'));
  return body
    .split('<tr')
    .slice(1)
    .map((row) => {
      const t = tokens('<tr' + row);
      return { rank: num(t[0]), team: t[1], played: num(t[2]), won: num(t[3]), drawn: num(t[4]), lost: num(t[5]), gf: num(t[6]), ga: num(t[7]), gd: num(t[8]), points: num(t[9]) };
    })
    .filter((r) => r.team);
}

// 연맹 선수 순위: 항목별(득점·도움·출전시간 등 10가지) 상위 30명씩만 공개되므로 모두 받아 합친다. 연맹이 집계한 숫자 그대로 쓴다.
// 행 글자: 순위 | FW 하루히 #39 수원FC위민 | 출전 | 1361분 | 득점 | 도움 | 공격P | 슈팅 | 유효슈팅 | 파울 | 골킥 | 코너킥 | 오프사이드 | 경고 | 퇴장 …
async function scrapePlayerRanking(season) {
  const out = {};
  for (const sort of ['goals', 'assists', 'ap', 'playtime', 'shots', 'sot', 'fouls', 'offsides', 'yellow', 'red']) {
    const h = await get(`/wk-league/ranking/players?season=${season}&sort=${sort}`), body = h.slice(h.indexOf('<tbody'), h.indexOf('</tbody>'));
    for (const row of body.split('<tr').slice(1)) {
      const c = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => tokens(m[1]).join(' ').trim());
      const p = (c[1] || '').match(/^(\S+)\s+(.+?)\s+#(\d+)\s+(.+)$/);
      if (!p) continue;
      const n = (v) => (v === '-' || v == null ? 0 : parseInt(v, 10) || 0);
      out[`${p[4]}|${p[2]}|${p[3]}`] = { apps: n(c[2]), minutes: n(c[3]), goals: n(c[4]), assists: n(c[5]), shots: n(c[7]), sot: n(c[8]), fouls: n(c[9]), yellows: n(c[13]), reds: n(c[14]) };
    }
  }
  return out;
}

async function scrapeSeason(season) {
  console.log(`\n[${season}시즌] 일정 수집`);
  const byId = new Map();
  for (let month = 1; month <= 12; month++) {
    const list = parseMatchList(await get(`/wk-league/matches?year=${season}&month=${month}`));
    for (const m of list) if (m.datetime.startsWith(String(season))) byId.set(m.id, m);
    process.stdout.write(`  ${month}월 ${list.length}경기\n`);
  }
  const matches = [...byId.values()].sort((a, b) => a.datetime.localeCompare(b.datetime) || a.id - b.id);

  await mkdir('cache', { recursive: true });
  // 연맹 일정 목록이 끝난 경기를 '경기중'으로 남겨 두는 경우가 있다: 시작한 지 4시간이 지났으면 경기 상세 페이지의 상태를 확인한다
  for (const m of matches.filter((m) => !m.finished && Date.now() - new Date(m.datetime + ':00+09:00') > 4 * 3600e3 && m.homeScore != null)) {
    try {
      const h = await get(`/matches/${m.id}`), t = tokens(h.slice(h.indexOf('<main'), h.indexOf('</main>')));
      if (t.includes('종료')) { m.status = '종료'; m.finished = true; console.log(`  ${m.round} ${m.home} vs ${m.away}: 목록은 '경기중'이지만 상세 페이지가 '종료'라 종료로 처리`); }
    } catch (e) { /* 다음 수집 때 다시 확인 */ }
  }
  const finished = matches.filter((m) => m.finished);
  console.log(`[${season}시즌] 경기 상세 수집 (종료 ${finished.length}경기)`);
  let fetched = 0;
  for (const m of finished) {
    const file = `cache/match-${m.id}.html`;
    // 저장해 둔 페이지를 다시 쓰되, 선수 기록이 비어 있거나(연맹이 경기 직후엔 기록을 늦게 올린다) 끝난 지 3일이 안 된 경기(기록 정정)는 새로 받는다
    let html = existsSync(file) ? await readFile(file, 'utf8') : null;
    const recent = Date.now() - new Date(m.datetime + ':00+09:00') < 3 * 864e5;
    const empty = (h) => { const d = parseDetail(h); return !d.players || !(d.players.home.length + d.players.away.length); };
    if (!html || recent || empty(html)) {
      html = await get(`/matches/${m.id}`);
      if (!empty(html)) await writeFile(file, html); // 빈 페이지는 저장하지 않아 다음에 다시 받는다
      fetched++;
      if (fetched % 10 === 0) console.log(`  ${fetched}경기 받음`);
    }
    Object.assign(m, parseDetail(html));
  }

  const official = parseOfficialTable(await get(`/wk-league/ranking?season=${season}`));
  let playerOfficial = {};
  try { playerOfficial = await scrapePlayerRanking(season); } catch (e) { console.log(`  연맹 선수 순위를 받지 못함: ${e.message}`); }
  console.log(`[${season}시즌] 연맹 선수 순위 ${Object.keys(playerOfficial).length}명`);
  // 라운드 QOR: 연맹이 라운드마다 선정해 공개하는 선수. 화면 글자는 "24 ROUND | NO.9 강태경 | 서울시청" 순서로 나온다.
  const qor = [];
  try {
    const h = await get(`/wk-league/mvp?season=${season}`), t = tokens(h.slice(h.indexOf('<main'), h.indexOf('</main>')));
    t.forEach((x, i) => {
      const r = x.match(/^(\d+) ROUND$/), p = (t[i + 1] || '').match(/^NO\.(\d+)\s+(.+)$/);
      if (r && p) qor.push({ round: +r[1], number: +p[1], name: p[2].trim(), team: t[i + 2] });
    });
  } catch (e) { console.log(`  라운드 QOR을 받지 못함: ${e.message}`); }
  console.log(`[${season}시즌] 라운드 QOR ${qor.length}건`);
  // 지금 열려 있는(또는 가장 최근) 라운드 QOR 투표: 투표 페이지 맨 위 항목의 라운드·기간·상태
  let qorVote = null;
  try {
    const t = tokens(await get('/mvp')), i = t.findIndex((x, k) => /^\d+ 라운드 QOR$/.test(x) && t[k - 1] === `WK리그 ${season}시즌`);
    if (i >= 0) qorVote = { round: parseInt(t[i], 10), period: t[i + 1], status: t[i + 2] };
  } catch (e) { /* 투표 정보는 없어도 된다 */ }
  return { season, matches, official, playerOfficial, qor, qorVote };
}

// 선수 사진을 photos/ 폴더에 내려받고, 기록에는 내려받은 파일 경로를 넣는다 (실패하면 사진 없음)
const photoCache = new Map();
async function localPhoto(path) {
  if (!path) return null;
  if (photoCache.has(path)) return photoCache.get(path);
  const file = 'photos/' + path.split('/').pop();
  let ok = existsSync(file);
  if (!ok) {
    try {
      const res = await fetch(BASE + path, { headers: { 'User-Agent': UA } });
      if (res.ok) { await writeFile(file, Buffer.from(await res.arrayBuffer())); ok = true; }
      await sleep(300);
    } catch (e) { ok = false; }
  }
  photoCache.set(path, ok ? file : null);
  return photoCache.get(path);
}

await mkdir('data', { recursive: true });
await mkdir('photos', { recursive: true });
for (const season of seasons) {
  const data = await scrapeSeason(season);
  for (const m of data.matches) for (const side of ['home', 'away']) for (const p of (m.players && m.players[side]) || []) p.photo = await localPhoto(p.photo);
  console.log(`[${season}시즌] 선수 사진 ${[...photoCache.values()].filter(Boolean).length}장 확보, 실패 ${[...photoCache.values()].filter((v) => !v).length}장`);
  await writeFile(`data/wk-${season}.json`, JSON.stringify(data));
  console.log(`[${season}시즌] 저장: 전체 ${data.matches.length}경기`);
}

// 브라우저에서 파일을 바로 열어도 읽을 수 있게 data.js 하나로 묶는다
const all = {};
for (const f of (await readdir('data')).filter((f) => /^wk-\d+\.json$/.test(f))) {
  const d = JSON.parse(await readFile(`data/${f}`, 'utf8'));
  all[d.season] = d;
}
const hash = createHash('sha1').update(JSON.stringify(all)).digest('hex').slice(0, 12);
await writeFile('data.js', `window.WK_DATA = ${JSON.stringify({ updated: new Date().toISOString(), hash, source: BASE, seasons: all })};\n`);
console.log('\n완료: data.js 갱신');
