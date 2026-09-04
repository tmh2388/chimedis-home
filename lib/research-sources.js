// Bộ nối tới các API y văn MIỄN PHÍ, KHÔNG cần khoá:
//   - OpenAlex        (https://api.openalex.org)        — ~250M công trình, metadata + abstract
//   - Europe PMC      (https://www.ebi.ac.uk/europepmc) — mạnh về y sinh, có abstract đầy đủ
// Cả hai được chuẩn hoá về CÙNG một shape rồi trộn + khử trùng lặp theo DOI.
//
// Lịch sự với máy chủ: OpenAlex khuyến nghị kèm `mailto`; Europe PMC không cần.
// Không có tầng LLM ở đây — chỉ tìm kiếm + chuẩn hoá (Giai đoạn 1, chi phí 0đ).

const CONTACT_EMAIL = process.env.RESEARCH_CONTACT_EMAIL || 'contact@chimedis.vn';
const UA = `ChimedisPortal/1.0 (+https://chimedis.vn; mailto:${CONTACT_EMAIL})`;
const TIMEOUT_MS = 12000;

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': UA },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// ===== Helpers =====

function normalizeDoi(doi) {
  if (!doi) return null;
  return String(doi)
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .trim()
    .toLowerCase() || null;
}

// OpenAlex trả abstract dưới dạng "inverted index" {từ: [vị trí,...]} — dựng lại câu văn.
function abstractFromInverted(inv) {
  if (!inv || typeof inv !== 'object') return null;
  const slots = [];
  for (const [word, positions] of Object.entries(inv)) {
    for (const p of positions) slots[p] = word;
  }
  const text = slots.filter(Boolean).join(' ').trim();
  return text || null;
}

// Europe PMC trả abstract/tiêu đề có lẫn thẻ HTML (<h4>, <i>, <sub>…) — bỏ sạch thẻ,
// đổi vài thực thể hay gặp, rồi mới cắt ngắn.
function stripHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x?\d+;/g, ' ');
}

function clip(str, n = 480) {
  if (!str) return null;
  const s = stripHtml(str).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

// ===== OpenAlex =====

async function searchOpenAlex(query, { page = 1, perPage = 20, yearFrom, openAccessOnly, pubmedOnly } = {}) {
  const filters = [];
  if (yearFrom) filters.push(`from_publication_date:${yearFrom}-01-01`);
  if (openAccessOnly) filters.push('is_oa:true');
  if (pubmedOnly) filters.push('has_pmid:true'); // chỉ bài có mã PMID (tức có trong PubMed)
  const params = new URLSearchParams({
    search: query,
    page: String(page),
    per_page: String(perPage),
    mailto: CONTACT_EMAIL,
    select: [
      'id', 'ids', 'doi', 'title', 'display_name', 'publication_year', 'publication_date',
      'cited_by_count', 'type', 'language', 'primary_location', 'open_access',
      'authorships', 'abstract_inverted_index', 'primary_topic',
    ].join(','),
  });
  if (filters.length) params.set('filter', filters.join(','));

  const data = await getJson(`https://api.openalex.org/works?${params.toString()}`);
  if (data.error) {
    // Hay gặp: "Rate limit exceeded" (OpenAlex giới hạn ~10 req/giây). Ném lỗi để tầng
    // trên báo cho người dùng thay vì trả "0 kết quả" gây hiểu nhầm.
    throw new Error(`OpenAlex: ${data.message || data.error}`);
  }
  const results = (data.results || []).map((w) => {
    const pmid = w.ids?.pmid ? String(w.ids.pmid).replace(/^https?:\/\/pubmed\.ncbi\.nlm\.nih\.gov\//i, '').replace(/\/$/, '') : null;
    return {
    source: 'openalex',
    id: w.id,
    pmid,
    inPubMed: !!pmid,
    doi: normalizeDoi(w.doi),
    title: stripHtml(w.title || w.display_name || '(không có tiêu đề)').replace(/\s+/g, ' ').trim(),
    authors: (w.authorships || []).map((a) => a.author?.display_name).filter(Boolean),
    year: w.publication_year || null,
    date: w.publication_date || null,
    venue: w.primary_location?.source?.display_name || null,
    type: w.type || null,
    language: w.language || null,
    citations: w.cited_by_count ?? null,
    isOpenAccess: !!w.open_access?.is_oa,
    oaUrl: w.open_access?.oa_url || w.primary_location?.pdf_url || null,
    landingUrl: w.primary_location?.landing_page_url || (w.doi ? `https://doi.org/${normalizeDoi(w.doi)}` : w.id),
    abstract: clip(abstractFromInverted(w.abstract_inverted_index)),
    topic: w.primary_topic?.display_name || null,
  };
  });
  return { total: data.meta?.count ?? results.length, results };
}

// ===== Europe PMC =====

async function searchEuropePmc(query, { page = 1, perPage = 20, yearFrom, openAccessOnly, pubmedOnly } = {}) {
  let q = query;
  if (yearFrom) q += ` AND (PUB_YEAR:[${yearFrom} TO 3000])`;
  if (openAccessOnly) q += ' AND (OPEN_ACCESS:y)';
  if (pubmedOnly) q += ' AND (SRC:MED)'; // SRC:MED = bản ghi MEDLINE/PubMed
  const params = new URLSearchParams({
    query: q,
    format: 'json',
    pageSize: String(perPage),
    page: String(page),
    resultType: 'core',
  });
  const data = await getJson(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params.toString()}`
  );
  const results = (data.resultList?.result || []).map((r) => {
    const doi = normalizeDoi(r.doi);
    const pmid = r.pmid || (r.source === 'MED' ? r.id : null);
    let landingUrl = null;
    if (doi) landingUrl = `https://doi.org/${doi}`;
    else if (pmid) landingUrl = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
    else if (r.pmcid) landingUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/${r.pmcid}/`;
    return {
      source: 'europepmc',
      id: r.pmcid ? `PMC:${r.pmcid}` : pmid ? `PMID:${pmid}` : `${r.source}:${r.id}`,
      pmid: pmid || null,
      inPubMed: !!pmid || r.source === 'MED',
      doi,
      title: stripHtml(r.title || '(không có tiêu đề)').replace(/\s+/g, ' ').trim().replace(/\.$/, ''),
      authors: r.authorString
        ? r.authorString.replace(/\.$/, '').split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      year: r.pubYear ? parseInt(r.pubYear, 10) : null,
      date: r.firstPublicationDate || null,
      venue: r.journalInfo?.journal?.title || r.bookOrReportDetails?.publisher || null,
      type: (r.pubTypeList?.pubType || [])[0] || null,
      language: r.language || null,
      citations: r.citedByCount ?? null,
      isOpenAccess: r.isOpenAccess === 'Y',
      oaUrl: r.pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${r.pmcid}/` : null,
      landingUrl,
      abstract: clip(r.abstractText),
      topic: null,
    };
  });
  return { total: data.hitCount ?? results.length, results };
}

