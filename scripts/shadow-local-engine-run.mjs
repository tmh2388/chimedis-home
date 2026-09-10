// P0 Translate Engine v2 — Cohort B (local deterministic Evidence) + local correlation predictions.
//
// Chạy engine v2 CỤC BỘ tại đúng commit main cho TOÀN BỘ pack:
//   - mọi case: legacy effective_query (nhánh legacy của buildSearchQuery) để so sánh;
//   - mọi case: v2 ở đúng mode của nó (discovery/evidence);
//   - mọi case: v2 ở mode='evidence' (bắt buộc) để kiểm policy Evidence gate.
// KHÔNG mạng, KHÔNG DB overlay, KHÔNG env. Deterministic.
//
// Cohort B = subset mode='evidence'. Phần discovery chỉ là "local expected outcome" phục vụ
// correlation với Runtime logs sau này (reviewer B2 cho phép). KHÔNG gọi là production traffic.
//
// Chạy: node scripts/shadow-local-engine-run.mjs --pack /tmp/translation-shadow-traffic-pack-v1.jsonl \
//         --out docs/translation-shadow-p0-local-engine-run-v1.jsonl

import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { translateQuery, ENGINE_VERSION } from '../lib/translate/index.js';
import { buildSearchQuery } from '../lib/tcm-vocab.js';

const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const PACK = opt('--pack', '/tmp/translation-shadow-traffic-pack-v1.jsonl');
const OUT = opt('--out', 'docs/translation-shadow-p0-local-engine-run-v1.jsonl');

