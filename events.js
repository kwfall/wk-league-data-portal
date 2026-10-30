// 시즌별 주요 변화(영입·이적·감독 교체·사건) — 사람이 직접 정리하는 자료
// 추가하려면 아래 목록에 한 줄을 더 넣으면 된다.
//   season: 영향을 주는 시즌, date: 날짜, teams: 관련 팀(한글 이름, 리그 전체 소식이면 빈 배열),
//   type: 'in'(영입) | 'out'(이적·은퇴) | 'coach'(감독) | 'league'(리그 소식),
//   ko / en / ja: 화면에 보일 문장(en·ja는 없으면 한글로 표시), src: 출처 주소, by: 출처 이름
// 출처가 없는 내용은 넣지 않는다. 아래 항목은 기사 제목과 요약을 근거로 정리했다.
window.WK_EVENTS = [
  { season: 2026, date: '2025-10-28', teams: ['경주한수원WFC'], type: 'coach', ko: '송주희 감독과 계약 종료', en: 'Parted ways with manager Song Ju-hee', ja: 'ソン・ジュヒ監督と契約終了', src: 'https://wkleaguenews.com/2025/10/28/gyeongju-khnp-seeking-new-manager/', by: 'WK League News' },
  { season: 2026, date: '2025-12-02', teams: ['경주한수원WFC'], type: 'coach', ko: '박남열 감독 선임', en: 'Park Nam-yeol appointed manager', ja: 'パク・ナミョル監督が就任', src: 'https://en.wikipedia.org/wiki/2026_WK_League', by: 'Wikipedia' },
  { season: 2026, date: '2026-01-01', teams: ['수원FC위민'], type: 'in', ko: '국가대표 공격수 최유리 영입, 이정민·박현진 합류', en: 'Signed international forward Choe Yu-ri; Lee Jeong-min and Park Hyun-jin also joined', ja: '代表FWチェ・ユリを獲得、イ・ジョンミンとパク・ヒョンジンも加入', src: 'https://sports.news.nate.com/view/20260101n14247', by: '네이트 스포츠' },
  { season: 2026, date: '2026-01-02', teams: ['수원FC위민'], type: 'in', ko: '국가대표 수비수 김혜리 영입', en: 'Signed international defender Kim Hye-ri', ja: '代表DFキム・ヘリを獲得', src: 'https://m.news.nate.com/view/20260102n22248', by: '네이트 뉴스' },
  { season: 2026, date: '2026-01-02', teams: ['경주한수원WFC'], type: 'in', ko: '홍혜지 영입', en: 'Signed Hong Hye-ji', ja: 'ホン・ヘジを獲得', src: 'https://wkleaguenews.com/2026/01/02/gyeongju-khnp-sign-hong-hyeji/', by: 'WK League News' },
  { season: 2026, date: '2026-01-06', teams: ['수원FC위민'], type: 'in', ko: '지소연 영입 (2년 만의 복귀)', en: 'Ji So-yun returned to the club after two years', ja: 'チ・ソヨンが2年ぶりに復帰', src: 'https://www.xportsnews.com/article/2097415', by: '엑스포츠뉴스' },
  { season: 2026, date: '2026-01-15', teams: ['경주한수원WFC'], type: 'in', ko: '레베카 발데즈(미국) 영입', en: 'Signed Rebekah Valdez (USA)', ja: 'レベッカ・バルデス（米国）を獲得', src: 'https://wkleaguenews.com/2026/01/15/rebeka-valdez-joins-gyeongju-khnp/', by: 'WK League News' },
  { season: 2026, date: '2026-01-23', teams: ['강진SWANSWFC'], type: 'in', ko: 'Manu Polachini(브라질) 영입', en: 'Signed Manu Polachini (Brazil)', ja: 'Manu Polachini（ブラジル）を獲得', src: 'https://wkleaguenews.com/2026/01/23/gangjin-wfc-sign-manu-polachini/', by: 'WK League News' },
  { season: 2026, date: '2026-02-25', teams: ['강진SWANSWFC'], type: 'coach', ko: '전임 감독 사임 후 고현호 감독 선임', en: 'Go Hyun-ho appointed manager after his predecessor resigned', ja: '前監督の辞任を受け、コ・ヒョノ監督が就任', src: 'https://wkleaguenews.com/2026/02/27/gangjin-swans-appoint-go-hyunho/', by: 'WK League News' },
  { season: 2026, date: '2026-02-25', teams: ['수원FC위민'], type: 'in', ko: '일본인 공격수 하루히 영입', en: 'Signed Japanese forward Haruhi Suzuki', ja: '日本人FWスズキ・ハルヒを獲得', src: 'https://en.wikipedia.org/wiki/2026_WK_League', by: 'Wikipedia' },
  { season: 2026, date: '2026-03-28', teams: ['인천현대제철'], type: 'in', ko: '잉글랜드 공격수 피오나 워츠 영입', en: 'Signed English striker Fiona Worts', ja: 'イングランド人FWフィオナ・ワーツを獲得', src: 'https://wkleaguenews.com/2026/03/28/incheon-sign-fiona-worts/', by: 'WK League News' },
  { season: 2026, date: '2026-06-17', teams: ['경주한수원WFC', '상무여자축구단', '강진SWANSWFC'], type: 'in', ko: '노진영 상무 → 경주한수원, 고다영 경주한수원 → 강진 이적', en: 'Noh Jin-young moved from Sangmu to Gyeongju KHNP; Ko Da-yeong moved from Gyeongju KHNP to Gangjin', ja: 'ノ・ジニョンが尚武から慶州韓水原へ、コ・ダヨンが慶州韓水原から康津へ移籍', src: 'https://wkleaguenews.com/2026/06/17/noh-jinyoung-ko-dayeong-transfers/', by: 'WK League News' },
  { season: 2026, date: '2026-07-02', teams: ['강진SWANSWFC'], type: 'in', ko: '강채림 WK리그 복귀, 강진 입단', en: 'Kang Chae-rim returned to the WK League and signed for Gangjin', ja: 'カン・チェリムがWKリーグに復帰し康津に加入', src: 'https://wkleaguenews.com/2026/07/02/kang-chaerim-returns-to-wk-league-signs-with-gangjin/', by: 'WK League News' },
  { season: 2026, date: '2026-07-28', teams: [], type: 'league', ko: '여름 이적시장 마감', en: 'Summer transfer window closed', ja: '夏の移籍期間が終了', src: 'https://wkleaguenews.com/2026/07/28/summer-transfer-window-closes/', by: 'WK League News' },
  { season: 2026, date: '2026-07-31', teams: ['강진SWANSWFC'], type: 'out', ko: '송재은, 튀르키예 트라브존스포르로 이적', en: 'Song Jae-eun left for Trabzonspor (Türkiye)', ja: 'ソン・ジェウンがトラブゾンスポル（トルコ）へ移籍', src: 'https://wkleaguenews.com/2026/07/31/song-jae-eun-signs-with-trabzonspor/', by: 'WK League News' },
  { season: 2026, date: '2026-08-31', teams: [], type: 'league', ko: '연맹, 경기 중 부적절 발언 문제 제기에 대해 사실관계 확인과 공식 대응 착수', en: 'The federation opened a formal response to a complaint about inappropriate remarks during a match', ja: '連盟が試合中の不適切発言の申し立てについて事実確認と公式対応を開始', src: 'https://www.kwff.or.kr/press/266', by: 'KWFF' },
];
