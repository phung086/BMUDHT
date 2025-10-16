import React, { useState } from 'react';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

const AdminApp = () => {
  const [accessToken, setAccessToken] = useState(null);

  const handleLoginSuccess = (accessToken, refreshToken) => {
    setAccessToken(accessToken);
    // Lưu refreshToken nếu cần
  };

  const handleLogout = () => {
    setAccessToken(null);
  };

  return (
    <div className="admin-app">
      {!accessToken ? (
        <AdminLogin onLoginSuccess={handleLoginSuccess} />
      ) : (
        <AdminDashboard onLogout={handleLogout} />
      )}
    </div>
  );
};

export default AdminApp;
