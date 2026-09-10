// build-tcm-dictionary.mjs v2 — Milestone D3.
//
//     node scripts/build-tcm-dictionary.mjs
//
// Nguồn: GET https://dict.chimedis.vn/api/terms (công khai) — kho tam ngữ Việt–Trung–Anh
// của dict.chimedis.vn (Dược liệu / Huyệt vị / Giải phẫu / Sinh lý / Từ ghép Y Khoa).
//
// SINH RA HAI thứ:
//   1. lib/tcm-dictionary.json         — định dạng CŨ (khoá bỏ dấu). CHỈ cho engine legacy
//                                        (TRANSLATE_ENGINE=legacy, mặc định production hiện tại).
//   2. data/tcm-concepts/coredb.generated.jsonc — concept `trust:auto` cho engine v2.
//                                        GIỮ NGUYÊN DẤU tiếng Việt + thanh pinyin (khoá tra chính).
//                                        KHÔNG cắt âm tiết ngắn: đụng độ do dấu được COLLISION_SET
//                                        + shadow verified xử lý (concepts.js).
//
// So sánh trước–sau in ra cuối để bảo đảm KHÔNG mất dữ liệu.

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConceptFiles, buildIndexes } from '../lib/translate/concepts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.CORE_TERMS_URL || 'https://dict.chimedis.vn/api/terms';
const LEGACY_JSON = path.join(__dirname, '..', 'lib', 'tcm-dictionary.json');
const CONCEPT_FILE = path.join(__dirname, '..', 'data', 'tcm-concepts', 'coredb.generated.jsonc');

const GROUP_PRIORITY = ['Dược liệu', 'Huyệt vị', 'Giải phẫu', 'Sinh lý', 'Từ ghép Y Khoa'];
const DOMAIN_OF = {
  'Dược liệu': 'herb', 'Huyệt vị': 'acupoint', 'Giải phẫu': 'anatomy',
  'Sinh lý': 'physiology', 'Từ ghép Y Khoa': 'term',
};

