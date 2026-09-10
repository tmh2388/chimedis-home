# P0 Synthetic Shadow Validation — ANALYSIS v1

> Sinh sau raw (`docs/translation-shadow-p0-synthetic-raw-v1.md`). Scoring theo `docs/translation-shadow-p0-automation-v1.md` §7–8 và rollout §3.
> Generated: 2026-09-10T04:08:18.791Z
> **KHÔNG patch trong task này. KHÔNG bật v2. KHÔNG mở P1.**

## 0. Trạng thái

**P0 SYNTHETIC EXECUTION COMPLETE — RUNTIME LOGS KHÔNG CỨU ĐƯỢC.**

Hostinger hPanel Runtime logs chỉ giữ tới lần restart kế tiếp (11:58 SEP 10 đã xoay vòng toàn bộ cửa sổ synthetic `2026-09-10T02:30:52.455Z → 2026-09-10T03:34:02.795Z`). Giả định của `docs/translation-shadow-p0-automation-v1.md` §5 ("chủ dự án export logs sau") KHÔNG đúng với host này.

**Cơ sở thay thế cho phía v2 (§F):** engine v2 hoàn toàn deterministic (chỉ đọc `data/tcm-concepts/**`, không mạng/DB). Bằng chứng correlation:
- production `query.effective` (phía legacy, THẬT) == local legacy engine **100.0%** (512/512) → môi trường build ≡ production, không overlay MySQL làm lệch;
- **0 lỗi engine** trên 620 lần chạy local (không có `translate_v2_error` kỳ vọng ở production; khớp success-rate 99% của Cohort A);
→ local v2 outcome ≈ production shadow v2 outcome với độ tin cậy cao. §F dùng làm số liệu v2 chốt được, ghi rõ caveat. **Reviewer quyết** có chấp nhận cơ sở này cho Gate P0 hay yêu cầu thêm 1 sink log bền + re-run ngắn.

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

## F. Local-deterministic v2 correlation (Runtime logs KHÔNG CỨU ĐƯỢC — dùng làm số liệu v2 chốt được)

Cơ sở tin cậy: local legacy == production `query.effective` **100.0%**; **0 lỗi engine** / 620 lần chạy; engine deterministic.

### F1. Agree legacy vs v2 (517 Discovery, local v2 authoritative)
- agree (khớp chính xác sau normalize): **43/517 (8.3%)**
- disagree: **474 (91.7%)**

### F2. Phân loại disagreement (heuristic — cần G4 xác nhận mẫu)
- UNCERTAIN — needs G4: 219 (42.8%)
- EQUIVALENT (synonym-set wording): 135 (26.4%)
- v2 WORSE (leaks raw tokens): 62 (12.1%)
- EQUIVALENT (exact): 43 (8.4%)
- v2 BETTER (adds valid concept group): 31 (6.1%)
- v2 WORSE (known R4/R5 wrong mapping): 14 (2.7%)
- v2 BETTER (fewer stray fragments): 8 (1.6%)

Gom nhóm:
- **EQUIVALENT** (exact + synonym-set wording): 178 (34.8%)
- **v2 BETTER**: 39
- **v2 WORSE**: 76 — trong đó known R4/R5 (khóa P1) = 14, leak raw tokens (R11, out-scope) = 62
- **UNCERTAIN — G4**: 219

### F3. v2 confidence (517 Discovery, cộng dồn concept)
- high: 928 · medium: 137 · low: 0
- case có ≥1 `unresolved`: 341/517 (66.0%) · case có `disambiguation`: 6
- `needs_resolution` ở Discovery: 0 (đúng — chỉ Evidence gate).

