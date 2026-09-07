-- =====================================================================================
-- Research Workbench — M1 (Search Foundation + Provenance)
-- Bản TRÍCH RIÊNG từ db/schema.sql để chạy độc lập trên production.
-- An toàn chạy nhiều lần: chỉ CREATE TABLE IF NOT EXISTS, KHÔNG DROP, KHÔNG xoá dữ liệu.
-- Điều kiện: bảng `users` đã tồn tại (từ Firebase Auth) với `id` kiểu INT.
-- Xem docs/research-workbench-M0-architecture-freeze.md (tag `m0-frozen`).
-- =====================================================================================

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

CREATE TABLE IF NOT EXISTS wb_record_identifiers (
  scheme     VARCHAR(20) NOT NULL COMMENT 'doi|pmid|pmcid|trial_reg_id|openalex|s2|core|wanfang|cnki',
  value      VARCHAR(200) NOT NULL,
  record_id  BIGINT NOT NULL,
  PRIMARY KEY (scheme, value),
  INDEX idx_record (record_id),
  FOREIGN KEY (record_id) REFERENCES wb_research_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Kiểm tra sau khi chạy =====
-- SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'wb\_%';
-- Kỳ vọng 6 dòng: wb_projects, wb_research_questions, wb_search_runs,
--   wb_search_run_sources, wb_research_records, wb_record_identifiers.
