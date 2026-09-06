# M0 — Architecture Freeze — Research Workbench

> **Mục đích:** đóng băng các contract & chốt 12 quyết định mở trước khi viết code M1.
> Đọc kèm: [`research-workbench-plan.md`](research-workbench-plan.md) v2.1 (lý do & bối cảnh) · [`research-workbench-review-2026-09-06.md`](research-workbench-review-2026-09-06.md) (phản biện).
>
> - Trạng thái: **DỰ THẢO — chờ ký duyệt.** Mỗi mục ⬜ = chưa duyệt, ✅ = đã duyệt.
> - Nhánh: `plan/research-workbench` · PR: `tmh2388/chimedis-home#1`
> - Lập: 2026-09-06 (Claude)
> - Người ký: __________ (chủ dự án) · __________ (reviewer phương pháp)
>
> **Nguyên tắc freeze:** sau khi ký, thay đổi contract ở phần A phải qua "change request" ghi vào PR, tăng số version contract. Phần B (quyết định) đổi tự do trước khi code M1 bắt đầu.

---

## PHẦN A — Contract đóng băng

### A1. Research Lifecycle (14 stage) — `lifecycle_v1`

```
0 Orientation · 1 Discovery · 2 Research Question · 3 Gap Verification · 4 Protocol
5 Evidence · 6 Study Design · 7 Analysis Plan · 8 Ethics & Registration · 9 Conduct/Data
10 Analysis · 11 Writing/Reporting · 12 Publication/Submission · 13 Archive/Provenance
```

- `wb_projects.stage` = số nguyên 0..13. Không xoá/đổi nghĩa stage; chỉ được thêm sub-stage dạng thập phân (vd `5.1`) nếu cần, không phá thứ tự.
- Mọi entity sinh dữ liệu mang `project_id`; khi liên quan mang thêm `research_question_id` và/hoặc `search_run_id`. Không entity "mồ côi".

**Trạng thái:** ⬜

### A2. `CanonicalResearchRecord` — `record_v1`

| Nhóm | Trường | Bắt buộc |
|---|---|---|
| Nhận dạng | `source`, `external_id` | ✔ |
| ID chéo | `identifiers{doi?, pmid?, pmcid?, trial_reg_id?, openalex?, s2?, core?, wanfang?, cnki?}` | ≥1 |
| Nội dung | `title` | ✔ |
| | `abstract`, `authors[]`, `affiliations[]`, `journal`, `year`, `language` | — |
| Phân loại | `publication_type`, `study_type`, `subject_headings[]`, `keywords[]` | — |
| Cờ | `flags{retracted?, correction?, updated?}` | — |
| Toàn văn | `oa_status`, `full_text_links[]` | — |
| Provenance | `provenance{connector, connector_version, search_run_id, retrieved_at}` | ✔ |

- Chuẩn hoá về **CSL-JSON** cho phần thư mục (xuất trích dẫn). `study_type` theo bộ enum cố định: `rct · nrsi · cohort · case-control · cross-sectional · case-series · case-report · systematic-review · meta-analysis · narrative-review · guideline · in-vitro · animal · other · unknown`.
- **Dedup = identity graph:** hợp nhất khi trùng bất kỳ `doi | pmid | pmcid | trial_reg_id`, hoặc (`title` chuẩn hoá + `year`) khớp mờ ≥ ngưỡng. Không hợp nhất chỉ bằng `external_id` một nguồn.

**Trạng thái:** ⬜

### A3. `search_runs` — `provenance_v1` (BẤT BIẾN)

