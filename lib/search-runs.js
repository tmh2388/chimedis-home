// M0 §A3 provenance_v1 — ghi/đọc search_runs (BẤT BIẾN) + Evidence Coverage Manifest +
// upsert canonical record vào identity graph + render Search Log.
// No-op an toàn khi MySQL chưa cấu hình (trả về đối tượng "in-memory" tối thiểu).

import crypto from 'node:crypto';
import { getPool, isDbConfigured } from './db.js';

export function requestFingerprint({ mode, queryEffective, sources, filters, queryVersion }) {
  const h = crypto.createHash('sha256');
  h.update(JSON.stringify({
    mode,
    q: String(queryEffective || '').trim().toLowerCase(),
    s: [...(sources || [])].sort(),
    f: normalizeFilters(filters),
    v: queryVersion || null,
  }));
  return h.digest('hex');
}

function normalizeFilters(f = {}) {
  const { page, perPage, ...rest } = f; // phân trang không thuộc fingerprint
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v != null && v !== ''));
}

/**
 * Ghi một search_run + manifest. Trả { id, ... } (id = null nếu chưa có DB).
 * `run` = {
 *   projectId, questionId?, mode, queryOriginal, queryTranslated?, queryExpanded?,
 *   filters?, dateRange?, queryVersion?, rankingMethod?,
 *   manifest: [{connector_id, connector_version, execution_status, retrieved_count, duration_ms, error_detail?}],
 *   records: CanonicalResearchRecord[]  (đã dedup),
 *   coverageState, coverageJson
 * }
 */
export async function writeSearchRun(run) {
  const fingerprint = requestFingerprint({
    mode: run.mode,
    queryEffective: run.queryTranslated || run.queryOriginal,
    sources: run.manifest.map((m) => m.connector_id),
    filters: run.filters,
    queryVersion: run.queryVersion,
  });
  const retrievedIds = run.records
    .map((r) => r.identifiers?.doi || r.identifiers?.pmid || r.identifiers?.trial_reg_id || r.external_id)
    .filter(Boolean);

  if (!isDbConfigured()) {
    return {
      id: null, persisted: false, request_fingerprint: fingerprint,
      coverage_state: run.coverageState, manifest: run.manifest,
      count_deduped: run.records.length, retrieved_ids: retrievedIds,
    };
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.query(
      `INSERT INTO wb_search_runs
        (project_id, question_id, mode, query_original, query_translated, query_expanded,
         request_fingerprint, filters_json, date_range, count_deduped, retrieved_ids_json,
         ranking_method, query_version, coverage_state, coverage_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        run.projectId, run.questionId || null, run.mode,
        run.queryOriginal, run.queryTranslated || null,
        JSON.stringify(run.queryExpanded || null),
        fingerprint,
        JSON.stringify(run.filters || null),
        run.dateRange || null,
        run.records.length,
        JSON.stringify(retrievedIds),
        run.rankingMethod || 'relevance',
        run.queryVersion || null,
        run.coverageState || 'incomplete',
        JSON.stringify(run.coverageJson || null),
      ]
    );
    const runId = res.insertId;

    for (const m of run.manifest) {
      await conn.query(
        `INSERT INTO wb_search_run_sources
          (search_run_id, connector_id, connector_version, execution_status, retrieved_count, duration_ms, error_detail)
         VALUES (?,?,?,?,?,?,?)`,
        [runId, m.connector_id, m.connector_version || null, m.execution_status,
         m.retrieved_count || 0, m.duration_ms || 0, (m.error_detail || null)?.slice(0, 500) || null]
      );
    }

    // upsert canonical records vào identity graph (chia sẻ giữa project)
    for (const rec of run.records) {
      await upsertRecord(conn, rec);
    }

    await conn.commit();
    return {
      id: runId, persisted: true, request_fingerprint: fingerprint,
      coverage_state: run.coverageState, manifest: run.manifest,
      count_deduped: run.records.length, retrieved_ids: retrievedIds,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function upsertRecord(conn, rec) {
  const ids = Object.entries(rec.identifiers || {}).filter(([, v]) => v);
  // tìm record_id đã tồn tại qua bất kỳ identifier nào
  let recordId = null;
  for (const [scheme, value] of ids) {
    const [rows] = await conn.query(
      'SELECT record_id FROM wb_record_identifiers WHERE scheme=? AND value=? LIMIT 1',
      [scheme, String(value)]
    );
    if (rows.length) { recordId = rows[0].record_id; break; }
  }
  if (!recordId) {
    const [r] = await conn.query(
      `INSERT INTO wb_research_records
        (title, abstract, authors_json, journal, year, language, study_type,
         subjects_json, keywords_json, flags_json, oa_status, fulltext_json, merged_from_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        rec.title.slice(0, 700), rec.abstract || null,
        JSON.stringify(rec.authors || []), rec.journal || null,
        rec.year || null, rec.language || null, rec.study_type || 'unknown',
        JSON.stringify(rec.subject_headings || []), JSON.stringify(rec.keywords || []),
        JSON.stringify(rec.flags || {}), rec.oa_status || null,
        JSON.stringify(rec.full_text_links || []),
        JSON.stringify(rec.merged_from || [rec.provenance?.connector].filter(Boolean)),
      ]
    );
    recordId = r.insertId;
  }
  for (const [scheme, value] of ids) {
    await conn.query(
      'INSERT IGNORE INTO wb_record_identifiers (scheme, value, record_id) VALUES (?,?,?)',
      [scheme, String(value), recordId]
    );
  }
  return recordId;
}

