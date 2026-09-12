// Research Workbench — M1: Search Foundation + Provenance.
// Xem docs/research-workbench-M0-architecture-freeze.md (tag `m0-frozen`).
// Tất cả route yêu cầu requireUser (role tối thiểu `reader` = mọi tài khoản đăng ký).
// KHÔNG có LLM, gap-analysis, evidence matrix trong M1.

import { Router } from 'express';
import { getPool, isDbConfigured } from '../lib/db.js';
import { requireUser, requireVerified } from '../lib/auth.js';
import { rateLimit } from '../lib/rate-limit.js';
import { runSearch, listConnectors, MODE_SOURCES } from '../lib/connectors/index.js';
import { buildSearchQuery } from '../lib/tcm-vocab.js';
import { enrichUntranslated } from '../lib/dict-learn.js';
import { QUESTION_PROFILES, isValidProfile, evaluateCoverage } from '../lib/source-policy.js';
import {
  writeSearchRun, listSearchRuns, renderSearchLogMarkdown, renderSearchLogCsv,
  upsertStandaloneRecord,
} from '../lib/search-runs.js';

const router = Router();
const QUERY_VERSION = 'wb-m1-1';
const uidKey = (r) => 'u' + (r.user?.id || r.firebaseUser?.uid || 'anon');
const rlWrite = rateLimit({ max: 40, windowMs: 60_000, keyFn: uidKey });
const rlSearch = rateLimit({ max: 20, windowMs: 60_000, keyFn: uidKey });

function requireDb(req, res, next) {
  if (!isDbConfigured()) {
    return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
  }
  next();
}

async function ownedProject(req, res) {
  const [rows] = await getPool().query(
    'SELECT * FROM wb_projects WHERE id=? AND user_id=? LIMIT 1',
    [req.params.id, req.user.id]
  );
  if (!rows.length) {
    res.status(404).json({ success: false, error: 'Không tìm thấy dự án (hoặc không thuộc về bạn)' });
    return null;
  }
  return rows[0];
}

// ===== Metadata tĩnh (không cần DB) =====

// GET /api/workbench/connectors — Connector Status Registry (M0 §12.1)
router.get('/connectors', requireUser, (req, res) => {
  res.json({ success: true, connectors: listConnectors(), modeSources: MODE_SOURCES });
});

// GET /api/workbench/question-profiles — hồ sơ câu hỏi cho Minimum Source Policy (M0 §A7)
router.get('/question-profiles', requireUser, (req, res) => {
  res.json({
    success: true,
    profiles: Object.entries(QUESTION_PROFILES).map(([id, p]) => ({
      id, label: p.label, minimum_groups: p.minimum_groups, max_coverage: p.max_coverage || null,
    })),
  });
});

// ===== Dự án =====

