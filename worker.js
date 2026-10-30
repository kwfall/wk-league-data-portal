// Cloudflare Worker: 사이트 파일은 그대로 내보내고, /admin 만 비밀번호를 물은 뒤 관리자 화면을 보여 준다.
// 30분마다 GitHub 에 "기록을 다시 모아 배포하라"는 신호도 보낸다 (GitHub 자체 예약 실행이 자주 건너뛰어서).
// 필요한 비밀 값 (Cloudflare 대시보드 → Workers & Pages → wk-league-data → Settings → Variables and Secrets):
//   ADMIN_PASSWORD      : 관리자 화면 비밀번호 (아이디는 아무거나)
//   CF_ANALYTICS_TOKEN  : 방문 통계를 읽는 열쇠 (권한: Account → Account Analytics → Read)
//   GH_TOKEN            : GitHub 열쇠 (저장소 wk-league-data-portal 의 Actions: Read and write)
import { renderAdmin, page, rangeFrom, RANGES } from './admin-view.mjs';

const ACCOUNT = '9a6f0e2c70195ca71eed3f6a4228cc25';
const HOST = 'wk-league-data.kwfall.workers.dev';
const REPO = 'kwfall/wk-league-data-portal';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/_admin.json') return new Response('Not found', { status: 404 }); // 요약 파일은 관리자 화면 안에서만 읽는다
    if (url.pathname === '/api/track') return track(req, env);
    if (!url.pathname.startsWith('/admin')) return env.ASSETS.fetch(req);
    if (!env.ADMIN_PASSWORD) return html(page('<h1>관리자 비밀번호가 아직 설정되지 않았습니다</h1><p>Cloudflare 대시보드에서 ADMIN_PASSWORD 비밀 값을 먼저 넣어 주세요.</p>'), 503);
    if (!(await authorized(req, env.ADMIN_PASSWORD))) {
      return new Response('비밀번호가 필요합니다.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="WK League Data admin", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    const range = RANGES[url.searchParams.get('range')] ? url.searchParams.get('range') : 'week';
    const [V, rum, summary] = await Promise.all([visits(env), analytics(env, range), readSummary(env, req)]);
    return html(renderAdmin({ rows: V.rows || [], rowsError: V.error || null, rum, summary, range, host: HOST }));
  },
  // 30분마다: GitHub Actions 의 '기록 갱신과 배포'를 실행시킨다
  async scheduled(event, env, ctx) {
    if (!env.GH_TOKEN) return;
    ctx.waitUntil(fetch(`https://api.github.com/repos/${REPO}/actions/workflows/site.yml/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'wk-league-data-worker', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ ref: 'main' }),
    }));
  },
};

const html = (body, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

// 방문 기록 받기: 화면 이름, 머문 초, 기기, 언어, 본 선수·팀·경기, 들어온 곳 + Cloudflare 가 알려 주는 나라·시도. IP 는 저장하지 않는다.
async function track(req, env) {
  const ok = new Response(null, { status: 204 });
  if (req.method !== 'POST' || !env.EVENTS) return ok;
  try {
    const b = JSON.parse((await req.text()).slice(0, 500));
    const pg = /^[a-z]{1,12}$/.test(b.p) ? b.p : 'other', secs = Math.max(0, Math.min(1800, Number(b.s) || 0));
    const visit = /^[a-z0-9]{6,16}$/.test(b.v) ? b.v : 'none', mode = b.m === 'mobile' ? 'mobile' : 'pc', lang = ['ko', 'en', 'ja'].includes(b.l) ? b.l : 'ko';
    const detail = String(b.d || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 80), ref = /^[a-z0-9.-]{1,80}$/i.test(b.r || '') ? b.r.toLowerCase() : '';
    const cf = req.cf || {}, ua = req.headers.get('User-Agent') || '', device = /Mobi|Android|iPhone/i.test(ua) ? '휴대폰' : /iPad|Tablet/i.test(ua) ? '태블릿' : '컴퓨터';
    env.EVENTS.writeDataPoint({ indexes: [pg], blobs: [pg, cf.country || '?', cf.region || '?', device, mode, visit, lang, detail, ref], doubles: [secs] });
  } catch (e) { /* 잘못된 요청은 버린다 */ }
  return ok;
}

// 쌓인 방문 기록 읽기 (Analytics Engine SQL, 보관 기간 약 3개월 전부)
async function visits(env) {
  if (!env.CF_ANALYTICS_TOKEN) return { error: '방문 통계 열쇠(CF_ANALYTICS_TOKEN)가 없습니다.' };
  const sql = "SELECT timestamp, blob1 AS page, blob2 AS country, blob3 AS region, blob4 AS device, blob5 AS mode, blob6 AS visit, blob8 AS detail, blob9 AS ref, double1 AS secs FROM wk_events WHERE timestamp > NOW() - INTERVAL '92' DAY ORDER BY timestamp DESC LIMIT 50000 FORMAT JSON";
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/analytics_engine/sql`, { method: 'POST', headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}` }, body: sql });
    const text = await r.text();
    if (!r.ok) return { error: /does not exist|unknown table/i.test(text) ? 'empty' : `방문 기록을 읽지 못했습니다 (${r.status}): ${text.slice(0, 200)}` };
    return { rows: JSON.parse(text).data || [] };
  } catch (e) { return { error: '방문 기록을 읽지 못했습니다: ' + e.message }; }
}

// Cloudflare Web Analytics (사이트 전체 방문 수)
async function analytics(env, range) {
  if (!env.CF_ANALYTICS_TOKEN) return { error: '방문 통계 열쇠(CF_ANALYTICS_TOKEN)가 없습니다.' };
  const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const f = `filter: { date_geq: "${rangeFrom(range)}", date_leq: "${today}", requestHost: "${HOST}" }`;
  const q = `{ viewer { accounts(filter: { accountTag: "${ACCOUNT}" }) {
    byDate: rumPageloadEventsAdaptiveGroups(limit: 100, ${f}, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
    byCountry: rumPageloadEventsAdaptiveGroups(limit: 10, ${f}, orderBy: [count_DESC]) { count dimensions { countryName } }
    byBrowser: rumPageloadEventsAdaptiveGroups(limit: 10, ${f}, orderBy: [count_DESC]) { count dimensions { userAgentBrowser } }
  } } }`;
  try {
    const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
    const j = await r.json();
    if (j.errors && j.errors.length) return { error: '통계를 읽지 못했습니다: ' + j.errors.map((e) => e.message).join(' / ') };
    return j.data.viewer.accounts[0] || { error: '계정 자료가 비어 있습니다.' };
  } catch (e) { return { error: '통계를 읽지 못했습니다: ' + e.message }; }
}

// 배포할 때 만든 관리자용 요약(_admin.json)
async function readSummary(env, req) {
  try { return await (await env.ASSETS.fetch(new Request(new URL('/_admin.json', req.url)))).json(); } catch (e) { return null; }
}

// 비밀번호 확인: 해시를 끝까지 비교한다 (글자 하나씩 비교하면 시간 차이로 새어 나갈 수 있어서)
async function authorized(req, password) {
  const h = req.headers.get('Authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let given = '';
  try { given = new TextDecoder().decode(Uint8Array.from(atob(h.slice(6)), (c) => c.charCodeAt(0))).split(':').slice(1).join(':'); } catch (e) { return false; }
  const enc = new TextEncoder(), [a, b] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(given)), crypto.subtle.digest('SHA-256', enc.encode(password))]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0; for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