### F4. Cái local KHÔNG thay thế được
- Xác nhận production shadow path chạy đúng cho từng request (chỉ Runtime logs mới trực tiếp).
- `translate_shadow_diff` có bị lỗi/không cho request cụ thể nào không (gián tiếp: 99% success + 0 lỗi engine local ⇒ khả năng rất thấp).
- Organic traffic thật (Cohort C).
→ Cần **1 sink log bền** (file JSONL dưới app-dir HOẶC bảng `translate_shadow_log` MySQL — cùng loại "P0 observability" như `translate_config`/`translate_v2_error` đã chấp nhận) cho vòng verification production trước P4 (§8 vốn đã yêu cầu ≥1 lớp production/organic).

## D. Severity (từ dữ liệu chốt được)

### S0 — Critical
- Cohort B: **0** (0 Evidence ambiguity auto-run sai; 0 Boolean logic bị đổi).
- Cohort A (local v2 authoritative §F): **0** — không case nào v2 xoá âm thầm concept có nghĩa mà legacy giữ; các disagreement "v2 WORSE" là known R4/R5 (khóa P1) hoặc leak raw token (R11 out-scope), không phải silent drop. Xác nhận trực tiếp per-request cần sink log bền (§F4).

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
| clinical disagreements được G4 phân loại | ⏳ G4 xét §F2 + 2 cờ NEGATIVE (trên số liệu local — Runtime logs không cứu được) |
| ≥1 lớp production Evidence/organic smoke trước flip v2 | ⏳ chưa — cần sink log bền + organic (trước P4, §F4) |

### Kết luận

**P0 SYNTHETIC EXECUTION COMPLETE.** Runtime logs KHÔNG cứu được (Hostinger xoay vòng) → phía v2 dùng số liệu local-deterministic §F, reviewer quyết có chấp nhận.

Đã hoàn tất theo `docs/translation-shadow-p0-automation-v1.md` §9: (1) pack 620 hợp lệ; (2) Cohort A production Discovery 517/517; (3) Cohort B local Evidence 103/103; (4) raw artifacts đã commit.

Chốt được ngay:
- Cohort B: **0 Evidence ambiguity/uncertainty auto-run sai**, **0 Boolean structure fail** → tiêu chí bắt buộc Evidence ĐẠT.
- Cohort A hạ tầng: 99.0% success, 5 lỗi đều 502 upstream, latency ổn, không abort → **không server regression do shadow**.
- §F (local v2 authoritative): Discovery agree 8.3%; EQUIVALENT 178 · v2 BETTER 39 · v2 WORSE 76 (known R4/R5 14 → khóa P1; leak-tokens 62 → R11 out-scope) · UNCERTAIN-G4 219.
- **0 S0** xác nhận. **0 lỗi engine** / 620 local run.

Chờ / cần G4 (2 mục):
- **P0-0483** "Hoàng Kỳ Anh luận văn thạc sĩ" → `hoàng kỳ→Astragalus membranaceus (high)` = **ứng viên S1** (tên người → dược liệu). Root cause: `looksLikeProperNoun()` chỉ chặn match **đơn token**; surface 2-token trùng tên người → lọt.
- **P0-0008** "Đại học Y Hà Nội nghiên cứu đột quỵ" → `đột quỵ→stroke (high)` + rác token địa danh = S2/S3 (từ chủ đề thật).

Việc còn lại (reviewer quyết):
1. Chấp nhận §F (local-deterministic) làm cơ sở v2 cho Gate P0? Nếu có → chỉ còn G4 xét 2 mục trên.
2. Thêm **1 sink log bền** (`translate_shadow_diff` → file JSONL app-dir hoặc bảng MySQL `translate_shadow_log`) — cùng hạng P0-observability như `translate_config`/`translate_v2_error` — cho vòng verification production/organic bắt buộc trước P4 (§8/§F4).

KHÔNG tự chuyển `TRANSLATE_ENGINE=v2`. KHÔNG mở P1. KHÔNG patch.
Patch nhỏ nhất **nếu G4 xác nhận P0-0483 là S1**: mở rộng `looksLikeProperNoun()` (engine.js) cho clinical surface **đa token** khi mọi token Title-Case + có hàng xóm Title-Case. Chờ reviewer.
