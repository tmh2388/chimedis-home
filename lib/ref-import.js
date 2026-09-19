// Bộ phân tích RIS/BibTeX/EndNote-tagged/NoteExpress cho M3 — nhập hàng loạt bản ghi từ
// Zotero/EndNote/Wanfang/CNKI. Không dùng thư viện ngoài.
//
// ===== KHO BÍ DANH TRƯỜNG DÙNG CHUNG =====
// CNKI/Wanfang dùng TÊN TRƯỜNG KHÁC NHAU tuỳ loại tài liệu và định dạng xuất — ví dụ
// "nguồn" của bài báo là {Journal}, của kỷ yếu hội thảo là {Secondary Title}, của luận
// văn là {Publisher} (tên trường). Nếu map cứng từng định dạng riêng, mỗi loại tài liệu
// mới gặp lại vỡ 1 lần. Thay vào đó: MỘT bảng bí danh theo TRƯỜNG ĐÍCH (canonical), mỗi
// trường đích có danh sách bí danh THEO THỨ TỰ ƯU TIÊN cho từng định dạng nguồn — bí danh
// đứng trước được ưu tiên nếu bản ghi vô tình có nhiều bí danh cùng trỏ 1 trường đích.
// MỞ RỘNG: gặp trường/định dạng mới → chỉ thêm bí danh vào đúng danh sách bên dưới,
// KHÔNG cần sửa logic parse của parseRis/parseEndnoteTagged/parseNoteExpress.
const FIELD_ALIASES = {
  title: { ris: ['TI', 'T1', 'BT'], endnote: ['T'], noteexpress: ['title', 'article title', 'book title'] },
  authors: { ris: ['AU', 'A1', 'A2'], endnote: ['A'], noteexpress: ['author', 'authors', 'creator'] },
  year: { ris: ['PY', 'Y1', 'DA'], endnote: ['D'], noteexpress: ['year', 'publication year', 'pub year', 'date'] },
  // Thứ tự ưu tiên: tên tạp chí/kỷ yếu thật (journal/secondary title) trước, tên trường
  // của luận văn (publisher/%I) sau cùng — chỉ dùng khi không có gì tốt hơn.
  journal: {
    ris: ['JO', 'JF', 'T2', 'J2'], endnote: ['B', 'J', 'I'],
    noteexpress: ['journal', 'secondary title', 'periodical', 'conference name', 'tertiary title', 'publisher'],
  },
  abstract: { ris: ['AB', 'N2'], endnote: ['X'], noteexpress: ['abstract', 'summary'] },
  // %R = DOI trong EndNote-tag (đã xác nhận qua file .enw thật của CNKI, 2026-09-12) —
  // thiếu bí danh này khiến DOI KHÔNG BAO GIỜ được lưu khi nhập file EndNote.
  doi: { ris: ['DO'], endnote: ['R'], noteexpress: ['doi'] },
  keywords: { ris: ['KW'], endnote: ['K'], noteexpress: ['keywords', 'keyword', 'subject'] },
  url: { ris: ['UR', 'L1', 'L2'], endnote: ['U'], noteexpress: ['url', 'link'] },
  // Tập/Số/Trang (M10, 2026-09-19) — CHỈ thêm bí danh noteexpress (đã xác nhận qua trang
  // "导出与分析 → NoteExpress" thật của CNKI: [Volume]/[Issue]/[Pages]). CHƯA thêm RIS/EndNote
  // vì chưa có file thật để xác nhận đúng tag (RIS có chuẩn VL/IS/SP nhưng CNKI có dùng đúng
  // chuẩn không thì chưa kiểm chứng — theo đúng quy ước file này: chỉ thêm khi đã test thật).
  volume: { ris: [], endnote: [], noteexpress: ['volume'] },
  issue: { ris: [], endnote: [], noteexpress: ['issue', 'number'] },
  pages: { ris: [], endnote: [], noteexpress: ['pages', 'page'] },
};
const ARRAY_FIELDS = new Set(['authors', 'keywords']);

