// WK리그 과거 시즌(2009~2024) 최종 순위표 수집기
// (위키백과의 경기별 결과표는 순위표와 어긋나는 시즌이 있어 쓰지 않는다)
// 사용법: node scrape-history.mjs
// 출처: 영어 위키백과 시즌 문서 (CC BY-SA 4.0) — 화면에 출처를 표기해야 합니다.
import { writeFile } from 'node:fs/promises';

const UA = 'wk-league-stats (personal analysis project)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 연고 이전·팀명 변경을 하나의 구단으로 묶는다
const CLUBS = [
  ['hyundai', /Hyundai Steel/, '인천현대제철'],
  ['seoul', /Seoul/, '서울시청'],
  ['suwon', /Suwon/, '수원FC위민'],
  ['kspo', /KSPO/, '화천KSPO'],
  ['toto', /Sportstoto/, '세종스포츠토토'],
  ['sangmu', /Sangmu/, '상무여자축구단'],
  ['khnp', /Hydro/, '경주한수원WFC'],
  ['gangjin', /Changnyeong|Gangjin/, '강진SWANSWFC'],
  ['daekyo', /Daekyo/, '대교 (해체)'],
  ['ilhwa', /Ilhwa/, '충남일화 (해체)'],
];
const clubOf = (name) => (CLUBS.find(([, re]) => re.test(name)) || [])[0];

async function raw(title) {
  const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${title}&action=raw`, { headers: { 'User-Agent': UA } });
  await sleep(700);
  return res.ok ? res.text() : null;
}

const seasons = {};
for (let y = 2009; y <= 2024; y++) {
  const t = (await raw(`${y}_WK_League`)) || (await raw(`${y}_WK-League`));
  if (!t) { console.log(y, '문서 없음'); continue; }

  const start = t.search(/\{\{#invoke:\s*sports table/i);
  const block = t.slice(start, t.indexOf('\n}}', start));
  const order = [...block.matchAll(/\|\s*team\d+\s*=\s*(\w+)/g)].map((m) => m[1]);
  const names = Object.fromEntries([...t.matchAll(/\|\s*name_(\w+)\s*=\s*([^\n]*)/g)].map((m) => [m[1], m[2]]));
  const val = (k, c) => +((block.match(new RegExp(`\\|\\s*${k}_${c}\\s*=\\s*(-?\\d+)`)) || [])[1] ?? 0);

  const table = order.map((c, i) => {
    const w = val('win', c), d = val('draw', c), l = val('loss', c);
    return { rank: i + 1, club: clubOf(names[c] || ''), p: w + d + l, w, d, l, gf: val('gf', c), ga: val('ga', c), pts: w * 3 + d };
  });

  const champion = clubOf((t.match(/\|\s*winners\s*=\s*([^\n]*)/) || [])[1] || '');
  seasons[y] = { table, champion };
  console.log(y, `${order.length}팀`, '우승', champion, table.some((r) => !r.club) ? '!! 미분류 팀 있음' : '');
}

const out = {
  source: 'English Wikipedia — WK League season articles',
  license: 'CC BY-SA 4.0',
  clubs: Object.fromEntries(CLUBS.map(([id, , name]) => [id, name])),
  seasons,
};
await writeFile('history.js', `window.WK_HISTORY = ${JSON.stringify(out)};\n`);
console.log('완료: history.js 저장');
