#!/usr/bin/env node
// P0 — Shadow Production Validation: gộp số từ log `translate_shadow_diff`.
//
// Dùng: node scripts/shadow-diff-report.mjs <file-log> [file-log2 ...]
//   - Đọc mọi dòng, lọc JSON có evt === 'translate_shadow_diff'.
//   - In: tổng, % agree, phân bố confidence, ambiguous/unresolved/needs_resolution,
//     top cặp legacy_outcome → v2_outcome khác nhau.
// KHÔNG cần DB. Không sửa gì — chỉ đọc.

import fs from 'node:fs';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Dùng: node scripts/shadow-diff-report.mjs <file-log> [...]');
  process.exit(1);
}

const rows = [];
for (const f of files) {
  let text;
  try {
    text = fs.readFileSync(f, 'utf8');
  } catch (e) {
    console.error(`Bỏ qua ${f}: ${e.message}`);
    continue;
  }
  for (const line of text.split('\n')) {
    const i = line.indexOf('{');
    if (i < 0) continue;
    let obj;
    try {
      obj = JSON.parse(line.slice(i));
    } catch {
      continue;
    }
    if (obj && obj.evt === 'translate_shadow_diff') rows.push(obj);
  }
}

if (!rows.length) {
  console.log('Không tìm thấy dòng translate_shadow_diff nào.');
  process.exit(0);
}

const n = rows.length;
const agree = rows.filter((r) => r.agree === true).length;
const disagree = n - agree;
const needsRes = rows.filter((r) => r.needs_resolution === true).length;
const hasAmbig = rows.filter((r) => (r.ambiguous_count || 0) > 0).length;
const hasUnres = rows.filter((r) => (r.unresolved_count || 0) > 0).length;

const conf = { high: 0, medium: 0, low: 0 };
for (const r of rows) {
  for (const k of Object.keys(conf)) conf[k] += (r.confidence && r.confidence[k]) || 0;
}

const pairs = new Map();
for (const r of rows) {
  if (r.agree) continue;
  const key = `${r.legacy_outcome || ''}  →  ${r.v2_outcome || ''}`;
  pairs.set(key, (pairs.get(key) || 0) + 1);
}
const topPairs = [...pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);

const versions = new Map();
for (const r of rows) versions.set(r.engine_version || '?', (versions.get(r.engine_version || '?') || 0) + 1);

const pct = (x) => `${((x / n) * 100).toFixed(1)}%`;

console.log('===== translate_shadow_diff — P0 report =====');
console.log(`Tổng query shadow      : ${n}`);
console.log(`engine_version         : ${[...versions.entries()].map(([k, v]) => `${k}=${v}`).join(', ')}`);
console.log(`agree (legacy == v2)   : ${agree}  (${pct(agree)})`);
console.log(`disagree               : ${disagree}  (${pct(disagree)})`);
console.log(`needs_resolution=true  : ${needsRes}  (${pct(needsRes)})`);
console.log(`có ambiguous_count>0   : ${hasAmbig}  (${pct(hasAmbig)})`);
console.log(`có unresolved_count>0  : ${hasUnres}  (${pct(hasUnres)})`);
console.log(`confidence (cộng dồn)  : high=${conf.high}  medium=${conf.medium}  low=${conf.low}`);
console.log('');
console.log(`----- Top ${topPairs.length} cặp bất đồng (legacy_outcome → v2_outcome) -----`);
for (const [k, c] of topPairs) console.log(`  [${String(c).padStart(4)}]  ${k}`);
console.log('');
console.log('Ghi chú: soi thủ công các cặp có thuật ngữ clinical (verified/high) đổi nghĩa,');
console.log('hoặc v2_outcome NGẮN HƠN legacy (khả năng silent drop). Phân loại nguyên nhân R4–R10.');
