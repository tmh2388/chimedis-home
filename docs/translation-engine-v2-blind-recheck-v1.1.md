# Translate Engine v2 — Blind Re-check v1.1 (sau patch R1 · R3 · R2)

> Chạy lại **đúng bộ blind** 170 case A01–Q10 sau khi áp 3 patch nhỏ nhất từ scoring v1 §7.
> Raw v1.1: `docs/translation-engine-v2-blind-results-v1.1.md`. So với v1.0: `docs/translation-engine-v2-blind-results-v1.md`.
> Engine: `te-v2-d1` (không đổi version — patch là sửa lỗi, không đổi contract).
>
> **MERGE VÀO MAIN (2026-09-09):** nhánh `impl/translation-engine` off từ D3; `main` đã tiến xa
> hơn (D6 LLM fallback + **D8** stoplist mở rộng / cắt cụm generic). Merge lấy engine `main`
> (D6+D8) làm nền, **re-apply R1/R3/R2 lên bản D8**, rồi blind re-run trên engine THẬT của main.
> - R1 trên main: D8 dùng `VI_STOP` **bỏ dấu** (danh sách lớn) → thêm `VI_STOP_KEEP_EXACT`
>   (dạng đúng dấu/đúng thanh) để `isFiller` KHÔNG nuốt: `khí não nǎo nhiễu đo dò cơ cổ số ổ
>   tử bì bí băng bơi vận mô vị phế nội thiên`.
> - D8 đã tự sửa vài S2/S3 của v1.0: `đau→"Heading"` biến mất (lọc surface auto 1-âm-tiết ≤4 kí tự);
>   `"stethalgia"→"chest pain"`, `"Diarrhea"→"diarrhea"`, `thiếu máu→"anemia"`, `bệnh mạch vành→
>   "coronary artery disease"`, `hư→"deficiency"`, `mạn tính→"chronic"`, `phụ nữ mãn kinh→"postmenopausal"`.
> - Còn tồn (D8-introduced, thấp rủi ro — nhận diện R11 lô sau): `mỏi` (mệt **mỏi**), `tái` (**tái**
>   phát), `thị`/`văn` (hư tự tên người) bị bỏ khi đứng riêng — head word vẫn còn, không mất concept.
> - Kiểm cuối trên main: suite **200/200**, `/api/research` + engine legacy KHÔNG đổi, server boot OK.

## Patch đã áp

| # | File | Thay đổi | Dòng |
|---|---|---|---|
| **R1** (S0) | `lib/translate/engine.js` | `VI_STOP` (bỏ dấu) → `VI_STOP_EXACT` (đúng dấu). Bỏ hư từ CHỈ khi `span.text` khớp CHÍNH XÁC hư từ có dấu chuẩn → `khí`(氣)/`nhiễu`/`đo`/`bằng`(dụng cụ)/`bơi` KHÔNG còn nhầm là `khi`/`nhiều`/`do`/`băng`/`bởi`. `có` để nguyên văn (không vào stoplist). | ~6 |
| **R3** (S1-2) | `lib/translate/normalize.js` + `engine.js` | `normalizeInput`: giữ `( )` làm token cấu trúc; KHÔNG lowercase toán tử `AND/OR/NOT` viết HOA; trả thêm `rawNormalized`/`rawTokens`. `engine.js`: `STRUCT_TOKEN` `{ ( ) AND OR NOT }` giữ nguyên trong `effective_query`, KHÔNG tính "chưa dịch". | ~14 |
| **R2** (S1-1) | `lib/translate/engine.js` | `looksLikeProperNoun(rawTokens, i)`: token Hoa-đầu + hàng xóm Hoa-đầu. Trong Tầng 1, khớp ĐƠN TOKEN tới concept `clinical` mà token trông như tên riêng → bỏ qua (rơi xuống unresolved, giữ nguyên văn). | ~12 |

Không đụng `data/tcm-concepts/**`, không thêm surface/synonym, không đổi threshold/collision, không đưa case blind vào `test/tcm-queries.json`.

---

## Delta trên các case S0 / S1

### S0-1 — Xoá âm thầm từ có nghĩa → **ĐÃ SỬA**

| Case | v1.0 | v1.1 |
|---|---|---|
| **D10** `đại thừa khí thang…` | `đại thừa thang …` — **`khí` mất** | `đại thừa **khí** thang …` — `khí` giữ, vào `unresolved` |
| **B08** `đàm nhiệt nhiễu tâm…` | `đàm nhiệt tâm …` — **`nhiễu` mất** | `đàm nhiệt **nhiễu** tâm …` — `nhiễu` giữ |
| **D09** `ôn đởm thang … đàm nhiệt nhiễu tâm` | `… đàm nhiệt tâm` — **`nhiễu` mất** | `… đàm nhiệt **nhiễu** tâm` — `nhiễu` giữ |
| probe `bổ khí kiện tỳ` | `bổ kiện tỳ` | `bổ **khí** kiện tỳ` |
| probe `đo huyết áp` | `huyết áp` | `**đo** huyết áp` |

`SILENT-DROP` còn lại trong v1.1 raw: **CHỈ** `và` (32), `bằng` (16), `của` (12), `với` (2) — hư từ ngữ pháp thuần, bỏ đúng thiết kế. **Không còn từ có nghĩa nào bị xoá.**

### S1-1 — Negative control TCM-hoá → **ĐÃ SỬA**

| Case | v1.0 | v1.1 |
|---|---|---|
| **P02** `Trần Thị Châm` | `trần thị ("acupuncture" OR …)` — tên "Châm" **dịch thành acupuncture (high)** | `trần thị châm` — "châm" giữ NGUYÊN VĂN (đánh dấu `ambiguous` châm/chàm ở Discovery, không dịch) |

