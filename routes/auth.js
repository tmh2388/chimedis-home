import { Router } from 'express';
import { getPool, isDbConfigured } from '../lib/db.js';
import { verifyFirebaseToken } from '../lib/firebase-admin.js';

const router = Router();

// POST /api/auth/sync — gọi ngay sau khi đăng nhập Firebase thành công ở frontend.
// Upsert hàng trong `users` (bảng dùng chung với dict.chimedis.vn). User mới luôn được tạo
// với role='reader' — việc nâng lên author/editor/admin phải do admin thao tác thủ công
// qua /api/admin/users, KHÔNG tự phong quyền qua endpoint này.
router.post('/sync', verifyFirebaseToken, async (req, res) => {
  if (!isDbConfigured()) {
    return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
  }
  const { uid, email, name, picture } = req.firebaseUser;
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO users (firebase_uid, email, display_name, photo_url)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), display_name = VALUES(display_name),
         photo_url = VALUES(photo_url), last_login_at = CURRENT_TIMESTAMP`,
      [uid, email, name, picture]
    );
    const [rows] = await pool.query(
      'SELECT id, email, display_name, photo_url, role, orcid_id, orcid_verified FROM users WHERE firebase_uid = ? LIMIT 1',
      [uid]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('POST /api/auth/sync error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi đồng bộ tài khoản' });
  }
});

export default router;
