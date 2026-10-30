// W코리아컵: 대진과 결과 (연맹 경기 기록에 없는 대회라 기사에서 옮긴 자료를 보여 준다)
(function () {
  const WK = window.WK, U = WK.ui, t = WK.t;
  const ROUND = { '1R': '1라운드', QF: '8강', SF: '4강', F: '결승' };
  const isWK = (tm) => !!WK.logo(tm);
  const team = (tm) => (!tm ? `<span class="mut">${t('미정')}</span>` : isWK(tm) ? `<a class="tl" href="${U.tHref(tm)}">${U.logo(tm, 20)}<span class="name">${U.tname(tm)}</span></a>` : `<span class="tl"><span class="name">${U.esc(t(tm))}</span> <span class="tag">${t('대학')}</span></span>`);
  const day = (d) => { if (!d) return '–'; const x = new Date(d + 'T00:00'); return `${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')} (${WK.weekday(x.getDay())})`; };
  const done = (m) => m.hs != null && m.as != null;
  const win = (m, side) => (done(m) ? (side === 'h' ? m.hs > m.as : m.as > m.hs) : m.winner === (side === 'h' ? m.home : m.away));
  const src = (C) => `<span class="src">${t('{d} 확인 · 출처 {who}', { d: C.checked.replace(/-/g, '.'), who: t('언론 보도 (아래 목록)') })}</span>`;
  // 달력과 홈에서 쓰는, 아직 안 치른 경기
  U.cupMatches = () => ((window.WK_CUP || {}).matches || []).filter((m) => m.date && m.home && m.away);
  U.cupNext = () => U.cupMatches().filter((m) => !done(m) && !m.winner).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  WK.pages.cup = function () {
    const C = window.WK_CUP;
    if (!C) return `<h1>${t('W코리아컵')}</h1><div class="card empty">${t('준비 중인 페이지입니다.')}</div>`;
    const next = U.cupNext(), nd = next[0] && next[0].date, soon = next.filter((m) => m.date === nd);
    const rows = (r) => C.matches.filter((m) => m.round === r).map((m) => m.bye
      ? `<tr><td class="l">${day(m.date)}</td><td class="l" colspan="3">${team(m.home)} <span class="mut">· ${t(m.bye)}</span></td><td class="l mut"></td></tr>`
      : `<tr><td class="l">${day(m.date)}${m.time ? ` <span class="mut">${m.time}</span>` : ''}</td><td class="l${win(m, 'h') ? ' won' : ''}">${team(m.home)}</td><td class="c">${done(m) ? `<b>${m.hs} : ${m.as}</b>` : m.winner ? `<b>${t('{w} 승', { w: WK.logo(m.winner) ? U.tname(m.winner) : U.esc(t(m.winner)) })}</b>` : `<span class="mut">${t('예정')}</span>`}</td><td class="l${win(m, 'a') ? ' won' : ''}">${team(m.away)}</td><td class="l mut" style="font-size:12px">${[m.venue && t(WK.vn(m.venue)), m.note && t(m.note)].filter(Boolean).map(U.esc).join(' · ')}</td></tr>`).join('');
    const table = (r) => U.card(t(ROUND[r]), '', `<div class="scroll"><table class="cup"><thead><tr><th class="l">${t('날짜')}</th><th class="l"></th><th class="c">${t('결과')}</th><th class="l"></th><th class="l">${t('비고')}</th></tr></thead><tbody>${rows(r)}</tbody></table></div>`, src(C));
    return `<h1>${t('W코리아컵')}</h1><p class="lead">${t('{y} W코리아컵 · 대한축구협회가 올해 처음 연 여자축구 컵대회입니다. WK리그 기록과는 따로 집계합니다.', { y: C.season })}</p>
      ${soon.length ? `<section class="card cupnext"><div class="head"><div><h2>${t('다음 경기')} · ${t(ROUND[soon[0].round])}</h2><p class="desc">${day(nd)}${soon[0].venue ? ' · ' + U.esc(t(WK.vn(soon[0].venue))) : ''}</p></div>${src(C)}</div>
        <div class="cupgrid">${soon.map((m) => `<div class="cupm"><div class="tm">${U.logo(m.home, 44)}<b>${isWK(m.home) ? U.tname(m.home) : U.esc(t(m.home))}</b></div><div class="mid"><b>${m.time || t('시각 미정')}</b><span>vs</span></div><div class="tm">${U.logo(m.away, 44)}<b>${isWK(m.away) ? U.tname(m.away) : U.esc(t(m.away))}</b></div></div>`).join('')}</div>
        <p class="foot" style="margin-bottom:0">${t('중계')}: ${U.esc(t(C.about.tv))}</p></section>` : ''}
      ${['F', 'SF', 'QF', '1R'].map(table).join('')}
      ${U.card(t('대회 정보'), '', `<dl class="spec">${[['주최', C.about.host], ['참가', C.about.teams], ['장소', C.about.venue], ['중계', C.about.tv], ['상금', C.about.prize]].map(([k, v]) => `<div><dt>${t(k)}</dt><dd style="font-size:14px;font-weight:400">${U.esc(t(v))}</dd></div>`).join('')}</dl>`, src(C))}
      <p class="foot"><b>${t('출처')}</b> ${C.sources.map((s) => `<a class="link" href="${U.esc(s.url)}" target="_blank" rel="noopener">${U.esc(s.by)}</a>`).join(' · ')}<br>${t('W코리아컵은 연맹 경기 기록 페이지에 없어 언론 보도에서 옮겼습니다. 기사에 나오지 않은 시각·경기장은 비워 두었고, 경기가 끝나면 결과를 직접 넣어야 합니다. 일정이 바뀔 수 있으니 경기 전 대한축구협회 공지를 확인해 주세요.')}</p>`;
  };
})();
