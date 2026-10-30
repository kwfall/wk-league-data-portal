// 데이터 검증: 수집한 경기 기록이 공식 순위표·선수 순위와 맞는지 확인한다
// 사용법: node verify.mjs [시즌 ...]   (기본 2026 2025)
import { readFile, writeFile } from 'node:fs/promises';

const seasons = process.argv.slice(2).length ? process.argv.slice(2) : ['2026', '2025'];
const UA = 'Mozilla/5.0 (wk-league-stats; personal analysis project)';
const strip = (h) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|svg)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '|').split('|').map((t) => t.trim()).filter(Boolean);
const report = {};

for (const season of seasons) {
  const d = JSON.parse(await readFile(`data/wk-${season}.json`, 'utf8'));
  const done = d.matches.filter((m) => m.finished && /^\d+R$/.test(m.round));
  const out = (report[season] = { matches: done.length });
  console.log(`\n===== ${season}시즌 (종료 ${done.length}경기) =====`);

  // 1. 경기 결과 → 순위표
  const T = {};
  for (const m of done) for (const [t, gf, ga] of [[m.home, m.homeScore, m.awayScore], [m.away, m.awayScore, m.homeScore]]) {
    const r = (T[t] ||= { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
    r.played++; r.gf += gf; r.ga += ga;
    if (gf > ga) { r.won++; r.points += 3; } else if (gf === ga) { r.drawn++; r.points++; } else r.lost++;
  }
  out.table = d.official.filter((o) => ['played', 'won', 'drawn', 'lost', 'gf', 'ga', 'points'].some((k) => (T[o.team] || {})[k] !== o[k])).map((o) => ({ team: o.team, official: o, computed: T[o.team] }));
  console.log(`1. 순위표 대조: ${out.table.length ? `불일치 ${out.table.length}팀` : `${d.official.length}팀 모두 일치`} (공식 순위표는 수집 시점 기준)`);
  for (const x of out.table) console.log('   ', x.team, JSON.stringify(x.official), JSON.stringify(x.computed));

  const detail = done.filter((m) => m.players && m.players.home.length);
  if (!detail.length) { console.log('2~5. 경기 상세 기록 없음 → 선수·득점 검사는 건너뜀'); out.detail = false; continue; }
  out.detail = true;

  // 2. 득점자 수 = 점수
  out.goalList = done.filter((m) => m.goals.home.length !== m.homeScore || m.goals.away.length !== m.awayScore).map((m) => m.id);
  console.log(`2. 득점자 수와 점수: ${out.goalList.length ? '불일치 경기 ' + out.goalList.join(', ') : '모두 일치'}`);

  // 3. 선수 득점 합 = 점수
  const own = (m, s) => m.goals[s].filter((g) => g.own).length;
  out.ownGoals = done.reduce((a, m) => a + own(m, 'home') + own(m, 'away'), 0);
  out.playerGoals = done.map((m) => ({ m, h: m.players.home.reduce((a, p) => a + p.goals, 0) + own(m, 'home'), a: m.players.away.reduce((a, p) => a + p.goals, 0) + own(m, 'away') })).filter((x) => x.h !== x.m.homeScore || x.a !== x.m.awayScore)
    .map(({ m, h, a }) => ({ id: m.id, round: m.round, date: m.datetime.slice(0, 10), match: `${m.home} ${m.homeScore}:${m.awayScore} ${m.away}`, playerSum: `${h}:${a}` }));
  console.log(`3. 선수 득점 합 + 자책골(${out.ownGoals}골)과 점수: ${out.playerGoals.length ? `불일치 ${out.playerGoals.length}경기` : '모두 일치'}`);
  for (const x of out.playerGoals) console.log(`    ${x.id} ${x.round} ${x.date} ${x.match} (선수 합 ${x.playerSum})`);

  // 4. 공식 선수 순위와 대조 (출전은 출전 시간 > 0 기준)
  const P = {};
  for (const m of done) for (const s of ['home', 'away']) for (const p of m.players[s]) {
    const a = (P[`${m[s]}|${p.name}|${p.number}`] ||= { squad: 0, apps: 0, minutes: 0, goals: 0, assists: 0, shots: 0 });
    a.squad++; // 공식 사이트의 '출전'은 0분 경기까지 포함한 명단 포함 횟수다
    if (!p.minutes) continue;
    a.apps++; a.minutes += p.minutes; a.goals += p.goals; a.assists += p.assists; a.shots += p.shots;
  }
  try {
    const html = await (await fetch(`https://www.kwff.or.kr/wk-league/ranking/players?season=${season}`, { headers: { 'User-Agent': UA } })).text();
    const rows = html.slice(html.indexOf('<tbody'), html.indexOf('</tbody>')).split('<tr').slice(1).map((r) => strip('<tr' + r));
    out.players = [];
    for (const t of rows) {
      // [순위, 포지션, 이름, #번호, 팀, 출전, 출전시간, 득점, 도움, 공격P, 슈팅, …]
      const [, , name, no, team, apps, min, goals, assists, , shots] = t;
      const mine = P[`${team}|${name}|${(no || '').replace('#', '')}`];
      const off = { squad: +apps, minutes: parseInt(min, 10), goals: +goals, assists: +assists, shots: +shots };
      if (!mine) { out.players.push({ name, team, issue: '수집 기록에서 찾지 못함' }); continue; }
      const diff = Object.keys(off).filter((k) => off[k] !== mine[k]);
      if (diff.length) out.players.push({ name, team, diff: Object.fromEntries(diff.map((k) => [k, { official: off[k], computed: mine[k] }])) });
    }
    const core = out.players.filter((x) => x.issue || ['squad', 'goals', 'assists', 'shots'].some((k) => x.diff[k]));
    console.log(`4. 공식 선수 순위 대조: ${rows.length}명 중 명단 포함 횟수·득점·도움·슈팅 불일치 ${core.length}명, 출전 시간만 다른 선수 ${out.players.length - core.length}명`);
    for (const x of out.players) console.log('   ', x.name, x.team, x.issue || JSON.stringify(x.diff));
  } catch (e) { console.log('4. 공식 선수 순위 대조: 연맹 사이트 접속 실패로 건너뜀 —', e.message); out.players = null; }

  // 5. 같은 팀·같은 이름·다른 등번호
  const names = {};
  for (const k of Object.keys(P).filter((k) => P[k].apps)) { const [team, name, no] = k.split('|'); (names[`${team}|${name}`] ||= []).push(no); }
  out.sameName = Object.entries(names).filter(([, v]) => v.length > 1).map(([k, v]) => `${k.replace('|', ' ')} (${v.join(', ')}번)`);
  console.log(`5. 같은 팀·같은 이름·다른 번호: ${out.sameName.length ? out.sameName.join(' / ') : '없음'}`);
}
await writeFile('data/verify-report.json', JSON.stringify({ checkedAt: new Date().toISOString(), report }, null, 1));
console.log('\n보고서 저장: data/verify-report.json');