router.get('/projects', requireDb, requireUser, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM wb_search_runs r WHERE r.project_id=p.id) AS search_run_count
       FROM wb_projects p WHERE p.user_id=? ORDER BY p.updated_at DESC LIMIT 200`,
      [req.user.id]
    );
    res.json({ success: true, projects: rows });
  } catch (err) {
    console.error('GET /workbench/projects:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn dự án' });
  }
});

router.post('/projects', requireDb, requireUser, requireVerified, rlWrite, async (req, res) => {
  const { title, work_type, note } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, error: 'Thiếu tên dự án' });
  }
  try {
    const [r] = await getPool().query(
      'INSERT INTO wb_projects (user_id, title, work_type, note) VALUES (?,?,?,?)',
      [req.user.id, String(title).trim().slice(0, 300), work_type || null, note || null]
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    console.error('POST /workbench/projects:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi tạo dự án' });
  }
});

router.get('/projects/:id', requireDb, requireUser, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const [questions] = await getPool().query(
      'SELECT * FROM wb_research_questions WHERE project_id=? ORDER BY created_at',
      [project.id]
    );
    const runs = await listSearchRuns(project.id);
    res.json({ success: true, project, questions, searchRuns: runs });
  } catch (err) {
    console.error('GET /workbench/projects/:id:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn dự án' });
  }
});

router.patch('/projects/:id', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const { title, work_type, current_focus, note } = req.body || {};
    await getPool().query(
      `UPDATE wb_projects SET
         title = COALESCE(?, title),
         work_type = COALESCE(?, work_type),
         current_focus = ?,
         note = COALESCE(?, note)
       WHERE id=?`,
      [
        title ? String(title).trim().slice(0, 300) : null,
        work_type || null,
        current_focus == null ? project.current_focus : String(current_focus).slice(0, 4),
        note ?? null,
        project.id,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /workbench/projects/:id:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật dự án' });
  }
});

router.delete('/projects/:id', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const pool = getPool();
    // xoá theo thứ tự FK (search_run_sources → search_runs → questions → project).
    // wb_research_records dùng chung nhiều project → KHÔNG xoá ở đây.
    await pool.query(
      'DELETE s FROM wb_search_run_sources s JOIN wb_search_runs r ON r.id=s.search_run_id WHERE r.project_id=?',
      [project.id]
    );
    await pool.query('DELETE FROM wb_search_runs WHERE project_id=?', [project.id]);
    await pool.query('DELETE FROM wb_research_questions WHERE project_id=?', [project.id]);
    await pool.query('DELETE FROM wb_projects WHERE id=?', [project.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /workbench/projects/:id:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xoá dự án' });
  }
});

// ===== Câu hỏi nghiên cứu =====

router.post('/projects/:id/questions', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const { framework, parts, question_text, question_profile } = req.body || {};
    const profile = isValidProfile(question_profile) ? question_profile : 'general';
    const [r] = await getPool().query(
      `INSERT INTO wb_research_questions
        (project_id, framework, parts_json, question_text, question_profile, status)
       VALUES (?,?,?,?,?, 'active')`,
      [
        project.id,
        ['PICO', 'PECO', 'PICo', 'SPIDER'].includes(framework) ? framework : 'PICO',
        JSON.stringify(parts || null),
        question_text ? String(question_text).slice(0, 1000) : null,
        profile,
      ]
    );
    res.json({ success: true, id: r.insertId, question_profile: profile });
  } catch (err) {
    console.error('POST /workbench/projects/:id/questions:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi tạo câu hỏi nghiên cứu' });
  }
});

// Kiểm tra một câu hỏi thuộc về user (join qua project). Trả row hoặc null (đã res 404).
async function ownedQuestion(req, res) {
  const [rows] = await getPool().query(
    `SELECT q.* FROM wb_research_questions q
       JOIN wb_projects p ON p.id = q.project_id
     WHERE q.id = ? AND p.user_id = ? LIMIT 1`,
    [req.params.qid, req.user.id]
  );
  if (!rows.length) {
    res.status(404).json({ success: false, error: 'Không tìm thấy câu hỏi (hoặc không thuộc về bạn)' });
    return null;
  }
  return rows[0];
}

// PATCH /api/workbench/questions/:qid — sửa nội dung / hồ sơ / framework
router.patch('/questions/:qid', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const q = await ownedQuestion(req, res);
    if (!q) return;
    const { question_text, question_profile, framework } = req.body || {};
    await getPool().query(
      `UPDATE wb_research_questions SET
         question_text = ?,
         question_profile = ?,
         framework = ?
       WHERE id = ?`,
      [
        question_text != null ? String(question_text).slice(0, 1000) : q.question_text,
        isValidProfile(question_profile) ? question_profile : q.question_profile,
        ['PICO', 'PECO', 'PICo', 'SPIDER'].includes(framework) ? framework : q.framework,
        q.id,
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /workbench/questions/:qid:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật câu hỏi' });
  }
});

// DELETE /api/workbench/questions/:qid — gỡ liên kết khỏi search_runs rồi xoá
router.delete('/questions/:qid', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const q = await ownedQuestion(req, res);
    if (!q) return;
    const pool = getPool();
    await pool.query('UPDATE wb_search_runs SET question_id = NULL WHERE question_id = ?', [q.id]);
    await pool.query('DELETE FROM wb_research_questions WHERE id = ?', [q.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /workbench/questions/:qid:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xoá câu hỏi' });
  }
});

// ===== Tìm kiếm + provenance =====

// POST /api/workbench/projects/:id/search
// body: { q, mode?: 'discovery'|'evidence', questionId?, sources?: string[],
//         yearFrom?, yearTo?, perPage?, docType?, sort? }
router.post('/projects/:id/search', requireDb, requireUser, requireVerified, rlSearch, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const b = req.body || {};
    const q = String(b.q || '').trim();
    if (!q) return res.status(400).json({ success: false, error: 'Thiếu truy vấn' });
    const mode = b.mode === 'evidence' ? 'evidence' : 'discovery';

    // xác định hồ sơ câu hỏi để đánh giá coverage
    let profileId = 'general';
    let questionId = b.questionId || null;
    if (questionId) {
      const [qr] = await getPool().query(
        'SELECT id, question_profile FROM wb_research_questions WHERE id=? AND project_id=? LIMIT 1',
        [questionId, project.id]
      );
      if (qr.length) profileId = qr[0].question_profile;
      else questionId = null;
    }

    // dịch thuật ngữ YHCT
    const bqOpts = { orSynonyms: mode === 'discovery', mode };
    let built = buildSearchQuery(q, bqOpts);
    // D6: cụm còn sót → LLM dịch dự phòng. CHỈ Discovery (Evidence giữ needs_resolution).
    // No-op an toàn khi thiếu ANTHROPIC_API_KEY / MySQL.
    if (mode === 'discovery' && built.untranslated?.length) {
      built = await enrichUntranslated(q, built, { mode });
    }
    const effective = built.text || q;
    const queryExpanded = {
      original: q,
      effective,
      translated_terms: built.expandedFrom || [],
      untranslated: built.untranslated || [],
      note: built.note || null,
      // review PR#4: khi TRANSLATE_ENGINE=shadow, đính structured diff vào provenance
      // sẵn có (KHÔNG tạo kho raw-query mới). effective_query THỰC GỬI vẫn là legacy.
      ...(bqOpts.__shadow ? {
        shadow: {
          engine_version: bqOpts.__shadow.engine_version,
          v2_outcome: bqOpts.__shadow.text,
          agree: (bqOpts.__shadow.text || '').toLowerCase().replace(/\s+/g, ' ').trim()
                 === effective.toLowerCase().replace(/\s+/g, ' ').trim(),
          ambiguous_count: (bqOpts.__shadow.disambiguation || []).length,
          unresolved_count: (bqOpts.__shadow.untranslated || []).length,
          needs_resolution: !!bqOpts.__shadow.needs_resolution,
          confidence: bqOpts.__shadow.confidenceCounts || {},
        },
      } : {}),
    };

    const filters = {
      page: 1,
      perPage: Math.min(parseInt(b.perPage, 10) || 25, 50),
      yearFrom: intOrNull(b.yearFrom),
      yearTo: intOrNull(b.yearTo),
      openAccessOnly: !!b.openAccessOnly,
      docType: b.docType || null,
      sort: b.sort || 'relevance',
    };
    const sources = Array.isArray(b.sources) && b.sources.length ? b.sources : undefined;

    const { records, manifest, coverage_state: coarse } = await runSearch(effective, { mode, sources, filters });
    const coverageEval = evaluateCoverage(profileId, manifest);

    const saved = await writeSearchRun({
      projectId: project.id,
      questionId,
      mode,
      queryOriginal: q,
      queryTranslated: effective !== q ? effective : null,
      queryExpanded,
      filters,
      dateRange: filters.yearFrom || filters.yearTo ? `${filters.yearFrom || '*'}–${filters.yearTo || '*'}` : null,
      queryVersion: QUERY_VERSION,
      rankingMethod: filters.sort,
      manifest,
      records,
      coverageState: coverageEval.coverage_state,
      coverageJson: { ...coverageEval, coarse },
    });

    await getPool().query('UPDATE wb_projects SET updated_at=CURRENT_TIMESTAMP WHERE id=?', [project.id]);

    res.json({
      success: true,
      searchRunId: saved.id,
      persisted: saved.persisted,
      requestFingerprint: saved.request_fingerprint,
      mode,
      questionProfile: profileId,
      queryExpanded,
      coverage: coverageEval,
      manifest,
      count: records.length,
      records: records.slice(0, filters.perPage),
    });
  } catch (err) {
    console.error('POST /workbench/projects/:id/search:', err.message, err.stack);
    res.status(500).json({ success: false, error: 'Lỗi khi tìm kiếm: ' + err.message });
  }
});

router.get('/projects/:id/search-runs', requireDb, requireUser, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    res.json({ success: true, searchRuns: await listSearchRuns(project.id) });
  } catch (err) {
    console.error('GET /workbench/projects/:id/search-runs:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn search runs' });
  }
});

// GET /api/workbench/projects/:id/search-log?fmt=md|csv|docx
router.get('/projects/:id/search-log', requireDb, requireUser, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const runs = await listSearchRuns(project.id);
    const fmt = String(req.query.fmt || 'md').toLowerCase();
    const stamp = new Date().toISOString().slice(0, 10);
    const safe = project.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'du-an';

    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="search-log-${safe}-${stamp}.csv"`);
      return res.send('﻿' + renderSearchLogCsv(runs));
    }
    if (fmt === 'docx') {
      const docxBuf = await tryRenderDocx(project, runs);
      if (docxBuf) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="search-log-${safe}-${stamp}.docx"`);
        return res.send(docxBuf);
      }
      // fallback: md nếu chưa cài `docx`
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="search-log-${safe}-${stamp}.md"`);
    res.send(renderSearchLogMarkdown(project, runs));
  } catch (err) {
    console.error('GET /workbench/projects/:id/search-log:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xuất Search Log' });
  }
});

