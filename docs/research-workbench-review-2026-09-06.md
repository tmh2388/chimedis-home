# Phản biện phương pháp & chiến lược nguồn dữ liệu — Research Workbench

> Reviewer note — 2026-09-06  
> Phạm vi: phản biện `docs/research-workbench-plan.md` và kiến nghị kiến trúc trước khi code.

## 1. Kết luận phản biện

**Khuyến nghị: REQUEST CHANGES trước khi triển khai code.**

Giữ phần lớn ý tưởng hiện tại, đặc biệt:
- grounded gap analysis / “đào sâu nối đất”;
- không cho LLM tự sinh tài liệu tham khảo;
- project workspace;
- evidence matrix;
- reporting checklists;
- quota/cost control và AI audit.

Nhưng cần đổi kiến trúc khái niệm từ:

`Search → Find Gap → Draft`

sang:

`Research Project → Question → Search/Provenance → Evidence/Appraisal → Gap Verification → Protocol/Design → Analysis → Reporting → Publication`

**Core không nên là `Gap`. Core phải là `Research Project + Evidence Provenance + Research Lifecycle`.**

---

## 2. Vấn đề phương pháp quan trọng nhất: “research gap” đang được kết luận quá sớm

Một tập top 25–50 bài chỉ cho phép hệ thống tạo **gap candidate / 候选研究空白**, không đủ để khẳng định “chưa có nghiên cứu”.

Ví dụ đúng:
> “Trong tập tài liệu hiện được truy xuất, chưa xác định được RCT tại Việt Nam.”

Không nên tự động kết luận:
> “Chưa có RCT tại Việt Nam.”

### Kiến nghị state machine cho gap

`hypothesized → searched → evidence-mapped → expert-verified → accepted/rejected`

Chỉ sau một **verification search** có log đầy đủ mới được nâng từ `Gap Candidate` thành `Verified Research Gap`.

Ngưỡng “≥2 paper” chỉ đủ để giữ một **candidate**, không phải để xác minh sự tồn tại của gap.

---

## 3. Bỏ “LLM confidence”; thay bằng chỉ số dựa trên bằng chứng

Không nên hiển thị `LLM confidence = high/medium/low` như một chỉ số học thuật.

Thay bằng **Gap Evidence Profile/Score** gồm các trường có thể kiểm chứng:
- search coverage;
- số database/source;
- corpus size;
- thời điểm cập nhật search;
- study-design distribution;
- consistency/contradiction;
- critical appraisal/risk of bias;
- directness với PICO/PECO;
- replication;
- verification status.

LLM có thể giải thích profile này, nhưng không tự chấm “độ tin cậy” bằng cảm nhận nội tại.

---

## 4. Research Lifecycle đề xuất

Mỗi `Research Project` nên có các stage logic sau, dù MVP chưa code hết:

0. Orientation — định hướng/loại công trình  
1. Discovery — exploratory search  
2. Research Question — PICO/PECO/PICo/SPIDER/...  
3. Gap Verification  
4. Protocol  
5. Evidence — search/screen/extract/appraise  
6. Study Design — population/intervention/comparator/outcomes/variables  
7. Analysis Plan — sample size/statistical analysis/missing data  
8. Ethics & Registration  
9. Conduct/Data  
10. Analysis  
11. Writing/Reporting  
12. Publication/Submission  
13. Archive/Provenance

Không bắt buộc code toàn bộ ngay, nhưng data model và IDs phải cho phép mở rộng theo vòng đời này mà không migration phá cấu trúc sau này.

---

## 5. Search provenance phải là đối tượng dữ liệu cấp một

Đề nghị thêm `wb_search_runs` (hoặc tên tương đương), lưu bất biến:

- `query_original`
- `query_translated`
- `query_expanded`
- `source/database`
- `filters`
- `date_range`
- `search_date`
- `result_count`
- `ranking_method`
- `dedup_method`
- `query_version`
- `connector_version`

Mục tiêu: mọi kết luận/gap/evidence phải truy ngược được về **một search run cụ thể**.

