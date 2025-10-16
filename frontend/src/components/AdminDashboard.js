import React from 'react';

const AdminDashboard = ({ onLogout }) => {
  return (
    <div className="admin-dashboard">
      <h2>Trang quản trị Admin</h2>
      <p>Chào mừng bạn đến trang quản lý.</p>
      {/* Các chức năng quản lý user, logs, blacklist sẽ được thêm ở đây */}
      <button onClick={onLogout}>Đăng xuất</button>
    </div>
  );
};

export default AdminDashboard;
