// 일정·결과 페이지와 경기 상세 페이지
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  const dateKey = (m) => m.datetime.slice(0, 10);

  function matchRow(m) {
    const score = m.finished ? `<span class="sc">${m.homeScore} : ${m.awayScore}</span>` : `<span class="sc pending">${m.datetime.slice(11, 16)}</span>`;
    const body = `<span class="rd">${U.round(m)}</span><span class="tm h" title="${U.tname(m.home)}"><span class="nm">${U.tname(m.home)}</span>${U.logo(m.home)}</span>${score}<span class="tm a" title="${U.tname(m.away)}">${U.logo(m.away)}<span class="nm">${U.tname(m.away)}</span></span><span class="meta">${m.finished ? m.datetime.slice(11, 16) : t('예정')} · ${m.venue ? U.venue(m.venue) : t('구장 정보 없음')}</span>`;
    if (m.finished) return `<a class="mrow" href="#/match/${m.id}">${body}</a>`;
    const P = WK.predict(WK.season(S.season)), f = P && P.byMatch[m.id];
    return `<div class="mrow${f ? ' has-prob' : ''}">${body}${f ? U.probBar(f) : ''}</div>`;
  }
  U.matchRow = matchRow;

  // 달력: 한 달을 일~토 7칸으로. 칸 안에는 로고와 점수(또는 시작 시각)만 넣고, 팀을 골랐으면 상대 팀을 보여 준다.
  function calendar(B, list, month) {
    const [y, mo] = month.split('-').map(Number), first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate();
    const P = WK.predict(B), today = new Date(), isToday = (d) => today.getFullYear() === y && today.getMonth() === mo - 1 && today.getDate() === d;
    const chip = (m) => {
      const mid = m.finished ? `<b>${m.homeScore}:${m.awayScore}</b>` : `<i>${m.datetime.slice(11, 16)}</i>`, tip = U.esc(`${U.round(m)} · ${WK.tn(m.home)} – ${WK.tn(m.away)}${m.venue ? ' · ' + WK.vn(m.venue) : ''}`);
      let body;
      if (S.mTeam) {
        const isH = m.home === S.mTeam, opp = isH ? m.away : m.home, gf = isH ? m.homeScore : m.awayScore, ga = isH ? m.awayScore : m.homeScore;
        const res = m.finished ? `<span class="res ${gf > ga ? 'W' : gf < ga ? 'L' : 'D'}">${U.res(gf > ga ? 'W' : gf < ga ? 'L' : 'D')}</span>` : '';
        body = `<span class="ha">${isH ? t('홈') : t('원정')}</span>${U.logo(opp, 18)}<span class="on">${U.tname(opp)}</span>${m.finished ? `<b>${gf}:${ga}</b>${res}` : mid}`;
      } else body = `${U.logo(m.home, 18)}${mid}${U.logo(m.away, 18)}`;
      return m.finished ? `<a class="chip" href="#/match/${m.id}" data-tip="${tip}">${body}</a>` : `<span class="chip up" data-tip="${tip}">${body}</span>`;
    };
    const cup = (U.cupMatches ? U.cupMatches() : []).filter((m) => !S.mTeam || m.home === S.mTeam || m.away === S.mTeam);
    const cupChip = (m) => { const fin = m.hs != null, nm = (x) => (WK.logo(x) ? WK.tn(x) : t(x)); return `<a class="chip cupc${fin ? '' : ' up'}" href="#/${m.comp}/${m.idx}" data-tip="${U.esc(`${t(m.comp === 'nsf' ? '전국체전' : 'W코리아컵')} · ${nm(m.home)} – ${nm(m.away)}${m.venue ? ' · ' + t(WK.vn(m.venue)) : ''}`)}"><em class="c-${m.comp}">${t(m.tag)}</em>${U.logo(m.home, 18)}${fin ? `<b>${m.hs}:${m.as}</b>` : `<i>${m.time || ''}</i>`}${U.logo(m.away, 18)}</a>`; };
    let cells = '';
    for (let i = 0; i < first.getDay(); i++) cells += '<div class="cd off"></div>';
    for (let d = 1; d <= days; d++) {
      const key = `${month}-${String(d).padStart(2, '0')}`, ms = list.filter((m) => dateKey(m) === key), cs = cup.filter((m) => m.date === key);
      cells += `<div class="cd${ms.length || cs.length ? ' has' : ''}${isToday(d) ? ' today' : ''}"><span class="dn">${d}</span>${ms.map(chip).join('')}${cs.map(cupChip).join('')}</div>`;
    }
    return `<div class="cal"><div class="cw">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<span>${WK.weekday(i)}</span>`).join('')}</div><div class="cg">${cells}</div></div>`;
  }

  // 일정 필터(월·라운드·팀) 준비. forceCal이면 한 달 단위 달력에 맞춘다.
  function prep(B, forceCal) {
    const all = [...B.all, ...B.post].sort((a, b) => a.datetime.localeCompare(b.datetime) || a.id - b.id);
    if (!all.length) return null;
    const months = [...new Set(all.map((m) => m.datetime.slice(0, 7)))];
    if (S.mSeason !== B.year) { // 시즌이 바뀌면 필터를 처음 상태로: 가장 최근에 끝난 경기가 있는 달. 고른 팀은 기억해 둔 값을 쓴다.
      const last = [...all].reverse().find((m) => m.finished);
      let saved = ''; try { saved = localStorage.getItem('wk-team') || ''; } catch (e) { /* 저장이 막힌 환경 */ }
      Object.assign(S, { mSeason: B.year, mMonth: (last || all[0]).datetime.slice(0, 7), mRound: '', mTeam: B.teams.includes(saved) ? saved : '', mView: S.mView || 'list' });
    }
    try { localStorage.setItem('wk-team', S.mTeam || ''); } catch (e) { /* 저장이 막힌 환경 */ }
    const pick = (m) => (!S.mRound || m.round === S.mRound) && (!S.mTeam || m.home === S.mTeam || m.away === S.mTeam);
    // 달력은 한 달 단위로만 볼 수 있다: '전체 기간'이면 조건에 맞는 다음 경기가 있는 달(없으면 마지막 경기가 있는 달)로 옮긴다
    if ((forceCal || S.mView === 'cal') && S.mMonth === 'all') { const f = all.filter(pick); S.mMonth = ((f.find((m) => !m.finished) || f[f.length - 1] || all[all.length - 1]).datetime).slice(0, 7); }
    const i = months.indexOf(S.mMonth);
    const step = (d, label, sym) => { const k = months[i + d]; return `<button class="btn" ${i < 0 || !k ? 'disabled' : `data-set="mMonth:${k}"`} aria-label="${t(label)}">${sym}</button>`; };
    return { all, months, pick, step };
  }
  const monthNav = (F, withAll) => `<span class="bar" style="gap:4px">${F.step(-1, '이전 달', '◀')}<select data-bind="mMonth" aria-label="${t('월 선택')}">${F.months.map((k) => `<option value="${k}" ${k === S.mMonth ? 'selected' : ''}>${k.replace('-', '.')}</option>`).join('')}${withAll ? `<option value="all" ${S.mMonth === 'all' ? 'selected' : ''}>${t('전체 기간')}</option>` : ''}</select>${F.step(1, '다음 달', '▶')}</span>`;
  const teamPick = (B, also) => `<select data-bind="mTeam"${also} aria-label="${t('팀 선택')}"><option value="">${t('전체 팀')}</option>${B.teams.map((tm) => `<option value="${U.esc(tm)}" ${tm === S.mTeam ? 'selected' : ''}>${U.tname(tm)}</option>`).join('')}</select>`;

  // 홈 맨 위에 놓는 이번 달 달력
  U.calendarCard = function (B) {
    const F = prep(B, true);
    if (!F) return '';
    const list = F.all.filter((m) => m.datetime.startsWith(S.mMonth) && (!S.mTeam || m.home === S.mTeam || m.away === S.mTeam));
    const cups = U.cupRow ? U.cupMatches().filter((m) => m.date.startsWith(S.mMonth) && (!S.mTeam || m.home === S.mTeam || m.away === S.mTeam)) : [];
    const rows = [...list.map((m) => ({ k: m.datetime, d: m.datetime.slice(0, 10), html: matchRow(m) })), ...cups.map((m) => ({ k: `${m.date}T${m.time || '99:99'}`, d: m.date, html: U.cupRow(m) }))].sort((a, b) => a.k.localeCompare(b.k));
    return `<section class="card" style="margin-top:0"><div class="head"><div class="bar"><h2 style="margin-right:6px">${t(WK.mode === 'mobile' ? '이달의 경기' : '경기 달력')}</h2>${monthNav(F, false)}${teamPick(B, '')}</div>${U.src()}</div>
      <p class="desc" style="margin:0 0 4px">${S.mTeam ? t('{team} 경기만 보고 있습니다. 고른 팀은 다음에 열 때도 유지됩니다.', { team: U.tname(S.mTeam) }) : t('팀을 고르면 그 팀 경기만 볼 수 있습니다. 종료된 경기를 누르면 경기 기록으로 이동합니다.')}</p>
      ${WK.mode === 'mobile' ? `<div class="mlist">${rows.length ? rows.map((r, i) => (i === 0 || rows[i - 1].d !== r.d ? `<div class="mday">${U.date(r.d)}</div>` : '') + r.html).join('') : `<div class="empty">${t('이 달에는 경기가 없습니다.')}</div>`}</div>` : calendar(B, list, S.mMonth)}<p class="more"><a class="link" href="#/matches">${t('일정·결과 전체 보기')} →</a></p></section>`;
  };

  WK.pages.matches = function (B) {
    const F = prep(B);
    if (!F) return `<h1>${t('일정·결과')}</h1><div class="card empty">${t('{y}시즌 경기 일정이 없습니다.', { y: B.year })}</div>`;
    const { all, months, pick, step } = F;
    const rounds = [...new Set(all.map((m) => m.round))];
    const list = all.filter((m) => (S.mMonth === 'all' || m.datetime.startsWith(S.mMonth)) && pick(m));
    const days = [...new Set(list.map(dateKey))];
    // 목록에는 같은 기간의 코리아컵·전국체전 경기도 끼운다 (라운드를 고르면 리그 경기만)
    const cups = S.mRound || !U.cupRow ? [] : U.cupMatches().filter((m) => (S.mMonth === 'all' || m.date.startsWith(S.mMonth)) && (!S.mTeam || m.home === S.mTeam || m.away === S.mTeam));
    const allDays = [...new Set([...days, ...cups.map((m) => m.date)])].sort();
    const done = list.filter((m) => m.finished).length, allDone = all.filter((m) => m.finished).length;
    const view = (v, l) => `<button data-set="mView:${v}" aria-pressed="${S.mView === v}">${t(l)}</button>`, cal = S.mView === 'cal';
    const also = cal ? '' : ' data-also="mMonth:all"';
    return `<h1>${t('일정·결과')}</h1><p class="lead">${t('{y} WK리그 · 전체 {n}경기 (종료 {a}, 예정 {b})', { y: B.year, n: all.length, a: allDone, b: all.length - allDone })}</p>
      <section class="card" style="margin-top:0"><div class="head"><div class="bar">
        <div class="seg" role="group">${view('list', '목록')}${view('cal', '달력')}</div>
        <span class="bar" style="gap:4px">${step(-1, '이전 달', '◀')}<select data-bind="mMonth" aria-label="${t('월 선택')}">${months.map((k) => `<option value="${k}" ${k === S.mMonth ? 'selected' : ''}>${k.replace('-', '.')}</option>`).join('')}${cal ? '' : `<option value="all" ${S.mMonth === 'all' ? 'selected' : ''}>${t('전체 기간')}</option>`}</select>${step(1, '다음 달', '▶')}</span>
        <select data-bind="mRound"${also} aria-label="${t('라운드 선택')}"><option value="">${t('전체 라운드')}</option>${rounds.map((r) => `<option value="${r}" ${r === S.mRound ? 'selected' : ''}>${U.round({ round: r })}</option>`).join('')}</select>
        <select data-bind="mTeam"${also} aria-label="${t('팀 선택')}"><option value="">${t('전체 팀')}</option>${B.teams.map((tm) => `<option value="${U.esc(tm)}" ${tm === S.mTeam ? 'selected' : ''}>${U.tname(tm)}</option>`).join('')}</select>
      </div>${U.src()}</div>
      <p class="desc" style="margin:0 0 4px">${S.mTeam ? `${t('{team} 경기만 보고 있습니다. 고른 팀은 다음에 열 때도 유지됩니다.', { team: U.tname(S.mTeam) })} ` : ''}${t('{n}경기 (종료 {a}, 예정 {b}) · 종료된 경기를 누르면 경기 기록으로 이동합니다.', { n: list.length, a: done, b: list.length - done })}</p>
      ${cal ? calendar(B, list, S.mMonth) : allDays.length ? allDays.map((k) => `<h3 class="day">${U.date(k)}</h3>${list.filter((m) => dateKey(m) === k).map(matchRow).join('')}${cups.filter((m) => m.date === k).map(U.cupRow).join('')}`).join('') : `<div class="empty">${t('조건에 맞는 경기가 없습니다.')}</div>`}
      </section>`;
  };

  WK.pages.match = function (B, id) {
    const m = B.byId[id];
    const back = `<p class="crumb"><a class="link" href="#/matches">${t('일정·결과')}</a></p>`;
    if (!m) return `${back}<div class="card empty">${t('{y}시즌에서 해당 경기를 찾지 못했습니다. 상단에서 시즌을 확인해 주세요.', { y: B.year })}</div>`;
    if (!m.finished) return `${back}<h1>${U.tname(m.home)} – ${U.tname(m.away)}</h1><div class="card empty">${t('아직 열리지 않은 경기입니다. {when} 예정.', { when: `${U.date(m.datetime)} ${m.datetime.slice(11, 16)}` })}</div>`;
    const hasDetail = m.players && m.players.home.length > 0;
    const sum = (side) => m.players[side].reduce((a, p) => a + p.goals, 0) + m.goals[side].filter((g) => g.own).length; // 자책골은 선수 득점에 잡히지 않는다
    const mismatch = hasDetail && (sum('home') !== m.homeScore || sum('away') !== m.awayScore);

    const goals = hasDetail ? [...m.goals.home.map((g) => ({ ...g, side: 'home' })), ...m.goals.away.map((g) => ({ ...g, side: 'away' }))].sort((a, b) => (a.minute ?? 999) - (b.minute ?? 999) || a.added - b.added) : [];
    const who = (g) => {
      const side = g.own ? (g.side === 'home' ? 'away' : 'home') : g.side, p = m.players[side].find((x) => x.name === g.player);
      return (p ? U.pname(`${m[side]}|${p.name}|${p.number}`) : U.esc(g.player)) + (g.own ? ` (${t('자책골')})` : '');
    };
    const min = (g) => (g.minute == null ? '' : `${g.minute}${g.added ? '+' + g.added : ''}'`);
    const goalRows = goals.map((g) => `<div class="g h">${g.side === 'home' ? who(g) : ''}</div><div class="g m">${min(g)}</div><div class="g a">${g.side === 'away' ? who(g) : ''}</div>`).join('');

    const st = m.stats || {}, labels = [['shots', '슈팅'], ['shotsOnTarget', '유효슈팅'], ['corners', '코너킥'], ['offsides', '오프사이드'], ['fouls', '파울'], ['yellows', '경고'], ['reds', '퇴장']].filter(([k]) => st[k]);
    if (st.possession && st.possession.home + st.possession.away > 0) labels.unshift(['possession', '점유율(%)']);
    const duel = labels.map(([k, lab]) => { const h = st[k].home, a = st[k].away, max = Math.max(h, a) || 1; return `<div class="side x"><span>${h}</span><div class="t"><div class="b" style="width:${(h / max) * 100}%"></div></div></div><div class="mid">${t(lab)}</div><div class="side y"><span>${a}</span><div class="t"><div class="b" style="width:${(a / max) * 100}%"></div></div></div>`; }).join('');

    const z = (v) => (v ? v : '<span class="z">0</span>');
    const prow = (team, p) => `<tr class="click" data-href="${U.pHref(`${team}|${p.name}|${p.number}`)}"><td class="l"><span class="no">${p.number ?? ''}</span><span class="name" title="${U.pname(`${team}|${p.name}|${p.number}`)}">${U.pname(`${team}|${p.name}|${p.number}`)}</span>${p.captain ? ` <span class="tag">${t('주장')}</span>` : ''}</td><td class="l">${U.esc(p.position)}</td><td>${p.minutes}</td><td>${z(p.goals)}</td><td>${z(p.assists)}</td><td>${z(p.shots)}</td><td>${z(p.shotsOnTarget)}</td><td>${z(p.fouls)}</td><td>${z(p.yellows)}</td><td>${z(p.reds)}</td></tr>`;
    const lineup = (side) => {
      const team = m[side], list = m.players[side], start = list.filter((p) => p.starter), sub = list.filter((p) => !p.starter && p.minutes > 0), rest = list.filter((p) => !p.starter && !p.minutes);
      const head = `<thead><tr><th class="l">${t('선수')}</th><th class="l">${t('포지션')}</th><th>${t('분')}</th><th>${t('득점')}</th><th>${t('도움')}</th><th>${t('슈팅')}</th><th>${t('유효')}</th><th>${t('파울')}</th><th>${t('경고')}</th><th>${t('퇴장')}</th></tr></thead>`;
      return U.card(U.tname(team), t('선발 {a}명 · 교체 출전 {b}명', { a: start.length, b: sub.length }), `<div class="scroll"><table class="stick">${head}<tbody>${start.map((p) => prow(team, p)).join('')}${sub.length ? `<tr class="sep"><td class="l" colspan="10">${t('교체 출전')}</td></tr>${sub.map((p) => prow(team, p)).join('')}` : ''}</tbody></table></div>
        ${rest.length ? `<details><summary>${t('출전하지 않은 명단 {n}명', { n: rest.length })}</summary><p class="foot" style="margin-top:6px">${rest.map((p) => `${p.number ?? ''} ${U.pname(`${team}|${p.name}|${p.number}`)} (${U.esc(p.position)})`).join(' · ')}</p></details>` : ''}`);
    };

    return `${back}
      <section class="card" style="margin-top:8px"><div class="head"><div class="desc" style="margin:0">${U.round(m)} · ${U.date(m.datetime)} ${m.datetime.slice(11, 16)}${m.venue ? ' · ' + U.venue(m.venue) : ''}</div>${U.src()}</div>
        <div class="board"><a class="tm h" href="${U.tHref(m.home)}"><span class="nm">${U.tname(m.home)}</span>${U.logo(m.home, 40)}</a><div class="big">${m.homeScore} : ${m.awayScore}</div><a class="tm a" href="${U.tHref(m.away)}">${U.logo(m.away, 40)}<span class="nm">${U.tname(m.away)}</span></a>${goalRows}</div>
        ${hasDetail && !goals.length ? `<p class="desc" style="text-align:center;margin-top:8px">${t('득점 없음')}</p>` : ''}
        ${mismatch ? `<p class="notice">${t('이 경기는 선수별 득점과 자책골을 합한 수({a}:{b})가 경기 점수와 다릅니다. 원인은 확인하지 못했습니다.', { a: sum('home'), b: sum('away') })}</p>` : ''}
      </section>
      ${hasDetail ? `${duel ? U.card(t('경기 비교'), `<span class="dot" style="background:var(--s1)"></span>${U.tname(m.home)} &nbsp; <span class="dot" style="background:var(--s2)"></span>${U.tname(m.away)}`, `<div class="duel">${duel}</div>`) : ''}
        <div class="two">${lineup('home')}${lineup('away')}</div>` : `<div class="card"><p class="notice" style="margin:0">${t('이 경기는 연맹 사이트에 점수만 공개되어 있어 득점자, 경기 통계, 선수 기록이 없습니다.')}</p></div>`}`;
  };
})();
