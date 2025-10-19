const backendMessageMapVi = {
  "Account locked due to multiple failed login attempts":
    "Tài khoản đã bị khóa do nhập sai quá nhiều lần",
  "Current password incorrect": "Mật khẩu hiện tại không chính xác",
  "Deposit failed": "Nạp tiền thất bại",
  "Deposit successful": "Nạp tiền thành công",
  "Failed to change password": "Đổi mật khẩu thất bại",
  "Failed to fetch profile": "Không thể tải hồ sơ người dùng",
  "Failed to fetch transactions": "Không thể tải lịch sử giao dịch",
  "Failed to generate MFA setup": "Không thể tạo mã MFA",
  "Failed to issue transfer OTP": "Không thể gửi mã OTP chuyển tiền",
  "Failed to toggle MFA": "Không thể thay đổi trạng thái MFA",
  "Failed to update profile": "Cập nhật hồ sơ thất bại",
  "Failed to verify MFA": "Xác thực MFA thất bại",
  "Insufficient balance": "Số dư không đủ",
  "Invalid deposit amount": "Số tiền nạp không hợp lệ",
  "Invalid email or password": "Email hoặc mật khẩu không chính xác",
  "Invalid MFA token": "Mã MFA không hợp lệ",
  "Invalid OTP": "Mã OTP không hợp lệ",
  "Invalid request": "Yêu cầu không hợp lệ",
  "Invalid transfer data": "Dữ liệu chuyển khoản không hợp lệ",
  "Invalid transfer OTP": "Mã OTP chuyển khoản không hợp lệ",
  "Logout failed": "Đăng xuất thất bại",
  "Logged out": "Đăng xuất thành công",
  "Login failed": "Đăng nhập thất bại",
  "MFA enabled": "Đã bật bảo mật 2 lớp",
  "MFA not initialized": "MFA chưa được thiết lập",
  "MFA verification failed": "Xác thực MFA thất bại",
  "Missing fields": "Thiếu thông tin bắt buộc",
  "Missing required fields": "Thiếu thông tin bắt buộc",
  "OTP is required for transfer": "Vui lòng nhập mã OTP để chuyển khoản",
  "OTP sent to email": "Mã OTP đã gửi tới email",
  "Password changed": "Đổi mật khẩu thành công",
  "Profile updated": "Cập nhật hồ sơ thành công",
  "Recipient not found": "Không tìm thấy người nhận",
  "Registration failed": "Đăng ký thất bại",
  "Sender not found": "Không tìm thấy người gửi",
  "Token refresh failed": "Làm mới phiên thất bại",
  "Transfer failed": "Chuyển khoản thất bại",
  "Transfer OTP has expired. Request a new code.":
    "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.",
  "Transfer OTP not found. Please request a new OTP.":
    "Không tìm thấy OTP. Vui lòng yêu cầu mã mới.",
  "Transfer successful": "Chuyển khoản thành công",
  "User not found": "Không tìm thấy người dùng",
  "User registered successfully": "Đăng ký thành công",
  "OTP đã được gửi tới email bảo mật.": "OTP đã được gửi tới email bảo mật.",
};

export const localizeBackendMessage = (language, message, fallback) => {
  const normalized = typeof message === "string" ? message.trim() : "";
  if (!normalized) {
    return fallback || "";
  }

  if (language === "vi") {
    return backendMessageMapVi[normalized] || fallback || normalized;
  }

  return normalized || fallback || "";
};

export default localizeBackendMessage;
