// Bộ nối tới các API y văn MIỄN PHÍ:
//   - OpenAlex        (https://api.openalex.org)        — ~250M công trình, metadata + abstract, KHÔNG cần khoá
//   - Europe PMC      (https://www.ebi.ac.uk/europepmc) — mạnh về y sinh, có abstract đầy đủ, KHÔNG cần khoá
//   - CORE            (https://api.core.ac.uk)          — kho OA lớn nhất, KHÔNG cần khoá nhưng rate limit rất
//                                                          chặt khi không có khoá (~5 request/10s DÙNG CHUNG
//                                                          toàn cầu) — đặt CORE_API_KEY để có hạn mức riêng ổn định.
//   - Semantic Scholar (https://api.semanticscholar.org) — mạnh về AI/CS lẫn y sinh, CẦN khoá để dùng ổn định
//                                                          (không khoá dễ bị 429 vì pool dùng chung cực dễ cạn) —
//                                                          đặt SEMANTIC_SCHOLAR_API_KEY khi có (đang chờ duyệt).
// Tất cả được chuẩn hoá về CÙNG một shape rồi trộn + khử trùng lặp theo DOI.
//
// Lịch sự với máy chủ: OpenAlex khuyến nghị kèm `mailto`; các nguồn khác không cần.
// Không có tầng LLM ở đây — chỉ tìm kiếm + chuẩn hoá (Giai đoạn 1, chi phí 0đ).

const CONTACT_EMAIL = process.env.RESEARCH_CONTACT_EMAIL || 'contact@chimedis.vn';
const UA = `ChimedisPortal/1.0 (+https://chimedis.vn; mailto:${CONTACT_EMAIL})`;
const TIMEOUT_MS = 12000;
const CORE_API_KEY = process.env.CORE_API_KEY || null;
const S2_API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || null;

