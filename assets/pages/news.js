// 소식: 연맹 보도자료와 언론 기사 제목 모음 (scrape-news.mjs 가 모은 제목과 링크만 보여 준다)
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  const KIND = { official: '연맹 보도자료', press: '언론 기사', en: '영문 매체' };
  const day = (d) => { const x = new Date(d); return `${String(x.getMonth() + 1).padStart(2, '0')}.${String(x.getDate()).padStart(2, '0')}`; };
  const src = (N) => { const d = new Date(N.updated), z = (n) => String(n).padStart(2, '0'); return `<span class="src">${t('{when} 기준 · 출처 {who}', { when: `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`, who: t('각 기사 언론사') })}</span>`; };
  const row = (x) => `<li class="nw"><span class="when">${day(x.date)}</span><span class="kind k-${x.kind}">${t(KIND[x.kind])}</span>
    <a class="ttl" href="${U.esc(x.url)}" target="_blank" rel="noopener">${U.esc(x.title)}</a><span class="by">${U.esc(x.source)}${x.teams.map((tm) => U.logo(tm, 16)).join('')}</span></li>`;
  // 홈에서 쓰는 짧은 목록
  U.newsCard = (n = 6) => { const N = window.WK_NEWS; if (!N || !N.items.length) return ''; return U.card(t('최근 소식'), t('기사 제목을 누르면 해당 언론사 페이지로 이동합니다.'), `<ul class="news">${N.items.slice(0, n).map(row).join('')}</ul><p class="more"><a class="link" href="#/news">${t('소식 전체 보기')} →</a></p>`, src(N)); };

  WK.pages.news = function (B) {
    const N = window.WK_NEWS;
    if (!N || !N.items.length) return `<h1>${t('소식')}</h1><div class="card"><p class="notice" style="margin:0">${t('아직 모은 소식이 없습니다. node scrape-news.mjs 를 실행하거나 실시간_갱신.bat 을 켜 주세요.')}</p></div>`;
    const kind = KIND[S.nKind] ? S.nKind : '', team = B.rank[S.nTeam] ? S.nTeam : '';
    const list = N.items.filter((x) => (!kind || x.kind === kind) && (!team || x.teams.includes(team)));
    const seg = `<div class="seg" role="group">${[['', '전체'], ['official', KIND.official], ['press', KIND.press], ['en', KIND.en]].map(([v, l]) => `<button data-set="nKind:${v}" aria-pressed="${kind === v}">${t(l)}</button>`).join('')}</div>`;
    return `<h1>${t('소식')}</h1><p class="lead">${t('연맹 보도자료와 언론 기사 제목을 모았습니다 · 최근 60일')}</p>
      ${U.card(t('기사 목록'), t('{n}건 · 기사 제목을 누르면 해당 언론사 페이지로 이동합니다.', { n: list.length }),
        `<div class="bar" style="margin-bottom:12px">${seg}<select data-bind="nTeam" aria-label="${t('팀 선택')}"><option value="">${t('전체 팀')}</option>${B.table.map((r) => `<option value="${U.esc(r.team)}" ${r.team === team ? 'selected' : ''}>${U.tname(r.team)}</option>`).join('')}</select></div>
        ${list.length ? `<ul class="news">${list.map(row).join('')}</ul>` : `<p class="notice" style="margin:0">${t('조건에 맞는 기사가 없습니다.')}</p>`}`, src(N))}
      <p class="foot">${t('기사 본문은 언론사 저작물이라 제목·날짜·언론사·링크만 보여 줍니다. 언론 기사는 구글 뉴스 검색(WK리그, W코리아컵), 영문 기사는 WK League News에서 가져옵니다. 팀 로고는 제목에 팀 이름이 나온 경우에 붙습니다. 기사 제목은 원문 언어 그대로입니다.')}${N.failed && N.failed.length ? ' ' + t('이번 수집에서 가져오지 못한 곳: {f}', { f: N.failed.join(', ') }) : ''}</p>`;
  };
})();
