// M4 v1 — Gap Candidate: "nối đất" (grounded) gap analysis từ 1 lượt tìm kiếm THẬT.
// Xem docs/research-workbench-plan.md mục 6/7, docs/research-workbench-M0-architecture-freeze.md
// §A5 (MVP v1 chỉ đi tới trạng thái "candidate" — KHÔNG làm verification/state machine đầy đủ).
//
// Khác lib/llm-translate.js (Haiku, dịch cụm từ ngắn): đây là suy luận phân tích nhiều bài
// cùng lúc, dùng model mạnh hơn (Sonnet, ANTHROPIC_GAP_MODEL) và BẮT BUỘC hậu kiểm nối đất
// (groundGapCandidates) — không tin thẳng danh sách recordId do LLM tự khai, tự đối chiếu lại
// với đúng tập bài đã gửi, loại bỏ candidate trích dẫn ảo hoặc thiếu ≥2 dẫn chứng thật.

const API_KEY = process.env.ANTHROPIC_API_KEY || null;
const MODEL = process.env.ANTHROPIC_GAP_MODEL || 'claude-sonnet-5';
// 45s ban đầu quá ngắn cho lượt tìm nhiều bài (vd 25 bài × 1500 ký tự tóm tắt/bài) — Sonnet
// cần hơn 45s để phân tích + trả JSON có cấu trúc, gây lỗi "This operation was aborted" khi
// bị AbortController tự huỷ giữa chừng (lỗi thật user gặp 2026-09-18, xem Response body).
// Nới lên 110s (an toàn dưới ngưỡng phổ biến 120s của reverse proxy) — đây là hành động user
// chủ động bấm rồi chờ, không phải request chặn tải trang, chờ lâu hơn chấp nhận được.
const TIMEOUT_MS = 110000;
const MAX_RECORDS = 25; // chặn chi phí — M0 §16
const ABSTRACT_TRUNCATE = 1500; // ký tự/bài — M0 §16

export function isGapLlmConfigured() {
  return !!API_KEY;
}

