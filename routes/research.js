// API tìm kiếm y văn cho chimedis.vn — Giai đoạn 1: chỉ tìm kiếm + chuẩn hoá, KHÔNG LLM.
// Nguồn: OpenAlex + Europe PMC (miễn phí, không khoá). Xem lib/research-sources.js.
// Điểm khác biệt Chimedis: truy vấn tiếng Việt được dịch thuật ngữ YHCT sang tiếng Anh
// trước khi tra (lib/tcm-vocab.js).

import { Router } from 'express';
import { searchAll } from '../lib/research-sources.js';
import { buildSearchQuery } from '../lib/tcm-vocab.js';

const router = Router();

const VALID_SOURCES = ['openalex', 'europepmc'];
const MAX_PER_PAGE = 25;

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

/**
 * GET /api/research/search
 *   q            (bắt buộc) — truy vấn, có thể tiếng Việt
 *   page         (mặc định 1)
 *   perPage      (mặc định 20, tối đa 25)
 *   sources      danh sách phẩy: openalex,europepmc (mặc định cả hai)
 *   yearFrom     lọc năm xuất bản >= (vd 2015)
 *   openAccess   "1" để chỉ lấy bài Open Access
 */
router.get('/search', async (req, res) => {
  const rawQ = String(req.query.q || '').trim();
  if (rawQ.length < 2) {
    return res.status(400).json({ success: false, error: 'Nhập từ khoá tìm kiếm (ít nhất 2 ký tự).' });
  }
  if (rawQ.length > 300) {
    return res.status(400).json({ success: false, error: 'Từ khoá quá dài.' });
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(req.query.perPage, 10) || 20, 5), MAX_PER_PAGE);
  const sources = String(req.query.sources || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => VALID_SOURCES.includes(s));
  const yearFromRaw = parseInt(req.query.yearFrom, 10);
  const yearFrom = yearFromRaw >= 1900 && yearFromRaw <= 2100 ? yearFromRaw : null;
  const openAccessOnly = req.query.openAccess === '1' || req.query.openAccess === 'true';
  const pubmedOnly = req.query.pubmedOnly === '1' || req.query.pubmedOnly === 'true';

  const expansion = buildSearchQuery(rawQ);
  const effectiveQuery = expansion.text || rawQ;

  const cacheKey = JSON.stringify({ effectiveQuery, page, perPage, sources, yearFrom, openAccessOnly, pubmedOnly });
  const cached = cacheGet(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const { results, perSource, errors } = await searchAll(effectiveQuery, {
      page,
      perPage,
      sources,
      yearFrom,
      openAccessOnly,
      pubmedOnly,
    });

    if (!results.length && Object.keys(errors).length === VALID_SOURCES.length) {
      return res.status(502).json({
        success: false,
        error: 'Không kết nối được nguồn dữ liệu. Thử lại sau.',
        errors,
      });
    }

    const payload = {
      success: true,
      query: { raw: rawQ, effective: effectiveQuery },
      expansion: expansion.expandedFrom.length
        ? { terms: expansion.expandedFrom, note: expansion.note }
        : null,
      page,
      perPage,
      totalBySource: perSource,
      count: results.length,
      results,
      sourceErrors: Object.keys(errors).length ? errors : undefined,
    };
    cacheSet(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('GET /api/research/search error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi tìm kiếm y văn.' });
  }
});

export default router;
