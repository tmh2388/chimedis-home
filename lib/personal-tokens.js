// M9 — Token cá nhân cho bookmarklet "Lưu vào Chimedis" (xem db/m9-workbench.sql).
// Bookmarklet chạy trên domain NGOÀI (CNKI/万方...) nên không có Firebase session cookie
// của tab Chimedis — cần 1 bearer token dài hạn riêng, tạo 1 lần trong trang Tài khoản,
// chỉ hiện giá trị gốc DUY NHẤT lúc tạo (như GitHub Personal Access Token), từ đó chỉ lưu
// hash trong DB.
import crypto from 'node:crypto';
import { getPool, isDbConfigured } from './db.js';

const TOKEN_PREFIX = 'cmk_';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createPersonalToken(userId, label) {
  const token = TOKEN_PREFIX + crypto.randomBytes(24).toString('hex');
  await getPool().query(
    'INSERT INTO wb_personal_tokens (user_id, token_hash, label) VALUES (?,?,?)',
    [userId, hashToken(token), label || null]
  );
  return token;
}

export async function listPersonalTokens(userId) {
  const [rows] = await getPool().query(
    `SELECT id, label, created_at, last_used_at FROM wb_personal_tokens
      WHERE user_id=? AND revoked_at IS NULL ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function revokePersonalToken(userId, id) {
  await getPool().query(
    'UPDATE wb_personal_tokens SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?',
    [id, userId]
  );
}

async function resolvePersonalToken(token) {
  if (!token || !token.startsWith(TOKEN_PREFIX)) return null;
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT t.id AS token_id, u.id, u.email, u.display_name, u.role, u.plan
       FROM wb_personal_tokens t JOIN users u ON u.id = t.user_id
      WHERE t.token_hash=? AND t.revoked_at IS NULL LIMIT 1`,
    [hashToken(token)]
  );
  if (!rows.length) return null;
  pool.query('UPDATE wb_personal_tokens SET last_used_at=CURRENT_TIMESTAMP WHERE id=?', [rows[0].token_id]).catch(() => {});
  return rows[0];
}

/** Middleware: xác thực bằng `Authorization: Bearer <personal-token>` (KHÔNG phải Firebase token). */
export async function requirePersonalToken(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : null;
  if (!token) return res.status(401).json({ success: false, error: 'Thiếu token cá nhân (Authorization: Bearer ...)' });
  if (!isDbConfigured()) return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
  try {
    const user = await resolvePersonalToken(token);
    if (!user) return res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã bị thu hồi' });
    req.user = user;
    next();
  } catch (err) {
    console.error('requirePersonalToken:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xác thực token' });
  }
}
