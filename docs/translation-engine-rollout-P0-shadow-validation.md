# P0 — Shadow Production Validation

> Pha P0 của `docs/translation-engine-production-rollout-v1.md` (commit khóa `dd3136c`).
> Mục tiêu P0: xác nhận engine v2 chạy shadow trên production **không đổi hành vi tìm kiếm**,
> thu số đối chiếu legacy vs v2 từ traffic thật, phân loại mọi bất đồng clinical nổi bật.

Trạng thái: **CODE-SIDE PASS** — chờ user set env + traffic tích lũy để chốt Gate P0.

---

## A. Kiểm tra phía code (ĐÃ XONG)

### A1. Shadow KHÔNG đổi `effective_query` thực gửi search

`lib/tcm-vocab.js` `buildSearchQuery()`:

- `const teMode = String(process.env.TRANSLATE_ENGINE || 'legacy').toLowerCase();`
- `teMode === 'shadow'` → chạy `translateEngineV2.translateQuery()`, gán kết quả vào
  `opts.__shadow`, **rơi xuống nhánh legacy**. Chỉ `teMode === 'v2'` mới `return v2result`.
- `_finish(legacyResult)` → `if (opts.__shadow) logShadowDiff(...)` rồi `return legacyResult`
  **nguyên vẹn**.
- Engine v2 ném lỗi → `try/catch` → fallback legacy, không làm hỏng search.

⇒ Ở `shadow`, người dùng luôn nhận kết quả legacy; v2 chỉ chạy song song để ghi diff.

### A2. `translate_shadow_diff` chỉ ghi structured, không PII, không raw query

`lib/translate/shadow.js`:

```json
{ "evt": "translate_shadow_diff", "engine_version": "...", "agree": true|false,
  "legacy_outcome": "<effective query đã dịch>", "v2_outcome": "<effective query v2>",
  "confidence": { "high": n, "medium": n, "low": n }, "ambiguous_count": n,
  "unresolved_count": n, "needs_resolution": true|false, "search_run_id": <id?> }
```

- KHÔNG log user identity, KHÔNG log raw query gốc.
- `legacy_outcome` / `v2_outcome` = **effective query đã dịch** (thuật ngữ y khoa) — chính là
  chuỗi vốn đã lưu ở `wb_search_runs.query_expanded.effective`; không lộ thêm dữ liệu.
- `logShadowDiff()` bọc `try/catch`, **không bao giờ ném** — shadow không thể làm hỏng search.
- Workbench: cùng structured diff đính vào `wb_search_runs.query_expanded.shadow`
  (`routes/workbench.js`) — không tạo kho raw-query mới.

### A3. Evidence Search KHÔNG BAO GIỜ gọi LLM

`lib/dict-learn.js` (đầu `enrichUntranslated`): `if (opts.mode === 'evidence') return ex;`
— thoát trước mọi nhánh LLM. Khớp yêu cầu §8 tài liệu rollout.

### A4. D6 LLM — path còn mở ở research công khai → phải khóa bằng env

- `routes/research.js` GET `/search` (dòng ~180) và POST `/search` (dòng ~220):
  `if (ex.untranslated?.length) ex = await enrichUntranslated(rawQ, ex);` — **KHÔNG truyền
  `mode`** → nếu `ANTHROPIC_API_KEY` có mặt (user xác nhận CÓ trên production) thì tìm kiếm
  công khai CÓ THỂ kích hoạt LLM dịch cụm còn sót.
- `routes/workbench.js`: chỉ gọi `enrichUntranslated` khi `mode === 'discovery'`; Evidence
  không gọi.
- `lib/llm-translate.js` `underRateLimit()`: `if (dayCount >= MAX_CALLS_PER_DAY) return false;`
  ⇒ đặt `LLM_TRANSLATE_DAILY_MAX=0` → `0 >= 0` luôn true → `underRateLimit()` luôn false
  → **LLM tắt hoàn toàn** ở mọi path (kể cả research công khai).

⇒ Để thỏa "D6 OFF" của rollout: **bắt buộc** `LLM_TRANSLATE_DAILY_MAX=0` trên production
(vì key đang có mặt).

---

## B. Việc user phải làm trên production (Hostinger hPanel)

### B1. Env vars (hPanel → Node.js app → Environment variables)

| Biến | Giá trị | Lý do |
|---|---|---|
| `TRANSLATE_ENGINE` | `shadow` | Chạy v2 song song, người dùng vẫn nhận legacy (§3) |
| `LLM_TRANSLATE_DAILY_MAX` | `0` | Khóa D6 để đo engine deterministic riêng (§3, §8). ANTHROPIC_API_KEY cứ để nguyên. |

Sau khi set → **Restart / redeploy** app qua hPanel.

### B2. Xác nhận đã áp

