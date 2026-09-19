// M9 — Bookmarklet "Lưu vào Chimedis" (2026-09-18, mở rộng nhập hàng loạt 2026-09-19).
// Xem db/m9-workbench.sql. User tự browse CNKI/万方/tạp chí bất kỳ ở tab RIÊNG (tự đăng
// nhập, tự tìm, tự tick chọn, tự bấm nút "导出" của CHÍNH CNKI — KHÔNG tự động hoá bất kỳ
// bước nào của CNKI), bấm nút bookmark đã cài để hệ thống đọc nội dung trang ĐANG XEM (1
// bài, hoặc trang CNKI tự hiện ra sau khi user bấm xuất hàng loạt) và lưu vào thư viện dự án.
//
// 3 nhóm route:
//  - /tokens: quản lý token cá nhân, chạy TRONG app Chimedis → dùng Firebase auth bình
//    thường (requireUser/requireVerified), KHÔNG cần CORS mở vì cùng origin.
//  - /projects, /save, /import, /parse, /check-duplicates: gọi TỪ bookmarklet đang chạy trên
//    domain khác (CNKI...) — không có Firebase session cookie của tab Chimedis, xác thực bằng
//    token cá nhân (Bearer). CORS mở cho MỌI origin CHỈ ở các route này — an toàn vì auth qua
//    header Bearer tự thân request mang theo (không phải cookie), không có đường cho site khác
//    "mượn" quyền user. /parse, /check-duplicates chỉ đọc (không lưu) — dùng cho bước xem
//    trước + báo trùng + bỏ chọn bớt TRƯỚC khi /import thật sự lưu.
import { Router } from 'express';
import { getPool, isDbConfigured } from '../lib/db.js';
import { requireUser, requireVerified } from '../lib/auth.js';
import { rateLimit } from '../lib/rate-limit.js';
import { upsertStandaloneRecord } from '../lib/search-runs.js';
import { normalizeInlineRecord } from './workbench.js';
import { parseReferences } from '../lib/ref-import.js';
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
router.use('/import', corsOpen);
router.use('/parse', corsOpen);
router.use('/check-duplicates', corsOpen);
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

// Xem trước hàng loạt (2026-09-19) — parse ĐỌC THÔI, không lưu — để bookmarklet hiện danh
// sách bài cho user tự bỏ chọn bớt TRƯỚC khi lưu (user báo trang xuất bản gộp cả bài không
// cần, muốn xem lại rồi mới chọn lưu, không muốn lưu mù toàn bộ).
const rlParse = rateLimit({ max: 20, windowMs: 60_000, keyFn: (r) => 'bkparse' + (r.user?.id || 'anon') });
router.post('/parse', requireDb, requirePersonalToken, rlParse, async (req, res) => {
  try {
    const format = String(req.body?.format || 'ris').toLowerCase();
    const text = String(req.body?.text || '');
    if (!text.trim()) return res.status(400).json({ success: false, error: 'Không có nội dung để đọc' });
    let parsed;
    try {
      parsed = parseReferences(format, text);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'Không đọc được định dạng: ' + e.message });
    }
    res.json({ success: true, records: parsed.slice(0, 500) });
  } catch (err) {
    console.error('POST /bookmarklet/parse:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi khi đọc nội dung' });
  }
});

