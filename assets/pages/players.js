// 선수 기록 표와 선수 상세 페이지
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  Object.assign(S, { sort: { key: 'points', dir: -1 }, pTeam: '', pPos: '', pMin: 0, pQ: '' });

  // [키, 머리글, 왼쪽 정렬 여부]
  const COLS = [['name', '선수', 1], ['team', '팀', 1], ['position', '포지션', 1], ['apps', '출전'], ['minutes', '분'], ['goals', '득점'], ['assists', '도움'], ['points', '공격P'], ['shots', '슈팅'], ['sot', '유효'], ['g90', '90분당 득점'], ['conv', '득점률'], ['yellows', '경고'], ['reds', '퇴장']];
  const SUM = ['minutes', 'goals', 'assists', 'points', 'shots', 'sot', 'yellows', 'reds'];

  function rows(B) {
    const { key, dir } = S.sort, q = S.pQ.trim().toLowerCase();
    const label = (p) => (key === 'name' ? WK.pn(p.key, p.name) : key === 'team' ? WK.tn(p.team) : p[key]);
    return B.players
      .filter((p) => (!S.pTeam || p.team === S.pTeam) && (!S.pPos || p.position === S.pPos) && p.minutes >= S.pMin && (!q || p.name.toLowerCase().includes(q) || WK.pn(p.key, p.name).toLowerCase().includes(q)))
      .sort((a, b) => { const x = label(a), y = label(b); if (typeof x === 'string') return dir * x.localeCompare(y, WK.lang); return (Number.isFinite(y) - Number.isFinite(x)) || dir * (x - y) || b.minutes - a.minutes; });
  }

  WK.pages.players = function (B) {
    if (!B.hasDetail) return `<h1>${t('선수')}</h1><div class="card"><p class="notice" style="margin:0">${t('{y}시즌은 연맹 사이트에 경기 결과만 공개되어 있어 선수 기록이 없습니다.', { y: B.year })}</p></div>`;
    const list = rows(B);
    const cell = (p, k) => (k === 'name' ? `<span class="pl">${U.photo(p, 28)}<a href="${U.pHref(p.key)}" class="name" title="${U.pname(p.key)}">${U.pname(p.key)}</a></span>` : k === 'team' ? U.team(B, p.team) : k === 'g90' ? U.f2(p[k]) : k === 'conv' ? U.pct(p[k]) : U.esc(p[k]));
    const tot = Object.fromEntries(SUM.map((k) => [k, list.reduce((a, p) => a + p[k], 0)]));
    const totCell = (k) => (k === 'name' ? t('합계 ({n}명)', { n: list.length }) : SUM.includes(k) ? tot[k] : k === 'g90' ? U.f2(tot.minutes ? (tot.goals / tot.minutes) * 90 : NaN) : k === 'conv' ? U.pct(tot.shots ? tot.goals / tot.shots : NaN) : '');
    return `<h1>${t('선수')}</h1><p class="lead">${t('{y} WK리그 · 실제로 출전한 선수 {n}명', { y: B.year, n: B.players.length })}</p>
      ${U.leaderCard(B, 10).replace('<section class="card">', '<section class="card" style="margin-top:0">')}
      <section class="card"><div class="head"><div><h2>${t('선수 기록 표')}</h2></div>${U.src()}</div><div class="head" style="margin-bottom:8px"><div class="bar">
        <select data-bind="pTeam" aria-label="${t('팀 선택')}"><option value="">${t('전체 팀')}</option>${B.teams.map((tm) => `<option value="${U.esc(tm)}" ${tm === S.pTeam ? 'selected' : ''}>${U.tname(tm)}</option>`).join('')}</select>
        <select data-bind="pPos" aria-label="${t('포지션 선택')}"><option value="">${t('전체 포지션')}</option>${['FW', 'MF', 'DF', 'GK'].map((x) => `<option ${x === S.pPos ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <input type="search" data-live="pQ" value="${U.esc(S.pQ)}" placeholder="${t('이름 검색')}" aria-label="${t('이름 검색')}" style="width:130px">
        <label class="lbl">${t('최소 출전(분)')} <input type="number" data-live="pMin" data-num="1" value="${S.pMin}" min="0" step="90" style="width:76px"></label>
      </div></div>
      <p class="desc" style="margin:0 0 8px">${t('열 제목을 누르면 정렬됩니다. 출전은 연맹과 같은 기준(명단에 든 경기)입니다. 연맹 선수 순위에 나온 선수는 연맹 숫자를 그대로 쓰고, 나머지 선수는 경기별 기록을 더했습니다.')}</p>
      <div class="scroll tall"><table class="stick sortable">
        <thead><tr>${COLS.map(([k, lab, l]) => `<th tabindex="0" data-sort="${k}" class="${l ? 'l' : ''} ${S.sort.key === k ? 'on' : ''}" aria-sort="${S.sort.key === k ? (S.sort.dir < 0 ? 'descending' : 'ascending') : 'none'}">${t(lab)}${S.sort.key === k ? (S.sort.dir < 0 ? ' ▼' : ' ▲') : ''}</th>`).join('')}</tr></thead>
        <tbody>${list.length ? list.map((p) => `<tr class="click" data-href="${U.pHref(p.key)}">${COLS.map(([k, , l]) => `<td class="${l ? 'l' : ''}">${cell(p, k)}</td>`).join('')}</tr>`).join('') : `<tr><td class="l" colspan="${COLS.length}">${t('조건에 맞는 선수가 없습니다.')}</td></tr>`}</tbody>
        ${list.length ? `<tfoot><tr>${COLS.map(([k, , l]) => `<td class="${l ? 'l' : ''}">${totCell(k)}</td>`).join('')}</tr></tfoot>` : ''}
      </table></div>
      <p class="foot"><b>${t('열 풀이')}</b> ${t('공격P = 득점 + 도움 · 90분당 득점 = 득점 ÷ 출전 시간 × 90 · 득점률 = 득점 ÷ 슈팅 · 자책골은 어느 선수의 득점에도 넣지 않습니다.')}</p>
      </section>`;
  };

  WK.pages.player = function (B, key) {
    const back = `<p class="crumb"><a class="link" href="#/players">${t('선수')}</a>${B.playerByKey[key] ? ` · <a class="link" href="#/compare/${encodeURIComponent('p:' + key)}">${t('다른 선수와 비교')}</a>` : ''}</p>`;
    const pr = WK.profile(B, key);
    if (!pr) return `${back}<div class="card empty">${t('{y}시즌 기록에서 해당 선수를 찾지 못했습니다. 상단에서 시즌을 확인해 주세요.', { y: B.year })}</div>`;
    const p = pr.p, gk = p.position === 'GK', name = U.pname(p.key);
    // 팀 전체 경기 시간(각 경기에서 가장 오래 뛴 선수 기준) 대비 출전 비율
    const teamMin = B.league.filter((m) => (m.home === p.team || m.away === p.team) && m.players).reduce((a, m) => a + Math.max(90, ...m.players[m.home === p.team ? 'home' : 'away'].map((x) => x.minutes)), 0);
    const teamGf = B.T[p.team].gf, fmt = (k, v) => (['conv', 'acc', 'csRate'].includes(k) ? U.pct(v) : U.f2(v));
    const qr = (B.s.qor || []).filter((q) => `${q.team}|${q.name}|${q.number}` === p.key).map((q) => q.round).sort((a, b) => a - b);
    const mv = B.movers.find((m) => m.from.key === p.key || m.to.key === p.key);
    const moved = mv ? `<p class="notice">${mv.to.key === p.key
      ? t('시즌 중 {team}에서 옮겨 왔습니다. 이전 팀 기록은 {link}에 따로 있습니다.', { team: U.tname(mv.from.team), link: `<a class="link" href="${U.pHref(mv.from.key)}">${t('이전 팀 기록')}</a>` })
      : t('시즌 중 이적한 팀: {team}. 옮긴 뒤 기록은 {link}에 따로 있습니다.', { team: U.tname(mv.to.team), link: `<a class="link" href="${U.pHref(mv.to.key)}">${t('옮긴 뒤 기록')}</a>` })}</p>` : '';

    const pc = `<div class="scroll"><table><thead><tr><th class="l">${t('지표')}</th><th>${t('기록')}</th><th class="l" style="width:36%"></th><th>${t('포지션 내 위치')}</th></tr></thead><tbody>${pr.metrics.map((m) => `<tr><td class="l">${t(m.label)}</td><td>${fmt(m.k, m.value)}</td><td class="l">${m.pct == null ? '' : `<span class="rankbar"><span style="width:${Math.max(2, m.pct)}%"></span></span>`}</td><td>${m.pct == null ? t('표본 부족') : t('상위 {n}%', { n: Math.max(1, 100 - m.pct) })}</td></tr>`).join('')}</tbody></table></div>
      <p class="foot">${t('{min}분 이상 출전한 {pos} {n}명과 비교한 위치입니다. 상위 1%에 가까울수록 좋은 기록입니다.', { min: B.qualMin, pos: p.position, n: pr.peers })}${pr.qualified ? '' : ' ' + t('이 선수는 출전 시간이 기준에 못 미쳐 수치가 크게 흔들릴 수 있습니다.')}${gk ? ' ' + t('선방 수 같은 골키퍼 전용 기록은 연맹 공개 자료에 없어, 풀타임으로 뛴 경기의 실점만 집계했습니다.') : ''}</p>`;

    const tot = (k) => p.log.reduce((a, x) => a + x[k], 0);
    // 기본 정보: 연맹 선수단 페이지의 통산 기록, 대표팀 소집 선수는 생년월일(위키백과)
    const ro = ((window.WK_ROSTER || {}).players || {})[p.key], age = (b) => { const d = new Date(b + 'T00:00'), n = new Date(); return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0); };
    const spec = `<dl class="spec"><div><dt>${t('팀')}</dt><dd>${U.tname(p.team)}</dd></div><div><dt>${t('등번호')}</dt><dd>${p.number ?? '–'}</dd></div><div><dt>${t('포지션')}</dt><dd>${U.esc(p.position)}</dd></div>
      <div><dt>${t('생년월일')}</dt><dd>${ro && ro.born ? `${ro.born.replace(/-/g, '.')} <small>${t('만 {n}세', { n: age(ro.born) })}</small>` : `<span class="mut">${t('자료 없음')}</span>`}</dd></div>
      <div><dt>${t('키 · 몸무게')}</dt><dd><span class="mut">${t('자료 없음')}</span></dd></div>
      <div><dt>${t('연맹 통산 기록')}</dt><dd>${ro && ro.totalApps != null ? t('{a}경기 {g}골 {s}도움', { a: ro.totalApps, g: ro.totalGoals ?? '–', s: ro.totalAssists ?? '–' }) : `<span class="mut">${t('자료 없음')}</span>`}</dd></div></dl>
      <p class="foot" style="margin:8px 0 0">${t('통산 기록은 연맹 구단 선수단 페이지에 적힌 값이며, 어느 시즌부터 더한 것인지는 연맹 사이트에 설명이 없습니다. 생년월일은 최근 12개월 대표팀 소집 선수만 영어 위키백과에서 가져왔습니다. 키와 몸무게는 연맹 공개 자료에 없습니다.')}</p>`;
    // 레이더: 같은 포지션 안에서의 위치(백분위). 바깥일수록 좋은 기록이고 점선은 가운데(50)다
    const ax = pr.metrics.filter((m) => m.pct != null), R0 = 104, cx = 210, cy = 150, pt = (i, v) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / ax.length; return [cx + Math.cos(a) * R0 * v, cy + Math.sin(a) * R0 * v]; };
    const radar = ax.length < 3 ? '' : `<svg class="radar" viewBox="0 0 420 300" role="img" aria-label="${t('포지션 내 위치')}">${[0.25, 0.5, 0.75, 1].map((v) => `<circle cx="${cx}" cy="${cy}" r="${R0 * v}" class="${v === 0.5 ? 'mid' : 'ring'}"/>`).join('')}
      ${ax.map((m, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" class="ring"/>`; }).join('')}
      <polygon points="${ax.map((m, i) => pt(i, Math.max(0.04, m.pct / 100)).map((v) => v.toFixed(1)).join(',')).join(' ')}" class="area"/>
      ${ax.map((m, i) => { const [x, y] = pt(i, Math.max(0.04, m.pct / 100)), [lx, ly] = pt(i, 1.16), c = Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / ax.length); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="dotp" data-tip="${U.esc(`${t(m.label)} ${fmt(m.k, m.value)} · ${t('상위 {n}%', { n: Math.max(1, 100 - m.pct) })}`)}"/><text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle'}">${t(m.label)}</text>`; }).join('')}</svg>`;
    const cnt = [['득점', p.goals], ['도움', p.assists], ['슈팅', p.shots], ['유효슈팅', p.sot], ['유효가 아닌 슈팅', p.shots - p.sot], ['파울', p.fouls], ['경고', p.yellows], ['퇴장', p.reds]], cmax = Math.max(...cnt.map((x) => x[1]), 1);
    const viz = `<div class="pviz">${radar ? `<div>${radar}<p class="foot" style="margin:0;text-align:center">${t('바깥쪽일수록 같은 포지션에서 좋은 기록입니다. 점선은 한가운데(상위 50%)입니다.')}</p></div>` : ''}
      <div><div class="cbars">${cnt.map(([k, v]) => `<span>${t(k)}</span><div class="trk"><div class="bar" style="width:${(v / cmax) * 100}%"></div></div><b>${v}</b>`).join('')}</div>
      <p class="foot" style="margin:12px 0 0">${t('총 출전 시간 {m}분 · 경기당 평균 {a}분', { m: p.minutes, a: Math.round(p.minutes / p.apps) })}</p></div></div>`;
    const logRows = [...p.log].reverse().map((x) => `<tr class="click" data-href="#/match/${x.m.id}"><td class="l">${x.m.round}</td><td class="l">${U.day(x.m)}</td><td class="l">${x.home ? t('홈') : t('원정')} · <span class="name">${U.tname(x.opp)}</span></td><td class="l"><span class="res ${x.x}">${U.res(x.x)}</span> ${x.gf}:${x.ga}</td><td class="l">${x.starter ? t('선발') : t('교체')}</td><td>${x.minutes}</td><td>${x.goals}</td><td>${x.assists}</td><td>${x.shots}</td><td>${x.shotsOnTarget}</td><td>${x.fouls}</td><td>${x.yellows}</td><td>${x.reds}</td></tr>`).join('');

    return `${back}<div class="phead">${U.photo(p, 88)}<div><h1>${name} <span class="no" style="font-size:18px;width:auto">#${p.number ?? ''}</span></h1>
        <p class="lead" style="margin:0">${U.team(B, p.team)} · ${U.esc(p.position)} · ${t('{y}시즌', { y: B.year })}${WK.lang === 'ko' || name === U.esc(p.name) ? '' : ` · ${U.esc(p.name)}`}${qr.length ? ` · <a class="link" href="#/qor" data-tip="${qr.map((r) => r + 'R').join(', ')}">${t('라운드 QOR {n}회', { n: qr.length })}</a>` : ''}</p></div></div>
      <section class="card"><div class="head"><h2>${t('시즌 요약')}</h2>${U.src()}</div><div class="tiles">
        ${U.tile(t('출전'), t('{n}경기', { n: p.apps }), t('선발 {a} · 교체 {b}', { a: p.starts, b: p.apps - p.starts }))}
        ${U.tile(t('출전 시간'), t('{n}분', { n: p.minutes }), t('팀 전체 경기 시간의 {p}', { p: U.pct(teamMin ? p.minutes / teamMin : NaN) }))}
        ${gk ? U.tile(t('무실점 경기'), p.cleanSheets, t('풀타임 {n}경기 중', { n: p.fullGames })) + U.tile(t('경기당 실점'), U.f2(p.ga90), t('풀타임 경기 기준'))
          : U.tile(t('득점 / 도움'), `${p.goals} / ${p.assists}`, t('팀 득점 {g}골 중 {p}에 관여', { g: teamGf, p: U.pct(teamGf ? p.points / teamGf : NaN) })) + U.tile(t('슈팅 / 유효슈팅'), `${p.shots} / ${p.sot}`, t('득점률 {p}', { p: U.pct(p.conv) }))}
      </div>${moved}</section>
      ${U.card(t('선수 정보'), '', spec, U.src(t('한국여자축구연맹(KWFF), 영어 위키백과')))}
      ${U.card(t('기록 한눈에 보기'), t('왼쪽은 같은 포지션 선수들과 견준 위치, 오른쪽은 이번 시즌 합계입니다.'), viz)}
      ${U.card(t('포지션 내 위치'), t('같은 포지션 선수들 사이에서 이 선수의 기록이 어느 정도인지 보여 줍니다.'), pc)}
      ${pr.similar.length ? U.card(t('기록이 비슷한 선수'), t('90분당 득점·도움·슈팅·유효슈팅·파울이 가까운 같은 포지션 선수입니다.'), `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('선수')}</th><th class="l">${t('팀')}</th><th>${t('분')}</th><th>${t('90분당 득점')}</th><th>${t('90분당 도움')}</th><th>${t('90분당 슈팅')}</th></tr></thead><tbody>${pr.similar.map(({ q }) => `<tr class="click" data-href="${U.pHref(q.key)}"><td class="l"><span class="pl">${U.photo(q, 28)}<a href="${U.pHref(q.key)}" class="name">${U.pname(q.key)}</a></span></td><td class="l">${U.team(B, q.team)}</td><td>${q.minutes}</td><td>${U.f2(q.g90)}</td><td>${U.f2(q.a90)}</td><td>${U.f2(q.s90)}</td></tr>`).join('')}</tbody></table></div>`) : ''}
      ${U.card(t('경기별 기록'), t('최근 경기부터 보여 줍니다. 누르면 경기 기록으로 이동합니다.'), `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('라운드')}</th><th class="l">${t('날짜')}</th><th class="l">${t('상대')}</th><th class="l">${t('결과')}</th><th class="l">${t('선발')}</th><th>${t('분')}</th><th>${t('득점')}</th><th>${t('도움')}</th><th>${t('슈팅')}</th><th>${t('유효')}</th><th>${t('파울')}</th><th>${t('경고')}</th><th>${t('퇴장')}</th></tr></thead>
        <tbody>${logRows}</tbody><tfoot><tr><td class="l" colspan="5">${t('합계 ({n}경기)', { n: p.log.length })}</td><td>${tot('minutes')}</td><td>${tot('goals')}</td><td>${tot('assists')}</td><td>${tot('shots')}</td><td>${tot('shotsOnTarget')}</td><td>${tot('fouls')}</td><td>${tot('yellows')}</td><td>${tot('reds')}</td></tr></tfoot></table></div>${p.official && tot('minutes') !== p.minutes ? `<p class="foot">${t('합계는 경기별 기록을 더한 값이라 위의 연맹 집계와 몇 분 다를 수 있습니다.')}</p>` : ''}`)}`;
  };
})();
