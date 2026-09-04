import { getPool, isDbConfigured } from './db.js';
import { verifyFirebaseToken } from './firebase-admin.js';

// Thứ bậc vai trò — dùng để check "role tối thiểu cần có", không phải để so sánh tuỳ tiện.
export const ROLE_RANK = { reader: 0, author: 1, editor: 2, admin: 3 };
export const ROLES = Object.keys(ROLE_RANK);

/**
 * Middleware: verifyFirebaseToken rồi tra thêm role/id thật trong MySQL (bảng `users`,
 * cột `role` — dùng CHUNG bảng users với chimedis-web/dict.chimedis.vn, chỉ thêm cột).
 * Yêu cầu user đã từng gọi /api/auth/sync ít nhất 1 lần (tạo hàng) — nếu chưa có hàng,
 * trả 403 kèm thông báo rõ để frontend biết gọi sync trước.
 */
export function requireUser(req, res, next) {
  verifyFirebaseToken(req, res, async () => {
    if (!isDbConfigured()) {
      return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
    }
    try {
      const [rows] = await getPool().query(
        'SELECT id, email, display_name, role, orcid_id, orcid_verified FROM users WHERE firebase_uid = ? LIMIT 1',
        [req.firebaseUser.uid]
      );
      if (!rows.length) {
        return res.status(403).json({ success: false, error: 'Tài khoản chưa đồng bộ — gọi /api/auth/sync trước' });
      }
      req.user = rows[0];
      next();
    } catch (err) {
      console.error('requireUser DB error:', err.message);
      res.status(500).json({ success: false, error: 'Lỗi truy vấn tài khoản' });
    }
  });
}

/** Middleware factory: yêu cầu role tối thiểu (theo ROLE_RANK). Dùng SAU requireUser. */
export function requireRole(minRole) {
  const minRank = ROLE_RANK[minRole];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ success: false, error: 'requireRole phải đặt sau requireUser' });
    }
    if ((ROLE_RANK[req.user.role] ?? 0) < minRank) {
      return res.status(403).json({ success: false, error: `Cần quyền tối thiểu "${minRole}"` });
    }
    next();
  };
}
