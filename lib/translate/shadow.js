// Milestone D — chế độ SHADOW: tính engine v2 song song legacy, ghi diff CÓ CẤU TRÚC.
// Review PR #4 (2026-09-08): KHÔNG tạo kho raw-query mới; chỉ structured diff
//   { legacy_outcome, v2_outcome, confidence, ambiguous_count, engine_version } (+ search_run_id khi có).
// KHÔNG log user identity. Log ra stdout (hPanel Runtime logs) + (workbench) đính vào
// provenance sẵn có `wb_search_runs.query_expanded.shadow`.

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Tóm tắt diff v2 vs legacy — KHÔNG chứa raw query gốc. */
export function shadowDiff(legacy, v2, { searchRunId = null } = {}) {
  const legacyText = legacy?.text || '';
  const v2Text = v2?.text || '';
  return {
    engine_version: v2?.engine_version || null,
    agree: norm(legacyText) === norm(v2Text),
    legacy_outcome: legacyText,
    v2_outcome: v2Text,
    confidence: v2?.confidenceCounts || {},
    ambiguous_count: (v2?.disambiguation || []).length,
    unresolved_count: (v2?.untranslated || v2?.unresolved || []).length,
    needs_resolution: !!v2?.needs_resolution,
    ...(searchRunId != null ? { search_run_id: searchRunId } : {}),
  };
}

/** Ghi diff ra stdout dạng 1 dòng JSON. Không bao giờ ném lỗi. */
export function logShadowDiff(legacy, v2, ctx = {}) {
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ evt: 'translate_shadow_diff', ...shadowDiff(legacy, v2, ctx) }));
  } catch {
    /* nuốt — shadow không được làm hỏng tìm kiếm */
  }
}
