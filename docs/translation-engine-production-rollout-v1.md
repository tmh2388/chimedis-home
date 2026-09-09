# Translate Engine v2 — Production Rollout v1

> **Mục tiêu duy nhất:** đưa `TRANSLATE_ENGINE=v2` lên production an toàn và mở khóa H2.
>
> **Không mở thêm phạm vi** ngoài các gate dưới đây. Mọi ý tưởng khác đi backlog sau khi đạt đích.
>
> Trạng thái nền (2026-09-09): PR #4 đã merge/đóng; blind v1.1 PASS; regression 200/200; `main` đã có R1/R2/R3; production giữ `TRANSLATE_ENGINE=shadow`.

---

## 1. ĐÍCH ĐẾN (Definition of Done)

Rollout này CHỈ được coi là hoàn tất khi đạt đồng thời:

1. `TRANSLATE_ENGINE=v2` chạy production.
2. `legacy` vẫn giữ làm rollback flag trong giai đoạn ổn định.
3. 0 lỗi S0/S1 trong validation cuối.
4. 0 clinical term `verified/high` sai nghiêm trọng.
5. 0 `unresolved` bị âm thầm xoá khỏi Discovery.
6. Evidence ambiguity/uncertainty theo policy bị chặn/confirm đúng; không phát search sai.
7. Boolean `AND/OR/NOT`, ngoặc và phrase quotes không bị phá.
8. Negative-control/tên người không bị TCM-hoá sai.
9. Regression suite vẫn 200/200 + collision CI PASS.
10. H2 được gỡ blocker và có thể triển khai.

**Sau khi đủ 10 mục trên: đóng rollout. Không tiếp tục “tối ưu thêm” trong cùng milestone.**

---

## 2. PHẠM VI CỐ ĐỊNH

### IN SCOPE

- Shadow production verification.
- `Translation Data Quality Batch 01` — chỉ các lỗi S2 đã biết từ blind v1.
- 2 engine-polish nhỏ nếu vẫn còn sau data batch:
  1. OR-group dedupe theo `conceptId`.
  2. Evidence `toneless + medium` clinical → confirmation/needs-resolution policy.
- Một vòng validation cuối.
- Flip `shadow → v2` + rollback plan.

### OUT OF SCOPE — KHÔNG ĐƯỢC MỞ TRONG ROLLOUT NÀY

- D6 LLM tự động cho production launch.
- Dịch ngược EN→VI.
- Mở rộng từ điển ngoài các lỗi S2 đã biết.
- H2/H3/M3/M4 implementation trước khi Translation Production Gate đạt.
- Refactor lớn R11 stoplist, trừ khi shadow chứng minh nó gây S0/S1 thực tế.
- New search sources/connectors.
- UI redesign.

Nếu phát hiện lỗi mới:
- S0/S1 → được phép patch vì là blocker.
- S2/S3 → ghi backlog, **không tự động mở rộng scope**, trừ khi nó nằm trong Batch 01 đã khóa.

---

## 3. P0 — SHADOW PRODUCTION VALIDATION

### Cấu hình

- `TRANSLATE_ENGINE=shadow`.
- Trong rollout này, **khóa D6 để đo deterministic engine riêng**: `LLM_TRANSLATE_DAILY_MAX=0` (hoặc không cấu hình `ANTHROPIC_API_KEY` cho translator nếu hạ tầng cho phép tách).
- Shadow không được thay đổi `effective_query` thực gửi search.

### Theo dõi

Dùng `translate_shadow_diff` / provenance hiện có; không tạo kho raw-query mới.

Tối thiểu theo dõi:
- tổng query;
- `% agree legacy vs v2`;
- disagreements;
- ambiguous/unresolved;
- medium-confidence;
- soft collisions xuất hiện;
- lỗi server/latency do shadow;
- các case `v2 sai trong khi legacy đúng`, ưu tiên clinical.

### Gate P0

PASS khi:
- 0 S0/S1 mới từ traffic đã review;
- 0 silent drop;
- 0 Evidence ambiguity tự resolve sai;
- không có regression server/search do shadow;
- các disagreement clinical nổi bật đã được G4 phân loại nguyên nhân.

P0 FAIL → chỉ patch blocker S0/S1, re-run regression + blind v1.1, rồi quay lại P0.

---

## 4. P1 — TRANSLATION DATA QUALITY BATCH 01

**Một batch duy nhất. Không vá từng câu blind.**

### Batch 01 khóa đúng các nhóm sau

1. Sửa mapping CoreDB-auto sai đã biết:
   - `cơ → neck`;
   - `da → Aureus`;
   - `não/脑 → part of the brain`;
   - `đau thần → nephralgia`.
2. Bổ sung concept còn thiếu đã biết:
   - Quy Tỳ Thang;
   - Ôn Đởm Thang;
   - Đại Thừa Khí Thang;
   - đàm nhiệt nhiễu tâm;
   - hỏa châm;
   - mai hoa châm;
   - đau thần kinh → neuralgia;
   - đau khớp gối giữ đủ concept “gối”.
3. Traditional Chinese:
   - sinh surface phồn thể cần thiết từ giản thể trong build;
   - ưu tiên cụm multi-concept không-space.