Chimedis nên có khả năng xuất **Search Log / 检索记录** dùng cho luận văn và systematic review.

---

## 6. Evidence Matrix phải được nâng thành lõi, không chỉ là tiện ích Drafting

Luồng chuẩn nên là:

`paper → extraction → appraisal → comparison → synthesis → claim → writing`

không phải:

`paper → LLM → paragraph`

Đề nghị các entity:
- evidence extraction;
- critical appraisal;
- claim;
- claim–evidence links;
- contradictory evidence.

### Claim–Evidence writing

Thay vì chỉ có “viết đoạn tổng quan”, hệ thống nên cho người dùng tạo `claim`, rồi hiển thị:
- supporting evidence;
- contradicting evidence;
- study design;
- quality/risk of bias;
- population/context differences;
- citation IDs;
- mức độ ngôn từ phù hợp: `demonstrates / supports / suggests / may suggest / uncertain`.

Sau đó mới cho AI hỗ trợ viết thành đoạn.

---

## 7. Thiếu critical appraisal

Đây là module bắt buộc nếu mục tiêu là đào tạo người mới nghiên cứu, không chỉ giúp họ đọc nhanh.

Registry nên hỗ trợ dần:
- RCT → RoB 2;
- non-randomized intervention → ROBINS-I;
- systematic review → AMSTAR 2 / ROBIS;
- diagnostic study → QUADAS family;
- prediction model → PROBAST family;
- body of evidence → GRADE.

Không cần implement toàn bộ ở MVP, nhưng schema phải cho phép lưu appraisal tool/version/domain/judgment/reason.

---

## 8. Guideline Registry thay vì hard-code checklist

Không hard-code kiểu `rct → CONSORT`.

Cần registry có:
- guideline ID/name;
- version/year;
- study type;
- scope;
- parent/extension relationship;
- canonical source;
- effective date;
- superseded_by;
- checklist version.

Ví dụ một acupuncture RCT có thể cần tổ hợp:
`SPIRIT 2025` ở protocol → `CONSORT 2025 + STRICTA` ở reporting, và thêm các extension khác nếu outcome/intervention yêu cầu.

TCM/herbal studies có thể nối thêm CONSORT-CHM khi phù hợp.

---

## 9. Kiến trúc nguồn tìm kiếm: phân tách Discovery Search và Evidence Search

### 9.1 Discovery Search

Mục tiêu: nhanh, rộng, phục vụ khám phá chủ đề.

Giữ các nguồn hiện có:
- OpenAlex;
- Europe PMC;
- Semantic Scholar;
- CORE.

Có thể bổ sung Crossref cho DOI/metadata resolution và deduplication.

### 9.2 Evidence Search

Mục tiêu: phục vụ nghiên cứu thật, gap verification và systematic retrieval.

Ưu tiên thêm:

#### Tier 1 — Có API/khả năng tích hợp rõ, nên làm sớm

1. **PubMed / MEDLINE — NCBI E-utilities**
   - API chính thức;
   - ESearch/ESummary/EFetch;
   - hỗ trợ MeSH/PubMed query syntax;
   - đây nên là source độc lập, không chỉ gián tiếp qua Europe PMC.

2. **ClinicalTrials.gov API v2**
   - thêm dữ liệu trial đang/đã đăng ký;
   - cực quan trọng để tránh “gap giả”: có thể chưa có bài báo nhưng trial đã đăng ký/đang tiến hành.

3. **Crossref REST API**
   - metadata/DOI resolution;
   - funding, license, ORCID/ROR, update/retraction-related metadata khi có;
   - dùng tốt cho normalization/dedup/citation verification hơn là thay PubMed.

4. **WHO ICTRP**
   - rất có giá trị vì tổng hợp nhiều primary trial registries, trong đó có ChiCTR;
   - WHO có Search Portal Web Service cho research institutions nhưng quyền truy cập/chi phí cần xin trực tiếp;
   - có thể triển khai sau khi liên hệ WHO, không nên scrape.

#### Tier 2 — Trung Quốc, nên đi theo official/licensed connector

