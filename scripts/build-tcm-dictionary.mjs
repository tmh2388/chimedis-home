// Sinh `lib/tcm-dictionary.json` từ CoreDB (kho thuật ngữ tam ngữ Việt–Trung–Anh của
// dict.chimedis.vn). Chạy lại mỗi khi CoreDB có thêm mục:
//
//     node scripts/build-tcm-dictionary.mjs
//
// Nguồn: GET https://dict.chimedis.vn/api/terms  (công khai, không cần khoá) — trả về 2500+
// mục Dược liệu / Huyệt vị / Giải phẫu / Sinh lý / Từ ghép Y Khoa, mỗi mục đủ vi/hz/py/en.
//
// File sinh ra được `lib/tcm-vocab.js` nạp + gộp vào bảng tra, KHÔNG phụ thuộc MySQL lúc chạy.

import { writeFileSync } from 'node:fs';

const SRC = process.env.CORE_TERMS_URL || 'https://dict.chimedis.vn/api/terms';
// Ưu tiên khi trùng khoá: domain "chính" (dược liệu/huyệt vị) thắng "từ ghép y khoa".
const GROUP_PRIORITY = ['Dược liệu', 'Huyệt vị', 'Giải phẫu', 'Sinh lý', 'Từ ghép Y Khoa'];

function stripDiacritics(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function norm(s) {
  return stripDiacritics(String(s || '')).toLowerCase().replace(/\s+/g, ' ').trim();
}
// `en` là phụ tố (tiền/hậu tố) chứ không phải từ tra được: "a-, an-", "ab-", "cephal(o)-"...
function isAffix(en) {
  const first = String(en).split(',')[0].trim();
  return /^-|-$/.test(first) || first.replace(/[-()]/g, '').length < 3;
}
function cleanEn(en) {
  return String(en)
    .split(/[,;]/)[0] // "Astragalus membranaceus Bge.; A. m. var. mongholicus" -> phần đầu
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+(Bge?\.|L\.|Linn\.|Miq\.|DC\.|Thunb\.|Franch\.|Maxim\.|Sieb\.|Zucc\.|Hance|Turcz\.|Rupr\.|Kar\.|Kir\.|Willd\.)\.?\s*$/i, '') // bỏ ký hiệu tác giả thực vật ở cuối
    .replace(/\s+/g, ' ')
    .trim();
}

const res = await fetch(SRC, { headers: { Accept: 'application/json' } });
if (!res.ok) throw new Error(`Không tải được ${SRC}: HTTP ${res.status}`);
const body = await res.json();
const terms = Array.isArray(body) ? body : body.data || body.terms || [];
if (!terms.length) throw new Error('API không trả về mục nào.');

const out = {}; // key (đã chuẩn hoá / hoặc chuỗi Hán thô) -> { en, syn: [] }
let kept = 0, skipped = 0;

const sorted = [...terms].sort(
  (a, b) => GROUP_PRIORITY.indexOf(a.group1) - GROUP_PRIORITY.indexOf(b.group1)
);

for (const t of sorted) {
  const en = cleanEn(t.en);
  if (!en || isAffix(t.en)) { skipped++; continue; }
  kept++;

  const synSet = new Set();
  if (t.hz) synSet.add(t.hz);
  if (t.hz_traditional && t.hz_traditional !== t.hz) synSet.add(t.hz_traditional);
  if (t.py) synSet.add(t.py.replace(/\s+/g, ' ').trim());
  // các cách viết tiếng Anh khác trong `en` (sau dấu phẩy)
  String(t.en).split(',').slice(1).map((x) => cleanEn(x)).filter(Boolean).forEach((x) => synSet.add(x));
  const entry = { en, syn: [...synSet].filter((s) => s && s.toLowerCase() !== en.toLowerCase()).slice(0, 6) };

  const keys = new Set();
  // tiếng Việt (kể cả tách theo dấu phẩy / chấm phẩy nếu là danh sách đồng nghĩa).
  // BỎ khoá tiếng Việt 1 âm tiết ngắn (≤3 ký tự sau khi bỏ dấu): sau khi bỏ dấu, "trị"
  // (điều trị) == "trĩ" (bệnh trĩ), "tri" (tri thức)... — khớp lẻ những âm tiết này gây
  // dịch sai trong câu dài. Thuật ngữ dược liệu/huyệt vị/giải phẫu thật đều ≥2 âm tiết.
  for (const part of String(t.vi).split(/[,;/]/)) {
    const k = norm(part);
    if (k.length >= 2 && (k.includes(' ') || k.length >= 4)) keys.add(k);
  }
  // chữ Hán thô (giản thể + phồn thể) — dùng trực tiếp làm khoá, không chuẩn hoá
  if (t.hz) keys.add(t.hz);
  if (t.hz_traditional && t.hz_traditional !== t.hz) keys.add(t.hz_traditional);
  // pinyin: có dấu → bỏ dấu, cả dạng có và không khoảng trắng. BỎ pinyin 1 âm tiết ngắn
  // (≤4 ký tự, không khoảng trắng) — vd "bi" (鼻/mũi) đụng "bì" (da) tiếng Việt sau khi bỏ dấu.
  if (t.py) {
    const p = norm(t.py);
    const spaceless = p.replace(/ /g, '');
    if (p.includes(' ') || p.length >= 5) keys.add(p);
    if (spaceless.length >= 5 || p.includes(' ')) keys.add(spaceless);
  }

  for (const k of keys) {
    if (!(k in out)) out[k] = entry; // domain ưu tiên hơn (đã sort) giữ khoá khi trùng
  }
}

const path = new URL('../lib/tcm-dictionary.json', import.meta.url);
writeFileSync(path, JSON.stringify(out, null, 0) + '\n');
console.log(
  `Đã ghi ${Object.keys(out).length} khoá (từ ${kept} mục, bỏ ${skipped} phụ tố) → lib/tcm-dictionary.json`
);