async function getJson(url, extraHeaders, timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': UA, ...extraHeaders },
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

// ===== Truy vấn nâng cao (từ trình xây dựng điều kiện kiểu PubMed) =====
// `advanced` = [{ term, field, op }] — op ∈ AND | OR | NOT (dòng đầu bỏ qua op).
// field ∈ title | author | abstract | keyword | fulltext | journal | affiliation | doi

export const ADV_FIELDS = ['title', 'author', 'abstract', 'keyword', 'fulltext', 'journal', 'affiliation', 'doi'];

const EPMC_PREFIX = {
  title: 'TITLE', author: 'AUTH', abstract: 'ABSTRACT', keyword: 'KW',
  fulltext: '', journal: 'JOURNAL', affiliation: 'AFF', doi: 'DOI',
};
// OpenAlex chỉ có sẵn sub-filter `.search` cho vài trường; các trường còn lại (journal,
// affiliation) sẽ được nhồi vào tham số `search=` tự do (kém chính xác hơn — có ghi chú).
const OA_SEARCH_KEY = {
  title: 'title.search', abstract: 'abstract.search', keyword: 'title_and_abstract.search',
  fulltext: 'fulltext.search', author: 'raw_author_name.search',
};

function quoteTerm(t) {
  const s = String(t).trim();
  return /\s/.test(s) && !/^".*"$/.test(s) ? `"${s}"` : s;
}

/** Dựng chuỗi truy vấn có cấu trúc cho Europe PMC: `(TITLE:"a") AND (ABSTRACT:b) NOT (KW:"c")`. */
function buildEpmcAdvanced(advanced) {
  const parts = [];
  advanced.forEach((row, i) => {
    const prefix = EPMC_PREFIX[row.field] ?? '';
    const clause = prefix ? `(${prefix}:${quoteTerm(row.term)})` : `(${quoteTerm(row.term)})`;
    if (i === 0) parts.push(clause);
    else parts.push(`${row.op === 'OR' ? 'OR' : row.op === 'NOT' ? 'NOT' : 'AND'} ${clause}`);
  });
  return parts.join(' ');
}

/**
 * Dựng tham số cho OpenAlex từ truy vấn nâng cao.
 * - Dòng AND + trường được hỗ trợ  → thêm sub-filter `key.search:term`.
 * - Dòng NOT + trường hỗ trợ       → `key.search:!term`.
 * - Dòng OR, hoặc trường không hỗ trợ (journal/affiliation) → dồn vào `search=` tự do.
 * @returns {{ filterParts: string[], freeText: string, approx: boolean }}
 */
function buildOpenAlexAdvanced(advanced) {
  const filterParts = [];
  const freeBits = [];
  let approx = false;
  advanced.forEach((row, i) => {
    const key = OA_SEARCH_KEY[row.field];
    const op = i === 0 ? 'AND' : row.op || 'AND';
    if (row.field === 'doi' && op === 'AND') {
      filterParts.push(`doi:${normalizeDoi(row.term) || row.term}`);
      return;
    }
    if (key && (op === 'AND' || op === 'NOT')) {
      const val = String(row.term).trim().replace(/^"|"$/g, '');
      filterParts.push(`${key}:${op === 'NOT' ? '!' : ''}${val}`);
    } else {
      freeBits.push(String(row.term).replace(/^"|"$/g, ''));
      if (op === 'OR' || !key) approx = true;
    }
  });
  return { filterParts, freeText: freeBits.join(' ').trim(), approx };
}

/** Chuỗi hiển thị cho người dùng, vd `TITLE:"astragalus" AND ABSTRACT:"diabetes"`. */
export function advancedToDisplay(advanced) {
  return advanced
    .map((row, i) => {
      const f = row.field.toUpperCase();
      const seg = `${f}:${quoteTerm(row.term)}`;
      return i === 0 ? seg : `${row.op || 'AND'} ${seg}`;
    })
    .join(' ');
}

// ===== OpenAlex =====

// Loại tài liệu → filter type của OpenAlex (gần đúng: OpenAlex không phân biệt RCT).
const OA_DOCTYPE = {
  'systematic-review': 'type:review',
  rct: 'type:article',
  review: 'type:review',
  preprint: 'type:preprint',
};

// Khoá sắp xếp chung → cú pháp riêng từng nguồn.
const OA_SORT = {
  citations: 'cited_by_count:desc',
  citations_asc: 'cited_by_count:asc',
  newest: 'publication_date:desc',
  oldest: 'publication_date:asc',
  relevance: 'relevance_score:desc', // chỉ hợp lệ khi có tham số search
};

async function searchOpenAlex(query, { page = 1, perPage = 20, yearFrom, yearTo, openAccessOnly, pubmedOnly, pmcOnly, docType, sort, advanced } = {}) {
  const filters = [];
  if (yearFrom) filters.push(`from_publication_date:${yearFrom}-01-01`);
  if (yearTo) filters.push(`to_publication_date:${yearTo}-12-31`);
  if (openAccessOnly) filters.push('is_oa:true');
  if (pubmedOnly) filters.push('has_pmid:true'); // chỉ bài có mã PMID (tức có trong PubMed)
  if (docType && OA_DOCTYPE[docType]) filters.push(OA_DOCTYPE[docType]);
  // pmcOnly: OpenAlex không có filter PMC ổn định — để Europe PMC gánh (IN_PMC:Y).

  let searchParam = query;
  if (advanced && advanced.length) {
    const b = buildOpenAlexAdvanced(advanced);
    filters.push(...b.filterParts);
    searchParam = b.freeText; // có thể rỗng nếu mọi dòng đã vào filter
  }

  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    mailto: CONTACT_EMAIL,
    select: [
      'id', 'ids', 'doi', 'title', 'display_name', 'publication_year', 'publication_date',
      'cited_by_count', 'type', 'language', 'primary_location', 'open_access',
      'authorships', 'abstract_inverted_index', 'primary_topic',
    ].join(','),
  });
  if (searchParam && searchParam.trim()) params.set('search', searchParam.trim());
  if (filters.length) params.set('filter', filters.join(','));
  // relevance_score chỉ dùng được khi có search; không có search thì mặc định theo trích dẫn.
  const sortKey = sort && OA_SORT[sort] ? sort : 'relevance';
  if (sortKey === 'relevance' && !(searchParam && searchParam.trim())) {
    params.set('sort', OA_SORT.citations);
  } else {
    params.set('sort', OA_SORT[sortKey]);
  }

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
    // LƯU Ý: OpenAlex `keywords` KHÔNG phải từ khoá tác giả khai — đó là nhãn chủ đề do
    // OpenAlex tự phân loại bằng thuật toán (giống `primary_topic`), nên KHÔNG dùng làm
    // "keywords" hiển thị (dễ gây hiểu nhầm là từ khoá thật của bài). Chỉ Europe PMC có
    // `keywordList` là từ khoá tác giả khai báo thật sự — xem searchEuropePmc bên dưới.
    keywords: [],
  };
  });
  return { total: data.meta?.count ?? results.length, results };
}

