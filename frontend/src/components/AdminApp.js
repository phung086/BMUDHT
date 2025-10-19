import React, { useEffect, useMemo, useState } from "react";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import api from "../services/api";
import LoaderOverlay from "./LoaderOverlay";
import {
  broadcastAuthChange,
  clearToken,
  persistToken,
  readToken,
} from "../utils/authSignal";
import { clearSessionExpiredFlag, serverLogout } from "../utils/sessionManager";

const AdminApp = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = readToken();
        if (!token) {
          setAccessToken(null);
          setError(null);
          return;
        }
        const res = await api.get("/api/auth/me");
        const user = res.data?.user;
        if (!mounted) return;
        if (!user || user.role !== "admin") {
          setAccessToken(null);
          setError("Bạn không có quyền truy cập khu vực quản trị.");
        } else {
          setAccessToken(token);
          setError(null);
        }
      } catch (err) {
        if (!mounted) return;
        setAccessToken(null);
        setError(
          err.response?.data?.error || "Không thể xác thực quyền quản trị."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLoginSuccess = (newAccessToken) => {
    persistToken(newAccessToken);
    setAccessToken(newAccessToken);
    setError(null);
    broadcastAuthChange();
  };

  const handleLogout = async () => {
    try {
      await serverLogout();
    } catch (error) {
      /* ignore */
    }
    clearToken();
    clearSessionExpiredFlag();
    setAccessToken(null);
    setError(null);
    broadcastAuthChange();
  };

  const state = useMemo(
    () => ({ accessToken, loading, error }),
    [accessToken, loading, error]
  );

  if (state.loading) {
    return <LoaderOverlay message="Đang xác thực quyền quản trị..." />;
  }

  if (!state.accessToken) {
    return (
      <div className="admin-app">
        {state.error && (
          <div className="alert alert-warning" role="alert">
            {state.error}
          </div>
        )}
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="admin-app">
      <AdminDashboard onLogout={handleLogout} />
    </div>
  );
};

export default AdminApp;
