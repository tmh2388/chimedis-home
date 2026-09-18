// M9 — Bookmarklet "Lưu vào Chimedis" (2026-09-18). Xem db/m9-workbench.sql.
// User tự browse CNKI/万方/tạp chí bất kỳ ở tab RIÊNG (tự đăng nhập, tự tìm, tự tải PDF
// tay — KHÔNG tự động hoá hàng loạt, tránh vi phạm ToS các nền tảng đó), bấm nút bookmark
// đã cài để hệ thống đọc metadata (<meta name="citation_*">, chuẩn Highwire Press mà
// Zotero/EndNote/Mendeley đều dùng) của trang đang xem và lưu vào thư viện dự án.
//
// 2 nhóm route:
//  - /tokens: quản lý token cá nhân, chạy TRONG app Chimedis → dùng Firebase auth bình
//    thường (requireUser/requireVerified), KHÔNG cần CORS mở vì cùng origin.
//  - /projects, /save: gọi TỪ bookmarklet đang chạy trên domain khác (CNKI...) → không có
//    Firebase session cookie của tab Chimedis, xác thực bằng token cá nhân (Bearer). CORS
//    mở cho MỌI origin CHỈ ở 2 route này — an toàn vì auth qua header Bearer tự thân request
//    mang theo (không phải cookie), không có đường cho site khác "mượn" quyền người dùng.
import { Router } from 'express';
import { getPool, isDbConfigured } from '../lib/db.js';
import { requireUser, requireVerified } from '../lib/auth.js';
import { rateLimit } from '../lib/rate-limit.js';
import { upsertStandaloneRecord } from '../lib/search-runs.js';
import { normalizeInlineRecord } from './workbench.js';
import { createPersonalToken, listPersonalTokens, revokePersonalToken, requirePersonalToken } from '../lib/personal-tokens.js';

const router = Router();

function requireDb(req, res, next) {
  if (!isDbConfigured()) return res.status(503).json({ success: false, error: 'Database chưa được cấu hình trên server' });
  next();
}

// ===== Quản lý token cá nhân — chạy trong app, Firebase auth bình thường =====

router.get('/tokens', requireDb, requireUser, async (req, res) => {
  try {
    res.json({ success: true, tokens: await listPersonalTokens(req.user.id) });
  } catch (err) {
    console.error('GET /bookmarklet/tokens:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi khi tải danh sách token' });
  }
});

router.post('/tokens', requireDb, requireUser, requireVerified, async (req, res) => {
  try {
    const label = req.body?.label ? String(req.body.label).slice(0, 100) : null;
    const token = await createPersonalToken(req.user.id, label);
    // Giá trị gốc CHỈ trả về đúng 1 lần này — từ nay chỉ có bản hash trong DB.
    res.json({ success: true, token });
  } catch (err) {
    console.error('POST /bookmarklet/tokens:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi khi tạo token' });
  }
});

router.delete('/tokens/:id', requireDb, requireUser, async (req, res) => {
  try {
    await revokePersonalToken(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /bookmarklet/tokens/:id:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi khi thu hồi token' });
  }
});

// ===== Gọi TỪ bookmarklet (domain ngoài) — xác thực bằng token cá nhân, CORS mở =====

router.use('/projects', corsOpen);
router.use('/save', corsOpen);
function corsOpen(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

router.get('/projects', requireDb, requirePersonalToken, async (req, res) => {
  try {
    const [rows] = await getPool().query(
      'SELECT id, title FROM wb_projects WHERE user_id=? ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json({ success: true, projects: rows });
  } catch (err) {
    console.error('GET /bookmarklet/projects:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi khi tải danh sách dự án' });
  }
});

const rlSave = rateLimit({ max: 30, windowMs: 60_000, keyFn: (r) => 'bk' + (r.user?.id || 'anon') });
router.post('/save', requireDb, requirePersonalToken, rlSave, async (req, res) => {
  try {
    const projectId = parseInt(req.body?.projectId, 10);
    const [rows] = await getPool().query(
      'SELECT id FROM wb_projects WHERE id=? AND user_id=? LIMIT 1', [projectId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Không tìm thấy dự án (hoặc không thuộc về bạn)' });
    const norm = normalizeInlineRecord(req.body?.record);
    if (!norm) return res.status(400).json({ success: false, error: 'Thiếu tiêu đề để lưu bản ghi' });
    norm.merged_from = ['bookmarklet'];
    const recordId = await upsertStandaloneRecord(norm);
    await getPool().query(
      `INSERT INTO wb_project_records (project_id, record_id) VALUES (?,?)
         ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP`,
      [projectId, recordId]
    );
    res.json({ success: true, recordId });
  } catch (err) {
    console.error('POST /bookmarklet/save:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi khi lưu bản ghi' });
  }
});

export default router;
