// 해외 리그에서 뛰는 한국 선수 수집기
// 범위 1: 영어 위키백과 '대한민국 여자 축구 국가대표팀' 문서의 현재 명단과 최근 12개월 소집 명단에서
//         소속 구단이 한국이 아닌 선수.
// 범위 2: 영어 위키백과 'South Korean women's footballers' 분류의 선수 문서 중, 현재 구단이 적혀 있고
//         경력 표의 마지막 줄이 끝나지 않았으며(예: 2025–), 그 구단의 나라가 한국이 아닌 선수.
//         구단의 나라·리그와 한글·일본어 이름은 위키데이터에서 가져온다.
// 문서에 없는 값은 비워 둔다. 위키백과 문서가 없는 해외파 선수는 범위 1에 있을 때만 잡힌다.
// 사용법: node scrape-abroad.mjs
// 출처: 영어 위키백과 (CC BY-SA 4.0), 위키데이터 (CC0) — 화면에 출처를 표기해야 합니다.
import { writeFile } from 'node:fs/promises';

const UA = 'wk-league-stats (personal analysis project)';
const PAGE = "South_Korea_women's_national_football_team", CAT = "Category:South Korean women's footballers";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = (title) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const api = async (host, params) => { const res = await fetch(`https://${host}/w/api.php?${new URLSearchParams(Object.fromEntries(Object.entries({ format: 'json', ...params }).filter(([k, v]) => v !== undefined && k !== '_try')))}`, { headers: { 'User-Agent': UA } }); await sleep(500); if (res.status === 429 && (params._try || 0) < 5) { await sleep(8000 * ((params._try || 0) + 1)); return api(host, { ...params, _try: (params._try || 0) + 1 }); } if (!res.ok) throw new Error(`${host} ${res.status}`); return res.json(); };

