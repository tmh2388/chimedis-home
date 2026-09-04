import { Router } from 'express';
import { getPool, isDbConfigured } from '../lib/db.js';
import { requireUser, requireRole } from '../lib/auth.js';

const router = Router();

const DOC_TYPES = ['journal', 'report', 'article', 'book'];
const EDITABLE_FIELDS = [
  'doc_type', 'title_vi', 'title_zh', 'title_en',
  'abstract_vi', 'abstract_zh', 'abstract_en',
  'body_vi', 'body_zh', 'body_en',
  'authors_text', 'source_label', 'category', 'pdf_url',
];

function requireDb(req, res, next) {
  if (!isDbConfigured()) {
    return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
  }
  next();
}

// ===== CÔNG KHAI: chỉ tài liệu đã published =====

// GET /api/documents?type=&category=&search=&limit=&offset=
router.get('/', requireDb, async (req, res) => {
  try {
    const { type, category, search } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const where = ["status = 'published'"];
    const params = [];
    if (type && DOC_TYPES.includes(type)) {
      where.push('doc_type = ?');
      params.push(type);
    }
    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (search) {
      where.push('(title_vi LIKE ? OR title_zh LIKE ? OR title_en LIKE ? OR abstract_vi LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, doc_type, title_vi, title_zh, title_en, abstract_vi, abstract_zh, abstract_en,
              authors_text, source_label, category, pdf_url, published_at
       FROM portal_documents WHERE ${where.join(' AND ')}
       ORDER BY published_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM portal_documents WHERE ${where.join(' AND ')}`,
      params
    );
    res.json({ success: true, documents: rows, total });
  } catch (err) {
    console.error('GET /api/documents error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn tài liệu' });
  }
});

// GET /api/documents/:id — chi tiết 1 tài liệu đã published
router.get('/:id', requireDb, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      "SELECT * FROM portal_documents WHERE id = ? AND status = 'published' LIMIT 1",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Không tìm thấy tài liệu' });
    res.json({ success: true, document: rows[0] });
  } catch (err) {
    console.error('GET /api/documents/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn tài liệu' });
  }
});

// ===== QUẢN TRỊ (admin.chimedis.vn) — cần đăng nhập =====
const adminRouter = Router();

// GET /api/admin/documents — author chỉ thấy bài của mình, editor/admin thấy tất cả
adminRouter.get('/', requireDb, requireUser, requireRole('author'), async (req, res) => {
  try {
    const isElevated = ['editor', 'admin'].includes(req.user.role);
    const params = [];
    let where = '1=1';
    if (!isElevated) {
      where = 'created_by = ?';
      params.push(req.user.id);
    }
    const [rows] = await getPool().query(
      `SELECT d.*, u.display_name AS created_by_name
       FROM portal_documents d LEFT JOIN users u ON u.id = d.created_by
       WHERE ${where} ORDER BY d.updated_at DESC LIMIT 200`,
      params
    );
    res.json({ success: true, documents: rows });
  } catch (err) {
    console.error('GET /api/admin/documents error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn tài liệu' });
  }
});

// POST /api/admin/documents — tạo bản nháp mới (author trở lên)
adminRouter.post('/', requireDb, requireUser, requireRole('author'), async (req, res) => {
  const body = req.body || {};
  if (!body.doc_type || !DOC_TYPES.includes(body.doc_type)) {
    return res.status(400).json({ success: false, error: `doc_type phải là 1 trong: ${DOC_TYPES.join(', ')}` });
  }
  if (!body.title_vi) {
    return res.status(400).json({ success: false, error: 'title_vi là bắt buộc' });
  }
  try {
    const fields = ['doc_type', 'title_vi', 'created_by'];
    const values = [body.doc_type, body.title_vi, req.user.id];
    for (const f of EDITABLE_FIELDS) {
      if (f === 'doc_type' || f === 'title_vi') continue;
      if (body[f] !== undefined) {
        fields.push(f);
        values.push(body[f]);
      }
    }
    const placeholders = fields.map(() => '?').join(', ');
    const [result] = await getPool().query(
      `INSERT INTO portal_documents (${fields.join(', ')}) VALUES (${placeholders})`,
      values
    );
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('POST /api/admin/documents error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi tạo tài liệu' });
  }
});

// Nạp sẵn tài liệu + kiểm tra quyền sở hữu cho các route sửa/xoá/đổi trạng thái bên dưới.
async function loadDocOr404(req, res, next) {
  try {
    const [rows] = await getPool().query('SELECT * FROM portal_documents WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Không tìm thấy tài liệu' });
    req.doc = rows[0];
    next();
  } catch (err) {
    console.error('loadDocOr404 error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn tài liệu' });
  }
}
function isOwnerOrElevated(req) {
  return req.doc.created_by === req.user.id || ['editor', 'admin'].includes(req.user.role);
}

// PUT /api/admin/documents/:id — sửa nội dung. Author chỉ sửa được bài CỦA MÌNH và khi
// còn ở trạng thái draft (đã submit/published thì phải nhờ editor). Editor/admin sửa mọi lúc.
adminRouter.put('/:id', requireDb, requireUser, requireRole('author'), loadDocOr404, async (req, res) => {
  if (!isOwnerOrElevated(req)) {
    return res.status(403).json({ success: false, error: 'Bạn không có quyền sửa tài liệu này' });
  }
  const isElevated = ['editor', 'admin'].includes(req.user.role);
  if (!isElevated && req.doc.status !== 'draft') {
    return res.status(403).json({ success: false, error: 'Bài đã nộp/xuất bản — chỉ editor mới sửa được' });
  }
  const body = req.body || {};
  const fields = [];
  const values = [];
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) {
      if (f === 'doc_type' && !DOC_TYPES.includes(body.doc_type)) continue;
      fields.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  if (!fields.length) return res.status(400).json({ success: false, error: 'Không có trường nào để cập nhật' });
  values.push(req.params.id);
  try {
    await getPool().query(`UPDATE portal_documents SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/admin/documents/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật tài liệu' });
  }
});

// DELETE /api/admin/documents/:id — author chỉ xoá được bản nháp của mình, editor/admin xoá mọi lúc.
adminRouter.delete('/:id', requireDb, requireUser, requireRole('author'), loadDocOr404, async (req, res) => {
  const isElevated = ['editor', 'admin'].includes(req.user.role);
  if (!isElevated && (req.doc.created_by !== req.user.id || req.doc.status !== 'draft')) {
    return res.status(403).json({ success: false, error: 'Bạn không có quyền xoá tài liệu này' });
  }
  try {
    await getPool().query('DELETE FROM portal_documents WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/documents/:id error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xoá tài liệu' });
  }
});

// POST /api/admin/documents/:id/submit — author nộp bản nháp để editor duyệt.
adminRouter.post('/:id/submit', requireDb, requireUser, requireRole('author'), loadDocOr404, async (req, res) => {
  if (req.doc.created_by !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Chỉ tác giả mới nộp được bài của mình' });
  }
  if (req.doc.status !== 'draft') {
    return res.status(400).json({ success: false, error: 'Chỉ nộp được bài đang ở trạng thái nháp' });
  }
  try {
    await getPool().query("UPDATE portal_documents SET status = 'pending_review' WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('POST submit error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi nộp bài' });
  }
});

// POST /api/admin/documents/:id/publish — editor/admin duyệt xuất bản.
adminRouter.post('/:id/publish', requireDb, requireUser, requireRole('editor'), loadDocOr404, async (req, res) => {
  try {
    await getPool().query(
      "UPDATE portal_documents SET status = 'published', published_at = COALESCE(published_at, NOW()), reviewed_by = ? WHERE id = ?",
      [req.user.id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('POST publish error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xuất bản' });
  }
});

// POST /api/admin/documents/:id/unpublish — editor/admin gỡ bài xuống nháp.
adminRouter.post('/:id/unpublish', requireDb, requireUser, requireRole('editor'), loadDocOr404, async (req, res) => {
  try {
    await getPool().query("UPDATE portal_documents SET status = 'draft' WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('POST unpublish error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi gỡ xuất bản' });
  }
});

export default router;
export { adminRouter };
