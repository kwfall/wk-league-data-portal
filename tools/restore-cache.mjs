// 배포 전에 직전 수집 결과(cache/site-*.js)를 불러온다. 저장소에 있는 파일이 더 최근에 만든 것이면 저장소 파일을 그대로 둔다.
// 사용법: node tools/restore-cache.mjs
import { readFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const when = async (f) => { try { return ((await readFile(f, 'utf8')).match(/"updated":\s*"([^"]+)"/) || [])[1] || ''; } catch (e) { return ''; } };
for (const f of ['data.js', 'news.js', 'roster.js']) {
  const c = `cache/site-${f}`;
  if (!existsSync(c)) continue;
  const [a, b] = [await when(c), await when(f)];
  if (a > b) { await copyFile(c, f); console.log(`${f}: 직전 수집 결과 사용 (${a})`); } else console.log(`${f}: 저장소 파일이 더 최근 (${b})`);
}
