// Connector Registry — M0 §A4 + §12.1.
// Điểm vào duy nhất để lấy connector theo id / theo chế độ tìm (discovery|evidence)
// và chạy một lượt tìm nhiều nguồn có Evidence Coverage Manifest.

import {
  CONNECTOR_STATUS, EXECUTION_STATUS, COVERAGE_STATE, runConnectorSearch,
} from './contract.js';
import {
  openalexConnector, europepmcConnector, coreConnector, semanticscholarConnector,
} from './legacy-sources.js';
import { pubmedConnector } from './pubmed.js';
import { crossrefConnector } from './crossref.js';
import { clinicaltrialsConnector } from './clinicaltrials.js';
import {
  wanfangConnector, sinomedConnector, cnkiConnector, vipConnector, ictrpConnector,
} from './skeletons.js';
import { dedupeRecords } from '../canonical-record.js';

const ALL = [
  // approved — Discovery
  openalexConnector, europepmcConnector, coreConnector, semanticscholarConnector,
  // approved — Evidence (mới ở M1)
  pubmedConnector, crossrefConnector, clinicaltrialsConnector,
  // blocked — skeleton
  wanfangConnector, sinomedConnector, cnkiConnector, vipConnector, ictrpConnector,
];

const BY_ID = new Map(ALL.map((c) => [c.id, c]));

// Nhóm nguồn theo chế độ (M0 §11.1). Chỉ liệt kê id 'approved' để chạy mặc định;
// skeleton vẫn xuất hiện trong registry để manifest ghi 'not_licensed'.
export const MODE_SOURCES = Object.freeze({
  discovery: ['openalex', 'europepmc', 'semanticscholar', 'core', 'crossref'],
  evidence: ['pubmed', 'europepmc', 'crossref', 'clinicaltrials', 'openalex'],
});

export function getConnector(id) {
  return BY_ID.get(id) || null;
}

export function listConnectors() {
  return ALL.map((c) => ({
    id: c.id,
    name: c.name,
    access_type: c.access_type,
    connector_version: c.connector_version,
    status: c.status,
    capabilities: c.capabilities,
    note: c.note || null,
  }));
}

/**
 * Chạy một lượt tìm nhiều nguồn.
 * @param {string} query - truy vấn đã dịch/expand (chuỗi gửi đi)
 * @param {object} opts
 * @param {'discovery'|'evidence'} opts.mode
 * @param {string[]} [opts.sources] - override danh sách id; mặc định theo mode
 * @param {object} [opts.filters] - page, perPage, yearFrom, yearTo, openAccessOnly, sort, docType
 * @returns {Promise<{ records, manifest, coverage_state }>}
 *   - records: CanonicalResearchRecord[] đã dedup identity-graph
 *   - manifest: [{ connector_id, connector_version, execution_status, retrieved_count, duration_ms, error_detail? }]
 *   - coverage_state: 'complete' | 'partial' | 'incomplete'  (thô ở M1; policy engine ở A7 tinh chỉnh)
 */
export async function runSearch(query, { mode = 'discovery', sources, filters = {} } = {}) {
  const requested = (sources && sources.length ? sources : MODE_SOURCES[mode] || MODE_SOURCES.discovery);
  const manifest = [];
  const bag = [];

  // chạy song song, mỗi connector tự có timeout (contract.DEFAULT_TIMEOUT_MS)
  await Promise.all(
    requested.map(async (id) => {
      const c = BY_ID.get(id);
      if (!c) {
        manifest.push({ connector_id: id, connector_version: null, execution_status: EXECUTION_STATUS.NOT_SEARCHED, retrieved_count: 0, duration_ms: 0, error_detail: 'unknown connector id' });
        return;
      }
      const res = await runConnectorSearch(c, () => c.search(query, filters));
      manifest.push({
        connector_id: c.id,
        connector_version: c.connector_version,
        execution_status: res.execution_status,
        retrieved_count: res.retrieved_count,
        duration_ms: res.duration_ms,
        ...(res.error_detail ? { error_detail: res.error_detail } : {}),
      });
      for (const rec of res.records) bag.push(rec);
    })
  );

  // các connector approved KHÔNG được yêu cầu trong lượt này → ghi 'not_searched' để manifest đầy đủ
  for (const c of ALL) {
    if (!requested.includes(c.id) && c.status === CONNECTOR_STATUS.APPROVED) {
      manifest.push({
        connector_id: c.id, connector_version: c.connector_version,
        execution_status: EXECUTION_STATUS.NOT_SEARCHED, retrieved_count: 0, duration_ms: 0,
      });
    }
  }

  const records = dedupeRecords(bag);
  return { records, manifest, coverage_state: coarseCoverage(manifest) };
}

// coverage_state thô ở M1: complete nếu MỌI nguồn được yêu cầu đều success;
// partial nếu có ít nhất 1 success nhưng cũng có nguồn timeout/unavailable/not_licensed;
// incomplete nếu không nguồn nào success. (A7 policy engine sẽ thay bằng đánh giá theo hồ sơ câu hỏi.)
function coarseCoverage(manifest) {
  const requested = manifest.filter((m) => m.execution_status !== EXECUTION_STATUS.NOT_SEARCHED);
  if (!requested.length) return COVERAGE_STATE.INCOMPLETE;
  const ok = requested.filter((m) => m.execution_status === EXECUTION_STATUS.SUCCESS);
  if (ok.length === requested.length) return COVERAGE_STATE.COMPLETE;
  if (ok.length === 0) return COVERAGE_STATE.INCOMPLETE;
  return COVERAGE_STATE.PARTIAL;
}
