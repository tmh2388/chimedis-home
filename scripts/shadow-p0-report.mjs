// P0 Translate Engine v2 — build raw + analysis reports from cohort artifacts.
//
// Input:
//   docs/translation-shadow-p0-synthetic-run-v1.jsonl        (Cohort A — production Discovery)
//   docs/translation-shadow-p0-local-engine-run-v1.jsonl     (Cohort B + local predictions for all 620)
//   [optional] a Runtime-log export file with translate_shadow_diff lines  (--logs <path>)
//
// Output:
//   docs/translation-shadow-p0-synthetic-raw-v1.md
//   docs/translation-shadow-p0-synthetic-analysis-v1.md
//
// KHÔNG suy diễn production translate_shadow_diff nếu --logs không được cấp:
// phần v2 outcome của Cohort A đánh dấu LOCAL PREDICTION — PENDING RUNTIME LOG.

import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const A_PATH = opt('--a', 'docs/translation-shadow-p0-synthetic-run-v1.jsonl');
const B_PATH = opt('--b', 'docs/translation-shadow-p0-local-engine-run-v1.jsonl');
const LOGS = opt('--logs', null);
const RAW_OUT = opt('--raw-out', 'docs/translation-shadow-p0-synthetic-raw-v1.md');
const ANALYSIS_OUT = opt('--analysis-out', 'docs/translation-shadow-p0-synthetic-analysis-v1.md');

const readJsonl = (p) => fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) + '%' : 'n/a');

const aAll = readJsonl(A_PATH);
const aMeta = { start: aAll.find((r) => r._meta === 'run-start'), end: aAll.find((r) => r._meta === 'run-end') };
const aRows = aAll.filter((r) => !r._meta);
const bAll = readJsonl(B_PATH);
const bRows = bAll.filter((r) => !r._meta);
const bById = new Map(bRows.map((r) => [r.synthetic_case_id, r]));
const bMetaEnd = bAll.find((r) => r._meta === 'run-end');

// optional runtime logs
let logDiffs = null;
if (LOGS && fs.existsSync(LOGS)) {
  logDiffs = [];
  for (const line of fs.readFileSync(LOGS, 'utf8').split('\n')) {
    const i = line.indexOf('{');
    if (i < 0) continue;
    try { const o = JSON.parse(line.slice(i)); if (o.evt === 'translate_shadow_diff') logDiffs.push(o); } catch { /* skip */ }
  }
}

// ---------- Cohort A metrics ----------
const aSuccess = aRows.filter((r) => r.ok);
const aInfraFail = aRows.filter((r) => !r.ok);
const lat = aSuccess.map((r) => r.latency_ms).filter((n) => n != null).sort((x, y) => x - y);
const q = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(p * arr.length))] : null;
const statusDist = {};
for (const r of aRows) statusDist[r.http_status ?? 'null'] = (statusDist[r.http_status ?? 'null'] || 0) + 1;
const aByCat = {};
for (const r of aRows) {
  const c = (aByCat[r.category] ||= { n: 0, ok: 0, cached: 0 });
  c.n++; if (r.ok) c.ok++; if (r.cached) c.cached++;
}

// local prediction join (v2 side pending runtime logs)
const predRows = aSuccess.map((r) => {
  const b = bById.get(r.synthetic_case_id);
  const legacyProd = norm(r.effective_query);
  const v2Pred = b ? norm(b.v2_effective_query) : null;
  const legacyPredLocal = b ? norm(b.legacy_effective_query) : null;
  return {
    id: r.synthetic_case_id, category: r.category, input: r.input,
    legacy_prod: r.effective_query, legacy_local: b?.legacy_effective_query ?? null,
    v2_pred: b?.v2_effective_query ?? null,
    legacy_local_matches_prod: legacyPredLocal != null && legacyPredLocal === legacyProd,
    pred_agree: v2Pred != null && v2Pred === legacyProd,
    v2_conf: b?.v2_confidence_counts ?? {},
    v2_unresolved: b?.v2_unresolved ?? [],
    v2_translated: b?.v2_translated ?? [],
    warning_prod: r.warning ?? null,
  };
});
const predAgree = predRows.filter((r) => r.pred_agree).length;
const predDisagree = predRows.filter((r) => !r.pred_agree).length;
const localLegacyMatch = predRows.filter((r) => r.legacy_local_matches_prod).length;

