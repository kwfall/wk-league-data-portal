// 해외파: 해외 리그 구단에 소속된 한국 선수 (위키백과에 기록이 있는 선수 기준)
(function () {
  const WK = window.WK, U = WK.ui, S = WK.state, t = WK.t;
  const N = window.WK_ABROAD_NAMES, NAT = N.nat, CLUB = N.club, LEAGUE = N.league, WKCLUB = N.wk;
  const MON = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };

  const li = () => (WK.lang === 'ko' ? 0 : WK.lang === 'en' ? 1 : 2), lk = () => ['ko', 'en', 'ja'][li()];
  // 나라: 대표팀 문서의 나라 코드가 있으면 그것을, 없으면 위키데이터의 구단 소재 나라를 쓴다
  const natOf = (p) => { if (p.nat && NAT[p.nat]) return NAT[p.nat]; const c = p.country; if (!c) return null; const en = N.alias[c.en] || c.en; return Object.values(NAT).find((x) => x[1] === en) || [c.ko || en, en, c.ja || en]; };
  const natKey = (p) => (natOf(p) || ['', ''])[1];
  const nat = (p) => { const n = natOf(p); return n ? U.esc(n[li()]) : `<span class="mut">${t('자료 없음')}</span>`; };
  const pick = (map, names, raw) => (WK.lang === 'ko' ? map[raw] || (names && names.ko) : WK.lang === 'ja' ? names && names.ja : null) || raw;
  const club = (p) => U.esc(pick(CLUB, p.clubNames, p.club));
  const league = (p) => (p.league ? U.esc(pick(LEAGUE, p.leagueNames, p.league)) : `<span class="mut">${t('자료 없음')}</span>`);
  const name = (p) => U.esc(WK.lang === 'ko' ? p.ko || p.en : WK.lang === 'ja' ? p.ja || p.en : p.en);
  const day = (s) => { const m = (s || '').match(/(\d{1,2}) ([A-Z][a-z]+) (\d{4})/); return m && MON[m[2]] ? `${m[3]}.${String(MON[m[2]]).padStart(2, '0')}.${m[1].padStart(2, '0')}` : null; };
  const age = (born) => { if (!born) return null; const b = new Date(born + 'T00:00'), n = new Date(); return n.getFullYear() - b.getFullYear() - (n < new Date(n.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0); };
  const called = (p) => (!p.nt ? '–' : p.current ? t('현재 명단') : day(p.latest) || U.esc(p.latest || '') || '–');
  const wk = (c) => (WKCLUB.find(([re]) => re.test(c)) || [])[1];
  const href = (p) => `#/abroad/${encodeURIComponent(p.page || p.en)}`;
  const src = (A) => { const d = new Date(A.updated), z = (n) => String(n).padStart(2, '0'); return `<span class="src">${t('{when} 기준 · 출처 {who}', { when: `${d.getFullYear()}.${z(d.getMonth() + 1)}.${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`, who: t('영어 위키백과 (CC BY-SA 4.0)') })}</span>`; };

  U.abroadSrc = () => src(window.WK_ABROAD);
  // 홈에서 쓰는 짧은 목록
  U.abroadTop = (n = 5) => { const A = window.WK_ABROAD; return A ? A.players.slice().sort((a, b) => (b.caps ?? -1) - (a.caps ?? -1)).slice(0, n).map((p) => ({ href: href(p), name: name(p), club: club(p), nat: nat(p) })) : []; };

  function list(B, A) {
    const q = (S.aQ || '').trim().toLowerCase(), all = A.players;
    const hay = (p) => [p.ko, p.en, p.ja, p.club, CLUB[p.club], p.clubNames && p.clubNames.ko, p.league, LEAGUE[p.league], p.leagueNames && p.leagueNames.ko, ...(natOf(p) || [])];
    const rows = all.filter((p) => (!S.aNat || natKey(p) === S.aNat) && (!S.aPos || p.pos === S.aPos) && (S.aNt !== '1' || p.nt) && (!q || hay(p).some((x) => x && x.toLowerCase().includes(q))))
      .sort((a, b) => (b.caps ?? -1) - (a.caps ?? -1));
    const nats = [...new Map(all.filter(natOf).map((p) => [natKey(p), natOf(p)[li()]])).entries()].sort((a, b) => a[1].localeCompare(b[1], lk()));
    const byNat = nats.map(([k, label]) => [label, all.filter((p) => natKey(p) === k).length]).sort((a, b) => b[1] - a[1]), max = byNat[0][1];
    const asOf = day(A.capsAsOf);
    return `<h1>${t('해외파')}</h1><p class="lead">${t('해외 리그 구단에 소속된 한국 선수 · 위키백과에 기록이 있는 선수 기준')}</p>
      <div class="tiles">${U.tile(t('선수 수'), all.length)}${U.tile(t('나라 수'), nats.length)}${U.tile(t('구단 수'), new Set(all.map((p) => p.club)).size)}</div>
      ${U.card(t('선수 찾기'), t('이름, 구단, 리그, 나라로 찾을 수 있습니다. 줄을 누르면 경력을 볼 수 있습니다.') + (asOf ? ' ' + t('A매치 기록은 {d} 기준입니다.', { d: asOf }) : ''),
        `<div class="bar" style="margin-bottom:12px">
          <select data-bind="aNat" aria-label="${t('나라 선택')}"><option value="">${t('전체 나라')}</option>${nats.map(([k, label]) => `<option value="${U.esc(k)}" ${k === S.aNat ? 'selected' : ''}>${U.esc(label)}</option>`).join('')}</select>
          <select data-bind="aPos" aria-label="${t('포지션 선택')}"><option value="">${t('전체 포지션')}</option>${['FW', 'MF', 'DF', 'GK'].map((x) => `<option ${x === S.aPos ? 'selected' : ''}>${x}</option>`).join('')}</select>
          <input type="search" data-live="aQ" value="${U.esc(S.aQ || '')}" placeholder="${t('이름·구단·리그 검색')}" aria-label="${t('이름·구단·리그 검색')}" style="width:190px">
          <button class="btn${S.aNt === '1' ? ' on' : ''}" data-toggle="aNt:1" aria-pressed="${S.aNt === '1'}">${t('최근 12개월 대표팀 소집 선수만')}</button>
        </div>
        ${rows.length ? `<div class="scroll"><table class="stick"><thead><tr><th class="l">${t('선수')}</th><th class="l">${t('포지션')}</th><th>${t('나이')}</th><th class="l">${t('구단')}</th><th class="l">${t('리그')}</th><th class="l">${t('나라')}</th><th>${t('A매치')}</th><th>${t('A매치 골')}</th><th class="l">${t('대표팀 소집')}</th></tr></thead>
          <tbody>${rows.map((p) => `<tr data-href="${href(p)}"><td class="l"><a class="name" href="${href(p)}">${name(p)}</a></td><td class="l">${p.pos || '–'}</td><td>${age(p.born) ?? '–'}</td><td class="l" title="${U.esc(p.club)}">${club(p)}</td><td class="l">${league(p)}</td><td class="l">${nat(p)}</td><td>${p.caps ?? '–'}</td><td>${p.goals ?? '–'}</td><td class="l">${called(p)}</td></tr>`).join('')}</tbody></table></div>
          <p class="foot" style="margin-bottom:0">${t('대표팀에 소집되지 않은 선수의 A매치 기록은 선수 문서에 적힌 값이라 기준 시점이 다릅니다.')}</p>`
          : `<p class="notice" style="margin:0">${t('조건에 맞는 선수가 없습니다.')}</p>`}`, src(A))}
      ${U.card(t('나라별 선수 수'), '', `<div class="bars">${byNat.map(([label, n]) => `<span class="name">${U.esc(label)}</span><div class="track"><div class="bar" style="width:${(n / max) * 100}%"></div></div><div class="val">${n}</div>`).join('')}</div>`, src(A))}
      <p class="foot">${t('이 목록은 두 가지에서 모았습니다. ① 영어 위키백과 대한민국 여자 대표팀 문서의 현재 명단과 최근 12개월 소집 명단 중 해외 구단 소속 선수. ② 영어 위키백과에 문서가 있는 한국 여자 선수 중 현재 구단이 해외로 적힌 선수. 위키백과에 문서가 없고 대표팀에도 소집되지 않은 해외파 선수는 빠져 있습니다. 위키백과는 누구나 고칠 수 있어 실제와 다르거나 늦게 반영될 수 있습니다.')}</p>`;
  }

  function detail(B, A, p) {
    const here = Object.keys(B.playerByKey || {}).filter((k) => k.split('|')[1] === p.ko && p.career.some((c) => wk(c.club) === k.split('|')[0]));
    const other = (c) => { const base = c.replace(/^→ | \(loan\)$/g, ''), ko = WK.lang === 'ko' && CLUB[base]; return U.esc((ko ? c.replace(base, ko) : c).replace('(loan)', `(${t('임대')})`)); };
    const row = (c) => { const tm = wk(c.club); return `<tr><td class="l" style="font-family:var(--mono)">${U.esc(c.years)}</td><td class="l">${tm ? `<a class="tl" href="${U.tHref(tm)}">${U.logo(tm, 20)}<span class="name">${U.tname(tm)}</span></a> <span class="tag">WK</span>` : other(c.club)}</td><td>${c.caps ?? '–'}</td><td>${c.goals ?? '–'}</td></tr>`; };
    const capsNote = p.nt ? (day(A.capsAsOf) ? t('A매치 기록은 {d} 기준입니다.', { d: day(A.capsAsOf) }) : '') : t('A매치 기록은 선수 문서에 적힌 값입니다.') + (p.capsAsOf ? ' ' + t('문서에 적힌 갱신 시점: {d}', { d: U.esc(day(p.capsAsOf) || p.capsAsOf) }) : '');
    return `<p class="crumb"><a class="link" href="#/abroad">← ${t('해외파')}</a></p>
      <div class="abhead"><div><h1>${name(p)}${WK.lang !== 'en' && name(p) !== U.esc(p.en) ? ` <span class="mut" style="font-size:.6em;font-weight:400">${U.esc(p.en)}</span>` : ''}</h1>
      <p class="lead">${[p.pos, p.number && t('{n}번', { n: U.esc(p.number) }), `<span title="${U.esc(p.club)}">${club(p)}</span>`, league(p), nat(p)].filter(Boolean).join(' · ')}</p></div></div>
      <div class="tiles">${U.tile(t('나이'), age(p.born) ?? '–', p.born ? p.born.replace(/-/g, '.') : '')}${U.tile(t('A매치'), p.caps ?? '–', (p.goals == null ? '' : t('{g}골', { g: p.goals }) + ' · ') + capsNote)}${U.tile(t('대표팀 소집'), p.nt ? called(p) : '–', p.nt ? '' : t('최근 12개월 소집 없음'))}</div>
      ${U.card(t('구단 경력'), t('리그 경기 수와 골입니다. 위키백과 선수 문서의 경력 표를 그대로 옮겼습니다.') + (p.careerAsOf ? ' ' + t('문서에 적힌 갱신 시점: {d}', { d: U.esc(day(p.careerAsOf) || p.careerAsOf) }) : ''),
        p.career.length ? `<div class="scroll"><table><thead><tr><th class="l">${t('기간')}</th><th class="l">${t('구단')}</th><th>${t('경기')}</th><th>${t('골')}</th></tr></thead><tbody>${p.career.map(row).join('')}</tbody></table></div>
          <p class="foot" style="margin-bottom:0">${t('경력 표가 현재 소속보다 늦게 고쳐진 경우가 있어, 맨 아래 줄이 위의 현재 구단과 다를 수 있습니다.')}</p>`
          : `<p class="notice" style="margin:0">${t('위키백과에 이 선수의 경력 표가 없습니다.')}</p>`, src(A))}
      ${here.length ? `<p class="more"><a class="link" href="${U.pHref(here[0])}">${t('{y} WK리그 기록 보기', { y: B.year })} →</a></p>` : ''}
      <p class="foot">${[p.src && `<a class="link" href="${U.esc(p.src)}" target="_blank" rel="noopener">${t('위키백과 선수 문서')}</a>`, p.clubSrc && `<a class="link" href="${U.esc(p.clubSrc)}" target="_blank" rel="noopener">${t('위키백과 구단 문서')}</a>`, `<a class="link" href="${U.esc(A.source)}" target="_blank" rel="noopener">${t('위키백과 대표팀 문서')}</a>`].filter(Boolean).join(' · ')}</p>`;
  }

  WK.pages.abroad = function (B, arg) {
    const A = window.WK_ABROAD;
    if (!A || !A.players.length) return `<h1>${t('해외파')}</h1><div class="card"><p class="notice" style="margin:0">${t('해외파 선수 자료가 없습니다. 데이터를 다시 수집해 주세요.')}</p></div>`;
    const p = arg && A.players.find((x) => (x.page || x.en) === arg);
    return p ? detail(B, A, p) : list(B, A);
  };
})();