let gitCommit = 'unknown';
try { gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { /* noop */ }

if (!fs.existsSync(PACK)) { console.error(`Pack không tồn tại: ${PACK}`); process.exit(1); }
const pack = fs.readFileSync(PACK, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const confCounts = (translated = []) => translated.reduce((a, t) => ((a[t.confidence] = (a[t.confidence] || 0) + 1), a), {});

// Boolean structure tokens phải sống sót trong effective_query.
function booleanPreserved(input, eff) {
  const wantOps = (input.match(/\b(AND|OR|NOT)\b/g) || []);
  const gotOps = (eff.match(/\b(AND|OR|NOT)\b/g) || []);
  const parensIn = (input.match(/[()]/g) || []).length;
  const parensOut = (eff.match(/[()]/g) || []).length;
  return {
    ops_in: wantOps.length, ops_out: gotOps.length,
    ops_ok: wantOps.length === 0 || gotOps.length >= wantOps.length,
    parens_in: parensIn, parens_out: parensOut,
    parens_ok: parensIn === 0 || parensOut >= parensIn,
  };
}

const out = fs.createWriteStream(OUT, { flags: 'w' });
const w = (o) => out.write(JSON.stringify(o) + '\n');
const started_at = new Date().toISOString();
w({ _meta: 'run-start', cohort: 'B-local-engine', started_at, git_commit: gitCommit, engine_version: ENGINE_VERSION, pack: PACK, cases: pack.length });

let evCount = 0;
let evGated = 0;
let evUncertainNotGated = 0;   // BẮT BUỘC = 0 (ambiguity/unresolved mà không chặn)
let evPolicyFail = [];
let boolFail = [];
let negFlags = [];

for (const r of pack) {
  let legacyEff = null, v2 = null, v2ev = null, err = null;
  try {
    // legacy: buildSearchQuery không có env TRANSLATE_ENGINE → nhánh legacy thuần
    const lg = buildSearchQuery(r.input, { mode: r.mode === 'evidence' ? 'evidence' : 'discovery', orSynonyms: r.mode !== 'evidence' });
    legacyEff = lg.text || r.input;
    v2 = translateQuery(r.input, { mode: r.mode === 'evidence' ? 'evidence' : 'discovery' });
    v2ev = r.mode === 'evidence' ? v2 : translateQuery(r.input, { mode: 'evidence' });
  } catch (e) {
    err = e.message || String(e);
  }

  const rec = {
    synthetic_case_id: r.synthetic_case_id, batch: r.batch, category: r.category, mode: r.mode, input: r.input,
    engine_version: ENGINE_VERSION, error: err,
  };
  if (!err) {
    const v2eff = v2.effective_query;
    rec.legacy_effective_query = legacyEff;
    rec.v2_effective_query = v2eff;
    rec.agree = norm(legacyEff) === norm(v2eff);
    rec.v2_translated = (v2.translated || []).map((t) => ({ from: t.from, to: t.to, confidence: t.confidence }));
    rec.v2_confidence_counts = confCounts(v2.translated);
    rec.v2_disambiguation = (v2.disambiguation || []).map((d) => d.text);
    rec.v2_unresolved = v2.unresolved || [];
    rec.v2_needs_resolution = !!v2.needs_resolution;
    rec.v2_script = v2.script;
    rec.v2_warning = v2.warning || null;
    // Evidence-mode view (always)
    rec.ev_needs_resolution = !!v2ev.needs_resolution;
    rec.ev_disambiguation = (v2ev.disambiguation || []).map((d) => d.text);
    rec.ev_unresolved = v2ev.unresolved || [];
    rec.ev_has_uncertainty = (v2ev.disambiguation || []).length > 0 || (v2ev.unresolved || []).length > 0;
    rec.ev_policy_ok = rec.ev_has_uncertainty ? rec.ev_needs_resolution === true : true;
    rec.boolean = booleanPreserved(r.input, v2eff);

    if (r.mode === 'evidence') {
      evCount++;
      if (rec.ev_needs_resolution) evGated++;
      if (rec.ev_has_uncertainty && !rec.ev_needs_resolution) { evUncertainNotGated++; evPolicyFail.push(rec.synthetic_case_id); }
      if (!rec.ev_policy_ok) evPolicyFail.push(rec.synthetic_case_id);
      if (!rec.boolean.ops_ok || !rec.boolean.parens_ok) boolFail.push({ id: rec.synthetic_case_id, input: r.input, eff: v2eff, b: rec.boolean });
    }
    if (r.category === 'NEGATIVE') {
      const highClinical = (v2.translated || []).filter((t) => t.confidence === 'high');
      if (highClinical.length) negFlags.push({ id: rec.synthetic_case_id, input: r.input, mapped: highClinical.map((t) => `${t.from}→${t.to}`) });
    }
    if (r.category === 'BOOLEAN' && (!rec.boolean.ops_ok || !rec.boolean.parens_ok)) {
      boolFail.push({ id: rec.synthetic_case_id, input: r.input, eff: v2eff, b: rec.boolean });
    }
  }
  w(rec);
}

const ended_at = new Date().toISOString();
w({
  _meta: 'run-end', cohort: 'B-local-engine', started_at, ended_at,
  evidence_cases: evCount, evidence_gated: evGated,
  evidence_uncertain_not_gated: evUncertainNotGated,
  evidence_policy_fail_ids: [...new Set(evPolicyFail)],
  boolean_fail: boolFail, negative_high_clinical_flags: negFlags,
});
out.end();

fs.writeFileSync(OUT.replace(/\.jsonl$/, '.meta.json'), JSON.stringify({
  cohort: 'B-local-engine', started_at, ended_at, git_commit: gitCommit, engine_version: ENGINE_VERSION,
  total_cases: pack.length, evidence_cases: evCount, evidence_gated: evGated,
  evidence_uncertain_not_gated: evUncertainNotGated,
  evidence_policy_fail_ids: [...new Set(evPolicyFail)],
  boolean_fail_count: boolFail.length, negative_high_clinical_flag_count: negFlags.length,
  out: OUT,
}, null, 2) + '\n');

console.error(`[cohort B] engine=${ENGINE_VERSION} commit=${gitCommit.slice(0, 8)}`);
console.error(`[cohort B] evidence cases=${evCount}  gated(needs_resolution)=${evGated}  uncertain-not-gated=${evUncertainNotGated} (BẮT BUỘC 0)`);
console.error(`[cohort B] evidence policy fail ids: ${JSON.stringify([...new Set(evPolicyFail)])}`);
console.error(`[cohort B] boolean fail: ${boolFail.length}  | negative high-clinical flags: ${negFlags.length}`);
console.error(`[cohort B] raw: ${OUT}`);
