# M0 — Architecture Freeze — Research Workbench

> **Mục đích:** đóng băng các contract & chốt 12 quyết định mở trước khi viết code M1.
> Đọc kèm: [`research-workbench-plan.md`](research-workbench-plan.md) v2.1 (lý do & bối cảnh) · [`research-workbench-review-2026-09-06.md`](research-workbench-review-2026-09-06.md) (phản biện).
>
> - Trạng thái: **APPROVED WITH ABOVE CHANGES** — reviewer phương pháp đã duyệt (PR #1, 2026-09-06). Đã áp 5 sửa đổi PHẦN I + chốt PHẦN B. Tag `m0-frozen`.
> - Nhánh kế hoạch: `plan/research-workbench` · PR: `tmh2388/chimedis-home#1` · Nhánh code: `impl/workbench-m1`
> - Lập: 2026-09-06 (Claude) · Reviewer duyệt: 2026-09-06
>
> **Nguyên tắc freeze:** sau tag `m0-frozen`, thay đổi contract PHẦN A phải qua "change request" ghi vào PR + tăng version contract (`_v1` → `_v2`). Không tiếp tục phản biện kiến trúc tổng thể trừ khi implementation làm lộ lỗi contract thực sự.

---

## PHẦN A — Contract đóng băng

### A1. Research Lifecycle (14 stage) — `lifecycle_v1`

```
0 Orientation · 1 Discovery · 2 Research Question · 3 Gap Verification · 4 Protocol
5 Evidence · 6 Study Design · 7 Analysis Plan · 8 Ethics & Registration · 9 Conduct/Data
10 Analysis · 11 Writing/Reporting · 12 Publication/Submission · 13 Archive/Provenance
```

- **14 stage CHỈ là taxonomy / điều hướng, KHÔNG phải khoá workflow tuyến tính** *(sửa theo reviewer I.1)*.
- **KHÔNG** dùng `wb_projects.stage = 0..13` bắt buộc. Thay bằng `wb_projects.current_focus` (**nullable**, kiểu VARCHAR nhận một trong 14 mã stage hoặc NULL) — chỉ để gợi ý "người dùng đang tập trung ở đâu", không chặn thao tác.
- **Mỗi module/entity có `status` riêng** (research question, search run, gap candidate, draft…). Người dùng được quay lại sửa Research Question / Protocol / Search / Analysis Plan **bất kỳ lúc nào**, không theo thứ tự.
- **KHÔNG** dùng decimal sub-stage (`5.1`…) để mô phỏng workflow.
- Mọi entity sinh dữ liệu mang `project_id`; khi liên quan mang thêm `research_question_id` và/hoặc `search_run_id`. Không entity "mồ côi".

**Trạng thái:** ✅ APPROVED WITH CHANGES (reviewer I.1 đã áp)

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

**Trạng thái:** ✅ APPROVED

### A3. `search_runs` — `provenance_v1` (BẤT BIẾN)

Ghi một lần, không `UPDATE`. Trường: xem [plan §5.1](research-workbench-plan.md#51-search_runs-bất-biến) + Phụ lục B `wb_search_runs`. Bổ sung chốt:

- `mode ∈ {discovery, evidence}`.
- `query_expanded` (JSON) **bắt buộc** ghi đầy đủ mọi biến thể đã gửi đi từng nguồn (VN / 中文 / EN / MeSH / pinyin), kể cả khi rỗng.
- `query_version` = hash ngắn của logic `buildSearchQuery` + `prompt_version` tại thời điểm chạy.
- Mọi `gap_candidate`, `evidence_extraction`, `claim` **phải** trỏ `search_run_id`. Thiếu ⇒ không hiển thị như kết luận học thuật.
- **Search Log export** (Markdown + `.docx`) là deliverable M1, không hoãn.
- **Evidence Coverage Manifest** *(bổ sung theo reviewer I.4)* — mỗi `search_run` ghi bảng con `wb_search_run_sources`: với **từng connector** lưu `execution_status ∈ {success, partial, timeout, unavailable, not_licensed, not_searched}` + `retrieved_count` + `duration_ms` + `error_detail?`. **Cấm** coi một run có connector `timeout/unavailable/not_licensed/not_searched` là "đầy đủ". `search_run.coverage_state ∈ {complete, partial, incomplete}` tính từ manifest + Minimum Source Policy áp dụng (xem A7).

**Trạng thái:** ✅ APPROVED WITH CHANGES (reviewer I.4 đã áp)

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
- **Mỗi lượt gọi connector trả `{ execution_status, records[], retrieved_count, duration_ms, error_detail? }`** để dựng Evidence Coverage Manifest (A3). Connector timeout/lỗi **không** làm hỏng cả run — ghi `execution_status` tương ứng, run tiếp tục, `coverage_state` phản ánh trung thực.

**Trạng thái:** ✅ APPROVED WITH CHANGES (reviewer I.4 đã áp)

### A5. Gap state machine — `gap_v1` *(sửa theo reviewer I.2)*

```
candidate → searched → evidence-assessed → reviewed → accepted / rejected
        (bất kỳ trạng thái nào) → rejected
```

- **Bỏ `expert-verified`.** `reviewed` = đã có người review (không mang nghĩa "chứng minh chân lý").
- `accepted` **chỉ có nghĩa `accepted_for_project`** (chủ project chấp nhận để tiếp tục làm), **KHÔNG** phải "Chimedis xác nhận tuyệt đối đây là khoảng trống của khoa học".
- **MVP v1 chỉ đi tới `candidate`.** Không expose nhãn "Verified Gap" / "khoảng trống đã xác minh" khi verification workflow (`searched → evidence-assessed → reviewed`) chưa được implement (M4+).
- Nhãn UI ở v1: **"Khoảng trống ứng viên / 候选研究空白"** — luôn kèm "trong tập tài liệu được truy xuất (search_run #…, ngày …)". Không bao giờ khẳng định tuyệt đối "chưa có".
- Điều kiện `→ accepted_for_project` (khi verification có ở M4+): Minimum Source Policy (A7) đạt + `coverage_state = complete` + checklist guardrail xong. `coverage_state ≠ complete` ⇒ trạng thái `coverage_incomplete`, **không** cho `accepted_for_project`.

**Trạng thái:** ✅ APPROVED WITH CHANGES (reviewer I.2 đã áp)

### A6. Guideline Registry — `guideline_v1` *(sửa theo reviewer I.5)*

Schema `wb_guideline_registry` ([plan Phụ lục B](research-workbench-plan.md#24-phụ-lục-b-tập-con-schema-cho-mvp-v1)) — **thêm cột `effective_from`, `superseded_by`, `is_current`**.

- **KHÔNG** mặc định dùng guideline cũ khi đã có bản thay thế. Lưu bản cũ chỉ để lịch sử/tương thích; `is_current = 0` cho bản đã bị thay.
- UI mặc định chọn **bản hiện hành** (`is_current = 1`) phù hợp `study_type`.
- Seed M5: **chỉ guideline đã xác minh nguồn chính thức** — `prisma-2020`, `strobe`, `care`, `consort-2010`, `spirit-2013`, `stricta-2010`, `consort-chm-2017`. Bản 2025 (`consort-2025`, `spirit-2025`) chỉ seed khi xác minh được bản chính thức + link EQUATOR. **KHÔNG** tự đặt "CONSORT TCM" nếu không có nguồn chuẩn *(reviewer B8)*.
- Luôn kèm `canonical_source_url` (EQUATOR) + ghi chú "đối chiếu bản gốc".

**Trạng thái:** ✅ APPROVED WITH CHANGES (reviewer I.5 + B8 đã áp)

### A7. Minimum Source Policy — `source_policy_v1` *(sửa theo reviewer I.3 — policy engine, không phải hard rule)*

Không còn quy tắc cứng "TCM ⇒ bắt buộc nguồn Trung văn". Thay bằng **policy theo (loại câu hỏi × domain × geography)**:

| Hồ sơ câu hỏi | Nguồn tối thiểu để `coverage_state = complete` |
|---|---|
| Can thiệp TCM / châm cứu / thảo dược (lâm sàng) | PubMed + nguồn Trung văn phù hợp + trial registry (ClinicalTrials.gov và/hoặc ChiCTR/ICTRP) |
| In-vitro / animal (cơ chế, dược lý tiền lâm sàng) | PubMed + Europe PMC (+ nguồn Trung văn nếu chủ đề là vị thuốc Trung y). **KHÔNG** bắt ClinicalTrials.gov |
| Câu hỏi population / bối cảnh Việt Nam | PubMed + Europe PMC + nguồn Việt. Nguồn Trung văn **không mặc định bắt buộc** nếu không liên quan trực tiếp |
| Văn hiến / lý luận YHCT | Nguồn Trung văn + CNKI/维普 khi có + nguồn Việt |
| Chủ đề chung / chưa phân loại được | Không đủ điều kiện `complete`; tối đa `partial` |

- Policy lưu dạng cấu hình (`lib/source-policy.js`), có version. Khi coverage chưa đạt policy tương ứng → `coverage_state = incomplete` / `partial`, chặn `accepted_for_project`.
- Việc gán "hồ sơ câu hỏi" ở v1: người dùng tự chọn khi tạo Research Question (dropdown); M4+ có thể LLM gợi ý.

**Trạng thái:** ✅ APPROVED WITH CHANGES (reviewer I.3 + B5 đã áp)

---

## PHẦN B — 12 quyết định — **ĐÃ CHỐT** (reviewer, PR #1, 2026-09-06)

### B1 — Ranh giới MVP v1 — ✅ DUYỆT
v1 = M0 + M1 + M3 + M4 **tới Gap Candidate** + M5 lớp tĩnh. Không: verification tự động, full appraisal, protocol builder tương tác, claim-writing, statistics/journal/chat-PDF, connector Trung văn production.

### B2 — Trần ngân sách LLM — ✅ DUYỆT
Trần thử nghiệm **30 USD/tháng**. M1 **không có LLM** ⇒ quota chỉ áp dụng khi **M4** bắt đầu. Admin **hard-stop khi chạm 100%**, cảnh báo 70%.

### B3 — Licensing Trung văn — ✅ DUYỆT
Track business song song, owner = **Hạ Vân Y Đạo / chủ dự án**. Wanfang = `official_api_exists=true / access_status=unverified / production_status=blocked_pending_license`. Gửi bộ 6 câu ([Phụ lục D](research-workbench-plan.md#26-phụ-lục-d-bộ-câu-hỏi-licensing-wanfang)). Không để licensing chặn M1.

### B4 — Liêm chính học thuật — ✅ DUYỆT
Định vị = **`research planning / evidence / workflow assistant`**, KHÔNG "AI viết luận văn". Khi LLM bật: AI log + disclosure + opt-in **bắt buộc**.

### B5 — Minimum sources — ✅ DUYỆT (sau khi A7 thành policy engine)
In-vitro/animal **không** cần trial registry. Xem A7 `source_policy_v1`.

### B6 — Ai `→ accepted_for_project` — ✅ DUYỆT (sửa)
**KHÔNG** dùng `role ≥ editor` như bằng chứng học thuật. `accepted_for_project` do **chủ project** quyết sau checklist. Có reviewer/supervisor → lưu assessment riêng. **Không** bắt buộc người thứ hai cho mọi project, nhưng UI **phải phân biệt `self-reviewed` vs `externally-reviewed`** (cột `review_kind` trên `wb_gap_candidates`).

### B7 — Mẫu đề cương NCS — ✅ DUYỆT (fallback)
M5 dùng template generic trước; template theo trường là **plugin/config** sau khi có mẫu thật. **Không chặn M1.**

### B8 — Guideline YHCT — ✅ DUYỆT (không chặn M1/M5)
Registry mở; **chỉ seed guideline đã xác minh nguồn chính thức**. **Không** tự đặt "CONSORT TCM" nếu không có nguồn chuẩn.

### B9 — Sync vs job — ✅ DUYỆT sync cho M1
Timeout per-connector + total timeout. Run thiếu nguồn lưu `partial` (Evidence Coverage Manifest, A3). **Không** dùng `partial` run để nâng gap lên `accepted` nếu source policy chưa đạt. Job/polling chỉ thêm **sau benchmark Hostinger**.

### B10 — `raw_response_ref` — ✅ DUYỆT hoãn (có ràng buộc)
`raw_response_ref = NULL` ở v1. **Bắt buộc** lưu để audit/re-run: `request_fingerprint`, `connector_version`, **query payload chuẩn hoá**, **retrieved IDs + count**, **timestamps** (phản ánh vào `wb_search_runs` + `wb_search_run_sources`).

### B11 — `docx`/`xlsx` — ✅ DUYỆT
Thêm `docx` + `exceljs`. **Markdown/CSV fallback bắt buộc.**

### B12 — Ollama — ✅ DUYỆT không làm v1
LLM opt-in; dữ liệu nhạy cảm không tự gửi nền; provider/retention terms hiển thị rõ.

---

## PHẦN C — Phạm vi code M1 — **CHỐT** (reviewer III)

**M1 = Search Foundation + Provenance CHỈ.** Nhánh `impl/workbench-m1`, tách khỏi `plan/*`.

1. `lib/connectors/` — registry + contract `connector_v1`; refactor OpenAlex/EuropePMC/CORE/S2 hiện có thành connector, giữ `searchAll()` cũ. Mỗi connector trả `{ execution_status, records[], retrieved_count, duration_ms, error_detail? }`.
2. Connector mới **approved**: `pubmed.js` (E-utilities, `NCBI_API_KEY`), `crossref.js` (polite pool), `clinicaltrials.js` (v2). Adapter **skeleton disabled/not-licensed**: `wanfang.js`, `sinomed.js`, `cnki.js`, `vip.js` — `search()` ném lỗi, không secret.
3. `lib/canonical-record.js` — normalize `record_v1` + identity-graph dedup.
4. `lib/search-runs.js` — ghi/đọc `provenance_v1` (bất biến) + **Evidence Coverage Manifest** (`wb_search_run_sources`) + `request_fingerprint` (B10).
5. `lib/source-policy.js` — `source_policy_v1` (A7); tính `coverage_state` cho mỗi run theo hồ sơ câu hỏi.
6. Schema (idempotent trong `db/schema.sql`): `wb_projects` (có `current_focus` nullable), `wb_research_questions` (có `question_profile`), `wb_search_runs` (có `coverage_state`, `request_fingerprint`), `wb_search_run_sources`, `wb_research_records`, `wb_record_identifiers`.
7. `routes/workbench.js` — `POST /projects`, `GET/PATCH/DELETE /projects/:id`, `POST /projects/:id/questions`, `POST /projects/:id/search`, `GET /projects/:id/search-runs`, `GET /projects/:id/search-log?fmt=md|docx|csv`. Tất cả `requireUser`.
8. UI tối thiểu: nút "Lưu vào dự án" + "Tạo dự án" trên bảng kết quả khi đã đăng nhập; trang dự án liệt kê search-runs + coverage manifest + tải Search Log. `docx` + `exceljs` vào `package.json` (Markdown/CSV fallback).

**Không có trong M1:** LLM, gap-analysis, evidence matrix, appraisal, verified gap, protocol builder, China production connector.

**Hậu kiểm bắt buộc trước khi mở M2/M3:** provenance đầy đủ · connector-failure không làm hỏng run (đánh dấu đúng manifest) · dedup identity-graph đúng trên mẫu thật.

---

## Điều kiện bắt đầu code (reviewer IV) — ✅ ĐỦ

1. ✅ Tài liệu M0 đã sửa đúng 5 điểm PHẦN I (A1, A5, A7, A3/A4, A6).
2. ✅ A1–A7 + B1/B9/B11 đánh dấu APPROVED.
3. ✅ Chữ ký reviewer phương pháp = **APPROVED WITH ABOVE CHANGES** (PR #1 comment 2026-09-06).
4. ⏭ Commit M0 cuối → tag `m0-frozen`.
5. ⏭ Mở `impl/workbench-m1`, làm đúng 8 hạng mục PHẦN C.

> Sau mốc này **không tiếp tục phản biện kiến trúc tổng thể** trừ khi implementation làm lộ lỗi contract thực sự. Mục tiêu: hoàn thành M1 → test → hậu kiểm → mới mở M2/M3.

## Chữ ký

| Vai trò | Tên | Ngày | Duyệt PHẦN A | Duyệt PHẦN B |
|---|---|---|---|---|
| Chủ dự án | *(chờ tick trên PR)* | | ⬜ | ⬜ |
| Reviewer phương pháp | APPROVED WITH ABOVE CHANGES | 2026-09-06 | ✅ | ✅ |

*Tag `m0-frozen` đặt tại commit áp dụng 5 sửa đổi PHẦN I + chốt PHẦN B.*