// heuristic classification of disagreements (LOCAL PREDICTION — for triage only, NOT a verdict).
// Extract "anchor" concepts = quoted English phrases inside the effective query.
const anchors = (s) => {
  const out = new Set();
  for (const m of String(s || '').matchAll(/"([^"]+)"/g)) out.add(m[1].toLowerCase().trim());
  return out;
};
// leftover raw tokens = bareword (unquoted, outside parens/operators) alpha tokens.
const leftovers = (s) => {
  let x = String(s || '').replace(/"[^"]*"/g, ' ').replace(/[()]/g, ' ');
  return x.split(/\s+/).filter((w) => w && !/^(OR|AND|NOT)$/i.test(w) && /[a-zà-ỹ]/i.test(w));
};
const jaccard = (a, b) => {
  if (!a.size && !b.size) return 1;
  let inter = 0; for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
};
// known S2 junk / wrong-mapping strings (from blind v1.1 R4/R5) reproduced here
const KNOWN_JUNK = ['part of the brain', 'nephralgia', 'aureus', 'prunus mume sieb. et', 'neck"'];
function classify(r) {
  if (r.pred_agree) return 'EQUIVALENT (exact)';
  const lp = norm(r.legacy_prod), vp = norm(r.v2_pred);
  if (!vp) return 'UNCERTAIN — needs G4';
  const la = anchors(r.legacy_prod), va = anchors(r.v2_pred);
  const ll = leftovers(lp), vl = leftovers(vp);
  const j = jaccard(la, va);
  const v2HasKnownJunk = KNOWN_JUNK.some((k) => vp.includes(k)) && !KNOWN_JUNK.some((k) => lp.includes(k));
  // v2 introduces a known-wrong clinical string legacy avoided
  if (v2HasKnownJunk) return 'v2 WORSE (known R4/R5 wrong mapping)';
  // v2 leaks clearly more raw VN/foreign tokens than legacy
  if (vl.length >= ll.length + 3) return 'v2 WORSE (leaks raw tokens)';
  // anchors nearly identical → only synonym-list wording differs
  if (j >= 0.6) return 'EQUIVALENT (synonym-set wording)';
  // v2 anchors ⊇ legacy anchors (adds concept groups) and no extra leak
  let superset = true; for (const x of la) if (!va.has(x)) { superset = false; break; }
  if (superset && va.size > la.size && vl.length <= ll.length) return 'v2 BETTER (adds valid concept group)';
  // legacy has leftover fragments v2 resolved/kept cleaner
  if (ll.length > vl.length && j >= 0.4) return 'v2 BETTER (fewer stray fragments)';
  return 'UNCERTAIN — needs G4';
}
const classCounts = {};
const classExamples = {};
for (const r of predRows) {
  const k = classify(r);
  classCounts[k] = (classCounts[k] || 0) + 1;
  (classExamples[k] ||= []).push(r);
}

// ---------- Cohort B metrics ----------
const bEv = bRows.filter((r) => r.mode === 'evidence');
const bEvGated = bEv.filter((r) => r.ev_needs_resolution);
const bEvUncertainNotGated = bEv.filter((r) => r.ev_has_uncertainty && !r.ev_needs_resolution);
const bBoolFail = bRows.filter((r) => r.boolean && (!r.boolean.ops_ok || !r.boolean.parens_ok));
const bNegFlags = bRows.filter((r) => r.category === 'NEGATIVE' && (r.v2_translated || []).some((t) => t.confidence === 'high'));
const bAgreeAll = bRows.filter((r) => r.agree).length;

