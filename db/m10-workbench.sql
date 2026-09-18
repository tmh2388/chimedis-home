-- Research Workbench M10 — thêm Tập/Số/Trang (volume/issue/pages) cho trích dẫn đầy đủ
-- (2026-09-18, theo yêu cầu user khi rà soát bookmarklet: cần đủ trường cho trích dẫn chuẩn
-- luận văn kiểu Vancouver/APA). Trước đây bảng wb_research_records hoàn toàn không có 3 cột
-- này — không phải riêng bookmarklet thiếu, mà TOÀN HỆ THỐNG (kể cả bài từ OpenAlex/PubMed)
-- chưa từng lưu được. Cột `language` đã có sẵn từ trước nhưng CHƯA từng được code nào điền
-- (routes/workbench.js normalizeInlineRecord() không đọc r.language) — sửa cùng đợt này.
-- Chạy an toàn nhiều lần (IF NOT EXISTS — cần MySQL 8.0.29+, Hostinger đã xác nhận hỗ trợ).

ALTER TABLE wb_research_records
  ADD COLUMN IF NOT EXISTS volume VARCHAR(20) NULL AFTER year,
  ADD COLUMN IF NOT EXISTS issue  VARCHAR(20) NULL AFTER volume,
  ADD COLUMN IF NOT EXISTS pages  VARCHAR(30) NULL AFTER issue;

-- Kiểm tra sau khi chạy:
-- SHOW CREATE TABLE wb_research_records;
