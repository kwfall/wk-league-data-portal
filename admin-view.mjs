// 관리자 화면 그리기: 기록(행 목록)과 요약을 받아 HTML 한 장을 만든다. worker.js 가 불러 쓰고, 내 컴퓨터에서는 tools/admin-preview.mjs 로 미리 본다.
// 행: { timestamp:'YYYY-MM-DD HH:MM:SS'(UTC), page, country, region, device, mode, visit, detail, ref, secs }

export const RANGES = { day: ['일일', '오늘'], week: ['주간', '최근 7일'], month: ['월별', '최근 30일'], all: ['전체', '사이트를 연 날부터'] };
const LAUNCH = '2026-10-30';
const PAGE = { home: '홈', table: '순위', matches: '일정·결과', match: '경기 상세', teams: '팀', team: '팀 상세', players: '선수', player: '선수 상세', news: '소식', draft: '드래프트', cup: 'W코리아컵', nsf: '전국체전', analysis: '팀 분석', compare: '비교', best: '베스트 11', qor: '라운드 QOR', abroad: '해외파', go: '경기장 가는 길', predict: '예측', history: '역대 기록', cards: '카드뉴스', about: '용어·출처', other: '기타' };
const REGION = { Seoul: '서울', Busan: '부산', Daegu: '대구', Incheon: '인천', Gwangju: '광주', Daejeon: '대전', Ulsan: '울산', Sejong: '세종', 'Gyeonggi-do': '경기', 'Gangwon-do': '강원', Gangwon: '강원', 'Chungcheongbuk-do': '충북', 'Chungcheongnam-do': '충남', 'Jeollabuk-do': '전북', Jeonbuk: '전북', 'Jeollanam-do': '전남', 'Gyeongsangbuk-do': '경북', 'Gyeongsangnam-do': '경남', 'Jeju-do': '제주', Jeju: '제주' };
const COUNTRY = { KR: '한국', JP: '일본', US: '미국', CN: '중국', GB: '영국', CA: '캐나다', AU: '호주', DE: '독일', FR: '프랑스', VN: '베트남', TW: '대만', HK: '홍콩', '?': '알 수 없음' };
const WD = ['일', '월', '화', '수', '목', '금', '토'];
// 범주 색: 같은 항목은 늘 같은 색 (분홍이 사이트 대표색)
const CAT = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const kst = (ts) => new Date(new Date(String(ts).replace(' ', 'T') + (String(ts).endsWith('Z') ? '' : 'Z')).getTime() + 9 * 3600e3);
const kday = (ts) => kst(ts).toISOString().slice(0, 10);
const todayK = (now) => new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(new Date(d + 'T00:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
const mmss = (s) => { s = Math.round(s || 0); return s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`; };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');

// 기간의 시작일(한국 날짜)
export function rangeFrom(range, now = new Date()) {
  const t = todayK(now), back = { day: 0, week: 6, month: 29 }[range];
  const d = back == null ? LAUNCH : addDays(t, -back), floor = addDays(t, -89);
  return d < floor ? floor : d;
}

// 기록 묶기
function stats(rows) {
  const visits = new Map();
  for (const r of rows) { const v = visits.get(r.visit) || { secs: 0, n: 0, first: r, rows: [] }; v.secs += Number(r.secs) || 0; v.n++; v.rows.push(r); if (r.timestamp < v.first.timestamp) v.first = r; visits.set(r.visit, v); }
  const secs = rows.reduce((s, r) => s + (Number(r.secs) || 0), 0);
  return { rows, visits, nVisits: visits.size, nViews: rows.length, secs, avg: visits.size ? secs / visits.size : 0 };
}
function group(rows, key) {
  const m = new Map();
  for (const r of rows) { const k = key(r); if (k == null) continue; const g = m.get(k) || { k, n: 0, secs: 0, v: new Set() }; g.n++; g.secs += Number(r.secs) || 0; g.v.add(r.visit); m.set(k, g); }
  return [...m.values()].map((g) => ({ ...g, visits: g.v.size }));
}
const regionName = (r) => (r.country === 'KR' ? REGION[r.region] || '한국(지역 모름)' : `${COUNTRY[r.country] || r.country} (해외)`);
const refName = (h) => (!h ? null : h === 'direct' ? '직접 입력·즐겨찾기' : /instagram/.test(h) ? '인스타그램' : /kakao/.test(h) ? '카카오톡' : /naver/.test(h) ? '네이버' : /google/.test(h) ? '구글' : /daum/.test(h) ? '다음' : /t\.co|twitter|x\.com/.test(h) ? 'X(트위터)' : /facebook/.test(h) ? '페이스북' : h);

// ── 그림 부품 ──────────────────────────────────────────────
// 세로 막대: 날짜별 또는 시간대별. 눈금은 가로 점선 3줄
function columns(points, { unit = '방문', every = 1 } = {}) {
  const W = 760, H = 220, L = 34, B = 26, T = 10, max = niceMax(Math.max(1, ...points.map((p) => p.v)));
  const bw = (W - L) / Math.max(1, points.length), ys = [0, max / 2, max];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${unit} 추이">
    ${ys.map((y) => { const yy = T + (H - T - B) * (1 - y / max); return `<line x1="${L}" x2="${W}" y1="${yy}" y2="${yy}" class="grid"/><text x="${L - 6}" y="${yy + 4}" class="ax" text-anchor="end">${fmt(y)}</text>`; }).join('')}
    ${points.map((p, i) => { const h = ((H - T - B) * p.v) / max, x = L + i * bw + bw * 0.18, w = Math.max(2, bw * 0.64), y = H - B - h;
      return `<g><title>${esc(p.tip || `${p.label} ${unit} ${p.v}`)}</title><rect x="${x}" y="${y}" width="${w}" height="${Math.max(h, p.v ? 2 : 0)}" rx="3" class="col${p.hi ? ' hi' : ''}"/><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/>${i % every === 0 ? `<text x="${L + i * bw + bw / 2}" y="${H - 8}" class="ax" text-anchor="middle">${esc(p.label)}</text>` : ''}</g>`; }).join('')}
  </svg>`;
}
const niceMax = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
// 작은 선 그래프
function spark(vals) {
  if (vals.length < 2) return '';
  const W = 120, H = 32, max = Math.max(1, ...vals), pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - 3 - (v / max) * (H - 6)}`);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts.join(' ')}"/><circle cx="${pts[pts.length - 1].split(',')[0]}" cy="${pts[pts.length - 1].split(',')[1]}" r="2.5"/></svg>`;
}
// 도넛 + 범례
function donut(parts, center) {
  const total = parts.reduce((s, p) => s + p.v, 0) || 1, R = 54, C = 2 * Math.PI * R; let off = 0;
  const arcs = parts.map((p, i) => { const len = (p.v / total) * C, a = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${CAT[i % CAT.length]}" stroke-width="20" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${esc(p.k)} ${p.v} (${pct(p.v, total)}%)</title></circle>`; off += len; return a; }).join('');
  return `<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="비율">${arcs}<text x="70" y="66" text-anchor="middle" class="dn">${esc(center[0])}</text><text x="70" y="86" text-anchor="middle" class="dl">${esc(center[1])}</text></svg>
    <ul class="legend">${parts.map((p, i) => `<li><i style="background:${CAT[i % CAT.length]}"></i><span>${esc(p.k)}</span><b>${pct(p.v, total)}%</b><em>${fmt(p.v)}</em></li>`).join('')}</ul></div>`;
}
// 가로 막대 목록
function hbars(items, { value, label, sub, max, empty = '아직 없음' }) {
  if (!items.length) return `<p class="empty">${empty}</p>`;
  const m = max || Math.max(1, ...items.map(value));
  return `<ol class="hb">${items.map((x, i) => `<li><span class="rk">${i + 1}</span><div class="hbm"><div class="hbt"><span class="nm">${esc(label(x))}</span><b>${esc(sub(x))}</b></div><div class="trk"><i style="width:${(value(x) / m) * 100}%"></i></div></div></li>`).join('')}</ol>`;
}
// 요일 × 시간 열지도
function heat(rows) {
  const g = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of rows) { const d = kst(r.timestamp); g[d.getUTCDay()][d.getUTCHours()]++; }
  const max = Math.max(1, ...g.flat());
  return `<div class="heat"><div></div>${Array.from({ length: 24 }, (_, h) => `<span class="hx">${h % 3 === 0 ? h : ''}</span>`).join('')}
    ${[1, 2, 3, 4, 5, 6, 0].map((d) => `<span class="hy">${WD[d]}</span>${g[d].map((n, h) => `<i title="${WD[d]}요일 ${h}시 화면 이동 ${n}" style="--a:${n ? 0.12 + 0.88 * (n / max) : 0}"></i>`).join('')}`).join('')}</div>`;
}
const delta = (cur, prev) => { if (prev == null) return ''; if (!prev) return cur ? '<span class="d up">새로 생김</span>' : ''; const p = Math.round(((cur - prev) / prev) * 100); return `<span class="d ${p > 0 ? 'up' : p < 0 ? 'down' : ''}">${p > 0 ? '▲' : p < 0 ? '▼' : '–'} ${Math.abs(p)}%</span>`; };

// ── 화면 ────────────────────────────────────────────────
export function renderAdmin({ rows = [], rowsError = null, rum = null, summary = null, range = 'week', now = new Date(), host = '' }) {
  // 운영자가 동작 확인용으로 보낸 시험 기록(방문 번호가 selfcheck·check 로 시작)은 빼고, 글자가 깨진 상세 정보는 비운다
  const rawN = rows.length, testN = rows.filter((r) => /^(selfcheck|check)\d/.test(String(r.visit))).length, brokenN = rows.filter((r) => /�/.test(String(r.detail))).length;
  rows = rows.filter((r) => !/^(selfcheck|check)\d/.test(String(r.visit))).map((r) => (/�/.test(String(r.detail)) ? { ...r, detail: '' } : r));
  const t = todayK(now), from = rangeFrom(range, now), span = daysBetween(from, t) + 1;
  const cur = rows.filter((r) => { const d = kday(r.timestamp); return d >= from && d <= t; });
  const prevFrom = addDays(from, -span), prevTo = addDays(from, -1);
  const prev = range === 'all' ? null : rows.filter((r) => { const d = kday(r.timestamp); return d >= prevFrom && d <= prevTo; });
  const S = stats(cur), P = prev && stats(prev);

  // 추이: 일일은 시간대별, 나머지는 날짜별
  const series = range === 'day'
    ? Array.from({ length: 24 }, (_, h) => { const rs = cur.filter((r) => kst(r.timestamp).getUTCHours() === h); return { label: String(h), v: new Set(rs.map((r) => r.visit)).size, tip: `${h}시 방문 ${new Set(rs.map((r) => r.visit)).size} · 화면 ${rs.length}` }; })
    : Array.from({ length: span }, (_, i) => { const d = addDays(from, i), rs = cur.filter((r) => kday(r.timestamp) === d), v = new Set(rs.map((r) => r.visit)).size, wd = new Date(d + 'T00:00:00Z').getUTCDay(); return { label: d.slice(5).replace('-', '.'), v, hi: d === t, tip: `${d}(${WD[wd]}) 방문 ${v} · 화면 ${rs.length}` }; });
  const daily = Array.from({ length: Math.min(span, 14) }, (_, i) => addDays(t, -Math.min(span, 14) + 1 + i)).map((d) => new Set(cur.filter((r) => kday(r.timestamp) === d).map((r) => r.visit)).size);

  const mobileVisits = [...S.visits.values()].filter((v) => v.first.device === '휴대폰').length;
  const igVisits = [...S.visits.values()].filter((v) => v.rows.some((r) => /instagram/.test(r.ref || ''))).length;
  const pages = group(cur, (r) => r.page).sort((a, b) => b.secs - a.secs).slice(0, 10);
  const regions = group(cur, regionName).sort((a, b) => b.visits - a.visits).slice(0, 10);
  const refs = group(cur, (r) => refName(r.ref)).sort((a, b) => b.n - a.n);
  const refParts = refs.slice(0, 5).map((x) => ({ k: x.k, v: x.n })).concat(refs.length > 5 ? [{ k: '그 밖', v: refs.slice(5).reduce((s, x) => s + x.n, 0) }] : []);
  const devParts = group([...S.visits.values()].map((v) => v.first), (r) => `${r.device} · ${r.mode === 'mobile' ? '모바일판' : 'PC판'}`).sort((a, b) => b.n - a.n).map((x) => ({ k: x.k, v: x.n }));
  const lens = [[0, 30, '30초 미만'], [30, 60, '30초~1분'], [60, 180, '1~3분'], [180, 600, '3~10분'], [600, Infinity, '10분 이상']].map(([a, b, k]) => ({ k, v: [...S.visits.values()].filter((v) => v.secs >= a && v.secs < b).length }));
  const names = (summary && summary.matchNames) || {};
  const topOf = (pg, lab) => group(cur.filter((r) => r.page === pg && r.detail), lab).sort((a, b) => b.visits - a.visits || b.secs - a.secs).slice(0, 8);
  const players = topOf('player', (r) => { const [tm, nm] = String(r.detail).split('|'); return `${nm || r.detail}|${tm || ''}`; });
  const teams = topOf('team', (r) => r.detail), matches = topOf('match', (r) => names[r.detail] || `경기 ${r.detail}`);

  // ── 포트폴리오용 분석 ──
  const V = [...S.visits.values()];
  const chOf = (v) => refName((v.rows.find((r) => r.ref) || {}).ref) || '알 수 없음';
  const isDetail = (r) => ['player', 'team', 'match'].includes(r.page);
  const engaged = (v) => v.n >= 2 || v.secs >= 60;
  // 퍼널: 방문 → 다른 화면도 봄 → 선수·팀·경기 상세까지 → 3분 이상
  const funnel = [['방문', V.length], ['홈 말고 다른 화면도 봄', V.filter((v) => v.rows.some((r) => r.page !== 'home')).length], ['선수·팀·경기 상세까지 봄', V.filter((v) => v.rows.some(isDetail)).length], ['3분 이상 머묾', V.filter((v) => v.secs >= 180).length]];
  // 유입 경로별 비교 (세그먼트)
  const seg = (keyOf) => { const m = new Map(); for (const v of V) { const k = keyOf(v); const g = m.get(k) || { k, n: 0, views: 0, secs: 0, eng: 0, det: 0 }; g.n++; g.views += v.n; g.secs += v.secs; g.eng += engaged(v) ? 1 : 0; g.det += v.rows.some(isDetail) ? 1 : 0; m.set(k, g); } return [...m.values()].sort((a, b) => b.n - a.n); };
  const byCh = seg(chOf), byDev = seg((v) => v.first.device);
  const engRate = pct(V.filter(engaged).length, V.length);
  // 요일·시간대 최고점
  const cell = new Map(); for (const r of cur) { const d = kst(r.timestamp), k = `${d.getUTCDay()}|${d.getUTCHours()}`; cell.set(k, (cell.get(k) || 0) + 1); }
  const peak = [...cell.entries()].sort((a, b) => b[1] - a[1])[0];
  // 인사이트 → 실행 제안 (규칙 기반, 표본이 너무 적으면 만들지 않는다)
  const insights = [];
  if (V.length >= 5) {
    const top = byCh[0];
    if (top) { const a = top.secs / top.n, longer = a >= S.avg; insights.push([`방문의 ${pct(top.n, V.length)}%가 <b>${esc(top.k)}</b>에서 왔고, 이 경로의 방문당 머문 시간은 ${mmss(a)}로 전체 평균(${mmss(S.avg)})보다 ${longer ? '깁니다' : '짧습니다'}.`, /인스타/.test(top.k) ? (longer ? '인스타그램이 핵심 유입 경로입니다. 게시물마다 관련 화면(선수·경기) 링크를 붙여 유입을 늘립니다.' : '인스타그램에서 온 방문이 빨리 나갑니다. 게시물 링크를 홈 대신 게시물과 관련된 선수·경기 화면으로 바로 연결합니다.') : '가장 큰 유입 경로입니다. 이 경로에 맞춘 첫 화면을 다듬는 것이 효과가 큽니다.']); }
    let worst = null; for (let i = 1; i < funnel.length; i++) { const drop = funnel[i - 1][1] ? 1 - funnel[i][1] / funnel[i - 1][1] : 0; if (!worst || drop > worst.drop) worst = { i, drop }; }
    if (worst) { const acts = ['', '첫 화면에서 다음 경기·순위 같은 바로 가기를 더 눈에 띄게 둡니다.', '목록 화면에서 선수·경기 상세로 들어가는 길(이름 누르기, 추천 선수)을 늘립니다.', '상세 화면 아래에 비교·관련 선수 같은 다음 볼거리를 붙여 더 머물게 합니다.']; insights.push([`가장 많이 빠져나가는 단계는 <b>${funnel[worst.i - 1][0]} → ${funnel[worst.i][0]}</b>로, ${Math.round(worst.drop * 100)}%가 여기서 멈춥니다.`, acts[worst.i]]); }
    if (peak) { const [d, h] = peak[0].split('|').map(Number); insights.push([`가장 많이 보는 때는 <b>${WD[d]}요일 ${h}시</b>입니다.`, `인스타그램 게시물을 ${WD[d]}요일 ${h === 0 ? 23 : h - 1}시 무렵에 올리면 사이트 방문으로 이어지기 좋습니다.`]); }
    const mob = byDev.find((x) => x.k === '휴대폰'), pc = byDev.find((x) => x.k === '컴퓨터');
    if (mob && pct(mob.n, V.length) >= 50) insights.push([`방문의 ${pct(mob.n, V.length)}%가 휴대폰이고, 휴대폰 방문은 평균 ${mmss(mob.secs / mob.n)}${pc ? ` (컴퓨터 ${mmss(pc.secs / pc.n)})` : ''} 머뭅니다.`, '새 기능은 모바일 화면부터 설계하고 확인합니다.']);
    if (players[0]) { const [n, tm] = players[0].k.split('|'); insights.push([`가장 많이 본 선수는 <b>${esc(n)}</b>(${esc(tm)})입니다.`, '관심이 확인된 선수를 카드뉴스·기록 해설 소재로 먼저 다룹니다.']); }
  }
  const small = V.length < 30;

  // 사이트 상태와 할 일
  const age = (d) => (d ? Math.round((now - new Date(d)) / 60000) : null);
  const ageTxt = (a) => (a == null ? '읽지 못함' : a < 60 ? `${a}분 전` : a < 1440 ? `${Math.round(a / 60)}시간 전` : `${Math.round(a / 1440)}일 전`);
  const dA = age(summary && summary.dataUpdated), nA = age(summary && summary.newsUpdated), stale = dA == null || dA > 240;
  const todo = [];
  for (const m of (summary && summary.comps) || []) if (m.date < t && !m.done) todo.push(`${m.name} ${m.date} ${m.home} vs ${m.away} 결과 입력`);
  if (summary && summary.draft && !summary.draft.candidates && now > new Date(summary.draft.applyTo)) todo.push('드래프트 신청자 명단 정리');
  for (const m of ((summary && summary.open) || []).filter((m) => new Date(m.datetime + ':00+09:00') < new Date(now - 3 * 3600e3))) todo.push(`${m.round} ${m.home} vs ${m.away}: 시간이 지났는데 종료 표시 없음`);

  const rumBlock = !rum ? '' : rum.error ? `<p class="empty">${esc(rum.error)}</p>` : (() => {
    const days = rum.byDate || [], v = days.reduce((s, x) => s + x.sum.visits, 0), pv = days.reduce((s, x) => s + x.count, 0);
    return `<div class="mini"><div><span>방문</span><b>${fmt(v)}</b></div><div><span>페이지 열람</span><b>${fmt(pv)}</b></div></div>
      <div class="cols2">${hbars((rum.byCountry || []).slice(0, 5), { value: (x) => x.count, label: (x) => x.dimensions.countryName || '알 수 없음', sub: (x) => fmt(x.count) })}${hbars((rum.byBrowser || []).slice(0, 5), { value: (x) => x.count, label: (x) => x.dimensions.userAgentBrowser || '알 수 없음', sub: (x) => fmt(x.count) })}</div>`;
  })();

  const noData = rowsError === 'empty' || !cur.length;
  const body = `
  <header class="top"><div><h1>WK리그 Data <span>관리자</span></h1><p>${esc(host)} · ${RANGES[range][1]}${range === 'day' ? '' : ` (${from} ~ ${t})`}</p></div>
    <nav class="tabs">${Object.entries(RANGES).map(([k, [l]]) => `<a href="/admin?range=${k}" class="${k === range ? 'on' : ''}">${l}</a>`).join('')}</nav></header>

  <div class="status ${stale ? 'bad' : 'ok'}"><i></i><span>${stale ? '자동 갱신이 멈춘 것 같습니다' : '자동 갱신 정상'} · 연맹 기록 ${ageTxt(dA)} · 뉴스 ${ageTxt(nA)}${summary && summary.newsCount != null ? ` · 기사 ${fmt(summary.newsCount)}건` : ''}</span>${todo.length ? `<b>할 일 ${todo.length}건</b>` : '<em>할 일 없음</em>'}</div>
  ${todo.length ? `<ul class="todo">${todo.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  ${rowsError && rowsError !== 'empty' ? `<p class="warn">${esc(rowsError)}</p>` : ''}

  <section class="kpis">
    <div class="kpi"><span>방문</span><b>${fmt(S.nVisits)}</b>${delta(S.nVisits, P && P.nVisits)}${spark(daily)}</div>
    <div class="kpi"><span>화면 열람</span><b>${fmt(S.nViews)}</b>${delta(S.nViews, P && P.nViews)}<em>방문당 ${S.nVisits ? (S.nViews / S.nVisits).toFixed(1) : 0}개</em></div>
    <div class="kpi"><span>방문당 머문 시간</span><b>${mmss(S.avg)}</b>${delta(S.avg, P && P.avg)}<em>화면을 보고 있던 시간</em></div>
    <div class="kpi"><span>인스타그램에서 온 방문</span><b>${pct(igVisits, S.nVisits)}<small>%</small></b><em>${fmt(igVisits)}명 · 휴대폰 ${pct(mobileVisits, S.nVisits)}%</em></div>
  </section>
  ${range === 'all' ? '' : `<p class="note">▲▼는 바로 앞 같은 길이 기간(${prevFrom} ~ ${prevTo})과 비교한 값입니다.</p>`}

  ${insights.length ? `<section class="card ins"><div class="ch"><h2>이번 기간 인사이트와 제안</h2><span>${small ? `방문 ${V.length}명 · 표본이 적어 참고용` : `방문 ${fmt(V.length)}명 기준`}</span></div><ol class="insl">${insights.map(([a, b]) => `<li><p>${a}</p><p class="act"><span>제안</span>${esc(b)}</p></li>`).join('')}</ol></section>` : ''}
  ${noData ? `<section class="card"><p class="empty big">이 기간에는 아직 쌓인 방문 기록이 없습니다. 사이트를 둘러본 뒤 몇 분 지나 새로고침해 보세요.</p></section>` : `
  <section class="card"><div class="ch"><h2>${range === 'day' ? '시간대별 방문' : '날짜별 방문'}</h2><span>막대에 마우스를 올리면 숫자가 보입니다</span></div>${columns(series, { every: range === 'day' ? 3 : span > 20 ? Math.ceil(span / 10) : 1 })}</section>

  <div class="g2">
    <section class="card"><div class="ch"><h2>방문 흐름 (퍼널)</h2><span>방문 중 몇 %가 다음 단계까지 갔나</span></div>
      <ol class="fn">${funnel.map(([k, n], i) => `<li><div class="fnb" style="width:${Math.max(4, pct(n, funnel[0][1]))}%"></div><div class="fnt"><span>${i + 1}. ${k}</span><b>${fmt(n)}명 · ${pct(n, funnel[0][1])}%</b>${i ? `<em>앞 단계에서 ${funnel[i - 1][1] ? 100 - pct(n, funnel[i - 1][1]) : 0}% 이탈</em>` : ''}</div></li>`).join('')}</ol></section>
    <section class="card"><div class="ch"><h2>유입 경로별 비교</h2><span>참여 방문 = 화면 2개 이상 또는 1분 이상</span></div>
      <div class="tw"><table class="seg"><tr><th>경로</th><th>방문</th><th>화면/방문</th><th>평균 머문 시간</th><th>참여율</th><th>상세 도달</th></tr>${byCh.map((g) => `<tr><td>${esc(g.k)}</td><td>${fmt(g.n)}</td><td>${(g.views / g.n).toFixed(1)}</td><td>${mmss(g.secs / g.n)}</td><td>${pct(g.eng, g.n)}%</td><td>${pct(g.det, g.n)}%</td></tr>`).join('')}<tr class="tot"><td>전체</td><td>${fmt(V.length)}</td><td>${V.length ? (S.nViews / V.length).toFixed(1) : 0}</td><td>${mmss(S.avg)}</td><td>${engRate}%</td><td>${pct(V.filter((v) => v.rows.some(isDetail)).length, V.length)}%</td></tr></table></div></section>
  </div>

  <div class="g2">
    <section class="card"><div class="ch"><h2>오래 본 화면</h2><span>머문 시간 합계 순</span></div>${hbars(pages, { value: (x) => x.secs, label: (x) => PAGE[x.k] || x.k, sub: (x) => `${mmss(x.secs)} · ${fmt(x.n)}회 · 평균 ${mmss(x.secs / x.n)}` })}</section>
    <section class="card"><div class="ch"><h2>들어온 곳</h2><span>방문의 첫 화면 기준</span></div>${refParts.length ? donut(refParts, [fmt(refParts.reduce((s, p) => s + p.v, 0)), '유입']) : '<p class="empty">아직 없음</p>'}</section>
  </div>

  <div class="g3">
    <section class="card"><div class="ch"><h2>접속 지역</h2><span>시·도 · 방문 수</span></div>${hbars(regions, { value: (x) => x.visits, label: (x) => x.k, sub: (x) => `${fmt(x.visits)}명 · ${pct(x.visits, S.nVisits)}%` })}</section>
    <section class="card"><div class="ch"><h2>기기 · 보기 방식</h2><span>방문 수</span></div>${devParts.length ? donut(devParts, [`${pct(mobileVisits, S.nVisits)}%`, '휴대폰']) : '<p class="empty">아직 없음</p>'}</section>
    <section class="card"><div class="ch"><h2>방문 길이</h2><span>한 번 들어와서 머문 시간</span></div>${hbars(lens, { value: (x) => x.v, label: (x) => x.k, sub: (x) => `${fmt(x.v)}명 · ${pct(x.v, S.nVisits)}%` })}</section>
  </div>

  <section class="card"><div class="ch"><h2>요일 · 시간대</h2><span>진할수록 많이 본 시간 (한국 시간)</span></div>${heat(cur)}</section>

  <div class="g3">
    <section class="card"><div class="ch"><h2>많이 본 선수</h2><span>방문 수</span></div>${hbars(players, { value: (x) => x.visits, label: (x) => { const [n, tm] = x.k.split('|'); return tm ? `${n} · ${tm}` : n; }, sub: (x) => `${fmt(x.visits)}명 · ${mmss(x.secs)}` })}</section>
    <section class="card"><div class="ch"><h2>많이 본 팀</h2><span>방문 수</span></div>${hbars(teams, { value: (x) => x.visits, label: (x) => x.k, sub: (x) => `${fmt(x.visits)}명 · ${mmss(x.secs)}` })}</section>
    <section class="card"><div class="ch"><h2>많이 본 경기</h2><span>방문 수</span></div>${hbars(matches, { value: (x) => x.visits, label: (x) => x.k, sub: (x) => `${fmt(x.visits)}명` })}</section>
  </div>`}

  <section class="card"><div class="ch"><h2>지표 정의</h2><span>이 화면의 숫자가 무엇을 뜻하는지</span></div>
    <div class="tw"><table class="def"><tr><th>지표</th><th>정의</th><th>왜 보나</th></tr>
      <tr><td>방문</td><td>창(탭)을 열고 닫을 때까지 한 번. 창을 닫으면 사라지는 임시 번호로 묶음</td><td>사이트를 얼마나 찾는지</td></tr>
      <tr><td>화면 열람</td><td>순위·선수 등 화면 하나를 본 횟수 (같은 화면을 다시 보면 다시 셈)</td><td>방문 한 번에 얼마나 둘러보는지</td></tr>
      <tr><td>머문 시간</td><td>화면이 실제로 보이던 시간만 (다른 앱·탭으로 넘어간 시간 제외, 화면당 최대 30분)</td><td>내용이 읽히는지</td></tr>
      <tr><td>참여 방문</td><td>화면 2개 이상을 봤거나 1분 이상 머문 방문</td><td>잠깐 들렀다 나간 방문과 구분</td></tr>
      <tr><td>상세 도달</td><td>선수·팀·경기 상세 화면까지 본 방문</td><td>이 사이트만의 기록을 실제로 보는지</td></tr>
      <tr><td>유입 경로</td><td>방문의 첫 화면에서 브라우저가 알려 준 이전 사이트 (인스타그램, 카카오톡 등)</td><td>홍보 채널별 효과</td></tr>
      <tr><td>재방문</td><td>측정하지 않음. 개인을 다시 알아보는 쿠키·저장 번호를 쓰지 않기로 한 설계</td><td>개인정보 보호를 우선함</td></tr></table></div></section>

  <div class="g2">
    <section class="card"><div class="ch"><h2>데이터 흐름</h2><span>수집부터 분석까지 자동</span></div>
      <ol class="pipe"><li><b>수집</b><span>연맹 경기 기록·뉴스<br>30분마다 (Node.js)</span></li><li><b>가공</b><span>순위·선수 지표 계산<br>배포 파일 생성</span></li><li><b>배포</b><span>GitHub Actions →<br>Cloudflare Workers</span></li><li><b>기록</b><span>화면별 방문 기록<br>(Analytics Engine)</span></li><li><b>분석</b><span>이 관리자 화면<br>(SQL 집계)</span></li></ol>
      <p class="note">Cloudflare가 30분마다 GitHub에 실행 신호를 보내고, 수집이 실패하면 직전 기록으로 배포합니다.</p></section>
    <section class="card"><div class="ch"><h2>데이터 품질 점검</h2><span>분석 전에 확인하는 것</span></div>
      <ul class="qc">
        <li class="${stale ? 'bad' : 'ok'}"><b>최신성</b><span>연맹 기록 ${ageTxt(dA)} 수집 (4시간 넘으면 경고)</span></li>
        <li class="ok"><b>기록 수</b><span>최근 3개월 ${fmt(rawN)}줄 · 이 기간 ${fmt(cur.length)}줄</span></li>
        <li class="${testN ? 'warn' : 'ok'}"><b>시험 기록 제외</b><span>운영자 확인용 ${fmt(testN)}줄 분석에서 뺌</span></li>
        <li class="${brokenN ? 'warn' : 'ok'}"><b>깨진 글자</b><span>${fmt(brokenN)}줄 (해당 칸만 비우고 셈)</span></li>
        <li class="ok"><b>지역 모름</b><span>${pct(cur.filter((r) => !r.region || r.region === '?').length, cur.length)}% (통신사 위치를 못 받은 경우)</span></li></ul></section>
  </div>

  <section class="card case"><div class="ch"><h2>프로젝트 요약</h2><span>포트폴리오용 · 숫자는 고른 기간 기준으로 자동 갱신</span></div>
    <dl><div><dt>문제</dt><dd>한국 여자축구 WK리그 기록은 연맹 사이트에 경기별 표로만 흩어져 있어, 팬이 순위 흐름·선수 기록을 한눈에 보기 어렵다.</dd></div>
      <div><dt>데이터</dt><dd>연맹 경기 기록(경기·선수 기록)을 30분마다 자동 수집하고, 사이트 이용 기록을 개인 식별 없이 직접 쌓는다.</dd></div>
      <div><dt>방법</dt><dd>수집·가공·배포 자동화, 순위 예측·베스트 11 같은 파생 지표 설계, 방문 흐름(퍼널)과 유입 경로별 비교 분석.</dd></div>
      <div><dt>결과</dt><dd>${RANGES[range][1]} 방문 ${fmt(V.length)}명, 참여율 ${engRate}%, 인스타그램 유입 ${pct(igVisits, S.nVisits)}%, 방문당 ${mmss(S.avg)} 머묾.</dd></div>
      <div><dt>다음 단계</dt><dd>${insights.length ? esc(insights[0][1]) : '기록이 더 쌓이면 유입 경로별 효과를 비교해 홍보 방식을 정한다.'}</dd></div></dl>
    <p class="note"><a href="/admin/export.csv?range=${range}">이 기간 날짜별 지표 내려받기 (CSV)</a></p></section>

  <div class="g2">
    <section class="card"><div class="ch"><h2>Cloudflare 기준 방문</h2><span>${RANGES[range][1]} · 나라 · 브라우저</span></div>${rumBlock || '<p class="empty">없음</p>'}<p class="note">Cloudflare가 따로 세는 수치라 위 숫자와 조금 다를 수 있습니다.</p></section>
    <section class="card"><div class="ch"><h2>바로 가기</h2></div><ul class="links">
      <li><a href="/">사이트 열기</a></li><li><a href="https://github.com/kwfall/wk-league-data-portal/actions" target="_blank" rel="noopener">자동 갱신·배포 기록 (GitHub)</a></li>
      <li><a href="https://dash.cloudflare.com/" target="_blank" rel="noopener">Cloudflare 대시보드</a></li><li><a href="https://www.kwff.or.kr/notice" target="_blank" rel="noopener">연맹 공지사항</a></li></ul>
      <p class="note">지역은 시·도까지만 모으고 IP 주소와 쿠키는 저장하지 않습니다. 기록은 약 3개월 보관됩니다.</p></section>
  </div>`;
  return page(body);
}

export function page(body, title = 'WK리그 Data 관리자') {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<link rel="manifest" href="/manifest-admin.webmanifest"><link rel="apple-touch-icon" href="/assets/admin-apple-touch-icon.png"><meta name="theme-color" content="#d6338a"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="WK 관리자">
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap">
<style>
:root{--bg:#f4f3f0;--card:#fff;--ink:#16161a;--ink2:#5f5e66;--ink3:#93929a;--line:#e6e4df;--c1:#d6338a;--c2:#3b5bdb;--c3:#0c8a73;--c4:#e8890c;--c5:#7048e8;--c6:#9a9aa3;--ok:#1b8a4b;--bad:#d1393a;--track:#efedea}
@media (prefers-color-scheme:dark){:root{--bg:#0f0f12;--card:#18181c;--ink:#f0eff3;--ink2:#a9a8b0;--ink3:#76757d;--line:#2a2a30;--c1:#ff5fae;--c2:#748ffc;--c3:#38d9a9;--c4:#ffa94d;--c5:#9775fa;--c6:#868e96;--ok:#51cf66;--bad:#ff6b6b;--track:#24242a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 "IBM Plex Sans KR",system-ui,sans-serif}
main{max-width:1180px;margin:0 auto;padding:28px max(16px,env(safe-area-inset-left,0px)) 56px}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:18px}
h1{margin:0;font-size:26px;font-weight:700;letter-spacing:-.02em}h1 span{color:var(--c1)}.top p{margin:4px 0 0;color:var(--ink2);font-size:13px}
.tabs{display:flex;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:4px;gap:2px}
.tabs a{padding:8px 18px;border-radius:9px;color:var(--ink2);text-decoration:none;font-weight:600;font-size:14px}.tabs a.on{background:var(--ink);color:var(--bg)}
.status{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;font-size:13px;color:var(--ink2)}
.status i{width:9px;height:9px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 4px color-mix(in srgb,var(--ok) 18%,transparent)}.status.bad i{background:var(--bad);box-shadow:0 0 0 4px color-mix(in srgb,var(--bad) 18%,transparent)}
.status span{flex:1}.status b{color:var(--c1)}.status em{font-style:normal;color:var(--ink3)}
.todo{margin:8px 0 0;padding:10px 14px 10px 32px;background:color-mix(in srgb,var(--c1) 8%,var(--card));border-radius:12px;font-size:14px}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}
.kpi{position:relative;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 16px 14px;display:grid;gap:2px;min-width:0}
.kpi span{font-size:13px;color:var(--ink2)}.kpi b{font-size:32px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.15}.kpi b small{font-size:18px;margin-left:2px}
.kpi em{font-style:normal;font-size:12px;color:var(--ink3)}.d{font-size:12px;font-weight:600;color:var(--ink3)}.d.up{color:var(--ok)}.d.down{color:var(--bad)}
.spark{position:absolute;right:14px;top:16px;width:96px;height:30px}.spark polyline{fill:none;stroke:var(--c1);stroke-width:2;stroke-linejoin:round}.spark circle{fill:var(--c1)}
.note{margin:8px 2px 0;font-size:12px;color:var(--ink3)}.note a{color:var(--c1)}
.insl{margin:0;padding-left:20px;display:grid;gap:12px}.insl p{margin:0}.insl .act{margin-top:4px;color:var(--ink2);font-size:14px}.insl .act span{display:inline-block;font-size:11px;font-weight:700;color:var(--c1);border:1px solid var(--c1);border-radius:6px;padding:0 6px;margin-right:6px;vertical-align:1px}
.fn{list-style:none;margin:0;padding:0;display:grid;gap:10px}.fn li{position:relative;background:var(--track);border-radius:10px;overflow:hidden}.fnb{position:absolute;inset:0 auto 0 0;background:color-mix(in srgb,var(--c1) 30%,transparent)}
.fnt{position:relative;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;padding:10px 12px}.fnt span{flex:1;font-weight:600;font-size:14px}.fnt b{font-variant-numeric:tabular-nums;font-size:14px}.fnt em{font-style:normal;font-size:12px;color:var(--ink2);width:100%}
.tw{overflow-x:auto}.seg,.def{width:100%;border-collapse:collapse;font-size:14px}.seg th,.def th{text-align:left;font-size:12px;color:var(--ink3);font-weight:500;padding:6px 8px;border-bottom:1px solid var(--line)}.seg td,.def td{padding:8px;border-bottom:1px solid var(--line);vertical-align:top}
.seg th:not(:first-child),.seg td:not(:first-child){text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.seg{min-width:520px}.seg td:first-child{white-space:nowrap}.seg tr.tot td{font-weight:700}.def td:first-child{white-space:nowrap;font-weight:600}
.pipe{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;counter-reset:p}.pipe li{position:relative;border:1px solid var(--line);border-radius:10px;padding:10px;display:grid;gap:4px;font-size:12px;color:var(--ink2)}.pipe b{font-size:14px;color:var(--ink)}.pipe li:not(:last-child)::after{content:'→';position:absolute;right:-9px;top:50%;transform:translateY(-50%);color:var(--c1);font-weight:700;background:var(--card)}
.qc{list-style:none;margin:0;padding:0;display:grid;gap:8px}.qc li{display:grid;grid-template-columns:12px 110px minmax(0,1fr);gap:8px;align-items:baseline;font-size:14px}.qc li::before{content:'';width:9px;height:9px;border-radius:50%;background:var(--ok)}.qc li.warn::before{background:var(--c4)}.qc li.bad::before{background:var(--bad)}.qc span{color:var(--ink2)}
.case dl{margin:0;display:grid;gap:10px}.case dl div{display:grid;grid-template-columns:90px minmax(0,1fr);gap:12px}.case dt{font-weight:700;color:var(--c1)}.case dd{margin:0}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:16px;min-width:0}
.ch{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:12px}.ch h2{margin:0;font-size:16px;font-weight:700}.ch span{font-size:12px;color:var(--ink3)}
.g2{display:grid;grid-template-columns:1.4fr 1fr;gap:16px}.g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.g2>.card,.g3>.card{margin-top:16px}
.chart{width:100%;height:auto;display:block}.chart .grid{stroke:var(--line);stroke-dasharray:3 4}.chart .ax{font:11px "IBM Plex Mono",monospace;fill:var(--ink3)}.chart .col{fill:var(--c1);opacity:.85}.chart .col.hi{opacity:1}.chart g:hover .col{opacity:1;fill:var(--ink)}
.hb{list-style:none;margin:0;padding:0;display:grid;gap:10px}.hb li{display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;align-items:center}
.rk{font:500 12px "IBM Plex Mono",monospace;color:var(--ink3);text-align:right}.hbt{display:flex;justify-content:space-between;gap:8px;font-size:14px;margin-bottom:4px}.hbt .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hbt b{font-weight:500;font-size:12px;color:var(--ink2);white-space:nowrap;font-variant-numeric:tabular-nums}
.trk{height:8px;background:var(--track);border-radius:99px;overflow:hidden}.trk i{display:block;height:100%;background:var(--c1);border-radius:99px}
.donut{display:grid;grid-template-columns:140px minmax(0,1fr);gap:18px;align-items:center}.donut svg{width:140px;height:140px}.dn{font:700 22px "IBM Plex Sans KR",sans-serif;fill:var(--ink)}.dl{font-size:11px;fill:var(--ink3)}
.legend{list-style:none;margin:0;padding:0;display:grid;gap:8px;font-size:14px}.legend li{display:grid;grid-template-columns:12px minmax(0,1fr) auto auto;gap:8px;align-items:center}.legend i{width:12px;height:12px;border-radius:3px}.legend span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.legend b{font-variant-numeric:tabular-nums}.legend em{font-style:normal;color:var(--ink3);font-size:12px;min-width:28px;text-align:right}
.heat{display:grid;grid-template-columns:22px repeat(24,minmax(0,1fr));gap:3px;font:11px "IBM Plex Mono",monospace;color:var(--ink3)}.heat .hx{text-align:center}.heat .hy{text-align:right;padding-right:4px;line-height:20px}
.heat i{height:20px;border-radius:4px;background:color-mix(in srgb,var(--c1) calc(var(--a)*100%),var(--track))}
.mini{display:flex;gap:24px;margin-bottom:12px}.mini span{display:block;font-size:12px;color:var(--ink3)}.mini b{font-size:22px;font-variant-numeric:tabular-nums}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.links{margin:0;padding-left:18px;display:grid;gap:6px}.links a{color:var(--c1);font-weight:500}
.empty{color:var(--ink3);font-size:14px;margin:0}.empty.big{text-align:center;padding:40px 0}.warn{color:var(--bad);font-size:14px}
@media (max-width:900px){.pipe{grid-template-columns:1fr}.pipe li:not(:last-child)::after{content:'↓';right:auto;left:50%;top:auto;bottom:-14px;transform:translateX(-50%)}.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.g2,.g3{grid-template-columns:1fr}.spark{display:none}}
@media (max-width:520px){.donut{grid-template-columns:1fr;justify-items:center}.heat{gap:2px}.heat i{height:14px}.tabs a{padding:8px 12px}.kpi b{font-size:26px}.cols2{grid-template-columns:1fr}}
</style></head><body><main>${body}</main></body></html>`;
}

// 날짜별 지표 CSV (엑셀에서 한글이 깨지지 않게 BOM 을 붙인다)
export function renderCsv({ rows = [], range = 'week', now = new Date() }) {
  rows = rows.filter((r) => !/^(selfcheck|check)\d/.test(String(r.visit)));
  const t = todayK(now), from = rangeFrom(range, now), span = daysBetween(from, t) + 1, out = [['날짜', '방문', '화면 열람', '머문 시간 합계(초)', '방문당 머문 시간(초)', '참여 방문', '인스타그램 유입 방문']];
  for (let i = 0; i < span; i++) {
    const d = addDays(from, i), S = stats(rows.filter((r) => kday(r.timestamp) === d)), V = [...S.visits.values()];
    out.push([d, S.nVisits, S.nViews, Math.round(S.secs), Math.round(S.avg), V.filter((v) => v.n >= 2 || v.secs >= 60).length, V.filter((v) => v.rows.some((r) => /instagram/.test(r.ref || ''))).length]);
  }
  return '\uFEFF' + out.map((r) => r.join(',')).join('\n') + '\n';
}
