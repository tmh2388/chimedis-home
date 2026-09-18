-- Research Workbench M8 — gộp "Luận văn Thạc sĩ" (msc_thesis) và "Luận văn Tiến sĩ" (phd_thesis)
-- thành 1 danh mục cha chung "thesis" (2026-09-18, theo yêu cầu user sau khi rà soát: khác nhau
-- ở TIÊU CHUẨN/KẾT QUẢ đầu ra chứ không phải quy trình — và tiêu chuẩn đó khác nhau TUỲ TRƯỜNG,
-- không có 1 chuẩn chung để tách cứng thành 2 danh mục). Nếu sau này cần phân biệt lại, thêm
-- studyDesigns con bên trong "thesis" (đúng cách original_research đang làm), KHÔNG tách lại
-- thành 2 danh mục cha. Xem lib/research-gates.js TRACK_TYPES.
-- Chạy 1 lần trên MySQL production, an toàn chạy lại nhiều lần.

-- Bước 1: mở rộng ENUM, thêm 'thesis' (giữ tạm msc_thesis/phd_thesis để bước 2 chạy được).
ALTER TABLE wb_research_tracks
  MODIFY COLUMN track_type ENUM(
    'msc_thesis','phd_thesis','thesis','original_research','systematic_review',
    'narrative_review','case_report','protocol_paper','short_communication',
    'conference_abstract','grant_proposal','report'
  ) NOT NULL;

-- Bước 2: với bản ghi CHƯA đặt tên riêng (title NULL), gán tên mặc định trước khi gộp — tránh
-- mất thông tin "đây là Thạc sĩ hay Tiến sĩ" sau khi 2 danh mục nhập về 1.
UPDATE wb_research_tracks SET title='Luận văn Thạc sĩ' WHERE track_type='msc_thesis' AND title IS NULL;
UPDATE wb_research_tracks SET title='Luận văn Tiến sĩ' WHERE track_type='phd_thesis' AND title IS NULL;
UPDATE wb_research_tracks SET track_type='thesis' WHERE track_type IN ('msc_thesis','phd_thesis');

-- Bước 3: đóng ENUM lại, bỏ 2 giá trị cũ (đã hết bản ghi dùng sau bước 2).
ALTER TABLE wb_research_tracks
  MODIFY COLUMN track_type ENUM(
    'thesis','original_research','systematic_review',
    'narrative_review','case_report','protocol_paper','short_communication',
    'conference_abstract','grant_proposal','report'
  ) NOT NULL;

-- Kiểm tra sau khi chạy:
-- SHOW CREATE TABLE wb_research_tracks;
-- SELECT track_type, title, COUNT(*) FROM wb_research_tracks GROUP BY 1,2;
