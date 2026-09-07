// PubMed / MEDLINE qua NCBI E-utilities — nguồn ĐỘC LẬP (không qua Europe PMC).
// ESearch (lấy PMID theo truy vấn) → ESummary (metadata). EFetch abstract để sau (M4).
// M0 §A4 · Connector Status Registry: status = approved.
// Rate limit: 3 req/s không khoá, 10 req/s có NCBI_API_KEY (miễn phí).
// Docs: https://www.ncbi.nlm.nih.gov/books/NBK25501/

import { CONNECTOR_STATUS, fetchJson } from './contract.js';
import { toCanonicalRecord } from '../canonical-record.js';

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const API_KEY = process.env.NCBI_API_KEY || null;
const CV = 'pubmed-eutils-1';
const CONTACT_EMAIL = process.env.RESEARCH_CONTACT_EMAIL || 'contact@chimedis.vn';

function withKey(params) {
  params.set('tool', 'ChimedisWorkbench');
  params.set('email', CONTACT_EMAIL);
  if (API_KEY) params.set('api_key', API_KEY);
  return params;
}

function buildTerm(query, filters = {}) {
  let term = String(query || '').trim();
  if (filters.yearFrom || filters.yearTo) {
    const from = filters.yearFrom || 1800;
    const to = filters.yearTo || new Date().getFullYear() + 1;
    term += ` AND (${from}:${to}[dp])`;
  }
  if (filters.docType === 'rct') term += ' AND Randomized Controlled Trial[pt]';
  else if (filters.docType === 'systematic-review') term += ' AND (systematic review[pt] OR meta-analysis[pt])';
  else if (filters.docType === 'review') term += ' AND review[pt]';
  return term;
}

// PubMed pubtype list → study_type enum (record_v1)
function mapStudyType(pubTypes = []) {
  const s = pubTypes.map((p) => String(p).toLowerCase());
  if (s.some((p) => p.includes('meta-analysis'))) return 'meta-analysis';
  if (s.some((p) => p.includes('systematic review'))) return 'systematic-review';
  if (s.some((p) => p.includes('randomized controlled trial'))) return 'rct';
  if (s.some((p) => p.includes('clinical trial'))) return 'nrsi';
  if (s.some((p) => p.includes('review'))) return 'narrative-review';
  if (s.some((p) => p.includes('case reports'))) return 'case-report';
  if (s.some((p) => p.includes('practice guideline') || p.includes('guideline'))) return 'guideline';
  return 'unknown';
}

async function search(query, filters = {}) {
  const perPage = Math.min(filters.perPage || 20, 50);
  const retstart = ((filters.page || 1) - 1) * perPage;

  const esParams = withKey(new URLSearchParams({
    db: 'pubmed',
    term: buildTerm(query, filters),
    retmode: 'json',
    retmax: String(perPage),
    retstart: String(retstart),
    sort: filters.sort === 'newest' ? 'pub_date' : 'relevance',
  }));
  const es = await fetchJson(`${BASE}/esearch.fcgi?${esParams.toString()}`);
  const idlist = es?.esearchresult?.idlist || [];
  if (!idlist.length) return [];

  const sumParams = withKey(new URLSearchParams({
    db: 'pubmed', id: idlist.join(','), retmode: 'json',
  }));
  const sum = await fetchJson(`${BASE}/esummary.fcgi?${sumParams.toString()}`);
  const result = sum?.result || {};
  const order = result.uids || idlist;

  return order.map((pmid) => {
    const d = result[pmid] || {};
    const doi = (d.articleids || []).find((a) => a.idtype === 'doi')?.value || null;
    const pmcid = (d.articleids || []).find((a) => a.idtype === 'pmcid')?.value || null;
    return toCanonicalRecord({
      source: 'pubmed',
      external_id: `PMID:${pmid}`,
      identifiers: { pmid, doi, pmcid },
      title: d.title || '(không có tiêu đề)',
      authors: (d.authors || []).map((a) => a.name).filter(Boolean),
      journal: d.fulljournalname || d.source || null,
      year: d.pubdate ? parseInt(String(d.pubdate).slice(0, 4), 10) || null : null,
      language: (d.lang || [])[0] || null,
      publication_type: (d.pubtype || [])[0] || null,
      study_type: mapStudyType(d.pubtype),
      full_text_links: [`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`],
    }, { connector: 'pubmed', connector_version: CV });
  });
}

export const pubmedConnector = {
  id: 'pubmed',
  name: 'PubMed / MEDLINE (NCBI E-utilities)',
  access_type: 'open_api',
  connector_version: CV,
  status: CONNECTOR_STATUS.APPROVED,
  capabilities: {
    keyword_search: true,
    subject_heading_search: true, // MeSH
    full_metadata: true,
    abstract: false, // EFetch abstract để M4
    citation_count: false,
    trial_registry: false,
    full_text_link: true,
  },
  search,
  async fetchRecord(pmid) {
    const p = withKey(new URLSearchParams({ db: 'pubmed', id: String(pmid).replace(/\D/g, ''), retmode: 'json' }));
    const sum = await fetchJson(`${BASE}/esummary.fcgi?${p.toString()}`);
    return sum?.result?.[String(pmid).replace(/\D/g, '')] || null;
  },
  async healthCheck() {
    try {
      const p = withKey(new URLSearchParams({ db: 'pubmed', term: 'acupuncture', retmode: 'json', retmax: '1' }));
      await fetchJson(`${BASE}/esearch.fcgi?${p.toString()}`, { timeoutMs: 5000 });
      return { ok: true, status: CONNECTOR_STATUS.APPROVED, detail: API_KEY ? 'with NCBI_API_KEY' : 'no key (3 req/s)' };
    } catch (err) {
      return { ok: false, status: CONNECTOR_STATUS.APPROVED, detail: err.message };
    }
  },
  normalize(raw) {
    return toCanonicalRecord(raw, { connector: 'pubmed', connector_version: CV });
  },
};
