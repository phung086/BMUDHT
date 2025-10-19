import React, { useState } from "react";
import api from "../services/api";

const AdminLogin = ({ onLoginSuccess }) => {
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [mfaRequired, setMfaRequired] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCredentialsSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", {
        email: form.email,
        password: form.password,
      });

      if (res.data.mfaRequired) {
        setMfaRequired(true);
        setUserId(res.data.userId);
      } else {
        onLoginSuccess(res.data.accessToken);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Đăng nhập không thành công");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login/mfa", {
        userId,
        otp: form.otp,
      });
      onLoginSuccess(res.data.accessToken);
    } catch (err) {
      setError(err.response?.data?.error || "Mã OTP không hợp lệ");
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setMfaRequired(false);
    setUserId(null);
    setForm({ email: "", password: "", otp: "" });
    setError("");
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-illustration gradient-card">
        <h1>Trung tâm quản trị</h1>
        <p>
          Giám sát giao dịch, quản lý người dùng và cấu hình bảo mật trên cùng
          một giao diện.
        </p>
        <ul className="admin-login-highlights">
          <li>
            <i className="bi bi-shield-lock me-2" aria-hidden></i>
            Bảo vệ bởi xác thực đa lớp (MFA)
          </li>
          <li>
            <i className="bi bi-graph-up-arrow me-2" aria-hidden></i>
            Báo cáo thời gian thực và cảnh báo rủi ro
          </li>
          <li>
            <i className="bi bi-gear-wide-connected me-2" aria-hidden></i>
            Tùy chỉnh chính sách truy cập linh hoạt
          </li>
        </ul>
      </div>
      <div className="admin-login-card card shadow-lg">
        <div className="card-body">
          <span className="badge bg-primary-subtle text-primary mb-3">
            Quản trị hệ thống
          </span>
          <h2 className="card-title mb-2">Đăng nhập Admin</h2>
          <p className="text-muted mb-4">
            Vui lòng sử dụng thông tin nội bộ. Tài khoản quản trị được ghi log
            mọi thao tác quan trọng.
          </p>

          {error && (
            <div className="alert alert-danger" role="alert">
              <i
                className="bi bi-exclamation-triangle-fill me-2"
                aria-hidden
              ></i>
              {error}
            </div>
          )}

          {!mfaRequired ? (
            <form
              className="admin-login-form"
              onSubmit={handleCredentialsSubmit}
            >
              <div className="form-floating mb-3">
                <input
                  id="adminEmail"
                  name="email"
                  type="email"
                  className="form-control"
                  placeholder="email@company.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="adminEmail">Email nội bộ</label>
              </div>
              <div className="form-floating mb-4">
                <input
                  id="adminPassword"
                  name="password"
                  type="password"
                  className="form-control"
                  placeholder="Mật khẩu"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="adminPassword">Mật khẩu</label>
              </div>
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden
                    ></span>
                    Đang kiểm tra thông tin
                  </>
                ) : (
                  <>
                    <i
                      className="bi bi-box-arrow-in-right me-2"
                      aria-hidden
                    ></i>
                    Đăng nhập
                  </>
                )}
              </button>
            </form>
          ) : (
            <form className="admin-login-form" onSubmit={handleMfaSubmit}>
              <div className="alert alert-info" role="status">
                <i className="bi bi-safe2-fill me-2" aria-hidden></i>
                Hệ thống yêu cầu mã OTP để xác nhận danh tính quản trị.
              </div>
              <div className="form-floating mb-4">
                <input
                  id="adminOtp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  placeholder="Nhập mã OTP"
                  value={form.otp}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="adminOtp">Mã OTP (6 chữ số)</label>
              </div>
              <div className="d-flex align-items-center gap-2 mb-3">
                <button
                  type="submit"
                  className="btn btn-primary flex-grow-1"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden
                      ></span>
                      Đang xác thực
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-lock me-2" aria-hidden></i>
                      Xác nhận OTP
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-light"
                  onClick={resetToLogin}
                >
                  Đổi tài khoản
                </button>
              </div>
            </form>
          )}

          <ul className="admin-login-hints mt-4">
            <li>
              <i className="bi bi-dot" aria-hidden></i>
              Tài khoản đã đăng nhập sẽ bị tự động đăng xuất sau 15 phút không
              hoạt động.
            </li>
            <li>
              <i className="bi bi-dot" aria-hidden></i>
              Mã OTP hợp lệ trong 60 giây. Liên hệ SOC nếu không nhận được mã.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
