// Adapter SKELETON cho các nguồn Trung văn + trial registry TQ.
// M0 §12.1 / §B3: official API có thể tồn tại nhưng quyền dùng cho Chimedis CHƯA xác minh
// (Wanfang) hoặc chưa rõ (SinoMed/CNKI/VIP). ChiCTR đi gián tiếp qua WHO ICTRP (chưa có quyền).
//
// KHÔNG gọi API thật. KHÔNG secret trong repo. search() ném lỗi rõ ràng.
// Khi có key/agreement + test call Trung Y thành công → chuyển status thành 'approved'
// và implement search()/normalize() thật (M2 track code).

import { CONNECTOR_STATUS, ConnectorNotLicensedError } from './contract.js';

function makeSkeleton({ id, name, status, note, capabilities = {} }) {
  return {
    id,
    name,
    access_type: 'licensed_api',
    connector_version: 'skeleton-0',
    status,
    note,
    capabilities: {
      keyword_search: true,
      subject_heading_search: false,
      full_metadata: false,
      abstract: true,
      citation_count: false,
      trial_registry: false,
      full_text_link: false,
      ...capabilities,
    },
    async search() {
      throw new ConnectorNotLicensedError(id);
    },
    async fetchRecord() {
      throw new ConnectorNotLicensedError(id);
    },
    async healthCheck() {
      return { ok: false, status, detail: note };
    },
    normalize() {
      throw new ConnectorNotLicensedError(id);
    },
  };
}

export const wanfangConnector = makeSkeleton({
  id: 'wanfang',
  name: '万方数据 / Wanfang',
  status: CONNECTOR_STATUS.BLOCKED_PENDING_LICENSE,
  note:
    'official_api_exists=true (api.wanfangdata.com.cn/reader/papers, header X-Ca-*); ' +
    'access/license cho Chimedis CHƯA xác minh — xem docs Phụ lục D.',
});

export const sinomedConnector = makeSkeleton({
  id: 'sinomed',
  name: 'SinoMed / 中国生物医学文献服务系统',
  status: CONNECTOR_STATUS.BLOCKED_PENDING_LICENSE,
  note: 'Chưa xác minh public API; cần hỏi institutional/data-service API.',
});

export const cnkiConnector = makeSkeleton({
  id: 'cnki',
  name: 'CNKI / 中国知网',
  status: CONNECTOR_STATUS.BLOCKED_PENDING_LICENSE,
  note: 'Chưa có bằng chứng public API; cần đàm phán licensed/institutional. Không scrape.',
});

export const vipConnector = makeSkeleton({
  id: 'vip',
  name: '维普 / VIP',
  status: CONNECTOR_STATUS.BLOCKED_PENDING_LICENSE,
  note: 'Cần xác minh data/API agreement chính thức trước khi tích hợp.',
});

export const ictrpConnector = makeSkeleton({
  id: 'ictrp',
  name: 'WHO ICTRP (gồm ChiCTR)',
  status: CONNECTOR_STATUS.BLOCKED_PENDING_ACCESS,
  note: 'Có Search Portal Web Service cho tổ chức nghiên cứu; quyền/chi phí phải xin trực tiếp. Không scrape.',
  capabilities: { trial_registry: true },
});