Ghi một lần, không `UPDATE`. Trường: xem [plan §5.1](research-workbench-plan.md#51-search_runs-bất-biến) + Phụ lục B `wb_search_runs`. Bổ sung chốt:

- `mode ∈ {discovery, evidence}`.
- `query_expanded` (JSON) **bắt buộc** ghi đầy đủ mọi biến thể đã gửi đi từng nguồn (VN / 中文 / EN / MeSH / pinyin), kể cả khi rỗng.
- `query_version` = hash ngắn của logic `buildSearchQuery` + `prompt_version` tại thời điểm chạy.
- Mọi `gap_candidate`, `evidence_extraction`, `claim` **phải** trỏ `search_run_id`. Thiếu ⇒ không hiển thị như kết luận học thuật.
- **Search Log export** (Markdown + `.docx`) là deliverable M1, không hoãn.

**Trạng thái:** ⬜

### A4. `SearchConnector` contract — `connector_v1`

```
SearchConnector {
  id, name
  access_type: open_api | licensed_api | institutional | registry
  connector_version
  capabilities: { keyword_search, subject_heading_search, full_metadata,
                  abstract, citation_count, trial_registry, full_text_link }
  status: approved | candidate | blocked_pending_license | blocked_pending_access | disabled
  search(query, filters) -> raw[]        // chỉ chạy khi status == approved
  fetchRecord(externalId) -> raw
  healthCheck() -> { ok, status, detail }
  normalize(raw) -> CanonicalResearchRecord
}
```

- Connector `status != approved` ⇒ `search()` ném `ConnectorNotLicensedError` / `ConnectorNotConfiguredError`, `healthCheck()` trả `disabled`. **Không secret trong repo.**
- Registry ở `lib/connectors/index.js`; `searchAll()` cũ giữ nguyên chữ ký, gọi qua registry.
- Connector Status Registry ban đầu: xem [plan §12.1](research-workbench-plan.md#121-connector-status-registry-trạng-thái-chuẩn-hoá-chốt-ở-m0).

**Trạng thái:** ⬜

### A5. Gap state machine — `gap_v1`

```
hypothesized → searched → evidence-mapped → expert-verified → accepted
        (bất kỳ trạng thái nào) → rejected
```

- Nhãn UI khi chưa `accepted`: **"Khoảng trống ứng viên / 候选研究空白"**. Chỉ `accepted` mới gọi "Verified Gap".
- Ngôn từ hệ thống: luôn "trong tập tài liệu được truy xuất (search_run #…, ngày …)", không bao giờ khẳng định tuyệt đối "chưa có".
- Hard guardrails để lên `accepted`: xem [plan §6.3](research-workbench-plan.md#63-hard-guardrails-cho-verified-gap). Guardrail Trung văn (§6.3.6) là **chặn cứng**.

**Trạng thái:** ⬜

### A6. Guideline Registry — `guideline_v1`

Schema `wb_guideline_registry` ([plan Phụ lục B](research-workbench-plan.md#24-phụ-lục-b-tập-con-schema-cho-mvp-v1)). Seed tối thiểu M5: `prisma-2020`, `strobe`, `care`, `consort-2010`, `consort-2025?`, `spirit-2013`, `spirit-2025?`, `stricta-2010`, `consort-chm-2017`. Quan hệ `parent_id`/`relationship` cho extension. Luôn kèm `canonical_source_url` (EQUATOR) + ghi chú "đối chiếu bản gốc".

**Trạng thái:** ⬜

### A7. Tập nguồn tối thiểu theo domain — `domain_sources_v1`

| Loại câu hỏi | Nguồn tối thiểu cho `accepted` |
|---|---|
| Can thiệp lâm sàng (thuốc/châm cứu/phác đồ) | PubMed + Europe PMC + ≥1 Trung văn + ClinicalTrials.gov + ChiCTR/ICTRP |
| Dược liệu / cơ chế | PubMed + Europe PMC + ≥1 Trung văn (+ OpenAlex/S2 độ phủ) |
| Văn hiến / lý luận YHCT | ≥1 Trung văn + CNKI/维普 khi có + nguồn Việt |
| Chủ đề chung / chưa rõ | Chỉ đạt `evidence-mapped`, không cho `accepted` |

**Trạng thái:** ⬜

---

## PHẦN B — 12 quyết định (đề xuất của Claude + chờ chốt)

> Ký hiệu: **[ĐX]** = đề xuất khuyến nghị · **[CHỜ]** = cần chủ dự án / reviewer quyết.

### B1 — Ranh giới MVP v1
**[ĐX]** Chấp nhận đường cắt ở [plan §20](research-workbench-plan.md#20-ranh-giới-mvp-v1-đề-xuất): v1 = M0 + M1 + M3 + M4(tới `candidate`, verification thủ công) + M5(Lớp 1 tĩnh). Loại khỏi v1: verification tự động lên `accepted`, bộ appraisal đầy đủ, protocol builder tương tác, claim-writing (M6), nguồn Trung văn (M2), statistics/journal/reviewer/chat-PDF.
**Rủi ro nếu mở rộng:** đúng cảnh báo phản biện R8 (phình phạm vi). **Trạng thái:** ⬜

### B2 — Trần ngân sách LLM
**[CHỜ]** Đề nghị chốt một con số USD/tháng cứng để đặt `WORKBENCH_DAILY_LLM_QUOTA`. **[ĐX]** khởi điểm: **30 USD/tháng**, quota mặc định 8 gap-analysis + 15 query-expansion / user / ngày, miễn phí cho user trong giai đoạn thử nghiệm kín; đánh giá lại sau 8 tuần. Bảng `wb_ai_runs` + cảnh báo admin khi đạt 70% ngưỡng tháng. **Trạng thái:** ⬜

### B3 — Sở hữu licensing Trung văn + thứ tự M2
**[ĐX] đã phản ánh vào plan:** track business chạy **song song** từ M1 (không phải tiền đề); track code Wanfang chỉ khởi động khi connector → `approved`. **[CHỜ]** xác nhận **người chủ trì phía Hạ Vân Y Đạo** + phê duyệt gửi [bộ câu hỏi Phụ lục D](research-workbench-plan.md#26-phụ-lục-d-bộ-câu-hỏi-licensing-wanfang) tới Wanfang. **Trạng thái:** ⬜

### B4 — Định vị an toàn học thuật
**[CHỜ]** Xác nhận định vị "công cụ **lập kế hoạch + dựng khung**, KHÔNG viết hộ" đủ an toàn cho đào tạo NCS ở VN. **[ĐX]** kèm: (a) mọi đầu ra LLM gắn nhãn "bản nháp phải viết lại + tự chịu trách nhiệm"; (b) `wb_ai_runs` là nhật ký AI xuất được kèm bản thảo; (c) trang "Hướng dẫn khai báo sử dụng AI" theo ICMJE + mẫu câu cho luận án. **Trạng thái:** ⬜

### B5 — Tập nguồn tối thiểu theo domain
**[CHỜ reviewer]** Xác nhận bảng A7. Câu hỏi ngỏ: nghiên cứu **dược liệu thuần in-vitro/animal** có cần bắt buộc ClinicalTrials.gov không (đề xuất: không, nhưng vẫn cần ≥1 Trung văn). **Trạng thái:** ⬜

### B6 — Ai được chuyển `expert-verified → accepted`
**[ĐX]** Ở v1: **chỉ user có `role ≥ editor`** HOẶC chính chủ project sau khi hoàn tất checklist guardrail đầy đủ + tick xác nhận "đã có người hướng dẫn rà". Ghi `by_user` + timestamp vào `wb_gap_candidates`. **[CHỜ]** reviewer xác nhận có chấp nhận cơ chế "chủ project tự xác nhận sau checklist" không, hay bắt buộc người thứ hai. **Trạng thái:** ⬜

### B7 — Mẫu đề cương NCS
**[CHỜ]** Cần **bản mẫu thật** đề cương NCS của cơ sở đào tạo YHCT (Học viện YDHCT Việt Nam / ĐH Y Hà Nội / khác). Trước khi có: M5 dùng khung IMRaD + đề cương tổng quát theo [plan §14](research-workbench-plan.md#14-trụ-cột-b--bộ-khung-soạn-thảo-điều-chỉnh), đánh dấu "chưa khớp mẫu trường cụ thể". **Trạng thái:** ⬜

### B8 — Guideline cho nghiên cứu chứng hậu / văn hiến YHCT
**[CHỜ reviewer]** Ngoài STRICTA + CONSORT-CHM, đề xuất khảo sát: CONSORT extension for TCM (nếu có bản chính thức), tiêu chuẩn báo cáo 证候 (pattern) — reviewer cho danh mục. **Trạng thái:** ⬜

### B9 — Job + polling hay chạy đồng bộ (kỹ thuật, quan trọng)
**[ĐX]** v1: **chạy đồng bộ** cho gap-analysis (tập ≤25 record, 1 lượt LLM, ~5–15s). Với **Evidence Search nhiều nguồn** (PubMed + Crossref + CT.gov + …): giới hạn **timeout 8s/connector, tổng ≤ 25s**, connector chậm bị bỏ qua + ghi `error` vào `search_run.sources_json` (không làm hỏng cả run). Chỉ chuyển sang **job + polling** khi đo thực tế trên Hostinger vượt ngưỡng timeout HTTP. **[CHỜ]** xác nhận chấp nhận rủi ro run "thiếu nguồn" được đánh dấu rõ thay vì chờ đủ. **Trạng thái:** ⬜

### B10 — Lưu `raw_response_ref`
**[ĐX]** v1: **hoãn** lưu phản hồi thô (cần object storage Chimedis chưa có). `search_run` vẫn đủ tái lập ở mức "chạy lại truy vấn này" (đủ cho phụ lục luận văn PRISMA). Ghi `raw_response_ref = NULL`, cột giữ sẵn. Cân nhắc lưu vào MySQL `MEDIUMBLOB` gzip nếu reviewer yêu cầu tái lập chặt. **Trạng thái:** ⬜

### B11 — Dependency xuất `.docx`/`.xlsx`
**[ĐX]** M1 (Search Log) + M3 (evidence matrix): thêm `docx` + `exceljs` vào `package.json` (thuần JS, không native build, hợp Hostinger). Markdown/CSV vẫn là fallback luôn có. **Trạng thái:** ⬜

### B12 — LLM tự vận hành cho dữ liệu nhạy cảm
**[ĐX]** v1: **không** làm Ollama. Thay bằng: (a) điều khoản rõ "đề tài của bạn được gửi tới API bên thứ ba (Anthropic) để xử lý; không dùng để huấn luyện"; (b) toàn bộ tính năng LLM **opt-in** — user bấm mới gọi, không tự chạy nền trên nội dung project; (c) ghi nhận yêu cầu Ollama vào backlog M7+ nếu có nhóm người dùng cần. **[CHỜ]** xác nhận mức này đủ. **Trạng thái:** ⬜

---

## PHẦN C — Khi PHẦN A + B đã ký: phạm vi code M1

Không bắt đầu trước khi có đủ chữ ký PHẦN A (A1–A7) + quyết định B1, B9, B11 (3 mục chặn code).

**M1 — Search Foundation + Provenance** (nhánh mới `impl/workbench-m1`, tách khỏi `plan/*`):

1. `lib/connectors/` — registry + contract `connector_v1`; refactor OpenAlex/EuropePMC/CORE/S2 hiện có thành connector, giữ `searchAll()` cũ.
2. Connector mới: `pubmed.js` (E-utilities, `NCBI_API_KEY`), `crossref.js` (polite pool), `clinicaltrials.js` (v2). Adapter skeleton `blocked_pending_license`: `wanfang.js`, `sinomed.js`, `cnki.js`, `vip.js`.
3. `lib/canonical-record.js` — normalize `record_v1` + identity-graph dedup.
4. `lib/search-runs.js` — ghi/đọc `provenance_v1` (bất biến).
5. Schema: `wb_projects`, `wb_research_questions`, `wb_search_runs`, `wb_research_records`, `wb_record_identifiers` (idempotent trong `db/schema.sql`).
6. `routes/workbench.js` — `POST /projects`, `GET/PATCH/DELETE /projects/:id`, `POST /projects/:id/questions`, `POST /projects/:id/search`, `GET /projects/:id/search-runs`, `GET /projects/:id/search-log?fmt=md|docx`. Tất cả `requireUser`.
7. UI tối thiểu: nút "Lưu vào project" + "Tạo project" trên bảng kết quả khi đã đăng nhập; trang project liệt kê search-runs + tải Search Log.
8. `docx` + `exceljs` vào `package.json`.

**Không có trong M1:** gap-analysis (M4), evidence matrix (M3), bất kỳ LLM call nào, bất kỳ connector Trung văn thật nào.

---

## Chữ ký

| Vai trò | Tên | Ngày | Duyệt PHẦN A | Duyệt PHẦN B |
|---|---|---|---|---|
| Chủ dự án | | | ⬜ | ⬜ |
| Reviewer phương pháp | | | ⬜ | ⬜ |

*Sau khi đủ chữ ký: cập nhật dòng này, gắn tag `m0-frozen` vào commit, mở nhánh `impl/workbench-m1`.*
