// 뉴스 수집기: 기사 제목·링크·날짜·언론사만 모은다 (본문은 언론사 저작물이라 가져오지 않는다)
//   1) 한국여자축구연맹 보도자료 (kwff.or.kr/press)
//   2) 구글 뉴스 검색 RSS: 'WK리그', 'W코리아컵'
//   3) WK League News (영문 팬 매체) RSS
// 최근 60일, 최대 120건. 같은 제목은 하나만 남긴다.
// 사용법: node scrape-news.mjs   (실시간_갱신.bat 이 켜져 있으면 확인할 때마다 같이 실행된다)
import { writeFile } from 'node:fs/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) wk-league-stats personal analysis project';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url) => { const res = await fetch(url, { headers: { 'User-Agent': UA } }); await sleep(700); if (!res.ok) throw new Error(`${res.status} ${url}`); return res.text(); };
const ent = (s) => (s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;|&#8216;/g, "'").replace(/&#8220;|&#8221;/g, '"').replace(/&#8211;|&#8212;/g, '–').replace(/&amp;/g, '&').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const tag = (x, name) => ent((x.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)) || [])[1]);
const iso = (d) => { const t = new Date(d); return Number.isNaN(+t) ? null : t.toISOString(); };

// 제목에 나온 팀 (한글·영문 이름)
const TEAMS = [['수원FC위민', /수원\s*FC\s*위민|수원FC위민|Suwon/i], ['화천KSPO', /화천|KSPO|Hwacheon/i], ['인천현대제철', /현대제철|Hyundai Steel|Incheon/i], ['상무여자축구단', /상무|Sangmu|Mungyeong/i],
  ['경주한수원WFC', /한수원|경주|KHNP|Gyeongju/i], ['서울시청', /서울시청|서울 시청|Seoul City/i], ['세종스포츠토토', /스포츠토토|세종|Sportstoto|Sejong/i], ['강진SWANSWFC', /강진|스완스|Gangjin|Swans/i]];
const teamsOf = (t) => TEAMS.filter(([, re]) => re.test(t)).map(([k]) => k);

const items = [], fail = [];
// 1) 연맹 보도자료
try {
  const h = await get('https://www.kwff.or.kr/press');
  for (const m of h.matchAll(/<a href="\/press\/(\d+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const title = ent((m[2].match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1]), d = m[2].match(/(\d{2})\.(\d{2})\.(\d{2})/);
    if (title && d) items.push({ title, url: `https://www.kwff.or.kr/press/${m[1]}`, source: '한국여자축구연맹', kind: 'official', date: iso(`20${d[1]}-${d[2]}-${d[3]}T12:00:00+09:00`) });
  }
} catch (e) { fail.push('연맹 보도자료'); }
// 2) 구글 뉴스 검색
for (const q of ['WK리그', 'W코리아컵']) {
  try {
    const x = await get(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ko&gl=KR&ceid=KR:ko`);
    for (const it of x.split('<item>').slice(1)) {
      const src = tag(it, 'source'), raw = tag(it, 'title');
      const title = src && raw.endsWith(' - ' + src) ? raw.slice(0, -(src.length + 3)) : raw.replace(/ - [^-]+$/, '');
      items.push({ title, url: tag(it, 'link'), source: src || '언론', kind: 'press', date: iso(tag(it, 'pubDate')) });
    }
  } catch (e) { fail.push(`구글 뉴스(${q})`); }
}
// 3) WK League News (영문)
try {
  const x = await get('https://wkleaguenews.com/feed/');
  for (const it of x.split('<item>').slice(1)) items.push({ title: tag(it, 'title'), url: tag(it, 'link'), source: 'WK League News', kind: 'en', date: iso(tag(it, 'pubDate')) });
} catch (e) { fail.push('WK League News'); }

// 정리: 날짜 있는 것만, 최근 60일, 같은 제목은 하나만
const since = Date.now() - 60 * 864e5, seen = new Set(), key = (t) => t.replace(/[^가-힣A-Za-z0-9]/g, '').slice(0, 40);
const out = items.filter((x) => x.title && x.url && x.date && +new Date(x.date) >= since)
  .sort((a, b) => b.date.localeCompare(a.date) || (a.kind === 'official' ? -1 : 1))
  .filter((x) => { const k = key(x.title); if (seen.has(k)) return false; seen.add(k); return true; })
  .slice(0, 120).map((x) => ({ ...x, teams: teamsOf(x.title) }));
await writeFile('news.js', '// scrape-news.mjs 가 만든 파일입니다. 직접 고치지 마세요. 기사 제목과 링크만 담는다.\nwindow.WK_NEWS = ' + JSON.stringify({ updated: new Date().toISOString(), failed: fail, items: out }, null, 1) + ';\n');
console.log(`news.js 저장: ${out.length}건 (연맹 ${out.filter((x) => x.kind === 'official').length}, 언론 ${out.filter((x) => x.kind === 'press').length}, 영문 ${out.filter((x) => x.kind === 'en').length})${fail.length ? ' · 실패: ' + fail.join(', ') : ''}`);
