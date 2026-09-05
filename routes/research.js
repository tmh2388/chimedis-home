// API tìm kiếm y văn cho chimedis.vn — Giai đoạn 1: chỉ tìm kiếm + chuẩn hoá, KHÔNG LLM.
// Nguồn: OpenAlex + Europe PMC (miễn phí, không khoá). Xem lib/research-sources.js.
// Điểm khác biệt Chimedis: truy vấn tiếng Việt được dịch thuật ngữ YHCT sang tiếng Anh
// trước khi tra (lib/tcm-vocab.js).
//
//   GET  /api/research/search?q=...        — tìm đơn giản (1 ô)
//   POST /api/research/search  { q } hoặc { advanced: [{term,field,op}] } — tìm nâng cao

import { Router } from 'express';
import dns from 'node:dns/promises';
import { Readable } from 'node:stream';
import { searchAll, ADV_FIELDS, advancedToDisplay } from '../lib/research-sources.js';
import { buildSearchQuery } from '../lib/tcm-vocab.js';

const router = Router();

const VALID_SOURCES = ['openalex', 'europepmc', 'core', 'semanticscholar'];
const VALID_OPS = ['AND', 'OR', 'NOT'];
const VALID_DOCTYPES = ['systematic-review', 'rct', 'review', 'preprint'];
const VALID_SORTS = ['relevance', 'citations', 'citations_asc', 'newest', 'oldest'];
const MAX_PER_PAGE = 100;
const CUR_YEAR = new Date().getFullYear();
const MAX_ADV_ROWS = 8;
// Với các trường này, term được chạy qua từ điển YHCT để dịch sang tiếng Anh.
const EXPANDABLE_FIELDS = new Set(['title', 'abstract', 'keyword', 'fulltext']);

// Bộ nhớ đệm rất gọn trong RAM (TTL 10 phút) — tránh gọi lại API cho cùng truy vấn khi
// người dùng lật trang / đổi bộ lọc qua lại. Không thay cho cache thật sau này.
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 200;

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return hit.v;
}
function cacheSet(key, v) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { t: Date.now(), v });
}

// Đọc các bộ lọc chung từ query string (GET) hoặc body (POST).
function readFilters(src) {
  const page = Math.max(parseInt(src.page, 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(src.perPage, 10) || 20, 5), MAX_PER_PAGE);
  const sources = String(src.sources || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => VALID_SOURCES.includes(s));
  const yr = (v) => {
    const n = parseInt(v, 10);
    return n >= 1800 && n <= CUR_YEAR + 1 ? n : null;
  };
  let yearFrom = yr(src.yearFrom);
  let yearTo = yr(src.yearTo);
  if (yearFrom && yearTo && yearFrom > yearTo) [yearFrom, yearTo] = [yearTo, yearFrom];
  const truthy = (v) => v === '1' || v === 'true' || v === true;
  return {
    page,
    perPage,
    sources,
    yearFrom,
    yearTo,
    sort: VALID_SORTS.includes(src.sort) ? src.sort : 'relevance',
    openAccessOnly: truthy(src.openAccess),
    pubmedOnly: truthy(src.pubmedOnly),
    pmcOnly: truthy(src.pmcOnly),
    docType: VALID_DOCTYPES.includes(src.docType) ? src.docType : null,
  };
}

/**
 * Chuẩn hoá + kiểm tra mảng `advanced`. Trả { rows, expansion } hoặc ném lỗi (chuỗi).
 * Mỗi row: { term, field, op }. Dòng đầu op bị bỏ qua (luôn coi là gốc).
 */
function normalizeAdvanced(raw) {
  if (!Array.isArray(raw) || !raw.length) throw 'Danh sách điều kiện trống.';
  if (raw.length > MAX_ADV_ROWS) throw `Tối đa ${MAX_ADV_ROWS} điều kiện.`;
  const rows = [];
  const expandedFrom = [];
  const untranslated = [];
  for (const r of raw) {
    const term = String(r?.term || '').trim();
    if (!term) continue;
    if (term.length > 200) throw 'Một điều kiện quá dài.';
    const field = ADV_FIELDS.includes(r?.field) ? r.field : 'title';
    const op = VALID_OPS.includes(String(r?.op || '').toUpperCase()) ? String(r.op).toUpperCase() : 'AND';
    let effTerm = term;
    if (EXPANDABLE_FIELDS.has(field)) {
      const ex = buildSearchQuery(term);
      if (ex.expandedFrom.length) {
        effTerm = ex.text;
        expandedFrom.push(...ex.expandedFrom);
      }
      if (ex.untranslated?.length) untranslated.push(...ex.untranslated);
    }
    rows.push({ term: effTerm, field, op });
  }
  if (!rows.length) throw 'Chưa nhập từ khoá cho điều kiện nào.';
  return {
    rows,
    expansion: expandedFrom.length
      ? { terms: expandedFrom, note: 'Đã dịch thuật ngữ y khoa trong điều kiện sang tiếng Anh.' }
      : null,
    untranslated,
  };
}

