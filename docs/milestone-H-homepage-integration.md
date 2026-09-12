# Milestone H — Tích hợp trang chủ + Hợp nhất tìm kiếm + Tài khoản

> **Spec để bàn.** Gộp Research Workbench (M1) vào chính trang chủ `chimedis.vn`:
> đăng nhập/đăng ký ngay tại trang chủ, "chế độ nghiên cứu" chia 2 panel, và
> hợp nhất backend tìm kiếm cũ (`/api/research`) với lớp connector M1.
>
> - Trạng thái: **DỰ THẢO v2 — đã tiếp thu review PR #3 (REQUEST CHANGES, phạm vi sửa nhỏ). Chưa code.** Chạy **sau khi verify M1 xong**.
> - Nhánh: `plan/homepage-integration` · Repo: `tmh2388/chimedis-home` · PR #3
> - v1: 2026-09-07 (Claude) · v2: 2026-09-07 (Claude, sau review)
> - Quan hệ roadmap: **song song / trước M3**. Không đụng contract M0 (chỉ dùng lại `connector_v1`, `provenance_v1`, `record_v1`).

### Sửa đổi theo review PR #3 (v2)

| # | Điểm review | Đã sửa |
|---|---|---|
| 1 | **Không trộn paper / metadata / trial registry vào cùng result stream** | §4.1a — tách 3 vai trò nguồn: literature (gộp danh sách bài) · Crossref = enrichment/dedup (không tự sinh dòng "paper") · ClinicalTrials.gov = kênh "Thử nghiệm lâm sàng" riêng, KHÔNG cộng vào số bài báo |
| 2 | **"Một backend" ≠ một public endpoint có quyền tùy chọn** | §4.2 — giữ **2 route mỏng** (public read-only `/api/research/search` KHÔNG bao giờ ghi project; `/api/workbench/.../search` requireUser + ownership + provenance) chung một `SearchService` |
| 3 | **Email chưa xác thực không được tạo dữ liệu bền vững** | §3.1 — write-gate: anonymous = Discovery đầy đủ · email chưa verify = đăng nhập được nhưng KHÔNG tạo project / export lớn / link ORCID · provider (Google/Apple/ORCID) = coi là verified |
| 4 | **Apple Sign-In: diễn đạt theo Guideline 4.8, không tuyệt đối** + thiếu **xoá tài khoản trong app** | §3.2 + §3.5 (mới) — Apple = "high-priority compliance trước lần submit kế" (không phải "bắt buộc tuyệt đối"); thêm luồng Delete account + revoke provider token + xoá/ẩn dữ liệu theo retention vào H1/H4 + test §9.3 |
| 5 | **ORCID: identity model rõ hơn, không giả định "ai cũng có"** | §3.2 — ORCID là phương thức **chuyên ngành, không phải primary universal**; trước H4 xác minh loại credential/terms (cá nhân vs organizational membership); không khóa production vào credential cá nhân của dev |
| 6 | **Không merge người dùng chỉ bằng email** | §3.3 — bảng `user_identities(user_id, provider, provider_subject, provider_email?, verified_at)`; `users.id` là chủ thể; link provider chỉ do user đã auth chủ động; KHÔNG auto-merge theo email (Apple `privaterelay`, ORCID email không tin được) |
| 7 | **Ẩn danh KHÔNG chạy full 7 connector mặc định** | §4.1a + §11.2 — Discovery mặc định = literature nhanh; Crossref chạy nền enrichment; ClinicalTrials.gov chỉ khi user chọn "Thử nghiệm" / "tìm sâu" / câu hỏi can thiệp lâm sàng |
| 8 | **Không bật LLM enrich tự động cho Evidence trong H2** | §4.3 + §11.5 — Evidence Search phải deterministic hoặc lưu đủ vào `search_run.query_expanded` + version; `dict-learn` chỉ được log miss phía sau nếu KHÔNG đổi query/result hiện tại |
| 9 | **Tách `index.html` thành module ES — đồng ý** | §6 + §11.6 — không framework/bundler; refactor cần thiết trước H3 |
| 10 | **H3 divider không phải MVP; `/workbench.html` không đặt mốc cứng** | §5.2 + §7 + §10 — layout 58/42 cố định trước, resizable là enhancement sau; redirect 302 giữ tới khi analytics/404 log cho thấy hết traffic (không "1 tháng" cứng) |

