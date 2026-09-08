import { Router } from 'express';
import { getPool, isDbConfigured } from '../lib/db.js';
import { verifyFirebaseToken, getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase-admin.js';
import { requireUser, isVerifiedIdentityAsync } from '../lib/auth.js';
import { rateLimit } from '../lib/rate-limit.js';

const router = Router();

function requireDb(req, res, next) {
  if (!isDbConfigured()) {
    return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
  }
  next();
}

// upsert user_identities cho MỌI provider đã liên kết (KHÔNG merge user theo email).
// H4: một user có thể liên kết Google + Apple + Facebook + password — ghi hết.
async function syncIdentities(pool, userId, fb) {
  const rows = (fb.linked && fb.linked.length) ? fb.linked
    : [{ provider: fb.provider, provider_subject: fb.provider_subject }];
  const now = new Date();
  for (const it of rows) {
    const verified = it.provider === 'password' ? (fb.email_verified ? now : null) : now;
    await pool.query(
      `INSERT INTO user_identities (user_id, provider, provider_subject, provider_email, verified_at)
         VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         provider_email = COALESCE(VALUES(provider_email), user_identities.provider_email),
         verified_at = COALESCE(user_identities.verified_at, VALUES(verified_at))`,
      [userId, it.provider, it.provider_subject,
       it.provider === fb.provider ? (fb.email || null) : null, verified]
    ).catch((e) => console.warn('syncIdentities:', e.message));
  }
}

// POST /api/auth/sync — gọi ngay sau khi đăng nhập Firebase thành công ở frontend.
// Upsert `users` (role='reader' cho người tự đăng ký) + `user_identities`.
router.post('/sync', rateLimit({ max: 20, windowMs: 60_000 }), verifyFirebaseToken, requireDb, async (req, res) => {
  const fb = req.firebaseUser;
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO users (firebase_uid, email, display_name, photo_url)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), display_name = VALUES(display_name),
         photo_url = VALUES(photo_url), last_login_at = CURRENT_TIMESTAMP`,
      [fb.uid, fb.email, fb.name, fb.picture]
    );
    const [rows] = await pool.query(
      'SELECT id, email, display_name, photo_url, role, orcid_id, orcid_verified FROM users WHERE firebase_uid = ? LIMIT 1',
      [fb.uid]
    );
    const user = rows[0];
    await syncIdentities(pool, user.id, fb);
    res.json({
      success: true,
      user: { ...user, email_verified: fb.email_verified, provider: fb.provider, verified: await isVerifiedIdentityAsync(fb) },
    });
  } catch (err) {
    console.error('POST /api/auth/sync error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi đồng bộ tài khoản' });
  }
});

// GET /api/auth/me — hồ sơ hiện tại + danh sách provider đã liên kết + trạng thái verified.
router.get('/me', requireDb, requireUser, async (req, res) => {
  try {
    const [ids] = await getPool().query(
      'SELECT provider, provider_email, verified_at, created_at FROM user_identities WHERE user_id = ? ORDER BY created_at',
      [req.user.id]
    );
    res.json({
      success: true,
      user: req.user,
      email_verified: req.firebaseUser.email_verified,
      provider: req.firebaseUser.provider,
      verified: await isVerifiedIdentityAsync(req.firebaseUser),
      identities: ids,
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi truy vấn hồ sơ' });
  }
});

// DELETE /api/auth/identities/:provider — bỏ liên kết 1 phương thức (H4).
// Việc gỡ credential phía Firebase do client làm (unlink); ở đây chỉ xoá bản ghi.
// Giữ TỐI THIỂU 1 identity — không cho gỡ hết (sẽ không đăng nhập lại được).
router.delete('/identities/:provider', requireDb, requireUser, async (req, res) => {
  const provider = String(req.params.provider);
  try {
    const pool = getPool();
    const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM user_identities WHERE user_id = ?', [req.user.id]);
    if (n <= 1) {
      return res.status(400).json({ success: false, error: 'Phải giữ ít nhất 1 phương thức đăng nhập.' });
    }
    if (provider === req.firebaseUser.provider) {
      return res.status(400).json({ success: false, error: 'Không gỡ được phương thức bạn đang dùng để đăng nhập. Đăng nhập bằng phương thức khác rồi thử lại.' });
    }
    const [r] = await pool.query('DELETE FROM user_identities WHERE user_id = ? AND provider = ?', [req.user.id, provider]);
    if (!r.affectedRows) return res.status(404).json({ success: false, error: 'Không có phương thức này để gỡ.' });
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/auth/identities error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi gỡ liên kết' });
  }
});

// DELETE /api/auth/account — người dùng tự xoá tài khoản trong app (App Store 5.1.1(v)).
// Xoá dữ liệu Workbench của user + user_identities + hàng users + Firebase user.
// wb_research_records dùng chung — KHÔNG xoá (không chứa PII).
router.delete('/account', rateLimit({ max: 3, windowMs: 3600_000 }), requireDb, requireUser, async (req, res) => {
  const uid = req.firebaseUser.uid;
  const userId = req.user.id;
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[cnt]] = await conn.query('SELECT COUNT(*) n FROM wb_projects WHERE user_id = ?', [userId]);
    // Workbench: xoá theo thứ tự FK
    await conn.query(
      `DELETE s FROM wb_search_run_sources s
         JOIN wb_search_runs r ON r.id = s.search_run_id
         JOIN wb_projects p ON p.id = r.project_id WHERE p.user_id = ?`, [userId]);
    await conn.query('DELETE r FROM wb_search_runs r JOIN wb_projects p ON p.id = r.project_id WHERE p.user_id = ?', [userId]);
    await conn.query('DELETE q FROM wb_research_questions q JOIN wb_projects p ON p.id = q.project_id WHERE p.user_id = ?', [userId]);
    await conn.query('DELETE FROM wb_projects WHERE user_id = ?', [userId]);
    // Nếu có bảng khác gắn user_id (drafts/library ở milestone sau) — thêm ở đây.
    await conn.query('DELETE FROM user_identities WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM users WHERE id = ?', [userId]);
    await conn.query(
      'INSERT INTO account_deletions (user_id, provider, wb_projects_deleted) VALUES (?,?,?)',
      [userId, req.firebaseUser.provider, cnt.n]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('DELETE /api/auth/account error:', err.message);
    return res.status(500).json({ success: false, error: 'Lỗi xoá tài khoản — chưa xoá gì, thử lại.' });
  }
  conn.release();

  // Xoá user Firebase SAU khi DB đã commit (nếu lỗi ở đây, hàng users đã mất — user đăng nhập
  // lại sẽ được /sync tạo hàng mới; chấp nhận được).
  try {
    const fbAuth = getFirebaseAuth();
    if (fbAuth) await fbAuth.deleteUser(uid);
  } catch (err) {
    console.warn('deleteUser Firebase (bỏ qua):', err.message);
  }
  res.json({ success: true });
});

export default router;
