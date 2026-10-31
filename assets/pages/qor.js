// 라운드 QOR: 연맹이 라운드마다 선정해 공개하는 선수
(function () {
  const WK = window.WK, U = WK.ui, t = WK.t;

  // 선정 목록에 선수 기록과 그 라운드 경기를 붙인다
  U.qor = function (B) {
    return (B.s.qor || []).map((q) => {
      const key = `${q.team}|${q.name}|${q.number}`, p = B.playerByKey[key];
      const log = p && p.log.find((x) => x.r === q.round);
      const m = log ? log.m : B.all.find((x) => x.r === q.round && x.finished && (x.home === q.team || x.away === q.team));
      return { ...q, key, p, log, m };
    }).sort((a, b) => b.round - a.round);
  };
  const who = (x) => (x.p ? `<span class="pl">${U.photo(x.p, 28)}<a href="${U.pHref(x.key)}" class="name" title="${U.pname(x.key)}">${U.pname(x.key)}</a></span>` : `<span class="name">${U.esc(x.name)}</span>`);

  // 연맹 사이트의 라운드 QOR 투표로 가는 안내 상자
  U.qorVote = function (B) {
    const v = B.s.qorVote, open = v && v.status === '투표 중';
    return `<section class="card vote${open ? ' open' : ''}" style="margin-top:0"><div><h2>${t('라운드 QOR 투표')}</h2>
      <p class="desc" style="margin:4px 0 0">${v ? `${t('{r}라운드', { r: v.round })} · ${U.esc(v.period)} · <b>${open ? t('투표 중') : t('투표 종료')}</b> · ` : ''}${t('투표는 한국여자축구연맹 사이트에서 하며 로그인이 필요합니다.')}</p></div>
      <a class="btn go" href="https://www.kwff.or.kr/mvp" target="_blank" rel="noopener">${t('투표하러 가기')} →</a></section>`;
  };

  WK.pages.qor = function (B) {
    const list = U.qor(B);
    if (!list.length) return `<h1>${t('라운드 QOR')}</h1>${U.qorVote(B)}<div class="card"><p class="notice" style="margin:0">${t('{y}시즌 라운드 QOR 자료가 없습니다. 데이터를 다시 수집해 주세요.', { y: B.year })}</p></div>`;
    const byPlayer = {}, byTeam = {};
    for (const x of list) { (byPlayer[x.key] ||= { x, rounds: [] }).rounds.push(x.round); byTeam[x.team] = (byTeam[x.team] || 0) + 1; }
    const multi = Object.values(byPlayer).filter((v) => v.rounds.length > 1).sort((a, b) => b.rounds.length - a.rounds.length);
    const teams = Object.entries(byTeam).sort((a, b) => b[1] - a[1]), max = teams[0][1];
    const matchCell = (x) => { const m = x.m; return m ? `<a class="link" href="#/match/${m.id}">${U.tname(m.home)} ${m.homeScore}:${m.awayScore} ${U.tname(m.away)}</a>` : '–'; };
    return `<h1>${t('라운드 QOR')}</h1><p class="lead">${t('{y} WK리그 · 연맹이 라운드마다 선정해 공개하는 선수', { y: B.year })}</p>
      ${U.qorVote(B)}
      ${U.card(t('라운드별 선정 선수'), t('최근 라운드부터 보여 줍니다. 그 라운드 경기의 기록을 함께 적었습니다.'),
        `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('라운드')}</th><th class="l">${t('선수')}</th><th class="l">${t('팀')}</th><th class="l">${t('포지션')}</th><th class="l">${t('그 라운드 경기')}</th><th class="l">${t('그 경기 기록')}</th></tr></thead>
        <tbody>${list.map((x) => `<tr><td class="l">${x.round}R</td><td class="l">${who(x)}</td><td class="l">${B.rank[x.team] ? U.team(B, x.team) : U.esc(x.team)}</td><td class="l">${x.p ? U.esc(x.p.position) : '–'}</td><td class="l">${matchCell(x)}</td><td class="l">${x.log ? t('{g}골 {a}도움 · {m}분', { g: x.log.goals, a: x.log.assists, m: x.log.minutes }) : t('경기 기록 없음')}</td></tr>`).join('')}</tbody></table></div>`)}
      <div class="two">
        ${U.card(t('선수별 선정 횟수'), multi.length ? t('두 번 이상 선정된 선수입니다.') : '', multi.length ? `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('선수')}</th><th class="l">${t('팀')}</th><th>${t('라운드 QOR')}</th></tr></thead><tbody>${multi.map((v) => `<tr><td class="l">${who(v.x)}</td><td class="l">${B.rank[v.x.team] ? U.team(B, v.x.team) : U.esc(v.x.team)}</td><td>${t('{n}회 ({r})', { n: v.rounds.length, r: v.rounds.sort((a, b) => a - b).map((r) => r + 'R').join(', ') })}</td></tr>`).join('')}</tbody></table></div>` : `<p class="foot" style="margin:0">${t('두 번 이상 선정된 선수가 없습니다.')}</p>`)}
        ${U.card(t('팀별 선정 횟수'), '', `<div class="bars">${teams.map(([tm, n]) => `<a href="${U.tHref(tm)}" class="tl">${U.logo(tm, 20)}<span class="name" title="${U.tname(tm)}">${U.tname(tm)}</span></a><div class="track"><div class="bar" style="width:${(n / max) * 100}%"></div></div><div class="val">${n}</div>`).join('')}</div>`)}
      </div>
      <p class="foot">${t('라운드 QOR은 연맹 사이트의 팬 투표로 정해집니다(라운드마다 후보 4명). 이 표는 연맹이 공개한 선정 결과를 그대로 옮긴 것입니다.')}</p>`;
  };
})();
