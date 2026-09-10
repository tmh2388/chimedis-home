# Translation Data Quality — Batch 01 (P1)

> Theo `docs/translation-engine-production-rollout-v1.md` §4. **Một batch duy nhất.**
> Trạng thái: **G4 ĐÃ DUYỆT (2026-09-10)** — quyết định: (1) GIỮ `sciatica`, không mở thêm disease mapping khác; (2) KHÔNG regen CoreDB trong P1, giữ generator `cleanEn()` fix, ghi backlog upstream drift; (3) THÊM đúng 2 surface `脑卒中`/`腦卒中 → stroke`.
> Mọi concept mới `trust:verified source:hand`, override CoreDB-auto theo cơ chế `topTier()` sẵn có.

---

## 1. CoreDB-auto sai (§4 item 1) — sửa bằng verified override

| Bug (blind R4) | Trước | Sau (verified) | File |
|---|---|---|---|
| `脑 / 腦 → "part of the brain"` | `coredb-part-of-the-brain` (medium) | **`gm-brain` → "brain"** (+ cerebral, encephalon); surface vi `não`/`não bộ`, zh `脑`/`腦`, py `nǎo` | `general-medical.jsonc` |
| `đau thần → "nephralgia"` (mảnh của "đau thần kinh", trùng folded `dau than` với "đau thận") | `đau thần kinh` → `"nephralgia" kinh` | **`gm-neuralgia` → "neuralgia"** surface `đau thần kinh`/`đau dây thần kinh`, zh `神经痛`/`神經痛` → Tầng-1 exact 3-token thắng, không rơi folded | `general-medical.jsonc` |
| `cơ → "neck"` | *đã tự khỏi* — bộ lọc D8 (surface auto 1 âm tiết ≤4 kí tự) đã loại; `cơ` hiện = unresolved | không cần override | — |
| `da → "Aureus"` | *đã tự khỏi* — `da` hiện bị bỏ khỏi query | không cần override | — |
| `đau thận → nephralgia` (đúng) | giữ nguyên | **positive control** `B01-nephralgia-kept` bảo vệ | — |

## 2. Concept còn thiếu (§4 item 2)

| Concept | id | EN | Surface chính | File |
|---|---|---|---|---|
| Quy Tỳ Thang | `guipi-tang` | Guipi Tang (Gui Pi Tang / Restore the Spleen Decoction) | vi `quy tỳ thang`, zh `归脾汤`/`歸脾湯` | `formula.jsonc` |
| Ôn Đởm Thang | `wendan-tang` | Wendan Tang (Wen Dan Tang / Warm the Gallbladder Decoction) | vi `ôn đởm thang`, zh `温胆汤`/`溫膽湯` | `formula.jsonc` |
| Đại Thừa Khí Thang | `da-chengqi-tang` | Da Chengqi Tang (Da Cheng Qi Tang / Major Order the Qi Decoction) | vi `đại thừa khí thang`, zh `大承气汤`/`大承氣湯` | `formula.jsonc` |
| đàm nhiệt nhiễu tâm | `phlegm-heat-harassing-heart` | phlegm-heat harassing the heart | vi `đàm nhiệt nhiễu tâm`, zh `痰热扰心`/`痰熱擾心` | `pattern.jsonc` |
| hỏa châm | `fire-needling` | fire needling (fire needle acupuncture) | vi `hỏa châm`, zh `火针`/`火針`, py `huǒ zhēn` | `method.jsonc` |
| mai hoa châm | `plum-blossom-needling` | plum-blossom needling (seven-star needle / cutaneous acupuncture) | vi `mai hoa châm`/`kim mai hoa`, zh `梅花针`/`梅花針`, py `méi huā zhēn` | `method.jsonc` |
| đau thần kinh → neuralgia | `gm-neuralgia` | neuralgia | (xem §1) | `general-medical.jsonc` |
| đau khớp gối (giữ "gối") | `gm-knee-pain` | knee pain (gonalgia) | vi `đau khớp gối`/`đau gối`/`đau đầu gối`, zh `膝关节疼痛`/`膝關節疼痛` | `general-medical.jsonc` |
| **[bổ sung liên đới]** đau thần kinh tọa → sciatica | `sciatica` | sciatica (sciatic neuralgia) | vi `đau thần kinh tọa`/`toạ`/`đau dây thần kinh tọa`, zh `坐骨神经痛`/`坐骨神經痛` | `disease.jsonc` |

