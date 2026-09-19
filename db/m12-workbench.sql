-- Research Workbench M12 — đổi phân loại "khoảng trống" (gap_type) sang ĐÚNG khung học thuật
-- chuẩn Robinson et al. 2011 (Johns Hopkins, dùng bởi các Evidence-based Practice Center Mỹ,
-- xem https://www.ncbi.nlm.nih.gov/books/NBK62478/) thay vì danh sách tự đặt kiểu PICO cũ
-- ('evidence','population','intervention','outcome','method','mechanism','theory' — lẫn lộn
-- "loại khoảng trống" với "thành phần PICO", không phải phân loại khoa học thật).
-- 7 loại chuẩn: evidence, knowledge, practical_knowledge, methodological, empirical,
-- theoretical, population. Lý do đổi (2026-09-19, theo yêu cầu user tìm "điểm mạnh thật" của
-- hệ thống): LLM tự diễn giải khoảng trống bằng văn xuôi tự do giống hệt SciSpace/Elicit/
-- Consensus — không có gì khác biệt. Gắn đúng khung học thuật có tên tuổi (trích dẫn được khi
-- bảo vệ luận văn) là bước rẻ nhất, an toàn nhất để tăng độ tin cậy — bước #1 trong lộ trình 5
-- bước "Gap/Novelty Discovery" (xem [[project_chimedis_gap_novelty_roadmap]] trong bộ nhớ).
-- Idempotent, an toàn chạy lại nhiều lần.

-- Bước 1: mở rộng ENUM, thêm 7 giá trị mới (giữ tạm giá trị cũ để bước 2 chạy được).
ALTER TABLE wb_gap_candidates
  MODIFY COLUMN gap_type ENUM(
    'evidence','population','intervention','outcome','method','mechanism','theory',
    'knowledge','practical_knowledge','methodological','empirical','theoretical'
  ) NULL;

-- Bước 2: ánh xạ dữ liệu cũ (nếu có) sang khung mới — gần đúng nhất theo ý nghĩa gốc.
UPDATE wb_gap_candidates SET gap_type='methodological' WHERE gap_type='method';
UPDATE wb_gap_candidates SET gap_type='knowledge'       WHERE gap_type='mechanism';
UPDATE wb_gap_candidates SET gap_type='theoretical'      WHERE gap_type='theory';
UPDATE wb_gap_candidates SET gap_type='evidence'         WHERE gap_type IN ('intervention','outcome');
-- 'evidence' và 'population' đã trùng tên ở cả 2 khung, không cần đổi.

-- Bước 3: đóng ENUM lại, chỉ còn đúng 7 giá trị Robinson (bỏ intervention/outcome/method/
-- mechanism/theory — đã hết bản ghi dùng sau bước 2).
ALTER TABLE wb_gap_candidates
  MODIFY COLUMN gap_type ENUM(
    'evidence','knowledge','practical_knowledge','methodological',
    'empirical','theoretical','population'
  ) NULL;

-- Kiểm tra sau khi chạy:
-- SHOW CREATE TABLE wb_gap_candidates;
-- SELECT gap_type, COUNT(*) FROM wb_gap_candidates GROUP BY 1;
