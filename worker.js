// Cloudflare Worker: 사이트 파일은 그대로 내보내고, /admin 만 비밀번호를 물은 뒤 관리자 화면을 보여 준다.
// 필요한 비밀 값 (Cloudflare 대시보드 → Workers & Pages → wk-league-data → Settings → Variables and Secrets):
//   ADMIN_PASSWORD      : 관리자 화면 비밀번호 (아이디는 아무거나)
//   CF_ANALYTICS_TOKEN  : 방문 통계를 읽는 열쇠 (권한: Account → Account Analytics → Read)
const ACCOUNT = '9a6f0e2c70195ca71eed3f6a4228cc25';
const HOST = 'wk-league-data.kwfall.workers.dev';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/_admin.json') return new Response('Not found', { status: 404 }); // 요약 파일은 관리자 화면 안에서만 읽는다
    if (!url.pathname.startsWith('/admin')) return env.ASSETS.fetch(req);
    if (!env.ADMIN_PASSWORD) return page('관리자 비밀번호가 아직 설정되지 않았습니다', '<p>Cloudflare 대시보드에서 ADMIN_PASSWORD 비밀 값을 먼저 넣어 주세요.</p>', 503);
    if (!(await authorized(req, env.ADMIN_PASSWORD))) {
      return new Response('비밀번호가 필요합니다.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="WK League Data admin", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    return dashboard(req, env, url);
  },
};

// 비밀번호 확인: 같은 길이로 맞춰 해시를 비교한다 (글자 하나씩 비교하면 시간 차이로 새어 나갈 수 있어서)
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

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kst = (d) => new Date(new Date(d).getTime() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16);
const ymd = (d) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);

// 배포할 때 만든 관리자용 요약(_admin.json)을 읽는다 (Worker 안에서는 자료 파일을 코드로 실행할 수 없어서)
async function summary(env, req) {
  try { return await (await env.ASSETS.fetch(new Request(new URL('/_admin.json', req.url)))).json(); } catch (e) { return null; }
}

// 방문 통계: Cloudflare GraphQL (Web Analytics)
async function analytics(env) {
  if (!env.CF_ANALYTICS_TOKEN) return { error: '방문 통계 열쇠(CF_ANALYTICS_TOKEN)가 아직 설정되지 않았습니다.' };
  const to = new Date(), from = new Date(to.getTime() - 29 * 864e5);
  const f = `filter: { date_geq: "${ymd(from)}", date_leq: "${ymd(to)}", requestHost: "${HOST}" }`;
  const q = `{ viewer { accounts(filter: { accountTag: "${ACCOUNT}" }) {
    byDate: rumPageloadEventsAdaptiveGroups(limit: 100, ${f}, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
    byRef: rumPageloadEventsAdaptiveGroups(limit: 10, ${f}, orderBy: [count_DESC]) { count dimensions { refererHost } }
    byCountry: rumPageloadEventsAdaptiveGroups(limit: 10, ${f}, orderBy: [count_DESC]) { count dimensions { countryName } }
    byDevice: rumPageloadEventsAdaptiveGroups(limit: 10, ${f}, orderBy: [count_DESC]) { count dimensions { deviceType } }
    byBrowser: rumPageloadEventsAdaptiveGroups(limit: 10, ${f}, orderBy: [count_DESC]) { count dimensions { userAgentBrowser } }
  } } }`;
  try {
    const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
    const j = await r.json();
    if (j.errors && j.errors.length) return { error: '통계를 읽지 못했습니다: ' + j.errors.map((e) => e.message).join(' / ') };
    return j.data.viewer.accounts[0] || { error: '계정 자료가 비어 있습니다.' };
  } catch (e) { return { error: '통계를 읽지 못했습니다: ' + e.message }; }
}

