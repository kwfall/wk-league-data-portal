// 비교: 두 선수 또는 두 팀을 나란히 놓고 항목별로 본다
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  const int = (v) => String(v), nan = (f) => (v) => (Number.isFinite(v) ? f(v) : '–');
  // [항목, 값, 표시, 방향] 방향: +1 클수록 좋음, -1 작을수록 좋음, 0 우열을 따지지 않음
  const P_ROWS = [
    ['출전', (p) => p.apps, int, 1], ['선발', (p) => p.starts, int, 1], ['출전 시간(분)', (p) => p.minutes, int, 1],
    ['득점', (p) => p.goals, int, 1], ['도움', (p) => p.assists, int, 1], ['공격P', (p) => p.points, int, 1],
    ['슈팅', (p) => p.shots, int, 1], ['유효슈팅', (p) => p.sot, int, 1],
    ['90분당 득점', (p) => p.g90, nan(U.f2), 1], ['90분당 도움', (p) => p.a90, nan(U.f2), 1], ['90분당 슈팅', (p) => p.s90, nan(U.f2), 1],
    ['슈팅 대비 득점률', (p) => p.conv, nan(U.pct), 1], ['유효슈팅 비율', (p) => p.acc, nan(U.pct), 1],
    ['파울', (p) => p.fouls, int, 0], ['경고', (p) => p.yellows, int, -1], ['퇴장', (p) => p.reds, int, -1],
  ];
  const GK_ROWS = [['경기당 실점 (풀타임)', (p) => p.ga90, nan(U.f2), -1], ['무실점 경기 비율', (p) => p.csRate, nan(U.pct), 1]];

  // 가운데에 항목 이름, 양쪽에 값과 막대. 더 좋은 쪽 값을 굵게 한다
  function duel(rows, a, b) {
    return `<div class="duel cmp">${rows.map(([lab, get, fmt, dir]) => {
      const x = get(a), y = get(b), ok = Number.isFinite(x) && Number.isFinite(y), max = Math.max(Math.abs(x) || 0, Math.abs(y) || 0) || 1;
      const win = !ok || !dir || x === y ? 0 : (x > y) === (dir > 0) ? 1 : 2, w = (v) => (Number.isFinite(v) ? (Math.abs(v) / max) * 100 : 0);
      return `<div class="side x${win === 1 ? ' win' : ''}"><span>${fmt(x)}</span><div class="t"><div class="b" style="width:${w(x)}%"></div></div></div><div class="mid">${t(lab)}</div><div class="side y${win === 2 ? ' win' : ''}"><span>${fmt(y)}</span><div class="t"><div class="b" style="width:${w(y)}%"></div></div></div>`;
    }).join('')}</div>`;
  }
  const head = (l, r) => `<div class="cmp-head"><div class="who-l">${l}</div><div class="vs">vs</div><div class="who-r">${r}</div></div>`;
  const modes = () => `<div class="seg" role="group" aria-label="${t('비교 대상')}"><button data-set="cMode:player" class="${S.cMode !== 'team' ? 'on' : ''}" aria-pressed="${S.cMode !== 'team'}">${t('선수')}</button><button data-set="cMode:team" class="${S.cMode === 'team' ? 'on' : ''}" aria-pressed="${S.cMode === 'team'}">${t('팀')}</button></div>`;

  function players(B) {
    const top = [...B.players].sort((x, y) => y.goals - x.goals || x.squad - y.squad || x.minutes - y.minutes);
    if (!B.playerByKey[S.cA]) S.cA = top[0].key;
    if (!B.playerByKey[S.cB] || S.cB === S.cA) S.cB = (top.find((p) => p.key !== S.cA) || top[0]).key;
    const a = B.playerByKey[S.cA], b = B.playerByKey[S.cB];
    const sel = (k, cur) => `<select data-bind="${k}" aria-label="${t('선수 선택')}">${B.teams.map((tm) => `<optgroup label="${U.tname(tm)}">${B.players.filter((p) => p.team === tm).sort((x, y) => x.number - y.number).map((p) => `<option value="${U.esc(p.key)}" ${p.key === cur ? 'selected' : ''}>${p.number} ${U.pname(p.key)} (${p.position})</option>`).join('')}</optgroup>`).join('')}</select>`;
    const who = (p) => `${U.photo(p, 64)}<div><a class="name" href="${U.pHref(p.key)}">${U.pname(p.key)}</a><small>${U.tname(p.team)} · ${p.position} · ${t('{n}번', { n: p.number })}</small></div>`;
    const rows = P_ROWS.concat(a.position === 'GK' || b.position === 'GK' ? GK_ROWS : []);
    const notes = [a.position !== b.position && t('두 선수의 포지션이 달라 득점·슈팅 기록을 그대로 견주기는 어렵습니다.'), (a.minutes < B.qualMin || b.minutes < B.qualMin) && t('출전 시간이 {min}분에 못 미치는 선수는 90분당 기록과 비율이 크게 흔들릴 수 있습니다.', { min: B.qualMin })].filter(Boolean);
    return U.card(t('선수 비교'), t('{y} WK리그 정규리그 기록입니다. 더 좋은 쪽 값을 굵게 표시합니다.', { y: B.year }),
      `<div class="bar cmp-pick">${sel('cA', S.cA)}<span class="mut">vs</span>${sel('cB', S.cB)}</div>${head(who(a), who(b))}${duel(rows, a, b)}
      ${notes.length ? `<p class="foot" style="margin-bottom:0">${notes.join(' ')}</p>` : ''}`);
  }

  function teams(B) {
    if (!B.rank[S.cTA]) S.cTA = B.table[0].team;
    if (!B.rank[S.cTB] || S.cTB === S.cTA) S.cTB = (B.table.find((r) => r.team !== S.cTA) || B.table[0]).team;
    const A = S.cTA, Z = S.cTB, pos = (tm) => B.table.findIndex((r) => r.team === tm) + 1;
    const sel = (k, cur) => `<select data-bind="${k}" aria-label="${t('팀 선택')}">${B.table.map((r) => `<option value="${U.esc(r.team)}" ${r.team === cur ? 'selected' : ''}>${U.tname(r.team)}</option>`).join('')}</select>`;
    const who = (tm) => `${U.logo(tm, 56)}<div><a class="name" href="${U.tHref(tm)}">${U.tname(tm)}</a><small>${t('{n}위', { n: pos(tm) })} · ${t('승점')} ${B.rank[tm].pts}</small></div>`;
    const M = U.teamMetrics, dir = Object.fromEntries(U.teamDiag);
    const rows = [['순위', (tm) => pos(tm), int, -1], ['승점', (tm) => B.rank[tm].pts, int, 1], ['경기', (tm) => B.rank[tm].p, int, 0], ['승', (tm) => B.rank[tm].w, int, 1], ['무', (tm) => B.rank[tm].d, int, 0], ['패', (tm) => B.rank[tm].l, int, -1],
      ['득점', (tm) => B.rank[tm].gf, int, 1], ['실점', (tm) => B.rank[tm].ga, int, -1], ['득실', (tm) => B.rank[tm].gf - B.rank[tm].ga, U.sgn, 1]]
      .concat(Object.entries(M).filter(([k]) => k !== 'foul' || true).map(([k, m]) => [m[0], (tm) => m[1](B.T[tm]), nan(m[2]), k === 'foul' ? 0 : dir[k] || 0]));
    const h2h = B.all.filter((m) => (m.home === A && m.away === Z) || (m.home === Z && m.away === A));
    return U.card(t('팀 비교'), t('{y} WK리그 정규리그 기록입니다. 더 좋은 쪽 값을 굵게 표시합니다.', { y: B.year }),
      `<div class="bar cmp-pick">${sel('cTA', A)}<span class="mut">vs</span>${sel('cTB', Z)}</div>${head(who(A), who(Z))}${duel(rows, A, Z)}`)
      + U.card(t('이번 시즌 맞대결'), '', h2h.length ? `<div class="scroll"><table><thead><tr><th class="l">${t('라운드')}</th><th class="l">${t('날짜')}</th><th class="l">${t('홈')}</th><th class="c">${t('결과')}</th><th class="l">${t('원정')}</th></tr></thead><tbody>${h2h.map((m) => `<tr data-href="#/match/${m.id}"><td class="l">${m.round}</td><td class="l">${U.day(m)}</td><td class="l">${U.team(B, m.home)}</td><td class="c">${m.finished ? `<a class="link" href="#/match/${m.id}">${m.homeScore} : ${m.awayScore}</a>` : `<span class="mut">${t('예정')}</span>`}</td><td class="l">${U.team(B, m.away)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="notice" style="margin:0">${t('두 팀의 경기가 없습니다.')}</p>`);
  }

  WK.pages.compare = function (B, arg) {
    // 선수·팀 화면에서 넘어온 경우 왼쪽 자리에 그 선수(팀)를 놓는다
    if (arg && arg.startsWith('p:') && B.playerByKey[arg.slice(2)]) { S.cMode = 'player'; if (S.cB === arg.slice(2)) S.cB = S.cA; S.cA = arg.slice(2); }
    if (arg && arg.startsWith('t:') && B.rank[arg.slice(2)]) { S.cMode = 'team'; if (S.cTB === arg.slice(2)) S.cTB = S.cTA; S.cTA = arg.slice(2); }
    if (arg) history.replaceState(null, '', '#/compare');
    const body = !B.hasDetail && S.cMode !== 'team' ? `<div class="card"><p class="notice" style="margin:0">${t('이 시즌은 선수 기록이 없어 팀만 비교할 수 있습니다.')}</p></div>` : S.cMode === 'team' ? teams(B) : players(B);
    return `<h1>${t('비교')}</h1><p class="lead">${t('두 선수 또는 두 팀을 나란히 놓고 항목별로 봅니다.')}</p><div class="bar" style="margin-bottom:16px">${modes()}</div>${body}`;
  };
})();