async function tryRenderDocx(project, runs) {
  let docx;
  try {
    docx = await import('docx');
  } catch {
    return null; // chưa cài dependency — route tự fallback sang .md
  }
  const { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun } = docx;
  const children = [
    new Paragraph({ text: `Nhật ký tìm kiếm y văn — ${project.title}`, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: `Xuất ngày ${new Date().toISOString().slice(0, 10)} · ${runs.length} lượt tìm`, italics: true })] }),
  ];
  runs.forEach((r, i) => {
    children.push(new Paragraph({ text: `Lượt ${i + 1} — ${r.mode === 'evidence' ? 'Evidence Search' : 'Discovery Search'}`, heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph(`Ngày tìm: ${new Date(r.search_date).toISOString().slice(0, 16).replace('T', ' ')}`));
    children.push(new Paragraph(`Truy vấn gốc: ${r.query_original}`));
    if (r.query_translated) children.push(new Paragraph(`Truy vấn đã dịch: ${r.query_translated}`));
    children.push(new Paragraph(`Số kết quả (khử trùng): ${r.count_deduped} · Độ phủ: ${r.coverage_state}`));
    const rows = [
      new TableRow({ children: ['Nguồn', 'Phiên bản', 'Trạng thái', 'Số bản', 'ms', 'Ghi chú'].map((t) => new TableCell({ children: [new Paragraph(t)] })) }),
      ...(r.sources || []).map((s) => new TableRow({
        children: [s.connector_id, s.connector_version || '—', s.execution_status, String(s.retrieved_count), String(s.duration_ms), s.error_detail || ''].map((t) => new TableCell({ children: [new Paragraph(String(t))] })),
      })),
    ];
    children.push(new Table({ rows }));
    children.push(new Paragraph({ children: [new TextRun({ text: `Fingerprint: ${r.request_fingerprint || '—'}`, italics: true, size: 16 })] }));
  });
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// ===== M3 (slice 1) — Project Library / shortlist =====================================
// docs/research-workbench-plan.md M3. Bản ghi canonical vẫn ở wb_research_records (dùng
// chung xuyên project, M1 identity-graph); wb_project_records chỉ là "đã lưu vào thư viện
// của DỰ ÁN NÀY". KHÔNG phải gap-analysis/accepted_for_project (đó là M4, chưa làm).

const STUDY_TYPE_FROM_DOCTYPE = {
  'systematic review': 'systematic_review', review: 'review', rct: 'rct', preprint: 'preprint',
};

// Chuẩn hoá payload tối giản từ trang tìm công khai (public/index.html — field `r` của
// tableRow()) sang shape upsertRecord() cần. KHÔNG tin literal `study_type`/`clinical` từ
// client; chỉ ánh xạ qua bảng cố định ở trên, mặc định 'unknown'.
function normalizeInlineRecord(raw) {
  const r = raw || {};
  const identifiers = {};
  if (r.doi) identifiers.doi = String(r.doi).toLowerCase().trim();
  if (r.pmid) identifiers.pmid = String(r.pmid).trim();
  if (r.pmcid) identifiers.pmcid = String(r.pmcid).trim();
  if (r.openalexId) identifiers.openalex = String(r.openalexId).trim();
  if (!Object.keys(identifiers).length) {
    const url = r.landingUrl || r.oaUrl;
    if (url) identifiers.url = String(url).trim().slice(0, 200);
  }
  if (!Object.keys(identifiers).length || !r.title) return null;
  return {
    title: String(r.title).slice(0, 700),
    abstract: r.abstract ? String(r.abstract).slice(0, 60000) : null,
    authors: Array.isArray(r.authors) ? r.authors.slice(0, 30) : [],
    journal: r.venue ? String(r.venue).slice(0, 300) : null,
    year: Number.isInteger(r.year) ? r.year : (parseInt(r.year, 10) || null),
    study_type: STUDY_TYPE_FROM_DOCTYPE[String(r.type || '').toLowerCase()] || 'unknown',
    oa_status: r.isOpenAccess ? 'oa' : null,
    identifiers,
    merged_from: ['public-search'],
  };
}

// POST /api/workbench/projects/:id/library
//   { scheme, value, note? }  — bản ghi ĐÃ có trong wb_record_identifiers (từ tìm kiếm
//                                trong workbench, writeSearchRun() đã upsert sẵn); HOẶC
//   { record: {...}, note? }  — bản ghi TỪ NGOÀI (trang tìm công khai), upsert tại chỗ
//                                qua identity-graph dedup (M0), nhãn merged_from=public-search.
router.post('/projects/:id/library', requireDb, requireUser, requireVerified, rlWrite, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const pool = getPool();
    let recordId;

    if (req.body?.record) {
      const norm = normalizeInlineRecord(req.body.record);
      if (!norm) return res.status(400).json({ success: false, error: 'Thiếu tiêu đề hoặc định danh (DOI/PMID/URL) để lưu bản ghi' });
      recordId = await upsertStandaloneRecord(norm);
    } else {
      const scheme = String(req.body?.scheme || '').trim();
      const value = String(req.body?.value || '').trim();
      if (!scheme || !value) return res.status(400).json({ success: false, error: 'Thiếu định danh bản ghi (scheme/value)' });
      const [idRows] = await pool.query(
        'SELECT record_id FROM wb_record_identifiers WHERE scheme=? AND value=? LIMIT 1',
        [scheme, value]
      );
      if (!idRows.length) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy bản ghi (chưa từng xuất hiện trong kết quả tìm kiếm của bạn)' });
      }
      recordId = idRows[0].record_id;
    }

    const note = req.body?.note != null ? String(req.body.note).slice(0, 4000) : null;
    await pool.query(
      `INSERT INTO wb_project_records (project_id, record_id, note)
         VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE note = COALESCE(VALUES(note), note), updated_at = CURRENT_TIMESTAMP`,
      [project.id, recordId, note]
    );
    const [[rec]] = await pool.query('SELECT * FROM wb_research_records WHERE id=?', [recordId]);
    res.json({ success: true, recordId, record: rec });
  } catch (err) {
    console.error('POST /workbench/projects/:id/library:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi khi lưu vào thư viện' });
  }
});

