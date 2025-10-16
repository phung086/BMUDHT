import React, { useState } from "react";
import api from "../services/api";

const MfaSetup = () => {
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState(null);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState(null);

  const startSetup = async () => {
    const res = await api.post("/api/auth/mfa/setup", {});
    setQr(res.data.qr);
    setSecret(res.data.secret);
  };

  const verify = async () => {
    try {
      const res = await api.post("/api/auth/mfa/verify", { token });
      setMessage(res.data.message || "MFA enabled");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to verify");
    }
  };

  return (
    <div className="card p-3">
      <h5>Thiết lập MFA (TOTP)</h5>
      {!qr && (
        <button className="btn btn-sm btn-outline-primary" onClick={startSetup}>
          Bắt đầu
        </button>
      )}
      {qr && (
        <div>
          <p>Quét mã QR bên dưới bằng ứng dụng Authenticator:</p>
          <img src={qr} alt="qr" />
          <p>
            Secret: <code>{secret}</code>
          </p>
          <div className="input-group mt-2">
            <input
              className="form-control"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Nhập mã từ app"
            />
            <button className="btn btn-primary" onClick={verify}>
              Xác minh
            </button>
          </div>
          {message && <div className="mt-2 alert alert-info">{message}</div>}
        </div>
      )}
    </div>
  );
};

export default MfaSetup;
