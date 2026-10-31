// 홈: 다음·최근 경기, 순위 요약, 개인 순위, 주요 사건
(function () {
  const WK = window.WK, U = WK.ui, t = WK.t;

  // 개인 순위. 시즌 중 팀을 옮긴 선수는 두 팀 기록을 합쳐 한 줄로 만든다.
  // 기록이 같으면 경기 수(연맹 기준: 명단 포함 횟수)가 적은 선수가 앞 순위(공동 순위 없음). 그것도 같으면 출전 시간이 적은 쪽.
  U.leaders = function (B, key, n) {
    const moved = new Map(B.movers.map((m) => [m.from.key, m]));
    const skip = new Set(B.movers.map((m) => m.to.key));
    const list = B.players.filter((p) => !skip.has(p.key)).map((p) => {
      const m = moved.get(p.key);
      return m ? { p: m.to, teams: [m.from.team, m.to.team], v: m.from[key] + m.to[key], apps: m.from.apps + m.to.apps, squad: m.from.squad + m.to.squad, minutes: m.from.minutes + m.to.minutes } : { p, teams: [p.team], v: p[key], apps: p.apps, squad: p.squad, minutes: p.minutes };
    }).filter((x) => x.v > 0).sort((a, b) => b.v - a.v || a.squad - b.squad || a.minutes - b.minutes);
    list.forEach((x, i) => { x.rank = i + 1; });
    return list.slice(0, n);
  };
  U.leaderTable = function (B, title, key, n) {
    const list = U.leaders(B, key, n);
    return `<div><h3>${t(title)}</h3><table class="lead"><thead><tr><th>${t('순위')}</th><th class="l">${t('선수')}</th><th>${t('출전')}</th><th>${t(title === '득점 순위' ? '득점' : title === '도움 순위' ? '도움' : '공격P')}</th></tr></thead>
      <tbody>${list.length ? list.map((x) => `<tr class="click" data-href="${U.pHref(x.p.key)}"><td>${x.rank}</td><td class="l"><span class="pl">${U.photo(x.p, 28)}<span class="who"><a href="${U.pHref(x.p.key)}" class="name" title="${U.pname(x.p.key)}">${U.pname(x.p.key)}</a><small>${x.teams.map((tm) => U.logo(tm, 14) + U.tname(tm)).join(' → ')}</small></span></span></td><td>${x.apps}</td><td class="strong">${x.v}</td></tr>`).join('') : `<tr><td class="l" colspan="4">${t('기록 없음')}</td></tr>`}</tbody></table></div>`;
  };
  U.leaderCard = (B, n, right) => U.card(t('개인 순위'), t('기록이 같으면 경기 수가 적은 선수가 앞 순위입니다. 여기서 경기 수는 연맹 순위와 같은 기준(뛰지 않았어도 명단에 든 경기 포함)이며, 표의 출전은 실제로 뛴 경기 수입니다. 시즌 중 팀을 옮긴 선수는 두 팀 기록을 합쳤습니다.'),
    `<div class="three">${U.leaderTable(B, '득점 순위', 'goals', n)}${U.leaderTable(B, '도움 순위', 'assists', n)}${U.leaderTable(B, '공격포인트 순위', 'points', n)}</div>${right || ''}`);
  const more = (href, label) => `<p class="more"><a class="link" href="${href}">${t(label)} →</a></p>`;

  WK.pages.home = function (B) {
    const total = B.all.length, done = B.league.length;
    if (!total) return `<h1>${t('{y} WK리그', { y: B.year })}</h1><div class="card empty">${t('{y}시즌 경기 일정이 없습니다.', { y: B.year })}</div>`;
    const recent = [...B.league, ...B.post.filter((m) => m.finished)].sort((a, b) => b.datetime.localeCompare(a.datetime)).slice(0, 4);
    const next = B.upcoming.slice(0, 4);
    const ev = (window.WK_EVENTS || []).filter((e) => String(e.season) === String(B.year)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    const TYPE = { in: '영입', out: '이적', coach: '감독', league: '리그' };
    const qor = U.qor ? U.qor(B).slice(0, 4) : [];
    const status = !done ? t('아직 종료된 경기가 없습니다.') : B.clinched ? t('정규리그 1위 확정: {team}', { team: `<a class="link" href="${U.tHref(B.clinched)}">${U.tname(B.clinched)}</a>` })
      : B.upcoming.length ? t('현재 1위: {team} (승점 {p})', { team: `<a class="link" href="${U.tHref(B.table[0].team)}">${U.tname(B.table[0].team)}</a>`, p: B.table[0].pts })
      : t('정규리그 종료 · 1위: {team} (승점 {p})', { team: `<a class="link" href="${U.tHref(B.table[0].team)}">${U.tname(B.table[0].team)}</a>`, p: B.table[0].pts });

    const tableCard = done ? U.card(t('순위'), status, `<div class="scroll"><table class="compact"><thead><tr><th>${t('순위')}</th><th class="l">${t('팀')}</th><th>${t('경기')}</th><th>${t('승점')}</th><th>${t('득실')}</th><th class="l x">${t('최근 5경기')}</th></tr></thead>
      <tbody>${B.table.map((r) => `<tr class="click" data-href="${U.tHref(r.team)}"><td>${r.rank}</td><td class="l">${U.team(B, r.team)}</td><td>${r.p}</td><td class="strong">${r.pts}</td><td>${U.sgn(r.gd)}</td><td class="l x">${U.form(r.form)}</td></tr>`).join('')}</tbody></table></div>${more('#/table', '순위 전체 보기')}`) : '';

    return `<div class="hero"><div class="hero-in"><p class="eyebrow">${t('한국 여자축구 WK리그 기록')}</p><h1>${t('{y} WK리그', { y: B.year })}</h1>
        <p class="hero-sub">${t('정규리그 {n}경기 중 {m}경기 종료', { n: total, m: done })} · ${status}</p>
        <p class="hero-own">${t('비공식 팬 사이트')} · ${t('운영')} <a href="https://www.instagram.com/kwf.all/" target="_blank" rel="noopener">@kwf.all</a></p></div>
        <span class="credit">${t('사진 한국여자축구연맹(KWFF)')}</span></div>
      ${U.calendarCard ? U.calendarCard(B) : ''}
      <div class="two">
        ${U.card(next.length ? t('다음 경기') : t('포스트시즌'), '', (next.length ? next.map((m) => U.matchRow(m)).join('') : B.post.length ? B.post.map((m) => U.matchRow(m)).join('') : `<div class="empty">${t('예정된 경기가 없습니다.')}</div>`) + more('#/matches', '일정·결과 전체 보기'))}
        ${U.card(t('최근 경기'), '', (recent.length ? recent.map((m) => U.matchRow(m)).join('') : `<div class="empty">${t('아직 종료된 경기가 없습니다.')}</div>`) + more('#/matches', '일정·결과 전체 보기'))}
      </div>
      ${tableCard}
      ${B.hasDetail ? U.leaderCard(B, 5, more('#/players', '선수 기록 전체 보기')) : `<div class="card"><p class="notice" style="margin:0">${t('{y}시즌은 연맹 사이트에 경기 결과만 공개되어 있어 선수 기록이 없습니다.', { y: B.year })}</p></div>`}
      ${qor.length ? U.card(t('최근 라운드 QOR'), '', `<div class="scroll"><table class="stick"><tbody>${qor.map((x) => `<tr${x.p ? ` class="click" data-href="${U.pHref(x.key)}"` : ''}><td class="l" style="width:1%">${t('{r}라운드', { r: x.round })}</td><td class="l">${x.p ? `<span class="pl">${U.photo(x.p, 28)}<a href="${U.pHref(x.key)}" class="name">${U.pname(x.key)}</a></span>` : U.esc(x.name)}</td><td class="l">${B.rank[x.team] ? U.team(B, x.team) : U.esc(x.team)}</td><td class="l">${x.log ? t('{g}골 {a}도움 · {m}분', { g: x.log.goals, a: x.log.assists, m: x.log.minutes }) : ''}</td></tr>`).join('')}</tbody></table></div>${more('#/qor', '라운드 QOR 전체 보기').replace('</p>', ` · <a class="link" href="https://www.kwff.or.kr/mvp" target="_blank" rel="noopener">${t('투표하러 가기')} →</a></p>`)}`) : ''}
      ${ev.length && WK.mode !== 'mobile' ? U.card(t('선수단 변화와 주요 사건'), '', `<ul class="timeline">${ev.map((e) => `<li><span class="when">${e.date.replace(/-/g, '.')}</span><span class="tag">${t(TYPE[e.type] || '리그')}</span><span class="what">${e.teams.length ? `<b>${e.teams.map((x) => `<a class="tl" href="${U.tHref(x)}">${U.logo(x, 18)}${U.tname(x)}</a>`).join(', ')}</b> · ` : ''}${U.esc(e[WK.lang] || e.ko)} <a class="link" href="${U.esc(e.src)}" target="_blank" rel="noopener">${U.esc(e.by)}</a></span></li>`).join('')}</ul>
        <p class="foot">${t('보도와 공개 자료를 사람이 정리한 목록이며 모든 이적을 담고 있지는 않습니다. 각 항목 끝의 출처를 누르면 원문으로 이동합니다.')}</p>`, U.src(t('각 항목에 표기'))) : ''}
      ${U.newsCard ? U.newsCard(WK.mode === 'mobile' ? 4 : 6) : ''}
      ${U.igCard ? U.igCard(true) : ''}`;
  };
})();