Sau redeploy, chạy 1 query bất kỳ trên `chimedis.vn` rồi mở **hPanel → Runtime logs**,
tìm dòng `translate_shadow_diff`. Có dòng đó ⇒ `TRANSLATE_ENGINE=shadow` đang chạy.

Kiểm D6 đã tắt: tìm chuỗi `llm-translate` / `translateQueryTerms` trong logs sau vài chục
query — **không được xuất hiện** call mới. (Hoặc: `dict_candidates` không có hàng
`status='new'` mới tạo sau thời điểm redeploy.)

---

## C. Thu số shadow (sau khi traffic tích lũy ~3–7 ngày hoặc ~500+ query)

### C1. Từ Runtime logs (bao phủ traffic research công khai)

Tải log ra file rồi chạy:

```bash
node scripts/shadow-diff-report.mjs <đường-dẫn-file-log>
```

Script lọc mọi dòng `translate_shadow_diff` và in:
tổng số, `% agree`, số disagreement, phân bố confidence, `ambiguous_count` / `unresolved_count`,
`needs_resolution`, top các cặp `legacy_outcome → v2_outcome` khác nhau.

### C2. Từ MySQL (bao phủ traffic workbench)

```sql
-- Tổng quan agree/disagree (workbench)
SELECT
  JSON_UNQUOTE(JSON_EXTRACT(query_expanded, '$.shadow.engine_version')) AS engine_version,
  COUNT(*)                                                              AS total,
  SUM(JSON_EXTRACT(query_expanded, '$.shadow.agree') = true)            AS agree_true,
  SUM(JSON_EXTRACT(query_expanded, '$.shadow.agree') = false)           AS agree_false,
  SUM(JSON_EXTRACT(query_expanded, '$.shadow.needs_resolution') = true) AS needs_resolution,
  SUM(CAST(JSON_EXTRACT(query_expanded, '$.shadow.unresolved_count') AS UNSIGNED) > 0) AS has_unresolved,
  SUM(CAST(JSON_EXTRACT(query_expanded, '$.shadow.ambiguous_count')  AS UNSIGNED) > 0) AS has_ambiguous
FROM wb_search_runs
WHERE JSON_EXTRACT(query_expanded, '$.shadow') IS NOT NULL
  AND search_date >= '<ngày-redeploy>';
```

```sql
-- Các bất đồng: legacy effective vs v2 outcome (workbench) — ưu tiên soi clinical
SELECT id, mode, search_date,
  JSON_UNQUOTE(JSON_EXTRACT(query_expanded, '$.effective'))         AS legacy_effective,
  JSON_UNQUOTE(JSON_EXTRACT(query_expanded, '$.shadow.v2_outcome')) AS v2_outcome,
  JSON_EXTRACT(query_expanded, '$.shadow.confidence')              AS v2_confidence
FROM wb_search_runs
WHERE JSON_EXTRACT(query_expanded, '$.shadow.agree') = false
  AND search_date >= '<ngày-redeploy>'
ORDER BY search_date DESC
LIMIT 200;
```

---

## D. Gate P0

PASS khi **đồng thời**:

- [ ] 0 lỗi S0/S1 mới từ traffic đã review.
- [ ] 0 silent drop (v2 không xóa từ có nghĩa mà legacy giữ).
- [ ] 0 Evidence ambiguity tự resolve sai.
- [ ] Không regression server/latency do shadow (logs sạch, không tăng lỗi 5xx).
- [ ] Mọi disagreement clinical nổi bật đã được G4 phân loại nguyên nhân
      (bảng: case rút gọn/anonymized · legacy_outcome · v2_outcome · nhóm nguyên nhân R4–R10).

P0 FAIL → chỉ patch blocker S0/S1, re-run regression 200 + blind v1.1, quay lại P0.
**Không** mở rộng scope, **không** mở Batch data ở P0.

Khi P0 PASS → sang **P1 Translation Data Quality Batch 01**.

---

## E. Ghi chú residual đã biết (KHÔNG xử lý ở P0 — thuộc P1 Batch 01)

Từ blind re-check v1.1 §"Rủi ro S2/S3 còn tồn tại": R4 (CoreDB-auto map sai `medium`:
`cơ→neck`, `da→Aureus`, `não/脑→part of the brain`, `đau thần→nephralgia`), R5 (thiếu
concept: Quy Tỳ / Ôn Đởm / Đại Thừa Khí Thang, đàm nhiệt nhiễu tâm, hỏa châm, mai hoa
châm, đau thần kinh→neuralgia, đau khớp gối rớt "gối"), R6 (繁體 đa-concept không space),
R7 (`zhong feng` → LR4 thay vì stroke). Tất cả là S2, Discovery giữ ngữ cảnh — xử lý 1 lô
ở P1 với G4 rà + regenerate CoreDB.
