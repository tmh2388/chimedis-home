// M0 contract `record_v1` — CanonicalResearchRecord + dedup theo identity graph.
// Xem docs/research-workbench-M0-architecture-freeze.md §A2.

export const STUDY_TYPES = Object.freeze([
  'rct', 'nrsi', 'cohort', 'case-control', 'cross-sectional', 'case-series',
  'case-report', 'systematic-review', 'meta-analysis', 'narrative-review',
  'guideline', 'in-vitro', 'animal', 'other', 'unknown',
]);

const ID_SCHEMES = ['doi', 'pmid', 'pmcid', 'trial_reg_id', 'openalex', 's2', 'core', 'wanfang', 'cnki'];

export function normalizeDoi(doi) {
  if (!doi) return null;
  return (
    String(doi)
      .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
      .trim()
      .toLowerCase() || null
  );
}

function cleanPmid(v) {
  if (!v) return null;
  return String(v).replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//i, '').replace(/\D/g, '') || null;
}

function cleanPmcid(v) {
  if (!v) return null;
  const s = String(v).toUpperCase().replace(/[^0-9A-Z]/g, '');
  return s ? (s.startsWith('PMC') ? s : `PMC${s.replace(/^PMC/, '')}`) : null;
}

/**
 * Dựng CanonicalResearchRecord từ một "raw normalized" bất kỳ.
 * `input` chấp nhận shape linh hoạt; các trường tối thiểu bắt buộc: title + provenance.
 */
export function toCanonicalRecord(input, { connector, connector_version, search_run_id = null } = {}) {
  const identifiers = {};
  for (const scheme of ID_SCHEMES) {
    const raw = input.identifiers?.[scheme] ?? input[scheme];
    if (raw == null || raw === '') continue;
    if (scheme === 'doi') identifiers.doi = normalizeDoi(raw);
    else if (scheme === 'pmid') identifiers.pmid = cleanPmid(raw);
    else if (scheme === 'pmcid') identifiers.pmcid = cleanPmcid(raw);
    else identifiers[scheme] = String(raw);
  }
  // pmid có thể nằm ở input.pmid (shape research-sources cũ)
  if (!identifiers.pmid && input.pmid) identifiers.pmid = cleanPmid(input.pmid);
  if (!identifiers.doi && input.doi) identifiers.doi = normalizeDoi(input.doi);

  const title = String(input.title || '(không có tiêu đề)').replace(/\s+/g, ' ').trim();

  return {
    source: input.source || connector || 'unknown',
    external_id: String(input.external_id || input.id || identifiers.doi || identifiers.pmid || title.slice(0, 64)),
    identifiers,
    title,
    abstract: input.abstract || null,
    authors: Array.isArray(input.authors) ? input.authors.filter(Boolean) : [],
    affiliations: Array.isArray(input.affiliations) ? input.affiliations.filter(Boolean) : [],
    journal: input.journal || input.venue || null,
    year: input.year ? parseInt(input.year, 10) || null : null,
    language: input.language || null,
    publication_type: input.publication_type || input.type || null,
    study_type: STUDY_TYPES.includes(input.study_type) ? input.study_type : 'unknown',
    subject_headings: Array.isArray(input.subject_headings) ? input.subject_headings : [],
    keywords: Array.isArray(input.keywords) ? input.keywords : [],
    flags: {
      retracted: !!input.flags?.retracted,
      correction: !!input.flags?.correction,
      updated: !!input.flags?.updated,
    },
    oa_status: input.oa_status || (input.isOpenAccess ? 'oa' : null),
    full_text_links: dedupeStrings([
      ...(Array.isArray(input.full_text_links) ? input.full_text_links : []),
      input.oaUrl || null,
      input.landingUrl || null,
    ]),
    provenance: {
      connector: connector || input.source || 'unknown',
      connector_version: connector_version || null,
      search_run_id,
      retrieved_at: new Date().toISOString(),
    },
  };
}

