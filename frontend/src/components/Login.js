import React, { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    otp: "",
  });
  const [step, setStep] = useState(1); // 1: login, 2: MFA
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [tempUserId, setTempUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // show a small toast if the user just logged out
  React.useEffect(() => {
    try {
      const flag = localStorage.getItem("justLoggedOut");
      if (flag) {
        setMessage("Bạn đã đăng xuất");
        localStorage.removeItem("justLoggedOut");
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (e) {}
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", {
        email: formData.email,
        password: formData.password,
      });
      if (res.data.mfaRequired) {
        setStep(2);
        setTempUserId(res.data.userId);
        setMessage("Mã OTP đã gửi tới email.");
      } else {
        localStorage.setItem("token", res.data.accessToken);
        setMessage("Đăng nhập thành công");
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login/mfa", {
        userId: tempUserId,
        otp: formData.otp,
      });
      localStorage.setItem("token", res.data.accessToken);
      setMessage("Đăng nhập thành công");
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Xác thực OTP thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4 mx-auto" style={{ maxWidth: 480 }}>
      <h3 className="mb-3">Đăng nhập</h3>
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {step === 1 ? (
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              name="email"
              type="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Mật khẩu</label>
            <input
              name="password"
              type="password"
              className="form-control"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            Đăng nhập
          </button>
        </form>
      ) : (
        <form onSubmit={handleMFA}>
          <div className="mb-3">
            <label className="form-label">Mã OTP</label>
            <input
              name="otp"
              className="form-control"
              value={formData.otp}
              onChange={handleChange}
              required
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            Xác thực
          </button>
        </form>
      )}
      <div style={{ marginTop: 12 }}>
        <small className="text-muted">
          Chưa có tài khoản? Vui lòng <a href="/register">đăng ký</a>.
        </small>
      </div>
    </div>
  );
};

export default Login;
