# H4 — Bật đăng nhập Apple + Facebook

> Code đã xong (nhánh `main`). Phần dưới là **cấu hình bên ngoài** — bạn làm ở Apple Developer, Meta, Firebase Console. Không cần deploy lại code sau khi cấu hình.

Sau khi bật ở Firebase, 2 nút "Đăng nhập với Apple / Facebook" ở `chimedis.vn/workbench.html` sẽ chạy ngay; nút liên kết/gỡ ở `chimedis.vn/tai-khoan.html` cũng vậy. Trước khi bật, bấm nút → hiện thông báo "Phương thức này chưa được bật trên máy chủ" (không lỗi).

---

## A. Facebook

### A1. Tạo app trên Meta
1. https://developers.facebook.com/apps → **Create App** → loại **"Authenticate and request data from users with Facebook Login"** (hoặc "Consumer").
2. Trong app → **Add Product → Facebook Login → Set Up** (chọn **Web**).
3. **Settings → Basic**: ghi lại **App ID** và **App Secret**. Điền **App Domains** = `chimedis.vn`, **Privacy Policy URL** = `https://chimedis.vn/privacy.html`.
4. **Facebook Login → Settings → Valid OAuth Redirect URIs**: thêm
   `https://chimedis.firebaseapp.com/__/auth/handler`
5. Chuyển app sang chế độ **Live** (nút gạt trên cùng) — chế độ Development chỉ cho tài khoản dev đăng nhập.

> Ghi chú: trước đây Meta chặn tạo app cho tài khoản này (`project_chimedis_user_auth`). Nếu vẫn bị chặn → cần xác minh danh tính doanh nghiệp với Meta (Business Verification) hoặc dùng tài khoản Meta khác đủ điều kiện.

### A2. Bật ở Firebase
Firebase Console → project **chimedis** → **Authentication → Sign-in method → Facebook** → **Enable** → dán **App ID** + **App Secret** → **Save**.
(Ô "OAuth redirect URI" mà Firebase hiển thị chính là cái đã thêm ở bước A1.4.)

---

## B. Apple

### B1. Apple Developer (cần tài khoản Apple Developer Program — đã có, dùng cho app iOS)
1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles**.
2. **Identifiers → +** → **Services IDs** → tạo 1 Service ID, ví dụ `vn.chimedis.web`. Mô tả: "Chimedis Web".
3. Chọn Service ID vừa tạo → tick **Sign In with Apple → Configure**:
   - **Primary App ID**: chọn App ID của app iOS Chimedis (`tmh2388...` — cái dùng cho `chimedis-ios`).
   - **Domains and Subdomains**: `chimedis.firebaseapp.com`
   - **Return URLs**: `https://chimedis.firebaseapp.com/__/auth/handler`
   - Save.
4. **Keys → +** → tạo 1 Key, tick **Sign In with Apple → Configure** (chọn cùng Primary App ID) → **Register** → **tải file `.p8`** (chỉ tải được 1 lần). Ghi lại **Key ID**.
5. Ghi lại **Team ID** (góc trên phải trang Apple Developer, hoặc trong Membership).

### B2. Bật ở Firebase
Firebase Console → **Authentication → Sign-in method → Apple** → **Enable** →
- **Services ID**: `vn.chimedis.web` (bước B2)
- **Apple team ID**: Team ID (B1.5)
- **Key ID**: Key ID (B1.4)
- **Private key**: dán nội dung file `.p8`
→ **Save**.

---

## C. Firebase — chung

Authentication → **Settings → Authorized domains**: đảm bảo có `chimedis.vn` (đã có) và `www.chimedis.vn` nếu dùng.

---

## D. App iOS (quan trọng cho App Store — Guideline 4.8)

App `chimedis-ios` là Capacitor wrapper mở `chimedis.vn` trong WKWebView.

- **Google/Facebook trong WebView:** `signInWithPopup` có thể bị WKWebView chặn popup. Nếu bản cập nhật iOS kế tiếp có đăng nhập social để **tạo tài khoản chính**, App Store **Guideline 4.8** yêu cầu phải có **"Sign in with Apple" tương đương ngay trong app** (native), không chỉ web.
- Việc này ở **repo `chimedis-ios`**, KHÔNG phải repo này: thêm plugin `@capacitor-community/apple-sign-in` (hoặc `signInWithRedirect` + cấu hình custom URL scheme), gọi Firebase `signInWithCredential`.
- **Trước khi submit bản iOS có social login mới:** làm phần native Apple ở `chimedis-ios` trước.

Nếu bản iOS kế tiếp KHÔNG đổi gì về đăng nhập → chưa cần gấp phần native; web đủ cho `chimedis.vn` trên trình duyệt.

---

## E. Kiểm thử (sau khi bật A + B)

1. `chimedis.vn/workbench.html` → **Đăng nhập với Apple** → popup Apple → cho phép → vào thẳng workbench, tạo được dự án ngay (provider ngoài = verified, không cần xác thực email).
2. Tương tự **Đăng nhập với Facebook**.
3. `chimedis.vn/tai-khoan.html` → mục "Phương thức đăng nhập": thấy phương thức đang dùng + link **"liên kết"** cho các phương thức chưa gắn. Bấm liên kết Google (khi đang đăng nhập bằng Apple) → popup → xong → cả 2 hiện trong danh sách.
4. Thử **gỡ** một phương thức (không phải phương thức đang đăng nhập, và còn ≥2) → phải xoá được.
5. Đăng nhập bằng Google với email đã có tài khoản Apple → Firebase báo `account-exists-with-different-credential` → UI hướng dẫn "đăng nhập bằng phương thức cũ rồi liên kết". **Không** tự gộp.