// ===== Trộn kết quả =====

const SOURCE_FNS = { openalex: searchOpenAlex, europepmc: searchEuropePmc };

/**
 * Gọi song song các nguồn được chọn, trộn kết quả, khử trùng lặp theo DOI (fallback tiêu đề).
 * Khi trùng: ưu tiên bản có abstract; gộp cờ Open Access + link OA + max(citations).
 * @returns {Promise<{results, perSource, errors}>}
 */
export async function searchAll(query, opts = {}) {
  const sources = (opts.sources && opts.sources.length ? opts.sources : ['openalex', 'europepmc'])
    .filter((s) => SOURCE_FNS[s]);

  const settled = await Promise.allSettled(
    sources.map((s) => SOURCE_FNS[s](query, opts))
  );

  const perSource = {};
  const errors = {};
  const merged = new Map();

  settled.forEach((outcome, i) => {
    const name = sources[i];
    if (outcome.status === 'rejected') {
      errors[name] = String(outcome.reason?.message || outcome.reason);
      perSource[name] = 0;
      return;
    }
    perSource[name] = outcome.value.total;
    for (const item of outcome.value.results) {
      const key = item.doi
        ? `doi:${item.doi}`
        : `title:${item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120)}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...item, sources: [item.source] });
        continue;
      }
      existing.sources = [...new Set([...existing.sources, item.source])];
      if (!existing.abstract && item.abstract) existing.abstract = item.abstract;
      if (!existing.oaUrl && item.oaUrl) existing.oaUrl = item.oaUrl;
      existing.isOpenAccess = existing.isOpenAccess || item.isOpenAccess;
      existing.inPubMed = existing.inPubMed || item.inPubMed;
      if (!existing.pmid && item.pmid) existing.pmid = item.pmid;
      if ((item.citations ?? 0) > (existing.citations ?? 0)) existing.citations = item.citations;
      if (!existing.venue && item.venue) existing.venue = item.venue;
      if (!existing.topic && item.topic) existing.topic = item.topic;
    }
  });

  const results = [...merged.values()].sort((a, b) => {
    // Ưu tiên: nhiều nguồn cùng có → mới hơn → nhiều trích dẫn hơn.
    if (b.sources.length !== a.sources.length) return b.sources.length - a.sources.length;
    if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
    return (b.citations ?? 0) - (a.citations ?? 0);
  });

  return { results, perSource, errors };
}

export default { searchAll };