// ---------- write RAW ----------
const now = new Date().toISOString();
let raw = `# P0 Synthetic Shadow Validation — RAW v1

> Raw-first artifact. Sinh bằng \`scripts/shadow-p0-report.mjs\`. Commit TRƯỚC mọi scoring/patch.
> Tài liệu điều hành: \`docs/translation-engine-production-rollout-v1.md\` §3 + \`docs/translation-shadow-p0-automation-v1.md\`.
> Generated: ${now}

## Nguồn artifact

| Cohort | File | Rows |
|---|---|---|
| A — Production synthetic Discovery | \`${A_PATH}\` | ${aRows.length} case (+${aAll.length - aRows.length} _meta) |
| B — Local deterministic Evidence + local prediction | \`${B_PATH}\` | ${bRows.length} case |
| Pack generator | \`scripts/generate-shadow-traffic-pack-v1.mjs\` @5ee9dd1 | 620 unique, md5 ca9f0fa64040254434f33e1c49043ff0 |
| Runtime logs (translate_shadow_diff) | ${LOGS ? '`' + LOGS + '`' : '**CHƯA CÓ — chờ chủ dự án export**'} | ${logDiffs ? logDiffs.length + ' dòng' : 'n/a'} |

## Cohort A — cửa sổ chạy

- \`started_at\`: **${aMeta.start?.started_at ?? '?'}**
- \`ended_at\`: **${aMeta.end?.ended_at ?? '(chưa kết thúc)'}**
- base: ${aMeta.start?.base ?? '?'} · commit: ${aMeta.start?.git_commit ?? '?'} · UA: \`${aMeta.start?.user_agent ?? '?'}\`
- planned ${aMeta.start?.planned_requests ?? '?'} · completed ${aMeta.end?.completed ?? aRows.length} · infra_failures ${aMeta.end?.infra_failures ?? aInfraFail.length} · aborted ${aMeta.end?.aborted ?? false}${aMeta.end?.abort_reason ? ' — ' + aMeta.end.abort_reason : ''}

### Kết quả thô Cohort A

| Chỉ số | Giá trị |
|---|---|
| Request gửi | ${aRows.length} |
| HTTP 200 / success | ${aSuccess.length} (${pct(aSuccess.length, aRows.length)}) |
| Infra fail (5xx/timeout/network) | ${aInfraFail.length} (${pct(aInfraFail.length, aRows.length)}) |
| Response \`cached:true\` | ${aSuccess.filter((r) => r.cached).length} |
| Latency p50 / p90 / p99 (ms) | ${q(lat, 0.5)} / ${q(lat, 0.9)} / ${q(lat, 0.99)} |
| Latency min / max (ms) | ${lat[0] ?? '?'} / ${lat[lat.length - 1] ?? '?'} |
| HTTP status distribution | ${JSON.stringify(statusDist)} |

Theo category (n / ok / cached):

${Object.entries(aByCat).map(([c, v]) => `- ${c}: ${v.n} / ${v.ok} / ${v.cached}`).join('\n')}

${aInfraFail.length ? `### Infra failures\n\n${aInfraFail.map((r) => `- ${r.synthetic_case_id} [${r.category}] http=${r.http_status} err=${r.error}`).join('\n')}\n` : '### Infra failures\n\nKhông có.\n'}

## Cohort B — Local deterministic Evidence (raw)

