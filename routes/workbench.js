// Research Workbench — M1: Search Foundation + Provenance.
// Xem docs/research-workbench-M0-architecture-freeze.md (tag `m0-frozen`).
// Tất cả route yêu cầu requireUser (role tối thiểu `reader` = mọi tài khoản đăng ký).
// KHÔNG có LLM, gap-analysis, evidence matrix trong M1.

import { Router } from 'express';
import crypto from 'node:crypto';
import { getPool, isDbConfigured } from '../lib/db.js';
import { requireUser, requireVerified } from '../lib/auth.js';
import { rateLimit } from '../lib/rate-limit.js';
import { runSearch, listConnectors, MODE_SOURCES } from '../lib/connectors/index.js';
import { buildSearchQuery } from '../lib/tcm-vocab.js';
import { enrichUntranslated } from '../lib/dict-learn.js';
import { QUESTION_PROFILES, isValidProfile, evaluateCoverage } from '../lib/source-policy.js';
import { guessStudyType, STUDY_TYPE_LABEL_VI } from '../lib/study-type.js';
import { parseReferences } from '../lib/ref-import.js';
import { generateGapCandidates, isGapLlmConfigured } from '../lib/gap-candidates.js';
import { logAiRun } from '../lib/ai-runs.js';
import { GATES, TRACK_TYPES } from '../lib/research-gates.js';
import {
  writeSearchRun, listSearchRuns, renderSearchLogMarkdown, renderSearchLogCsv,
  upsertStandaloneRecord,
} from '../lib/search-runs.js';

const router = Router();
const QUERY_VERSION = 'wb-m1-1';
const uidKey = (r) => 'u' + (r.user?.id || r.firebaseUser?.uid || 'anon');
const rlWrite = rateLimit({ max: 40, windowMs: 60_000, keyFn: uidKey });
const rlSearch = rateLimit({ max: 20, windowMs: 60_000, keyFn: uidKey });
// M4: gọi LLM Sonnet phân tích nhiều bài — đắt hơn hẳn các route khác, chỉ chặn spam bấm
// nhầm liên tục (KHÔNG phải trần chi phí — v1 single-user testing, xem [[feedback_chimedis_
// llm_credit_model]]). Trần chi phí thật nằm ở ai_runs (ghi log, không chặn).
const rlGapAnalysis = rateLimit({ max: 10, windowMs: 60_000, keyFn: uidKey });

function requireDb(req, res, next) {
  if (!isDbConfigured()) {
    return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
  }
  next();
}

