import React from "react";

const ConfirmModal = ({
  show,
  title,
  body,
  onConfirm,
  onCancel,
  confirming,
}) => {
  if (!show) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h5>{title}</h5>
        <div className="modal-body">{body}</div>
        <div className="modal-actions">
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={confirming}
          >
            Hủy
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Đang..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