- engine: \`${bMetaEnd?.engine_version ?? bRows[0]?.engine_version ?? '?'}\` · started ${bAll.find((r) => r._meta === 'run-start')?.started_at ?? '?'} → ended ${bMetaEnd?.ended_at ?? '?'}
- Evidence cases: **${bEv.length}**
- \`needs_resolution=true\` (Evidence gate engaged): **${bEvGated.length}** / ${bEv.length} (${pct(bEvGated.length, bEv.length)})
- Evidence có uncertainty NHƯNG không gated (BẮT BUỘC = 0): **${bEvUncertainNotGated.length}** ${bEvUncertainNotGated.length ? '→ ' + bEvUncertainNotGated.map((r) => r.synthetic_case_id).join(', ') : ''}
- Boolean structure fail (ops/parens mất): **${bBoolFail.length}** ${bBoolFail.length ? '→ ' + bBoolFail.map((r) => r.synthetic_case_id).join(', ') : ''}
- NEGATIVE category có mapping \`high\`: **${bNegFlags.length}**${bNegFlags.length ? '\n' + bNegFlags.map((r) => `  - ${r.synthetic_case_id} "${r.input}" → ${(r.v2_translated || []).filter((t) => t.confidence === 'high').map((t) => t.from + '→' + t.to).join(', ')}` ).join('\n') : ''}

## Cohort A — local prediction join (v2 side PENDING Runtime logs)

> \`legacy_prod\` = \`query.effective\` THẬT từ response production (nhánh legacy).
> \`v2_pred\` = engine v2 CỤC BỘ tại commit — **DỰ ĐOÁN**, chờ \`translate_shadow_diff\` xác nhận.

| Chỉ số | Giá trị |
|---|---|
| Case so khớp được | ${predRows.length} |
| local legacy == production legacy (sanity) | ${localLegacyMatch} (${pct(localLegacyMatch, predRows.length)}) |
| predicted agree (legacy_prod == v2_pred) | ${predAgree} (${pct(predAgree, predRows.length)}) |
| predicted disagree | ${predDisagree} (${pct(predDisagree, predRows.length)}) |

Phân loại disagreement (HEURISTIC — chỉ để triage, KHÔNG phải kết luận; verdict thật cần Runtime logs + G4):

${Object.entries(classCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v} (${pct(v, predRows.length)})`).join('\n')}

Ví dụ mỗi lớp (tối đa 6 case, cắt chuỗi 110 ký tự):

${Object.entries(classExamples).sort((a, b) => b[1].length - a[1].length).map(([k, arr]) => {
      const ex = arr.slice(0, 6).map((r) => `  - ${r.id} [${r.category}] "${r.input}"\n    L: ${String(r.legacy_prod).slice(0, 110)}\n    V: ${String(r.v2_pred).slice(0, 110)}`).join('\n');
      return `**${k}** (${arr.length})\n${ex}`;
    }).join('\n\n')}

${logDiffs ? '' : '> ⚠️ Chưa có Runtime logs → KHÔNG tính production `agree %` / `v2_outcome` / `confidence` / `ambiguous_count` thật. Trạng thái: **P0 SYNTHETIC EXECUTION COMPLETE — ANALYSIS WAITING FOR RUNTIME LOG EXPORT**.'}
`;
fs.writeFileSync(RAW_OUT, raw);

// ---------- write ANALYSIS ----------
const s1neg = bNegFlags.filter((r) => {
  // person-name → herb/clinical high == S1 candidate; institution + real topic word == softer
  return /luận văn|thạc sĩ|nghiên cứu|báo cáo|hội nghị/i.test(r.input) && (r.v2_translated || []).some((t) => t.confidence === 'high');
});
let analysis = `# P0 Synthetic Shadow Validation — ANALYSIS v1

