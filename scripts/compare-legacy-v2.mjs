// Đối chiếu OFFLINE engine dịch legacy vs v2 trên danh sách truy vấn thực tế.
// docs/translation-engine.md §12 — bằng chứng trước khi bật TRANSLATE_ENGINE=v2.
//
//   node scripts/compare-legacy-v2.mjs [đường-dẫn-file-truy-vấn] > report.md
//
// Mặc định đọc test/realistic-queries.txt. In báo cáo Markdown ra stdout.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QFILE = process.argv[2] || path.join(__dirname, '..', 'test', 'realistic-queries.txt');

// legacy: buildSearchQuery với TRANSLATE_ENGINE chưa set (mặc định legacy)
delete process.env.TRANSLATE_ENGINE;
const { buildSearchQuery } = await import('../lib/tcm-vocab.js');
const { translateQuery } = await import('../lib/translate/index.js');

const lines = fs.readFileSync(QFILE, 'utf8').split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Heuristic phân loại một cặp (legacy, v2):
//  - AGREE           : chuỗi gửi đi tương đương
//  - V2_ASKS         : v2 đánh dấu mơ hồ / cần chọn nghĩa (disambiguation)
//  - V2_FIXES_BUG    : legacy có "eczema"/"zhongfeng"… sai kinh điển, v2 bỏ được
//  - V2_MORE_TERMS   : v2 dịch được nhiều cụm hơn (ít chữ Việt thô còn sót)
//  - V2_FEWER_TERMS  : v2 dịch được ít hơn legacy (nghi ngờ — cần soi)
//  - DIFF_OTHER      : khác nhưng chưa rõ bên nào hơn
const KNOWN_BAD = [/\beczema\b/i, /\bdermatitis\b/i, /zhongfeng/i, /\bLR4\b/, /hemorrhoid/i];

function classify(q, L, V) {
  if (norm(L.text) === norm(V.text)) return 'AGREE';
  const legacyBad = KNOWN_BAD.some((re) => re.test(L.text)) && !KNOWN_BAD.some((re) => re.test(V.text));
  if (legacyBad) return 'V2_FIXES_BUG';
  if ((V.disambiguation || []).length) return 'V2_ASKS';
  const lViet = (L.text.match(/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi) || []).length;
  const vViet = (V.text.match(/[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/gi) || []).length;
  if (vViet < lViet) return 'V2_MORE_TERMS';
  if (vViet > lViet) return 'V2_FEWER_TERMS';
  const lQuoted = (L.text.match(/"/g) || []).length;
  const vQuoted = (V.text.match(/"/g) || []).length;
  if (vQuoted > lQuoted) return 'V2_MORE_TERMS';
  if (vQuoted < lQuoted) return 'V2_FEWER_TERMS';
  return 'DIFF_OTHER';
}

const rows = [];
for (const q of lines) {
  let L, V;
  try { L = buildSearchQuery(q, { orSynonyms: true, mode: 'discovery' }); }
  catch (e) { L = { text: `‹lỗi legacy: ${e.message}›` }; }
  try {
    const r = translateQuery(q, { mode: 'discovery' });
    V = { text: r.effective_query, disambiguation: r.disambiguation, unresolved: r.unresolved,
          needs: r.needs_resolution, translated: r.translated };
  } catch (e) { V = { text: `‹lỗi v2: ${e.message}›` }; }
  rows.push({ q, L, V, cls: classify(q, L, V) });
}

const order = ['V2_FIXES_BUG', 'V2_FEWER_TERMS', 'V2_ASKS', 'V2_MORE_TERMS', 'DIFF_OTHER', 'AGREE'];
const label = {
  V2_FIXES_BUG: '🟢 v2 SỬA LỖI (legacy sai kinh điển)',
  V2_FEWER_TERMS: '🔴 v2 DỊCH ÍT HƠN — SOI KỸ (có thể là hồi quy)',
  V2_ASKS: '🟡 v2 HỎI LẠI (đánh dấu mơ hồ, giữ nguyên văn ở Discovery)',
  V2_MORE_TERMS: '🟢 v2 DỊCH NHIỀU HƠN (ít chữ Việt thô sót lại)',
  DIFF_OTHER: '⚪ KHÁC — cần mắt người',
  AGREE: '⬜ GIỐNG NHAU (không cần xem)',
};
const count = Object.fromEntries(order.map((k) => [k, rows.filter((r) => r.cls === k).length]));

let out = `# Đối chiếu engine dịch: legacy vs v2\n\n`;
out += `_${lines.length} truy vấn · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}_\n\n`;
out += `| Nhóm | Số |\n|---|---|\n`;
for (const k of order) out += `| ${label[k]} | **${count[k]}** |\n`;
out += `\n**Cần bạn xem:** nhóm 🔴 (nghi hồi quy) trước, rồi 🟡 và ⚪. Nhóm 🟢 và ⬜ chỉ liếc qua.\n\n---\n`;

for (const k of order) {
  if (k === 'AGREE') continue; // liệt kê riêng cuối
  const grp = rows.filter((r) => r.cls === k);
  if (!grp.length) continue;
  out += `\n## ${label[k]} — ${grp.length}\n\n`;
  for (const r of grp) {
    out += `**\`${r.q}\`**\n`;
    out += `- legacy: \`${r.L.text}\`\n`;
    out += `- v2·····: \`${r.V.text}\`\n`;
    if ((r.V.disambiguation || []).length) {
      out += `- v2 hỏi: ${r.V.disambiguation.map((d) => `«${d.text}» → ${(d.options || []).map((o) => o.en).join(' / ')}`).join('; ')}\n`;
    }
    if ((r.V.unresolved || []).length) out += `- v2 chưa dịch: ${r.V.unresolved.map((u) => `«${u}»`).join(', ')}\n`;
    out += `\n`;
  }
}

const agree = rows.filter((r) => r.cls === 'AGREE');
out += `\n## ⬜ GIỐNG NHAU — ${agree.length}\n\n`;
out += agree.map((r) => `- \`${r.q}\` → \`${r.L.text}\``).join('\n') + '\n';

process.stdout.write(out);
