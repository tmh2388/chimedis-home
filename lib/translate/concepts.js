// Milestone D — nạp concept + dựng chỉ mục + COLLISION_SET.
// Xem docs/translation-engine.md §4, §6.
//
// Nguồn: data/tcm-concepts/*.jsonc  (trust theo từng file/concept).
// D3 sẽ thêm overlay CoreDB (trust:auto) + dict_candidates. D1 chỉ nạp file tĩnh.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { foldDiacritics } from './normalize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONCEPTS_DIR = path.join(__dirname, '..', '..', 'data', 'tcm-concepts');

export const TRUST_CEILING = Object.freeze({ verified: 'high', auto: 'medium', candidate: 'medium' });
export const CLINICAL_DOMAINS = new Set(['disease', 'pattern', 'formula', 'method']);

/** Bỏ comment // và /* *\/ khỏi JSONC rồi parse. Chuỗi có "//" hiếm trong dữ liệu này. */
function parseJsonc(txt, file) {
  const noBlock = txt.replace(/\/\*[\s\S]*?\*\//g, '');
  const noLine = noBlock.replace(/(^|[^:])\/\/.*$/gm, '$1');
  try {
    return JSON.parse(noLine);
  } catch (err) {
    throw new Error(`JSONC lỗi ở ${file}: ${err.message}`);
  }
}

export function loadConceptFiles(dir = CONCEPTS_DIR) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const seenId = new Map(); // id -> file (chặn trùng id xuyên file — review#5)
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.jsonc') && !name.endsWith('.json')) continue;
    const file = path.join(dir, name);
    const arr = parseJsonc(fs.readFileSync(file, 'utf8'), name);
    if (!Array.isArray(arr)) throw new Error(`${name}: file concept phải là mảng`);
    for (const c of arr) {
      if (!c.id) throw new Error(`${name}: concept thiếu "id"`);
      if (seenId.has(c.id)) throw new Error(`Trùng concept id "${c.id}": ${seenId.get(c.id)} & ${name}`);
      seenId.set(c.id, name);
      c._file = name;
      c.trust = c.trust || 'verified';
      c.clinical = c.clinical ?? CLINICAL_DOMAINS.has(c.domain);
      c.same_as = Array.isArray(c.same_as) ? c.same_as : [];
      c.en_synonyms = Array.isArray(c.en_synonyms) ? c.en_synonyms : [];
      c.surface_forms = Array.isArray(c.surface_forms) ? c.surface_forms : [];
      out.push(c);
    }
  }
  return out;
}

/** Union-Find gộp các concept khai báo `same_as` (equivalence group). */
function equivalenceRoots(concepts) {
  const parent = new Map(concepts.map((c) => [c.id, c.id]));
  const find = (x) => {
    while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)) ?? x); x = parent.get(x); }
    return x;
  };
  for (const c of concepts) {
    for (const other of c.same_as) {
      if (parent.has(other)) parent.set(find(c.id), find(other));
    }
  }
  const root = new Map();
  for (const c of concepts) root.set(c.id, find(c.id));
  return root;
}

/**
 * @returns {{
 *   concepts, byId,
 *   EXACT_VI: Map<string, string[]>,  // text đúng dấu (NFC lowercase) -> [conceptId]
 *   EXACT_ZH: Map<string, string[]>,
 *   EXACT_PY: Map<string, string[]>,  // pinyin đúng thanh
 *   FOLDED_VI: Map<string, string[]>, // text bỏ dấu -> [conceptId]  (chỉ Tầng 2)
 *   FOLDED_PY: Map<string, string[]>,
 *   COLLISION_SET: Set<string>,       // folded key -> >=2 concept_id khác nhóm same_as
 *   collisionReport: Array
 * }}
 */
export function buildIndexes(concepts) {
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const root = equivalenceRoots(concepts);
  const EXACT_VI = new Map(), EXACT_ZH = new Map(), EXACT_PY = new Map();
  const FOLDED_VI = new Map(), FOLDED_PY = new Map();
  // theo folded key: tập concept + độ dài token (đụng độ chỉ tính cùng token-length)
  const foldGroups = new Map(); // key `${lang}:${folded}:${tokLen}` -> Set<rootId>, và {ids:Set, surfaces:[]}

  const push = (map, key, id) => {
    if (!key) return;
    const a = map.get(key) || [];
    if (!a.includes(id)) a.push(id);
    map.set(key, a);
  };

  for (const c of concepts) {
    for (const sf of c.surface_forms) {
      const text = String(sf.text || '').normalize('NFC').toLowerCase().trim();
      if (!text) continue;
      const lang = sf.lang || 'vi';
      const tokLen = text.split(/\s+/).length;
      if (lang === 'zh') {
        push(EXACT_ZH, text, c.id);
        continue; // chữ Hán không fold
      }
      if (lang === 'py') {
        if (sf.tone_exact !== false) push(EXACT_PY, text, c.id);
        const f = foldDiacritics(text);
        push(FOLDED_PY, f, c.id);
        addFold(foldGroups, `py:${f}:${tokLen}`, root.get(c.id), c, sf);
        continue;
      }
      // vi
      if (sf.tone_exact !== false) push(EXACT_VI, text, c.id);
      const f = foldDiacritics(text);
      push(FOLDED_VI, f, c.id);
      addFold(foldGroups, `vi:${f}:${tokLen}`, root.get(c.id), c, sf);
    }
  }

  const COLLISION_SET = new Set();
  const collisionReport = [];
  for (const [key, g] of foldGroups) {
    if (g.roots.size >= 2) {
      const folded = key.split(':')[1];
      COLLISION_SET.add(folded);
      collisionReport.push({
        folded,
        concepts: [...g.entries].map((e) => `${e.text} [${e.id}${byId.get(e.id)?.clinical ? ' · clinical' : ''}] → ${byId.get(e.id)?.en}`),
      });
    }
  }
  collisionReport.sort((a, b) => a.folded.localeCompare(b.folded));

  return { concepts, byId, root, EXACT_VI, EXACT_ZH, EXACT_PY, FOLDED_VI, FOLDED_PY, COLLISION_SET, collisionReport };
}

function addFold(groups, key, rootId, concept, sf) {
  let g = groups.get(key);
  if (!g) { g = { roots: new Set(), entries: [] }; groups.set(key, g); }
  g.roots.add(rootId);
  g.entries.push({ id: concept.id, text: sf.text });
}

export function trustCeiling(concept) {
  return TRUST_CEILING[concept?.trust] || 'medium';
}
