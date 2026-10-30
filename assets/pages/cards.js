// 카드뉴스 모음과 인스타그램 계정 안내
(function () {
  const WK = window.WK, U = WK.ui, t = WK.t;
  const IG = { handle: 'kwf.all', url: 'https://www.instagram.com/kwf.all/', qr: 'assets/instagram-qr.webp' };
  WK.IG = IG;

  // 인스타그램 계정 안내 상자 (홈과 카드뉴스 페이지에서 같이 쓴다)
  U.igCard = (compact) => `<section class="card ig${compact ? ' compact' : ''}"><a href="${IG.url}" target="_blank" rel="noopener" aria-label="${t('인스타그램 계정으로 이동')}"><img class="qr" src="${IG.qr}" alt="${t('인스타그램 QR 코드')}"></a>
      <div><h2>${t('인스타그램')} @${IG.handle}</h2><p class="desc" style="margin:6px 0 14px">${t('카드뉴스, 경기 결과, 일정을 올리는 한국 여자축구 계정입니다. QR 코드를 휴대폰 카메라로 비추거나 아래 버튼을 누르면 계정으로 이동합니다.')}</p>
      <a class="btn" href="${IG.url}" target="_blank" rel="noopener">${t('인스타그램에서 보기')}</a></div></section>`;

  WK.pages.cards = function () {
    const list = window.WK_CARDS || [], mine = list.filter((c) => !c.made), made = list.filter((c) => c.made);
    const grid = (arr) => `<div class="cgrid">${arr.map((c) => `<a href="${U.esc(c.src)}" target="_blank" rel="noopener" title="${U.esc(c.title)}"><img src="${U.esc(c.src)}" alt="${U.esc(c.title)}" loading="lazy"><span>${U.esc(c.title)}</span></a>`).join('')}</div>`;
    return `<h1>${t('카드뉴스')}</h1><p class="lead">${t('인스타그램 계정에 올리는 카드뉴스를 모아 둔 곳입니다. 이미지를 누르면 크게 볼 수 있습니다.')}</p>
      ${U.igCard().replace('<section class="card ig', '<section style="margin-top:0" class="card ig')}
      ${mine.length ? U.card(t('올린 카드뉴스'), t('{n}장', { n: mine.length }), grid(mine), '') : ''}
      ${made.length ? U.card(t('이 사이트의 기록으로 만든 카드'), t('{n}장 · 기록이 바뀌면 다시 만들어집니다.', { n: made.length }), grid(made), U.src()) : ''}
      ${list.length ? '' : `<div class="card empty">${t('아직 올라온 카드뉴스가 없습니다.')}</div>`}
      ${mine.length ? '' : `<p class="foot">${t('인스타그램에 올린 이미지는 자동으로 가져올 수 없습니다. cardnews 폴더에 이미지를 넣고 데이터_업데이트.bat을 실행하면 이곳에 나옵니다.')}</p>`}`;
  };
})();