Thứ tự triển khai (review chốt): **H1a auth foundation → H2 search service unification → H3 homepage research mode → H4 Apple + ORCID → H5**.

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

- **Xác thực email:** dùng Firebase `sendEmailVerification`. Cấu hình "Action URL" trong Firebase Console trỏ về `https://chimedis.vn/xac-thuc` (trang tĩnh hiển thị kết quả). Email template → tiếng Việt, sender "Chimedis", reply-to `contact@chimedis.vn`.
- **Đặt lại mật khẩu:** link "Quên mật khẩu?" → nhập email → `sendPasswordResetEmail`. Action URL → `https://chimedis.vn/dat-lai-mat-khau`.
- **Đổi mật khẩu** (khi đã đăng nhập): trang hồ sơ → `updatePassword` (yêu cầu đăng nhập lại nếu phiên cũ).

### 3.1a Write-gate theo verified identity *(review PR #3 điểm 3)*

Vì tìm kiếm đã cho phép ẩn danh, **không có lý do UX để email chưa xác thực được tạo dữ liệu bền vững**. Ba mức quyền:

| Mức | Được làm |
|---|---|
| **Anonymous** (không đăng nhập) | Discovery search đầy đủ (literature). Không project, không lưu bài, không Search Log. |
| **Email đăng nhập nhưng CHƯA verify** | Xem, tìm; **KHÔNG** tạo project / tạo câu hỏi / lưu bài / xuất số lượng lớn / liên kết ORCID. Banner "Xác thực email để bắt đầu làm việc". |
| **Verified identity** (email đã verify, HOẶC provider Google/Apple/ORCID) | Toàn quyền Workbench (write). Provider-authenticated coi là verified identity ngay. |

Thực thi ở **backend**: middleware `requireVerified` (sau `requireUser`) kiểm `firebaseUser.email_verified === true` **hoặc** có ít nhất 1 provider trong `{google.com, apple.com, oidc.orcid}` trên token. Áp cho mọi route `POST`/`PATCH`/`DELETE` của `/api/workbench` trừ đọc. Không tin cờ verify do client gửi.

### 3.2 Đa dạng phương thức đăng nhập

