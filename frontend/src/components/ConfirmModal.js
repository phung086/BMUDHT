import React from "react";
import { usePreferences } from "../context/PreferencesContext";

const dictionary = {
  vi: {
    cancel: "Hủy",
    confirm: "Xác nhận",
    processing: "Đang xử lý...",
  },
  en: {
    cancel: "Cancel",
    confirm: "Confirm",
    processing: "Processing...",
  },
};

const ConfirmModal = ({
  show,
  title,
  body,
  onConfirm,
  onCancel,
  confirming,
  confirmDisabled = false,
  cancelLabel,
  confirmLabel,
  processingLabel,
}) => {
  const { language } = usePreferences();
  const text = dictionary[language] || dictionary.vi;
  const cancelText = cancelLabel || text.cancel;
  const confirmText = confirmLabel || text.confirm;
  const processingText = processingLabel || text.processing;

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
            {cancelText}
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={confirming || confirmDisabled}
          >
            {confirming ? processingText : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
