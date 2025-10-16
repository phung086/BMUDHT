import React, { useState } from "react";
import api from "../services/api";

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/api/auth/register", formData);
      setMessage(res.data.message || "Đăng ký thành công");
      setFormData({ username: "", email: "", password: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="card p-4 mx-auto" style={{ maxWidth: 560 }}>
        <h2>Đăng ký tài khoản</h2>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="loading">Đang xử lý...</div>}
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>Tên đăng nhập:</label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Nhập tên đăng nhập"
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Nhập email"
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu:</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Nhập mật khẩu"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <i className="bi bi-person-plus me-2" aria-hidden></i>
            Đăng ký
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          <small className="text-muted">
            Đã có tài khoản? <a href="/login">Đăng nhập</a>
          </small>
        </div>
      </div>
    </div>
  );
};

export default Register;
