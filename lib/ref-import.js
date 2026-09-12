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

export function parseReferences(format, text) {
  if (format === 'bibtex') return parseBibtex(text);
  if (format === 'ris') return parseRis(text);
  throw new Error('Định dạng không hỗ trợ: ' + format);
}