async function dashboard(req, env) {
  const [A, M] = await Promise.all([analytics(env), summary(env, req)]);
  const today = ymd(new Date()), week = ymd(new Date(Date.now() - 6 * 864e5));
  let body = '';

  // 방문 통계
  if (A.error) body += `<section><h2>방문 통계</h2><p class="warn">${esc(A.error)}</p></section>`;
  else {
    const days = A.byDate || [], sum = (arr, k) => arr.reduce((s, x) => s + (k === 'visits' ? x.sum.visits : x.count), 0);
    const t = days.filter((x) => x.dimensions.date === today), w = days.filter((x) => x.dimensions.date >= week);
    const max = Math.max(1, ...days.map((x) => x.sum.visits));
    const list = (arr, key, label) => `<div><h3>${label}</h3>${arr.length ? `<table>${arr.map((x) => `<tr><td>${esc(x.dimensions[key] || '(직접 입력·알 수 없음)')}</td><td class="n">${x.count}</td></tr>`).join('')}</table>` : '<p class="mut">아직 없음</p>'}</div>`;
    body += `<section><h2>방문 통계 <small>최근 30일 · Cloudflare Web Analytics</small></h2>
      <div class="tiles"><div><span>오늘 방문</span><b>${sum(t, 'visits')}</b><em>페이지 열람 ${sum(t)}</em></div><div><span>최근 7일 방문</span><b>${sum(w, 'visits')}</b><em>페이지 열람 ${sum(w)}</em></div><div><span>최근 30일 방문</span><b>${sum(days, 'visits')}</b><em>페이지 열람 ${sum(days)}</em></div></div>
      <div class="bars">${days.map((x) => `<div title="${x.dimensions.date} 방문 ${x.sum.visits}"><i style="height:${(x.sum.visits / max) * 100}%"></i><span>${x.dimensions.date.slice(8)}</span></div>`).join('') || '<p class="mut">아직 방문 기록이 없습니다. 통계는 방문 뒤 몇 분~몇 시간 지나야 쌓입니다.</p>'}</div>
      <div class="grid">${list(A.byRef || [], 'refererHost', '들어온 곳')}${list(A.byCountry || [], 'countryName', '나라')}${list(A.byDevice || [], 'deviceType', '기기')}${list(A.byBrowser || [], 'userAgentBrowser', '브라우저')}</div>
      <p class="mut">이 사이트는 화면 이동을 주소의 # 뒤로 처리해서, 페이지(순위·선수 등)별 조회수는 통계에 따로 잡히지 않습니다. 개인을 알아볼 수 있는 정보는 모으지 않습니다.</p></section>`;
  }

  // 사이트 상태
  const age = (d) => (d ? Math.round((Date.now() - new Date(d)) / 60000) : null);
  const late = ((M && M.open) || []).filter((m) => new Date(m.datetime + ':00+09:00') < new Date(Date.now() - 3 * 3600e3));
  const todo = [];
  for (const m of (M && M.comps) || []) if (m.date < today && !m.done) todo.push(`${m.name} ${m.date} ${m.home} vs ${m.away}: 결과 입력 필요`);
  if (M && M.draft && !M.draft.candidates && Date.now() > new Date(M.draft.applyTo)) todo.push('드래프트 신청자 명단 정리 필요 (연맹 공지 확인)');
  for (const m of late) todo.push(`${m.round} ${m.datetime} ${m.home} vs ${m.away}: 경기 시간이 지났는데 종료 표시가 없음 (연기·취소 확인)`);
  const st = (label, d) => { const a = age(d); return `<div><span>${label}</span><b class="${a == null || a > 120 ? 'bad' : 'ok'}">${a == null ? '읽지 못함' : a < 60 ? `${a}분 전` : `${Math.round(a / 60)}시간 전`}</b><em>${d ? kst(d) : ''}</em></div>`; };
  body += `<section><h2>사이트 상태</h2><div class="tiles">${st('연맹 기록 수집', M && M.dataUpdated)}${st('뉴스 수집', M && M.newsUpdated)}<div><span>모은 기사</span><b>${M && M.newsCount != null ? M.newsCount : '–'}</b><em>최근 60일</em></div></div>
    <p class="mut">자동 갱신은 30분마다 돕니다. 2시간 넘게 멈추면 빨갛게 표시됩니다.</p>
    <h3>할 일</h3>${todo.length ? `<ul>${todo.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="mut">지금은 없습니다.</p>'}</section>`;

  // 바로 가기
  body += `<section><h2>바로 가기</h2><ul class="links">
    <li><a href="/">사이트 열기</a></li>
    <li><a href="https://github.com/kwfall/wk-league-data-portal/actions" target="_blank" rel="noopener">자동 갱신·배포 기록 (GitHub Actions)</a></li>
    <li><a href="https://dash.cloudflare.com/${ACCOUNT}/web-analytics" target="_blank" rel="noopener">Cloudflare 방문 통계 원본</a></li>
    <li><a href="https://www.kwff.or.kr/notice" target="_blank" rel="noopener">연맹 공지사항</a></li></ul></section>`;
  return page('WK리그 Data 관리자', body);
}

function page(title, body, status = 200) {
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>
:root{--bg:#f6f6f4;--card:#fff;--ink:#141414;--ink2:#666;--line:#e3e3df;--acc:#d6338a;--ok:#1f7a3f;--bad:#c0392b}
@media (prefers-color-scheme:dark){:root{--bg:#111;--card:#1b1b1b;--ink:#eee;--ink2:#aaa;--line:#2c2c2c;--acc:#ff66c4;--ok:#5bd38a;--bad:#ff7b6e}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,-apple-system,"Malgun Gothic",sans-serif}
main{max-width:980px;margin:0 auto;padding:24px max(16px,env(safe-area-inset-left,0px)) 48px}
h1{font-size:22px;margin:0 0 16px}h2{font-size:17px;margin:0 0 12px}h2 small{font-weight:400;color:var(--ink2);font-size:12px;margin-left:6px}h3{font-size:14px;margin:14px 0 6px}
section{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.tiles div{border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:grid}
.tiles span{font-size:12px;color:var(--ink2)}.tiles b{font-size:26px;font-variant-numeric:tabular-nums}.tiles em{font-style:normal;font-size:12px;color:var(--ink2)}
b.ok{color:var(--ok)}b.bad{color:var(--bad)}
.bars{display:flex;align-items:flex-end;gap:3px;height:140px;margin:16px 0 4px;border-bottom:1px solid var(--line)}.bars div{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%}
.bars i{display:block;width:100%;background:var(--acc);border-radius:3px 3px 0 0;min-height:2px}.bars span{font-size:10px;color:var(--ink2)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}table{width:100%;border-collapse:collapse;font-size:14px}td{padding:5px 0;border-bottom:1px solid var(--line)}td.n{text-align:right;font-variant-numeric:tabular-nums}
.mut{color:var(--ink2);font-size:13px}.warn{color:var(--bad)}ul{margin:0;padding-left:18px}.links a{color:var(--acc)}
</style></head><body><main><h1>${esc(title)}</h1>${body}</main></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