5. **万方数据 / Wanfang Data**
   - đã xác minh có `开放平台` và API catalog chính thức;
   - có tài liệu API `文献查询` với AppKey/AppSecret/signature;
   - đây là ứng viên **khả thi nhất hiện nay để mở corpus Trung văn hợp pháp**;
   - cần liên hệ để xác định gói API, quyền thương mại, rate limit, trường metadata/full text.

6. **SinoMed / 中国生物医学文献服务系统**
   - do 中国医学科学院医学信息研究所/图书馆 xây dựng;
   - rất phù hợp cho biomedical/Chinese medical literature;
   - chưa xác minh được public API mở tại thời điểm review;
   - nên liên hệ sales/technical để hỏi institutional/data-service API thay vì scraping.

7. **CNKI / 中国知网**
   - corpus rất quan trọng cho Trung Y;
   - tại thời điểm review chưa có bằng chứng đủ chắc để coi là public/open search API cho Chimedis;
   - cần đàm phán institutional/licensed API hoặc data service;
   - không khuyến nghị reverse-engineering/scraping khi chưa rõ license.

8. **维普 / VIP**
   - cùng nguyên tắc với CNKI: cần xác minh data/API agreement chính thức trước khi tích hợp.

#### Tier 3 — Trial registry Trung Quốc

9. **ChiCTR / 中国临床试验注册中心**
   - WHO Primary Registry;
   - rất quan trọng cho acupuncture/TCM trials;
   - nếu chưa có API hợp đồng trực tiếp, ưu tiên lấy qua WHO ICTRP Web Service khi được cấp quyền;
   - không lấy absence-of-publication làm evidence của research gap nếu ChiCTR/ICTRP cho thấy trial đang diễn ra.

---

## 10. Kiến trúc connector đề xuất

Không để route research gọi từng nguồn bằng logic riêng rẽ. Chuẩn hóa interface:

```text
SearchConnector
  id
  name
  access_type: open_api | licensed_api | institutional | registry
  capabilities:
    keyword_search
    subject_heading_search
    full_metadata
    abstract
    citation_count
    trial_registry
    full_text_link
  search(query, filters)
  fetchRecord(externalId)
  healthCheck()
  normalize(record) -> CanonicalResearchRecord
```

`CanonicalResearchRecord` nên có tối thiểu:
- source + external_id;
- DOI/PMID/PMCID/trial registration ID;
- title;
- abstract;
- authors/affiliations;
- journal/year;
- language;
- publication type/study type khi có;
- subject headings/keywords;
- retraction/correction/update flags khi có;
- OA/full-text links;
- provenance (`connector`, `query_run`, `retrieved_at`).

Một record có thể có nhiều identifiers và xuất hiện ở nhiều source. Dedup nên dựa trên identity graph, không chỉ một `ext_id`.

---

## 11. Chiến lược đặc thù cho Trung Y

Chimedis không nên chỉ dịch một query Việt/Trung sang tiếng Anh.

Cần **multilingual query expansion**:

`VN concept ↔ 中文规范词/同义词 ↔ English ↔ MeSH/subject heading ↔ pinyin/variant names`

Ví dụ một concept TCM có thể sinh song song:
- query PubMed/Europe PMC bằng English + MeSH;
- query Wanfang/SinoMed/CNKI bằng Chinese normalized terms;
- query trial registries bằng cả Chinese và English.

Quan trọng: lưu toàn bộ expansion trong `search_run`, để người dùng biết hệ thống đã tìm cái gì chứ không phải “AI tự tìm”.

---

## 12. Cảnh báo phương pháp cho gap analysis

Một `Verified Gap` chỉ nên được cho phép khi tối thiểu:
1. đã có search run có thể tái lập;
2. đã tìm ở các source tối thiểu phù hợp với domain;
3. đã kiểm trial registry nếu câu hỏi là can thiệp lâm sàng;
4. có date cutoff;
5. user đã review/screen corpus ở mức yêu cầu;
6. hệ thống phân biệt rõ `no evidence found` với `evidence of absence`.