// M4 v1: tìm kiếm (Discovery/Evidence Search, thư viện, RIS/BibTeX...) LUÔN MIỄN PHÍ cho MỌI
// tài khoản đã đăng ký — route này KHÔNG áp dụng ở đó. Chỉ tính năng TỐN LLM (Phân tích khoảng
// trống, Sonnet) mới cần plan='pro' trên bảng users (cột mới, xem db/m4-workbench.sql). CHƯA
// có cổng thanh toán (giai đoạn sau) — hiện tại chủ dự án tự UPDATE cột `plan` bằng tay cho
// tài khoản muốn cấp quyền thử; sau này gắn thanh toán thật chỉ cần đổi chỗ SET plan='pro',
// không phải sửa lại middleware này. role='admin' luôn qua được (hỗ trợ/kiểm thử).
function requireLlmAllowed(req, res, next) {
  if (req.user?.role === 'admin' || req.user?.plan === 'pro') return next();
  return res.status(403).json({
    success: false,
    error: 'Tính năng "Phân tích khoảng trống" thuộc gói Pro — tài khoản của bạn đang ở gói miễn phí (vẫn tìm kiếm/lưu thư viện không giới hạn).',
    code: 'plan_required',
  });
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

// GET /api/workbench/research-gates — dữ liệu tĩnh khung 25 Gate + định nghĩa hạng mục
// (lib/research-gates.js). Không cần requireUser — thuần nội dung tĩnh, không gắn dự án.
router.get('/research-gates', (req, res) => {
  res.json({ success: true, gates: GATES, trackTypes: TRACK_TYPES });
});

// GET /api/workbench/ai-usage — số lượt AI đã dùng tháng này, dữ liệu THẬT từ wb_ai_runs
// (KHÔNG có hạn mức credit — vẫn giai đoạn 1 single-user testing, xem project memory
// "Quyết định mô hình credit/quota AI"). Chỉ hiển thị, không dùng để chặn.
router.get('/ai-usage', requireDb, requireUser, async (req, res) => {
  try {
    const [[row]] = await getPool().query(
      `SELECT COUNT(*) n FROM wb_ai_runs WHERE user_id=? AND created_at >= DATE_FORMAT(NOW(),'%Y-%m-01')`,
      [req.user.id]
    );
    res.json({ success: true, runsThisMonth: row.n });
  } catch (err) {
    console.error('GET /workbench/ai-usage:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn mức dùng AI' });
  }
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
    const pool = getPool();
    const [questions] = await pool.query(
      'SELECT * FROM wb_research_questions WHERE project_id=? ORDER BY created_at',
      [project.id]
    );
    const runs = await listSearchRuns(project.id);
    const [tracks] = await pool.query(
      'SELECT * FROM wb_research_tracks WHERE project_id=? ORDER BY created_at', [project.id]
    );
    const [progress] = tracks.length
      ? await pool.query('SELECT track_id, gate_no, status FROM wb_gate_progress WHERE track_id IN (?)', [tracks.map((t) => t.id)])
      : [[]];
    const byTrack = {};
    for (const p of progress) (byTrack[p.track_id] ||= []).push({ gateNo: p.gate_no, status: p.status });
    const tracksOut = tracks.map((t) => ({
      id: t.id, trackType: t.track_type, studyDesign: t.study_design, title: t.title,
      createdAt: t.created_at, progress: byTrack[t.id] || [],
    }));
    res.json({ success: true, project, questions, searchRuns: runs, tracks: tracksOut });
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

// ===== M4 v1 — Gap Candidate ===========================================================
// docs/research-workbench-plan.md mục 6/7; docs/research-workbench-M0-architecture-freeze.md
// §A5 (MVP v1 chỉ đi tới trạng thái "candidate"). Mọi candidate BẮT BUỘC nối đất vào 1
// search_run thật (origin_search_run_id) — không có API "phân tích khoảng trống từ toàn bộ
// dự án" ở v1, tránh mất provenance.

// Lấy lại đúng tập bài (title/abstract/năm/tác giả) của 1 search_run — wb_search_runs chỉ lưu
// retrieved_ids_json (DOI/PMID/trial_reg_id thô, KHÔNG có scheme kèm theo vì B10 chỉ cần audit
// re-run, không cần map ngược). Value DOI/PMID/trial-id KHÔNG trùng nhau giữa các scheme trong
// thực tế nên tra thẳng theo `value` là đủ, không cần biết trước scheme nào.
async function fetchSearchRunRecords(pool, projectId, runId) {
  const [[run]] = await pool.query(
    'SELECT id, retrieved_ids_json FROM wb_search_runs WHERE id=? AND project_id=?',
    [runId, projectId]
  );
  if (!run) return null;
  const ids = safeJson(run.retrieved_ids_json, []);
  if (!ids.length) return [];
  const [idRows] = await pool.query(
    'SELECT DISTINCT record_id FROM wb_record_identifiers WHERE value IN (?)',
    [ids]
  );
  if (!idRows.length) return [];
  const recordIds = idRows.map((r) => r.record_id);
  const [records] = await pool.query(
    'SELECT id, title, abstract, year, authors_json FROM wb_research_records WHERE id IN (?)',
    [recordIds]
  );
  return records.map((r) => ({
    id: r.id, title: r.title, abstract: r.abstract, year: r.year,
    authors: safeJson(r.authors_json, []),
  }));
}

// POST /api/workbench/projects/:id/search-runs/:runId/gap-analysis
// Phân tích LLM (Sonnet) trên đúng tập bài của 1 lượt tìm — trả về gợi ý CHƯA LƯU (preview).
router.post('/projects/:id/search-runs/:runId/gap-analysis', requireDb, requireUser, requireVerified, requireLlmAllowed, rlGapAnalysis, async (req, res) => {
  try {
    if (!isGapLlmConfigured()) {
      return res.status(503).json({ success: false, error: 'Chưa cấu hình LLM trên server (ANTHROPIC_API_KEY)' });
    }
    const project = await ownedProject(req, res);
    if (!project) return;
    const runId = parseInt(req.params.runId, 10);
    if (!Number.isInteger(runId)) return res.status(400).json({ success: false, error: 'runId không hợp lệ' });
    const pool = getPool();
    const records = await fetchSearchRunRecords(pool, project.id, runId);
    if (records === null) return res.status(404).json({ success: false, error: 'Không tìm thấy lượt tìm này trong dự án' });
    if (records.length < 2) {
      return res.status(400).json({ success: false, error: 'Lượt tìm này có dưới 2 bài xác định được — không đủ để phân tích khoảng trống' });
    }
    let questionText = null;
    if (req.body?.questionId) {
      const [[q]] = await pool.query('SELECT question_text FROM wb_research_questions WHERE id=? AND project_id=?', [req.body.questionId, project.id]);
      questionText = q?.question_text || null;
    }
    const { candidates, model, tokensIn, tokensOut } = await generateGapCandidates(records, project.title, questionText);
    await logAiRun({ userId: req.user.id, projectId: project.id, feature: 'gap_candidate', model, tokensIn, tokensOut });
    res.json({ success: true, runId, candidates, model });
  } catch (err) {
    console.error('POST /workbench/.../gap-analysis:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi phân tích khoảng trống: ' + err.message });
  }
});

// POST /api/workbench/projects/:id/gap-candidates — lưu 1 candidate (từ kết quả preview ở trên)
router.post('/projects/:id/gap-candidates', requireDb, requireUser, requireVerified, rlWrite, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const { originSearchRunId, title, gapType, evidenceHave, whatsMissing, whyItMatters, feasibilityNote, questionId, llmModel } = req.body || {};
    if (!originSearchRunId || !title || !Array.isArray(evidenceHave) || evidenceHave.length < 2) {
      return res.status(400).json({ success: false, error: 'Thiếu title/originSearchRunId hoặc dưới 2 dẫn chứng' });
    }
    const pool = getPool();
    const [[run]] = await pool.query('SELECT id FROM wb_search_runs WHERE id=? AND project_id=?', [originSearchRunId, project.id]);
    if (!run) return res.status(400).json({ success: false, error: 'originSearchRunId không thuộc dự án này' });
    const bodyJson = JSON.stringify({ evidenceHave, whatsMissing: whatsMissing || '', whyItMatters: whyItMatters || '', feasibilityNote: feasibilityNote || '' });
    const [r] = await pool.query(
      `INSERT INTO wb_gap_candidates (project_id, question_id, origin_search_run_id, title, gap_type, body_json, llm_model)
       VALUES (?,?,?,?,?,?,?)`,
      [project.id, questionId || null, originSearchRunId, String(title).slice(0, 500), gapType || null, bodyJson, llmModel || null]
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    console.error('POST /workbench/projects/:id/gap-candidates:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi lưu khoảng trống' });
  }
});