| Provider | Ưu tiên | Ghi chú triển khai |
|---|---|---|
| **Google** | Có sẵn | Giữ nguyên |
| **Email/mật khẩu** | v1 — hoàn thiện (3.1) | Firebase built-in |
| **Apple** | **H4 — high-priority compliance** | *(review PR #3 điểm 4)* App Store **Guideline 4.8**: app cho phép đăng nhập bên thứ ba để tạo/xác thực **tài khoản chính** phải cung cấp **một tùy chọn tương đương** đạt 3 thuộc tính riêng tư (giới hạn dữ liệu ở tên+email, cho ẩn email, không theo dõi). "Sign in with Apple" là cách điển hình, **không phải luật tuyệt đối** rằng mọi app có Google login đều phải có; có ngoại lệ. Với Chimedis: nếu app iOS dùng Google tạo/auth tài khoản chính và **không thuộc ngoại lệ** → coi Sign in with Apple là việc **phải xong trước lần submit App Store kế tiếp**. Firebase `OAuthProvider('apple.com')` + Apple Developer Service ID/Key. |
| **ORCID** | **H4 — chuyên ngành, KHÔNG phải primary universal** | *(review PR #3 điểm 5)* ORCID hỗ trợ chính thức "Sign in with ORCID" qua OAuth/OIDC. **Không giả định "NCS nào cũng có ORCID"** — đây là phương thức phụ cho nhà nghiên cứu, đứng cạnh Google/Email chứ không thay. Trước H4 production **phải xác minh loại credential/terms** phù hợp: ORCID Public API credentials gắn với **cá nhân**; organizational credentials theo **mô hình membership**. **Không khóa production vào credential cá nhân của developer.** Kỹ thuật: backend xác thực ORCID OIDC → `firebase-admin.createCustomToken(uid)` → client `signInWithCustomToken`; identity ghi vào `user_identities` (§3.3). |
| **Microsoft** | v2 | Nhiều trường ĐH Việt Nam dùng Microsoft 365. Firebase `OAuthProvider('microsoft.com')` + Azure AD app registration. |
| **Điện thoại / OTP** | v2–v3 | Phổ biến ở VN nhưng Firebase Phone Auth tính phí sau hạn mức + cần reCAPTCHA. |
| **Facebook** | **Chờ** | Meta đang chặn tạo app (ghi nhận ở `project_chimedis_user_auth`). Giữ nút ẩn, bật khi Meta mở. |
| **SAML / institutional** | Backlog | Cho hợp tác với trường/viện. |

**Chốt:** H1 = Google + Email(đầy đủ). H4 = Apple + ORCID. v2 = Microsoft, Phone.

### 3.3 Identity model + account linking *(review PR #3 điểm 6)*

**KHÔNG merge người dùng chỉ vì email trùng.** Apple trả `privaterelay.appleid.com`; ORCID không đảm bảo email làm identity chính. Bảng mới:

```sql
CREATE TABLE IF NOT EXISTS user_identities (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  provider        VARCHAR(32) NOT NULL COMMENT 'password|google.com|apple.com|oidc.orcid|microsoft.com',
  provider_subject VARCHAR(255) NOT NULL COMMENT 'sub/uid bền vững của provider (KHÔNG phải email)',
  provider_email  VARCHAR(255) NULL,
  verified_at     TIMESTAMP NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_provider_subject (provider, provider_subject),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- `users.id` là **chủ thể chính** (canonical). Một user có nhiều `user_identities`.
- Đăng nhập: tra `(provider, provider_subject)` → có thì phát phiên user đó; không thì tạo `users` mới + 1 `user_identities`.
- **Liên kết provider chỉ do user ĐÃ đăng nhập chủ động** thực hiện ở trang Hồ sơ (`linkWithPopup` phía Firebase + ghi `user_identities` phía backend). Backend **không** tự merge 2 `users` vì email giống nhau.
- **Không tạo user ORCID mới** nếu ORCID đó đang được link vào một account hiện có.
- Khi Firebase báo `auth/account-exists-with-different-credential` → UI hướng dẫn "đăng nhập bằng [provider cũ] rồi liên kết [provider mới] trong Hồ sơ", không tự động.
- `POST /api/auth/sync` sửa lại: nhận token → đọc `firebase.auth().verifyIdToken()` → lấy `firebase.sign_in_provider` + `sub` → upsert `user_identities`, upsert `users`.

### 3.4 Firebase Console — việc cấu hình (ngoài code)
- [ ] Authorized domains: `chimedis.vn` (đã thêm 2026-09-07), thêm `www.chimedis.vn` nếu dùng.
- [ ] Bật provider: Apple, Microsoft (khi tới H4/v2).
- [ ] Email templates → tiếng Việt, sender "Chimedis".
- [ ] Action URL cho verify / reset → trang trên `chimedis.vn`.
- [ ] (Apple) Service ID, Key ID, Team ID, private key.
- [ ] (ORCID) xác minh loại credential (cá nhân vs organizational membership) trước H4.

### 3.5 Xoá tài khoản trong app *(review PR #3 điểm 4 — App Store yêu cầu)*

App cho phép tạo tài khoản **bắt buộc** có luồng khởi tạo xoá tài khoản **ngay trong app** (App Store Guideline 5.1.1(v)).

- UI: trang Hồ sơ → "Xoá tài khoản" → xác nhận 2 bước.
- Backend `DELETE /api/auth/account` (`requireUser`): 
  1. Xoá/ẩn dữ liệu Workbench theo retention policy — `wb_projects` + con của user; giữ `wb_research_records` (dùng chung, không chứa dữ liệu cá nhân).
  2. Xoá `user_identities` + hàng `users`.
  3. `firebase-admin.deleteUser(uid)`.
  4. Revoke provider token khi provider hỗ trợ (Google `revoke`, ORCID nếu có).
- Ghi log xoá (không chứa PII) để đối soát.
- Test: §9.3.

---

## 4. Phần B — Hợp nhất backend tìm kiếm

### 4.1 Nguyên tắc
- **Giữ 100% tính năng `/api/research/search` hiện có.** Builder nâng cao, lọc-trong-kết-quả, tải PDF, sắp xếp, highlight CJK, từ điển tự học LLM — không được rớt cái nào.
- Refactor **bên trong**: tạo `lib/search-service.js` (`SearchService`) là điểm gọi chung; `research-sources.js` `searchAll()` và route Workbench cùng dùng nó. `SearchService` gọi `lib/connectors/` registry + `dedupeRecords()` identity-graph.
- **Chuẩn hoá 1 shape.** Connector trả `CanonicalResearchRecord`; thêm `toLegacyShape(rec)` để `routes/research.js` + `index.html` cũ tiêu thụ không đổi. Xoá dần khi UI mới lên.

### 4.1a Tách VAI TRÒ nguồn — KHÔNG trộn 1 result stream *(review PR #3 điểm 1 + 7 — BLOCKER)*

| Vai trò | Nguồn | Cách dùng |
|---|---|---|
| **Literature** (bài báo) | OpenAlex · Europe PMC · CORE · Semantic Scholar · **PubMed** | Hợp nhất + dedup thành **một danh sách bài báo**. Chỉ nhóm này tính vào "số kết quả". |
| **Metadata / enrichment** | **Crossref** | DOI resolution, metadata chuẩn, cờ retraction/correction, hỗ trợ **dedup + làm giàu** record đã có. **KHÔNG mặc định sinh thêm dòng "paper"** nếu literature source đã có record đó. Chỉ hiện Crossref như một kết quả độc lập khi bài **chỉ** có ở Crossref và user bật "gồm nguồn Crossref". |
| **Trial registry** | **ClinicalTrials.gov** (+ ChiCTR/ICTRP sau) | Là **study-registration record, KHÔNG phải publication**. Hiển thị ở **tab/section riêng "Thử nghiệm lâm sàng / 临床试验"** hoặc trong Coverage Manifest. **KHÔNG cộng vào số bài báo.** |

Lý do (khớp Evidence Provenance đã khóa ở M0): trộn lẫn làm méo số lượng bằng chứng và khiến người dùng hiểu nhầm "đăng ký thử nghiệm" = "bài báo".

**Discovery mặc định (ẩn danh):** chỉ **literature sources nhanh** (OpenAlex + Europe PMC + Semantic Scholar; PubMed nếu p95 latency cho phép). Crossref chạy **nền** để enrichment/dedup, không thêm dòng. ClinicalTrials.gov **chỉ gọi khi** user chọn tab "Thử nghiệm" / bật "tìm sâu" / (Workbench) câu hỏi có hồ sơ `tcm-clinical`. → giảm latency + tải Hostinger + semantics sạch. **Đáp [§11.2](#11-câu-hỏi-cần-chốt): KHÔNG chạy full 7 connector mặc định.**

### 4.2 HAI route mỏng, MỘT service layer *(review PR #3 điểm 2 — BLOCKER)*

**KHÔNG** để `/api/research/search` nhận `projectId?` rồi tùy quyền mà ghi provenance (rủi ro IDOR / privilege confusion / ghi nhầm).

```
                 ┌─────────────────────────────┐
POST /api/research/search   (public, read-only, KHÔNG BAO GIỜ ghi project)
                 │                             │
                 ├──────────►  SearchService  ◄──────────┤
                 │        (connector registry +          │
                 │         canonical dedup +             │
                 │         query expansion deterministic)│
                 │                             │
POST /api/workbench/projects/:id/search   (requireUser + requireVerified +
                 │                          kiểm ownership project/question +
                 │                          writeSearchRun provenance)
```

- Public route: giữ nguyên hành vi + hình dạng phản hồi hiện tại (qua `toLegacyShape`). Có thể **hiển thị** thông tin coverage/nguồn nhưng **không lưu** gì.
- Authenticated route: `SearchService` trả `{ records, manifest }` → route tự `writeSearchRun()`. Ownership kiểm bằng `ownedProject`/`ownedQuestion` (đã có ở M1).
- "Một backend tìm kiếm" = **chung `SearchService`**, không phải chung endpoint.

### 4.3 Query expansion cho Evidence phải DETERMINISTIC *(review PR #3 điểm 8)*

- **Evidence Search KHÔNG bật LLM enrich tự động** ở Milestone H. Mọi mở rộng truy vấn ảnh hưởng kết quả Evidence phải: (a) từ từ điển tĩnh `tcm-vocab.js` (deterministic), **hoặc** (b) được lưu **đầy đủ** vào `search_run.query_expanded` + `query_version` để tái lập.
- `dict-learn` được phép tiếp tục **log miss phía sau** cho nhánh ẩn danh / Discovery, **miễn là không thay đổi query/result của lượt hiện tại**.
- Bật LLM enrich cho Evidence (nếu muốn) là quyết định **của M4** kèm quota 30 USD/tháng — không thuộc Milestone H. **Đáp [§11.5](#11-câu-hỏi-cần-chốt): KHÔNG.**

### 4.4 Đợt test hồi quy bắt buộc — xem [§9.2](#92-hồi-quy-tìm-kiếm-trang-chủ-bắt-buộc).

---

## 5. Phần C — "Chế độ nghiên cứu" 2 panel

### 5.1 Trạng thái & bố cục

```
Trang chủ mặc định (như hiện nay)
        │  user đăng nhập → nút "Chế độ nghiên cứu" xuất hiện trên nav
        ▼
┌───────────────────────────┬───────────────────────────────┐
│  PANEL TRÁI (58% cố định) │  PANEL PHẢI (42% cố định)     │
│  • ô tìm + builder        │  • chọn / tạo Dự án           │
│  • tab: Bài báo | Thử     │  • Câu hỏi nghiên cứu + hồ sơ │
│    nghiệm lâm sàng        │  • Coverage của lượt hiện tại │
│  • bộ lọc, sắp xếp        │  • Bài đã lưu trong dự án     │
│  • bảng kết quả           │  • Nhật ký tìm kiếm + Xuất    │
│    - mỗi dòng: [+ Lưu]    │  • (M4) Khoảng trống ứng viên │
│  • highlight, phân trang  │                               │
└───────────────────────────┴───────────────────────────────┘
        │  thu gọn panel phải → về trang tìm bình thường
```

- **Tab trong panel trái:** "Bài báo" (literature, mặc định) và "Thử nghiệm lâm sàng" (ClinicalTrials.gov, chỉ nạp khi mở tab) — tách vai trò nguồn theo [§4.1a](#41a-tách-vai-trò-nguồn--không-trộn-1-result-stream).
- **Thao tác trực tiếp:** bấm `[+ Lưu]` ở 1 kết quả bên trái → bài hiện ngay ở "Bài đã lưu" bên phải (không reload). Bấm 1 bài bên phải → cuộn/nhấp nháy dòng tương ứng bên trái.
- Panel phải **thường trú** khi ở chế độ nghiên cứu; state giữ khi đổi truy vấn.
- Nút chuyển đổi: "Chế độ nghiên cứu" ↔ "Thoát". Lưu lựa chọn vào `localStorage`.
- Ẩn danh bấm "Chế độ nghiên cứu" → mở modal đăng nhập/đăng ký (Phần A).

### 5.2 Responsive *(review PR #3 điểm 10 — divider KHÔNG phải MVP)*
- **≥ 1100px:** 2 panel cạnh nhau, tỉ lệ **58/42 CỐ ĐỊNH** ở H3. Divider kéo được là **enhancement sau** khi UX ổn, không thuộc MVP.
- **768–1100px:** panel phải thành drawer trượt từ phải, nút "Bàn làm việc (N)".
- **< 768px (mobile):** 1 cột; chuyển giữa "Tìm kiếm" và "Bàn làm việc" bằng tab dưới cùng. Không chia đôi.

### 5.3 State (frontend)
Một store nhỏ (vanilla, không cần framework): `{ user, activeProject, activeQuestion, lastSearch, savedRecords[], searchRuns[] }`. Panel trái và phải cùng đọc/ghi store; thay đổi → re-render phần liên quan (không re-render cả trang — bài học từ `index.html` hiện tại vẽ lại bảng làm mất highlight).

---

## 6. Phần D — Tái cấu trúc `index.html`

`public/index.html` hiện **88KB, 1 file** (HTML + CSS + JS lẫn lộn). Thêm auth + 2 panel + store vào đây sẽ thành ~130KB không bảo trì nổi.

**Đề xuất (review PR #3 điểm 9 — đồng ý, KHÔNG framework/bundler):**
- `public/index.html` — chỉ markup + `<link>`/`<script type="module">`.
- `public/assets/app.css` — toàn bộ style.
- `public/assets/search.js` — logic tìm kiếm hiện có (panel trái).
- `public/assets/auth.js` — Firebase bootstrap + modal đăng nhập/đăng ký (dùng chung `index.html` + `admin` + retire dần `workbench.html`).
- `public/assets/workbench-panel.js` — panel phải.
- `public/assets/store.js` — state chung.

Hostinger phục vụ file tĩnh sẵn, ES modules chạy trực tiếp, **không cần build step**. Refactor cần thiết **trước H3**.

**Rủi ro:** đây là refactor lớn file đang chạy production. Làm ở nhánh riêng, so sánh pixel + test hồi quy đầy đủ (§9.2) trước khi merge.

---

## 7. Di trú & bỏ `/workbench.html` *(review PR #3 điểm 10 — không mốc cứng)*

1. Khi Phần C lên production và **đạt feature parity** → `/workbench.html` chuyển thành **redirect 302** về `chimedis.vn/?research=1`.
2. Giữ redirect cho tới khi **analytics + log 404** cho thấy không còn traffic cần thiết — **không đặt mốc "1 tháng" cứng**. Chỉ xoá file khi thực sự không ai vào.
3. `/api/workbench/*` **giữ nguyên** — chỉ UI hợp nhất, API không đổi.

---

## 8. Rủi ro & giảm thiểu

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| H-R1 | **Hồi quy tìm kiếm trang chủ** (mất builder/lọc/PDF/highlight/GOTCHA đã sửa) | **Cao** | Nhánh riêng; bộ test hồi quy §9.2 chạy đủ trước merge; giữ `searchAll()` chữ ký cũ + `toLegacyShape()` |
| H-R2 | Refactor `index.html` làm hỏng layout/hành vi tinh vi | Cao | Tách từng bước, mỗi bước deploy + kiểm; ảnh chụp so sánh; giữ bản cũ 1 commit để rollback nhanh |
| H-R3 | **Trộn paper / trial registry / metadata** → méo số bằng chứng, hiểu nhầm đăng ký thử nghiệm = bài báo | **Cao** | §4.1a — tách 3 vai trò nguồn; ClinicalTrials.gov ở tab riêng, không cộng số; Crossref chỉ enrichment |
| H-R4 | **`/api/research/search` nhận `projectId` → IDOR / ghi provenance nhầm** | **Cao** | §4.2 — 2 route mỏng riêng, public route không bao giờ ghi; ownership check ở authenticated route |
| H-R5 | **Merge user sai theo email** (Apple privaterelay, ORCID email) | Cao | §3.3 — `user_identities(provider, provider_subject)`; không auto-merge; link chỉ do user đã auth |
| H-R6 | Email chưa verify tạo dữ liệu rác | TB | §3.1a — write-gate `requireVerified` ở backend cho mọi ghi Workbench |
| H-R7 | Apple Sign-In cấu hình sai → bản cập nhật app iOS bị từ chối (Guideline 4.8) | TB | Làm + test simulator + TestFlight trước khi nộp; tài liệu Service ID/Key; xác định app có thuộc ngoại lệ 4.8 không |
| H-R8 | **Thiếu luồng xoá tài khoản trong app** → bị từ chối (Guideline 5.1.1(v)) | TB | §3.5 — `DELETE /api/auth/account` + revoke token + retention; test §9.3 |
| H-R9 | ORCID: khóa production vào credential cá nhân của dev | TB | §3.2 — xác minh loại credential (cá nhân vs organizational) trước H4 |
| H-R10 | ORCID-as-login qua custom token: lỗ hổng nếu không verify OAuth state/nonce | TB | `state` chống CSRF; chỉ tạo custom token sau khi ORCID OIDC trả token hợp lệ; không tin `orcid_id` từ client |
| H-R11 | 2 panel + store bug state (bài lưu 2 lần, panel lệch dự án) | TB | Store 1 nguồn sự thật; ghi qua API rồi đọc lại; test §9.3 |
| H-R12 | Endpoint search chạy nhiều nguồn cho **mọi** khách ẩn danh → tải + timeout | TB | §4.1a — ẩn danh mặc định chỉ literature nhanh; Crossref nền; CT.gov theo yêu cầu; đo p95 trên Hostinger |
| H-R13 | Spam đăng ký / project rác | TB | Firebase abuse protection + write-gate verify; rate-limit `POST /projects`/`/search`; giới hạn số project/user |
| H-R14 | **Hồi quy tìm kiếm trang chủ** (mất builder/lọc/PDF/highlight/GOTCHA) | **Cao** | Nhánh riêng; §9.2 chạy đủ trước merge; giữ chữ ký `searchAll()` + `toLegacyShape()` |
| H-R15 | Refactor `index.html` làm hỏng layout/hành vi tinh vi | Cao | Tách từng bước, mỗi bước deploy + kiểm; ảnh so sánh; giữ bản cũ để rollback |
| H-R16 | Phình phạm vi | Cao | Phân kỳ H1a–H5, mỗi pha deploy độc lập |

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
- [ ] Đăng nhập Google / Apple / ORCID — mỗi cái tạo đúng 1 hàng `users` + 1 `user_identities` `(provider, provider_subject)`, `role='reader'`.
- [ ] **Write-gate:** email chưa verify → `POST /api/workbench/projects` trả 403 rõ ràng; sau verify → tạo được.
- [ ] Cùng email, đăng nhập Google rồi thử Apple → thông báo account-linking đúng, **không tạo `users` thứ 2**, không auto-merge.
- [ ] Apple `privaterelay` email → vẫn phân biệt user đúng theo `provider_subject`.
- [ ] Liên kết provider ở trang Hồ sơ → ghi `user_identities`; gỡ liên kết → xoá hàng, không xoá `users`.
- [ ] ORCID login: `provider='oidc.orcid'`, `provider_subject` = ORCID iD, không tin dữ liệu client; `state` chống CSRF hoạt động.
- [ ] **Xoá tài khoản trong app** (`DELETE /api/auth/account`): `wb_projects` + con bị xoá, `wb_research_records` giữ; `user_identities` + `users` xoá; `firebase-admin.deleteUser` gọi; provider token revoke; log không PII.
- [ ] Bật "Chế độ nghiên cứu" → 2 panel 58/42 cố định; thu gọn về bình thường; `localStorage` nhớ.
- [ ] Bấm `[+ Lưu]` ở kết quả trái → xuất hiện ngay panel phải; không trùng khi bấm 2 lần.
- [ ] Đổi dự án ở panel phải → "bài đã lưu" + "nhật ký" đổi theo; panel trái giữ kết quả tìm.
- [ ] Responsive: 1440 / 1024 / 375 px — layout đúng theo §5.2; mobile không vỡ.
- [ ] Ẩn danh bấm "Chế độ nghiên cứu" → modal đăng nhập, không lỗi.
- [ ] Đăng xuất giữa chế độ nghiên cứu → về trang chủ bình thường, panel phải biến mất sạch.
- [ ] iOS app (WebView) mở `chimedis.vn`: đăng nhập Apple/Google hoạt động trong app; "Sign in with Apple" hiện đúng chỗ.

### 9.4 Bảo mật / hiệu năng

- [ ] **Tách route:** `POST /api/research/search` KHÔNG bao giờ tạo/ghi `wb_*` dù gửi kèm `projectId` (không có param đó); chỉ `/api/workbench/projects/:id/search` ghi, và **chỉ khi** project thuộc về user (thử `:id` của người khác → 404).
- [ ] **Tách vai trò nguồn:** kết quả tab "Bài báo" KHÔNG chứa dòng ClinicalTrials.gov; "số kết quả" không cộng trial; Crossref không tạo dòng trùng cho bài đã có DOI từ literature source.
- [ ] Rate-limit `POST /api/workbench/projects` + `/questions` + `/search` + auth endpoints (chống spam).
- [ ] `POST /search` ẩn danh: đo p95 trên prod với **cấu hình literature-nhanh mặc định**; tải đồng thời 10 request.
- [ ] Kiểm không rò `NCBI_API_KEY` / ORCID secret / Apple key ra client hay log.
- [ ] CORS: `/api/workbench` chỉ cho origin `chimedis.vn` (hiện `cors()` mở — thu hẹp).
- [ ] `requireVerified` không bỏ sót route ghi nào của `/api/workbench`.

---

## 10. Phân kỳ — thứ tự review chốt (H1a → H2 → H3 → H4 → H5)

Mỗi pha **deploy độc lập, dừng giữa chừng vẫn có giá trị.**

### H1a — Auth foundation
Tách `auth.js` · modal đăng nhập/đăng ký trên `index.html` · email đăng ký + verify + reset + đổi mật khẩu · Google + Email đầy đủ · bảng `user_identities` + sửa `/api/auth/sync` theo `(provider, provider_subject)` · **write-gate `requireVerified`** · **xoá tài khoản trong app** (`DELETE /api/auth/account`) · rate-limit auth + `POST /projects` · trang Hồ sơ tài khoản. **Chưa** Apple/ORCID/Microsoft.

### H2 — Search service unification
`lib/search-service.js` chung · **giữ 2 route riêng** (public read-only + authenticated ghi provenance) · dedup identity-graph · **tách vai trò nguồn** (§4.1a): PubMed vào literature · Crossref enrichment/dedup (không sinh dòng) · ClinicalTrials.gov = kênh registry riêng · query expansion Evidence **deterministic** · **chạy §9.2 hồi quy đầy đủ**. UI trang chủ chưa đổi hình.

### H3 — Homepage Research Mode
Module hóa `index.html` (§6) · shared store · panel phải · thao tác trực tiếp · tab "Bài báo" / "Thử nghiệm lâm sàng" bên trái · layout **58/42 cố định** desktop, drawer tablet, tab mobile · `/workbench.html` → redirect 302 (không xoá vội).

### H4 — Apple + ORCID
Apple Sign-In (web + app) theo App Store compliance (xác định app có thuộc ngoại lệ 4.8 không) · ORCID **sau khi** xác minh credential/identity-linking model · account linking UI (do user chủ động, không auto).

### H5 — Microsoft / Phone chỉ khi có nhu cầu thực · minify tùy chọn · dọn `/workbench.html` khi hết traffic.

---

## 11. Câu hỏi cần chốt

| # | Câu hỏi | Trạng thái |
|---|---|---|
| 1 | Thứ tự H1a vs H2 | ✅ Review chốt: **H1a trước** |
| 2 | Ẩn danh chạy full 7 connector? | ✅ Review chốt: **KHÔNG** — literature nhanh mặc định; Crossref nền; CT.gov theo yêu cầu (§4.1a) |
| 3 | Bắt buộc verify email cho hành vi nào? | ✅ Review chốt: **mọi ghi Workbench** (tạo project/câu hỏi/lưu bài/export lớn/link ORCID); provider Google/Apple/ORCID = verified sẵn (§3.1a) |
| 4 | Apple Sign-In có gấp không? | ⏳ **CẦN USER TRẢ LỜI:** bản cập nhật app iOS kế tiếp có thêm/đổi social login tạo tài khoản chính không? Nếu có → H4 phải xong trước lần submit đó. App hiện có thuộc ngoại lệ Guideline 4.8 không? |
| 5 | LLM enrich cho Evidence trong H? | ✅ Review chốt: **KHÔNG** ở Milestone H — để M4 (§4.3) |
| 6 | Tách `index.html` thành module? | ✅ Review chốt: **ĐỒNG Ý**, không framework/bundler |
| 7 | Divider kéo được ở H3? | ✅ Review chốt: **KHÔNG** — 58/42 cố định trước, resizable là enhancement sau |
| 8 | Bỏ `/workbench.html`? | ✅ Review chốt: redirect 302, **không mốc cứng**, xoá khi analytics/404 log cho thấy hết traffic |
| 9 | **CẦN USER:** ORCID credential — Chimedis đăng ký loại nào (public API cá nhân / organizational membership)? Ai đứng tên? | ⏳ Cần trước H4 |
| 10 | **CẦN USER:** retention policy khi xoá tài khoản — xoá cứng ngay hay giữ ẩn N ngày rồi xoá? | ⏳ Cần trước H1a |

---

*Hết v2. Góp ý ghi vào PR `tmh2388/chimedis-home#3`.*
