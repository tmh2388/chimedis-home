# Chimedis — Bàn làm việc nghiên cứu (Research Workbench) — KẾ HOẠCH v2

> **Bản v2 — đã tiếp thu phản biện phương pháp.**
> Đọc kèm: [`docs/research-workbench-review-2026-09-06.md`](research-workbench-review-2026-09-06.md) (phản biện, REQUEST CHANGES).
>
> - Trạng thái: **DỰ THẢO v2 — chưa code, chưa merge. Chờ ký "M0 — Architecture freeze".**
> - Nhánh: `plan/research-workbench` · PR: `tmh2388/chimedis-home#1`
> - v1: 2026-09-06 (Claude) · v2: 2026-09-06 (Claude, sau phản biện)
> - Repo: `tmh2388/chimedis-home` (Node/Express phục vụ `chimedis.vn` + `admin.chimedis.vn`)

---

## Thay đổi lớn so với v1

| # | v1 | v2 (theo phản biện) |
|---|---|---|
| 1 | Core = `Search → Gap → Draft` | Core = **`Research Project + Evidence Provenance + Research Lifecycle`** |
| 2 | LLM trả thẳng "research gap" | LLM trả **`gap candidate`**; chỉ thành **`verified gap`** sau verification search có log đầy đủ (state machine) |
| 3 | Hiển thị "LLM confidence: cao/vừa/thấp" | Bỏ. Thay bằng **Gap Evidence Profile** — các trường kiểm chứng được |
| 4 | Không có đối tượng lưu vết tìm kiếm | **`search_runs`** là dữ liệu cấp một, **bất biến**; xuất được **Search Log / 检索记录** cho luận văn & systematic review |
| 5 | Checklist hard-code `rct → CONSORT` | **Guideline Registry** có version/extension/`superseded_by` (SPIRIT 2025, CONSORT 2025, STRICTA, CONSORT-CHM…) |
| 6 | Evidence matrix = tiện ích của phần soạn thảo | Evidence matrix = **lõi**. Luồng: `paper → extraction → appraisal → comparison → synthesis → claim → writing` |
| 7 | 1 loại "Search" | Tách **Discovery Search** (rộng, nhanh) vs **Evidence Search** (tái lập được, phục vụ verification/SR) |
| 8 | 4 nguồn, mỗi nguồn logic riêng | **Connector contract** chuẩn hoá + **`CanonicalResearchRecord`**; dedup theo **identity graph** (nhiều ID/record) |
| 9 | Nguồn: OpenAlex/EPMC/CORE/S2 | Thêm **PubMed E-utilities (độc lập)**, **ClinicalTrials.gov v2**, **Crossref**; lộ trình **Wanfang → SinoMed/CNKI/维普 (licensed)**, **ChiCTR/WHO ICTRP**. Thêm **Connector Status Registry** (§12.1): Wanfang = `official API exists; access/license unverified; blocked_pending_license` |
| 10 | Dịch 1 chiều Việt/Trung → Anh | **Multilingual query expansion**: `VN ↔ 中文规范词/同义词 ↔ EN ↔ MeSH ↔ pinyin/variant`, lưu toàn bộ trong `search_run` |
| 11 | Phụ lục = 5 bảng `wb_*` sẵn sàng code | Phụ lục = **identity/relationship model mở rộng theo vòng đời** + **tập con MVP** được đánh dấu rõ |
| 12 | Không có critical appraisal | Có **registry appraisal** (RoB 2 / ROBINS-I / AMSTAR 2 / ROBIS / QUADAS / PROBAST / GRADE) — schema-ready, chưa impl đầy đủ ở MVP |

**Không đổi** (product concept reviewer đã chấp nhận): grounded gap analysis / "đào sâu nối đất"; **không cho LLM tự sinh danh mục tài liệu tham khảo**; project workspace; evidence matrix; reporting checklists; quota/cost control; AI audit log.

---

## Mục lục

