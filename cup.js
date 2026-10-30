// 2026 W코리아컵 — 사람이 직접 정리하는 자료 (연맹 경기 기록에 없는 대회라 기사에서 옮겼다)
// 경기가 끝나면 해당 줄에 hs(홈 점수), as(원정 점수)를 넣고, 연장·승부차기가 있었으면 note에 적는다.
//   round: '1R' | 'QF'(8강) | 'SF'(4강) | 'F'(결승), date: 날짜, time: 시각(모르면 null), home·away: 팀 이름
//   WK리그 팀은 이 사이트의 팀 이름 그대로 쓴다(로고와 팀 화면이 이어진다). 대학 팀은 기사 표기를 쓴다.
//   winner: 이긴 팀은 확인했지만 스코어를 못 찾았을 때 이긴 팀 이름
//   bye: 경기 없이 올라간 경우의 설명, src: 출처 번호(아래 sources)
// 출처가 없는 내용은 넣지 않는다. 기사에 없는 값(시각, 경기장 등)은 null 로 둔다.
window.WK_CUP = {
  season: 2026, name: 'W코리아컵', checked: '2026-10-29',
  about: { host: '대한축구협회 · 경기도축구협회 공동 주최, 경기도 후원', teams: 'WK리그 8개 팀 + 대학 7개 팀, 단판 토너먼트 (올해 처음 열리는 시범 대회)', venue: '모든 경기 경기도 이천', tv: "유튜브 'KFATV_LIVE'", prize: '우승 상금 3,000만 원' },
  sources: [
    { by: '스포츠투데이 (네이트 스포츠)', title: "W코리아컵 개막…'지소연 골' 수원FC 위민 등 7팀 2라운드 진출", url: 'https://sports.news.nate.com/view/20260624n38907' },
    { by: '베스트일레븐 (네이트 스포츠)', title: '수원FC 위민, 화천 KSPO에 3-1 역전승→ W코리아컵 4강 막차', url: 'https://m.news.nate.com/view/20260825n35128' },
    { by: '스타뉴스', title: "W코리아컵 4강 '수원FC vs 서울시청, 현대제철 vs 스포츠토토' 대진 확정", url: 'https://www.starnewskorea.com/sports/2026/09/11/2026091117241447216' },
    { by: '미디어펜', title: 'W코리아컵 준결승 11일 개최…서울시청-수원FC, 현대제철-스포츠토토', url: 'https://www.mediapen.com/news/view/1128938' },
    { by: '스포츠조선', title: '수원FC위민, 서울시청에 5대0 대승! W코리아컵 첫 결승 안착 (2026.10.11)', url: 'https://news.google.com/search?q=%EC%88%98%EC%9B%90FC%EC%9C%84%EB%AF%BC%20%EC%84%9C%EC%9A%B8%EC%8B%9C%EC%B2%AD%205%EB%8C%800&hl=ko&gl=KR&ceid=KR:ko' },
    { by: 'SBS 뉴스', title: 'W코리아컵 초대 챔피언은?…수원FC-스포츠토토, 11월 21일 결승 격돌 (2026.10.11)', url: 'https://news.google.com/search?q=W%EC%BD%94%EB%A6%AC%EC%95%84%EC%BB%B5%20%EA%B2%B0%EC%8A%B9%20%EC%88%98%EC%9B%90FC%20%EC%8A%A4%ED%8F%AC%EC%B8%A0%ED%86%A0%ED%86%A0&hl=ko&gl=KR&ceid=KR:ko' },
  ],
  matches: [
    { round: '1R', date: '2026-06-23', time: '19:00', venue: '이천종합운동장', home: '수원FC위민', away: '경주한수원WFC', hs: 2, as: 0, note: '득점: 아야카, 지소연', src: 0 },
    { round: '1R', date: '2026-06-23', time: null, venue: null, home: '울산과학대', away: '단국대', hs: 2, as: 1, src: 0 },
    { round: '1R', date: '2026-06-23', time: null, venue: null, home: '위덕대', away: '대덕대', hs: 2, as: 0, src: 0 },
    { round: '1R', date: '2026-06-24', time: null, venue: null, home: '서울시청', away: '고려대', hs: 2, as: 1, note: '연장', src: 0 },
    { round: '1R', date: '2026-06-24', time: null, venue: null, home: '인천현대제철', away: '대경대', hs: 4, as: 0, src: 0 },
    { round: '1R', date: '2026-06-24', time: null, venue: null, home: '세종스포츠토토', away: '강원도립대', hs: 6, as: 0, src: 0 },
    { round: '1R', date: '2026-06-24', time: null, venue: null, home: '상무여자축구단', away: '강진SWANSWFC', hs: 2, as: 0, src: 0 },
    { round: '1R', date: null, home: '화천KSPO', away: null, bye: '지난 시즌 WK리그 우승팀으로 8강부터 참가', src: 0 },
    { round: 'QF', date: '2026-08-24', time: null, venue: null, home: '인천현대제철', away: '상무여자축구단', hs: 2, as: 1, src: 1 },
    { round: 'QF', date: null, time: null, venue: null, home: '위덕대', away: '세종스포츠토토', hs: 0, as: 6, note: '8월 24~25일 중 열림', src: 1 },
    { round: 'QF', date: '2026-08-25', time: null, venue: '이천종합운동장', home: '수원FC위민', away: '화천KSPO', hs: 3, as: 1, note: '득점: 윤수정, 이수인, 지소연 / 최정민', src: 1 },
    { round: 'QF', date: null, home: '서울시청', away: '울산과학대', bye: '울산과학대의 경기 포기로 서울시청 부전승', src: 1 },
    { round: 'SF', date: '2026-10-11', time: '15:00', venue: '이천종합운동장', home: '서울시청', away: '수원FC위민', hs: 0, as: 5, src: 4 },
    { round: 'SF', date: '2026-10-11', time: '19:00', venue: '이천종합운동장', home: '인천현대제철', away: '세종스포츠토토', hs: null, as: null, winner: '세종스포츠토토', note: '스코어 확인 필요', src: 5 },
    { round: 'F', date: '2026-11-21', time: null, venue: '이천종합운동장', home: '수원FC위민', away: '세종스포츠토토', hs: null, as: null, src: 5 },
  ],
};
