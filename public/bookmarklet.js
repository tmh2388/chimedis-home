// M9 — "Lưu vào Chimedis" bookmarklet loader (2026-09-18, cập nhật lớn 2026-09-19).
// Được nạp bằng bookmarklet cực ngắn: javascript:(function(){var s=document.createElement
// ('script');s.src='https://chimedis.vn/bookmarklet.js?t=TOKEN&r='+Date.now();document.body
// .appendChild(s);})() — logic thật sống ở đây (file tĩnh) để có thể sửa/cải thiện về sau mà
// KHÔNG cần user cài lại bookmarklet. Token cá nhân đọc từ query string của chính thẻ
// <script> này (id `chimedis-bk-loader`).
//
// Chạy TRÊN DOM của trang bên ngoài (CNKI/万方/tạp chí bất kỳ) — dùng Shadow DOM để cô lập
// hoàn toàn CSS, tránh xung đột với style của trang chủ.
//
// TRÍCH XUẤT ĐA TẦNG, ĐA BÍ DANH (2026-09-19, theo yêu cầu user — cùng triết lý bảng
// FIELD_ALIASES đã dùng cho nhập RIS/BibTeX/EndNote/NoteExpress ở lib/ref-import.js: 1 khái
// niệm có NHIỀU cách viết/nhiều ngôn ngữ, dò theo danh sách bí danh thay vì đoán 1 kiểu cố
// định). Mỗi trường thử theo thứ tự, dừng ở tầng đầu tiên có kết quả:
//   1) <meta name="citation_*">/<meta name="dc.*"> — chuẩn Highwire/Dublin Core, nhiều nhà
//      xuất bản quốc tế (Elsevier/Springer/Wiley/PubMed...) có sẵn, không cần suy đoán gì.
//   2) Selector CSS đã biết theo từng trường (class/id thường gặp ở CNKI/万方/các site khác).
//   3) Regex "dòng trích dẫn" gộp journal+year+volume+issue+pages (nhiều mẫu, cả kiểu Trung
//      Quốc "Tên . Năm,Tập(Số):Trang" lẫn kiểu Anh "Tên, Vol X, No Y, pp Z (Năm)").
//   4) Quét nhãn đứng riêng (LABEL_WORDS — đa ngôn ngữ Việt/Trung/Anh, nhiều bí danh mỗi
//      trường) rồi lấy phần văn bản đi kèm — dùng chung 1 hàm findByLabelWords() cho MỌI
//      trường (abstract/authors/journal/year/volume/issue/pages/keywords), không phải viết
//      riêng từng trường như bản cũ.
// KHÔNG có tầng nào đảm bảo đúng 100% trên MỌI trang — đây là suy đoán theo mẫu phổ biến,
// càng nhiều site test thực tế càng bổ sung thêm bí danh/selector mới vào bảng bên dưới.
// Overlay LUÔN cho sửa tay mọi trường + nút "↻ Trích lại từ trang" làm lưới an toàn cuối.
(function () {
  if (window.__chimedisBookmarkletActive) return;
  window.__chimedisBookmarkletActive = true;

  var API_BASE = 'https://chimedis.vn/api/bookmarklet';
  var thisScript = document.getElementById('chimedis-bk-loader') ||
    document.currentScript ||
    (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var params = new URLSearchParams((thisScript.src || '').split('?')[1] || '');
  var TOKEN = params.get('t') || '';

  function metaAll(name) {
    return Array.prototype.slice.call(document.querySelectorAll('meta[name="' + name + '"]'))
      .map(function (m) { return (m.getAttribute('content') || '').trim(); })
      .filter(Boolean);
  }
  function meta1(name) { return metaAll(name)[0] || ''; }
  function visibleText(el) {
    return ((el.innerText != null ? el.innerText : el.textContent) || '').replace(/\s+/g, ' ').trim();
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'); }

  // ===== Bảng bí danh nhãn đa ngôn ngữ (VI/ZH/EN) — mở rộng khi gặp site mới chỉ cần thêm
  // từ vào đây, KHÔNG cần sửa logic. Cùng tinh thần FIELD_ALIASES của lib/ref-import.js. =====
  var LABEL_WORDS = {
    abstract: ['摘要', '摘 要', '内容摘要', '中文摘要', 'abstract', 'summary', 'tóm tắt'],
    authors: ['作者', '作 者', '著者', '作者单位', 'author', 'authors', 'written by', 'tác giả'],
    journal: ['期刊', '来源', '文献来源', '出处', '刊名', 'journal', 'source', 'published in', 'tạp chí', 'nguồn'],
    year: ['年份', '出版年', '发表时间', '出版日期', 'year', 'publication year', 'published', 'năm', 'năm xuất bản'],
    volume: ['卷', '卷期', 'volume', 'vol', 'vol.', 'tập'],
    issue: ['期', 'issue', 'no', 'no.', 'number', 'số'],
    pages: ['页码', '页', 'pages', 'page', 'pp', 'pp.', 'trang'],
    keywords: ['关键词', '关键字', 'keywords', 'key words', 'từ khoá', 'từ khóa'],
    doi: ['doi'],
  };

  // Loại phần tử KHÔNG thể là nhãn trích dẫn thật — cờ phát hiện thật trên chimedis.vn khi tự
  // test (2026-09-19): trang có <option>Tác giả</option>/<label>Tạp chí</label> trong bộ lọc
  // tìm kiếm (dropdown "sắp xếp theo") + <div class="doc-type">Tạp chí</div> badge phân loại
  // — TRÙNG chữ với nhãn trích dẫn thật nhưng là điều khiển UI/badge phân loại, không phải mô
  // tả bài báo đang xem. Loại theo tên thẻ (form control) + theo tổ tiên gần (nav/header/
  // footer/form hoặc class gợi ý menu/badge/bộ lọc/phân loại).
  // H1-H6 loại luôn — tiêu đề mục (vd "<h3>Tạp chí</h3>" mở đầu 1 khu vực danh sách trên
  // trang chủ) trùng chữ với nhãn trích dẫn thật nhưng KHÔNG phải nhãn mô tả bài đang xem;
  // nhãn trích dẫn thật hầu như không bao giờ nằm trong thẻ heading.
  var EXCLUDE_LABEL_TAGS = /^(OPTION|SELECT|LABEL|BUTTON|INPUT|A|H1|H2|H3|H4|H5|H6)$/;
  var EXCLUDE_ANCESTOR_RE = /nav|header|footer|menu|badge|filter|category|doc-type|dropdown|breadcrumb/i;
  function isExcludedLabelEl(el) {
    if (EXCLUDE_LABEL_TAGS.test(el.tagName)) return true;
    var cur = el;
    for (var d = 0; d < 5 && cur && cur !== document.body; d++) {
      var tag = cur.tagName;
      if (tag === 'NAV' || tag === 'HEADER' || tag === 'FOOTER' || tag === 'FORM') return true;
      if (EXCLUDE_ANCESTOR_RE.test((cur.className && cur.className.toString ? cur.className.toString() : '') + ' ' + (cur.id || ''))) return true;
      cur = cur.parentElement;
    }
    return false;
  }
  // Quét nhãn đứng riêng (1 phần tử "lá" mà TOÀN BỘ chữ chỉ là cái nhãn, vd "摘要" hoặc
  // "Author:") rồi lấy văn bản của phần tử anh em kế tiếp hoặc phần tử cha (sau khi bỏ nhãn).
  // Dùng CHUNG cho mọi trường — thay vì viết riêng 1 hàm cho từng trường như bản cũ.
  function findByLabelWords(words, maxLen) {
    var alt = words.map(escRe).join('|');
    var labelRe = new RegExp('^(' + alt + ')\\s*[:：]?\\s*$', 'i');
    var prefixRe = new RegExp('^(' + alt + ')\\s*[:：]\\s*', 'i');
    var all = document.body.querySelectorAll('*');
    var limit = Math.min(all.length, 4000);
    for (var i = 0; i < limit; i++) {
      var el = all[i];
      if (el.children.length > 2) continue;
      var t = visibleText(el);
      if (!t || t.length > 24 || !labelRe.test(t)) continue;
      if (isExcludedLabelEl(el)) continue;
      var sib = el.nextElementSibling;
      if (sib && !EXCLUDE_LABEL_TAGS.test(sib.tagName)) {
        var sTxt = visibleText(sib);
        if (sTxt.length > 0 && sTxt.length < (maxLen || 8000)) return sTxt;
      }
      var parent = el.parentElement;
      if (parent) {
        var pTxt = visibleText(parent).replace(prefixRe, '');
        if (pTxt.length > 0 && pTxt.length < (maxLen || 8000) && pTxt !== t) return pTxt;
      }
    }
    return '';
  }

  // ===== Tóm tắt (abstract) — quan trọng cho Gap Analysis (M4), KHÔNG được bỏ sót/rút gọn
  // âm thầm. KHÔNG bao giờ dùng <meta name="description"> (chỉ là câu SEO ngắn, không phải
  // abstract thật). =====
  var KNOWN_ABSTRACT_SELECTORS = [
    '#ChDivSummary', '.abstract-text', '.brief', '.summary-content',
    '#abstract', '.Abstract', '.abstract', 'section.abstract', 'div.abstract',
    '[class*="abstract" i]', '[id*="abstract" i]',
  ];
  function findAbstractBySelectors() {
    for (var i = 0; i < KNOWN_ABSTRACT_SELECTORS.length; i++) {
      var els;
      try { els = document.querySelectorAll(KNOWN_ABSTRACT_SELECTORS[i]); } catch (e) { continue; }
      for (var j = 0; j < els.length; j++) {
        var txt = visibleText(els[j]);
        if (txt.length > 40 && txt.length < 8000) return txt;
      }
    }
    return '';
  }
  function findAbstract() {
    return meta1('citation_abstract') || meta1('dc.description') ||
      findAbstractBySelectors() || findByLabelWords(LABEL_WORDS.abstract, 8000) || '';
  }

  // ===== Tác giả — CNKI/万方 không phát hành meta chuẩn, nhưng tên tác giả thường hiển thị
  // bằng link riêng ngay dưới tiêu đề (mỗi tác giả 1 thẻ <a>). =====
  var AUTHOR_SELECTORS = [
    '.author a', '.authors a', '#authorpart a', '.author-name', '[class*="author" i] a', '[id*="author" i] a',
    '.c-article-author-list a', '.contrib-author', '.authorName', '.auth-name', '.artical-info .author',
  ];
  // CNKI thường làm CẢ tên đơn vị công tác thành link giống hệt tên tác giả (bấm vào để tìm
  // bài khác cùng đơn vị) — cùng selector `.author a` khớp trúng cả 2 loại, dính chung vào 1
  // danh sách (lỗi thật user gặp 2026-09-19: "吴晨辉1, ... 1.山西中医药大学, 2.山西省中医院").
  // Loại bỏ: (a) bắt đầu bằng "số.đơn vị" (kiểu đánh số chú thích đơn vị chuẩn CNKI/万方),
  // (b) chứa từ khoá cơ quan/tổ chức (đại học/viện/bệnh viện...). Đồng thời cắt số thứ tự chú
  // thích dính liền cuối tên tác giả thật (vd "吴晨辉1" → "吴晨辉").
  var AFFILIATION_RE = /^\d+\s*[.、．]|(大学|学院|医院|研究所|研究院|中心|集团|科室|University|College|Hospital|Institute|Department)/i;
  function stripAuthorSuffix(t) { return t.replace(/[\d,;，；、\s]+$/, '').trim(); }
  function findAuthorsFromDom() {
    for (var i = 0; i < AUTHOR_SELECTORS.length; i++) {
      var els;
      try { els = document.querySelectorAll(AUTHOR_SELECTORS[i]); } catch (e) { continue; }
      if (!els.length) continue;
      var names = Array.prototype.map.call(els, function (el) { return stripAuthorSuffix(visibleText(el)); })
        .filter(function (t) { return t && t.length <= 40 && !AFFILIATION_RE.test(t); });
      if (names.length) return names;
    }
    return [];
  }
  function splitAuthors(s) {
    return s.split(/[;,，；、]/).map(function (x) { return stripAuthorSuffix(x); })
      .filter(function (t) { return t && !AFFILIATION_RE.test(t); });
  }

  // ===== Dòng trích dẫn gộp journal+year+volume+issue+pages — thử NHIỀU mẫu (đa dạng định
  // dạng), dừng ở mẫu đầu tiên khớp. Chỉ quét gần đầu trang (nhanh, ít khớp nhầm). =====
  var CITATION_LINE_PATTERNS = [
    // Kiểu Trung Quốc chuẩn CNKI/万方: "期刊名 . 年份,卷(期):页码"
    /([一-鿿A-Za-z][^\n.．]{1,60}?)\s*[.．]\s*(\d{4})\s*[,，]\s*(\d+)\s*[（(](\d+)[）)]\s*[:：]\s*([0-9]+(?:[\-–][0-9]+)?)/,
    // Kiểu Anh phổ biến: "Journal Name, Vol. 12, No. 3, pp. 45-52 (2026)" (mọi bộ phận có thể lẫn thứ tự)
    /([A-Za-z][^\n]{1,60}?),?\s*Vol\.?\s*(\d+),?\s*No\.?\s*(\d+),?\s*pp\.?\s*([0-9]+(?:[\-–][0-9]+)?)\D{0,10}(\d{4})/i,
  ];
  function findCitationLine() {
    var text = document.body.innerText.slice(0, 4000);
    var m = text.match(CITATION_LINE_PATTERNS[0]);
    if (m) return { journal: m[1].replace(/\s+/g, '').trim(), year: parseInt(m[2], 10), volume: m[3], issue: m[4], pages: m[5] };
    m = text.match(CITATION_LINE_PATTERNS[1]);
    if (m) return { journal: m[1].trim(), volume: m[2], issue: m[3], pages: m[4], year: parseInt(m[5], 10) };
    return null;
  }

  function extractRecord() {
    var title = meta1('citation_title') || meta1('dc.title') || document.title || '';
    var authorsRaw = metaAll('citation_author');
    if (!authorsRaw.length) {
      var a = meta1('citation_authors') || meta1('dc.creator');
      if (a) authorsRaw = splitAuthors(a);
    }
    if (!authorsRaw.length) authorsRaw = findAuthorsFromDom();
    if (!authorsRaw.length) {
      var labelAuthors = findByLabelWords(LABEL_WORDS.authors, 300);
      if (labelAuthors) authorsRaw = splitAuthors(labelAuthors);
    }
    var journal = meta1('citation_journal_title') || meta1('citation_conference_title') || '';
    var dateStr = meta1('citation_publication_date') || meta1('citation_date') || meta1('citation_online_date') || '';
    var yearMatch = dateStr.match(/(19|20)\d{2}/);
    var year = yearMatch ? parseInt(yearMatch[0], 10) : null;
    var doi = meta1('citation_doi') || '';
    var pmid = meta1('citation_pmid') || '';
    var pmcid = meta1('citation_pmcid') || '';
    var volume = meta1('citation_volume') || '';
    var issue = meta1('citation_issue') || '';
    var firstPage = meta1('citation_firstpage') || '';
    var lastPage = meta1('citation_lastpage') || '';
    var pages = meta1('citation_pages') || (firstPage ? (lastPage ? firstPage + '-' + lastPage : firstPage) : '');
    if (!journal || !year || !volume || !issue || !pages) {
      var cite = findCitationLine();
      if (cite) {
        journal = journal || cite.journal;
        year = year || cite.year;
        volume = volume || cite.volume;
        issue = issue || cite.issue;
        pages = pages || cite.pages;
      }
    }
    // Tầng cuối — quét nhãn riêng lẻ cho từng phần còn thiếu (dòng trích dẫn gộp không khớp).
    if (!journal) journal = findByLabelWords(LABEL_WORDS.journal, 200);
    if (!year) {
      var yTxt = findByLabelWords(LABEL_WORDS.year, 60);
      var ym = yTxt && yTxt.match(/(19|20)\d{2}/);
      if (ym) year = parseInt(ym[0], 10);
    }
    if (!volume) volume = findByLabelWords(LABEL_WORDS.volume, 20);
    if (!issue) issue = findByLabelWords(LABEL_WORDS.issue, 20);
    if (!pages) pages = findByLabelWords(LABEL_WORDS.pages, 30);
    if (!doi) doi = findByLabelWords(LABEL_WORDS.doi, 100);
    // Ngôn ngữ: ưu tiên thẻ chuẩn/khai báo trang → suy đoán thô từ chữ Hán trong tiêu đề
    // (KHÔNG suy đoán tiếng Việt vì dấu câu dễ nhầm, để trống cho user tự sửa nếu cần).
    var language = meta1('citation_language') || meta1('dc.language') ||
      (document.documentElement.lang || '').split('-')[0] || '';
    if (!language && /[一-鿿]/.test(title)) language = 'zh';
    var keywordsRaw = metaAll('citation_keywords');
    var keywords = [];
    keywordsRaw.forEach(function (k) {
      k.split(/[;,]/).forEach(function (x) { if (x.trim()) keywords.push(x.trim()); });
    });
    if (!keywords.length) {
      var kwTxt = findByLabelWords(LABEL_WORDS.keywords, 300);
      if (kwTxt) keywords = kwTxt.split(/[;,，；、]/).map(function (x) { return x.trim(); }).filter(Boolean);
    }
    return {
      title: title.trim(),
      authors: authorsRaw.slice(0, 30),
      journal: (journal || '').trim() || null,
      year: year,
      volume: (volume || '').trim() || null,
      issue: (issue || '').trim() || null,
      pages: (pages || '').trim() || null,
      language: language.trim() || null,
      doi: (doi || '').trim() || null,
      pmid: pmid.trim() || null,
      pmcid: pmcid.trim() || null,
      abstract: findAbstract().trim() || null,
      keywords: keywords.slice(0, 20),
      landingUrl: location.href,
      source: 'manual',
    };
  }

  // =====================================================================================
  // ===== Giao diện popup: kéo-thả di chuyển, thu nhỏ thành icon, phóng to/thu nhỏ từ MỌI
  // cạnh (2026-09-19, theo yêu cầu user). host = khung định vị (position:fixed, left/top/
  // width/height); card = nội dung form lấp đầy host; 8 tay cầm resize quanh viền host. =====
  // =====================================================================================
  var DEFAULT_W = 400, DEFAULT_H = 480, MIN_W = 300, MIN_H = 260;
  var startLeft = Math.max(8, window.innerWidth - DEFAULT_W - 16);
  var startTop = Math.max(8, window.innerHeight - DEFAULT_H - 16);

  var host = document.createElement('div');
  host.id = 'chimedis-bk-host';
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;' +
    'left:' + startLeft + 'px;top:' + startTop + 'px;width:' + DEFAULT_W + 'px;height:' + DEFAULT_H + 'px;';
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var style = document.createElement('style');
  style.textContent =
    ':host{all:initial}' +
    '.bk-card{position:absolute;inset:0;display:flex;flex-direction:column;' +
    'font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;' +
    'background:#F5F0E6;color:#0E3A3A;border:1px solid #d8cfb8;border-radius:12px;' +
    'box-shadow:0 8px 28px rgba(0,0,0,.25);font-size:13px;line-height:1.45;box-sizing:border-box}' +
    '.bk-titlebar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;' +
    'padding:10px 8px 10px 14px;cursor:move;user-select:none;border-bottom:1px solid #e4dcc9}' +
    '.bk-title{font-weight:700;font-size:13px}' +
    '.bk-header-actions{display:flex;gap:2px}' +
    '.bk-icon-btn{background:none;border:none;font-size:15px;color:#6b6355;cursor:pointer;' +
    'width:24px;height:24px;border-radius:6px;line-height:1}' +
    '.bk-icon-btn:hover{background:rgba(0,0,0,.06);color:#241f19}' +
    '.bk-body{flex:1;overflow:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px;min-height:0}' +
    '.bk-field-row{display:flex;gap:8px}' +
    '.bk-field-row>div{flex:1;min-width:70px;display:flex;flex-direction:column;justify-content:flex-end}' +
    '.bk-lbl{font-size:11px;color:#6b6355;margin:0 0 3px;font-weight:600}' +
    '.bk-warn{font-size:11.5px;color:#8a5a00;background:#fbf0d6;border-radius:6px;padding:6px 8px}' +
    '.bk-row{display:flex;gap:8px}' +
    'input[type=text],textarea,select,button{font:inherit;border-radius:8px;border:1px solid #d8cfb8;padding:7px 9px;box-sizing:border-box}' +
    'input[type=text],textarea{width:100%;background:#fff;color:#241f19;resize:vertical}' +
    'textarea.bk-abstract-input{min-height:120px;flex:1}' +
    'select{flex:1;background:#fff;color:#0E3A3A}' +
    'button{cursor:pointer;background:#fff;color:#0E3A3A}' +
    'button.primary{background:#B4472B;color:#fff;border-color:#B4472B;font-weight:600}' +
    'button:disabled{opacity:.55;cursor:default}' +
    '.bk-status{font-size:12px}' +
    '.bk-status.err{color:#B4472B}' +
    '.bk-status.ok{color:#1e6b4f}' +
    // Danh sách xem trước bản ghi hàng loạt (2026-09-19) — mỗi bài 1 dòng có checkbox, cho
    // user tự bỏ chọn bớt trước khi lưu thay vì lưu mù toàn bộ trang xuất.
    '.bk-ref-list{display:flex;flex-direction:column;gap:2px;border:1px solid #e4dcc9;' +
    'border-radius:8px;padding:4px;max-height:100%;overflow:auto;flex:1;min-height:0;background:#fff}' +
    '.bk-ref-item{display:flex;gap:8px;padding:6px 7px;border-radius:6px;align-items:flex-start}' +
    '.bk-ref-item:hover{background:#f5f0e6}' +
    '.bk-ref-item input{margin-top:3px;flex:0 0 auto}' +
    '.bk-ref-title{font-weight:600;font-size:12.5px;line-height:1.35}' +
    '.bk-ref-meta{font-size:11px;color:#6b6355;margin-top:2px}' +
    '.bk-ref-toolbar{display:flex;justify-content:space-between;align-items:baseline;font-size:11.5px}' +
    '.bk-ref-toolbar a{color:#B4472B;cursor:pointer}' +
    // 8 tay cầm resize — 4 cạnh (dải mỏng dọc theo cạnh) + 4 góc (ô vuông nhỏ đè lên góc).
    '.bk-rz{position:absolute;z-index:2}' +
    '.bk-rz-n{top:-4px;left:8px;right:8px;height:8px;cursor:ns-resize}' +
    '.bk-rz-s{bottom:-4px;left:8px;right:8px;height:8px;cursor:ns-resize}' +
    '.bk-rz-e{right:-4px;top:8px;bottom:8px;width:8px;cursor:ew-resize}' +
    '.bk-rz-w{left:-4px;top:8px;bottom:8px;width:8px;cursor:ew-resize}' +
    '.bk-rz-ne{top:-4px;right:-4px;width:14px;height:14px;cursor:nesw-resize}' +
    '.bk-rz-nw{top:-4px;left:-4px;width:14px;height:14px;cursor:nwse-resize}' +
    '.bk-rz-se{bottom:-4px;right:-4px;width:14px;height:14px;cursor:nwse-resize}' +
    '.bk-rz-sw{bottom:-4px;left:-4px;width:14px;height:14px;cursor:nesw-resize}' +
    '.bk-mini{position:absolute;inset:0;border-radius:50%;background:#fff;' +
    'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
    'box-shadow:0 6px 18px rgba(0,0,0,.3);padding:8px;box-sizing:border-box}' +
    '.bk-mini img{width:100%;height:100%;object-fit:contain}' +
    '.bk-mini:hover{background:#9A3A22}' +
    // [hidden] mặc định display:none là quy tắc UA stylesheet — bị chính .bk-card/.bk-mini
    // display:flex phía trên (author stylesheet) đè mất do gốc author LUÔN thắng gốc UA bất
    // kể thứ tự/độ đặc hiệu (lỗi thật đã gặp: minimize()/restore() set .hidden nhưng phần tử
    // vẫn hiện, 2 lớp chồng lên nhau — cùng loại lỗi đã sửa ở tai-khoan.html .modal-body[hidden]
    // hôm 2026-09-19). Khai lại tường minh, chỉ trong phạm vi shadow DOM này.
    '.bk-card[hidden],.bk-mini[hidden]{display:none}';
  root.appendChild(style);

  var card = document.createElement('div');
  card.className = 'bk-card';
  root.appendChild(card);
  var mini = document.createElement('div');
  mini.className = 'bk-mini';
  mini.title = 'Mở lại — Lưu vào Chimedis';
  mini.innerHTML = '<img src="https://chimedis.vn/assets/logo.png" alt="Chimedis" />';
  mini.hidden = true;
  root.appendChild(mini);

  function close() {
    host.remove();
    window.__chimedisBookmarkletActive = false;
  }
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ===== Thu nhỏ thành icon tròn (2026-09-19) — vị trí góc dưới-phải của khung trước khi
  // thu nhỏ được giữ nguyên (host chỉ co lại 44x44, neo theo góc đó) để không "nhảy" chỗ. =====
  var savedRect = null;
  function minimize() {
    var r = { left: parseFloat(host.style.left), top: parseFloat(host.style.top), width: host.offsetWidth, height: host.offsetHeight };
    savedRect = r;
    host.style.left = (r.left + r.width - 44) + 'px';
    host.style.top = (r.top + r.height - 44) + 'px';
    host.style.width = '44px';
    host.style.height = '44px';
    card.hidden = true;
    mini.hidden = false;
  }
  function restore() {
    if (savedRect) {
      host.style.left = savedRect.left + 'px';
      host.style.top = savedRect.top + 'px';
      host.style.width = savedRect.width + 'px';
      host.style.height = savedRect.height + 'px';
    }
    card.hidden = false;
    mini.hidden = true;
  }
  mini.addEventListener('click', restore);

  // ===== Kéo-thả di chuyển (titlebar) =====
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function makeDraggable(handleEl) {
    handleEl.addEventListener('mousedown', function (e) {
      if (e.target.closest('button')) return;
      e.preventDefault();
      var startX = e.clientX, startY = e.clientY;
      var baseLeft = parseFloat(host.style.left), baseTop = parseFloat(host.style.top);
      function onMove(ev) {
        var nx = clamp(baseLeft + (ev.clientX - startX), -host.offsetWidth + 60, window.innerWidth - 60);
        var ny = clamp(baseTop + (ev.clientY - startY), 0, window.innerHeight - 40);
        host.style.left = nx + 'px';
        host.style.top = ny + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ===== Phóng to/thu nhỏ từ MỌI cạnh (2026-09-19) — 8 hướng, không chỉ góc dưới-phải. =====
  function makeResizable(handleEl, dir) {
    handleEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var startX = e.clientX, startY = e.clientY;
      var baseLeft = parseFloat(host.style.left), baseTop = parseFloat(host.style.top);
      var baseW = host.offsetWidth, baseH = host.offsetHeight;
      function onMove(ev) {
        var dx = ev.clientX - startX, dy = ev.clientY - startY;
        var newLeft = baseLeft, newTop = baseTop, newW = baseW, newH = baseH;
        if (dir.indexOf('e') >= 0) newW = clamp(baseW + dx, MIN_W, window.innerWidth);
        if (dir.indexOf('s') >= 0) newH = clamp(baseH + dy, MIN_H, window.innerHeight);
        if (dir.indexOf('w') >= 0) { newW = clamp(baseW - dx, MIN_W, window.innerWidth); newLeft = baseLeft + (baseW - newW); }
        if (dir.indexOf('n') >= 0) { newH = clamp(baseH - dy, MIN_H, window.innerHeight); newTop = baseTop + (baseH - newH); }
        host.style.left = newLeft + 'px';
        host.style.top = newTop + 'px';
        host.style.width = newW + 'px';
        host.style.height = newH + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }
  ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(function (dir) {
    var h = document.createElement('div');
    h.className = 'bk-rz bk-rz-' + dir;
    card.appendChild(h);
    makeResizable(h, dir);
  });

  if (!TOKEN) {
    renderError('Thiếu token cá nhân trong link bookmarklet. Vào trang Tài khoản trên chimedis.vn để lấy lại link bookmarklet đúng.');
    return;
  }

  function renderError(msg) {
    var body = document.createElement('div');
    body.className = 'bk-body';
    body.innerHTML = '<div class="bk-status err">' + escHtml(msg) + '</div>';
    mountTitlebar();
    card.appendChild(body);
  }
  function mountTitlebar() {
    var bar = document.createElement('div');
    bar.className = 'bk-titlebar';
    bar.innerHTML = '<span class="bk-title">Lưu vào Chimedis</span>' +
      '<span class="bk-header-actions">' +
      '<button type="button" class="bk-icon-btn bk-min" title="Thu nhỏ">–</button>' +
      '<button type="button" class="bk-icon-btn bk-close" title="Đóng">×</button>' +
      '</span>';
    card.appendChild(bar);
    makeDraggable(bar);
    bar.querySelector('.bk-close').onclick = close;
    bar.querySelector('.bk-min').onclick = minimize;
  }

  // "Quét thông minh tuỳ trang" — nhiều trang (kể cả CNKI) ẩn tóm tắt/nội dung sau nút
  // "展开全部"/"显示全部"/"阅读全文"/"Show more"/"Read more" cho tới khi bấm. Tự dò và bấm các
  // nút khớp mẫu TRƯỚC khi trích — đa số trường hợp đây chỉ là CSS ẩn/hiện nên áp dụng ngay
  // lập tức; đợi thêm 1 nhịp ngắn để phủ luôn trường hợp hiếm hơn là tải thêm qua AJAX.
  function tryAutoExpand() {
    var re = /^(展开|展开全部|显示全部|显示更多|阅读全文|查看全文|更多|全文|show more|read more|view full text|expand|more)$/i;
    var nodes = document.querySelectorAll('button, a, span, div');
    var clicked = 0;
    for (var i = 0; i < nodes.length && clicked < 4; i++) {
      var el = nodes[i];
      if (el.children.length > 1) continue;
      var txt = (el.textContent || '').trim();
      if (txt.length > 12 || !re.test(txt)) continue;
      try { el.click(); clicked++; } catch (e) { /* bỏ qua phần tử không click được */ }
    }
    return clicked;
  }
  // ===== Nhận diện trang "xuất hàng loạt" (2026-09-19) — CNKI/万方 có nút xuất riêng
  // ("导出与分析 → 导出文献") render NGAY trên trang thành text NoteExpress/BibTex/EndNote
  // (không phải file tải xuống) khi user tự tick chọn nhiều bài rồi tự bấm xuất — bookmarklet
  // CHỈ đọc text đã hiện sẵn trên trang đó, không tự động hoá bước tìm/chọn/xuất nào của CNKI.
  // Đếm số khối "[Reference Type]:"/"{Reference Type}:" xuất hiện — field luôn có mặt ở đầu
  // MỖI bản ghi trong cả 2 kiểu dấu ngoặc, dùng làm tín hiệu đáng tin để phân biệt với trang 1
  // bài đơn lẻ (đếm được đúng số bản ghi luôn, không chỉ có/không).
  function countReferenceBlocks(text) {
    var m = text.match(/[{[]\s*Reference Type\s*[}\]]\s*:/gi);
    return m ? m.length : 0;
  }

  var pageText = document.body.innerText || '';
  var refBlockCount = countReferenceBlocks(pageText);
  if (refBlockCount >= 2) {
    renderBulkImport(pageText, refBlockCount);
  } else {
    singleArticleFlow();
  }

  function singleArticleFlow() {
    var expandClicks = tryAutoExpand();
    function proceed() {
      var rec = extractRecord();
      if (!rec.title) {
        renderError('Không đọc được tiêu đề bài viết trên trang này. Mở đúng trang chi tiết 1 bài báo rồi thử lại.');
        return;
      }
      renderForm(rec);
    }
    if (expandClicks > 0) { setTimeout(proceed, 250); } else { proceed(); }
  }

  // ===== Nhập hàng loạt từ trang xuất CNKI/万方 (2026-09-19, xem trước + bỏ chọn bớt theo yêu
  // cầu user — trước đó lưu thẳng, giờ hiện danh sách đã đọc được để user tự bỏ bài không cần
  // TRƯỚC khi lưu, không lưu mù toàn bộ trang xuất). 2 bước: (1) /parse chỉ đọc, không lưu, trả
  // về danh sách bản ghi; (2) user tick bỏ bớt rồi mới /import đúng các bản ghi còn chọn. =====
  function renderBulkImport(text, count) {
    mountTitlebar();
    var body = document.createElement('div');
    body.className = 'bk-body';
    body.style.overflow = 'hidden';
    body.innerHTML =
      '<div class="bk-status">Phát hiện trang xuất hàng loạt — đang đọc khoảng <b>' + count + '</b> bản ghi…</div>';
    card.appendChild(body);
    var loadingEl = body.querySelector('.bk-status');

    fetch(API_BASE + '/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
      body: JSON.stringify({ format: 'ris', text: text }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.success) throw new Error(d.error || 'Lỗi khi đọc nội dung');
        if (!d.records.length) throw new Error('Không đọc được bản ghi nào trên trang này');
        renderBulkChecklist(d.records);
      })
      .catch(function (err) {
        loadingEl.textContent = err.message;
        loadingEl.className = 'bk-status err';
      });

    function renderBulkChecklist(records) {
      body.innerHTML =
        '<div class="bk-ref-toolbar"><span>Tìm thấy <b>' + records.length + '</b> bản ghi — bỏ tick bài không cần:</span>' +
        '<a class="bk-select-none">Bỏ chọn tất cả</a></div>' +
        '<div class="bk-ref-list"></div>' +
        '<div><div class="bk-lbl">Nhập vào dự án</div><select class="bk-project"><option value="">Đang tải danh sách dự án…</option></select></div>' +
        '<div class="bk-row">' +
        '<button class="bk-import primary" disabled>Lưu bài đã chọn</button>' +
        '<button class="bk-cancel">Huỷ</button>' +
        '</div>' +
        '<div class="bk-status"></div>';
      var listEl = body.querySelector('.bk-ref-list');
      records.forEach(function (rec, i) {
        var row = document.createElement('label');
        row.className = 'bk-ref-item';
        var meta = [rec.authors && rec.authors.length ? rec.authors.slice(0, 3).join(', ') + (rec.authors.length > 3 ? ' và cộng sự' : '') : '', [rec.journal, rec.year].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
        row.innerHTML = '<input type="checkbox" data-idx="' + i + '" checked />' +
          '<span><div class="bk-ref-title">' + escHtml(rec.title || '(không có tiêu đề)') + '</div>' +
          (meta ? '<div class="bk-ref-meta">' + escHtml(meta) + '</div>' : '') + '</span>';
        listEl.appendChild(row);
      });

      var toggleAllEl = body.querySelector('.bk-select-none');
      var allChecked = true;
      toggleAllEl.onclick = function () {
        allChecked = !allChecked;
        toggleAllEl.textContent = allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả';
        Array.prototype.forEach.call(listEl.querySelectorAll('input[type=checkbox]'), function (cb) { cb.checked = allChecked; });
      };

      body.querySelector('.bk-cancel').onclick = close;
      var statusEl = body.querySelector('.bk-status');
      var selectEl = body.querySelector('.bk-project');
      var importBtn = body.querySelector('.bk-import');

      fetch(API_BASE + '/projects', { headers: { Authorization: 'Bearer ' + TOKEN } })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.success) throw new Error(d.error || 'Lỗi tải danh sách dự án');
          if (!d.projects.length) {
            selectEl.innerHTML = '<option value="">(chưa có dự án — tạo trong Chimedis trước)</option>';
            return;
          }
          selectEl.innerHTML = d.projects.map(function (p) {
            return '<option value="' + p.id + '">' + escHtml(p.title) + '</option>';
          }).join('');
          importBtn.disabled = false;
        })
        .catch(function (err) {
          statusEl.textContent = 'Không tải được danh sách dự án: ' + err.message;
          statusEl.className = 'bk-status err';
        });

      importBtn.onclick = function () {
        var projectId = selectEl.value;
        if (!projectId) return;
        var selected = [];
        Array.prototype.forEach.call(listEl.querySelectorAll('input[type=checkbox]:checked'), function (cb) {
          selected.push(records[parseInt(cb.getAttribute('data-idx'), 10)]);
        });
        if (!selected.length) { statusEl.textContent = 'Chưa chọn bài nào.'; statusEl.className = 'bk-status err'; return; }
        importBtn.disabled = true;
        statusEl.textContent = 'Đang lưu ' + selected.length + ' bản ghi…';
        statusEl.className = 'bk-status';
        fetch(API_BASE + '/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
          body: JSON.stringify({ projectId: projectId, records: selected }),
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d.success) throw new Error(d.error || 'Lỗi khi lưu');
            statusEl.textContent = 'Đã lưu ' + d.imported + '/' + d.total + ' bản ghi' + (d.skipped ? ' (bỏ qua ' + d.skipped + ')' : '') + ' ✓';
            statusEl.className = 'bk-status ok';
            setTimeout(close, 2400);
          })
          .catch(function (err) {
            statusEl.textContent = err.message;
            statusEl.className = 'bk-status err';
            importBtn.disabled = false;
          });
      };
    }
  }

  function renderForm(rec) {
    mountTitlebar();
    var body = document.createElement('div');
    body.className = 'bk-body';
    var authorsJoined = rec.authors.join(', ');
    body.innerHTML =
      '<div><div class="bk-lbl">Tiêu đề</div><input type="text" class="bk-title-input" value="' + escHtml(rec.title) + '" /></div>' +
      '<div><div class="bk-lbl">Tác giả (cách nhau bằng dấu phẩy)</div><input type="text" class="bk-authors-input" value="' + escHtml(authorsJoined) + '" placeholder="Chưa rõ — gõ tay nếu cần" /></div>' +
      '<div class="bk-field-row">' +
      '<div style="flex:2"><div class="bk-lbl">Tạp chí</div><input type="text" class="bk-journal-input" value="' + escHtml(rec.journal || '') + '" /></div>' +
      '<div><div class="bk-lbl">Năm</div><input type="text" class="bk-year-input" value="' + escHtml(rec.year || '') + '" /></div>' +
      '</div>' +
      '<div class="bk-field-row">' +
      '<div><div class="bk-lbl">Tập</div><input type="text" class="bk-volume-input" value="' + escHtml(rec.volume || '') + '" /></div>' +
      '<div><div class="bk-lbl">Số</div><input type="text" class="bk-issue-input" value="' + escHtml(rec.issue || '') + '" /></div>' +
      '<div style="flex:1.4"><div class="bk-lbl">Trang</div><input type="text" class="bk-pages-input" value="' + escHtml(rec.pages || '') + '" placeholder="vd 45-52" /></div>' +
      '</div>' +
      '<div><div class="bk-lbl">DOI (nếu có)</div><input type="text" class="bk-doi-input" value="' + escHtml(rec.doi || '') + '" placeholder="vd 10.1234/xxxx" /></div>' +
      // Luôn lưu kèm link trang gốc (dù không thấy DOI/không hiển thị ở đây) để sau này mở
      // lại xem đúng bài — hiện rõ ra đây để user biết chắc hệ thống có ghi lại (2026-09-19,
      // user hỏi thẳng "có lưu đường link không").
      '<p class="bk-source-link" style="margin:0;font-size:11px;color:#6b6355">Nguồn: <a href="' + escHtml(rec.landingUrl) + '" target="_blank" rel="noopener" style="color:#B4472B">' + escHtml(rec.landingUrl.length > 60 ? rec.landingUrl.slice(0, 60) + '…' : rec.landingUrl) + '</a></p>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline">' +
      '<div class="bk-lbl" style="margin:0">Tóm tắt (abstract)</div>' +
      '<a href="#" class="bk-refetch" style="font-size:11px">↻ Trích lại từ trang</a>' +
      '</div>' +
      '<textarea class="bk-abstract-input" placeholder="Không tự đọc được — bôi-copy đoạn tóm tắt trên trang rồi dán vào đây (không bắt buộc, nhưng cần cho phân tích khoảng trống sau này)">' + escHtml(rec.abstract || '') + '</textarea>' +
      '<div class="bk-warn bk-abstract-warn"' + (rec.abstract ? ' hidden' : '') + '>⚠️ Không tự đọc được tóm tắt trên trang này. Nếu trang có nút "展开/显示全部/Show more" hãy tự bấm mở rồi bấm "↻ Trích lại từ trang" — hoặc bôi-copy tay đoạn tóm tắt rồi dán vào ô trên.</div>' +
      '<div><div class="bk-lbl">Lưu vào dự án</div><select class="bk-project"><option value="">Đang tải danh sách dự án…</option></select></div>' +
      '<div class="bk-row">' +
      '<button class="bk-save primary" disabled>Lưu</button>' +
      '<button class="bk-cancel">Huỷ</button>' +
      '</div>' +
      '<div class="bk-status"></div>';
    card.appendChild(body);

    body.querySelector('.bk-cancel').onclick = close;
    var statusEl = body.querySelector('.bk-status');
    var selectEl = body.querySelector('.bk-project');
    var saveBtn = body.querySelector('.bk-save');
    var titleInput = body.querySelector('.bk-title-input');
    var abstractInput = body.querySelector('.bk-abstract-input');
    var abstractWarnEl = body.querySelector('.bk-abstract-warn');
    var authorsInput = body.querySelector('.bk-authors-input');
    var journalInput = body.querySelector('.bk-journal-input');
    var yearInput = body.querySelector('.bk-year-input');
    var volumeInput = body.querySelector('.bk-volume-input');
    var issueInput = body.querySelector('.bk-issue-input');
    var pagesInput = body.querySelector('.bk-pages-input');
    var doiInput = body.querySelector('.bk-doi-input');
    // "Trích lại từ trang" — sau khi user tự bấm mở rộng nội dung trên trang gốc, quét lại
    // DUY NHẤT phần tóm tắt mà không mất các trường khác đã sửa tay.
    body.querySelector('.bk-refetch').onclick = function (e) {
      e.preventDefault();
      var fresh = findAbstract().trim();
      if (fresh) { abstractInput.value = fresh; abstractWarnEl.hidden = true; }
      else { abstractWarnEl.hidden = false; }
    };

    fetch(API_BASE + '/projects', { headers: { Authorization: 'Bearer ' + TOKEN } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.success) throw new Error(d.error || 'Lỗi tải danh sách dự án');
        if (!d.projects.length) {
          selectEl.innerHTML = '<option value="">(chưa có dự án — tạo trong Chimedis trước)</option>';
          return;
        }
        selectEl.innerHTML = d.projects.map(function (p) {
          return '<option value="' + p.id + '">' + escHtml(p.title) + '</option>';
        }).join('');
        saveBtn.disabled = false;
      })
      .catch(function (err) {
        statusEl.textContent = 'Không tải được danh sách dự án: ' + err.message;
        statusEl.className = 'bk-status err';
      });

    saveBtn.onclick = function () {
      var projectId = selectEl.value;
      if (!projectId) return;
      var title = titleInput.value.trim();
      if (!title) { titleInput.focus(); return; }
      rec.title = title;
      rec.abstract = abstractInput.value.trim() || null;
      rec.authors = authorsInput.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      rec.journal = journalInput.value.trim() || null;
      var yearVal = parseInt(yearInput.value, 10);
      rec.year = Number.isFinite(yearVal) ? yearVal : null;
      rec.volume = volumeInput.value.trim() || null;
      rec.issue = issueInput.value.trim() || null;
      rec.pages = pagesInput.value.trim() || null;
      rec.doi = doiInput.value.trim() || null;
      saveBtn.disabled = true;
      statusEl.textContent = 'Đang lưu…';
      statusEl.className = 'bk-status';
      fetch(API_BASE + '/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
        body: JSON.stringify({ projectId: projectId, record: rec }),
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.success) throw new Error(d.error || 'Lỗi khi lưu');
          statusEl.textContent = 'Đã lưu vào thư viện ✓';
          statusEl.className = 'bk-status ok';
          setTimeout(close, 1800);
        })
        .catch(function (err) {
          statusEl.textContent = err.message;
          statusEl.className = 'bk-status err';
          saveBtn.disabled = false;
        });
    };
  }
})();
