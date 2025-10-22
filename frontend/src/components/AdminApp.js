import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import AdminCreditDesk from "./AdminCreditDesk";
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
      <nav
        className="admin-app__switcher"
        aria-label="Điều hướng khu vực quản trị"
      >
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            `admin-app__switcher-link ${isActive ? "is-active" : ""}`
          }
        >
          Tổng quan hệ thống
        </NavLink>
        <NavLink
          to="/admin/credit"
          className={({ isActive }) =>
            `admin-app__switcher-link ${isActive ? "is-active" : ""}`
          }
        >
          Thẩm định & rò rỉ thẻ tín dụng
        </NavLink>
      </nav>
      <div className="admin-app__outlet">
        <Routes>
          <Route index element={<AdminDashboard onLogout={handleLogout} />} />
          <Route
            path="credit"
            element={<AdminCreditDesk onLogout={handleLogout} />}
          />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminApp;
