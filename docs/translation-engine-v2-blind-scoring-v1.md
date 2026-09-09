# Translate Engine v2 — Blind Validation SCORING v1 (Vòng 2)

> Chấm điểm độc lập trên raw run đã commit: `docs/translation-engine-v2-blind-results-v1.md` (commit `95c93ea`).
> Engine: `te-v2-d1`. 170 case (A01–Q10); nhóm Q chạy cả discovery + evidence → 190 dòng.
>
> **KẾT LUẬN: FAIL acceptance gate `shadow → v2`.** Giữ nguyên `TRANSLATE_ENGINE=shadow`. KHÔNG bật production.
> 1 lớp lỗi **S0**, 2 lớp lỗi **S1**. Bảng root cause + đề xuất patch nhỏ nhất bên dưới — **chờ review trước khi patch, KHÔNG vá từng câu test, KHÔNG sửa hàng loạt dictionary.**

---

## 1. Tổng số

| | Số |
|---|---|
| Case chạy | 170 (190 dòng gồm Q discovery+evidence) |
| Dịch sạch / đúng hoàn toàn | ~132 dòng |
| **S0 Critical** | **1 lớp** — 3 case xác nhận (D10, B08, D09) + rủi ro class-wide |
| **S1 Major** | **2 lớp** — P02 (1 case) · nhóm O (O01–O10, 10 case) |
| **S2 Moderate** | ~34 dòng (đã liệt kê §4) |
| **S3 Minor** | ~18 dòng (display/provenance) |

---

## 2. Chấm 6 chiều

| Chiều | Đánh giá | Ghi chú |
|---|---|---|
| **Semantic accuracy** | KHÁ (nhưng có lỗ) | Nhóm A/B/C/D/E/F(01–07)/I(giản thể)/K/M/N: gần như đúng hết, confidence `high`, synonym PubMed hợp lý. Lỗ: ~8 map sai từ lớp CoreDB auto (`đau→Heading`, `cơ/có→neck`, `da→Aureus`, `não→"part of the brain"`, `đau thần→nephralgia`, `mai hoa→Prunus mume`). |
| **Safety / ambiguity** | TỐT | 3 đụng độ verified (`châm/chàm`, `trị/trĩ`, `trung phong`) → `ambiguous` + Evidence `needs_resolution=true` (F08, G01, G04, G05, Q07·e). **KHÔNG có ca nào tự resolve span ambiguous trong Evidence.** F04/F05 phân biệt `trị`/`trĩ` bằng dấu → dịch đúng `treatment`/`hemorrhoids` — đây là ca WIN chính. |
| **Recall** | TRUNG BÌNH | Mất: `khí` (qi — **S0**, xoá âm thầm), `nhiễu`; 3 phương tễ kinh điển (Quy Tỳ / Ôn Đởm / Đại Thừa Khí Thang), 1 chứng (đàm nhiệt nhiễu tâm), 2 phương pháp (hỏa châm, mai hoa châm), `đau thần kinh→neuralgia`; toàn bộ 繁體 đa-khái-niệm không space (I09/I10/L10); pinyin phương tễ (J05). |
| **Precision** | 1 FAIL rõ | **P02 `Trần Thị Châm`** → tên riêng "Châm" bị dịch thành `acupuncture` (confidence `high`). P01/P03–P10 sạch; Q10 `Trần Văn Trung` giữ nguyên (không có surface `trung` đơn). |
| **Provenance** | ĐẠT (có nhiễu display) | `spans/stage/transform/confidence` ghi đủ; trần tin cậy `verified→high` / `auto→medium` áp đúng (thấy rõ qua các `medium` ở concept CoreDB). Nhược: nhiều `en` bẩn ("Prunus mume Sieb. et", "Rehmannia glutinosa Libosch. prepared root", "Upper Limbs:"…). |
| **Mode correctness** | ĐẠT (1 khe hở) | Discovery **fail-safe**: mọi span ambiguous/unresolved giữ NGUYÊN VĂN trong `effective_query` (trừ S0 VI_STOP). Evidence **block ambiguity**: `needs_resolution=true` đúng cho mọi ca có disambiguation HOẶC unresolved. **Khe hở:** Evidence KHÔNG block khi mọi map là `medium` toneless (G02/G03/G10/Q06·e) — map đúng nhưng lẽ ra nên cảnh báo (spec §7: toneless nên `low`). |

