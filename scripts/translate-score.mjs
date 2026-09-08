// Thước đo CÓ ĐIỂM SỐ cho engine dịch truy vấn (Lớp 2). docs/translation-engine.md §12.
//
//   node scripts/translate-score.mjs            # chấm cả legacy + v2, in bảng
//   node scripts/translate-score.mjs --diff     # kèm chi tiết từng câu v2 kém
//
// 3 chỉ số / engine:
//   noise   : tỉ lệ token trong effective_query KHÔNG phải tiếng Anh (chữ Việt có dấu / lẻ chữ Hán / rác)
//             → THẤP là tốt. Đây là tín hiệu chính cho lỗi "lọt chữ vào query".
//   recall  : % must_have (thuật ngữ chính) xuất hiện — chỉ tính câu có annotate
//   clean   : % must_not_have (lỗi kinh điển) TRÁNH được — chỉ tính câu có annotate
//   score   : 100*clean*0.4 + 100*recall*0.4 + (100-noise%)*0.2

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCH = path.join(__dirname, '..', 'test', 'translate-benchmark.json');

delete process.env.TRANSLATE_ENGINE;
const { buildSearchQuery } = await import('../lib/tcm-vocab.js');
const { translateQuery } = await import('../lib/translate/index.js');

const cases = JSON.parse(fs.readFileSync(BENCH, 'utf8'));

const VIET_TONE = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const CJK = /[㐀-鿿]/;

// token "sạch" = chỉ chữ Latin/số/dấu cú pháp query
function noiseTokens(effective) {
  const toks = String(effective || '')
    .replace(/[()"]/g, ' ')
    .split(/\s+/).filter(Boolean)
    .filter((t) => t.toUpperCase() !== 'OR' && t.toUpperCase() !== 'AND' && t.toUpperCase() !== 'NOT');
  const bad = toks.filter((t) => VIET_TONE.test(t) || CJK.test(t) || /^[^a-z0-9]+$/i.test(t));
  return { total: toks.length, bad: bad.length, badList: bad };
}

function scoreEngine(runFn) {
  let noiseNum = 0, noiseDen = 0;
  let recallHit = 0, recallDen = 0;
  let cleanOk = 0, cleanDen = 0;
  const fails = [];
  for (const c of cases) {
    let eff;
    try { eff = runFn(c.query); } catch (e) { eff = `‹lỗi:${e.message}›`; }
    const n = noiseTokens(eff);
    noiseNum += n.bad; noiseDen += Math.max(n.total, 1);
    const lc = eff.toLowerCase();
    let localFail = null;
    for (const m of c.must_have || []) {
      recallDen++;
      if (lc.includes(m.toLowerCase())) recallHit++;
      else localFail = (localFail || '') + ` [thiếu:${m}]`;
    }
    for (const m of c.must_not_have || []) {
      cleanDen++;
      if (!new RegExp(m, 'i').test(eff)) cleanOk++;
      else localFail = (localFail || '') + ` [dính:${m}]`;
    }
    if (localFail || n.bad > 0) fails.push({ q: c.query, eff, noise: n.badList, why: localFail });
  }
  const noisePct = 100 * noiseNum / Math.max(noiseDen, 1);
  const recall = recallDen ? 100 * recallHit / recallDen : 100;
  const clean = cleanDen ? 100 * cleanOk / cleanDen : 100;
  const score = clean * 0.4 + recall * 0.4 + (100 - noisePct) * 0.2;
  return { noisePct, recall, clean, score, fails };
}

const L = scoreEngine((q) => buildSearchQuery(q, { orSynonyms: true, mode: 'discovery' }).text);
const V = scoreEngine((q) => translateQuery(q, { mode: 'discovery' }).effective_query);

const f = (x) => x.toFixed(1);
console.log(`\n${cases.length} câu benchmark\n`);
console.log(`              legacy    v2     Δ`);
console.log(`noise %  (↓)  ${f(L.noisePct).padStart(6)}  ${f(V.noisePct).padStart(5)}  ${f(V.noisePct - L.noisePct).padStart(5)}`);
console.log(`recall % (↑)  ${f(L.recall).padStart(6)}  ${f(V.recall).padStart(5)}  ${f(V.recall - L.recall).padStart(5)}`);
console.log(`clean %  (↑)  ${f(L.clean).padStart(6)}  ${f(V.clean).padStart(5)}  ${f(V.clean - L.clean).padStart(5)}`);
console.log(`SCORE    (↑)  ${f(L.score).padStart(6)}  ${f(V.score).padStart(5)}  ${f(V.score - L.score).padStart(5)}`);
console.log(`\n${V.score >= L.score ? '✅ v2 ≥ legacy' : '❌ v2 CÒN KÉM legacy ' + f(L.score - V.score) + ' điểm'}\n`);

if (process.argv.includes('--diff')) {
  console.log('── v2: câu còn nhiễu / sai ──');
  for (const x of V.fails) {
    console.log(`\n« ${x.q} »`);
    console.log(`  → ${x.eff}`);
    if (x.noise.length) console.log(`  nhiễu: ${x.noise.join(' ')}`);
    if (x.why) console.log(`  ${x.why}`);
  }
}
