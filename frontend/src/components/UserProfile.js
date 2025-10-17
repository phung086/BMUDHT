import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Spinner from "./Spinner";

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/api/auth/me");
        if (!mounted) return;
        const u = res.data?.user;
        if (!u) {
          setError("Không tìm thấy hồ sơ người dùng");
          return;
        }
        setUser(u);
        setUsername(u.username || "");
        setEmail(u.email || "");
        setMfaEnabled(Boolean(u.mfaEnabled));
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
          navigate("/login", { replace: true });
        } else {
          setError(
            err.response?.data?.error || "Không thể lấy thông tin người dùng"
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

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
      showFlash("Tên người dùng không được bỏ trống.", "danger");
      return;
    }
    if (!emailPattern.test(email.trim())) {
      showFlash("Email không hợp lệ.", "danger");
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
      showFlash(res.data?.message || "Đã lưu thay đổi.", "success");
    } catch (err) {
      showFlash(err.response?.data?.error || "Cập nhật thất bại.", "danger");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!pwCurrent || !pwNew) {
      showFlash(
        "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.",
        "danger"
      );
      return;
    }
    if (pwNew.length < 8) {
      showFlash("Mật khẩu mới phải có ít nhất 8 ký tự.", "danger");
      return;
    }
    setChangingPw(true);
    try {
      const res = await api.post("/api/auth/change-password", {
        currentPassword: pwCurrent,
        newPassword: pwNew,
      });
      showFlash(res.data?.message || "Đã đổi mật khẩu.", "success");
      setPwCurrent("");
      setPwNew("");
    } catch (err) {
      showFlash(
        err.response?.data?.error || "Thay đổi mật khẩu thất bại.",
        "danger"
      );
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
        res.data?.mfaEnabled ? "Đã bật MFA qua email OTP." : "Đã tắt MFA.",
        "success"
      );
    } catch (err) {
      showFlash(
        err.response?.data?.error || "Không thể thay đổi MFA.",
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
      showFlash("Đã tạo QR / secret. Vui lòng quét và xác thực.", "info");
    } catch (err) {
      showFlash(
        err.response?.data?.error || "Không thể khởi tạo MFA.",
        "danger"
      );
    } finally {
      setSetupLoading(false);
    }
  };

  const verifyMfa = async () => {
    if (mfaToken.trim().length < 6) {
      showFlash("Nhập mã 6 số từ ứng dụng trước khi xác nhận.", "danger");
      return;
    }
    setVerifyingMfa(true);
    try {
      const res = await api.post("/api/auth/mfa/verify", {
        token: mfaToken.trim(),
      });
      showFlash(res.data?.message || "Đã bật MFA.", "success");
      setMfaEnabled(true);
      setMfaQR(null);
      setMfaSecret("");
      setMfaToken("");
    } catch (err) {
      showFlash(
        err.response?.data?.error || "Mã xác nhận không đúng.",
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
        <span>Đang tải hồ sơ...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4 profile-error text-center">
        <div className="alert alert-danger mb-3">{error}</div>
        <button className="btn btn-primary" onClick={() => navigate("/login")}>
          Quay lại đăng nhập
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card p-4 text-center">
        <div className="alert alert-warning mb-0">
          Không tìm thấy dữ liệu người dùng.
        </div>
      </div>
    );
  }

  const balanceDisplay =
    typeof user.balance === "number"
      ? user.balance.toLocaleString("vi-VN")
      : Number(user.balance || 0).toLocaleString("vi-VN");

  return (
    <div className="profile-page">
      <div className="profile-hero card mb-4">
        <div className="profile-avatar">{initials}</div>
        <div>
          <h2 className="profile-title mb-1">
            {user.username || "Người dùng"}
          </h2>
          <div className="profile-meta">{user.email}</div>
          <div className="profile-meta mt-2">
            Vai trò: <strong>{user.role || "user"}</strong> · Số dư:
            <strong> {balanceDisplay} VND</strong>
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
            <h5 className="section-title">Thông tin cá nhân</h5>
            <label className="form-label">Tên người dùng</label>
            <input
              className="form-control mb-3"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên hiển thị"
            />
            <label className="form-label">Email</label>
            <input
              className="form-control mb-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
            <button
              className="btn btn-primary"
              onClick={saveProfile}
              disabled={savingProfile}
            >
              {savingProfile && <Spinner size={18} />}Lưu thay đổi
            </button>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card h-100 p-4">
            <h5 className="section-title">Đổi mật khẩu</h5>
            <label className="form-label">Mật khẩu hiện tại</label>
            <input
              type="password"
              className="form-control mb-3"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại"
            />
            <label className="form-label">Mật khẩu mới</label>
            <input
              type="password"
              className="form-control mb-4"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              placeholder="Ít nhất 8 ký tự"
            />
            <button
              className="btn btn-warning text-white"
              onClick={changePassword}
              disabled={changingPw}
            >
              {changingPw && <Spinner size={18} />}Đổi mật khẩu
            </button>
          </div>
        </div>

        <div className="col-12">
          <div className="card p-4">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
              <div>
                <h5 className="section-title mb-1">Bảo mật 2 lớp (MFA)</h5>
                <div className="profile-meta">
                  Trạng thái:&nbsp;
                  {mfaEnabled ? (
                    <span className="badge bg-success">Đang bật</span>
                  ) : (
                    <span className="badge bg-secondary">Đang tắt</span>
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
                  {mfaEnabled ? "Tắt MFA" : "Bật nhanh (Email OTP)"}
                </button>
                <button
                  className="btn btn-outline-primary"
                  onClick={setupMfa}
                  disabled={setupLoading}
                >
                  {setupLoading && <Spinner size={18} />}
                  Thiết lập bằng ứng dụng
                </button>
              </div>
            </div>

            {mfaQR && (
              <div className="mfa-setup mt-4">
                <div className="mfa-instructions">
                  Quét QR bằng Google Authenticator hoặc nhập secret bên dưới.
                </div>
                <div className="mfa-qr-wrapper">
                  <img src={mfaQR} alt="MFA QR" />
                  <div className="mfa-secret">
                    <span>Secret:</span>
                    <code>{mfaSecret}</code>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label">Nhập mã 6 số</label>
                  <input
                    className="form-control"
                    value={mfaToken}
                    onChange={(e) => setMfaToken(e.target.value)}
                    placeholder="123456"
                  />
                  <button
                    className="btn btn-success mt-3"
                    onClick={verifyMfa}
                    disabled={verifyingMfa}
                  >
                    {verifyingMfa && <Spinner size={18} />}
                    Xác nhận kích hoạt
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
