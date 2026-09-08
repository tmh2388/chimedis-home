// Milestone D — điểm vào công khai của engine dịch v2.
// docs/translation-engine.md. Cờ chọn engine: env TRANSLATE_ENGINE = legacy (mặc định) | v2 | shadow.

import { loadConceptFiles, buildIndexes } from './concepts.js';
import { translate, ENGINE_VERSION } from './engine.js';

let _idx = null;

/** Nạp + dựng chỉ mục 1 lần (lazy). Gọi lại reload() sau khi đổi data ở D3. */
export function getIndexes() {
  if (!_idx) _idx = buildIndexes(loadConceptFiles());
  return _idx;
}
export function reload() { _idx = null; return getIndexes(); }

export function engineMode() {
  const m = String(process.env.TRANSLATE_ENGINE || 'legacy').toLowerCase();
  return ['legacy', 'v2', 'shadow'].includes(m) ? m : 'legacy';
}

/**
 * Dịch một truy vấn.
 * @param {string} rawQuery
 * @param {{ mode?: 'discovery'|'evidence', pinnedTerms?: object }} opts
 * @returns kết quả engine (xem engine.translate)
 */
export function translateQuery(rawQuery, opts = {}) {
  return translate(rawQuery, { ...opts, indexes: getIndexes() });
}

export { ENGINE_VERSION };

export function collisionReport() {
  return getIndexes().collisionReport;
}

export function stats() {
  const i = getIndexes();
  return {
    concepts: i.concepts.length,
    surface_vi_exact: i.EXACT_VI.size,
    surface_zh_exact: i.EXACT_ZH.size,
    surface_py_exact: i.EXACT_PY.size,
    folded_vi: i.FOLDED_VI.size,
    collisions: i.COLLISION_SET.size,
  };
}
