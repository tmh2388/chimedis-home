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
    const reason = ['untranslated', 'low_results'].includes(req.query.reason) ? req.query.reason : null;

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

export default router;