async function runSearch({ mode, rawQ, advanced, filters, expansion, effective, untranslated }, res) {
  const cacheKey = JSON.stringify({ mode, effective, advanced, ...filters });
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const { results: merged, perSource, errors } = await searchAll(effective, { ...filters, advanced });

    if (!merged.length && Object.keys(errors).length === VALID_SOURCES.length) {
      return res.status(502).json({
        success: false,
        error: 'Không kết nối được nguồn dữ liệu. Thử lại sau.',
        errors,
      });
    }

    // Mỗi nguồn được gọi với đúng `perPage` nên khi gộp + khử trùng lặp, tổng có thể vượt (hai
    // nguồn không trùng bài) hoặc hụt (trùng nhiều) so với perPage. Cắt về đúng perPage để chọn
    // "Hiển thị: 10/20/30..." có ý nghĩa thật; `hasMore` (không phải so đếm) quyết định nút "Sau".
    const results = merged.slice(0, filters.perPage);
    const hasMore = merged.length > filters.perPage
      || Object.entries(perSource).some(([name, total]) => !errors[name] && filters.page * filters.perPage < total);

    const payload = {
      success: true,
      mode,
      query: { raw: rawQ || null, effective, advanced: advanced || null },
      expansion,
      warning: untranslated && untranslated.length
        ? `Không nhận diện được cụm tiếng Việt: "${[...new Set(untranslated)].join(', ')}" — kết quả có thể thiếu. Hãy thử nhập bằng tiếng Anh hoặc thuật ngữ khác.`
        : null,
      page: filters.page,
      perPage: filters.perPage,
      sort: filters.sort,
      totalBySource: perSource,
      count: results.length,
      hasMore,
      results,
      sourceErrors: Object.keys(errors).length ? errors : undefined,
    };
    cacheSet(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error(`${mode} /api/research/search error:`, err.message);
    res.status(500).json({ success: false, error: 'Lỗi tìm kiếm y văn.' });
  }
}

// ===== Tìm đơn giản (GET) =====
router.get('/search', async (req, res) => {
  const rawQ = String(req.query.q || '').trim();
  if (rawQ.length < 2) {
    return res.status(400).json({ success: false, error: 'Nhập từ khoá tìm kiếm (ít nhất 2 ký tự).' });
  }
  if (rawQ.length > 300) {
    return res.status(400).json({ success: false, error: 'Từ khoá quá dài.' });
  }
  const ex = buildSearchQuery(rawQ, { orSynonyms: true });
  await runSearch({
    mode: 'GET',
    rawQ,
    advanced: null,
    filters: readFilters(req.query),
    expansion: ex.expandedFrom.length ? { terms: ex.expandedFrom, note: ex.note } : null,
    untranslated: ex.untranslated,
    effective: ex.text || rawQ,
  }, res);
});

// ===== Tìm đơn giản HOẶC nâng cao (POST) =====
router.post('/search', async (req, res) => {
  const body = req.body || {};
  const filters = readFilters(body);

  if (Array.isArray(body.advanced) && body.advanced.length) {
    let adv;
    try {
      adv = normalizeAdvanced(body.advanced);
    } catch (msg) {
      return res.status(400).json({ success: false, error: String(msg) });
    }
    return runSearch({
      mode: 'ADV',
      rawQ: null,
      advanced: adv.rows,
      filters,
      expansion: adv.expansion,
      untranslated: adv.untranslated,
      effective: advancedToDisplay(adv.rows),
    }, res);
  }

  const rawQ = String(body.q || '').trim();
  if (rawQ.length < 2) {
    return res.status(400).json({ success: false, error: 'Nhập từ khoá tìm kiếm (ít nhất 2 ký tự).' });
  }
  const ex = buildSearchQuery(rawQ, { orSynonyms: true });
  await runSearch({
    mode: 'POST',
    rawQ,
    advanced: null,
    filters,
    expansion: ex.expandedFrom.length ? { terms: ex.expandedFrom, note: ex.note } : null,
    untranslated: ex.untranslated,
    effective: ex.text || rawQ,
  }, res);
});

