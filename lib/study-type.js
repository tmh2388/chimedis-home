// M3 — phân loại study type bằng heuristic từ khoá tiêu đề/tóm tắt. KHÔNG gọi LLM
// (ngoài phạm vi D6). Chỉ dùng khi record chưa có study_type cụ thể (CoreDB/connector
// để 'unknown') — hiển thị tại chỗ, KHÔNG ghi đè DB (tránh sai lệch âm thầm).
// Thứ tự kiểm tra CÓ Ý NGHĨA: cụm đặc hiệu hơn ("systematic review") phải khớp trước
// cụm chung hơn ("review") để không bị nhãn chung nuốt mất.
const RULES = [
  [/systematic review/i, 'systematic_review'],
  [/meta-?analysis/i, 'meta_analysis'],
  [/randomi[sz]ed control(led)? trial|\brct\b/i, 'rct'],
  [/randomi[sz]ed clinical trial/i, 'rct'],
  [/case[- ]control/i, 'case_control'],
  [/cohort stud/i, 'cohort'],
  [/cross-?sectional/i, 'cross_sectional'],
  [/case report|case series/i, 'case_report'],
  [/\bprotocol\b/i, 'protocol'],
  [/\breview\b/i, 'review'],
  [/in vitro|animal model|\brat\b|\bmice\b|\bmouse\b/i, 'preclinical'],
  [/qualitative stud/i, 'qualitative'],
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
};