1. [Tóm tắt điều hành v2](#1-tóm-tắt-điều-hành-v2)
2. [Bối cảnh: chimedis.vn đang có gì](#2-bối-cảnh-chimedisvn-đang-có-gì)
3. [Đối tượng & nhu cầu](#3-đối-tượng--nhu-cầu)
4. [Kiến trúc khái niệm: Research Lifecycle](#4-kiến-trúc-khái-niệm-research-lifecycle)
5. [Search Provenance — đối tượng dữ liệu cấp một](#5-search-provenance--đối-tượng-dữ-liệu-cấp-một)
6. [Gap Candidate → Verified Gap: state machine & guardrails](#6-gap-candidate--verified-gap-state-machine--guardrails)
7. [Gap Evidence Profile (thay cho "LLM confidence")](#7-gap-evidence-profile-thay-cho-llm-confidence)
8. [Evidence Matrix + Claim–Evidence là lõi](#8-evidence-matrix--claimevidence-là-lõi)
9. [Critical Appraisal Registry](#9-critical-appraisal-registry)
10. [Guideline Registry](#10-guideline-registry)
11. [Kiến trúc nguồn: Discovery vs Evidence + Connector contract](#11-kiến-trúc-nguồn-discovery-vs-evidence--connector-contract)
12. [Chiến lược nguồn Trung văn & trial registry](#12-chiến-lược-nguồn-trung-văn--trial-registry)
13. [Multilingual query expansion](#13-multilingual-query-expansion)
14. [Trụ cột B — Bộ khung soạn thảo (điều chỉnh)](#14-trụ-cột-b--bộ-khung-soạn-thảo-điều-chỉnh)
15. [Kiến trúc kỹ thuật](#15-kiến-trúc-kỹ-thuật)
16. [Chi phí LLM & kiểm soát](#16-chi-phí-llm--kiểm-soát)
17. [Rủi ro & giảm thiểu](#17-rủi-ro--giảm-thiểu)
18. [Định vị cạnh tranh](#18-định-vị-cạnh-tranh)
19. [Roadmap v2 (M0–M7+)](#19-roadmap-v2-m0m7)
20. [Ranh giới MVP v1 đề xuất](#20-ranh-giới-mvp-v1-đề-xuất)
21. [Tiêu chí thành công](#21-tiêu-chí-thành-công)
22. [Quyết định còn mở — cần chốt ở M0](#22-quyết-định-còn-mở--cần-chốt-ở-m0)
23. [Phụ lục A: identity/relationship model](#23-phụ-lục-a-identityrelationship-model)
24. [Phụ lục B: tập con schema cho MVP v1](#24-phụ-lục-b-tập-con-schema-cho-mvp-v1)
25. [Phụ lục C: nguồn cần đối chiếu trước khi code connector](#25-phụ-lục-c-nguồn-cần-đối-chiếu-trước-khi-code-connector)
26. [Phụ lục D: bộ câu hỏi licensing Wanfang](#26-phụ-lục-d-bộ-câu-hỏi-licensing-wanfang)

---

## 1. Tóm tắt điều hành v2

**Đề xuất.** Bổ sung cho `chimedis.vn` một **bàn làm việc nghiên cứu** cho người dùng đã đăng ký, tổ chức quanh 3 lõi:

- **Research Project** — không gian làm việc theo đề tài, đi qua các **stage của vòng đời nghiên cứu** ([mục 4](#4-kiến-trúc-khái-niệm-research-lifecycle)).
- **Evidence Provenance** — mọi kết luận (candidate, evidence, claim) đều truy ngược được về **một `search_run` cụ thể, bất biến** ([mục 5](#5-search-provenance--đối-tượng-dữ-liệu-cấp-một)). Chimedis xuất được **Search Log** dùng cho luận văn/SR.
- **Research Lifecycle** — data model & ID cho phép mở rộng dần theo 14 stage mà không cần migration phá cấu trúc.

**Chức năng người dùng thấy ở v1:**
1. Tìm y văn (đã có) → bấm **"Phân tích khoảng trống"** → LLM trả **danh sách `gap candidate` có dẫn chứng** trong tập bài.
2. **Lưu candidate** vào project; gắn thẻ, ghi chú, trạng thái.
3. **Verification search** (đào sâu nối đất): sinh truy vấn thu hẹp → chạy Evidence Search mới trên bài thật → cập nhật **Gap Evidence Profile**. Chỉ khi đủ điều kiện guardrail ([mục 6.3](#63-hard-guardrails-cho-verified-gap)) mới cho đánh dấu **Verified Gap**.
4. **Thư viện tài liệu** của project (lưu từ kết quả, import RIS/BibTeX) + **evidence matrix**.
5. **Lớp 1 soạn thảo**: template đề cương NCS, dàn ý IMRaD, **guideline checklist** (gồm STRICTA, CONSORT-CHM), phrasebank, xuất Word/Excel.

**Khuyến nghị "đệ quy"** (giữ nguyên từ v1, nay đặt đúng tên): **KHÔNG** làm "khoảng trống của khoảng trống" đệ quy trừu tượng. **CÓ** làm verification/đào sâu, mỗi tầng là **một Evidence Search mới trên bài thật**, có `search_run` riêng, giới hạn 3 tầng.

**Rủi ro lớn nhất:** (1) liêm chính học thuật — viết hộ, trích dẫn ảo; (2) **kết luận "gap" sai** do chưa phủ nguồn (đặc biệt thiếu corpus Trung văn cho đề tài Trung Y) → xử lý bằng hard guardrail; (3) phạm vi phình to — xử lý bằng ranh giới MVP ([mục 20](#20-ranh-giới-mvp-v1-đề-xuất)); (4) nguồn Trung văn bị chặn bởi licensing (việc thương mại, không phải code).

---

## 2. Bối cảnh: chimedis.vn đang có gì

Tính đến 2026-09-06 (repo `chimedis-home`):

| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| Tìm y văn 4 nguồn | Production | OpenAlex + Europe PMC + CORE + Semantic Scholar, gộp + khử trùng theo DOI, `POST /api/research/search` |
| Dịch thuật ngữ YHCT vi/zh → Anh | Production | `lib/tcm-vocab.js` + `lib/tcm-dictionary.json` (~8k khoá từ CoreDB `dict.chimedis.vn`) |
| Từ điển tự học (LLM) | GĐ1+2 đã push, chờ redeploy | `lib/dict-learn.js` + `lib/llm-translate.js` (Anthropic Haiku, tuỳ chọn `ANTHROPIC_API_KEY`); bảng `dict_candidates` |
| Bảng kết quả kiểu Web of Science | Production | sắp xếp, lọc trong kết quả, tải PDF (proxy chống SSRF), xem nhanh |
| Đăng nhập | Production | Firebase Auth (Google + Email), bảng `users` dùng CHUNG toàn hệ Chimedis |
| Phân quyền | Production | `reader` < `author` < `editor` < `admin` (`lib/auth.js`) |
| Admin CMS + ORCID | Đã push, chờ schema production | `admin.chimedis.vn`, CRUD `portal_documents` |

**Chưa có:** LLM cho phân tích/tổng hợp y văn; PubMed như nguồn độc lập; bất kỳ lưu vết `search_run` nào; hàng đợi job nền; object storage. Mọi thứ chạy trong tiến trình web trên Hostinger (user tự Redeploy sau push).

---

## 3. Đối tượng & nhu cầu

Định vị đã chốt: **giảng viên/sinh viên YHCT, lương y, NCS dược liệu Việt Nam**. Trọng tâm tài liệu: **NCS mới** ("tờ giấy trắng").

Hành trình NCS YHCT năm 1 và mức hỗ trợ hiện tại — ánh xạ sang **stage vòng đời** ([mục 4](#4-kiến-trúc-khái-niệm-research-lifecycle)):

| Bước NCS | Stage | chimedis.vn hôm nay | v1 xử lý? |
|---|---|---|---|
| Chọn hướng | 0–1 Orientation/Discovery | 🟡 chỉ có tìm | ✅ |
| Câu hỏi nghiên cứu (PICO) | 2 Research Question | ❌ | ✅ (form) |
| Tìm khoảng trống | 3 Gap Verification | ❌ | ✅ (candidate → verified) |
| Tổng quan y văn có hệ thống | 5 Evidence | 🟡 | 🟡 (matrix + screening lite) |
| Quản lý tài liệu tham khảo | 5 Evidence | ❌ | ✅ (RIS/BibTeX) |
| Đề cương | 4 Protocol | ❌ | 🟡 (template tĩnh) |
| Thiết kế + cỡ mẫu | 6–7 | ❌ | ❌ (pha sau) |
| Viết IMRaD + chuẩn báo cáo | 11 Reporting | ❌ | 🟡 (dàn ý + guideline registry) |
| Chọn tạp chí + phản hồi phản biện | 12 | ❌ | ❌ (pha sau) |

---

## 4. Kiến trúc khái niệm: Research Lifecycle

Mỗi **Research Project** có các stage logic sau (không bắt buộc code hết ở MVP; ID & quan hệ phải cho phép mở rộng):

```
0  Orientation        — định hướng, loại công trình (luận án / SR / thử nghiệm / báo cáo ca …)
1  Discovery          — exploratory search (Discovery Search)
2  Research Question   — PICO / PECO / PICo / SPIDER …
3  Gap Verification    — candidate → verification search → verified/rejected
4  Protocol            — đề cương; SPIRIT khi phù hợp
5  Evidence            — search / screen / extract / appraise (Evidence Search)
6  Study Design        — population / intervention / comparator / outcomes / variables
7  Analysis Plan       — cỡ mẫu / kế hoạch thống kê / dữ liệu thiếu
8  Ethics & Registration
9  Conduct / Data
10 Analysis
11 Writing / Reporting — IMRaD + guideline registry
12 Publication / Submission
13 Archive / Provenance — xuất Search Log, gói tái lập
```

**Ràng buộc data model:** một `project` có nhiều `research_questions`; mỗi bước sinh dữ liệu đều mang `project_id` + (khi liên quan) `research_question_id` + `search_run_id`. Không entity nào "mồ côi" khỏi project & provenance.

---

## 5. Search Provenance — đối tượng dữ liệu cấp một

### 5.1 `search_runs` (bất biến)

Mỗi lần hệ thống chạy tìm kiếm (Discovery hoặc Evidence) ghi **một** `search_run` **không sửa được**:

| Trường | Ý nghĩa |
|---|---|
| `id`, `project_id`, `research_question_id?` | Gắn ngữ cảnh |
| `mode` | `discovery` \| `evidence` |
| `query_original` | Nguyên văn người dùng gõ (vi/zh/en) |
| `query_translated` | Sau dịch thuật ngữ YHCT |
| `query_expanded` | Toàn bộ mở rộng đa ngữ (xem [mục 13](#13-multilingual-query-expansion)) — lưu JSON |
| `sources[]` | Danh sách connector + `connector_version` đã gọi |
| `filters` | year range, doc type, OA, language, subject headings… |
| `date_range`, `search_date` | Cửa sổ + thời điểm chạy (cutoff) |
| `result_count_by_source`, `result_count_deduped` | Số lượng |
| `ranking_method`, `dedup_method` | Cách xếp hạng / khử trùng |
| `query_version` | Phiên bản logic `buildSearchQuery` / prompt |
| `raw_response_ref?` | Con trỏ tới bản lưu phản hồi thô (tuỳ chọn, cho tái lập chặt) |

### 5.2 Search Log export

Từ một project, xuất **Search Log / 检索记录** (Markdown + Word) liệt kê mọi `search_run`: nguồn, cú pháp truy vấn từng CSDL, ngày, số kết quả, bộ lọc — đúng định dạng phần "Chiến lược tìm kiếm" của luận văn / phụ lục PRISMA. **Đây là một khác biệt lớn**: không công cụ discovery phổ thông nào xuất được cái này.

### 5.3 Nguyên tắc

> Mọi `gap_candidate`, `evidence_extraction`, `claim` **bắt buộc** trỏ về `search_run_id`. Không có provenance ⇒ không hiển thị như kết luận học thuật.

---

## 6. Gap Candidate → Verified Gap: state machine & guardrails

### 6.1 State machine

```
hypothesized ──> searched ──> evidence-mapped ──> expert-verified ──> accepted
     │              │               │                    │              
     └──────────────┴───────────────┴────────────────────┴──────────> rejected
```

- **hypothesized** — LLM sinh từ 1 tập kết quả Discovery. Nhãn hiển thị: **"Khoảng trống ứng viên / 候选研究空白"**.
- **searched** — đã chạy ≥1 verification Evidence Search gắn với candidate này.
- **evidence-mapped** — người dùng đã screen tập verification + điền evidence matrix tối thiểu.
- **expert-verified** — người có chuyên môn (người hướng dẫn / editor / chính NCS sau khi rà) xác nhận.
- **accepted / rejected** — kết luận.

### 6.2 Ngôn từ bắt buộc

Hệ thống **không bao giờ** in "Chưa có RCT tại Việt Nam". Chỉ in:
> "**Trong tập tài liệu hiện được truy xuất** (search_run #…, ngày …, nguồn …), chưa xác định được RCT tại Việt Nam."

Phân biệt cứng: **`no evidence found` ≠ `evidence of absence`**.

### 6.3 Hard guardrails cho "Verified Gap"

Chỉ cho phép nâng lên `accepted` khi **tất cả**:

1. Có ≥1 `search_run` mode `evidence` **tái lập được** (đủ trường ở [mục 5.1](#51-search_runs-bất-biến)).
2. Đã tìm ở **tập nguồn tối thiểu theo domain** (xem 6.4).
3. Nếu câu hỏi là **can thiệp lâm sàng** → đã kiểm **trial registry** (ClinicalTrials.gov + ChiCTR/WHO ICTRP khi có quyền). Trial đang chạy/đã đăng ký ⇒ **không** phải "gap".
4. Có **date cutoff** rõ ràng.
5. Người dùng đã screen corpus ở mức yêu cầu (không chỉ đọc top 10).
6. Đề tài **Trung Y mà chưa phủ nguồn Trung văn chuyên ngành** → **chặn cứng**, hiển thị:
   > "Chưa đủ điều kiện xác nhận khoảng trống: tìm kiếm hiện chưa bao phủ nguồn Trung văn chuyên ngành (Wanfang/SinoMed/CNKI/维普)."

### 6.4 Tập nguồn tối thiểu theo domain (đề xuất, chốt ở M0)

| Loại câu hỏi | Nguồn tối thiểu để cho verified |
|---|---|
| Can thiệp lâm sàng (thuốc/châm cứu/phác đồ) | PubMed + Europe PMC + ≥1 nguồn Trung văn + ClinicalTrials.gov + ChiCTR/ICTRP |
| Dược liệu / cơ chế | PubMed + Europe PMC + ≥1 nguồn Trung văn + (OpenAlex/S2 cho độ phủ) |
| Văn hiến / lý luận YHCT | ≥1 nguồn Trung văn + CNKI/维普 khi có + nguồn Việt |
| Chủ đề chung (chưa rõ) | Chỉ đạt `evidence-mapped`, không cho `accepted` |

---

## 7. Gap Evidence Profile (thay cho "LLM confidence")

Mỗi candidate/gap có một **profile** gồm trường kiểm chứng được (LLM **giải thích** profile, không tự chấm điểm cảm tính):

| Trường | Nguồn giá trị |
|---|---|
| `search_coverage` | Bao nhiêu nguồn trong "tập tối thiểu theo domain" đã được tìm |
| `source_count`, `corpus_size` | Từ `search_runs` |
| `last_search_date` | Thời điểm evidence search gần nhất |
| `study_design_distribution` | Đếm theo loại (RCT / cohort / case series / review …) từ evidence matrix |
| `consistency` | Nhất quán / mâu thuẫn giữa các kết quả (người dùng + LLM gợi ý) |
| `risk_of_bias_summary` | Tóm tắt từ critical appraisal (khi có) |
| `directness` | Mức khớp với PICO/PECO của câu hỏi |
| `replication` | Có nghiên cứu độc lập lặp lại không |
| `verification_status` | Trạng thái state machine ([mục 6.1](#61-state-machine)) |
| `chinese_corpus_covered` | Có/không — điều kiện guardrail 6.3.6 |

Hiển thị dạng bảng + diễn giải ngắn. **Không** có con số "confidence 82%".

---

## 8. Evidence Matrix + Claim–Evidence là lõi

### 8.1 Luồng chuẩn

```
paper (CanonicalResearchRecord)
  → screening_decision  (include / exclude + lý do)
  → evidence_extraction (PICO, cỡ mẫu, can thiệp, đối chứng, kết cục, kết quả, hạn chế)
  → critical_appraisal  (tool + domain judgments — khi có, xem mục 9)
  → comparison          (bảng đối chiếu nhiều bài)
  → claim               (mệnh đề người dùng muốn viết)
  → claim_evidence_links(supporting / contradicting + study design + RoB + population diff)
  → writing             (AI hỗ trợ viết đoạn TỪ claim + links, không phải từ "đọc PDF")
```

### 8.2 Claim–Evidence writing (thay "viết đoạn tổng quan" thô)

Người dùng tạo `claim` → hệ thống hiển thị: bằng chứng ủng hộ / phản bác, thiết kế nghiên cứu, chất lượng/RoB, khác biệt dân số-bối cảnh, citation IDs, và **mức độ ngôn từ phù hợp**: `demonstrates / supports / suggests / may suggest / uncertain`. Sau đó LLM mới viết thành đoạn — **chỉ trích dẫn các record trong links**, gắn ID từng câu.

### 8.3 MVP v1

Chỉ làm: `screening_decision` (nhẹ) + `evidence_extraction` (form + xuất `.xlsx`/`.docx`). `claim`/`claim_evidence_links`/AI writing = M6. Nhưng bảng `claims`, `claim_evidence_links` được tạo sẵn (rỗng).

---

## 9. Critical Appraisal Registry

**Schema-ready ở MVP, impl dần.** Registry ánh xạ loại nghiên cứu → công cụ:

| Loại | Công cụ |
|---|---|
| RCT | RoB 2 |
| Can thiệp phi ngẫu nhiên | ROBINS-I |
| Systematic review | AMSTAR 2 / ROBIS |
| Nghiên cứu chẩn đoán | QUADAS-2 / QUADAS-C |
| Mô hình tiên lượng | PROBAST |
| Tổng thể chứng cứ | GRADE |

Bảng `critical_appraisals` lưu: `record_id`, `tool`, `tool_version`, `domain`, `judgment` (low/some concerns/high…), `reason`, `assessed_by`, `assessed_at`. MVP: **không** bắt buộc điền, chỉ mở form RoB 2 tối giản nếu người dùng muốn.

---

## 10. Guideline Registry

**Không hard-code.** Bảng `guideline_registry`:

| Trường | Ví dụ |
|---|---|
| `guideline_id`, `name` | `consort-2025`, `stricta-2010`, `consort-chm-2017`, `spirit-2025`, `prisma-2020`, `strobe`, `care` |
| `version`, `year` | |
| `study_type`, `scope` | reporting / protocol |
| `parent_id`, `relationship` | `stricta` là **extension** của `consort` |
| `canonical_source_url` | equator-network.org/… |
| `effective_date`, `superseded_by` | vd CONSORT 2010 → `superseded_by: consort-2025` |
| `checklist_version`, `items_json` | Danh mục mục kiểm (song ngữ) |

Một acupuncture RCT ⇒ hệ thống ghép: **SPIRIT 2025** (protocol) → **CONSORT 2025 + STRICTA** (reporting), thêm CONSORT-CHM nếu có bài thuốc. UI luôn kèm link bản gốc + ghi chú "đối chiếu bản chính thức".

---

## 11. Kiến trúc nguồn: Discovery vs Evidence + Connector contract

### 11.1 Hai chế độ

| | Discovery Search | Evidence Search |
|---|---|---|
| Mục tiêu | Nhanh, rộng, khám phá chủ đề | Tái lập được, phục vụ gap verification & systematic retrieval |
| Nguồn | OpenAlex, Europe PMC, Semantic Scholar, CORE (+ Crossref cho DOI/dedup) | PubMed E-utilities, Europe PMC, ClinicalTrials.gov, Crossref, (dần) Wanfang/SinoMed/CNKI/维普, WHO ICTRP/ChiCTR |
| Ghi `search_run` | Có (mode `discovery`) | Có (mode `evidence`), đầy đủ hơn, vào Search Log |
| Cú pháp | Đơn giản hoá | Giữ MeSH/PubMed syntax, subject headings |

### 11.2 Connector contract

```text
SearchConnector
  id
  name
  access_type: open_api | licensed_api | institutional | registry
  capabilities: { keyword_search, subject_heading_search, full_metadata,
                  abstract, citation_count, trial_registry, full_text_link }
  connector_version
  search(query, filters) -> raw[]
  fetchRecord(externalId) -> raw
  healthCheck()
  normalize(raw) -> CanonicalResearchRecord
```

```text
CanonicalResearchRecord (tối thiểu)
  source, external_id
  identifiers: { doi?, pmid?, pmcid?, trial_reg_id?, wanfang_id?, cnki_id? }
  title, abstract
  authors[], affiliations[]
  journal, year, language
  publication_type / study_type (khi có)
  subject_headings[], keywords[]
  flags: { retracted?, correction?, updated? }
  oa_status, full_text_links[]
  provenance: { connector, connector_version, search_run_id, retrieved_at }
```

### 11.3 Dedup theo identity graph

Một công trình có thể có nhiều ID và xuất hiện ở nhiều nguồn. Bảng `record_identifiers` (record_id ↔ nhiều (scheme, value)). Merge dựa trên đồ thị đồng nhất (DOI ∪ PMID ∪ PMCID ∪ title+year gần đúng), **không** chỉ một `ext_id` như hiện tại.

### 11.4 Refactor `lib/research-sources.js`

`searchAll()` hiện tại giữ nguyên API ngoài, nhưng bên trong chuyển sang gọi qua các connector đăng ký trong một registry, mỗi connector trả `CanonicalResearchRecord`. Đây là việc **M1**.

---

## 12. Chiến lược nguồn Trung văn & trial registry

> **Cảnh báo phạm vi:** viết connector là việc kỹ thuật nhỏ. **Có được quyền truy cập hợp pháp (license/AppKey thương mại, institutional agreement) là việc pháp lý/thương mại — không phải việc code — và cần một người phía Hạ Vân Y Đạo đứng ra liên hệ.** Rủi ro làm chậm M2.

### Tier 1 — API rõ ràng, làm sớm (M1)

1. **PubMed / MEDLINE — NCBI E-utilities** (ESearch/ESummary/EFetch, MeSH). **Nguồn độc lập**, không qua Europe PMC. Cần `NCBI_API_KEY` (miễn phí) để nới rate limit.
2. **ClinicalTrials.gov API v2** — trial đang/đã đăng ký. Chống "gap giả".
3. **Crossref REST API** — metadata/DOI resolution, license, funding, retraction metadata → normalization/dedup/citation verification.
4. **WHO ICTRP** — tổng hợp nhiều primary registry (gồm ChiCTR). Có Search Portal Web Service cho tổ chức nghiên cứu nhưng **quyền/chi phí phải xin trực tiếp**; **không scrape**.

### Tier 2 — Trung văn, đi theo connector chính thức/licensed (M2)

5. **万方数据 / Wanfang** — **`official_api_exists = true; access_status = unverified; production_status = blocked_pending_license`.**
   - Đã xác minh từ nguồn chính thức: `万方数据开放平台` (`apps.wanfangdata.com.cn/open`, có `API目录 / 我的API / 我的应用`); sản phẩm `万方选题API` công bố mục `API接口`; có endpoint **文献查询** chính thức, ví dụ `POST https://api.wanfangdata.com.cn/reader/papers` với header bắt buộc `X-Ca-Version` / `X-Ca-AppKey` / `X-Ca-Signature` (ký bằng AppSecret); response trả `id, title, keywords, abstracts, publishYear, creators, unitNames, sourceDbs, isOa, periodicalTitle, issue, citedCount, doi, volume, page…` (đủ cho `CanonicalResearchRecord`). Tài liệu: `open.wf.pub/api.html`.
   - **Chưa xác minh (đây là bài toán licensing, không phải "có API hay không"):** API có public/miễn phí cho mọi developer không; tài khoản Chimedis có tự cấp AppKey/AppSecret được không; gói API có cho dùng dữ liệu trên web bên thứ ba không; quyền commercial/public-display, cache, retention, quota/rate-limit, chi phí.
   - `reader/papers` thuộc sản phẩm `万方选题API` — **không** phải bằng chứng Wanfang mở toàn bộ `万方智搜` như public general-search API; nhưng endpoint này thực sự tìm literature theo keyword + trả abstract/metadata ⇒ **đủ để xếp Wanfang vào nhóm `candidate connector cần xác minh thương mại`, KHÔNG phải nhóm "không có API".**
   - Cách ghi chuẩn trong mọi tài liệu: *"official API exists; access/license for Chimedis unverified"*. Không viết "Wanfang không có API"; không viết "Wanfang tích hợp được ngay".
6. **SinoMed / 中国生物医学文献服务系统** (中国医学科学院医学信息研究所) — rất hợp biomedical/Trung Y; chưa xác minh public API; liên hệ sales/technical hỏi institutional/data-service API.
7. **CNKI / 中国知网** — corpus rất quan trọng cho Trung Y; chưa có bằng chứng public API; cần đàm phán licensed/institutional; **không** reverse-engineer/scrape khi chưa rõ license.
8. **维普 / VIP** — như CNKI: xác minh data/API agreement trước.

### 12.1 Connector Status Registry (trạng thái chuẩn hoá, chốt ở M0)

Mỗi nguồn mang một trong các trạng thái sau; chỉ `approved` mới được gọi API thật trong production:

| Connector | `official_api_exists` | `access_status` | `production_status` | Ghi chú |
|---|---|---|---|---|
| OpenAlex | ✅ | ✅ open | **approved** | đang chạy |
| Europe PMC | ✅ | ✅ open | **approved** | đang chạy |
| Semantic Scholar | ✅ | ✅ (có key) | **approved** | rate 1 req/s theo key |
| CORE | ✅ | ✅ (có/không key) | **approved** | rate chặt khi không key |
| PubMed E-utilities | ✅ | ✅ open (+`NCBI_API_KEY` miễn phí) | **candidate → build M1** | nguồn độc lập |
| Crossref REST | ✅ | ✅ open (polite pool) | **candidate → build M1** | metadata/DOI/dedup |
| ClinicalTrials.gov v2 | ✅ | ✅ open | **candidate → build M1** | trial registry |
| WHO ICTRP | ✅ (Web Service) | ⚠️ phải xin quyền/chi phí | **blocked_pending_access** | không scrape |
| **Wanfang** | ✅ | ⚠️ **unverified** | **blocked_pending_license** | chỉ tạo adapter **skeleton/config**, KHÔNG gọi production API |
| SinoMed | ❓ chưa rõ | ⚠️ unverified | **blocked_pending_license** | hỏi institutional API |
| CNKI / 维普 | ❓ chưa rõ | ⚠️ unverified | **blocked_pending_license** | đàm phán; không scrape |
| ChiCTR | ✅ (là WHO Primary Registry) | ⚠️ qua ICTRP | **blocked_pending_access** | lấy gián tiếp qua ICTRP |

Chuyển `blocked_*` → `approved` chỉ khi có đủ (tiêu chí đóng issue): key/agreement, quyền cache+display, pricing/quota rõ, **và** 1 test call thành công với truy vấn Trung Y thực tế. Xem [Phụ lục D](#26-phụ-lục-d-bộ-câu-hỏi-licensing-wanfang) cho bộ câu hỏi Wanfang.

### 12.2 Nguyên tắc "không để licensing chặn development"

- **Track kỹ thuật M1 chạy ngay, không chờ Trung văn:** PubMed + ClinicalTrials.gov + Crossref + lớp connector abstraction (`SearchConnector` contract + registry + `CanonicalResearchRecord` + identity-graph dedup).
- Với Wanfang/SinoMed/CNKI/维普: chỉ tạo **adapter skeleton + entry trong Connector Status Registry** ở trạng thái `blocked_pending_license`. `healthCheck()` trả `disabled`, `search()` ném lỗi rõ ràng "connector chưa được cấp phép". Không có secret nào được commit.
- **Track business/licensing chạy song song** — 1 nhiệm vụ, chủ sở hữu là phía Hạ Vân Y Đạo (xem [mục 22](#22-quyết-định-còn-mở--cần-chốt-ở-m0) câu 3 + [Phụ lục D](#26-phụ-lục-d-bộ-câu-hỏi-licensing-wanfang)).

### Tier 3 — Trial registry Trung Quốc

9. **ChiCTR** — WHO Primary Registry, rất quan trọng cho acupuncture/TCM. Nếu chưa có API hợp đồng → lấy qua **WHO ICTRP** khi được cấp quyền. **Không** lấy "chưa có bài báo" làm bằng chứng gap nếu ChiCTR/ICTRP cho thấy trial đang diễn ra.

### Phương án dự phòng nếu Tier 2 đứng lại

Ship M1 (nguồn quốc tế) + guardrail 6.3.6 hiển thị công khai "độ phủ Trung văn đang chờ". Người dùng vẫn dùng được Discovery + gap **candidate**, nhưng **không** đạt Verified Gap cho đề tài Trung Y — đúng như phản biện yêu cầu.

---

## 13. Multilingual query expansion

Không dịch 1 chiều. Với mỗi concept, sinh song song:

```
VN concept  ↔  中文规范词 / 同义词  ↔  English  ↔  MeSH / subject heading  ↔  pinyin / variant names
```

- PubMed/Europe PMC ← English + MeSH.
- Wanfang/SinoMed/CNKI ← 中文 normalized terms.
- Trial registries ← cả 中文 và English.

**Toàn bộ expansion lưu vào `search_run.query_expanded`** để người dùng thấy "hệ thống đã tìm chính xác cái gì", không phải "AI tự tìm". Tái dùng & mở rộng `lib/tcm-vocab.js` + CoreDB; phần chưa có → LLM đề xuất (giống `dict-learn.js`), người dùng duyệt trước khi chạy Evidence Search.

---

## 14. Trụ cột B — Bộ khung soạn thảo (điều chỉnh)

Giữ 3 lớp của v1, nhưng **nối vào lifecycle & evidence model**:

| Lớp | Nội dung | Stage | LLM? | MVP v1 |
|---|---|---|---|---|
| **Lớp 1** | Template đề cương NCS; dàn ý IMRaD; **guideline checklist từ registry**; phrasebank Việt/Anh; evidence matrix xuất Word/Excel | 2, 4, 11 | Không | ✅ |
| **Lớp 2** | **Claim–Evidence writing** ([mục 8.2](#82-claimevidence-writing-thay-viết-đoạn-tổng-quan-thô)): tạo claim → chọn evidence links → LLM viết đoạn chỉ trích từ links; tóm tắt nhóm bài | 11 | Có (bám thư viện) | ❌ → M6 |
| **Lớp 3** | Phản hồi phản biện; gợi ý tạp chí; kiểm tra tương đồng | 12 | Có + dịch vụ ngoài | ❌ → M7+ |

**Rào chắn Lớp 2** (giữ từ v1): trích dẫn khoá cứng trong thư viện project; đầu ra là "bản nháp phải viết lại"; nhật ký AI (`ai_runs`) + hướng dẫn khai báo AI theo ICMJE / tạp chí / nhà trường; người hướng dẫn vẫn là người quyết định.

**Template đề cương NCS** — cần đối chiếu mẫu thật của cơ sở đào tạo YHCT Việt Nam (Học viện YDHCT Việt Nam, ĐH Y Hà Nội…). Các mục: đặt vấn đề/tính cấp thiết (kéo từ verified gap + Gap Evidence Profile), mục tiêu (SMART), tổng quan (evidence matrix), ĐT-PP (thiết kế, công thức cỡ mẫu — **không tính hộ** ở MVP), biến số, y đức, kế hoạch phân tích, dự kiến kết quả & hạn chế, thời gian, tài liệu tham khảo.

**Kết nối kho YHCT Chimedis:** khi câu hỏi/gap chạm vị thuốc/huyệt có trong CoreDB → thẻ liên kết sang hồ sơ dược liệu/huyệt. Điểm SciSpace/Elicit không có.

---

## 15. Kiến trúc kỹ thuật

### 15.1 Nguyên tắc

- Bám hệ hiện có: routes trong `routes/`, logic trong `lib/`, MySQL dùng chung.
- **No-op an toàn** khi thiếu `ANTHROPIC_API_KEY` / MySQL (giống `dict-learn.js`). Không key ⇒ Lớp 1 + Discovery + gap candidate (bản thống kê không-LLM) vẫn chạy.
- Chỉ `requireUser` (role `reader` = mọi tài khoản đăng ký). Không role mới.
- Không dependency nặng ở M1. `.docx`/`.xlsx`: trả Markdown/CSV trước, thêm `docx`/`exceljs` khi cần.
- **Chạy đồng bộ trong request** cho gap candidate (tập ≤25 bài, 1 lượt LLM, ~5–15s). Evidence Search nhiều nguồn có thể tới 20–30s ⇒ cân nhắc job + polling ngay ở M1 nếu vượt ngưỡng timeout Hostinger (**quyết định M0**, xem [mục 22](#22-quyết-định-còn-mở--cần-chốt-ở-m0)).

### 15.2 Route mới

```
routes/workbench.js  →  /api/workbench  (tất cả requireUser)

  Projects & lifecycle
  GET    /projects | POST /projects | GET /projects/:id | PATCH | DELETE
  GET    /projects/:id/stage        — trạng thái vòng đời
  POST   /projects/:id/questions    — research question (PICO/PECO…)

  Search & provenance
  POST   /projects/:id/search       — chạy Discovery|Evidence search → ghi search_run
  GET    /projects/:id/search-runs  — liệt kê (bất biến)
  GET    /projects/:id/search-log?fmt=md|docx   — xuất Search Log

  Gap
  POST   /projects/:id/gap-candidates      — LLM sinh candidate từ 1 search_run
  POST   /gap-candidates/:id/verify        — sinh truy vấn thu hẹp → Evidence Search mới
  PATCH  /gap-candidates/:id               — state machine + note + tags
  GET    /gap-candidates/:id/profile       — Gap Evidence Profile

  Evidence
  POST   /projects/:id/library | POST /projects/:id/library/import (RIS/BibTeX)
  POST   /library/:id/screening
  POST   /library/:id/extraction
  POST   /library/:id/appraisal           — (M9-lite) RoB 2 tối giản

  Drafting (Lớp 1)
  GET    /templates | GET /checklists?guideline=... | GET /phrasebank?section=...
  POST   /projects/:id/drafts | GET/PUT /drafts/:id | GET /drafts/:id/export

  (M6) POST /projects/:id/claims | POST /claims/:id/links | POST /drafts/:id/assist
```

### 15.3 `lib/` mới

`lib/lifecycle.js` · `lib/search-runs.js` (ghi/đọc provenance) · `lib/connectors/` (`index.js` registry + `pubmed.js`, `clinicaltrials.js`, `crossref.js`, `europepmc.js`, `openalex.js`… mỗi file 1 connector theo contract) · `lib/canonical-record.js` (normalize + identity graph dedup) · `lib/gap-candidates.js` (prompt + hậu kiểm nối đất) · `lib/gap-profile.js` · `lib/evidence-store.js` · `lib/citation-import.js` (RIS/BibTeX) · `lib/guideline-registry.js` (dữ liệu tĩnh) · `lib/appraisal-registry.js` · `lib/query-expansion.js` (đa ngữ, tái dùng `tcm-vocab.js`) · `lib/draft-assist.js` (M6).

### 15.4 Không đụng tới ở M1

`routes/research.js` công khai (tìm ẩn danh) giữ nguyên — chỉ thêm: khi đã đăng nhập, kết quả kèm nút "Lưu vào project" / "Phân tích khoảng trống". Refactor `research-sources.js` sang connector là nội bộ, giữ API cũ.

---

## 16. Chi phí LLM & kiểm soát

Kiến trúc v2 **không** tăng chi phí LLM — phần lớn entity mới là provenance/registry tất định. LLM chỉ ở: (a) sinh gap candidate, (b) đề xuất query expansion, (c) viết nháp claim-paragraph (M6).

1. Chỉ user đăng ký. Ẩn với khách.
2. Quota/user/ngày (`WORKBENCH_DAILY_LLM_QUOTA`) — mặc định thấp; vượt → thông báo, không gọi.
3. Cache theo hash (danh sách record ID + prompt version). Phân tích lại cùng tập ⇒ 0 chi phí.
4. Chặn input: ≤25 bài, tóm tắt cắt ~1500 ký tự/bài (~15–25k token/lượt).
5. Bậc model: pass đầu model rẻ; nâng khi người dùng bấm "phân tích kỹ".
6. Verification giới hạn 3 tầng, mỗi lần người dùng chủ động chọn truy vấn.
7. **Lớp 1 + Search Log + evidence matrix + guideline registry = 0 LLM.** Nếu ngân sách = 0, vẫn ship được nhóm này + gap candidate bản thống kê.
8. Bảng `ai_runs` + `wb_llm_usage`: đếm lượt + token/ngày, cảnh báo ngưỡng trong admin.

Ước tính thô (100 NCS hoạt động, 5 candidate + 10 assist/tháng): ~20–60 USD/tháng. **Đo thật ở thử nghiệm kín trước khi mở rộng.**

---

## 17. Rủi ro & giảm thiểu

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R1 | Trích dẫn ảo | Cao | Chỉ trích từ `CanonicalResearchRecord` có thật trong thư viện/tập; hậu kiểm loại tham chiếu không khớp ID; LLM **không** sinh danh mục tài liệu |
| R2 | Viết hộ / đạo văn / phụ thuộc | Cao | Định vị "lập kế hoạch + dựng khung"; đầu ra "bản nháp phải viết lại"; `ai_runs` log; hướng dẫn khai báo AI (ICMJE) |
| R3 | **Kết luận "gap" sai** | Cao | State machine candidate→verified; **hard guardrails 6.3**; ngôn từ "trong tập được truy xuất"; phân biệt no-evidence vs evidence-of-absence |
| R4 | **Thiếu corpus Trung văn cho đề tài Trung Y** | Cao | Guardrail 6.3.6 chặn cứng Verified Gap; hiển thị công khai độ phủ đang chờ |
| R5 | Nguồn Trung văn bị chặn bởi licensing | Cao | Việc thương mại — cần người sở hữu; phương án dự phòng [mục 12](#phương-án-dự-phòng-nếu-tier-2-đứng-lại) |
| R6 | Chi phí LLM leo thang | TB | Toàn bộ [mục 16](#16-chi-phí-llm--kiểm-soát) |
| R7 | Chính sách AI của tạp chí | TB | Hướng dẫn khai báo; định vị không phải "công cụ viết bài" |
| R8 | **Phạm vi phình to** (24 entity, 14 stage) | Cao | Ranh giới MVP [mục 20](#20-ranh-giới-mvp-v1-đề-xuất); data model đủ để mở rộng, code chỉ tập con |
| R9 | Timeout Hostinger cho Evidence Search nhiều nguồn | TB | Quyết định job+polling ở M0; hoặc giới hạn nguồn/timeout mỗi connector |
| R10 | Bảo mật dữ liệu đề tài NCS (IP nhạy cảm) | TB | Private theo user; không đưa vào prompt người khác; nêu rõ dùng API bên thứ ba; cân nhắc điều khoản "không huấn luyện"; tuỳ chọn LLM tự vận hành cho nhóm nhạy cảm |
| R11 | Guideline/registry lỗi thời | Thấp | `superseded_by` + `effective_date`; luôn link bản gốc EQUATOR |
| R12 | Kỳ vọng quá mức | Thấp–TB | Onboarding nói rõ trợ lý; hội đồng & người hướng dẫn quyết định |

---

## 18. Định vị cạnh tranh

| Công cụ | Mạnh | Chimedis khác biệt |
|---|---|---|
| SciSpace / Elicit / Consensus | Corpus lớn, RAG, trích xuất bảng | Không góc YHCT; không map biện chứng; không nối hồ sơ dược liệu/huyệt; **không xuất Search Log**; tiếng Việt yếu |
| Paperpal / Jenni / Writefull | Hỗ trợ viết academic English | Không phân tích gap theo corpus; không hiểu YHCT; không template đề cương NCS Việt |
| Research Rabbit / Connected Papers | Đồ thị trích dẫn | Không phân tích nội dung; không soạn thảo; không provenance |
| Covidence / Rayyan | Quản lý sàng lọc SR | Chỉ phục vụ SR; trả phí; không phải bàn làm việc chung |

**Chỗ đứng Chimedis** (không đua corpus/tiền): (1) kho tri thức YHCT có cấu trúc đã sở hữu; (2) map thuật ngữ biện chứng ↔ MeSH/中文规范词; (3) **Search Log + provenance cho luận văn/SR**; (4) guideline YHCT (STRICTA, CONSORT-CHM) có hướng dẫn tiếng Việt; (5) đối tượng hẹp: NCS/giảng viên YHCT Việt Nam. **Công cụ dọc, không cạnh tranh trực diện SciSpace.**

---

## 19. Roadmap v2 (M0–M7+)

### M0 — Architecture freeze (không code chức năng)
Khóa: lifecycle 14 stage · `CanonicalResearchRecord` · search provenance (`search_runs`) · connector contract · guideline registry concept · identity graph dedup · tập nguồn tối thiểu theo domain (6.4) · quyết định job+polling. **Đầu ra: bản ký duyệt kiến trúc.**

### M1 — Search Foundation + Provenance
Giữ 4 nguồn Discovery hiện có (refactor sang connector) · thêm **PubMed E-utilities**, **Crossref**, **ClinicalTrials.gov** · **Connector Status Registry** (§12.1) + adapter skeleton `blocked_pending_license` cho Wanfang/SinoMed/CNKI/维普 (không gọi API thật, không secret) · `search_runs` + canonical dedup + Search Log export · project workspace + research question form.

### M2 — China Evidence Pilot *(track business chạy SONG SONG từ M1; track code chỉ khởi động khi connector → `approved`)*
**Track business (chủ sở hữu: Hạ Vân Y Đạo):** liên hệ Wanfang theo [Phụ lục D](#26-phụ-lục-d-bộ-câu-hỏi-licensing-wanfang) · khảo sát hợp đồng SinoMed/CNKI/维普.
**Track code (chỉ khi có key/agreement):** hoàn thiện `wanfang` adapter từ skeleton → production · query expansion Trung–Anh–Việt lưu trong `search_run` · trial-registry coverage qua ChiCTR/WHO ICTRP · test call truy vấn Trung Y thực tế → chuyển `blocked_pending_license` → `approved`.

### M3 — Evidence Workspace
Project library · import RIS/BibTeX · screening nhẹ · **evidence matrix** + xuất `.xlsx`/`.docx` · phân loại study type.

### M4 — Gap Candidate & Verification
Sinh candidate (nối đất, ≥2 dẫn chứng) · verification Evidence Search · **Gap Evidence Profile** · state machine + hard guardrails · nhãn "ứng viên" ở UI.

### M5 — Protocol / Reporting (Lớp 1)
Template đề cương NCS · dàn ý IMRaD · **Guideline Registry** đầy đủ (SPIRIT/CONSORT/STRICTA/PRISMA/STROBE/CARE/CONSORT-CHM) · phrasebank.

### M6 — Claim–Evidence Writing (Lớp 2)
Claim builder · supporting/contradicting evidence links · AI-assisted drafting (khoá trích dẫn) · citation renderer · `ai_runs` audit.

### M7+ — Statistics · gợi ý tạp chí · phản hồi phản biện · critical appraisal đầy đủ (RoB 2/ROBINS-I/GRADE) · chat-with-PDF (GROBID + vector) — tính riêng.

---

## 20. Ranh giới MVP v1 đề xuất

> Đề xuất cắt v1 = **M0 + M1 + M3 + M4(tới candidate, verification thủ công) + M5(Lớp 1 tĩnh)**.

**CÓ trong v1:**
- Project workspace + research question (PICO form).
- Discovery + Evidence Search qua connector; **PubMed độc lập**, Crossref, ClinicalTrials.gov.
- `search_runs` bất biến + **Search Log export**.
- Thư viện tài liệu + import RIS/BibTeX + evidence matrix xuất Word/Excel.
- Gap **candidate** (nối đất) + verification search + Gap Evidence Profile + state machine.
- Hard guardrails (gồm chặn Verified Gap cho đề tài Trung Y khi chưa phủ Trung văn).
- Lớp 1 soạn thảo: template đề cương + dàn ý IMRaD + guideline checklist + phrasebank.
- Quota/cache/`ai_runs`.

**KHÔNG trong v1 (schema chừa sẵn, chưa code):**
- Verification tự động nâng `accepted` (v1: người có chuyên môn tự xác nhận).
- Bộ công cụ critical appraisal đầy đủ (v1: chỉ RoB 2 tối giản, tuỳ chọn).
- Protocol builder tương tác / SPIRIT đầy đủ.
- Claim–Evidence writing + AI drafting (M6).
- Nguồn Trung văn (M2 — phụ thuộc licensing).
- Statistics, journal selection, reviewer workflow, chat-with-PDF.

---

## 21. Tiêu chí thành công

**Định lượng (sau thử nghiệm kín 8 tuần, ~10–20 NCS thật):**
- ≥ 60% tạo ≥1 project và quay lại lần 2.
- ≥ 50% gap candidate được người dùng giữ lại (không phải rác).
- ≥ 40% project xuất Search Log ít nhất 1 lần.
- Chi phí LLM/user hoạt động/tháng ≤ ngưỡng chốt ở M0.
- **0** trích dẫn ảo lọt ra bản xuất (hậu kiểm tự động + rà mẫu).
- **0** trường hợp hệ thống in "chưa có nghiên cứu X" mà không kèm mệnh đề "trong tập được truy xuất".

**Định tính:**
- Chuyên gia YHCT: ≥ 3/5 gap candidate mẫu "hợp lý về học thuật".
- Chuyên gia phương pháp: chấp nhận cách phân biệt candidate/verified + Search Log đủ dùng cho phụ lục luận văn.
- Người hướng dẫn không xem việc dùng công cụ là "viết hộ".

---

## 22. Quyết định còn mở — cần chốt ở M0

**Chiến lược**
1. **Ranh giới MVP v1** ([mục 20](#20-ranh-giới-mvp-v1-đề-xuất)) — chấp nhận đề xuất cắt, hay điều chỉnh?
2. **Trần ngân sách LLM/tháng** là bao nhiêu? Phần này miễn phí cho user hay có gói trả phí?
3. **Sở hữu việc liên hệ licensing Trung văn** (Wanfang → SinoMed/CNKI/维普): ai đứng ra? — *Đề xuất đã chốt theo phản biện: track business chạy **song song** từ M1; track code Wanfang chỉ khởi động khi connector → `approved`. Cần xác nhận người chủ trì phía Hạ Vân Y Đạo + gửi [bộ câu hỏi Phụ lục D](#26-phụ-lục-d-bộ-câu-hỏi-licensing-wanfang) tới Wanfang (`4000115888` / `service@wanfangdata.com.cn`).*
4. Định vị "công cụ lập kế hoạch + dựng khung, KHÔNG viết hộ" có đủ an toàn cho môi trường đào tạo NCS ở Việt Nam?

**Học thuật / phương pháp**
5. **Tập nguồn tối thiểu theo domain** (bảng [6.4](#64-tập-nguồn-tối-thiểu-theo-domain-đề-xuất-chốt-ở-m0)) đã hợp lý chưa?
6. Ai được quyền chuyển state `expert-verified` → `accepted` — chỉ người hướng dẫn/editor, hay NCS tự xác nhận sau checklist?
7. Template đề cương khớp mẫu cơ sở đào tạo YHCT Việt Nam nào? (cần bản mẫu thật)
8. Ngoài STRICTA/CONSORT-CHM, guideline nào cho nghiên cứu chứng hậu / văn hiến YHCT?

**Kỹ thuật**
9. **Job + polling ngay từ M1** cho Evidence Search nhiều nguồn, hay chấp nhận chạy đồng bộ + giới hạn timeout/nguồn? (phụ thuộc giới hạn Hostinger)
10. Lưu `raw_response_ref` (bản phản hồi thô mỗi search_run) để tái lập chặt — cần object storage; làm ở v1 hay hoãn?
11. Xuất `.docx`: đưa `docx`/`exceljs` vào dependency ở M1/M3, hay chỉ Markdown/CSV ở v1?
12. Dữ liệu đề tài nhạy cảm: có cần phương án LLM tự vận hành (Ollama) cho một nhóm người dùng, hay cảnh báo + điều khoản là đủ?

---

## 23. Phụ lục A: identity/relationship model

> **Không tạo hết ở MVP.** Đây là North Star để ID & quan hệ không phải migration phá cấu trúc. Tập con code ở v1 xem [Phụ lục B](#24-phụ-lục-b-tập-con-schema-cho-mvp-v1).

```text
projects
  └─ research_questions            (project_id, framework, P/I/C/O…)
  └─ search_runs                   (project_id, question_id?, mode, query_*, sources[], filters,
  │    │                            date_range, search_date, counts, ranking/dedup, versions)   [BẤT BIẾN]
  │    └─ search_run_sources       (search_run_id, connector_id, connector_version, raw_count, error?)
  └─ research_records              (canonical; title, abstract, journal, year, language, study_type…)
  │    └─ record_identifiers       (record_id, scheme: doi|pmid|pmcid|trial_reg|wanfang|cnki…, value)
  │    └─ record_flags             (record_id, retracted|correction|updated, detail)
  └─ project_library_items         (project_id, record_id, added_from_search_run_id, user_note)
  │    └─ screening_decisions      (library_item_id, decision, reason, by, at)
  │    └─ evidence_extractions     (library_item_id, pico_json, sample_size, intervention,
  │    │                            comparator, outcomes_json, results_json, limitations)
  │    └─ critical_appraisals      (record_id, tool, tool_version, domain, judgment, reason, by, at)
  └─ gap_candidates                (project_id, question_id?, origin_search_run_id, title,
  │    │                            gap_type, body_json, state, parent_candidate_id?, depth)
  │    └─ gap_verifications        (candidate_id, verification_search_run_id, notes, by, at)
  │    └─ gap_evidence_profiles    (candidate_id, coverage, source_count, corpus_size,
  │                                 design_distribution, consistency, rob_summary, directness,
  │                                 replication, chinese_corpus_covered, verification_status)
  └─ claims                        (project_id, text, language_strength)
  │    └─ claim_evidence_links     (claim_id, record_id, stance: support|contradict, weight_json)
  └─ protocols                     (project_id, question_id, kind)
  │    └─ protocol_versions        (protocol_id, version, content_md, created_at)
  └─ analysis_plans                (protocol_id, sample_size_json, stat_plan_md, missing_data_md)
  └─ drafts                        (project_id, gap_candidate_id?, kind, study_type, content_md, ai_log)
  │    └─ citations                (draft_id, record_id, csl_json, ordinal)
  └─ exports                       (project_id, kind: search_log|matrix|draft|package, fmt, created_at)

guideline_registry                 (guideline_id, name, version, year, study_type, scope,
  │                                 parent_id, relationship, canonical_source_url,
  │                                 effective_date, superseded_by, items_json)
  └─ guideline_assessments         (draft_id|protocol_id, guideline_id, item_id, status, note)

appraisal_registry                 (tool, version, applies_to_study_type, domains_json)

ai_runs                            (user_id, project_id, feature, model, tokens_in, tokens_out,
                                    prompt_version, created_at)
connectors                         (id, name, access_type, capabilities_json, connector_version, enabled)
```

---

## 24. Phụ lục B: tập con schema cho MVP v1

> Idempotent, thêm vào `db/schema.sql`. MySQL `u440660297_chimedis` dùng chung, FK tới `users(id)`.
> Tên cột phản ánh Phụ lục A; bảng chưa dùng (`claims`, `claim_evidence_links`, `protocols`…) **được tạo rỗng** để tránh migration phá vỡ sau này — bỏ khỏi bản này cho gọn, thêm khi tới M5/M6.

```sql
-- ===== Project + câu hỏi nghiên cứu =====
CREATE TABLE IF NOT EXISTS wb_projects (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(300) NOT NULL,
  work_type   VARCHAR(40) NULL COMMENT 'thesis|systematic_review|trial|case_report|...',
  stage       TINYINT NOT NULL DEFAULT 0 COMMENT '0..13 theo lifecycle',
  note        TEXT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_research_questions (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id  BIGINT NOT NULL,
  framework   VARCHAR(16) NOT NULL DEFAULT 'PICO' COMMENT 'PICO|PECO|PICo|SPIDER',
  parts_json  JSON NOT NULL COMMENT '{P,I,C,O,...}',
  question_text VARCHAR(1000) NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Search provenance (BẤT BIẾN — không UPDATE sau khi ghi) =====
CREATE TABLE IF NOT EXISTS wb_search_runs (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id       BIGINT NOT NULL,
  question_id      BIGINT NULL,
  mode             ENUM('discovery','evidence') NOT NULL,
  query_original   VARCHAR(1000) NOT NULL,
  query_translated VARCHAR(2000) NULL,
  query_expanded   JSON NULL COMMENT 'VN/中文/EN/MeSH/pinyin variants',
  sources_json     JSON NOT NULL COMMENT '[{connector,connector_version,count,error}]',
  filters_json     JSON NULL,
  date_range       VARCHAR(40) NULL,
  search_date      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  count_by_source  JSON NULL,
  count_deduped    INT NOT NULL DEFAULT 0,
  ranking_method   VARCHAR(40) NULL,
  dedup_method     VARCHAR(40) NULL,
  query_version    VARCHAR(24) NULL,
  raw_response_ref VARCHAR(255) NULL,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  INDEX idx_project_mode (project_id, mode, search_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Canonical record + identity graph =====
CREATE TABLE IF NOT EXISTS wb_research_records (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(700) NOT NULL,
  abstract      MEDIUMTEXT NULL,
  authors_json  JSON NULL,
  journal       VARCHAR(300) NULL,
  year          SMALLINT NULL,
  language      VARCHAR(12) NULL,
  study_type    VARCHAR(40) NULL,
  subjects_json JSON NULL,
  flags_json    JSON NULL COMMENT '{retracted,correction,updated}',
  oa_status     VARCHAR(24) NULL,
  fulltext_json JSON NULL,
  first_seen    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_record_identifiers (
  record_id  BIGINT NOT NULL,
  scheme     VARCHAR(20) NOT NULL COMMENT 'doi|pmid|pmcid|trial_reg|openalex|s2|core|wanfang|cnki',
  value      VARCHAR(200) NOT NULL,
  PRIMARY KEY (scheme, value),
  INDEX idx_record (record_id),
  FOREIGN KEY (record_id) REFERENCES wb_research_records(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Thư viện project + screening + extraction =====
CREATE TABLE IF NOT EXISTS wb_library_items (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id    BIGINT NOT NULL,
  record_id     BIGINT NOT NULL,
  from_search_run_id BIGINT NULL,
  user_note     TEXT NULL,
  added_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_proj_record (project_id, record_id),
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  FOREIGN KEY (record_id)  REFERENCES wb_research_records(id),
  INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_screening_decisions (
  library_item_id BIGINT PRIMARY KEY,
  decision   ENUM('include','exclude','maybe') NOT NULL,
  reason     VARCHAR(300) NULL,
  by_user    INT NULL,
  at_time    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (library_item_id) REFERENCES wb_library_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_evidence_extractions (
  library_item_id BIGINT PRIMARY KEY,
  pico_json      JSON NULL,
  sample_size    VARCHAR(80) NULL,
  intervention   VARCHAR(300) NULL,
  comparator     VARCHAR(300) NULL,
  outcomes_json  JSON NULL,
  results_json   JSON NULL,
  limitations    TEXT NULL,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (library_item_id) REFERENCES wb_library_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Gap candidate + verification + evidence profile =====
CREATE TABLE IF NOT EXISTS wb_gap_candidates (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id          BIGINT NOT NULL,
  question_id         BIGINT NULL,
  origin_search_run_id BIGINT NOT NULL,
  parent_candidate_id BIGINT NULL,
  depth               TINYINT NOT NULL DEFAULT 0,
  title               VARCHAR(500) NOT NULL,
  gap_type            ENUM('evidence','population','intervention','outcome','method','mechanism','theory') NULL,
  body_json           JSON NOT NULL COMMENT '{evidenceHave:[{recordId,note}], whatsMissing, whyItMatters}',
  state               ENUM('hypothesized','searched','evidence-mapped','expert-verified','accepted','rejected')
                        NOT NULL DEFAULT 'hypothesized',
  tags                VARCHAR(300) NULL,
  user_note           TEXT NULL,
  llm_model           VARCHAR(64) NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  FOREIGN KEY (origin_search_run_id) REFERENCES wb_search_runs(id),
  INDEX idx_project_state (project_id, state),
  INDEX idx_parent (parent_candidate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_gap_verifications (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  candidate_id  BIGINT NOT NULL,
  search_run_id BIGINT NOT NULL,
  notes         TEXT NULL,
  by_user       INT NULL,
  at_time       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id)  REFERENCES wb_gap_candidates(id),
  FOREIGN KEY (search_run_id) REFERENCES wb_search_runs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_gap_evidence_profiles (
  candidate_id           BIGINT PRIMARY KEY,
  search_coverage        VARCHAR(120) NULL COMMENT 'x/y nguồn tối thiểu theo domain',
  source_count           INT NOT NULL DEFAULT 0,
  corpus_size            INT NOT NULL DEFAULT 0,
  last_search_date       TIMESTAMP NULL,
  design_distribution    JSON NULL,
  consistency            VARCHAR(40) NULL,
  rob_summary            VARCHAR(120) NULL,
  directness             VARCHAR(40) NULL,
  replication            VARCHAR(40) NULL,
  chinese_corpus_covered TINYINT(1) NOT NULL DEFAULT 0,
  verification_status    VARCHAR(24) NOT NULL DEFAULT 'hypothesized',
  updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES wb_gap_candidates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Bản thảo (Lớp 1) + xuất + đếm LLM + guideline registry =====
CREATE TABLE IF NOT EXISTS wb_drafts (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id    BIGINT NOT NULL,
  gap_candidate_id BIGINT NULL,
  kind          ENUM('proposal','imrad','custom') NOT NULL DEFAULT 'imrad',
  study_type    VARCHAR(32) NULL,
  title         VARCHAR(500) NULL,
  content_md    LONGTEXT NULL,
  ai_log_json   JSON NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_guideline_registry (
  guideline_id        VARCHAR(40) PRIMARY KEY,
  name                VARCHAR(200) NOT NULL,
  version             VARCHAR(24) NULL,
  year                SMALLINT NULL,
  study_type          VARCHAR(40) NULL,
  scope               ENUM('protocol','reporting') NOT NULL,
  parent_id           VARCHAR(40) NULL,
  relationship        VARCHAR(24) NULL COMMENT 'extension|core|companion',
  canonical_source_url VARCHAR(300) NULL,
  effective_date      DATE NULL,
  superseded_by       VARCHAR(40) NULL,
  items_json          JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_ai_runs (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  project_id    BIGINT NULL,
  feature       VARCHAR(40) NOT NULL COMMENT 'gap_candidate|query_expansion|draft_assist',
  model         VARCHAR(64) NULL,
  tokens_in     INT NOT NULL DEFAULT 0,
  tokens_out    INT NOT NULL DEFAULT 0,
  prompt_version VARCHAR(24) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_day (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wb_llm_usage (
  user_id      INT NOT NULL,
  ymd          DATE NOT NULL,
  gap_calls    INT NOT NULL DEFAULT 0,
  assist_calls INT NOT NULL DEFAULT 0,
  tokens_in    BIGINT NOT NULL DEFAULT 0,
  tokens_out   BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, ymd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 25. Phụ lục C: nguồn cần đối chiếu trước khi code connector

- **NCBI** — E-utilities / PubMed API documentation (+ đăng ký `NCBI_API_KEY`).
- **ClinicalTrials.gov** — API v2 documentation.
- **Crossref** — REST API documentation (polite pool, `mailto`).
- **WHO ICTRP** — Search Portal & Web Service (điều kiện truy cập cho tổ chức).
- **万方数据 Wanfang** — 开放平台 / API目录 / 文献查询 API (AppKey/AppSecret/signature; gói thương mại).
- **SinoMed** — 中国生物医学文献服务系统 (hỏi institutional/data-service API).
- **CNKI / 维普** — data/API agreement chính thức; không scrape.
- **EQUATOR Network** — reporting guideline registry (nguồn cho `wb_guideline_registry`).
- **Cochrane Handbook** — searching, risk of bias, synthesis, GRADE.
- **ICMJE** — khuyến nghị về sử dụng/khai báo AI, bảo mật.

> Licensing & terms thay đổi theo thời gian. Trước khi code connector production: xác minh lại Terms of Use, API quota, quyền thương mại, quyền lưu trữ dữ liệu của từng provider.

---

## 26. Phụ lục D: bộ câu hỏi licensing Wanfang

> **Nhiệm vụ business duy nhất, chủ sở hữu: Hạ Vân Y Đạo.** Không chặn track code M1.
> Kênh chính thức: `4000115888` · `service@wanfangdata.com.cn` · `open.wf.pub/api.html`.

Gửi Wanfang đúng 6 câu:

1. `万方选题API` có cấp AppKey/AppSecret cho **doanh nghiệp/tổ chức nước ngoài** hoặc nền tảng nghiên cứu như Chimedis không?
2. Endpoint `reader/papers` bao phủ nguồn nào (中国学术期刊 / 学位论文 / 会议 / 外文)? Có giới hạn riêng với **y khoa / 中医药** không?
3. Giá / quota / rate-limit?
4. Có cho phép **server-side integration** vào website của bên thứ ba không?
5. Có cho phép **lưu/cache metadata + abstract** và hiển thị lại cho người dùng không? Thời hạn retention?
6. Có gói **API / 数据服务** khác phù hợp hơn cho **文献检索 tổng quát** thay vì `万方选题API` không?

### Tiêu chí đóng issue Wanfang (`blocked_pending_license` → `approved`)

Đủ **tất cả**:
- [ ] AppKey/AppSecret đã cấp (hoặc văn bản xác nhận cấp được);
- [ ] Terms / API agreement rõ ràng;
- [ ] quyền cache + hiển thị lại cho user được nêu rõ;
- [ ] pricing / quota / rate-limit rõ;
- [ ] **1 test call thành công** với truy vấn Trung Y thực tế, trả `CanonicalResearchRecord` hợp lệ.

Trong lúc chờ: `lib/connectors/wanfang.js` chỉ ở dạng skeleton — `healthCheck()` → `disabled`, `search()` → ném `ConnectorNotLicensedError`, không secret trong repo.

---

*Hết v2 (đã cập nhật §12 + Phụ lục D theo phản hồi Wanfang 2026-09-06). Góp ý xin ghi vào PR `tmh2388/chimedis-home#1`.*
