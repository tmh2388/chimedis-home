// ClinicalTrials.gov API v2 — trial đã/đang đăng ký. Cực quan trọng để tránh "gap giả":
// có thể chưa có bài báo nhưng trial đã đăng ký/đang chạy (M0 §A5, §A7).
// status = approved, không cần khoá.
// Docs: https://clinicaltrials.gov/data-api/api

import { CONNECTOR_STATUS, fetchJson } from './contract.js';
import { toCanonicalRecord } from '../canonical-record.js';

const BASE = 'https://clinicaltrials.gov/api/v2/studies';
const CV = 'ctgov-v2-1';

async function search(query, filters = {}) {
  const pageSize = Math.min(filters.perPage || 20, 50);
  const params = new URLSearchParams({
    'query.term': String(query || ''),
    pageSize: String(pageSize),
    countTotal: 'false',
    fields: [
      'NCTId', 'BriefTitle', 'OfficialTitle', 'OverallStatus', 'StartDate',
      'CompletionDate', 'StudyType', 'Phase', 'Condition', 'InterventionName',
      'LeadSponsorName', 'LocationCountry', 'StudyFirstPostDate',
    ].join(','),
  });
  const data = await fetchJson(`${BASE}?${params.toString()}`);
  const studies = data?.studies || [];

  return studies.map((s) => {
    const idm = s.protocolSection?.identificationModule || {};
    const status = s.protocolSection?.statusModule || {};
    const design = s.protocolSection?.designModule || {};
    const cond = s.protocolSection?.conditionsModule || {};
    const arms = s.protocolSection?.armsInterventionsModule || {};
    const sponsor = s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || null;
    const nct = idm.nctId;
    const postYear = status.studyFirstPostDateStruct?.date
      ? parseInt(String(status.studyFirstPostDateStruct.date).slice(0, 4), 10) || null
      : null;
    return toCanonicalRecord({
      source: 'clinicaltrials',
      external_id: nct,
      identifiers: { trial_reg_id: nct },
      title: idm.briefTitle || idm.officialTitle || '(trial không tên)',
      abstract: [
        cond.conditions?.length ? `Điều kiện: ${cond.conditions.join(', ')}.` : '',
        arms.interventions?.length ? `Can thiệp: ${arms.interventions.map((i) => i.name).filter(Boolean).join(', ')}.` : '',
        status.overallStatus ? `Trạng thái: ${status.overallStatus}.` : '',
      ].filter(Boolean).join(' ') || null,
      authors: sponsor ? [sponsor] : [],
      journal: 'ClinicalTrials.gov',
      year: postYear,
      publication_type: design.studyType || 'trial-registration',
      study_type: design.studyType === 'INTERVENTIONAL' ? 'rct' : 'unknown',
      keywords: cond.conditions || [],
      full_text_links: nct ? [`https://clinicaltrials.gov/study/${nct}`] : [],
    }, { connector: 'clinicaltrials', connector_version: CV });
  });
}

export const clinicaltrialsConnector = {
  id: 'clinicaltrials',
  name: 'ClinicalTrials.gov (API v2)',
  access_type: 'registry',
  connector_version: CV,
  status: CONNECTOR_STATUS.APPROVED,
  capabilities: {
    keyword_search: true,
    subject_heading_search: false,
    full_metadata: true,
    abstract: true,
    citation_count: false,
    trial_registry: true,
    full_text_link: true,
  },
  search,
  async fetchRecord(nctId) {
    const data = await fetchJson(`${BASE}/${encodeURIComponent(String(nctId).toUpperCase())}`);
    return data || null;
  },
  async healthCheck() {
    try {
      await fetchJson(`${BASE}?query.term=acupuncture&pageSize=1&countTotal=false`, { timeoutMs: 5000 });
      return { ok: true, status: CONNECTOR_STATUS.APPROVED, detail: 'v2' };
    } catch (err) {
      return { ok: false, status: CONNECTOR_STATUS.APPROVED, detail: err.message };
    }
  },
  normalize(raw) {
    return toCanonicalRecord(raw, { connector: 'clinicaltrials', connector_version: CV });
  },
};
