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

  function extractRecord() {
    var title = meta1('citation_title') || meta1('dc.title') || document.title || '';
    var authorsRaw = metaAll('citation_author');
    if (!authorsRaw.length) {
      var a = meta1('citation_authors') || meta1('dc.creator');
      if (a) authorsRaw = a.split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean);
    }
    var journal = meta1('citation_journal_title') || meta1('citation_conference_title') || '';
    var dateStr = meta1('citation_publication_date') || meta1('citation_date') || meta1('citation_online_date') || '';
    var yearMatch = dateStr.match(/(19|20)\d{2}/);
    var year = yearMatch ? parseInt(yearMatch[0], 10) : null;
    var doi = meta1('citation_doi') || '';
    var pmid = meta1('citation_pmid') || '';
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
      doi: doi.trim() || null,
      pmid: pmid.trim() || null,
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
    '.bk-card{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;width:340px;' +
    'max-height:min(80vh,620px);overflow:auto;' +
    'background:#F5F0E6;color:#0E3A3A;border:1px solid #d8cfb8;border-radius:12px;' +
    'box-shadow:0 8px 28px rgba(0,0,0,.25);padding:16px;font-size:13px;line-height:1.45}' +
    '.bk-title{font-weight:700;font-size:13px;margin-bottom:8px}' +
    '.bk-lbl{font-size:11px;color:#6b6355;margin:8px 0 3px;font-weight:600}' +
    '.bk-meta{color:#6b6355;font-size:12px;margin-bottom:4px}' +
    '.bk-warn{font-size:11.5px;color:#8a5a00;background:#fbf0d6;border-radius:6px;padding:6px 8px;margin-top:4px}' +
    '.bk-row{display:flex;gap:8px;margin-top:10px}' +
    'input[type=text],textarea,select,button{font:inherit;border-radius:8px;border:1px solid #d8cfb8;padding:7px 9px}' +
    'input[type=text],textarea{width:100%;background:#fff;color:#241f19;resize:vertical}' +
    'textarea{min-height:80px}' +
    'select{flex:1;background:#fff;color:#0E3A3A}' +
    'button{cursor:pointer;background:#fff;color:#0E3A3A}' +
    'button.primary{background:#B4472B;color:#fff;border-color:#B4472B;font-weight:600}' +
    'button:disabled{opacity:.55;cursor:default}' +
    '.bk-status{margin-top:8px;font-size:12px}' +
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

  var rec = extractRecord();
  if (!rec.title) {
    card.innerHTML =
      '<button class="bk-close">×</button>' +
      '<div class="bk-title">Chimedis — Lưu vào thư viện</div>' +
      '<div class="bk-status err">Không đọc được tiêu đề bài viết trên trang này. Mở đúng trang chi tiết 1 bài báo rồi thử lại.</div>';
    card.querySelector('.bk-close').onclick = close;
    return;
  }

  var authorsPreview = rec.authors.length ? rec.authors.slice(0, 3).join(', ') + (rec.authors.length > 3 ? '…' : '') : '(chưa rõ tác giả)';
  card.innerHTML =
    '<button class="bk-close">×</button>' +
    '<div class="bk-title">Lưu vào Chimedis</div>' +
    '<div class="bk-lbl">Tiêu đề</div>' +
    '<input type="text" class="bk-title-input" value="' + escHtml(rec.title) + '" />' +
    '<div class="bk-meta" style="margin-top:6px">' + escHtml(authorsPreview) + (rec.journal ? ' · ' + escHtml(rec.journal) : '') + (rec.year ? ' · ' + rec.year : '') + '</div>' +
    '<div class="bk-lbl">Tóm tắt (abstract)</div>' +
    '<textarea class="bk-abstract-input" placeholder="Không tự đọc được — bôi-copy đoạn tóm tắt trên trang rồi dán vào đây (không bắt buộc, nhưng cần cho phân tích khoảng trống sau này)">' + escHtml(rec.abstract || '') + '</textarea>' +
    (rec.abstract ? '' : '<div class="bk-warn">⚠️ Không tự đọc được tóm tắt trên trang này — dán tay vào ô trên nếu muốn dùng cho phân tích khoảng trống sau này.</div>') +
    '<div class="bk-lbl">Lưu vào dự án</div>' +
    '<select class="bk-project"><option value="">Đang tải danh sách dự án…</option></select>' +
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
})();
