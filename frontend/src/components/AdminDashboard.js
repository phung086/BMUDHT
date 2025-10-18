import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import LoaderOverlay from "./LoaderOverlay";
import ConfirmModal from "./ConfirmModal";
import Toast from "./Toast";

const DEFAULT_PAGE_SIZE = 10;

const columns = {
  users: [
    { key: "username", label: "Tài khoản" },
    { key: "email", label: "Email" },
    { key: "role", label: "Vai trò" },
    { key: "status", label: "Trạng thái" },
    { key: "balance", label: "Số dư" },
    { key: "actions", label: "Tác vụ" },
  ],
  transactions: [
    { key: "id", label: "Mã giao dịch" },
    { key: "type", label: "Loại" },
    { key: "amount", label: "Số tiền" },
    { key: "status", label: "Trạng thái" },
    { key: "createdAt", label: "Thời gian" },
    { key: "fromUser", label: "Người gửi" },
    { key: "toUser", label: "Người nhận" },
    { key: "description", label: "Ghi chú" },
  ],
  logs: [
    { key: "timestamp", label: "Thời gian" },
    { key: "username", label: "Tài khoản" },
    { key: "action", label: "Hành động" },
    { key: "ipAddress", label: "Địa chỉ IP" },
    { key: "details", label: "Chi tiết" },
  ],
};