4. Pinyin homophone:
   - `zhong feng` không được mặc định thành LR4 khi stroke cũng là ứng viên; phải ambiguous/resolve theo policy.
5. Dọn canonical English label bẩn trong CoreDB generator (botanical-author suffix / malformed labels đã biết).
6. `same_as`/equivalence cho duplicate concept thật nếu G4 xác nhận.
7. Regenerate CoreDB và xuất đối chiếu số lượng/đụng độ trước-sau.

### Gate P1

- G4 review toàn batch.
- Không tạo hard collision mới chưa có test.
- Regression 200/200.
- Blind v1.1 không có S0/S1.
- Các case S2 thuộc Batch 01 giảm/được giải quyết rõ ràng.

Khi P1 PASS → không tiếp tục mở rộng dictionary trong rollout này.

---

## 5. P2 — ENGINE POLISH TỐI THIỂU

Chỉ làm nếu vẫn còn sau P1:

### P2.1 OR-group dedupe
- Dedupe output theo `conceptId` khi cùng concept có VI/ZH/pinyin surface.

### P2.2 Evidence medium-toneless policy
- Với clinical concept từ input không dấu/toneless có `confidence=medium`:
  - không tự coi là evidence-grade certainty;
  - yêu cầu confirm hoặc trả typed state tương đương `needs_confirmation` trước Evidence Search.

### KHÔNG làm trong P2
- Không refactor toàn bộ stoplist R11 trừ khi có S0/S1.
- Không thêm LLM.
- Không mở parser/query language mới ngoài bug blocker.

### Gate P2
- regression 200/200;
- Boolean set sạch;
- negative-control sạch;
- không tạo S0/S1 mới.

---

## 6. P3 — FINAL VALIDATION

### 6.1 Re-run hiện có
- Regression 200 cases.
- Collision CI.
- Blind v1.1.

### 6.2 Blind Validation v2 — CHỈ MỘT VÒNG MỚI

Không tạo bộ 300–500 câu.

Tạo **80–120 case mới**, chưa xuất hiện trong blind v1/regression hiện tại, tập trung:
- query 20–40 từ;
- multiple syndrome + herb + formula + acupoint;
- giản/phồn trộn và phồn thể không-space;
- pinyin có/không thanh;
- tên người/địa danh chứa surface TCM;
- Boolean nested 2–3 tầng + phrase quotes;
- mixed VI + ZH + EN;
- input hoàn toàn không dấu;
- Evidence medium/toneless;
- pattern lấy từ shadow traffic nhưng rewrite/anonymize, không dùng nguyên raw query.

**Protocol blind:** raw results commit trước phân tích và trước mọi patch.

### Acceptance Gate cuối

Bắt buộc:
- S0 = 0;
- S1 = 0;
- 0 verified/high clinical mapping sai;
- 0 silent drop;
- 0 Evidence ambiguity/uncertainty bị auto-run sai;
- Boolean/quotes/grouping bảo toàn;
- negative controls sạch;
- mọi lỗi còn lại chỉ S2/S3 và có root cause rõ.

FAIL → chỉ patch S0/S1, re-run P3. Không mở Batch 02 trong rollout này.

PASS → `READY TO FLIP V2`.

---

## 7. P4 — PRODUCTION FLIP

1. Đặt `TRANSLATE_ENGINE=v2`.
2. Redeploy.
3. Giữ `legacy` flag làm rollback.
4. Kiểm smoke test:
   - `giả châm`;
   - `chàm + châm cứu`;
   - `trúng phong / trung phong`;
   - tên người có “Châm/Trung”;
   - Boolean query;
   - Evidence ambiguous/toneless;
   - mixed Chinese/Vietnamese.
5. Nếu phát hiện S0/S1 production → rollback `legacy`, patch blocker, quay P3.

### Gate P4 / DONE

- production ổn;
- không S0/S1;
- logs không có regression nghiêm trọng;
- H2 blocker được gỡ.

**Đây là điểm kết thúc rollout.**

---

## 8. D6 LLM — QUYẾT ĐỊNH RIÊNG, KHÔNG CHẶN V2

Code D6 có thể tồn tại trong `main`, nhưng **không thuộc Definition of Done của rollout v2 deterministic**.

Trong rollout:
- đặt `LLM_TRANSLATE_DAILY_MAX=0` cho translator hoặc giữ translator LLM không cấu hình;
- Evidence tuyệt đối không gọi D6.

Sau khi v2 production ổn, nếu muốn bật D6 thì mở **một task riêng** với safety set riêng 30–50 case + quota riêng. Không gộp vào rollout này.

---

## 9. ROADMAP KHÓA

```text
CURRENT
  ↓
P0 Shadow Production Validation
  ↓
P1 Translation Data Quality Batch 01
  ↓
P2 Minimal Engine Polish (chỉ 2 mục, nếu cần)
  ↓
P3 Final Validation + Blind v2 (80–120 case, 1 vòng)
  ↓
P4 TRANSLATE_ENGINE=v2
  ↓
DONE: Translation Production Gate đạt → H2 UNBLOCKED
```

**Nguyên tắc chống lan man:** không tạo thêm milestone trong chuỗi này. Mọi yêu cầu ngoài IN SCOPE đưa backlog sau `DONE`.
