// M0 contract `source_policy_v1` — Minimum Source Policy (thay hard rule "TCM ⇒ bắt buộc Trung văn").
// Xem docs/research-workbench-M0-architecture-freeze.md §A7.
//
// Người dùng gán "hồ sơ câu hỏi" khi tạo Research Question (dropdown). Mỗi hồ sơ có
// danh sách "nhóm nguồn tối thiểu" cần đạt execution_status=success thì coverage mới `complete`.
// Nhóm nguồn = mảng id connector; đạt nhóm nếu ÍT NHẤT một id trong nhóm success.

import { EXECUTION_STATUS, COVERAGE_STATE } from './connectors/contract.js';

export const POLICY_VERSION = 'source_policy_v1';

export const QUESTION_PROFILES = Object.freeze({
  'tcm-clinical': {
    label: 'Can thiệp TCM / châm cứu / thảo dược (lâm sàng)',
    minimum_groups: [
      ['pubmed'],
      ['wanfang', 'sinomed', 'cnki', 'vip'],        // "nguồn Trung văn phù hợp"
      ['clinicaltrials', 'ictrp'],                   // trial registry
    ],
  },
  'preclinical': {
    label: 'In-vitro / animal (cơ chế, dược lý tiền lâm sàng)',
    minimum_groups: [
      ['pubmed'],
      ['europepmc', 'openalex'],
    ],
    // KHÔNG bắt ClinicalTrials.gov; nguồn Trung văn chỉ khuyến nghị (không bắt buộc)
  },
  'vn-context': {
    label: 'Câu hỏi population / bối cảnh Việt Nam',
    minimum_groups: [
      ['pubmed'],
      ['europepmc', 'openalex'],
    ],
  },
  'tcm-literature': {
    label: 'Văn hiến / lý luận YHCT',
    minimum_groups: [
      ['wanfang', 'sinomed', 'cnki', 'vip'],
    ],
  },
  'general': {
    label: 'Chủ đề chung / chưa phân loại được',
    minimum_groups: [],           // không có nhóm bắt buộc
    max_coverage: COVERAGE_STATE.PARTIAL, // trần: không bao giờ đạt 'complete'
  },
});

export function isValidProfile(id) {
  return Object.prototype.hasOwnProperty.call(QUESTION_PROFILES, id);
}

/**
 * Đánh giá coverage_state của một search_run theo hồ sơ câu hỏi + manifest.
 * @param {string} profileId
 * @param {Array<{connector_id, execution_status}>} manifest
 * @returns {{ coverage_state, satisfied_groups, unmet_groups }}
 */
export function evaluateCoverage(profileId, manifest) {
  const profile = QUESTION_PROFILES[profileId] || QUESTION_PROFILES.general;
  const successIds = new Set(
    manifest.filter((m) => m.execution_status === EXECUTION_STATUS.SUCCESS).map((m) => m.connector_id)
  );
  const anySuccess = successIds.size > 0;

  const satisfied_groups = [];
  const unmet_groups = [];
  for (const group of profile.minimum_groups) {
    if (group.some((id) => successIds.has(id))) satisfied_groups.push(group);
    else unmet_groups.push(group);
  }

  let coverage_state;
  if (!anySuccess) coverage_state = COVERAGE_STATE.INCOMPLETE;
  else if (unmet_groups.length === 0) coverage_state = COVERAGE_STATE.COMPLETE;
  else if (satisfied_groups.length > 0) coverage_state = COVERAGE_STATE.PARTIAL;
  else coverage_state = COVERAGE_STATE.INCOMPLETE;

  // trần cho hồ sơ 'general'
  if (profile.max_coverage === COVERAGE_STATE.PARTIAL && coverage_state === COVERAGE_STATE.COMPLETE) {
    coverage_state = COVERAGE_STATE.PARTIAL;
  }

  return { coverage_state, satisfied_groups, unmet_groups, policy_version: POLICY_VERSION };
}
