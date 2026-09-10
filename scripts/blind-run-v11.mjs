// P1 gate — chạy lại bộ blind v1.1 (docs/translation-engine-v2-blind-validation-v1.md) qua engine
// hiện tại để kiểm KHÔNG có S0/S1 mới sau P1 Batch 01. KHÔNG sửa gì — chỉ đọc + in.
//
//   node scripts/blind-run-v11.mjs            → in tất cả 170 case + cờ nghi ngờ
//   node scripts/blind-run-v11.mjs --flags    → chỉ in case có cờ

import fs from 'node:fs';
import { translateQuery, ENGINE_VERSION } from '../lib/translate/index.js';

const doc = fs.readFileSync(new URL('../docs/translation-engine-v2-blind-validation-v1.md', import.meta.url), 'utf8');
const flagsOnly = process.argv.includes('--flags');

// mode theo group (theo blind doc): F + G01-07,G10 + Q(*.e) = evidence; còn lại discovery.
const cases = [];
for (const line of doc.split('\n')) {
  const m = line.match(/^([A-Q])(\d{2})\.\s+(.+?)\s*$/);
  if (!m) continue;
  const [, grp, num, input] = m;
  const id = `${grp}${num}`;
  const evGroup = grp === 'F' || (grp === 'G' && ['01', '02', '03', '04', '05', '06', '07', '10'].includes(num));
  cases.push({ id, input, mode: evGroup ? 'evidence' : 'discovery' });
  if (grp === 'Q') cases.push({ id: `${id}.e`, input, mode: 'evidence' });
}

const MEANINGFUL_DROP = /\b(khí|nhiễu|đo|dò|não|cơ|mỏi|tái|thị|văn|huyết|gối|hỏa)\b/;
let flags = 0;
console.log(`Blind v1.1 re-run — engine ${ENGINE_VERSION} — ${cases.length} probes\n`);
for (const c of cases) {
  const r = translateQuery(c.input, { mode: c.mode });
  const eq = r.effective_query || '';
  const notes = [];

  // S0-ish: từ có nghĩa biến mất hoàn toàn (không ở effective_query, không ở unresolved)
  const inTokens = c.input.toLowerCase().split(/\s+/);
  const eqLow = eq.toLowerCase();
  const unresLow = (r.unresolved || []).join(' ').toLowerCase();
  for (const t of inTokens) {
    if (t.length < 2) continue;
    if (MEANINGFUL_DROP.test(t) && !eqLow.includes(t) && !unresLow.includes(t)) {
      notes.push(`SILENT-DROP? "${t}"`);
    }
  }
  // S1-ish: nhóm P (negative control / tên người) mà lại dịch ra concept
  if (/^P/.test(c.id) && r.translated.length) notes.push(`NEG-CTRL translated: ${r.translated.map((t) => t.from + '→' + t.to).join(', ')}`);
  // S1-ish: Boolean group O mà mất toán tử/ngoặc
  if (/^O/.test(c.id)) {
    const opIn = (c.input.match(/\b(AND|OR|NOT)\b/gi) || []).length;
    const opOut = (eq.match(/\b(AND|OR|NOT)\b/g) || []).length;
    if (opIn && opOut < opIn) notes.push(`BOOLEAN ops ${opIn}→${opOut}`);
    const pIn = (c.input.match(/[()]/g) || []).length, pOut = (eq.match(/[()]/g) || []).length;
    if (pIn && pOut < pIn) notes.push(`PARENS ${pIn}→${pOut}`);
  }
  // clinical high mistranslation heuristic: từ "part of the brain"/"nephralgia"/"Aureus" xuất hiện
  if (/part of the brain|nephralgia|"?Aureus"?|Sieb\. et/i.test(eq)) notes.push(`STALE-BAD-LABEL in eq`);

  if (notes.length) flags++;
  if (flagsOnly && !notes.length) continue;
  console.log(`${c.id} [${c.mode}] ${JSON.stringify(c.input)}`);
  console.log(`   eq: ${eq}`);
  if (r.disambiguation.length) console.log(`   amb: ${JSON.stringify(r.disambiguation.map((d) => d.text))}`);
  if (r.unresolved.length) console.log(`   unres: ${JSON.stringify(r.unresolved)}`);
  if (notes.length) console.log(`   ⚠️  ${notes.join(' | ')}`);
  console.log();
}
console.log(`\n=== ${flags} probe có cờ nghi ngờ / ${cases.length} ===`);
