-- Research Workbench M4 v1 — Gap Candidate (chỉ tới trạng thái "candidate", đúng ranh giới
-- MVP đã chốt ở M0 §B1/A5: "MVP v1 chỉ đi tới candidate"). KHÔNG làm verification/state
-- machine đầy đủ (searched→evidence-assessed→reviewed→accepted) — để dành M4+.
-- Xem docs/research-workbench-plan.md mục 6/7, docs/research-workbench-M0-architecture-freeze.md §A5.
-- Chạy 1 lần trên MySQL production, an toàn chạy lại nhiều lần (IF NOT EXISTS).

-- ===== Mở rộng bảng users có sẵn: gói dùng (free/pro) =====
-- Tìm kiếm (Discovery/Evidence Search) LUÔN MIỄN PHÍ cho mọi tài khoản, không đụng cột này.
-- Chỉ tính năng TỐN LLM (Phân tích khoảng trống, Sonnet) mới kiểm tra plan='pro' — xem
-- routes/workbench.js requireLlmAllowed(). CHƯA có cổng thanh toán (giai đoạn 3, làm sau) —
-- hiện tại chủ dự án tự UPDATE cột này bằng tay cho tài khoản muốn cấp quyền thử.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan ENUM('free','pro') NOT NULL DEFAULT 'free' COMMENT 'free=tìm kiếm miễn phí, pro=thêm tính năng AI tốn phí (gap candidate...)';

CREATE TABLE IF NOT EXISTS wb_gap_candidates (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id           BIGINT NOT NULL,
  question_id          BIGINT NULL,
  origin_search_run_id BIGINT NOT NULL COMMENT 'bắt buộc — mọi candidate phải nối đất vào 1 lượt tìm thật',
  title                VARCHAR(500) NOT NULL,
  gap_type             ENUM('evidence','population','intervention','outcome','method','mechanism','theory') NULL,
  body_json            JSON NOT NULL COMMENT '{evidenceHave:[{recordId,note}], whatsMissing, whyItMatters, feasibilityNote}',
  state                ENUM('candidate','rejected') NOT NULL DEFAULT 'candidate' COMMENT 'v1 chỉ 2 giá trị — mở rộng searched/evidence-assessed/reviewed/accepted ở M4+ không cần đổi schema',
  tags                 VARCHAR(300) NULL,
  user_note            TEXT NULL,
  llm_model            VARCHAR(64) NULL,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (origin_search_run_id) REFERENCES wb_search_runs(id),
  INDEX idx_project_state (project_id, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sổ cái chi phí LLM — dùng chung cho MỌI tính năng AI tương lai (không riêng gap candidate),
-- đúng M0 §16/B2. KHÔNG giới hạn ở v1 (single-user testing, xem feedback_chimedis_llm_credit_
-- model bộ nhớ dự án) — chỉ ghi lại để tính gói/giá sau khi có số liệu thật.
CREATE TABLE IF NOT EXISTS wb_ai_runs (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  project_id   BIGINT NULL,
  feature      VARCHAR(40) NOT NULL COMMENT 'gap_candidate|dict_translate|...',
  model        VARCHAR(64) NOT NULL,
  tokens_in    INT NOT NULL DEFAULT 0,
  tokens_out   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_time (user_id, created_at),
  INDEX idx_feature_time (feature, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kiểm tra sau khi chạy:
-- SHOW CREATE TABLE wb_gap_candidates;
-- SHOW CREATE TABLE wb_ai_runs;
