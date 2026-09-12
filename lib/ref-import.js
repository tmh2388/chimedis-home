// Bộ phân tích RIS/BibTeX nhẹ cho M3 — nhập hàng loạt bản ghi từ Zotero/EndNote/Wanfang/CNKI
// (các công cụ này đều xuất được RIS hoặc BibTeX). Không dùng thư viện ngoài — cả hai định
// dạng đơn giản, tự viết để tránh thêm dependency chỉ cho vài chục dòng logic.
// Không phân biệt hoa/thường tag RIS, KHÔNG parse tác giả "Họ, Tên" thành cấu trúc — giữ
// nguyên chuỗi hiển thị (đủ dùng cho evidence matrix, không cần chuẩn hoá citation).

const RIS_FIELD_MAP = {
  TI: 'title', T1: 'title', BT: 'title',
  AU: 'authors', A1: 'authors', A2: 'authors',
  PY: 'year', Y1: 'year', DA: 'year',
  JO: 'journal', JF: 'journal', T2: 'journal', J2: 'journal',
  AB: 'abstract', N2: 'abstract',
  DO: 'doi',
  KW: 'keywords',
  UR: 'url', L1: 'url', L2: 'url',
};

function yearFromRis(v) {
  const m = String(v).match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
}

// RIS: mỗi bản ghi là chuỗi dòng "TAG  - value", kết thúc bằng dòng "ER  - ".
export function parseRis(text) {
  const lines = String(text || '').split(/\r\n|\r|\n/);
  const records = [];
  let cur = null;
  for (const rawLine of lines) {
    const m = rawLine.match(/^([A-Z][A-Z0-9])\s*-\s?(.*)$/);
    if (!m) continue;
    const [, tag, value] = m;
    if (tag === 'TY') { cur = { authors: [], keywords: [] }; continue; }
    if (!cur) continue;
    if (tag === 'ER') { if (cur.title) records.push(finalizeRis(cur)); cur = null; continue; }
    const field = RIS_FIELD_MAP[tag];
    if (!field) continue;
    if (field === 'authors' || field === 'keywords') cur[field].push(value.trim());
    else if (field === 'year') cur.year = yearFromRis(value);
    else cur[field] = (cur[field] ? cur[field] + ' ' : '') + value.trim();
  }
  return records;
}

function finalizeRis(cur) {
  return {
    title: cur.title, authors: cur.authors, year: cur.year || null,
    journal: cur.journal || null, abstract: cur.abstract || null,
    doi: cur.doi || null, keywords: cur.keywords, url: cur.url || null,
  };
}

// BibTeX: khối "@type{key, field = {value}, ...}". Chấp nhận giá trị trong {} hoặc "".
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
    });
  }
  return records;
}

// "EndNote" xuất từ CNKI/Wanfang KHÔNG phải RIS chuẩn — dùng thẻ %-prefix riêng
// (%0 loại, %A tác giả, %T tiêu đề, %B tạp chí/kỷ yếu, %D năm, %K từ khoá, %X tóm tắt,
// %U link/DOI). Đây là "EndNote Tagged/Refer format" — khác hẳn RIS "TY - .../ER -".
// Người dùng rất dễ chọn nhầm (CNKI đặt tên mục xuất là "EndNote" nên trực giác chọn
// "RIS" ở form nhập), nên parser này luôn được thử tự động, không cần user chọn đúng.
const ENDNOTE_TAG_MAP = { T: 'title', A: 'authors', D: 'year', K: 'keywords', X: 'abstract', U: 'url', B: 'journal', J: 'journal' };

export function parseEndnoteTagged(text) {
  const lines = String(text || '').split(/\r\n|\r|\n/);
  const records = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^%([A-Za-z0-9+?])\s?(.*)$/);
    if (!m) continue;
    const [, tag, value] = m;
    if (tag === '0') { if (cur && cur.title) records.push(finalizeEndnote(cur)); cur = { authors: [], keywords: [] }; continue; }
    if (!cur) continue;
    const field = ENDNOTE_TAG_MAP[tag];
    if (!field) continue;
    if (field === 'authors') cur.authors.push(value.trim());
    else if (field === 'keywords') cur.keywords.push(...value.split(/[;；]/).map((s) => s.trim()).filter(Boolean));
    else if (field === 'year') cur.year = yearFromRis(value);
    else cur[field] = (cur[field] ? cur[field] + ' ' : '') + value.trim();
  }
  if (cur && cur.title) records.push(finalizeEndnote(cur));
  return records;
}

function finalizeEndnote(cur) {
  return {
    title: cur.title, authors: cur.authors, year: cur.year || null,
    journal: cur.journal || null, abstract: cur.abstract || null,
    doi: null, keywords: cur.keywords, url: cur.url || null,
  };
}

// "NoteExpress" xuất từ CNKI dùng thẻ dạng "{Tên trường}: giá trị" — khác cả RIS lẫn
// %-tag EndNote. Giữ được abstract/DOI/keywords (BibTeX CNKI xuất KHÔNG có 3 trường này)
// nên đây thường là lựa chọn xuất giàu dữ liệu nhất từ CNKI.
const NOTEEXPRESS_FIELD_MAP = {
  title: 'title', author: 'authors', year: 'year', keywords: 'keywords',
  abstract: 'abstract', url: 'url', doi: 'doi',
  'secondary title': 'journalPrimary', 'tertiary title': 'journalFallback',
};

export function parseNoteExpress(text) {
  const lines = String(text || '').split(/\r\n|\r|\n/);
  const records = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^\{([^}]+)\}:\s?(.*)$/);
    if (!m) continue;
    const [, rawKey, value] = m;
    const key = rawKey.trim().toLowerCase();
    if (key === 'reference type') { if (cur && cur.title) records.push(finalizeNoteExpress(cur)); cur = { authors: [], keywords: [] }; continue; }
    if (!cur) continue;
    const field = NOTEEXPRESS_FIELD_MAP[key];
    if (!field) continue;
    if (field === 'authors') cur.authors.push(...value.split(/[;；]/).map((s) => s.trim()).filter(Boolean));
    else if (field === 'keywords') cur.keywords.push(...value.split(/[;；]/).map((s) => s.trim()).filter(Boolean));
    else if (field === 'year') cur.year = yearFromRis(value);
    else if (field === 'journalPrimary' || field === 'journalFallback') cur[field] = cur[field] || value.trim();
    else cur[field] = (cur[field] ? cur[field] + ' ' : '') + value.trim();
  }
  if (cur && cur.title) records.push(finalizeNoteExpress(cur));
  return records;
}

function finalizeNoteExpress(cur) {
  return {
    title: cur.title, authors: cur.authors, year: cur.year || null,
    journal: cur.journalPrimary || cur.journalFallback || null, abstract: cur.abstract || null,
    doi: cur.doi || null, keywords: cur.keywords, url: cur.url || null,
  };
}

export function parseReferences(format, text) {
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
