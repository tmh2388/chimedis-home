// Bọc 4 bộ nối đã có trong lib/research-sources.js thành SearchConnector `connector_v1`
// mà KHÔNG viết lại logic. Dùng cho Discovery Search.
// M0 §A4: giữ nguyên hành vi; chỉ chuẩn hoá output sang CanonicalResearchRecord.

import {
  searchOpenAlex, searchEuropePmc, searchCore, searchSemanticScholar,
} from '../research-sources.js';
import { toCanonicalRecord } from '../canonical-record.js';
import { CONNECTOR_STATUS } from './contract.js';

const CV = 'legacy-1'; // connector_version chung cho nhóm bọc

function makeLegacyConnector({ id, name, capabilities, fn }) {
  return {
    id,
    name,
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
      ...capabilities,
    },
    async search(query, filters = {}) {
      const { results = [] } = await fn(query, {
        page: filters.page || 1,
        perPage: Math.min(filters.perPage || 20, 50),
        yearFrom: filters.yearFrom,
        yearTo: filters.yearTo,
        openAccessOnly: filters.openAccessOnly,
        sort: filters.sort,
      });
      return results.map((r) => toCanonicalRecord(r, { connector: id, connector_version: CV }));
    },
    async fetchRecord() { return null; }, // các nguồn này không có fetch-by-id thống nhất ở M1
    async healthCheck() { return { ok: true, status: this.status, detail: 'wrapped legacy source' }; },
    normalize(raw) { return toCanonicalRecord(raw, { connector: id, connector_version: CV }); },
  };
}

export const openalexConnector = makeLegacyConnector({
  id: 'openalex', name: 'OpenAlex', fn: searchOpenAlex,
  capabilities: { subject_heading_search: false },
});

export const europepmcConnector = makeLegacyConnector({
  id: 'europepmc', name: 'Europe PMC', fn: searchEuropePmc,
  capabilities: { subject_heading_search: true },
});

export const coreConnector = makeLegacyConnector({
  id: 'core', name: 'CORE', fn: searchCore,
  capabilities: { citation_count: false },
});

export const semanticscholarConnector = makeLegacyConnector({
  id: 'semanticscholar', name: 'Semantic Scholar', fn: searchSemanticScholar,
  capabilities: {},
});
