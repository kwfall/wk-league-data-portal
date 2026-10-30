// 역대 기록(2009~)과 용어·출처 페이지
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  // 해체된 구단의 영어·일본어 표기
  const GONE = { daekyo: { en: 'Daekyo', ja: '大教' }, ilhwa: { en: 'Chungnam Ilhwa', ja: '忠南一和' } };
  const NOW = Object.fromEntries(Object.entries(WK.history().clubIdByName).map(([name, id]) => [id, name]));
  // 한국어에서는 그 시즌의 팀명, 다른 언어에서는 지금 구단 이름으로 보여 준다
  const club = (id, y) => U.esc(WK.lang === 'ko' ? WK.nameIn(id, y) : NOW[id] ? WK.tn(NOW[id]) : (GONE[id] || {})[WK.lang] || id);
  const clubNow = (c) => U.esc(WK.lang === 'ko' ? c.name : NOW[c.club] ? WK.tn(NOW[c.club]) : `${(GONE[c.club] || {})[WK.lang] || c.club} (${t('해체')})`);
  const lg = (id, y) => (NOW[id] && (y == null || +y >= 2025) ? U.logo(NOW[id], 20) : '');
  const wikiSrc = () => U.src(t('한국여자축구연맹(KWFF), 위키백과'));

  WK.pages.history = function () {
    const H = WK.history(), ys = H.years;
    if (!H.seasons[S.hYear]) S.hYear = String(ys[ys.length - 1]);
    // 정규리그 1위: 끝난 시즌의 1위, 진행 중인 시즌은 확정된 경우만
    const first = (y) => { const s = H.seasons[y]; if (s.done) return s.table[0].club; const B = WK.D.seasons[y] && WK.season(String(y)); return B && B.clinched ? H.clubIdByName[B.clinched] : null; };
    const firsts = {}, champs = {};
    for (const y of ys) { const f = first(y), c = H.seasons[y].champion; if (f) (firsts[f] ||= []).push(y); if (c) (champs[c] ||= []).push(y); }
    const se = H.seasons[S.hYear], clubs = Object.values(H.clubs).sort((a, b) => b.pts - a.pts);
    const pending = `<span style="color:var(--muted)">${t('진행 중')}</span>`;

    return `<h1>${t('역대 기록')}</h1><p class="lead">${t('{a}년 출범부터 {b}시즌까지 {n}시즌의 정규리그 기록', { a: ys[0], b: ys[ys.length - 1], n: ys.length })}</p>
      <p class="notice" style="margin:0 0 16px">${t('2009~2024시즌은 위키백과의 최종 순위표와 우승팀만 제공합니다. 공식 자료와 대조하지 않았고, 경기별 결과와 선수 기록은 없습니다. 2025시즌 이후는 연맹 경기 결과로 직접 계산했습니다.')}</p>
      ${U.card(t('시즌별 1위와 우승팀'), t('정규리그 1위와 챔피언결정전 우승은 서로 다른 기록입니다. 정규리그를 1위로 마친 팀이 챔피언결정전에서 질 수도 있습니다.'),
        `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('시즌')}</th><th class="l">${t('정규리그 1위')}</th><th class="l">${t('챔피언결정전 우승')}</th><th>${t('참가 팀')}</th></tr></thead><tbody>${[...ys].reverse().map((y) => { const s = H.seasons[y], f = first(y); return `<tr><td class="l">${y}</td><td class="l">${f ? `<span class="tl">${lg(f, y)}${club(f, y)}</span>` + (s.done ? '' : ` <span class="tag good">${t('확정')}</span>`) : pending}</td><td class="l">${s.champion ? `<span class="tl">${lg(s.champion, y)}${club(s.champion, y)}</span>` : s.done && s.src === 'wiki' ? '–' : pending}</td><td>${s.table.length}</td></tr>`; }).join('')}</tbody></table></div>`, wikiSrc())}
      ${U.card(t('구단별 통산 기록'), t('정규리그 기록만 합산했습니다(포스트시즌 제외). 승점은 승 3점, 무 1점으로 환산했습니다. 연고 이전과 팀명 변경은 같은 구단으로 이었습니다.'),
        `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('구단')}</th><th>${t('시즌 수')}</th><th>${t('경기')}</th><th>${t('승')}</th><th>${t('무')}</th><th>${t('패')}</th><th>${t('득점')}</th><th>${t('실점')}</th><th>${t('득실')}</th><th>${t('승점')}</th><th>${t('경기당 승점')}</th><th>${t('정규리그 1위')}</th><th>${t('챔피언결정전 우승')}</th></tr></thead>
        <tbody>${clubs.map((c) => `<tr${NOW[c.club] && c.active ? ` class="click" data-href="${U.tHref(NOW[c.club])}"` : ''}><td class="l"><span class="tl">${c.active ? lg(c.club) : ''}<span class="name" title="${clubNow(c)}">${clubNow(c)}</span></span></td><td>${c.seasons}</td><td>${c.p}</td><td>${c.w}</td><td>${c.d}</td><td>${c.l}</td><td>${c.gf}</td><td>${c.ga}</td><td>${U.sgn(c.gf - c.ga)}</td><td class="strong">${c.pts}</td><td>${U.f2(c.pts / c.p)}</td><td>${(firsts[c.club] || []).length}</td><td>${(champs[c.club] || []).length}</td></tr>`).join('')}</tbody></table></div>`, wikiSrc())}
      ${U.card(t('{y}시즌 정규리그 순위', { y: S.hYear }), se.done ? (se.src === 'wiki' ? t('위키백과 자료이며 공식 자료와 대조하지 않았습니다. 이 시즌은 경기 데이터가 없습니다.') : t('연맹 경기 결과로 계산한 순위입니다.')) : t('진행 중인 시즌입니다.'),
        `<div class="scroll"><table class="stick"><thead><tr><th>${t('순위')}</th><th class="l">${t('팀')}</th><th>${t('경기')}</th><th>${t('승점')}</th><th>${t('승')}</th><th>${t('무')}</th><th>${t('패')}</th><th>${t('득점')}</th><th>${t('실점')}</th><th>${t('득실')}</th></tr></thead>
        <tbody>${se.table.map((r) => `<tr><td>${r.rank}</td><td class="l"><span class="tl">${lg(r.club, S.hYear)}<span class="name">${club(r.club, S.hYear)}</span></span>${se.champion === r.club ? ` <span class="tag good">${t('챔피언결정전 우승')}</span>` : ''}</td><td>${r.p}</td><td class="strong">${r.pts}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${U.sgn(r.gf - r.ga)}</td></tr>`).join('')}</tbody></table></div>`,
        `<span class="bar"><select data-bind="hYear" aria-label="${t('시즌 선택')}">${[...ys].reverse().map((y) => `<option value="${y}" ${String(y) === String(S.hYear) ? 'selected' : ''}>${t('{y}시즌', { y })}</option>`).join('')}</select>${se.src === 'wiki' ? U.src(t('위키백과')) : U.src()}</span>`)}
      <p class="foot">${t('한국어 화면의 과거 팀명은 연고 이전 시기를 대략 구분한 것이라 실제 명칭 변경 시점과 한 시즌 정도 다를 수 있습니다. 챔피언결정전 준우승 기록은 자료가 없어 표시하지 않습니다.')}</p>`;
  };

  WK.pages.about = function (B) {
    const row = (a, b) => `<tr><td class="l" style="white-space:normal;vertical-align:top;padding-top:10px;font-weight:500;width:26%;min-width:96px">${t(a)}</td><td class="l" style="white-space:normal;height:auto;padding:10px">${t(b)}</td></tr>`;
    const off = B.s.official || [], same = off.length && off.every((o) => { const r = B.rank[o.team]; return r && r.p === o.played && r.w === o.won && r.d === o.drawn && r.l === o.lost && r.gf === o.gf && r.ga === o.ga && r.pts === o.points; });
    return `<h1>${t('용어·출처')}</h1><p class="lead">${t('이 사이트의 기록이 어디서 왔고 어떻게 계산했는지 설명합니다.')}</p>
      ${U.card(t('용어 풀이'), '', `<table><tbody>
        ${row('출전', '실제로 뛴 경기(출전 시간이 0분보다 큰 경기)만 셉니다. 연맹 사이트는 명단에 든 경기를 모두 세므로 그보다 적게 나올 수 있습니다.')}
        ${row('공격P', '득점과 도움을 더한 값입니다.')}
        ${row('90분당 기록', '기록을 출전 시간으로 나눈 뒤 90을 곱한 값입니다. 출전 시간에는 추가시간이 포함됩니다.')}
        ${row('득점률', '득점을 슈팅 수로 나눈 값입니다. 팀 지표의 슈팅 대비 득점률도 같은 방식입니다.')}
        ${row('자책골', '어느 선수의 득점에도 넣지 않고, 경기 점수와 팀 득점에만 반영합니다.')}
        ${row('포지션 내 위치', '같은 포지션에서 일정 시간 이상 출전한 선수들 가운데 몇 번째인지를 백분율로 나타낸 값입니다.')}
        ${row('정규리그 1위 확정', '다른 모든 팀이 남은 경기를 다 이겨도 1위 팀의 승점에 미치지 못할 때 표시합니다.')}
        ${row('정규리그 1위와 챔피언결정전 우승', '정규리그 순위표의 1위와, 포스트시즌 챔피언결정전의 승자를 구분해 적습니다.')}
        ${row('예측', '실제 기록이 아니라 모형이 계산한 추정치입니다. 계산 방법과 검증 결과는 예측 페이지에 있습니다.')}
      </tbody></table>`)}
      ${U.card(t('자료 출처'), '', `<table><tbody>
        ${row('경기·선수 기록', '한국여자축구연맹(KWFF) 홈페이지의 일정·결과와 경기별 기록을 수집했습니다. 선수 사진과 구단 로고, 영어 선수 이름도 같은 곳의 자료입니다.')}
        ${row('2009~2024시즌 순위', '영어 위키백과의 WK리그 시즌 문서(CC BY-SA 4.0)에서 최종 순위표와 우승팀을 가져왔습니다.')}
        ${row('선수단 변화와 사건', '뉴스 보도, WK League News, 위키백과, 연맹 보도자료를 사람이 정리했습니다. 항목마다 출처 링크가 있습니다.')}
        ${row('일본어 선수 이름', '공식 표기가 없어 한글 발음을 가타카나로 자동 변환했습니다. 외국인 선수는 영문 이름을 보고 옮겼습니다.')}
      </tbody></table>`)}
      ${U.card(t('시즌별 제공 범위'), '', `<div class="scroll"><table><thead><tr><th class="l">${t('시즌')}</th><th class="l">${t('순위표')}</th><th class="l">${t('경기 결과')}</th><th class="l">${t('선수·슈팅 기록')}</th></tr></thead><tbody>
        <tr><td class="l">2026</td><td class="l">${t('있음 (공식 순위표와 일치)')}</td><td class="l">${t('있음')}</td><td class="l">${t('있음')}</td></tr>
        <tr><td class="l">2025</td><td class="l">${t('있음 (공식 순위표와 일치)')}</td><td class="l">${t('점수만')}</td><td class="l">${t('없음')}</td></tr>
        <tr><td class="l">2009~2024</td><td class="l">${t('있음 (위키백과, 대조하지 않음)')}</td><td class="l">${t('없음')}</td><td class="l">${t('없음')}</td></tr></tbody></table></div>`)}
      ${U.card(t('검증과 알려진 한계'), '', `<ul class="notes">
        <li>${same ? t('{y}시즌 경기 결과로 계산한 순위표가 수집 시점의 연맹 공식 순위표와 모든 팀에서 일치합니다.', { y: B.year }) : t('{y}시즌은 연맹 공식 순위표와 대조한 결과가 없거나 일치하지 않습니다.', { y: B.year })}</li>
        <li>${t('2026시즌은 경기마다 선수 득점과 자책골의 합이 점수와 일치하고, 공식 선수 순위 상위 30명의 득점·도움·슈팅이 일치합니다.')}</li>
        <li>${t('출전 시간은 공식 집계와 선수에 따라 몇 분에서 수십 분까지 차이가 납니다. 원인은 확인하지 못했습니다.')}</li>
        <li>${t('같은 팀에 이름이 같고 등번호가 다른 기록이 있으면 서로 다른 선수로 처리합니다. 실제로 같은 선수인지는 확인하지 못했습니다.')}</li>
        <li>${t('순위 결정 규칙(승점 → 득실차 → 다득점)과 포스트시즌 방식은 연맹 규정으로 확인하지 못했습니다.')}</li>
        <li>${t('골키퍼 선방, 패스, 기대 득점(xG), 슈팅 위치, 선수 신상 정보는 공개 자료가 없어 제공하지 않습니다.')}</li>
        <li>${t('영어·일본어 문구와 팀 이름 표기는 원어민 검수를 받지 않았습니다.')}</li></ul>`, '')}`;
  };
})();
