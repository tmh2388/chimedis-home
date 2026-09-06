// GĐ2: điều phối "từ điển tự học".
//  - enrichUntranslated(): khi truy vấn còn cụm chưa dịch → tra bảng dict_candidates (cache),
//    thiếu thì gọi LLM, DÙNG NGAY cho lượt tìm hiện tại, và lưu ứng viên.
//  - refreshLearn(): định kỳ — (a) thăng cấp ứng viên gặp đủ nhiều lên 'auto_active',
//    (b) nạp lại lớp phủ vào bảng tra (lib/tcm-vocab.js).
//
// Toàn bộ phòng thủ: DB/LLM lỗi → trả nguyên trạng, tìm kiếm vẫn chạy như GĐ1.

import { getPool, isDbConfigured } from './db.js';
import { normalizeTerm, setLearnedOverlay, expandEnSynonyms } from './tcm-vocab.js';
import { translateQueryTerms, isLlmConfigured, LLM_MODEL_NAME } from './llm-translate.js';

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
    // Bỏ mảnh TOÀN chữ Latin (vd "acupuncture", "meta-analysis" gõ xen kẽ) — đã là tiếng Anh,
    // không cần LLM dịch, tránh dịch lặp Anh→Anh + thêm nhóm OR thừa.
    const frags = [...new Set(
      (ex.untranslated || []).map((s) => String(s).trim())
        .filter((s) => s.length >= 2 && !/^[\x00-\x7f]+$/.test(s))
    )];
    if (!frags.length) return ex;
    // Nếu buildSearchQuery KHÔNG khớp thuật ngữ nào thì ex.text = truy vấn GỐC (còn tiếng Việt/
    // chữ Hán). Khi đó phải THAY, không được nối thêm — kẻo gửi cả tiếng Việt thô cho API.
    const hadDictHits = (ex.expandedFrom || []).length > 0;

    const pool = getPool();
    const resolved = []; // [{ term, en, syn }] — theo thứ tự để ghép vào truy vấn
    const seenEn = new Set((ex.expandedFrom || []).map((e) => String(e.en).toLowerCase()));

    // 1) Cache trước: các MẢNH chưa dịch có sẵn trong dict_candidates?
    const fragByKey = new Map(frags.map((t) => [keyOf(t), t]));
    const [rows] = await pool.query(
      `SELECT term_norm, term_display, en, syn FROM dict_candidates WHERE status <> 'rejected' AND term_norm IN (?)`,
      [[...fragByKey.keys()]]
    );
    const cachedKeys = new Set();
    for (const r of rows) {
      let syn = [];
      try { syn = Array.isArray(r.syn) ? r.syn : JSON.parse(r.syn || '[]'); } catch { syn = []; }
      cachedKeys.add(r.term_norm);
      if (!seenEn.has(String(r.en).toLowerCase())) {
        resolved.push({ term: r.term_display || fragByKey.get(r.term_norm), en: r.en, syn });
        seenEn.add(String(r.en).toLowerCase());
      }
    }
    if (rows.length) {
      pool.query(`UPDATE dict_candidates SET seen_count = seen_count + 1 WHERE term_norm IN (?)`, [[...cachedKeys]]).catch(() => {});
    }

    // 2) Còn mảnh chưa xử lý → cho LLM xem TOÀN BỘ truy vấn (tránh dịch word-by-word).
    const stillUncovered = [...fragByKey.keys()].some((k) => !cachedKeys.has(k));
    if (stillUncovered && isLlmConfigured()) {
      const known = (ex.expandedFrom || []).map((e) => e.vi).filter(Boolean);
      const out = await translateQueryTerms(rawQuery, known);
      for (const item of out) {
        if (!item.term || !item.en || item.en.length > 200) continue;
        if (seenEn.has(item.en.toLowerCase())) continue;
        const k = keyOf(item.term);
        resolved.push({ term: item.term, en: item.en, syn: item.syn || [] });
        seenEn.add(item.en.toLowerCase());
        pool.query(
          `INSERT INTO dict_candidates (term_norm, term_display, lang, en, syn, llm_model, status)
             VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, 'new')
           ON DUPLICATE KEY UPDATE seen_count = seen_count + 1, last_seen = NOW(),
             en = IF(status = 'approved', en, VALUES(en)),
             syn = IF(status = 'approved', syn, VALUES(syn))`,
          [k.slice(0, 190), String(item.term).slice(0, 190), isHan(item.term) ? 'zh' : 'vi',
           item.en, JSON.stringify((item.syn || []).slice(0, 4)), LLM_MODEL_NAME]
        ).catch((e) => console.warn('[dict-learn] insert lỗi:', e.message));
      }
    }

    if (!resolved.length) return ex;

    // 3) Ghép vào truy vấn hiệu dụng + chip "đã nhận diện (tự động)". Giới hạn TỔNG số nhóm OR
    // ≤ 6 (kể cả nhóm từ từ điển tĩnh) để truy vấn không quá chặt → gần như hết kết quả.
    ex.expandedFrom = ex.expandedFrom || [];
    const existingGroups = hadDictHits ? (ex.expandedFrom.length) : 0;
    const budget = Math.max(1, 6 - existingGroups);
    const addParts = [];
    for (const r of resolved) {
      ex.expandedFrom.push({ vi: r.term, en: r.en, syn: r.syn || [], viaLLM: true });
      if (addParts.length < budget) addParts.push(orGroup(r.en, r.syn));
    }
    ex.text = hadDictHits ? [ex.text, ...addParts].filter(Boolean).join(' ') : addParts.join(' ');
    ex.untranslated = []; // LLM đã xem toàn bộ truy vấn — coi như đã xử lý
    ex.note = ex.note || 'Đã dịch thuật ngữ y khoa sang tiếng Anh để tra y văn quốc tế.';
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
    // (b) Nạp lớp phủ — MỌI ứng viên chưa bị từ chối (kể cả 'new'): đã dùng inline 1 lần rồi
    // thì tái dùng cho lượt sau, khỏi gọi lại LLM. 'auto_active'/'approved' chỉ là cấp độ tin
    // cậy để rà soát; 'rejected' mới bị loại khỏi lớp phủ.
    const [rows] = await pool.query(
      `SELECT term_norm, en, syn FROM dict_candidates WHERE status <> 'rejected'`
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