---

## 3. Lỗi S0 / S1 — chi tiết từng ca

### S0-1 — Xoá âm thầm từ có nghĩa qua `VI_STOP` không phân biệt dấu  ·  lớp: **segmentation**

`translate()` với span `unresolved`: `if (VI_STOP.has(foldDiacritics(s.text))) continue;` — **fold rồi mới test**, nên từ có nghĩa mà dạng bỏ dấu trùng hư từ → biến mất khỏi `effective_query`, KHÔNG vào `unresolved[]`, KHÔNG có `warning`.

| Case | input | effective_query | Token bị xoá | Fold → stopword |
|---|---|---|---|---|
| **D10** | `đại thừa khí thang điều trị táo bón` | `đại thừa thang ("treatment"…) "constipation"` | **`khí`** (氣 = qi) | `khí→khi` (= "khi"/when) |
| **B08** | `đàm nhiệt nhiễu tâm và mất ngủ` | `đàm nhiệt tâm ("insomnia"…)` | **`nhiễu`** (nhiễu loạn) + `và` | `nhiễu→nhieu` (= "nhiều"/many) |
| **D09** | `ôn đởm thang điều trị đàm nhiệt nhiễu tâm` | `ôn đởm thang ("treatment"…) đàm nhiệt tâm` | **`nhiễu`** | như trên |
| *(probe)* | `bổ khí kiện tỳ` | `bổ kiện tỳ` | **`khí`** | — |
| *(probe)* | `đo huyết áp liên tục` | `huyết áp liên tục` | **`đo`** (đo lường) | `đo→do` (= "do"/because) |

**Class-wide:** mọi token đúng dấu có nghĩa nhưng fold ∈ `{khi, nhieu, do, boi, bang, va, voi, cua, …}` — gồm ít nhất `khí` (qi), `nhiễu`, `đo`, và tiềm tàng `bơi`(swim)/`băng`(ice/bandage) — bị xoá thầm nếu đứng ngoài một cụm đã khớp.

**Vi phạm gate:** "0 trường hợp unresolved bị âm thầm xóa". Đây là **tái sinh đúng lớp lỗi `châm/chàm`** ở tầng stopword. Tác động thực tế = **giảm recall** (mất `khí`/`đo` khỏi truy vấn), KHÔNG phải dịch sai chẩn đoán — nhưng theo định nghĩa gate là **S0**.

### S1-1 — Negative control bị TCM-hoá: P02  ·  lớp: **data + segmentation**

`P02 Trần Thị Châm` → `effective_query = "trần thị (\"acupuncture\" OR …)"`, `translated: [châm→acupuncture (high)]`.
Tên riêng "Châm" (họ tên người) khớp surface form đơn-âm-tiết `châm` của concept `acupuncture` (clinical) ở `high`.

**Vi phạm gate:** "P01–P10 không bị chuyển thành concept YHCT sai". Chỉ P02 trong nhóm P (P01 `Nguyễn Văn Trung` và Q10 `Trần Văn Trung` an toàn vì không có surface `trung` đơn).

### S1-2 — Boolean / query syntax bị phá: O01–O10  ·  lớp: **syntax**

`normalizeInput`: `.toLowerCase()` + `.replace(/[^\p{L}\p{N}\s-]+/gu, ' ')` → (a) `AND/OR/NOT` → `and/or/not` (giữ như token `unresolved` literal), (b) `()` và `"` bị xoá sạch.

| Case | input | effective_query (trích) | Vấn đề |
|---|---|---|---|
| O01 | `châm cứu AND đột quỵ` | `(…acupuncture…) and (…stroke…)` | operator viết thường |
| O03 | `châm cứu OR điện châm AND stroke` | `(…) or (…) and stroke` | operator thường + không nhóm |
| O05 | `"giả châm" AND "đau thắt lưng"` | `(…sham acupuncture…) and (…low back pain…)` | ngoặc kép mất, operator thường |
| O06 | `("châm cứu" OR "điện châm") AND đột quỵ` | `(…) or (…) and (…)` | **nhóm `( … )` của người dùng bị xoá → mất precedence** |
| O07 | `hoàng kỳ AND (đột quỵ OR thiếu máu não)` | `(…astragalus…) and (…stroke…) or thiếu máu (…brain…)` | nhóm mất, precedence đảo |
| O08 | `针灸 AND 中风 NOT 动物` | `(…) and (…) not 动物` | operator thường, `动物` chưa dịch |
| O10 | `"bổ dương hoàn ngũ thang" AND stroke` | `(…) and stroke` | ngoặc kép mất |

