import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Dashboard from "./components/MainDashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminApp from "./components/AdminApp";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import UserProfile from "./components/UserProfile";
import NotificationsPage from "./components/NotificationsPage";
import CreditPortal from "./components/CreditPortal";
import AdminCreditDesk from "./components/AdminCreditDesk";
import FraudConsole from "./components/FraudConsole";
import MerchantCheckout from "./components/MerchantCheckout";
import PhishingLanding from "./components/PhishingLanding";
import { NotificationProvider } from "./context/NotificationContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import SessionWatcher from "./components/SessionWatcher";

const App = () => {
  return (
    <BrowserRouter>
      <PreferencesProvider>
        <SessionWatcher />
        <NotificationProvider>
          <div className="app-shell">
            <NavBar />
            <main className="app-main">
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/credit" element={<CreditPortal />} />
                <Route path="/admin-credit" element={<AdminCreditDesk />} />
                <Route path="/fraud-sim" element={<FraudConsole />} />
                <Route path="/merchant" element={<MerchantCheckout />} />
                <Route path="/admin/*" element={<AdminApp />} />
                <Route
                  path="/phishing/vietcornbank"
                  element={<PhishingLanding />}
                />
              </Routes>
            </main>
            <Footer />
          </div>
        </NotificationProvider>
      </PreferencesProvider>
    </BrowserRouter>
  );
};

export default App;
