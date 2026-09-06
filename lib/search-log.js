// GĐ1 của "từ điển tự học": lưu vết những truy vấn tìm y văn mà hệ thống dịch KHÔNG hết
// (untranslated ≠ rỗng) hoặc ra rất ít kết quả. Editor/Admin xem hàng đợi này (xếp theo tần
// suất thật) để biết cần bổ sung từ nào — thay cho việc từng người dùng phải báo tay.
//
// Ghi kiểu "fire-and-forget": KHÔNG chặn phản hồi tìm kiếm, mọi lỗi nuốt im lặng.

import { getPool, isDbConfigured } from './db.js';
import { normalizeTerm } from './tcm-vocab.js';

const LOW_RESULT_THRESHOLD = 3;
const THIN_RESULT_MAX = 8; // 3..8 kết quả sau khi ĐÃ dịch → nghi bản dịch chưa phủ đủ biến thể

// Chống ghi trùng: cùng một truy vấn thô trong 10 phút → bỏ qua (tránh 1 người bấm lại nhiều lần
// làm phồng bảng). Map nhỏ trong RAM, tự dọn.
const recent = new Map();
const DEDUP_MS = 10 * 60 * 1000;
function seenRecently(key) {
  const now = Date.now();
  if (recent.size > 5000) {
    for (const [k, t] of recent) if (now - t > DEDUP_MS) recent.delete(k);
  }
  const t = recent.get(key);
  if (t && now - t < DEDUP_MS) return true;
  recent.set(key, now);
  return false;
}

function guessLang(s) {
  const str = String(s || '');
  const hasHan = /[㐀-鿿豈-﫿]/.test(str);
  const hasViet = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(str);
  if (hasHan && hasViet) return 'mixed';
  if (hasHan) return 'zh';
  if (hasViet) return 'vi';
  return 'en';
}

/**
 * @param {object} p
 * @param {string|null} p.rawQuery   truy vấn người dùng gõ (null với tìm nâng cao → dùng effective)
 * @param {string}      p.effective  truy vấn tiếng Anh đã dựng
 * @param {string[]}    p.untranslated  các cụm không dịch được
 * @param {number}      p.resultCount   số kết quả trả về
 * @param {string}      p.mode        'GET' | 'POST' | 'ADV'
 */
export function logSearchMiss({ rawQuery, effective, untranslated = [], resultCount = 0, mode = '', wasTranslated = false }) {
  try {
    if (!isDbConfigured()) return;
    const raw = String(rawQuery || effective || '').trim().slice(0, 500);
    if (raw.length < 2) return;

    const rows = [];
    const uniqUntr = [...new Set((untranslated || []).map((x) => normalizeTerm(x)).filter((x) => x && x.length >= 2))];
    if (uniqUntr.length) {
      for (const term of uniqUntr) {
        rows.push([term.slice(0, 190), 'untranslated', raw, String(effective || '').slice(0, 1000), resultCount, guessLang(raw)]);
      }
    } else if (resultCount < LOW_RESULT_THRESHOLD && effective) {
      rows.push([normalizeTerm(raw).slice(0, 190), 'low_results', raw, String(effective).slice(0, 1000), resultCount, guessLang(raw)]);
    } else if (wasTranslated && resultCount >= LOW_RESULT_THRESHOLD && resultCount <= THIN_RESULT_MAX && effective) {
      // Đã dịch được nhưng kết quả mỏng → nghi bản dịch chưa phủ đủ biến thể tiếng Anh
      // (vd chỉ "prophylaxis" thay vì cả "prevention"). Để rà soát trong màn "Từ điển".
      rows.push([normalizeTerm(raw).slice(0, 190), 'thin_results', raw, String(effective).slice(0, 1000), resultCount, guessLang(raw)]);
    }
    if (!rows.length) return;

    // Dedup theo (raw + reason của lô này).
    if (seenRecently(raw + '|' + rows[0][1])) return;

    getPool()
      .query(
        'INSERT INTO dict_term_misses (term, reason, raw_query, effective, result_count, lang) VALUES ?',
        [rows]
      )
      .catch((e) => console.warn('[search-log] insert lỗi (bỏ qua):', e.message));
  } catch (e) {
    console.warn('[search-log] lỗi (bỏ qua):', e.message);
  }
}