// Đảo `FIELD_ALIASES` thành bảng tra "bí danh -> {canon, priority}" cho 1 định dạng cụ
// thể (`fmtKey` = 'ris'|'endnote'|'noteexpress'). `priority` = vị trí trong danh sách bí
// danh của trường đó (nhỏ hơn = ưu tiên hơn) — dùng khi nhiều bí danh cùng xuất hiện.
function buildTagMap(fmtKey) {
  const map = {};
  for (const [canon, byFmt] of Object.entries(FIELD_ALIASES)) {
    (byFmt[fmtKey] || []).forEach((alias, priority) => { map[alias] = { canon, priority }; });
  }
  return map;
}
const RIS_TAG_MAP = buildTagMap('ris');
const ENDNOTE_TAG_MAP = buildTagMap('endnote');
const NOTEEXPRESS_KEY_MAP = Object.fromEntries(
  Object.entries(buildTagMap('noteexpress')).map(([k, v]) => [k.toLowerCase(), v])
);

function yearFromRaw(v) {
  const m = String(v).match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
}

// Bộ gom trường theo bản ghi: field scalar giữ giá trị THẮNG ưu tiên thấp nhất đã thấy;
// field mảng (authors/keywords) gộp mọi bí danh gặp được, không phân biệt ưu tiên.
function newAccumulator() {
  return { scalar: {}, arrays: { authors: [], keywords: [] } };
}
function setField(acc, canon, priority, rawValue) {
  if (ARRAY_FIELDS.has(canon)) return null; // xử lý riêng ở caller (cần tách theo dấu ;)
  const cur = acc.scalar[canon];
  if (!cur || priority < cur.priority) acc.scalar[canon] = { value: rawValue.trim(), priority };
  else if (priority === cur.priority) acc.scalar[canon].value += ' ' + rawValue.trim();
  return acc.scalar[canon];
}
function finalizeAccumulator(acc) {
  const g = (k) => (acc.scalar[k] ? acc.scalar[k].value : null);
  return {
    title: g('title'), authors: acc.arrays.authors, year: g('year') ? yearFromRaw(g('year')) : null,
    journal: g('journal'), abstract: g('abstract'), doi: g('doi'),
    keywords: acc.arrays.keywords, url: g('url'), docType: acc.docType || null,
    volume: g('volume'), issue: g('issue'), pages: g('pages'),
  };
}
// Nối dòng "tiếp theo" (không mang tag/nhãn trường) vào trường vừa đọc trước đó — nhiều
// nguồn (đặc biệt CNKI) bẻ dòng cứng cho trường dài như abstract, KHÔNG lặp lại tag ở mỗi
// dòng. Không xử lý continuation sẽ cắt cụt abstract ở dòng đầu tiên (bug thật đã gặp).
function appendContinuation(acc, lastSlot, rawLine) {
  const text = rawLine.trim();
  if (!acc || !lastSlot || !text) return;
  if (lastSlot.isArray) {
    const arr = acc.arrays[lastSlot.canon];
    if (arr.length) arr[arr.length - 1] += ' ' + text;
  } else if (acc.scalar[lastSlot.canon]) {
    acc.scalar[lastSlot.canon].value += ' ' + text;
  }
}

