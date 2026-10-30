// 카드뉴스 목록(cardnews.js)을 만든다: posters/ 의 '카드뉴스-*.png' 와 cardnews/ 폴더에 직접 넣은 이미지
// 사용법: node tools/cardlist.mjs     (cardnews/ 폴더에 인스타그램에 올린 이미지를 넣은 뒤 실행)
import { readdir, stat, writeFile, mkdir } from 'node:fs/promises';

await mkdir('cardnews', { recursive: true });
const IMG = /\.(png|jpe?g|webp)$/i, items = [];
for (const [dir, test, made] of [['cardnews', IMG, false], ['posters', /^카드뉴스-.*\.png$/, true]]) {
  let files = [];
  try { files = await readdir(dir); } catch (e) { /* 폴더 없음 */ }
  const first = (x) => (x.includes('득점') ? 0 : 1); // 사이트에서 만든 카드는 득점 묶음을 도움 묶음보다 앞에
  for (const f of files.filter((x) => test.test(x)).sort((a, b) => (made ? first(a) - first(b) : 0) || a.localeCompare(b, 'ko', { numeric: true }))) {
    const s = await stat(`${dir}/${f}`);
    items.push({ src: `${dir}/${f}`, title: f.replace(IMG, '').replace(/^카드뉴스-/, ''), date: s.mtime.toISOString().slice(0, 10), made });
  }
}
await writeFile('cardnews.js', `// tools/cardlist.mjs 가 만든 파일입니다. 직접 고치지 마세요.\nwindow.WK_CARDS = ${JSON.stringify(items, null, 1)};\n`);
console.log(`카드뉴스 ${items.length}장 (직접 넣은 것 ${items.filter((x) => !x.made).length}장, 사이트에서 만든 것 ${items.filter((x) => x.made).length}장) → cardnews.js`);