// GET /api/workbench/projects/:id/library — danh sách bản ghi đã lưu (khởi đầu evidence matrix)
router.get('/projects/:id/library', requireDb, requireUser, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT pr.record_id, pr.status, pr.note, pr.added_at, pr.updated_at, r.*
         FROM wb_project_records pr
         JOIN wb_research_records r ON r.id = pr.record_id
        WHERE pr.project_id = ?
        ORDER BY pr.added_at DESC`,
      [project.id]
    );
    if (!rows.length) return res.json({ success: true, records: [] });
    const ids = rows.map((r) => r.record_id);
    const [idRows] = await pool.query(
      `SELECT record_id, scheme, value FROM wb_record_identifiers WHERE record_id IN (?)`,
      [ids]
    );
    const idsByRecord = new Map();
    for (const r of idRows) {
      if (!idsByRecord.has(r.record_id)) idsByRecord.set(r.record_id, {});
      idsByRecord.get(r.record_id)[r.scheme] = r.value;
    }
    const records = rows.map((r) => ({
      recordId: r.record_id, status: r.status, note: r.note,
      addedAt: r.added_at, updatedAt: r.updated_at,
      title: r.title, abstract: r.abstract, authors: safeJson(r.authors_json, []),
      journal: r.journal, year: r.year, studyType: r.study_type,
      mergedFrom: safeJson(r.merged_from_json, []),
      identifiers: idsByRecord.get(r.record_id) || {},
    }));
    res.json({ success: true, records });
  } catch (err) {
    console.error('GET /workbench/projects/:id/library:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn thư viện' });
  }
});

// PATCH /api/workbench/projects/:id/library/:recordId  { status?, note? }
router.patch('/projects/:id/library/:recordId', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const recordId = parseInt(req.params.recordId, 10);
    if (!Number.isInteger(recordId)) return res.status(400).json({ success: false, error: 'recordId không hợp lệ' });
    const STATUSES = ['shortlisted', 'included', 'excluded'];
    const sets = [];
    const vals = [];
    if (req.body?.status != null) {
      if (!STATUSES.includes(req.body.status)) return res.status(400).json({ success: false, error: 'status không hợp lệ' });
      sets.push('status=?'); vals.push(req.body.status);
    }
    if (req.body?.note !== undefined) { sets.push('note=?'); vals.push(req.body.note ? String(req.body.note).slice(0, 4000) : null); }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Không có gì để cập nhật' });
    vals.push(project.id, recordId);
    const [r] = await getPool().query(
      `UPDATE wb_project_records SET ${sets.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE project_id=? AND record_id=?`,
      vals
    );
    if (!r.affectedRows) return res.status(404).json({ success: false, error: 'Không tìm thấy mục thư viện' });
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /workbench/projects/:id/library/:recordId:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật thư viện' });
  }
});

// DELETE /api/workbench/projects/:id/library/:recordId
router.delete('/projects/:id/library/:recordId', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const recordId = parseInt(req.params.recordId, 10);
    if (!Number.isInteger(recordId)) return res.status(400).json({ success: false, error: 'recordId không hợp lệ' });
    await getPool().query('DELETE FROM wb_project_records WHERE project_id=? AND record_id=?', [project.id, recordId]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /workbench/projects/:id/library/:recordId:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xoá khỏi thư viện' });
  }
});

function safeJson(s, fallback) {
  if (s == null) return fallback;
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch { return fallback; }
}

function intOrNull(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export default router;
