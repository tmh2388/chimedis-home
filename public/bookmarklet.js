// M9 — "Lưu vào Chimedis" bookmarklet loader (2026-09-18).
// Được nạp bằng bookmarklet cực ngắn: javascript:(function(){var s=document.createElement
// ('script');s.src='https://chimedis.vn/bookmarklet.js?t=TOKEN&r='+Date.now();document.body
// .appendChild(s);})() — logic thật sống ở đây (file tĩnh) để có thể sửa/cải thiện về sau mà
// KHÔNG cần user cài lại bookmarklet. Token cá nhân đọc từ query string của chính thẻ
// <script> này (id `chimedis-bk-loader`).
//
// Chạy TRÊN DOM của trang bên ngoài (CNKI/万方/tạp chí bất kỳ) — dùng Shadow DOM để cô lập
// hoàn toàn CSS, tránh xung đột với style của trang chủ.
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
    var abstract = meta1('citation_abstract') || meta1('dc.description') || meta1('description') || '';
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
      abstract: abstract.trim() || null,
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
    '.bk-card{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;width:320px;' +
    'background:#F5F0E6;color:#0E3A3A;border:1px solid #d8cfb8;border-radius:12px;' +
    'box-shadow:0 8px 28px rgba(0,0,0,.25);padding:16px;font-size:13px;line-height:1.45}' +
    '.bk-title{font-weight:700;font-size:13px;margin-bottom:6px}' +
    '.bk-field{max-height:64px;overflow:auto;margin-bottom:8px;color:#2b2b2b}' +
    '.bk-meta{color:#6b6355;font-size:12px;margin-bottom:10px}' +
    '.bk-row{display:flex;gap:8px;margin-top:10px}' +
    'select,button{font:inherit;border-radius:8px;border:1px solid #d8cfb8;padding:7px 9px}' +
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
    '<div class="bk-field"><b>' + escHtml(rec.title) + '</b></div>' +
    '<div class="bk-meta">' + escHtml(authorsPreview) + (rec.journal ? ' · ' + escHtml(rec.journal) : '') + (rec.year ? ' · ' + rec.year : '') + '</div>' +
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

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

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
