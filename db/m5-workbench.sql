-- Research Workbench M5 — Hạng mục nghiên cứu (tracks) + tiến độ theo Gate.
-- UI mới: menu trái là cây hạng mục cha-con (Luận văn Thạc sĩ/Tiến sĩ, Bài báo quốc tế theo
-- loại nghiên cứu, Báo cáo nghiên cứu), thường trực song song — 1 dự án có thể có nhiều track
-- cùng lúc. Nội dung từng Gate (tiêu đề/việc cần làm/deliverable) SỐNG Ở CODE (lib/research-gates.js),
-- KHÔNG lưu trong DB — bảng dưới chỉ lưu trạng thái người dùng tự đánh dấu (candidate/done), không
-- suy luận tự động từ M1-M4. Chạy 1 lần trên MySQL production, an toàn chạy lại (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS wb_research_tracks (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id    BIGINT NOT NULL,
  track_type    ENUM('msc_thesis','phd_thesis','intl_paper','report') NOT NULL,
  study_design  VARCHAR(40) NULL COMMENT 'chỉ dùng khi track_type=intl_paper — khoá trong TRACK_TYPES.intl_paper.studyDesigns (lib/research-gates.js)',
  title         VARCHAR(300) NULL COMMENT 'nhãn riêng do user đặt, vd tên bài báo — không bắt buộc',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id) ON DELETE CASCADE,
  INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_gate_progress (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  track_id    BIGINT NOT NULL,
  gate_no     TINYINT UNSIGNED NOT NULL COMMENT '0-24, khớp GATES[].no trong lib/research-gates.js',
  status      ENUM('pending','done') NOT NULL DEFAULT 'pending',
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (track_id) REFERENCES wb_research_tracks(id) ON DELETE CASCADE,
  UNIQUE KEY uq_track_gate (track_id, gate_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kiểm tra sau khi chạy:
-- SHOW CREATE TABLE wb_research_tracks;
-- SHOW CREATE TABLE wb_gate_progress;
