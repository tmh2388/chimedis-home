-- Research Workbench M3 (slice 1) — Project Library / shortlist.
-- Xem docs/research-workbench-plan.md M3 "Project library". Canonical record vẫn ở
-- wb_research_records (dùng chung xuyên project qua identity-graph dedup, M1); bảng
-- này chỉ là LIÊN KẾT "project này đã lưu bản ghi nào vào thư viện của nó".
-- Chạy 1 lần trên MySQL production, an toàn chạy lại nhiều lần (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS wb_project_records (
  project_id  BIGINT NOT NULL,
  record_id   BIGINT NOT NULL,
  status      ENUM('shortlisted','included','excluded') NOT NULL DEFAULT 'shortlisted',
  note        TEXT NULL,
  added_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, record_id),
  FOREIGN KEY (project_id) REFERENCES wb_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (record_id) REFERENCES wb_research_records(id),
  INDEX idx_project_status (project_id, status, added_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kiểm tra sau khi chạy:
-- SELECT TABLE_NAME FROM information_schema.TABLES
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wb_project_records';
