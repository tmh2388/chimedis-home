// M9 — "Lưu vào Chimedis" bookmarklet loader (2026-09-18).
// Được nạp bằng bookmarklet cực ngắn: javascript:(function(){var s=document.createElement
// ('script');s.src='https://chimedis.vn/bookmarklet.js?t=TOKEN&r='+Date.now();document.body
// .appendChild(s);})() — logic thật sống ở đây (file tĩnh) để có thể sửa/cải thiện về sau mà
// KHÔNG cần user cài lại bookmarklet. Token cá nhân đọc từ query string của chính thẻ
// <script> này (id `chimedis-bk-loader`).
//
// Chạy TRÊN DOM của trang bên ngoài (CNKI/万方/tạp chí bất kỳ) — dùng Shadow DOM để cô lập
// hoàn toàn CSS, tránh xung đột với style của trang chủ.
//
// TÓM TẮT (abstract) — quan trọng cho Gap Analysis (M4) nên KHÔNG được bỏ sót/rút gọn âm
// thầm. 3 tầng dò, ưu tiên trên xuống, mỗi tầng chỉ nhận nếu tầng trước rỗng:
//   1) <meta name="citation_abstract"> — chuẩn Highwire, hiếm site có (gần như chắc chắn
//      CNKI/万方 không phát hành thẻ này).
//   2) Quét DOM theo danh sách CSS selector đã biết của CNKI/万方 + tên lớp chung "abstract".
//   3) Quét DOM tìm nhãn "摘要"/"Abstract" đứng riêng rồi lấy phần văn bản theo sau.
// KHÔNG bao giờ dùng <meta name="description"> làm tóm tắt (thường chỉ là câu SEO ngắn,
// không phải abstract thật — im lặng dùng nhầm sẽ làm hỏng chất lượng Gap Map).
// Vì 2+3 là suy đoán dựa trên cấu trúc trang (dễ hỏng khi site đổi giao diện), ô tóm tắt
// trong overlay LUÔN cho sửa tay trước khi lưu — nếu dò rỗng hoặc sai, tự bôi-copy đoạn tóm
// tắt hiển thị trên trang rồi dán vào là chắc chắn nhất.
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
  var ABSTRACT_LABEL_RE = /^(摘\s*要|abstract)\s*[:：]?\s*$/i;
  var ABSTRACT_PREFIX_RE = /^(摘\s*要|abstract)\s*[:：]\s*/i;

  // Danh sách selector đã biết của CNKI/万方 + tên lớp/id chung "abstract" ở các tạp chí khác.
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
        var txt = visibleText(els[j]).replace(ABSTRACT_PREFIX_RE, '');
        if (txt.length > 40 && txt.length < 8000) return txt;
      }
    }
    return '';
  }
  // Quét toàn trang tìm 1 phần tử NHỎ (label) mà toàn bộ chữ chỉ là "摘要"/"Abstract", rồi
  // lấy văn bản của phần tử anh em kế tiếp hoặc phần tử cha (sau khi bỏ chính nhãn đó).
  // Giới hạn số phần tử quét để tránh chậm trên trang rất lớn.
  function findAbstractByLabel() {
    var all = document.body.querySelectorAll('*');
    var limit = Math.min(all.length, 6000);
    for (var i = 0; i < limit; i++) {
      var el = all[i];
      if (el.children.length > 2) continue;
      var t = visibleText(el);
      if (!t || t.length > 20 || !ABSTRACT_LABEL_RE.test(t)) continue;
      var sib = el.nextElementSibling;
      if (sib) {
        var sTxt = visibleText(sib);
        if (sTxt.length > 40 && sTxt.length < 8000) return sTxt;
      }
      var parent = el.parentElement;
      if (parent) {
        var pTxt = visibleText(parent).replace(ABSTRACT_PREFIX_RE, '');
        if (pTxt.length > 40 && pTxt.length < 8000) return pTxt;
      }
    }
    return '';
  }
  function findAbstract() {
    return meta1('citation_abstract') || meta1('dc.description') || findAbstractBySelectors() || findAbstractByLabel() || '';
  }

  // Tác giả — CNKI/万方 không phát hành meta chuẩn, nhưng tên tác giả LUÔN hiển thị bằng
  // link riêng ngay dưới tiêu đề (mỗi tác giả 1 thẻ <a>). Dò theo selector đã biết trước,
  // tên NGƯỜI THẬT do user tự đọc lại + sửa nếu cần (overlay luôn cho sửa tay).
  var AUTHOR_SELECTORS = ['.author a', '.authors a', '#authorpart a', '.author-name', '[class*="author" i] a', '[id*="author" i] a'];
  function findAuthorsFromDom() {
    for (var i = 0; i < AUTHOR_SELECTORS.length; i++) {
      var els;
      try { els = document.querySelectorAll(AUTHOR_SELECTORS[i]); } catch (e) { continue; }
      if (!els.length) continue;
      var names = Array.prototype.map.call(els, function (el) { return visibleText(el); })
        .filter(function (t) { return t && t.length <= 40; });
      if (names.length) return names;
    }
    return [];
  }
  // Dòng trích dẫn "Tên tạp chí . Năm ,Tập (Số) :Trang" — định dạng chuẩn hoá cao của học
  // thuật Trung Quốc (CNKI/万方 đều theo mẫu này), xuất hiện ngay trên/dưới tiêu đề. 1 regex
  // lấy được cả journal+year+volume+issue+pages cùng lúc, chỉ quét gần đầu trang (nhanh, ít
  // khả năng khớp nhầm đoạn văn khác). Chỉ dùng khi thiếu meta — luôn cho sửa tay sau đó.
  function findCitationLine() {
    var text = document.body.innerText.slice(0, 4000);
    var re = /([一-鿿A-Za-z][^\n.．]{1,60}?)\s*[.．]\s*(\d{4})\s*[,，]\s*(\d+)\s*[（(](\d+)[）)]\s*[:：]\s*([0-9]+(?:[\-–][0-9]+)?)/;
    var m = text.match(re);
    if (!m) return null;
    return { journal: m[1].replace(/\s+/g, '').trim(), year: parseInt(m[2], 10), volume: m[3], issue: m[4], pages: m[5] };
  }

  function extractRecord() {
    var title = meta1('citation_title') || meta1('dc.title') || document.title || '';
    var authorsRaw = metaAll('citation_author');
    if (!authorsRaw.length) {
      var a = meta1('citation_authors') || meta1('dc.creator');
      if (a) authorsRaw = a.split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean);
    }
    if (!authorsRaw.length) authorsRaw = findAuthorsFromDom();
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
    return {
      title: title.trim(),
      authors: authorsRaw.slice(0, 30),
      journal: journal.trim() || null,
      year: year,
      volume: volume.trim() || null,
      issue: issue.trim() || null,
      pages: pages.trim() || null,
      language: language.trim() || null,
      doi: doi.trim() || null,
      pmid: pmid.trim() || null,
      pmcid: pmcid.trim() || null,
      abstract: findAbstract().trim() || null,
      keywords: keywords.slice(0, 20),
      landingUrl: location.href,
      source: 'manual',
    };
  }

  var host = document.createElement('div');
  host.id = 'chimedis-bk-host';
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;right:16px;bottom:16px;';
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var style = document.createElement('style');
  style.textContent =
    ':host{all:initial}' +
    // resize:both — user kéo góc dưới-phải để phóng to/thu nhỏ khung tuỳ ý (yêu cầu
    // 2026-09-19). Neo phải/dưới nên phóng to sẽ nới về hướng trái/trên, đúng trực giác.
    // Mỗi field-group là flex-column + justify-end (không phải chỉ 2 div rời) để nhãn dài/
    // ngắn khác nhau KHÔNG làm ô nhập lệch hàng — đúng lỗi "đè vào nhau" user báo (cùng gốc
    // bug đã sửa ở workbench.html .row>div hôm 2026-09-18: label 1-2 dòng làm input tụt xuống
    // không thẳng hàng khi 2 ô cạnh nhau có nhãn khác độ dài).
    '.bk-card{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;' +
    'width:400px;min-width:300px;max-width:min(92vw,560px);' +
    'height:auto;min-height:340px;max-height:min(85vh,720px);resize:both;overflow:auto;' +
    'background:#F5F0E6;color:#0E3A3A;border:1px solid #d8cfb8;border-radius:12px;' +
    'box-shadow:0 8px 28px rgba(0,0,0,.25);padding:16px;font-size:13px;line-height:1.45;' +
    'display:flex;flex-direction:column;gap:10px;box-sizing:border-box}' +
    '.bk-title{font-weight:700;font-size:13px}' +
    '.bk-field-row{display:flex;gap:8px}' +
    '.bk-field-row>div{flex:1;min-width:70px;display:flex;flex-direction:column;justify-content:flex-end}' +
    '.bk-lbl{font-size:11px;color:#6b6355;margin:0 0 3px;font-weight:600}' +
    '.bk-meta{color:#6b6355;font-size:12px}' +
    '.bk-warn{font-size:11.5px;color:#8a5a00;background:#fbf0d6;border-radius:6px;padding:6px 8px}' +
    '.bk-row{display:flex;gap:8px}' +
    'input[type=text],textarea,select,button{font:inherit;border-radius:8px;border:1px solid #d8cfb8;padding:7px 9px;box-sizing:border-box}' +
    'input[type=text],textarea{width:100%;background:#fff;color:#241f19;resize:vertical}' +
    'textarea.bk-abstract-input{min-height:150px;flex:1}' +
    'select{flex:1;background:#fff;color:#0E3A3A}' +
    'button{cursor:pointer;background:#fff;color:#0E3A3A}' +
    'button.primary{background:#B4472B;color:#fff;border-color:#B4472B;font-weight:600}' +
    'button:disabled{opacity:.55;cursor:default}' +
    '.bk-status{font-size:12px}' +
    '.bk-status.err{color:#B4472B}' +
    '.bk-status.ok{color:#1e6b4f}' +
    '.bk-close{position:absolute;top:8px;right:10px;background:none;border:none;font-size:16px;' +
    'color:#6b6355;padding:0;width:20px;height:20px}';
  root.appendChild(style);

  var card = document.createElement('div');
  card.className = 'bk-card';
  card.style.position = 'relative';
  root.appendChild(card);

  function close() {
    host.remove();
    window.__chimedisBookmarkletActive = false;
  }
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  if (!TOKEN) {
    card.innerHTML =
      '<button class="bk-close">×</button>' +
      '<div class="bk-title">Chimedis — Lưu vào thư viện</div>' +
      '<div class="bk-status err">Thiếu token cá nhân trong link bookmarklet. Vào trang Tài khoản trên chimedis.vn để lấy lại link bookmarklet đúng.</div>';
    card.querySelector('.bk-close').onclick = close;
    return;
  }

  // "Quét thông minh tuỳ trang" (2026-09-19, theo yêu cầu user) — nhiều trang (kể cả CNKI)
  // ẩn phần tóm tắt/nội dung sau nút "展开全部"/"显示全部"/"阅读全文"/"Show more"/"Read more"
  // cho tới khi user bấm. Tự dò và bấm các nút khớp mẫu TRƯỚC khi trích — đa số trường hợp
  // đây chỉ là CSS ẩn/hiện nên áp dụng ngay lập tức, không cần chờ; đợi thêm 1 nhịp ngắn để
  // phủ luôn trường hợp hiếm hơn là nội dung tải thêm qua AJAX. Đây là suy đoán theo mẫu chữ
  // phổ biến — KHÔNG đảm bảo đúng mọi trang, vẫn còn nút "↻ Trích lại từ trang" + ô sửa tay
  // làm lưới an toàn cuối cùng.
  function tryAutoExpand() {
    var re = /^(展开|展开全部|显示全部|显示更多|阅读全文|查看全文|更多|全文|show more|read more|view full text|expand|more)$/i;
    var nodes = document.querySelectorAll('button, a, span, div');
    var clicked = 0;
    for (var i = 0; i < nodes.length && clicked < 4; i++) {
      var el = nodes[i];
      if (el.children.length > 1) continue; // chỉ nhắm phần tử "lá" (nút/link thật), bỏ container lớn
      var txt = (el.textContent || '').trim();
      if (txt.length > 12 || !re.test(txt)) continue;
      try { el.click(); clicked++; } catch (e) { /* bỏ qua phần tử không click được */ }
    }
    return clicked;
  }
  var expandClicks = tryAutoExpand();

  function proceed() {
    var rec = extractRecord();
    if (!rec.title) {
      card.innerHTML =
        '<button class="bk-close">×</button>' +
        '<div class="bk-title">Chimedis — Lưu vào thư viện</div>' +
        '<div class="bk-status err">Không đọc được tiêu đề bài viết trên trang này. Mở đúng trang chi tiết 1 bài báo rồi thử lại.</div>';
      card.querySelector('.bk-close').onclick = close;
      return;
    }
    renderForm(rec);
  }
  if (expandClicks > 0) { setTimeout(proceed, 250); } else { proceed(); }

  function renderForm(rec) {
  var authorsJoined = rec.authors.join(', ');
  card.innerHTML =
    '<button class="bk-close">×</button>' +
    '<div class="bk-title">Lưu vào Chimedis</div>' +
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

  card.querySelector('.bk-close').onclick = close;
  card.querySelector('.bk-cancel').onclick = close;
  var statusEl = card.querySelector('.bk-status');
  var selectEl = card.querySelector('.bk-project');
  var saveBtn = card.querySelector('.bk-save');
  var titleInput = card.querySelector('.bk-title-input');
  var abstractInput = card.querySelector('.bk-abstract-input');
  var abstractWarnEl = card.querySelector('.bk-abstract-warn');
  var authorsInput = card.querySelector('.bk-authors-input');
  var journalInput = card.querySelector('.bk-journal-input');
  var yearInput = card.querySelector('.bk-year-input');
  var volumeInput = card.querySelector('.bk-volume-input');
  var issueInput = card.querySelector('.bk-issue-input');
  var pagesInput = card.querySelector('.bk-pages-input');
  // "Trích lại từ trang" — sau khi user tự bấm mở rộng nội dung trên trang gốc (vd nút
  // "展开全部"/"Show more" mà bookmarklet không tự đoán hết được), quét lại DUY NHẤT phần
  // tóm tắt mà không mất các trường khác đã sửa tay (2026-09-19, theo yêu cầu user).
  card.querySelector('.bk-refetch').onclick = function (e) {
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
  } // end renderForm
})();
