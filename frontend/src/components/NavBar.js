import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import LogoutConfirmModal from "./LogoutConfirmModal";
import NotificationContext from "../context/NotificationContext";
import { usePreferences } from "../context/PreferencesContext";
import {
  AUTH_EVENT,
  broadcastAuthChange,
  clearToken,
  decodeTokenPayload,
  readToken,
} from "../utils/authSignal";
import { clearSessionExpiredFlag, serverLogout } from "../utils/sessionManager";

const copy = {
  vi: {
    homeAria: "Trang chủ",
    notificationsAria: "Thông báo",
    profileAria: "Hồ sơ cá nhân",
    creditAria: "Cổng thẻ tín dụng",
    fraudAria: "Mô phỏng kẻ gian",
    merchantAria: "Cổng thanh toán thương mại",
    authLogin: "Đăng nhập",
    authRegister: "Tạo tài khoản",
    authAdmin: "Quản trị",
    logout: "Đăng xuất",
    accountFallback: "Tài khoản",
    adminAria: "Bảng quản trị",
    themeLabel: "Chủ đề",
    themeUseLight: "Dùng chế độ sáng",
    themeUseDark: "Dùng chế độ tối",
    languageLabel: "Ngôn ngữ",
    languageToggle: "Switch to English",
    brandSubtitle: "Digital Banking Suite",
  },
  en: {
    homeAria: "Home",
    notificationsAria: "Notifications",
    profileAria: "Profile",
    creditAria: "Credit Portal",
    fraudAria: "Attacker Simulation",
    merchantAria: "Merchant Checkout",
    authLogin: "Login",
    authRegister: "Create Account",
    authAdmin: "Admin Portal",
    logout: "Logout",
    accountFallback: "Account",
    adminAria: "Admin Dashboard",
    themeLabel: "Theme",
    themeUseLight: "Use Light Mode",
    themeUseDark: "Use Dark Mode",
    languageLabel: "Language",
    languageToggle: "Chuyển sang Tiếng Việt",
    brandSubtitle: "Digital Banking Suite",
  },
};

