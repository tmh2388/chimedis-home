import { Router } from 'express';
import crypto from 'crypto';
import { getPool, isDbConfigured } from '../lib/db.js';
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase-admin.js';
import { requireUser, requireRole, ROLES } from '../lib/auth.js';

const router = Router();

function generateTempPassword() {
  // 12 ký tự ngẫu nhiên + hậu tố cố định đảm bảo đủ điều kiện độ mạnh Firebase (hoa/thường/số/ký tự đặc biệt).
  return crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) + 'Aa1!';
}

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

// POST /api/admin/users — chỉ admin. Tạo tài khoản Firebase thật (email + mật khẩu tạm)
// và một hàng `users` với role được chọn ngay — khác /api/auth/sync (luôn ép role='reader'
// cho người TỰ đăng ký). Dùng khi admin muốn cấp quyền Editor/Author cho ai đó trước khi
// họ tự đăng nhập lần đầu.
router.post('/', requireDb, requireUser, requireRole('admin'), async (req, res) => {
  if (!isFirebaseConfigured()) {
    return res.status(503).json({ success: false, error: 'Đăng nhập Firebase chưa được cấu hình trên server' });
  }
  const { email, display_name, role } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Thiếu email hợp lệ' });
  }
  const finalRole = ROLES.includes(role) ? role : 'reader';
  const tempPassword = generateTempPassword();
  try {
    const fbAuth = getFirebaseAuth();
    let userRecord;
    try {
      userRecord = await fbAuth.createUser({
        email,
        password: tempPassword,
        displayName: display_name || undefined,
      });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        return res.status(409).json({
          success: false,
          error: 'Email này đã có tài khoản — nếu họ đã từng đăng nhập, hãy cấp quyền trực tiếp trong bảng bên dưới thay vì tạo mới.',
        });
      }
      throw err;
    }
    await getPool().query(
      `INSERT INTO users (firebase_uid, email, display_name, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), role = VALUES(role)`,
      [userRecord.uid, email, display_name || null, finalRole]
    );
    res.json({ success: true, email, tempPassword });
  } catch (err) {
    console.error('POST /api/admin/users error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi tạo người dùng: ' + err.message });
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