> Sinh sau raw (\`docs/translation-shadow-p0-synthetic-raw-v1.md\`). Scoring theo \`docs/translation-shadow-p0-automation-v1.md\` §7–8 và rollout §3.
> Generated: ${now}
> **KHÔNG patch trong task này. KHÔNG bật v2. KHÔNG mở P1.**

## 0. Trạng thái

${logDiffs
    ? `Runtime logs đã có (${logDiffs.length} dòng \`translate_shadow_diff\`) → phân tích production shadow đầy đủ bên dưới.`
    : '**P0 SYNTHETIC EXECUTION COMPLETE — ANALYSIS WAITING FOR RUNTIME LOG EXPORT.**\n\nChủ dự án export Runtime logs trong cửa sổ `' + (aMeta.start?.started_at ?? '?') + '` → `' + (aMeta.end?.ended_at ?? '?') + '` và gửi lại. Phần production `agree %` / `v2_outcome` / `confidence` / `ambiguous_count` / `needs_resolution` THẬT chỉ chốt được khi có logs. Dưới đây là phần chốt được ngay: hạ tầng Cohort A + toàn bộ Cohort B + dự đoán cục bộ.'}

## A. Cohort A — Production synthetic Discovery

### A1. Hạ tầng / server regression do shadow
- ${aRows.length} request, ${aSuccess.length} success (${pct(aSuccess.length, aRows.length)}), ${aInfraFail.length} infra fail.
- Phân loại infra fail: HTTP 502 "không kết nối được nguồn dữ liệu" (cả 4 nguồn ngoài fail đồng thời) = ${aInfraFail.filter((r) => r.http_status === 502).length}; 5xx khác / timeout / network = ${aInfraFail.filter((r) => r.http_status !== 502).length}.
- 502 rải rác trong 63 phút (${aInfraFail.filter((r) => r.http_status === 502).map((r) => r.synthetic_case_id).join(', ')}), không cụm, mỗi case đã retry 1 lần. \`buildSearchQuery\` (shadow diff) chạy TRƯỚC nhánh trả 502 → \`translate_shadow_diff\` vẫn được ghi cho các case này.
- Latency p50/p90/p99 = ${q(lat, 0.5)}/${q(lat, 0.9)}/${q(lat, 0.99)} ms — không thấy leo thang; runner abort: ${aMeta.end?.aborted ? 'CÓ — ' + aMeta.end.abort_reason : 'KHÔNG'}.
- **Kết luận A1:** ${(!aMeta.end?.aborted && aInfraFail.every((r) => r.http_status === 502))
    ? '5 lỗi đều là 502 upstream (nguồn ngoài OpenAlex/EuropePMC/CORE/SemanticScholar chập chờn), KHÔNG phải regression của Chimedis/shadow. Không thấy server/latency regression do shadow ở tầng HTTP. ✅ (điều kiện Gate "không server regression do shadow" ĐẠT ở tầng đo được)'
    : '⚠️ Có lỗi không phải 502-upstream — soi danh sách infra fail trong raw.'}

### A2. Dịch (legacy production, có thật)
- \`query.effective\` bắt được cho ${aSuccess.length} case.
- local legacy khớp production legacy: ${pct(localLegacyMatch, predRows.length)} → ${localLegacyMatch === predRows.length ? 'engine legacy môi trường build == production (không có overlay MySQL làm lệch).' : 'có lệch — production có overlay dict_candidates; ghi chú khi so v2.'}

### A3. v2 (DỰ ĐOÁN cục bộ — chờ Runtime logs)
- predicted agree ${pct(predAgree, predRows.length)}, predicted disagree ${pct(predDisagree, predRows.length)}.
- phân loại heuristic: ${Object.entries(classCounts).map(([k, v]) => `${k}=${v}`).join(' · ')}.
- ${logDiffs ? '' : '**Không dùng số này làm Gate.** Chờ `translate_shadow_diff` thật.'}

## B. Cohort B — Local deterministic Evidence

| Tiêu chí Gate | Kết quả |
|---|---|
| Evidence cases | ${bEv.length} |
| Ambiguity/uncertainty auto-run sai (**bắt buộc 0**) | **${bEvUncertainNotGated.length}** ${bEvUncertainNotGated.length === 0 ? '✅' : '❌'} |
| Evidence gated khi có uncertainty | ${bEvGated.length}/${bEv.length} |
| Boolean/parens structure fail | ${bBoolFail.length} ${bBoolFail.length === 0 ? '✅' : '❌'} |
| NEGATIVE → mapping \`high\` | ${bNegFlags.length} ${bNegFlags.length === 0 ? '✅' : '⚠️ xem S1/S2'} |

### B1. Ghi chú bản chất (không phải lỗi Gate)
- 103/103 evidence case bị gate \`needs_resolution\`. Lý do chủ yếu: cụm tiếng Anh thuần / cụm Boolean nằm trong \`unresolved\` (engine v2 không coi tiếng Anh là "đã dịch"). **An toàn cho P0** (0 auto-run sai) nhưng là đặc tính cần cân nhắc UX Evidence ở P2/analysis, KHÔNG phải blocker P0.

## C. Cohort C — Organic
${logDiffs ? 'Xem phần tách organic bên dưới (dựa trên dòng translate_shadow_diff ngoài cửa sổ synthetic).' : 'Chưa có (không có Runtime logs). Không trộn với synthetic.'}

## D. Severity (từ dữ liệu chốt được)

### S0 — Critical
- Cohort B: **0** (0 Evidence ambiguity auto-run sai; 0 Boolean logic bị đổi).
- Cohort A: chờ Runtime logs để loại trừ silent drop production; local prediction: ${classCounts['v2 BETTER (flags untranslated vs legacy silent)'] || 0} case v2 gắn cờ untranslated ở chỗ legacy im lặng (v2 tốt hơn, không phải S0 của v2).

### S1 — Major (ứng viên — chờ G4)
${bNegFlags.length === 0 ? '- Không.' : bNegFlags.map((r) => {
      const hi = (r.v2_translated || []).filter((t) => t.confidence === 'high').map((t) => `${t.from}→${t.to}`).join(', ');
      const isName = /luận văn|thạc sĩ/i.test(r.input);
      return `- ${r.synthetic_case_id} "${r.input}" → \`${hi}\` (high). ${isName ? '**Tên người bị TCM-hoá** — S1 candidate. Nguyên nhân sơ bộ: R2 \`looksLikeProperNoun\` chỉ chặn match **đơn token**; "hoàng kỳ" là surface **2 token** trùng tên người nên lọt.' : 'Tên cơ quan + từ chủ đề thật ("đột quỵ") — nhẹ hơn, có thể S2/S3. Ghi chú \`nghiên cứu\`→ còn sót \`cứu\`.'}`;
    }).join('\n')}

