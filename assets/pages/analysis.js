// 팀 분석: 팀을 고르고 라운드 구간과 홈·원정을 정해 항목별 기록을 막대로 본다
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  // [키, 이름, 분모(n: 치른 경기, s: 세부 기록이 있는 경기, 없으면 비율), 방향(+1 클수록 좋음, -1 작을수록 좋음, 0 우열 없음)]
  const GROUPS = [
    ['공격', [['gf', '득점', 'n', 1], ['as', '도움', 'p', 1], ['sh', '슈팅', 's', 1], ['sot', '유효슈팅', 's', 1], ['off', '유효가 아닌 슈팅', 's', 0], ['conv', '슈팅 대비 득점률', null, 1], ['acc', '유효슈팅 비율', null, 1], ['cor', '코너킥', 's', 1], ['ofs', '오프사이드', 's', 0]]],
    ['수비', [['ga', '실점', 'n', -1], ['cs', '무실점 경기', 'n', 1], ['sha', '허용 슈팅', 's', -1], ['sota', '허용 유효슈팅', 's', -1], ['save', '허용 유효슈팅 대비 실점률', null, -1], ['corA', '허용 코너킥', 's', -1], ['ofsA', '상대 오프사이드', 's', 0]]],
    ['점유·규율', [['poss', '평균 점유율', null, 0], ['fouls', '파울', 's', -1], ['fouled', '상대 파울', 's', 0], ['y', '경고', 's', -1], ['r', '퇴장', 's', -1]]],
  ];
  const RATE = { conv: (a) => a.gfS / a.sh, acc: (a) => a.sot / a.sh, save: (a) => a.gaS / a.sota, poss: (a) => a.poss / a.pn / 100 };

  function agg(B, team, from, to, ha) {
    const a = { n: 0, s: 0, p: 0, pn: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, as: 0, cs: 0, sh: 0, sot: 0, off: 0, cor: 0, ofs: 0, sha: 0, sota: 0, corA: 0, ofsA: 0, fouls: 0, fouled: 0, y: 0, r: 0, gfS: 0, gaS: 0, poss: 0 };
    for (const m of B.league) {
      const home = m.home === team; if ((!home && m.away !== team) || m.r < from || m.r > to || (ha === 'home' && !home) || (ha === 'away' && home)) continue;
      const me = home ? 'home' : 'away', op = home ? 'away' : 'home', gf = m[me + 'Score'], ga = m[op + 'Score'], st = m.stats || {};
      a.n++; a.gf += gf; a.ga += ga; if (!ga) a.cs++; a[gf > ga ? 'w' : gf < ga ? 'l' : 'd']++;
      if (m.players && m.players[me]) { a.p++; a.as += m.players[me].reduce((x, p) => x + (p.assists || 0), 0); }
      if (st.shots && st.shots.home + st.shots.away > 0) {
        const v = (k, side) => (st[k] ? st[k][side] || 0 : 0);
        a.s++; a.gfS += gf; a.gaS += ga; a.sh += v('shots', me); a.sot += v('shotsOnTarget', me); a.sha += v('shots', op); a.sota += v('shotsOnTarget', op);
        a.cor += v('corners', me); a.corA += v('corners', op); a.ofs += v('offsides', me); a.ofsA += v('offsides', op); a.fouls += v('fouls', me); a.fouled += v('fouls', op); a.y += v('yellows', me); a.r += v('reds', me);
        if (st.possession && st.possession.home + st.possession.away > 0) { a.pn++; a.poss += st.possession[me]; }
      }
    }
    a.off = a.sh - a.sot;
    return a;
  }
  // 한 항목의 값: 합계, 경기당(또는 비율)
  const val = (a, [k, , den]) => (den ? { total: a[k], per: a[den] ? a[k] / a[den] : NaN } : { total: null, per: RATE[k](a) });

  WK.pages.analysis = function (B, arg) {
    if (arg && B.rank[arg]) { S.anTeam = arg; history.replaceState(null, '', '#/analysis'); }
    if (!B.rank[S.anTeam]) { let saved = ''; try { saved = localStorage.getItem('wk-team') || ''; } catch (e) { /* 저장이 막힌 환경 */ } S.anTeam = B.rank[saved] ? saved : B.table[0].team; }
    const team = S.anTeam, maxR = B.totalR, ha = ['home', 'away'].includes(S.anHA) ? S.anHA : 'all';
    let from = Math.min(maxR, Math.max(1, +S.anFrom || 1)), to = Math.min(maxR, Math.max(1, +S.anTo || maxR)); if (from > to) [from, to] = [to, from];
    const A = Object.fromEntries(B.teams.map((tm) => [tm, agg(B, tm, from, to, ha)])), me = A[team];
    const chips = Array.from({ length: maxR }, (_, i) => i + 1).map((r) => {
      const m = B.all.find((x) => x.r === r && (x.home === team || x.away === team)), home = m && m.home === team;
      const x = !m ? 'none' : !m.finished ? 'soon' : (ha === 'home' && !home) || (ha === 'away' && home) ? 'skip' : (() => { const gf = m[home ? 'homeScore' : 'awayScore'], ga = m[home ? 'awayScore' : 'homeScore']; return gf > ga ? 'W' : gf < ga ? 'L' : 'D'; })();
      const tip = m ? `${m.round} · ${home ? t('홈') : t('원정')} · ${U.tname(home ? m.away : m.home)}${m.finished ? ` ${m[home ? 'homeScore' : 'awayScore']}:${m[home ? 'awayScore' : 'homeScore']}` : ''}` : '';
      return `<button class="rchip ${x}${r < from || r > to ? ' out' : ''}${S.anPick === r ? ' pick' : ''}" data-round="${r}" ${tip ? `data-tip="${U.esc(tip)}"` : ''} aria-label="${t('{r}라운드', { r })}">${r}</button>`;
    }).join('');
    const fmt = (m, v) => (!Number.isFinite(v) ? '–' : m[2] ? U.f2(v) : U.pct(v));
    const group = ([title, list]) => {
      const rows = list.map((m) => {
        const v = val(me, m), all = B.teams.map((tm) => ({ tm, v: val(A[tm], m).per })).filter((x) => Number.isFinite(x.v));
        const max = Math.max(...all.map((x) => x.v), 0) || 1, avg = all.length ? all.reduce((s, x) => s + x.v, 0) / all.length : NaN, dir = m[3];
        const rank = !Number.isFinite(v.per) ? null : all.filter((x) => (dir < 0 ? x.v < v.per : x.v > v.per)).length + 1;
        return `<div class="lab">${t(m[1])}</div><div class="trk"><div class="bar" style="width:${Number.isFinite(v.per) ? (v.per / max) * 100 : 0}%"></div>${Number.isFinite(avg) ? `<i style="left:${(avg / max) * 100}%" data-tip="${U.esc(t('리그 평균 {v}', { v: fmt(m, avg) }))}"></i>` : ''}</div>
          <div class="tot">${v.total == null ? fmt(m, v.per) : v.total}</div><div class="per">${v.total == null ? '' : fmt(m, v.per)}</div><div class="rk${rank === 1 && dir ? ' top' : ''}">${rank ? t('{n}위', { n: rank }) : '–'}</div>`;
      }).join('');
      return U.card(t(title), '', `<div class="anl"><div class="hd"></div><div class="hd"></div><div class="hd">${t('합계')}</div><div class="hd">${t('경기당')}</div><div class="hd">${t('순위')}</div>${rows}</div>`);
    };
    const seg = (k, cur, items) => `<div class="seg" role="group">${items.map(([v, l]) => `<button data-set="${k}:${v}" aria-pressed="${cur === v}">${t(l)}</button>`).join('')}</div>`;
    return `<h1>${t('팀 분석')}</h1><p class="lead">${t('{y} WK리그 정규리그 · 팀을 고르고 라운드 구간과 홈·원정을 정해 항목별 기록을 봅니다.', { y: B.year })}</p>
      <div class="tpick">${B.table.map((r) => `<button data-set="anTeam:${U.esc(r.team)}" class="${r.team === team ? 'on' : ''}" aria-pressed="${r.team === team}">${U.logo(r.team, 34)}<span>${U.tname(r.team)}</span></button>`).join('')}</div>
      <section class="card" style="margin-top:12px"><div class="bar" style="justify-content:space-between"><div class="bar"><b>${t('{a}~{b}라운드', { a: from, b: to })}</b>${seg('anHA', ha, [['all', '전체'], ['home', '홈'], ['away', '원정']])}</div><button class="btn" data-an-reset>${t('전체 라운드로')}</button></div>
        <div class="rchips">${chips}</div>
        <p class="foot" style="margin:10px 0 0"><span class="rkey W"></span>${t('승')} <span class="rkey D"></span>${t('무')} <span class="rkey L"></span>${t('패')} <span class="rkey soon"></span>${t('예정')} · ${t('라운드 숫자를 한 번 누르면 시작, 한 번 더 누르면 끝 라운드가 정해집니다.')}</p></section>
      <div class="tiles" style="margin-top:16px">${U.tile(t('경기'), me.n, t('{w}승 {d}무 {l}패', me))}${U.tile(t('득점 · 실점'), `${me.gf} · ${me.ga}`, t('득실') + ' ' + U.sgn(me.gf - me.ga))}${U.tile(t('평균 점유율'), me.pn ? U.pct(me.poss / me.pn / 100) : '–', me.pn ? t('{n}경기 기준', { n: me.pn }) : '')}${U.tile(t('리그 순위'), t('{n}위', { n: B.table.findIndex((r) => r.team === team) + 1 }), t('시즌 전체 기준'))}</div>
      ${me.n ? `<div class="three" style="margin-top:16px">${GROUPS.map(group).join('')}</div>` : `<div class="card" style="margin-top:16px"><p class="notice" style="margin:0">${t('고른 구간에 치른 경기가 없습니다.')}</p></div>`}
      <p class="foot">${t('막대 길이는 경기당 기록(비율 항목은 비율)을 같은 조건에서 리그의 가장 높은 팀과 견준 것이고, 세로 선은 리그 평균입니다. 순위도 같은 구간·같은 홈·원정 조건에서 경기당 기록으로 매깁니다. 실점·허용 슈팅·파울·경고처럼 적을수록 좋은 항목은 적은 팀이 1위입니다.')}<br>${t('패스, 태클, 경합, 가로채기 같은 기록은 연맹 공개 자료에 없어 넣지 못했습니다. 슈팅·코너킥·파울 등은 세부 기록이 있는 경기만 더했습니다.')}</p>`;
  };

  // 라운드 숫자를 눌러 구간 정하기, 전체 라운드로 되돌리기
  document.addEventListener('click', (e) => {
    const c = e.target.closest('.rchip');
    if (c) { const r = +c.dataset.round; if (S.anPick) { S.anFrom = Math.min(S.anPick, r); S.anTo = Math.max(S.anPick, r); S.anPick = 0; } else { S.anPick = r; S.anFrom = S.anTo = r; } return WK.rerender(); }
    if (e.target.closest('[data-an-reset]')) { S.anFrom = S.anTo = S.anPick = 0; WK.rerender(); }
  });
})();
