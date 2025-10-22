import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import LoaderOverlay from "./LoaderOverlay";
import Toast from "./Toast";

const defaultForm = {
  fullName: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  nationalId: "",
  incomeLevel: "",
};

const defaultUnlockForm = {
  cardId: "",
  fullName: "",
  dateOfBirth: "",
  email: "",
  phone: "",
  nationalId: "",
  otpCode: "",
};

const defaultUnlockState = {
  request: null,
  loading: false,
  submitting: false,
  verifying: false,
};

const defaultReportReason =
  "Tôi nhận cuộc gọi yêu cầu đọc OTP nhưng nghi ngờ lừa đảo.";

const statusMeta = {
  pending: { label: "Đang chờ duyệt", tone: "warning" },
  approved: { label: "Đã phê duyệt", tone: "success" },
  rejected: { label: "Bị từ chối", tone: "danger" },
};

const badge = (value, tone = "secondary") => (
  <span className={`badge bg-${tone}-subtle text-${tone}`}>{value}</span>
);

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

const CreditPortal = () => {
  const [form, setForm] = useState(defaultForm);
  const [requests, setRequests] = useState([]);
  const [cards, setCards] = useState([]);
  const [otpSession, setOtpSession] = useState(null);
  const [timeline, setTimeline] = useState({
    requests: [],
    cards: [],
    otpSessions: [],
    fraudTransactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState(defaultReportReason);
  const [unlockForm, setUnlockForm] = useState(defaultUnlockForm);
  const [unlockState, setUnlockState] = useState(defaultUnlockState);
  const [toast, setToast] = useState({
    show: false,
    type: "info",
    message: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });
  };

  const closeToast = () => setToast((prev) => ({ ...prev, show: false }));

  const resetUnlockState = () => {
    setUnlockState(defaultUnlockState);
    setUnlockForm((prev) => ({ ...prev, otpCode: "" }));
  };

  const loadUnlockStatus = async (cardId, { silent = false } = {}) => {
    if (!cardId) return;
    if (!silent) {
      setUnlockState((prev) => ({ ...prev, loading: true }));
    }
    try {
      const res = await api.get("/api/credit/unlock/status", {
        params: { cardId },
      });
      const request = res.data?.request || null;
      setUnlockState({
        request,
        loading: false,
        submitting: false,
        verifying: false,
      });
      setUnlockForm((prev) => ({
        ...prev,
        cardId: res.data?.card?.id || cardId,
        otpCode: request && request.status === "pending" ? prev.otpCode : "",
      }));
    } catch (err) {
      console.error("Load unlock status error:", err);
      setUnlockState((prev) => ({ ...prev, loading: false }));
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, cardRes, otpRes, timelineRes] = await Promise.all([
        api.get("/api/credit/requests/me"),
        api.get("/api/credit/cards/me"),
        api.get("/api/credit/otp/pending"),
        api.get("/api/credit/timeline"),
      ]);
      const fetchedRequests = reqRes.data?.requests || [];
      const fetchedCards = cardRes.data?.cards || [];
      setRequests(fetchedRequests);
      setCards(fetchedCards);
      setOtpSession(otpRes.data?.session || null);
      setTimeline({
        requests: timelineRes.data?.requests || [],
        cards: timelineRes.data?.cards || [],
        otpSessions: timelineRes.data?.otpSessions || [],
        fraudTransactions: timelineRes.data?.fraudTransactions || [],
      });

      const latestRequest =
        fetchedRequests.length > 0 ? fetchedRequests[0] : null;
      const latestCard = fetchedCards.length > 0 ? fetchedCards[0] : null;

      if (latestRequest) {
        setForm((prev) => ({
          ...prev,
          fullName: latestRequest.fullName || prev.fullName,
          email: latestRequest.email || prev.email,
          phone: latestRequest.phone || prev.phone,
          nationalId: latestRequest.nationalId || prev.nationalId,
          dateOfBirth: latestRequest.dateOfBirth || prev.dateOfBirth,
          incomeLevel: latestRequest.incomeLevel || prev.incomeLevel,
        }));
        setUnlockForm((prev) => ({
          ...prev,
          fullName: latestRequest.fullName || prev.fullName,
          email: latestRequest.email || prev.email,
          phone: latestRequest.phone || prev.phone,
          nationalId: latestRequest.nationalId || prev.nationalId,
          dateOfBirth: latestRequest.dateOfBirth || prev.dateOfBirth,
          cardId: latestCard ? latestCard.id : prev.cardId,
          otpCode: "",
        }));
      } else if (latestCard) {
        setUnlockForm((prev) => ({
          ...prev,
          cardId: latestCard.id,
          otpCode: "",
        }));
      } else {
        setUnlockForm((prev) => ({
          ...prev,
          cardId: "",
          otpCode: "",
        }));
      }

      if (latestCard && latestCard.status === "blocked") {
        await loadUnlockStatus(latestCard.id, { silent: true });
      } else {
        resetUnlockState();
      }
    } catch (err) {
      console.error("Load credit portal data error:", err);
      showToast(
        err.response?.data?.error || "Không thể tải dữ liệu thẻ tín dụng",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setReportReason(defaultReportReason);
  }, [otpSession?.id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/api/credit/requests", {
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        email: form.email,
        phone: form.phone,
        nationalId: form.nationalId,
        incomeLevel: form.incomeLevel,
      });
      showToast("Đã gửi yêu cầu mở thẻ. Bộ phận thẩm định sẽ xem xét.");
      await loadData();
    } catch (err) {
      showToast(
        err.response?.data?.error || "Không thể gửi yêu cầu mở thẻ",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareOtp = async () => {
    if (!otpSession) return;
    setSharing(true);
    try {
      await api.post("/api/credit/otp/share", {
        sessionId: otpSession.id,
        otpCode: otpSession.otpCode,
      });
      showToast(
        "Bạn đã cung cấp OTP (mô phỏng). Hãy xem điều gì xảy ra...",
        "warning"
      );
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Không thể xác nhận OTP", "error");
    } finally {
      setSharing(false);
    }
  };

  const handleReportReasonChange = (event) => {
    setReportReason(event.target.value);
  };

  const handleReportOtp = async () => {
    if (!otpSession) return;
    const trimmedReason = reportReason.trim();
    if (!trimmedReason) {
      showToast(
        "Vui lòng mô tả ngắn gọn lý do nghi ngờ trước khi báo cáo.",
        "error"
      );
      return;
    }
    setReporting(true);
    try {
      await api.post("/api/credit/otp/report", {
        sessionId: otpSession.id,
        reason: trimmedReason,
      });
      showToast(
        "Đã khóa thẻ tạm thời và báo cáo cuộc gọi đáng ngờ.",
        "success"
      );
      setReportReason(defaultReportReason);
      await loadData();
    } catch (err) {
      showToast(
        err.response?.data?.error || "Không thể báo cáo OTP nghi ngờ",
        "error"
      );
    } finally {
      setReporting(false);
    }
  };

  const handleUnlockFieldChange = (event) => {
    const { name, value } = event.target;
    setUnlockForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUnlockRequest = async (event) => {
    event.preventDefault();
    if (!unlockForm.cardId) {
      showToast("Không xác định được thẻ cần mở khóa", "error");
      return;
    }
    setUnlockState((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await api.post("/api/credit/unlock/request", {
        cardId: unlockForm.cardId,
        fullName: unlockForm.fullName,
        dateOfBirth: unlockForm.dateOfBirth,
        email: unlockForm.email,
        phone: unlockForm.phone,
        nationalId: unlockForm.nationalId,
      });
      showToast(res.data?.message || "Đã gửi OTP mở khóa thẻ");
      setUnlockState({
        request: res.data?.request || null,
        loading: false,
        submitting: false,
        verifying: false,
      });
      setUnlockForm((prev) => ({
        ...prev,
        cardId: res.data?.request?.cardId || prev.cardId,
        otpCode: "",
      }));
    } catch (err) {
      showToast(
        err.response?.data?.error || "Không thể tạo yêu cầu mở khóa",
        "error"
      );
      setUnlockState((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleUnlockVerify = async (event) => {
    event.preventDefault();
    const unlockRequest = unlockState.request;
    if (!unlockRequest) {
      showToast("Chưa có yêu cầu mở khóa cần xác thực", "error");
      return;
    }
    const trimmedOtp = unlockForm.otpCode.trim();
    if (!trimmedOtp) {
      showToast("Vui lòng nhập mã OTP mở khóa", "error");
      return;
    }
    setUnlockState((prev) => ({ ...prev, verifying: true }));
    try {
      const res = await api.post("/api/credit/unlock/verify", {
        requestId: unlockRequest.id,
        otpCode: trimmedOtp,
      });
      showToast(res.data?.message || "Đã mở khóa thẻ thành công");
      setUnlockForm((prev) => ({ ...prev, otpCode: "" }));
      setUnlockState({
        request: res.data?.request || null,
        loading: false,
        submitting: false,
        verifying: false,
      });
      await loadData();
    } catch (err) {
      showToast(
        err.response?.data?.error || "Không thể xác thực OTP mở khóa",
        "error"
      );
      const responseRequest = err.response?.data?.request || null;
      if (responseRequest) {
        setUnlockState({
          request: responseRequest,
          loading: false,
          submitting: false,
          verifying: false,
        });
      } else {
        setUnlockState((prev) => ({ ...prev, verifying: false }));
      }
    }
  };

  const activeCard = cards.length > 0 ? cards[0] : null;
  const unlockRequest = unlockState.request;
  const isCardBlocked = activeCard?.status === "blocked";
  const pendingRequests = useMemo(
    () => requests.filter((req) => req.status === "pending"),
    [requests]
  );

  const timelineEvents = useMemo(() => {
    const events = [];
    timeline.requests.forEach((req) => {
      events.push({
        id: `req-${req.id}`,
        date: req.createdAt,
        title: `Yêu cầu mở thẻ #${req.id}`,
        description: statusMeta[req.status]?.label || req.status,
        tone: statusMeta[req.status]?.tone || "secondary",
      });
      if (req.card && req.card.createdAt) {
        events.push({
          id: `card-${req.card.id}`,
          date: req.card.createdAt,
          title: "Thẻ tín dụng được phát hành",
          description: `Số thẻ (ẩn): ${req.card.maskedNumber}`,
          tone: "success",
        });
      }
    });

    timeline.cards.forEach((card) => {
      if (card.leakedAt) {
        events.push({
          id: `leak-${card.id}`,
          date: card.leakedAt,
          title: "Dữ liệu thẻ bị rò rỉ",
          description: `Trạng thái: ${card.status}`,
          tone: "danger",
        });
      }
    });

    timeline.otpSessions.forEach((session) => {
      events.push({
        id: `otp-${session.id}`,
        date: session.createdAt,
        title: "Đối tượng lừa đảo yêu cầu OTP",
        description: `Trạng thái: ${session.status}`,
        tone: "warning",
      });
      if (session.userSharedAt) {
        events.push({
          id: `otp-share-${session.id}`,
          date: session.userSharedAt,
          title: "Người dùng đã cung cấp OTP",
          description: "Đây là bước rủi ro cao",
          tone: "danger",
        });
      }
      if (session.consumedAt) {
        events.push({
          id: `otp-used-${session.id}`,
          date: session.consumedAt,
          title: "OTP đã bị lợi dụng",
          description: "Mã đã được dùng để xác thực giao dịch",
          tone: "danger",
        });
      }
      if (session.defenseAction === "blocked") {
        events.push({
          id: `otp-block-${session.id}`,
          date: session.expiresAt || session.createdAt,
          title: "Bạn đã báo cáo OTP đáng ngờ",
          description: session.defenseReason
            ? `Thẻ bị khóa: ${session.defenseReason}`
            : "Thẻ tạm thời bị khóa và giao dịch đã được chặn",
          tone: "success",
        });
      }
    });

    timeline.fraudTransactions.forEach((txn) => {
      const amountLabel = Number(txn.amount || 0).toLocaleString("vi-VN");
      const isBlocked = txn.status === "failed";
      events.push({
        id: `fraud-${txn.id}`,
        date: txn.executedAt,
        title: isBlocked
          ? "Giao dịch giả mạo đã bị chặn"
          : "Giao dịch giả mạo thành công",
        description: isBlocked
          ? txn.description ||
            `Hệ thống chặn ${amountLabel} VND tại ${txn.merchant}`
          : `Số tiền: ${amountLabel} VND tại ${txn.merchant}`,
        tone: isBlocked ? "success" : "danger",
      });
    });

    return events
      .filter((evt) => evt.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [timeline]);

  const latestDefense = useMemo(() => {
    const reversedSessions = [...timeline.otpSessions].reverse();
    for (const session of reversedSessions) {
      if (session.defenseAction === "blocked") {
        return {
          reason: session.defenseReason,
          at: session.expiresAt || session.createdAt,
        };
      }
    }
    return null;
  }, [timeline.otpSessions]);

  const allowNewRequest = pendingRequests.length === 0;

  return (
    <div className="page" role="main">
      <header className="page-header">
        <h1 className="page-title">Dịch vụ thẻ tín dụng</h1>
        <p className="page-subtitle">
          Mô phỏng quy trình mở thẻ và các rủi ro khi bị lừa cung cấp mã OTP.
          Hãy trải nghiệm và rút ra bài học bảo mật.
        </p>
      </header>

      {activeCard && (
        <section className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h5 mb-3">
              <i className="bi bi-credit-card-2-front me-2" aria-hidden></i>
              Thẻ tín dụng của bạn
            </h2>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="credit-card__glow">
                  <p className="text-uppercase text-muted mb-1">Số thẻ</p>
                  <p className="fs-4 fw-bold">{activeCard.maskedNumber}</p>
                  <div className="d-flex justify-content-between">
                    <div>
                      <small className="text-muted">Hiệu lực đến</small>
                      <p className="mb-0 fw-semibold">
                        {String(activeCard.expiryMonth).padStart(2, "0")}/{" "}
                        {activeCard.expiryYear}
                      </p>
                    </div>
                    <div className="text-end">
                      <small className="text-muted">Trạng thái</small>
                      <p className="mb-0">
                        {badge(
                          activeCard.status,
                          activeCard.status === "active" ? "success" : "danger"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-8">
                <div className="alert alert-warning" role="alert">
                  <strong>Lưu ý:</strong> Thông tin thẻ này đang được dùng trong
                  phần demo. Vui lòng không cung cấp mã OTP cho bất kỳ ai kể cả
                  khi họ tự xưng là nhân viên ngân hàng.
                </div>
                <dl className="row mb-0">
                  <dt className="col-sm-4">Hạn mức mô phỏng</dt>
                  <dd className="col-sm-8">
                    {Number(activeCard.creditLimit || 0).toLocaleString(
                      "vi-VN"
                    )}{" "}
                    VND
                  </dd>
                  <dt className="col-sm-4">Ngày tạo</dt>
                  <dd className="col-sm-8">
                    {formatDateTime(activeCard.createdAt)}
                  </dd>
                  {activeCard.leakedAt && (
                    <>
                      <dt className="col-sm-4 text-danger">Bị rò rỉ lúc</dt>
                      <dd className="col-sm-8 text-danger fw-semibold">
                        {formatDateTime(activeCard.leakedAt)}
                      </dd>
                    </>
                  )}
                </dl>
                {activeCard.status === "blocked" && (
                  <div className="alert alert-danger mt-3" role="alert">
                    Thẻ đã bị khóa tạm thời do báo cáo mã OTP nghi ngờ. Liên hệ
                    ngân hàng để mở khóa sau khi xác minh.
                    {latestDefense?.reason && (
                      <>
                        <br />
                        <strong>Lý do: </strong>
                        {latestDefense.reason}
                      </>
                    )}
                    {latestDefense?.at && (
                      <>
                        <br />
                        <strong>Thời điểm khóa:</strong>{" "}
                        {formatDateTime(latestDefense.at)}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h2 className="h5 mb-1">Đăng ký mở thẻ mới</h2>
              <p className="text-muted mb-0">
                Cung cấp thông tin cá nhân để mô phỏng quá trình thẩm định. Dữ
                liệu này sẽ hiển thị trong phần quản trị.
              </p>
            </div>
            <div>
              {pendingRequests.length > 0
                ? badge("Đang có hồ sơ chờ duyệt", "warning")
                : badge("Có thể đăng ký", "success")}
            </div>
          </div>
          <form className="row g-3" onSubmit={handleSubmit}>
            <div className="col-md-6">
              <label className="form-label" htmlFor="fullName">
                Họ và tên
              </label>
              <input
                id="fullName"
                name="fullName"
                className="form-control"
                value={form.fullName}
                onChange={handleChange}
                required
                disabled={!allowNewRequest || submitting}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="dateOfBirth">
                Ngày sinh
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                className="form-control"
                value={form.dateOfBirth}
                onChange={handleChange}
                required
                disabled={!allowNewRequest || submitting}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label" htmlFor="nationalId">
                CCCD / CMND
              </label>
              <input
                id="nationalId"
                name="nationalId"
                className="form-control"
                value={form.nationalId}
                onChange={handleChange}
                required
                disabled={!allowNewRequest || submitting}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="email">
                Email liên hệ
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={handleChange}
                required
                disabled={!allowNewRequest || submitting}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="phone">
                Số điện thoại
              </label>
              <input
                id="phone"
                name="phone"
                className="form-control"
                value={form.phone}
                onChange={handleChange}
                required
                disabled={!allowNewRequest || submitting}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="incomeLevel">
                Thu nhập (tùy chọn)
              </label>
              <input
                id="incomeLevel"
                name="incomeLevel"
                className="form-control"
                value={form.incomeLevel}
                onChange={handleChange}
                disabled={!allowNewRequest || submitting}
              />
            </div>
            <div className="col-12 d-flex justify-content-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!allowNewRequest || submitting}
              >
                {submitting ? "Đang gửi hồ sơ..." : "Gửi yêu cầu"}
              </button>
            </div>
          </form>
          {!allowNewRequest && (
            <div className="alert alert-info mt-3" role="alert">
              Bạn đang có hồ sơ chờ duyệt. Vui lòng theo dõi phần tiến trình bên
              dưới.
            </div>
          )}
        </div>
      </section>

      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Tiến trình xử lý hồ sơ</h2>
          {requests.length === 0 ? (
            <p className="text-muted mb-0">
              Chưa có yêu cầu nào. Vui lòng gửi hồ sơ để bắt đầu mô phỏng.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Mã hồ sơ</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Thẻ liên quan</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td>#{req.id}</td>
                      <td>
                        {badge(
                          statusMeta[req.status]?.label || req.status,
                          statusMeta[req.status]?.tone
                        )}
                      </td>
                      <td>{formatDateTime(req.createdAt)}</td>
                      <td>
                        {req.card ? req.card.maskedNumber : "Chưa phát hành"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {otpSession && (
        <section className="card shadow-sm mb-4 border-danger">
          <div className="card-body">
            <div className="d-flex align-items-center gap-3 mb-3">
              <div className="alert-icon bg-danger text-white">
                <i className="bi bi-exclamation-triangle" aria-hidden></i>
              </div>
              <div>
                <h2 className="h5 mb-1 text-danger">Cảnh báo lừa đảo OTP</h2>
                <p className="text-muted mb-0">
                  Có người tự xưng là "Ngân hàng" yêu cầu bạn đọc mã OTP để kích
                  hoạt thẻ. Đây là chiêu trò rất phổ biến!
                </p>
              </div>
            </div>
            <div className="row g-4 align-items-center">
              <div className="col-md-6">
                <div className="otp-box">
                  <span className="otp-box__label">Mã OTP bạn vừa nhận:</span>
                  <span className="otp-box__code">{otpSession.otpCode}</span>
                  <small className="text-muted">
                    OTP sẽ hết hạn lúc {formatDateTime(otpSession.expiresAt)}
                  </small>
                </div>
              </div>
              <div className="col-md-6">
                <p className="mb-3">
                  Nếu bạn nhấn nút dưới đây, hệ thống sẽ ghi nhận rằng bạn đã
                  tiết lộ OTP. Kẻ gian sẽ lập tức thanh toán giả mạo.
                </p>
                <div className="d-flex flex-column flex-md-row gap-3">
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={handleShareOtp}
                    disabled={sharing || reporting}
                  >
                    {sharing
                      ? "Đang gửi OTP cho kẻ gian..."
                      : "Tôi đã cung cấp OTP (mô phỏng)"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleReportOtp}
                    disabled={reporting || sharing}
                  >
                    {reporting
                      ? "Đang khóa thẻ & báo cáo..."
                      : "Tôi nghi ngờ, khóa thẻ & báo cáo"}
                  </button>
                </div>
                <div className="mt-3">
                  <label className="form-label" htmlFor="reportReason">
                    Lý do báo cáo (ghi chú)
                  </label>
                  <textarea
                    id="reportReason"
                    className="form-control"
                    rows={3}
                    value={reportReason}
                    onChange={handleReportReasonChange}
                    disabled={reporting}
                  />
                  <small className="text-muted">
                    Hệ thống sẽ khóa thẻ ngay lập tức, ghi lại báo cáo và chặn
                    mọi giao dịch đang chờ.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {isCardBlocked && (
        <section className="card shadow-sm mb-4 border-info">
          <div className="card-body">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h2 className="h5 mb-1">Mở khóa thẻ đã bị khóa tạm thời</h2>
                <p className="text-muted mb-0">
                  Kiểm tra và nhập lại thông tin hồ sơ, sau đó xác nhận OTP mô
                  phỏng để kích hoạt lại thẻ.
                </p>
              </div>
              {unlockState.loading && (
                <span className="badge bg-info-subtle text-info">
                  Đang tải trạng thái yêu cầu...
                </span>
              )}
            </div>

            <form className="row g-3" onSubmit={handleUnlockRequest}>
              <div className="col-md-6">
                <label className="form-label" htmlFor="unlockFullName">
                  Họ và tên đăng ký thẻ
                </label>
                <input
                  id="unlockFullName"
                  name="fullName"
                  className="form-control"
                  value={unlockForm.fullName}
                  onChange={handleUnlockFieldChange}
                  required
                  disabled={
                    unlockState.submitting ||
                    unlockRequest?.status === "pending"
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="unlockDateOfBirth">
                  Ngày sinh
                </label>
                <input
                  id="unlockDateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  className="form-control"
                  value={unlockForm.dateOfBirth}
                  onChange={handleUnlockFieldChange}
                  required
                  disabled={
                    unlockState.submitting ||
                    unlockRequest?.status === "pending"
                  }
                />
              </div>
              <div className="col-md-3">
                <label className="form-label" htmlFor="unlockNationalId">
                  CCCD / CMND
                </label>
                <input
                  id="unlockNationalId"
                  name="nationalId"
                  className="form-control"
                  value={unlockForm.nationalId}
                  onChange={handleUnlockFieldChange}
                  required
                  disabled={
                    unlockState.submitting ||
                    unlockRequest?.status === "pending"
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="unlockEmail">
                  Email liên hệ
                </label>
                <input
                  id="unlockEmail"
                  name="email"
                  type="email"
                  className="form-control"
                  value={unlockForm.email}
                  onChange={handleUnlockFieldChange}
                  required
                  disabled={
                    unlockState.submitting ||
                    unlockRequest?.status === "pending"
                  }
                />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="unlockPhone">
                  Số điện thoại
                </label>
                <input
                  id="unlockPhone"
                  name="phone"
                  className="form-control"
                  value={unlockForm.phone}
                  onChange={handleUnlockFieldChange}
                  required
                  disabled={
                    unlockState.submitting ||
                    unlockRequest?.status === "pending"
                  }
                />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button
                  type="submit"
                  className="btn btn-info w-100"
                  disabled={
                    unlockState.submitting ||
                    unlockRequest?.status === "pending"
                  }
                >
                  {unlockState.submitting
                    ? "Đang tạo yêu cầu..."
                    : unlockRequest?.status === "pending"
                    ? "OTP đã được gửi"
                    : "Gửi yêu cầu mở khóa"}
                </button>
              </div>
            </form>

            {unlockRequest && (
              <div className="alert alert-info mt-4" role="alert">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Trạng thái yêu cầu: {unlockRequest.status}</strong>
                  <small>
                    Hết hạn lúc {formatDateTime(unlockRequest.expiresAt)}
                  </small>
                </div>
                {unlockRequest.status === "pending" && (
                  <p className="mb-2">
                    OTP mô phỏng: <strong>{unlockRequest.otpCode}</strong>
                  </p>
                )}
                {unlockRequest.status === "failed" && (
                  <p className="text-danger mb-2">
                    Bạn đã nhập sai OTP quá giới hạn. Vui lòng gửi lại yêu cầu
                    mới.
                  </p>
                )}
                {unlockRequest.status === "verified" && (
                  <p className="text-success mb-2">
                    Đã xác minh thành công. Thẻ sẽ được kích hoạt lại ngay khi
                    hệ thống cập nhật.
                  </p>
                )}

                {unlockRequest.status === "pending" && (
                  <form className="row g-3" onSubmit={handleUnlockVerify}>
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="unlockOtp">
                        Nhập mã OTP mở khóa
                      </label>
                      <input
                        id="unlockOtp"
                        name="otpCode"
                        className="form-control"
                        value={unlockForm.otpCode}
                        onChange={handleUnlockFieldChange}
                        required
                        disabled={unlockState.verifying}
                      />
                    </div>
                    <div className="col-md-6 d-flex align-items-end gap-2">
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={unlockState.verifying}
                      >
                        {unlockState.verifying
                          ? "Đang xác thực OTP..."
                          : "Xác nhận mở khóa"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => loadUnlockStatus(activeCard?.id)}
                        disabled={unlockState.verifying}
                      >
                        Làm mới trạng thái
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5 mb-3">Dòng thời gian sự cố</h2>
          {timelineEvents.length === 0 ? (
            <p className="text-muted mb-0">
              Tiến trình sẽ hiển thị ở đây: gửi hồ sơ → phê duyệt → rò rỉ dữ
              liệu → lừa OTP → mất tiền.
            </p>
          ) : (
            <ol className="timeline">
              {timelineEvents.map((event) => (
                <li key={event.id} className="timeline__item">
                  <div
                    className={`timeline__badge bg-${event.tone}-subtle text-${event.tone}`}
                  >
                    <i className="bi bi-dot" aria-hidden></i>
                  </div>
                  <div className="timeline__content">
                    <h3 className="timeline__title">{event.title}</h3>
                    <p className="timeline__meta text-muted mb-1">
                      {formatDateTime(event.date)}
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

      {loading && <LoaderOverlay message="Đang tải dữ liệu thẻ tín dụng..." />}
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </div>
  );
};

export default CreditPortal;
