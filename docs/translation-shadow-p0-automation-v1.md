# Translate Engine v2 — P0 Automated Shadow Validation v1

> Mục tiêu duy nhất: tự động tạo và phân tích synthetic shadow workload đủ để hỗ trợ chốt Gate P0, nhưng KHÔNG giả mạo organic traffic và KHÔNG tạo auth bypass.
>
> Đây là tài liệu thực thi của `docs/translation-engine-production-rollout-v1.md` §3. Không mở thêm scope.

## 1. Quyết định kiến trúc

Dùng mô hình **Hybrid A+B**:

- **Production Discovery probes:** chạy qua endpoint public `/api/research/search` trong khi production ở `TRANSLATE_ENGINE=shadow`.
- **Evidence probes:** chạy local deterministic tại đúng commit `main`, vì Evidence route production yêu cầu Firebase verified auth và không tạo auth bypass chỉ để test.
- **Organic traffic:** thống kê riêng hoàn toàn.
- **Không yêu cầu synthetic phải có `project_id/search_run_id`** nếu route public không hỗ trợ. Đây là limitation đã chấp nhận của P0.

Synthetic, local Evidence và organic PHẢI báo cáo thành ba cohort riêng. Không gộp thành một `agree %` duy nhất để quyết định Gate P0.

## 2. Shadow Traffic Pack authoritative

Pack được sinh deterministic bằng:

```bash
node scripts/generate-shadow-traffic-pack-v1.mjs > /tmp/translation-shadow-traffic-pack-v1.jsonl
```

Yêu cầu generator:
- đúng **620 unique queries**;
- mỗi dòng JSONL có `synthetic_case_id`, `batch`, `category`, `mode`, `input`;
- có đủ VI đúng dấu, VI không dấu, ZH giản/phồn, mixed, Boolean, Evidence, negative control, noisy/typo;
- không import pack vào `test/tcm-queries.json`;
- đây KHÔNG phải blind set.

Nếu generator không ra đúng 620 hoặc mất category bắt buộc → DỪNG, báo lỗi generator; không tự thay đổi engine/dictionary.

## 3. Production Discovery runner

Tạo `scripts/shadow-synthetic-run.mjs` chỉ phục vụ P0. Script được phép thêm mới nhưng KHÔNG sửa app/dictionary/env/schema.

Runner:
- đọc JSONL pack;
- chỉ gửi các case `mode=discovery` tới `https://chimedis.vn/api/research/search`;
- sequential hoặc concurrency tối đa 2;
- jitter 2–5 giây;
- 429/502/503/504 → tối đa 1 retry + backoff;
- User-Agent cố định: `chimedis-p0-synthetic-v1`;
- ghi local JSONL raw: case id/category/input/timestamp/http/latency/result status;
- ghi `started_at` và `ended_at` rõ ràng;
- không flood server; nếu error/latency tăng bất thường thì dừng.

### Nhận diện synthetic trong Runtime logs

`translate_shadow_diff` hiện không chứa User-Agent/case ID. Vì không sửa production chỉ để phục vụ P0, correlation dùng:
1. cửa sổ `started_at..ended_at` của runner;
2. timestamp từng request;
3. thứ tự request tuần tự;
4. khi cần, đối chiếu local expected legacy/v2 outcome tại đúng commit để ghép dòng log.

Hạn chế này phải ghi trong báo cáo. Không tuyên bố precision correlation 100% nếu trong cùng cửa sổ có organic traffic đáng kể.

## 4. Evidence cohort — local deterministic

Các case `mode=evidence` chạy local tại đúng commit production candidate của `main`:
- gọi engine v2/`translateQuery()` trực tiếp với `mode='evidence'`;
- lưu `effective_query`, `ambiguous`, `unresolved`, `needs_resolution`, `confidence`, `engine_version`;
- kiểm policy Evidence: ambiguity/uncertainty cần block/confirm đúng;
- đây là **local deterministic Evidence cohort**, KHÔNG được gọi là production Evidence traffic.

Không tạo Firebase service-account bypass, không hard-code token người dùng, không hạ `requireVerified`.

Production Evidence safety cuối cùng vẫn cần organic/manual Workbench traffic hoặc smoke test có tài khoản thật trước P4.

## 5. Runtime logs

Claude không cần trực tiếp có quyền hPanel để chạy workload.

Sau khi production Discovery runner hoàn tất, chủ dự án chỉ cần export Runtime logs đúng cửa sổ `started_at..ended_at` và cung cấp cho Claude.

Nếu chưa có Runtime logs:
- runner raw vẫn được commit/lưu;
- trạng thái là `P0 SYNTHETIC EXECUTION COMPLETE — ANALYSIS WAITING FOR RUNTIME LOG EXPORT`;
- KHÔNG tự suy diễn production shadow metrics chỉ từ local output.

## 6. Raw-first protocol

Trước mọi phân tích/patch, lưu raw artifacts:
- `docs/translation-shadow-p0-synthetic-run-v1.jsonl` hoặc artifact tương đương;
- local Evidence raw riêng;
- sau khi có Runtime logs, tạo `docs/translation-shadow-p0-synthetic-raw-v1.md`.

Commit raw trước scoring/root-cause.

Sau đó mới tạo:
`docs/translation-shadow-p0-synthetic-analysis-v1.md`.

## 7. Metrics bắt buộc

Báo riêng:

### Cohort A — Production synthetic Discovery
- query success / infra fail;
- legacy-v2 agree %;
- disagreement %;
- ambiguous/unresolved/medium counts;
- `v2 better / equivalent / worse / uncertain`;
- S0/S1 nếu có.

### Cohort B — Local deterministic Evidence
- số Evidence cases;
- needs_resolution/confirmation;
- ambiguity auto-run sai = 0 bắt buộc;
- Boolean/negative-control safety.

### Cohort C — Organic production
- chỉ dùng khi có dữ liệu thật;
- tuyệt đối không trộn với synthetic trong headline metric.

## 8. Gate P0

Synthetic workload có thể chứng minh engine đủ ổn để tiếp tục P0, nhưng **không một mình thay thế organic review**.

P0 PASS khi thỏa rollout §3, tối thiểu:
- synthetic Discovery: 0 S0/S1 chưa giải thích;
- 0 silent drop;
- local Evidence: 0 ambiguity/uncertainty auto-run sai;
- Boolean/negative controls sạch;
- không có server regression do shadow;
- clinical disagreements được G4 phân loại;
- có ít nhất một lớp production Evidence/organic smoke verification trước khi flip v2.

## 9. Điểm kết thúc của task automation

Task này kết thúc khi:
1. generator tạo 620 pack hợp lệ;
2. production Discovery synthetic workload hoàn tất;
3. local Evidence cohort hoàn tất;
4. raw artifacts đã lưu;
5. Runtime logs đã được ghép và analysis tạo xong, hoặc trạng thái chờ duy nhất là chủ dự án export Runtime logs.

Không sửa data/engine trong task này. Không chuyển P1. Không bật v2. Không mở blind test mới.
