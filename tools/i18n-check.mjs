// 화면 코드의 한글 문구 중 영어·일본어 번역이 빠진 것을 찾는다
// 사용법: node tools/i18n-check.mjs
import { readFileSync, readdirSync } from 'node:fs';

globalThis.window = {};
await import('../assets/i18n.js');
const dict = window.WK_I18N;

const files = ['assets/app.js', ...readdirSync('assets/pages').map((f) => 'assets/pages/' + f)];
const keys = new Set();
for (const f of files) {
  const src = readFileSync(f, 'utf8').replace(/\/\/.*$/gm, ''); // 주석 제외
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*[가-힣](?:[^'\\\n]|\\.)*)'/g)) keys.add(m[1]);
}
let missing = 0;
for (const lang of ['en', 'ja']) {
  const miss = [...keys].filter((k) => !(k in dict[lang]));
  missing += miss.length;
  console.log(`[${lang}] 문구 ${keys.size}개 중 번역 없음 ${miss.length}개`);
  for (const k of miss) console.log('   ', k);
  const unused = Object.keys(dict[lang]).filter((k) => !keys.has(k));
  if (unused.length) console.log(`   (쓰이지 않는 번역 ${unused.length}개: ${unused.slice(0, 5).join(' / ')}${unused.length > 5 ? ' …' : ''})`);
}
process.exit(missing ? 1 : 0);
