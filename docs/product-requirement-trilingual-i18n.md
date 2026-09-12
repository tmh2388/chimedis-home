# YÊU CẦU NỀN TẢNG — Đa ngôn ngữ Việt / Trung / Anh (KHÔNG ĐƯỢC BỎ QUA)

> **Chốt 2026-09-12, áp dụng vĩnh viễn cho toàn bộ chimedis.vn (và mọi trang con: `/workbench.html`,
> `/tai-khoan.html`, các trang tương lai).** Đây KHÔNG phải backlog — là **điều kiện bắt buộc**
> của mọi tính năng UI mới, ngang hàng với các gate an toàn khác của dự án.

## 1. Vì sao

Chimedis phục vụ nghiên cứu Trung Y cho **ba nhóm người dùng chính**, không nhóm nào là phụ:

1. **Người Việt** — nghiên cứu sinh, giảng viên, học viên YHCT tại Việt Nam.
2. **Sinh viên/nghiên cứu sinh Trung Quốc** — cần giao diện tiếng Trung để thao tác hàng ngày (không chỉ để tra cứu tài liệu tiếng Trung — bản thân *công cụ* phải dùng được bằng tiếng Trung).
3. **Sinh viên/nghiên cứu sinh quốc tế khác** — dùng tiếng Anh làm cầu nối để tiếp cận Trung Y, kể cả khi nghiên cứu tài liệu Trung văn.

⇒ Bất kỳ màn hình nào chỉ có tiếng Việt là **loại bỏ 2 trong 3 nhóm người dùng mục tiêu** khỏi tính năng đó. Đây không phải "nice to have" — là điều kiện để sản phẩm tồn tại đúng mục tiêu.

## 2. Quy tắc bắt buộc

- **Mọi trang/tính năng UI mới** (kể cả nội bộ như trang quản trị, nếu người dùng cuối chạm vào) phải hỗ trợ đủ **VI + ZH + EN** trước khi coi là "xong".
- **Không có ngoại lệ "làm tiếng Việt trước, dịch sau"** — dịch sau bị bỏ quên trong thực tế (bằng chứng: `workbench.html` vừa xây xong 100% tiếng Việt, `tai-khoan.html` cũng vậy — xem §4).
- Áp dụng cho: nhãn UI tĩnh, placeholder, thông báo lỗi/thành công, nội dung do JS sinh động (bảng, thẻ, popover), tên nút, tiêu đề trang (`<title>`), meta description.
- **Không áp dụng** cho: dữ liệu người dùng tự nhập (ghi chú cá nhân, tiêu đề bài báo họ lưu — giữ nguyên ngôn ngữ gốc), log/debug nội bộ không hiển thị cho người dùng.

## 3. Cơ chế kỹ thuật CHUẨN (đã có, phải TÁI SỬ DỤNG — không phát minh cách mới)

`public/index.html` đã có cơ chế đầy đủ, dùng làm khuôn mẫu bắt buộc cho mọi trang khác:

```html
<span data-i18n="search_btn">Tìm kiếm</span>
<input data-i18n-ph="search_ph" placeholder="Tìm theo tiêu đề, tác giả...">
<h1 data-i18n-html="hero_title">Tra cứu và khám phá tri thức<br>Trung Y</h1>
```

```js
const I18N = {
  vi: { search_btn: 'Tìm kiếm', ... },
  zh: { search_btn: '搜索', ... },
  en: { search_btn: 'Search', ... },
};
function applyI18n(){ /* duyệt data-i18n / data-i18n-ph / data-i18n-html, thay nội dung theo state.lang */ }
function setLang(l){ state.lang = l; localStorage.setItem('chimedis_portal_lang', l); applyI18n(); }
```

- Chọn ngôn ngữ lưu `localStorage` (`chimedis_portal_lang`), có menu chọn ở header (nút `VI/中/EN`).
- Nội dung do JS sinh động (bảng kết quả, thẻ) phải tự gọi hàm dịch tương đương khi build chuỗi (không chỉ áp `data-i18n` cho HTML tĩnh).

**Khi xây trang/tính năng mới:** copy đúng cơ chế này (đối tượng `I18N`, `applyI18n()`, `setLang()`, menu chọn ngôn ngữ ở header) — không tự chế cơ chế khác, để về sau có 1 chuẩn duy nhất dễ bảo trì.

## 4. Hiện trạng (cập nhật 2026-09-12)

| Trang | Trạng thái |
|---|---|
| `public/index.html` (trang tìm chính) | ✅ Đủ VI/ZH/EN (161 khoá dịch — 122 khoá gốc + ~50 khoá bổ sung 2026-09-12 khi phát hiện panel "Nghiên cứu của tôi" và khung kết quả tìm kiếm bị bỏ sót) |
| `public/workbench.html` (Bàn làm việc nghiên cứu) | ✅ Đủ VI/ZH/EN (176 khoá, xong 2026-09-12, commit `d246e11`) |
| `public/tai-khoan.html` (đăng nhập/tài khoản) | ✅ Đủ VI/ZH/EN (xong 2026-09-12, commit `310a9c2`) |

**Bài học rút ra (2026-09-12):** trang `index.html` tưởng đã "đủ i18n" (122 khoá, kiểm ngày
2026-09-12 buổi sáng) nhưng panel "Nghiên cứu của tôi" (SciSpace-style, thêm SAU khi phần i18n
gốc đã hoàn thành ở giai đoạn M3) không được bổ sung `data-i18n` — người dùng phát hiện qua nút
"Nghiên cứu" ở header vẫn tiếng Việt khi đổi ngôn ngữ. ⇒ Khi thêm tính năng UI mới vào một trang
ĐÃ có i18n, phải tự kiểm tra riêng phần mới thêm — không giả định "trang đã i18n thì mặc định
tính năng mới cũng vậy".

## 5. Việc cần làm

Không còn gap đã biết ở 3 trang chính (`index.html`, `workbench.html`, `tai-khoan.html`).
Mọi trang/tính năng UI mới sau này (M4 gap analysis, M5/M6 viết bài…) — làm i18n **cùng lúc**
lúc build, và khi thêm tính năng mới vào trang cũ, kiểm tra riêng phần mới thêm (xem bài học
ở trên) — không tách pha riêng, không giả định.

## 6. Gate cho mọi PR/commit UI từ nay

Trước khi báo "xong" một tính năng UI:
- [ ] Có `data-i18n`/tương đương cho mọi chuỗi tĩnh?
- [ ] Chuỗi do JS sinh động có gọi hàm dịch, không hard-code tiếng Việt?
- [ ] Test bằng cách chuyển `state.lang` sang `zh` và `en`, xác nhận không còn chữ Việt sót lại?
- [ ] `<title>` + meta description có bản dịch?

Nếu bỏ qua bước này, tính năng đó **coi như CHƯA hoàn thành**, bất kể chức năng có chạy đúng hay không.