// GET /api/workbench/projects/:id/gap-candidates — danh sách đã lưu
router.get('/projects/:id/gap-candidates', requireDb, requireUser, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const [rows] = await getPool().query(
      `SELECT id, question_id, origin_search_run_id, title, gap_type, body_json, state, tags, user_note, llm_model, created_at
       FROM wb_gap_candidates WHERE project_id=? ORDER BY created_at DESC`,
      [project.id]
    );
    res.json({
      success: true,
      candidates: rows.map((r) => ({
        id: r.id, questionId: r.question_id, originSearchRunId: r.origin_search_run_id,
        title: r.title, gapType: r.gap_type, state: r.state, tags: r.tags, userNote: r.user_note,
        llmModel: r.llm_model, createdAt: r.created_at, ...safeJson(r.body_json, {}),
      })),
    });
  } catch (err) {
    console.error('GET /workbench/projects/:id/gap-candidates:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn khoảng trống' });
  }
});

// PATCH /api/workbench/projects/:id/gap-candidates/:cid — sửa tag/ghi chú/trạng thái
router.patch('/projects/:id/gap-candidates/:cid', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const cid = parseInt(req.params.cid, 10);
    if (!Number.isInteger(cid)) return res.status(400).json({ success: false, error: 'cid không hợp lệ' });
    const sets = []; const vals = [];
    if (req.body?.state != null) {
      if (!['candidate', 'rejected'].includes(req.body.state)) return res.status(400).json({ success: false, error: 'state không hợp lệ' });
      sets.push('state=?'); vals.push(req.body.state);
    }
    if (req.body?.tags != null) { sets.push('tags=?'); vals.push(String(req.body.tags).slice(0, 300)); }
    if (req.body?.userNote != null) { sets.push('user_note=?'); vals.push(String(req.body.userNote).slice(0, 4000)); }
    if (!sets.length) return res.status(400).json({ success: false, error: 'Không có gì để cập nhật' });
    vals.push(project.id, cid);
    const [r] = await getPool().query(`UPDATE wb_gap_candidates SET ${sets.join(', ')} WHERE project_id=? AND id=?`, vals);
    if (!r.affectedRows) return res.status(404).json({ success: false, error: 'Không tìm thấy khoảng trống' });
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /workbench/projects/:id/gap-candidates/:cid:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật khoảng trống' });
  }
});

