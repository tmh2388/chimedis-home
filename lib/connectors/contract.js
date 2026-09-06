// M0 contract `connector_v1` — hằng số + lớp lỗi + helper chung cho mọi SearchConnector.
// Xem docs/research-workbench-M0-architecture-freeze.md §A4.
//
// Một SearchConnector là object:
//   {
//     id, name,
//     access_type: 'open_api' | 'licensed_api' | 'institutional' | 'registry',
//     connector_version: string,
//     status: 'approved' | 'candidate' | 'blocked_pending_license'
//           | 'blocked_pending_access' | 'disabled',
//     capabilities: { keyword_search, subject_heading_search, full_metadata,
//                     abstract, citation_count, trial_registry, full_text_link },
//     async search(query, filters) -> ConnectorRunResult,
//     async fetchRecord(externalId) -> raw | null,
//     async healthCheck() -> { ok, status, detail },
//     normalize(raw) -> CanonicalResearchRecord
//   }
//
// ConnectorRunResult (khớp Evidence Coverage Manifest — M0 §A3/§A4):
//   { execution_status, records: CanonicalResearchRecord[], retrieved_count, duration_ms, error_detail? }

export const CONNECTOR_STATUS = Object.freeze({
  APPROVED: 'approved',
  CANDIDATE: 'candidate',
  BLOCKED_PENDING_LICENSE: 'blocked_pending_license',
  BLOCKED_PENDING_ACCESS: 'blocked_pending_access',
  DISABLED: 'disabled',
});

// execution_status cho từng connector trong một search_run (M0 §A3).
export const EXECUTION_STATUS = Object.freeze({
  SUCCESS: 'success',       // gọi xong, có/không có kết quả đều tính success
  PARTIAL: 'partial',       // trả một phần (vd bị cắt do rate-limit giữa chừng)
  TIMEOUT: 'timeout',       // quá thời gian cho phép
  UNAVAILABLE: 'unavailable', // lỗi mạng / 5xx / phản hồi không hợp lệ
  NOT_LICENSED: 'not_licensed', // connector chưa được cấp phép (blocked_pending_license)
  NOT_SEARCHED: 'not_searched', // không nằm trong danh sách nguồn của lượt tìm này
});

// coverage_state của cả search_run, suy ra từ manifest + Minimum Source Policy.
export const COVERAGE_STATE = Object.freeze({
  COMPLETE: 'complete',
  PARTIAL: 'partial',
  INCOMPLETE: 'incomplete',
});

export class ConnectorError extends Error {
  constructor(message, { execution_status = EXECUTION_STATUS.UNAVAILABLE, cause } = {}) {
    super(message);
    this.name = 'ConnectorError';
    this.execution_status = execution_status;
    if (cause) this.cause = cause;
  }
}

export class ConnectorNotLicensedError extends ConnectorError {
  constructor(connectorId) {
    super(`Connector "${connectorId}" chưa được cấp phép sử dụng (blocked_pending_license).`, {
      execution_status: EXECUTION_STATUS.NOT_LICENSED,
    });
    this.name = 'ConnectorNotLicensedError';
  }
}

export class ConnectorNotConfiguredError extends ConnectorError {
  constructor(connectorId, detail) {
    super(`Connector "${connectorId}" chưa được cấu hình: ${detail || 'thiếu khoá/thiết lập'}.`, {
      execution_status: EXECUTION_STATUS.UNAVAILABLE,
    });
    this.name = 'ConnectorNotConfiguredError';
  }
}

const CONTACT_EMAIL = process.env.RESEARCH_CONTACT_EMAIL || 'contact@chimedis.vn';
export const USER_AGENT = `ChimedisWorkbench/1.0 (+https://chimedis.vn; mailto:${CONTACT_EMAIL})`;
export const DEFAULT_TIMEOUT_MS = 8000; // M0 §B9: timeout mỗi connector

/** fetch JSON có timeout riêng; ném ConnectorError với execution_status phù hợp. */
export async function fetchJson(url, { headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, method = 'GET', body } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, ...headers },
      body,
    });
    if (!res.ok) {
      const status = res.status;
      throw new ConnectorError(`HTTP ${status} khi gọi ${hostOf(url)}`, {
        execution_status: status === 429 ? EXECUTION_STATUS.PARTIAL : EXECUTION_STATUS.UNAVAILABLE,
      });
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ConnectorError(`Timeout ${timeoutMs}ms khi gọi ${hostOf(url)}`, {
        execution_status: EXECUTION_STATUS.TIMEOUT,
      });
    }
    if (err instanceof ConnectorError) throw err;
    throw new ConnectorError(`Lỗi mạng khi gọi ${hostOf(url)}: ${err.message}`, {
      execution_status: EXECUTION_STATUS.UNAVAILABLE,
      cause: err,
    });
  } finally {
    clearTimeout(timer);
  }
}

function hostOf(u) {
  try { return new URL(u).host; } catch { return String(u).slice(0, 40); }
}

/**
 * Bọc một hàm search connector: đo thời gian, bắt lỗi → ConnectorRunResult chuẩn.
 * fn phải trả về mảng CanonicalResearchRecord.
 */
export async function runConnectorSearch(connector, fn) {
  const started = Date.now();
  if (connector.status !== CONNECTOR_STATUS.APPROVED) {
    return {
      execution_status:
        connector.status === CONNECTOR_STATUS.BLOCKED_PENDING_LICENSE
          ? EXECUTION_STATUS.NOT_LICENSED
          : EXECUTION_STATUS.UNAVAILABLE,
      records: [],
      retrieved_count: 0,
      duration_ms: 0,
      error_detail: `status=${connector.status}`,
    };
  }
  try {
    const records = (await fn()) || [];
    return {
      execution_status: EXECUTION_STATUS.SUCCESS,
      records,
      retrieved_count: records.length,
      duration_ms: Date.now() - started,
    };
  } catch (err) {
    return {
      execution_status: err.execution_status || EXECUTION_STATUS.UNAVAILABLE,
      records: [],
      retrieved_count: 0,
      duration_ms: Date.now() - started,
      error_detail: err.message,
    };
  }
}
