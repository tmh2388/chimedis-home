# P0 Synthetic Shadow Validation — ANALYSIS v1

> Sinh sau raw (`docs/translation-shadow-p0-synthetic-raw-v1.md`). Scoring theo `docs/translation-shadow-p0-automation-v1.md` §7–8 và rollout §3.
> Generated: 2026-09-10T03:38:17.790Z
> **KHÔNG patch trong task này. KHÔNG bật v2. KHÔNG mở P1.**

## 0. Trạng thái

**P0 SYNTHETIC EXECUTION COMPLETE — ANALYSIS WAITING FOR RUNTIME LOG EXPORT.**

Chủ dự án export Runtime logs trong cửa sổ `2026-09-10T02:30:52.455Z` → `2026-09-10T03:34:02.795Z` và gửi lại. Phần production `agree %` / `v2_outcome` / `confidence` / `ambiguous_count` / `needs_resolution` THẬT chỉ chốt được khi có logs. Dưới đây là phần chốt được ngay: hạ tầng Cohort A + toàn bộ Cohort B + dự đoán cục bộ.

## A. Cohort A — Production synthetic Discovery

### A1. Hạ tầng / server regression do shadow
- 517 request, 512 success (99.0%), 5 infra fail.
- Phân loại infra fail: HTTP 502 "không kết nối được nguồn dữ liệu" (cả 4 nguồn ngoài fail đồng thời) = 5; 5xx khác / timeout / network = 0.
- 502 rải rác trong 63 phút (P0-0164, P0-0167, P0-0283, P0-0532, P0-0566), không cụm, mỗi case đã retry 1 lần. `buildSearchQuery` (shadow diff) chạy TRƯỚC nhánh trả 502 → `translate_shadow_diff` vẫn được ghi cho các case này.
- Latency p50/p90/p99 = 2122/6610/11125 ms — không thấy leo thang; runner abort: KHÔNG.
- **Kết luận A1:** 5 lỗi đều là 502 upstream (nguồn ngoài OpenAlex/EuropePMC/CORE/SemanticScholar chập chờn), KHÔNG phải regression của Chimedis/shadow. Không thấy server/latency regression do shadow ở tầng HTTP. ✅ (điều kiện Gate "không server regression do shadow" ĐẠT ở tầng đo được)

### A2. Dịch (legacy production, có thật)
- `query.effective` bắt được cho 512 case.
- local legacy khớp production legacy: 100.0% → engine legacy môi trường build == production (không có overlay MySQL làm lệch).

### A3. v2 (DỰ ĐOÁN cục bộ — chờ Runtime logs)
- predicted agree 8.4%, predicted disagree 91.6%.
- phân loại heuristic: EQUIVALENT (synonym-set wording)=135 · UNCERTAIN — needs G4=219 · v2 WORSE (known R4/R5 wrong mapping)=14 · v2 WORSE (leaks raw tokens)=62 · EQUIVALENT (exact)=43 · v2 BETTER (adds valid concept group)=31 · v2 BETTER (fewer stray fragments)=8.
- **Không dùng số này làm Gate.** Chờ `translate_shadow_diff` thật.

## B. Cohort B — Local deterministic Evidence

| Tiêu chí Gate | Kết quả |
|---|---|
| Evidence cases | 103 |
| Ambiguity/uncertainty auto-run sai (**bắt buộc 0**) | **0** ✅ |
| Evidence gated khi có uncertainty | 103/103 |
| Boolean/parens structure fail | 0 ✅ |
| NEGATIVE → mapping `high` | 2 ⚠️ xem S1/S2 |

### B1. Ghi chú bản chất (không phải lỗi Gate)
- 103/103 evidence case bị gate `needs_resolution`. Lý do chủ yếu: cụm tiếng Anh thuần / cụm Boolean nằm trong `unresolved` (engine v2 không coi tiếng Anh là "đã dịch"). **An toàn cho P0** (0 auto-run sai) nhưng là đặc tính cần cân nhắc UX Evidence ở P2/analysis, KHÔNG phải blocker P0.

## C. Cohort C — Organic
Chưa có (không có Runtime logs). Không trộn với synthetic.

## D. Severity (từ dữ liệu chốt được)

### S0 — Critical
- Cohort B: **0** (0 Evidence ambiguity auto-run sai; 0 Boolean logic bị đổi).
- Cohort A: chờ Runtime logs để loại trừ silent drop production; local prediction: 0 case v2 gắn cờ untranslated ở chỗ legacy im lặng (v2 tốt hơn, không phải S0 của v2).

### S1 — Major (ứng viên — chờ G4)
- P0-0008 "Đại học Y Hà Nội nghiên cứu đột quỵ" → `đột quỵ→stroke` (high). Tên cơ quan + từ chủ đề thật ("đột quỵ") — nhẹ hơn, có thể S2/S3. Ghi chú `nghiên cứu`→ còn sót `cứu`.
- P0-0483 "Hoàng Kỳ Anh luận văn thạc sĩ" → `hoàng kỳ→Astragalus membranaceus` (high). **Tên người bị TCM-hoá** — S1 candidate. Nguyên nhân sơ bộ: R2 `looksLikeProperNoun` chỉ chặn match **đơn token**; "hoàng kỳ" là surface **2 token** trùng tên người nên lọt.