// ===== Europe PMC =====

// Loại tài liệu / bằng chứng → mệnh đề lọc Europe PMC.
const EPMC_DOCTYPE = {
  'systematic-review': ' AND (PUB_TYPE:"systematic review" OR PUB_TYPE:"Meta-Analysis")',
  rct: ' AND (PUB_TYPE:"Randomized Controlled Trial")',
  review: ' AND (PUB_TYPE:"Review")',
  preprint: ' AND (SRC:PPR)',
};

// Europe PMC gán nhiều pubType cho 1 bài — ưu tiên nhãn có giá trị chỉ báo bằng chứng.
const PUBTYPE_PRIORITY = ['Meta-Analysis', 'systematic review', 'Randomized Controlled Trial', 'Review', 'Clinical Trial', 'preprint'];
function pickPubType(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const lower = list.map((x) => String(x).toLowerCase());
  for (const p of PUBTYPE_PRIORITY) {
    const i = lower.indexOf(p.toLowerCase());
    if (i >= 0) return list[i];
  }
  return list.find((x) => String(x).toLowerCase() !== 'research-article') || list[0];
}

const EPMC_SORT = {
  citations: ' sort_cited:y desc',
  citations_asc: ' sort_cited:y asc',
  newest: ' sort_date:y desc',
  oldest: ' sort_date:y asc',
  relevance: '', // mặc định của Europe PMC
};

async function searchEuropePmc(query, { page = 1, perPage = 20, yearFrom, yearTo, openAccessOnly, pubmedOnly, pmcOnly, docType, sort, advanced } = {}) {
  let q = advanced && advanced.length ? buildEpmcAdvanced(advanced) : query;
  const lo = yearFrom || 1500;
  const hi = yearTo || 3000;
  if (yearFrom || yearTo) q += ` AND (PUB_YEAR:[${lo} TO ${hi}])`;
  if (openAccessOnly) q += ' AND (OPEN_ACCESS:y)';
  if (pubmedOnly) q += ' AND (SRC:MED)'; // SRC:MED = bản ghi MEDLINE/PubMed
  if (pmcOnly) q += ' AND (IN_PMC:Y)'; // có toàn văn trên PubMed Central
  if (docType && EPMC_DOCTYPE[docType]) q += EPMC_DOCTYPE[docType];
  if (sort && EPMC_SORT[sort]) q += EPMC_SORT[sort];
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
      type: pickPubType(r.pubTypeList?.pubType),
      language: r.language || null,
      citations: r.citedByCount ?? null,
      isOpenAccess: r.isOpenAccess === 'Y',
      oaUrl: r.pmcid ? `https://www.ncbi.nlm.nih.gov/pmc/articles/${r.pmcid}/` : null,
      landingUrl,
      abstract: clip(r.abstractText),
      topic: null,
      keywords: (r.keywordList?.keyword || []).slice(0, 6), // từ khoá TÁC GIẢ khai báo — thật
    };
  });
  return { total: data.hitCount ?? results.length, results };
}

// ===== CORE (kho tổng hợp OA lớn nhất — không cần khoá, nhưng rate limit chặt) =====