const AdminDashboard = ({ onLogout }) => {
  const [selectedTab, setSelectedTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [tableActionLoading, setTableActionLoading] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    balance: "0",
  });

  const [passwordModal, setPasswordModal] = useState({
    show: false,
    user: null,
    password: "",
    submitting: false,
  });

  const [confirmConfig, setConfirmConfig] = useState({
    show: false,
    user: null,
    loading: false,
  });

  const [activityModal, setActivityModal] = useState({
    show: false,
    user: null,
    rows: [],
    page: 1,
    total: 0,
    loading: false,
  });

  const [toast, setToast] = useState({
    show: false,
    type: "info",
    message: "",
  });

  const activeData = useMemo(() => {
    switch (selectedTab) {
      case "transactions":
        return transactions;
      case "logs":
        return logs;
      case "users":
      default:
        return users;
    }
  }, [selectedTab, users, transactions, logs]);

  const activeColumns = columns[selectedTab];

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, type, message });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {
      page,
      limit: DEFAULT_PAGE_SIZE,
    };

    const trimmedSearch = filters.search.trim();
    if (trimmedSearch.length > 0) {
      params.search = trimmedSearch;
    }

    if (filters.status !== "all") {
      if (
        selectedTab === "users" &&
        ["active", "locked"].includes(filters.status)
      ) {
        params.status = filters.status;
      }
      if (
        selectedTab === "transactions" &&
        ["pending", "completed", "failed"].includes(filters.status)
      ) {
        params.status = filters.status;
      }
    }

    try {
      if (selectedTab === "users") {
        const res = await api.get("/api/admin/users", { params });
        setUsers(res.data?.users || []);
        setTotal(res.data?.total || 0);
      } else if (selectedTab === "transactions") {
        const res = await api.get("/api/admin/transactions", { params });
        setTransactions(res.data?.transactions || []);
        setTotal(res.data?.total || 0);
      } else {
        const res = await api.get("/api/admin/audit", { params });
        setLogs(res.data?.logs || []);
        setTotal(res.data?.total || 0);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Không thể tải dữ liệu quản trị. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.status, page, selectedTab]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get("/api/admin/summary");
      setSummary(res.data || null);
    } catch (err) {
      console.error("Không thể tải tổng quan quản trị:", err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleSearch = (event) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, search: value }));
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setFilters((prev) => ({ ...prev, status: event.target.value }));
    setPage(1);
  };

  const statusOptions = useMemo(() => {
    if (selectedTab === "users") {
      return [
        { value: "all", label: "Tất cả trạng thái" },
        { value: "active", label: "Hoạt động" },
        { value: "locked", label: "Đã khóa" },
      ];
    }
    if (selectedTab === "transactions") {
      return [
        { value: "all", label: "Tất cả trạng thái" },
        { value: "pending", label: "Đang xử lý" },
        { value: "completed", label: "Hoàn thành" },
        { value: "failed", label: "Thất bại" },
      ];
    }
    return [{ value: "all", label: "Tất cả" }];
  }, [selectedTab]);

  const handleRefresh = () => {
    loadSummary();
    fetchData();
  };

  const resetCreateForm = useCallback(() => {
    setCreateForm({
      username: "",
      email: "",
      password: "",
      role: "user",
      balance: "0",
    });
  }, []);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    const { username, email, password, role, balance } = createForm;
    if (!username || !email || !password) {
      showToast("Vui lòng điền đầy đủ thông tin", "error");
      return;
    }

    const parsedBalance = Number(balance || 0);
    if (Number.isNaN(parsedBalance) || parsedBalance < 0) {
      showToast("Số dư ban đầu không hợp lệ", "error");
      return;
    }

    setCreateSubmitting(true);
    try {
      await api.post("/api/admin/users", {
        username: username.trim(),
        email: email.trim(),
        password,
        role,
        balance: parsedBalance,
      });
      showToast("Đã tạo người dùng mới");
      setCreateModalOpen(false);
      resetCreateForm();
      loadSummary();
      fetchData();
    } catch (err) {
      const message =
        err.response?.data?.error ||
        "Không thể tạo người dùng. Vui lòng thử lại.";
      showToast(message, "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleToggleLock = useCallback(
    async (user) => {
      const nextStatus = user.status === "locked" ? "active" : "locked";
      setTableActionLoading(`lock-${user.id}`);
      try {
        await api.patch(`/api/admin/users/${user.id}/status`, {
          status: nextStatus,
        });
        showToast(
          nextStatus === "locked"
            ? `Đã khóa tài khoản ${user.username}`
            : `Đã mở khóa tài khoản ${user.username}`
        );
        loadSummary();
        fetchData();
      } catch (err) {
        const message =
          err.response?.data?.error ||
          "Không thể cập nhật trạng thái người dùng.";
        showToast(message, "error");
      } finally {
        setTableActionLoading(null);
      }
    },
    [fetchData, loadSummary, showToast]
  );

  const openPasswordModal = useCallback((user) => {
    setPasswordModal({ show: true, user, password: "", submitting: false });
  }, []);

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const { user, password } = passwordModal;
    if (!user || !password) {
      showToast("Vui lòng nhập mật khẩu mới", "error");
      return;
    }

    setPasswordModal((prev) => ({ ...prev, submitting: true }));
    try {
      await api.patch(`/api/admin/users/${user.id}/password`, { password });
      showToast(`Đã đổi mật khẩu cho ${user.username}`);
      setPasswordModal({
        show: false,
        user: null,
        password: "",
        submitting: false,
      });
    } catch (err) {
      const message = err.response?.data?.error || "Không thể đổi mật khẩu.";
      showToast(message, "error");
      setPasswordModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const openDeleteConfirm = useCallback((user) => {
    setConfirmConfig({ show: true, user, loading: false });
  }, []);

  const handleConfirmDelete = async () => {
    if (!confirmConfig.user) return;
    setConfirmConfig((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/api/admin/users/${confirmConfig.user.id}`);
      showToast(`Đã xóa người dùng ${confirmConfig.user.username}`);
      setConfirmConfig({ show: false, user: null, loading: false });
      loadSummary();
      fetchData();
    } catch (err) {
      const message = err.response?.data?.error || "Không thể xóa người dùng.";
      showToast(message, "error");
      setConfirmConfig((prev) => ({ ...prev, loading: false }));
    }
  };

  const loadUserTransactions = useCallback(
    async (user, targetPage = 1) => {
      if (!user) return;
      setActivityModal((prev) => ({
        ...prev,
        show: true,
        loading: true,
        user,
      }));
      try {
        const res = await api.get(`/api/admin/users/${user.id}/transactions`, {
          params: { page: targetPage, limit: DEFAULT_PAGE_SIZE },
        });
        setActivityModal({
          show: true,
          user: res.data?.user || user,
          rows: res.data?.transactions || [],
          page: res.data?.page || targetPage,
          total: res.data?.total || 0,
          loading: false,
        });
      } catch (err) {
        const message =
          err.response?.data?.error || "Không thể tải lịch sử giao dịch";
        showToast(message, "error");
        setActivityModal((prev) => ({ ...prev, loading: false }));
      }
    },
    [showToast]
  );

  const handleShowTransactions = useCallback(
    (user) => {
      loadUserTransactions(user, 1);
    },
    [loadUserTransactions]
  );

  const handleActivityPageChange = useCallback(
    (direction) => {
      if (!activityModal.user) return;
      const totalPages = Math.max(
        1,
        Math.ceil(activityModal.total / DEFAULT_PAGE_SIZE)
      );
      const nextPage = Math.min(
        totalPages,
        Math.max(1, activityModal.page + direction)
      );
      if (nextPage !== activityModal.page) {
        loadUserTransactions(activityModal.user, nextPage);
      }
    },
    [
      activityModal.page,
      activityModal.total,
      activityModal.user,
      loadUserTransactions,
    ]
  );

  const renderCell = useCallback(
    (column, row) => {
      const { key } = column;
      const value = row[key];

      if (key === "actions") {
        const isLocked = row.status === "locked";
        const lockBusy = tableActionLoading === `lock-${row.id}`;
        const deleteBusy =
          confirmConfig.loading && confirmConfig.user?.id === row.id;

        return (
          <div className="admin-table-actions">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={() => handleShowTransactions(row)}
            >
              Lịch sử
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => openPasswordModal(row)}
            >
              Đặt lại MK
            </button>
            <button
              type="button"
              className="btn btn-outline-warning btn-sm"
              onClick={() => handleToggleLock(row)}
              disabled={lockBusy}
            >
              {lockBusy ? "Đang..." : isLocked ? "Mở khóa" : "Khóa"}
            </button>
            {row.role !== "admin" && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => openDeleteConfirm(row)}
                disabled={deleteBusy}
              >
                {deleteBusy ? "Đang..." : "Xóa"}
              </button>
            )}
          </div>
        );
      }

      if (value === null || value === undefined || value === "") return "-";

      if (key === "amount" || key === "balance") {
        return Number(value || 0).toLocaleString("vi-VN", {
          style: "currency",
          currency: "VND",
          minimumFractionDigits: 0,
        });
      }

      if (key === "createdAt" || key === "timestamp") {
        return new Date(value).toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }

      if (key === "status") {
        const userStates = ["locked", "active"];
        if (userStates.includes(value)) {
          const isLocked = value === "locked";
          const label = isLocked ? "Đã khóa" : "Hoạt động";
          const tone = isLocked ? "danger" : "success";
          return (
            <span className={`badge bg-${tone}-subtle text-${tone}`}>
              {label}
            </span>
          );
        }

        const mapping = {
          completed: { label: "Hoàn thành", tone: "success" },
          pending: { label: "Đang xử lý", tone: "warning" },
          failed: { label: "Thất bại", tone: "danger" },
        };
        const meta = mapping[value] || { label: value, tone: "secondary" };
        return (
          <span className={`badge bg-${meta.tone}-subtle text-${meta.tone}`}>
            {meta.label}
          </span>
        );
      }

      if (key === "role") {
        return value === "admin" ? "Quản trị viên" : "Người dùng";
      }

      if (key === "type") {
        const labels = {
          transfer: "Chuyển khoản",
          deposit: "Nạp tiền",
          withdraw: "Rút tiền",
        };
        return labels[value] || value;
      }

      if (key === "details" || key === "description") {
        return (
          <span className="admin-dashboard__truncate" title={value}>
            {value}
          </span>
        );
      }

      if (key === "username" && (selectedTab === "logs" || row.action)) {
        return value || "Ẩn danh";
      }

      return value;
    },
    [
      confirmConfig.loading,
      confirmConfig.user,
      handleShowTransactions,
      handleToggleLock,
      openDeleteConfirm,
      openPasswordModal,
      selectedTab,
      tableActionLoading,
    ]
  );

  const summaryCards = useMemo(() => {
    if (!summary) return [];
    const formatNumber = (val) => Number(val || 0).toLocaleString("vi-VN");
    const volume = Number(summary.totalVolume || 0).toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    });

    return [
      {
        title: "Tổng người dùng",
        value: formatNumber(summary.totalUsers),
        caption: `${formatNumber(summary.adminUsers)} tài khoản quản trị`,
        icon: "bi-people-fill",
        tone: "primary",
      },
      {
        title: "Tài khoản bị khóa",
        value: formatNumber(summary.lockedUsers),
        caption: "Theo dõi đăng nhập bất thường",
        icon: "bi-shield-lock-fill",
        tone: "danger",
      },
      {
        title: "Giao dịch hoàn tất",
        value: formatNumber(summary.completedTransactions),
        caption: `${formatNumber(
          summary.totalTransactions
        )} giao dịch toàn hệ thống`,
        icon: "bi-arrow-left-right",
        tone: "success",
      },
      {
        title: "Doanh số lũy kế",
        value: volume,
        caption: `${formatNumber(
          summary.pendingTransactions
        )} đang xử lý, ${formatNumber(summary.failedTransactions)} thất bại`,
        icon: "bi-cash-stack",
        tone: "info",
      },
    ];
  }, [summary]);

  return (
    <div className="admin-dashboard-page">
      <header className="admin-dashboard__header">
        <div>
          <h1 className="admin-dashboard__title">Bảng điều khiển quản trị</h1>
          <p className="admin-dashboard__subtitle">
            Theo dõi hoạt động người dùng, giao dịch và nhật ký bảo mật trong
            thời gian thực.
          </p>
        </div>
        <div className="admin-dashboard__actions">
          {selectedTab === "users" && (
            <button
              className="btn btn-primary"
              onClick={() => setCreateModalOpen(true)}
              type="button"
            >
              <i className="bi bi-person-plus me-2" aria-hidden></i>
              Tạo người dùng
            </button>
          )}
          <button className="btn btn-light" onClick={handleRefresh}>
            <i className="bi bi-arrow-repeat me-2" aria-hidden></i>
            Làm mới
          </button>
          <button className="btn btn-outline-danger" onClick={onLogout}>
            <i className="bi bi-box-arrow-right me-2" aria-hidden></i>
            Đăng xuất
          </button>
        </div>
      </header>

      {summaryCards.length > 0 && (
        <section className="admin-dashboard__summary">
          {summaryCards.map((card) => (
            <article
              key={card.title}
              className={`admin-summary-card admin-summary-card--${card.tone} ${
                summaryLoading ? "is-loading" : ""
              }`}
            >
              <div className="admin-summary-card__icon" aria-hidden>
                <i className={`bi ${card.icon}`}></i>
              </div>
              <div className="admin-summary-card__body">
                <p className="admin-summary-card__title">{card.title}</p>
                <p className="admin-summary-card__value">{card.value}</p>
                <p className="admin-summary-card__caption">{card.caption}</p>
              </div>
            </article>
          ))}
        </section>
      )}

      <nav className="admin-dashboard__tabs">
        <button
          className={`admin-dashboard__tab ${
            selectedTab === "users" ? "is-active" : ""
          }`}
          onClick={() => {
            setSelectedTab("users");
            setPage(1);
            setFilters({ search: "", status: "all" });
          }}
        >
          Người dùng
        </button>
        <button
          className={`admin-dashboard__tab ${
            selectedTab === "transactions" ? "is-active" : ""
          }`}
          onClick={() => {
            setSelectedTab("transactions");
            setPage(1);
            setFilters({ search: "", status: "all" });
          }}
        >
          Giao dịch
        </button>
        <button
          className={`admin-dashboard__tab ${
            selectedTab === "logs" ? "is-active" : ""
          }`}
          onClick={() => {
            setSelectedTab("logs");
            setPage(1);
            setFilters({ search: "", status: "all" });
          }}
        >
          Nhật ký bảo mật
        </button>
      </nav>

      <section className="admin-dashboard__filters">
        <div className="form-floating">
          <input
            id="adminSearch"
            className="form-control"
            placeholder="Tìm kiếm"
            value={filters.search}
            onChange={handleSearch}
          />
          <label htmlFor="adminSearch">Tìm kiếm</label>
        </div>
        <div className="form-floating">
          <select
            id="adminStatus"
            className="form-select"
            value={filters.status}
            onChange={handleStatusChange}
            disabled={statusOptions.length === 1}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label htmlFor="adminStatus">Trạng thái</label>
        </div>
      </section>

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden></i>
          {error}
        </div>
      )}

      <div className="admin-dashboard__table card shadow-sm">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                {activeColumns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeColumns.length}
                    className="text-center text-muted py-4"
                  >
                    Không có dữ liệu.
                  </td>
                </tr>
              ) : (
                activeData.map((row, index) => (
                  <tr key={row.id || row.timestamp || index}>
                    {activeColumns.map((column) => (
                      <td key={column.key}>{renderCell(column, row)}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-dashboard__pagination">
          <span>
            Trang {page} / {Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))}
          </span>
          <div className="btn-group">
            <button
              className="btn btn-outline-primary"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              <i className="bi bi-chevron-left" aria-hidden></i>
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() =>
                setPage((prev) =>
                  prev * DEFAULT_PAGE_SIZE >= total ? prev : prev + 1
                )
              }
              disabled={page * DEFAULT_PAGE_SIZE >= total}
            >
              <i className="bi bi-chevron-right" aria-hidden></i>
            </button>
          </div>
        </div>
      </div>

      {loading && <LoaderOverlay message="Đang tải dữ liệu quản trị..." />}

      {createModalOpen && (
        <div className="modal-backdrop">
          <form className="modal-card admin-modal" onSubmit={handleCreateUser}>
            <h5>Thêm người dùng mới</h5>
            <div className="admin-form-grid">
              <div className="form-floating">
                <input
                  id="createUsername"
                  className="form-control"
                  placeholder="Tên đăng nhập"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  required
                />
                <label htmlFor="createUsername">Tên đăng nhập</label>
              </div>
              <div className="form-floating">
                <input
                  id="createEmail"
                  type="email"
                  className="form-control"
                  placeholder="Email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  required
                />
                <label htmlFor="createEmail">Email</label>
              </div>
            </div>
            <div className="admin-form-grid">
              <div className="form-floating">
                <input
                  id="createPassword"
                  type="password"
                  className="form-control"
                  placeholder="Mật khẩu tạm"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  required
                  minLength={6}
                />
                <label htmlFor="createPassword">Mật khẩu tạm</label>
              </div>
              <div className="form-floating">
                <select
                  id="createRole"
                  className="form-select"
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                >
                  <option value="user">Người dùng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
                <label htmlFor="createRole">Vai trò</label>
              </div>
            </div>
            <div className="form-floating">
              <input
                id="createBalance"
                type="number"
                min="0"
                className="form-control"
                placeholder="Số dư ban đầu"
                value={createForm.balance}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    balance: e.target.value,
                  }))
                }
              />
              <label htmlFor="createBalance">Số dư ban đầu (VND)</label>
            </div>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setCreateModalOpen(false);
                  resetCreateForm();
                }}
                disabled={createSubmitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createSubmitting}
              >
                {createSubmitting ? "Đang tạo..." : "Tạo người dùng"}
              </button>
            </div>
          </form>
        </div>
      )}

      {passwordModal.show && (
        <div className="modal-backdrop">
          <form
            className="modal-card admin-modal"
            onSubmit={handlePasswordSubmit}
          >
            <h5>Đặt lại mật khẩu</h5>
            <p className="text-muted">
              Tài khoản: <strong>{passwordModal.user?.username}</strong>
            </p>
            <div className="form-floating">
              <input
                id="resetPassword"
                type="password"
                className="form-control"
                placeholder="Mật khẩu mới"
                value={passwordModal.password}
                onChange={(e) =>
                  setPasswordModal((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                minLength={6}
                required
              />
              <label htmlFor="resetPassword">Mật khẩu mới</label>
            </div>
            <div className="admin-modal__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setPasswordModal({
                    show: false,
                    user: null,
                    password: "",
                    submitting: false,
                  })
                }
                disabled={passwordModal.submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordModal.submitting}
              >
                {passwordModal.submitting ? "Đang cập nhật..." : "Cập nhật"}
              </button>
            </div>
          </form>
        </div>
      )}

      {activityModal.show && (
        <div className="modal-backdrop">
          <div className="modal-card admin-modal admin-modal--wide">
            <div className="admin-modal__header">
              <div>
                <h5>Lịch sử giao dịch</h5>
                <p className="text-muted mb-0">
                  {activityModal.user?.username} · {activityModal.user?.email}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-light"
                onClick={() =>
                  setActivityModal({
                    show: false,
                    user: null,
                    rows: [],
                    page: 1,
                    total: 0,
                    loading: false,
                  })
                }
              >
                Đóng
              </button>
            </div>
            <div className="table-responsive admin-activity-table">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Loại</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    <th>Từ</th>
                    <th>Đến</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {activityModal.rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        Không có giao dịch.
                      </td>
                    </tr>
                  ) : (
                    activityModal.rows.map((tx) => (
                      <tr key={tx.id}>
                        <td>{tx.id}</td>
                        <td>{renderCell({ key: "type" }, tx)}</td>
                        <td>{renderCell({ key: "amount" }, tx)}</td>
                        <td>{renderCell({ key: "status" }, tx)}</td>
                        <td>{renderCell({ key: "createdAt" }, tx)}</td>
                        <td>{tx.fromUser || "-"}</td>
                        <td>{tx.toUser || "-"}</td>
                        <td>
                          <span
                            className="admin-dashboard__truncate"
                            title={tx.description}
                          >
                            {tx.description || "-"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="admin-dashboard__pagination">
              <span>
                Trang {activityModal.page} /{" "}
                {Math.max(
                  1,
                  Math.ceil(activityModal.total / DEFAULT_PAGE_SIZE)
                )}
              </span>
              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => handleActivityPageChange(-1)}
                  disabled={activityModal.page === 1 || activityModal.loading}
                >
                  <i className="bi bi-chevron-left" aria-hidden></i>
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => handleActivityPageChange(1)}
                  disabled={
                    activityModal.loading ||
                    activityModal.page * DEFAULT_PAGE_SIZE >=
                      activityModal.total
                  }
                >
                  <i className="bi bi-chevron-right" aria-hidden></i>
                </button>
              </div>
            </div>
            {activityModal.loading && (
              <div className="text-center py-3 admin-activity-loading">
                Đang tải...
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        show={confirmConfig.show}
        title="Xác nhận xóa người dùng"
        body={
          <>
            Bạn có chắc muốn xóa tài khoản{" "}
            <strong>{confirmConfig.user?.username}</strong>?
            <br /> Hành động này không thể hoàn tác.
          </>
        }
        confirming={confirmConfig.loading}
        onCancel={() =>
          setConfirmConfig({ show: false, user: null, loading: false })
        }
        onConfirm={handleConfirmDelete}
      />

      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </div>
  );
};

export default AdminDashboard;