// DELETE /api/workbench/projects/:id/gap-candidates/:cid
router.delete('/projects/:id/gap-candidates/:cid', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const cid = parseInt(req.params.cid, 10);
    if (!Number.isInteger(cid)) return res.status(400).json({ success: false, error: 'cid không hợp lệ' });
    const [r] = await getPool().query('DELETE FROM wb_gap_candidates WHERE project_id=? AND id=?', [project.id, cid]);
    if (!r.affectedRows) return res.status(404).json({ success: false, error: 'Không tìm thấy khoảng trống' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /workbench/projects/:id/gap-candidates/:cid:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xoá khoảng trống' });
  }
});

// ===== M5 — Hạng mục nghiên cứu (tracks) + tiến độ Gate =================================
// Nội dung từng Gate (tiêu đề/việc cần làm/deliverable, VI/ZH/EN) sống hẳn ở
// lib/research-gates.js — KHÔNG lưu trong DB. DB chỉ lưu track (hạng mục cha user tạo trong
// dự án) + trạng thái pending/done người dùng TỰ đánh dấu cho từng gate_no. Không có suy luận
// tự động "gate nào coi là xong" từ M1-M4 — giữ đơn giản đúng tinh thần M0.

router.get('/projects/:id/tracks', requireDb, requireUser, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const pool = getPool();
    const [tracks] = await pool.query(
      'SELECT * FROM wb_research_tracks WHERE project_id=? ORDER BY created_at', [project.id]
    );
    const [progress] = tracks.length
      ? await pool.query(
          'SELECT track_id, gate_no, status FROM wb_gate_progress WHERE track_id IN (?)',
          [tracks.map((t) => t.id)]
        )
      : [[]];
    const byTrack = {};
    for (const p of progress) (byTrack[p.track_id] ||= []).push({ gateNo: p.gate_no, status: p.status });
    res.json({
      success: true,
      tracks: tracks.map((t) => ({
        id: t.id, trackType: t.track_type, studyDesign: t.study_design, title: t.title,
        createdAt: t.created_at, progress: byTrack[t.id] || [],
      })),
    });
  } catch (err) {
    console.error('GET /workbench/projects/:id/tracks:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn hạng mục nghiên cứu' });
  }
});

const TRACK_TYPES_VALID = ['msc_thesis', 'phd_thesis', 'intl_paper', 'report', 'conference_abstract', 'grant_proposal'];