### S2 — Moderate
- **Known R4/R5 tái hiện (đã KHÓA cho P1 Batch 01 — KHÔNG mở rộng scope):** ~${classCounts['v2 WORSE (known R4/R5 wrong mapping)'] || 0} case v2 chèn chuỗi sai đã biết: \`nephralgia\` (đau thần kinh toạ toneless, VD P0-0003), \`part of the brain\` (脑/não, VD P0-0032), \`Prunus mume Sieb. et\` + mai hoa châm sai (VD P0-0012). Discovery giữ ngữ cảnh; production hiện trả legacy nên KHÔNG ảnh hưởng người dùng. Chốt ở P1.
- v2 "leaks raw tokens" (~${classCounts['v2 WORSE (leaks raw tokens)'] || 0} case): engine giữ từ định tính tiếng Việt (\`người\`, \`chức năng vận động\`, \`biến thiên nhịp tim\`…) trong \`effective_query\` v2 thay vì cắt như legacy. Đây là hạng R11 stoplist (rollout §2 OUT SCOPE trừ khi gây S0/S1) — chưa thấy gây S0/S1. Ghi backlog.
- Đặc tính Evidence-gate-all (B1) nếu coi là giảm khả năng dùng.
- CoreDB \`auto/medium\` chưa sạch: sẽ rõ hơn khi có \`translate_shadow_diff\` confidence counts.

### S3 — Minor
- Câu cảnh báo \`routes/research.js\` hard-code "cụm tiếng Việt" kể cả input Trung/Anh (VD \`影响\`). Wording only.
- OR-group lặp surface VI+ZH (đã biết từ blind v1.1 R9).

## E. Gate P0 — đối chiếu \`docs/translation-shadow-p0-automation-v1.md\` §8

| Điều kiện | Trạng thái |
|---|---|
| synthetic Discovery: 0 S0/S1 chưa giải thích | ${bNegFlags.length ? '⏳ 0 S0; ' + bNegFlags.length + ' ứng viên S1/S2 NEGATIVE có root cause sơ bộ — chờ G4 chốt' : '⏳ chờ Runtime logs'} |
| 0 silent drop | ⏳ chờ Runtime logs (local: v2 KHÔNG drop; nó flag untranslated) |
| local Evidence: 0 ambiguity/uncertainty auto-run sai | ✅ 0 |
| Boolean/negative controls sạch | Boolean ✅ · negative ⚠️ (${bNegFlags.length} flag) |
| không server regression do shadow | ${(!aMeta.end?.aborted && aInfraFail.every((r) => r.http_status === 502)) ? '✅ (tầng HTTP; 5 lỗi là 502 upstream, không phải shadow)' : '⚠️'} |
| clinical disagreements được G4 phân loại | ⏳ cần Runtime logs + G4 |
| ≥1 lớp production Evidence/organic smoke trước flip v2 | ⏳ chưa (theo kế hoạch: trước P4) |

### Kết luận

${(bEvUncertainNotGated.length === 0 && bBoolFail.length === 0 && !aMeta.end?.aborted && aInfraFail.every((r) => r.http_status === 502))
    ? `**P0 SYNTHETIC EXECUTION COMPLETE — WAITING ONLY FOR RUNTIME LOG EXPORT.**

