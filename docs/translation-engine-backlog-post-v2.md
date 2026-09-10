# Translate Engine v2 — Backlog (SAU khi rollout v2 DONE)

> Các mục KHÔNG làm trong rollout v2 (P0–P4). Mở task riêng sau khi `TRANSLATE_ENGINE=v2` production ổn định.
> Không mục nào là blocker của rollout.

## B1. Token tiếng Việt trần lọt vào effective_query (S2)

**Hiện tượng:** cụm không có trong từ điển như `giả trị liệu` → engine khớp `trị liệu→treatment`, còn `giả` (âm tiết đơn, bổ nghĩa "sham/placebo") rơi `unresolved` NHƯNG vẫn bị nối vào `effective_query` → gửi thẳng cho OpenAlex/CORE. `giả` là từ tiếng Việt phổ biến (*tác giả*, *giả thuyết*…) → kéo về bài tiếng Việt / phi y học, và **mất** nghĩa "sham".

**Bản chất:** engine là phrase-lookup, không compositional. `giả châm` chạy vì có nguyên cụm trong `method.jsonc`; `giả trị liệu` / `giả điện châm` / `giả can thiệp` thì chưa. Cùng lớp: token địa danh/tên lọt query, âm tiết toneless lẻ.

**Quyết định chủ dự án (2026-09-10): xử lý bằng bật D6 LLM.** KHÔNG chỉnh engine/stoplist thêm. Sau khi v2 production ổn:
- mở task riêng "Bật D6 LLM translator" với safety set riêng 30–50 case + quota riêng (theo rollout §8);
- D6 dịch nốt các cụm `unresolved` còn sót (`giả trị liệu` → sham treatment…);
- Evidence vẫn tuyệt đối KHÔNG gọi D6.

## B2. CoreDB refresh (upstream drift)

`dict.chimedis.vn/api/terms` đã tăng **2025 → 3890** concept (`lib/tcm-dictionary.json` 8005 → 12369 khoá) kể từ snapshot 2026-09-08. Không regen trong P1 (vượt phạm vi rollout §2).

Sau rollout DONE: mở task "CoreDB refresh 2026-09" — chạy `node scripts/build-tcm-dictionary.mjs` (đã có `cleanEn()` fix lột hậu tố tác giả thực vật), rà đụng độ mới + regression + blind trước khi commit `coredb.generated.jsonc` mới.

## B3. R11 stoplist — âm tiết có nghĩa bị bỏ khi đứng riêng (S3)

D8 folded `VI_STOP` bỏ `mỏi` (mệt **mỏi**), `tái` (**tái** phát), `thị`/`văn` (hư tự trong tên người) khi đứng một mình. Head word luôn còn → không mất concept. Đã ghi từ blind recheck v1.1. Ưu tiên thấp; cân nhắc gộp vào task D6 hoặc một vòng stoplist riêng.

## B4. Nhãn cảnh báo `routes/research.js` hard-code "cụm tiếng Việt" (S3)

Câu warning `Không nhận diện được cụm tiếng Việt: "…"` hiển thị cả khi input là tiếng Trung/Anh (VD `影响`). Sửa 1 dòng: chọn thông điệp theo `script` (vi/zh/mixed/en). Polish, làm bất kỳ lúc nào sau P4.

## B5. `脑卒中` traditional vs `中風` — recall nhỏ (S3)

`针灸治疗脑卒中` cho ra thêm nhóm `("brain"…)` nếu không có surface `脑卒中` (đã thêm cho stroke ở P1 Batch 01). Các biến thể khác của cụm anatomy+disease no-space (VD `脑出血康复`) có thể còn tách. Rà trong CoreDB refresh (B2).

---

Nguồn: `docs/translation-engine-production-rollout-v1.md`, `docs/translation-data-quality-batch-01.md`, `docs/translation-shadow-p3-lean-and-flip.md`, `docs/translation-engine-v2-blind-recheck-v1.1.md`.