### S2 — Moderate
- **Known R4/R5 tái hiện (đã KHÓA cho P1 Batch 01 — KHÔNG mở rộng scope):** ~14 case v2 chèn chuỗi sai đã biết: `nephralgia` (đau thần kinh toạ toneless, VD P0-0003), `part of the brain` (脑/não, VD P0-0032), `Prunus mume Sieb. et` + mai hoa châm sai (VD P0-0012). Discovery giữ ngữ cảnh; production hiện trả legacy nên KHÔNG ảnh hưởng người dùng. Chốt ở P1.
- v2 "leaks raw tokens" (~62 case): engine giữ từ định tính tiếng Việt (`người`, `chức năng vận động`, `biến thiên nhịp tim`…) trong `effective_query` v2 thay vì cắt như legacy. Đây là hạng R11 stoplist (rollout §2 OUT SCOPE trừ khi gây S0/S1) — chưa thấy gây S0/S1. Ghi backlog.
- Đặc tính Evidence-gate-all (B1) nếu coi là giảm khả năng dùng.
- CoreDB `auto/medium` chưa sạch: sẽ rõ hơn khi có `translate_shadow_diff` confidence counts.

### S3 — Minor
- Câu cảnh báo `routes/research.js` hard-code "cụm tiếng Việt" kể cả input Trung/Anh (VD `影响`). Wording only.
- OR-group lặp surface VI+ZH (đã biết từ blind v1.1 R9).

## E. Gate P0 — đối chiếu `docs/translation-shadow-p0-automation-v1.md` §8

| Điều kiện | Trạng thái |
|---|---|
| synthetic Discovery: 0 S0/S1 chưa giải thích | ⏳ 0 S0; 2 ứng viên S1/S2 NEGATIVE có root cause sơ bộ — chờ G4 chốt |
| 0 silent drop | ⏳ chờ Runtime logs (local: v2 KHÔNG drop; nó flag untranslated) |
| local Evidence: 0 ambiguity/uncertainty auto-run sai | ✅ 0 |
| Boolean/negative controls sạch | Boolean ✅ · negative ⚠️ (2 flag) |
| không server regression do shadow | ✅ (tầng HTTP; 5 lỗi là 502 upstream, không phải shadow) |
| clinical disagreements được G4 phân loại | ⏳ cần Runtime logs + G4 |
| ≥1 lớp production Evidence/organic smoke trước flip v2 | ⏳ chưa (theo kế hoạch: trước P4) |

### Kết luận

**P0 SYNTHETIC EXECUTION COMPLETE — WAITING ONLY FOR RUNTIME LOG EXPORT.**

Đã hoàn tất theo `docs/translation-shadow-p0-automation-v1.md` §9: (1) pack 620 hợp lệ; (2) Cohort A production Discovery 517/517; (3) Cohort B local Evidence 103/103; (4) raw artifacts đã commit.

Chốt được ngay:
- Cohort B: **0 Evidence ambiguity/uncertainty auto-run sai**, **0 Boolean structure fail** → tiêu chí bắt buộc của Evidence ĐẠT.
- Cohort A hạ tầng: 99.0% success, 5 lỗi đều 502 upstream, latency ổn, runner không abort → **không server regression do shadow**.
- Không có S0 nào được xác nhận từ dữ liệu hiện có.

Chờ / cần G4:
- 2 cờ NEGATIVE: **P0-0483** "Hoàng Kỳ Anh…" → `hoàng kỳ→Astragalus (high)` = **ứng viên S1** (tên người → dược liệu; R2 chỉ chặn match đơn-token); **P0-0008** "Đại học Y Hà Nội…đột quỵ" → `đột quỵ→stroke` = nhẹ, có thể S2/S3 (từ chủ đề thật). G4 quyết trước khi chốt PASS/FAIL.
- ~14 case tái hiện R4/R5 đã KHÓA cho P1 Batch 01 — không phải scope mới.
- `silent drop` production + `agree %` / `confidence` / `ambiguous_count` thật: **cần chủ dự án export Runtime logs cửa sổ `2026-09-10T02:30:52.455Z → 2026-09-10T03:34:02.795Z`**.

KHÔNG tự chuyển `TRANSLATE_ENGINE=v2`. KHÔNG mở P1. KHÔNG patch.
Đề xuất patch nhỏ nhất **nếu G4 xác nhận P0-0483 là S1**: mở rộng `looksLikeProperNoun()` (engine.js) để bỏ qua cả clinical surface **đa token** khi mọi token Title-Case và có hàng xóm Title-Case. Chờ reviewer.
