// 해외파 페이지에서 쓰는 나라·구단·리그의 표기 — 사람이 직접 정리하는 자료
// 새 구단이나 리그가 생기면 아래에 한 줄을 더 넣는다. 여기에 없으면 원문(영문)을 그대로 보여 준다.
//   nat: 나라 코드 → [한국어, 영어, 일본어], club·league: 위키백과 표기 → 한글 표기
//   alias: 위키데이터의 나라 이름을 위 nat의 영어 이름에 맞추는 규칙
//   wk: 경력 표의 구단 이름이 WK리그 구단일 때 이 사이트의 팀 이름으로 잇는 규칙
window.WK_ABROAD_NAMES = {
  nat: { CAN: ['캐나다', 'Canada', 'カナダ'], NOR: ['노르웨이', 'Norway', 'ノルウェー'], JPN: ['일본', 'Japan', '日本'], USA: ['미국', 'United States', 'アメリカ'], ENG: ['잉글랜드', 'England', 'イングランド'], ESP: ['스페인', 'Spain', 'スペイン'], ITA: ['이탈리아', 'Italy', 'イタリア'], TUR: ['튀르키예', 'Türkiye', 'トルコ'], NED: ['네덜란드', 'Netherlands', 'オランダ'], GER: ['독일', 'Germany', 'ドイツ'], FRA: ['프랑스', 'France', 'フランス'], SWE: ['스웨덴', 'Sweden', 'スウェーデン'], AUS: ['호주', 'Australia', 'オーストラリア'], SCO: ['스코틀랜드', 'Scotland', 'スコットランド'], CHN: ['중국', 'China', '中国'], MAS: ['말레이시아', 'Malaysia', 'マレーシア'] },
  club: { 'Ottawa Rapid': '오타와 래피드', 'Stabæk': '스타베크', 'Bunnys Gunma': '바니스 군마', 'Brooklyn FC': '브루클린 FC', 'Birmingham City': '버밍엄 시티', Molde: '몰데', 'Deportivo Alavés': '데포르티보 알라베스', 'AC Milan': 'AC 밀란', Trabzonspor: '트라브존스포르', Feyenoord: '페예노르트', 'Halifax Tides FC': '핼리팩스 타이즈', Galatasaray: '갈라타사라이', 'Thonon Evian': '토농 에비앙', 'Madrid CFF': '마드리드 CFF', Selangor: '슬랑오르' },
  league: { 'Northern Super League': '노던 슈퍼 리그', Toppserien: '토프세리엔', 'Nadeshiko League Div.2': '나데시코 리그 2부', 'USL Super League': 'USL 슈퍼 리그', 'Liga F': '리가 F', 'Serie A': '세리에 A', 'Vrouwen Eredivisie': '에레디비시 여자' },
  alias: { Turkey: 'Türkiye', 'United States of America': 'United States' },
  wk: [[/Hyundai Steel|Incheon/, '인천현대제철'], [/Seoul/, '서울시청'], [/Suwon/, '수원FC위민'], [/KSPO/, '화천KSPO'], [/Sportstoto/, '세종스포츠토토'], [/Sangmu/, '상무여자축구단'], [/Hydro|KHNP/, '경주한수원WFC'], [/Changnyeong|Gangjin/, '강진SWANSWFC']],
};