router.post('/projects/:id/tracks', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const { trackType, studyDesign, title } = req.body || {};
    if (!TRACK_TYPES_VALID.includes(trackType)) {
      return res.status(400).json({ success: false, error: 'trackType không hợp lệ' });
    }
    if (trackType === 'intl_paper' && !studyDesign) {
      return res.status(400).json({ success: false, error: 'Bài báo quốc tế cần chọn loại nghiên cứu (studyDesign)' });
    }
    const [r] = await getPool().query(
      'INSERT INTO wb_research_tracks (project_id, track_type, study_design, title) VALUES (?,?,?,?)',
      [project.id, trackType, trackType === 'intl_paper' ? String(studyDesign).slice(0, 40) : null, title ? String(title).trim().slice(0, 300) : null]
    );
    res.json({ success: true, id: r.insertId });
  } catch (err) {
    console.error('POST /workbench/projects/:id/tracks:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi tạo hạng mục nghiên cứu' });
  }
});

async function ownedTrack(req, res, project) {
  const [rows] = await getPool().query(
    'SELECT * FROM wb_research_tracks WHERE id=? AND project_id=? LIMIT 1',
    [req.params.trackId, project.id]
  );
  if (!rows.length) {
    res.status(404).json({ success: false, error: 'Không tìm thấy hạng mục' });
    return null;
  }
  return rows[0];
}

router.patch('/projects/:id/tracks/:trackId', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const track = await ownedTrack(req, res, project);
    if (!track) return;
    const { title } = req.body || {};
    await getPool().query('UPDATE wb_research_tracks SET title=? WHERE id=?', [title != null ? String(title).slice(0, 300) : track.title, track.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /workbench/projects/:id/tracks/:trackId:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật hạng mục' });
  }
});

router.delete('/projects/:id/tracks/:trackId', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const track = await ownedTrack(req, res, project);
    if (!track) return;
    await getPool().query('DELETE FROM wb_research_tracks WHERE id=?', [track.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /workbench/projects/:id/tracks/:trackId:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xoá hạng mục' });
  }
});

// PUT vì idempotent — đánh dấu 1 gate là pending/done trong 1 track (upsert).
router.put('/projects/:id/tracks/:trackId/gates/:gateNo', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const track = await ownedTrack(req, res, project);
    if (!track) return;
    const gateNo = parseInt(req.params.gateNo, 10);
    if (!Number.isInteger(gateNo) || gateNo < 0 || gateNo > 24) {
      return res.status(400).json({ success: false, error: 'gateNo không hợp lệ' });
    }
    const status = req.body?.status === 'done' ? 'done' : 'pending';
    await getPool().query(
      `INSERT INTO wb_gate_progress (track_id, gate_no, status) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE status=VALUES(status)`,
      [track.id, gateNo, status]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /workbench/projects/:id/tracks/:trackId/gates/:gateNo:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật tiến độ Gate' });
  }
});

// ===== M3 (slice 1) — Project Library / shortlist =====================================
// docs/research-workbench-plan.md M3. Bản ghi canonical vẫn ở wb_research_records (dùng
// chung xuyên project, M1 identity-graph); wb_project_records chỉ là "đã lưu vào thư viện
// của DỰ ÁN NÀY". KHÔNG phải gap-analysis/accepted_for_project (đó là M4, chưa làm).

