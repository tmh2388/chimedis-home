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
// Thứ bậc tin cậy — dùng để "che" (shadow): khi một khoá tra ứng với nhiều concept khác
// tier, chỉ giữ concept ở tier CAO NHẤT. Nhờ đó overlay CoreDB (auto, ~2500 mục) KHÔNG
// tạo đụng độ / mơ hồ giả với 131 concept verified đã rà tay. Đụng độ verified↔verified
// (châm/chàm…) vẫn được giữ. Xem docs/translation-engine.md §6, D3.
export const TRUST_RANK = Object.freeze({ verified: 3, auto: 2, candidate: 1 });
export const CLINICAL_DOMAINS = new Set(['disease', 'pattern', 'formula', 'method']);

/** Lọc danh sách conceptId về tier tin cậy cao nhất có mặt. */
function topTier(ids, byId) {
  if (ids.length < 2) return ids;
  let max = 0;
  for (const id of ids) max = Math.max(max, TRUST_RANK[byId.get(id)?.trust] || 0);
  return ids.filter((id) => (TRUST_RANK[byId.get(id)?.trust] || 0) === max);
}

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
      // D8: surface `trust:auto` (CoreDB) 1 âm tiết vi/py ngắn ≤4 ký tự → BỎ, KHÔNG index.
      // Sau khi bỏ dấu, "đau"=="đầu"=="dau", "ống"=="ong"… gây khớp lẻ dịch sai
      // ("đau răng"→"Heading", "ống cổ tay"→"Wrist Joint"). Thuật ngữ CoreDB thật đều ≥2 âm
      // tiết. Concept verified (châm, cứu…) KHÔNG bị lọc — chỉ áp cho trust auto/candidate.
      if (c.trust !== 'verified' && tokLen === 1 && (lang === 'vi' || lang === 'py')
          && foldDiacritics(text).replace(/[^a-z0-9]/g, '').length <= 4) {
        continue;
      }
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

  // Shadow: mọi map khoá tra chỉ giữ concept ở tier cao nhất (verified che auto/candidate).
  for (const map of [EXACT_VI, EXACT_ZH, EXACT_PY, FOLDED_VI, FOLDED_PY]) {
    for (const [k, ids] of map) map.set(k, topTier(ids, byId));
  }

  // COLLISION_SET = đụng độ Ở TIER VERIFIED (≥2 concept verified khác nghĩa cùng khoá bỏ dấu):
  // châm/chàm, trị/trĩ… — bắt buộc "hỏi lại" + phải có ca test (CI chặn).
  // Đụng độ auto↔auto (CoreDB, ~27 cặp: than=thận/thân, âm đạo…) KHÔNG vào đây: engine vẫn
  // đánh dấu `ambiguous` khi khớp bỏ-dấu ra ≥2 root, nhưng KHÔNG bắt buộc ca test — vì trần
  // tin cậy auto đã là `medium` và G4 (biên tập viên) rà hàng tuần. Promote lên verified khi cần.
  const COLLISION_SET = new Set();          // chỉ verified-tier (CI gate)
  const SOFT_COLLISION_SET = new Set();     // auto-tier — engine dùng để đánh dấu ambiguous
  const collisionReport = [];
  const softCollisionReport = [];
  for (const [key, g] of foldGroups) {
    const folded = key.split(':')[1];
    const ids = [...new Set(g.entries.map((e) => e.id))];
    const tierIds = topTier(ids, byId);
    const tierRoots = new Set(tierIds.map((id) => root.get(id) || id));
    if (tierRoots.size < 2) continue;
    const isVerified = tierIds.every((id) => byId.get(id)?.trust === 'verified');
    const line = {
      folded,
      concepts: tierIds.map((id) => {
        const e = g.entries.find((x) => x.id === id);
        return `${e?.text ?? id} [${id}${byId.get(id)?.clinical ? ' · clinical' : ''}] → ${byId.get(id)?.en}`;
      }),
    };
    if (isVerified) { COLLISION_SET.add(folded); collisionReport.push(line); }
    else { SOFT_COLLISION_SET.add(folded); softCollisionReport.push(line); }
  }
  collisionReport.sort((a, b) => a.folded.localeCompare(b.folded));
  softCollisionReport.sort((a, b) => a.folded.localeCompare(b.folded));

  return {
    concepts, byId, root, EXACT_VI, EXACT_ZH, EXACT_PY, FOLDED_VI, FOLDED_PY,
    COLLISION_SET, SOFT_COLLISION_SET, collisionReport, softCollisionReport,
  };
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
