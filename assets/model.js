// 수집한 경기 데이터에서 순위·팀·선수 지표와 예측을 계산한다
(function () {
  const D = window.WK_DATA || { seasons: {} };
  const H = window.WK_HISTORY || { seasons: {}, clubs: {} };
  const WK = (window.WK = { D, H });

  const isLeague = (m) => /^\d+R$/.test(m.round);
  const res = (gf, ga) => (gf > ga ? 'W' : gf < ga ? 'L' : 'D');
  WK.seasons = Object.keys(D.seasons).sort().reverse();
  WK.BUCKETS = ['1–15', '16–30', '31–45', '46–60', '61–75', '76–90+'];
  const bIdx = (min) => (min <= 15 ? 0 : min <= 30 ? 1 : min <= 45 ? 2 : min <= 60 ? 3 : min <= 75 ? 4 : 5);

  WK.standings = function (matches, teams, mode) {
    const row = Object.fromEntries(teams.map((t) => [t, { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));
    const add = (t, gf, ga, m) => {
      const r = row[t]; if (!r) return;
      r.p++; r.gf += gf; r.ga += ga;
      const x = res(gf, ga);
      if (x === 'W') { r.w++; r.pts += 3; } else if (x === 'D') { r.d++; r.pts += 1; } else r.l++;
      r.form.push({ x, m });
    };
    for (const m of matches) {
      if (mode !== 'away') add(m.home, m.homeScore, m.awayScore, m);
      if (mode !== 'home') add(m.away, m.awayScore, m.homeScore, m);
    }
    return Object.values(row)
      .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.team.localeCompare(b.team, 'ko'))
      .map((r, i) => ({ ...r, rank: i + 1, gd: r.gf - r.ga }));
  };

  const cache = {};
  // 열어 둔 화면에서 새 data.js 를 읽었을 때 기록을 바꿔 끼운다
  WK.reload = function (next) {
    for (const k of Object.keys(D)) delete D[k];
    Object.assign(D, next);
    for (const k of Object.keys(cache)) delete cache[k];
    WK.seasons = Object.keys(D.seasons).sort().reverse();
  };
  WK.season = function (y) {
    if (cache[y]) return cache[y];
    const s = D.seasons[y];
    const byDate = (a, b) => a.datetime.localeCompare(b.datetime) || a.id - b.id;
    const all = s.matches.filter(isLeague).map((m) => ({ ...m, r: parseInt(m.round, 10) })).sort(byDate);
    const teams = [...new Set(all.flatMap((m) => [m.home, m.away]))].sort((a, b) => a.localeCompare(b, 'ko'));
    const league = all.filter((m) => m.finished);
    const upcoming = all.filter((m) => !m.finished);
    const post = s.matches.filter((m) => !isLeague(m)).sort(byDate);
    const color = Object.fromEntries(teams.map((t, i) => [t, `var(--s${(i % 8) + 1})`]));
    const byId = Object.fromEntries([...all, ...post].map((m) => [m.id, m]));
    const table = WK.standings(league, teams, 'all');
    const rank = Object.fromEntries(table.map((r) => [r.team, r]));

    const maxR = league.reduce((a, m) => Math.max(a, m.r), 0);
    const totalR = all.reduce((a, m) => Math.max(a, m.r), 0);
    const history = [];
    for (let r = 1; r <= maxR; r++) history.push(WK.standings(league.filter((m) => m.r <= r), teams, 'all'));

    const T = Object.fromEntries(teams.map((t) => [t, { g: 0, gf: 0, ga: 0, sg: 0, sh: 0, sot: 0, sha: 0, sota: 0, gfS: 0, gaS: 0, fouls: 0, yellows: 0, corners: 0, cs: 0, fts: 0 }]));
    const timing = Object.fromEntries(teams.map((t) => [t, { f: [0, 0, 0, 0, 0, 0], a: [0, 0, 0, 0, 0, 0] }]));
    const P = {};
    for (const m of league) {
      for (const side of ['home', 'away']) {
        const o = side === 'home' ? 'away' : 'home';
        const me = m[side], opp = m[o], t = T[me];
        const gf = m[side + 'Score'], ga = m[o + 'Score'];
        t.g++; t.gf += gf; t.ga += ga; if (!ga) t.cs++; if (!gf) t.fts++;
        const st = m.stats || {};
        if (st.shots && st.shots.home + st.shots.away > 0) {
          t.sg++; t.sh += st.shots[side]; t.sha += st.shots[o]; t.gfS += gf; t.gaS += ga;
          if (st.shotsOnTarget) { t.sot += st.shotsOnTarget[side]; t.sota += st.shotsOnTarget[o]; }
          if (st.fouls) t.fouls += st.fouls[side];
          if (st.yellows) t.yellows += st.yellows[side];
          if (st.corners) t.corners += st.corners[side];
        }
        for (const g of (m.goals && m.goals[side]) || []) if (g.minute != null) { timing[me].f[bIdx(g.minute)]++; timing[opp].a[bIdx(g.minute)]++; }
        const list = (m.players && m.players[side]) || [];
        const full = Math.max(90, ...list.map((p) => p.minutes));
        for (const p of list) {
          const key = `${me}|${p.name}|${p.number}`;
          const a = (P[key] ||= { key, name: p.name, team: me, number: p.number, position: p.position, photo: p.photo || null, squad: 0, apps: 0, starts: 0, minutes: 0, goals: 0, assists: 0, shots: 0, sot: 0, fouls: 0, yellows: 0, reds: 0, fullGames: 0, conceded: 0, cleanSheets: 0, log: [] });
          a.squad++; // 0분 경기도 포함한 명단 포함 횟수 (연맹 사이트의 경기 수와 같은 기준)
          if (!p.minutes) continue;
          a.apps++; if (p.starter) a.starts++;
          a.minutes += p.minutes; a.goals += p.goals; a.assists += p.assists; a.shots += p.shots; a.sot += p.shotsOnTarget;
          a.fouls += p.fouls; a.yellows += p.yellows; a.reds += p.reds;
          if (p.minutes >= full) { a.fullGames++; a.conceded += ga; if (!ga) a.cleanSheets++; }
          a.log.push({ m, r: m.r, opp, home: side === 'home', gf, ga, x: res(gf, ga), ...p });
        }
      }
    }
    // 연맹 선수 순위에 나온 선수는 연맹이 집계한 숫자를 그대로 쓴다. 출전은 연맹과 같은 기준(명단에 든 경기)으로 센다.
    const alias = {};
    for (const a of Object.values(P)) a.played = a.apps; // 실제로 뛴 경기 수
    for (const [k, o] of Object.entries(s.playerOfficial || {})) {
      const a = P[k];
      if (!a) continue;
      // 시즌 중 팀을 옮긴 선수: 연맹은 지금 팀 한 줄로 합쳐 보여 주므로 같이 합친다 (명단 포함 횟수 합이 연맹 출전과 맞을 때만)
      const others = Object.values(P).filter((x) => x !== a && x.name === a.name && x.team !== a.team);
      if (others.length && others.reduce((n, x) => n + x.squad, a.squad) === o.apps) {
        for (const x of others) { a.squad += x.squad; a.played += x.played; a.starts += x.starts; a.fullGames += x.fullGames; a.conceded += x.conceded; a.cleanSheets += x.cleanSheets; a.log.push(...x.log); alias[x.key] = a.key; delete P[x.key]; }
        a.log.sort((p, q) => p.m.datetime.localeCompare(q.m.datetime));
      }
      Object.assign(a, { minutes: o.minutes, goals: o.goals, assists: o.assists, shots: o.shots, sot: o.sot, fouls: o.fouls, yellows: o.yellows, reds: o.reds, official: true });
    }
    for (const a of Object.values(P)) a.apps = a.squad;
    const per90 = (v, min) => (min ? (v / min) * 90 : NaN);
    const players = Object.values(P).filter((p) => p.played > 0).map((p) => ({
      ...p, points: p.goals + p.assists,
      g90: per90(p.goals, p.minutes), a90: per90(p.assists, p.minutes), pt90: per90(p.goals + p.assists, p.minutes),
      s90: per90(p.shots, p.minutes), sot90: per90(p.sot, p.minutes), f90: per90(p.fouls, p.minutes),
      conv: p.shots ? p.goals / p.shots : NaN, acc: p.shots ? p.sot / p.shots : NaN,
      ga90: p.fullGames ? p.conceded / p.fullGames : NaN, csRate: p.fullGames ? p.cleanSheets / p.fullGames : NaN,
    }));
    const playerByKey = Object.fromEntries(players.map((p) => [p.key, p]));
    for (const [from, to] of Object.entries(alias)) if (playerByKey[to]) playerByKey[from] = playerByKey[to];
    const maxMin = players.reduce((a, p) => Math.max(a, p.minutes), 0);
    const qualMin = Math.min(450, Math.round(maxMin * 0.3));

    // 연속 기록: 팀별 최장 연승·무패, 현재 흐름
    const streaks = {};
    for (const t of teams) {
      const f = rank[t].form.map((x) => x.x);
      let w = 0, u = 0, bw = 0, bu = 0;
      for (const x of f) { w = x === 'W' ? w + 1 : 0; u = x !== 'L' ? u + 1 : 0; bw = Math.max(bw, w); bu = Math.max(bu, u); }
      streaks[t] = { bestWin: bw, bestUnbeaten: bu, curWin: w, curUnbeaten: u };
    }

    // 정규리그 1위 확정: 다른 모든 팀이 남은 경기를 다 이겨도 1위 승점에 못 미치는 경우 (동률 가능성이 있으면 미확정)
    const left = (tm) => upcoming.filter((m) => m.home === tm || m.away === tm).length;
    const lead = table[0];
    const clinched = lead && league.length > 0 && table.slice(1).every((r) => r.pts + 3 * left(r.team) < lead.pts) ? lead.team : null;
    // 같은 이름으로 두 팀에서 뛰었고 기간이 겹치지 않으면 시즌 중 이적으로 본다 (기간이 겹치면 동명이인)
    const byName = {};
    for (const p of players) (byName[p.name] ||= []).push(p);
    const movers = [];
    for (const list of Object.values(byName)) {
      if (list.length !== 2 || list[0].team === list[1].team) continue;
      const [a, b] = [...list].sort((x, z) => x.log[0].m.datetime.localeCompare(z.log[0].m.datetime));
      if (a.log[a.log.length - 1].m.datetime < b.log[0].m.datetime) movers.push({ from: a, to: b, last: a.log[a.log.length - 1].m.datetime.slice(0, 10), first: b.log[0].m.datetime.slice(0, 10) });
    }

    return (cache[y] = { year: y, clinched, movers, s, all, teams, league, upcoming, post, color, byId, table, rank, maxR, totalR, history, T, timing, players, playerByKey, qualMin, streaks, hasDetail: players.length > 0 });
  };

  // ---------- 예측: 팀별 기대 득점·실점(포아송 모형) + 남은 일정 모의실험 ----------
  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pois = (lam, k) => { let p = Math.exp(-lam); for (let i = 1; i <= k; i++) p *= lam / i; return p; };
  const K = 6;        // 이 경기 수만큼 리그 평균 쪽으로 당겨 소표본 과신을 줄인다
  const H2H = 0.1;    // 상대 전적 보정 강도 (맞대결 경기당 득실차 1골에 예상 득점 ±10%, 경기 수가 적으면 더 약하게)

  // 주어진 경기들로 모형을 만든다. 돌려주는 함수에 홈·원정 팀을 넣으면 예상 득점과 승·무·패 확률이 나온다.
  WK.fit = function (matches, teams, useH2H) {
    const n = matches.length;
    const muH = matches.reduce((a, m) => a + m.homeScore, 0) / n, muA = matches.reduce((a, m) => a + m.awayScore, 0) / n, avg = (muH + muA) / 2;
    const T = Object.fromEntries(teams.map((t) => [t, { g: 0, gf: 0, ga: 0 }])), pair = {};
    for (const m of matches) {
      T[m.home].g++; T[m.home].gf += m.homeScore; T[m.home].ga += m.awayScore;
      T[m.away].g++; T[m.away].gf += m.awayScore; T[m.away].ga += m.homeScore;
      const k = [m.home, m.away].sort().join('|'), d = (m.homeScore - m.awayScore) * (m.home < m.away ? 1 : -1); // 가나다순으로 앞선 팀 기준 득실차
      (pair[k] ||= { n: 0, d: 0 }); pair[k].n++; pair[k].d += d;
    }
    const att = {}, def = {};
    for (const t of teams) { att[t] = (T[t].gf + K * avg) / (T[t].g + K) / avg; def[t] = (T[t].ga + K * avg) / (T[t].g + K) / avg; }
    const predict = (home, away) => {
      let lh = muH * att[home] * def[away], la = muA * att[away] * def[home];
      const pr = useH2H && pair[[home, away].sort().join('|')];
      if (pr) {
        const edge = (pr.d / pr.n) * (home < away ? 1 : -1) * (pr.n / (pr.n + 4)); // 홈 팀 기준, 경기 수로 줄인 값
        const f = Math.max(-0.3, Math.min(0.3, H2H * edge));
        lh *= 1 + f; la *= 1 - f;
      }
      let pH = 0, pD = 0, pA = 0;
      for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) { const p = pois(lh, i) * pois(la, j); if (i > j) pH += p; else if (i === j) pD += p; else pA += p; }
      const z = pH + pD + pA;
      return { lh, la, pH: pH / z, pD: pD / z, pA: pA / z };
    };
    return { predict, att, def, muH, muA, avg };
  };

  // 검증: 각 경기를 그 이전 경기만으로 예측해 보고 실제 결과와 비교한다
  WK.backtest = function (B) {
    if (B._bt !== undefined) return B._bt;
    const L = B.league, start = B.teams.length * 3; // 팀당 평균 6경기쯤 쌓인 뒤부터
    if (L.length < start + 20) return (B._bt = null);
    const out = { n: 0, base: 0, plain: 0, h2h: 0, bPlain: 0, bH2h: 0, bUniform: 0 };
    const brier = (p, r) => (p.pH - (r === 'H')) ** 2 + (p.pD - (r === 'D')) ** 2 + (p.pA - (r === 'A')) ** 2;
    const pick = (p) => (p.pH >= p.pD && p.pH >= p.pA ? 'H' : p.pA >= p.pD ? 'A' : 'D');
    for (let i = start; i < L.length; i++) {
      const m = L[i], past = L.slice(0, i), r = m.homeScore > m.awayScore ? 'H' : m.homeScore < m.awayScore ? 'A' : 'D';
      const table = WK.standings(past, B.teams, 'all'), rank = Object.fromEntries(table.map((x) => [x.team, x.rank]));
      const a = WK.fit(past, B.teams, false).predict(m.home, m.away), b = WK.fit(past, B.teams, true).predict(m.home, m.away);
      out.n++;
      if ((rank[m.home] < rank[m.away] ? 'H' : 'A') === r) out.base++; // 단순 기준: 순위가 높은 팀이 이긴다고 찍기
      if (pick(a) === r) out.plain++;
      if (pick(b) === r) out.h2h++;
      out.bPlain += brier(a, r); out.bH2h += brier(b, r); out.bUniform += brier({ pH: 1 / 3, pD: 1 / 3, pA: 1 / 3 }, r);
    }
    for (const k of ['bPlain', 'bH2h', 'bUniform']) out[k] /= out.n;
    return (B._bt = out);
  };

  WK.predict = function (B) {
    if (B._pred !== undefined) return B._pred;
    if (!B.upcoming.length || B.league.length < B.teams.length * 2) return (B._pred = null);
    // 상대 전적 보정은 검증에서 오차를 줄일 때만 쓴다
    const bt = WK.backtest(B), useH2H = !!bt && bt.bH2h < bt.bPlain;
    const M = WK.fit(B.league, B.teams, useH2H);
    const fixtures = B.upcoming.map((m) => ({ m, ...M.predict(m.home, m.away) }));
    const N = 20000, rand = rng(20260101), idx = Object.fromEntries(B.teams.map((t, i) => [t, i])), nT = B.teams.length;
    const base = B.teams.map((t) => ({ pts: B.rank[t].pts, gd: B.rank[t].gd, gf: B.rank[t].gf }));
    const rankCount = B.teams.map(() => new Array(nT).fill(0)), ptsSum = new Array(nT).fill(0);
    const sample = (lam) => { const L = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= rand(); } while (p > L); return k - 1; };
    for (let s = 0; s < N; s++) {
      const st = base.map((b, i) => ({ i, pts: b.pts, gd: b.gd, gf: b.gf, tie: rand() }));
      for (const f of fixtures) {
        const h = st[idx[f.m.home]], a = st[idx[f.m.away]], gh = sample(f.lh), ga = sample(f.la);
        h.gf += gh; a.gf += ga; h.gd += gh - ga; a.gd += ga - gh;
        if (gh > ga) h.pts += 3; else if (gh < ga) a.pts += 3; else { h.pts++; a.pts++; }
      }
      [...st].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.tie - b.tie).forEach((x, r) => { rankCount[x.i][r]++; });
      st.forEach((x) => { ptsSum[x.i] += x.pts; });
    }
    const teams = {};
    B.teams.forEach((t, i) => {
      const rp = rankCount[i].map((c) => c / N);
      teams[t] = { rankP: rp, title: rp[0], top3: rp[0] + rp[1] + rp[2], expPts: ptsSum[i] / N, att: M.att[t], def: M.def[t], xgf: M.avg * M.att[t], xga: M.avg * M.def[t], left: fixtures.filter((f) => f.m.home === t || f.m.away === t).length };
    });
    return (B._pred = { fixtures, teams, N, muH: M.muH, muA: M.muA, avg: M.avg, useH2H, bt, byMatch: Object.fromEntries(fixtures.map((f) => [f.m.id, f])) });
  };

  // ---------- 선수 프로필: 같은 포지션 안에서의 백분위와 비슷한 선수 ----------
  const FIELD = [['g90', '90분당 득점'], ['a90', '90분당 도움'], ['pt90', '90분당 공격P'], ['s90', '90분당 슈팅'], ['sot90', '90분당 유효슈팅'], ['conv', '슈팅 대비 득점률'], ['acc', '유효슈팅 비율']];
  const GK = [['ga90', '경기당 실점 (풀타임)', true], ['csRate', '무실점 경기 비율']];
  WK.profile = function (B, key) {
    const p = B.playerByKey[key]; if (!p) return null;
    const peers = B.players.filter((q) => q.position === p.position && q.minutes >= B.qualMin);
    const defs = p.position === 'GK' ? GK : FIELD;
    const metrics = defs.map(([k, label, lowerBetter]) => {
      const vals = peers.map((q) => q[k]).filter(Number.isFinite);
      const v = p[k];
      if (!Number.isFinite(v) || vals.length < 4) return { k, label, value: v, pct: null };
      const below = vals.filter((x) => (lowerBetter ? x > v : x < v)).length, same = vals.filter((x) => x === v).length;
      return { k, label, value: v, pct: Math.round(((below + same / 2) / vals.length) * 100), lowerBetter };
    });
    let similar = [];
    if (p.position !== 'GK' && p.minutes >= B.qualMin) {
      const keys = ['g90', 'a90', 's90', 'sot90', 'f90'];
      const stat = keys.map((k) => { const v = peers.map((q) => q[k]); const mu = v.reduce((a, b) => a + b, 0) / v.length; const sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / v.length) || 1; return { mu, sd }; });
      const z = (q) => keys.map((k, i) => (q[k] - stat[i].mu) / stat[i].sd);
      const me = z(p);
      similar = peers.filter((q) => q.key !== key).map((q) => ({ q, d: Math.sqrt(z(q).reduce((a, v, i) => a + (v - me[i]) ** 2, 0)) })).sort((a, b) => a.d - b.d).slice(0, 5);
    }
    return { p, peers: peers.length, qualified: p.minutes >= B.qualMin, metrics, similar };
  };

  // ---------- 자동 발견: 데이터에서 눈에 띄는 사실을 골라 문장으로 만든다 ----------
  WK.insights = function (B) {
    const out = [], L = B.league, n = L.length;
    if (!n) return out;
    const f2 = (x) => x.toFixed(2), pc = (x) => Math.round(x * 100) + '%';
    const [a, b] = B.table;
    if (B.upcoming.length) out.push({ k: '선두 경쟁', v: `${a.pts - b.pts}점 차`, t: `${a.team}(${a.pts}점)이 ${b.team}(${b.pts}점)에 앞서 있습니다. 리그 전체 남은 경기는 ${B.upcoming.length}경기입니다.`, href: '#/predict' });
    else out.push({ k: '정규리그 1위', v: `${a.pts}점`, t: `${a.team}이 ${a.w}승 ${a.d}무 ${a.l}패로 정규리그를 1위로 마쳤습니다. 2위 ${b.team}과는 ${a.pts - b.pts}점 차입니다.`, href: `#/team/${encodeURIComponent(a.team)}` });

    const hw = L.filter((m) => m.homeScore > m.awayScore).length, aw = L.filter((m) => m.homeScore < m.awayScore).length;
    out.push(aw > hw
      ? { k: '홈 이점이 없는 시즌', v: `원정 ${aw}승`, t: `원정팀 승리(${aw})가 홈팀 승리(${hw})보다 많습니다. 홈 승률은 ${pc(hw / n)}에 그칩니다.`, href: '#/matches' }
      : { k: '홈 이점', v: pc(hw / n), t: `홈팀이 ${hw}승, 원정팀이 ${aw}승을 거뒀습니다. 무승부는 ${n - hw - aw}경기입니다.`, href: '#/matches' });

    const st = B.teams.map((t) => ({ t, ...B.streaks[t] })).sort((x, y) => y.bestUnbeaten - x.bestUnbeaten)[0];
    out.push({ k: '최장 무패 행진', v: `${st.bestUnbeaten}경기`, t: `${st.t}이 ${st.bestUnbeaten}경기 연속 지지 않았습니다.${st.curUnbeaten === st.bestUnbeaten && B.upcoming.length ? ' 지금도 이어지는 중입니다.' : ''}`, href: `#/team/${encodeURIComponent(st.t)}` });

    const big = [...L].sort((x, y) => Math.abs(y.homeScore - y.awayScore) - Math.abs(x.homeScore - x.awayScore) || (y.homeScore + y.awayScore) - (x.homeScore + x.awayScore))[0];
    out.push({ k: '최다 점수 차 경기', v: `${big.homeScore}:${big.awayScore}`, t: `${big.round} ${big.home} 대 ${big.away} (${big.datetime.slice(5, 10).replace('-', '.')}).`, href: `#/match/${big.id}` });

    if (B.hasDetail) {
      const late = B.teams.map((t) => { const f = B.timing[t].f, tot = f.reduce((x, y) => x + y, 0); return { t, share: tot ? f[5] / tot : 0, late: f[5], tot }; }).sort((x, y) => y.share - x.share)[0];
      out.push({ k: '막판에 강한 팀', v: pc(late.share), t: `${late.t}은 전체 ${late.tot}골 중 ${late.late}골을 76분 이후에 넣었습니다.`, href: `#/team/${encodeURIComponent(late.t)}` });

      const conv = B.teams.map((t) => ({ t, c: B.T[t].gfS / B.T[t].sh, sh: B.T[t].sh / B.T[t].sg })).filter((x) => Number.isFinite(x.c)).sort((x, y) => y.c - x.c);
      if (conv.length) { const hi = conv[0], lo = conv[conv.length - 1]; out.push({ k: '결정력 격차', v: `${pc(hi.c)} vs ${pc(lo.c)}`, t: `슈팅 대비 득점률은 ${hi.t}이 가장 높고 ${lo.t}이 가장 낮습니다. 같은 슈팅 10개로 ${f2(hi.c * 10)}골과 ${f2(lo.c * 10)}골의 차이입니다.`, href: '#/teams' }); }

      const q = B.players.filter((p) => p.minutes >= B.qualMin);
      const top = [...B.players].sort((x, y) => y.goals - x.goals || x.minutes - y.minutes)[0];
      const eff = [...q].sort((x, y) => y.g90 - x.g90)[0];
      if (top) out.push({ k: '득점 선두', v: `${top.goals}골`, t: `${top.name}(${top.team})이 ${top.apps}경기 ${top.minutes}분 동안 ${top.goals}골을 넣었습니다. 90분당 ${f2(top.g90)}골입니다.`, href: `#/player/${encodeURIComponent(top.key)}` });
      if (eff && eff.key !== top.key) out.push({ k: '90분당 득점 1위', v: f2(eff.g90), t: `${eff.name}(${eff.team})은 ${eff.minutes}분 출전에 ${eff.goals}골로, 출전 시간 대비 득점이 가장 많습니다 (${B.qualMin}분 이상 출전 기준).`, href: `#/player/${encodeURIComponent(eff.key)}` });
      const sub = B.players.map((p) => ({ p, g: p.log.filter((l) => !l.starter).reduce((x, l) => x + l.goals, 0) })).sort((x, y) => y.g - x.g)[0];
      if (sub && sub.g >= 2) out.push({ k: '최고의 조커', v: `교체 ${sub.g}골`, t: `${sub.p.name}(${sub.p.team})은 교체로 들어간 경기에서만 ${sub.g}골을 넣었습니다.`, href: `#/player/${encodeURIComponent(sub.p.key)}` });
    }
    return out;
  };

  // ---------- 역사: 2009~2024 최종 순위(위키백과) + 수집한 최근 시즌 ----------
  const CLUB_BY_NAME = { 인천현대제철: 'hyundai', 서울시청: 'seoul', 수원FC위민: 'suwon', 화천KSPO: 'kspo', 세종스포츠토토: 'toto', 상무여자축구단: 'sangmu', 경주한수원WFC: 'khnp', 강진SWANSWFC: 'gangjin' };
  // 연고 이전 시기는 대략적인 구분이라 실제 명칭 변경 시점과 한 시즌쯤 다를 수 있다
  WK.nameIn = function (club, y) {
    y = +y;
    switch (club) {
      case 'suwon': return y <= 2017 ? '수원시시설관리공단' : y <= 2021 ? '수원도시공사' : '수원FC위민';
      case 'kspo': return y <= 2014 ? '전북KSPO' : '화천KSPO';
      case 'toto': return y <= 2012 ? '충북스포츠토토' : y <= 2015 ? '대전스포츠토토' : y <= 2019 ? '구미스포츠토토' : '세종스포츠토토';
      case 'sangmu': return y <= 2015 ? '부산상무' : y <= 2022 ? '보은상무' : y <= 2024 ? '문경상무' : '상무여자축구단';
      case 'gangjin': return y <= 2024 ? '창녕WFC' : '강진SWANSWFC';
      case 'daekyo': return y <= 2009 ? '대교캥거루스' : y <= 2014 ? '고양대교' : '이천대교';
      case 'ilhwa': return '충남일화';
      default: return H.clubs[club] || club;
    }
  };
  WK.history = function () {
    if (WK._hist) return WK._hist;
    const seasons = {};
    for (const [y, s] of Object.entries(H.seasons)) seasons[y] = { year: +y, table: s.table, champion: s.champion, done: true, src: 'wiki' };
    for (const y of Object.keys(D.seasons)) {
      const B = WK.season(y);
      if (!B.league.length) continue;
      const done = !B.upcoming.length;
      let champion = null;
      const finals = B.post.filter((m) => /^CF/.test(m.round) && m.finished);
      if (finals.length) {
        const agg = {};
        for (const m of finals) { agg[m.home] = (agg[m.home] || 0) + m.homeScore; agg[m.away] = (agg[m.away] || 0) + m.awayScore; }
        const [x, z] = Object.entries(agg).sort((p, q) => q[1] - p[1]);
        if (z && x[1] > z[1]) champion = CLUB_BY_NAME[x[0]];
      }
      seasons[y] = { year: +y, done, champion, src: 'kwff', table: B.table.map((r) => ({ rank: r.rank, club: CLUB_BY_NAME[r.team] || r.team, p: r.p, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, pts: r.pts })) };
    }
    const years = Object.keys(seasons).map(Number).sort((a, b) => a - b);
    const clubs = {};
    for (const y of years) for (const r of seasons[y].table) {
      const c = (clubs[r.club] ||= { club: r.club, seasons: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, titles: 0, first: y, last: y, ranks: {} });
      c.seasons++; c.last = y; c.ranks[y] = r.rank;
      for (const k of ['p', 'w', 'd', 'l', 'gf', 'ga', 'pts']) c[k] += r[k];
    }
    for (const y of years) if (seasons[y].champion && clubs[seasons[y].champion]) clubs[seasons[y].champion].titles++;
    const lastYear = years[years.length - 1];
    for (const c of Object.values(clubs)) { c.active = c.last === lastYear; c.name = c.active ? WK.nameIn(c.club, lastYear) : WK.nameIn(c.club, c.last) + ' (해체)'; }
    return (WK._hist = { seasons, years, clubs, clubIdByName: CLUB_BY_NAME });
  };
})();