// Cảnh báo trùng (2026-09-19) — user muốn biết bài nào trong danh sách xem trước ĐÃ CÓ sẵn
// trong dự án đang chọn, trước khi quyết định bỏ tick, thay vì lưu xong mới biết trùng. Dùng
// LẠI đúng khoá định danh normalizeInlineRecord() tính ra khi lưu thật (doi/pmid/pmcid/
// openalex → url → hash tay từ tiêu đề+năm+tạp chí) — cùng logic upsertStandaloneRecord() đã
// dùng để chống trùng khi lưu, nên "đã có" ở đây đúng nghĩa "lưu lại sẽ trùng", không phải suy
// đoán rời rạc.
const rlDup = rateLimit({ max: 20, windowMs: 60_000, keyFn: (r) => 'bkdup' + (r.user?.id || 'anon') });
router.post('/check-duplicates', requireDb, requirePersonalToken, rlDup, async (req, res) => {
  try {
    const projectId = parseInt(req.body?.projectId, 10);
    const [rows] = await getPool().query(
      'SELECT id FROM wb_projects WHERE id=? AND user_id=? LIMIT 1', [projectId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Không tìm thấy dự án (hoặc không thuộc về bạn)' });
    const records = Array.isArray(req.body?.records) ? req.body.records.slice(0, 500) : [];
    const pool = getPool();
    const duplicates = [];
    for (const raw of records) {
      const norm = normalizeInlineRecord({ ...raw, venue: raw.journal, landingUrl: raw.url, type: raw.docType, source: 'manual' });
      let dup = false;
      if (norm) {
        for (const [scheme, value] of Object.entries(norm.identifiers || {})) {
          if (!value) continue;
          const [m] = await pool.query(
            'SELECT record_id FROM wb_record_identifiers WHERE scheme=? AND value=? LIMIT 1', [scheme, value]
          );
          if (!m.length) continue;
          const [inProj] = await pool.query(
            'SELECT 1 FROM wb_project_records WHERE project_id=? AND record_id=? LIMIT 1', [projectId, m[0].record_id]
          );
          if (inProj.length) { dup = true; break; }
        }
      }
      duplicates.push(dup);
    }
    res.json({ success: true, duplicates });
  } catch (err) {
    console.error('POST /bookmarklet/check-duplicates:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi khi kiểm tra trùng lặp' });
  }
});

// Nhập hàng loạt — user tự chọn bài trên CNKI/万方, tự bấm "导出与分析 → 导出文献" của
// CHÍNH nền tảng đó (NoteExpress/BibTex/EndNote), rồi bấm bookmarklet trên trang xuất kết
// quả hiện ra. Bookmarklet chỉ đọc text đã hiển thị sẵn trên trang — không tự động hoá
// bước tìm/chọn/xuất nào của CNKI. Nhận 1 trong 2 dạng: `records` (mảng đã parse qua /parse
// và user đã tự bỏ chọn bớt ở popup) HOẶC `text`+`format` (parse lại từ đầu, đường cũ).
const rlImport = rateLimit({ max: 10, windowMs: 60_000, keyFn: (r) => 'bkimp' + (r.user?.id || 'anon') });
router.post('/import', requireDb, requirePersonalToken, rlImport, async (req, res) => {
  try {
    const projectId = parseInt(req.body?.projectId, 10);
    const [rows] = await getPool().query(
      'SELECT id FROM wb_projects WHERE id=? AND user_id=? LIMIT 1', [projectId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Không tìm thấy dự án (hoặc không thuộc về bạn)' });

    let parsed;
    if (Array.isArray(req.body?.records)) {
      parsed = req.body.records;
    } else {
      const format = String(req.body?.format || 'ris').toLowerCase();
      const text = String(req.body?.text || '');
      if (!text.trim()) return res.status(400).json({ success: false, error: 'Không có nội dung để nhập' });
      try {
        parsed = parseReferences(format, text);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Không đọc được định dạng: ' + e.message });
      }
    }
    if (!parsed.length) return res.status(400).json({ success: false, error: 'Không tìm thấy bản ghi nào trong nội dung' });

    const pool = getPool();
    let imported = 0, skipped = 0;
    for (const raw of parsed.slice(0, 500)) {
      const norm = normalizeInlineRecord({ ...raw, venue: raw.journal, landingUrl: raw.url, type: raw.docType, source: 'manual' });
      if (!norm) { skipped++; continue; }
      norm.merged_from = ['bookmarklet'];
      try {
        const recordId = await upsertStandaloneRecord(norm);
        await pool.query(
          `INSERT INTO wb_project_records (project_id, record_id) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
          [projectId, recordId]
        );
        imported++;
      } catch (e) {
        console.error('POST /bookmarklet/import upsert:', e.message);
        skipped++;
      }
    }
    res.json({ success: true, total: parsed.length, imported, skipped });
  } catch (err) {
    console.error('POST /bookmarklet/import:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi khi nhập hàng loạt' });
  }
});

export default router;
