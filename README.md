# 🍹 SmartQR Order - Giải Pháp Đặt Món Thông Minh Realtime Cho Quán F&B

Hệ thống web ứng dụng giới thiệu giải pháp quét mã QR đặt món trực tiếp tại bàn, cập nhật thời gian thực (Realtime), gọi nhân viên và yêu cầu thanh toán dành cho quán cafe, nhà hàng.

---

## 🌟 Tính Năng Nổi Bật

- **Màn hình Quản trị / Thu ngân (PC/Tablet)**:
  - 5 Mã QR Bàn (Bàn 01 - Bàn 05) tự động nhận diện bàn khi quét.
  - Tích hợp khung giả lập iPhone trực tiếp trên máy tính để thuận tiện thuyết trình/demo.
  - Âm thanh chuông báo "Ting Ting" cao cấp (Web Audio API) khi có đơn mới hoặc yêu cầu hỗ trợ.
  - Cập nhật thời gian thực (Realtime dưới 0.1s) danh sách món, trạng thái đơn và yêu cầu phục vụ.
  - Phân loại rõ ràng: Đơn đặt món, 🛎️ Gọi nhân viên, 💵 Yêu cầu thanh toán.
  - Chuyển trạng thái đơn: *Chờ nhận -> Đang pha chế -> Đã giao món -> Hoàn tất*.
- **Giao diện Khách hàng (Mobile)**:
  - Tự động nhận diện bàn qua mã QR (`?table=1`).
  - Nhập tên khách hàng thân thiện.
  - Menu 10 món nước chuẩn vị với hình ảnh HD, mô tả, giá và tag món hot.
  - Tăng/giảm số lượng món, ghi chú cho bếp, xem giỏ hàng trượt mượt mà.
  - Hiệu ứng pháo hoa ăn mừng khi đặt món thành công.
  - Màn hình theo dõi tiến độ đơn hàng thời gian thực.
  - 2 Nút cố định: 🛎️ Gọi nhân viên (chọn nhanh lý do) & 💵 Gọi tính tiền (tiền mặt / chuyển khoản QR).
- **Cơ chế Realtime kép**:
  - Tự động hoạt động ngay qua WebSocket MQTT & BroadcastChannel mà không bắt buộc cấu hình server.
  - Sẵn sàng kết nối Supabase PostgreSQL Database để lưu trữ vĩnh viễn.

---

## 🛠️ Cài Đặt & Chạy Thử Tại Máy Cục Bộ (Localhost)

```bash
# 1. Chuyển vào thư mục dự án
cd tienich

# 2. Cài đặt các thư viện (nếu chưa cài)
npm install

# 3. Chạy môi trường phát triển
npm run dev
```

Mở trình duyệt tại: `http://localhost:5173`

---

## 🗄️ Cấu Hình Supabase Database (Tùy chọn)

1. Mở **Supabase Dashboard** -> Tạo New Project.
2. Vào mục **SQL Editor** -> Mở file `supabase_schema.sql` trong dự án, copy toàn bộ nội dung và dán vào rồi bấm **RUN**.
3. Vào mục **Project Settings -> API** để lấy `Project URL` và `anon key`.
4. Điền vào file `.env` (file này đã được bảo mật qua `.gitignore`, không lo bị lộ):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## 🚀 Hướng Dẫn Deploy Online Lên Vercel / Netlify

### Cách 1: Deploy lên Vercel (Khuyên dùng - 1 phút)
1. Đẩy mã nguồn lên GitHub.
2. Vào [Vercel](https://vercel.com) -> Bấm **Add New Project** -> Chọn repository này.
3. Ở phần **Environment Variables**, thêm (nếu dùng Supabase):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Bấm **Deploy**. Vercel sẽ cấp cho bạn một đường link HTTPS (ví dụ: `https://smartqr-order.vercel.app`).

### Cách 2: Deploy qua Vercel CLI
```bash
cd tienich
npm run build
npx vercel --prod
```

Dự án đã có sẵn file `vercel.json` và `public/_redirects` để đảm bảo chuyển trang SPA hoạt động 100% trơn tru.
