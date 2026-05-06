# 🍕 Foodei - Nền tảng Giao đồ ăn Toàn diện

Đây là một dự án Full-stack về hệ thống giao đồ ăn hiện đại có tên là **Foodei**, bao gồm ứng dụng di động cho khách hàng, trang quản trị cho nhà hàng và hệ thống backend mạnh mẽ.

## 🏗️ Cấu trúc Dự án

Dự án được chia thành 3 phần chính:

1.  **Backend (`/backend`)**: Hệ thống quản trị nội dung (CMS) và API.
2.  **Mobile App (`/my-app`)**: Ứng dụng di động dành cho khách hàng (iOS/Android).
3.  **Restaurant Dashboard (`/restaurant`)**: Trang web quản trị dành cho chủ cửa hàng.

---

## 🚀 Công nghệ Sử dụng

### 🖥️ Backend
- **Strapi 5**: Headless CMS dựa trên Node.js để quản lý dữ liệu linh hoạt.
- **GraphQL**: Query ngôn ngữ để tối ưu hóa việc lấy dữ liệu.
- **Socket.io**: Hỗ trợ giao tiếp thời gian thực (real-time) cho việc cập nhật trạng thái đơn hàng.
- **Cloudinary**: Lưu trữ và tối ưu hóa hình ảnh món ăn.
- **Better-SQLite3/PostgreSQL**: Cơ sở dữ liệu.

### 📱 Mobile App (Customer)
- **React Native (Expo)**: Phát triển ứng dụng đa nền tảng.
- **Expo Router**: Quản lý điều hướng dựa trên file-system.
- **Apollo Client**: Kết nối và quản lý state từ GraphQL API.
- **Clerk**: Hệ thống xác thực người dùng (Authentication) bảo mật.
- **Socket.io Client**: Nhận thông báo trạng thái đơn hàng theo thời gian thực.
- **MapLibre GL**: Hiển thị bản đồ và theo dõi vị trí giao hàng.

### 📊 Restaurant Dashboard (Web)
- **React (Vite)**: Framework frontend nhanh và hiện đại.
- **TypeScript**: Đảm bảo an toàn kiểu dữ liệu.
- **Tailwind CSS**: Styling giao diện nhanh chóng và đẹp mắt.
- **Leaflet / MapLibre**: Quản lý vị trí cửa hàng và đơn hàng trên bản đồ.

---

## 🛠️ Cài đặt và Chạy dự án

### 1. Chuẩn bị
Đảm bảo bạn đã cài đặt:
- Node.js (v18 trở lên)
- npm hoặc yarn

### 2. Cấu hình Biến môi trường (`.env`)
Mỗi thư mục (`backend`, `my-app`, `restaurant`) đều có file `.env.example`. Hãy tạo file `.env` tương ứng và điền các thông số cần thiết (API Keys, Database URL, v.v.).

### 3. Chạy Backend
```bash
cd backend
npm install
npm run develop
```
Backend sẽ chạy tại: `http://localhost:1337`

### 4. Chạy Mobile App
```bash
cd my-app
npm install
npx expo start
```
Sử dụng ứng dụng **Expo Go** trên điện thoại để quét mã QR hoặc chạy trên giả lập.

### 5. Chạy Restaurant Dashboard
```bash
cd restaurant
npm install
npm run dev
```
Trang web sẽ chạy tại: `http://localhost:5173`

---

## ✨ Tính năng Chính

- **Khách hàng**: 
  - Xem menu, tìm kiếm món ăn/nhà hàng.
  - Đặt hàng và thanh toán.
  - Theo dõi trạng thái đơn hàng thời gian thực.
  - Đăng nhập/Đăng ký qua Clerk.
- **Nhà hàng**:
  - Quản lý danh mục món ăn và thực đơn.
  - Nhận và xử lý đơn hàng mới ngay lập tức.
  - Xem thống kê doanh thu và báo cáo.
- **Hệ thống**:
  - Thông báo đẩy (Push Notifications).
  - Tối ưu hóa hình ảnh tự động.
  - Phân quyền người dùng chi tiết.

