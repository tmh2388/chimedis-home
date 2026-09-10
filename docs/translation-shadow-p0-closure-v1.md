# P0 — Closure

> Đóng P0 theo reviewer decision (PR #4 comment `5612988585`).
> Tài liệu: `docs/translation-engine-production-rollout-v1.md` §3 + `docs/translation-shadow-p0-automation-v1.md`.

## Trình tự đã thực hiện (đúng thứ tự reviewer yêu cầu)

### 1. Patch S1 `P0-0483` — proper-name guard (commit `d771941`)

- **Nguyên nhân gốc:** `looksLikeProperNoun()` chỉ chặn match **đơn token**; surface đa-token (`hoàng kỳ`, domain `herb`) trùng tên người lọt qua; guard cũ chỉ `continue` ở Tầng 1 nên Tầng 2 folded dịch lại.
- **Sửa (không hard-code tên):** `looksLikeProperNoun(rawTokens, i, size)` — MỌI token của span `[i, i+size)` là Title-Case **VÀ** có ≥1 token Title-Case liền kề NGOÀI span ⇒ span nằm trong "name run" dài hơn chính nó ⇒ tên người. Áp cho span đơn/đa token, concept `clinical` HOẶC `domain==='herb'`. Khi bắn: mark `taken` + đẩy span vào `unresolved` (giữ nguyên văn).
- **Positive controls giữ nguyên:** `hoàng kỳ điều trị đột quỵ` ✅, `Hoàng kỳ điều trị đột quỵ` (Hoa-đầu-câu) ✅, `Lục Vị Địa Hoàng Hoàn` đứng một mình ✅.

### 2. Regression / negative controls (commit `d771941`, `test/tcm-queries.json` +10)

`PN-neg-hoangky-anh`, `PN-neg-tran-hoangky`, `PN-neg-tran-hoangky-topic` (chủ đề thật vẫn dịch), `PN-neg-nguyen-thi-cham`, `PN-neg-nguyen-bach-truat` (herb đa-token trong tên); positive: `PN-pos-hoangky-context`, `PN-pos-hoangky-sentence-initial`, `PN-pos-cham-cuu-sentence-initial`, `PN-pos-name-plus-real-term`, `PN-pos-formula-titlecased-standalone`.

### 3. Kiểm

| Kiểm | Kết quả |
|---|---|
| Regression suite | **210 / 210 pass** |
| Collision gate (`scripts/tcm-collision-report.mjs`) | **exit 0** — 3 verified (`cham`/`tri`/`trung phong`) đều có test, 26 auto không đổi |
| Benchmark (`scripts/translate-score.mjs`) | v2 **94.3** ≥ legacy 82.7 ✅ |
| Targeted P0 re-check (Cohort B re-run @ `f4f16d1`+patch) | chỉ **1/620** case đổi = đúng `P0-0483`; 0 collateral |
| Negative-control re-check | NEGATIVE high-clinical flag **2 → 1**; còn `P0-0008` `đột quỵ→stroke` = **S3/backlog** (reviewer đã chốt KHÔNG phải S1) |
| Evidence (local) | 103/103 gated · **0** ambiguity auto-run sai · **0** boolean fail |

### 4. Còn S0/S1?

- **S0: 0.** **S1: 0** (P0-0483 đã fix; P0-0008 reviewer chốt S3). ⇒ tiếp bước 5.

### 5. Persistent sink MySQL `translate_shadow_log` (commit `9d37be8`)

- `db/translate-shadow-log.sql`: 1 bảng, index `(created_at)`, `(mode, agree, created_at)`, `(test_tag, created_at)`. Retention 14 ngày (prune cơ hội trong `lib/translate/shadow-log.js`).
- `logShadowToDb()`: best-effort/async, **không bao giờ ném**; lỗi DB/insert bị `.catch` nuốt.
- **Organic:** chỉ `metrics` + `legacy_hash`/`v2_hash` (sha256 prefix 16). KHÔNG raw query, KHÔNG user identity.
- **Synthetic (`test_tag` từ UA `chimedis-p0-synthetic-v1`):** thêm `legacy_outcome`/`v2_outcome` đầy đủ.
- Gắn cạnh `logShadowDiff` stdout trong `_finish` (không thay, **không tạo hệ logging khác**).

### 6. Test bắt buộc — PASS

| Test | Kết quả |
|---|---|
| DB unavailable (không cấu hình MySQL) → search vẫn chạy | ✅ sink no-op, không ném |
| Insert failure (MySQL cấu hình nhưng unreachable, `pool.query` reject) → search vẫn chạy | ✅ `.catch` nuốt, không unhandled rejection, không crash |
| Shadow behavior không đổi | ✅ `shadow` effective_query == `legacy` effective_query (6 query đa dạng) |
| Legacy effective query không đổi | ✅ |
| Regression vẫn xanh | ✅ 210/210 |
| Server boot + smoke 2 UA | ✅ HTTP 200 cả synthetic-UA lẫn organic |
| INSERT SQL well-formed | ✅ 17 cột = 17 placeholder |

## Việc chủ dự án cần làm khi deploy

1. Chạy `db/translate-shadow-log.sql` trên MySQL production (như mọi migration khác).
2. Redeploy `chimedis.vn`.
3. (Tuỳ chọn) chạy lại Cohort A synthetic — lần này số liệu production ghi thẳng vào `translate_shadow_log` (rows `test_tag='p0-synthetic-v1'`), không lệ thuộc retention hPanel.

Truy vấn đối chiếu (ví dụ):

```sql
-- tổng quan synthetic
SELECT mode, agree, COUNT(*) n,
       SUM(conf_high) h, SUM(conf_medium) m,
       SUM(unresolved_count>0) has_unres, SUM(ambiguous_count>0) has_amb
FROM translate_shadow_log
WHERE test_tag='p0-synthetic-v1'
GROUP BY mode, agree;

-- các bất đồng synthetic (có full outcome)
SELECT created_at, mode, legacy_outcome, v2_outcome
FROM translate_shadow_log
WHERE test_tag='p0-synthetic-v1' AND agree=0
ORDER BY created_at DESC LIMIT 200;

-- organic (chỉ metrics, không văn bản)
SELECT DATE(created_at) d, mode,
       COUNT(*) n, AVG(agree) agree_rate,
       SUM(needs_resolution) nr
FROM translate_shadow_log
WHERE test_tag IS NULL AND created_at >= NOW() - INTERVAL 7 DAY
GROUP BY d, mode;
```

## Kết luận

**P0 PASS** — 0 S0, 0 S1 (P0-0483 fix + verify sạch), 0 Evidence auto-run sai, 0 boolean fail, không server regression do shadow, persistent sink sẵn sàng cho verification production/organic trước P4.

⇒ **Translation Data Quality Batch 01 UNBLOCKED.** Chuyển sang **P1** theo `docs/translation-engine-production-rollout-v1.md` §4.

Không bật `TRANSLATE_ENGINE=v2`. Không mở R11. Không Batch 02. Không blind test mới.
