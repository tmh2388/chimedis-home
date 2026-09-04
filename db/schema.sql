-- Schema cho admin.chimedis.vn / chimedis.vn (cổng nội dung).
-- Dùng CHUNG database MySQL với chimedis-web (u440660297_chimedis) — bảng `users` đã tồn tại
-- từ project_chimedis_user_auth (Firebase Auth), ở đây CHỈ THÊM cột, không tạo lại bảng.
-- Chạy an toàn nhiều lần: mọi lệnh đều idempotent (IF NOT EXISTS / kiểm tra cột trước khi thêm).

-- ===== Mở rộng bảng users có sẵn: vai trò + liên kết ORCID =====
-- Vai trò theo thứ bậc: reader (mặc định, mọi user đăng ký) < author < editor < admin.
-- Chạy thủ công từng dòng ALTER nếu MySQL version không hỗ trợ "ADD COLUMN IF NOT EXISTS"
-- (MySQL 8.0.29+ mới có cú pháp này; Hostinger thường là MySQL 8 — nếu lỗi cú pháp, bỏ "IF NOT EXISTS"
-- và tự kiểm tra cột đã tồn tại chưa trước khi chạy).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role ENUM('reader','author','editor','admin') NOT NULL DEFAULT 'reader',
  ADD COLUMN IF NOT EXISTS orcid_id VARCHAR(32) NULL COMMENT 'Định dạng 0000-0000-0000-000X',
  ADD COLUMN IF NOT EXISTS orcid_verified TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 nếu đã xác thực qua ORCID OAuth (không phải tự nhập tay)';

-- ===== Tài liệu (Tạp chí/Báo cáo/Bài viết/Sách) trên chimedis.vn =====
CREATE TABLE IF NOT EXISTS portal_documents (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  doc_type        ENUM('journal','report','article','book') NOT NULL,
  status          ENUM('draft','pending_review','published') NOT NULL DEFAULT 'draft',

  title_vi        VARCHAR(500) NOT NULL,
  title_zh        VARCHAR(500),
  title_en        VARCHAR(500),
  abstract_vi     TEXT,
  abstract_zh     TEXT,
  abstract_en     TEXT,
  body_vi         LONGTEXT,
  body_zh         LONGTEXT,
  body_en         LONGTEXT,

  authors_text    VARCHAR(500) COMMENT 'Tên tác giả hiển thị, vd "Trần Minh Đức, Lê Thị Hoa" — tách biệt created_by (user thật)',
  source_label    VARCHAR(255) COMMENT 'Nhãn chuyên mục hiển thị, vd 中医内科学',
  category        VARCHAR(100),
  pdf_url         VARCHAR(500),

  created_by      INT NOT NULL COMMENT 'users.id — người tạo (author hoặc editor)',
  reviewed_by     INT NULL COMMENT 'users.id — editor/admin đã duyệt xuất bản',
  published_at    DATETIME NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  INDEX idx_status_type (status, doc_type),
  INDEX idx_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
