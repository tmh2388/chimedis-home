# P3 (lean) + P4 Flip — Translate Engine v2 → production

> Quyết định chủ dự án (2026-09-10): **P3 gọn** thay P3 đầy đủ. Bỏ bộ blind mới 80–120 câu.
> Lý do: v2 đã hơn legacy trên mọi trục đo được; có `legacy` làm rollback 1-dòng-env; validation cuối chạy trên traffic shadow/v2 thật qua `translate_shadow_log`.
> Tài liệu gốc: `docs/translation-engine-production-rollout-v1.md` §6–§7.

## P3-lean — kết quả (commit engine `3c2f83d`)

### 1. Re-run gate hiện có

| Gate | Kết quả |
|---|---|
| Regression suite | **230 / 230 pass** |
| Collision gate | **exit 0** — 4 đụng độ verified (`cham`, `tri`, `trung phong`, `zhong feng`), tất cả có test; 26 auto không đổi |
| Benchmark `translate-score` (110 câu) | legacy 82.7 → **v2 94.3** (recall 82.9→91.7, clean 74.2→96.8, noise 0.5→5.4) |
| Blind v1.1 (180 probe) | **0 S0 / 0 S1** — 25 cờ heuristic = concept subsumption hoặc D8/R11 stoplist có sẵn |

### 2. Smoke test — 24 câu thật đại diện, **24/24 đạt**

| Nhóm | Câu | Kết quả v2 |
|---|---|---|
| giả châm / chàm+châm | `giả châm`, `chàm + châm cứu` | sham acupuncture / eczema + acupuncture — không lẫn `chàm`↔`châm` |
| trúng/trung phong | `trúng phong` → stroke; `trung phong` → **ambiguous** (LR4/stroke) | ✅ |
| tên người | `Trần Thị Châm`, `Trần Văn Trung nghiên cứu châm cứu`, `Hoàng Kỳ Anh luận văn thạc sĩ` | tên giữ nguyên văn; thuật ngữ thật (`châm cứu`) vẫn dịch | 
| Boolean | `(châm cứu OR điện châm) AND (đột quỵ OR nhồi máu não)`; `"châm cứu" AND "đột quỵ" NOT động vật` | ngoặc + AND/OR/NOT bảo toàn |
| Trung giản/phồn | `针灸治疗中风`, `針灸治療腦卒中`, `腎陰虛針灸治療` | acupuncture/stroke; phồn thể đa-concept nhận diện được |
| mixed | `电针 中风 rehabilitation`, `hoàng kỳ 黄芪 phục hồi sau đột quỵ` | dịch đúng; **OR-group không lặp** (P2.1) |
| Evidence toneless | `cham cuu dieu tri dot quy` (evidence), `than am hu u tai` (evidence) | `needs_resolution=true` + `needs_confirmation` (P2.2) |
| Evidence đúng dấu | `châm cứu điều trị đột quỵ` (evidence) | KHÔNG bị chặn confirm |
| pinyin homophone | `zhong feng` → ambiguous; `zhòng fēng` → stroke | ✅ |
| negative control | `aspirin clopidogrel`, `nguyen van a` | không dịch |
| P1 concept mới | `quy tỳ thang…`, `mai hoa châm điều trị đau thần kinh`, `đau khớp gối do thoái hóa` | Guipi Tang / plum-blossom needling + neuralgia / knee pain + degeneration |

### 3. Server + API

- `TRANSLATE_ENGINE=v2` → server boot OK (`{"evt":"translate_config","translate_engine":"v2",…}`).
- `GET /api/research/search?q=giả châm điều trị đột quỵ` → HTTP 200, effective_query = `("sham acupuncture"…) ("treatment"…) ("stroke"…)`, 20 kết quả (OpenAlex 1984 / EuropePMC 1062 / CORE 39).
- Plain English query → HTTP 200.

### Kết luận P3-lean: **PASS.** 0 S0, 0 S1, Boolean/negative/Evidence sạch, regression 230/230, v2 ≥ legacy mọi trục.

---

## P4 — Flip production (chủ dự án thao tác)

### Bước

1. **hPanel → Environment variables**: đổi `TRANSLATE_ENGINE` từ `shadow` → **`v2`**.
   Giữ nguyên: `LLM_TRANSLATE_DAILY_MAX=0`, `ANTHROPIC_API_KEY` (không đụng).
2. **Restart / redeploy** `chimedis.vn`.
3. Runtime logs: dòng khởi động phải là `{"evt":"translate_config","translate_engine":"v2",…}`.
4. **Rollback tức thì nếu cần:** đổi lại `TRANSLATE_ENGINE=v2` → `legacy` + restart. (1 dòng env, ~1 phút.)

### Smoke sau flip (chủ dự án chạy trên `chimedis.vn`, đối chiếu kết quả trả về)

| Câu | Kỳ vọng |
|---|---|
| `giả châm` | ra bài về sham acupuncture, KHÔNG lẫn eczema |
| `chàm + châm cứu` | eczema + acupuncture |
| `trúng phong` / `trung phong` | trúng phong → stroke; trung phong → cảnh báo "chưa rõ nghĩa" (không tự dịch) |
| `Trần Văn Trung nghiên cứu châm cứu` | không TCM-hoá tên; vẫn ra bài châm cứu |
| `(châm cứu OR điện châm) AND đột quỵ` | Boolean giữ nguyên |
| Evidence: gõ **không dấu** cụm lâm sàng | có cảnh báo "cần xác nhận trước khi tra Evidence" |
| `针灸治疗中风` | acupuncture + stroke |

### Gate P4 / DONE

- production ổn (không 5xx tăng bất thường);
- không S0/S1 trong smoke + ~1–2 ngày traffic đầu (xem `translate_shadow_log` — giờ `agree` so v2-vs-v2 sẽ ~100%, dùng để bắt lỗi engine/`needs_resolution` bất thường);
- logs không regression nghiêm trọng;
- `legacy` vẫn là flag rollback trong giai đoạn ổn định.

**Đạt P4 → rollout DONE → H2 UNBLOCKED.**

### Validation cuối trên traffic thật (thay bộ blind 80–120)

Sau flip, để traffic v2 chạy 1–2 ngày rồi rà `translate_shadow_log`:

```sql
-- lỗi engine / gate bất thường trên traffic v2 thật
SELECT DATE(created_at) d, mode,
       COUNT(*) n,
       SUM(needs_resolution) nr,
       SUM(unresolved_count>0) has_unres,
       SUM(conf_high) h, SUM(conf_medium) m
FROM translate_shadow_log
WHERE created_at >= NOW() - INTERVAL 2 DAY
GROUP BY d, mode;
```

Nếu phát hiện S0/S1 production → rollback `legacy`, patch blocker, quay lại P3-lean.
