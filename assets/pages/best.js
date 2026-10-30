// 라운드 베스트 11: 경기 기록에 정해 둔 점수를 매겨 뽑는다 (이 사이트의 자체 기준, 연맹 공식 선정이 아니다)
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  const SHAPE = [['FW', 3], ['MF', 3], ['DF', 4], ['GK', 1]]; // 4-3-3
  const CS = { GK: 4, DF: 4, MF: 1, FW: 0 };

  // 한 경기 기록의 점수와 내역
  function score(l) {
    const long = l.minutes >= 60, back = l.position === 'GK' || l.position === 'DF', sot = Math.max(0, l.shotsOnTarget - l.goals);
    const parts = [[long ? '60분 이상 출전' : '60분 미만 출전', long ? 2 : 1], ['득점', l.goals * 4], ['도움', l.assists * 3], ['골이 아닌 유효슈팅', sot * 0.5], ['팀 승리', l.x === 'W' ? 1 : 0],
      ['무실점', long && l.ga === 0 ? CS[l.position] || 0 : 0], ['실점', long && back ? -0.5 * l.ga : 0], ['경고', -1 * l.yellows], ['퇴장', -3 * l.reds]].filter((x) => x[1]);
    return { pts: parts.reduce((a, x) => a + x[1], 0), parts };
  }
  const cache = {};
  function pick(B, r) {
    const k = `${B.year}|${WK.D.updated}|${r}`; if (cache[k]) return cache[k];
    const all = [];
    for (const p of B.players) for (const l of p.log) if (l.r === r) all.push({ p, l, pos: l.position, ...score(l) });
    // 동점이면 FW·MF는 짧게 뛴 선수(같은 점수를 더 짧은 시간에 냄), DF·GK는 오래 뛴 선수(무실점을 더 오래 지킴)가 앞
    const back = (x) => x.pos === 'DF' || x.pos === 'GK';
    all.sort((a, b) => b.pts - a.pts || (back(a) ? b.l.minutes - a.l.minutes : a.l.minutes - b.l.minutes) || b.l.goals - a.l.goals || a.p.name.localeCompare(b.p.name, 'ko'));
    const xi = SHAPE.map(([pos, n]) => [pos, all.filter((x) => x.pos === pos).slice(0, n)]);
    return (cache[k] = { xi, list: xi.flatMap((x) => x[1]), n: all.length });
  }
  // 그 라운드의 모든 경기가 끝난 라운드만 뽑는다. 일부만 치러진 라운드는 pending 으로 따로 알린다
  function rounds(B) {
    const played = [...new Set(B.league.filter((m) => m.players).map((m) => m.r))].sort((a, b) => b - a);
    const left = (r) => B.upcoming.filter((m) => m.r === r).length, done = (r) => B.league.filter((m) => m.r === r && m.players).length;
    return { rs: played.filter((r) => !left(r)), pending: played.filter((r) => left(r)).map((r) => ({ r, done: done(r), total: done(r) + left(r) })) };
  }
  const num = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
  U.best11 = (B, r) => pick(B, r);
  U.bestRounds = (B) => rounds(B).rs; // 모든 경기가 끝난 라운드, 최근 순

  WK.pages.best = function (B) {
    const { rs, pending } = rounds(B);
    const wait = pending.length ? `<p class="notice">${pending.map((x) => t('{r}라운드는 {total}경기 중 {done}경기만 끝나 아직 뽑지 않았습니다.', x)).join(' ')} ${t('라운드의 모든 경기가 끝나면 뽑습니다.')}</p>` : '';
    if (!rs.length) return `<h1>${t('라운드 베스트 11')}</h1><div class="card"><p class="notice" style="margin:0">${t('이 시즌은 선수별 경기 기록이 없어 베스트 11을 뽑을 수 없습니다.')}</p></div>${wait}`;
    const games = (x) => B.league.filter((m) => m.r === x && m.players).length;
    const r = rs.includes(+S.bR) ? +S.bR : rs[0], X = pick(B, r);
    const slot = (x) => `<a class="slot" href="${U.pHref(x.p.key)}">${U.photo(x.p, 52)}<b>${U.pname(x.p.key)}</b><small>${U.logo(x.p.team, 16)}${U.tname(x.p.team)}</small><span class="pt">${num(x.pts)}</span></a>`;
    const count = {};
    for (const rr of rs) for (const x of pick(B, rr).list) (count[x.p.key] ||= { p: x.p, n: 0, rounds: [] }).rounds.push(rr), count[x.p.key].n++;
    const multi = Object.values(count).filter((c) => c.n > 1).sort((a, b) => b.n - a.n || a.p.name.localeCompare(b.p.name, 'ko')).slice(0, 15);
    const rule = [['60분 이상 출전', '+2'], ['60분 미만 출전', '+1'], ['득점', '+4'], ['도움', '+3'], ['골이 아닌 유효슈팅', '+0.5'], ['팀 승리', '+1'], ['무실점 (60분 이상 출전)', 'GK·DF +4, MF +1'], ['실점 (GK·DF, 60분 이상 출전)', t('1골마다 −0.5')], ['경고', '−1'], ['퇴장', '−3']];
    return `<h1>${t('라운드 베스트 11')}</h1><p class="lead">${t('{y} WK리그 · 경기 기록에 점수를 매겨 뽑은 이 사이트의 자체 선정입니다. 연맹 공식 선정이 아닙니다.', { y: B.year })}</p>
      <div class="bar" style="margin-bottom:16px"><select data-bind="bR" aria-label="${t('라운드 선택')}">${rs.map((x) => `<option value="${x}" ${x === r ? 'selected' : ''}>${t('{r}라운드', { r: x })} · ${t('{n}경기', { n: games(x) })}</option>`).join('')}</select><a class="link" href="#/qor">${t('연맹이 뽑은 라운드 QOR 보기')} →</a></div>
      ${wait}
      ${U.card(t('{r}라운드 베스트 11', { r }), t('4-3-3 · 그 라운드에 뛴 {n}명 중 포지션별 점수가 높은 순', { n: X.n }), `<div class="xi">${X.xi.map(([pos, list]) => `<div class="line" data-pos="${pos}">${list.map(slot).join('')}</div>`).join('')}</div>`)}
      ${U.card(t('점수 내역'), t('선수마다 어떤 기록으로 점수를 받았는지 보여 줍니다.'), `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('포지션')}</th><th class="l">${t('선수')}</th><th class="l">${t('팀')}</th><th class="l">${t('경기')}</th><th>${t('분')}</th><th>${t('득점')}</th><th>${t('도움')}</th><th>${t('유효슈팅')}</th><th>${t('점수')}</th><th class="l">${t('내역')}</th></tr></thead>
        <tbody>${X.list.map((x) => `<tr><td class="l">${x.pos}</td><td class="l"><a class="name" href="${U.pHref(x.p.key)}">${U.pname(x.p.key)}</a></td><td class="l">${U.team(B, x.p.team)}</td><td class="l"><a class="link" href="#/match/${x.l.m.id}">${x.l.home ? t('홈') : t('원정')} · ${U.tname(x.l.opp)} ${x.l.gf}:${x.l.ga}</a></td><td>${x.l.minutes}</td><td>${x.l.goals}</td><td>${x.l.assists}</td><td>${x.l.shotsOnTarget}</td><td><b>${num(x.pts)}</b></td><td class="l mut" style="font-size:12px">${x.parts.map(([k, v]) => `${t(k)} ${v > 0 ? '+' : '−'}${num(Math.abs(v))}`).join(' · ')}</td></tr>`).join('')}</tbody></table></div>`)}
      <div class="two">
        ${U.card(t('선정 기준'), t('한 경기의 기록에 아래 점수를 더해 포지션별로 높은 순서대로 뽑습니다.'), `<div class="scroll"><table><tbody>${rule.map(([k, v]) => `<tr><td class="l">${t(k)}</td><td>${v}</td></tr>`).join('')}</tbody></table></div><p class="foot" style="margin-bottom:0">${t('점수가 같은 선수가 있으면 포지션에 따라 다르게 정합니다. 공격수(FW)와 미드필더(MF)는 더 짧게 뛴 선수를 먼저 뽑습니다. 같은 점수를 더 짧은 시간에 냈기 때문입니다.')}<br>${t('수비수(DF)와 골키퍼(GK)는 더 오래 뛴 선수를 먼저 뽑습니다. 점수가 주로 무실점에서 나오므로 더 오래 지킨 쪽을 높게 봅니다. 출전 시간까지 같으면 골이 더 많은 선수를 뽑습니다.')}<br>${t('포지션(FW·MF·DF·GK)은 연맹 경기 기록의 출전 명단에 적힌 대로 씁니다.')}</p>`, U.src(t('이 사이트의 자체 기준')))}
        ${U.card(t('시즌 선정 횟수'), t('두 번 이상 뽑힌 선수입니다.'), multi.length ? `<div class="scroll"><table><thead><tr><th class="l">${t('선수')}</th><th class="l">${t('팀')}</th><th class="l">${t('포지션')}</th><th>${t('선정')}</th></tr></thead><tbody>${multi.map((c) => `<tr><td class="l"><span class="pl">${U.photo(c.p, 28)}<a class="name" href="${U.pHref(c.p.key)}">${U.pname(c.p.key)}</a></span></td><td class="l">${U.team(B, c.p.team)}</td><td class="l">${c.p.position}</td><td>${c.n}</td></tr>`).join('')}</tbody></table></div>` : `<p class="notice" style="margin:0">${t('두 번 이상 뽑힌 선수가 아직 없습니다.')}</p>`)}
      </div>
      <p class="foot"><b>${t('이 선정의 한계')}</b> ${t('연맹 공개 기록에는 패스, 태클, 선방 같은 기록이 없습니다. 그래서 골·도움을 올린 공격수와 미드필더가 유리하고, 수비수와 골키퍼는 개인 활약이 아니라 팀이 실점하지 않았는지로 주로 갈립니다. 자책골과 페널티킥 실축도 반영하지 못했습니다. 경기를 직접 본 평가와 다를 수 있습니다.')}</p>`;
  };
})();
