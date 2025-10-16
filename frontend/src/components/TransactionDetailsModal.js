import React from "react";

const TransactionDetailsModal = ({ tx, show, onClose }) => {
  if (!show || !tx) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h5>Chi tiết giao dịch</h5>
        <div className="modal-body">
          <p>
            <strong>Loại:</strong> {tx.type}
          </p>
          <p>
            <strong>Số tiền:</strong> {tx.amount.toLocaleString("vi-VN")} VND
          </p>
          <p>
            <strong>Từ:</strong> {tx.fromUsername || "-"}
          </p>
          <p>
            <strong>Đến:</strong> {tx.toUsername || "-"}
          </p>
          <p>
            <strong>Mô tả:</strong> {tx.description}
          </p>
          <p>
            <strong>Ngày giờ:</strong> {new Date(tx.createdAt).toLocaleString("vi-VN")}
          </p>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;
