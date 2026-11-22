// 순위 페이지: 순위표, 순위 결정 규칙, 라운드별 순위 변동, 상대 전적표
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;

  function standings(B) {
    const rows = WK.standings(B.league, B.teams, S.tableMode);
    // 정규리그 1위 직행, 2~3위 플레이오프 (대회 규정 확인 필요)
    const zone = (r) => (S.tableMode !== 'all' ? '' : r.rank === 1 ? 'class="zone" style="--zc:var(--s1)"' : r.rank <= 3 ? 'class="zone" style="--zc:var(--s3)"' : '');
    return `<div class="scroll"><table class="${S.tableWide ? 'wide' : 'compact'}">
      <thead><tr><th>${t('순위')}</th><th class="l">${t('팀')}</th><th>${t('경기')}</th><th>${t('승점')}</th><th class="x">${t('승')}</th><th class="x">${t('무')}</th><th class="x">${t('패')}</th><th class="x">${t('득점')}</th><th class="x">${t('실점')}</th><th>${t('득실')}</th><th class="l x">${t('최근 5경기')}</th></tr></thead>
      <tbody>${rows.map((r) => `<tr class="click" data-href="${U.tHref(r.team)}"><td ${zone(r)}>${r.rank}</td><td class="l">${U.team(B, r.team)}${S.tableMode === 'all' && B.clinched === r.team ? ` <span class="tag good">${t(B.upcoming.length ? '정규리그 1위 확정' : '정규리그 1위')}</span>` : ''}</td><td>${r.p}</td><td class="strong">${r.pts}</td><td class="x">${r.w}</td><td class="x">${r.d}</td><td class="x">${r.l}</td><td class="x">${r.gf}</td><td class="x">${r.ga}</td><td>${U.sgn(r.gd)}</td><td class="l x">${U.form(r.form)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function bump(B) {
    const H = B.history, R = H.length, N = B.teams.length;
    if (R < 2) return `<div class="empty">${t('순위 변동을 그리기에는 종료된 라운드가 부족합니다.')}</div>`;
    const at = (tm, i) => H[i].find((s) => s.team === tm);
    const step = R > 20 ? 3 : R > 10 ? 2 : 1, xt = [];
    for (let r = 1; r <= R; r++) if (r === 1 || r === R || (r % step === 0 && R - r >= step)) xt.push([r, r + 'R']);
    const narrow = U.narrow(); // 좁은 화면에서는 선 끝 이름표 대신 위쪽 범례
    const hi = B.teams.includes(S.bumpTeam) ? S.bumpTeam : '';
    const order = [...B.teams].sort((x, y) => (x === hi) - (y === hi)); // 고른 팀을 맨 위에 그린다
    const series = order.map((tm) => ({ color: B.color[tm], label: narrow ? '' : WK.tn(tm), toggle: `bumpTeam:${tm}`, op: hi && hi !== tm ? 0.15 : 1, w: hi === tm ? 3.5 : 2, bold: hi === tm, hit: !hi || hi === tm,
      pts: H.map((_, i) => { const s = at(tm, i); return [i + 1, s.rank, t('{team} · {r}R까지 {rank}위 · 승점 {pts}', { team: WK.tn(tm), r: i + 1, rank: s.rank, pts: s.pts })]; }) }));
    const legend = `<div class="legend pick" style="margin-bottom:8px">${H[R - 1].map((s) => `<button type="button" data-toggle="bumpTeam:${U.esc(s.team)}" aria-pressed="${hi === s.team}" style="${hi && hi !== s.team ? 'opacity:.45' : ''}">${U.logo(s.team, 18)}<span class="sw" style="background:${B.color[s.team]}"></span>${U.tname(s.team)}</button>`).join('')}</div>`;
    const svg = legend + U.lineChart({ W: narrow ? 420 : 900, l: narrow ? 24 : 34, H: 30 + 34 * (N - 1) + 34, r: narrow ? 14 : 190, x: [1, R], y: [1, N], invert: true, xt, yt: Array.from({ length: N }, (_, i) => [i + 1, i + 1]), series });
    const tbl = `<table><thead><tr><th class="l">${t('팀')}</th>${H.map((_, i) => `<th>${i + 1}R</th>`).join('')}</tr></thead><tbody>${B.teams.map((tm) => `<tr><td class="l">${U.tname(tm)}</td>${H.map((_, i) => `<td>${at(tm, i).rank}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return `${svg}<details><summary>${t('표로 보기')}</summary><div class="scroll">${tbl}</div></details>`;
  }

  function matrix(B) {
    const cell = (h, a) => {
      if (h === a) return '<td class="cell self"></td>';
      const ms = B.league.filter((m) => m.home === h && m.away === a);
      return `<td class="cell">${ms.map((m) => `<a class="${m.homeScore > m.awayScore ? 'W' : m.homeScore < m.awayScore ? 'L' : 'D'}" href="#/match/${m.id}" data-tip="${m.round} · ${U.day(m)}">${m.homeScore}:${m.awayScore}</a>`).join('') || '<span style="color:var(--muted)">–</span>'}</td>`;
    };
    return `<div class="legend" style="margin-bottom:10px"><span><span class="res W">${U.res('W')}</span>${t('홈 승')}</span><span><span class="res D">${U.res('D')}</span>${t('무승부')}</span><span><span class="res L">${U.res('L')}</span>${t('홈 패')}</span><span>– ${t('경기 전')}</span></div>
      <div class="scroll"><table class="matrix"><thead><tr><th class="l">${t('홈 ＼ 원정')}</th>${B.teams.map((tm) => `<th>${U.logo(tm, 22)}<span class="thn">${U.tname(tm)}</span></th>`).join('')}</tr></thead>
      <tbody>${B.teams.map((h) => `<tr><td class="l"><span class="tl">${U.logo(h, 20)}<span class="name" title="${U.tname(h)}">${U.tname(h)}</span></span></td>${B.teams.map((a) => cell(h, a)).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  WK.pages.table = function (B) {
    if (!B.league.length) return `<h1>${t('순위')}</h1><div class="card empty">${t('{y}시즌에는 종료된 경기가 없습니다.', { y: B.year })}</div>`;
    const seg = (m, l) => `<button data-set="tableMode:${m}" aria-pressed="${S.tableMode === m}">${t(l)}</button>`;
    const modeNote = { all: '모든 경기 결과로 계산한 순위입니다. 홈 경기만 또는 원정 경기만 따로 볼 수도 있습니다.', home: '각 팀이 자기 홈구장에서 치른 경기만으로 계산한 순위입니다. 홈에서 강한 팀을 볼 수 있습니다.', away: '각 팀이 상대 구장에서 치른 원정 경기만으로 계산한 순위입니다. 원정에서 강한 팀을 볼 수 있습니다.' }[S.tableMode];
    return `<h1>${t('순위')}</h1><p class="lead">${t('{y} WK리그 정규리그 · {n}경기 중 {m}경기 종료', { y: B.year, n: B.all.length, m: B.league.length })}</p>
      <section class="card" style="margin-top:0"><div class="head"><div class="bar"><div class="seg" role="group">${seg('all', '전체 경기')}${seg('home', '홈 경기만')}${seg('away', '원정 경기만')}</div>
        <button class="btn only-m" data-set="tableWide:${!S.tableWide}">${S.tableWide ? t('핵심 열만 보기') : t('전체 열 보기')}</button></div>${U.src()}</div>
        <p class="desc" style="margin:0 0 10px">${t(modeNote)}</p>
        ${standings(B)}
        ${S.tableMode === 'all' ? `<div class="legend" style="margin-top:12px"><span><span class="key" style="--zc:var(--s1)"></span>${t('1위 챔피언결정전 직행')}</span><span><span class="key" style="--zc:var(--s3)"></span>${t('2~3위 플레이오프')}</span></div>` : ''}
        ${B.clinched && B.upcoming.length ? `<p class="foot"><b>${t('정규리그 1위 확정')}</b> ${t('{team}: 다른 팀이 남은 경기를 모두 이겨도 승점에서 앞서 정규리그 1위가 확정됐습니다.', { team: U.tname(B.clinched) })}</p>` : ''}
        <p class="foot" style="margin-top:0"><b>${t('순위 결정')}</b> ${t('승점(승 3, 무 1) → 득실차 → 다득점 순으로 계산했습니다. 대회 규정의 동률 처리 기준과 포스트시즌 진출 방식은 연맹 자료로 확인하지 못해 확인이 필요합니다.')}<br><b>${t('열 풀이')}</b> ${t('득실 = 득점 − 실점 · 최근 5경기는 오른쪽이 가장 최근이며 누르면 해당 경기로 이동합니다.')}</p>
      </section>
      ${U.card(t('라운드별 순위 변동'), t('각 라운드까지의 누적 순위입니다. 팀 이름이나 선을 누르면 그 팀만 진하게 보이고, 다시 누르면 풀립니다. 순연된 경기는 원래 라운드에 포함해 계산했습니다.'), bump(B))}
      ${U.card(t('상대 전적표'), t('행이 홈 팀, 열이 원정 팀입니다. 점수는 홈:원정이며 누르면 경기 기록으로 이동합니다.'), matrix(B))}`;
  };
})();
