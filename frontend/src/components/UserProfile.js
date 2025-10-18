import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Spinner from "./Spinner";
import { usePreferences } from "../context/PreferencesContext";

const dictionary = {
  vi: {
    loading: "Đang tải hồ sơ...",
    loadErrorMissing: "Không tìm thấy hồ sơ người dùng",
    sessionExpired: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    loadErrorGeneric: "Không thể lấy thông tin người dùng",
    actionBackToLogin: "Quay lại đăng nhập",
    noUser: "Không tìm thấy dữ liệu người dùng.",
    hero: {
      fallbackName: "Người dùng",
      rolePrefix: "Vai trò:",
      balancePrefix: "Số dư:",
      balanceSuffix: "VND",
    },
    roles: {
      admin: "Quản trị viên hệ thống",
      user: "Khách hàng cá nhân",
      staff: "Chuyên viên hỗ trợ",
    },
    sections: {
      personal: "Thông tin cá nhân",
      password: "Đổi mật khẩu",
      mfa: "Bảo mật 2 lớp (MFA)",
    },
    labels: {
      username: "Tên người dùng",
      usernamePlaceholder: "Nhập tên hiển thị",
      email: "Email",
      emailPlaceholder: "name@example.com",
      save: "Lưu thay đổi",
      currentPassword: "Mật khẩu hiện tại",
      currentPasswordPlaceholder: "Nhập mật khẩu hiện tại",
      newPassword: "Mật khẩu mới",
      newPasswordPlaceholder: "Ít nhất 8 ký tự",
      changePassword: "Đổi mật khẩu",
      mfaStatus: "Trạng thái:",
      mfaOn: "Đang bật",
      mfaOff: "Đang tắt",
      toggleMfaOn: "Tắt MFA",
      toggleMfaOff: "Bật nhanh (Email OTP)",
      setupApp: "Thiết lập bằng ứng dụng",
      mfaInstructions:
        "Quét QR bằng Google Authenticator hoặc nhập secret bên dưới.",
      secretLabel: "Secret:",
      otpLabel: "Nhập mã 6 số",
      otpPlaceholder: "123456",
      verifyMfa: "Xác nhận kích hoạt",
    },
    flash: {
      usernameRequired: "Tên người dùng không được bỏ trống.",
      emailInvalid: "Email không hợp lệ.",
      saveSuccess: "Đã lưu thay đổi.",
      saveFail: "Cập nhật thất bại.",
      passwordFields: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.",
      passwordTooShort: "Mật khẩu mới phải có ít nhất 8 ký tự.",
      passwordSuccess: "Đã đổi mật khẩu.",
      passwordFail: "Thay đổi mật khẩu thất bại.",
      mfaToggleOn: "Đã bật MFA qua email OTP.",
      mfaToggleOff: "Đã tắt MFA.",
      mfaToggleFail: "Không thể thay đổi MFA.",
      mfaSetupInit: "Đã tạo QR / secret. Vui lòng quét và xác thực.",
      mfaSetupFail: "Không thể khởi tạo MFA.",
      mfaTokenRequired: "Nhập mã 6 số từ ứng dụng trước khi xác nhận.",
      mfaVerifySuccess: "Đã bật MFA.",
      mfaVerifyFail: "Mã xác nhận không đúng.",
    },
  },
  en: {
    loading: "Loading profile...",
    loadErrorMissing: "User profile not found",
    sessionExpired: "Your session has expired. Please sign in again.",
    loadErrorGeneric: "Unable to retrieve user information",
    actionBackToLogin: "Back to login",
    noUser: "User data is unavailable.",
    hero: {
      fallbackName: "User",
      rolePrefix: "Role:",
      balancePrefix: "Balance:",
      balanceSuffix: "VND",
    },
    roles: {
      admin: "Platform administrator",
      user: "Retail customer",
      staff: "Support specialist",
    },
    sections: {
      personal: "Personal information",
      password: "Change password",
      mfa: "Multi-factor authentication (MFA)",
    },
    labels: {
      username: "Username",
      usernamePlaceholder: "Display name",
      email: "Email",
      emailPlaceholder: "name@example.com",
      save: "Save changes",
      currentPassword: "Current password",
      currentPasswordPlaceholder: "Enter current password",
      newPassword: "New password",
      newPasswordPlaceholder: "At least 8 characters",
      changePassword: "Update password",
      mfaStatus: "Status:",
      mfaOn: "Enabled",
      mfaOff: "Disabled",
      toggleMfaOn: "Disable MFA",
      toggleMfaOff: "Enable via email OTP",
      setupApp: "Set up with authenticator app",
      mfaInstructions:
        "Scan the QR with Google Authenticator or enter the secret below.",
      secretLabel: "Secret:",
      otpLabel: "Enter 6-digit code",
      otpPlaceholder: "123456",
      verifyMfa: "Confirm activation",
    },
    flash: {
      usernameRequired: "Username cannot be empty.",
      emailInvalid: "Email is invalid.",
      saveSuccess: "Changes saved successfully.",
      saveFail: "Update failed.",
      passwordFields: "Please fill in both current and new passwords.",
      passwordTooShort: "New password must contain at least 8 characters.",
      passwordSuccess: "Password updated successfully.",
      passwordFail: "Password change failed.",
      mfaToggleOn: "Email OTP MFA enabled.",
      mfaToggleOff: "MFA has been disabled.",
      mfaToggleFail: "Unable to update MFA settings.",
      mfaSetupInit:
        "Secret generated. Scan the QR code and complete verification.",
      mfaSetupFail: "Unable to initialise MFA.",
      mfaTokenRequired:
        "Enter the 6-digit code from your authenticator app first.",
      mfaVerifySuccess: "MFA has been enabled.",
      mfaVerifyFail: "Verification code is incorrect.",
    },
  },
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [flash, setFlash] = useState(null);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaQR, setMfaQR] = useState(null);
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [togglingMfa, setTogglingMfa] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyingMfa, setVerifyingMfa] = useState(false);

  const navigate = useNavigate();
  const { language } = usePreferences();
  const text = dictionary[language] || dictionary.vi;
  const locale = language === "vi" ? "vi-VN" : "en-US";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/api/auth/me");
        if (!mounted) return;
        const u = res.data?.user;
        if (!u) {
          setError(text.loadErrorMissing);
          return;
        }
        setUser(u);
        setUsername(u.username || "");
        setEmail(u.email || "");
        setMfaEnabled(Boolean(u.mfaEnabled));
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          setError(text.sessionExpired);
          navigate("/login", { replace: true });
        } else {
          setError(err.response?.data?.error || text.loadErrorGeneric);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [
    navigate,
    text.loadErrorMissing,
    text.sessionExpired,
    text.loadErrorGeneric,
  ]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 4500);
    return () => clearTimeout(timer);
  }, [flash]);

  const showFlash = (text, tone = "info") => setFlash({ text, tone });

  const initials = useMemo(() => {
    if (!user) return "U";
    const source = user.username || user.email || "User";
    return source.trim().charAt(0).toUpperCase();
  }, [user]);

  const saveProfile = async () => {
    if (!username.trim()) {
      showFlash(text.flash.usernameRequired, "danger");
      return;
    }
    if (!emailPattern.test(email.trim())) {
      showFlash(text.flash.emailInvalid, "danger");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.put("/api/auth/me", {
        username: username.trim(),
        email: email.trim(),
      });
      setUser((prev) => ({
        ...prev,
        username: username.trim(),
        email: email.trim(),
      }));
      showFlash(res.data?.message || text.flash.saveSuccess, "success");
    } catch (err) {
      showFlash(err.response?.data?.error || text.flash.saveFail, "danger");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!pwCurrent || !pwNew) {
      showFlash(text.flash.passwordFields, "danger");
      return;
    }
    if (pwNew.length < 8) {
      showFlash(text.flash.passwordTooShort, "danger");
      return;
    }
    setChangingPw(true);
    try {
      const res = await api.post("/api/auth/change-password", {
        currentPassword: pwCurrent,
        newPassword: pwNew,
      });
      showFlash(res.data?.message || text.flash.passwordSuccess, "success");
      setPwCurrent("");
      setPwNew("");
    } catch (err) {
      showFlash(err.response?.data?.error || text.flash.passwordFail, "danger");
    } finally {
      setChangingPw(false);
    }
  };

  const toggleMfa = async () => {
    setTogglingMfa(true);
    try {
      const res = await api.post("/api/auth/mfa/toggle", {});
      setMfaEnabled(Boolean(res.data?.mfaEnabled));
      setMfaQR(null);
      setMfaSecret("");
      setMfaToken("");
      showFlash(
        res.data?.mfaEnabled ? text.flash.mfaToggleOn : text.flash.mfaToggleOff,
        "success"
      );
    } catch (err) {
      showFlash(
        err.response?.data?.error || text.flash.mfaToggleFail,
        "danger"
      );
    } finally {
      setTogglingMfa(false);
    }
  };

  const setupMfa = async () => {
    setSetupLoading(true);
    try {
      const res = await api.post("/api/auth/mfa/setup", {});
      setMfaQR(res.data?.qr || null);
      setMfaSecret(res.data?.secret || "");
      showFlash(text.flash.mfaSetupInit, "info");
    } catch (err) {
      showFlash(err.response?.data?.error || text.flash.mfaSetupFail, "danger");
    } finally {
      setSetupLoading(false);
    }
  };

  const verifyMfa = async () => {
    if (mfaToken.trim().length < 6) {
      showFlash(text.flash.mfaTokenRequired, "danger");
      return;
    }
    setVerifyingMfa(true);
    try {
      const res = await api.post("/api/auth/mfa/verify", {
        token: mfaToken.trim(),
      });
      showFlash(res.data?.message || text.flash.mfaVerifySuccess, "success");
      setMfaEnabled(true);
      setMfaQR(null);
      setMfaSecret("");
      setMfaToken("");
    } catch (err) {
      showFlash(
        err.response?.data?.error || text.flash.mfaVerifyFail,
        "danger"
      );
    } finally {
      setVerifyingMfa(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-4 text-center profile-loading">
        <Spinner size={28} />
        <span>{text.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4 profile-error text-center">
        <div className="alert alert-danger mb-3">{error}</div>
        <button className="btn btn-primary" onClick={() => navigate("/login")}>
          {text.actionBackToLogin}
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card p-4 text-center">
        <div className="alert alert-warning mb-0">{text.noUser}</div>
      </div>
    );
  }

  const balanceDisplay =
    typeof user.balance === "number"
      ? user.balance.toLocaleString(locale)
      : Number(user.balance || 0).toLocaleString(locale);

  const roleLabel =
    text.roles[user.role] || text.roles.user || user.role || "user";

  return (
    <div className="profile-page">
      <div className="profile-hero card mb-4">
        <div className="profile-avatar">{initials}</div>
        <div>
          <h2 className="profile-title mb-1">
            {user.username || text.hero.fallbackName}
          </h2>
          <div className="profile-meta">{user.email}</div>
          <div className="profile-meta mt-2">
            {text.hero.rolePrefix} <strong>{roleLabel}</strong> ·{" "}
            {text.hero.balancePrefix}
            <strong>
              {" "}
              {balanceDisplay} {text.hero.balanceSuffix}
            </strong>
          </div>
        </div>
      </div>

      {flash && (
        <div className={`alert alert-${flash.tone} shadow-sm profile-alert`}>
          {flash.text}
        </div>
      )}

      <div className="row g-4 profile-grid">
        <div className="col-lg-6">
          <div className="card h-100 p-4">
            <h5 className="section-title">{text.sections.personal}</h5>
            <label className="form-label">{text.labels.username}</label>
            <input
              className="form-control mb-3"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={text.labels.usernamePlaceholder}
            />
            <label className="form-label">{text.labels.email}</label>
            <input
              className="form-control mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={text.labels.emailPlaceholder}
            />
            <button
              className="btn btn-primary"
              onClick={saveProfile}
              disabled={savingProfile}
            >
              {savingProfile && <Spinner size={18} />}
              {text.labels.save}
            </button>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card h-100 p-4">
            <h5 className="section-title">{text.sections.password}</h5>
            <label className="form-label">{text.labels.currentPassword}</label>
            <input
              type="password"
              className="form-control mb-3"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              placeholder={text.labels.currentPasswordPlaceholder}
            />
            <label className="form-label">{text.labels.newPassword}</label>
            <input
              type="password"
              className="form-control mb-4"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              placeholder={text.labels.newPasswordPlaceholder}
            />
            <button
              className="btn btn-warning text-white"
              onClick={changePassword}
              disabled={changingPw}
            >
              {changingPw && <Spinner size={18} />}
              {text.labels.changePassword}
            </button>
          </div>
        </div>

        <div className="col-12">
          <div className="card p-4">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
              <div>
                <h5 className="section-title mb-1">{text.sections.mfa}</h5>
                <div className="profile-meta">
                  {text.labels.mfaStatus}&nbsp;
                  {mfaEnabled ? (
                    <span className="badge bg-success">
                      {text.labels.mfaOn}
                    </span>
                  ) : (
                    <span className="badge bg-secondary">
                      {text.labels.mfaOff}
                    </span>
                  )}
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary"
                  onClick={toggleMfa}
                  disabled={togglingMfa}
                >
                  {togglingMfa && <Spinner size={18} />}
                  {mfaEnabled
                    ? text.labels.toggleMfaOn
                    : text.labels.toggleMfaOff}
                </button>
                <button
                  className="btn btn-outline-primary"
                  onClick={setupMfa}
                  disabled={setupLoading}
                >
                  {setupLoading && <Spinner size={18} />}
                  {text.labels.setupApp}
                </button>
              </div>
            </div>

            {mfaQR && (
              <div className="mfa-setup mt-4">
                <div className="mfa-instructions">
                  {text.labels.mfaInstructions}
                </div>
                <div className="mfa-qr-wrapper">
                  <img src={mfaQR} alt="MFA QR" />
                  <div className="mfa-secret">
                    <span>{text.labels.secretLabel}</span>
                    <code>{mfaSecret}</code>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label">{text.labels.otpLabel}</label>
                  <input
                    className="form-control"
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    placeholder={text.labels.otpPlaceholder}
                  />
                  <button
                    className="btn btn-success mt-3"
                    onClick={verifyMfa}
                    disabled={verifyingMfa}
                  >
                    {verifyingMfa && <Spinner size={18} />}
                    {text.labels.verifyMfa}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
