// 공통: 도우미, 그래프, 주소(#/…)에 따른 페이지 전환, 테마·언어 전환
(function () {
  const WK = window.WK, U = (WK.ui = {}), t = WK.t;
  WK.pages = {};
  const S = (WK.state = { season: WK.seasons[0], tableMode: 'all', tableWide: false });

  U.esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  U.sgn = (n) => (n > 0 ? '+' : '') + n;
  U.f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '–');
  U.f2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : '–');
  U.pct = (n) => (Number.isFinite(n) ? (n * 100).toFixed(1) + '%' : '–');
  U.res = (x) => t({ W: '승', D: '무', L: '패' }[x]);
  U.date = (iso) => { const d = new Date(iso.slice(0, 10) + 'T00:00'); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${WK.weekday(d.getDay())})`; };
  U.day = (m) => U.date(m.datetime).slice(5);
  U.round = (m) => ({ PO: t('플레이오프'), CF1: t('챔피언결정전 1차전'), CF2: t('챔피언결정전 2차전') }[m.round] || m.round);
  U.tHref = (tm) => `#/team/${encodeURIComponent(tm)}`;
  U.pHref = (key) => `#/player/${encodeURIComponent(key)}`;
  U.dot = (B, tm) => `<span class="dot" style="background:${B.color[tm] || 'var(--line-2)'}"></span>`;
  U.tname = (tm) => U.esc(WK.tn(tm));
  U.logo = (tm, size = 22) => (WK.logo(tm) ? `<img class="lg" src="${U.esc(WK.logo(tm))}" alt="" style="width:${size}px;height:${size}px">` : '');
  U.pname = (key, ko) => U.esc(WK.pn(key, ko ?? key.split('|')[1]));
  U.venue = (v) => U.esc(WK.vn(v));
  U.mark = (B, tm, size = 20) => U.logo(tm, size) || U.dot(B, tm); // 구단 로고, 없으면 색 점
  U.team = (B, tm) => `<a class="tl" href="${U.tHref(tm)}">${U.mark(B, tm)}<span class="name" title="${U.tname(tm)}">${U.tname(tm)}</span></a>`;
  U.line = (m) => `${m.round} ${WK.tn(m.home)} ${m.homeScore}:${m.awayScore} ${WK.tn(m.away)}`;
  U.form = (form) => `<span class="form">${form.slice(-5).map((f) => `<a class="${f.x}" href="#/match/${f.m.id}" data-tip="${U.esc(U.line(f.m))}">${U.res(f.x)}</a>`).join('')}</span>`;
  // 모든 표에 붙이는 기준 시각과 출처
  U.src = (who = t('한국여자축구연맹(KWFF)')) => {
    const d = new Date(WK.D.updated), p = (n) => String(n).padStart(2, '0');
    return `<span class="src">${t('{when} 기준 · 출처 {who}', { when: `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`, who })}</span>`;
  };
  U.card = (title, desc, body, right = U.src()) => `<section class="card"><div class="head"><div><h2>${title}</h2>${desc ? `<p class="desc">${desc}</p>` : ''}</div>${right}</div>${body}</section>`;
  U.tile = (k, v, n = '') => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="n">${n}</div></div>`;
  U.narrow = () => matchMedia('(max-width: 640px)').matches;

  U.lineChart = function ({ W = 900, H = 280, l = 34, r = 20, t: top = 14, b = 30, x, y, invert, xt = [], yt = [], series }) {
    const sx = (v) => l + ((W - l - r) * (v - x[0])) / (x[1] - x[0] || 1);
    const sy = (v) => { const k = (v - y[0]) / (y[1] - y[0] || 1); return invert ? top + (H - top - b) * k : H - b - (H - top - b) * k; };
    let g = '';
    for (const [v, lab] of yt) g += `<line x1="${l}" x2="${W - r}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)"/><text class="n" x="${l - 8}" y="${sy(v) + 4}" text-anchor="end">${lab}</text>`;
    for (const [v, lab] of xt) g += `<text class="n" x="${sx(v)}" y="${H - 8}" text-anchor="middle">${lab}</text>`;
    for (const s of series) {
      const pts = s.pts.filter((p) => Number.isFinite(p[1]));
      if (!pts.length) continue;
      const path = pts.map((p) => `${sx(p[0])},${sy(p[1])}`).join(' '), pick = s.toggle ? ` data-toggle="${U.esc(s.toggle)}" style="cursor:pointer"` : '';
      g += `<g opacity="${s.op ?? 1}"><polyline points="${path}" fill="none" stroke="${s.color}" stroke-width="${s.w || 2}" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (s.dots) g += pts.map((p) => `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="${p[3] ? 5 : 3.5}" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>${p[3] ? `<text x="${sx(p[0])}" y="${sy(p[1]) - 10}" text-anchor="middle" style="fill:var(--ink);font-size:11px">${p[3]}</text>` : ''}`).join('');
      if (s.label) { const e = pts[pts.length - 1]; g += `<circle cx="${sx(e[0])}" cy="${sy(e[1])}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/><text x="${sx(e[0]) + 10}" y="${sy(e[1]) + 4}"${s.toggle ? ` data-toggle="${U.esc(s.toggle)}"` : ''} style="fill:var(--ink);${s.bold ? 'font-weight:600;' : ''}${s.toggle ? 'cursor:pointer' : ''}">${U.esc(s.label)}</text>`; }
      g += '</g>';
      if (s.toggle) g += `<polyline points="${path}" fill="none" stroke="transparent" stroke-width="14"${pick}/>`; // 선을 쉽게 누를 수 있게 넓은 투명 영역
      if (s.hit !== false) g += pts.map((p) => (p[2] ? `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="10" fill="transparent" data-tip="${U.esc(p[2])}"${pick}/>` : '')).join('');
    }
    return `<svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg>`;
  };

  // 15분 단위 득점(파랑)·실점(주황) 막대
  U.timing = function (F, A) {
    const nar = U.narrow(), W = nar ? 420 : 560, H = 240, l = 30, b = 30, top = 12, ph = H - top - b, n = WK.BUCKETS.length;
    const max = Math.max(...F, ...A, 1), nice = Math.ceil(max / 4) * 4, y = (v) => top + ph - (ph * v) / nice, bw = (W - l) / n;
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = (nice / 4) * i; g += `<line x1="${l}" x2="${W}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line${i ? '' : '-2'})"/><text class="n" x="${l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; }
    const bar = (x, w, v, c, tip) => { if (!v) return ''; const h = ph - (y(v) - top), q = Math.min(3, h); return `<path data-tip="${U.esc(tip)}" d="M${x},${y(0)} v${-(h - q)} q0,${-q} ${q},${-q} h${w - 2 * q} q${q},0 ${q},${q} v${h - q} z" fill="${c}"/>`; };
    WK.BUCKETS.forEach((bk, i) => {
      const cx = l + bw * i + bw / 2, w = Math.min(40, bw / 3);
      g += bar(cx - w - 1, w, F[i], 'var(--s1)', `${bk}′ · ${t('득점')} ${F[i]}`) + bar(cx + 1, w, A[i], 'var(--s2)', `${bk}′ · ${t('실점')} ${A[i]}`);
      g += `<text class="n" x="${cx}" y="${H - 8}" text-anchor="middle">${bk}</text>`;
    });
    const tbl = `<table><thead><tr><th class="l">${t('시간대(분)')}</th>${WK.BUCKETS.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody><tr><td class="l">${t('득점')}</td>${F.map((v) => `<td>${v}</td>`).join('')}</tr><tr><td class="l">${t('실점')}</td>${A.map((v) => `<td>${v}</td>`).join('')}</tr></tbody></table>`;
    return `<div class="legend" style="margin-bottom:8px"><span><span class="dot" style="background:var(--s1)"></span>${t('득점')}</span><span><span class="dot" style="background:var(--s2)"></span>${t('실점')}</span></div><svg viewBox="0 0 ${W} ${H}" role="img">${g}</svg><details><summary>${t('표로 보기')}</summary><div class="scroll">${tbl}</div></details>`;
  };

  const NAV = [['', '홈'], ['table', '순위'], ['matches', '일정·결과'], ['teams', '팀'], ['players', '선수'], ['news', '소식'], ['cup', 'W코리아컵'], ['nsf', '전국체전'], ['analysis', '팀 분석'], ['compare', '비교'], ['best', '베스트 11'], ['qor', '라운드 QOR'], ['abroad', '해외파'], ['go', '경기장 가는 길'], ['predict', '예측'], ['history', '역대 기록']];
  function render() {
    const [, name = '', arg = ''] = location.hash.match(/^#\/([^/]*)\/?(.*)$/) || [];
    const key = name || 'home', page = WK.pages[key], B = WK.season(S.season);
    const group = { match: 'matches', team: 'teams', player: 'players', home: '' }[key] ?? name;
    document.documentElement.lang = WK.lang;
    document.title = t('WK리그 Data');
    document.querySelector('.brand span').textContent = t('WK리그 Data');
    const links = (list) => list.map(([k, l]) => `<a href="#/${k}" ${k === group ? 'aria-current="page"' : ''}>${t(l)}</a>`).join('');
    document.querySelector('nav').innerHTML = links(NAV.slice(0, 5));
    document.querySelector('.drawer-in').innerHTML = links(NAV) + `<a class="ig-link" href="https://www.instagram.com/kwf.all/" target="_blank" rel="noopener">${t('인스타그램')} @kwf.all ↗</a>`
      ;
    if (WK.afterTabs) WK.afterTabs();
    document.getElementById('menu').setAttribute('aria-label', t('메뉴'));
    document.getElementById('season').innerHTML = WK.seasons.map((s) => `<option value="${s}" ${s === S.season ? 'selected' : ''}>${t('{y}시즌', { y: s })}</option>`).join('');
    const dark = document.documentElement.dataset.theme === 'dark';
    document.querySelectorAll('#lang button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.lang === WK.lang));
    const tb = document.getElementById('theme'); tb.textContent = dark ? t('라이트') : t('다크'); tb.setAttribute('aria-label', dark ? t('라이트 모드로 전환') : t('다크 모드로 전환'));
    document.querySelector('footer').innerHTML = `<a class="link" href="https://www.instagram.com/kwf.all/" target="_blank" rel="noopener">${t('인스타그램')} @kwf.all</a> · <span id="live"></span><br><span class="mut">${t('WK리그 공식 사이트가 아닙니다. 인스타그램 @kwf.all 운영자가 만드는 비공식 팬 사이트이며, 한국여자축구연맹과 관계가 없습니다. 기록 출처: 한국여자축구연맹(KWFF)')}<br>${t('방문 통계는 개인을 알아볼 수 없는 형태로만 집계합니다 (Cloudflare Web Analytics, 쿠키 없음).')}</span>`; foot();
    WK.afterRender = null;
    const main = document.querySelector('main'), y = WK._keep ? scrollY : 0;
    main.innerHTML = page ? page(B, decodeURIComponent(arg)) : `<h1>${t((NAV.find(([k]) => k === group) || [, '페이지'])[1])}</h1><div class="card empty">${t('준비 중인 페이지입니다.')}</div>`;
    scrollTo(0, y); WK._keep = false;
    const after = WK.afterRender; WK.afterRender = null; if (after) after();
  }
  WK.rerender = () => { WK._keep = true; render(); };
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 저장이 막힌 환경에서는 이번 방문에만 적용 */ } };

  // 좁은 화면에서는 언어·화면 모드 단추를 펼친 메뉴 안으로 옮겨 윗줄에 사이트 이름이 보이게 한다
  const mq = matchMedia('(max-width: 640px)'), place = () => { const to = document.querySelector(mq.matches && !document.documentElement.classList.contains('mobile') ? '.drawer-tools' : '.tools'); if (to) to.append(document.getElementById('lang'), document.getElementById('theme')); }; // 카드·포스터 화면에는 윗줄이 없다
  mq.addEventListener('change', place); place();
  // 전체 메뉴 펼치기·접기
  WK.menu = (open) => { const d = document.getElementById('drawer'), b = document.getElementById('menu'); d.hidden = !open; b.setAttribute('aria-expanded', String(open)); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') WK.menu(false); });
  addEventListener('hashchange', () => WK.menu(false));
  document.addEventListener('click', (e) => {
    if (e.target.closest('#menu')) return WK.menu(document.getElementById('drawer').hidden);
    if (!document.getElementById('drawer').hidden && !e.target.closest('.drawer-tools')) WK.menu(false); // 메뉴 항목이나 바깥을 누르면 접는다
    if (e.target.id === 'theme') { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; save('wk-theme', next); return WK.rerender(); }
    const lb = e.target.closest('#lang button');
    if (lb) { WK.lang = lb.dataset.lang; save('wk-lang', WK.lang); return WK.rerender(); }
    const tg = e.target.closest('[data-toggle]');
    if (tg) { const i = tg.dataset.toggle.indexOf(':'), k = tg.dataset.toggle.slice(0, i), v = tg.dataset.toggle.slice(i + 1); S[k] = S[k] === v ? '' : v; return WK.rerender(); }
    const th = e.target.closest('th[data-sort]');
    if (th) { const k = th.dataset.sort, text = ['name', 'team', 'position'].includes(k); S.sort = { key: k, dir: S.sort.key === k ? -S.sort.dir : text ? 1 : -1 }; return WK.rerender(); }
    const set = e.target.closest('[data-set]');
    if (set) { const [k, v] = set.dataset.set.split(':'); S[k] = v === 'true' ? true : v === 'false' ? false : v; return WK.rerender(); }
    const row = e.target.closest('tr[data-href]');
    if (row && !e.target.closest('a')) location.hash = row.dataset.href;
  });
  document.addEventListener('change', (e) => {
    if (e.target.id === 'season') { S.season = e.target.value; return render(); }
    const el = e.target.closest('[data-bind]');
    if (!el) return;
    S[el.dataset.bind] = el.value;
    if (el.dataset.also && el.value) { const [k, v] = el.dataset.also.split(':'); S[k] = v; }
    WK.rerender();
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-live]');
    if (!el) return;
    const k = el.dataset.live, pos = el.type === 'search' ? el.selectionStart : null;
    S[k] = el.dataset.num ? Math.max(0, +el.value || 0) : el.value;
    WK.rerender();
    const again = document.querySelector(`[data-live="${k}"]`); // 다시 그린 뒤에도 입력을 이어갈 수 있게
    if (again) { again.focus(); if (pos != null) again.setSelectionRange(pos, pos); }
  });
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('th[data-sort]')) { e.preventDefault(); e.target.click(); } });
  const tip = document.getElementById('tip');
  document.addEventListener('mousemove', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) { tip.style.display = 'none'; return; }
    tip.textContent = el.dataset.tip; tip.style.display = 'block';
    tip.style.left = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8) + 'px';
    tip.style.top = Math.max(8, Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 8)) + 'px';
  });

  // 실시간 갱신: 1분마다 data.js 를 다시 읽어, 기록이 바뀌었으면 지금 보는 화면을 다시 그린다
  // (data.js 는 실시간_갱신.bat 이 경기 일정에 맞춰 새로 만든다)
  WK.checked = new Date();
  function poll() {
    if (document.hidden) return;
    const old = document.getElementById('live-data'); if (old) old.remove();
    const sc = document.createElement('script');
    sc.id = 'live-data'; sc.src = 'data.js?t=' + Date.now();
    sc.onload = () => {
      const next = window.WK_DATA; WK.checked = new Date();
      if (next && next.updated !== WK.D.updated) {
        const changed = (next.hash || next.updated) !== (WK.D.hash || WK.D.updated);
        WK.reload(next);
        if (changed) { WK.rerender(); WK.flash(t('새 기록이 들어와 화면을 새로 그렸습니다.')); }
      }
      foot();
    };
    document.head.append(sc);
    const on = document.getElementById('live-news'); if (on) on.remove();
    const ns = document.createElement('script'), before = (window.WK_NEWS || {}).updated;
    ns.id = 'live-news'; ns.src = 'news.js?t=' + Date.now();
    ns.onload = () => { const n = window.WK_NEWS; if (n && n.updated !== before && /^#\/(news)?$|^$/.test(location.hash)) WK.rerender(); };
    document.head.append(ns);
  }
  const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  function foot() {
    const el = document.getElementById('live'); if (!el) return;
    const d = new Date(WK.D.updated);
    el.textContent = t('기록 수집 {a} · 화면 확인 {b}', { a: `${d.getMonth() + 1}.${d.getDate()} ${hm(d)}`, b: hm(WK.checked) });
  }
  WK.flash = (msg) => { let el = document.getElementById('flash'); if (!el) { el = document.createElement('div'); el.id = 'flash'; el.setAttribute('role', 'status'); document.body.append(el); } el.textContent = msg; el.classList.add('on'); clearTimeout(WK._flashT); WK._flashT = setTimeout(() => el.classList.remove('on'), 4000); };

  // 보기 방식 고르기: 휴대폰으로 들어올 때마다(창을 새로 열 때마다) 모바일/PC 중에서 고르게 한다
  WK.mode = (() => { try { return sessionStorage.getItem('wk-mode') || ''; } catch (e) { return ''; } })();
  WK.small = matchMedia('(max-width: 900px)').matches || matchMedia('(pointer: coarse)').matches || WK.mode === 'pc' && /Mobi|Android|iPhone/.test(navigator.userAgent);
  WK.setMode = (m) => {
    try { sessionStorage.setItem('wk-mode', m); } catch (e) { /* 저장이 막힌 환경 */ }
    location.reload();
  };
  function chooser() {
    const el = document.createElement('div');
    el.id = 'chooser'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="ch-in"><img src="assets/logo.svg" alt="" width="48" height="48"><h2>${t('어떤 화면으로 볼까요?')}</h2><p>${t('고른 뒤에도 화면에 보이는 단추로 언제든 바꿀 수 있고, 창을 새로 열면 다시 물어봅니다.')}</p>
      <button class="ch-b on" data-mode-set="mobile"><b>${t('모바일 버전')}</b><span>${t('휴대폰에 맞춘 큰 글씨와 아래쪽 메뉴')}</span></button>
      <button class="ch-b" data-mode-set="pc"><b>${t('PC 버전')}</b><span>${t('컴퓨터와 같은 화면 (확대해서 보기)')}</span></button></div>`;
    document.body.append(el);
  }
  // 모바일 버전: 아래쪽 고정 메뉴
  function tabbar() {
    const bar = document.getElementById('tabbar') || document.body.appendChild(Object.assign(document.createElement('nav'), { id: 'tabbar' }));
    bar.setAttribute('aria-label', t('메뉴'));
    const cur = (location.hash.match(/^#\/([^/]*)/) || [, ''])[1];
    const group = { match: 'matches', team: 'teams', player: 'players', home: '' }[cur] ?? cur;
    const I = { '': 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', table: 'M4 5h16M4 12h16M4 19h16M4 5v14M20 5v14', matches: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5', players: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6' };
    bar.innerHTML = [['', '홈'], ['table', '순위'], ['matches', '일정'], ['players', '선수']].map(([k, l]) => `<a href="#/${k}" ${group === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${I[k]}"/></svg><span>${t(l)}</span></a>`).join('')
      + `<button type="button" data-open-menu><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span>${t('전체 메뉴')}</span></button>`;
  }
  function modeSwitch() {
    let b = document.getElementById('modebtn');
    if (WK.mode === 'mobile') {
      if (!b) { b = document.createElement('button'); b.id = 'modebtn'; b.type = 'button'; document.querySelector('.tools').prepend(b); }
      b.className = 'btn mode-top'; b.dataset.modeSet = 'pc'; b.textContent = t('PC 버전');
    } else if (WK.mode === 'pc' || WK.small) {
      // PC 버전: 윗줄 시즌·언어 옆에 모바일 버전 단추
      if (!b) { b = document.createElement('button'); b.id = 'modebtn'; b.type = 'button'; document.querySelector('.tools').prepend(b); }
      b.className = 'btn mode-top'; b.dataset.modeSet = 'mobile'; b.textContent = t('모바일 버전');
    }
  }
  WK.afterTabs = () => { if (WK.mode === 'mobile') tabbar(); modeSwitch(); };
  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode-set]'); if (m) return WK.setMode(m.dataset.modeSet);
    if (e.target.closest('[data-open-menu]')) { e.stopPropagation(); WK.menu(document.getElementById('drawer').hidden); }
  }, true);

  WK.start = function () {
    addEventListener('hashchange', render);
    render();
    if (!WK.mode && WK.small) chooser();
    setInterval(poll, 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
  };
})();
