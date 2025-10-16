import React, { useState, useEffect } from "react";
import api from "../services/api";

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState(null);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/auth/me");
        if (!mounted) return;
        const u = res.data.user;
        setUser(u);
        setUsername(u.username || "");
        setEmail(u.email || "");
      } catch (err) {
        setError(
          err.response?.data?.error || "Không thể lấy thông tin người dùng"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
    return () => (mounted = false);
  }, []);

  const saveProfile = async () => {
    setMsg(null);
    try {
      const res = await api.put("/api/auth/me", { username, email });
      setMsg(res.data.message || "Đã cập nhật");
      setUser((s) => ({ ...s, username, email }));
    } catch (err) {
      setMsg(err.response?.data?.error || "Cập nhật thất bại");
    }
  };

  const changePassword = async () => {
    setMsg(null);
    try {
      const res = await api.post("/api/auth/change-password", {
        currentPassword: pwCurrent,
        newPassword: pwNew,
      });
      setMsg(res.data.message || "Mật khẩu đã thay đổi");
      setPwCurrent("");
      setPwNew("");
    } catch (err) {
      setMsg(err.response?.data?.error || "Thay đổi mật khẩu thất bại");
    }
  };

  if (loading) return <div className="card p-3">Đang tải...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="card p-3">
      <h3>Hồ sơ người dùng</h3>
      {msg && <div className="alert alert-info">{msg}</div>}

      <div className="mb-2">
        <label className="form-label">ID</label>
        <div>{user.id}</div>
      </div>

      <div className="mb-2">
        <label className="form-label">Tên người dùng</label>
        <input
          className="form-control"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <label className="form-label">Email</label>
        <input
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mb-3">
        <button className="btn btn-primary me-2" onClick={saveProfile}>
          Lưu thay đổi
        </button>
      </div>

      <hr />

      <h5>Đổi mật khẩu</h5>
      <div className="mb-2">
        <label className="form-label">Mật khẩu hiện tại</label>
        <input
          type="password"
          className="form-control"
          value={pwCurrent}
          onChange={(e) => setPwCurrent(e.target.value)}
        />
      </div>
      <div className="mb-2">
        <label className="form-label">Mật khẩu mới</label>
        <input
          type="password"
          className="form-control"
          value={pwNew}
          onChange={(e) => setPwNew(e.target.value)}
        />
      </div>
      <div>
        <button className="btn btn-warning" onClick={changePassword}>
          Thay đổi mật khẩu
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
