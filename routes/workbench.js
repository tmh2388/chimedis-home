// Research Workbench — M1: Search Foundation + Provenance.
// Xem docs/research-workbench-M0-architecture-freeze.md (tag `m0-frozen`).
// Tất cả route yêu cầu requireUser (role tối thiểu `reader` = mọi tài khoản đăng ký).
// KHÔNG có LLM, gap-analysis, evidence matrix trong M1.

import { Router } from 'express';
import { getPool, isDbConfigured } from '../lib/db.js';
import { requireUser } from '../lib/auth.js';
import { runSearch, listConnectors, MODE_SOURCES } from '../lib/connectors/index.js';
import { buildSearchQuery } from '../lib/tcm-vocab.js';
import { QUESTION_PROFILES, isValidProfile, evaluateCoverage } from '../lib/source-policy.js';
import {
  writeSearchRun, listSearchRuns, renderSearchLogMarkdown, renderSearchLogCsv,
} from '../lib/search-runs.js';

const router = Router();
const QUERY_VERSION = 'wb-m1-1';

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

router.post('/projects', requireDb, requireUser, async (req, res) => {
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

router.patch('/projects/:id', requireDb, requireUser, async (req, res) => {
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

router.delete('/projects/:id', requireDb, requireUser, async (req, res) => {
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

router.post('/projects/:id/questions', requireDb, requireUser, async (req, res) => {
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

// ===== Tìm kiếm + provenance =====

// POST /api/workbench/projects/:id/search
// body: { q, mode?: 'discovery'|'evidence', questionId?, sources?: string[],
//         yearFrom?, yearTo?, perPage?, docType?, sort? }
router.post('/projects/:id/search', requireDb, requireUser, async (req, res) => {
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

    // dịch thuật ngữ YHCT (tái dùng logic hiện có; KHÔNG LLM ở M1)
    const built = buildSearchQuery(q, { orSynonyms: mode === 'discovery' });
    const effective = built.text || q;
    const queryExpanded = {
      original: q,
      effective,
      translated_terms: built.expandedFrom || [],
      untranslated: built.untranslated || [],
      note: built.note || null,
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

function intOrNull(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export default router;
