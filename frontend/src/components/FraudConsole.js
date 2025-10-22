import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import LoaderOverlay from "./LoaderOverlay";
import Toast from "./Toast";

const defaultPayment = {
  merchant: "Black Market Store",
  amount: "5000000",
  otpCode: "",
  description: "Thanh toán giả mạo sau khi có OTP",
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
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

const toneForStatus = (status) => {
  if (status === "consumed") return "danger";
  if (status === "shared") return "warning";
  if (status === "pending") return "primary";
  return "secondary";
};

const FraudConsole = () => {
  const [cards, setCards] = useState([]);
  const [timeline, setTimeline] = useState({
    otpSessions: [],
    fraudTransactions: [],
  });
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [payment, setPayment] = useState(defaultPayment);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState({ initiate: false, pay: false });
  const [captures, setCaptures] = useState([]);
  const [toast, setToast] = useState({
    show: false,
    type: "info",
    message: "",
  });

  const simulatedLink = `${window.location.origin}/phishing/vietcornbank`;
  const disguisedLinkText = "https://vietcornbank.com/kich-hoat";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(simulatedLink);
      showToast("Đã sao chép đường link giả mạo", "success");
    } catch (err) {
      console.error("Copy phishing link error:", err);
      showToast(
        "Không thể sao chép link, hãy chọn và sao chép thủ công",
        "error"
      );
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });
  };

  const closeToast = () => setToast((prev) => ({ ...prev, show: false }));

  const loadCaptures = useCallback(async () => {
    try {
      const captureRes = await api.get("/api/fraud/phishing/captures");
      setCaptures(captureRes.data?.captures || []);
    } catch (err) {
      console.error("Refresh phishing captures error:", err);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cardResult, timelineResult, captureResult] =
        await Promise.allSettled([
          api.get("/api/fraud/leaked-cards"),
          api.get("/api/fraud/timeline"),
          api.get("/api/fraud/phishing/captures"),
        ]);

      if (cardResult.status === "fulfilled") {
        const fetchedCards = cardResult.value.data?.cards || [];
        setCards(fetchedCards);
        if (fetchedCards.length > 0 && !selectedCardId) {
          setSelectedCardId(fetchedCards[0].id);
        }
      }

      if (timelineResult.status === "fulfilled") {
        setTimeline({
          otpSessions: timelineResult.value.data?.otpSessions || [],
          fraudTransactions: timelineResult.value.data?.fraudTransactions || [],
        });
      }

      if (captureResult.status === "fulfilled") {
        setCaptures(captureResult.value.data?.captures || []);
      }
      if (captureResult.status === "rejected") {
        throw captureResult.reason;
      }
    } catch (err) {
      console.error("Load fraud console data error:", err);
      showToast(
        err.response?.data?.error || "Không thể tải dữ liệu kẻ gian",
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
    const interval = setInterval(() => {
      loadCaptures();
    }, 5000);
    loadCaptures();
    return () => clearInterval(interval);
  }, [loadCaptures]);

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) || null,
    [cards, selectedCardId]
  );

  const recentSession = useMemo(() => {
    if (!selectedCard) return null;
    const sessions = timeline.otpSessions
      .filter((session) => session.cardId === selectedCard.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    return sessions.length > 0 ? sessions[0] : null;
  }, [selectedCard, timeline.otpSessions]);

  useEffect(() => {
    if (recentSession?.amountTarget) {
      setPayment((prev) => ({
        ...prev,
        amount: String(recentSession.amountTarget),
      }));
    }
  }, [recentSession]);

  const handleInitiate = async () => {
    if (!selectedCard) {
      showToast("Chưa chọn thẻ để khai thác", "error");
      return;
    }
    setActions((prev) => ({ ...prev, initiate: true }));
    try {
      const payload = {
        cardId: selectedCard.id,
        merchant: payment.merchant || defaultPayment.merchant,
        amount: Number(payment.amount || "5000000"),
        note: "Gọi điện giả mạo nhân viên ngân hàng",
      };
      const response = await api.post("/api/fraud/otp/initiate", payload);
      showToast(response.data?.message || "Đã yêu cầu OTP giả mạo", "warning");
      await loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Không thể yêu cầu OTP", "error");
    } finally {
      setActions((prev) => ({ ...prev, initiate: false }));
    }
  };

  const handlePaymentChange = (event) => {
    const { name, value } = event.target;
    setPayment((prev) => ({ ...prev, [name]: value }));
  };

  const handleExecutePayment = async () => {
    if (!recentSession) {
      showToast("Chưa có phiên OTP nào", "error");
      return;
    }
    if (recentSession.defenseAction === "blocked") {
      showToast(
        "Nạn nhân đã báo cáo OTP và khóa thẻ, giao dịch không thể tiếp tục",
        "error"
      );
      return;
    }
    if (!payment.otpCode.trim()) {
      showToast("Cần nhập OTP mà nạn nhân đã cung cấp", "error");
      return;
    }
    setActions((prev) => ({ ...prev, pay: true }));
    try {
      const response = await api.post("/api/fraud/payment", {
        sessionId: recentSession.id,
        otpCode: payment.otpCode,
        merchant: payment.merchant || defaultPayment.merchant,
        amount: Number(payment.amount || "5000000"),
        description: payment.description,
      });
      const victimBalance = response.data?.accountImpact?.victimBalance;
      const amountCharged = response.data?.transaction?.amount;
      const dynamicMessage =
        victimBalance !== undefined && amountCharged !== undefined
          ? `Đã rút ${formatCurrency(
              amountCharged
            )}. Số dư nạn nhân còn ${formatCurrency(victimBalance)}.`
          : null;
      showToast(
        dynamicMessage || response.data?.message || "Đã hoàn tất giao dịch giả",
        "success"
      );
      setPayment((prev) => ({ ...prev, otpCode: "" }));
      await loadData();
    } catch (err) {
      showToast(
        err.response?.data?.error || "Không thể thực hiện giao dịch",
        "error"
      );
    } finally {
      setActions((prev) => ({ ...prev, pay: false }));
    }
  };

  const fraudTimeline = useMemo(() => {
    const events = [];
    timeline.otpSessions.forEach((session) => {
      const cardLabel = `Thẻ ${session.cardId}`;
      events.push({
        id: `otp-${session.id}`,
        date: session.createdAt,
        title: `Khởi tạo OTP #${session.id}`,
        description:
          `${cardLabel} - ${session.merchant} (${Number(
            session.amountTarget || 0
          ).toLocaleString("vi-VN")} VND)` +
          (session.defenseAction === "blocked" ? " · ĐÃ BỊ KHÓA" : ""),
        tone: toneForStatus(session.status),
      });
      if (session.userSharedAt) {
        events.push({
          id: `otp-share-${session.id}`,
          date: session.userSharedAt,
          title: "Nạn nhân đã đọc OTP",
          description: cardLabel,
          tone: "danger",
        });
      }
      if (session.consumedAt) {
        events.push({
          id: `otp-consumed-${session.id}`,
          date: session.consumedAt,
          title: "OTP đã bị dùng",
          description: cardLabel,
          tone: "danger",
        });
      }
      if (session.defenseAction === "blocked") {
        events.push({
          id: `otp-block-${session.id}`,
          date: session.expiresAt || session.createdAt,
          title: "OTP bị chặn",
          description: session.defenseReason
            ? `Nạn nhân báo cáo: ${session.defenseReason}`
            : `${cardLabel} đã bị khóa bởi ngân hàng`,
          tone: "secondary",
        });
      }
    });
    timeline.fraudTransactions.forEach((txn) => {
      events.push({
        id: `txn-${txn.id}`,
        date: txn.executedAt,
        title: `Thanh toán giả mạo ${txn.id}`,
        description: `${Number(txn.amount || 0).toLocaleString(
          "vi-VN"
        )} VND tại ${txn.merchant}`,
        tone: "danger",
      });
    });
    return events
      .filter((evt) => evt.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [timeline]);

  return (
    <div className="page" role="main">
      <header className="page-header">
        <h1 className="page-title">Bảng điều khiển kẻ gian</h1>
        <p className="page-subtitle">
          Đây là góc nhìn của kẻ lừa đảo: tìm thẻ đã rò rỉ, gọi cho nạn nhân xin
          OTP rồi thực hiện thanh toán giả mạo.
        </p>
      </header>

      <section className="card shadow-sm mb-4 border-warning">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h2 className="h5 mb-1 text-warning">
                Chiến dịch phishing giả mạo ngân hàng
              </h2>
              <p className="text-muted mb-0">
                Gửi tin nhắn với đường link na ná tên miền thật để dẫn nạn nhân
                đến trang đăng nhập giả. Khi họ điền thông tin, hệ thống sẽ ghi
                lại đầy đủ.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline-warning"
              onClick={handleCopyLink}
            >
              <i className="bi bi-clipboard-check me-2" aria-hidden></i>
              Sao chép link giả mạo
            </button>
          </div>
          <div className="alert alert-warning" role="alert">
            <strong>Tin nhắn gửi nạn nhân:</strong> "Thẻ của quý khách sắp bị
            khóa. Vui lòng xác nhận lại thông tin tại
            <a
              className="ms-1 fw-semibold"
              href="/phishing/vietcornbank"
              target="_blank"
              rel="noreferrer"
            >
              {disguisedLinkText}
            </a>
            "
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Tài khoản nhập</th>
                  <th>Mật khẩu</th>
                  <th>Khớp nạn nhân</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {captures.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted text-center py-3">
                      Chưa thu thập được thông tin đăng nhập nào. Gửi link cho
                      nạn nhân rồi theo dõi tại đây.
                    </td>
                  </tr>
                ) : (
                  captures.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.capturedAt)}</td>
                      <td>{item.capturedUsername}</td>
                      <td>
                        <code>{item.capturedPassword}</code>
                      </td>
                      <td>
                        {item.victimMatched ? (
                          <span className="badge bg-danger">
                            Khớp người dùng
                          </span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">
                            Không xác định
                          </span>
                        )}
                      </td>
                      <td>{item.ipAddress || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Chọn nạn nhân</h2>
          {cards.length === 0 ? (
            <p className="text-muted mb-0">
              Chưa có thẻ bị rò rỉ. Hãy nhờ quản trị mô phỏng rò rỉ ở màn hình
              admin để tiếp tục demo.
            </p>
          ) : (
            <div className="row g-3">
              {cards.map((card) => {
                const isActive = selectedCardId === card.id;
                return (
                  <div className="col-md-4" key={card.id}>
                    <button
                      type="button"
                      className={`card h-100 text-start border ${
                        isActive ? "border-danger" : "border-transparent"
                      }`}
                      onClick={() => setSelectedCardId(card.id)}
                    >
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="fw-semibold text-danger">
                            Thẻ #{card.id}
                          </div>
                          {isActive && (
                            <span className="badge bg-danger-subtle text-danger">
                              Đang chọn
                            </span>
                          )}
                        </div>
                        <div className="small text-muted">{card.fullName}</div>
                        <div className="small">Số thẻ: {card.cardNumber}</div>
                        <div className="small">CVV: {card.cvv}</div>
                        <div className="small">Liên hệ: {card.phone}</div>
                        <div className="small">Email: {card.email}</div>
                        <div className="small">
                          Rò rỉ lúc: {formatDate(card.leakedAt)}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {selectedCard && (
        <section className="card shadow-sm mb-4 border-danger">
          <div className="card-body">
            <div className="d-flex justify-content-between flex-wrap gap-3 mb-3">
              <div>
                <h2 className="h5 mb-1 text-danger">
                  Bước 1: Gọi điện xin OTP
                </h2>
                <p className="text-muted mb-0">
                  Giả vờ là nhân viên ngân hàng, thuyết phục nạn nhân đọc mã OTP
                  vừa nhận để "kích hoạt thẻ".
                </p>
              </div>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleInitiate}
                disabled={actions.initiate}
              >
                {actions.initiate ? "Đang yêu cầu OTP..." : "Tạo OTP giả mạo"}
              </button>
            </div>
            {recentSession ? (
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="otp-box">
                    <span className="otp-box__label">OTP mục tiêu</span>
                    <span className="otp-box__code">
                      {recentSession.status === "pending" ? "??????" : "******"}
                    </span>
                    <small className="text-muted">
                      Trạng thái: {recentSession.status} &bull; Hết hạn{" "}
                      {formatDate(recentSession.expiresAt)}
                    </small>
                  </div>
                </div>
                <div className="col-md-6">
                  <dl className="row mb-0">
                    <dt className="col-sm-6">Mục tiêu giao dịch</dt>
                    <dd className="col-sm-6">
                      {Number(recentSession.amountTarget || 0).toLocaleString(
                        "vi-VN"
                      )}{" "}
                      VND
                    </dd>
                    <dt className="col-sm-6">Cửa hàng</dt>
                    <dd className="col-sm-6">{recentSession.merchant}</dd>
                    <dt className="col-sm-6">Nạn nhân đọc OTP</dt>
                    <dd className="col-sm-6">
                      {recentSession.userSharedAt
                        ? formatDate(recentSession.userSharedAt)
                        : "Chưa có"}
                    </dd>
                    {recentSession.defenseAction === "blocked" && (
                      <>
                        <dt className="col-sm-6 text-danger">
                          Giao dịch đã bị khóa
                        </dt>
                        <dd className="col-sm-6 text-danger">
                          {recentSession.defenseReason ||
                            "Nạn nhân báo cáo OTP đáng ngờ"}
                        </dd>
                      </>
                    )}
                  </dl>
                </div>
              </div>
            ) : (
              <p className="text-muted mb-0">
                Chưa có phiên OTP. Hãy tạo OTP để tiếp tục.
              </p>
            )}
          </div>
        </section>
      )}

      {recentSession && (
        <section className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between flex-wrap gap-3 mb-3">
              <div>
                <h2 className="h5 mb-1">Bước 2: Thực hiện giao dịch giả</h2>
                <p className="text-muted mb-0">
                  Khi nạn nhân đã đọc OTP, kẻ gian nhập mã vào cổng thanh toán
                  để rút tiền.
                </p>
              </div>
            </div>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label" htmlFor="merchant">
                  Cửa hàng giả mạo
                </label>
                <input
                  id="merchant"
                  name="merchant"
                  className="form-control"
                  value={payment.merchant}
                  onChange={handlePaymentChange}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="amount">
                  Số tiền (VND)
                </label>
                <input
                  id="amount"
                  name="amount"
                  className="form-control"
                  value={payment.amount}
                  onChange={handlePaymentChange}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="otpCode">
                  OTP do nạn nhân đọc
                </label>
                <input
                  id="otpCode"
                  name="otpCode"
                  className="form-control"
                  value={payment.otpCode}
                  onChange={handlePaymentChange}
                  placeholder="Nhập OTP mà nạn nhân cung cấp"
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="description">
                  Mô tả giao dịch
                </label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  rows={3}
                  value={payment.description}
                  onChange={handlePaymentChange}
                />
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={handleExecutePayment}
                  disabled={
                    actions.pay || recentSession.defenseAction === "blocked"
                  }
                >
                  {actions.pay ? "Đang thực hiện..." : "Thanh toán giả mạo"}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5 mb-3">Dòng thời gian tội phạm</h2>
          {fraudTimeline.length === 0 ? (
            <p className="text-muted mb-0">
              Chưa có hoạt động nào. Hãy tiếp tục quy trình để xem toàn bộ câu
              chuyện.
            </p>
          ) : (
            <ol className="timeline">
              {fraudTimeline.map((event) => (
                <li key={event.id} className="timeline__item">
                  <div
                    className={`timeline__badge bg-${event.tone}-subtle text-${event.tone}`}
                  >
                    <i className="bi bi-activity" aria-hidden></i>
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

      {loading && <LoaderOverlay message="Đang tải dữ liệu kẻ gian..." />}
      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={closeToast}
      />
    </div>
  );
};

export default FraudConsole;