// RIS: mỗi bản ghi là chuỗi dòng "TAG  - value", kết thúc bằng dòng "ER  - ".
export function parseRis(text) {
  const lines = String(text || '').split(/\r\n|\r|\n/);
  const records = [];
  let acc = null;
  let lastSlot = null;
  for (const rawLine of lines) {
    // (?:^|;) thay vì chỉ `^`: file CNKI thật gặp trường hợp record ĐẦU TIÊN dính liền
    // cuối 1 đoạn <script> nội bộ trang, ngăn cách bằng ";" chứ không phải xuống dòng
    // (vd "...}();        ;TY  - JOUR") — neo cứng `^` làm mất trắng bản ghi đó (bug thật
    // đã gặp với file .net/.enw CNKI thật, 2026-09-12). Không bỏ neo hoàn toàn (tránh khớp
    // nhầm "XX - " ngẫu nhiên giữa câu tóm tắt) — chỉ nới cho đúng dạng artifact đã gặp.
    const m = rawLine.match(/(?:^|;)\s*([A-Z][A-Z0-9])\s*-\s?(.*)$/);
    if (!m) { appendContinuation(acc, lastSlot, rawLine); continue; }
    const [, tag, value] = m;
    if (tag === 'TY') { acc = newAccumulator(); acc.docType = value.trim(); lastSlot = null; continue; }
    if (!acc) continue;
    if (tag === 'ER') { if (acc.scalar.title) records.push(finalizeAccumulator(acc)); acc = null; lastSlot = null; continue; }
    const hit = RIS_TAG_MAP[tag];
    if (!hit) { lastSlot = null; continue; }
    if (ARRAY_FIELDS.has(hit.canon)) { acc.arrays[hit.canon].push(value.trim()); lastSlot = { canon: hit.canon, isArray: true }; }
    else { setField(acc, hit.canon, hit.priority, value); lastSlot = { canon: hit.canon, isArray: false }; }
  }
  return records;
}

// "EndNote" xuất từ CNKI/Wanfang KHÔNG phải RIS chuẩn — dùng thẻ %-prefix riêng
// (%0 loại, %A tác giả, %T tiêu đề, %B tạp chí/kỷ yếu, %D năm, %K từ khoá, %X tóm tắt,
// %U link/DOI). Đây là "EndNote Tagged/Refer format" — khác hẳn RIS "TY - .../ER -".
// Người dùng rất dễ chọn nhầm (CNKI đặt tên mục xuất là "EndNote" nên trực giác chọn
// "RIS" ở form nhập), nên parser này luôn được thử tự động, không cần user chọn đúng.
export function parseEndnoteTagged(text) {
  const lines = String(text || '').split(/\r\n|\r|\n/);
  const records = [];
  let acc = null;
  let lastSlot = null;
  for (const line of lines) {
    // (?:^|;) — cùng lý do như parseRis: file .enw CNKI thật có bản ghi đầu dính liền
    // script nội bộ trang qua dấu ";", không xuống dòng.
    const m = line.match(/(?:^|;)\s*%([A-Za-z0-9+?])\s?(.*)$/);
    if (!m) { appendContinuation(acc, lastSlot, line); continue; }
    const [, tag, value] = m;
    if (tag === '0') { if (acc && acc.scalar.title) records.push(finalizeAccumulator(acc)); acc = newAccumulator(); acc.docType = value.trim(); lastSlot = null; continue; }
    if (!acc) continue;
    const hit = ENDNOTE_TAG_MAP[tag];
    if (!hit) { lastSlot = null; continue; }
    if (ARRAY_FIELDS.has(hit.canon)) {
      const parts = hit.canon === 'keywords' ? value.split(/[;；]/).map((s) => s.trim()).filter(Boolean) : [value.trim()];
      acc.arrays[hit.canon].push(...parts);
      lastSlot = { canon: hit.canon, isArray: true };
    } else { setField(acc, hit.canon, hit.priority, value); lastSlot = { canon: hit.canon, isArray: false }; }
  }
  if (acc && acc.scalar.title) records.push(finalizeAccumulator(acc));
  return records;
}

