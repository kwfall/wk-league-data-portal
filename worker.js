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
    if (url.pathname === '/api/track') return track(req, env);
    if (!url.pathname.startsWith('/admin')) return env.ASSETS.fetch(req);
    if (!env.ADMIN_PASSWORD) return page('관리자 비밀번호가 아직 설정되지 않았습니다', '<p>Cloudflare 대시보드에서 ADMIN_PASSWORD 비밀 값을 먼저 넣어 주세요.</p>', 503);
    if (!(await authorized(req, env.ADMIN_PASSWORD))) {
      return new Response('비밀번호가 필요합니다.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="WK League Data admin", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    return dashboard(req, env, url);
  },
};

// 방문 기록 받기: 화면 이름, 머문 초, 기기, 언어 + Cloudflare 가 알려 주는 나라·시도. IP 는 저장하지 않는다.
async function track(req, env) {
  const ok = new Response(null, { status: 204 });
  if (req.method !== 'POST' || !env.EVENTS) return ok;
  try {
    const b = JSON.parse((await req.text()).slice(0, 500));
    const page = /^[a-z]{1,12}$/.test(b.p) ? b.p : 'other', secs = Math.max(0, Math.min(1800, Number(b.s) || 0));
    const visit = /^[a-z0-9]{6,16}$/.test(b.v) ? b.v : 'none', mode = b.m === 'mobile' ? 'mobile' : 'pc', lang = ['ko', 'en', 'ja'].includes(b.l) ? b.l : 'ko';
    const detail = String(b.d || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 80), ref = /^[a-z0-9.-]{1,80}$/i.test(b.r || '') ? b.r.toLowerCase() : '';
    const cf = req.cf || {}, ua = req.headers.get('User-Agent') || '', device = /Mobi|Android|iPhone/i.test(ua) ? '휴대폰' : /iPad|Tablet/i.test(ua) ? '태블릿' : '컴퓨터';
    env.EVENTS.writeDataPoint({ indexes: [page], blobs: [page, cf.country || '?', cf.region || '?', device, mode, visit, lang, detail, ref], doubles: [secs] });
  } catch (e) { /* 잘못된 요청은 버린다 */ }
  return ok;
}

// 쌓인 방문 기록 읽기 (Analytics Engine SQL)
async function visits(env) {
  if (!env.CF_ANALYTICS_TOKEN) return { error: '방문 통계 열쇠가 없습니다.' };
  const sql = "SELECT timestamp, blob1 AS page, blob2 AS country, blob3 AS region, blob4 AS device, blob5 AS mode, blob6 AS visit, blob8 AS detail, blob9 AS ref, double1 AS secs FROM wk_events WHERE timestamp > NOW() - INTERVAL '92' DAY ORDER BY timestamp DESC LIMIT 50000 FORMAT JSON";
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/analytics_engine/sql`, { method: 'POST', headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}` }, body: sql });
    const text = await r.text();
    if (!r.ok) return { error: /does not exist|unknown table/i.test(text) ? 'empty' : `방문 기록을 읽지 못했습니다 (${r.status}): ${text.slice(0, 200)}` };
    return { rows: JSON.parse(text).data || [] };
  } catch (e) { return { error: '방문 기록을 읽지 못했습니다: ' + e.message }; }
}

