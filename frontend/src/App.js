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
import { NotificationProvider } from "./context/NotificationContext";
import { PreferencesProvider } from "./context/PreferencesContext";

const App = () => {
  return (
    <BrowserRouter>
      <PreferencesProvider>
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
                <Route path="/admin/*" element={<AdminApp />} />
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