const NavBar = () => {
  const [showLogout, setShowLogout] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [token, setToken] = useState(() => readToken());
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useContext(NotificationContext);
  const { theme, toggleTheme, language, toggleLanguage } = usePreferences();
  const text = copy[language] || copy.vi;
  const languageToggleLabel =
    language === "vi" ? copy.vi.languageToggle : copy.en.languageToggle;
  const settingsRef = useRef(null);
  const tokenPayload = useMemo(() => decodeTokenPayload(token), [token]);

  const displayName = useMemo(() => {
    if (!tokenPayload) return "";
    return (
      tokenPayload.name ||
      tokenPayload.fullName ||
      tokenPayload.username ||
      tokenPayload.email?.split("@")[0] ||
      ""
    );
  }, [tokenPayload]);

  const isAdmin = tokenPayload?.role === "admin";

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const syncToken = () => setToken(readToken());
    syncToken();
    window.addEventListener("storage", syncToken);
    window.addEventListener(AUTH_EVENT, syncToken);
    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener(AUTH_EVENT, syncToken);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await serverLogout();
    } catch (error) {
      /* ignore logout failures */
    }
    clearToken();
    clearSessionExpiredFlag();
    try {
      localStorage.setItem("justLoggedOut", "1");
    } catch (e) {}
    setToken(null);
    broadcastAuthChange();
    setShowLogout(false);
    navigate("/login", { replace: true });
  };

  const openLogout = () => setShowLogout(true);
  const cancelLogout = () => setShowLogout(false);

  const toggleSettings = () => setSettingsOpen((current) => !current);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (event) => {
      if (!settingsRef.current) return;
      if (!settingsRef.current.contains(event.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav className="app-navbar">
      <div className="app-navbar__inner">
        <Link
          className="app-navbar__brand"
          to={
            !token
              ? "/"
              : isAdmin && location.pathname.startsWith("/admin")
              ? "/admin/credit"
              : "/dashboard"
          }
        >
          <span className="app-navbar__logo" aria-hidden>
            <i className="bi bi-bank2"></i>
          </span>
          <span className="app-navbar__brand-text">
            Fintech One
            <small>{text.brandSubtitle}</small>
          </span>
        </Link>

        <div className="app-navbar__actions">
          {!token ? (
            <div className="app-navbar__auth">
              <Link className="app-navbar__link" to="/login">
                {text.authLogin}
              </Link>
              <Link className="app-navbar__link" to="/admin">
                {text.authAdmin}
              </Link>
              <Link className="app-navbar__cta" to="/register">
                {text.authRegister}
              </Link>
            </div>
          ) : (
            <>
              <Link
                to="/dashboard"
                className={`app-navbar__icon ${
                  isActive("/dashboard") ? "is-active" : ""
                }`}
                aria-label={text.homeAria}
              >
                <i className="bi bi-house-door"></i>
              </Link>
              <Link
                to="/credit"
                className={`app-navbar__icon ${
                  isActive("/credit") ? "is-active" : ""
                }`}
                aria-label={text.creditAria}
              >
                <i className="bi bi-credit-card-2-front"></i>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/credit"
                  className={`app-navbar__icon ${
                    isActive("/admin") ? "is-active" : ""
                  }`}
                  aria-label={text.adminAria}
                >
                  <i className="bi bi-shield-lock"></i>
                </Link>
              )}
              <Link
                to="/fraud-sim"
                className={`app-navbar__icon ${
                  isActive("/fraud-sim") ? "is-active" : ""
                }`}
                aria-label={text.fraudAria}
              >
                <i className="bi bi-incognito"></i>
              </Link>
              <Link
                to="/merchant"
                className={`app-navbar__icon ${
                  isActive("/merchant") ? "is-active" : ""
                }`}
                aria-label={text.merchantAria}
              >
                <i className="bi bi-bag-check"></i>
              </Link>
              <Link
                to="/notifications"
                className={`app-navbar__icon ${
                  isActive("/notifications") ? "is-active" : ""
                }`}
                aria-label={text.notificationsAria}
              >
                <i className="bi bi-bell"></i>
                {unreadCount > 0 && (
                  <span className="app-navbar__badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <div className="app-navbar__settings" ref={settingsRef}>
                <button
                  type="button"
                  className={`app-navbar__icon ${
                    settingsOpen ? "is-active" : ""
                  }`}
                  aria-haspopup="true"
                  aria-expanded={settingsOpen}
                  onClick={toggleSettings}
                >
                  <i className="bi bi-gear"></i>
                </button>
                {settingsOpen && (
                  <div className="app-navbar__menu" role="menu">
                    <div className="app-navbar__menu-section" role="none">
                      <span className="app-navbar__menu-label">
                        {text.themeLabel}
                      </span>
                      <button
                        type="button"
                        className="app-navbar__menu-item"
                        onClick={toggleTheme}
                        role="menuitem"
                      >
                        <i className="bi bi-circle-half me-2" aria-hidden></i>
                        {theme === "dark"
                          ? text.themeUseLight
                          : text.themeUseDark}
                      </button>
                    </div>
                    <div className="app-navbar__menu-section" role="none">
                      <span className="app-navbar__menu-label">
                        {text.languageLabel}
                      </span>
                      <button
                        type="button"
                        className="app-navbar__menu-item"
                        onClick={toggleLanguage}
                        role="menuitem"
                      >
                        <i className="bi bi-translate me-2" aria-hidden></i>
                        {languageToggleLabel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/profile"
                className={`app-navbar__profile ${
                  isActive("/profile") ? "is-active" : ""
                }`}
                aria-label={text.profileAria}
              >
                <span className="app-navbar__avatar">
                  <i className="bi bi-person-fill"></i>
                </span>
                <span className="app-navbar__profile-name">
                  {displayName || text.accountFallback}
                </span>
              </Link>
              <button
                className="app-navbar__logout"
                type="button"
                onClick={openLogout}
              >
                <i className="bi bi-box-arrow-right" aria-hidden></i>
                <span>{text.logout}</span>
              </button>
            </>
          )}
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