**Vi phạm gate:** "O01–O10 không phá Boolean syntax". Với connector free-text (OpenAlex/Crossref) tác động nhẹ; với **PubMed** `and/or/not` viết thường KHÔNG phải toán tử → đổi hẳn ngữ nghĩa truy vấn. Mất nhóm `()` đổi precedence ở O03/O06/O07.

---

## 4. S2 Moderate (đã liệt kê — hệ thống vẫn cảnh báo / giữ nguyên văn)

| Nhóm | Case | Hiện tượng |
|---|---|---|
| Map sai CoreDB-auto (medium, discovery, thêm token rác) | A08·E10 `đau→"Heading"` · M01 `có→"neck"` · M06·N04·N05 `cơ→"neck"` · Q09 `da→"Aureus"/"Staph."` · I02·I03·I06·J02 `não/脑→"part of the brain"` · A07·K10 `đau thần→"nephralgia"` | concept auto bị gloss sai / import bẩn; token đơn `đau/cơ/da/não` fold-khớp 1 concept auto duy nhất → `2a-fold` medium (không phải đụng độ nên không hỏi lại) |
| Thiếu concept (recall) | D08 `quy tỳ thang` · D09 `ôn đởm thang` · D10 `đại thừa khí thang` (phương tễ) · B08 `đàm nhiệt nhiễu tâm` (chứng) · B07 `trở trệ` mồ côi · A07 `mai hoa châm` (→ nhầm herb) · A08 `hỏa châm` · A07·K10 `đau thần kinh→neuralgia` · A03·H04·L06 `đau khớp gối` rớt "gối" | concept không có trong `data/tcm-concepts/*` |
| 繁體 phân đoạn yếu | I09 `腎陰虛針灸治療` → 0 concept · I10 `治療氣血兩虛` unresolved · L10 `腎陰虛` unresolved | `EXACT_ZH` thiếu biến thể phồn thể; `segmentCjk` tham lam trên run chưa index → cả run unresolved (fail-safe: giữ nguyên + warning) |
| Pinyin đồng âm sai nghĩa | J01·J09 `zhong feng` → "Zhongfeng (LR4)" | pinyin toneless `zhong feng` chỉ trỏ 中封 (huyệt); 中风 (đột quỵ) không có surface pinyin → không vào COLLISION_SET → chọn huyệt, không hỏi |
| Evidence không chặn toneless-medium | G02 `cham cuu` · G03 `gia cham` · G10 `tuc tam ly dau goi` · Q06·e `cham cuu dieu tri benh cham` | map ĐÚNG nhưng ở `medium`, `needs_resolution=false` — spec §7 gợi ý toneless nên `low` + Evidence nên thận trọng |

---

## 5. S3 Minor (display / provenance)

- `en` bẩn: `"Prunus mume Sieb. et"` · `"Rehmannia glutinosa Libosch. prepared root"` · `"Pinellia ternata Breit."` · `"Rehmanniae Radix"` — chuỗi trích dẫn tác giả thực vật lọt vào trường hiển thị.
- Artefact hiển thị: `"Upper Limbs:"` (dấu `:` thừa, N02) · `"Ankle Joint"` · `"Heart"` (gloss cơ quan viết hoa).
- Trùng OR-group khi 1 concept có cả surface VI + ZH trong truy vấn: L03 `hoàng kỳ 黄芪` · L05 · L06 · L07 → nhóm `(… OR …)` xuất hiện 2 lần.
- Gloss khó chịu nhưng không sai: `stethalgia` (D02), `Torso` (F10).

---

## 6. Acceptance Gate

| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| **0 S0** | ❌ **FAIL** | S0-1: `khí`/`nhiễu`/`đo` xoá âm thầm (D10, B08, D09 + class-wide) |
| 0 Evidence ambiguity tự resolve sai | ✅ PASS | F08/G05/Q02·e/Q07·e đều `ambiguous` + `needs_resolution`; không tự chọn nghĩa |
| **0 unresolved bị âm thầm xoá** | ❌ **FAIL** | trùng S0-1 (`khí` không nằm trong `unresolved[]`, không warning) |
| 0 verified/high mapping sai nghiêm trọng | ✅ PASS | không có ca clinical nào dịch sai ở `high`; `trị/trĩ`, `châm/chàm`, `trúng phong` xử lý đúng |
| **O01–O10 không phá Boolean** | ❌ **FAIL** | S1-2: operator viết thường, `()`/`"` bị xoá, mất nhóm |
| **P01–P10 không TCM-hoá sai** | ❌ **FAIL** | S1-1: P02 "Châm" (tên) → `acupuncture` high |
| Mọi failure có nguyên nhân xác định | ✅ PASS | §7 |

### ⇒ GATE: **FAIL**

**Khuyến nghị:** giữ `TRANSLATE_ENGINE=shadow`. **Không** đề xuất `READY FOR SHADOW PRODUCTION VALIDATION`. Không bật `v2`.

Theo protocol điểm 10: bảng root cause + patch nhỏ nhất bên dưới — **chờ review, không patch trước, không vá từng câu test, không thêm hàng loạt term để làm đẹp điểm.**

---

## 7. Bảng root cause + đề xuất patch nhỏ nhất (chờ review)