const PAGE = { home: '홈', table: '순위', matches: '일정·결과', match: '경기 상세', teams: '팀', team: '팀 상세', players: '선수', player: '선수 상세', news: '소식', draft: '드래프트', cup: 'W코리아컵', nsf: '전국체전', analysis: '팀 분석', compare: '비교', best: '베스트 11', qor: '라운드 QOR', abroad: '해외파', go: '경기장 가는 길', predict: '예측', history: '역대 기록', cards: '카드뉴스', about: '용어·출처', other: '기타' };
const REGION = { Seoul: '서울', Busan: '부산', Daegu: '대구', Incheon: '인천', Gwangju: '광주', Daejeon: '대전', Ulsan: '울산', Sejong: '세종', 'Gyeonggi-do': '경기', 'Gangwon-do': '강원', Gangwon: '강원', 'Chungcheongbuk-do': '충북', 'Chungcheongnam-do': '충남', 'Jeollabuk-do': '전북', Jeonbuk: '전북', 'Jeollanam-do': '전남', 'Gyeongsangbuk-do': '경북', 'Gyeongsangnam-do': '경남', 'Jeju-do': '제주', Jeju: '제주' };
const COUNTRY = { KR: '한국', JP: '일본', US: '미국', CN: '중국', GB: '영국', CA: '캐나다', AU: '호주', DE: '독일', FR: '프랑스', VN: '베트남', TW: '대만', HK: '홍콩', '?': '알 수 없음' };
const LAUNCH = '2026-10-30';
const RANGES = { day: ['일일', '오늘'], week: ['주간', '최근 7일'], month: ['월별', '최근 30일'], all: ['전체', '사이트를 연 날부터'] };
// 기간의 시작 날짜(한국 날짜)
function rangeFrom(range) {
  const back = { day: 0, week: 6, month: 29 }[range];
  const d = back == null ? LAUNCH : ymd(new Date(Date.now() - back * 864e5));
  const floor = ymd(new Date(Date.now() - 89 * 864e5)); // 통계 보관 기간(약 3개월) 안으로
  return d < floor ? floor : d;
}
const kstDay = (ts) => ymd(new Date(ts.replace(' ', 'T') + 'Z'));
const mmss = (s) => { s = Math.round(s); return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`; };

// 방문 기록을 표로 정리
function visitSection(V, M, range) {
  const from = rangeFrom(range), title = `${RANGES[range][1]}${range === 'day' ? '' : ` (${from} ~)`}`;
  if (V.error === 'empty' || (V.rows && !V.rows.length)) return '<section><h2>화면별 머문 시간 · 지역</h2><p class="mut">아직 쌓인 방문 기록이 없습니다. 사이트를 한 번 둘러보고 몇 분 뒤 다시 열어 보세요.</p></section>';
  if (V.error) return `<section><h2>화면별 머문 시간 · 지역</h2><p class="warn">${esc(V.error)}</p></section>`;
  const R = V.rows.filter((r) => kstDay(r.timestamp) >= from);
  if (!R.length) return `<section><h2>화면별 머문 시간 · 지역 <small>${title}</small></h2><p class="mut">이 기간에는 쌓인 기록이 없습니다.</p></section>`;
  const by = (key) => { const m = {}; for (const r of R) { const k = key(r); (m[k] ||= { n: 0, s: 0, v: new Set() }); m[k].n++; m[k].s += Number(r.secs); m[k].v.add(r.visit); } return Object.entries(m); };
  const visitsAll = by((r) => r.visit), totalVisits = visitsAll.length, avgVisit = totalVisits ? visitsAll.reduce((s, [, x]) => s + x.s, 0) / totalVisits : 0;
  const pages = by((r) => r.page).sort((a, b) => b[1].s - a[1].s);
  const regions = by((r) => (r.country === 'KR' ? REGION[r.region] || r.region || '알 수 없음' : `${COUNTRY[r.country] || r.country} (해외)`)).sort((a, b) => b[1].v.size - a[1].v.size);
  const devices = by((r) => `${r.device} · ${r.mode === 'mobile' ? '모바일 버전' : 'PC 버전'}`).sort((a, b) => b[1].v.size - a[1].v.size);
  const hours = Array.from({ length: 24 }, (_, h) => R.filter((r) => (new Date(r.timestamp.replace(' ', 'T') + 'Z').getUTCHours() + 9) % 24 === h).length), hmax = Math.max(1, ...hours);
  const lens = [[60, '1분 미만'], [180, '1~3분'], [600, '3~10분'], [Infinity, '10분 이상']].map(([lim, label], i, a) => [label, visitsAll.filter(([, x]) => x.s < lim && (i === 0 || x.s >= a[i - 1][0])).length]);
  // 많이 본 선수·팀·경기, 들어온 곳
  const names = (M && M.matchNames) || {};
  const label = (r) => r.page === 'player' ? (() => { const [tm, nm] = String(r.detail).split('|'); return `${nm || r.detail} (${tm || ''})`; })() : r.page === 'match' ? names[r.detail] || `경기 ${r.detail}` : r.detail;
  const top = (pg) => by((r) => (r.page === pg && r.detail ? label(r) : null)).filter(([k]) => k !== 'null').sort((a, b) => b[1].v.size - a[1].v.size || b[1].s - a[1].s).slice(0, 10);
  const refs = by((r) => (r.ref ? (r.ref === 'direct' ? '주소 직접 입력·즐겨찾기' : /instagram/.test(r.ref) ? '인스타그램' : /kakao/.test(r.ref) ? '카카오톡' : /naver/.test(r.ref) ? '네이버' : /google/.test(r.ref) ? '구글' : r.ref) : null)).filter(([k]) => k !== 'null').sort((a, b) => b[1].n - a[1].n);
  const tbl = (head, rows) => `<table><tr>${head.map((h, i) => `<th${i ? ' class="n"' : ''}>${h}</th>`).join('')}</tr>${rows.join('')}</table>`;
  return `<section><h2>화면별 머문 시간 · 지역 <small>${title} · 이 사이트가 직접 모은 기록</small></h2>
    <div class="tiles"><div><span>방문</span><b>${totalVisits}</b><em>창을 열고 닫기까지 한 번</em></div><div><span>방문당 평균 머문 시간</span><b>${mmss(avgVisit)}</b><em>화면을 보고 있던 시간만</em></div><div><span>화면 이동</span><b>${R.length}</b><em>방문당 ${totalVisits ? (R.length / totalVisits).toFixed(1) : 0}개</em></div></div>
    <div class="grid" style="margin-top:14px">
      <div><h3>오래 본 화면</h3>${tbl(['화면', '열람', '총 시간', '평균'], pages.slice(0, 12).map(([k, x]) => `<tr><td>${esc(PAGE[k] || k)}</td><td class="n">${x.n}</td><td class="n">${mmss(x.s)}</td><td class="n">${mmss(x.s / x.n)}</td></tr>`))}</div>
      <div><h3>접속 지역 (시·도)</h3>${tbl(['지역', '방문', '머문 시간'], regions.slice(0, 12).map(([k, x]) => `<tr><td>${esc(k)}</td><td class="n">${x.v.size}</td><td class="n">${mmss(x.s)}</td></tr>`))}</div>
      <div><h3>기기 · 보기 방식</h3>${tbl(['기기', '방문'], devices.map(([k, x]) => `<tr><td>${esc(k)}</td><td class="n">${x.v.size}</td></tr>`))}<h3>방문 길이</h3>${tbl(['머문 시간', '방문'], lens.map(([k, n]) => `<tr><td>${k}</td><td class="n">${n}</td></tr>`))}</div>
    </div>
    <div class="grid" style="margin-top:14px">
      <div><h3>많이 본 선수</h3>${(() => { const t = top('player'); return t.length ? tbl(['선수', '방문', '머문 시간'], t.map(([k, x]) => `<tr><td>${esc(k)}</td><td class="n">${x.v.size}</td><td class="n">${mmss(x.s)}</td></tr>`)) : '<p class="mut">아직 없음</p>'; })()}</div>
      <div><h3>많이 본 팀</h3>${(() => { const t = top('team'); return t.length ? tbl(['팀', '방문', '머문 시간'], t.map(([k, x]) => `<tr><td>${esc(k)}</td><td class="n">${x.v.size}</td><td class="n">${mmss(x.s)}</td></tr>`)) : '<p class="mut">아직 없음</p>'; })()}</div>
      <div><h3>많이 본 경기</h3>${(() => { const t = top('match'); return t.length ? tbl(['경기', '방문'], t.map(([k, x]) => `<tr><td>${esc(k)}</td><td class="n">${x.v.size}</td></tr>`)) : '<p class="mut">아직 없음</p>'; })()}</div>
      <div><h3>처음 들어온 곳</h3>${refs.length ? tbl(['들어온 곳', '방문'], refs.map(([k, x]) => `<tr><td>${esc(k)}</td><td class="n">${x.n}</td></tr>`)) : '<p class="mut">아직 없음</p>'}</div>
    </div>
    ${range === 'day' ? '' : (() => { const d = {}; for (const r of R) { const k = kstDay(r.timestamp); (d[k] ||= new Set()).add(r.visit); } const ks = Object.keys(d).sort(), mx = Math.max(1, ...ks.map((k) => d[k].size)); return `<h3>날짜별 방문</h3><div class="bars">${ks.map((k) => `<div title="${k} 방문 ${d[k].size}"><i style="height:${(d[k].size / mx) * 100}%"></i><span>${k.slice(5).replace('-', '.')}</span></div>`).join('')}</div>`; })()}
    <h3>시간대별 (한국 시간)</h3><div class="bars">${hours.map((n, h) => `<div title="${h}시 화면 이동 ${n}"><i style="height:${(n / hmax) * 100}%"></i><span>${h}</span></div>`).join('')}</div>
    <p class="mut">지역은 시·도까지만 모으고, 사람을 알아볼 수 있는 IP 주소나 쿠키는 저장하지 않습니다. 머문 시간은 화면을 실제로 보고 있던 시간만 셉니다(다른 앱으로 넘어간 시간 제외). 기록이 모이기 시작한 날부터 셉니다.</p></section>`;
}

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
async function analytics(env, range) {
  if (!env.CF_ANALYTICS_TOKEN) return { error: '방문 통계 열쇠(CF_ANALYTICS_TOKEN)가 아직 설정되지 않았습니다.' };
  const f = `filter: { date_geq: "${rangeFrom(range)}", date_leq: "${ymd(new Date())}", requestHost: "${HOST}" }`;
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

async function dashboard(req, env, url) {
  const range = RANGES[url.searchParams.get('range')] ? url.searchParams.get('range') : 'week';
  const [A, M, V] = await Promise.all([analytics(env, range), summary(env, req), visits(env)]);
  const today = ymd(new Date());
  let body = '';

  // 방문 통계
  if (A.error) body += `<section><h2>방문 통계</h2><p class="warn">${esc(A.error)}</p></section>`;
  else {
    const days = A.byDate || [], sum = (arr, k) => arr.reduce((s, x) => s + (k === 'visits' ? x.sum.visits : x.count), 0);
    const nDays = days.length;
    const max = Math.max(1, ...days.map((x) => x.sum.visits));
    const list = (arr, key, label) => `<div><h3>${label}</h3>${arr.length ? `<table>${arr.map((x) => `<tr><td>${esc(x.dimensions[key] || '(직접 입력·알 수 없음)')}</td><td class="n">${x.count}</td></tr>`).join('')}</table>` : '<p class="mut">아직 없음</p>'}</div>`;
    body += `<section><h2>방문 통계 <small>${RANGES[range][1]} · Cloudflare Web Analytics</small></h2>
      <div class="tiles"><div><span>방문</span><b>${sum(days, 'visits')}</b><em>${RANGES[range][1]}</em></div><div><span>페이지 열람</span><b>${sum(days)}</b><em>방문당 ${sum(days, 'visits') ? (sum(days) / sum(days, 'visits')).toFixed(1) : 0}회</em></div><div><span>하루 평균 방문</span><b>${nDays ? Math.round(sum(days, 'visits') / nDays) : 0}</b><em>기록이 있는 ${nDays}일 기준</em></div></div>
      <div class="bars">${days.map((x) => `<div title="${x.dimensions.date} 방문 ${x.sum.visits}"><i style="height:${(x.sum.visits / max) * 100}%"></i><span>${x.dimensions.date.slice(8)}</span></div>`).join('') || '<p class="mut">아직 방문 기록이 없습니다. 통계는 방문 뒤 몇 분~몇 시간 지나야 쌓입니다.</p>'}</div>
      <div class="grid">${list(A.byRef || [], 'refererHost', '들어온 곳')}${list(A.byCountry || [], 'countryName', '나라')}${list(A.byDevice || [], 'deviceType', '기기')}${list(A.byBrowser || [], 'userAgentBrowser', '브라우저')}</div>
      <p class="mut">이 사이트는 화면 이동을 주소의 # 뒤로 처리해서, 페이지(순위·선수 등)별 조회수는 통계에 따로 잡히지 않습니다. 개인을 알아볼 수 있는 정보는 모으지 않습니다.</p></section>`;
  }

  body = visitSection(V, M, range) + body;
  // 기간 고르기
  body = `<nav class="tabs">${Object.entries(RANGES).map(([k, [l]]) => `<a href="/admin?range=${k}" class="${k === range ? 'on' : ''}">${l}</a>`).join('')}</nav>` + body;

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
.tabs{display:flex;gap:6px;margin:0 0 16px}.tabs a{padding:8px 16px;border-radius:999px;border:1px solid var(--line);color:var(--ink);text-decoration:none;font-weight:600;background:var(--card)}.tabs a.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.mut{color:var(--ink2);font-size:13px}.warn{color:var(--bad)}ul{margin:0;padding-left:18px}.links a{color:var(--acc)}
</style></head><body><main><h1>${esc(title)}</h1>${body}</main></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
