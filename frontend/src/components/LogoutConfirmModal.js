import React from "react";

const LogoutConfirmModal = ({ show, onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h5>Xác nhận đăng xuất</h5>
        <div className="modal-body">
          Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Hủy
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
