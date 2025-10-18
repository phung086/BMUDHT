import React, { useEffect, useMemo, useState } from "react";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import api from "../services/api";
import LoaderOverlay from "./LoaderOverlay";

const AdminApp = () => {
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = localStorage.getItem("token");
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

  const handleLoginSuccess = (newAccessToken, refreshToken) => {
    localStorage.setItem("token", newAccessToken);
    setAccessToken(newAccessToken);
    setError(null);
    if (refreshToken) {
      try {
        localStorage.setItem("refreshToken", refreshToken);
      } catch (e) {
        /* ignore quota errors */
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setAccessToken(null);
    setError(null);
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
