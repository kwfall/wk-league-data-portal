// 신인선수 드래프트: 일정, 참가 자격, 신청자 명단(공개되면), 지난 드래프트, 관련 소식
(function () {
  const WK = window.WK, U = WK.ui, t = WK.t;
  const ymd = (d) => { const x = new Date(d); return `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')} (${WK.weekday(x.getDay())})`; };
  const hm = (d) => { const x = new Date(d); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
  const src = (D) => `<span class="src">${t('{d} 확인 · 출처 {who}', { d: D.checked.replace(/-/g, '.'), who: t('한국여자축구연맹 공지') })}</span>`;
  const left = (d) => Math.ceil((new Date(d) - Date.now()) / 864e5);

  WK.pages.draft = function (B) {
    const D = window.WK_DRAFT;
    if (!D) return `<h1>${t('신인 드래프트')}</h1><div class="card empty">${t('준비 중인 페이지입니다.')}</div>`;
    const E = D.event, now = Date.now(), dday = left(E.date);
    const stage = now < new Date(E.applyFrom + 'T00:00:00+09:00') ? t('원서 접수 전') : now <= new Date(E.applyTo) ? t('원서 접수 중') : now < new Date(E.date) ? t('접수 마감 · 드래프트 대기') : t('드래프트 종료');
    const steps = [[t('원서 접수 시작'), ymd(E.applyFrom + 'T00:00:00+09:00'), ''], [t('원서 접수 마감'), ymd(E.applyTo), hm(E.applyTo)], [t('드래프트'), ymd(E.date), hm(E.date)]];
    const news = ((window.WK_NEWS || {}).items || []).filter((x) => /드래프트|draft/i.test(x.title)).slice(0, 8);
    const team = (tm) => (WK.logo(tm) ? `<a class="tl" href="${U.tHref(tm)}">${U.logo(tm, 20)}<span class="name">${U.tname(tm)}</span></a>` : U.esc(tm));
    return `<h1>${t('{y}년도 신인 드래프트', { y: D.year })}</h1><p class="lead">${t('WK리그 신인선수 선발 드래프트 · 일정과 참가 자격, 신청자 명단을 정리합니다.')}</p>
      <section class="card dhero"><div class="dd"><b>${dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : t('종료')}</b><span>${stage}</span></div>
        <div><h2 style="margin:0">${ymd(E.date)} ${hm(E.date)}</h2><p class="desc" style="margin:4px 0 0">${U.esc(t(E.place))}</p></div></section>
      <div class="two">
        ${U.card(t('일정'), t(E.how), `<ol class="dsteps">${steps.map(([k, d, h]) => `<li><b>${k}</b><span>${d}${h ? ' ' + h : ''}</span></li>`).join('')}</ol>`, src(D))}
        ${U.card(t('참가 자격'), t('연맹 안내 문서를 요약했습니다. 정확한 서류는 공지 원문을 확인해 주세요.'), `<div class="scroll"><table><tbody>${D.eligible.map(([k, v]) => `<tr><td class="l" style="white-space:nowrap"><b>${t(k)}</b></td><td class="l">${t(v)}</td></tr>`).join('')}</tbody></table></div>`, src(D))}
      </div>
      ${U.card(t('신청자 명단'), D.candidates.length ? t('{n}명', { n: D.candidates.length }) : '', D.candidates.length
        ? `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('선수')}</th><th class="l">${t('학교·소속')}</th><th class="l">${t('포지션')}</th><th class="l">${t('비고')}</th></tr></thead><tbody>${D.candidates.map((c) => `<tr><td class="l"><b>${U.esc(c.name)}</b></td><td class="l">${U.esc(c.school || '')}</td><td class="l">${U.esc(c.pos || '–')}</td><td class="l">${U.esc(c.note || '')}</td></tr>`).join('')}</tbody></table></div>`
        : `<p class="notice" style="margin:0">${t('신청자 명단은 아직 공개되지 않았습니다. 원서 접수가 12월 2일에 끝나고, 연맹이 명단을 공개하면 이곳에 정리합니다.')}</p>`, src(D))}
      ${D.picks.length ? U.card(t('지명 결과'), '', `<div class="scroll"><table class="stick"><thead><tr><th>${t('라운드')}</th><th class="l">${t('팀')}</th><th class="l">${t('선수')}</th><th class="l">${t('학교·소속')}</th><th class="l">${t('포지션')}</th></tr></thead><tbody>${D.picks.map((p) => `<tr><td>${p.round}</td><td class="l">${team(p.team)}</td><td class="l"><b>${U.esc(p.name)}</b></td><td class="l">${U.esc(p.school || '')}</td><td class="l">${U.esc(p.pos || '–')}</td></tr>`).join('')}</tbody></table></div>`, src(D)) : ''}
      ${U.card(t('지난 드래프트'), '', `<div class="scroll"><table><thead><tr><th class="l">${t('드래프트')}</th><th class="l">${t('날짜')}</th><th>${t('신청')}</th><th>${t('입단')}</th><th class="l">${t('전체 1순위')}</th></tr></thead><tbody>${D.past.map((p) => `<tr><td class="l">${t('{y}년도', { y: p.year })}</td><td class="l">${p.date.replace(/-/g, '.')}</td><td>${p.applied}</td><td>${p.signed}</td><td class="l"><b>${U.esc(p.first.name)}</b> <span class="mut">${U.esc(p.first.school)} · ${p.first.pos}</span> → ${team(p.first.team)} <a class="link" href="${U.esc(p.src)}" target="_blank" rel="noopener">${U.esc(p.by)}</a></td></tr>`).join('')}</tbody></table></div>`, `<span class="src">${t('출처 각 줄의 기사')}</span>`)}
      ${news.length ? U.card(t('드래프트 관련 소식'), t('소식 페이지에서 제목에 드래프트가 들어간 기사를 자동으로 모았습니다.'), `<ul class="news">${news.map((x) => `<li class="nw"><span class="when">${x.date.slice(5, 10).replace('-', '.')}</span><span class="kind k-${x.kind}">${U.esc(x.source)}</span><a class="ttl" href="${U.esc(x.url)}" target="_blank" rel="noopener">${U.esc(x.title)}</a><span class="by"></span></li>`).join('')}</ul>`, '') : ''}
      <p class="foot"><b>${t('출처')}</b> ${D.sources.map((s) => `<a class="link" href="${U.esc(s.url)}" target="_blank" rel="noopener">${U.esc(s.title)}</a>`).join(' · ')}</p>`;
  };
})();
