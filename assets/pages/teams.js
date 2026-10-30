// 팀 목록과 팀 상세 페이지
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  S.metric = 'gfpg';

  const METRICS = {
    gfpg: ['경기당 득점', (x) => x.gf / x.g, U.f2], gapg: ['경기당 실점', (x) => x.ga / x.g, U.f2],
    shpg: ['경기당 슈팅', (x) => x.sh / x.sg, U.f1], shapg: ['경기당 허용 슈팅', (x) => x.sha / x.sg, U.f1],
    sotr: ['유효슈팅 비율', (x) => x.sot / x.sh, U.pct], conv: ['슈팅 대비 득점률', (x) => x.gfS / x.sh, U.pct],
    foul: ['경기당 파울', (x) => x.fouls / x.sg, U.f1], corner: ['경기당 코너킥', (x) => x.corners / x.sg, U.f1],
    save: ['허용 유효슈팅 대비 실점률', (x) => x.gaS / x.sota, U.pct],
  };
  U.teamMetrics = METRICS;
  // 강점·약점 판정에 쓰는 지표와 방향 (+1: 클수록 좋음, -1: 작을수록 좋음)
  const DIAG = [['gfpg', 1], ['shpg', 1], ['sotr', 1], ['conv', 1], ['gapg', -1], ['shapg', -1], ['save', -1], ['foul', -1]];
  U.teamDiag = DIAG;
  function ranks(B) {
    if (B._ranks) return B._ranks;
    const out = {};
    for (const [k, dir] of DIAG) {
      const v = B.teams.map((tm) => ({ tm, v: METRICS[k][1](B.T[tm]) })).filter((x) => Number.isFinite(x.v)).sort((a, b) => dir * (b.v - a.v));
      if (v.length === B.teams.length) out[k] = Object.fromEntries(v.map((x, i) => [x.tm, { rank: i + 1, v: x.v }]));
    }
    return (B._ranks = out);
  }
  // 기록에서 규칙으로 뽑아내는 팀 요약. 수치는 모두 계산값이고 문장은 정해진 틀에 수치를 넣은 것이다.
  function diagnose(B, name) {
    const R = ranks(B), n = B.teams.length, r = B.rank[name];
    const item = (k) => ({ k, label: METRICS[k][0], text: METRICS[k][2](R[k][name].v), rank: R[k][name].rank });
    const all = Object.keys(R).map(item);
    const notes = [], rk = (k) => R[k] && R[k][name].rank;
    // 득점·실점을 리그 평균과 비교 (항상 표시)
    const x = B.T[name], avg = B.teams.reduce((a, tm) => a + B.T[tm].gf / B.T[tm].g, 0) / n, gf = x.gf / x.g, ga = x.ga / x.g;
    const rel = (v) => U.pct(Math.abs(v - avg) / avg);
    notes.push([gf >= avg ? '경기당 득점 {v}: 리그 평균 {avg}보다 {p} 많습니다.' : '경기당 득점 {v}: 리그 평균 {avg}보다 {p} 적습니다.', { v: U.f2(gf), avg: U.f2(avg), p: rel(gf) }]);
    notes.push([ga <= avg ? '경기당 실점 {v}: 리그 평균 {avg}보다 {p} 적습니다.' : '경기당 실점 {v}: 리그 평균 {avg}보다 {p} 많습니다.', { v: U.f2(ga), avg: U.f2(avg), p: rel(ga) }]);
    if (R.shpg && R.conv) {
      if (rk('shpg') - rk('conv') >= 2) notes.push(['슈팅 수는 리그 {a}위인데 슈팅 대비 득점률은 {b}위입니다. 적은 기회를 득점으로 연결한 비율이 높았습니다.', { a: rk('shpg'), b: rk('conv') }]);
      if (rk('conv') - rk('shpg') >= 2) notes.push(['슈팅 수는 리그 {a}위인데 슈팅 대비 득점률은 {b}위입니다. 만든 기회에 비해 득점이 적었습니다.', { a: rk('shpg'), b: rk('conv') }]);
    }
    if (R.shapg && R.save) {
      if (rk('gapg') - rk('shapg') >= 2) notes.push(['슈팅을 적게 허용한 순서로는 {a}위인데 실점이 적은 순서로는 {b}위입니다. 허용한 유효슈팅이 실점으로 이어진 비율({p})이 높았습니다.', { a: rk('shapg'), b: rk('gapg'), p: U.pct(R.save[name].v) }]);
      if (rk('shapg') - rk('gapg') >= 2) notes.push(['슈팅을 적게 허용한 순서로는 {a}위인데 실점이 적은 순서로는 {b}위입니다. 허용한 유효슈팅이 실점으로 이어진 비율({p})이 낮았습니다.', { a: rk('shapg'), b: rk('gapg'), p: U.pct(R.save[name].v) }]);
    }
    const gdRank = [...B.table].sort((a, b) => b.gd - a.gd || b.gf - a.gf).findIndex((x) => x.team === name) + 1;
    const one = B.league.filter((m) => (m.home === name || m.away === name) && Math.abs(m.homeScore - m.awayScore) === 1);
    const oneW = one.filter((m) => (m.home === name) === (m.homeScore > m.awayScore)).length;
    if (Math.abs(gdRank - r.rank) >= 2) notes.push(['득실차 순위는 {a}위인데 실제 순위는 {b}위입니다. 1점 차로 끝난 경기에서 {w}승 {l}패를 기록했습니다.', { a: gdRank, b: r.rank, w: oneW, l: one.length - oneW }]);
    else if (one.length) notes.push(['1점 차로 끝난 {n}경기에서 {w}승 {l}패를 기록했습니다.', { n: one.length, w: oneW, l: one.length - oneW }]);
    const h = WK.standings(B.league, B.teams, 'home').find((x) => x.team === name), a = WK.standings(B.league, B.teams, 'away').find((x) => x.team === name);
    if (h.p >= 4 && a.p >= 4) {
      const hp = h.pts / h.p, ap = a.pts / a.p;
      if (hp - ap >= 0.5) notes.push(['홈 경기당 승점 {h}, 원정 경기당 승점 {a}: 홈에서 더 많은 승점을 얻었습니다.', { h: U.f2(hp), a: U.f2(ap) }]);
      if (ap - hp >= 0.5) notes.push(['홈 경기당 승점 {h}, 원정 경기당 승점 {a}: 원정에서 더 많은 승점을 얻었습니다.', { h: U.f2(hp), a: U.f2(ap) }]);
      if (Math.abs(hp - ap) < 0.5) notes.push(['홈 경기당 승점 {h}, 원정 경기당 승점 {a}: 홈과 원정의 차이가 크지 않습니다.', { h: U.f2(hp), a: U.f2(ap) }]);
    }
    if (B.hasDetail) {
      const f = B.timing[name].f, g = B.timing[name].a, sf = f.reduce((x, y) => x + y, 0), sg = g.reduce((x, y) => x + y, 0);
      const top = (arr) => arr.indexOf(Math.max(...arr));
      if (sf && sg) notes.push(['득점이 가장 많은 시간대는 {a}분({x}골), 실점이 가장 많은 시간대는 {b}분({y}골)입니다.', { a: WK.BUCKETS[top(f)], x: f[top(f)], b: WK.BUCKETS[top(g)], y: g[top(g)] }]);
      if (sf >= 8 && f[5] / sf >= 0.3) notes.push(['득점 {a}골 중 {b}골({p})이 76분 이후에 나왔습니다.', { a: sf, b: f[5], p: U.pct(f[5] / sf) }]);
      if (sg >= 8 && g[5] / sg >= 0.3) notes.push(['실점 {a}골 중 {b}골({p})이 76분 이후에 나왔습니다.', { a: sg, b: g[5], p: U.pct(g[5] / sg) }]);
    }
    if (r.p >= 8 && r.d / r.p >= 0.3) notes.push(['무승부가 {d}경기로 전체 경기의 {p}입니다.', { d: r.d, p: U.pct(r.d / r.p) }]);
    return { all, notes };
  }

  // 사진이 없으면 이니셜 대신 회색 실루엣을 보여 준다
  U.photo = (p, size = 32) => (p.photo ? `<img class="ph" src="${U.esc(p.photo)}" alt="" loading="lazy" style="width:${size}px;height:${size}px">` : `<span class="ph none" style="width:${size}px;height:${size}px"></span>`);

  WK.pages.teams = function (B) {
    if (!B.league.length) return `<h1>${t('팀')}</h1><div class="card empty">${t('{y}시즌에는 종료된 경기가 없습니다.', { y: B.year })}</div>`;
    const usable = Object.entries(METRICS).filter(([, m]) => B.teams.some((tm) => Number.isFinite(m[1](B.T[tm]))));
    if (!usable.some(([k]) => k === S.metric)) S.metric = 'gfpg';
    const M = METRICS[S.metric];
    const rows = B.teams.map((tm) => ({ tm, v: M[1](B.T[tm]) })).filter((r) => Number.isFinite(r.v)).sort((a, b) => b.v - a.v), max = Math.max(...rows.map((r) => r.v), 0) || 1;
    return `<h1>${t('팀')}</h1><p class="lead">${t('{y} WK리그 {n}개 구단 · 순위 순', { y: B.year, n: B.teams.length })}</p>
      <div class="cards">${B.table.map((r) => `<a class="tcard" href="${U.tHref(r.team)}" style="--c:${B.color[r.team]}"><div class="rk">${t('{n}위', { n: r.rank })}</div><div class="nm" title="${U.tname(r.team)}">${U.logo(r.team, 26)} ${U.tname(r.team)}</div>
        <div class="st"><div><b>${r.pts}</b>${t('승점')}</div><div><b>${r.gf}</b>${t('득점')}</div><div><b>${r.ga}</b>${t('실점')}</div></div>${U.form(r.form).replace(/<a /g, '<span ').replace(/<\/a>/g, '</span>')}</a>`).join('')}</div>
      ${U.card(t('팀 지표 비교'), usable.length > 2 ? t('슈팅 관련 지표는 슈팅 기록이 있는 경기만 집계했습니다.') : t('이 시즌은 경기 결과만 있어 득점·실점 지표만 제공합니다.'),
        `<div class="bars">${rows.map((r) => `<a href="${U.tHref(r.tm)}" class="tl">${U.logo(r.tm, 20)}<span class="name" title="${U.tname(r.tm)}">${U.tname(r.tm)}</span></a><div class="track"><div class="bar" style="width:${(r.v / max) * 100}%"></div></div><div class="val">${M[2](r.v)}</div>`).join('')}</div>`,
        `<span class="bar"><select data-bind="metric" aria-label="${t('지표 선택')}">${usable.map(([k, m]) => `<option value="${k}" ${k === S.metric ? 'selected' : ''}>${t(m[0])}</option>`).join('')}</select>${U.src()}</span>`)}
      ${U.card(t('팀별 강점과 약점'), t('지표마다 리그 안에서 순위를 매겨, 가장 좋은 지표와 가장 나쁜 지표를 팀별로 하나씩 골랐습니다. 순위는 좋은 쪽이 1위입니다. 팀을 누르면 자세한 분석을 볼 수 있습니다.'),
        `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('팀')}</th><th class="l">${t('가장 좋은 지표')}</th><th class="l">${t('가장 나쁜 지표')}</th></tr></thead><tbody>${B.table.map((r) => {
          const R = ranks(B), ks = Object.keys(R).sort((a, b) => R[a][r.team].rank - R[b][r.team].rank), cellOf = (k) => `${t(METRICS[k][0])} <b>${METRICS[k][2](R[k][r.team].v)}</b> · ${t('{n}위', { n: R[k][r.team].rank })}`;
          return `<tr class="click" data-href="${U.tHref(r.team)}"><td class="l">${U.team(B, r.team)}</td><td class="l">${cellOf(ks[0])}</td><td class="l">${cellOf(ks[ks.length - 1])}</td></tr>`; }).join('')}</tbody></table></div>`)}`;
  };

  function diagCard(B, name) {
    const d = diagnose(B, name), n = B.teams.length;
    const tag = (rank) => (rank <= 2 ? `<span class="tag good">${t('강점')}</span>` : rank >= n - 1 ? `<span class="tag bad">${t('약점')}</span>` : '');
    // 순위 막대: 1위일수록 길다
    const row = (x) => `<tr><td class="l">${t(x.label)}</td><td>${x.text}</td><td>${t('{n}위', { n: x.rank })}</td><td class="l"><span class="rankbar"><span style="width:${((n - x.rank + 1) / n) * 100}%"></span></span></td><td class="l">${tag(x.rank)}</td></tr>`;
    return U.card(t('데이터로 본 강점과 약점'), t('지표마다 리그 {n}개 팀 가운데 순위를 매겼습니다. 순위는 좋은 쪽이 1위이며, 2위 안이면 강점, 뒤에서 2위 안이면 약점으로 표시했습니다.', { n }),
      `<div class="scroll"><table><thead><tr><th class="l">${t('지표')}</th><th>${t('기록')}</th><th>${t('리그 순위')}</th><th class="l" style="width:30%"></th><th class="l"></th></tr></thead><tbody>${d.all.map(row).join('')}</tbody></table></div>
       <h3 style="margin-top:18px">${t('기록에서 읽히는 점')}</h3><ul class="notes">${d.notes.map(([k, p]) => `<li>${t(k, p)}</li>`).join('')}</ul>
       <p class="foot">${t('기록을 정해진 기준으로 비교해 자동으로 만든 요약입니다. 수치는 모두 실제 기록이지만, 원인을 단정하는 분석은 아닙니다.')}</p>`);
  }

  function changeCard(B, name) {
    const r = B.rank[name], x = B.T[name];
    const prevY = String(+B.year - 1), P = WK.D.seasons[prevY] ? WK.season(prevY) : null, pr = P && P.rank[name], px = P && P.T[name];
    const arrow = (a, b) => `<span class="was">${a}</span> → ${b}`;
    const cmp = pr ? `<div class="tiles">
        ${U.tile(t('정규리그 순위'), arrow(t('{n}위', { n: pr.rank }), t('{n}위', { n: r.rank })), t('{a}시즌 → {b}시즌', { a: prevY, b: B.year }))}
        ${U.tile(t('경기당 승점'), arrow(U.f2(pr.pts / pr.p), U.f2(r.pts / r.p)), t('{a}경기 → {b}경기 기준', { a: pr.p, b: r.p }))}
        ${U.tile(t('경기당 득점'), arrow(U.f2(px.gf / px.g), U.f2(x.gf / x.g)), t('총 {a}골 → {b}골', { a: px.gf, b: x.gf }))}
        ${U.tile(t('경기당 실점'), arrow(U.f2(px.ga / px.g), U.f2(x.ga / x.g)), t('총 {a}골 → {b}골', { a: px.ga, b: x.ga }))}</div>` : `<p class="notice" style="margin:0">${t('비교할 지난 시즌 기록이 없습니다.')}</p>`;
    const clinch = B.clinched === name ? `<p class="notice">${t('남은 경기 결과와 관계없이 정규리그 1위가 확정됐습니다. 다른 팀이 남은 경기를 모두 이겨도 승점 {p}에 미치지 못합니다.', { p: r.pts })}</p>` : '';
    const mv = B.movers.filter((m) => m.from.team === name || m.to.team === name);
    const movers = mv.length ? `<h3 style="margin-top:18px">${t('기록으로 확인되는 시즌 중 이동')}</h3><ul class="notes">${mv.map((m) => `<li>${m.to.team === name
      ? t('{p}: {team}에서 합류 (첫 출전 {d})', { p: `<a class="link" href="${U.pHref(m.to.key)}">${U.pname(m.to.key)}</a>`, team: U.tname(m.from.team), d: m.first.slice(5).replace('-', '.') })
      : t('{p}: {team} 이적 (마지막 출전 {d})', { p: `<a class="link" href="${U.pHref(m.to.key)}">${U.pname(m.from.key)}</a>`, team: U.tname(m.to.team), d: m.last.slice(5).replace('-', '.') })}</li>`).join('')}</ul>` : '';
    const ev = (window.WK_EVENTS || []).filter((e) => String(e.season) === String(B.year) && e.teams.includes(name)).sort((a, b) => a.date.localeCompare(b.date));
    const TYPE = { in: '영입', out: '이적', coach: '감독', league: '리그' };
    const events = ev.length ? `<h3 style="margin-top:18px">${t('선수단 변화와 주요 사건')}</h3><ul class="timeline">${ev.map((e) => `<li><span class="when">${e.date.replace(/-/g, '.')}</span><span class="tag">${t(TYPE[e.type] || '리그')}</span><span class="what">${U.esc(e[WK.lang] || e.ko)} <a class="link" href="${U.esc(e.src)}" target="_blank" rel="noopener">${U.esc(e.by)}</a></span></li>`).join('')}</ul>
      <p class="foot">${t('보도와 공개 자료를 사람이 정리한 목록이며 모든 이적을 담고 있지는 않습니다. 각 항목 끝의 출처를 누르면 원문으로 이동합니다.')}</p>` : `<p class="foot">${t('이 시즌은 정리된 선수단 변화·사건 자료가 없습니다.')}</p>`;
    return U.card(t('지난 시즌과 달라진 점'), t('지난 시즌 정규리그 기록과의 비교, 그리고 그 사이의 선수단 변화입니다.'), `${cmp}${clinch}${movers}${events}`);
  }

  WK.pages.team = function (B, name) {
    const back = `<p class="crumb"><a class="link" href="#/teams">${t('팀')}</a> · <a class="link" href="#/compare/${encodeURIComponent('t:' + name)}">${t('다른 팀과 비교')}</a> · <a class="link" href="#/analysis/${encodeURIComponent(name)}">${t('팀 분석')}</a></p>`;
    const r = B.rank[name];
    if (!r) return `${back}<div class="card empty">${t('{y}시즌 기록에서 해당 팀을 찾지 못했습니다. 상단에서 시즌을 확인해 주세요.', { y: B.year })}</div>`;
    const x = B.T[name], st = B.streaks[name];
    const home = WK.standings(B.league, B.teams, 'home').find((s) => s.team === name), away = WK.standings(B.league, B.teams, 'away').find((s) => s.team === name);
    const wdl = (s) => t('{w}승 {d}무 {l}패', { w: s.w, d: s.d, l: s.l }), gfa = (s) => t('{a}득점 {b}실점', { a: s.gf, b: s.ga });
    const ms = B.all.filter((m) => m.home === name || m.away === name);

    const strip = ms.map((m) => {
      const isH = m.home === name, opp = WK.tn(isH ? m.away : m.home), ha = isH ? t('홈') : t('원정');
      if (!m.finished) return `<span class="N" data-tip="${U.esc(`${m.round} · ${ha} · ${opp} · ${U.day(m)}`)}">${m.datetime.slice(5, 10).replace('-', '.')}<small>${m.r}R</small></span>`;
      const gf = isH ? m.homeScore : m.awayScore, ga = isH ? m.awayScore : m.homeScore;
      return `<a class="${gf > ga ? 'W' : gf < ga ? 'L' : 'D'}" href="#/match/${m.id}" data-tip="${U.esc(`${m.round} · ${ha} · ${opp} ${gf}:${ga}`)}">${gf}:${ga}<small>${m.r}R</small></a>`;
    }).join('');

    let detail = `<div class="card"><p class="notice" style="margin:0">${t('이 시즌은 연맹 사이트에 경기 결과만 공개되어 있어 슈팅, 득점 시간대, 선수단 기록이 없습니다.')}</p></div>`;
    if (B.hasDetail) {
      const played = ms.filter((m) => m.finished && m.stats && m.stats.shots);
      const roll = (arr, i) => { const s = arr.slice(Math.max(0, i - 4), i + 1); return s.reduce((a, b) => a + b, 0) / s.length; };
      const sf = played.map((m) => m.stats.shots[m.home === name ? 'home' : 'away']), sa = played.map((m) => m.stats.shots[m.home === name ? 'away' : 'home']);
      const maxS = Math.ceil(Math.max(...sf.map((_, i) => roll(sf, i)), ...sa.map((_, i) => roll(sa, i)), 4) / 4) * 4, nar = U.narrow();
      const tipOf = (lab, arr, i) => `${played[i].round} · ${t(lab)} ${t('최근 5경기 평균 {a} · 이 경기 {b}', { a: U.f1(roll(arr, i)), b: arr[i] })}`;
      const trend = U.lineChart({ W: nar ? 420 : 560, H: 240, l: 30, r: 14, x: [1, Math.max(played.length, 2)], y: [0, maxS], xt: played.map((m, i) => { const st = nar ? 6 : 4, last = i === played.length - 1; return [i + 1, i % st === 0 || (last && i % st >= st / 2) ? m.r + 'R' : '']; }), yt: [0, maxS / 4, maxS / 2, (maxS * 3) / 4, maxS].map((v) => [v, v]),
        series: [{ color: 'var(--s1)', w: 2.5, pts: sf.map((_, i) => [i + 1, roll(sf, i), tipOf('슈팅', sf, i)]) }, { color: 'var(--s2)', w: 2.5, pts: sa.map((_, i) => [i + 1, roll(sa, i), tipOf('허용 슈팅', sa, i)]) }] });
      const squad = B.players.filter((p) => p.team === name).sort((a, b) => b.minutes - a.minutes), maxMin = squad[0] ? squad[0].minutes : 1;
      detail = `<div class="two">${U.card(t('슈팅 흐름'), t('최근 5경기 이동평균입니다. 가로축은 경기 순서입니다.'), `<div class="legend" style="margin-bottom:8px"><span><span class="dot" style="background:var(--s1)"></span>${t('슈팅')}</span><span><span class="dot" style="background:var(--s2)"></span>${t('허용 슈팅')}</span></div>${trend}`)}
        ${U.card(t('득점·실점 시간대'), t('15분 단위 골 수입니다. 추가시간 골은 해당 시간대에 포함합니다.'), U.timing(B.timing[name].f, B.timing[name].a))}</div>
        ${U.card(t('선수단'), t('출전 시간 순입니다. 출전은 실제로 뛴 경기만 셉니다.'), `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('선수')}</th><th class="l">${t('포지션')}</th><th>${t('출전')}</th><th>${t('선발')}</th><th class="l" style="width:28%">${t('출전 시간(분)')}</th><th>${t('득점')}</th><th>${t('도움')}</th><th>${t('슈팅')}</th><th>${t('경고')}</th><th>${t('퇴장')}</th></tr></thead>
          <tbody>${squad.map((p) => `<tr class="click" data-href="${U.pHref(p.key)}"><td class="l"><span class="pl">${U.photo(p)}<span class="no">${p.number ?? ''}</span><a href="${U.pHref(p.key)}" class="name" title="${U.pname(p.key)}">${U.pname(p.key)}</a></span></td><td class="l">${U.esc(p.position)}</td><td>${p.apps}</td><td>${p.starts}</td>
            <td class="l"><span class="minbar"><span class="trk"><span style="width:${(p.minutes / maxMin) * 100}%"></span></span><span class="mv">${p.minutes}</span></span></td><td>${p.goals}</td><td>${p.assists}</td><td>${p.shots}</td><td>${p.yellows}</td><td>${p.reds}</td></tr>`).join('')}</tbody></table></div>`)}`;
    }

    const Hs = WK.history(), cid = Hs.clubIdByName[name], club = cid && Hs.clubs[cid];
    let hist = '';
    if (club) {
      const ys = Hs.years, nar = U.narrow();
      // 정규리그 1위와 챔피언결정전 우승은 다른 기록이라 따로 센다. 진행 중인 시즌은 1위가 확정된 경우만 센다.
      const champs = ys.filter((y) => Hs.seasons[y].champion === cid);
      const firsts = ys.filter((y) => club.ranks[y] === 1 && (Hs.seasons[y].done || (WK.D.seasons[y] && WK.season(String(y)).clinched === name)));
      const mark = (y) => (champs.includes(y) ? '★' : '') + (firsts.includes(y) ? '①' : '');
      const pts = ys.filter((y) => club.ranks[y]).map((y) => [y, club.ranks[y], `${y} · ${t('정규리그 {n}위', { n: club.ranks[y] })}${firsts.includes(y) && !Hs.seasons[y].done ? ' (' + t('확정') + ')' : ''}${champs.includes(y) ? ' · ' + t('챔피언결정전 우승') : ''}`, mark(y)]);
      const listOf = (arr) => (arr.length ? `${t('{n}회', { n: arr.length })} (${arr.map((y) => y + (!Hs.seasons[y].done ? ' ' + t('확정') : '')).join(', ')})` : t('없음'));
      hist = U.card(t('구단 역대 순위'), t('선은 {a}~{b}시즌의 정규리그 순위입니다. 정규리그 1위(①)와 챔피언결정전 우승(★)은 서로 다른 기록이라 따로 표시했습니다. 연고 이전과 팀명 변경은 같은 구단으로 이었습니다.', { a: club.first, b: club.last }),
        U.lineChart({ W: nar ? 420 : 900, H: 230, l: 26, r: 14, t: 22, x: [ys[0], ys[ys.length - 1]], y: [1, 8], invert: true, xt: ys.filter((y) => (nar ? y % 4 === 1 : y % 2 === 1) || y === ys[ys.length - 1]).map((y) => [y, "'" + String(y).slice(2)]), yt: [1, 2, 3, 4, 5, 6, 7, 8].map((v) => [v, v]), series: [{ color: B.color[name], w: 2.5, dots: true, pts }] })
        + `<ul class="dl" style="margin-top:8px"><li><span>★ ${t('챔피언결정전 우승')}</span><b>${listOf(champs)}</b><span></span></li><li><span>① ${t('정규리그 1위')}</span><b>${listOf(firsts)}</b><span></span></li></ul>
           <p class="foot">${t('2024시즌까지는 위키백과 자료이며 공식 자료와 대조하지 않았습니다. 챔피언결정전 준우승 기록은 자료가 없어 표시하지 않습니다.')}</p>`, U.src(t('한국여자축구연맹(KWFF), 위키백과')));
    }

    return `${back}<h1>${U.logo(name, 40) || `<span class="dot" style="background:${B.color[name]};width:12px;height:12px"></span>`} ${U.tname(name)}</h1>
      <p class="lead">${t('{y}시즌 · {rank}위 · {p}경기 {w}승 {d}무 {l}패 · 승점 {pts}', { y: B.year, rank: r.rank, p: r.p, w: r.w, d: r.d, l: r.l, pts: r.pts })}</p>
      <section class="card" style="margin-top:0"><div class="head"><h2>${t('시즌 요약')}</h2>${U.src()}</div><div class="tiles">
        ${U.tile(t('경기당 득점 / 실점'), `${U.f2(x.gf / x.g)} / ${U.f2(x.ga / x.g)}`, t('득실 {a} · 무실점 {b}경기', { a: U.sgn(r.gd), b: x.cs }))}
        ${U.tile(t('홈 성적'), wdl(home), gfa(home))}
        ${U.tile(t('원정 성적'), wdl(away), gfa(away))}
        ${x.sg ? U.tile(t('슈팅 대비 득점률'), U.pct(x.gfS / x.sh), t('경기당 슈팅 {a} · 허용 {b}', { a: U.f1(x.sh / x.sg), b: U.f1(x.sha / x.sg) })) : U.tile(t('최장 무패'), t('{n}경기', { n: st.bestUnbeaten }), t('최장 연승 {n}경기', { n: st.bestWin }))}
      </div>
      <h2 style="margin-top:22px">${t('시즌 전 경기')}</h2><p class="desc" style="margin-bottom:10px">${t('칸 하나가 한 경기입니다. 지난 경기는 점수, 남은 경기는 날짜를 표시합니다.')}</p><div class="strip">${strip}</div></section>
      ${changeCard(B, name)}${diagCard(B, name)}${detail}${hist}`;
  };
})();