async function raw(title) {
  const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title.replace(/ /g, '_'))}&action=raw&redirects=1`, { headers: { 'User-Agent': UA } });
  await sleep(600);
  if (!res.ok) return null;
  const t = await res.text(), re = t.match(/^#REDIRECT\s*\[\[([^\]|#]+)/i);
  return re ? raw(re[1]) : t;
}

// 위키 문법을 걷어 내고 보이는 글자만 남긴다
const plain = (s) => (s || '')
  .replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\{\{sortname\|([^|}]*)\|([^|}]*)[^}]*\}\}/gi, '$1 $2')
  .replace(/\{\{(?:nowrap|small|nobr)\|([^{}]*)\}\}/gi, '$1')
  .replace(/\{\{fbw\|([A-Z]{3})\}\}/g, '$1').replace(/\{\{(?:loan|→)\}\}/gi, '→ ').replace(/\{\{[^{}]*\}\}/g, '')
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,}/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const link = (s) => { const m = (s || '').match(/\[\[(?!:)([^\]|#]+)/), n = (s || '').match(/\{\{sortname\|([^|}]*)\|([^|}]*)(?:\|([^|}=]+))?/i); return m ? m[1].trim() : n ? (n[3] || `${n[1]} ${n[2]}`).trim() : null; };
// 틀 안의 '| 이름 = 값' 을 읽는다 (값 안의 [[a|b]], {{a|b}} 속 세로줄은 건너뛴다)
function fields(body) {
  const out = {}; let depth = 0, cur = ''; const parts = [];
  for (let i = 0; i < body.length; i++) {
    const two = body.substr(i, 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; } else if (two === '}}' || two === ']]') { depth--; cur += two; i++; } else if (body[i] === '|' && depth === 0) { parts.push(cur); cur = ''; } else cur += body[i];
  }
  parts.push(cur);
  for (const p of parts) { const k = p.indexOf('='); if (k > 0) out[p.slice(0, k).trim()] = p.slice(k + 1).trim(); }
  return out;
}
function infobox(t) {
  const s = t.search(/\{\{\s*Infobox football biography/i) >= 0 ? t.search(/\{\{\s*Infobox football biography/i) : t.search(/\{\{\s*Infobox/i); if (s < 0) return {};
  let depth = 0, i = s; for (; i < t.length; i++) { const two = t.substr(i, 2); if (two === '{{') { depth++; i++; } else if (two === '}}') { depth--; i++; if (!depth) break; } }
  return fields(t.slice(s + 2, i - 1));
}
const posOf = (s) => (/goalkeeper/i.test(s) ? 'GK' : /forward|striker|winger|attacker/i.test(s) ? 'FW' : /midfield/i.test(s) ? 'MF' : /defen|back/i.test(s) ? 'DF' : null);
const bornOf = (s) => { const b = (s || '').match(/(\d{4})\|(\d{1,2})\|(\d{1,2})/); return b ? `${b[1]}-${b[2].padStart(2, '0')}-${b[3].padStart(2, '0')}` : null; };
const hangulOf = (w) => { for (const m of w.matchAll(/(?:\|\s*hangul\s*=\s*|\{\{(?:lang-ko|langx\|ko|lang\|ko|Korean)\|)([^|}\n]*)/gi)) { const v = (m[1].match(/[가-힣]+/g) || []).join(''); if (v) return v; } return ''; };
// 한국 안의 팀(실업·대학·고교)이면 해외파가 아니다
const DOMESTIC = /Hyundai Steel|Seoul|Suwon|KSPO|Sportstoto|Sangmu|Hydro|KHNP|Incheon|Changnyeong|Gangjin|Daekyo|Ilhwa|Chungbuk|Busan|Boeun|Gumi|Icheon|Goyang|Hwacheon|University|College|High School/i;

// 선수 문서의 정보 상자에서 경력과 대표팀 기록을 읽는다
function readPlayer(w) {
  const f = infobox(w), career = [];
  for (let i = 1; i <= 30; i++) {
    if (!f[`clubs${i}`]) continue;
    const cap = plain(f[`caps${i}`]), gl = plain(f[`goals${i}`]);
    career.push({ years: plain(f[`years${i}`]).replace(/[-–—]+/g, '–'), club: plain(f[`clubs${i}`]), caps: /^\d+$/.test(cap) ? +cap : null, goals: /^\d+$/.test(gl) ? +gl : null });
  }
  let caps = null, goals = null;
  for (let i = 1; i <= 12; i++) if (plain(f[`nationalteam${i}`]) === 'South Korea') { const c = plain(f[`nationalcaps${i}`]), g = plain(f[`nationalgoals${i}`]); caps = /^\d+$/.test(c) ? +c : null; goals = /^\d+$/.test(g) ? +g : null; }
  return { f, image: plain(f.image).replace(/^(File|Image):/i, '') || null, career, caps, goals, number: plain(f.clubnumber) || null, careerAsOf: plain(f['club-update'] || f.pcupdate || '') || null, ntAsOf: plain(f['nationalteam-update'] || f.ntupdate || '') || null };
}

// 1) 대표팀 문서
const t = await raw(PAGE);
if (!t) throw new Error('대표팀 문서를 가져오지 못했습니다');
const asOf = plain((t.match(/Caps and goals correct as of ([^.<\n]*)/) || [])[1] || '').replace(/[,:]\s*$/, '');
const players = [], listed = new Set();
for (const m of t.matchAll(/\{\{nat fs (g|r) player\s*\|([\s\S]*?)\}\}\s*(<sup>[^<]*<\/sup>)?\n/g)) {
  const f = fields(m[2]), page = link(f.name);
  if (page) listed.add(page);
  if (!f.clubnat || f.clubnat.trim() === 'KOR') continue;
  const nameText = plain(f.name);
  const ko = (nameText.match(/\(([^)]*[가-힣][^)]*)\)/) || [])[1] || '', en = nameText.replace(/\s*\([^)]*\)\s*$/, '').trim();
  players.push({
    ko, en, pos: f.pos, born: bornOf(f.age), caps: f.caps === undefined ? null : +f.caps, goals: f.goals === undefined ? null : +f.goals, capsAsOf: null,
    club: plain(f.club), clubPage: link(f.club), nat: f.clubnat.trim(), nt: true,
    current: m[1] === 'g', latest: m[1] === 'g' ? null : plain(f.latest) || null,
    page, number: null, career: [], careerAsOf: null,
  });
}
console.log(`대표팀 문서: 해외 구단 소속 ${players.length}명`);
for (const p of players) {
  if (!p.page) continue;
  const w = await raw(p.page);
  if (!w) { p.page = null; continue; }
  const r = readPlayer(w); p.number = r.number; p.career = r.career; p.careerAsOf = r.careerAsOf; p.image = r.image;
}

// 2) 선수 분류: 문서 내용을 50개씩 받아 현재 구단이 해외인 선수를 고른다
const seen = new Set(players.map((p) => p.page).filter(Boolean));
let cont = {}, total = 0; const cand = [];
do {
  const j = await api('en.wikipedia.org', { action: 'query', formatversion: '2', generator: 'categorymembers', gcmtitle: CAT, gcmtype: 'page', gcmlimit: '50', prop: 'revisions', rvprop: 'content', rvslots: 'main', ...cont });
  for (const pg of j.query?.pages || []) {
    total++;
    const w = pg.revisions?.[0]?.slots?.main?.content; if (!w || seen.has(pg.title) || listed.has(pg.title)) continue;
    const r = readPlayer(w), cur = r.f.currentclub;
    if (!cur || !plain(cur) || DOMESTIC.test(plain(cur))) continue;
    const last = r.career[r.career.length - 1];
    if (!last || !/–\s*$/.test(last.years)) continue; // 경력 마지막 줄이 끝난 선수(은퇴·무소속)는 뺀다
    if (!link(cur)) { console.log(`  제외(구단 문서 없음, 나라 확인 불가): ${pg.title} · ${plain(cur)}`); continue; }
    cand.push({ ko: hangulOf(w), en: pg.title.replace(/\s*\([^)]*\)$/, ''), pos: posOf(plain(r.f.position)), born: bornOf(r.f.birth_date), caps: r.caps, goals: r.goals, capsAsOf: r.ntAsOf,
      club: plain(cur), clubPage: link(cur), nat: null, nt: false, current: false, latest: null, page: pg.title, number: r.number, career: r.career, careerAsOf: r.careerAsOf, image: r.image });
  }
  cont = j.continue || null;
} while (cont);
console.log(`선수 분류: 문서 ${total}개 중 해외 구단 후보 ${cand.length}명`);

// 3) 위키데이터: 구단의 나라·리그와 한글·일본어 이름
const all = players.concat(cand), clubPages = [...new Set(all.map((p) => p.clubPage).filter((c) => c && !c.includes(':')))], club = {}, ids = new Set();
const pick = (claims, prop) => { const c = (claims?.[prop] || []).filter((x) => x.mainsnak?.datavalue && x.rank !== 'deprecated'); const pref = c.filter((x) => x.rank === 'preferred'); const use = pref.length ? pref : c.filter((x) => !x.qualifiers?.P582); return use.length === 1 ? use[0].mainsnak.datavalue.value.id : null; };
const labels = (e) => (e ? { ko: e.labels?.ko?.value || null, en: e.labels?.en?.value || null, ja: e.labels?.ja?.value || null } : null);
for (let i = 0; i < clubPages.length; i += 40) {
  const j = await api('www.wikidata.org', { action: 'wbgetentities', sites: 'enwiki', titles: clubPages.slice(i, i + 40).join('|'), props: 'claims|labels|sitelinks', languages: 'ko|en|ja', sitefilter: 'enwiki' });
  for (const e of Object.values(j.entities || {})) { const title = e.sitelinks?.enwiki?.title; if (!title) continue; const c = { names: labels(e), country: pick(e.claims, 'P17'), league: pick(e.claims, 'P118') }; club[title] = c; if (c.country) ids.add(c.country); if (c.league) ids.add(c.league); }
}
const ent = {}, idList = [...ids];
for (let i = 0; i < idList.length; i += 40) { const j = await api('www.wikidata.org', { action: 'wbgetentities', ids: idList.slice(i, i + 40).join('|'), props: 'labels', languages: 'ko|en|ja' }); for (const [id, e] of Object.entries(j.entities || {})) ent[id] = labels(e); }
const playerPages = all.map((p) => p.page).filter(Boolean), pname = {};
for (let i = 0; i < playerPages.length; i += 40) { const j = await api('www.wikidata.org', { action: 'wbgetentities', sites: 'enwiki', titles: playerPages.slice(i, i + 40).join('|'), props: 'labels|sitelinks', languages: 'ko|ja', sitefilter: 'enwiki' }); for (const e of Object.values(j.entities || {})) if (e.sitelinks?.enwiki) pname[e.sitelinks.enwiki.title] = labels(e); }
const bare = (s) => (s || '').replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim() || null;
for (const p of all) { const n = p.page && pname[p.page]; p.ko = p.ko || (n && /[가-힣]/.test(n.ko || '') ? bare(n.ko) : '') || ''; p.ja = n && /[぀-ヿ]/.test(n.ja || '') ? bare(n.ja) : null; }
// 구단 문서의 정보 상자에 적힌 리그(없으면 위키데이터의 리그)
const leagueOf = {};
for (const p of all) {
  // 분류에서 찾은 선수는 구단의 나라가 확인되고 한국이 아닐 때만 남긴다
  const c = p.clubPage && (club[p.clubPage] || Object.entries(club).find(([k]) => k.toLowerCase() === p.clubPage.toLowerCase())?.[1]);
  p.country = c?.country ? ent[c.country] : null; p.clubNames = c?.names || null;
  if (!p.nt && (!p.country || p.country.en === 'South Korea')) { p.drop = true; if (!p.country) console.log(`  제외(구단의 나라 확인 불가): ${p.page} · ${p.club}`); continue; }
  if (p.clubPage && !p.clubPage.includes(':') && !(p.clubPage in leagueOf)) { const w = await raw(p.clubPage), f = w ? infobox(w) : {}; leagueOf[p.clubPage] = f.league && plain(f.league) ? plain(f.league) : null; }
  p.league = (p.clubPage && leagueOf[p.clubPage]) || null; p.leagueFrom = p.league ? 'wikipedia' : null; p.leagueNames = null;
  if (!p.league && c?.league && ent[c.league]) { p.league = ent[c.league].en; p.leagueNames = ent[c.league]; p.leagueFrom = 'wikidata'; }
  p.src = p.page ? url(p.page) : null; p.clubSrc = p.clubPage && !p.clubPage.includes(':') ? url(p.clubPage) : null;
}
const out = all.filter((p) => !p.drop).map(({ drop, ...p }) => p);

for (const p of out) delete p.image; // 해외파 화면에는 사진을 쓰지 않는다
for (const p of out) console.log(`${p.nt ? '대표' : '분류'} · ${p.ko || p.en} · ${p.club} (${p.nat || p.country?.en || '?'}) · ${p.league || '리그 없음'} · 경력 ${p.career.length}줄`);

const data = { updated: new Date().toISOString(), source: url(PAGE), category: url(CAT), by: 'Wikipedia (CC BY-SA 4.0), Wikidata (CC0)', capsAsOf: asOf || null, players: out };
await writeFile('abroad.js', '// scrape-abroad.mjs 가 만든 파일입니다. 직접 고치지 마세요.\nwindow.WK_ABROAD = ' + JSON.stringify(data, null, 1) + ';\n');
console.log(`abroad.js 저장 (${out.length}명)`);
