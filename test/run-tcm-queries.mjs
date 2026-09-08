// Milestone D — runner hồi quy engine dịch. docs/translation-engine.md §10.
// Chạy: node test/run-tcm-queries.mjs   (exit ≠ 0 nếu có ca fail — dùng chặn CI ở D2)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateQuery, stats, collisionReport } from '../lib/translate/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'tcm-queries.json'), 'utf8'));

const norm = (s) => String(s).toLowerCase();
let pass = 0, fail = 0;
const failures = [];

for (const c of spec.cases) {
  const r = translateQuery(c.q, { mode: c.mode || 'discovery' });
  const eq = norm(r.effective_query);
  const ambTexts = [...r.disambiguation.map((d) => norm(d.text)), ...r.unresolved.map(norm)];
  const problems = [];

  for (const t of c.expect_terms || []) {
    if (!eq.includes(norm(t))) problems.push(`thiếu "${t}" trong effective_query`);
  }
  for (const t of c.must_not_contain || []) {
    if (eq.includes(norm(t))) problems.push(`KHÔNG được có "${t}" trong effective_query`);
  }
  for (const t of c.expect_ambiguous || []) {
    if (!ambTexts.some((x) => x.includes(norm(t)))) problems.push(`cụm "${t}" đáng lẽ ambiguous/unresolved`);
  }
  if (c.expect_needs_resolution != null && r.needs_resolution !== c.expect_needs_resolution) {
    problems.push(`needs_resolution = ${r.needs_resolution}, mong đợi ${c.expect_needs_resolution}`);
  }
  if (c.expect_no_translation && r.translated.length) {
    problems.push(`đáng lẽ KHÔNG dịch gì, nhưng dịch: ${r.translated.map((t) => t.from + '→' + t.to).join(', ')}`);
  }
  if (c.min_translated != null && r.translated.length < c.min_translated) {
    problems.push(`chỉ dịch ${r.translated.length} span, cần ≥ ${c.min_translated}`);
  }

  if (problems.length) {
    fail++;
    failures.push({ id: c.id, q: c.q, eq: r.effective_query, disambiguation: r.disambiguation, unresolved: r.unresolved, problems });
  } else {
    pass++;
  }
}

const s = stats();
console.log(`\nEngine dịch v2 — chỉ mục: ${s.concepts} concept · ${s.surface_vi_exact} surface vi · ${s.collisions} đụng độ`);
if (collisionReport().length) {
  console.log('\nBảng đụng độ (COLLISION_SET):');
  for (const c of collisionReport()) console.log(`  "${c.folded}" ← ${c.concepts.join('  |  ')}`);
}
console.log(`\nKết quả: ${pass} pass / ${fail} fail (tổng ${spec.cases.length})`);
for (const f of failures) {
  console.log(`\n✗ ${f.id}  «${f.q}»`);
  console.log(`   effective_query: ${f.eq}`);
  if (f.disambiguation.length) console.log(`   disambiguation: ${JSON.stringify(f.disambiguation)}`);
  if (f.unresolved.length) console.log(`   unresolved: ${JSON.stringify(f.unresolved)}`);
  for (const p of f.problems) console.log(`   - ${p}`);
}

process.exit(fail ? 1 : 0);
