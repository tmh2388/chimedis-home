// Milestone D — in bảng đụng độ (COLLISION_SET) + kiểm mỗi đụng độ có ca test tương ứng.
// docs/translation-engine.md §6. Dùng chặn CI ở D2: exit ≠ 0 nếu đụng độ mới thiếu test.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collisionReport, stats } from '../lib/translate/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'test', 'tcm-queries.json'), 'utf8'));

const report = collisionReport();
const s = stats();
console.log(`Chỉ mục: ${s.concepts} concept · ${s.folded_vi} khoá folded · ${report.length} đụng độ\n`);

const testBlob = JSON.stringify(spec.cases).toLowerCase();
let missing = 0;
for (const c of report) {
  const covered = testBlob.includes(`"${c.folded.toLowerCase()}"`) || testBlob.includes(c.folded.toLowerCase());
  console.log(`${covered ? '✓' : '✗ THIẾU TEST'}  "${c.folded}"  ←  ${c.concepts.join('  |  ')}`);
  if (!covered) missing++;
}

if (missing) {
  console.error(`\n${missing} đụng độ chưa có ca test trong test/tcm-queries.json — thêm ca (expect_ambiguous) trước khi merge.`);
  process.exit(1);
}
console.log('\nMọi đụng độ đều có ca test.');
