import React, { useState } from "react";
import api from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import { usePreferences } from "../context/PreferencesContext";
import { broadcastAuthChange, persistToken } from "../utils/authSignal";
import localizeBackendMessage from "../utils/i18n";
import { consumeSessionExpiredFlag } from "../utils/sessionManager";

const dictionary = {
  vi: {
    title: "Đăng nhập",
    email: "Email",
    password: "Mật khẩu",
    otp: "Mã OTP",
    login: "Đăng nhập",
    verify: "Xác thực",
    logoutToast: "Bạn đã đăng xuất",
    success: "Đăng nhập thành công",
    sessionExpired: "Phiên đăng nhập đã kết thúc do không hoạt động.",
    otpSent: "Mã OTP đã gửi tới email.",
    loginFailed: "Đăng nhập thất bại",
    otpFailed: "Xác thực OTP thất bại",
    otpPlaceholder: "123456",
    createPrompt: "Chưa có tài khoản? Vui lòng",
    createLink: "đăng ký",
    adminHint: "Quản trị viên? Đi tới",
    adminLink: "cổng quản trị",
  },
  en: {
    title: "Sign in",
    email: "Email",
    password: "Password",
    otp: "OTP code",
    login: "Sign in",
    verify: "Verify",
    logoutToast: "You have signed out",
    success: "Signed in successfully",
    sessionExpired: "Your session ended because of inactivity.",
    otpSent: "OTP has been sent to your email.",
    loginFailed: "Sign-in failed",
    otpFailed: "OTP verification failed",
    otpPlaceholder: "123456",
    createPrompt: "Need an account? Please",
    createLink: "register",
    adminHint: "Administrator? Visit the",
    adminLink: "admin portal",
  },
};

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
  const { language } = usePreferences();
  const text = dictionary[language] || dictionary.vi;

  // show a small toast if the user just logged out
  React.useEffect(() => {
    let mounted = true;

    const expired = consumeSessionExpiredFlag();
    if (expired) {
      setError(text.sessionExpired);
      setMessage(null);
    } else {
      try {
        const flag = localStorage.getItem("justLoggedOut");
        if (flag) {
          setError(null);
          setMessage(text.logoutToast);
          localStorage.removeItem("justLoggedOut");
          setTimeout(() => {
            if (mounted) setMessage(null);
          }, 3000);
        }
      } catch (e) {}
    }

    return () => {
      mounted = false;
    };
  }, [text.logoutToast, text.sessionExpired]);

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
        setMessage(
          localizeBackendMessage(language, res.data?.message, text.otpSent)
        );
      } else {
        persistToken(res.data.accessToken);
        broadcastAuthChange();
        setMessage(
          localizeBackendMessage(language, res.data?.message, text.success)
        );
        navigate("/dashboard");
      }
    } catch (err) {
      setError(
        localizeBackendMessage(
          language,
          err.response?.data?.error,
          text.loginFailed
        )
      );
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
      persistToken(res.data.accessToken);
      broadcastAuthChange();
      setMessage(
        localizeBackendMessage(language, res.data?.message, text.success)
      );
      navigate("/dashboard");
    } catch (err) {
      setError(
        localizeBackendMessage(
          language,
          err.response?.data?.error,
          text.otpFailed
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card p-4 mx-auto">
        <h3 className="mb-3">{text.title}</h3>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {step === 1 ? (
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">{text.email}</label>
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
              <label className="form-label">{text.password}</label>
              <input
                name="password"
                type="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <button className="btn btn-primary w-100" disabled={loading}>
              {text.login}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMFA}>
            <div className="mb-3">
              <label className="form-label">{text.otp}</label>
              <input
                name="otp"
                className="form-control"
                value={formData.otp}
                onChange={handleChange}
                required
                placeholder={text.otpPlaceholder}
              />
            </div>
            <button className="btn btn-primary w-100" disabled={loading}>
              {text.verify}
            </button>
          </form>
        )}
        <div style={{ marginTop: 12 }}>
          <small className="text-muted">
            {text.createPrompt} <Link to="/register">{text.createLink}</Link>.
          </small>
        </div>
        <div style={{ marginTop: 8 }}>
          <small className="text-muted">
            {text.adminHint} <Link to="/admin">{text.adminLink}</Link>.
          </small>
        </div>
      </div>
    </div>
  );
};

export default Login;
