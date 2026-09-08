// Milestone D — di trú RAW / GENERAL / ZH_EXTRA của lib/tcm-vocab.js sang schema concept.
// docs/translation-engine.md §11.
//
// QUAN TRỌNG: khoá trong tcm-vocab.js ĐÃ BỎ DẤU (vd 'hoang ky'). Nguồn KHÔNG có dạng đúng dấu.
// → script này xuất surface_form vi với `tone_exact: false` + `diacritic_pending: true`.
//   Người rà (G4) backfill dạng đúng dấu rồi chuyển file từ  data/tcm-concepts/migrated/
//   lên  data/tcm-concepts/  để engine nạp làm khoá tra CHÍNH.
// Trước khi backfill, các mục này CHỈ khớp qua Tầng 2 (folded), trần `medium` — an toàn.
//
// Chạy: node scripts/migrate-tcm-vocab-to-concepts.mjs
// Không ghi đè file đã có trong migrated/ (giữ chỉnh sửa tay).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'data', 'tcm-concepts', 'migrated');
fs.mkdirSync(OUT_DIR, { recursive: true });

const vocab = await import('../lib/tcm-vocab.js');
// RAW/GENERAL/ZH_EXTRA không export — đọc lại từ nguồn qua regex đơn giản.
const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tcm-vocab.js'), 'utf8');

function grabObject(name) {
  const m = src.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n\\};`));
  if (!m) return {};
  const body = m[1];
  const out = {};
  const re = /['"]([^'"]+)['"]\s*:\s*\{\s*en:\s*['"]([^'"]+)['"]\s*(?:,\s*syn:\s*\[([^\]]*)\])?\s*\}/g;
  let x;
  while ((x = re.exec(body))) {
    const syn = (x[3] || '').split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    out[x[1]] = { en: x[2], syn };
  }
  return out;
}

const RAW = grabObject('RAW');
const GENERAL = grabObject('GENERAL');
const ZH_EXTRA = grabObject('ZH_EXTRA');

const slug = (s) => s.normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 60);
const isHan = (s) => /[㐀-鿿]/.test(s);

function build(map, domain, lang) {
  const byEn = new Map();
  for (const [key, v] of Object.entries(map)) {
    const id = `mig-${slug(v.en)}`;
    if (!byEn.has(id)) {
      byEn.set(id, {
        id, domain,
        clinical: ['disease', 'pattern', 'formula', 'method'].includes(domain),
        en: v.en, en_synonyms: v.syn || [],
        mesh_id: null, mesh_term: null, same_as: [],
        surface_forms: [],
        trust: 'verified', source: 'import',
        diacritic_pending: lang === 'vi',
      });
    }
    const c = byEn.get(id);
    c.surface_forms.push(
      lang === 'zh' || isHan(key)
        ? { lang: 'zh', text: key, confidence: 'high' }
        : { lang: 'vi', text: key, tone_exact: false, confidence: 'low', diacritic_pending: true }
    );
  }
  return [...byEn.values()];
}

const files = {
  'raw.jsonc': build(RAW, 'herb', 'vi'),          // RAW gồm nhiều domain — người rà phân loại lại
  'general.jsonc': build(GENERAL, 'disease', 'vi'),
  'zh-extra.jsonc': build(ZH_EXTRA, 'method', 'zh'),
};

let total = 0;
for (const [name, arr] of Object.entries(files)) {
  const p = path.join(OUT_DIR, name);
  if (fs.existsSync(p)) { console.log(`giữ nguyên (đã có): ${name}`); total += arr.length; continue; }
  const header = `// TỰ SINH từ lib/tcm-vocab.js — CHƯA có dạng đúng dấu tiếng Việt.\n`
    + `// Backfill surface_form vi đúng dấu + phân loại domain, rồi chuyển lên ../  để engine nạp.\n`;
  fs.writeFileSync(p, header + JSON.stringify(arr, null, 2) + '\n');
  console.log(`ghi ${name}: ${arr.length} concept`);
  total += arr.length;
}
console.log(`\nTổng: ${total} concept di trú → data/tcm-concepts/migrated/  (chưa nạp cho tới khi rà + chuyển lên)`);
void vocab;
