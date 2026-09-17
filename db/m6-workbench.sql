-- Research Workbench M6 — mở rộng danh sách hạng mục nghiên cứu (track_type) sau khi rà soát
-- lại đầy đủ các loại sản phẩm một nhà nghiên cứu khoa học thường cần theo dõi: thêm
-- "Tóm tắt/Áp phích hội nghị" (conference_abstract) và "Đề cương xin tài trợ/đăng ký nghiên
-- cứu" (grant_proposal) — xem lib/research-gates.js TRACK_TYPES. Chạy 1 lần trên MySQL
-- production, an toàn chạy lại nhiều lần.

ALTER TABLE wb_research_tracks
  MODIFY COLUMN track_type ENUM('msc_thesis','phd_thesis','intl_paper','report','conference_abstract','grant_proposal') NOT NULL;

-- Kiểm tra sau khi chạy:
-- SHOW CREATE TABLE wb_research_tracks;
