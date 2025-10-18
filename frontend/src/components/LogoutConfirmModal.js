import React from "react";
import { usePreferences } from "../context/PreferencesContext";

const dictionary = {
  vi: {
    title: "Xác nhận đăng xuất",
    message: "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?",
    cancel: "Hủy",
    confirm: "Đăng xuất",
  },
  en: {
    title: "Sign out?",
    message: "Are you sure you want to sign out of your account?",
    cancel: "Cancel",
    confirm: "Sign out",
  },
};

const LogoutConfirmModal = ({ show, onConfirm, onCancel }) => {
  const { language } = usePreferences();
  const text = dictionary[language] || dictionary.vi;

  if (!show) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h5>{text.title}</h5>
        <div className="modal-body">{text.message}</div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            {text.cancel}
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {text.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
