// index.html 안의 인라인 <script> 블록 전부를 문법 검사한다. 편집 후 반드시 실행.
// 사용: node scripts/check_syntax.js [index.html]
const fs = require('fs');
const file = process.argv[2] || 'index.html';
const s = fs.readFileSync(file, 'utf8');
const blocks = [...s.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)];
let bad = 0;
blocks.forEach((m, i) => {
  try { new Function(m[1]); }
  catch (e) { bad++; console.error(`script #${i + 1} (offset ${m.index}): ${e.message}`); }
});
if (bad) { console.error(`FAIL: ${bad}/${blocks.length} script block(s)`); process.exit(1); }
console.log(`syntax ok (${blocks.length} inline script blocks)`);
