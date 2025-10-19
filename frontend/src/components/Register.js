import React, { useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import { usePreferences } from "../context/PreferencesContext";
import localizeBackendMessage from "../utils/i18n";

const dictionary = {
  vi: {
    title: "Đăng ký tài khoản",
    username: "Tên đăng nhập",
    email: "Email",
    password: "Mật khẩu",
    usernamePlaceholder: "Nhập tên đăng nhập",
    emailPlaceholder: "Nhập email",
    passwordPlaceholder: "Nhập mật khẩu",
    submit: "Đăng ký",
    success: "Đăng ký thành công",
    failure: "Đăng ký thất bại",
    loading: "Đang xử lý...",
    haveAccount: "Đã có tài khoản?",
    loginLink: "Đăng nhập",
  },
  en: {
    title: "Create an account",
    username: "Username",
    email: "Email",
    password: "Password",
    usernamePlaceholder: "Choose a username",
    emailPlaceholder: "Enter your email",
    passwordPlaceholder: "Create a password",
    submit: "Sign up",
    success: "Registration successful",
    failure: "Registration failed",
    loading: "Processing...",
    haveAccount: "Already have an account?",
    loginLink: "Sign in",
  },
};

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { language } = usePreferences();
  const text = dictionary[language] || dictionary.vi;

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
      setMessage(
        localizeBackendMessage(language, res.data.message, text.success)
      );
      setFormData({ username: "", email: "", password: "" });
    } catch (err) {
      setError(
        localizeBackendMessage(
          language,
          err.response?.data?.error,
          text.failure
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card p-4 mx-auto">
        <h2>{text.title}</h2>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="loading">{text.loading}</div>}
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label>{text.username}:</label>
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder={text.usernamePlaceholder}
            />
          </div>
          <div className="form-group">
            <label>{text.email}:</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder={text.emailPlaceholder}
            />
          </div>
          <div className="form-group">
            <label>{text.password}:</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={text.passwordPlaceholder}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={loading}
          >
            <i className="bi bi-person-plus me-2" aria-hidden></i>
            {text.submit}
          </button>
        </form>
        <div style={{ marginTop: 12 }}>
          <small className="text-muted">
            {text.haveAccount} <Link to="/login">{text.loginLink}</Link>
          </small>
        </div>
      </div>
    </div>
  );
};

export default Register;
