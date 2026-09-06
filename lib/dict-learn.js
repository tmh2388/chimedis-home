// GĐ2: điều phối "từ điển tự học".
//  - enrichUntranslated(): khi truy vấn còn cụm chưa dịch → tra bảng dict_candidates (cache),
//    thiếu thì gọi LLM, DÙNG NGAY cho lượt tìm hiện tại, và lưu ứng viên.
//  - refreshLearn(): định kỳ — (a) thăng cấp ứng viên gặp đủ nhiều lên 'auto_active',
//    (b) nạp lại lớp phủ vào bảng tra (lib/tcm-vocab.js).
//
// Toàn bộ phòng thủ: DB/LLM lỗi → trả nguyên trạng, tìm kiếm vẫn chạy như GĐ1.

import { getPool, isDbConfigured } from './db.js';
import { normalizeTerm, setLearnedOverlay, expandEnSynonyms } from './tcm-vocab.js';
import { translateTerms, isLlmConfigured, LLM_MODEL_NAME } from './llm-translate.js';

const PROMOTE_MIN_DISTINCT_QUERIES = parseInt(process.env.DICT_PROMOTE_MIN || '3', 10);
const REFRESH_MS = 10 * 60 * 1000;

const isHan = (s) => /[㐀-鿿豈-﫿]/.test(s);
const keyOf = (term) => (isHan(term) ? String(term).trim() : normalizeTerm(term));
// Chỉ giữ đồng nghĩa CHỮ LATIN cho truy vấn gửi API (giống buildSearchQuery).
const latinOnly = (arr) =>
  (arr || []).filter((s) => /^[\x00-\x7f]+$/.test(s) && !/[āáǎàēéěèīíǐìōóǒòūúǔù]/.test(s));

function orGroup(en, syn) {
  const alts = expandEnSynonyms(en, latinOnly(syn)); // + biến thể PubMed hay gặp
  return alts.length > 1 ? `(${alts.map((t) => `"${t}"`).join(' OR ')})` : `"${en}"`;
}

/**
 * @param {string} rawQuery
 * @param {{text:string, expandedFrom:Array, untranslated:string[], note:string|null}} ex  kết quả buildSearchQuery
 * @returns {Promise<typeof ex>}  ex đã bổ sung (nếu dịch thêm được)
 */
export async function enrichUntranslated(rawQuery, ex) {
  try {
    if (!isDbConfigured()) return ex;
    const terms = [...new Set((ex.untranslated || []).map((s) => String(s).trim()).filter((s) => s.length >= 2))];
    if (!terms.length) return ex;

    const pool = getPool();
    const byKey = new Map(terms.map((t) => [keyOf(t), t]));
    const keys = [...byKey.keys()];

    // 1) Cache: bảng dict_candidates (mọi status trừ 'rejected').
    const resolved = new Map(); // key -> { en, syn }
    const [rows] = await pool.query(
      `SELECT term_norm, en, syn FROM dict_candidates WHERE status <> 'rejected' AND term_norm IN (?)`,
      [keys]
    );
    for (const r of rows) {
      let syn = [];
      try { syn = Array.isArray(r.syn) ? r.syn : JSON.parse(r.syn || '[]'); } catch { syn = []; }
      resolved.set(r.term_norm, { en: r.en, syn });
    }
    if (rows.length) {
      pool.query(
        `UPDATE dict_candidates SET seen_count = seen_count + 1 WHERE term_norm IN (?)`,
        [rows.map((r) => r.term_norm)]
      ).catch(() => {});
    }

    // 2) Cụm chưa có trong cache → gọi LLM (nếu bật).
    const missing = keys.filter((k) => !resolved.has(k));
    if (missing.length && isLlmConfigured()) {
      const out = await translateTerms(rawQuery, missing.map((k) => byKey.get(k)));
      for (const item of out) {
        const k = keyOf(item.term);
        if (!byKey.has(k) || !item.en) continue;
        resolved.set(k, { en: item.en, syn: item.syn });
        pool.query(
          `INSERT INTO dict_candidates (term_norm, term_display, lang, en, syn, llm_model, status)
             VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, 'new')
           ON DUPLICATE KEY UPDATE seen_count = seen_count + 1, last_seen = NOW()`,
          [k, byKey.get(k), isHan(byKey.get(k)) ? 'zh' : 'vi', item.en, JSON.stringify(item.syn || []), LLM_MODEL_NAME]
        ).catch((e) => console.warn('[dict-learn] insert lỗi:', e.message));
      }
    }

    if (!resolved.size) return ex;

    // 3) Ghép phần dịch mới vào truy vấn hiệu dụng + chip "đã nhận diện".
    const addParts = [];
    const stillUntranslated = [];
    for (const t of terms) {
      const r = resolved.get(keyOf(t));
      if (r) {
        addParts.push(orGroup(r.en, r.syn));
        ex.expandedFrom = ex.expandedFrom || [];
        ex.expandedFrom.push({ vi: t, en: r.en, syn: r.syn || [], viaLLM: true });
      } else {
        stillUntranslated.push(t);
      }
    }
    if (addParts.length) {
      ex.text = [ex.text, ...addParts].filter(Boolean).join(' ');
      ex.untranslated = stillUntranslated;
      ex.note = ex.note || 'Đã dịch thuật ngữ y khoa sang tiếng Anh để tra y văn quốc tế.';
    }
    return ex;
  } catch (e) {
    console.warn('[dict-learn] enrich lỗi (bỏ qua):', e.message);
    return ex;
  }
}

async function refreshLearn() {
  if (!isDbConfigured()) return;
  const pool = getPool();
  try {
    // (a) Thăng cấp: ứng viên 'new' xuất hiện ở ≥ N truy vấn KHÁC NHAU (đếm từ dict_term_misses).
    await pool.query(
      `UPDATE dict_candidates c
         JOIN (SELECT term, COUNT(DISTINCT raw_query) dq FROM dict_term_misses GROUP BY term) m
           ON m.term = c.term_norm
          SET c.status = 'auto_active'
        WHERE c.status = 'new' AND m.dq >= ?`,
      [PROMOTE_MIN_DISTINCT_QUERIES]
    );
  } catch (e) {
    console.warn('[dict-learn] promote lỗi:', e.message);
  }
  try {
    // (b) Nạp lớp phủ.
    const [rows] = await pool.query(
      `SELECT term_norm, en, syn FROM dict_candidates WHERE status IN ('auto_active','approved')`
    );
    const entries = rows.map((r) => {
      let syn = [];
      try { syn = Array.isArray(r.syn) ? r.syn : JSON.parse(r.syn || '[]'); } catch { syn = []; }
      return { key: r.term_norm, en: r.en, syn };
    });
    setLearnedOverlay(entries);
    if (entries.length) console.log(`[dict-learn] lớp phủ: ${entries.length} cụm tự học.`);
  } catch (e) {
    console.warn('[dict-learn] loadOverlay lỗi:', e.message);
  }
}

export function startDictLearn() {
  refreshLearn();
  setInterval(refreshLearn, REFRESH_MS).unref?.();
}
