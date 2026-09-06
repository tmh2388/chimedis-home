// GĐ2: gọi LLM (Anthropic) dịch các cụm thuật ngữ y khoa/YHCT tiếng Việt/Trung mà từ điển
// tĩnh chưa có, sang tiếng Anh/Latin chuẩn PubMed. Tuỳ chọn — không có ANTHROPIC_API_KEY thì
// vô hiệu (GĐ1 vẫn chạy). Có bộ đếm chặn chi phí + chống gọi trùng đồng thời.

const API_KEY = process.env.ANTHROPIC_API_KEY || null;
const MODEL = process.env.ANTHROPIC_TRANSLATE_MODEL || 'claude-haiku-4-5-20251001';
const MAX_CALLS_PER_MIN = parseInt(process.env.LLM_TRANSLATE_RPM || '30', 10);
const TIMEOUT_MS = 12000;

export function isLlmConfigured() {
  return !!API_KEY;
}

// Cửa sổ trượt 60s để giới hạn tốc độ gọi (chặn chi phí khi có đợt truy cập lớn).
let callTimes = [];
function underRateLimit() {
  const now = Date.now();
  callTimes = callTimes.filter((t) => now - t < 60000);
  if (callTimes.length >= MAX_CALLS_PER_MIN) return false;
  callTimes.push(now);
  return true;
}

// Chống gọi LLM trùng cho cùng tập cụm đang xử lý.
const inflight = new Map();

function parseJsonLoose(text) {
  const m = String(text).match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/**
 * Cho LLM xem TOÀN BỘ truy vấn (không phải từng mảnh rời) và tự tách thành các thuật ngữ y
 * khoa CÓ NGHĨA (kể cả cụm nhiều từ như "hội chứng ống cổ chân" = tarsal tunnel syndrome),
 * bỏ qua các cụm đã dịch được. Nhờ vậy tránh dịch word-by-word sai ngữ cảnh.
 * @param {string} rawQuery
 * @param {string[]} knownTerms  các cụm gốc đã dịch được (để LLM khỏi lặp)
 * @returns {Promise<Array<{term:string,en:string,syn:string[]}>>}
 */
export async function translateQueryTerms(rawQuery, knownTerms = []) {
  const q = String(rawQuery || '').trim().slice(0, 300);
  if (!API_KEY || q.length < 2) return [];

  const key = 'Q:' + q;
  if (inflight.has(key)) return inflight.get(key);
  if (!underRateLimit()) return [];

  const p = (async () => {
    const sys =
      'Bạn phân tích truy vấn tìm y văn (Y học cổ truyền Trung Hoa / y sinh) viết bằng tiếng Việt ' +
      'hoặc tiếng Trung, tách ra các THUẬT NGỮ Y KHOA CÓ NGHĨA và dịch sang tiếng Anh/Latin CHUẨN ' +
      'dùng trong PubMed/MeSH. Giữ nguyên cụm nhiều từ (không tách rời từng chữ). Chỉ trả JSON.';
    const known = (knownTerms || []).filter(Boolean).slice(0, 12);
    const user =
      `Truy vấn: "${q}".\n` +
      (known.length ? `Các cụm ĐÃ dịch được (BỎ QUA, đừng lặp): ${JSON.stringify(known)}.\n` : '') +
      'Tách phần CÒN LẠI thành các thuật ngữ y khoa có nghĩa (ưu tiên cụm nhiều từ nguyên vẹn, ' +
      'vd "hội chứng ống cổ chân" → "tarsal tunnel syndrome"). Trả MẢNG JSON, mỗi phần tử ' +
      '{"term": <cụm gốc nguyên văn trong truy vấn>, "en": <thuật ngữ tiếng Anh/Latin chuẩn, ' +
      'CHỌN DẠNG HAY GẶP NHẤT trong PubMed>, "syn": [2-4 biến thể phổ biến khác trong PubMed]}. ' +
      'Bỏ qua từ nối (điều trị/nghiên cứu/hiệu quả... nếu không phải trọng tâm). Không bịa. Chỉ JSON.';

    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 500,
          system: sys,
          messages: [{ role: 'user', content: user }],
        }),
      });
      clearTimeout(to);
      if (!res.ok) {
        console.warn('[llm-translate] HTTP', res.status);
        return [];
      }
      const data = await res.json();
      const text = (data.content || []).map((c) => c.text || '').join('');
      const arr = parseJsonLoose(text);
      if (!Array.isArray(arr)) return [];
      return arr
        .map((x) => ({
          term: String(x.term || '').trim(),
          en: String(x.en || '').trim(),
          syn: Array.isArray(x.syn) ? x.syn.map((s) => String(s).trim()).filter(Boolean).slice(0, 3) : [],
        }))
        .filter((x) => x.term && x.en && x.en.length <= 200);
    } catch (e) {
      console.warn('[llm-translate] lỗi:', e.message);
      return [];
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

export const LLM_MODEL_NAME = MODEL;