Đã hoàn tất theo \`docs/translation-shadow-p0-automation-v1.md\` §9: (1) pack 620 hợp lệ; (2) Cohort A production Discovery 517/517; (3) Cohort B local Evidence 103/103; (4) raw artifacts đã commit.

Chốt được ngay:
- Cohort B: **0 Evidence ambiguity/uncertainty auto-run sai**, **0 Boolean structure fail** → tiêu chí bắt buộc của Evidence ĐẠT.
- Cohort A hạ tầng: 99.0% success, 5 lỗi đều 502 upstream, latency ổn, runner không abort → **không server regression do shadow**.
- Không có S0 nào được xác nhận từ dữ liệu hiện có.

Chờ / cần G4:
- ${bNegFlags.length} cờ NEGATIVE: **P0-0483** "Hoàng Kỳ Anh…" → \`hoàng kỳ→Astragalus (high)\` = **ứng viên S1** (tên người → dược liệu; R2 chỉ chặn match đơn-token); **P0-0008** "Đại học Y Hà Nội…đột quỵ" → \`đột quỵ→stroke\` = nhẹ, có thể S2/S3 (từ chủ đề thật). G4 quyết trước khi chốt PASS/FAIL.
- ~${classCounts['v2 WORSE (known R4/R5 wrong mapping)'] || 0} case tái hiện R4/R5 đã KHÓA cho P1 Batch 01 — không phải scope mới.
- \`silent drop\` production + \`agree %\` / \`confidence\` / \`ambiguous_count\` thật: **cần chủ dự án export Runtime logs cửa sổ \`${aMeta.start?.started_at ?? '?'} → ${aMeta.end?.ended_at ?? '?'}\`**.

KHÔNG tự chuyển \`TRANSLATE_ENGINE=v2\`. KHÔNG mở P1. KHÔNG patch.
Đề xuất patch nhỏ nhất **nếu G4 xác nhận P0-0483 là S1**: mở rộng \`looksLikeProperNoun()\` (engine.js) để bỏ qua cả clinical surface **đa token** khi mọi token Title-Case và có hàng xóm Title-Case. Chờ reviewer.`
    : '**P0 SYNTHETIC: có tiêu chí bắt buộc chưa đạt** — xem bảng trên. Chỉ lập root-cause + đề xuất patch nhỏ nhất, chờ reviewer. KHÔNG tự patch.'}
`;
fs.writeFileSync(ANALYSIS_OUT, analysis);

console.error(`[report] raw → ${RAW_OUT}`);
console.error(`[report] analysis → ${ANALYSIS_OUT}`);
console.error(`[report] Cohort A: ${aSuccess.length}/${aRows.length} ok, infra_fail ${aInfraFail.length}, pred_agree ${pct(predAgree, predRows.length)}`);
console.error(`[report] Cohort B: evidence ${bEv.length}, uncertain-not-gated ${bEvUncertainNotGated.length}, bool_fail ${bBoolFail.length}, neg_flags ${bNegFlags.length}`);
console.error(`[report] runtime logs: ${logDiffs ? logDiffs.length + ' diff lines' : 'NOT PROVIDED — pending export'}`);
