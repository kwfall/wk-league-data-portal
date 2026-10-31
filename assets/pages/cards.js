// 인스타그램 계정 안내 상자
(function () {
  const WK = window.WK, U = WK.ui, t = WK.t;
  const IG = { handle: 'kwf.all', url: 'https://www.instagram.com/kwf.all/', qr: 'assets/instagram-qr.webp' };
  WK.IG = IG;

  // 인스타그램 계정 안내 상자 (홈에서 쓴다)
  U.igCard = (compact) => `<section class="card ig${compact ? ' compact' : ''}"><a href="${IG.url}" target="_blank" rel="noopener" aria-label="${t('인스타그램 계정으로 이동')}"><img class="qr" src="${IG.qr}" alt="${t('인스타그램 QR 코드')}"></a>
      <div><h2>${t('인스타그램')} @${IG.handle}</h2><p class="desc" style="margin:6px 0 14px">${t('카드뉴스, 경기 결과, 일정을 올리는 한국 여자축구 계정입니다. QR 코드를 휴대폰 카메라로 비추거나 아래 버튼을 누르면 계정으로 이동합니다.')}</p>
      <a class="btn" href="${IG.url}" target="_blank" rel="noopener">${t('인스타그램에서 보기')}</a></div></section>`;

})();
