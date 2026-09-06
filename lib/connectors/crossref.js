// Crossref REST API — metadata/DOI resolution, license, funding, retraction/update.
// Chủ yếu dùng để chuẩn hoá + dedup + xác minh trích dẫn; cũng chạy được như nguồn tìm.
// M0 §A4 · status = approved. Polite pool: kèm mailto trong User-Agent (đã có ở contract).
// Docs: https://api.crossref.org/swagger-ui/index.html

import { CONNECTOR_STATUS, fetchJson } from './contract.js';
import { toCanonicalRecord } from '../canonical-record.js';

const BASE = 'https://api.crossref.org/works';
const CV = 'crossref-rest-1';
const CONTACT_EMAIL = process.env.RESEARCH_CONTACT_EMAIL || 'contact@chimedis.vn';

function mapStudyType(type, title = '') {
  const t = String(type || '').toLowerCase();
  const lt = title.toLowerCase();
  if (t === 'proceedings-article') return 'other';
  if (t === 'book' || t === 'monograph') return 'other';
  if (/systematic review/.test(lt)) return 'systematic-review';
  if (/meta-analysis/.test(lt)) return 'meta-analysis';
  if (/randomi[sz]ed controlled trial|randomi[sz]ed trial/.test(lt)) return 'rct';
  if (t === 'journal-article' && /review/.test(lt)) return 'narrative-review';
  return 'unknown';
}

async function search(query, filters = {}) {
  const perPage = Math.min(filters.perPage || 20, 50);
  const offset = ((filters.page || 1) - 1) * perPage;
  const params = new URLSearchParams({
    query: String(query || ''),
    rows: String(perPage),
    offset: String(offset),
    // KHÔNG dùng `select`: tập trường select của Crossref khác nhau theo route và
    // KHÔNG gồm `language`/`author`/`subject`… (gây HTTP 400 "select-not-available").
    // Lấy full record, chọn trường khi normalize.
    mailto: CONTACT_EMAIL,
  });
  const filt = [];
  if (filters.yearFrom) filt.push(`from-pub-date:${filters.yearFrom}-01-01`);
  if (filters.yearTo) filt.push(`until-pub-date:${filters.yearTo}-12-31`);
  if (filt.length) params.set('filter', filt.join(','));
  const data = await fetchJson(`${BASE}?${params.toString()}`);
  const items = data?.message?.items || [];

  return items.map((it) => {
    const title = Array.isArray(it.title) ? it.title[0] : it.title || '(không có tiêu đề)';
    const year = it.issued?.['date-parts']?.[0]?.[0] || null;
    const updates = Array.isArray(it['update-to']) ? it['update-to'] : [];
    return toCanonicalRecord({
      source: 'crossref',
      external_id: `doi:${it.DOI}`,
      identifiers: { doi: it.DOI },
      title,
      abstract: it.abstract ? stripJats(it.abstract) : null,
      authors: (it.author || []).map((a) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean),
      journal: Array.isArray(it['container-title']) ? it['container-title'][0] : it['container-title'] || null,
      year,
      language: it.language || null,
      publication_type: it.type || null,
      study_type: mapStudyType(it.type, title),
      subject_headings: Array.isArray(it.subject) ? it.subject : [],
      citations: it['is-referenced-by-count'] ?? null,
      flags: {
        correction: updates.some((u) => /correction|corrigendum|erratum/i.test(u.type || '')),
        retracted: updates.some((u) => /retraction/i.test(u.type || '')),
        updated: updates.length > 0,
      },
      full_text_links: (it.link || []).map((l) => l.URL).filter(Boolean),
    }, { connector: 'crossref', connector_version: CV });
  });
}

function stripJats(s) {
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000) || null;
}

export const crossrefConnector = {
  id: 'crossref',
  name: 'Crossref REST API',
  access_type: 'open_api',
  connector_version: CV,
  status: CONNECTOR_STATUS.APPROVED,
  capabilities: {
    keyword_search: true,
    subject_heading_search: false,
    full_metadata: true,
    abstract: true,
    citation_count: true,
    trial_registry: false,
    full_text_link: true,
  },
  search,
  async fetchRecord(doi) {
    const clean = String(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim();
    const data = await fetchJson(`${BASE}/${encodeURIComponent(clean)}?mailto=${encodeURIComponent(CONTACT_EMAIL)}`);
    return data?.message || null;
  },
  async healthCheck() {
    try {
      await fetchJson(`${BASE}?query=acupuncture&rows=1&mailto=${encodeURIComponent(CONTACT_EMAIL)}`, { timeoutMs: 5000 });
      return { ok: true, status: CONNECTOR_STATUS.APPROVED, detail: 'polite pool' };
    } catch (err) {
      return { ok: false, status: CONNECTOR_STATUS.APPROVED, detail: err.message };
    }
  },
  normalize(raw) {
    return toCanonicalRecord(raw, { connector: 'crossref', connector_version: CV });
  },
};
