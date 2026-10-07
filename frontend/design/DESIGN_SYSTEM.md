# Design System: Soft Neo-Brutalist Box Style (Trắng – Vàng ấm)
**Dự án:** AI Shopping Agent — Trợ lý Tư vấn Mua sắm Thông minh  
**Vị trí tài liệu:** `frontend/design/`  
**Phiên bản:** v1.1.0 (Áp dụng phong cách Hộp Soft Neo-Brutalism theo mẫu LearnHub)  

---

## 1. Phân Tích Phong Cách Giao Diện (Reference Analysis)

Dựa trên hình ảnh tham khảo, giao diện được phát triển theo trường phái **Soft Neo-Brutalism (Playful Brutalism)** kết hợp bảng màu **Warm Minimalist**:

1. **Khung viền nổi bật (Bold Visible Borders):** Viền nét dày `2px solid #292524` (Warm Charcoal) bao quanh các thẻ Card, Navbar, Nút bấm và Thẻ nhãn.
2. **Đổ bóng góc chéo cứng cáp (Hard Offset Drop Shadows):**
   - Không sử dụng bóng mờ Gaussian blur nhạt nhòa thông thường.
   - Thay vào đó sử dụng bóng đổ cứng cáp: `box-shadow: 4px 4px 0px #292524` (hoặc `5px 5px 0px #292524`).
3. **Bo góc mềm mại (Soft Rounded Geometry):**
   - Khác với Brutalism cổ điển (góc vuông 0px), Soft-Brutalism sử dụng bo góc thân thiện `rounded-2xl` (18px) đến `rounded-3xl` (24px) tạo cảm giác hiện đại, vui tươi và dễ tiếp cận.
4. **Hộp biểu tượng Pastel (Pastel Accent Icon Containers):**
   - Bên trái mỗi thẻ sản phẩm/khóa học là một hộp vuông bo cong `w-14 h-14 rounded-2xl border-2 border-warm-text shadow-[1.5px_1.5px_0px_#292524]` chứa các gam màu pastel ấm:
     - 🍑 Cam đào pastel: `#FFEDD5` (Laptop Lập trình)
     - 🌊 Xanh ngọc pastel: `#E0F2FE` (Laptop Đồ họa & Màn OLED)
     - 🍇 Tím nhạt pastel: `#F3E8FF` (Điện thoại Camera Leica)
     - 🌿 Xanh bạc hà pastel: `#DCFCE7` (Điện thoại Flagship Samsung)
5. **Huy hiệu Đánh giá (Star Rating Badge Pill):**
   - Góc phải trên của thẻ là một huy hiệu hình con nhộng bo tròn viền `2px solid #292524` mang icon ngôi sao `★ 9.8/10 (AI 98%)`.
6. **Cảm giác bấm nảy vật lý (Tactile Mechanical Interaction):**
   - **Hover:** Hộp nhấc nhẹ lên `transform: translate(-2px, -2px)` và bóng dãn ra `6px 6px 0px #292524`.
   - **Click/Active:** Hộp lún xuống như phím bấm cơ học `transform: translate(2px, 2px)` và bóng thu gọn lại `1px 1px 0px #292524`.

---

## 2. Bảng Màu Chuẩn (Color Tokens)

| Token Name | Hex Code | Ý nghĩa & Công dụng |
|---|---|---|
| `--color-bg-base` | `#FAF8F5` | **Nền tổng thể chính (Kem/Off-white ấm)**, chống chói mắt. |
| `--color-surface-card` | `#FFFFFF` | Nền Card sản phẩm, Omnibox tìm kiếm, Navbar. |
| `--color-border-dark` | `#292524` | **Viền hộp Warm Charcoal 2px** chủ đạo cho toàn bộ khung. |
| `--color-primary` | `#F59E0B` | Màu Amber ấm cho nút CTA chính ("Hỏi AI ngay", "Mua ngay"). |
| `--color-secondary-bg` | `#FEF3C7` | Nền Butter Yellow mềm cho Tag, Badge điểm AI Match. |
| `--color-secondary-text` | `#92400E` | Chữ cam đất đậm đạt tương phản **5.45:1 (WCAG AA)**. |
| `--color-text-main` | `#292524` | Warm Charcoal cho tiêu đề và chữ chính (**12.4:1 AAA**). Không dùng `#000000`. |
| `--color-text-muted` | `#78716C` | Warm Stone cho văn bản phụ và chú thích (**4.64:1 AA**). |

---

## 3. Hệ Thống Đổ Bóng Hộp (Hard Offset Shadow Tokens)

```css
/* Đổ bóng nhỏ cho Tag, Icon container */
--shadow-brutal-xs: 1.5px 1.5px 0px #292524;
--shadow-brutal-sm: 2px 2px 0px #292524;

/* Đổ bóng tiêu chuẩn cho Card sản phẩm & Navbar */
--shadow-brutal: 4px 4px 0px #292524;
--shadow-brutal-md: 5px 5px 0px #292524;

/* Đổ bóng khi hover */
--shadow-brutal-lg: 6px 6px 0px #292524;

/* Đổ bóng nổi bật cho Modal */
--shadow-brutal-xl: 8px 8px 0px #292524;
```

---

## 4. Cấu Trúc Thẻ Thể Hiện Đúng Mẫu (Card Structure)

```html
<article class="bg-white border-2 border-stone-800 rounded-2xl p-6 shadow-[4px_4px_0px_#292524] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#292524] transition-all">
  <!-- Dòng tiêu đề trên cùng -->
  <div class="flex items-start justify-between gap-4">
    <div class="flex items-start gap-4">
      <!-- Hộp biểu tượng Pastel -->
      <div class="w-14 h-14 rounded-2xl bg-[#FFEDD5] border-2 border-stone-800 flex items-center justify-center shadow-[1.5px_1.5px_0px_#292524]">
        <svg class="w-7 h-7" ...></svg>
      </div>
      <div>
        <h3 class="text-lg font-extrabold text-stone-800">Tên Sản Phẩm</h3>
        <p class="text-xs text-stone-500 font-medium">bởi Hãng • Thông số chính</p>
      </div>
    </div>
    <!-- Huy hiệu Rating sao -->
    <div class="px-3 py-1 rounded-full border-2 border-stone-800 bg-[#FEF3C7] text-[#92400E] font-extrabold text-xs shadow-[1.5px_1.5px_0px_#292524]">
      ★ 9.8/10 (AI 98%)
    </div>
  </div>

  <!-- Dòng thông số phụ kèm icon -->
  <div class="mt-4 pt-3 border-t flex gap-4 text-xs font-bold text-stone-800">
    <span>Màn hình</span>
    <span>Pin trâu</span>
    <span>Số đánh giá</span>
  </div>
</article>
```

---

## 5. File Xem Thực Tế
Mở file [index.html](file:///d:/AI_Shopping_Agent/frontend/design/index.html) trực tiếp bằng trình duyệt để xem toàn bộ 4 thẻ sản phẩm dạng hộp ngang, thanh điều hướng nổi và các hiệu ứng tương tác hoàn chỉnh.
