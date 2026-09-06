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
 * @param {string} rawQuery  truy vấn gốc (ngữ cảnh)
 * @param {string[]} terms   các cụm cần dịch
 * @returns {Promise<Array<{term:string,en:string,syn:string[]}>>}  chỉ trả cụm dịch được (en khác rỗng)
 */
export async function translateTerms(rawQuery, terms) {
  const clean = [...new Set((terms || []).map((s) => String(s).trim()).filter((s) => s.length >= 2))].slice(0, 8);
  if (!API_KEY || !clean.length) return [];

  const key = clean.join('|');
  if (inflight.has(key)) return inflight.get(key);
  if (!underRateLimit()) return [];

  const p = (async () => {
    const sys =
      'Bạn dịch thuật ngữ Y học cổ truyền Trung Hoa và y sinh từ tiếng Việt hoặc tiếng Trung ' +
      'sang tiếng Anh/Latin CHUẨN dùng trong PubMed/MeSH. Chỉ trả JSON, không giải thích.';
    const user =
      `Ngữ cảnh truy vấn: "${String(rawQuery).slice(0, 200)}".\n` +
      `Dịch từng cụm sau: ${JSON.stringify(clean)}.\n` +
      'Trả về MẢNG JSON, mỗi phần tử {"term": <cụm gốc>, "en": <thuật ngữ tiếng Anh/Latin chuẩn — ' +
      'CHỌN DẠNG HAY GẶP NHẤT trong tiêu đề/tóm tắt PubMed; hoặc "" nếu KHÔNG phải thuật ngữ y khoa / ' +
      'chỉ là từ nối>, "syn": [2-4 dạng viết PHỔ BIẾN KHÁC trong PubMed, gồm cả từ đồng nghĩa hay gặp hơn, ' +
      'vd "预防"→en:"prevention",syn:["prophylaxis","preventive"]]}. Không bịa. Chỉ JSON.';

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
