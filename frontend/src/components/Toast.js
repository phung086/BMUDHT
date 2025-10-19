import React, { useEffect, useState } from "react";

const iconMap = {
  success: "bi-check-circle-fill",
  error: "bi-x-circle-fill",
  warning: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill",
};

const Toast = ({ show, type = "info", message, onClose, duration = 4000 }) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (show) {
      const t = setTimeout(() => {
        setVisible(false);
        onClose && onClose();
      }, duration);
      return () => clearTimeout(t);
    }
  }, [show, duration, onClose]);

  if (!visible) return null;
  const cls = `toast toast-${type} toast-fade`;
  const icon = iconMap[type] || iconMap.info;
  return (
    <div className={cls} role="alert">
      <div className="toast-icon" aria-hidden>
        <i className={`bi ${icon}`}></i>
      </div>
      <div className="toast-message">{message}</div>
      <button
        className="toast-close"
        onClick={() => {
          setVisible(false);
          onClose && onClose();
        }}
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
