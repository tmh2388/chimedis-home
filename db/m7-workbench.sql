-- Research Workbench M7 — rà soát lại đầy đủ danh mục "hạng mục nghiên cứu" theo đúng chuẩn
-- xuất bản khoa học thật (ICMJE Recommendations + EQUATOR Network reporting guidelines), và
-- đúng góp ý của user (2026-09-18): hạng mục là danh mục CỐ ĐỊNH của người nghiên cứu, không
-- phải "kiểu con" lồng vào nhau tuỳ tiện. Thay đổi cụ thể so với M5/M6:
--   - 'intl_paper' đổi tên thành 'original_research' (Original Research Article, đúng thuật
--     ngữ ICMJE) — các track_type cũ có giá trị 'intl_paper' cần đổi sang 'original_research'.
--   - Case report/series và Systematic review/Meta-analysis TÁCH RA thành hạng mục cha riêng
--     (trước đây là "study_design" con của intl_paper — sai bản chất phân loại thật).
--   - Thêm: narrative_review, protocol_paper, short_communication.
-- Xem lib/research-gates.js TRACK_TYPES để biết định nghĩa đầy đủ.
-- Chạy 1 lần trên MySQL production, an toàn chạy lại nhiều lần.

-- Bước 1: mở rộng ENUM (giữ 'intl_paper' tạm thời trong danh sách để bước 2 chạy được).
ALTER TABLE wb_research_tracks
  MODIFY COLUMN track_type ENUM(
    'msc_thesis','phd_thesis','intl_paper','original_research','systematic_review',
    'narrative_review','case_report','protocol_paper','short_communication',
    'conference_abstract','grant_proposal','report'
  ) NOT NULL;

-- Bước 2: chuyển dữ liệu cũ 'intl_paper' → 'original_research' (giữ nguyên study_design —
-- RCT/cohort/cross_sectional/prediction vẫn hợp lệ dưới original_research; 2 giá trị cũ
-- 'case_report' và 'systematic_review' từng lưu ở study_design nay đổi hẳn sang track_type
-- riêng, xoá study_design cũ tương ứng).
UPDATE wb_research_tracks SET track_type='case_report', study_design=NULL
  WHERE track_type='intl_paper' AND study_design='case_report';
UPDATE wb_research_tracks SET track_type='systematic_review', study_design=NULL
  WHERE track_type='intl_paper' AND study_design='systematic_review';
UPDATE wb_research_tracks SET track_type='original_research'
  WHERE track_type='intl_paper';

-- Bước 3: bỏ 'intl_paper' khỏi ENUM (đã hết bản ghi dùng giá trị này sau bước 2).
ALTER TABLE wb_research_tracks
  MODIFY COLUMN track_type ENUM(
    'msc_thesis','phd_thesis','original_research','systematic_review',
    'narrative_review','case_report','protocol_paper','short_communication',
    'conference_abstract','grant_proposal','report'
  ) NOT NULL;

-- Kiểm tra sau khi chạy:
-- SHOW CREATE TABLE wb_research_tracks;
-- SELECT track_type, study_design, COUNT(*) FROM wb_research_tracks GROUP BY 1,2;