function truncate(s, n) {
  const str = String(s || '');
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// Cắt bớt tập bài về tối đa MAX_RECORDS (ưu tiên bài có abstract, giữ thứ tự gốc).
function selectRecords(records) {
  const withAbstract = records.filter((r) => r.abstract);
  const withoutAbstract = records.filter((r) => !r.abstract);
  return [...withAbstract, ...withoutAbstract].slice(0, MAX_RECORDS);
}

function buildPrompt(records, projectTitle, questionText) {
  const selected = selectRecords(records);
  const refBlock = selected
    .map((r, i) => {
      const ref = `R${i + 1}`;
      const authors = (r.authors || []).slice(0, 3).join(', ');
      return `[${ref}] ${r.title}${r.year ? ` (${r.year})` : ''}${authors ? ` — ${authors}` : ''}\n` +
        `Tóm tắt: ${truncate(r.abstract, ABSTRACT_TRUNCATE) || '(không có tóm tắt)'}`;
    })
    .join('\n\n');

  const sys =
    'Bạn là trợ lý phân tích khoảng trống nghiên cứu Y học cổ truyền Trung Hoa / y sinh cho ' +
    'nghiên cứu sinh. NGUYÊN TẮC BẮT BUỘC: mọi khoảng trống ("gap") bạn nêu ra PHẢI trích dẫn ' +
    'CHÍNH XÁC mã tham chiếu [R#] của ÍT NHẤT 2 bài trong danh sách được cung cấp — TUYỆT ĐỐI ' +
    'KHÔNG được bịa mã tham chiếu không có trong danh sách, KHÔNG được suy đoán ngoài nội dung ' +
    'đã cho. Nếu không tìm đủ dẫn chứng cho 1 khoảng trống, đừng nêu ra. Chỉ trả JSON, không giải ' +
    'thích thêm ngoài JSON.';

  const user =
    `Dự án nghiên cứu: "${projectTitle || '(chưa đặt tên)'}".\n` +
    (questionText ? `Câu hỏi nghiên cứu: "${questionText}".\n` : '') +
    `\nDanh sách ${selected.length} bài đã tìm được:\n\n${refBlock}\n\n` +
    'Từ ĐÚNG các bài trên, tìm tối đa 5 "khoảng trống nghiên cứu ứng viên" — chỗ mà y văn hiện ' +
    'có (trong tập bài trên) CHƯA trả lời đủ tốt. Với mỗi khoảng trống, trả về đối tượng JSON có:\n' +
    '- "title": tên ngắn gọn của khoảng trống (1 câu)\n' +
    '- "gapType": một trong "evidence"|"population"|"intervention"|"outcome"|"method"|"mechanism"|"theory"\n' +
    '- "evidenceHave": mảng ít nhất 2 phần tử {"ref":"R#","note":"bài này cho biết gì"} — ref PHẢI có thật trong danh sách trên\n' +
    '- "whatsMissing": điều gì y văn hiện có chưa trả lời được\n' +
    '- "whyItMatters": vì sao khoảng trống này quan trọng\n' +
    '- "feasibilityNote": nhận xét ngắn về tính khả thi nếu muốn nghiên cứu khoảng trống này\n\n' +
    'Trả về MẢNG JSON các đối tượng trên, không có gì khác ngoài JSON.';

  return { sys, user, selected };
}

function parseJsonArray(text) {
  const m = String(text).match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

// Hậu kiểm nối đất: đối chiếu LẠI từng "ref" LLM khai với đúng tập bài đã gửi (không tin LLM).
// Candidate thiếu ref hợp lệ hoặc còn lại < 2 dẫn chứng SAU khi lọc → loại bỏ hoàn toàn.
function groundGapCandidates(rawCandidates, selectedRecords) {
  const refToRecord = new Map(selectedRecords.map((r, i) => [`R${i + 1}`, r]));
  const grounded = [];
  for (const raw of rawCandidates) {
    if (!raw || typeof raw !== 'object') continue;
    const title = String(raw.title || '').trim();
    if (!title) continue;
    const evidenceHave = Array.isArray(raw.evidenceHave)
      ? raw.evidenceHave
        .map((e) => {
          const rec = refToRecord.get(String(e?.ref || '').trim());
          if (!rec) return null; // ref ảo — loại ngay, không giữ lại dấu vết trong output
          return { recordId: rec.id, title: rec.title, note: String(e?.note || '').slice(0, 500) };
        })
        .filter(Boolean)
      : [];
    if (evidenceHave.length < 2) continue; // dưới 2 dẫn chứng thật — không đạt "nối đất"
    const gapType = ['evidence', 'population', 'intervention', 'outcome', 'method', 'mechanism', 'theory']
      .includes(raw.gapType) ? raw.gapType : null;
    grounded.push({
      title: title.slice(0, 500),
      gapType,
      evidenceHave,
      whatsMissing: String(raw.whatsMissing || '').slice(0, 2000),
      whyItMatters: String(raw.whyItMatters || '').slice(0, 2000),
      feasibilityNote: String(raw.feasibilityNote || '').slice(0, 1000),
    });
  }
  return grounded;
}

/**
 * @param {Array<{id:number,title:string,abstract:string,year:number,authors:string[]}>} records
 * @param {string} projectTitle
 * @param {string} [questionText]
 * @returns {Promise<{candidates: object[], model: string, tokensIn: number, tokensOut: number}>}
 */
export async function generateGapCandidates(records, projectTitle, questionText) {
  if (!API_KEY) throw new Error('Chưa cấu hình ANTHROPIC_API_KEY trên server');
  const usable = (records || []).filter((r) => r && r.title);
  if (usable.length < 2) throw new Error('Cần ít nhất 2 bài có tiêu đề để phân tích khoảng trống');

  const { sys, user, selected } = buildPrompt(usable, projectTitle, questionText);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: sys,
        messages: [{ role: 'user', content: user }],
      }),
    });
  } finally {
    clearTimeout(to);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`LLM HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((c) => c.text || '').join('');
  const rawArr = parseJsonArray(text) || [];
  const candidates = groundGapCandidates(rawArr, selected);
  return {
    candidates,
    model: MODEL,
    tokensIn: data.usage?.input_tokens || 0,
    tokensOut: data.usage?.output_tokens || 0,
  };
}
