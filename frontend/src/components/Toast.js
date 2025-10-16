import React, { useEffect, useState } from "react";

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
  return (
    <div className={cls} role="alert">
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