> `sciatica` KHÔNG nằm trong danh sách §4 nguyên văn nhưng cùng lỗi gốc với `đau thần → nephralgia`: nếu chỉ thêm `đau thần kinh→neuralgia`, chuỗi "đau thần kinh tọa" sẽ ra `"neuralgia" toạ` (token "toạ" lẻ). Thêm sciatica đóng trọn defect. **G4 xác nhận có giữ mục này không.**

## 3. Traditional Chinese (§4 item 3)

- Concept mới đều có sẵn surface phồn thể (`歸脾湯`, `溫膽湯`, `大承氣湯`, `痰熱擾心`, `火針`, `梅花針`, `神經痛`, `膝關節疼痛`, `坐骨神經痛`, `腦`).
- Bổ sung surface phồn thể cho verified **hiện có** mà bộ blind I-group + shadow traffic phồn thể cần: `针灸`→`針灸`, `针刺`→`針刺` (acupuncture); `电针`→`電針` (electroacupuncture); `脾气虚`→`脾氣虛`, `脾虚`→`脾虛`; `肾阳虚`→`腎陽虛`; `肾阴虚`→`腎陰虛`; `中风`→`中風` (stroke).
- **Kết quả:** `腎陰虛針灸治療` (phồn thể đa-concept không-space, blind R6 = 0 concept trước đây) → **`kidney yin deficiency` + `acupuncture`** ✅
- **KHÔNG** thêm S2T tự động toàn bộ CoreDB (cần bảng chuyển đổi / OpenCC — rủi ro cho một data batch). Để lần regen có kiểm.

### `脑卒中` (G4 decision 3)

Thêm đúng 2 exact verified surface vào concept `stroke`: `脑卒中`, `腦卒中` (zh, high). CJK segmenter longest-match-first ⇒ cụm 3 ký tự thắng `脑 → brain` ⇒ `脑卒中`/`腦卒中` → **chỉ `stroke`** (không còn `brain + stroke`). `脑`/`腦` đứng riêng vẫn → `brain`. `脑出血`/`脑梗死` không đổi. Không mở rộng thêm cụm nào khác.

## 4. Pinyin homophone `zhong feng` (§4 item 4)

- Thêm py surface **có thanh**: `zhōng fēng` → `lr4-zhongfeng` (huyệt LR4 中封); `zhòng fēng` → `stroke` (中风).
- Hai surface fold về cùng `zhong feng` → **COLLISION_SET verified** (đụng độ verified thứ 4).
- `zhong feng` (không thanh) → **ambiguous**, KHÔNG mặc định. `zhōng fēng`→LR4, `zhòng fēng`→stroke (rõ khi có thanh).
- Test bắt buộc đã thêm: `B01-zhongfeng-toneless-ambiguous` / `-tone-lr4` / `-tone-stroke` → collision gate exit 0.

## 5. Canonical English label bẩn (§4 item 5)

- `scripts/build-tcm-dictionary.mjs` `cleanEn()`: đổi từ 1-lần-strip sang **lột lặp** hậu tố tác giả thực vật học (thêm `et`, `ex`, `f.`, `emend.`, `Bunge`, `Gaertn.`, `R.Br.`… + lặp) → `"Prunus mume Sieb. et"` → `"Prunus mume"`; `"... Sieb. et Zucc. fruit"` → `"... fruit"`.
- **Áp dụng ở lần regen CoreDB có kiểm sau.** Tạm thời che nhãn đã biết bằng verified `prunus-mume` → "Prunus mume" (surface `mai hoa` / `梅花` / `méi huā`).

## 6. `same_as` (§4 item 6)

- KHÔNG thêm mới trong batch này (không có duplicate thật nào G4 đã xác nhận). `astragalus-membranaceus` ↔ `astragalus-propinquus` đã có sẵn.

## 7. Regenerate CoreDB (§4 item 7) — **HOÃN, cần G4 quyết**

Chạy `node scripts/build-tcm-dictionary.mjs` (nguồn `dict.chimedis.vn/api/terms`) cho ra:

| | Snapshot đã commit (2026-09-08) | Nguồn hiện tại (2026-09-10) |
|---|---|---|
| Mục vào | ~2.5k | **4745** |
| CoreDB concept | **2025** | **3890** (+1865) |
| `lib/tcm-dictionary.json` khoá | 8005 | **12369** (+4364) |

