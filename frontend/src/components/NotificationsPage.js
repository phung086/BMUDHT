import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import NotificationContext from "../context/NotificationContext";
import TransactionDetailsModal from "./TransactionDetailsModal";
import { usePreferences } from "../context/PreferencesContext";

const dictionary = {
  vi: {
    title: "Thông báo",
    unreadSummary: (count) =>
      count > 0 ? `${count} thông báo cần xem` : "Bạn đã đọc tất cả thông báo",
    markAll: "Đánh dấu đã đọc",
    backToDashboard: "Quay lại bảng điều khiển",
    emptyState: "Chưa có thông báo giao dịch.",
    status: {
      completed: "Hoàn thành",
      pending: "Đang xử lý",
      failed: "Thất bại",
    },
    sender: "Tài khoản chuyển",
    receiver: "Tài khoản nhận",
    transactionId: "Mã giao dịch",
    unknown: "Không xác định",
    note: "Ghi chú",
    amountPrefixPositive: "+",
    amountPrefixNegative: "-",
    clockLabel: "Thời gian",
    dayLabel: (date) =>
      date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
  },
  en: {
    title: "Notifications",
    unreadSummary: (count) =>
      count > 0
        ? `${count} notification${count > 1 ? "s" : ""} pending`
        : "You're all caught up",
    markAll: "Mark all as read",
    backToDashboard: "Back to dashboard",
    emptyState: "No transaction notifications yet.",
    status: {
      completed: "Completed",
      pending: "Processing",
      failed: "Failed",
    },
    sender: "Sender",
    receiver: "Recipient",
    transactionId: "Transaction ID",
    unknown: "Unknown",
    note: "Note",
    amountPrefixPositive: "+",
    amountPrefixNegative: "-",
    clockLabel: "Time",
    dayLabel: (date) =>
      date.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
  },
};

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

const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    refresh,
    readMap,
  } = useContext(NotificationContext);
  const { language } = usePreferences();
  const locale = language === "vi" ? "vi-VN" : "en-US";
  const text = dictionary[language] || dictionary.vi;

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
      const date = new Date(item.createdAt);
      const dayDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      const key = dayDate.toISOString();
      acc[key] = acc[key] || [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [notifications]);

  const sortedDays = useMemo(() => {
    return Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
  }, [grouped]);

  const formatCurrency = useCallback(
    (amount) =>
      Number(amount || 0).toLocaleString(locale, {
        style: "currency",
        currency: "VND",
      }),
    [locale]
  );

  const formatTime = useCallback(
    (iso) =>
      new Date(iso).toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale]
  );

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
          <h2 className="mb-1">{text.title}</h2>
          <small className="text-muted">
            {text.unreadSummary(unreadCount)}
          </small>
        </div>
        <div className="d-flex gap-2">
          {unreadCount > 0 && (
            <button className="btn btn-outline-primary" onClick={handleMarkAll}>
              {text.markAll}
            </button>
          )}
          <button
            className="btn btn-light"
            onClick={() => navigate("/dashboard")}
          >
            <i className="bi bi-speedometer2 me-2" aria-hidden></i>
            {text.backToDashboard}
          </button>
        </div>
      </div>
      {sortedDays.length === 0 ? (
        <div className="text-center text-muted py-5">{text.emptyState}</div>
      ) : (
        sortedDays.map((day) => (
          <section key={day} className="mb-4">
            <p className="fw-semibold text-uppercase small text-muted mb-2">
              {text.dayLabel(new Date(day))}
            </p>
            <div className="row g-3">
              {grouped[day].map((item) => {
                const isUnread = !readMap[item.id];
                const amount = formatCurrency(Math.abs(item.amount));
                const prefix =
                  item.amount >= 0
                    ? text.amountPrefixPositive
                    : text.amountPrefixNegative;
                const tx = item.raw || {};
                return (
                  <div className="col-xl-6" key={item.id}>
                    <div
                      className={`card notification-card ${
                        isUnread ? "notification-card--unread" : ""
                      }`}
                      role="button"
                      onClick={() => handleCardClick(item)}
                    >
                      <div className="card-body">
                        <div className="notification-card__header">
                          <span className="notification-card__icon">
                            <i
                              className={`bi ${typeIcon(tx.type)}`}
                              aria-hidden
                            ></i>
                          </span>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <div>
                                <h5 className="card-title mb-1">
                                  {item.title}
                                </h5>
                                <p className="card-subtitle text-muted mb-0">
                                  {item.description}
                                </p>
                              </div>
                              <span
                                className={`badge ${statusBadgeClass(
                                  item.status
                                )}`}
                              >
                                {text.status[item.status] || text.status.failed}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="notification-card__money mt-3">
                          <span
                            className={`notification-amount ${
                              item.amount >= 0 ? "text-success" : "text-danger"
                            }`}
                          >
                            {prefix}
                            {amount}
                          </span>
                          <span className="notification-time">
                            <i
                              className="bi bi-clock-history me-1"
                              aria-hidden
                            ></i>
                            {formatTime(item.createdAt)}
                          </span>
                        </div>
                        <div className="notification-card__meta mt-3">
                          <div>
                            <small className="text-muted">{text.sender}</small>
                            <div>
                              {maskAccount(tx.fromUsername) || text.unknown}
                            </div>
                          </div>
                          <div>
                            <small className="text-muted">
                              {text.receiver}
                            </small>
                            <div>
                              {maskAccount(tx.toUsername) || text.unknown}
                            </div>
                          </div>
                          <div>
                            <small className="text-muted">
                              {text.transactionId}
                            </small>
                            <div className="fw-semibold">
                              #{tx.id || item.id}
                            </div>
                          </div>
                        </div>
                        {tx.description && (
                          <div className="notification-card__note mt-3">
                            <small className="text-muted d-block">
                              {text.note}
                            </small>
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
