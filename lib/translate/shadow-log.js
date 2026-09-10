// P0 rollout — persistent MySQL sink cho translate_shadow_diff.
// Best-effort + async. TUYỆT ĐỐI không ném lỗi ra caller: lỗi DB/insert KHÔNG được làm fail search.
//
// Organic traffic: chỉ ghi metrics + hash (KHÔNG raw query, KHÔNG user identity).
// Synthetic workload (có `testTag` rõ ràng): ghi thêm full legacy/v2 outcome để phân tích.
// Retention 14 ngày: prune cơ hội (khi boot + rải rác theo số lần ghi).
//
// KHÔNG tạo hệ logging khác — stdout `translate_shadow_diff` vẫn do lib/translate/shadow.js lo.

import crypto from 'node:crypto';
import { getPool, isDbConfigured } from '../db.js';

const RETENTION_DAYS = 14;
const hash16 = (s) => crypto.createHash('sha256').update(String(s || '')).digest('hex').slice(0, 16);
const clampLen = (s) => Math.min(65535, String(s || '').length);
const TAG_RE = /^[a-z0-9][a-z0-9._-]{0,47}$/i;

let _writes = 0;
let _pruning = false;

async function prune() {
  if (_pruning || !isDbConfigured()) return;
  _pruning = true;
  try {
    await getPool().query(
      `DELETE FROM translate_shadow_log WHERE created_at < (NOW() - INTERVAL ? DAY) LIMIT 5000`,
      [RETENTION_DAYS]
    );
  } catch { /* nuốt — prune là cơ hội */ } finally {
    _pruning = false;
  }
}

// Gọi 1 lần khi app boot (server.js) — an toàn khi chưa cấu hình DB.
export function initShadowLogPrune() {
  prune();
}

/**
 * Ghi 1 dòng shadow diff xuống MySQL. Fire-and-forget: caller KHÔNG cần await.
 * @param {{text?:string}} legacy    kết quả legacy (đã trả cho user)
 * @param {{text?:string,engine_version?:string,confidenceCounts?:object,disambiguation?:any[],untranslated?:any[],unresolved?:any[],needs_resolution?:boolean}} v2
 * @param {{mode?:'discovery'|'evidence', testTag?:string|null, searchRunId?:number|null}} ctx
 */
export function logShadowToDb(legacy, v2, ctx = {}) {
  try {
    if (!isDbConfigured() || !v2) return;
    const legacyText = legacy?.text || '';
    const v2Text = v2?.text || '';
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const conf = v2.confidenceCounts || {};
    const mode = ctx.mode === 'evidence' ? 'evidence' : 'discovery';
    const tag = ctx.testTag && TAG_RE.test(ctx.testTag) ? ctx.testTag : null;

    const row = {
      engine_version: v2.engine_version ? String(v2.engine_version).slice(0, 24) : null,
      mode,
      agree: norm(legacyText) === norm(v2Text) ? 1 : 0,
      legacy_len: clampLen(legacyText),
      v2_len: clampLen(v2Text),
      conf_high: conf.high || 0,
      conf_medium: conf.medium || 0,
      conf_low: conf.low || 0,
      ambiguous_count: (v2.disambiguation || []).length,
      unresolved_count: (v2.untranslated || v2.unresolved || []).length,
      needs_resolution: v2.needs_resolution ? 1 : 0,
      legacy_hash: hash16(norm(legacyText)),
      v2_hash: hash16(norm(v2Text)),
      test_tag: tag,
      // full outcome CHỈ cho synthetic có tag — organic để NULL (không lưu văn bản truy vấn dịch)
      legacy_outcome: tag ? String(legacyText).slice(0, 4000) : null,
      v2_outcome: tag ? String(v2Text).slice(0, 4000) : null,
      search_run_id: Number.isInteger(ctx.searchRunId) ? ctx.searchRunId : null,
    };

    const cols = Object.keys(row);
    const sql = `INSERT INTO translate_shadow_log (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
    getPool().query(sql, cols.map((c) => row[c]))
      .then(() => {
        if (++_writes % 200 === 0) prune();
      })
      .catch(() => { /* nuốt — sink không được làm fail search */ });
  } catch {
    /* nuốt tất cả — best-effort */
  }
}
