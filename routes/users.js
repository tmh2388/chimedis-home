import { Router } from 'express';
import { getPool, isDbConfigured } from '../lib/db.js';
import { requireUser, requireRole, ROLES } from '../lib/auth.js';

const router = Router();

function requireDb(req, res, next) {
  if (!isDbConfigured()) {
    return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
  }
  next();
}

// GET /api/admin/users?search= — chỉ admin, để cấp/đổi quyền cho người dùng.
router.get('/', requireDb, requireUser, requireRole('admin'), async (req, res) => {
  try {
    const { search } = req.query;
    const where = [];
    const params = [];
    if (search) {
      where.push('(email LIKE ? OR display_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const sql = `SELECT id, email, display_name, role, orcid_id, orcid_verified, created_at, last_login_at
                 FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY created_at DESC LIMIT 200`;
    const [rows] = await getPool().query(sql, params);
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error('GET /api/admin/users error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn người dùng' });
  }
});

// PUT /api/admin/users/:id/role — chỉ admin. Không tự đổi role của chính mình để tránh
// tự khoá tay khỏi quyền admin (phải nhờ admin khác, hoặc sửa thẳng DB nếu chỉ có 1 admin).
router.put('/:id/role', requireDb, requireUser, requireRole('admin'), async (req, res) => {
  const { role } = req.body || {};
  if (!ROLES.includes(role)) {
    return res.status(400).json({ success: false, error: `role phải là 1 trong: ${ROLES.join(', ')}` });
  }
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ success: false, error: 'Không thể tự đổi quyền của chính mình' });
  }
  try {
    const [result] = await getPool().query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /api/admin/users/:id/role error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi cập nhật quyền' });
  }
});

export default router;
