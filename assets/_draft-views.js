// 화면 구성: 각 함수가 한 페이지의 HTML을 만든다
(function () {
  const WK = window.WK, V = (WK.views = {});
  const S = (WK.state = { season: WK.seasons[0], tableMode: 'all', metric: 'gfpg', sort: { key: 'points', dir: -1 }, pTeam: '', pPos: '', minMin: 0, q: '', pA: '', pB: '', round: null, histClub: 'hyundai', histYear: null });

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fin = Number.isFinite;
  const f1 = (n) => (fin(n) ? n.toFixed(1) : '–'), f2 = (n) => (fin(n) ? n.toFixed(2) : '–');
  const pct = (n) => (fin(n) ? (n * 100).toFixed(1) + '%' : '–'), pct0 = (n) => (fin(n) ? (n < 0.005 && n > 0 ? '<1%' : Math.round(n * 100) + '%') : '–');
  const sgn = (n) => (n > 0 ? '+' : '') + n;
  const KR = { W: '승', D: '무', L: '패' };
  const day = (m) => { const d = new Date(m.datetime); return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')} (${'일월화수목금토'[d.getDay()]}) ${m.datetime.slice(11, 16)}`; };
  const tHref = (t) => `#/team/${encodeURIComponent(t)}`, pHref = (p) => `#/player/${encodeURIComponent(p.key)}`;
  const dot = (B, t) => `<span class="dot" style="background:${B.color[t] || 'var(--rest)'}"></span>`;
  const tLink = (B, t) => `<a href="${tHref(t)}">${dot(B, t)}${esc(t)}</a>`;
  const formHtml = (form, n = 5) => `<span class="form">${form.slice(-n).map((f) => `<span class="${f.x}" data-tip="${esc(`${f.m.round} ${f.m.home} ${f.m.homeScore}:${f.m.awayScore} ${f.m.away}`)}">${KR[f.x]}</span>`).join('')}</span>`;
  const tile = (k, v, n = '') => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="n">${n}</div></div>`;
  const card = (title, sub, body, extra = '') => `<section class="card"><div class="row"><div><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : '<p class="sub"></p>'}</div>${extra}</div>${body}</section>`;
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(label)}</option>`;

  // ---------- 그래프 ----------
  function lineChart({ W = 900, H = 280, l = 34, r = 20, t = 14, b = 30, x, y, invert, xt = [], yt = [], series }) {
    const sx = (v) => l + ((W - l - r) * (v - x[0])) / (x[1] - x[0] || 1);
    const sy = (v) => { const k = (v - y[0]) / (y[1] - y[0] || 1); return invert ? t + (H - t - b) * k : H - b - (H - t - b) * k; };
    let g = '';
    for (const [v, lab] of yt) g += `<line x1="${l}" x2="${W - r}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--grid)"/><text x="${l - 8}" y="${sy(v) + 4}" text-anchor="end">${lab}</text>`;
    for (const [v, lab] of xt) g += `<text x="${sx(v)}" y="${H - 8}" text-anchor="middle">${lab}</text>`;
    for (const s of series) {
      const pts = s.pts.filter((p) => fin(p[1]));
      if (!pts.length) continue;
      g += `<g opacity="${s.op ?? 1}"><polyline points="${pts.map((p) => `${sx(p[0])},${sy(p[1])}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${s.w || 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (s.dots) g += pts.map((p) => `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="${p[3] ? 5.5 : 3.5}" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>${p[3] ? `<text x="${sx(p[0])}" y="${sy(p[1]) - 10}" text-anchor="middle" style="fill:var(--ink);font-weight:700;font-size:11px">${p[3]}</text>` : ''}`).join('');
      if (s.label) { const e = pts[pts.length - 1]; g += `<circle cx="${sx(e[0])}" cy="${sy(e[1])}" r="4.5" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/><text x="${sx(e[0]) + 11}" y="${sy(e[1]) + 4}" style="fill:var(--ink);${s.bold ? 'font-weight:700' : ''}">${esc(s.label)}</text>`; }
      g += '</g>';
      if (s.hit !== false) g += pts.map((p) => (p[2] ? `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="11" fill="transparent" data-tip="${esc(p[2])}"/>` : '')).join('');
    }
    return `<svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
  }

  function bump(B, hi) {
    const Hh = B.history, R = Hh.length, N = B.teams.length;
    if (R < 2) return '<div class="empty">순위 변동을 그리기엔 경기가 부족합니다.</div>';
    const rk = (t, i) => Hh[i].find((s) => s.team === t);
    const step = R > 20 ? 3 : R > 10 ? 2 : 1, xt = [];
    for (let r = 1; r <= R; r++) if (r === 1 || r === R || (r % step === 0 && R - r >= step)) xt.push([r, r + 'R']);
    const order = [...B.teams].sort((a, b) => (a === hi) - (b === hi));
    const series = order.map((t) => ({ color: B.color[t], w: t === hi ? 3.5 : 2, op: hi && hi !== t ? 0.2 : 1, label: t, bold: t === hi, hit: !hi || hi === t, pts: Hh.map((_, i) => { const s = rk(t, i); return [i + 1, s.rank, `${t} · ${i + 1}R까지 ${s.rank}위 · 승점 ${s.pts}`]; }) }));
    const svg = lineChart({ W: 900, H: 30 + 34 * (N - 1) + 34, r: 150, x: [1, R], y: [1, N], invert: true, xt, yt: Array.from({ length: N }, (_, i) => [i + 1, i + 1]), series });
    const tbl = `<table><thead><tr><th class="l">팀</th>${Hh.map((_, i) => `<th>${i + 1}R</th>`).join('')}</tr></thead><tbody>${B.teams.map((t) => `<tr><td class="l">${esc(t)}</td>${Hh.map((_, i) => `<td>${rk(t, i).rank}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return `<div class="scroll"><div style="min-width:640px">${svg}</div></div><details><summary>표로 보기</summary><div class="scroll">${tbl}</div></details>`;
  }

  function timingChart(F, A) {
    const W = 900, H = 240, l = 34, b = 30, t = 12, ph = H - t - b, n = WK.BUCKETS.length;
    const max = Math.max(...F, ...(A || [0]), 1), nice = Math.ceil(max / 4) * 4, y = (v) => t + ph - (ph * v) / nice, bw = (W - l) / n;
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = (nice / 4) * i; g += `<line x1="${l}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="${i ? 'var(--grid)' : 'var(--axis)'}"/><text x="${l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; }
    const bar = (x, w, v, c, tip) => { if (!v) return ''; const h = ph - (y(v) - t), q = Math.min(4, h); return `<path data-tip="${esc(tip)}" d="M${x},${y(0)} v${-(h - q)} q0,${-q} ${q},${-q} h${w - 2 * q} q${q},0 ${q},${q} v${h - q} z" fill="${c}"/>`; };
    WK.BUCKETS.forEach((bk, i) => {
      const cx = l + bw * i + bw / 2, w = Math.min(44, bw / 3);
      g += A ? bar(cx - w - 1, w, F[i], 'var(--s1)', `${bk}분 · 득점 ${F[i]}`) + bar(cx + 1, w, A[i], 'var(--s2)', `${bk}분 · 실점 ${A[i]}`) : bar(cx - w / 2, w, F[i], 'var(--s1)', `${bk}분 · ${F[i]}골`);
      g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${bk}</text>`;
    });
    const legend = A ? `<div class="legend"><span><span class="dot" style="background:var(--s1)"></span>득점</span><span><span class="dot" style="background:var(--s2)"></span>실점</span></div>` : '';
    const tbl = `<table><thead><tr><th class="l">시간대(분)</th>${WK.BUCKETS.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody><tr><td class="l">${A ? '득점' : '골'}</td>${F.map((v) => `<td>${v}</td>`).join('')}</tr>${A ? `<tr><td class="l">실점</td>${A.map((v) => `<td>${v}</td>`).join('')}</tr>` : ''}</tbody></table>`;
    return `${legend}<svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg><details><summary>표로 보기</summary><div class="scroll">${tbl}</div></details>`;
  }

  function matchRow(B, m, P) {
    const f = P && P.byMatch[m.id];
    const meta = `<div class="meta">${m.round} · ${day(m)}${m.venue ? ' · ' + esc(m.venue) : ''}</div>`;
    if (m.finished) return `<a class="match" href="#/match/${m.id}"><div class="h">${esc(m.home)}</div><div class="sc">${m.homeScore} : ${m.awayScore}</div><div class="a">${esc(m.away)}</div>${meta}</a>`;
    return `<div class="match"><div class="h">${esc(m.home)}</div><div class="sc" style="color:var(--muted);font-size:14px">예정</div><div class="a">${esc(m.away)}</div>${meta}${f ? `<div class="prob" data-tip="예상 득점 ${f2(f.lh)} : ${f2(f.la)}"><b class="ph" style="width:${f.pH * 100}%"></b><b class="pd" style="width:${f.pD * 100}%"></b><b class="pa" style="width:${f.pA * 100}%"></b></div><div class="probtxt"><span>홈 승 ${pct0(f.pH)}</span><span>무 ${pct0(f.pD)}</span><span>원정 승 ${pct0(f.pA)}</span></div>` : ''}</div>`;
  }

  function standingsTable(B, mode, P) {
    const rows = WK.standings(B.league, B.teams, mode);
    return `<div class="scroll"><table><thead><tr><th>순위</th><th class="l">팀</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득점</th><th>실점</th><th>득실</th><th>승점</th>${P && mode === 'all' ? '<th data-tip="남은 일정을 2만 번 모의실험한 결과">1위 확률</th>' : ''}<th class="l">최근 5경기</th></tr></thead>
      <tbody>${rows.map((r) => `<tr class="click" data-href="${tHref(r.team)}"><td>${r.rank}</td><td class="l">${tLink(B, r.team)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${sgn(r.gd)}</td><td><b>${r.pts}</b></td>${P && mode === 'all' ? `<td>${pct0(P.teams[r.team].title)}</td>` : ''}<td class="l">${formHtml(r.form)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  // ---------- 개요 ----------
  V.home = function (B) {
    if (!B.league.length) return '<div class="empty">이 시즌에는 종료된 경기가 없습니다.</div>';
    const P = WK.predict(B), a = B.table[0], b = B.table[1], done = !B.upcoming.length, total = B.all.length;
    const headline = done ? `${esc(a.team)}, 승점 ${a.pts}로 정규리그 1위` : `${esc(a.team)}, 승점 ${a.pts}로 선두 질주`;
    const sub = done ? `${a.w}승 ${a.d}무 ${a.l}패. 2위 ${esc(b.team)}과 ${a.pts - b.pts}점 차로 정규리그를 마쳤습니다.` : `2위 ${esc(b.team)}과 ${a.pts - b.pts}점 차. ${total}경기 중 ${B.league.length}경기를 치렀고 ${B.upcoming.length}경기가 남았습니다.`;
    let side;
    if (P) {
      const top = B.teams.map((t) => ({ t, p: P.teams[t].title })).sort((x, y) => y.p - x.p).slice(0, 4);
      side = `<h3>정규리그 1위 확률</h3><div class="race">${top.map((x) => `<a href="${tHref(x.t)}">${esc(x.t)}</a><div class="tr"><b style="width:${x.p * 100}%"></b></div><div class="pv">${pct0(x.p)}</div>`).join('')}</div><p style="font-size:12px;margin-top:12px"><a class="link" href="#/predict" style="border-color:rgba(255,255,255,.4)">예측 방법과 전체 결과 보기</a></p>`;
    } else if (B.post.length) {
      side = `<h3>포스트시즌</h3>${B.post.map((m) => `<div style="display:flex;justify-content:space-between;gap:10px;font-size:14px;padding:5px 0"><span>${esc(m.home)} <b>${m.homeScore}:${m.awayScore}</b> ${esc(m.away)}</span><span style="opacity:.7">${{ PO: '플레이오프', CF1: '챔프전 1차', CF2: '챔프전 2차' }[m.round] || m.round}</span></div>`).join('')}`;
    } else side = `<h3>최종 순위</h3>${B.table.slice(0, 4).map((r) => `<div style="display:flex;justify-content:space-between;font-size:14px;padding:5px 0"><span>${r.rank}. ${esc(r.team)}</span><b>${r.pts}점</b></div>`).join('')}`;

    const ins = WK.insights(B);
    const recent = [...B.league].sort((x, y) => y.datetime.localeCompare(x.datetime)).slice(0, 5);
    const tab = (m, l) => `<button data-set="tableMode:${m}" aria-pressed="${S.tableMode === m}">${l}</button>`;
    return `<div class="stack">
      <div class="hero"><div><div class="eyebrow">${B.year} WK리그 · ${done ? '정규리그 종료' : `${Math.round((B.league.length / total) * 100)}% 진행`}</div><h1>${headline}</h1><p>${sub}</p><div class="progress"><b style="width:${(B.league.length / total) * 100}%"></b></div></div><div class="hero-side">${side}</div></div>
      <div><h2 style="font-size:17px;margin:8px 0 12px">데이터가 찾아낸 이번 시즌</h2><div class="grid g3">${ins.map((i) => `<a class="insight" href="${i.href}"><div class="k">${i.k}</div><div class="v">${i.v}</div><div class="t">${esc(i.t)}</div><div class="go">자세히 보기 →</div></a>`).join('')}</div></div>
      ${card('순위표', '경기 결과로 직접 계산 (승점 → 득실차 → 다득점) · 팀을 누르면 팀 페이지로 이동', standingsTable(B, S.tableMode, P), `<div class="tabs">${tab('all', '전체')}${tab('home', '홈')}${tab('away', '원정')}</div>`)}
      ${card('라운드별 순위 변동', '각 라운드까지의 누적 순위 · 순연 경기는 원래 라운드에 포함', bump(B))}
      <div class="grid g2">${card('최근 경기', '눌러서 경기 기록 보기', recent.map((m) => matchRow(B, m)).join(''))}
      ${B.upcoming.length ? card('다음 경기', '막대는 예측 승·무·패 확률', B.upcoming.slice(0, 5).map((m) => matchRow(B, m, P)).join('')) : card('포스트시즌', '', B.post.length ? B.post.map((m) => matchRow(B, m)).join('') : '<div class="empty">기록 없음</div>')}</div>
    </div>`;
  };

  // ---------- 팀 ----------
  const METRICS = {
    gfpg: ['경기당 득점', (t) => t.gf / t.g, f2], gapg: ['경기당 실점', (t) => t.ga / t.g, f2], shpg: ['경기당 슈팅', (t) => t.sh / t.sg, f1], shapg: ['경기당 피슈팅', (t) => t.sha / t.sg, f1],
    sotr: ['유효슈팅 비율', (t) => t.sot / t.sh, pct], conv: ['슈팅 대비 득점률', (t) => t.gfS / t.sh, pct], save: ['피유효슈팅 대비 실점률', (t) => t.gaS / t.sota, pct], foul: ['경기당 파울', (t) => t.fouls / t.sg, f1], corner: ['경기당 코너킥', (t) => t.corners / t.sg, f1],
  };
  V.teams = function (B) {
    const usable = Object.entries(METRICS).filter(([, m]) => B.teams.some((t) => fin(m[1](B.T[t]))));
    if (!usable.some(([k]) => k === S.metric)) S.metric = 'gfpg';
    const M = METRICS[S.metric];
    const rows = B.teams.map((t) => ({ t, v: M[1](B.T[t]) })).filter((r) => fin(r.v)).sort((x, y) => y.v - x.v), max = Math.max(...rows.map((r) => r.v), 0) || 1;
    const matrix = `<div class="scroll"><table class="heat"><thead><tr><th class="l">홈 ＼ 원정</th>${B.teams.map((t) => `<th class="c">${esc(t)}</th>`).join('')}</tr></thead><tbody>${B.teams.map((h) => `<tr><td class="l">${tLink(B, h)}</td>${B.teams.map((a) => h === a ? '<td style="background:var(--wash)"></td>' : `<td class="hc">${B.league.filter((m) => m.home === h && m.away === a).map((m) => `<a href="#/match/${m.id}"><div class="${m.homeScore > m.awayScore ? 'W' : m.homeScore < m.awayScore ? 'L' : 'D'}" data-tip="${m.round} · ${day(m)}">${m.homeScore}:${m.awayScore}</div></a>`).join('') || '<span style="color:var(--muted)">–</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `<h1 class="page-title">팀</h1><p class="page-sub">${B.year}시즌 ${B.teams.length}개 구단 · 카드를 누르면 팀 분석으로 이동합니다</p><div class="stack">
      <div class="grid g4">${B.table.map((r) => `<a class="team-card" style="--c:${B.color[r.team]}" href="${tHref(r.team)}"><div class="rk">${r.rank}위</div><div class="nm">${esc(r.team)}</div><div class="st"><div><b>${r.pts}</b>승점</div><div><b>${r.gf}</b>득점</div><div><b>${r.ga}</b>실점</div></div>${formHtml(r.form)}</a>`).join('')}</div>
      ${card('팀 지표 비교', '슈팅 관련 지표는 슈팅 기록이 있는 경기만 집계', `<div class="bars">${rows.map((r) => `<a href="${tHref(r.t)}">${esc(r.t)}</a><div class="track"><div class="bar" style="width:${(r.v / max) * 100}%"></div></div><div class="val">${M[2](r.v)}</div>`).join('')}</div>`, `<label style="font-size:13px;color:var(--ink-2)">지표 <select data-bind="metric">${usable.map(([k, m]) => opt(k, m[0], S.metric)).join('')}</select></label>`)}
      ${card('상대 전적 매트릭스', '행이 홈 팀, 열이 원정 팀 · 점수는 홈:원정 · 눌러서 경기 기록 보기', `<div class="legend"><span><span class="res W">승</span>&nbsp;홈 승</span><span><span class="res D">무</span>&nbsp;무승부</span><span><span class="res L">패</span>&nbsp;홈 패</span></div>${matrix}`)}
    </div>`;
  };

  V.team = function (B, name) {
    const r = B.rank[name];
    if (!r) return `<div class="empty">${B.year}시즌에 '${esc(name)}' 팀이 없습니다. <a class="link" href="#/teams">팀 목록</a></div>`;
    const t = B.T[name], st = B.streaks[name], home = WK.standings(B.league, B.teams, 'home').find((x) => x.team === name), away = WK.standings(B.league, B.teams, 'away').find((x) => x.team === name);
    const P = WK.predict(B), ms = B.all.filter((m) => m.home === name || m.away === name);
    const strip = ms.map((m) => { const isH = m.home === name, opp = isH ? m.away : m.home; if (!m.finished) return `<a class="N" data-tip="${esc(`${m.round} ${isH ? '홈' : '원정'} vs ${opp} · ${day(m)}`)}">${m.r}<small>예정</small></a>`; const gf = isH ? m.homeScore : m.awayScore, ga = isH ? m.awayScore : m.homeScore; return `<a class="${gf > ga ? 'W' : gf < ga ? 'L' : 'D'}" href="#/match/${m.id}" data-tip="${esc(`${m.round} ${isH ? '홈' : '원정'} vs ${opp} ${gf}:${ga}`)}">${gf}:${ga}<small>${m.r}R</small></a>`; }).join('');
    let detail = '';
    if (B.hasDetail) {
      const played = ms.filter((m) => m.finished && m.stats && m.stats.shots);
      const roll = (arr, i) => { const s = arr.slice(Math.max(0, i - 4), i + 1); return s.reduce((x, y) => x + y, 0) / s.length; };
      const sf = played.map((m) => m.stats.shots[m.home === name ? 'home' : 'away']), sa = played.map((m) => m.stats.shots[m.home === name ? 'away' : 'home']);
      const maxS = Math.ceil(Math.max(...sf.map((_, i) => roll(sf, i)), ...sa.map((_, i) => roll(sa, i)), 4) / 4) * 4;
      const trend = lineChart({ H: 250, r: 60, x: [1, Math.max(played.length, 2)], y: [0, maxS], xt: played.map((m, i) => [i + 1, i % 4 === 0 || i === played.length - 1 ? m.r + 'R' : '']), yt: [0, maxS / 4, maxS / 2, (maxS * 3) / 4, maxS].map((v) => [v, v]),
        series: [{ color: 'var(--s1)', w: 2.5, label: '슈팅', pts: sf.map((_, i) => [i + 1, roll(sf, i), `${played[i].round} · 최근 5경기 평균 슈팅 ${f1(roll(sf, i))} (이 경기 ${sf[i]})`]) }, { color: 'var(--s2)', w: 2.5, label: '피슈팅', pts: sa.map((_, i) => [i + 1, roll(sa, i), `${played[i].round} · 최근 5경기 평균 피슈팅 ${f1(roll(sa, i))} (이 경기 ${sa[i]})`]) }] });
      const squad = B.players.filter((p) => p.team === name).sort((x, y) => y.minutes - x.minutes), maxMin = squad[0] ? squad[0].minutes : 1;
      detail = `<div class="grid g2">${card('슈팅 흐름', '최근 5경기 이동평균 · 파란 선이 주황 선보다 위에 있을수록 경기를 주도', `<div class="legend"><span><span class="dot" style="background:var(--s1)"></span>우리 슈팅</span><span><span class="dot" style="background:var(--s2)"></span>상대 슈팅</span></div>${trend}`)}
        ${card('득점·실점 시간대', '15분 단위 · 추가시간 골 포함', timingChart(B.timing[name].f, B.timing[name].a))}</div>
        ${card('선수단', '출전 시간 순 · 선수를 누르면 선수 분석으로 이동', `<div class="scroll"><table><thead><tr><th class="l">선수</th><th class="l">포지션</th><th>경기(선발)</th><th class="l" style="width:34%">출전 시간</th><th>득점</th><th>도움</th><th>슈팅</th><th>경고</th></tr></thead><tbody>${squad.map((p) => `<tr class="click" data-href="${pHref(p)}"><td class="l"><a href="${pHref(p)}"><b>${esc(p.name)}</b> <span style="color:var(--muted)">#${p.number ?? ''}</span></a></td><td class="l">${esc(p.position)}</td><td>${p.apps} (${p.starts})</td><td class="l"><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:8px;background:var(--wash);border-radius:99px"><div style="width:${(p.minutes / maxMin) * 100}%;height:100%;background:${B.color[name]};border-radius:99px"></div></div><span style="min-width:48px;text-align:right">${p.minutes}분</span></div></td><td>${p.goals}</td><td>${p.assists}</td><td>${p.shots}</td><td>${p.yellows}</td></tr>`).join('')}</tbody></table></div>`)}`;
    }
    const Hs = WK.history(), cid = Hs.clubIdByName[name], club = cid && Hs.clubs[cid];
    let hist = '';
    if (club) {
      const ys = Hs.years, pts = ys.filter((y) => club.ranks[y]).map((y) => [y, club.ranks[y], `${y} ${WK.nameIn(cid, y)} · ${club.ranks[y]}위${Hs.seasons[y].champion === cid ? ' · 우승' : ''}`, Hs.seasons[y].champion === cid ? '★' : '']);
      hist = card('구단 역사', `정규리그 순위 (${club.first}~${club.last}) · ★는 챔피언결정전 우승 · 통산 ${club.titles}회 우승`, lineChart({ H: 230, x: [ys[0], ys[ys.length - 1]], y: [1, 8], invert: true, xt: ys.filter((y) => y % 2 === 1 || y === ys[ys.length - 1]).map((y) => [y, "'" + String(y).slice(2)]), yt: [1, 2, 3, 4, 5, 6, 7, 8].map((v) => [v, v]), series: [{ color: B.color[name], w: 2.5, dots: true, pts }] }) + `<p class="note">2024년 이전 순위는 위키백과 기준이며 <a class="link" href="#/history">역사</a> 페이지에서 전체를 볼 수 있습니다.</p>`);
    }
    return `<div class="crumb"><a href="#/teams">팀</a> / ${B.year}시즌</div><h1 class="page-title"><span class="dot" style="background:${B.color[name]};width:16px;height:16px"></span>${esc(name)}</h1>
      <p class="page-sub">${r.rank}위 · ${r.p}경기 ${r.w}승 ${r.d}무 ${r.l}패 · 승점 ${r.pts}${P ? ` · 정규리그 1위 확률 ${pct0(P.teams[name].title)} · 3위 이내 ${pct0(P.teams[name].top3)}` : ''}</p>
      <div class="stack"><section class="card"><div class="grid g4">
        ${tile('경기당 득점 / 실점', `${f2(t.gf / t.g)} / ${f2(t.ga / t.g)}`, `득실차 ${sgn(r.gd)} · 무실점 ${t.cs}경기`)}
        ${tile('홈 성적', `${home.w}승 ${home.d}무 ${home.l}패`, `${home.gf}득점 ${home.ga}실점`)}
        ${tile('원정 성적', `${away.w}승 ${away.d}무 ${away.l}패`, `${away.gf}득점 ${away.ga}실점`)}
        ${t.sg ? tile('슈팅 대비 득점률', pct(t.gfS / t.sh), `경기당 슈팅 ${f1(t.sh / t.sg)} · 피슈팅 ${f1(t.sha / t.sg)}`) : tile('최장 무패', `${st.bestUnbeaten}경기`, `최장 연승 ${st.bestWin}경기`)}
      </div><h2 style="margin-top:22px">시즌 전 경기</h2><p class="sub">칸 하나가 한 경기 · 최장 ${st.bestWin}연승, ${st.bestUnbeaten}경기 무패</p><div class="strip">${strip}</div></section>${detail}${hist}</div>`;
  };

  // ---------- 선수 ----------
  const PCOLS = [['name', '선수', 'l'], ['team', '팀', 'l'], ['position', '포지션', 'l'], ['apps', '경기'], ['minutes', '출전(분)'], ['goals', '득점'], ['assists', '도움'], ['points', '공격P'], ['shots', '슈팅'], ['sot', '유효슈팅'], ['g90', '90분당 득점'], ['pt90', '90분당 공격P'], ['conv', '득점률'], ['yellows', '경고'], ['reds', '퇴장']];
  function playerRows(B) {
    const { key, dir } = S.sort;
    return B.players.filter((p) => (!S.pTeam || p.team === S.pTeam) && (!S.pPos || p.position === S.pPos) && p.minutes >= S.minMin && (!S.q || p.name.includes(S.q)))
      .sort((a, b) => { const x = a[key], y = b[key]; if (typeof x === 'string') return dir * x.localeCompare(y, 'ko'); return (fin(y) - fin(x)) || dir * (x - y) || b.minutes - a.minutes; });
  }
  V.playerBody = function (B) {
    const rows = playerRows(B);
    const cell = (p, k) => (k === 'g90' || k === 'pt90' ? f2(p[k]) : k === 'conv' ? pct(p[k]) : k === 'team' ? dot(B, p.team) + esc(p.team) : k === 'name' ? `<a href="${pHref(p)}"><b>${esc(p.name)}</b> <span style="color:var(--muted)">#${p.number ?? ''}</span></a>` : esc(p[k]));
    return rows.length ? rows.map((p) => `<tr class="click" data-href="${pHref(p)}">${PCOLS.map(([k, , c]) => `<td class="${c || ''}">${cell(p, k)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${PCOLS.length}" class="l">조건에 맞는 선수가 없습니다.</td></tr>`;
  };
  V.players = function (B) {
    if (!B.hasDetail) return `<h1 class="page-title">선수</h1><div class="card empty">${B.year}시즌은 연맹 사이트에 경기 결과만 공개되어 있어 선수 기록이 없습니다.</div>`;
    const q = B.players.filter((p) => p.position !== 'GK' && p.minutes >= B.qualMin && p.shots > 0);
    const W = 900, H = 380, l = 44, b = 40, t = 14, r = 20, mx = Math.max(...q.map((p) => p.s90)) * 1.05, my = Math.max(...q.map((p) => p.g90)) * 1.1;
    const sx = (v) => l + ((W - l - r) * v) / mx, sy = (v) => H - b - ((H - t - b) * v) / my;
    let g = '';
    for (let i = 0; i <= 4; i++) { const vy = (my / 4) * i, vx = (mx / 4) * i; g += `<line x1="${l}" x2="${W - r}" y1="${sy(vy)}" y2="${sy(vy)}" stroke="var(--grid)"/><text x="${l - 8}" y="${sy(vy) + 4}" text-anchor="end">${f2(vy)}</text><text x="${sx(vx)}" y="${H - 18}" text-anchor="middle">${f1(vx)}</text>`; }
    g += `<text x="${(W + l) / 2}" y="${H - 2}" text-anchor="middle">90분당 슈팅</text><text x="12" y="${t - 2}">90분당 득점</text>`;
    const labeled = new Set([...q].sort((x, y) => y.goals - x.goals).slice(0, 6).map((p) => p.key));
    for (const p of [...q].sort((x, y) => (x.team === S.pTeam) - (y.team === S.pTeam))) {
      const on = !S.pTeam || p.team === S.pTeam;
      g += `<a href="${pHref(p)}"><circle cx="${sx(p.s90)}" cy="${sy(p.g90)}" r="${on ? 6 : 4.5}" fill="${on ? 'var(--s1)' : 'var(--rest)'}" fill-opacity="${on ? 0.85 : 0.5}" stroke="var(--surface)" stroke-width="2" data-tip="${esc(`${p.name} (${p.team}) · ${p.goals}골 / 슈팅 ${p.shots} / ${p.minutes}분`)}"/></a>`;
      if (labeled.has(p.key) && on) g += `<text x="${sx(p.s90) + 10}" y="${sy(p.g90) + 4}" style="fill:var(--ink);font-weight:600">${esc(p.name)}</text>`;
    }
    const list = [...B.players].sort((x, y) => y.points - x.points || y.minutes - x.minutes);
    if (!B.playerByKey[S.pA]) S.pA = list[0].key;
    if (!B.playerByKey[S.pB]) S.pB = list[1].key;
    const A = B.playerByKey[S.pA], C = B.playerByKey[S.pB];
    const rows = [['출전(분)', 'minutes', String], ['득점', 'goals', String], ['도움', 'assists', String], ['슈팅', 'shots', String], ['90분당 득점', 'g90', f2], ['90분당 공격P', 'pt90', f2], ['90분당 슈팅', 's90', f2], ['슈팅 대비 득점률', 'conv', pct]];
    const side = (p, k, fmt, cls, max) => `<div class="side ${cls}"><span>${fmt(p[k])}</span><div class="t"><div class="b" style="width:${fin(p[k]) ? (p[k] / max) * 100 : 0}%"></div></div></div>`;
    const popts = (sel) => list.map((p) => opt(p.key, `${p.name} (${p.team})`, sel)).join('');
    return `<h1 class="page-title">선수</h1><p class="page-sub">${B.year}시즌 출전 선수 ${B.players.length}명 · 경기별 기록을 합산</p>
      <div class="filters"><label>팀 <select data-bind="pTeam"><option value="">전체</option>${B.teams.map((x) => opt(x, x, S.pTeam)).join('')}</select></label><label>포지션 <select data-bind="pPos"><option value="">전체</option>${['FW', 'MF', 'DF', 'GK'].map((x) => opt(x, x, S.pPos)).join('')}</select></label><label>이름 <input type="search" data-live="q" value="${esc(S.q)}" placeholder="검색" style="width:120px"></label><label>최소 출전(분) <input type="number" data-live="minMin" value="${S.minMin}" min="0" step="90" style="width:84px"></label></div>
      <div class="stack">${card('슈팅과 득점', `점 하나가 선수 한 명 (${B.qualMin}분 이상 출전한 필드 플레이어) · 위쪽일수록 득점이 많고, 왼쪽 위일수록 적은 슈팅으로 많이 넣는 선수`, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="선수별 90분당 슈팅과 득점 산점도">${g}</svg>`)}
      ${card('선수 기록', '열 제목을 누르면 정렬 · 선수를 누르면 선수 분석으로 이동', `<div class="scroll" style="max-height:560px;overflow-y:auto"><table id="ptable" class="sticky-head"><thead><tr>${PCOLS.map(([k, lab, c]) => `<th tabindex="0" data-sort="${k}" class="sortable ${c || ''} ${S.sort.key === k ? 'sorted' : ''}">${lab}${S.sort.key === k ? (S.sort.dir < 0 ? ' ▼' : ' ▲') : ''}</th>`).join('')}</tr></thead><tbody>${V.playerBody(B)}</tbody></table></div>`)}
      ${card('선수 비교', '막대 길이는 두 선수 중 큰 값 기준', `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px"><select data-bind="pA" aria-label="선수 A">${popts(S.pA)}</select><select data-bind="pB" aria-label="선수 B">${popts(S.pB)}</select></div><div class="duel"><div style="text-align:right;font-weight:700"><span class="dot" style="background:var(--s1)"></span>${esc(A.name)}</div><div></div><div style="font-weight:700"><span class="dot" style="background:var(--s2)"></span>${esc(C.name)}</div>${rows.map(([lab, k, fmt]) => { const max = Math.max(A[k] || 0, C[k] || 0) || 1; return side(A, k, fmt, 'x', max) + `<div class="mid">${lab}</div>` + side(C, k, fmt, 'y', max); }).join('')}</div>`)}</div>`;
  };

  V.player = function (B, key) {
    const pr = WK.profile(B, key);
    if (!pr) return `<div class="empty">${B.year}시즌 기록에서 선수를 찾지 못했습니다. <a class="link" href="#/players">선수 목록</a></div>`;
    const p = pr.p, gk = p.position === 'GK', fmt = (k, v) => (k === 'conv' || k === 'acc' || k === 'csRate' ? pct(v) : f2(v));
    let cum = 0;
    const cumPts = p.log.map((x, i) => { cum += x.goals + x.assists; return [i + 1, cum, `${x.m.round} vs ${x.opp} · 누적 공격포인트 ${cum}`]; });
    const maxC = Math.max(4, Math.ceil(cum / 4) * 4);
    const chart = gk ? '' : card('공격포인트 누적', '출전 경기 순 · 득점과 도움의 합', lineChart({ H: 230, x: [1, Math.max(2, p.log.length)], y: [0, maxC], xt: p.log.map((x, i) => [i + 1, i % 4 === 0 || i === p.log.length - 1 ? x.r + 'R' : '']), yt: [0, maxC / 4, maxC / 2, (maxC * 3) / 4, maxC].map((v) => [v, v]), series: [{ color: B.color[p.team], w: 2.5, pts: cumPts }] }));
    const pc = `<div class="pctl">${pr.metrics.map((m) => `<div>${m.label}</div><div class="num">${fmt(m.k, m.value)}</div><div class="tr">${m.pct == null ? '' : `<b style="width:${Math.max(2, m.pct)}%"></b>`}<i></i></div><div class="p">${m.pct == null ? '표본 부족' : `상위 ${Math.max(1, 100 - m.pct)}%`}</div>`).join('')}</div>${pr.qualified ? '' : `<p class="note">출전 시간이 ${B.qualMin}분 미만이라 수치가 크게 흔들릴 수 있습니다.</p>`}${gk ? '<p class="note">선방 수 같은 골키퍼 전용 기록은 연맹 공개 자료에 없어, 풀타임 경기의 실점만 집계했습니다.</p>' : ''}`;
    return `<div class="crumb"><a href="#/players">선수</a> / <a href="${tHref(p.team)}">${esc(p.team)}</a></div><h1 class="page-title">${esc(p.name)} <span style="color:var(--muted);font-weight:600">#${p.number ?? ''}</span></h1><p class="page-sub">${dot(B, p.team)}${esc(p.team)} · ${esc(p.position)} · ${B.year}시즌</p>
      <div class="stack"><section class="card"><div class="grid g4">${tile('출전', `${p.apps}경기`, `선발 ${p.starts} · 교체 ${p.apps - p.starts}`)}${tile('출전 시간', `${p.minutes}분`, `경기당 ${Math.round(p.minutes / p.apps)}분`)}${gk ? tile('무실점 경기', p.cleanSheets, `풀타임 ${p.fullGames}경기 중`) + tile('경기당 실점', f2(p.ga90), '풀타임 경기 기준') : tile('득점 / 도움', `${p.goals} / ${p.assists}`, `90분당 공격포인트 ${f2(p.pt90)}`) + tile('슈팅 / 유효', `${p.shots} / ${p.sot}`, `슈팅 대비 득점률 ${pct(p.conv)}`)}</div></section>
      <div class="grid g2">${card(`${p.position} 포지션 내 위치`, `${B.qualMin}분 이상 출전한 ${p.position} ${pr.peers}명과 비교 · 가운데 선이 중간값`, pc)}${chart}</div>
      ${pr.similar.length ? card('기록이 비슷한 선수', '90분당 득점·도움·슈팅·유효슈팅·파울이 가까운 같은 포지션 선수', `<div class="scroll"><table><thead><tr><th class="l">선수</th><th class="l">팀</th><th>출전(분)</th><th>90분당 득점</th><th>90분당 도움</th><th>90분당 슈팅</th></tr></thead><tbody>${pr.similar.map(({ q }) => `<tr class="click" data-href="${pHref(q)}"><td class="l"><a href="${pHref(q)}"><b>${esc(q.name)}</b></a></td><td class="l">${dot(B, q.team)}${esc(q.team)}</td><td>${q.minutes}</td><td>${f2(q.g90)}</td><td>${f2(q.a90)}</td><td>${f2(q.s90)}</td></tr>`).join('')}</tbody></table></div>`) : ''}
      ${card('경기별 기록', '눌러서 경기 기록 보기', `<div class="scroll"><table><thead><tr><th class="l">라운드</th><th class="l">상대</th><th class="c">결과</th><th>선발</th><th>출전(분)</th><th>득점</th><th>도움</th><th>슈팅</th><th>유효</th><th>파울</th><th>경고</th></tr></thead><tbody>${[...p.log].reverse().map((x) => `<tr class="click" data-href="#/match/${x.m.id}"><td class="l">${x.m.round}</td><td class="l">${x.home ? '홈' : '원정'} · ${esc(x.opp)}</td><td class="c"><span class="res ${x.x}">${KR[x.x]}</span> ${x.gf}:${x.ga}</td><td>${x.starter ? '선발' : '교체'}</td><td>${x.minutes}</td><td>${x.goals || ''}</td><td>${x.assists || ''}</td><td>${x.shots}</td><td>${x.shotsOnTarget}</td><td>${x.fouls}</td><td>${x.yellows || ''}</td></tr>`).join('')}</tbody></table></div>`)}</div>`;
  };

  // ---------- 경기 ----------
  V.matches = function (B) {
    const rounds = [...new Set(B.all.map((m) => m.r))].sort((a, b) => a - b);
    if (!rounds.includes(S.round)) S.round = [...B.league].sort((x, y) => y.datetime.localeCompare(x.datetime))[0]?.r ?? rounds[0];
    const P = WK.predict(B), ms = B.all.filter((m) => m.r === S.round);
    return `<h1 class="page-title">경기</h1><p class="page-sub">${B.year}시즌 ${B.all.length}경기 · 종료 ${B.league.length} · 예정 ${B.upcoming.length}</p>
      <div class="filters"><label>라운드 <select data-bind="round" data-num="1">${rounds.map((r) => opt(r, `${r}R`, S.round)).join('')}</select></label></div>
      <div class="stack">${card(`${S.round}라운드`, '종료된 경기를 누르면 슈팅·선수 기록을 볼 수 있습니다', ms.map((m) => matchRow(B, m, P)).join(''))}
      ${B.post.length ? card('포스트시즌', '플레이오프와 챔피언결정전', B.post.map((m) => matchRow(B, m)).join('')) : ''}</div>`;
  };

  V.match = function (B, id) {
    const m = B.byId[id];
    if (!m || !m.finished) return `<div class="empty">${B.year}시즌에서 해당 경기를 찾지 못했습니다. <a class="link" href="#/matches">경기 목록</a></div>`;
    const goals = (side) => ((m.goals && m.goals[side]) || []).map((g) => `<div>${esc(g.player)} <span style="color:var(--muted)">${g.minute ?? ''}${g.added ? '+' + g.added : ''}'</span></div>`).join('') || '<div style="color:var(--muted)">–</div>';
    const st = m.stats || {}, labels = [['shots', '슈팅'], ['shotsOnTarget', '유효슈팅'], ['corners', '코너킥'], ['offsides', '오프사이드'], ['fouls', '파울'], ['yellows', '경고'], ['reds', '퇴장']].filter(([k]) => st[k]);
    if (st.possession && st.possession.home + st.possession.away > 0) labels.unshift(['possession', '점유율(%)']);
    const duel = labels.map(([k, lab]) => { const h = st[k].home, a = st[k].away, max = Math.max(h, a) || 1; return `<div class="side x"><span>${h}</span><div class="t"><div class="b" style="width:${(h / max) * 100}%"></div></div></div><div class="mid">${lab}</div><div class="side y"><span>${a}</span><div class="t"><div class="b" style="width:${(a / max) * 100}%"></div></div></div>`; }).join('');
    const lineup = (side) => { const team = m[side], list = (m.players && m.players[side]) || []; return card(esc(team), '선발 11명 뒤로 교체 선수', `<div class="scroll"><table><thead><tr><th class="l">선수</th><th>분</th><th>득점</th><th>도움</th><th>슈팅</th><th>유효</th><th>파울</th><th>카드</th></tr></thead><tbody>${list.filter((p) => p.minutes > 0 || p.starter).map((p, i) => `<tr class="click" data-href="#/player/${encodeURIComponent(`${team}|${p.name}|${p.number}`)}" ${i === 11 ? 'style="border-top:2px solid var(--axis)"' : ''}><td class="l"><span style="color:var(--muted);display:inline-block;width:26px">${p.number ?? ''}</span><b>${esc(p.name)}</b> <span style="color:var(--muted);font-size:12px">${esc(p.position)}${p.captain ? ' · 주장' : ''}</span></td><td>${p.minutes}</td><td>${p.goals || ''}</td><td>${p.assists || ''}</td><td>${p.shots || ''}</td><td>${p.shotsOnTarget || ''}</td><td>${p.fouls || ''}</td><td>${p.yellows ? '경고' : ''}${p.reds ? ' 퇴장' : ''}</td></tr>`).join('')}</tbody></table></div>`); };
    const has = m.players && m.players.home.length;
    return `<div class="crumb"><a href="#/matches">경기</a> / ${m.round} · ${day(m)}${m.venue ? ' · ' + esc(m.venue) : ''}</div>
      <div class="stack" style="margin-top:12px"><section class="card scoreboard"><div class="grid" style="grid-template-columns:1fr max-content 1fr;align-items:center"><div><a class="tm" href="${tHref(m.home)}">${esc(m.home)}</a><div style="font-size:13px;color:var(--ink-2);margin-top:8px">${goals('home')}</div></div><div class="big">${m.homeScore} : ${m.awayScore}</div><div><a class="tm" href="${tHref(m.away)}">${esc(m.away)}</a><div style="font-size:13px;color:var(--ink-2);margin-top:8px">${goals('away')}</div></div></div></section>
      ${duel ? card('경기 비교', `<span class="dot" style="background:var(--s1)"></span>${esc(m.home)} &nbsp; <span class="dot" style="background:var(--s2)"></span>${esc(m.away)}`, `<div class="duel">${duel}</div>`) : ''}
      ${has ? `<div class="grid g2">${lineup('home')}${lineup('away')}</div>` : '<div class="card empty">이 경기는 연맹 사이트에 점수만 공개되어 있습니다.</div>'}</div>`;
  };

  // ---------- 예측 ----------
  V.predict = function (B) {
    const P = WK.predict(B);
    if (!P) return `<h1 class="page-title">예측</h1><div class="card empty">${B.upcoming.length ? '예측하기엔 치른 경기가 부족합니다.' : `${B.year}시즌 정규리그는 끝났습니다. 진행 중인 시즌을 고르면 남은 일정의 예측을 볼 수 있습니다.`}</div>`;
    const n = B.teams.length, rows = [...B.table].sort((x, y) => P.teams[y.team].expPts - P.teams[x.team].expPts);
    const cls = (p) => (p < 0.005 ? '' : p < 0.05 ? 'background:var(--seq1)' : p < 0.2 ? 'background:var(--seq2)' : p < 0.45 ? 'background:var(--seq3)' : p < 0.75 ? 'background:var(--seq4);color:var(--seq4-ink)' : 'background:var(--seq5);color:var(--seq5-ink)');
    return `<h1 class="page-title">예측</h1><p class="page-sub">남은 ${B.upcoming.length}경기를 ${P.N.toLocaleString()}번 모의실험해 최종 순위 확률을 계산했습니다</p><div class="stack">
      ${card('최종 순위 확률', '칸의 숫자는 그 순위로 시즌을 마칠 확률 · 색이 진할수록 가능성이 높음', `<div class="scroll"><table class="heat"><thead><tr><th class="l">팀</th><th>현재 승점</th><th>남은 경기</th><th>예상 최종 승점</th>${Array.from({ length: n }, (_, i) => `<th class="c">${i + 1}위</th>`).join('')}<th>3위 이내</th></tr></thead><tbody>${rows.map((r) => { const t = P.teams[r.team]; return `<tr><td class="l">${tLink(B, r.team)}</td><td>${r.pts}</td><td>${t.left}</td><td><b>${f1(t.expPts)}</b></td>${t.rankP.map((p) => `<td class="hc"><div style="${cls(p)}">${p < 0.005 ? '' : pct0(p)}</div></td>`).join('')}<td><b>${pct0(t.top3)}</b></td></tr>`; }).join('')}</tbody></table></div><p class="note">정규리그 1위는 챔피언결정전에 직행하고 2·3위가 플레이오프를 치르는 방식을 기준으로 '3위 이내'를 함께 표시했습니다.</p>`)}
      <div class="grid g2">${card('남은 경기 예측', '파랑 홈 승 · 회색 무 · 주황 원정 승 · 막대에 올리면 예상 득점', B.upcoming.map((m) => matchRow(B, m, P)).join(''))}
      ${card('팀 전력 지수', '리그 평균을 1.00으로 본 공격력(높을수록 좋음)과 실점 경향(낮을수록 좋음)', `<table><thead><tr><th class="l">팀</th><th>공격</th><th>실점 경향</th></tr></thead><tbody>${[...B.teams].sort((x, y) => P.teams[y].att - P.teams[y].def - (P.teams[x].att - P.teams[x].def)).map((t) => `<tr><td class="l">${tLink(B, t)}</td><td>${f2(P.teams[t].att)}</td><td>${f2(P.teams[t].def)}</td></tr>`).join('')}</tbody></table>
        <h2 style="margin-top:22px">어떻게 계산했나</h2><p class="sub" style="margin:6px 0 0;line-height:1.7">① 팀마다 경기당 득점·실점을 리그 평균과 비교해 공격·수비 지수를 만듭니다. 경기 수가 적을 때 과신하지 않도록 6경기 분량만큼 평균 쪽으로 당깁니다.<br>② 두 팀의 지수와 이번 시즌 홈·원정 평균 득점(홈 ${f2(P.muH)}골, 원정 ${f2(P.muA)}골)을 곱해 예상 득점을 구합니다.<br>③ 예상 득점을 평균으로 하는 포아송 분포에서 점수를 뽑아 남은 일정을 ${P.N.toLocaleString()}번 반복합니다.<br><b>한계:</b> 부상·이적·최근 흐름·일정 간격은 반영하지 않는 단순한 모형입니다. 재미와 참고용으로 봐 주세요.</p>`)}</div></div>`;
  };

  // ---------- 역사 ----------
  V.history = function () {
    const Hs = WK.history(), ys = Hs.years, clubs = Object.values(Hs.clubs);
    if (!Hs.clubs[S.histClub]) S.histClub = clubs[0].club;
    if (!Hs.seasons[S.histYear]) S.histYear = ys[ys.length - 1];
    const titles = clubs.filter((c) => c.titles).sort((a, b) => b.titles - a.titles), maxT = titles[0] ? titles[0].titles : 1;
    const order = [...clubs].sort((a, b) => (a.club === S.histClub) - (b.club === S.histClub));
    const series = order.map((c) => { const on = c.club === S.histClub; return { color: on ? 'var(--s1)' : 'var(--rest)', w: on ? 3 : 1.5, op: on ? 1 : 0.55, dots: on, hit: on, pts: ys.map((y) => [y, c.ranks[y] ?? NaN, `${y} ${WK.nameIn(c.club, y)} · ${c.ranks[y]}위${Hs.seasons[y].champion === c.club ? ' · 우승' : ''}`, on && Hs.seasons[y].champion === c.club ? '★' : '']) }; });
    const all = [...clubs].sort((a, b) => b.pts - a.pts);
    const se = Hs.seasons[S.histYear];
    return `<h1 class="page-title">역사</h1><p class="page-sub">2009년 출범부터 지금까지 ${ys.length}시즌의 정규리그 기록</p><div class="stack">
      ${card('역대 우승팀', '챔피언결정전 우승 기준', `<div class="champs">${ys.map((y) => `<div class="champ"><div class="y">${y}</div><div class="c">${Hs.seasons[y].champion ? esc(WK.nameIn(Hs.seasons[y].champion, y)) : Hs.seasons[y].done ? '–' : '<span style="color:var(--muted)">진행 중</span>'}</div></div>`).join('')}</div>
        <h2 style="margin-top:22px">구단별 우승 횟수</h2><p class="sub"></p><div class="bars">${titles.map((c) => `<div>${esc(c.name)}</div><div class="track"><div class="bar" style="width:${(c.titles / maxT) * 100}%"></div></div><div class="val">${c.titles}회</div>`).join('')}</div>`)}
      ${card('구단별 순위 변천', '고른 구단은 파란 선, 나머지는 회색 · ★는 우승 시즌 · 연고 이전과 팀명 변경은 같은 구단으로 이어서 표시', `<div class="scroll"><div style="min-width:640px">${lineChart({ H: 300, x: [ys[0], ys[ys.length - 1]], y: [1, 8], invert: true, xt: ys.map((y) => [y, "'" + String(y).slice(2)]), yt: [1, 2, 3, 4, 5, 6, 7, 8].map((v) => [v, v + '위']), l: 40, series })}</div></div>`, `<select data-bind="histClub" aria-label="구단">${clubs.map((c) => opt(c.club, c.name, S.histClub)).join('')}</select>`)}
      ${card('통산 순위', '정규리그 기록 합산 (포스트시즌 제외) · 승점은 승 3점, 무 1점으로 환산', `<div class="scroll"><table><thead><tr><th>순위</th><th class="l">구단</th><th>시즌</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득점</th><th>실점</th><th>득실</th><th>승점</th><th>경기당 승점</th><th>우승</th></tr></thead><tbody>${all.map((c, i) => `<tr><td>${i + 1}</td><td class="l"><b>${esc(c.name)}</b></td><td>${c.seasons}</td><td>${c.p}</td><td>${c.w}</td><td>${c.d}</td><td>${c.l}</td><td>${c.gf}</td><td>${c.ga}</td><td>${sgn(c.gf - c.ga)}</td><td><b>${c.pts}</b></td><td>${f2(c.pts / c.p)}</td><td>${c.titles || ''}</td></tr>`).join('')}</tbody></table></div>`)}
      ${card(`${S.histYear}시즌 정규리그 순위`, se.done ? '당시 팀명으로 표시' : '진행 중인 시즌', `<div class="scroll"><table><thead><tr><th>순위</th><th class="l">팀</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>득점</th><th>실점</th><th>득실</th><th>승점</th></tr></thead><tbody>${se.table.map((r) => `<tr><td>${r.rank}</td><td class="l"><b>${esc(WK.nameIn(r.club, S.histYear))}</b>${se.champion === r.club ? ' <span class="chip">우승</span>' : ''}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${sgn(r.gf - r.ga)}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div>`, `<select data-bind="histYear" data-num="1" aria-label="시즌">${[...ys].reverse().map((y) => opt(y, `${y}시즌`, S.histYear)).join('')}</select>`)}
      <p class="note">2009~2024시즌 순위와 우승팀은 영어 위키백과의 WK리그 시즌 문서(CC BY-SA 4.0)를 정리한 것이며, 원문에 오류가 있으면 그대로 반영됩니다. 과거 팀명은 연고 이전 시기를 대략 구분한 것이라 한 시즌 정도 다를 수 있습니다. 2025시즌 이후는 한국여자축구연맹 경기 결과로 직접 계산했습니다.</p></div>`;
  };
})();