// Map loại TÀI LIỆU (document type — do nguồn cung cấp SẴN, đáng tin cậy) sang nhãn hiển
// thị ở cột "Loại". NGUYÊN TẮC: nguồn đã cho biết rõ loại tài liệu thì LUÔN hiển thị trực
// tiếp giá trị đó — KHÔNG tự ý đoán thay bằng heuristic (kể cả Journal Article). Trước đây
// Journal Article bị loại khỏi bảng này để guessStudyType() "đoán" RCT/cohort/tổng quan từ
// tóm tắt — gây khó hiểu vì cùng 1 cột nhưng hành xử khác nhau tuỳ loại tài liệu, và bỏ phí
// đúng dữ liệu {Reference Type} rất đáng tin mà CNKI/RIS/EndNote/BibTeX đều cho sẵn (phản
// hồi user 2026-09-12: "không phải để lấy nội dung từ trường reference type thì để làm
// gì?"). guessStudyType() (đoán qua từ khoá tóm tắt) giờ CHỈ còn dùng khi record HOÀN TOÀN
// không có type nào từ nguồn (nhập tay không điền loại, hoặc public-search thiếu type).
const STUDY_TYPE_FROM_DOCTYPE = {
  'systematic review': 'systematic_review', review: 'review', rct: 'rct', preprint: 'preprint',
  // CNKI (EndNote-tag %0 / NoteExpress {Reference Type} dùng cụm đầy đủ tiếng Anh)
  thesis: 'thesis', 'conference proceedings': 'conference_paper', report: 'report', book: 'book',
  'journal article': 'journal_article',
  // RIS chuẩn (TY dùng mã viết tắt)
  thes: 'thesis', conf: 'conference_paper', cpaper: 'conference_paper', rprt: 'report', jour: 'journal_article',
  // BibTeX chuẩn (@type)
  article: 'journal_article', mastersthesis: 'thesis', phdthesis: 'thesis', conference: 'conference_paper',
  inproceedings: 'conference_paper', techreport: 'report',
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
  if (!r.title) return null;
  if (!Object.keys(identifiers).length) {
    // Nhập tay (Wanfang/CNKI… không có DOI/PMID sẵn) — vẫn cho lưu, định danh tổng hợp
    // từ tiêu đề+năm+tạp chí để dedup hợp lý nếu người dùng lỡ lưu trùng lần sau.
    const basis = `${r.title}|${r.year || ''}|${r.venue || r.journal || ''}`.toLowerCase();
    identifiers.manual = crypto.createHash('sha256').update(basis).digest('hex').slice(0, 32);
  }
  // Từ khoá: keywords thật (Europe PMC) ưu tiên; topic tự phân loại (OpenAlex) làm subject.
  const keywords = Array.isArray(r.keywords) ? r.keywords.map(String).slice(0, 20) : [];
  const subjectHeadings = r.topic ? [String(r.topic).slice(0, 200)] : [];
  return {
    title: String(r.title).slice(0, 700),
    abstract: r.abstract ? String(r.abstract).slice(0, 60000) : null,
    authors: Array.isArray(r.authors) ? r.authors.slice(0, 30) : [],
    journal: (r.venue || r.journal) ? String(r.venue || r.journal).slice(0, 300) : null,
    year: Number.isInteger(r.year) ? r.year : (parseInt(r.year, 10) || null),
    study_type: STUDY_TYPE_FROM_DOCTYPE[String(r.type || '').toLowerCase()] || guessStudyType(r.title, r.abstract),
    oa_status: r.isOpenAccess ? 'oa' : null,
    keywords,
    subject_headings: subjectHeadings,
    identifiers,
    merged_from: [r.source === 'manual' ? 'manual' : 'public-search'],
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

// POST /api/workbench/projects/:id/library/import — nhập hàng loạt từ RIS/BibTeX (M3).
// { format: 'ris'|'bibtex', text: string } — text dán trực tiếp hoặc đọc từ file phía client
// (không cần multer: file .ris/.bib là text thuần, browser đọc bằng FileReader rồi gửi lên).
// Dùng lại đúng normalizeInlineRecord()/upsertStandaloneRecord() của đường lưu thủ công —
// mỗi bản ghi phân tích được coi như một "record nhập tay", định danh tổng hợp nếu thiếu DOI.
router.post('/projects/:id/library/import', requireDb, requireUser, requireVerified, rlWrite, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const format = String(req.body?.format || '').toLowerCase();
    const text = String(req.body?.text || '');
    if (!['ris', 'bibtex'].includes(format)) {
      return res.status(400).json({ success: false, error: 'format phải là "ris" hoặc "bibtex"' });
    }
    if (!text.trim()) return res.status(400).json({ success: false, error: 'Thiếu nội dung file' });

    let parsed;
    try { parsed = parseReferences(format, text); }
    catch (e) { return res.status(400).json({ success: false, error: 'Lỗi phân tích file: ' + e.message }); }
    if (!parsed.length) {
      return res.status(400).json({ success: false, error: 'Không tìm thấy bản ghi hợp lệ nào trong file (thiếu tiêu đề?)' });
    }

    const pool = getPool();
    let imported = 0;
    let skipped = 0;
    for (const raw of parsed.slice(0, 500)) { // chặn nhập quá lớn trong 1 lần (an toàn/hiệu năng)
      const norm = normalizeInlineRecord({ ...raw, venue: raw.journal, landingUrl: raw.url, type: raw.docType, source: 'manual' });
      if (!norm) { skipped++; continue; }
      try {
        const recordId = await upsertStandaloneRecord(norm);
        await pool.query(
          `INSERT INTO wb_project_records (project_id, record_id) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
          [project.id, recordId]
        );
        imported++;
      } catch (e) {
        console.error('import record failed:', e.message);
        skipped++;
      }
    }
    res.json({ success: true, total: parsed.length, imported, skipped });
  } catch (err) {
    console.error('POST /workbench/projects/:id/library/import:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi nhập file' });
  }
});

// GET /api/workbench/projects/:id/library — danh sách bản ghi đã lưu (khởi đầu evidence matrix)
// Dùng chung cho GET /library (JSON) và GET /library/export (.xlsx/.docx/.csv).
// studyType: nếu CoreDB/connector chưa xác định (null/'unknown') → heuristic hiển thị
// tại chỗ (lib/study-type.js), KHÔNG ghi đè DB — tránh sai lệch âm thầm nếu heuristic sai.
async function fetchLibraryRecords(pool, projectId) {
  const [rows] = await pool.query(
    `SELECT pr.record_id, pr.status, pr.note, pr.added_at, pr.updated_at, r.*
       FROM wb_project_records pr
       JOIN wb_research_records r ON r.id = pr.record_id
      WHERE pr.project_id = ?
      ORDER BY pr.added_at DESC`,
    [projectId]
  );
  if (!rows.length) return [];
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
  return rows.map((r) => {
    const studyTypeRaw = r.study_type && r.study_type !== 'unknown' ? r.study_type : null;
    const studyType = studyTypeRaw || guessStudyType(r.title, r.abstract);
    return {
      recordId: r.record_id, status: r.status, note: r.note,
      addedAt: r.added_at, updatedAt: r.updated_at,
      title: r.title, abstract: r.abstract, authors: safeJson(r.authors_json, []),
      journal: r.journal, year: r.year, studyType, studyTypeGuessed: !studyTypeRaw,
      keywords: safeJson(r.keywords_json, []), subjectHeadings: safeJson(r.subjects_json, []),
      mergedFrom: safeJson(r.merged_from_json, []),
      identifiers: idsByRecord.get(r.record_id) || {},
    };
  });
}

router.get('/projects/:id/library', requireDb, requireUser, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const records = await fetchLibraryRecords(getPool(), project.id);
    res.json({ success: true, records });
  } catch (err) {
    console.error('GET /workbench/projects/:id/library:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn thư viện' });
  }
});

// GET /api/workbench/projects/:id/library/export?fmt=xlsx|docx|csv — Evidence Matrix (M3).
router.get('/projects/:id/library/export', requireDb, requireUser, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const records = await fetchLibraryRecords(getPool(), project.id);
    const fmt = String(req.query.fmt || 'xlsx').toLowerCase();
    const stamp = new Date().toISOString().slice(0, 10);
    const safe = project.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) || 'du-an';

    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="thu-vien-${safe}-${stamp}.csv"`);
      return res.send('﻿' + renderLibraryCsv(records));
    }
    if (fmt === 'docx') {
      const buf = await tryRenderLibraryDocx(project, records);
      if (buf) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="thu-vien-${safe}-${stamp}.docx"`);
        return res.send(buf);
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="thu-vien-${safe}-${stamp}.csv"`);
      return res.send('﻿' + renderLibraryCsv(records)); // fallback nếu thiếu package `docx`
    }
    const buf = await tryRenderLibraryXlsx(project, records);
    if (!buf) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="thu-vien-${safe}-${stamp}.csv"`);
      return res.send('﻿' + renderLibraryCsv(records)); // fallback nếu thiếu package `exceljs`
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="thu-vien-${safe}-${stamp}.xlsx"`);
    res.send(buf);
  } catch (err) {
    console.error('GET /workbench/projects/:id/library/export:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xuất thư viện' });
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

// DELETE /api/workbench/projects/:id/library  { recordIds: [1,2,3] }  hoặc  { all: true }
// Xoá NHIỀU / TOÀN BỘ bản ghi khỏi thư viện của dự án (không đụng wb_research_records —
// canonical record dùng chung xuyên project, chỉ xoá liên kết "đã lưu vào dự án này").
router.delete('/projects/:id/library', requireDb, requireUser, requireVerified, rlWrite, async (req, res) => {
  try {
    const project = await ownedProject(req, res);
    if (!project) return;
    const pool = getPool();
    if (req.body?.all === true) {
      const [r] = await pool.query('DELETE FROM wb_project_records WHERE project_id=?', [project.id]);
      return res.json({ success: true, deleted: r.affectedRows });
    }
    const ids = Array.isArray(req.body?.recordIds)
      ? [...new Set(req.body.recordIds.map((v) => parseInt(v, 10)).filter(Number.isInteger))]
      : [];
    if (!ids.length) return res.status(400).json({ success: false, error: 'Thiếu recordIds (mảng) hoặc all:true' });
    const [r] = await pool.query('DELETE FROM wb_project_records WHERE project_id=? AND record_id IN (?)', [project.id, ids]);
    res.json({ success: true, deleted: r.affectedRows });
  } catch (err) {
    console.error('DELETE /workbench/projects/:id/library (bulk):', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xoá thư viện' });
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

// ===== M3 — Evidence Matrix export (xlsx/docx/csv) ===================================
const LIB_COLUMNS = ['Tiêu đề', 'Tác giả', 'Tạp chí', 'Năm', 'Loại nghiên cứu', 'Trạng thái', 'DOI/PMID', 'Từ khoá', 'Ghi chú', 'Tóm tắt'];
function libRowValues(r) {
  const authors = (r.authors || []).slice(0, 6).join('; ') + ((r.authors || []).length > 6 ? '…' : '');
  const ids = r.identifiers || {};
  const idStr = ids.doi ? `doi:${ids.doi}` : (ids.pmid ? `pmid:${ids.pmid}` : (ids.url || Object.entries(ids).map(([k, v]) => `${k}:${v}`).join(' ')));
  const studyLabel = STUDY_TYPE_LABEL_VI[r.studyType] || r.studyType || 'Chưa rõ';
  const kw = [...(r.keywords || []), ...(r.subjectHeadings || [])].join('; ');
  return [
    r.title || '', authors, r.journal || '', r.year || '',
    studyLabel + (r.studyTypeGuessed ? ' (tự động, chưa xác nhận)' : ''),
    { shortlisted: 'Đã chọn lọc', included: 'Đưa vào bài', excluded: 'Loại' }[r.status] || r.status,
    idStr, kw, r.note || '', (r.abstract || '').slice(0, 3000),
  ];
}
function renderLibraryCsv(records) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [LIB_COLUMNS.map(esc).join(',')];
  for (const r of records) lines.push(libRowValues(r).map(esc).join(','));
  return lines.join('\r\n');
}
async function tryRenderLibraryXlsx(project, records) {
  let ExcelJS;
  try { ({ default: ExcelJS } = await import('exceljs')); } catch { return null; }
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Chimedis';
  const ws = wb.addWorksheet('Evidence Matrix');
  ws.columns = LIB_COLUMNS.map((h) => ({ header: h, key: h, width: h === 'Tiêu đề' || h === 'Tóm tắt' ? 50 : 18 }));
  ws.getRow(1).font = { bold: true };
  for (const r of records) ws.addRow(libRowValues(r));
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return wb.xlsx.writeBuffer();
}
async function tryRenderLibraryDocx(project, records) {
  let docx;
  try { docx = await import('docx'); } catch { return null; }
  const { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, TextRun } = docx;
  const children = [
    new Paragraph({ text: `Thư viện dự án — ${project.title}`, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ children: [new TextRun({ text: `Xuất ngày ${new Date().toISOString().slice(0, 10)} · ${records.length} bản ghi`, italics: true })] }),
  ];
  const headerRow = new TableRow({ children: LIB_COLUMNS.map((h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })) });
  const rows = records.map((r) => new TableRow({
    children: libRowValues(r).map((v) => new TableCell({ children: [new Paragraph(String(v ?? ''))] })),
  }));
  children.push(new Table({ rows: [headerRow, ...rows] }));
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

export default router;
