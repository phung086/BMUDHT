import React from "react";

const LoaderOverlay = ({ show = true, message = "Đang xử lý..." }) => {
  if (!show) return null;
  return (
    <div className="loader-overlay">
      <div className="loader-card">
        <div
          className="spinner-border text-primary"
          role="status"
          style={{ width: 48, height: 48 }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <div style={{ marginTop: 10 }}>{message}</div>
      </div>
    </div>
  );
};

export default LoaderOverlay;