async function searchCore(query, { page = 1, perPage = 20, yearFrom, yearTo, sort, advanced } = {}) {
  // CORE hỗ trợ cú pháp kiểu Elasticsearch trong `q` — ghép thêm điều kiện năm nếu có.
  let q = advanced && advanced.length ? advanced.map((r) => r.term).join(' ') : query;
  if (yearFrom || yearTo) q += ` AND yearPublished>=${yearFrom || 1500} AND yearPublished<=${yearTo || 3000}`;
  const params = new URLSearchParams({
    q,
    limit: String(perPage),
    offset: String((page - 1) * perPage),
  });
  const headers = CORE_API_KEY ? { Authorization: `Bearer ${CORE_API_KEY}` } : {};
  // Timeout ngắn hơn (6s thay vì 12s): đây là nguồn bổ sung, không nên làm chậm cả lượt tìm
  // kiếm nếu CORE đang bị giới hạn tốc độ (thường gặp khi chưa có CORE_API_KEY).
  const data = await getJson(`https://api.core.ac.uk/v3/search/works/?${params.toString()}`, headers, 6000);
  if (data.status && data.status !== 'OK' && !data.results) {
    throw new Error(`CORE: ${data.message || data.status}`);
  }
  const results = (data.results || []).map((w) => ({
    source: 'core',
    id: `core:${w.id}`,
    pmid: w.pubmedId ? String(w.pubmedId) : null,
    inPubMed: !!w.pubmedId,
    doi: normalizeDoi(w.doi),
    title: stripHtml(w.title || '(không có tiêu đề)').replace(/\s+/g, ' ').trim(),
    authors: (w.authors || []).map((a) => a.name).filter(Boolean),
    year: w.yearPublished || null,
    date: w.publishedDate || null,
    venue: w.publisher || w.journals?.[0]?.title || null,
    type: w.documentType || null,
    language: w.language?.name || null,
    citations: w.citationCount ?? null,
    isOpenAccess: true, // CORE chỉ tổng hợp nội dung open access
    oaUrl: w.downloadUrl || (w.sourceFulltextUrls || [])[0] || null,
    landingUrl: w.links?.find((l) => l.type === 'display')?.url || (w.doi ? `https://doi.org/${normalizeDoi(w.doi)}` : null),
    abstract: clip(w.abstract),
    topic: null,
    keywords: [], // CORE không tách riêng từ khoá tác giả trong API tìm kiếm
  }));
  return { total: data.totalHits ?? results.length, results };
}

// ===== Semantic Scholar (mạnh AI/CS lẫn y sinh — nên có khoá để ổn định) =====

// Hạn mức key thật (theo email cấp key): "1 request per second, cumulative across all
// endpoints" — TÍNH CHUNG cho mọi lượt tìm kiếm đang chạy đồng thời trên server, không phải
// mỗi người dùng 1 giây. Phải xếp hàng nghiêm ngặt, nếu không sẽ bị 429 dù đã có khoá.
// Lượt nào phải đợi quá lâu (server đang bận) thì bỏ qua Semantic Scholar cho lượt đó luôn,
// thay vì bắt người dùng chờ hàng chục giây chỉ vì 1 nguồn bổ sung.
let s2Queue = Promise.resolve();
let s2LastCallAt = 0;
const S2_MIN_INTERVAL_MS = 1100; // hơi rộng hơn 1s để chừa sai số
const S2_MAX_QUEUE_WAIT_MS = 3000;

function scheduleS2Call() {
  const turn = s2Queue.then(async () => {
    const wait = s2LastCallAt + S2_MIN_INTERVAL_MS - Date.now();
    if (wait > S2_MAX_QUEUE_WAIT_MS) {
      throw new Error('hàng đợi quá tải, bỏ qua lượt này');
    }
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    s2LastCallAt = Date.now();
  });
  // Luôn nối đuôi hàng đợi kể cả khi lượt này bị từ chối (catch rỗng) — nếu không, một lỗi ở
  // giữa chuỗi `.then` sẽ làm mọi lượt sau đó cũng ăn theo lỗi cũ.
  s2Queue = turn.catch(() => {});
  return turn;
}

