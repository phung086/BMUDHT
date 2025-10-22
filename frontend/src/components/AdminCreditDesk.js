import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import LoaderOverlay from "./LoaderOverlay";
import Toast from "./Toast";

const statusOptions = [
  { value: "pending", label: "Đang chờ duyệt" },
  { value: "approved", label: "Đã phê duyệt" },
  { value: "rejected", label: "Bị từ chối" },
  { value: "all", label: "Tất cả" },
];

const statusBadge = (status) => {
  switch (status) {
    case "approved":
      return (
        <span className="badge bg-success-subtle text-success">
          Đã phê duyệt
        </span>
      );
    case "rejected":
      return (
        <span className="badge bg-danger-subtle text-danger">Từ chối</span>
      );
    default:
      return (
        <span className="badge bg-warning-subtle text-warning">Đang chờ</span>
      );
  }
};

const timelineTone = (status) => {
  if (status === "success") return "success";
  if (status === "consumed" || status === "shared") return "danger";
  if (status === "pending") return "warning";
  return "secondary";
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

const AdminCreditDesk = ({ onLogout }) => {
  const [status, setStatus] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [leakedCards, setLeakedCards] = useState([]);
  const [timeline, setTimeline] = useState({
    otpSessions: [],
    fraudTransactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState({});
  const [toast, setToast] = useState({
    show: false,
    type: "info",
    message: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });
  };

  const closeToast = () => setToast((prev) => ({ ...prev, show: false }));

  const loadData = async (desiredStatus = status) => {
    setLoading(true);
    try {
      const [reqRes, leakRes, timelineRes] = await Promise.all([
        api.get("/api/credit/requests", { params: { status: desiredStatus } }),
        api.get("/api/fraud/leaked-cards"),
        api.get("/api/fraud/timeline"),
      ]);
      setRequests(reqRes.data?.requests || []);
      setLeakedCards(leakRes.data?.cards || []);
      setTimeline({
        otpSessions: timelineRes.data?.otpSessions || [],
        fraudTransactions: timelineRes.data?.fraudTransactions || [],
      });
    } catch (err) {
      console.error("Load admin credit desk error:", err);
      showToast(
        err.response?.data?.error || "Không thể tải dữ liệu quản trị",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const startAction = (id, type) => {
    setActions((prev) => ({ ...prev, [`${type}-${id}`]: true }));
  };

  const finishAction = (id, type) => {
    setActions((prev) => {
      const next = { ...prev };
      delete next[`${type}-${id}`];
      return next;
    });
  };

  const handleApprove = async (requestId) => {
    startAction(requestId, "approve");
    try {
      await api.post(`/api/credit/requests/${requestId}/approve`, {
        creditLimit: 80000000,
      });
      showToast("Đã phê duyệt và phát hành thẻ tín dụng");
      await loadData(status);
    } catch (err) {
      showToast(
        err.response?.data?.error || "Không thể phê duyệt yêu cầu",
        "error"
      );
    } finally {
      finishAction(requestId, "approve");
    }
  };

  const handleReject = async (requestId) => {
    startAction(requestId, "reject");
    try {
      await api.post(`/api/credit/requests/${requestId}/reject`, {
        reason: "Thu nhập không đáp ứng tiêu chí (mô phỏng)",
      });
      showToast("Đã từ chối yêu cầu");
      await loadData(status);
    } catch (err) {
      showToast(
        err.response?.data?.error || "Không thể từ chối yêu cầu",
        "error"
      );
    } finally {
      finishAction(requestId, "reject");
    }
  };

  const handleLeak = async (cardId) => {
    startAction(cardId, "leak");
    try {
      await api.post(`/api/credit/cards/${cardId}/leak`, {
        note: "Nhân viên nội bộ làm rò rỉ (mô phỏng)",
      });
      showToast("Đã mô phỏng việc rò rỉ dữ liệu thẻ", "warning");
      await loadData(status);
    } catch (err) {
      showToast(
        err.response?.data?.error || "Không thể mô phỏng rò rỉ",
        "error"
      );
    } finally {
      finishAction(cardId, "leak");
    }
  };

  const pendingSessions = useMemo(
    () =>
      timeline.otpSessions.filter((session) => session.status !== "consumed"),
    [timeline]
  );

  const fraudEvents = useMemo(() => {
    const events = [];
    timeline.otpSessions.forEach((session) => {
      events.push({
        id: `otp-${session.id}`,
        date: session.createdAt,
        title: `OTP #${session.id} cho thẻ ${session.cardId}`,
        description: `Trạng thái: ${session.status}`,
        tone: timelineTone(session.status),
      });
      if (session.userSharedAt) {
        events.push({
          id: `otp-share-${session.id}`,
          date: session.userSharedAt,
          title: "Nạn nhân đã cung cấp OTP",
          description: `Thẻ ${session.cardId}`,
          tone: "danger",
        });
      }
      if (session.consumedAt) {
        events.push({
          id: `otp-consumed-${session.id}`,
          date: session.consumedAt,
          title: "OTP bị kẻ gian sử dụng",
          description: `Thẻ ${session.cardId}`,
          tone: "danger",
        });
      }
    });
    timeline.fraudTransactions.forEach((txn) => {
      events.push({
        id: `fraud-${txn.id}`,
        date: txn.executedAt,
        title: `Giao dịch giả mạo #${txn.id}`,
        description: `${formatNumber(txn.amount)} tại ${txn.merchant}`,
        tone: "danger",
      });
    });
    return events
      .filter((evt) => evt.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [timeline]);

  return (
    <div className="page" role="main">
      <header className="page-header page-header--split">
        <div>
          <h1 className="page-title">Quản trị thẻ tín dụng</h1>
          <p className="page-subtitle">
            Theo dõi hồ sơ khách hàng, phê duyệt phát hành thẻ, mô phỏng tình
            huống bị rò rỉ và phản ứng trước giao dịch giả mạo.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => loadData(status)}
          >
            <i className="bi bi-arrow-repeat me-1" aria-hidden></i>
            Làm mới
          </button>
          {onLogout && (
            <button type="button" className="btn btn-danger" onClick={onLogout}>
              <i className="bi bi-box-arrow-right me-1" aria-hidden></i>
              Đăng xuất
            </button>
          )}
        </div>
      </header>

      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between">
            <div>
              <h2 className="h5 mb-1">Danh sách yêu cầu mở thẻ</h2>
              <p className="text-muted mb-0">
                Lọc theo trạng thái để mô phỏng luồng xử lý thực tế.
              </p>
            </div>
            <div>
              <select
                className="form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="table-responsive mt-3">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Khách hàng</th>
                  <th>Thông tin liên lạc</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      Chưa có hồ sơ phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => {
                    const isApproved = req.status === "approved";
                    const hasCard = Boolean(req.card?.id);
                    const approveKey = `approve-${req.id}`;
                    const rejectKey = `reject-${req.id}`;
                    return (
                      <tr key={req.id}>
                        <td>#{req.id}</td>
                        <td>
                          <div className="fw-semibold">{req.fullName}</div>
                          <small className="text-muted">
                            User #{req.user?.id}
                          </small>
                        </td>
                        <td>
                          <div>{req.email}</div>
                          <div>{req.phone}</div>
                          <small className="text-muted">
                            CCCD: {req.nationalId}
                          </small>
                        </td>
                        <td>{statusBadge(req.status)}</td>
                        <td>{formatDate(req.createdAt)}</td>
                        <td>
                          <div className="d-flex gap-2 flex-wrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              disabled={isApproved || actions[approveKey]}
                              onClick={() => handleApprove(req.id)}
                            >
                              {actions[approveKey]
                                ? "Đang phê duyệt..."
                                : "Phê duyệt"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              disabled={
                                req.status !== "pending" || actions[rejectKey]
                              }
                              onClick={() => handleReject(req.id)}
                            >
                              {actions[rejectKey]
                                ? "Đang từ chối..."
                                : "Từ chối"}
                            </button>
                            {hasCard && (
                              <button
                                type="button"
                                className="btn btn-sm btn-warning"
                                disabled={actions[`leak-${req.card.id}`]}
                                onClick={() => handleLeak(req.card.id)}
                              >
                                {actions[`leak-${req.card.id}`]
                                  ? "Đang mô phỏng rò rỉ..."
                                  : "Mô phỏng rò rỉ"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Danh sách thẻ đã rò rỉ</h2>
          {leakedCards.length === 0 ? (
            <p className="text-muted mb-0">
              Chưa có thẻ bị rò rỉ. Hãy sử dụng nút "Mô phỏng rò rỉ" phía trên.
            </p>
          ) : (
            <div className="row g-3">
              {leakedCards.map((card) => (
                <div key={card.id} className="col-md-6">
                  <div className="card border-danger h-100">
                    <div className="card-body">
                      <h3 className="h6 text-danger mb-3">
                        <i className="bi bi-bug" aria-hidden></i> Thẻ #{card.id}
                      </h3>
                      <dl className="row mb-0 small">
                        <dt className="col-sm-5">Số thẻ</dt>
                        <dd className="col-sm-7">{card.cardNumber}</dd>
                        <dt className="col-sm-5">CVV</dt>
                        <dd className="col-sm-7">{card.cvv}</dd>
                        <dt className="col-sm-5">Expiry</dt>
                        <dd className="col-sm-7">
                          {String(card.expiryMonth).padStart(2, "0")}/
                          {card.expiryYear}
                        </dd>
                        <dt className="col-sm-5">Chủ thẻ</dt>
                        <dd className="col-sm-7">{card.fullName}</dd>
                        <dt className="col-sm-5">Liên hệ</dt>
                        <dd className="col-sm-7">
                          {card.email} / {card.phone}
                        </dd>
                        <dt className="col-sm-5">Rò rỉ lúc</dt>
                        <dd className="col-sm-7">
                          {formatDate(card.leakedAt)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
            <div>
              <h2 className="h5 mb-1">Dòng thời gian tấn công</h2>
              <p className="text-muted mb-0">
                Theo dõi từng bước: rò rỉ → gọi OTP → nạn nhân mắc bẫy → giao
                dịch thành công.
              </p>
            </div>
            <div className="text-end">
              <div className="fw-semibold">Phiên OTP đang mở</div>
              <div>{pendingSessions.length}</div>
            </div>
          </div>
          {fraudEvents.length === 0 ? (
            <p className="text-muted mb-0">
              Chưa có dữ liệu. Hãy khởi tạo OTP và hoàn tất giao dịch giả mạo ở
              tab kẻ gian.
            </p>
          ) : (
            <ol className="timeline">
              {fraudEvents.map((event) => (
                <li key={event.id} className="timeline__item">
                  <div
                    className={`timeline__badge bg-${event.tone}-subtle text-${event.tone}`}
                  >
                    <i className="bi bi-lightning-charge" aria-hidden></i>
                  </div>
                  <div className="timeline__content">
                    <h3 className="timeline__title">{event.title}</h3>
                    <p className="timeline__meta text-muted mb-1">
                      {formatDate(event.date)}
                    </p>
                    <p className="timeline__description mb-0">
                      {event.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {loading && <LoaderOverlay message="Đang tải dữ liệu quản trị..." />}
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </div>
  );
};

export default AdminCreditDesk;