Với đề tài Trung Y, nếu chưa có corpus Trung văn, UI phải cảnh báo:
> “Chưa đủ điều kiện xác nhận khoảng trống vì tìm kiếm hiện chưa bao phủ nguồn Trung văn chuyên ngành.”

Đây nên là hard guardrail chứ không chỉ warning tùy chọn.

---

## 13. Data model nên dự phòng

Các entity lõi đề xuất:

```text
projects
research_questions
search_runs
search_run_sources
research_records
record_identifiers
project_library_items
screening_decisions
evidence_extractions
critical_appraisals
gap_candidates
gap_verifications
claims
claim_evidence_links
protocols
protocol_versions
analysis_plans
drafts
citations
guideline_registry
guideline_assessments
ai_runs
exports
```

Không cần tạo toàn bộ table trong milestone đầu, nhưng cần khóa identity/relationship model trước khi triển khai `wb_gaps`/`wb_library` theo schema cũ.

---

## 14. Roadmap sửa đổi

### M0 — Architecture freeze
- khóa lifecycle;
- canonical record;
- search provenance;
- source connector contract;
- guideline registry concept.

### M1 — Search Foundation
- giữ 4 nguồn hiện có;
- thêm PubMed E-utilities;
- thêm Crossref metadata/DOI verification;
- thêm ClinicalTrials.gov;
- `search_runs` + canonical dedup.

### M2 — China Evidence Pilot
- làm việc với Wanfang Open Platform;
- khảo sát hợp đồng SinoMed/CNKI/维普;
- query expansion Trung–Anh–Việt;
- trial-registry coverage qua ChiCTR/WHO ICTRP.

### M3 — Evidence Workspace
- project library;
- screening;
- evidence matrix;
- study classification;
- basic appraisal.

### M4 — Gap Candidate & Verification
- candidate generation;
- verification search;
- gap evidence profile;
- accepted/rejected state.

### M5 — Protocol/Reporting
- research question;
- protocol builder;
- guideline registry;
- SPIRIT/CONSORT/STRICTA/etc.

### M6 — Claim–Evidence Writing
- claim builder;
- supporting/contradictory evidence;
- AI-assisted drafting;
- citation renderer;
- AI audit log.

### M7+ — Statistics, journal selection, submission/reviewer workflow

---

## 15. Quyết định kiến nghị cho PR hiện tại

1. **Không merge schema 5 bảng hiện tại để bắt đầu code ngay.**
2. Giữ PR #1 như nền product concept.
3. Sửa kế hoạch theo kiến trúc `Research Lifecycle + Evidence Provenance`.
4. Thêm milestone nguồn dữ liệu trước gap generation.
5. Đổi `research gap` ban đầu thành `gap candidate`.
6. Bổ sung PubMed + ClinicalTrials.gov + Crossref vào roadmap gần.
7. Bắt đầu làm việc với **Wanfang Open Platform** như nguồn Trung văn có khả năng tích hợp chính thức rõ nhất đã xác minh.
8. Xử lý CNKI/SinoMed/维普 qua hợp đồng/institutional connector; không scraping trước khi rõ quyền.
9. Đối với clinical research, kiểm registry phải là một phần bắt buộc của gap verification.

---

## 16. Nguồn chính cần hệ thống/đội phát triển đối chiếu trước implementation

- NCBI — E-utilities / PubMed API documentation.
- ClinicalTrials.gov — API v2 documentation.
- Crossref — REST API documentation.
- WHO ICTRP — Search Portal & Web Service conditions.
- Wanfang Data — 开放平台 / API目录 / 文献查询 API.
- SinoMed — 中国生物医学文献服务系统.
- EQUATOR Network — reporting guideline registry.
- Cochrane Handbook — searching, risk of bias, synthesis, GRADE.
- ICMJE — AI use/disclosure/confidentiality recommendations.

> Các nguồn/licensing thay đổi theo thời gian. Trước khi code connector production phải xác minh lại Terms of Use, API quota, commercial-use rights và data-retention rights của từng provider.