// "NoteExpress" xuất từ CNKI dùng thẻ dạng "{Tên trường}: giá trị" (file .net tải về) HOẶC
// "[Tên trường]: giá trị" (trang "导出与分析 → 导出文献 → NoteExpress" hiện TRỰC TIẾP trên
// web, không cần tải file — xác nhận qua ảnh chụp thật của user 2026-09-19, dùng cho bookmarklet
// nhập hàng loạt). Cùng 1 bộ bí danh trường, chỉ khác ký hiệu ngoặc bao quanh tên trường —
// khớp CẢ 2 kiểu ngoặc bằng 1 regex. Tên trường THAY ĐỔI theo loại tài liệu (Journal Article/
// Conference Proceedings/Thesis...) — xem bảng FIELD_ALIASES.journal ở đầu file để biết vì
// sao cần nhiều bí danh cho cùng 1 khái niệm "nguồn". "Author Address" (đơn vị công tác) CỐ
// Ý không có bí danh — không lẫn vào danh sách tác giả.
export function parseNoteExpress(text) {
  const lines = String(text || '').split(/\r\n|\r|\n/);
  const records = [];
  let acc = null;
  let lastSlot = null;
  for (const line of lines) {
    // (?:^|;) thay vì chỉ `^`: file .net CNKI thật gặp trường hợp record ĐẦU TIÊN dính
    // liền vào cuối 1 đoạn <script> nội bộ của trang qua dấu ";" (vd `...}();        ;
    // {Reference Type}: Conference Proceedings`, không xuống dòng) — neo cứng `^` làm mất
    // trắng bản ghi đó (bug thật đã gặp, file export thật của user, 2026-09-12). Không bỏ
    // neo hoàn toàn — tránh khớp nhầm dấu ngoặc nhọn/vuông tình cờ xuất hiện giữa câu tóm tắt.
    const m = line.match(/(?:^|;)\s*[{[]([^}\]]+)[}\]]:\s?(.*)$/);
    if (!m) { appendContinuation(acc, lastSlot, line); continue; }
    const [, rawKey, value] = m;
    const key = rawKey.trim().toLowerCase();
    if (key === 'reference type') { if (acc && acc.scalar.title) records.push(finalizeAccumulator(acc)); acc = newAccumulator(); acc.docType = value.trim(); lastSlot = null; continue; }
    if (!acc) continue;
    const hit = NOTEEXPRESS_KEY_MAP[key];
    if (!hit) { lastSlot = null; continue; }
    if (ARRAY_FIELDS.has(hit.canon)) {
      acc.arrays[hit.canon].push(...value.split(/[;；]/).map((s) => s.trim()).filter(Boolean));
      lastSlot = { canon: hit.canon, isArray: true };
    } else { setField(acc, hit.canon, hit.priority, value); lastSlot = { canon: hit.canon, isArray: false }; }
  }
  if (acc && acc.scalar.title) records.push(finalizeAccumulator(acc));
  return records;
}

// BibTeX: khối "@type{key, field = {value}, ...}". Chấp nhận giá trị trong {} hoặc "".
// Cấu trúc key=value tự nhiên đã rõ ràng (không cần bí danh multi-format) nên giữ đơn
// giản, không dùng qua FIELD_ALIASES.
export function parseBibtex(text) {
  const src = String(text || '');
  const records = [];
  const entryRe = /@(\w+)\s*\{([^,]*),([\s\S]*?)\n\}/g;
  let m;
  while ((m = entryRe.exec(src))) {
    const body = m[3];
    const fields = {};
    const fieldRe = /(\w+)\s*=\s*(\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)")/g;
    let fm;
    while ((fm = fieldRe.exec(body))) {
      const key = fm[1].toLowerCase();
      fields[key] = (fm[3] !== undefined ? fm[3] : fm[4]).replace(/\s+/g, ' ').trim();
    }
    if (!fields.title) continue;
    const authors = fields.author ? fields.author.split(/\s+and\s+/i).map((s) => s.trim()).filter(Boolean) : [];
    const keywords = fields.keywords ? fields.keywords.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [];
    records.push({
      title: fields.title, authors,
      year: fields.year ? (parseInt(fields.year, 10) || null) : null,
      journal: fields.journal || fields.booktitle || null,
      abstract: fields.abstract || null,
      doi: fields.doi || null,
      keywords,
      url: fields.url || null,
      docType: m[1] || null, // @article/@conference/@mastersthesis... — loại tài liệu BibTeX chuẩn
    });
  }
  return records;
}