async function searchSemanticScholar(query, { page = 1, perPage = 20, advanced } = {}) {
  await scheduleS2Call();
  const q = advanced && advanced.length ? advanced.map((r) => r.term).join(' ') : query;
  const params = new URLSearchParams({
    query: q,
    limit: String(Math.min(perPage, 100)),
    offset: String((page - 1) * perPage),
    fields: 'title,abstract,year,publicationDate,venue,authors,externalIds,citationCount,isOpenAccess,openAccessPdf,publicationTypes',
  });
  const headers = S2_API_KEY ? { 'x-api-key': S2_API_KEY } : {};
  // Timeout: đã đo thực tế — khi trả đủ trường (kèm `abstract`) đôi lúc mất hơn 4s, nên nới lên
  // 5s. Cộng với thời gian xếp hàng tối đa 3s ở trên, tổng chờ tối đa cho nguồn bổ sung này ~8s
  // — không nên nới thêm vì đây chỉ là nguồn phụ, không được phép kéo chậm cả lượt tìm kiếm.
  const data = await getJson(`https://api.semanticscholar.org/graph/v1/paper/search?${params.toString()}`, headers, 5000);
  if (data.error || data.message) {
    // Hay gặp nhất khi KHÔNG có khoá: 429 "Too Many Requests" (pool dùng chung toàn cầu, rất dễ cạn).
    throw new Error(`Semantic Scholar: ${data.error || data.message}`);
  }
  const results = (data.data || []).map((w) => {
    const doi = normalizeDoi(w.externalIds?.DOI);
    const pmid = w.externalIds?.PubMed ? String(w.externalIds.PubMed) : null;
    return {
      source: 'semanticscholar',
      id: `s2:${w.paperId}`,
      pmid,
      inPubMed: !!pmid,
      doi,
      title: stripHtml(w.title || '(không có tiêu đề)').replace(/\s+/g, ' ').trim(),
      authors: (w.authors || []).map((a) => a.name).filter(Boolean),
      year: w.year || null,
      date: w.publicationDate || null,
      venue: w.venue || null,
      type: (w.publicationTypes || [])[0] || null,
      language: null,
      citations: w.citationCount ?? null,
      isOpenAccess: !!w.isOpenAccess,
      oaUrl: w.openAccessPdf?.url || null,
      landingUrl: doi ? `https://doi.org/${doi}` : `https://www.semanticscholar.org/paper/${w.paperId}`,
      abstract: clip(w.abstract),
      topic: null,
      keywords: [], // Semantic Scholar không cung cấp từ khoá tác giả trong endpoint tìm kiếm
    };
  });
  return { total: data.total ?? results.length, results };
}

// ===== Trộn kết quả =====

const SOURCE_FNS = {
  openalex: searchOpenAlex,
  europepmc: searchEuropePmc,
  core: searchCore,
  semanticscholar: searchSemanticScholar,
};
const DEFAULT_SOURCES = ['openalex', 'europepmc', 'core', 'semanticscholar'];

/**
 * Gọi song song các nguồn được chọn, trộn kết quả, khử trùng lặp theo DOI (fallback tiêu đề).
 * Khi trùng: ưu tiên bản có abstract; gộp cờ Open Access + link OA + max(citations).
 * @returns {Promise<{results, perSource, errors}>}
 */
export async function searchAll(query, opts = {}) {
  let sources = (opts.sources && opts.sources.length ? opts.sources : DEFAULT_SOURCES)
    .filter((s) => SOURCE_FNS[s]);
  // OpenAlex không phân loại RCT — với bộ lọc này chỉ dùng Europe PMC (chính xác hơn).
  if (opts.docType === 'rct') sources = sources.filter((s) => s === 'europepmc');

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
      // Từ khoá thật của bài (không phải nhãn hệ thống) — gộp cả 2 nguồn, khử trùng lặp
      // không phân biệt hoa/thường, giữ tối đa 6 để không tràn cột "Nhãn".
      if (item.keywords?.length) {
        const seen = new Set((existing.keywords || []).map((k) => k.toLowerCase()));
        const merged2 = [...(existing.keywords || [])];
        for (const k of item.keywords) {
          if (!seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); merged2.push(k); }
        }
        existing.keywords = merged2.slice(0, 6);
      }
    }
  });

  // Mỗi nguồn đã trả về đúng thứ tự yêu cầu (server-side sort); ở đây chỉ trộn lại theo
  // cùng khoá để trang kết quả nhất quán. `relevance` giữ heuristic cũ (ưu tiên bài xuất
  // hiện ở cả 2 nguồn).
  const dateVal = (x) => (x.date ? Date.parse(x.date) : x.year ? Date.parse(`${x.year}-06-30`) : 0);
  const sorters = {
    citations: (a, b) => (b.citations ?? 0) - (a.citations ?? 0),
    citations_asc: (a, b) => (a.citations ?? 0) - (b.citations ?? 0),
    newest: (a, b) => dateVal(b) - dateVal(a),
    oldest: (a, b) => dateVal(a) - dateVal(b),
    relevance: (a, b) => {
      if (b.sources.length !== a.sources.length) return b.sources.length - a.sources.length;
      if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
      return (b.citations ?? 0) - (a.citations ?? 0);
    },
  };
  const results = [...merged.values()].sort(sorters[opts.sort] || sorters.relevance);

  return { results, perSource, errors };
}

export default { searchAll };
