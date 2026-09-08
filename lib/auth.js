import { getPool, isDbConfigured } from './db.js';
import { verifyFirebaseToken, getFirebaseAuth } from './firebase-admin.js';

// Thứ bậc vai trò — dùng để check "role tối thiểu cần có", không phải để so sánh tuỳ tiện.
export const ROLE_RANK = { reader: 0, author: 1, editor: 2, admin: 3 };
export const ROLES = Object.keys(ROLE_RANK);

// Milestone H1a — write-gate theo "verified identity" (spec §3.1a):
//  - email + mật khẩu: chỉ verified khi `email_verified === true` (đã bấm link xác thực);
//  - provider ngoài (Google/Apple/ORCID…): coi là verified identity ngay.
// Anonymous + email chưa xác thực → tìm kiếm được, KHÔNG tạo dữ liệu bền vững.
// Provider ngoài coi là "verified identity" ngay (đã qua OAuth của provider).
// Facebook: email có thể KHÔNG được cấp (user từ chối scope email) — vẫn coi là verified
// identity vì đã xác thực qua Meta; chỉ là thiếu email.
export const VERIFIED_PROVIDERS = new Set([
  'google.com', 'apple.com', 'facebook.com', 'oidc.orcid', 'microsoft.com', 'github.com',
]);

export function isVerifiedIdentity(fb) {
  if (!fb) return false;
  if (fb.email_verified) return true;
  return VERIFIED_PROVIDERS.has(fb.provider);
}

/**
 * Kiểm verified có FALLBACK: token trong trình duyệt bị cache tới ~1h nên có thể còn nói
 * "chưa xác thực" DÙ người dùng đã bấm link (hoặc link bị trình quét email "bấm hộ" rồi
 * Firebase vẫn ghi nhận). Khi token nói chưa → hỏi thẳng Firebase Admin (nguồn thật).
 */
export async function isVerifiedIdentityAsync(fb) {
  if (isVerifiedIdentity(fb)) return true;
  try {
    const auth = getFirebaseAuth();
    if (auth && fb?.uid) {
      const rec = await auth.getUser(fb.uid);
      if (rec.emailVerified) return true;
      if (rec.providerData?.some((p) => VERIFIED_PROVIDERS.has(p.providerId))) return true;
    }
  } catch { /* bỏ qua — coi như chưa verified */ }
  return false;
}

/** Middleware: chặn ghi khi danh tính chưa verified. Đặt SAU requireUser. */
export async function requireVerified(req, res, next) {
  if (!req.firebaseUser) {
    return res.status(500).json({ success: false, error: 'requireVerified phải đặt sau requireUser' });
  }
  if (await isVerifiedIdentityAsync(req.firebaseUser)) return next();
  return res.status(403).json({
    success: false,
    code: 'email_unverified',
    error: 'Cần xác thực email trước khi tạo/lưu dữ liệu. Mở email của bạn, bấm link xác thực, rồi thử lại.',
  });
}

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