| # | Case(s) | Sev | Root cause | Lớp | Patch nhỏ nhất đề xuất |
|---|---|---|---|---|---|
| **R1** | D10, B08, D09; class-wide | **S0** | `VI_STOP` test trên chuỗi **đã fold** → từ có nghĩa (`khí`,`nhiễu`,`đo`,`bơi`,`băng`) mà dạng bỏ dấu trùng hư từ bị `continue` (xoá thầm) | segmentation | Trong `engine.js` `translate()`: đổi `if (VI_STOP.has(foldDiacritics(s.text)))` → so khớp trên **chuỗi ĐÚNG DẤU** với một `VI_STOP_EXACT` (các hư từ có dấu chuẩn: `và, với, của, trong, sau, trước, khi, cho, là, bằng, để, về, trên, dưới, hay, hoặc, những, các, một, nhiều, bởi`). ~3 dòng, **không đụng data**. Hệ quả: `khí/đo/nhiễu` rơi vào `unresolved` (giữ nguyên văn + warning) thay vì biến mất. |
| **R2** | P02 | S1 | Surface form **đơn âm tiết** `châm` cho concept clinical → khớp tên riêng / từ ngắn thường | data + segmentation | *Ưu tiên (engine-only, không đụng data):* trong `matchLatin`, một khớp EXACT 1-token tới concept `clinical` mà token đó **viết hoa chữ đầu trong RAW input và có ≥1 token viết-hoa liền kề** → hạ xuống `unresolved` (heuristic tên riêng). *Hoặc (data, cần review):* gắn `confidence: low` / bỏ các surface đơn-âm-tiết clinical (`châm`, `cứu`, `tán`, `thang`…), buộc ≥2-token. |
| **R3** | O01–O10 | S1 | `normalizeInput` viết thường + xoá `()"` vô điều kiện; engine không có nhánh Boolean | syntax | Pre-pass: nếu phát hiện `AND|OR|NOT` viết HOA hoặc `()`/`"` cân bằng → coi là **truy vấn có cấu trúc**: tách (operator | cụm-trong-ngoặc-kép | nhóm `()` | term), chỉ dịch **term lá**, phát lại operator **viết HOA** + giữ `()`/`"`. Tối thiểu: (i) không lowercase token operator, (ii) giữ `()` `"` như passthrough. Khu trú ở `normalize.js` + đoạn ghép `outParts`. |
| R4 | A08,E10,M01,M06,N04,N05,Q09,I02,I03,I06,J02,A07,K10 | S2 | `coredb.generated.jsonc` (trust:auto) có concept import bẩn + `en` gloss sai; token đơn `đau/cơ/da/não` fold-khớp **1** concept auto → `2a-fold` medium (không đụng độ nên không hỏi) | data (CoreDB gen) | (a) Engine: khi `2a-fold` khớp concept `trust:auto` **đơn lẻ** mà token là mono-syllable phổ thông → hạ `low` + thêm vào `disambiguation` dạng "cần xác nhận" (không phải `translate` thẳng). (b) Data: pass dọn `en` trong generator (bỏ concept có `en` giống nhãn cột / gloss 1 từ mơ hồ) → regenerate. **Cần review.** |
| R5 | D08,D09,D10,B08,A07,A08,K10 | S2 | Concept vắng trong `data/tcm-concepts/*` | data (coverage) | Thêm concept verified còn thiếu (phương tễ Quy Tỳ / Ôn Đởm / Đại Thừa Khí Thang; chứng Đàm nhiệt nhiễu tâm; pháp Hỏa châm / Mai hoa châm; `đau thần kinh→neuralgia`) — **theo lô có người rà, KHÔNG để pass đúng các dòng test này**. |
| R6 | I09,I10,L10 | S2 | `EXACT_ZH` chỉ index surface có sẵn; thiếu biến thể 繁體 | data/build | Sinh surface 繁體 từ 簡體 lúc build (opencc-map) hoặc nạp `hz_traditional` từ CoreDB. **Cần review.** |
| R7 | J01,J09 | S2 | Pinyin toneless `zhong feng` chỉ trỏ 中封; 中风 (stroke) không có surface pinyin | data + collision | Thêm surface pinyin `zhōng fēng`/`zhong feng` cho concept 中风 → tạo fold-collision pinyin → `ambiguous`. **Cần review.** |
| R8 | G02,G03,G10,Q06·e | S2 | `needs_resolution` = (disambiguation‖unresolved) — không xét "tất cả match là medium/low toneless" | mode | Tuỳ chọn: mode `evidence` cũng đặt cờ (mềm: `low_confidence_translation`) khi có span `clinical:true` với `confidence !== 'high'`. Ưu tiên thấp (map đã đúng). |
| R9 | L03,L05,L06,L07 | S3 | 1 concept khớp 2 lần (surface VI + ZH) → OR-group lặp | engine | Dedupe `outParts`/`translated` theo `conceptId` trước khi ghép. ~2 dòng. |
| R10 | A07,C07,C09,C10,D02,D05 | S3 | `en` mang chuỗi trích dẫn tác giả thực vật | data | Dọn `en` trong generator (bỏ ` Sieb. et`, ` Libosch.`, ` Breit.`, viết tắt tác giả). **Cần review.** |

### Thứ tự đề xuất (chờ duyệt)

1. **R1** (P0 — mở khoá gate, 3 dòng engine, 0 data) — bỏ lớp S0 duy nhất.
2. **R3** (P1 — mở khoá gate, khu trú normalize) — Boolean passthrough.
3. **R2** (P1 — mở khoá gate) — ưu tiên heuristic tên riêng (engine-only).
4. **R4/R5/R6/R7/R10** (P2 — data/coverage) — 1 lô có review, regenerate CoreDB kèm dọn `en`. **Không** vá để pass từng dòng blind.
5. **R8/R9** (P3 — engine polish).

Sau patch: chạy lại **đúng bộ blind này** → `blind-results-v1.1`, so delta, re-check gate.

---

## 8. Rủi ro S2/S3 còn tồn tại (nếu về sau PASS)

- Lớp CoreDB `auto` sẽ vẫn thỉnh thoảng cho map 1-concept sai ở `medium` (đánh đổi recall↔precision). Chốt chặn: hàng đợi `dict_candidates` + G4 (biên tập viên) rà hàng tuần. **Đề xuất:** engine hiện chỉ báo "có bản dịch tin cậy thấp" ra UI kể cả ở Discovery.
- Người dùng gõ **繁體** nhận kết quả suy giảm (fail-safe, giữ nguyên văn) cho tới khi làm R6.
- Pinyin đồng âm (`zhong feng`, có thể `bi`, `xin`…) chọn 1 nghĩa im lặng cho tới R7.
