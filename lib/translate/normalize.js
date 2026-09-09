// Milestone D — Tầng 0: chuẩn hoá KHÔNG mất thông tin.
// Xem docs/translation-engine.md §5 (Tầng 0).
//
// NGUYÊN TẮC BẤT BIẾN: GIỮ NGUYÊN mọi dấu thanh + dấu chữ tiếng Việt, giữ nguyên chữ Hán.
// `folded` (bỏ dấu) CHỈ để Tầng 2 sinh ứng viên — không bao giờ là khoá tra chính.

const CJK_RE = /[㐀-鿿豈-﫿\u{20000}-\u{2FA1F}]/u;

/** Bỏ dấu thanh + dấu chữ tiếng Việt (đ→d). KHÔNG dùng làm khoá chính. */
export function foldDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')      // dấu thanh tổ hợp
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .normalize('NFC');
}

export function hasCJK(s) {
  return CJK_RE.test(String(s || ''));
}

export function hasVietnameseTone(s) {
  // có ký tự khác sau khi fold ⇒ có dấu tiếng Việt (thanh hoặc â/ê/ô/ơ/ư/đ)
  return foldDiacritics(s) !== String(s || '').normalize('NFC');
}

function detectScript(normalized) {
  const cjk = hasCJK(normalized);
  const viTone = hasVietnameseTone(normalized);
  const latin = /[a-z]/i.test(foldDiacritics(normalized));
  if (cjk && latin) return 'mixed';
  if (cjk) return 'zh';
  if (viTone) return 'vi';
  if (latin) return 'en'; // toàn ASCII, không dấu — có thể là tiếng Anh HOẶC tiếng Việt gõ không dấu
  return 'en';
}

/**
 * @param {string} raw
 * @returns {{ raw, normalized, tokens: string[], folded: string, foldedTokens: string[], script: 'vi'|'zh'|'mixed'|'en' }}
 */
// R3 (blind v1 S1-2): GIỮ ngoặc tròn `( )` như token cấu trúc + tách khoảng trắng
// quanh chúng; bỏ mọi dấu câu khác (kể cả `"`) như trước. Không mất thông tin thanh/chữ.
function shapeQuery(s) {
  return String(s)
    .replace(/[^\p{L}\p{N}\s()\-]+/gu, ' ')  // giữ ( ) — vẫn bỏ " . , ; …
    .replace(/([()])/g, ' $1 ')              // ( ) thành token riêng
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeInput(raw) {
  const nfc = String(raw || '').normalize('NFC');
  // rawNormalized: GIỮ NGUYÊN hoa/thường (cho heuristic tên riêng R2 + phát hiện toán tử).
  const rawNormalized = shapeQuery(nfc);
  // normalized: lowercase MỌI token TRỪ toán tử Boolean viết HOA đứng riêng (AND/OR/NOT).
  // Cùng độ dài với rawNormalized ⇒ offset CJK-run khớp nhau.
  const normalized = rawNormalized.replace(/\S+/g, (w) => (/^(AND|OR|NOT)$/.test(w) ? w : w.toLowerCase()));
  const tokens = normalized ? normalized.split(' ') : [];
  const rawTokens = rawNormalized ? rawNormalized.split(' ') : [];
  const folded = foldDiacritics(normalized);
  return {
    raw: nfc,
    rawNormalized,
    normalized,
    tokens,
    rawTokens,
    folded,
    foldedTokens: folded ? folded.split(' ') : [],
    script: detectScript(normalized),
  };
}

/** Cắt chữ Hán liền nhau thành mảng "run" (đoạn Hán không có space). */
export function cjkRuns(normalized) {
  const runs = [];
  const re = new RegExp(CJK_RE.source, 'gu');
  let m;
  let cur = '';
  let start = -1;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (CJK_RE.test(ch)) {
      if (!cur) start = i;
      cur += ch;
    } else if (cur) {
      runs.push({ text: cur, start });
      cur = '';
    }
  }
  if (cur) runs.push({ text: cur, start });
  void m; void re;
  return runs;
}
