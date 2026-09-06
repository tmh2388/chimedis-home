# Chimedis — Bàn làm việc nghiên cứu (Research Workbench)

> **Bản kế hoạch để phản biện.** Tài liệu này mô tả đề xuất bổ sung cho `chimedis.vn`:
> (A) chức năng **tìm khoảng trống nghiên cứu** sau khi tìm y văn, có lưu lại; và
> (B) **bộ khung soạn thảo — viết bài** cho nghiên cứu sinh (NCS) mới.
> Mục đích tài liệu: để người phản biện đọc trực tiếp từ GitHub và góp ý.
>
> - Trạng thái: **DỰ THẢO — chưa code, chưa cam kết phạm vi**
> - Nhánh: `plan/research-workbench`
> - Ngày lập: 2026-09-06
> - Người lập: Claude (theo yêu cầu của chủ dự án) — cần chuyên gia YHCT + chuyên gia phương pháp nghiên cứu phản biện
> - Repo: `tmh2388/chimedis-home` (ứng dụng Node/Express phục vụ cả `chimedis.vn` và `admin.chimedis.vn`)

---

## Mục lục

1. [Tóm tắt điều hành](#1-tóm-tắt-điều-hành)
2. [Bối cảnh: chimedis.vn đang có gì](#2-bối-cảnh-chimedisvn-đang-có-gì)
3. [Đối tượng người dùng & nhu cầu](#3-đối-tượng-người-dùng--nhu-cầu)
4. [Phạm vi đề xuất](#4-phạm-vi-đề-xuất)
5. [Trụ cột A — Tìm khoảng trống nghiên cứu + lưu lại](#5-trụ-cột-a--tìm-khoảng-trống-nghiên-cứu--lưu-lại)
6. [Trụ cột B — Bộ khung soạn thảo cho NCS](#6-trụ-cột-b--bộ-khung-soạn-thảo-cho-ncs)
7. [Câu hỏi trọng tâm: có nên làm "khoảng trống của khoảng trống" không?](#7-câu-hỏi-trọng-tâm-có-nên-làm-khoảng-trống-của-khoảng-trống-không)
8. [Kiến trúc kỹ thuật](#8-kiến-trúc-kỹ-thuật)
9. [Chi phí LLM & cơ chế kiểm soát](#9-chi-phí-llm--cơ-chế-kiểm-soát)
10. [Rủi ro & giảm thiểu](#10-rủi-ro--giảm-thiểu)
11. [Định vị cạnh tranh](#11-định-vị-cạnh-tranh)
12. [Phân kỳ triển khai](#12-phân-kỳ-triển-khai)
13. [Tiêu chí thành công](#13-tiêu-chí-thành-công)
14. [Câu hỏi dành cho người phản biện](#14-câu-hỏi-dành-cho-người-phản-biện)
15. [Phụ lục: lược đồ CSDL đề xuất](#15-phụ-lục-lược-đồ-csdl-đề-xuất)

---

## 1. Tóm tắt điều hành

**Đề xuất.** Bổ sung cho công cụ tìm y văn hiện có của `chimedis.vn` một lớp dành cho **người dùng đã đăng ký**:

- **Trụ cột A — Khoảng trống nghiên cứu.** Sau một lượt tìm kiếm "đúng ý", người dùng bấm *"Phân tích khoảng trống"*. Hệ thống dùng LLM đọc tập bài kết quả (tiêu đề + tóm tắt + metadata) và trả về danh sách khoảng trống **có dẫn chứng** (đã có gì / còn thiếu gì / vì sao). Người dùng **lưu** từng khoảng trống vào một *bảng dự án* cá nhân, gắn thẻ, ghi chú, đặt trạng thái.
- **Trụ cột B — Bộ khung soạn thảo.** Từ một khoảng trống đã lưu, NCS dựng được: câu hỏi nghiên cứu (PICO), đề cương, dàn ý IMRaD, bảng trích xuất y văn, checklist chuẩn báo cáo (bao gồm **STRICTA/CONSORT-CHM** cho YHCT). Có ba lớp hỗ trợ, từ biểu mẫu tĩnh (không tốn LLM) đến viết nháp có LLM **bám vào thư viện tài liệu của chính người dùng**.

**Khuyến nghị chính về "đệ quy":**
> **Nên làm "đào sâu nhiều tầng", KHÔNG nên làm "khoảng trống của khoảng trống" theo kiểu đệ quy trừu tượng.**
> Mỗi tầng đào sâu phải là **một lượt tìm y văn mới** được nối đất lại bằng bài báo thật, không phải cho LLM suy diễn tiếp trên câu suy diễn trước đó. Xem [mục 7](#7-câu-hỏi-trọng-tâm-có-nên-làm-khoảng-trống-của-khoảng-trống-không).

**Vì sao đáng làm:** đúng định vị "cổng nghiên cứu YHCT" đã chốt; tận dụng hệ tài khoản + kho tri thức YHCT có cấu trúc đã sở hữu; giải quyết nỗi sợ "tờ giấy trắng" của NCS mới mà chưa công cụ tiếng Việt nào làm.

**Rủi ro lớn nhất:** liêm chính học thuật (viết hộ, trích dẫn ảo), chi phí LLM leo thang, và chất lượng "khoảng trống" do LLM sinh ra nếu không nối đất bằng dữ liệu thật. Tất cả đều có phương án giảm thiểu ở [mục 10](#10-rủi-ro--giảm-thiểu).

---

## 2. Bối cảnh: chimedis.vn đang có gì

Tính đến 2026-09-06, `chimedis.vn` (repo `chimedis-home`) đã có:

| Thành phần | Trạng thái | Ghi chú |
|---|---|---|
| Tìm y văn 4 nguồn | Đã chạy production | OpenAlex + Europe PMC + CORE + Semantic Scholar, gộp + khử trùng, `POST /api/research/search` |
| Dịch thuật ngữ YHCT vi/zh → Anh | Đã chạy | `lib/tcm-vocab.js` + `lib/tcm-dictionary.json` (~8k khoá từ CoreDB dict.chimedis.vn) |
| Từ điển tự học (LLM) | GĐ1+GĐ2 đã push, chờ redeploy | `lib/dict-learn.js` + `lib/llm-translate.js` (Anthropic Haiku, tuỳ chọn qua `ANTHROPIC_API_KEY`); bảng `dict_candidates` |
| Bảng kết quả kiểu Web of Science | Đã chạy | sắp xếp, lọc trong kết quả, tải PDF (proxy chống SSRF), xem nhanh |
| Đăng nhập người dùng | Đã chạy production | Firebase Auth (Google + Email), bảng `users` dùng CHUNG toàn hệ Chimedis |
| Phân quyền | Đã chạy | `reader` < `author` < `editor` < `admin` (`lib/auth.js`: `requireUser`, `requireRole`) |
| Admin CMS + ORCID | Đã push, chờ chạy schema production | `admin.chimedis.vn`, CRUD `portal_documents` |

**Chưa có LLM cho phần phân tích/tổng hợp y văn.** Ghi chú dự án nêu bậc chi phí dự kiến: không-LLM (thống kê + `tldr` Semantic Scholar) → Ollama local → Gemini free-tier → Claude/GPT cho bước tổng hợp cuối.

**Hạ tầng:** Node/Express trên Hostinger (user tự bấm Redeploy sau khi push GitHub). MySQL `u440660297_chimedis` dùng chung. Không có hàng đợi tác vụ nền, không có object storage riêng — mọi thứ chạy trong tiến trình web.

---

## 3. Đối tượng người dùng & nhu cầu

Theo định vị đã chốt của dự án: **giảng viên/sinh viên YHCT, lương y, NCS dược liệu Việt Nam**. Tài liệu này tập trung vào **NCS mới** vì đó là nhóm có "đường cong đau" rõ nhất.

Hành trình một NCS YHCT năm 1 điển hình, và công cụ hiện tại hỗ trợ tới đâu:

| Bước | Nhu cầu | chimedis.vn hôm nay |
|---|---|---|
| 1. Chọn hướng | Chủ đề mơ hồ → câu hỏi cụ thể, khả thi, chưa ai làm | ❌ |
| 2. Tổng quan y văn | Tìm có hệ thống, sàng lọc, bảng trích xuất, sơ đồ PRISMA | 🟡 chỉ có tìm |
| 3. Tìm khoảng trống | "Chỗ nào chưa ai làm, hoặc làm còn yếu?" | ❌ |
| 4. Quản lý tài liệu tham khảo | Import RIS/BibTeX, khử trùng, chèn trích dẫn | ❌ |
| 5. Đề cương | Viết theo mẫu đề cương NCS (tính cấp thiết, mục tiêu, ĐT-PP, biến số, y đức) | ❌ |
| 6. Thiết kế nghiên cứu | Chọn thiết kế, cỡ mẫu, biến số, kế hoạch phân tích | ❌ |
| 7. Viết bài | Dàn ý IMRaD, gợi ý nội dung từng mục, phrasebank | ❌ |
| 8. Chuẩn báo cáo | CONSORT/STROBE/PRISMA/CARE + **STRICTA/CONSORT-CHM cho YHCT** | ❌ |
| 9. Chọn tạp chí + phản hồi phản biện | Gợi ý tạp chí, soạn thư phản hồi reviewer | ❌ |

Trụ cột A của đề xuất này giải quyết bước **3**. Trụ cột B giải quyết bước **1, 2, 5, 7, 8** (bước 6, 9 để pha sau).

---

## 4. Phạm vi đề xuất

**Trong phạm vi (bản kế hoạch này):**

- A1. Nút "Phân tích khoảng trống" trên tập kết quả tìm kiếm (chỉ user đã đăng ký).
- A2. Lưu khoảng trống vào *bảng dự án* cá nhân; gắn thẻ, ghi chú, trạng thái.
- A3. "Đào sâu" một khoảng trống = sinh truy vấn thu hẹp → **tìm y văn mới** → phân tích khoảng trống tầng kế tiếp (có giới hạn độ sâu).
- A4. Thư viện tài liệu cá nhân: lưu bài từ kết quả tìm kiếm vào dự án, import RIS/BibTeX.
- B1. **Lớp 1 (biểu mẫu tĩnh):** template đề cương NCS, dàn ý IMRaD, checklist chuẩn báo cáo, phrasebank học thuật Việt/Anh, bảng trích xuất y văn (evidence matrix) xuất Word/Excel.
- B2. **Lớp 2 (LLM bám nguồn):** gợi ý dàn ý chi tiết từ câu hỏi + khoảng trống; viết nháp đoạn tổng quan **chỉ trích dẫn từ thư viện người dùng**; tóm tắt nhóm bài.
- B3. Kết nối sang kho YHCT có cấu trúc của Chimedis (hồ sơ dược liệu, huyệt vị) khi khoảng trống/đề tài chạm tới vị thuốc, huyệt.

**Ngoài phạm vi (pha sau hoặc dự án riêng):**

- Chat-with-PDF, parse toàn văn PDF (GROBID + vector DB) — cần hạ tầng mới, tính riêng.
- Tính cỡ mẫu / trợ lý thống kê (bước 6).
- Trợ lý phản hồi phản biện, gợi ý chọn tạp chí (bước 9).
- Kiểm tra tương đồng/đạo văn (cần dịch vụ bên thứ ba trả phí).
- Cộng tác nhiều người trên cùng một dự án (chia sẻ, bình luận).

---

## 5. Trụ cột A — Tìm khoảng trống nghiên cứu + lưu lại

### 5.1 Luồng người dùng

```
Người dùng tìm y văn (đã có)
        │  bấm "Phân tích khoảng trống" (chỉ hiện khi đã đăng nhập)
        ▼
Hệ thống lấy top N bài của tập kết quả HIỆN TẠI (mặc định N = 25, tối đa 50)
        │  gửi {tiêu đề, tóm tắt, năm, loại nghiên cứu, tạp chí, số trích dẫn} cho LLM
        ▼
LLM trả về 4–8 "khoảng trống ứng viên", mỗi mục gồm:
   • Tên khoảng trống (1 câu)
   • Bằng chứng "đã có": 2–4 bài trong tập (trích ID + 1 câu tóm ý)
   • Điểm còn thiếu: mô tả cụ thể (dân số chưa nghiên cứu / thiết kế yếu /
     kết cục chưa đo / thiếu RCT / chưa có ở bối cảnh Việt Nam / cơ chế chưa rõ...)
   • Vì sao đáng làm: 1–2 câu
   • Loại khoảng trống (phân loại chuẩn, xem 5.3)
   • Mức độ tin cậy của chính LLM (cao/vừa/thấp) + cảnh báo nếu tập bài quá nhỏ
        ▼
Người dùng: Lưu mục nào thấy đúng → vào "Bảng dự án"
        │
        ▼
Trong Bảng dự án: mỗi khoảng trống có thể
   • Gắn thẻ, ghi chú tay, đổi trạng thái (mở / đang khai thác / đã có người làm / loại bỏ)
   • "Đào sâu" (xem 5.4)
   • "Bắt đầu viết" → tạo một bản thảo ở Trụ cột B, mang theo ngữ cảnh
```

### 5.2 Nguyên tắc "nối đất" (chống LLM bịa)

Mọi khoảng trống LLM sinh ra **bắt buộc** tham chiếu tối thiểu 2 bài **có trong tập kết quả** (bằng ID nội bộ). Nếu LLM nêu một khoảng trống không gắn được vào bài nào trong tập → hệ thống loại mục đó trước khi hiển thị (hoặc đánh dấu "suy đoán, không có dẫn chứng trong tập" và tách xuống cuối). Prompt yêu cầu LLM **chỉ được dùng thông tin trong tập bài được cung cấp**, không viện dẫn kiến thức ngoài.

### 5.3 Phân loại khoảng trống (đưa vào prompt để LLM bám khung)

Dựa trên các khung phân loại research-gap phổ biến (Miles, Robinson và cộng sự…), rút gọn còn 7 loại dễ hiểu:

1. **Khoảng trống bằng chứng** — kết quả các nghiên cứu mâu thuẫn nhau, chưa ngã ngũ.
2. **Khoảng trống dân số** — nhóm bệnh nhân/độ tuổi/bối cảnh (vd Việt Nam) chưa được nghiên cứu.
3. **Khoảng trống can thiệp** — bài thuốc/công thức/phác đồ huyệt cụ thể chưa được thử nghiệm.
4. **Khoảng trống kết cục** — thiếu đo lường kết cục quan trọng (chất lượng sống, tái phát, an toàn dài hạn).
5. **Khoảng trống phương pháp** — chủ yếu là nghiên cứu quan sát/ca bệnh, thiếu RCT hoặc thiếu mù/ngẫu nhiên hoá.
6. **Khoảng trống cơ chế** — có hiệu quả lâm sàng nhưng cơ chế tác dụng chưa được làm rõ.
7. **Khoảng trống lý thuyết/biện chứng** — chưa gắn với phân thể YHCT, hoặc chưa chuẩn hoá tiêu chí biện chứng.

### 5.4 "Đào sâu" — mô hình đề xuất (thay cho đệ quy trừu tượng)

```
Khoảng trống đã lưu  (vd "Thiếu RCT về điện châm cho liệt nửa người sau đột quỵ ở bệnh nhân Việt Nam")
        │  bấm "Đào sâu"
        ▼
LLM sinh 1–3 truy vấn thu hẹp bám vào khoảng trống đó
   (vd: "electroacupuncture stroke hemiplegia randomized Vietnam",
        "electroacupuncture rehabilitation motor recovery RCT")
        ▼
Người dùng chọn 1 truy vấn → chạy lại /api/research/search (tìm y văn MỚI, dữ liệu thật)
        ▼
Phân tích khoảng trống tầng 2 TRÊN TẬP BÀI MỚI NÀY
        ▼
Lưu tiếp vào cùng dự án, có "đường dẫn" (breadcrumb) thể hiện tầng cha → con
```

- Mỗi tầng vẫn là **tìm kiếm + phân tích trên bài thật**, không phải "LLM đọc lại khoảng trống rồi đẻ khoảng trống con".
- **Giới hạn độ sâu:** 3 tầng (cấu hình được). UI hiển thị breadcrumb; nút quay lại tầng cha.
- Cây dự án là đồ thị có hướng: `tìm kiếm → [khoảng trống] → chọn 1 → tìm kiếm mới → [khoảng trống] → …` — đúng cách một NCS thu hẹp đề tài trong thực tế.

### 5.5 Bảng dự án (UI)

- Danh sách dự án của user (`GET /api/workbench/projects`).
- Trong 1 dự án: cây khoảng trống (theo tầng), thư viện tài liệu đã lưu, các bản thảo.
- Thao tác trên khoảng trống: sửa ghi chú, đổi trạng thái, gắn thẻ, đào sâu, xoá, "bắt đầu viết".
- Xuất dự án ra Markdown/Word (tổng hợp mọi khoảng trống + ghi chú + tài liệu) để mang đi thảo luận với người hướng dẫn.

---

## 6. Trụ cột B — Bộ khung soạn thảo cho NCS

### 6.1 Ba lớp hỗ trợ

| Lớp | Nội dung | LLM? | Rủi ro | Ưu tiên |
|---|---|---|---|---|
| **Lớp 1** | Template đề cương NCS; dàn ý IMRaD; checklist chuẩn báo cáo; phrasebank Việt/Anh; evidence matrix xuất Word/Excel | Không (biểu mẫu + logic cố định) | Rất thấp | **Cao** |
| **Lớp 2** | Gợi ý dàn ý chi tiết từ (câu hỏi + khoảng trống); viết nháp đoạn tổng quan có trích dẫn **chỉ từ thư viện người dùng**; tóm tắt nhóm bài; diễn giải một đoạn theo văn phong học thuật | Có (RAG trên thư viện của user) | Trung bình — cần rào chắn | Trung bình |
| **Lớp 3** | Trợ lý phản hồi phản biện; gợi ý tạp chí; kiểm tra tương đồng | Có + dịch vụ ngoài | Cao | Thấp (pha sau) |

### 6.2 Lớp 1 — chi tiết

**Template đề cương NCS** (điền theo hướng dẫn từng mục, mỗi mục có: mô tả "mục này cần gì", ví dụ mẫu, số từ gợi ý, checklist tự rà):

1. Đặt vấn đề / tính cấp thiết (kéo tự động từ khoảng trống đã lưu + số liệu dịch tễ nếu có).
2. Mục tiêu nghiên cứu (tổng quát + cụ thể; nhắc quy tắc SMART).
3. Tổng quan tài liệu (khung + evidence matrix kèm theo).
4. Đối tượng & phương pháp: thiết kế, cỡ mẫu (chỉ nêu công thức + biến cần có, **không tính hộ** ở pha này), tiêu chuẩn chọn/loại, biến số, công cụ đo, quy trình.
5. Vấn đề y đức (nhắc hồ sơ Hội đồng đạo đức, đồng thuận tham gia).
6. Kế hoạch phân tích số liệu.
7. Dự kiến kết quả & hạn chế.
8. Kế hoạch thời gian, tài liệu tham khảo.

**Dàn ý IMRaD** sinh sẵn từ câu hỏi nghiên cứu + loại nghiên cứu:
- Introduction: phễu 4 đoạn (bối cảnh rộng → cái đã biết → khoảng trống → mục tiêu/giả thuyết).
- Methods: các tiểu mục theo đúng chuẩn báo cáo tương ứng.
- Results: khung theo mục tiêu, chỗ dành cho bảng/hình.
- Discussion: phát hiện chính → so với y văn → cơ chế → hạn chế → kết luận/ứng dụng.

**Checklist chuẩn báo cáo** — chọn theo loại nghiên cứu:
- RCT → CONSORT; thử nghiệm phi dược → CONSORT mở rộng.
- Nghiên cứu quan sát → STROBE.
- Tổng quan hệ thống / phân tích gộp → PRISMA 2020.
- Báo cáo ca / chuỗi ca → CARE.
- **Châm cứu → STRICTA** (bổ sung cho CONSORT).
- **Bài thuốc thảo dược Trung y → CONSORT extension for Chinese herbal medicine formulas.**
- Nhắc mục biện chứng luận trị / tiêu chí phân thể khi có.
Mỗi mục checklist: giải thích tiếng Việt + ví dụ + ô tick + ghi chú.

**Phrasebank** — ngân hàng câu mẫu học thuật song ngữ theo chức năng tu từ (nêu khoảng trống, mô tả phương pháp, trình bày kết quả, so sánh với y văn, nêu hạn chế…), gõ đúng thuật ngữ YHCT theo từ điển riêng.

**Evidence matrix** — bảng trích xuất: mỗi hàng 1 bài (tác giả, năm, thiết kế, cỡ mẫu, can thiệp, đối chứng, kết cục, kết quả chính, hạn chế, ghi chú của user). Đổ tự động từ thư viện tài liệu của dự án; xuất `.xlsx`/`.docx`.

### 6.3 Lớp 2 — chi tiết & rào chắn

- **Nguồn trích dẫn bị khoá cứng:** LLM chỉ được trích các bài **người dùng đã lưu vào thư viện dự án**. Mỗi câu văn nháp có chú thích ID bài. Không có bài phù hợp trong thư viện → LLM phải nói "cần bổ sung tài liệu cho ý này", không được bịa.
- **Luôn là bản nháp:** đầu ra gắn nhãn *"Bản nháp do AI hỗ trợ — bạn phải tự kiểm chứng, viết lại bằng lời của mình, và chịu trách nhiệm học thuật."* Không có nút "chấp nhận toàn bộ".
- **Khai báo sử dụng AI:** mỗi lần xuất bản thảo kèm một đoạn hướng dẫn khai báo AI theo yêu cầu tạp chí/nhà trường + nhật ký các đoạn đã dùng AI hỗ trợ.
- **Người hướng dẫn vẫn là người quyết định:** ngôn ngữ sản phẩm nhấn mạnh đây là "gia sư dựng khung", không thay thầy hướng dẫn.
- **RAG tối giản ở pha này:** chưa cần vector DB. Chỉ cần: với mỗi yêu cầu viết đoạn, lấy tối đa ~15 bài liên quan trong thư viện dự án (lọc theo thẻ/độ liên quan văn bản đơn giản) đưa cả tóm tắt vào prompt. Nâng cấp lên embedding khi thư viện dự án vượt ~50 bài.

### 6.4 Kết nối kho YHCT của Chimedis

Khi câu hỏi nghiên cứu / khoảng trống chạm tới một vị thuốc hoặc huyệt có trong CoreDB (`dict.chimedis.vn/api/terms`), hiển thị thẻ liên kết sang hồ sơ dược liệu/huyệt (tính vị quy kinh, công năng, chủ trị, cổ phương liên quan). Đây là điểm SciSpace/Elicit không có.

---

## 7. Câu hỏi trọng tâm: có nên làm "khoảng trống của khoảng trống" không?

**Người chủ dự án hỏi:** sau khi có danh sách khoảng trống, có nên cho "tiếp tục tìm khoảng trống của khoảng trống" không?

### Khuyến nghị: KHÔNG làm đệ quy trừu tượng. CÓ làm "đào sâu nối đất".

| | Đệ quy trừu tượng (LLM đọc khoảng trống → đẻ khoảng trống con, không có corpus mới) | Đào sâu nối đất (đề xuất — mục 5.4) |
|---|---|---|
| Nguồn dữ liệu mỗi tầng | Chính văn bản khoảng trống tầng trên | Một tập bài báo THẬT mới, từ truy vấn thu hẹp |
| Ảo giác | Chồng chất — tầng 2 là suy diễn trên suy diễn | Được chặn lại mỗi tầng bởi dữ liệu thật |
| Chi phí | Rẻ mỗi lượt nhưng dễ bị lạm dụng → bùng nổ số nhánh | 1 lượt search + 1 lượt phân tích mỗi tầng, đếm được |
| Giá trị cho NCS | Thấp — càng sâu càng mơ hồ, mông lung | Cao — đúng cách thu hẹp đề tài trong thực tế |
| Đánh giá chất lượng | Rất khó | Người dùng thấy ngay bài thật đằng sau |

### Lý do chi tiết

1. **Một "khoảng trống" đã là suy luận của LLM.** Cho LLM tiếp tục suy luận *trên câu suy luận đó* mà không có bằng chứng mới thì mỗi tầng càng rời khỏi y văn thật, càng khó kiểm chứng, càng dễ bịa.
2. **Bùng nổ tổ hợp.** 6 khoảng trống × mỗi cái đẻ 6 con × 3 tầng = 216 nút. Người dùng không thể đánh giá, mà mỗi nút vẫn là một lượt LLM ⇒ chi phí thật, tín hiệu ảo.
3. **UX rối.** Cây khoảng trống nhiều nhánh không có bài báo neo lại khiến NCS mới càng hoang mang, ngược mục tiêu "chống tờ giấy trắng".
4. **"Đào sâu nối đất" vẫn cho người dùng cảm giác "khoảng trống của khoảng trống"** — nhưng mỗi tầng được xác nhận lại bằng y văn thật. Giới hạn 3 tầng + breadcrumb giữ mọi thứ trong tầm kiểm soát.

---

## 8. Kiến trúc kỹ thuật

### 8.1 Nguyên tắc chung

- Bám kiến trúc hiện có: Express routes trong `routes/`, business logic trong `lib/`, MySQL dùng chung.
- Mọi tính năng **no-op an toàn** khi thiếu `ANTHROPIC_API_KEY` / thiếu MySQL (giống `dict-learn.js` hiện tại). Không key ⇒ Lớp 1 vẫn chạy đủ, Trụ cột A ẩn nút.
- Chỉ `requireUser` (role tối thiểu `reader` — tức mọi tài khoản đăng ký). Không cần role mới.
- Không thêm dependency nặng ở pha 1. `.docx`/`.xlsx` xuất bằng thư viện thuần JS gọn (`docx`, `exceljs`) hoặc trả Markdown/CSV trước, nâng cấp sau.

### 8.2 Route mới (đề xuất)

```
routes/workbench.js   →  mount tại /api/workbench   (tất cả requireUser)

  Dự án
  GET    /projects                     — danh sách dự án của tôi
  POST   /projects                     — tạo dự án { title, note }
  GET    /projects/:id                 — chi tiết (khoảng trống + thư viện + bản thảo)
  PATCH  /projects/:id                 — sửa tên/ghi chú
  DELETE /projects/:id

  Khoảng trống
  POST   /projects/:id/gap-analysis    — chạy phân tích trên tập kết quả gửi kèm
                                         body: { papers:[...], searchMeta:{...}, parentGapId? }
  POST   /projects/:id/gaps            — lưu 1 khoảng trống LLM đã trả (người dùng chọn)
  PATCH  /gaps/:gapId                  — ghi chú / trạng thái / thẻ
  DELETE /gaps/:gapId
  POST   /gaps/:gapId/deepen           — sinh truy vấn thu hẹp (LLM) cho tầng kế

  Thư viện tài liệu
  POST   /projects/:id/library         — lưu bài từ kết quả tìm kiếm
  POST   /projects/:id/library/import  — import RIS/BibTeX (parse phía server)
  DELETE /library/:itemId

  Soạn thảo
  POST   /projects/:id/drafts          — tạo bản thảo từ template (đề cương / IMRaD)
  GET    /drafts/:draftId
  PUT    /drafts/:draftId              — lưu nội dung (người dùng tự gõ)
  POST   /drafts/:draftId/assist       — Lớp 2: yêu cầu LLM gợi ý/nháp 1 mục
                                         (bắt buộc kèm scope = mục nào, RAG từ library)
  GET    /drafts/:draftId/export?fmt=md|docx

  Tĩnh (không đụng LLM/DB người dùng)
  GET    /templates                    — danh sách template đề cương / IMRaD
  GET    /checklists?studyType=rct|strobe|prisma|care|stricta|consort-chm
  GET    /phrasebank?section=...
```

### 8.3 `lib/` mới

- `lib/gap-analysis.js` — dựng prompt phân tích khoảng trống; gọi LLM; hậu kiểm "nối đất" (loại mục không tham chiếu ≥2 bài trong tập); chuẩn hoá output JSON.
- `lib/workbench-store.js` — truy vấn CRUD MySQL cho dự án/khoảng trống/thư viện/bản thảo (no-op khi chưa cấu hình DB).
- `lib/citation-import.js` — parser RIS + BibTeX (thuần JS).
- `lib/draft-assist.js` — Lớp 2: chọn bài liên quan trong thư viện dự án → prompt viết nháp có ràng buộc trích dẫn.
- `lib/reporting-checklists.js` — dữ liệu tĩnh các checklist (song ngữ), kèm CARE/STRICTA/CONSORT-CHM.
- Tái dùng: `lib/llm-translate.js` pattern (client Anthropic + guard key), `lib/research-sources.js` (`searchAll` cho bước đào sâu), `lib/tcm-vocab.js` (`buildSearchQuery` cho truy vấn thu hẹp), `lib/auth.js` (`requireUser`).

### 8.4 LLM

- Dùng lại nhà cung cấp đã chọn cho từ điển tự học: **Anthropic** (`ANTHROPIC_API_KEY`). Model:
  - Phân tích khoảng trống + sinh truy vấn đào sâu: model tầm trung (Haiku hoặc Sonnet tuỳ chất lượng thực đo).
  - Viết nháp đoạn tổng quan (Lớp 2): Sonnet (chất lượng văn phong quan trọng hơn).
- Biến môi trường mới (tất cả tuỳ chọn, có mặc định):
  `WORKBENCH_LLM_MODEL`, `WORKBENCH_ASSIST_MODEL`, `GAP_MAX_PAPERS` (mặc định 25), `GAP_DEEPEN_MAX_DEPTH` (mặc định 3), `WORKBENCH_DAILY_LLM_QUOTA` (mỗi user/ngày).
- **Không** chạy tác vụ nền dài — phân tích khoảng trống chạy đồng bộ trong request (tập ≤25 bài, 1 lượt gọi, ~5–15s). Nếu sau này cần tập lớn hơn → chuyển sang job + polling (ngoài phạm vi).

### 8.5 Không đụng tới

- `routes/research.js` giữ nguyên (chỉ gọi lại từ bước đào sâu qua `searchAll`).
- Không thay đổi luồng tìm kiếm ẩn danh hiện tại — nút "Phân tích khoảng trống" chỉ **thêm vào** khi đã đăng nhập.

---

## 9. Chi phí LLM & cơ chế kiểm soát

Chủ dự án đã nhiều lần nêu yêu cầu **tránh phát sinh chi phí ngoài dự kiến**. Cơ chế đề xuất:

1. **Chỉ user đăng ký.** Ẩn hoàn toàn với khách vãng lai ⇒ chặn lạm dụng ẩn danh.
2. **Quota theo user/ngày** (`WORKBENCH_DAILY_LLM_QUOTA`, mặc định thấp, ví dụ 10 lượt phân tích + 20 lượt assist). Vượt → thông báo lịch sự, không gọi LLM.
3. **Cache theo tập bài.** Khoá cache = hash danh sách ID bài + phiên bản prompt. Cùng tập kết quả phân tích lại ⇒ trả kết quả cũ, 0 chi phí.
4. **Chặn kích thước đầu vào.** Tối đa 25 bài, chỉ gửi tóm tắt (cắt ~1500 ký tự/bài). Ước tính ~15–25k token input/lượt ⇒ vài cent với Haiku, ~10–20 cent với Sonnet.
5. **Bậc thang model.** Pass đầu bằng model rẻ; chỉ nâng lên Sonnet khi người dùng bấm "phân tích kỹ hơn".
6. **Đào sâu giới hạn 3 tầng** và mỗi lần đào sâu người dùng phải chủ động chọn truy vấn ⇒ không tự chạy chuỗi.
7. **Lớp 1 hoàn toàn miễn phí LLM** — và đó là phần giải quyết "tờ giấy trắng" tốt nhất. Nếu ngân sách = 0, vẫn ship được Lớp 1 + Trụ cột A bản không-LLM (thống kê: phân bố năm, loại nghiên cứu, tần suất từ khoá, "chủ đề ít bài nhất").
8. **Bảng theo dõi chi phí** trong admin: đếm lượt gọi + token/ngày, cảnh báo ngưỡng.

**Ước tính sơ bộ** (100 NCS hoạt động, mỗi người 5 lượt phân tích + 10 lượt assist/tháng, Haiku cho phân tích, Sonnet cho assist): rất thô, khoảng **20–60 USD/tháng**. Cần đo thật ở pha thử nghiệm kín trước khi mở rộng.

---

## 10. Rủi ro & giảm thiểu

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R1 | **Trích dẫn ảo** (LLM bịa DOI/tên bài) | Cao | Khoá cứng: chỉ trích từ thư viện/tập kết quả có thật; hậu kiểm loại mọi tham chiếu không khớp ID; không bao giờ để LLM tự sinh danh mục tài liệu tham khảo |
| R2 | **Viết hộ / đạo văn / phụ thuộc quá mức** | Cao | Định vị "gia sư dựng khung"; đầu ra luôn là "bản nháp phải viết lại"; không có nút chấp nhận toàn bộ; nhật ký AI; hướng dẫn khai báo AI theo tạp chí/trường |
| R3 | **"Khoảng trống" do LLM bịa** (không có trong y văn) | Cao | Nguyên tắc nối đất (mục 5.2); mỗi khoảng trống ≥2 dẫn chứng trong tập; hiện mức tự-tin của LLM; cảnh báo khi tập bài < 10 |
| R4 | **Chi phí LLM leo thang** | Trung bình | Toàn bộ mục 9 |
| R5 | **Chính sách AI của tạp chí** (một số cấm/hạn chế) | Trung bình | Kèm hướng dẫn khai báo; không định vị là "công cụ viết bài" mà là "công cụ lập kế hoạch + dựng khung"; nêu rõ giới hạn trong điều khoản sử dụng |
| R6 | **Chất lượng dịch thuật ngữ YHCT trong prompt** | Trung bình | Tái dùng `tcm-vocab.js` đã kiểm nghiệm; với đào sâu, hiện truy vấn tiếng Anh để người dùng sửa trước khi chạy |
| R7 | **Bảo mật dữ liệu người dùng** (đề tài NCS là tài sản trí tuệ nhạy cảm) | Trung bình | Dữ liệu dự án private theo user; không đưa vào prompt của người khác; nêu rõ dùng API bên thứ ba (Anthropic) để xử lý; cân nhắc điều khoản "không huấn luyện trên dữ liệu" |
| R8 | **Phạm vi phình to** (thành "một Word online") | Trung bình | Bám phân kỳ; Lớp 1 trước; bản thảo có thể chỉ là editor Markdown gọn, không đua tính năng soạn thảo |
| R9 | **Sai lệch loại nghiên cứu → checklist sai** | Thấp | Người dùng tự chọn loại nghiên cứu; checklist chỉ gợi ý, có ghi chú "đối chiếu bản gốc từ equator-network.org" |
| R10 | **Kỳ vọng quá mức** ("máy tìm đề tài luận án hộ tôi") | Thấp–TB | Onboarding + văn bản trong sản phẩm nói rõ đây là trợ lý, người hướng dẫn và hội đồng vẫn là người quyết định |

---

## 11. Định vị cạnh tranh

| Công cụ | Mạnh | Chimedis khác biệt |
|---|---|---|
| **SciSpace / Elicit / Consensus** | Corpus khổng lồ, RAG mạnh, trích xuất bảng | Không có góc YHCT; không map thuật ngữ biện chứng; không nối sang hồ sơ dược liệu/huyệt; tiếng Việt yếu |
| **Paperpal / Jenni / Writefull** | Hỗ trợ viết academic English, kiểm ngữ pháp | Không có phân tích khoảng trống theo corpus; không hiểu YHCT; không có template đề cương NCS Việt Nam |
| **Research Rabbit / Connected Papers** | Đồ thị trích dẫn trực quan | Không phân tích nội dung; không có phần soạn thảo |
| **Covidence / Rayyan** | Quản lý sàng lọc tổng quan hệ thống | Chỉ phục vụ SR, không phải bàn làm việc chung; trả phí |

**Chỗ đứng của Chimedis** (theo định vị đã chốt, không đua corpus/tiền):
1. Kho tri thức YHCT có cấu trúc đã sở hữu (dược liệu, 404 huyệt, giải phẫu/sinh lý) — nối bài nghiên cứu ↔ hồ sơ YHCT.
2. Ánh xạ thuật ngữ biện chứng → từ khoá PubMed (`tcm-vocabulary.json`).
3. Chuẩn báo cáo YHCT (STRICTA, CONSORT-CHM) có hướng dẫn tiếng Việt — gần như chưa ai làm.
4. Template đề cương NCS + phrasebank theo ngữ cảnh Việt Nam.
5. Đối tượng hẹp, rõ: NCS/giảng viên YHCT Việt Nam.

Kết luận: **không cạnh tranh trực diện SciSpace.** Đây là công cụ dọc (vertical) cho một ngành hẹp.

---

## 12. Phân kỳ triển khai

### Cột mốc 0 — Chốt kế hoạch (tài liệu này)
- Người phản biện (chuyên gia YHCT + chuyên gia phương pháp nghiên cứu) góp ý.
- Chốt: có làm Trụ cột B không, hay chỉ Trụ cột A trước? Ngân sách LLM trần bao nhiêu?

### Cột mốc 1 — Trụ cột A tối thiểu (ưu tiên cao nhất)
- Schema: `wb_projects`, `wb_gaps`, `wb_library` (phụ lục 15).
- `routes/workbench.js` + `lib/gap-analysis.js` + `lib/workbench-store.js`.
- UI: nút "Phân tích khoảng trống" trên bảng kết quả (chỉ khi đăng nhập) → panel kết quả → lưu vào dự án.
- Bảng dự án cơ bản: danh sách, xem, ghi chú, trạng thái, xoá.
- Chưa có "đào sâu", chưa import RIS.
- **Có phiên bản không-LLM** (thống kê tập kết quả) để chạy khi chưa có key.

### Cột mốc 2 — Đào sâu + thư viện tài liệu
- `POST /gaps/:id/deepen`, breadcrumb tầng, giới hạn độ sâu.
- Thư viện tài liệu trong dự án; import RIS/BibTeX.
- Xuất dự án ra Markdown/Word.

### Cột mốc 3 — Trụ cột B Lớp 1
- Template đề cương NCS + dàn ý IMRaD (biểu mẫu tĩnh + editor Markdown gọn).
- Checklist chuẩn báo cáo song ngữ (bao gồm STRICTA, CONSORT-CHM).
- Phrasebank.
- Evidence matrix xuất `.xlsx`/`.docx`.

### Cột mốc 4 — Trụ cột B Lớp 2
- `POST /drafts/:id/assist` với ràng buộc trích dẫn từ thư viện.
- Nhật ký AI + hướng dẫn khai báo.
- Nối thẻ sang hồ sơ dược liệu/huyệt của Chimedis.

### Cột mốc 5 — Đánh giá & mở rộng
- Thử nghiệm kín với ~10–20 NCS thật.
- Đo chi phí, chất lượng khoảng trống (đối chiếu chuyên gia), tỷ lệ dùng lại.
- Quyết định pha 3 (chat-with-PDF, thống kê, phản hồi phản biện).

---

## 13. Tiêu chí thành công

**Định lượng (sau thử nghiệm kín 8 tuần):**
- ≥ 60% NCS thử nghiệm tạo ≥1 dự án và quay lại lần 2.
- ≥ 50% khoảng trống được người dùng "lưu" (tức LLM trả ra thứ đáng giữ, không phải rác).
- Chi phí LLM/người dùng hoạt động/tháng ≤ ngưỡng chốt ở Cột mốc 0.
- 0 sự cố trích dẫn ảo lọt ra bản xuất (kiểm bằng hậu kiểm tự động + rà mẫu).

**Định tính:**
- Chuyên gia YHCT đánh giá ≥ 3/5 khoảng trống mẫu là "hợp lý về mặt học thuật".
- NCS phản hồi rằng công cụ giúp họ "bắt đầu được" (khảo sát ngắn).
- Người hướng dẫn không phản đối việc học viên dùng công cụ (không bị xem là "viết hộ").

---

## 14. Câu hỏi dành cho người phản biện

**Về chiến lược:**
1. Có nên làm cả Trụ cột B ngay, hay chỉ Trụ cột A trước rồi đánh giá?
2. Trần ngân sách LLM chấp nhận được mỗi tháng là bao nhiêu? Có nên tính phí người dùng cho phần này không?
3. Định vị "công cụ lập kế hoạch + dựng khung, KHÔNG viết hộ" có đủ an toàn về liêm chính học thuật cho môi trường đào tạo NCS ở Việt Nam không?

**Về học thuật / phương pháp:**
4. Phân loại 7 loại khoảng trống ([mục 5.3](#53-phân-loại-khoảng-trống-đưa-vào-prompt-để-llm-bám-khung)) có phù hợp với thực tế nghiên cứu YHCT không? Thiếu/thừa loại nào?
5. Ngưỡng "≥2 dẫn chứng trong tập" để giữ một khoảng trống có hợp lý? Nên chặt hơn?
6. Template đề cương ([mục 6.2](#62-lớp-1--chi-tiết)) có khớp mẫu đề cương NCS của các cơ sở đào tạo YHCT Việt Nam (vd Học viện Y Dược học cổ truyền, ĐH Y Hà Nội) không?
7. Checklist YHCT: ngoài STRICTA và CONSORT-CHM, còn chuẩn báo cáo nào nên đưa vào (vd cho nghiên cứu chứng hậu, nghiên cứu văn hiến)?

**Về sản phẩm:**
8. "Đào sâu nối đất" giới hạn 3 tầng ([mục 5.4](#54-đào-sâu--mô-hình-đề-xuất-thay-cho-đệ-quy-trừu-tượng)) — 3 tầng đủ chưa, hay nên để người dùng tự chỉnh?
9. Có nên cho chia sẻ dự án với người hướng dẫn (chế độ chỉ đọc / bình luận) ngay từ đầu không?
10. Dữ liệu đề tài NCS là tài sản trí tuệ — mức độ cảnh báo về việc gửi dữ liệu qua API bên thứ ba (Anthropic) đã đủ chưa? Có cần phương án LLM tự vận hành (Ollama) cho nhóm nhạy cảm?

**Về kỹ thuật:**
11. Chạy phân tích khoảng trống **đồng bộ trong request** (≤25 bài, ~5–15s) có chấp nhận được không, hay bắt buộc phải có hàng đợi job ngay từ pha 1?
12. Xuất `.docx` — dùng thư viện JS (`docx`) đưa vào dependency, hay chỉ trả Markdown và để người dùng tự chuyển?

---

## 15. Phụ lục: lược đồ CSDL đề xuất

> Bổ sung vào `db/schema.sql` — idempotent, dùng chung MySQL `u440660297_chimedis`, khoá ngoại tới `users(id)` đã có.

```sql
-- ===== Bàn làm việc nghiên cứu: dự án =====
CREATE TABLE IF NOT EXISTS wb_projects (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  title        VARCHAR(300) NOT NULL,
  note         TEXT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Khoảng trống nghiên cứu đã lưu (cây nhiều tầng) =====
CREATE TABLE IF NOT EXISTS wb_gaps (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id     BIGINT NOT NULL,
  parent_gap_id  BIGINT NULL COMMENT 'NULL = tầng gốc; có giá trị = kết quả đào sâu từ khoảng trống cha',
  depth          TINYINT NOT NULL DEFAULT 0,
  title          VARCHAR(500) NOT NULL,
  gap_type       ENUM('evidence','population','intervention','outcome','method','mechanism','theory') NULL,
  body_json      JSON NOT NULL COMMENT '{ evidenceHave:[{paperId,note}], whatsMissing, whyItMatters, llmConfidence }',
  search_meta    JSON NULL COMMENT 'Truy vấn + bộ lọc đã tạo ra tập bài này',
  status         ENUM('open','exploring','taken','discarded') NOT NULL DEFAULT 'open',
  tags           VARCHAR(300) NULL COMMENT 'CSV thẻ do người dùng đặt',
  user_note      TEXT NULL,
  llm_model      VARCHAR(64) NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  INDEX idx_project (project_id, depth),
  INDEX idx_parent (parent_gap_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Thư viện tài liệu của dự án =====
CREATE TABLE IF NOT EXISTS wb_library (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id    BIGINT NOT NULL,
  source        VARCHAR(32) NULL COMMENT 'openalex|europepmc|core|semanticscholar|ris|bibtex|manual',
  ext_id        VARCHAR(128) NULL COMMENT 'DOI / ID nguồn để khử trùng',
  csl_json      JSON NOT NULL COMMENT 'Metadata chuẩn hoá (title, authors, year, venue, abstract, doi, url)',
  user_note     TEXT NULL,
  matrix_json   JSON NULL COMMENT 'Các ô evidence matrix người dùng điền',
  added_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  UNIQUE KEY uq_proj_ext (project_id, ext_id),
  INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Bản thảo (đề cương / bài viết) =====
CREATE TABLE IF NOT EXISTS wb_drafts (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id    BIGINT NOT NULL,
  gap_id        BIGINT NULL COMMENT 'Khoảng trống khởi nguồn (nếu có)',
  kind          ENUM('proposal','imrad','custom') NOT NULL DEFAULT 'imrad',
  study_type    VARCHAR(32) NULL COMMENT 'rct|observational|systematic-review|case-report|...',
  title         VARCHAR(500) NULL,
  content_md    LONGTEXT NULL COMMENT 'Nội dung do NGƯỜI DÙNG gõ/sửa (Markdown)',
  ai_log_json   JSON NULL COMMENT 'Nhật ký các mục đã dùng LLM hỗ trợ: [{section,model,at}]',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES wb_projects(id),
  INDEX idx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== Đếm hạn mức LLM theo user/ngày =====
CREATE TABLE IF NOT EXISTS wb_llm_usage (
  user_id     INT NOT NULL,
  ymd         DATE NOT NULL,
  gap_calls   INT NOT NULL DEFAULT 0,
  assist_calls INT NOT NULL DEFAULT 0,
  tokens_in   BIGINT NOT NULL DEFAULT 0,
  tokens_out  BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, ymd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

*Hết. Mọi góp ý xin ghi trực tiếp vào Pull Request của nhánh `plan/research-workbench` hoặc gửi cho chủ dự án.*