// 万方 (Wanfang) KHÔNG cho xuất trích dẫn (NoteExpress/RIS/BibTeX đều trống — user xác nhận
// 2026-09-19), chỉ có trang danh sách kết quả tìm kiếm hiển thị sẵn đủ tiêu đề/tác giả/tạp
// chí/năm/tóm tắt/từ khoá. Parser này đọc TRỰC TIẾP text đã bôi-copy từ trang đó (KHÔNG cần
// bước xuất nào) — mẫu thật do user cung cấp (bôi-copy 3 kết quả, dán nguyên văn):
//   1.<tiêu đề>
//   [<loại tài liệu>]<tác giả dính liền nhau>-《<tên tạp chí>》<nhãn CSTPCD/北大核心/CSCD...><năm>年<số kỳ>期
//   摘要：<tóm tắt, có thể bị cắt ngắn ở trang danh sách, không có dấu hiệu phân biệt rõ với
//         dòng từ khoá ngay sau nếu bị cắt giữa câu>
//   <từ khoá dính liền nhau, không có dấu phân cách>
//   <các dòng nút bấm 在线阅读/下载/引用/收藏/评审材料/"下载：N" — bỏ qua, số dòng không cố định>
// GIỚI HẠN ĐÃ BIẾT (không cố khắc phục bằng suy đoán, tránh bịa sai):
//   - Tác giả KHÔNG có dấu phân cách giữa các tên (CSS ẩn khoảng trắng khi copy) — không thể
//     tách an toàn thành từng tên riêng bằng regex (rủi ro cắt sai ranh giới tên người), nên
//     giữ nguyên CẢ KHỐI làm 1 phần tử authors — user tự sửa tay nếu cần trong bước xem trước.
//   - Từ khoá cùng vấn đề dính liền — giữ nguyên khối, không tách.
//   - Tóm tắt ở trang danh sách CÓ THỂ bị cắt ngắn (không phải bản đầy đủ như trang chi tiết).
export function parseWanfangList(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const titleRe = /^(\d+)[.、]\s*(.+)$/;
  const citeRe = /^\[([^\]]+)\]([^\n]*?)-\s*《([^》]+)》[^\d\n]*(\d{4})年(\d+)期/;
  const records = [];
  let i = 0;
  while (i < lines.length) {
    const tm = lines[i].match(titleRe);
    if (!tm) { i += 1; continue; }
    const title = tm[2].trim();
    let j = i + 1;
    const cm = j < lines.length ? lines[j].match(citeRe) : null;
    if (!cm) { i += 1; continue; }
    const docType = cm[1];
    const authorsBlob = cm[2].trim().replace(/等$/, '').trim();
    const journal = cm[3].trim();
    const year = parseInt(cm[4], 10) || null;
    const issue = cm[5] || null;
    j += 1;
    let abstract = null;
    const keywords = [];
    if (j < lines.length && /^摘要[:：]/.test(lines[j])) {
      abstract = lines[j].replace(/^摘要[:：]\s*/, '').trim() || null;
      j += 1;
      if (j < lines.length && !titleRe.test(lines[j]) && !/^(在线阅读|下载|全文快报|引用|收藏|评审材料)/.test(lines[j])) {
        keywords.push(lines[j].trim());
        j += 1;
      }
    }
    while (j < lines.length && !titleRe.test(lines[j])) j += 1;
    records.push({
      title, authors: authorsBlob ? [authorsBlob] : [], year, journal,
      volume: null, issue, pages: null, abstract, keywords, doi: null, url: null, docType,
    });
    i = j;
  }
  return records;
}

export function parseReferences(format, text) {
  if (format === 'wanfang-list') return parseWanfangList(text);
  const tryOrder = format === 'bibtex'
    ? [parseBibtex, parseNoteExpress, parseRis, parseEndnoteTagged]
    : [parseRis, parseEndnoteTagged, parseNoteExpress, parseBibtex];
  let best = [];
  for (const fn of tryOrder) {
    let out;
    try { out = fn(text); } catch { out = []; }
    if (out.length > best.length) best = out;
  }
  if (!best.length && !['ris', 'bibtex'].includes(format)) {
    throw new Error('Định dạng không hỗ trợ: ' + format);
  }
  return best;
}
