import React, { useState } from "react";
import api from "../services/api";

const AdminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    try {
      const res = await api.post("/api/auth/login", { email, password });

      if (res.data.mfaRequired) {
        setMfaRequired(true);
        setUserId(res.data.userId);
      } else {
        onLoginSuccess(res.data.accessToken, res.data.refreshToken);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  const handleMfaVerify = async () => {
    setError("");
    try {
      const res = await api.post("/api/auth/login/mfa", { userId, otp });

      onLoginSuccess(res.data.accessToken, res.data.refreshToken);
    } catch (err) {
      setError(err.response?.data?.error || "OTP verification failed");
    }
  };

  return (
    <div className="admin-login">
      <h2>Đăng nhập Admin</h2>
      {!mfaRequired ? (
        <>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={handleLogin}>Đăng nhập</button>
        </>
      ) : (
        <>
          <input
            type="text"
            placeholder="Nhập mã OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={handleMfaVerify}>Xác thực OTP</button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default AdminLogin;
