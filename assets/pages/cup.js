// 리그 밖 대회(W코리아컵, 전국체전): 대진과 결과 (연맹 경기 기록에 없는 대회라 기사에서 옮긴 자료를 보여 준다)
(function () {
  const WK = window.WK, U = WK.ui, t = WK.t;
  const ROUND = { '1R': '1라운드', QF: '8강', SF: '4강', F: '결승' };
  // 대회 목록: 주소(#/cup, #/nsf), 자료, 달력에 붙는 짧은 이름
  const COMPS = [['cup', () => window.WK_CUP, '코리아컵'], ['nsf', () => window.WK_NSF, '전국체전']];
  const isWK = (tm) => !!WK.logo(tm);
  const team = (tm) => (!tm ? `<span class="mut">${t('미정')}</span>` : isWK(tm) ? `<a class="tl" href="${U.tHref(tm)}">${U.logo(tm, 20)}<span class="name">${U.tname(tm)}</span></a>` : `<span class="tl"><span class="name">${U.esc(t(tm))}</span> <span class="tag">${t('대학')}</span></span>`);
  const day = (d) => { if (!d) return '–'; const x = new Date(d + 'T00:00'); return `${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')} (${WK.weekday(x.getDay())})`; };
  const done = (m) => m.hs != null && m.as != null;
  const win = (m, side) => (m.winner ? m.winner === (side === 'h' ? m.home : m.away) : done(m) && (side === 'h' ? m.hs > m.as : m.as > m.hs));
  const src = (C) => `<span class="src">${t('{d} 확인 · 출처 {who}', { d: C.checked.replace(/-/g, '.'), who: t('언론 보도 (아래 목록)') })}</span>`;
  const result = (m) => (done(m) ? `<b>${m.hs} : ${m.as}</b>${m.pk ? ` <span class="mut">(${t('승부차기')} ${m.pk})</span>` : ''}` : m.winner ? `<b>${t('{w} 승', { w: WK.logo(m.winner) ? U.tname(m.winner) : U.esc(t(m.winner)) })}</b>` : `<span class="mut">${t('예정')}</span>`);
  // 달력과 홈에서 쓰는 경기 목록 (대회 표시를 붙여서)
  U.cupMatches = () => COMPS.flatMap(([key, get, tag]) => ((get() || {}).matches || []).map((m, i) => ({ ...m, comp: key, tag, idx: i })).filter((m) => m.date && m.home && m.away));
  // 일정·결과 목록에 끼우는 한 줄 (리그 경기 줄과 같은 모양, 앞에 대회 표시)
  U.cupRow = (m) => {
    const nm = (x) => `<span class="nm">${isWK(x) ? U.tname(x) : U.esc(t(x))}</span>`, lg = (x) => (isWK(x) ? U.logo(x) : '');
    const sc = done(m) ? `<span class="sc">${m.hs} : ${m.as}</span>` : `<span class="sc pending">${m.winner ? t('{w} 승', { w: isWK(m.winner) ? U.tname(m.winner) : U.esc(t(m.winner)) }) : m.time || '–'}</span>`;
    const meta = [done(m) || m.winner ? m.time : '', m.venue ? t(WK.vn(m.venue)) : '', m.pk ? `${t('승부차기')} ${m.pk}` : ''].filter(Boolean).join(' · ');
    return `<a class="mrow" href="#/${m.comp}/${m.idx}"><span class="rd"><em class="ctag${m.comp === 'nsf' ? ' c-nsf' : ''}">${t(m.tag)}</em>${t(ROUND[m.round] || m.round)}</span><span class="tm h">${nm(m.home)}${lg(m.home)}</span>${sc}<span class="tm a">${lg(m.away)}${nm(m.away)}</span><span class="meta">${meta}</span></a>`;
  };
  U.cupNext = (key = 'cup') => U.cupMatches().filter((m) => m.comp === key && !done(m) && !m.winner).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  function page(key, title, lead, note, arg) {
    const C = (COMPS.find((c) => c[0] === key) || [])[1]();
    if (!C) return `<h1>${t(title)}</h1><div class="card empty">${t('준비 중인 페이지입니다.')}</div>`;
    const next = U.cupNext(key), nd = next[0] && next[0].date, soon = next.filter((m) => m.date === nd);
    // 달력에서 누르고 들어온 경기
    const sel = arg !== '' && arg != null && C.matches[+arg] && !C.matches[+arg].bye ? C.matches[+arg] : null;
    const picked = sel ? `<section class="card picked"><div class="head"><div><h2>${t('고른 경기')} · ${t(ROUND[sel.round])}</h2><p class="desc">${day(sel.date)}${sel.time ? ' ' + sel.time : ''}${sel.venue ? ' · ' + U.esc(t(WK.vn(sel.venue))) : ''}</p></div>${src(C)}</div>
      <div class="cupm"><div class="tm">${U.logo(sel.home, 44)}<b>${isWK(sel.home) ? U.tname(sel.home) : U.esc(t(sel.home))}</b></div><div class="mid">${done(sel) ? `<b>${sel.hs} : ${sel.as}</b>${sel.pk ? `<span>${t('승부차기')} ${sel.pk}</span>` : ''}` : sel.winner ? `<b>${t('{w} 승', { w: WK.logo(sel.winner) ? U.tname(sel.winner) : U.esc(t(sel.winner)) })}</b>` : `<b>${sel.time || t('시각 미정')}</b><span>vs</span>`}</div><div class="tm">${U.logo(sel.away, 44)}<b>${isWK(sel.away) ? U.tname(sel.away) : U.esc(t(sel.away))}</b></div></div>
      ${sel.note ? `<p class="foot" style="margin-bottom:0">${U.esc(t(sel.note))}</p>` : ''}</section>` : '';
    const rows = (r) => C.matches.filter((m) => m.round === r).map((m) => m.bye
      ? `<tr><td class="l">${day(m.date)}</td><td class="l" colspan="3">${team(m.home)} <span class="mut">· ${t(m.bye)}</span></td><td class="l mut"></td></tr>`
      : `<tr><td class="l">${day(m.date)}${m.time ? ` <span class="mut">${m.time}</span>` : ''}</td><td class="l${win(m, 'h') ? ' won' : ''}">${team(m.home)}</td><td class="c">${result(m)}</td><td class="l${win(m, 'a') ? ' won' : ''}">${team(m.away)}</td><td class="l mut" style="font-size:12px">${[m.venue && t(WK.vn(m.venue)), m.note && t(m.note)].filter(Boolean).map(U.esc).join(' · ')}</td></tr>`).join('');
    const table = (r) => (C.matches.some((m) => m.round === r) ? U.card(t(ROUND[r]), '', `<div class="scroll"><table class="cup"><thead><tr><th class="l">${t('날짜')}</th><th class="l"></th><th class="c">${t('결과')}</th><th class="l"></th><th class="l">${t('비고')}</th></tr></thead><tbody>${rows(r)}</tbody></table></div>`, src(C)) : '');
    const info = [['주최', C.about.host], ['참가', C.about.teams], ['장소', C.about.venue], ['중계', C.about.tv], ['상금', C.about.prize]].filter(([, v]) => v);
    return `<h1>${t(title)}</h1><p class="lead">${t(lead, { y: C.season })}</p>
      ${picked}
      ${soon.length && !sel ? `<section class="card cupnext"><div class="head"><div><h2>${t('다음 경기')} · ${t(ROUND[soon[0].round])}</h2><p class="desc">${day(nd)}${soon[0].venue ? ' · ' + U.esc(t(WK.vn(soon[0].venue))) : ''}</p></div>${src(C)}</div>
        <div class="cupgrid">${soon.map((m) => `<div class="cupm"><div class="tm">${U.logo(m.home, 44)}<b>${isWK(m.home) ? U.tname(m.home) : U.esc(t(m.home))}</b></div><div class="mid"><b>${m.time || t('시각 미정')}</b><span>vs</span></div><div class="tm">${U.logo(m.away, 44)}<b>${isWK(m.away) ? U.tname(m.away) : U.esc(t(m.away))}</b></div></div>`).join('')}</div>
        ${C.about.tv ? `<p class="foot" style="margin-bottom:0">${t('중계')}: ${U.esc(t(C.about.tv))}</p>` : ''}</section>` : ''}
      ${['F', 'SF', 'QF', '1R'].map(table).join('')}
      ${U.card(t('대회 정보'), '', `<dl class="spec">${info.map(([k, v]) => `<div><dt>${t(k)}</dt><dd style="font-size:14px;font-weight:400">${U.esc(t(v))}</dd></div>`).join('')}</dl>`, src(C))}
      <p class="foot"><b>${t('출처')}</b> ${C.sources.map((s) => `<a class="link" href="${U.esc(s.url)}" target="_blank" rel="noopener">${U.esc(s.by)}</a>`).join(' · ')}<br>${t(note)}</p>`;
  }

  WK.pages.cup = (B, arg) => page('cup', 'W코리아컵', '{y} W코리아컵 · 대한축구협회가 올해 처음 연 여자축구 컵대회입니다. WK리그 기록과는 따로 집계합니다.',
    'W코리아컵은 연맹 경기 기록 페이지에 없어 언론 보도에서 옮겼습니다. 기사에 나오지 않은 시각·경기장은 비워 두었고, 경기가 끝나면 결과를 직접 넣어야 합니다. 일정이 바뀔 수 있으니 경기 전 대한축구협회 공지를 확인해 주세요.', arg);
  WK.pages.nsf = (B, arg) => page('nsf', '전국체전', '{y} 제107회 전국체육대회 축구 여자 일반부 · WK리그 기록과는 따로 집계합니다.',
    '전국체전 기록은 연맹 경기 기록 페이지에 없어 언론 보도에서 옮겼습니다. 기사에서 확인한 4강과 결승만 넣었고, 1·2라운드 대진과 4강 스코어는 찾지 못해 비워 두었습니다. 대한체육회 대회 사이트에서 확인되면 보탤 수 있습니다.', arg);
})();
