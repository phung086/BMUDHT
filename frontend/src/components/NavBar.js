import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LogoutConfirmModal from "./LogoutConfirmModal";

const NavBar = () => {
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  // simple user display from token payload if available
  const getInitials = () => {
    try {
      const raw = localStorage.getItem("token");
      if (!raw) return null;
      const payload = JSON.parse(atob(raw.split(".")[1]));
      const name = payload?.name || payload?.username || payload?.role || "";
      return (name[0] || "").toUpperCase();
    } catch (e) {
      return null;
    }
  };
  const initials = getInitials();

  const handleLogout = () => {
    try {
      // best-effort call to server to clear refresh cookie
      fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    } catch (e) {}
    localStorage.removeItem("token");
    // set a small flag so the login page can show a toast confirming logout
    try {
      localStorage.setItem("justLoggedOut", "1");
    } catch (e) {}
    navigate("/login");
  };

  const openLogout = () => setShowLogout(true);
  const cancelLogout = () => setShowLogout(false);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">
          Fintech Demo
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/dashboard">
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/admin">
                Admin
              </Link>
            </li>
          </ul>
          <ul className="navbar-nav">
            {!token ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/register">
                    Register
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item d-flex align-items-center me-2">
                  <div
                    className="bg-light text-primary rounded-circle"
                    style={{
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                    }}
                  >
                    {initials || "U"}
                  </div>
                </li>
                <li className="nav-item">
                  <button
                    className="btn btn-outline-light d-flex align-items-center"
                    onClick={openLogout}
                  >
                    <i className="bi bi-box-arrow-right me-2" aria-hidden></i>
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
      <LogoutConfirmModal
        show={showLogout}
        onConfirm={handleLogout}
        onCancel={cancelLogout}
      />
    </nav>
  );
};

export default NavBar;
