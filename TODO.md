# TODO - Ứng dụng demo giao dịch tài chính bảo mật

## Tổng quan
Xây dựng ứng dụng demo giao dịch tài chính với backend Node.js (Express), frontend React, database PostgreSQL, tích hợp các cơ chế bảo mật: JWT + MFA, AES, CSRF, rate limiting, logging, chống tấn công OWASP Top 10, mô phỏng tấn công.

---

## Các bước thực hiện

### 1. Thiết lập dự án backend
- [x] Tạo thư mục backend, khởi tạo package.json
- [x] Cài đặt các dependencies: express, sequelize, pg, bcrypt, jsonwebtoken, helmet, cors, csurf, rate-limit, nodemailer (giả lập email OTP), crypto (AES)
- [x] Tạo cấu trúc thư mục: models, routes, middleware, utils
- [x] Thiết lập server Express với middleware bảo mật (helmet, cors, csurf, rate limiting)
- [x] Tạo models User, Transaction, Log với Sequelize
- [x] Tạo routes:
  - Auth: đăng ký, đăng nhập (JWT + refresh token), MFA email OTP
  - Transactions: chuyển khoản, xem lịch sử
  - Admin: xem logs, blacklist user
- [x] Tích hợp bcrypt hash mật khẩu, AES mã hóa dữ liệu nhạy cảm
- [x] Tạo middleware phân quyền RBAC (User/Admin)
- [x] Logging giao dịch và login vào file
- [x] Xử lý khóa tài khoản sau 5 lần đăng nhập sai

### 2. Thiết lập dự án frontend
- [x] Tạo thư mục frontend, khởi tạo React app
- [x] Cài đặt các dependencies: axios, react-router-dom, bootstrap
- [x] Tạo các component: Register, Login (MFA), Dashboard (số dư, chuyển khoản)
- [x] Tích hợp API calls với backend, xử lý CSRF token
- [x] Hiển thị thông tin tài khoản với masking (4 số cuối)
- [ ] Xử lý phân quyền giao diện User/Admin

### 3. Thiết lập database PostgreSQL
- [x] Tạo file schema.sql với các bảng users, transactions, logs
- [x] Tạo file init.sql để khởi tạo dữ liệu mẫu (admin, user demo)

### 4. Bảo mật bổ sung
- [ ] Thiết lập HTTPS cho local dev (self-signed cert)
- [ ] Cấu hình Content Security Policy (CSP) headers
- [ ] Xử lý sanitize input frontend/backend

### 5. Mô phỏng tấn công và kiểm thử
- [ ] Viết script Node.js mô phỏng brute-force attack
- [ ] Viết script demo SQL Injection (với bảo vệ)
- [ ] Hướng dẫn sử dụng OWASP ZAP, Postman để test API

### 6. Viết báo cáo
- [ ] Tài liệu kiến trúc hệ thống
- [ ] Mô tả chi tiết các cơ chế bảo mật đã triển khai
- [ ] Kết quả kiểm thử và mô phỏng tấn công
- [ ] Đánh giá hạn chế và hướng phát triển

---

## Bước tiếp theo
- Bắt đầu với bước 2: Xử lý phân quyền giao diện User/Admin trên frontend.
