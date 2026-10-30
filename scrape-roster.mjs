// 선수 기본 정보 수집기
// 1) 연맹(KWFF) 구단 선수단 페이지: 등번호, 포지션, 통산 출전·득점·도움 (연맹이 집계한 값 그대로)
// 2) 영어 위키백과 '대한민국 여자 축구 국가대표팀' 문서: 최근 12개월 대표팀 소집 선수의 생년월일
// 연맹 공개 페이지에는 키·몸무게·생년월일이 없다. 없는 값은 넣지 않는다.
// 사용법: node scrape-roster.mjs
import { writeFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) wk-league-stats personal analysis project';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 연맹 구단 이름 → 이 사이트의 팀 이름
const TEAM = [[/강진/, '강진SWANSWFC'], [/경주/, '경주한수원WFC'], [/화천/, '화천KSPO'], [/인천/, '인천현대제철'], [/상무/, '상무여자축구단'], [/세종/, '세종스포츠토토'], [/서울/, '서울시청'], [/수원/, '수원FC위민']];
const WKCLUB = [[/Hyundai Steel|Incheon/, '인천현대제철'], [/Seoul/, '서울시청'], [/Suwon/, '수원FC위민'], [/KSPO/, '화천KSPO'], [/Sportstoto/, '세종스포츠토토'], [/Sangmu/, '상무여자축구단'], [/Hydro|KHNP/, '경주한수원WFC'], [/Gangjin/, '강진SWANSWFC']];
const find = (list, s) => (list.find(([re]) => re.test(s)) || [])[1];

const players = {};
for (let id = 1; id <= 8; id++) {
  const res = await fetch(`https://www.kwff.or.kr/wk-league/clubs/${id}/roster`, { headers: { 'User-Agent': UA } });
  await sleep(800);
  if (!res.ok) { console.log(`구단 ${id}: 가져오지 못함 (${res.status})`); continue; }
  const h = await res.text(), name = (h.match(/<option\s+value="\d+"\s+selected[^>]*>\s*([^<]+?)\s*</) || [])[1] || '', team = find(TEAM, name);
  if (!team) { console.log(`구단 ${id}: 팀 이름을 알 수 없음 (${name})`); continue; }
  let n = 0;
  for (const m of h.matchAll(/<button[^>]*class="record-btn[^>]*>/g)) {
    const a = Object.fromEntries([...m[0].matchAll(/data-([a-z-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    const nm = (a.name || '').match(/^NO\.(\d+)\s+(.+)$/); if (!nm) continue;
    const num = (v) => (/^\d+$/.test(v || '') ? +v : null);
    players[`${team}|${nm[2].trim()}|${+nm[1]}`] = { position: a.position || null, totalApps: num(a['total-ap']), totalGoals: num(a['total-goals']), totalAssists: num(a['total-assists']) };
    n++;
  }
  console.log(`${team}: ${n}명`);
}

// 생년월일: 위키백과 대표팀 문서의 명단(한국 구단 소속)
let born = 0, source = "https://en.wikipedia.org/wiki/South_Korea_women's_national_football_team";
try {
  const res = await fetch("https://en.wikipedia.org/w/index.php?title=South_Korea_women%27s_national_football_team&action=raw", { headers: { 'User-Agent': UA } });
  const t = await res.text();
  for (const m of t.matchAll(/\{\{nat fs (?:g|r) player\s*\|([\s\S]*?)\}\}\s*(?:<sup>[^<]*<\/sup>)?\n/g)) {
    const row = m[1], ko = ((row.match(/\|\s*name\s*=([^\n]*?)\|\s*age/) || [])[1] || '').match(/[가-힣]{2,}/g), b = row.match(/birth date and age\|(\d{4})\|(\d{1,2})\|(\d{1,2})/), team = find(WKCLUB, (row.match(/\|\s*club\s*=([^\n]*)/) || [])[1] || '');
    if (!ko || !b || !team || !/clubnat\s*=\s*KOR/.test(row)) continue;
    const keys = Object.keys(players).filter((k) => k.startsWith(`${team}|${ko[ko.length - 1]}|`));
    if (keys.length !== 1) continue; // 같은 팀에 같은 이름이 둘이면 누구인지 알 수 없어 넣지 않는다
    players[keys[0]].born = `${b[1]}-${b[2].padStart(2, '0')}-${b[3].padStart(2, '0')}`; born++;
  }
} catch (e) { console.log('생년월일: 위키백과를 가져오지 못했습니다', e.message); }

const out = { updated: new Date().toISOString(), source: 'https://www.kwff.or.kr/wk-league/clubs', bornSource: source, players };
await writeFile('roster.js', '// scrape-roster.mjs 가 만든 파일입니다. 직접 고치지 마세요.\nwindow.WK_ROSTER = ' + JSON.stringify(out, null, 1) + ';\n');
console.log(`roster.js 저장 (선수 ${Object.keys(players).length}명, 생년월일 ${born}명)`);