// ===== Tải PDF trực tiếp (proxy) =====
// "Tải PDF" trên trang phải TẢI đúng tệp, không chỉ mở tab mới — nhưng oaUrl là link
// ngoài (PMC, publisher, kho lưu trữ trường...) nên trình duyệt sẽ KHÔNG tự tải cross-origin
// dù có thuộc tính `download`. Máy chủ đứng ra lấy hộ rồi trả về với
// Content-Disposition: attachment để ép tải — vì đây là endpoint fetch URL bất kỳ do client
// đưa lên nên phải tự chặn SSRF (không cho trỏ vào mạng nội bộ) + giới hạn kích thước/thời gian.
const PDF_TIMEOUT_MS = 20000;
const MAX_PDF_BYTES = 30 * 1024 * 1024; // 30MB — đủ cho hầu hết bài báo, chặn lạm dụng băng thông
const PROXY_UA = `ChimedisPortal/1.0 (+https://chimedis.vn; mailto:${process.env.RESEARCH_CONTACT_EMAIL || 'contact@chimedis.vn'})`;

function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip.includes(':')) {
    // IPv6: chặn loopback/link-local/ULA và IPv4-mapped nội bộ.
    return /^(::1)$/i.test(ip) || /^fe80:/i.test(ip) || /^f[cd][0-9a-f]{2}:/i.test(ip) || /^::ffff:(10\.|127\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/i.test(ip);
  }
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true; // dị dạng → coi như không an toàn
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function sanitizeFilename(s) {
  const clean = String(s || 'tailieu').replace(/[\\/:"*?<>|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (clean || 'tailieu').slice(0, 100);
}

router.get('/pdf', async (req, res) => {
  let url;
  try {
    url = new URL(String(req.query.url || ''));
  } catch {
    return res.status(400).json({ success: false, error: 'Liên kết không hợp lệ.' });
  }
  if (url.protocol !== 'https:') {
    return res.status(400).json({ success: false, error: 'Chỉ hỗ trợ liên kết HTTPS.' });
  }

  let resolved;
  try {
    resolved = await dns.lookup(url.hostname);
  } catch {
    return res.status(400).json({ success: false, error: 'Không phân giải được tên miền nguồn.' });
  }
  if (isPrivateIp(resolved.address)) {
    return res.status(400).json({ success: false, error: 'Nguồn không được phép.' });
  }

  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), PDF_TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { Accept: 'application/pdf,*/*', 'User-Agent': PROXY_UA },
    });
  } catch {
    clearTimeout(to);
    return res.status(502).json({ success: false, error: 'Không tải được tệp từ nguồn (hết thời gian hoặc lỗi mạng).' });
  }
  clearTimeout(to);

  if (!upstream.ok) {
    return res.status(502).json({ success: false, error: `Nguồn trả lỗi (${upstream.status}).` });
  }
  const ct = upstream.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('pdf')) {
    // oaUrl đôi khi là trang đích (HTML) chứ không phải file PDF trực tiếp — không ép tải nhầm HTML.
    return res.status(415).json({ success: false, error: 'Liên kết này không phải PDF tải trực tiếp. Hãy dùng "Xem nguồn".' });
  }
  const len = parseInt(upstream.headers.get('content-length') || '0', 10);
  if (len && len > MAX_PDF_BYTES) {
    return res.status(413).json({ success: false, error: 'Tệp vượt quá giới hạn 30MB để tải qua máy chủ.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(req.query.name)}.pdf"`);

  const nodeStream = Readable.fromWeb(upstream.body);
  let bytes = 0;
  nodeStream.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > MAX_PDF_BYTES) nodeStream.destroy(new Error('too large'));
  });
  nodeStream.on('error', () => { if (!res.headersSent) res.status(502); res.end(); });
  nodeStream.pipe(res);
});

export default router;
