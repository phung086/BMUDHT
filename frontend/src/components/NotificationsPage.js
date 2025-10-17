import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationContext from "../context/NotificationContext";
import TransactionDetailsModal from "./TransactionDetailsModal";

const statusBadgeClass = (status) => {
  if (status === "completed") return "bg-success-subtle text-success";
  if (status === "pending") return "bg-warning-subtle text-warning";
  return "bg-danger-subtle text-danger";
};

const typeIcon = (type) => {
  if (type === "deposit") return "bi-arrow-down-circle";
  if (type === "transfer") return "bi-arrow-up-circle";
  return "bi-exclamation-circle";
};

const maskAccount = (value) => {
  if (!value) return "";
  if (value.length <= 4) return value;
  return "****" + value.slice(-4);
};

const formatCurrency = (amount) => {
  return amount.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });
};

const formatTime = (iso) => {
  return new Date(iso).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    refresh,
    readMap,
  } = React.useContext(NotificationContext);

  const [selectedTx, setSelectedTx] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const grouped = useMemo(() => {
    return notifications.reduce((acc, item) => {
      const day = new Date(item.createdAt).toLocaleDateString("vi-VN");
      acc[day] = acc[day] || [];
      acc[day].push(item);
      return acc;
    }, {});
  }, [notifications]);

  const sortedDays = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => {
      const da = new Date(a.split("/").reverse().join("-"));
      const db = new Date(b.split("/").reverse().join("-"));
      return db - da;
    });
  }, [grouped]);

  const handleMarkAll = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const handleCardClick = useCallback(
    (item) => {
      markAsRead(item.id);
      if (item.raw) {
        setSelectedTx(item.raw);
        setShowModal(true);
      }
    },
    [markAsRead]
  );

  return (
    <div className="notifications-page">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="mb-1">Thông báo</h2>
          <small className="text-muted">
            {unreadCount > 0
              ? `${unreadCount} thông báo cần xem`
              : "Bạn đã đọc tất cả thông báo"}
          </small>
        </div>
        <div className="d-flex gap-2">
          {unreadCount > 0 && (
            <button className="btn btn-outline-primary" onClick={handleMarkAll}>
              Đánh dấu đã đọc
            </button>
          )}
          <button className="btn btn-light" onClick={() => navigate("/dashboard")}>
            <i className="bi bi-speedometer2 me-2" aria-hidden></i>
            Quay lại bảng điều khiển
          </button>
        </div>
      </div>
      {sortedDays.length === 0 ? (
        <div className="text-center text-muted py-5">
          Chưa có thông báo giao dịch.
        </div>
      ) : (
        sortedDays.map((day) => (
          <section key={day} className="mb-4">
            <p className="fw-semibold text-uppercase small text-muted mb-2">{day}</p>
            <div className="row g-3">
              {grouped[day].map((item) => {
                const isUnread = !readMap[item.id];
                const amount = formatCurrency(Math.abs(item.amount));
                const prefix = item.amount >= 0 ? "+" : "-";
                const tx = item.raw || {};
                return (
                  <div className="col-xl-6" key={item.id}>
                    <div
                      className={`card notification-card ${isUnread ? "notification-card--unread" : ""}`}
                      role="button"
                      onClick={() => handleCardClick(item)}
                    >
                      <div className="card-body">
                        <div className="notification-card__header">
                          <span className="notification-card__icon">
                            <i className={`bi ${typeIcon(tx.type)}`} aria-hidden></i>
                          </span>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <div>
                                <h5 className="card-title mb-1">{item.title}</h5>
                                <p className="card-subtitle text-muted mb-0">{item.description}</p>
                              </div>
                              <span className={`badge ${statusBadgeClass(item.status)}`}>
                                {item.status === "completed"
                                  ? "Hoàn thành"
                                  : item.status === "pending"
                                  ? "Đang xử lý"
                                  : "Thất bại"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="notification-card__money mt-3">
                          <span className={`notification-amount ${item.amount >= 0 ? "text-success" : "text-danger"}`}>
                            {prefix}
                            {amount}
                          </span>
                          <span className="notification-time">
                            <i className="bi bi-clock-history me-1" aria-hidden></i>
                            {formatTime(item.createdAt)}
                          </span>
                        </div>
                        <div className="notification-card__meta mt-3">
                          <div>
                            <small className="text-muted">Tài khoản chuyển</small>
                            <div>{maskAccount(tx.fromUsername) || "Không xác định"}</div>
                          </div>
                          <div>
                            <small className="text-muted">Tài khoản nhận</small>
                            <div>{maskAccount(tx.toUsername) || "Không xác định"}</div>
                          </div>
                          <div>
                            <small className="text-muted">Mã giao dịch</small>
                            <div className="fw-semibold">#{tx.id || item.id}</div>
                          </div>
                        </div>
                        {tx.description && (
                          <div className="notification-card__note mt-3">
                            <small className="text-muted d-block">Ghi chú</small>
                            <span>{tx.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <TransactionDetailsModal
        tx={selectedTx}
        show={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
};

export default NotificationsPage;
