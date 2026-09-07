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

-- ===== GĐ1: lưu vết truy vấn tìm y văn mà hệ thống KHÔNG dịch được (hoặc ra rất ít kết quả) =====
-- Mục đích: thay vòng lặp "người dùng báo → sửa tay" bằng một hàng đợi xếp theo tần suất
-- THỰC TẾ. Editor/Admin xem bảng này (màn "Từ điển" trong admin) để biết cần bổ sung từ nào
-- vào lib/tcm-vocab.js. GĐ2 sẽ tự động hoá bước bổ sung (LLM + auto-promote).
-- Chỉ ghi khi CÓ vấn đề (untranslated ≠ rỗng, hoặc ra < 3 kết quả) — không ghi mọi truy vấn.
CREATE TABLE IF NOT EXISTS dict_term_misses (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  term          VARCHAR(190) NOT NULL COMMENT 'Cụm chưa dịch được (đã chuẩn hoá); với reason=low_results là truy vấn gốc rút gọn',
  reason        ENUM('untranslated','low_results','thin_results') NOT NULL COMMENT 'untranslated: có cụm không dịch được | low_results: <3 kết quả | thin_results: đã dịch nhưng chỉ 3-8 kết quả (nghi bản dịch chưa phủ đủ biến thể tiếng Anh)',
  raw_query     VARCHAR(500) NOT NULL,
  effective     VARCHAR(1000) NULL COMMENT 'Truy vấn tiếng Anh đã dựng (nếu có)',
  result_count  INT NOT NULL DEFAULT 0,
  lang          VARCHAR(8) NULL COMMENT 'vi | zh | mixed | en (đoán từ ký tự)',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_term (term),
  INDEX idx_created (created_at),
  INDEX idx_reason_created (reason, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cụm đã được người rà soát "bỏ qua" (rác / gõ sai / không định bổ sung) — ẩn khỏi hàng đợi.
CREATE TABLE IF NOT EXISTS dict_term_dismissed (
  term         VARCHAR(190) PRIMARY KEY,
  dismissed_by INT NULL COMMENT 'users.id',
  note         VARCHAR(255) NULL,
  dismissed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== GĐ2: từ điển TỰ HỌC — ứng viên dịch máy (LLM) từ lưu lượng tìm kiếm thật =====
-- Khi truy vấn có cụm hệ thống chưa dịch được, gọi LLM dịch cụm đó, dùng NGAY cho lượt tìm
-- hiện tại, và lưu ứng viên vào bảng này. Ứng viên gặp đủ nhiều (distinct_queries ≥ ngưỡng)
-- → status='auto_active' → được nạp vào bảng tra khi khởi động (overlay), dùng cho mọi truy
-- vấn sau mà KHÔNG gọi lại LLM. Editor duyệt → status='approved' → chảy sang CoreDB
-- (dict.chimedis.vn /api/terms union các dòng approved) → làm giàu kho từ điển chính.
CREATE TABLE IF NOT EXISTS dict_candidates (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  term_norm        VARCHAR(190) NOT NULL COMMENT 'Khoá chuẩn hoá: tiếng Việt đã bỏ dấu, hoặc chuỗi Hán thô',
  term_display     VARCHAR(190) NOT NULL COMMENT 'Dạng người dùng gõ (còn dấu / chữ Hán)',
  lang             VARCHAR(8) NULL,
  en               VARCHAR(255) NOT NULL COMMENT 'Bản dịch LLM (Anh/Latin chuẩn PubMed/MeSH)',
  syn              JSON NULL COMMENT 'Mảng đồng nghĩa tiếng Anh',
  status           ENUM('new','auto_active','approved','rejected') NOT NULL DEFAULT 'new',
  seen_count       INT NOT NULL DEFAULT 1,
  distinct_queries INT NOT NULL DEFAULT 1,
  llm_model        VARCHAR(64) NULL,
  reviewed_by      INT NULL COMMENT 'users.id',
  reviewed_at      TIMESTAMP NULL,
  first_seen       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_term_norm (term_norm),
  INDEX idx_status (status),
  INDEX idx_seen_count (seen_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================================
-- ===== Research Workbench — M1 (Search Foundation + Provenance) ========================
-- Xem docs/research-workbench-M0-architecture-freeze.md (tag `m0-frozen`).
-- Idempotent. FK tới users(id) đã có. CHỈ M1: project + question + search provenance +
-- canonical record + identity graph. Gap/evidence/draft = milestone sau.
-- =====================================================================================

-- Dự án nghiên cứu. `current_focus` = mã stage 0..13 (nullable) — CHỈ gợi ý, KHÔNG khoá
-- workflow tuyến tính (M0 §A1). Mỗi module có status riêng.
CREATE TABLE IF NOT EXISTS wb_projects (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  title         VARCHAR(300) NOT NULL,
  work_type     VARCHAR(40) NULL COMMENT 'thesis|systematic_review|trial|case_report|other',
  current_focus VARCHAR(4) NULL COMMENT 'mã stage 0..13 hoặc NULL',
  note          TEXT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Câu hỏi nghiên cứu. `question_profile` = khoá QUESTION_PROFILES (source_policy_v1) —
-- quyết định Minimum Source Policy khi đánh giá coverage (M0 §A7).
CREATE TABLE IF NOT EXISTS wb_research_questions (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id       BIGINT NOT NULL,
  framework        VARCHAR(16) NOT NULL DEFAULT 'PICO' COMMENT 'PICO|PECO|PICo|SPIDER',
  parts_json       JSON NULL COMMENT '{P,I,C,O,...}',
  question_text    VARCHAR(1000) NULL,
  question_profile VARCHAR(32) NOT NULL DEFAULT 'general' COMMENT 'tcm-clinical|preclinical|vn-context|tcm-literature|general',
  status           VARCHAR(16) NOT NULL DEFAULT 'draft' COMMENT 'draft|active|archived',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Search run — BẤT BIẾN (không UPDATE sau khi ghi). M0 §A3 provenance_v1.
CREATE TABLE IF NOT EXISTS wb_search_runs (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id         BIGINT NOT NULL,
  question_id        BIGINT NULL,
  mode               ENUM('discovery','evidence') NOT NULL,
  query_original     VARCHAR(1000) NOT NULL,
  query_translated   VARCHAR(2000) NULL,
  query_expanded     JSON NULL COMMENT 'mọi biến thể VN/中文/EN/MeSH/pinyin đã gửi từng nguồn',
  request_fingerprint CHAR(64) NULL COMMENT 'sha256(mode|query_effective|sources|filters|query_version) — B10',
  filters_json       JSON NULL,
  date_range         VARCHAR(40) NULL,
  search_date        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  count_deduped      INT NOT NULL DEFAULT 0,
  retrieved_ids_json JSON NULL COMMENT 'danh sách external_id/DOI đã lấy — B10 audit/re-run',
  ranking_method     VARCHAR(40) NULL,
  dedup_method       VARCHAR(40) NULL DEFAULT 'identity-graph-v1',
  query_version      VARCHAR(24) NULL,
  coverage_state     ENUM('complete','partial','incomplete') NOT NULL DEFAULT 'incomplete',
  coverage_json      JSON NULL COMMENT 'evaluateCoverage(): satisfied_groups/unmet_groups/policy_version',
  raw_response_ref   VARCHAR(255) NULL COMMENT 'NULL ở v1 (M0 §B10)',
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  INDEX idx_project_mode (project_id, mode, search_date),
  INDEX idx_fingerprint (request_fingerprint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Evidence Coverage Manifest — từng connector trong một search_run (M0 §A3/§A4).
CREATE TABLE IF NOT EXISTS wb_search_run_sources (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  search_run_id     BIGINT NOT NULL,
  connector_id      VARCHAR(40) NOT NULL,
  connector_version VARCHAR(40) NULL,
  execution_status  ENUM('success','partial','timeout','unavailable','not_licensed','not_searched') NOT NULL,
  retrieved_count   INT NOT NULL DEFAULT 0,
  duration_ms       INT NOT NULL DEFAULT 0,
  error_detail      VARCHAR(500) NULL,
  FOREIGN KEY (search_run_id) REFERENCES wb_search_runs(id),
  INDEX idx_run (search_run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Canonical record — record_v1 (M0 §A2). Chia sẻ giữa các project (dedup theo identity graph).
CREATE TABLE IF NOT EXISTS wb_research_records (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(700) NOT NULL,
  abstract      MEDIUMTEXT NULL,
  authors_json  JSON NULL,
  journal       VARCHAR(300) NULL,
  year          SMALLINT NULL,
  language      VARCHAR(12) NULL,
  study_type    VARCHAR(24) NULL,
  subjects_json JSON NULL,
  keywords_json JSON NULL,
  flags_json    JSON NULL COMMENT '{retracted,correction,updated}',
  oa_status     VARCHAR(24) NULL,
  fulltext_json JSON NULL,
  merged_from_json JSON NULL COMMENT 'connector[] đã đóng góp',
  first_seen    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_year (year),
  INDEX idx_title (title(120))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Identity graph — mỗi record có nhiều (scheme,value). Merge dựa trên bảng này.
CREATE TABLE IF NOT EXISTS wb_record_identifiers (
  scheme     VARCHAR(20) NOT NULL COMMENT 'doi|pmid|pmcid|trial_reg_id|openalex|s2|core|wanfang|cnki',
  value      VARCHAR(200) NOT NULL,
  record_id  BIGINT NOT NULL,
  PRIMARY KEY (scheme, value),
  INDEX idx_record (record_id),
  FOREIGN KEY (record_id) REFERENCES wb_research_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