export async function listSearchRuns(projectId) {
  if (!isDbConfigured()) return [];
  const pool = getPool();
  const [runs] = await pool.query(
    `SELECT id, question_id, mode, query_original, query_translated, request_fingerprint,
            filters_json, date_range, search_date, count_deduped, coverage_state, coverage_json,
            query_version
     FROM wb_search_runs WHERE project_id=? ORDER BY search_date DESC LIMIT 500`,
    [projectId]
  );
  if (!runs.length) return [];
  const ids = runs.map((r) => r.id);
  const [srcRows] = await pool.query(
    `SELECT search_run_id, connector_id, connector_version, execution_status,
            retrieved_count, duration_ms, error_detail
     FROM wb_search_run_sources WHERE search_run_id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const byRun = new Map();
  for (const s of srcRows) {
    if (!byRun.has(s.search_run_id)) byRun.set(s.search_run_id, []);
    byRun.get(s.search_run_id).push(s);
  }
  return runs.map((r) => ({ ...r, sources: byRun.get(r.id) || [] }));
}

// ===== Search Log render (M0 §A3 — deliverable M1) =====

export function renderSearchLogMarkdown(project, runs) {
  const lines = [];
  lines.push(`# Nhật ký tìm kiếm y văn — ${project.title}`);
  lines.push('');
  lines.push(`_Xuất ngày ${new Date().toISOString().slice(0, 10)} · ${runs.length} lượt tìm · Chimedis Research Workbench_`);
  lines.push('');
  runs.forEach((r, i) => {
    lines.push(`## Lượt ${i + 1} — ${r.mode === 'evidence' ? 'Evidence Search' : 'Discovery Search'}`);
    lines.push('');
    lines.push(`- **Ngày tìm:** ${fmtDate(r.search_date)}`);
    lines.push(`- **Truy vấn gốc:** \`${r.query_original}\``);
    if (r.query_translated) lines.push(`- **Truy vấn đã dịch/expand:** \`${r.query_translated}\``);
    if (r.date_range) lines.push(`- **Khoảng năm:** ${r.date_range}`);
    lines.push(`- **Số kết quả (đã khử trùng):** ${r.count_deduped}`);
    lines.push(`- **Độ phủ nguồn:** ${r.coverage_state}`);
    lines.push(`- **Phương pháp khử trùng:** identity-graph-v1`);
    lines.push('');
    lines.push('| Nguồn (connector) | Phiên bản | Trạng thái | Số bản | Thời gian (ms) | Ghi chú |');
    lines.push('|---|---|---|---|---|---|');
    for (const s of r.sources || []) {
      lines.push(`| ${s.connector_id} | ${s.connector_version || '—'} | ${s.execution_status} | ${s.retrieved_count} | ${s.duration_ms} | ${s.error_detail || ''} |`);
    }
    lines.push('');
    lines.push(`_Fingerprint: \`${r.request_fingerprint || '—'}\`_`);
    lines.push('');
  });
  return lines.join('\n');
}

export function renderSearchLogCsv(runs) {
  const rows = [['run_index', 'mode', 'search_date', 'query_original', 'query_translated', 'date_range', 'count_deduped', 'coverage_state', 'connector', 'connector_version', 'execution_status', 'retrieved_count', 'duration_ms', 'error_detail']];
  runs.forEach((r, i) => {
    const base = [i + 1, r.mode, fmtDate(r.search_date), r.query_original, r.query_translated || '', r.date_range || '', r.count_deduped, r.coverage_state];
    if (!(r.sources || []).length) rows.push([...base, '', '', '', '', '', '']);
    for (const s of r.sources || []) {
      rows.push([...base, s.connector_id, s.connector_version || '', s.execution_status, s.retrieved_count, s.duration_ms, s.error_detail || '']);
    }
  });
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function fmtDate(d) {
  try { return new Date(d).toISOString().replace('T', ' ').slice(0, 16); } catch { return String(d); }
}
