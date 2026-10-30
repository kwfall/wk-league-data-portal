// 실시간 갱신: 켜 두면 경기 일정에 맞춰 연맹 기록을 알아서 다시 수집한다 (실시간_갱신.bat 으로 실행)
//   경기 시작 30분 전 ~ 시작 후 3시간: 3분마다
//   24시간 안에 경기가 있으면: 30분마다, 그 밖에는 1시간마다
//   뉴스(scrape-news)는 확인할 때마다, 선수 정보(scrape-roster)와 해외파(scrape-abroad)는 하루에 한 번
// 사이트(index.html)는 열어 둔 채로 1분마다 data.js 가 바뀌었는지 확인해 화면을 다시 그린다.
// 끄려면 이 창을 닫거나 Ctrl+C 를 누른다.
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEASON = process.argv[2] || String(new Date().getFullYear());
const MIN = 60 * 1000, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toLocaleString('ko-KR', { hour12: false });

function run(file, args = []) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [file, ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });
}

// data.js 에서 경기 시각(한국 시간)을 읽어 다음 확인까지 기다릴 시간을 정한다
async function nextWait() {
  try {
    const w = {}; new Function('window', await readFile(path.join(ROOT, 'data.js'), 'utf8'))(w);
    const s = w.WK_DATA.seasons[SEASON], t = Date.now();
    const kicks = (s ? s.matches : []).filter((m) => !m.finished).map((m) => new Date(m.datetime + ':00+09:00').getTime());
    if (kicks.some((k) => t >= k - 30 * MIN && t <= k + 180 * MIN)) return [3 * MIN, '경기 시간대'];
    if (kicks.some((k) => k > t && k - t <= 24 * 60 * MIN)) return [30 * MIN, '24시간 안에 경기 있음'];
    return [60 * MIN, '가까운 경기 없음'];
  } catch (e) { return [30 * MIN, 'data.js 를 읽지 못함']; }
}

let lastDaily = 0;
console.log(`실시간 갱신을 시작합니다 (${SEASON}시즌). 이 창을 닫으면 멈춥니다.\n`);
for (;;) {
  const r = await run('scrape.mjs', [SEASON]);
  const fin = (r.out.match(/종료 (\d+)경기/) || [])[1], got = (r.out.match(/(\d+)경기 받음/g) || []).pop();
  console.log(`[${now()}] 기록 수집 ${r.code === 0 ? '완료' : '실패'}${fin ? ` · 종료 경기 ${fin}` : ''}${got ? ` · 새로 ${got}` : ''}`);
  if (r.code !== 0) console.log(r.out.split('\n').slice(-6).join('\n'));
  const nw = await run('scrape-news.mjs');
  console.log(`[${now()}] 뉴스 ${nw.code === 0 ? (nw.out.match(/(\d+)건/) || [])[0] || '완료' : '실패'}`);
  if (Date.now() - lastDaily > 24 * 60 * MIN) {
    for (const f of ['scrape-roster.mjs', 'scrape-abroad.mjs']) { const x = await run(f); console.log(`[${now()}] ${f} ${x.code === 0 ? '완료' : '실패'}`); }
    lastDaily = Date.now();
  }
  const [wait, why] = await nextWait();
  console.log(`   다음 확인: ${Math.round(wait / MIN)}분 뒤 (${why})`);
  await sleep(wait);
}