Nguồn `dict.chimedis.vn` đã **tăng ~92%** kể từ snapshot. Import trọn = mở rộng từ điển +1865 concept auto **chưa rà** → vi phạm khoá phạm vi rollout §2 ("Mở rộng từ điển ngoài các lỗi S2 đã biết" = OUT OF SCOPE).

**Quyết định:** giữ `coredb.generated.jsonc` + `lib/tcm-dictionary.json` **NGUYÊN** trong Batch 01 (delta = 0). `cleanEn()` fix đã commit sẵn cho **một chu kỳ regen có kiểm riêng** sau khi P1 xong. Bảng "đối chiếu trước-sau" cho Batch 01: CoreDB không đổi; toàn bộ sửa qua verified override + generator code.

**G4 chốt:** hoãn full regen. Commit `cleanEn()` fix, **KHÔNG** sinh lại `coredb.generated.jsonc`.

> **BACKLOG (sau khi rollout v2 DONE):** `dict.chimedis.vn` upstream đã drift `2025 → 3890` CoreDB concept (`lib/tcm-dictionary.json` 8005 → 12369 khoá). Mở task riêng "CoreDB refresh" — regen có kiểm + rà đụng độ + blind — KHÔNG gộp vào rollout v2.

---

## 8. Kiểm (đã chạy)

| Gate | Kết quả |
|---|---|
| Regression suite | **225 / 225 pass** (200 gốc + 10 PN + 15 B01) |
| Collision gate | **exit 0** — 4 đụng độ verified (`cham`, `tri`, `trung phong`, **`zhong feng` mới**), tất cả có test; 26 auto không đổi |
| Benchmark `translate-score` | v2 **94.3** ≥ legacy 82.7 ✅ (không đổi) |
| Blind v1.1 (180 probe) | **0 S0, 0 S1** — 25 cờ heuristic đều là: (a) P1 cải thiện bị heuristic đọc nhầm (concept đa-token nuốt token con: `gối`, `hỏa`, `nhiễu`, `não`→brain, `huyết` trong `tăng huyết áp`), hoặc (b) hành vi D8/R11 stoplist **có sẵn** đã ghi nhận "thấp rủi ro" ở blind recheck v1.1 (`mỏi`, `tái`, `văn` trong tên). KHÔNG có lỗi mới do Batch 01. |
| `脑/nephralgia/Sieb. et` trong toàn blind | **0 lần** xuất hiện — item 1 & 5 sạch |
| Concept toàn hệ | 2197 → **2208** (verified 172 → 183, +11; CoreDB 2025 không đổi) |

### Blind cases §4 trực tiếp — trước → sau

| id | input | Trước (blind v1.1) | Sau Batch 01 |
|---|---|---|---|
| A07 | mai hoa châm điều trị đau thần kinh | `"Prunus mume Sieb. et"` + `"nephralgia"` | `plum-blossom needling` + `treatment` + `neuralgia` ✅ |
| A08 | hỏa châm điều trị đau mạn tính | `hỏa` (unres) + acupuncture | `fire needling` + `đau`(unres) + `chronic` ✅ |
| B08 | đàm nhiệt nhiễu tâm và mất ngủ | `đàm nhiệt nhiễu tâm` (unres) | `phlegm-heat harassing the heart` + `insomnia` ✅ |
| D08–D10 | Quy Tỳ / Ôn Đởm / Đại Thừa Khí Thang | unres | 3 formula dịch đủ ✅ |
| I09 | 腎陰虛針灸治療 (phồn thể) | 0 concept | `kidney yin deficiency` + `acupuncture` ✅ |
| — | 脑卒中 / 腦卒中 | `"part of the brain"` + stroke | **`"stroke"`** (2 surface exact G4 decision 3 — cụm dài thắng `脑→brain`) |

---

## 9. Sau khi G4 duyệt

1. Commit các file: `data/tcm-concepts/{acupoint,disease,formula,general-medical,herb,method,pattern}.jsonc`, `scripts/build-tcm-dictionary.mjs`, `test/tcm-queries.json`.
2. Comment PR #4: `P1 Batch 01 DONE — regression 225/225, collision exit0, blind v1.1 0 S0/S1`.
3. Sang **P2** (chỉ nếu còn lỗi thật) hoặc thẳng **P3 Final Validation**.

**KHÔNG** mở Batch 02. **KHÔNG** regen CoreDB trong batch này. **KHÔNG** bật `TRANSLATE_ENGINE=v2`.
