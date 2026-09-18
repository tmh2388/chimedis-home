-- Research Workbench M11 — Ghi chú trích xuất (extraction notes) cho từng bài trong thư viện
-- (2026-09-18, theo yêu cầu user: đọc đầy đủ toàn văn PDF là việc user tự làm — Chimedis
-- chưa/không tự đọc PDF được — nhưng cần NƠI LƯU những gì user trích ra, có cấu trúc, để
-- dùng lại khi viết luận văn/bài báo). Nhiều ghi chú tự do mỗi bài (không ép khuôn theo loại
-- nghiên cứu) — mỗi ghi chú có nhãn tự đặt (vd "Phương pháp", "Kết quả", "Trích dùng")
-- + trích dẫn nguyên văn (tuỳ chọn) + số trang (tuỳ chọn) + nội dung ghi chú.
-- Gắn theo CẶP (project_id, record_id) chứ không chỉ record_id — vì 1 bài (record) có thể
-- dùng chung nhiều dự án (identity-graph dedup toàn hệ thống, M0), nhưng ghi chú trích xuất
-- chỉ có ý nghĩa trong NGỮ CẢNH 1 dự án cụ thể (đề tài A quan tâm phần khác đề tài B).
-- FK composite tới wb_project_records đảm bảo ghi chú chỉ tồn tại cho bài THẬT SỰ có trong
-- thư viện dự án đó (không tạo ghi chú mồ côi).
-- Idempotent, an toàn chạy lại nhiều lần.

CREATE TABLE IF NOT EXISTS wb_extraction_notes (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id  BIGINT NOT NULL,
  record_id   BIGINT NOT NULL,
  tag         VARCHAR(60) NULL COMMENT 'Nhãn tự đặt, vd "Phương pháp"/"Kết quả"/"Trích dùng"',
  quote       TEXT NULL COMMENT 'Trích dẫn nguyên văn từ bài (tuỳ chọn)',
  content     TEXT NOT NULL COMMENT 'Nội dung ghi chú/diễn giải của người dùng',
  page_ref    VARCHAR(30) NULL COMMENT 'Số trang tham chiếu, vd "tr.12" hoặc "p.456-458"',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id, record_id) REFERENCES wb_project_records(project_id, record_id) ON DELETE CASCADE,
  INDEX idx_project_record (project_id, record_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Kiểm tra sau khi chạy:
-- SHOW CREATE TABLE wb_extraction_notes;
