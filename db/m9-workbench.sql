-- Research Workbench M9 — Bookmarklet "Lưu vào Chimedis" (2026-09-18).
-- Cho phép user tự browse CNKI/万方/bất kỳ trang tạp chí nào ở tab RIÊNG (tự đăng nhập,
-- tự tìm, tự tải PDF tay — KHÔNG tự động hoá hàng loạt), rồi bấm 1 nút bookmark để hệ
-- thống đọc metadata (chuẩn thẻ <meta name="citation_*">, dùng chung Zotero/EndNote/Mendeley)
-- của trang đang xem và lưu vào thư viện dự án. Bookmarklet chạy trên domain ngoài (CNKI)
-- nên KHÔNG dùng được Firebase session cookie của tab Chimedis — cần 1 token cá nhân dài
-- hạn riêng, người dùng tự tạo trong trang Tài khoản, nhúng vào link bookmarklet lúc cài.
-- Idempotent, an toàn chạy lại nhiều lần.

CREATE TABLE IF NOT EXISTS wb_personal_tokens (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  token_hash    CHAR(64) NOT NULL COMMENT 'sha256(token) — KHÔNG lưu token gốc',
  label         VARCHAR(100) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at  TIMESTAMP NULL,
  revoked_at    TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_token_hash (token_hash),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kiểm tra sau khi chạy:
-- SHOW CREATE TABLE wb_personal_tokens;
