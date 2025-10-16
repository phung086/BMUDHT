import React, { useState, useEffect } from "react";
import api from "../services/api";
import ConfirmModal from "./ConfirmModal";
import Toast from "./Toast";
import { useNavigate } from "react-router-dom";
import MfaSetup from "./MfaSetup";
import TransactionDetailsModal from "./TransactionDetailsModal";

const maskAccount = (username) => {
  if (!username) return "";
  if (username.length <= 4) return username;
  return "****" + username.slice(-4);
};

const formatCurrency = (amount) => {
  return amount.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
};

const Dashboard = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [transferData, setTransferData] = useState({
    toUsername: "",
    amount: "",
  });
  const [depositAmount, setDepositAmount] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [confirm, setConfirm] = useState({
    show: false,
    payload: null,
    confirming: false,
  });
  const [loading, setLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showTxModal, setShowTxModal] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const getUserFromToken = () => {
    try {
      const raw = localStorage.getItem("token");
      if (!raw) return null;
      const payload = JSON.parse(atob(raw.split(".")[1]));
      return payload;
    } catch (e) {
      return null;
    }
  };
  const user = getUserFromToken();

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    let mounted = true;
    const fetchData = async () => {
      try {
        const res = await api.get("/api/transactions/history");
        if (!mounted) return;
        setBalance(res.data.balance);
        setTransactions(res.data.transactions);
      } catch (err) {
        setError(err.response?.data?.error || "Không lấy được token bảo mật");
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [token, navigate]);

  const handleChange = (e) => {
    setTransferData({ ...transferData, [e.target.name]: e.target.value });
  };

  const handleDepositChange = (e) => {
    setDepositAmount(e.target.value);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    // show confirmation modal before sending
    setConfirm({ show: true, payload: { ...transferData }, confirming: false });
  };

  const confirmTransfer = async () => {
    setConfirm((c) => ({ ...c, confirming: true }));
    setMessage(null);
    setError(null);
    try {
      const res = await api.post("/api/transactions/transfer", confirm.payload);
      setToast({
        show: true,
        type: "success",
        message: res.data.message || "Chuyển khoản thành công",
      });
      setTransferData({ toUsername: "", amount: "" });
      const historyRes = await api.get("/api/transactions/history");
      setBalance(historyRes.data.balance);
      setTransactions(historyRes.data.transactions);
      setConfirm({ show: false, payload: null, confirming: false });
    } catch (err) {
      const msg = err.response?.data?.error || "Chuyển khoản thất bại";
      setToast({ show: true, type: "error", message: msg });
      setConfirm({ show: false, payload: null, confirming: false });
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/api/transactions/deposit", {
        amount: Number(depositAmount),
      });
      setMessage(res.data.message || "Nạp tiền thành công");
      setDepositAmount("");
      const historyRes = await api.get("/api/transactions/history");
      setBalance(historyRes.data.balance);
      setTransactions(historyRes.data.transactions);
    } catch (err) {
      setError(err.response?.data?.error || "Nạp tiền thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ConfirmModal
        show={confirm.show}
        title={`Xác nhận chuyển ${confirm.payload?.amount || ""} VND`}
        body={
          <div>
            <p>
              Bạn sẽ chuyển <strong>{confirm.payload?.amount}</strong> tới{" "}
              <strong>{confirm.payload?.toUsername}</strong>.
            </p>
            <p>Bạn có chắc chắn muốn tiếp tục?</p>
          </div>
        }
        onConfirm={confirmTransfer}
        onCancel={() =>
          setConfirm({ show: false, payload: null, confirming: false })
        }
        confirming={confirm.confirming}
      />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 style={{ margin: 0 }}>
            Xin chào{user?.email ? `, ${user.email}` : ""}
          </h1>
          <small className="text-muted">
            Quản lý tài khoản và giao dịch của bạn
          </small>
        </div>
        <div>
          <div className="card p-3 text-end" style={{ minWidth: 220 }}>
            <div className="small text-muted">Số dư khả dụng</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {balance.toLocaleString("vi-VN")} VND
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col-md-8">
          <h2>Bảng điều khiển</h2>
          <p>
            <strong>Số dư tài khoản:</strong> {formatCurrency(balance)}
          </p>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <Toast
            show={toast.show}
            type={toast.type}
            message={toast.message}
            onClose={() => setToast({ ...toast, show: false })}
          />
          {loading && <div className="loading">Đang xử lý...</div>}
        </div>
        <div className="col-md-4">
          <MfaSetup />
        </div>
      </div>

      <div className="card mt-3 p-3">
        <h3>Nạp tiền</h3>
        <form onSubmit={handleDeposit} className="form">
          <div className="form-group">
            <label>Số tiền nạp (VND):</label>
            <input
              name="depositAmount"
              type="number"
              step="1000"
              value={depositAmount}
              onChange={handleDepositChange}
              required
              placeholder="Nhập số tiền nạp"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden
                ></span>
                Đang...
              </>
            ) : (
              <>
                <i className="bi bi-wallet2 me-2" aria-hidden></i>
                Nạp tiền
              </>
            )}
          </button>
        </form>

        <h3>Chuyển khoản</h3>
        <form onSubmit={handleTransfer} className="form">
          <div className="form-group">
            <label>Đến tài khoản (Tên đăng nhập):</label>
            <input
              name="toUsername"
              value={transferData.toUsername}
              onChange={handleChange}
              required
              placeholder="Nhập tên đăng nhập người nhận"
            />
          </div>
          <div className="form-group">
            <label>Số tiền (VND):</label>
            <input
              name="amount"
              type="number"
              step="1000"
              value={transferData.amount}
              onChange={handleChange}
              required
              placeholder="Nhập số tiền"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden
                ></span>
                Đang...
              </>
            ) : (
              <>
                <i className="bi bi-arrow-right-square me-2" aria-hidden></i>
                Chuyển khoản
              </>
            )}
          </button>
        </form>

        <h3>Lịch sử giao dịch</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Từ</th>
              <th>Đến</th>
              <th>Số tiền</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Mô tả</th>
              <th>Ngày giờ</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted">
                  Chưa có giao dịch nào
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => {
                    setSelectedTx(tx);
                    setShowTxModal(true);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <td>{maskAccount(tx.fromUsername)}</td>
                  <td>{maskAccount(tx.toUsername)}</td>
                  <td>{formatCurrency(tx.amount)}</td>
                  <td>
                    {tx.type === "transfer"
                      ? "Chuyển khoản"
                      : tx.type === "deposit"
                      ? "Nạp tiền"
                      : tx.type}
                  </td>
                  <td>
                    {tx.status === "completed"
                      ? "Hoàn thành"
                      : tx.status === "pending"
                      ? "Đang xử lý"
                      : "Thất bại"}
                  </td>
                  <td>{tx.description}</td>
                  <td>{new Date(tx.createdAt).toLocaleString("vi-VN")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <TransactionDetailsModal
          tx={selectedTx}
          show={showTxModal}
          onClose={() => setShowTxModal(false)}
        />
      </div>
    </div>
  );
};

export default Dashboard;