function dedupeStrings(arr) {
  return [...new Set(arr.filter(Boolean).map((s) => String(s)))];
}

// ===== Identity-graph dedup (M0 §A2) =====
// Hợp nhất khi trùng BẤT KỲ doi | pmid | pmcid | trial_reg_id, hoặc (title chuẩn hoá + year).
// KHÔNG hợp nhất chỉ bằng external_id của một nguồn.

function titleKey(rec) {
  const t = String(rec.title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9一-鿿]+/g, ' ')
    .trim();
  if (!t || t.length < 12) return null; // tiêu đề quá ngắn → không dùng làm khoá mờ
  return rec.year ? `${t}::${rec.year}` : null;
}

function identityKeys(rec) {
  const keys = [];
  const id = rec.identifiers || {};
  if (id.doi) keys.push(`doi:${id.doi}`);
  if (id.pmid) keys.push(`pmid:${id.pmid}`);
  if (id.pmcid) keys.push(`pmcid:${id.pmcid}`);
  if (id.trial_reg_id) keys.push(`trial:${String(id.trial_reg_id).toUpperCase()}`);
  const tk = titleKey(rec);
  if (tk) keys.push(`title:${tk}`);
  return keys;
}

/**
 * Gộp danh sách CanonicalResearchRecord từ nhiều connector.
 * Trả về mảng đã hợp nhất; mỗi record giữ `merged_from` = danh sách connector đóng góp,
 * và `identifiers` được hợp nhất từ mọi bản trùng.
 */
export function dedupeRecords(records) {
  const parent = new Map(); // union-find
  const find = (k) => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r);
    let c = k;
    while (parent.get(c) !== r) { const n = parent.get(c); parent.set(c, r); c = n; }
    return r;
  };
  const union = (a, b) => { parent.set(find(a), find(b)); };

  const recKeys = records.map((rec, i) => {
    const selfKey = `rec:${i}`;
    parent.set(selfKey, selfKey);
    const keys = [selfKey, ...identityKeys(rec)];
    for (const k of keys) if (!parent.has(k)) parent.set(k, k);
    for (const k of keys.slice(1)) union(selfKey, k);
    return { selfKey, keys };
  });

  const groups = new Map();
  recKeys.forEach(({ selfKey }, i) => {
    const root = find(selfKey);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(records[i]);
  });

  const merged = [];
  for (const grp of groups.values()) {
    grp.sort((a, b) => scoreRecord(b) - scoreRecord(a));
    const base = structuredCloneSafe(grp[0]);
    base.merged_from = [...new Set(grp.map((r) => r.provenance?.connector).filter(Boolean))];
    base.identifiers = base.identifiers || {};
    for (const r of grp.slice(1)) {
      for (const [k, v] of Object.entries(r.identifiers || {})) {
        if (v && !base.identifiers[k]) base.identifiers[k] = v;
      }
      if (!base.abstract && r.abstract) base.abstract = r.abstract;
      if ((!base.authors || !base.authors.length) && r.authors?.length) base.authors = r.authors;
      base.full_text_links = [...new Set([...(base.full_text_links || []), ...(r.full_text_links || [])])];
      if (!base.year && r.year) base.year = r.year;
      if (!base.journal && r.journal) base.journal = r.journal;
    }
    merged.push(base);
  }
  return merged;
}

// Ưu tiên bản có nhiều metadata hơn khi chọn record "gốc" của nhóm trùng.
function scoreRecord(r) {
  let s = 0;
  if (r.abstract) s += 3;
  if (r.identifiers?.doi) s += 2;
  if (r.identifiers?.pmid) s += 2;
  if (r.authors?.length) s += 1;
  if (r.year) s += 1;
  if (r.journal) s += 1;
  if (r.study_type && r.study_type !== 'unknown') s += 1;
  return s;
}

function structuredCloneSafe(o) {
  try { return structuredClone(o); } catch { return JSON.parse(JSON.stringify(o)); }
}
