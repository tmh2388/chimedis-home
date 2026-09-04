// API tìm kiếm y văn cho chimedis.vn — Giai đoạn 1: chỉ tìm kiếm + chuẩn hoá, KHÔNG LLM.
// Nguồn: OpenAlex + Europe PMC (miễn phí, không khoá). Xem lib/research-sources.js.
// Điểm khác biệt Chimedis: truy vấn tiếng Việt được dịch thuật ngữ YHCT sang tiếng Anh
// trước khi tra (lib/tcm-vocab.js).
//
//   GET  /api/research/search?q=...        — tìm đơn giản (1 ô)
//   POST /api/research/search  { q } hoặc { advanced: [{term,field,op}] } — tìm nâng cao

import { Router } from 'express';
import { searchAll, ADV_FIELDS, advancedToDisplay } from '../lib/research-sources.js';
import { buildSearchQuery } from '../lib/tcm-vocab.js';

const router = Router();

const VALID_SOURCES = ['openalex', 'europepmc'];
const VALID_OPS = ['AND', 'OR', 'NOT'];
const MAX_PER_PAGE = 25;
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
  const yearFromRaw = parseInt(src.yearFrom, 10);
  const yearFrom = yearFromRaw >= 1900 && yearFromRaw <= 2100 ? yearFromRaw : null;
  const truthy = (v) => v === '1' || v === 'true' || v === true;
  return {
    page,
    perPage,
    sources,
    yearFrom,
    openAccessOnly: truthy(src.openAccess),
    pubmedOnly: truthy(src.pubmedOnly),
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
    }
    rows.push({ term: effTerm, field, op });
  }
  if (!rows.length) throw 'Chưa nhập từ khoá cho điều kiện nào.';
  return {
    rows,
    expansion: expandedFrom.length
      ? { terms: expandedFrom, note: 'Đã dịch thuật ngữ YHCT trong điều kiện sang tiếng Anh.' }
      : null,
  };
}

async function runSearch({ mode, rawQ, advanced, filters, expansion, effective }, res) {
  const cacheKey = JSON.stringify({ mode, effective, advanced, ...filters });
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const { results, perSource, errors } = await searchAll(effective, { ...filters, advanced });

    if (!results.length && Object.keys(errors).length === VALID_SOURCES.length) {
      return res.status(502).json({
        success: false,
        error: 'Không kết nối được nguồn dữ liệu. Thử lại sau.',
        errors,
      });
    }

    const payload = {
      success: true,
      mode,
      query: { raw: rawQ || null, effective, advanced: advanced || null },
      expansion,
      page: filters.page,
      perPage: filters.perPage,
      totalBySource: perSource,
      count: results.length,
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
  const ex = buildSearchQuery(rawQ);
  await runSearch({
    mode: 'GET',
    rawQ,
    advanced: null,
    filters: readFilters(req.query),
    expansion: ex.expandedFrom.length ? { terms: ex.expandedFrom, note: ex.note } : null,
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
      effective: advancedToDisplay(adv.rows),
    }, res);
  }

  const rawQ = String(body.q || '').trim();
  if (rawQ.length < 2) {
    return res.status(400).json({ success: false, error: 'Nhập từ khoá tìm kiếm (ít nhất 2 ký tự).' });
  }
  const ex = buildSearchQuery(rawQ);
  await runSearch({
    mode: 'POST',
    rawQ,
    advanced: null,
    filters,
    expansion: ex.expandedFrom.length ? { terms: ex.expandedFrom, note: ex.note } : null,
    effective: ex.text || rawQ,
  }, res);
});

export default router;
