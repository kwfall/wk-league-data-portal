// 예측 페이지: 최종 순위 확률, 남은 경기 예측, 검증 결과, 계산 방법
(function () {
  const WK = window.WK, U = WK.ui, t = WK.t;
  const pct0 = (p) => (p < 0.005 ? (p > 0 ? t('1% 미만') : '') : Math.round(p * 100) + '%');
  const shade = (p) => (p < 0.005 ? '' : p < 0.05 ? 'q1' : p < 0.2 ? 'q2' : p < 0.45 ? 'q3' : p < 0.75 ? 'q4' : 'q5');

  // 예정 경기 한 줄에 붙이는 예측 막대 (일정·결과, 홈에서도 사용)
  U.probBar = function (f) {
    return `<span class="prob" data-tip="${U.esc(t('예상 득점 {a} : {b}', { a: U.f2(f.lh), b: U.f2(f.la) }))}"><b class="ph" style="width:${f.pH * 100}%"></b><b class="pd" style="width:${f.pD * 100}%"></b><b class="pa" style="width:${f.pA * 100}%"></b></span>
      <span class="probtxt"><span>${t('홈 승')} ${pct0(f.pH)}</span><span>${t('예측')} · ${t('무승부')} ${pct0(f.pD)}</span><span>${t('원정 승')} ${pct0(f.pA)}</span></span>`;
  };

  function backtestCard(B) {
    const rows = WK.seasons.map((y) => ({ y, bt: WK.backtest(WK.season(y)) })).filter((x) => x.bt);
    if (!rows.length) return '';
    const pc = (a, n) => U.pct(a / n);
    const cur = WK.backtest(B) || rows[0].bt, used = cur.bH2h < cur.bPlain;
    return U.card(t('검증 결과'), t('각 경기를 그 이전 경기 기록만으로 예측해 본 뒤 실제 결과와 비교했습니다. 시즌 초반(팀당 평균 6경기 이전)은 제외했습니다.'),
      `<div class="scroll"><table><thead><tr><th class="l">${t('시즌')}</th><th>${t('검증 경기')}</th><th>${t('순위 높은 팀 찍기')}</th><th>${t('이 모형')}</th><th>${t('상대 전적 보정 추가')}</th><th>${t('오차: 이 모형')}</th><th>${t('오차: 보정 추가')}</th><th>${t('오차: 무작위')}</th></tr></thead>
        <tbody>${rows.map(({ y, bt }) => `<tr><td class="l">${t('{y}시즌', { y })}</td><td>${bt.n}</td><td>${pc(bt.base, bt.n)}</td><td class="strong">${pc(bt.plain, bt.n)}</td><td>${pc(bt.h2h, bt.n)}</td><td class="strong">${bt.bPlain.toFixed(3)}</td><td>${bt.bH2h.toFixed(3)}</td><td>${bt.bUniform.toFixed(3)}</td></tr>`).join('')}</tbody></table></div>
       <p class="foot"><b>${t('읽는 법')}</b> ${t('가운데 세 열은 승·무·패 가운데 가장 확률이 높은 결과가 실제와 맞은 비율입니다. 오차는 확률 예측이 실제와 얼마나 벗어났는지를 나타내며(브라이어 점수) 작을수록 좋습니다. 세 결과에 똑같이 1/3씩 준 무작위 예측이 0.667입니다.')}<br>
       <b>${t('상대 전적 보정')}</b> ${used ? t('이번 시즌 검증에서 오차를 줄여 예측에 반영했습니다.') : t('맞대결 득실차를 예상 득점에 더하는 보정을 시험했지만 오차가 줄지 않아 예측에는 쓰지 않았습니다. 한 시즌 맞대결이 3경기 안팎이라 표본이 작기 때문으로 보입니다.')}<br>
       <b>${t('한계')}</b> ${t('이 모형과 단순한 방법의 적중률 차이는 위 표의 수치 그대로입니다. 부상, 이적, 대표팀 차출, 최근 흐름, 일정 간격은 반영하지 못합니다.')}</p>`);
  }

  WK.pages.predict = function (B) {
    const P = WK.predict(B);
    if (!P) return `<h1>${t('예측')}</h1><div class="card"><p class="notice" style="margin:0">${B.upcoming.length ? t('예측하기에는 종료된 경기가 부족합니다.') : t('{y}시즌 정규리그는 끝나 예측할 경기가 없습니다. 아래는 이 모형을 지난 경기에 적용해 본 검증 결과입니다.', { y: B.year })}</p></div>${backtestCard(B)}`;
    const n = B.teams.length, rows = [...B.table].sort((a, b) => P.teams[b.team].expPts - P.teams[a.team].expPts);
    return `<h1>${t('예측')}</h1><p class="lead">${t('남은 {n}경기를 {N}번 모의실험한 결과입니다.', { n: B.upcoming.length, N: P.N.toLocaleString() })}</p>
      <p class="notice" style="margin:0 0 16px">${t('이 페이지의 수치는 실제 기록이 아니라 모형이 계산한 추정치입니다. 계산 방법과 검증 결과는 아래에 있습니다.')}</p>
      ${U.card(t('최종 순위 확률'), t('칸의 숫자는 그 순위로 정규리그를 마칠 확률입니다. 파란색이 강할수록 확률이 높습니다. 빈칸은 {N}번의 모의실험에서 한 번도 나오지 않은 순위이고, 1% 미만으로 표시된 칸은 0%보다 크고 0.5%보다 작은 경우입니다.', { N: P.N.toLocaleString() }),
        `<div class="scroll"><table class="stick heat"><thead><tr><th class="l">${t('팀')}</th><th>${t('승점')}</th><th>${t('남은 경기')}</th><th>${t('예상 최종 승점')}</th>${Array.from({ length: n }, (_, i) => `<th class="c">${t('{n}위', { n: i + 1 })}</th>`).join('')}<th>${t('3위 이내')}</th></tr></thead>
        <tbody>${rows.map((r) => { const x = P.teams[r.team]; return `<tr><td class="l">${U.team(B, r.team)}</td><td>${r.pts}</td><td>${x.left}</td><td class="strong">${U.f1(x.expPts)}</td>${x.rankP.map((p) => `<td class="c hc"><span class="${shade(p)}">${pct0(p)}</span></td>`).join('')}<td class="strong">${pct0(x.top3) || '0%'}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="foot">${t('1위는 챔피언결정전 직행, 2~3위는 플레이오프를 치르는 방식을 기준으로 3위 이내 확률을 함께 적었습니다. 대회 규정은 확인이 필요합니다.')}</p>`, U.src(t('한국여자축구연맹(KWFF) 기록 기반 추정')))}
      <div class="two">
        ${U.card(t('남은 경기 예측'), t('파랑은 홈 승, 회색은 무승부, 주황은 원정 승 확률입니다.'), P.fixtures.map((f) => U.matchRow(f.m)).join(''), U.src(t('한국여자축구연맹(KWFF) 기록 기반 추정')))}
        ${U.card(t('팀별 기대 득점과 실점'), t('리그 평균 수준의 상대와 맞붙을 때 한 경기에서 기대되는 득점과 실점입니다.'),
          `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('팀')}</th><th>${t('기대 득점')}</th><th>${t('기대 실점')}</th><th>${t('차이')}</th></tr></thead><tbody>${[...B.teams].sort((a, b) => (P.teams[b].xgf - P.teams[b].xga) - (P.teams[a].xgf - P.teams[a].xga)).map((tm) => `<tr><td class="l">${U.team(B, tm)}</td><td>${U.f2(P.teams[tm].xgf)}</td><td>${U.f2(P.teams[tm].xga)}</td><td>${(P.teams[tm].xgf - P.teams[tm].xga > 0 ? '+' : '') + U.f2(P.teams[tm].xgf - P.teams[tm].xga)}</td></tr>`).join('')}</tbody></table></div>
          <p class="foot">${t('실제 득점·실점에 리그 평균 수준의 6경기를 더해 계산한 값이라 팀 페이지의 실제 경기당 기록과 다릅니다.')}</p>`, U.src(t('한국여자축구연맹(KWFF) 기록 기반 추정')))}
      </div>
      ${backtestCard(B)}
      ${U.card(t('계산 방법'), '', `<ol class="notes">
        <li>${t('팀마다 경기당 득점과 실점을 리그 평균과 비교해 공격 지수와 수비 지수를 만듭니다. 경기 수가 적을 때 과신하지 않도록 6경기 분량만큼 평균 쪽으로 당깁니다.')}</li>
        <li>${t('두 팀의 지수에 이번 시즌 홈팀 평균 득점({h})과 원정팀 평균 득점({a})을 곱해 그 경기의 예상 득점을 구합니다.', { h: U.f2(P.muH), a: U.f2(P.muA) })}</li>
        <li>${t('예상 득점을 평균으로 하는 포아송 분포로 승·무·패 확률을 계산합니다.')}</li>
        <li>${t('같은 분포에서 점수를 뽑아 남은 일정을 {N}번 반복하고, 승점 → 득실차 → 다득점 순으로 최종 순위를 매겨 순위별 확률을 셉니다.', { N: P.N.toLocaleString() })}</li></ol>`, '')}`;
  };
})();