// ---- helpers dùng chung ----
function stripDiacritics(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
const norm = (s) => stripDiacritics(String(s || '')).toLowerCase().replace(/\s+/g, ' ').trim();
const nfc = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();

function isAffix(en) {
  const first = String(en).split(',')[0].trim();
  return /^-|-$/.test(first) || first.replace(/[-()]/g, '').length < 3;
}
// P1 Batch 01 (§4 item 5): dọn nhãn English bẩn — hậu tố tác giả thực vật học lặp/nhiều tầng
// ("Prunus mume Sieb. et", "... Sieb. et Zucc. fruit"). Lột LẶP các token tác giả ở cuối chuỗi.
const BOTAN_AUTHOR =
  /\s+(?:Bge?\.|L\.|Linn\.|Miq\.|DC\.|Thunb\.|Franch\.|Maxim\.|Sieb\.|Zucc\.|Hance|Turcz\.|Rupr\.|Kar\.|Kir\.|Willd\.|Bunge|Nakai|Kom\.|Rehd\.|Gaertn\.|Sm\.|Sm|Lindl\.|Baill\.|Benth\.|Hook\.|Wall\.|Roxb\.|Pers\.|Br\.|R\.Br\.|f\.|et|ex|emend\.|nom\.)\.?\s*$/i;
function cleanEn(en) {
  let s = String(en).split(/[,;]/)[0].replace(/\([^)]*\)/g, '');
  let prev;
  do { prev = s; s = s.replace(BOTAN_AUTHOR, '').trimEnd(); } while (s !== prev);
  return s.replace(/\s+/g, ' ').trim();
}
const slug = (s) =>
  stripDiacritics(String(s)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
const isHan = (s) => /[㐀-鿿豈-﫿]/.test(String(s || ''));

// ---- tải nguồn ----
const res = await fetch(SRC, { headers: { Accept: 'application/json' } });
if (!res.ok) throw new Error(`Không tải được ${SRC}: HTTP ${res.status}`);
const body = await res.json();
const terms = Array.isArray(body) ? body : body.data || body.terms || [];
if (!terms.length) throw new Error('API không trả về mục nào.');

const sorted = [...terms].sort(
  (a, b) => GROUP_PRIORITY.indexOf(a.group1) - GROUP_PRIORITY.indexOf(b.group1)
);

// =====================================================================
// 1) lib/tcm-dictionary.json  (định dạng CŨ — KHÔNG đổi logic, giữ tương thích legacy)
// =====================================================================
const legacyOut = {};
let legacyKept = 0, legacySkip = 0;
for (const t of sorted) {
  const en = cleanEn(t.en);
  if (!en || isAffix(t.en)) { legacySkip++; continue; }
  legacyKept++;
  const synSet = new Set();
  if (t.hz) synSet.add(t.hz);
  if (t.hz_traditional && t.hz_traditional !== t.hz) synSet.add(t.hz_traditional);
  if (t.py) synSet.add(t.py.replace(/\s+/g, ' ').trim());
  String(t.en).split(',').slice(1).map((x) => cleanEn(x)).filter(Boolean).forEach((x) => synSet.add(x));
  const entry = { en, syn: [...synSet].filter((s) => s && s.toLowerCase() !== en.toLowerCase()).slice(0, 6) };
  const keys = new Set();
  for (const part of String(t.vi).split(/[,;/]/)) {
    const k = norm(part);
    if (k.length >= 2 && (k.includes(' ') || k.length >= 4)) keys.add(k);
  }
  if (t.hz) keys.add(t.hz);
  if (t.hz_traditional && t.hz_traditional !== t.hz) keys.add(t.hz_traditional);
  if (t.py) {
    const p = norm(t.py);
    const spaceless = p.replace(/ /g, '');
    if (p.includes(' ') || p.length >= 5) keys.add(p);
    if (spaceless.length >= 5 || p.includes(' ')) keys.add(spaceless);
  }
  for (const k of keys) if (!(k in legacyOut)) legacyOut[k] = entry;
}
const prevLegacyKeys = existsSync(LEGACY_JSON)
  ? Object.keys(JSON.parse(readFileSync(LEGACY_JSON, 'utf8'))).length : 0;
writeFileSync(LEGACY_JSON, JSON.stringify(legacyOut, null, 0) + '\n');

// =====================================================================
// 2) data/tcm-concepts/coredb.generated.jsonc  (engine v2 — GIỮ DẤU, trust:auto)
// =====================================================================
const byEn = new Map(); // slug(en) -> concept
let cdKept = 0, cdSkip = 0;
const surfKeySeen = new Set();

for (const t of sorted) {
  const en = cleanEn(t.en);
  if (!en || isAffix(t.en)) { cdSkip++; continue; }
  cdKept++;
  const id = `coredb-${slug(en)}`;
  let c = byEn.get(id);
  if (!c) {
    c = {
      id,
      domain: DOMAIN_OF[t.group1] || 'term',
      clinical: false, // CoreDB không có disease/pattern/formula/method
      en,
      en_synonyms: String(t.en).split(',').slice(1).map((x) => cleanEn(x)).filter(Boolean).slice(0, 6),
      same_as: [],
      surface_forms: [],
      trust: 'auto',
      source: 'coredb',
    };
    byEn.set(id, c);
  }
  const addSurface = (sf) => {
    const key = `${c.id}|${sf.lang}|${sf.text}`;
    if (surfKeySeen.has(key)) return;
    surfKeySeen.add(key);
    c.surface_forms.push(sf);
  };
  // tiếng Việt — GIỮ NGUYÊN DẤU (NFC), tách danh sách đồng nghĩa; KHÔNG lọc theo độ dài.
  for (const part of String(t.vi || '').split(/[,;/]/)) {
    const text = nfc(part);
    if (text) addSurface({ lang: 'vi', text, tone_exact: true, confidence: 'medium' });
  }
  if (t.hz) addSurface({ lang: 'zh', text: String(t.hz).trim(), confidence: 'medium' });
  if (t.hz_traditional && t.hz_traditional !== t.hz)
    addSurface({ lang: 'zh', text: String(t.hz_traditional).trim(), confidence: 'medium' });
  // pinyin — GIỮ THANH ĐIỆU
  if (t.py) {
    const text = String(t.py).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
    if (text && !isHan(text)) addSurface({ lang: 'py', text, tone_exact: true, confidence: 'medium' });
  }
}
const concepts = [...byEn.values()].filter((c) => c.surface_forms.length);
concepts.sort((a, b) => a.id.localeCompare(b.id));

const header =
  `// TỰ SINH bởi scripts/build-tcm-dictionary.mjs từ ${SRC} — KHÔNG SỬA TAY.\n` +
  `// trust:auto (trần tin cậy = medium). GIỮ NGUYÊN dấu tiếng Việt + thanh pinyin.\n` +
  `// verified (data/tcm-concepts/*.jsonc khác) LUÔN che các mục ở đây khi trùng khoá.\n` +
  `// Sinh lại: node scripts/build-tcm-dictionary.mjs\n`;
// một concept / dòng → diff dễ đọc khi CoreDB thay đổi
const bodyLines = concepts.map((c) => '  ' + JSON.stringify(c)).join(',\n');
writeFileSync(CONCEPT_FILE, header + '[\n' + bodyLines + '\n]\n');

// =====================================================================
// 3) ĐỐI CHIẾU trước–sau — bảo đảm không mất dữ liệu + đo đụng độ mới
// =====================================================================
const all = loadConceptFiles();
const verifiedOnly = all.filter((c) => c._file !== 'coredb.generated.jsonc');
const baseCollisions = new Set(buildIndexes(verifiedOnly).COLLISION_SET);
const fullIdx = buildIndexes(all);
const newCollisions = [...fullIdx.COLLISION_SET].filter((k) => !baseCollisions.has(k));

const sfCount = (arr, lang) =>
  arr.reduce((n, c) => n + c.surface_forms.filter((s) => s.lang === lang).length, 0);

console.log('─'.repeat(64));
console.log(`CoreDB (${SRC})`);
console.log(`  mục vào                : ${terms.length}`);
console.log(`  bỏ (phụ tố)            : ${cdSkip}`);
console.log(`  concept sinh ra        : ${concepts.length}  (gộp theo English term)`);
console.log(`  surface: vi ${sfCount(concepts, 'vi')} · zh ${sfCount(concepts, 'zh')} · py ${sfCount(concepts, 'py')}`);
console.log('');
console.log(`lib/tcm-dictionary.json  : ${Object.keys(legacyOut).length} khoá  (trước: ${prevLegacyKeys}${
  Object.keys(legacyOut).length < prevLegacyKeys ? '  ⚠️ GIẢM — kiểm tra!' : ''})`);
console.log('');
console.log(`Concept toàn hệ          : ${all.length}  (verified ${verifiedOnly.length} + coredb ${all.length - verifiedOnly.length})`);
console.log(`Đụng độ (COLLISION_SET)  : verified ${baseCollisions.size} → toàn hệ ${fullIdx.COLLISION_SET.size}`);
if (newCollisions.length) {
  console.log(`  ⚠️ ${newCollisions.length} đụng độ MỚI do CoreDB — cần thêm ca test hoặc rà:`);
  for (const k of newCollisions) {
    const r = fullIdx.collisionReport.find((x) => x.folded === k);
    console.log(`     "${k}"  ${r ? r.concepts.join('  |  ') : ''}`);
  }
} else {
  console.log('  ✓ CoreDB (auto) KHÔNG tạo đụng độ mới (verified che hết).');
}
console.log('─'.repeat(64));
console.log(`Đã ghi:\n  ${path.relative(process.cwd(), LEGACY_JSON)}\n  ${path.relative(process.cwd(), CONCEPT_FILE)}`);
