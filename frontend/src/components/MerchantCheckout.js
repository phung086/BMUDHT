import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import LoaderOverlay from "./LoaderOverlay";
import Toast from "./Toast";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  });

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

const transactionStatusMeta = {
  success: { label: "Thành công", tone: "danger" },
  pending: { label: "Đang xử lý", tone: "warning" },
  failed: { label: "Bị chặn", tone: "secondary" },
};

const MerchantCheckout = () => {
  const [timeline, setTimeline] = useState({
    otpSessions: [],
    fraudTransactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({
    show: false,
    type: "info",
    message: "",
  });

  const showToast = useCallback((message, type = "info") => {
    setToast({ show: true, type, message });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, show: false }));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/fraud/timeline");
      setTimeline({
        otpSessions: response.data?.otpSessions || [],
        fraudTransactions: response.data?.fraudTransactions || [],
      });
    } catch (err) {
      console.error("Merchant timeline load error:", err);
      showToast(
        err.response?.data?.error || "Không thể tải dữ liệu thanh toán",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const recentTransactions = useMemo(() => {
    return [...timeline.fraudTransactions]
      .sort(
        (a, b) =>
          new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
      )
      .slice(0, 6)
      .map((txn) => {
        const meta = transactionStatusMeta[txn.status] || {
          label: txn.status,
          tone: "secondary",
        };
        return {
          id: txn.id,
          amount: formatCurrency(txn.amount),
          executedAt: formatDateTime(txn.executedAt),
          statusLabel: meta.label,
          statusTone: meta.tone,
        };
      });
  }, [timeline.fraudTransactions]);

  const activeAlerts = useMemo(() => {
    return timeline.otpSessions
      .filter(
        (session) => session.status === "pending" || session.status === "shared"
      )
      .map((session) => ({
        id: session.id,
        status: session.status,
        merchant: session.merchant,
        amount: formatCurrency(session.amountTarget || 0),
        createdAt: formatDateTime(session.createdAt),
      }));
  }, [timeline.otpSessions]);

  return (
    <div className="page" role="main">
      <header className="page-header page-header--split">
        <div>
          <h1 className="page-title">Cổng thanh toán thương mại điện tử</h1>
          <p className="page-subtitle">
            Đây là góc nhìn của nhà bán hàng/nhà cung cấp dịch vụ thanh toán.
            Theo dõi các giao dịch gần đây và phát hiện tín hiệu bất thường.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={loadData}
        >
          <i className="bi bi-arrow-repeat me-1" aria-hidden></i>
          Làm mới dữ liệu
        </button>
      </header>

      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-4 align-items-center">
            <div className="col-md-6">
              <h2 className="h5 mb-2">Combo "Merchant Premium"</h2>
              <p className="text-muted mb-3">
                Gói dịch vụ xử lý thanh toán tốc độ cao, hỗ trợ trả góp 0% và
                quản lý rủi ro thời gian thực. Đây là trang mà kẻ gian đang nhắm
                tới để dựng kịch bản thanh toán giả mạo.
              </p>
              <ul className="list-unstyled small text-muted mb-0">
                <li>
                  <i className="bi bi-check-circle me-2 text-success"></i>
                  Tích hợp 3-D Secure & OTP qua SMS
                </li>
                <li>
                  <i className="bi bi-check-circle me-2 text-success"></i>
                  Bảng điều khiển cảnh báo gian lận tức thời
                </li>
                <li>
                  <i className="bi bi-check-circle me-2 text-success"></i>
                  Báo cáo doanh thu và phí theo thời gian thực
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <div className="card border-primary h-100">
                <div className="card-body">
                  <h3 className="h6 text-primary">Đơn hàng mô phỏng</h3>
                  <dl className="row small mb-0">
                    <dt className="col-sm-5">Sản phẩm</dt>
                    <dd className="col-sm-7">Gói API cao cấp 12 tháng</dd>
                    <dt className="col-sm-5">Giá trị</dt>
                    <dd className="col-sm-7">{formatCurrency(5000000)}</dd>
                    <dt className="col-sm-5">Phí xử lý</dt>
                    <dd className="col-sm-7">{formatCurrency(50000)}</dd>
                    <dt className="col-sm-5">Trạng thái</dt>
                    <dd className="col-sm-7">
                      {activeAlerts.length > 0 ? (
                        <span className="badge bg-warning-subtle text-warning">
                          Đang nghi vấn
                        </span>
                      ) : (
                        <span className="badge bg-success-subtle text-success">
                          An toàn
                        </span>
                      )}
                    </dd>
                  </dl>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={loadData}
                    >
                      Làm mới đối soát
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="h5 mb-0">Giao dịch gần nhất</h2>
            <span className="badge bg-secondary-subtle text-secondary">
              {recentTransactions.length} giao dịch hiển thị
            </span>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="text-muted mb-0">
              Chưa có giao dịch. Khi kẻ gian hoàn tất thanh toán giả, dữ liệu sẽ
              hiển thị tại đây.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Mã giao dịch</th>
                    <th>Giá trị</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>#{txn.id}</td>
                      <td>{txn.amount}</td>
                      <td>{txn.executedAt}</td>
                      <td>
                        <span
                          className={`badge bg-${txn.statusTone}-subtle text-${txn.statusTone}`}
                        >
                          {txn.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5 mb-3">Cảnh báo rủi ro đang mở</h2>
          {activeAlerts.length === 0 ? (
            <p className="text-muted mb-0">
              Chưa phát hiện tín hiệu nghi vấn. Khi kẻ gian gửi yêu cầu OTP, các
              cảnh báo sẽ xuất hiện tại đây.
            </p>
          ) : (
            <ol className="timeline">
              {activeAlerts.map((alert) => (
                <li key={alert.id} className="timeline__item">
                  <div className="timeline__badge bg-warning-subtle text-warning">
                    <i className="bi bi-shield-exclamation" aria-hidden></i>
                  </div>
                  <div className="timeline__content">
                    <h3 className="timeline__title">
                      OTP #{alert.id} chưa hoàn tất
                    </h3>
                    <p className="timeline__meta text-muted mb-1">
                      {alert.createdAt}
                    </p>
                    <p className="timeline__description mb-0">
                      Mục tiêu {alert.amount} tại {alert.merchant} · Trạng thái:{" "}
                      {alert.status}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {loading && (
        <LoaderOverlay message="Đang đồng bộ dữ liệu thương mại..." />
      )}
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </div>
  );
};

export default MerchantCheckout;
