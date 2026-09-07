# Milestone H — Tích hợp trang chủ + Hợp nhất tìm kiếm + Tài khoản

> **Spec để bàn.** Gộp Research Workbench (M1) vào chính trang chủ `chimedis.vn`:
> đăng nhập/đăng ký ngay tại trang chủ, "chế độ nghiên cứu" chia 2 panel, và
> hợp nhất backend tìm kiếm cũ (`/api/research`) với lớp connector M1.
>
> - Trạng thái: **DỰ THẢO — chưa code.** Chạy **sau khi verify M1 xong**.
> - Nhánh: `plan/homepage-integration` · Repo: `tmh2388/chimedis-home`
> - Lập: 2026-09-07 (Claude) · Đọc kèm: `research-workbench-M0-architecture-freeze.md`, `research-workbench-plan.md`
> - Quan hệ roadmap: **song song / trước M3**. Không đụng contract M0 (chỉ dùng lại `connector_v1`, `provenance_v1`, `record_v1`).

---

## Mục lục

1. [Mục tiêu](#1-mục-tiêu)
2. [Trạng thái hiện tại](#2-trạng-tại-hiện-tại)
3. [Phần A — Tài khoản (đăng nhập + đăng ký + đa phương thức)](#3-phần-a--tài-khoản)
4. [Phần B — Hợp nhất backend tìm kiếm](#4-phần-b--hợp-nhất-backend-tìm-kiếm)
5. [Phần C — "Chế độ nghiên cứu" 2 panel trên trang chủ](#5-phần-c--chế-độ-nghiên-cứu-2-panel)
6. [Phần D — Tái cấu trúc `index.html`](#6-phần-d--tái-cấu-trúc-indexhtml)
7. [Di trú & bỏ `/workbench.html`](#7-di-trú--bỏ-workbenchhtml)
8. [Rủi ro & giảm thiểu](#8-rủi-ro--giảm-thiểu)
9. [Kế hoạch kiểm thử — gồm "còn cần test gì"](#9-kế-hoạch-kiểm-thử)
10. [Phân kỳ H1–H5](#10-phân-kỳ-h1h5)
11. [Câu hỏi cần chốt](#11-câu-hỏi-cần-chốt)

---

## 1. Mục tiêu

1. **Một nơi duy nhất.** Người dùng vào `chimedis.vn`, tìm y văn như hiện nay; nếu muốn làm việc sâu (lưu dự án, câu hỏi, nhật ký tìm kiếm) thì **đăng nhập ngay tại chỗ** và bật "chế độ nghiên cứu" — không nhảy sang trang khác.
2. **Một backend tìm kiếm.** Gộp `/api/research/search` (ẩn danh, GĐ1/2) và `/api/workbench/.../search` (M1) về chung lớp `lib/connectors/`. Người ẩn danh cũng được PubMed độc lập + Crossref + ClinicalTrials.gov + dedup identity-graph; người đăng nhập thêm provenance + lưu dự án.
3. **Tài khoản hoàn chỉnh.** Hiện mới có đăng nhập (Google + Email sign-in). Bổ sung: **đăng ký**, xác thực email, đặt lại mật khẩu, và **đa dạng phương thức** (Apple, ORCID, Microsoft…).
4. **UX 2 panel** kiểu Claude (trái: tìm/kết quả · phải: bàn làm việc thường trú), thao tác trực tiếp giữa 2 panel.

**Ngoài phạm vi:** gap candidate (M4), evidence matrix (M3), soạn thảo (M5), connector Trung văn production (M2).

---

## 2. Trạng thái hiện tại

### 2.1 Hai backend tìm kiếm song song

| | `/api/research/search` — `routes/research.js` | `/api/workbench/projects/:id/search` — `routes/workbench.js` |
|---|---|---|
| Ai dùng | Ẩn danh, trang chủ | Đăng nhập, `/workbench.html` |
| Nguồn | 4 (OpenAlex, Europe PMC, CORE, Semantic Scholar) gọi trực tiếp trong `lib/research-sources.js` | Qua `lib/connectors/` — **thêm PubMed E-utilities độc lập, Crossref, ClinicalTrials.gov** + skeleton Trung văn |
| Dịch YHCT | `lib/tcm-vocab.js` + **tự học LLM** (`lib/dict-learn.js`, `lib/llm-translate.js`) | `lib/tcm-vocab.js` (KHÔNG LLM ở M1) |
| Tính năng UI đã tinh chỉnh | builder truy vấn nâng cao · lọc-trong-kết-quả · tải PDF (proxy chống SSRF) · sắp xếp/phân trang kiểu Web of Science · highlight cụm (kể cả CJK) · nhiều GOTCHA đã sửa | bảng kết quả tối giản · Coverage Manifest · Minimum Source Policy · Search Log export |
| Ghi vết | Cache RAM 10' · `dict_term_misses` (fire-and-forget) | `wb_search_runs` **bất biến** + `wb_search_run_sources` |
| Dedup | Theo DOI (fallback tiêu đề) trong `research-sources.js` | **identity-graph** (`lib/canonical-record.js`) |

### 2.2 Hai bề mặt đăng nhập

| | `admin-public/index.html` | `public/workbench.html` |
|---|---|---|
| Google | ✅ | ✅ |
| Email đăng nhập | ✅ | ✅ |
| Email **đăng ký** | ✅ (`createUserWithEmailAndPassword` + toggle) | ❌ |
| Xác thực email | ❌ | ❌ |
| Đặt lại mật khẩu | ❌ | ❌ |
| Apple / Microsoft / ORCID-as-login | ❌ | ❌ |
| Sau đăng nhập | gọi `/api/auth/sync` → bảng `users` (role) | như trên |

Trang chủ `public/index.html` (**88KB, 1 file**) hiện **không có** đăng nhập.

### 2.3 ORCID
`routes/orcid.js` đã có OAuth **liên kết** ORCID cho user đã đăng nhập (admin). Chưa dùng ORCID làm **phương thức đăng nhập**.

---

## 3. Phần A — Tài khoản

### 3.1 Luồng đăng ký (mới)

Trên trang chủ, khu vực đăng nhập (modal hoặc trang `/tai-khoan`):

```
[Đăng nhập]  |  [Đăng ký]   ← 2 tab

Đăng ký bằng email:
  email · mật khẩu · nhập lại mật khẩu · [đồng ý điều khoản]
  → createUserWithEmailAndPassword
  → sendEmailVerification (Firebase gửi mail xác thực)
  → POST /api/auth/sync (tạo hàng users, role='reader')
  → hiện thông báo "Đã gửi email xác thực tới <email>. Kiểm tra hộp thư."
  → cho dùng ngay (không chặn), nhưng hiện banner "Email chưa xác thực — xác thực để bảo vệ tài khoản"
```

- **Xác thực email:** dùng Firebase `sendEmailVerification`. Cấu hình "Action URL" trong Firebase Console trỏ về `https://chimedis.vn/xac-thuc` (trang tĩnh hiển thị kết quả). Không bắt buộc xác thực để dùng chức năng cơ bản; có thể **bắt buộc** cho hành vi nhạy cảm sau này (liên kết ORCID, xuất dữ liệu số lượng lớn) — chốt ở [câu hỏi 3](#11-câu-hỏi-cần-chốt).
- **Đặt lại mật khẩu:** link "Quên mật khẩu?" → nhập email → `sendPasswordResetEmail`. Action URL → `https://chimedis.vn/dat-lai-mat-khau`.
- **Đổi mật khẩu** (khi đã đăng nhập): trang hồ sơ → `updatePassword` (yêu cầu đăng nhập lại nếu phiên cũ).
- Email template + ngôn ngữ: Firebase Console → Authentication → Templates → đổi sang **tiếng Việt**, sender name "Chimedis", reply-to `contact@chimedis.vn`.

### 3.2 Đa dạng phương thức đăng nhập

| Provider | Ưu tiên | Ghi chú triển khai |
|---|---|---|
| **Google** | Có sẵn | Giữ nguyên |
| **Email/mật khẩu** | v1 — hoàn thiện (3.1) | Firebase built-in |
| **Apple** | **v1 — cần** | App Chimedis đã có trên App Store; Apple **bắt buộc "Sign in with Apple"** nếu ứng dụng có đăng nhập bên thứ ba khác. Firebase `OAuthProvider('apple.com')`. Cần: Apple Developer → Service ID + Key; cấu hình trong Firebase Console. Web + app dùng chung. |
| **ORCID** | **v1 — điểm khác biệt** | NCS/nhà nghiên cứu ai cũng có ORCID. `routes/orcid.js` đã có OAuth flow — mở rộng thành **đăng nhập**: nếu chưa có `users` row khớp `orcid_id` → tạo mới (role reader, `orcid_verified=1`); nếu có → phát hành phiên. Firebase không hỗ trợ ORCID sẵn → dùng **Firebase Custom Token**: backend xác thực ORCID OAuth code → `firebase-admin` `createCustomToken(uid)` → client `signInWithCustomToken`. |
| **Microsoft** | v2 | Nhiều trường ĐH Việt Nam dùng Microsoft 365 (giảng viên/NCS). Firebase `OAuthProvider('microsoft.com')` + Azure AD app registration. |
| **Điện thoại / OTP** | v2–v3 | Phổ biến ở VN nhưng Firebase Phone Auth tính phí sau hạn mức + cần reCAPTCHA. Cân nhắc sau khi đo nhu cầu. |
| **Facebook** | **Chờ** | Meta đang chặn tạo app (ghi nhận ở `project_chimedis_user_auth`). Giữ nút ẩn, bật khi Meta mở. |
| **SAML / institutional** | Backlog | Cho hợp tác với trường/viện. |

**Chốt v1:** Google + Email(đầy đủ) + Apple + ORCID. v2: Microsoft, Phone.

### 3.3 Gộp "account linking"
Nếu user đăng nhập Google rồi sau đăng nhập Apple cùng email → Firebase báo `auth/account-exists-with-different-credential`. Xử lý: hiện "Email này đã đăng ký bằng [phương thức X], đăng nhập bằng X rồi liên kết Apple trong Hồ sơ." (`linkWithPopup`). Trang **Hồ sơ tài khoản** liệt kê các phương thức đã liên kết + ORCID + cho gỡ.

### 3.4 Firebase Console — việc cấu hình (ngoài code)
- [ ] Authorized domains: `chimedis.vn` (đã thêm 2026-09-07), thêm `www.chimedis.vn` nếu dùng.
- [ ] Bật provider: Apple, Microsoft (khi tới v2).
- [ ] Email templates → tiếng Việt, sender "Chimedis".
- [ ] Action URL cho verify / reset → trang trên `chimedis.vn`.
- [ ] (Apple) Service ID, Key ID, Team ID, private key.

---

## 4. Phần B — Hợp nhất backend tìm kiếm

### 4.1 Nguyên tắc
- **Giữ 100% tính năng `/api/research/search` hiện có.** Builder nâng cao, lọc-trong-kết-quả, tải PDF, sắp xếp, highlight CJK, từ điển tự học LLM — không được rớt cái nào.
- Refactor **bên trong**: `research-sources.js` `searchAll()` gọi qua `lib/connectors/` registry thay vì gọi thẳng 4 hàm. Chữ ký `searchAll(query, opts)` **giữ nguyên** để `routes/research.js` không phải đổi nhiều.
- Thêm nguồn: registry đã có `pubmed`, `crossref`, `clinicaltrials` ở trạng thái `approved` → tự động vào kết quả ẩn danh. Cho phép tắt/bật theo `opts.sources` (giữ tương thích tham số `sources=` cũ).
- Dedup: chuyển sang `dedupeRecords()` identity-graph (tốt hơn dedup-theo-DOI hiện tại).
- **Chuẩn hoá 1 shape.** Hiện `research-sources.js` có shape riêng (`{source,id,pmid,doi,title,authors,year,venue,type,citations,isOpenAccess,oaUrl,landingUrl,abstract,topic,keywords}`), M1 có `CanonicalResearchRecord`. → Tầng connector trả `CanonicalResearchRecord`; thêm một hàm `toLegacyShape(rec)` để `routes/research.js` + `index.html` cũ tiêu thụ không đổi. Xoá dần `toLegacyShape` khi UI mới lên.

### 4.2 Hai mức tính năng trên cùng một endpoint

| | Ẩn danh (`/api/research/search`) | Đăng nhập + có `projectId` |
|---|---|---|
| Nguồn | connector `approved` | như trái |
| Dịch YHCT + LLM tự học | ✅ (giữ) | ✅ |
| Kết quả + builder + lọc + PDF | ✅ | ✅ |
| Ghi `wb_search_runs` bất biến | ❌ | ✅ |
| Coverage Manifest + Minimum Source Policy | ❌ (hoặc hiển thị "thông tin", không lưu) | ✅ |
| Nút "Lưu bài vào dự án" | ❌ | ✅ |

Cơ chế: `routes/research.js` nhận thêm `projectId?` + `questionId?` (chỉ dùng khi `requireUser` qua được). Nếu có → sau khi tìm, gọi `writeSearchRun()` như workbench. Nếu không → chạy như cũ.

### 4.3 LLM tự học
Giữ nguyên `dict-learn` cho nhánh ẩn danh. Workbench M1 cố ý không LLM — sau hợp nhất, quyết định có bật LLM enrich cho lượt Evidence của người đăng nhập không (liên quan quota 30 USD/tháng — [câu hỏi 5](#11-câu-hỏi-cần-chốt)).

### 4.4 Đợt test hồi quy bắt buộc — xem [§9.2](#92-hồi-quy-tìm-kiếm-trang-chủ-bắt-buộc).

---

## 5. Phần C — "Chế độ nghiên cứu" 2 panel

### 5.1 Trạng thái & bố cục

```
Trang chủ mặc định (như hiện nay)
        │  user đăng nhập → nút "Chế độ nghiên cứu" xuất hiện trên nav
        ▼
┌───────────────────────────┬───────────────────────────────┐
│  PANEL TRÁI (≈ 58%)       │  PANEL PHẢI (≈ 42%)           │
│  • ô tìm + builder        │  • chọn / tạo Dự án           │
│  • bộ lọc, sắp xếp        │  • Câu hỏi nghiên cứu + hồ sơ │
│  • bảng kết quả           │  • Coverage của lượt hiện tại │
│    - mỗi dòng: [+ Lưu]    │  • Bài đã lưu trong dự án     │
│  • highlight, phân trang  │  • Nhật ký tìm kiếm + Xuất    │
│                           │  • (M4) Khoảng trống ứng viên │
└───────────────────────────┴───────────────────────────────┘
        │  thu gọn panel phải → về trang tìm bình thường
```

- **Thao tác trực tiếp:** bấm `[+ Lưu]` ở 1 kết quả bên trái → bài hiện ngay ở "Bài đã lưu" bên phải (không reload). Bấm 1 bài bên phải → cuộn/nhấp nháy dòng tương ứng bên trái.
- Panel phải **thường trú** khi ở chế độ nghiên cứu; state giữ khi đổi truy vấn.
- Nút chuyển đổi: "Chế độ nghiên cứu" ↔ "Thoát chế độ nghiên cứu". Lưu lựa chọn vào `localStorage` để lần sau vào giữ nguyên.
- Ẩn danh bấm "Chế độ nghiên cứu" → mở modal đăng nhập/đăng ký (Phần A).

### 5.2 Responsive
- **≥ 1100px:** 2 panel cạnh nhau (resizable divider, kéo được, min 320px mỗi bên).
- **768–1100px:** panel phải thành drawer trượt từ phải, nút "Bàn làm việc (N)".
- **< 768px (mobile):** 1 cột; chuyển giữa "Tìm kiếm" và "Bàn làm việc" bằng tab dưới cùng. Không chia đôi.

### 5.3 State (frontend)
Một store nhỏ (vanilla, không cần framework): `{ user, activeProject, activeQuestion, lastSearch, savedRecords[], searchRuns[] }`. Panel trái và phải cùng đọc/ghi store; thay đổi → re-render phần liên quan (không re-render cả trang — bài học từ `index.html` hiện tại vẽ lại bảng làm mất highlight).

---

## 6. Phần D — Tái cấu trúc `index.html`

`public/index.html` hiện **88KB, 1 file** (HTML + CSS + JS lẫn lộn). Thêm auth + 2 panel + store vào đây sẽ thành ~130KB không bảo trì nổi.

**Đề xuất:** tách tối thiểu, **không** thêm bundler nặng:
- `public/index.html` — chỉ markup + `<link>`/`<script type="module">`.
- `public/assets/app.css` — toàn bộ style.
- `public/assets/search.js` — logic tìm kiếm hiện có (panel trái).
- `public/assets/auth.js` — Firebase bootstrap + modal đăng nhập/đăng ký (dùng chung với admin/workbench sau này).
- `public/assets/workbench-panel.js` — panel phải.
- `public/assets/store.js` — state chung.

Hostinger phục vụ file tĩnh sẵn, ES modules chạy trực tiếp, **không cần build step**. Nếu sau này muốn minify → thêm 1 script `npm run build` tùy chọn, không bắt buộc.

**Rủi ro:** đây là refactor lớn file đang chạy production. Làm ở nhánh riêng, so sánh pixel + test hồi quy đầy đủ (§9.2) trước khi merge.

---

## 7. Di trú & bỏ `/workbench.html`

1. Khi Phần C lên production và ổn định → `/workbench.html` chuyển thành **redirect 302** về `chimedis.vn/?research=1` (mở thẳng chế độ nghiên cứu).
2. Giữ redirect ≥ 1 tháng (phòng ai đã bookmark), rồi xoá file.
3. `/api/workbench/*` **giữ nguyên** — chỉ UI hợp nhất, API không đổi.

---

## 8. Rủi ro & giảm thiểu

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| H-R1 | **Hồi quy tìm kiếm trang chủ** (mất builder/lọc/PDF/highlight/GOTCHA đã sửa) | **Cao** | Nhánh riêng; bộ test hồi quy §9.2 chạy đủ trước merge; giữ `searchAll()` chữ ký cũ + `toLegacyShape()` |
| H-R2 | Refactor `index.html` làm hỏng layout/hành vi tinh vi | Cao | Tách từng bước, mỗi bước deploy + kiểm; ảnh chụp so sánh; giữ bản cũ 1 commit để rollback nhanh |
| H-R3 | Apple Sign-In cấu hình sai → app iOS bị Apple từ chối bản cập nhật | TB | Làm + test trên simulator + TestFlight trước khi nộp; tài liệu cấu hình Service ID/Key |
| H-R4 | ORCID-as-login qua custom token: lỗ hổng nếu không verify kỹ OAuth state/nonce | TB | Dùng đúng `state` chống CSRF; chỉ tạo custom token sau khi ORCID trả `access_token` hợp lệ; không tin `orcid_id` từ client |
| H-R5 | 2 panel + store phát sinh bug state (bài lưu 2 lần, panel lệch dự án) | TB | Store 1 nguồn sự thật; thao tác ghi đều qua API rồi đọc lại; test §9.3 |
| H-R6 | Endpoint tìm kiếm chạy đồng bộ 5+ nguồn cho **mọi** khách ẩn danh → tải máy chủ + có thể chậm/timeout | TB | Giữ timeout per-connector 8s; cân nhắc cho ẩn danh chỉ 3 nguồn nhanh mặc định, người đăng nhập mới bật full; đo trên Hostinger |
| H-R7 | Spam đăng ký / tạo project rác | TB | Firebase abuse protection + email verify; rate-limit `POST /projects`; giới hạn số project/user |
| H-R8 | Phình phạm vi (milestone này to hơn M1) | Cao | Phân kỳ H1–H5, mỗi pha deploy độc lập, có thể dừng giữa chừng vẫn dùng được |

---

## 9. Kế hoạch kiểm thử

### 9.1 CÒN CẦN TEST GÌ Ở M1 (trước khi đóng M1 — độc lập milestone này)

Đây là phần trả lời cho câu hỏi "còn cần test gì nữa". Các mục dưới **chưa** verify trên production:

- [ ] **`request_fingerprint` ổn định:** chạy lại y hệt 1 truy vấn → cùng fingerprint (đã test local, chưa trên prod).
- [ ] **Search Log `.docx`:** `docx` đã cài trên prod chưa? Tải file Word → mở được, có bảng manifest + fingerprint. (md/csv đã có; docx dùng import động — nếu thiếu lib thì fallback md, cần biết đang ra định dạng nào.)
- [ ] **CSV/MD tiếng Việt + chữ Hán:** mở bằng Excel — không lỗi font, có BOM.
- [ ] **Dedup identity-graph trên mẫu Trung–Anh thật:** 1 bài xuất hiện ở PubMed (PMID) + OpenAlex (DOI) + Europe PMC (PMCID) → phải gộp thành 1 dòng, `merged_from` đủ 3.
- [ ] **Tất cả connector fail cùng lúc** (vd tắt mạng/đổi URL sai tạm) → `coverage_state=incomplete`, run vẫn lưu, không 500.
- [ ] **Connector timeout dưới tải thật:** Crossref local đo ~7.9s (sát trần 8s). Trên prod có hay bị `timeout` không? Nếu thường xuyên → nới trần Crossref hoặc bỏ khỏi Evidence mặc định.
- [ ] **Endpoint search không bị Hostinger cắt (502/504):** lượt Evidence 5 nguồn mất bao lâu thực tế? Nếu > ~25–30s → phải chuyển job+polling (M0 §B9 đã dự phòng).
- [ ] **Xoá câu hỏi đang được `wb_search_runs` tham chiếu** (vừa thêm `PATCH/DELETE /questions/:qid`) → `question_id` set NULL, không lỗi FK.
- [ ] **Xoá dự án** → `wb_search_run_sources` + `wb_search_runs` + `wb_research_questions` sạch theo đúng thứ tự FK; `wb_research_records` **không** bị xoá.
- [ ] **"Đặt lại toàn bộ"** (loop DELETE) → hết project, không rơi vào trạng thái lỗi.
- [ ] **Auth biên:** token hết hạn giữa phiên (Firebase tự refresh?); user có Firebase nhưng chưa `/api/auth/sync` (chưa có hàng `users`) → route trả 403 rõ ràng, không 500.
- [ ] **XSS:** tiêu đề/abstract từ API ngoài có ký tự `<script>`/HTML → `esc()` chặn ở mọi chỗ render (bảng kết quả, manifest, nhật ký).
- [ ] **SQL:** rà lại mọi query trong `routes/workbench.js` + `lib/search-runs.js` đều dùng `?` placeholder (không nối chuỗi).
- [ ] **`wb_research_records` phình:** kho dùng chung không có dọn — chấp nhận ở M1, ghi nhận để M3 có chính sách.
- [ ] **Hồi quy nhẹ:** `chimedis.vn` trang chủ + `/api/research` + `admin.chimedis.vn` vẫn nguyên (đã xác nhận qua HTTP status; nên click thử 1 lượt tìm thật trên trang chủ).

### 9.2 Hồi quy tìm kiếm trang chủ (BẮT BUỘC trước khi merge Phần B/D)

Chạy lại toàn bộ tình huống đã tinh chỉnh trong lịch sử (xem `project_chimedis_literature_discovery.md`):
- [ ] Truy vấn tiếng Việt / tiếng Trung / tiếng Anh / lẫn lộn — dịch đúng, highlight đúng (kể cả cụm CJK 2 ký tự).
- [ ] Builder nâng cao: TITLE + ABSTRACT, có NOT, trường journal, thuật ngữ VN.
- [ ] Lọc-trong-kết-quả (client) giữ khi đổi sort; truy vấn mới thì bỏ lọc.
- [ ] Sắp xếp theo Năm / Trích dẫn (resort client tức thì + refetch nền).
- [ ] Tải PDF: PLOS/BMC (thành công) vs PMC-only (fallback báo lỗi + hỏi mở trang gốc) — hành vi không đổi.
- [ ] "Chỉ bài trong PubMed/MEDLINE", "Có toàn văn PMC", "Chỉ Open Access" — lọc đúng.
- [ ] Các truy vấn dài 6+ nhóm AND — vẫn cắt nhóm generic, không ra 0 kết quả.
- [ ] Không có tên CSDL nào lộ ra UI (yêu cầu cũ của user).
- [ ] So sánh số kết quả trước/sau refactor cho ~10 truy vấn mẫu — không tụt bất thường.

### 9.3 Test tích hợp mới (Phần A + C)

- [ ] Đăng ký email → nhận mail xác thực (tiếng Việt) → link về `chimedis.vn/xac-thuc` hoạt động.
- [ ] Quên mật khẩu → nhận mail → đặt lại → đăng nhập được.
- [ ] Đăng nhập Google / Apple / ORCID — mỗi cái tạo đúng 1 hàng `users`, `role='reader'`.
- [ ] Cùng email, đăng nhập Google rồi thử Apple → thông báo account-linking đúng, không tạo user trùng.
- [ ] ORCID login: `orcid_id` lưu đúng, `orcid_verified=1`, không tin dữ liệu client.
- [ ] Bật "Chế độ nghiên cứu" → 2 panel; kéo divider; thu gọn về bình thường; `localStorage` nhớ.
- [ ] Bấm `[+ Lưu]` ở kết quả trái → xuất hiện ngay panel phải; không trùng khi bấm 2 lần.
- [ ] Đổi dự án ở panel phải → "bài đã lưu" + "nhật ký" đổi theo; panel trái giữ kết quả tìm.
- [ ] Responsive: 1440 / 1024 / 375 px — layout đúng theo §5.2; mobile không vỡ.
- [ ] Ẩn danh bấm "Chế độ nghiên cứu" → modal đăng nhập, không lỗi.
- [ ] Đăng xuất giữa chế độ nghiên cứu → về trang chủ bình thường, panel phải biến mất sạch.
- [ ] iOS app (WebView) mở `chimedis.vn`: đăng nhập Apple/Google hoạt động trong app; "Sign in with Apple" hiện đúng chỗ.

### 9.4 Bảo mật / hiệu năng

- [ ] Rate-limit `POST /api/workbench/projects` + `/questions` + `/search` (chống spam).
- [ ] `POST /search` ẩn danh: đo p95 thời gian phản hồi trên prod; tải đồng thời 10 request.
- [ ] Kiểm không rò `NCBI_API_KEY` / secret nào ra client hay log.
- [ ] CORS: `/api/workbench` chỉ cho origin `chimedis.vn` (hiện `cors()` mở — thu hẹp).

---

## 10. Phân kỳ H1–H5

Mỗi pha **deploy độc lập, dừng giữa chừng vẫn có giá trị.**

### H1 — Tài khoản trên trang chủ (Phần A cốt lõi)
Modal đăng nhập/đăng ký trên `index.html` (tách `auth.js`) · email đăng ký + verify + reset · Google + Email đầy đủ · trang Hồ sơ tài khoản. **Chưa** Apple/ORCID.

### H2 — Hợp nhất backend tìm kiếm (Phần B)
`searchAll()` → `lib/connectors` + `toLegacyShape()` · dedup identity-graph · thêm PubMed/Crossref/ClinicalTrials.gov cho ẩn danh · **chạy §9.2 đầy đủ**. UI trang chủ chưa đổi hình.

### H3 — Chế độ nghiên cứu 2 panel (Phần C + D)
Tách `index.html` thành module · store · panel phải · thao tác trực tiếp · responsive. `/workbench.html` → redirect.

### H4 — Apple + ORCID login (Phần A mở rộng)
Apple Sign-In (web + app) · ORCID qua custom token · account linking UI.

### H5 — Microsoft + Phone (tùy nhu cầu) · minify tùy chọn · dọn dẹp.

---

## 11. Câu hỏi cần chốt

1. **Thứ tự H1 vs H2:** làm tài khoản trước hay hợp nhất search trước? (đề xuất: H1 trước — nhỏ, độc lập, không đụng search)
2. **Ẩn danh có nên chạy full 7 connector không**, hay mặc định 3 nguồn nhanh + "tìm sâu hơn" mới thêm PubMed/Crossref/CT.gov? (tải máy chủ + tốc độ)
3. **Bắt buộc xác thực email** cho hành vi nào? (đề xuất: không bắt buộc để tìm/lưu; bắt buộc khi liên kết ORCID hoặc xuất > N bản ghi)
4. **Apple Sign-In:** có gấp không? App iOS hiện đã trên store — bản cập nhật kế tiếp có thêm social login không? Nếu có → H4 phải lên trước bản đó.
5. **LLM cho lượt Evidence của người đăng nhập:** có bật `dict-learn` enrich không (đụng quota 30 USD/tháng đã chốt cho M4)?
6. **Tách `index.html`:** đồng ý tách thành module không-build-step, hay giữ 1 file?
7. **Divider kéo được** ở panel — cần ngay H3 hay để mặc định 58/42 cố định trước?
8. **`/workbench.html`:** redirect rồi xoá, hay giữ song song lâu dài như "chế độ toàn màn hình"?

---

*Hết. Góp ý ghi vào PR của nhánh `plan/homepage-integration`.*
