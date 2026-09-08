# Milestone Dịch — Engine dịch truy vấn đáng tin (giữ dấu)

> **Spec để bàn.** Thay lõi khớp thuật ngữ của `lib/tcm-vocab.js` bằng một engine
> **giữ nguyên dấu tiếng Việt**, phát hiện đụng độ **bằng máy**, và **hỏi lại khi mơ hồ**
> thay vì dịch sai âm thầm. Kèm mô hình quản trị (governance) 7 lớp.
>
> - Trạng thái: **DỰ THẢO — chưa code.**
> - Nhánh: `plan/translation-engine` · Repo: `tmh2388/chimedis-home`
> - Lập: 2026-09-08 (Claude) · Đọc kèm: `milestone-H-homepage-integration.md`, `research-workbench-M0-architecture-freeze.md`
> - Quan hệ roadmap: **làm TRƯỚC H2** (H2 hợp nhất tìm kiếm phụ thuộc lớp dịch này). Không đụng contract M0.

---

## Mục lục

1. [Vấn đề](#1-vấn-đề)
2. [Nguyên tắc bất biến](#2-nguyên-tắc-bất-biến)
3. [Ca lỗi mẫu: "giả châm" → "eczema"](#3-ca-lỗi-mẫu-giả-châm--eczema)
4. [Kiến trúc dữ liệu từ điển](#4-kiến-trúc-dữ-liệu-từ-điển)
5. [Thuật toán 4 tầng](#5-thuật-toán-4-tầng)
6. [Sổ đụng độ — máy tự sinh](#6-sổ-đụng-độ--máy-tự-sinh)
7. [Mức tin cậy & quyết định UI](#7-mức-tin-cậy--quyết-định-ui)
8. [Provenance: `query_expanded` v2](#8-provenance-query_expanded-v2)
9. [Quản trị (governance) 7 lớp](#9-quản-trị-governance-7-lớp)
10. [Bộ test hồi quy `tcm-queries.json`](#10-bộ-test-hồi-quy-tcm-queriesjson)
11. [Di trú từ `tcm-vocab.js` hiện tại](#11-di-trú-từ-tcm-vocabjs-hiện-tại)
12. [Phân kỳ D1–D6](#12-phân-kỳ-d1d6)
13. [Rủi ro & giảm thiểu](#13-rủi-ro--giảm-thiểu)
14. [Câu hỏi cần chốt](#14-câu-hỏi-cần-chốt)

---

## 1. Vấn đề

`lib/tcm-vocab.js` hiện khớp thuật ngữ bằng cách **bỏ dấu tiếng Việt** (`normalizeTerm = stripDiacritics(...)`). Hệ quả:

- Hai nghĩa khác nhau **gộp thành một khoá**: `châm` (kim/châm cứu) và `chàm` (eczema) đều → `cham`; `trị` / `trĩ` / `tri` → `tri`; `trúng` / `Trung` → `trung`…
- Cơ chế chặn khoá ngắn hiện có (`if (allAscii && size === 1 && phrase.length <= 4) continue`) **chỉ bật khi cả truy vấn là ASCII** → truy vấn tiếng Việt có dấu lọt qua.
- Sửa bằng cách **vá tay từng ca** (thêm dòng vào `RAW`, thêm `VI_STOP`, thêm `AMBIGUOUS`…) — đã làm nhiều lần (memory: "trị"="trĩ", "trúng phong", "bì"/"bi", pinyin 1 âm tiết…). **Không bao giờ hết**: mỗi mục từ điển mới có thể tạo một đụng độ mới mà không ai nhận ra.

**Yêu cầu người dùng (2026-09-08):** cần **thuật toán xử lý trọn vẹn**; dịch tiếng Việt **phải giữ nguyên dấu**, không được bỏ dấu.

---

## 2. Nguyên tắc bất biến

| # | Nguyên tắc |
|---|---|
| P1 | **Khoá tra chính là tiếng Việt ĐÚNG DẤU** (và Hán đúng, pinyin đúng thanh). Bản bỏ dấu chỉ là *nguồn sinh ứng viên* ở tầng mờ, không bao giờ là khoá chính. |
| P2 | **Không bao giờ dịch âm thầm khi mơ hồ.** Mơ hồ → hỏi người dùng, hoặc để nguyên + cảnh báo. |
| P3 | **Đụng độ phát hiện bằng máy**, tái sinh mỗi lần build. Con người không phải nhớ cặp nào đụng cặp nào. |
| P4 | **Mọi quyết định dịch có đường đi ghi lại được** (tầng nào, transform nào, ứng viên nào, vì sao chọn/loại) → `search_run.query_expanded`. |
| P5 | **Thuật ngữ lâm sàng** (bệnh / chứng / pháp trị / phương tễ / huyệt) **không tự thăng cấp** — luôn cần người có chuyên môn duyệt trước khi thành `verified`. |
| P6 | **Minh bạch với người học:** luôn hiện "đã gửi cụm tiếng Anh nào", có nút "Báo sai", có trang giải thích cách dịch. |
| P7 | Engine là **thư viện thuần, không phụ thuộc mạng/LLM** ở đường chính. LLM chỉ là lưới an toàn tầng cuối, trần tin cậy = `medium`. |

---

## 3. Ca lỗi mẫu: "giả châm" → "eczema"

Đường đi hiện tại (SAI):
```
"giả châm"
  → normalizeTerm → "gia cham"                    (BỎ DẤU — mất thông tin)
  → thử cụm "gia cham": không có entry
  → thử "gia": không có · thử "cham": KHỚP RAW['cham'] = { en: 'eczema' }   ← đụng độ châm/chàm
  → dịch "eczema"  (âm thầm, không cảnh báo)
```

Đường đi engine mới (ĐÚNG):
```
"giả châm"
  → chuẩn hoá giữ dấu → "giả châm"
  → Tầng 1 khớp cụm đúng dấu: "giả châm" → entry { en: 'sham acupuncture' }   ✅ tin cậy cao
     (nếu chưa có "giả châm" trong từ điển:)
  → Tầng 2a khớp bỏ dấu "gia cham" → "cham" ∈ COLLISION_SET {châm, chàm}
  → Tầng 3: MƠ HỒ → KHÔNG dịch. Hỏi: "'giả châm' → [sham acupuncture] · [eczema] · [gõ tiếng Anh]"
```

---

## 4. Kiến trúc dữ liệu từ điển

Mỗi **khái niệm** (concept) là một bản ghi, không phải một cặp khoá→en phẳng:

```jsonc
{
  "id": "sham-acupuncture",
  "domain": "method",                 // method | disease | pattern | formula | herb | acupoint | anatomy | physiology | general
  "clinical": true,                   // true ⇒ P5: không auto-promote; §3 collision lâm sàng → luôn ambiguous
  "en": "sham acupuncture",           // CHỈ để hiển thị — KHÔNG phải identity (xem §6)
  "en_synonyms": ["placebo acupuncture", "sham needling"],
  "mesh_id": null,                    // review#6: CHỈ nạp từ nguồn MeSH đã xác minh. Không hand-map theo suy đoán.
  "mesh_term": null,                  //           null cho tới khi có descriptor đúng đã kiểm.
  "same_as": [],                      // review#4: các concept_id được KHAI BÁO tương đương (equivalence group).
                                      //           Dùng khi tính COLLISION_SET — 2 id trong cùng same_as KHÔNG phải đụng độ.
  "surface_forms": [
    { "lang": "vi", "text": "giả châm",     "tone_exact": true,  "confidence": "high" },
    { "lang": "vi", "text": "châm giả",     "tone_exact": true,  "confidence": "high" },
    { "lang": "vi", "text": "gia cham",     "tone_exact": false, "confidence": "low"  },  // dạng không dấu, chấp nhận nhưng phạt
    { "lang": "zh", "text": "假针",          "confidence": "high" },
    { "lang": "zh", "text": "假针灸",        "confidence": "high" },
    { "lang": "py", "text": "jiǎ zhēn",     "tone_exact": true,  "confidence": "high" },
    { "lang": "py", "text": "jia zhen",     "tone_exact": false, "confidence": "low"  }
  ],
  "trust": "verified",                // verified | auto | candidate
  "reviewed_by": 12, "reviewed_at": "2026-09-08",
  "source": "hand"                    // hand | coredb | llm | import
}
```

**Chỉ mục xây lúc build:**
- `EXACT_VI` : map `text đúng dấu (NFC, lowercase)` → `[concept…]`
- `EXACT_ZH` : map chữ Hán → `[concept…]`
- `EXACT_PY` : map pinyin đúng thanh → `[concept…]`
- `FOLDED_VI`: map `text bỏ dấu` → `[concept…]`  ← chỉ dùng ở Tầng 2, và là nguồn tính `COLLISION_SET`
- `FOLDED_PY`: map pinyin bỏ thanh → `[concept…]`
- `COLLISION_SET`: tập các khoá bỏ dấu mà `FOLDED_*` trỏ tới **≥2 `concept_id` KHÁC NHAU, KHÔNG cùng nhóm `same_as`** (xem §6). `en` chỉ là hiển thị, KHÔNG dùng để xác định đụng độ.

**`concept_trust_ceiling`** (review#5) — trần tin cậy theo `trust` của concept, áp SAU khi có `match_confidence`:

| `trust` | trần |
|---|---|
| `verified` (đã có người chuyên môn rà) | `high` |
| `auto` (CoreDB import / `auto_active`) | `medium` |
| `candidate` (LLM / `dict_candidates.new`) | `medium` |

`effective_confidence = min(match_confidence, concept_trust_ceiling)`. Một surface form khớp CHÍNH XÁC nhưng concept `trust:auto` → **tối đa `medium`**, không được `high`.

Nguồn dữ liệu: từ điển tay (`data/tcm-concepts/*.jsonc`, `trust: verified`) + CoreDB `dict.chimedis.vn/api/terms` (`trust: auto`) + `dict_candidates` đã `approved` (`trust: verified`) / `auto_active` (`trust: auto`) / `new` (`trust: candidate`).

---

## 5. Thuật toán 4 tầng

### Tầng 0 — Chuẩn hoá KHÔNG mất thông tin
```
input → NFC → lowercase → gộp khoảng trắng → bỏ dấu câu ngoài chữ
     → GIỮ NGUYÊN mọi dấu thanh + dấu chữ tiếng Việt, giữ nguyên chữ Hán
output: { normalized (đúng dấu), tokens[], folded (bỏ dấu — chỉ để tầng 2), script: vi|zh|mixed|en }
```

### Tầng 1 — Khớp cụm CHÍNH XÁC theo dấu, dài trước ngắn
```
for size = min(6, n) downto 1:
  for mỗi cửa sổ n-gram độ dài size (trái→phải, không chồng lấn với đoạn đã khớp):
    phrase = tokens[i..i+size] join ' '
    hits = EXACT_VI[phrase] ∪ EXACT_ZH[phrase-Hán] ∪ EXACT_PY[phrase]
    nếu hits.length == 1 → GẮN { span, concept, stage: 1, match_confidence: high }   // effective = min(high, trust_ceiling)
    nếu hits.length >= 2 và ≥2 concept_id KHÁC NHAU không cùng same_as → GẮN { span, AMBIGUOUS, candidates: hits, stage: 1 }
```
- Cụm nhiều từ **luôn thắng** cụm ít từ (nhờ `size` giảm dần).
- Đoạn đã gắn (kể cả AMBIGUOUS) không xét lại ở size nhỏ hơn.
- **Review#3 — collision lâm sàng:** nếu bất kỳ candidate nào có `clinical: true` và nhóm có ≥2 concept_id khác nghĩa → **luôn `AMBIGUOUS`**, kể cả khi câu chứa thuật ngữ YHCT khác. Điểm ngữ cảnh chỉ dùng để **sắp thứ tự** option trong hộp hỏi, **không** biến `ambiguous → translated`. Chỉ thoát `ambiguous` khi: (a) có surface form khớp CHÍNH XÁC verified, hoặc (b) `pinned_terms` / `user_term_prefs` của người dùng đã chọn rõ.

### Tầng 2 — Khớp mờ CÓ KIỂM SOÁT (chỉ cho span Tầng 1 bỏ trống)
Với mỗi span chưa gắn, sinh ứng viên bằng các transform, mỗi transform có mức phạt:

| transform | mô tả | tin cậy tối đa |
|---|---|---|
| 2a — bỏ dấu | `FOLDED_VI[folded(span)]`. Nếu `folded(span) ∈ COLLISION_SET` → **AMBIGUOUS ngay** (không cần biết ra mấy concept). Nếu ra đúng 1 concept → ứng viên. | medium |
| 2b — khác dấu thanh | span và một `surface_form` chỉ khác dấu thanh, **cả hai đều tồn tại** → AMBIGUOUS | — |
| 2c — lỗi gõ Telex/VNI | `chaam→châm`, `dd→đ`, `w→ư/ơ`, gõ đúp thanh… (bảng transform cố định) → ứng viên | low |
| 2d — biến thể chính tả / đồng nghĩa | bảng `spelling_variants` khai báo tay (`"tăng huyết áp" ~ "cao huyết áp"`) | high (nếu verified) |
| 2e — LLM (tuỳ chọn, tầng cuối) | chỉ khi 2a–2d rỗng; dịch **cụm trong ngữ cảnh cả câu**; ghi `dict_candidates(status:new)` | medium |

Mỗi ứng viên: `{ concept, transform, confidence, en }`.

### Tầng 3 — Quyết định
`effective_confidence = min(match_confidence, concept_trust_ceiling)` (§4).
```
với mỗi span:
  span AMBIGUOUS (bất kỳ tầng)                 → KHÔNG DỊCH span; đẩy vào disambiguation[]
  effective_confidence = high                  → DỊCH (chip thường)
  effective_confidence = medium, cách biệt >Δ  → DỊCH + nhãn "tự động — kiểm lại" + nút "Sai?"
  ≥2 ứng viên trong biên Δ                      → KHÔNG DỊCH; disambiguation[]
  không ứng viên                                → unresolved[]; cảnh báo "chưa dịch được cụm này"
```

**Review#2 — span mơ hồ/chưa giải quyết KHÔNG được âm thầm biến mất khỏi truy vấn.** Hành vi theo mode:

| | **Discovery** | **Evidence** |
|---|---|---|
| Span đã dịch (high / medium) | ghép vào `effective_query` bình thường | như Discovery |
| Span tiếng Anh người dùng tự gõ | giữ nguyên | giữ nguyên |
| Span `AMBIGUOUS` / `unresolved` | **GIỮ NGUYÊN VĂN BẢN GỐC** trong `effective_query` + thêm vào `unresolved[]` + `warning`. KHÔNG thay bằng một nghĩa đoán, KHÔNG xoá span. | **KHÔNG thực thi Evidence Search.** Trả `status: "needs_resolution"` (HTTP 409 + payload typed) kèm `disambiguation[]`. Caller phải cho người dùng chọn trước. |

- Sau khi người dùng chọn: ghi lựa chọn vào `search_run.pinned_terms` (bất biến) + tuỳ chọn `user_term_prefs`, **rồi mới** chạy search. Discovery cũng dùng lại lựa chọn đã ghim ở lần chạy kế.
- Nhờ đó **D1–D3 đi trước D4 (UI hỏi-lại) vẫn fail-safe**: Discovery không mất ý (giữ nguyên văn + cảnh báo), Evidence không chạy sai (bị chặn).

### Tầng 4 — Ghi vết
Toàn bộ decision/transform/version vào `query_expanded` v2 (§8), gồm `unresolved[]`, `disambiguation[]`, `pinned_terms`, `engine_version`.

---

## 6. Sổ đụng độ — máy tự sinh

Trong `scripts/build-tcm-dictionary.mjs`, sau khi nạp mọi concept:

```
COLLISION_SET = {}
nhóm concept theo folded(surface_form.vi) + cùng token-length   // và riêng theo folded(pinyin)
với mỗi nhóm:
  distinct_ids = { concept.id }  loại bỏ các id nằm chung một nhóm same_as/equivalence
  nếu |distinct_ids| >= 2:                                  // review#4: dựa trên CONCEPT IDENTITY, không phải `en`
     thêm khoá folded đó vào COLLISION_SET
     ghi cảnh báo build: "ĐỤNG ĐỘ: 'cham' ← giả châm [sham-acupuncture] | chàm [eczema]"
xuất COLLISION_SET vào lib/tcm-dictionary.json
```

- **Review#4:** đụng độ = folded key trỏ tới **≥2 `concept_id` khác nhau chưa khai báo tương đương** (`same_as`). Hai concept vô tình cùng label `en` nhưng khác `id`/ontology vẫn là đụng độ. `en` chỉ để hiển thị.
- Giới hạn "cùng token-length" giữ lại để giảm dương tính giả, nhưng điều kiện chốt là concept identity.
- Thêm `chàm [eczema]` **và** `giả châm [sham-acupuncture]` ⇒ `cham` tự vào `COLLISION_SET`. Không ai phải khai.
- Build in ra bảng đụng độ mỗi lần chạy → người rà thấy ngay danh sách cần thêm `surface_form` đúng dấu phân biệt.

### 6.1 Hai bậc đụng độ — `verified` che `auto` *(D3)*

Sau khi thêm overlay CoreDB (`trust:auto`, ~2000 concept), chỉ mục dựng thêm bước **shadow theo tier tin cậy**: một khoá tra (EXACT_*/FOLDED_*) chỉ giữ concept ở **tier cao nhất** có mặt (`verified` = 3 > `auto` = 2 > `candidate` = 1).

| Tập | Điều kiện | Engine | CI |
|---|---|---|---|
| **`COLLISION_SET`** (verified-tier) | tier cao nhất của nhóm là `verified` **và** ≥2 root verified | `ambiguous` ngay (Tầng 1 + Tầng 2) | **CHẶN** nếu thiếu ca test |
| **`SOFT_COLLISION_SET`** (auto-tier) | ≥2 root nhưng toàn `auto`/`candidate` | vẫn `ambiguous` khi khớp **bỏ dấu** ra ≥2 root; khớp **đúng dấu** thì dịch bình thường ở trần `medium` | **KHÔNG chặn** — G4 rà hàng tuần; promote lên `verified` (thêm surface đúng dấu) nếu cần bắt buộc test |

Lý do: 27 cặp `auto↔auto` (vd `than` = thận/thân, `âm đạo` = colposcopy/vagina, `icterus/jaundice`) phần lớn là (a) cặp đồng nghĩa tiếng Anh CoreDB lưu 2 dòng, hoặc (b) dữ liệu dấu CoreDB chưa chuẩn. Trần `medium` + nút "Báo sai" (D4) + rà G4 là lưới an toàn; bắt hand-curate 2000 mục không phải việc D3.

- `scripts/tcm-collision-report.mjs` in **cả hai** bậc; CI chỉ fail khi `COLLISION_SET` (verified) tăng mà thiếu test.

---

## 7. Mức tin cậy & quyết định UI

| Tin cậy | Nguồn | Hành vi | Hiển thị |
|---|---|---|---|
| **high** | Tầng 1 khớp đúng dấu · Tầng 2d verified | Dịch thẳng | Chip `giả châm → sham acupuncture` |
| **medium** | Tầng 2a/2c 1 ứng viên · concept `trust: auto` · LLM (2e) | Dịch nhưng cảnh báo | Chip vàng `… (tự động — kiểm lại)` + nút "Sai?" |
| **ambiguous** | Tầng 1/2 nhiều nghĩa · `∈ COLLISION_SET` · khác dấu thanh | **Không dịch** | Hộp hỏi: *"'giả châm' → [sham acupuncture] · [eczema] · [gõ tiếng Anh]"* |
| **none** | Không ứng viên | Không dịch cụm đó | Banner "Chưa dịch được: «giả châm». [Đề xuất bản dịch]" |

Người dùng chọn ở hộp hỏi → lựa chọn ghim vào `search_run.pinned_terms` (bất biến cùng run) + tuỳ chọn "nhớ cho tôi lần sau" (ghi `user_term_prefs`).

---

## 8. Provenance: `query_expanded` v2

```jsonc
{
  "version": "trans-engine-1",
  "input": "giả châm phòng ngừa đột quỵ",
  "script": "vi",
  "spans": [
    {
      "text": "giả châm", "range": [0, 8],
      "decision": "ambiguous",
      "candidates": [
        { "concept": "sham-acupuncture", "en": "sham acupuncture", "stage": 1, "transform": "exact-vi", "confidence": "high" },
        { "concept": "eczema", "en": "eczema", "stage": 2, "transform": "folded", "confidence": "medium", "note": "folded 'cham' ∈ COLLISION_SET" }
      ],
      "resolved": null                    // hoặc concept id nếu người dùng đã chọn
    },
    {
      "text": "phòng ngừa", "range": [9, 19],
      "decision": "translated",
      "chosen": { "concept": "prevention", "en": "prevention", "en_expanded": ["prevention","prophylaxis"], "stage": 1, "confidence": "high" }
    },
    { "text": "đột quỵ", "range": [20, 27], "decision": "translated",
      "chosen": { "concept": "stroke", "en": "stroke", "stage": 1, "confidence": "high" } }
  ],
  "effective_query": "(\"prevention\" OR \"prophylaxis\") \"stroke\"",   // giả châm BỎ vì chưa resolve
  "pinned_terms": {},
  "unresolved": ["giả châm"],
  "engine_notes": ["1 cụm mơ hồ chưa chọn — kết quả có thể thiếu ý 'sham acupuncture'"]
}
```

- `search_runs.query_version` = `trans-engine-1` (đã có cột).
- Mọi bản dịch sai từ nay **truy được** về đúng span + transform + vì sao.

---

## 9. Quản trị (governance) 7 lớp

| Lớp | Nội dung | Trạng thái hạ tầng |
|---|---|---|
| **G1. Ba mức tin cậy hiển thị** (§7) | verified dịch thẳng · auto gắn nhãn "chưa rà" · ambiguous hỏi lại | cần code UI |
| **G2. Truy nguồn mọi mapping** | `query_expanded` v2 (§8) + `source`/`confidence` mỗi concept | `search_runs` đã có; mở rộng payload |
| **G3. Nút "Báo dịch sai" + hàng đợi** | Mỗi chip có "Sai?" → bảng `dict_corrections(term, wrong_en, suggested_en, reporter_uid, search_run_id, note, status)`. Màn admin "Từ điển" thêm tab "Báo sai" xếp theo tần suất | bảng mới + route + tab admin |
| **G4. Người chủ trì + nhịp rà** | **Chủ trì: Hạ Vân Minh (chủ dự án, biên tập viên YHCT)** — chốt 2026-09-08. Rà hàng đợi `dict_corrections` + `dict_term_misses` **hàng tuần**. Mỗi sửa → cập nhật concept tay (`trust: verified`, ghi `reviewed_by`/`reviewed_at`) → rebuild → chạy `tcm-queries.json`. Có thể delegate cho editor khác về sau, không để hàng đợi "không owner". | cam kết quy trình (không phải code) |
| **G5. Bộ test hồi quy** (§10) | `tcm-queries.json` chạy trên mỗi rebuild + CI; đụng độ mới không có test → CI fail | file test + script + CI |
| **G6. Không auto-promote lâm sàng** (P5) | `dict-learn.refreshLearn()`: chỉ thăng `new→auto_active` khi `domain ∈ {anatomy, physiology, general}`. Domain lâm sàng: dừng ở `new`, chỉ hiện trong màn admin để người duyệt → `approved` | sửa `dict-learn.js` |
| **G7. Trang minh bạch** | `chimedis.vn/cach-dich` — giải thích: từ điển YHCT có người rà + máy hỗ trợ; luôn hiện cụm tiếng Anh đã gửi; thấy sai bấm "Báo sai"; không chắc thì hệ thống hỏi | trang tĩnh |

Bảng mới:
```sql
CREATE TABLE IF NOT EXISTS dict_corrections (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  term          VARCHAR(190) NOT NULL,
  lang          VARCHAR(8) NULL,
  wrong_en      VARCHAR(255) NULL COMMENT 'bản dịch hệ thống đã đưa ra',
  suggested_en  VARCHAR(255) NULL COMMENT 'người báo đề xuất',
  note          VARCHAR(500) NULL,
  reporter_uid  INT NULL,
  search_run_id BIGINT NULL,
  status        ENUM('open','accepted','rejected','duplicate') NOT NULL DEFAULT 'open',
  reviewed_by   INT NULL, reviewed_at TIMESTAMP NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status), INDEX idx_term (term)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_term_prefs (
  user_id   INT NOT NULL,
  term_norm VARCHAR(190) NOT NULL,
  concept_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, term_norm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 10. Bộ test hồi quy `tcm-queries.json`

```jsonc
// test/tcm-queries.json — chạy: node test/run-tcm-queries.mjs (và trong CI)
[
  {
    "q": "giả châm phòng ngừa đột quỵ",
    "expect_terms": ["prevention", "stroke"],
    "expect_ambiguous": ["giả châm"],          // PHẢI hỏi lại, KHÔNG tự dịch
    "must_not_contain": ["eczema", "dermatitis"]
  },
  { "q": "châm cứu điều trị đau lưng", "expect_terms": ["acupuncture", "low back pain"], "must_not_contain": ["hemorrhoid"] },
  { "q": "điện châm phục hồi chức năng sau đột quỵ", "expect_terms": ["electroacupuncture", "rehabilitation", "stroke"] },
  { "q": "trúng phong", "expect_terms": ["stroke"], "must_not_contain": ["Zhongfeng", "LR4"] },
  { "q": "hoàng kỳ điều trị đái tháo đường", "expect_terms": ["Astragalus membranaceus", "diabetes"] },
  { "q": "针灸预防中风", "expect_terms": ["acupuncture", "stroke", "prevention"] },
  { "q": "黄芪 糖尿病", "expect_terms": ["Astragalus", "diabetes"], "must_not_contain": ["talus", "ankle bone"] }
  // … mục tiêu ≥150 ca, phủ: pháp trị · bệnh/chứng · phương tễ · huyệt · dược liệu · đụng độ đã biết · lỗi gõ
]
```

Runner: gọi engine, so `expect_terms` (mọi cụm phải xuất hiện trong `effective_query`), `expect_ambiguous` (phải nằm trong `unresolved`), `must_not_contain` (tuyệt đối không có trong `effective_query`). Bất kỳ ca fail → exit ≠ 0.

---

## 11. Di trú từ `tcm-vocab.js` hiện tại

1. **Trích dữ liệu, không mất:** chuyển `RAW` (~200 mục tay) + `GENERAL` + `ZH_EXTRA` + `EN_SYNONYMS` thành `data/tcm-concepts/*.jsonc` theo schema §4. Mỗi mục gán `domain` + `clinical` + `trust: verified` (vì đã rà tay). Script chuyển 1 lần, người soát lại `domain`.
2. **CoreDB:** `build-tcm-dictionary.mjs` giữ bước tải `dict.chimedis.vn/api/terms` nhưng **gán `trust: auto`** + tách `surface_form` theo `vi/hz/hz_traditional/py/en`, **giữ dấu**. Bỏ toàn bộ logic "cắt khoá 1 âm tiết ≤3/≤4" — không còn cần vì không bỏ dấu nữa (đụng độ lo bằng `COLLISION_SET`).
3. **API không đổi chữ ký:** `buildSearchQuery(rawQuery, opts)` giữ tên + trả `{ text, expandedFrom, note, untranslated }` **cộng thêm** `{ spans, disambiguation, unresolved, engine_version }`. `routes/research.js` + `routes/workbench.js` đọc thêm phần mới; phần cũ vẫn chạy. Chọn engine bằng env `TRANSLATE_ENGINE` (`legacy` mặc định → `v2` sau khi qua GATE §12). Trước GATE, `v2` chạy **shadow** (log, không đổi `text` thực gửi).
4. **`dict-learn.js`:** overlay `dict_candidates` nạp vào engine như concept `trust: auto`/`verified`; thêm guard G6 (không auto-promote domain lâm sàng).
5. **Xoá dần:** sau khi engine chạy ổn 2 tuần production + `tcm-queries.json` xanh, xoá `stripDiacritics`-as-key và các bảng vá (`VI_STOP` giữ lại vì vẫn hữu ích lọc hư từ, nhưng áp trên bản đúng dấu).

---

## 12. Phân kỳ D1–D6

| Pha | Nội dung | Deploy được độc lập? |
|---|---|---|
| **D1 — Engine lõi** | Tầng 0–4 + schema concept + chỉ mục + `COLLISION_SET` tự sinh. Di trú `RAW`. `buildSearchQuery` trả thêm `spans/disambiguation`. **Chưa** đụng UI. | Có (backend, hành vi gần như cũ + hỏi-lại qua API) |
| **D2 — `tcm-queries.json` + CI** | ≥150 ca; runner; chặn CI khi đụng độ mới thiếu test. | Có |
| **D3 — CoreDB giữ dấu** ✅ | `build-tcm-dictionary.mjs` v2: sinh **2** thứ — `lib/tcm-dictionary.json` (legacy, 8005 khoá, **không đổi**) + `data/tcm-concepts/coredb.generated.jsonc` (2025 concept `trust:auto`, GIỮ DẤU vi + thanh py, KHÔNG cắt âm tiết). Shadow `verified` che `auto` (§6.1). 2589 mục CoreDB → 509 phụ tố bỏ → 2025 concept; vi 2087 · zh 2355 · py 2075 surface. 0 đụng độ verified mới. Suite 200/200. | Có |
| **D4 — UI hỏi-lại + chip tin cậy** | Trang chủ + workbench: hộp disambiguation, chip vàng "chưa rà", nút "Sai?". | Có |
| **D5 — Governance** | Bảng `dict_corrections` + `user_term_prefs`; tab admin "Báo sai"; G6 guard; trang `/cach-dich`. | Có |
| **D6 — LLM tầng cuối (2e)** ✅ code | Cụm `unresolved` còn sót (~5% noise sau D8) → `enrichUntranslated()` (tái dùng `lib/llm-translate.js` + `dict_candidates` của GĐ2). **CHỈ Discovery** — Evidence giữ `needs_resolution` (reviewer). Trần `medium` + `viaLLM` → chip vàng + hàng đợi G4. Quota: `LLM_TRANSLATE_RPM` (30/phút) + `LLM_TRANSLATE_DAILY_MAX` (400/ngày). No-op an toàn khi thiếu `ANTHROPIC_API_KEY`/MySQL. Wired: `routes/research.js` (sẵn có) + `routes/workbench.js` (D6). **Kích hoạt: set `ANTHROPIC_API_KEY` trên Hostinger.** | Có |

**D1 + D2 + D3 là lõi "trọn vẹn"** người dùng yêu cầu. D4–D6 là hoàn thiện.

### Cổng kích hoạt chung (review#1 — sửa §12)

D1/D2/D3 **commit riêng được**, nhưng **bật engine mới cho traffic production là MỘT cổng chung**, không bật lẻ:

1. D1 engine code xong (behind flag `TRANSLATE_ENGINE=legacy|v2`, mặc định `legacy`).
2. D2 `tcm-queries.json` ≥150 ca + negative controls, CI xanh.
3. D3 rebuild CoreDB giữ dấu + đối chiếu số lượng concept/surface-form trước–sau, **không mất / không ghi đè** term. ✅ (2026-09-08)
4. **Sau đó** mới đặt `TRANSLATE_ENGINE=v2` trên production. ← **D1+D2+D3 xong; sẵn sàng chạy `shadow` rồi `v2`. Chờ user chốt thời điểm bật.**

**Không bật D1 strict mode trước khi D2 + D3 xong.** Trước cổng, engine v2 chỉ chạy ở chế độ "shadow" (tính toán + log, không đổi `effective_query` thực gửi đi).

### Tiêu chí GATE D1–D3 (review#8 — bắt buộc đạt trước khi chuyển H1a)

- [x] **≥150 regression cases + negative controls** trong `tcm-queries.json` — **200 ca, 200/200 pass** (D2, 2026-09-08). CI: `.github/workflows/tcm-translate.yml`.
- [x] Mọi đụng độ mới trong `COLLISION_SET` (verified) có ca test — `scripts/tcm-collision-report.mjs` chặn CI. Đụng độ `auto` (27) vào `SOFT_COLLISION_SET`, không chặn (§6.1).
- [x] **Đối chiếu trước ↔ sau di trú — không mất dữ liệu** (D3, 2026-09-08): `lib/tcm-dictionary.json` 8005 khoá **giữ nguyên** (legacy engine không đổi); overlay concept thêm 2025 mục CoreDB (`trust:auto`, giữ dấu). Build script in bảng đối chiếu mỗi lần chạy (mục vào / phụ tố bỏ / concept sinh ra / surface vi·zh·py / đụng độ verified trước→sau).
- [x] **Các ca tối thiểu đúng** (v2, overlay bật): `giả châm`→sham acupuncture(high) · `chàm`→eczema · `châm cứu trúng phong`→acupuncture+stroke (legacy cũ ra "Zhongfeng LR4"+"eczema") · `trị/trĩ` phân biệt bằng dấu · `hoàng kỳ`(verified,high) · `tam thất`→Panax notoginseng(auto,medium) · `thận hư`→KIDNEY(medium)+«hư» · Hán `针灸预防中风` · không dấu `than`→ambiguous. Suite 200/200.
- [x] `buildSearchQuery()` **tương thích ngược** — chữ ký + trường cũ `{text, expandedFrom, note, untranslated}` nguyên vẹn ở mọi mode; caller `routes/research.js` (3 chỗ) + `routes/workbench.js` không đổi. `legacy` = mặc định, hành vi y hệt. Test category `shape` (2 ca) + boot server + `/api/research` 200.
- [x] Discovery: span `unresolved` **giữ nguyên văn** trong `effective_query` — test category "Discovery giữ unresolved" (5 ca).
- [x] Evidence: span `ambiguous`/`unresolved` → `needs_resolution: true`, engine không tự chạy search — test category "Evidence chặn" (6 ca).
- [x] `query_expanded` ghi `decision`/`transform`/`stage`/`engine_version` cho mọi span (engine trả `spans[]`); shadow mode đính thêm `query_expanded.shadow` vào provenance.

*(Reviewer PR #4 xác nhận GATE ĐẠT 2026-09-08 — 3 mục cuối trước đây là **stale checklist**, D2 đã có test category tương ứng, không thiếu implementation.)*

### Kích hoạt production — `shadow` TRƯỚC, KHÔNG bật thẳng `v2` (review PR #4)

1. **Hostinger: `TRANSLATE_ENGINE=shadow` + redeploy.**
   - Shadow **KHÔNG đổi** `effective_query`/kết quả thực gửi — vẫn dùng legacy.
   - Ghi **structured diff** `{engine_version, agree, legacy_outcome, v2_outcome, confidence, ambiguous_count, unresolved_count, needs_resolution}` (+ `search_run_id` khi có) — ra stdout (`translate_shadow_diff`) + `wb_search_runs.query_expanded.shadow` (trong provenance sẵn có). **KHÔNG** tạo kho raw-query mới, **KHÔNG** log user identity.
2. **Chuyển `shadow → v2` KHI ĐỦ 6 điều kiện** (không dùng số ngày cố định):
   1. server/search không có error/regression do engine shadow;
   2. không có ca `unresolved` bị mất khỏi Discovery;
   3. Evidence `ambiguous` vẫn `needs_resolution`, không phát search sai;
   4. review các legacy↔v2 disagreement thực tế: **không có "v2 sai trong khi legacy đúng" ở thuật ngữ lâm sàng**;
   5. soft collision nổi bật trong traffic được G4 rà; mapping đáng tin được promote/ghi test;
   6. CI vẫn 200/200 và build CoreDB đối chiếu không đổi bất thường.
3. Đủ 6 → **`TRANSLATE_ENGINE=v2` + redeploy**. Giữ `legacy` làm **rollback flag** trong giai đoạn chuyển đổi.

### Thứ tự triển khai (review PR #4 — chạy song song, không chờ thừa)

```
D1–D3 DONE ──► deploy shadow
                 ├─ Track A: quan sát/verify shadow → TRANSLATE_ENGINE=v2   (Translation Production Gate)
                 └─ Track B: H1a Auth Foundation   (độc lập, bắt đầu ngay)
H2 ◄── CHẶN CỨNG cho tới khi v2 đã bật production + regression gate xanh
```

- **H1a KHÔNG chờ** v2 ổn định — auth độc lập với translation.
- **H2 bị chặn cứng** bởi Translation Production Gate: chỉ bắt đầu/merge sau khi `v2` production + gate xanh. Vẫn giữ nguyên tắc "D trước H2".

---

## 13. Rủi ro & giảm thiểu

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| T-R1 | Giữ dấu ⇒ giảm recall khi người dùng gõ không dấu | TB | `surface_form` không-dấu `confidence: low` (Tầng 2a); hộp hỏi-lại biến "trượt" thành "chọn 1 cú bấm"; đo tỉ lệ gõ-không-dấu thật trên log |
| T-R2 | Người dùng bị hỏi quá nhiều (mệt) | TB | Chỉ hỏi khi thực sự mơ hồ (COLLISION_SET nhỏ, phần lớn cụm khớp thẳng Tầng 1); "nhớ lựa chọn" (`user_term_prefs`) áp cho lần sau; ngữ cảnh **chỉ sắp thứ tự** option (review#3), KHÔNG auto-resolve collision lâm sàng |
| T-R3 | Di trú `RAW` sai `domain` → G6 chặn nhầm / thả nhầm | TB | Người soát lại toàn bộ `domain` khi chuyển; `tcm-queries.json` bắt lỗi |
| T-R4 | `COLLISION_SET` phình to, chặn cả cụm đáng ra rõ | Thấp | Chỉ tính trên `surface_form.vi` **cùng độ dài token**; cụm nhiều từ hiếm khi đụng; log bảng đụng độ mỗi build để soát |
| T-R5 | Refactor lõi làm hỏng tìm kiếm đang chạy | Cao | `buildSearchQuery` giữ chữ ký + trường cũ; nhánh riêng; `tcm-queries.json` + hồi quy §9.2 của Milestone H trước khi merge |
| T-R6 | LLM (2e) lại dịch sai như "hội chứng ống cổ chân" trước đây | TB | Trần `medium` + luôn nhãn "chưa rà" + vào `dict_candidates(new)` chờ người duyệt; không bao giờ `high` |

---

## 14. Câu hỏi cần chốt — **ĐÃ CHỐT (review PR #4, 2026-09-08)**

| # | Câu hỏi | Chốt |
|---|---|---|
| 1 | D1–D3 trước H2? | ✅ **Có** — thứ tự khóa: D1–D3 → H1a → H2 → H3/H4. D4–D6 sau H2 theo nhu cầu. |
| 2 | Ngưỡng hỏi-lại | ✅ **Luôn hỏi / require resolution** cho collision lâm sàng. Ngữ cảnh **chỉ rank** option, không auto-resolve. |
| 3 | Người chủ trì G4 | ✅ **Hạ Vân Minh (chủ dự án) nhận chủ trì** (2026-09-08). Audit `reviewed_by`/`reviewed_at`. Có thể delegate sau. |
| 4 | D6 LLM | Reviewer: OFF cho v1. **Chủ dự án override (2026-09-08):** bật D6 TRƯỚC khi đổi v2 — build + đo cụ thể rồi mới flip. Giữ ràng buộc reviewer: LLM CHỈ sinh candidate (`medium` + hàng đợi G4), **KHÔNG** tự đổi Evidence query (Evidence vẫn `needs_resolution`); có quota trần (`LLM_TRANSLATE_DAILY_MAX=400`). |
| 5 | `data/tcm-concepts/` | ✅ **Nhiều `.jsonc` theo domain** + schema validation ở build để chặn trùng `id` xuyên file. |
| 6 | Song ngữ ngược | ✅ **Để milestone sau.** Không mở phạm vi D1–D3. |

**6/6 câu §14 CLOSED (review PR #4, 2026-09-08).**

**Reviewer decision (sau D3, 2026-09-08):** **GATE D1–D3 ĐẠT.** Cho phép: deploy `shadow` ngay + bắt đầu **H1a song song**; **H2 chờ Translation Production Gate** (`v2` production + regression xanh — 6 điều kiện §12). Không mở thêm thiết kế.

---

*Hết v3 (đã áp review PR #4 + chốt sau D3). Nhánh code: `impl/translation-engine`. Engine: legacy (mặc định) → shadow → v2.*
