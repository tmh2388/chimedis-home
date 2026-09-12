// M3 — phân loại study type bằng heuristic từ khoá tiêu đề/tóm tắt. KHÔNG gọi LLM
// (ngoài phạm vi D6). Chỉ dùng khi record chưa có study_type cụ thể (CoreDB/connector
// để 'unknown') — hiển thị tại chỗ, KHÔNG ghi đè DB (tránh sai lệch âm thầm).
// Thứ tự kiểm tra CÓ Ý NGHĨA: cụm đặc hiệu hơn ("systematic review") phải khớp trước
// cụm chung hơn ("review") để không bị nhãn chung nuốt mất.
// Mẫu tiếng Trung đi kèm mỗi mẫu tiếng Anh — nội dung CNKI/Wanfang hoàn toàn tiếng Trung
// nên thiếu mẫu tương ứng khiến MỌI bản ghi tiếng Trung luôn rơi vào "unknown" (bug thật
// đã gặp: tóm tắt có "随机对照试验" rành rành mà không đoán được RCT).
const RULES = [
  [/systematic review|系统评价|系统综述/i, 'systematic_review'],
  [/meta-?analysis|荟萃分析|meta分析/i, 'meta_analysis'],
  [/randomi[sz]ed control(led)? trial|\brct\b|随机对照试验|随机对照/i, 'rct'],
  [/randomi[sz]ed clinical trial/i, 'rct'],
  [/case[- ]control|病例对照/i, 'case_control'],
  [/cohort stud|队列研究/i, 'cohort'],
  [/cross-?sectional|横断面/i, 'cross_sectional'],
  [/case report|case series|病例报告|个案报道/i, 'case_report'],
  [/\bprotocol\b|研究方案|试验方案/i, 'protocol'],
  [/\breview\b|综述/i, 'review'],
  [/in vitro|animal model|\brat\b|\bmice\b|\bmouse\b|动物模型|大鼠|小鼠|体外实验/i, 'preclinical'],
  [/qualitative stud|质性研究|定性研究/i, 'qualitative'],
];

export function guessStudyType(title, abstract) {
  const text = `${title || ''} ${abstract || ''}`;
  for (const [re, type] of RULES) if (re.test(text)) return type;
  return 'unknown';
}

export const STUDY_TYPE_LABEL_VI = {
  systematic_review: 'Tổng quan hệ thống', meta_analysis: 'Phân tích gộp', rct: 'RCT (thử nghiệm ngẫu nhiên có đối chứng)',
  case_control: 'Bệnh-chứng', cohort: 'Đoàn hệ', cross_sectional: 'Cắt ngang', case_report: 'Báo cáo ca',
  protocol: 'Đề cương nghiên cứu', review: 'Tổng quan', preclinical: 'Tiền lâm sàng', qualitative: 'Định tính', unknown: 'Chưa rõ',
  // Loại TÀI LIỆU (không phải thiết kế nghiên cứu) — dùng khi nguồn (CNKI/RIS/BibTeX) cho
  // biết rõ đây là luận văn/kỷ yếu/báo cáo/sách, nhưng không tự thân nói lên thiết kế bên
  // trong (một luận văn vẫn có thể là RCT — xem STUDY_TYPE_FROM_DOCTYPE ở routes/workbench.js).
  thesis: 'Luận văn/Luận án', conference_paper: 'Báo cáo hội nghị', report: 'Báo cáo kỹ thuật', book: 'Sách',
  journal_article: 'Bài báo tạp chí',
};