Toàn nhóm **P01–P10: 0 concept được dịch** (tất cả `—`). Không heuristic nào over-fire: `Châm cứu điều trị đau lưng` (Hoa-đầu đầu câu, không hàng xóm Hoa-đầu) vẫn dịch đủ; `Trần Văn Trung nghiên cứu châm cứu…` (Q10) giữ tên + dịch đúng thuật ngữ thật.

### S1-2 — Boolean / query syntax → **ĐÃ SỬA**

| Case | v1.0 | v1.1 |
|---|---|---|
| O01 | `(…) and (…)` | `(…) **AND** (…)` |
| O03 | `(…) or (…) and stroke` | `(…) **OR** (…) **AND** stroke` |
| **O06** | `(…) or (…) and (…)` — **mất nhóm `( )`** | `**(** (…) OR (…) **)** AND (…)` — **nhóm giữ nguyên** |
| **O07** | `(…) and (…) or thiếu máu (…)` — mất nhóm | `(…) AND **(** (…) OR thiếu máu (…) **)**` |
| O08 | `(…) and (…) not 动物` | `(…) **AND** (…) **NOT** 动物` |

Nhóm O: **0 trường hợp `and/or/not` viết thường** trong `effective_query`; `( )` của người dùng được bảo toàn. (Ngoặc kép `"` vẫn bị bỏ như trước — engine tự quote cụm dịch; O05 cho ra `( (…) ) AND (…)` — dư 1 lớp ngoặc nhưng không sai cú pháp.)

---

## Không hồi quy

- `test/run-tcm-queries.mjs`: **200 / 200 pass** (3 đụng độ verified `châm/chàm`, `trị/trĩ`, `trung phong` xử lý y nguyên).
- `scripts/tcm-collision-report.mjs`: PASS (verified 3, soft 27 không đổi).
- Engine `legacy` + `/api/research` + boot server: KHÔNG đổi (`giả châm điều trị đột quỵ` legacy vẫn `"stroke" "eczema" "treatment"` — nhánh legacy không bị patch).
- Nhóm A–E, I(giản thể), K, M, N: `effective_query` không đổi so với v1.0 (kiểm mẫu).

---

## Acceptance Gate `shadow → v2` — RE-CHECK v1.1

| Tiêu chí | v1.0 | v1.1 |
|---|---|---|
| 0 S0 | ❌ FAIL | ✅ **PASS** (R1 — không còn xoá âm thầm từ có nghĩa) |
| 0 Evidence ambiguity tự resolve sai | ✅ PASS | ✅ PASS (không đổi) |
| 0 unresolved bị âm thầm xoá | ❌ FAIL | ✅ **PASS** (R1) |
| 0 verified/high mapping clinical sai | ✅ PASS | ✅ PASS |
| O01–O10 không phá Boolean | ❌ FAIL | ✅ **PASS** (R3 — operator HOA + nhóm `( )` giữ) |
| P01–P10 không TCM-hoá sai | ❌ FAIL | ✅ **PASS** (R2 — P02 giữ nguyên văn) |
| Mọi failure có nguyên nhân | ✅ PASS | ✅ PASS |

### ⇒ GATE v1.1: **PASS**

**Đề xuất trạng thái: `READY FOR SHADOW PRODUCTION VALIDATION`.**
Không tự bật production. Bật `TRANSLATE_ENGINE=shadow` trên `chimedis.vn` (nếu chưa) → chạy shadow trên traffic thật, đo `translate_shadow_diff` + duyệt hàng đợi `dict_candidates` → đủ 6 điều kiện §12 spec → mới `TRANSLATE_ENGINE=v2`.

---

## Rủi ro S2 / S3 CÒN TỒN TẠI (không thuộc R1/R3/R2 — chờ lô data có G4 rà)

| ID | Sev | Tồn tại |
|---|---|---|
| R4 | S2 | Map CoreDB-auto sai `medium`: `đau→"Heading"` (A08,E10) · `cơ/có→"neck"` (M01,M06,N04,N05) · `da→"Aureus"` (Q09) · `não/脑→"part of the brain"` (I02,I03,I06,J02) · `đau thần→"nephralgia"` (A07,K10). Đều `medium` + Discovery giữ ngữ cảnh; hàng đợi `dict_candidates` + G4 tuần là chốt chặn. |
| R5 | S2 | Thiếu concept: phương tễ Quy Tỳ / Ôn Đởm / Đại Thừa Khí Thang (D08–D10) · chứng đàm nhiệt nhiễu tâm (B08) · pháp hỏa châm / mai hoa châm (A07–A08) · `đau thần kinh→neuralgia` · `đau khớp gối` rớt "gối". |
| R6 | S2 | 繁體 đa-khái-niệm không space: I09 `腎陰虛針灸治療` → 0 concept (fail-safe: giữ nguyên + warning). |
| R7 | S2 | Pinyin đồng âm: `zhong feng` → huyệt LR4 (中封) thay vì 中风 (stroke), không hỏi lại. |
| R8 | S2 | Evidence không chặn khi mọi map là `medium` toneless (G02/G03/G10/Q06·e) — map đúng, chưa cảnh báo. |
| R9/R10 | S3 | OR-group lặp khi 1 concept có surface VI+ZH (L03/L05–L07) · `en` bẩn ("Prunus mume Sieb. et"…). |

→ Xử lý R4–R7/R10 theo **1 lô có G4 rà + regenerate CoreDB**, KHÔNG vá từng dòng blind. R8/R9 = engine polish, ưu tiên thấp.
