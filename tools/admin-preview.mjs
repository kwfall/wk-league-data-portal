// 관리자 화면 미리 보기: 가짜 기록으로 admin-view.mjs 를 그려 cache/admin-preview.html 로 저장한다
// 사용법: node tools/admin-preview.mjs [day|week|month|all]
import { writeFile } from 'node:fs/promises';
import { renderAdmin } from '../admin-view.mjs';

const range = process.argv[2] || 'week', now = new Date();
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const pages = ['home', 'home', 'table', 'table', 'matches', 'players', 'player', 'player', 'team', 'match', 'news', 'best', 'cup', 'draft'];
const players = ['수원FC위민|지소연|10', '수원FC위민|하루히|39', '화천KSPO|최유정|9', '경주한수원WFC|쿄카|11', '서울시청|강태경|7'];
const teams = ['수원FC위민', '화천KSPO', '인천현대제철', '서울시청'];
const regions = ['Seoul', 'Seoul', 'Gyeonggi-do', 'Gyeonggi-do', 'Gyeonggi-do', 'Incheon', 'Busan', 'Gangwon-do', 'Gyeongsangbuk-do'];
const refs = ['l.instagram.com', 'l.instagram.com', 'l.instagram.com', 'direct', 'direct', 'talk.kakao.com', 'm.search.naver.com', 'www.google.com'];
const rows = [];
for (let v = 0; v < 180; v++) {
  const t0 = now.getTime() - Math.random() * 13 * 864e5, visit = 'v' + v, dev = Math.random() < 0.7 ? '휴대폰' : '컴퓨터', region = pick(regions), country = Math.random() < 0.05 ? 'JP' : 'KR', ref = pick(refs);
  const n = 1 + Math.floor(Math.random() * 6);
  for (let i = 0; i < n; i++) {
    const page = pick(pages), ts = new Date(t0 + i * 45e3).toISOString().replace('T', ' ').slice(0, 19);
    rows.push({ timestamp: ts, page, country, region, device: dev, mode: dev === '휴대폰' ? 'mobile' : 'pc', visit, detail: page === 'player' ? pick(players) : page === 'team' ? pick(teams) : page === 'match' ? '212' : '', ref: i === 0 ? ref : '', secs: 5 + Math.floor(Math.random() * 120) });
  }
}
const summary = { dataUpdated: new Date(now - 20 * 60e3).toISOString(), newsUpdated: new Date(now - 18 * 60e3).toISOString(), newsCount: 74, comps: [], open: [], matchNames: { 212: '25R 세종스포츠토토 0:1 수원FC위민' } };
const rum = { byDate: [{ sum: { visits: 160 }, count: 410, dimensions: { date: '2026-10-30' } }], byCountry: [{ count: 400, dimensions: { countryName: 'KR' } }, { count: 10, dimensions: { countryName: 'JP' } }], byBrowser: [{ count: 300, dimensions: { userAgentBrowser: 'Chrome Mobile' } }, { count: 110, dimensions: { userAgentBrowser: 'Edge' } }] };
await writeFile('cache/admin-preview.html', renderAdmin({ rows, summary, rum, range, now, host: 'wk-league-data.kwfall.workers.dev' }));
console.log('cache/admin-preview.html 저장 (' + range + ', 가짜 기록 ' + rows.length + '줄)');
