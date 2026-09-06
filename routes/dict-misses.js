// GĐ1: hàng đợi "cụm truy vấn hệ thống chưa dịch được / ra ít kết quả", xếp theo tần suất
// thực tế. Editor/Admin xem để biết cần bổ sung từ nào vào lib/tcm-vocab.js.
//   GET    /api/admin/dict-misses?days=7&reason=untranslated
//   POST   /api/admin/dict-misses/dismiss   { term, note }
//   DELETE /api/admin/dict-misses/dismiss   { term }

import { Router } from 'express';
import { getPool, isDbConfigured } from '../lib/db.js';
import { requireUser, requireRole } from '../lib/auth.js';
import { matchTcmTerms } from '../lib/tcm-vocab.js';

const router = Router();

function requireDb(req, res, next) {
  if (!isDbConfigured()) {
    return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
  }
  next();
}

router.get('/', requireDb, requireUser, requireRole('editor'), async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days, 10) || 30, 3650); // 0 = tất cả
    const reason = ['untranslated', 'low_results', 'thin_results'].includes(req.query.reason) ? req.query.reason : null;

    const where = [];
    const params = [];
    if (days > 0) { where.push('created_at >= (NOW() - INTERVAL ? DAY)'); params.push(days); }
    if (reason) { where.push('reason = ?'); params.push(reason); }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await getPool().query(
      `SELECT m.term, m.reason,
              COUNT(*)                         AS hits,
              COUNT(DISTINCT m.raw_query)      AS distinct_queries,
              MIN(m.result_count)              AS min_results,
              MAX(m.created_at)                AS last_seen,
              MAX(m.lang)                      AS lang,
              SUBSTRING(GROUP_CONCAT(DISTINCT m.raw_query SEPARATOR '\\n'), 1, 400) AS samples,
              (d.term IS NOT NULL)             AS dismissed
       FROM dict_term_misses m
       LEFT JOIN dict_term_dismissed d ON d.term = m.term
       ${whereSql}
       GROUP BY m.term, m.reason, dismissed
       ORDER BY hits DESC
       LIMIT 400`,
      params
    );

    const items = rows.map((r) => ({
      term: r.term,
      reason: r.reason,
      hits: Number(r.hits),
      distinctQueries: Number(r.distinct_queries),
      minResults: Number(r.min_results),
      lastSeen: r.last_seen,
      lang: r.lang,
      samples: String(r.samples || '').split('\n').filter(Boolean).slice(0, 3),
      dismissed: !!r.dismissed,
      // Tự đánh dấu: nếu cụm này GIỜ đã tra được (ai đó vừa thêm vào tcm-vocab.js) → coi như xong.
      inDictionaryNow: matchTcmTerms(r.term).hits.length > 0,
    }));

    res.json({ success: true, days, reason, count: items.length, items });
  } catch (err) {
    console.error('GET /api/admin/dict-misses error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn hàng đợi từ điển' });
  }
});

router.post('/dismiss', requireDb, requireUser, requireRole('editor'), async (req, res) => {
  const term = String(req.body?.term || '').trim().slice(0, 190);
  const note = String(req.body?.note || '').trim().slice(0, 255) || null;
  if (!term) return res.status(400).json({ success: false, error: 'Thiếu term' });
  try {
    await getPool().query(
      `INSERT INTO dict_term_dismissed (term, dismissed_by, note) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE dismissed_by = VALUES(dismissed_by), note = VALUES(note), dismissed_at = NOW()`,
      [term, req.user.id, note]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/admin/dict-misses/dismiss error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi ghi bỏ qua' });
  }
});

router.delete('/dismiss', requireDb, requireUser, requireRole('editor'), async (req, res) => {
  const term = String(req.body?.term || '').trim().slice(0, 190);
  if (!term) return res.status(400).json({ success: false, error: 'Thiếu term' });
  try {
    await getPool().query('DELETE FROM dict_term_dismissed WHERE term = ?', [term]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/dict-misses/dismiss error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi bỏ đánh dấu' });
  }
});

// ===== GĐ2: ứng viên do LLM dịch (bảng dict_candidates) =====

// GET /api/admin/dict-misses/candidates?status=new
router.get('/candidates', requireDb, requireUser, requireRole('editor'), async (req, res) => {
  const status = ['new', 'auto_active', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : null;
  try {
    const [rows] = await getPool().query(
      `SELECT c.id, c.term_norm, c.term_display, c.lang, c.en, c.syn, c.status, c.seen_count,
              c.llm_model, c.first_seen, c.last_seen, c.reviewed_at,
              (SELECT COUNT(DISTINCT raw_query) FROM dict_term_misses WHERE term = c.term_norm) AS distinct_queries,
              (SELECT COUNT(*) FROM dict_term_misses
                 WHERE term = c.term_norm AND created_at >= (NOW() - INTERVAL 7 DAY)) AS hits_7d,
              (SELECT SUBSTRING(GROUP_CONCAT(DISTINCT raw_query SEPARATOR '\\n'), 1, 300)
                 FROM dict_term_misses WHERE term = c.term_norm) AS samples
       FROM dict_candidates c
       ${status ? 'WHERE c.status = ?' : ''}
       ORDER BY c.status = 'new' DESC,
                (hits_7d * 3 + distinct_queries) DESC,   -- ưu tiên cụm ĐANG được tìm nhiều
                c.seen_count DESC
       LIMIT 400`,
      status ? [status] : []
    );
    const items = rows.map((r) => {
      let syn = [];
      try { syn = Array.isArray(r.syn) ? r.syn : JSON.parse(r.syn || '[]'); } catch { syn = []; }
      return {
        id: r.id, term: r.term_display, termNorm: r.term_norm, lang: r.lang,
        en: r.en, syn, status: r.status,
        seenCount: Number(r.seen_count), distinctQueries: Number(r.distinct_queries || 0),
        hits7d: Number(r.hits_7d || 0),
        llmModel: r.llm_model, firstSeen: r.first_seen, lastSeen: r.last_seen, reviewedAt: r.reviewed_at,
        samples: String(r.samples || '').split('\n').filter(Boolean).slice(0, 3),
      };
    });
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    console.error('GET /api/admin/dict-misses/candidates error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn ứng viên' });
  }
});

// POST /api/admin/dict-misses/candidates/:id/review  { action, en?, syn? }
router.post('/candidates/:id/review', requireDb, requireUser, requireRole('editor'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const action = req.body?.action;
  if (!id || !['approve', 'reject', 'auto_active', 'reset'].includes(action)) {
    return res.status(400).json({ success: false, error: 'action không hợp lệ' });
  }
  const statusByAction = { approve: 'approved', reject: 'rejected', auto_active: 'auto_active', reset: 'new' };
  const newStatus = statusByAction[action];
  const fields = ['status = ?', 'reviewed_by = ?', 'reviewed_at = NOW()'];
  const params = [newStatus, req.user.id];
  // Cho phép sửa bản dịch khi duyệt.
  if (typeof req.body?.en === 'string' && req.body.en.trim()) {
    fields.push('en = ?'); params.push(req.body.en.trim().slice(0, 200));
  }
  if (Array.isArray(req.body?.syn)) {
    fields.push('syn = CAST(? AS JSON)');
    params.push(JSON.stringify(req.body.syn.map((s) => String(s).trim()).filter(Boolean).slice(0, 4)));
  }
  params.push(id);
  try {
    await getPool().query(`UPDATE dict_candidates SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('POST /candidates/:id/review error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật ứng viên' });
  }
});

export default router;
