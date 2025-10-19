import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import ConfirmModal from "./ConfirmModal";
import Toast from "./Toast";
import MfaSetup from "./MfaSetup";
import TransactionDetailsModal from "./TransactionDetailsModal";
import TransferSuccessModal from "./TransferSuccessModal";
import NotificationContext from "../context/NotificationContext";
import { usePreferences } from "../context/PreferencesContext";
import { getReferenceCode } from "../utils/reference";
import { decodeTokenPayload, readToken } from "../utils/authSignal";
import localizeBackendMessage from "../utils/i18n";

const dictionary = {
  vi: {
    greeting: "Xin chào",
    heroCaption: "Tài khoản · Số dư cập nhật theo thời gian thực",
    balanceLabel: "Số dư khả dụng",
    hideBalance: "Ẩn số dư",
    showBalance: "Hiện số dư",
    netChange: "Biến động ròng tháng này",
    lastActivityPrefix: "Giao dịch gần nhất",
    lastActivityEmpty: "Chưa có giao dịch nào được ghi nhận.",
    quickActionsTitle: "Tác vụ nhanh",
    quickActionsSubtitle: "Chọn thao tác thường xuyên chỉ với một chạm.",
    modalDismiss: "Đã hiểu",
    quickTransfer: "Chuyển khoản ngay",
    quickViewNotifications: "Xem thông báo",
    quickActions: {
      transfer: {
        label: "Chuyển khoản",
        tagline: "Nội bộ & liên ngân hàng",
        description:
          "Chuyển tiền nhanh tới tài khoản nội bộ hoặc ngân hàng khác.",
      },
      deposit: {
        label: "Nạp tiền",
        tagline: "Qua thẻ và ví liên kết",
        description: "Nạp tiền từ thẻ ghi nợ hoặc ví điện tử liên kết.",
      },
      mobile: {
        label: "Nạp điện thoại",
        tagline: "Áp dụng mọi nhà mạng",
        description: "Mua thẻ cào hoặc nạp trực tiếp cho số điện thoại bất kỳ.",
      },
      bill: {
        label: "Thanh toán hóa đơn",
        tagline: "Điện, nước, Internet",
        description: "Tự động thanh toán điện, nước, internet và truyền hình.",
      },
      travel: {
        label: "Vé máy bay",
        tagline: "Đối tác hàng không",
        description: "Đặt vé máy bay nội địa và quốc tế với ưu đãi độc quyền.",
      },
      invest: {
        label: "Đầu tư",
        tagline: "Gửi tiết kiệm sinh lời",
        description: "Mở tài khoản tiết kiệm hoặc danh mục đầu tư sinh lời.",
      },
      support: {
        label: "Trợ giúp",
        tagline: "Tổng đài 24/7",
        description: "Liên hệ tổng đài 24/7 và chatbot tài chính thông minh.",
      },
      promo: {
        label: "Ưu đãi",
        tagline: "Hoàn tiền & voucher",
        description: "Khám phá ưu đãi hoàn tiền và voucher mới nhất.",
      },
    },
    depositTitle: "Nạp tiền vào tài khoản",
    depositLimit: "Không giới hạn",
    depositPlaceholder: "Số tiền nạp (VND)",
    submitDeposit: "Nạp tiền",
    transferTitle: "Chuyển khoản thông minh",
    transferAccount: "Tài khoản nhận",
    transferAmount: "Số tiền (VND)",
    transferNote: "Ghi chú (không bắt buộc)",
    submitTransfer: "Chuyển khoản",
    transferOtpLabel: "Mã OTP chuyển tiền",
    transferOtpPlaceholder: "Nhập mã OTP 6 chữ số",
    transferOtpHint:
      "OTP có hiệu lực trong 5 phút. Kiểm tra email bảo mật hoặc bảng log (môi trường demo).",
    transferOtpSent: "OTP đã được gửi. Vui lòng nhập mã để xác nhận.",
    transferOtpDevLabel: "Mã demo",
    transferOtpMissing: "Vui lòng nhập mã OTP để tiếp tục.",
    transferOtpInvalid: "Mã OTP phải gồm 6 chữ số.",
    transferOtpRequesting: "Đang gửi OTP",
    transferOtpIncomplete:
      "Vui lòng nhập tài khoản nhận và số tiền trước khi yêu cầu OTP.",
    transferOtpRequest: "Gửi OTP",
    transferOtpResend: "Gửi lại OTP",
    transferInvalid: "Vui lòng nhập tài khoản nhận và số tiền hợp lệ.",
    processing: "Đang xử lý",
    syncing: "Đang đồng bộ...",
    depositSuccess: "Nạp tiền thành công",
    depositFail: "Nạp tiền thất bại",
    transferSuccess: "Chuyển khoản thành công",
    transferFail: "Chuyển khoản thất bại",
    transferSuccessTitle: "Giao dịch đã hoàn tất",
    transferSuccessSubtitle: "Biên lai chuyển khoản trực tuyến",
    transferSuccessReferenceLabel: "Mã chuyển khoản",
    transferSuccessAmountLabel: "Số tiền",
    transferSuccessSenderLabel: "Người chuyển",
    transferSuccessRecipientLabel: "Người nhận",
    transferSuccessTimeLabel: "Thời gian thực hiện",
    transferSuccessNoteLabel: "Ghi chú",
    transferSuccessCopy: "Sao chép mã",
    transferSuccessCopied: "Đã sao chép mã chuyển khoản",
    transferSuccessClose: "Đóng biên lai",
    transferSuccessCopyFail: "Không thể sao chép mã, vui lòng thử lại.",
    analyticsTitle: "Tổng quan tháng này",
    analyticsIncoming: "Tiền vào",
    analyticsOutgoing: "Tiền ra",
    analyticsPending: "Đang xử lý",
    analyticsSecurity: "Tự động hóa bảo mật",
    analyticsSecurityNote:
      "Luồng giao dịch được giám sát thời gian thực với cảnh báo rủi ro bất thường.",
    chartTitle: "Phân tích thu · chi 7 ngày",
    chartLegendIn: "Thu",
    chartLegendOut: "Chi",
    statusCompleted: "Hoàn thành",
    statusPending: "Đang xử lý",
    statusFailed: "Thất bại",
    recentTitle: "Giao dịch gần đây",
    recentSubtitle: "Chạm để xem chi tiết và đánh dấu bất thường.",
    recentEmpty: "Chưa có giao dịch nào.",
    transactionType: {
      deposit: "Nạp tiền",
      transfer: "Chuyển khoản",
      fallback: "Giao dịch",
    },
    badgeUp: "Tăng",
    badgeDown: "Giảm",
    transactionsFollow: "Giao dịch cần theo dõi",
    analyticsSuccessRate: "Tỉ lệ thành công",
    analyticsFailed: "Giao dịch lỗi",
    analyticsAvgTicket: "Giá trị bình quân",
    analyticsLargest: "Giao dịch lớn nhất",
    analyticsNoData: "Chưa có dữ liệu",
    profileLoading: "Đang cập nhật hồ sơ...",
    profileRoleAdmin: "Quản trị viên hệ thống",
    profileRoleUser: "Khách hàng cá nhân",
    profileRoleStaff: "Chuyên viên hỗ trợ",
    profileMissing: "Chưa có thông tin hồ sơ",
    profileEmailLabel: "Email bảo mật",
    profileUsernameLabel: "Tên đăng nhập",
  },
  en: {
    greeting: "Welcome",
    heroCaption: "Account · Real-time available balance",
    balanceLabel: "Available balance",
    hideBalance: "Hide balance",
    showBalance: "Show balance",
    netChange: "Net change this month",
    lastActivityPrefix: "Latest transaction",
    lastActivityEmpty: "No transactions recorded yet.",
    quickActionsTitle: "Quick actions",
    quickActionsSubtitle: "Access frequent operations in one tap.",
    modalDismiss: "Got it",
    quickTransfer: "Transfer now",
    quickViewNotifications: "Notifications",
    quickActions: {
      transfer: {
        label: "Transfer",
        tagline: "Internal & interbank",
        description:
          "Send funds to an in-network or external bank account instantly.",
      },
      deposit: {
        label: "Top up",
        tagline: "Cards & linked wallets",
        description: "Add funds using your debit card or linked e-wallets.",
      },
      mobile: {
        label: "Mobile top-up",
        tagline: "All carriers supported",
        description: "Buy airtime vouchers or top up any mobile number.",
      },
      bill: {
        label: "Bill payment",
        tagline: "Utilities & internet",
        description: "Automate electricity, water, broadband, and TV payments.",
      },
      travel: {
        label: "Flights",
        tagline: "Airline partner deals",
        description:
          "Book domestic and international flights with exclusive perks.",
      },
      invest: {
        label: "Invest",
        tagline: "Grow your savings",
        description: "Open savings plans or curated investment portfolios.",
      },
      support: {
        label: "Support",
        tagline: "24/7 helpdesk",
        description: "Reach our 24/7 contact center and smart finance chatbot.",
      },
      promo: {
        label: "Rewards",
        tagline: "Cashback & vouchers",
        description:
          "Discover the latest cashback offers and partner vouchers.",
      },
    },
    depositTitle: "Top up account",
    depositLimit: "Unlimited",
    depositPlaceholder: "Top-up amount (VND)",
    submitDeposit: "Top up",
    transferTitle: "Smart transfers",
    transferAccount: "Recipient account",
    transferAmount: "Amount (VND)",
    transferNote: "Note (optional)",
    submitTransfer: "Transfer",
    transferOtpLabel: "Transfer OTP code",
    transferOtpPlaceholder: "Enter 6-digit OTP",
    transferOtpHint:
      "OTP remains valid for 5 minutes. Check your secure email (demo shows the code below).",
    transferOtpSent: "OTP sent. Please enter the code to confirm.",
    transferOtpDevLabel: "Demo code",
    transferOtpMissing: "Please enter the OTP to continue.",
    transferOtpRequesting: "Sending OTP",
    transferOtpInvalid: "OTP must contain 6 digits.",
    transferOtpIncomplete:
      "Enter recipient and amount before requesting an OTP.",
    transferOtpRequest: "Send OTP",
    transferOtpResend: "Resend OTP",
    transferInvalid: "Enter a valid recipient and transfer amount.",
    processing: "Processing",
    syncing: "Syncing...",
    depositSuccess: "Top-up successful",
    depositFail: "Top-up failed",
    transferSuccess: "Transfer successful",
    transferFail: "Transfer failed",
    transferSuccessTitle: "Transfer completed",
    transferSuccessSubtitle: "Digital transfer receipt",
    transferSuccessReferenceLabel: "Transfer reference",
    transferSuccessAmountLabel: "Amount",
    transferSuccessSenderLabel: "Sender",
    transferSuccessRecipientLabel: "Recipient",
    transferSuccessTimeLabel: "Timestamp",
    transferSuccessNoteLabel: "Note",
    transferSuccessCopy: "Copy reference",
    transferSuccessCopied: "Reference copied to clipboard",
    transferSuccessClose: "Close receipt",
    transferSuccessCopyFail: "Unable to copy the reference. Please try again.",
    analyticsTitle: "Monthly overview",
    analyticsIncoming: "Cash in",
    analyticsOutgoing: "Cash out",
    analyticsPending: "Pending",
    analyticsSecurity: "Security automation",
    analyticsSecurityNote:
      "Transactions are monitored in real time with anomaly alerts.",
    chartTitle: "7-day income vs. expense",
    chartLegendIn: "Income",
    chartLegendOut: "Expense",
    statusCompleted: "Completed",
    statusPending: "Processing",
    statusFailed: "Failed",
    recentTitle: "Recent transactions",
    recentSubtitle: "Tap to inspect details or flag anomalies.",
    recentEmpty: "No transactions recorded.",
    transactionType: {
      deposit: "Deposit",
      transfer: "Transfer",
      fallback: "Transaction",
    },
    badgeUp: "Up",
    badgeDown: "Down",
    transactionsFollow: "Transactions to follow",
    analyticsSuccessRate: "Success rate",
    analyticsFailed: "Failed transactions",
    analyticsAvgTicket: "Average ticket",
    analyticsLargest: "Largest transaction",
    analyticsNoData: "No data yet",
    profileLoading: "Syncing profile...",
    profileRoleAdmin: "Platform administrator",
    profileRoleUser: "Retail customer",
    profileRoleStaff: "Support specialist",
    profileMissing: "Profile details unavailable",
    profileEmailLabel: "Secure email",
    profileUsernameLabel: "Username",
  },
};

const quickActionCatalog = [
  { key: "transfer", icon: "bi-arrow-left-right", accent: "action-transfer" },
  { key: "deposit", icon: "bi-wallet2", accent: "action-deposit" },
  { key: "mobile", icon: "bi-phone", accent: "action-mobile" },
  { key: "bill", icon: "bi-receipt", accent: "action-bill" },
  { key: "travel", icon: "bi-airplane", accent: "action-travel" },
  { key: "invest", icon: "bi-graph-up-arrow", accent: "action-invest" },
  { key: "support", icon: "bi-life-preserver", accent: "action-support" },
  { key: "promo", icon: "bi-gift", accent: "action-promo" },
];

const maskAccount = (value) => {
  if (!value) return "-";
  if (value.length <= 4) return value;
  return "****" + value.slice(-4);
};

const maskIdentifier = (value) => {
  if (!value) return "-";
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    if (local.length <= 2) {
      return `**@${domain}`;
    }
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return maskAccount(value);
};

const InfoModal = ({ show, title, description, primaryLabel, onClose }) => {
  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h5>{title}</h5>
        <div className="modal-body">
          <p className="mb-0">{description}</p>
        </div>
        <div className="modal-actions justify-content-end">
          <button className="btn btn-primary" onClick={onClose}>
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const useTokenProfile = (token) => {
  // Extract lightweight profile information from the persisted JWT payload.
  return useMemo(() => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      const displayName =
        payload?.name ||
        payload?.fullName ||
        payload?.username ||
        payload?.email?.split("@")[0] ||
        "Khách hàng";
      return { ...payload, displayName };
    } catch (error) {
      return null;
    }
  }, [token]);
};

const decorateTransactions = (items, currentUserId) => {
  const ownerId =
    currentUserId !== null && currentUserId !== undefined
      ? Number(currentUserId)
      : null;
  const hasOwnerId = Number.isFinite(ownerId);

  return (items || []).map((tx) => {
    const baseAmount = Number(tx.amount || 0);
    const isIncoming =
      tx.type === "deposit" || (hasOwnerId && tx.toUserId === ownerId);
    const signedAmount = isIncoming ? baseAmount : -baseAmount;
    return {
      ...tx,
      reference: getReferenceCode(tx),
      isIncoming,
      signedAmount,
    };
  });
};

const createInitialOtpStatus = () => ({
  sending: false,
  sent: false,
  expiresIn: null,
  requestedAt: null,
});

const Dashboard = () => {
  const navigate = useNavigate();
  const token = readToken();
  const profile = useTokenProfile(token);
  const { language } = usePreferences();
  const text = dictionary[language] || dictionary.vi;

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [transferData, setTransferData] = useState({
    toUsername: "",
    amount: "",
    description: "",
    otp: "",
  });
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
  const [transferSuccess, setTransferSuccess] = useState({
    show: false,
    details: null,
  });
  const [dataLoading, setDataLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferOtpStatus, setTransferOtpStatus] = useState(() =>
    createInitialOtpStatus()
  );
  const [selectedTx, setSelectedTx] = useState(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [infoModal, setInfoModal] = useState({ show: false, key: null });
  const [showBalance, setShowBalance] = useState(true);
  const [otpErrorMessage, setOtpErrorMessage] = useState(null);
  const [otpShake, setOtpShake] = useState(false);

  const { refresh: refreshNotifications } = useContext(NotificationContext);

  const fallbackPayload = useMemo(() => decodeTokenPayload(token), [token]);
  const userProfileId = userProfile?.id ?? null;
  const profileId = profile?.id ?? null;
  const fallbackUserId = fallbackPayload?.id ?? null;

  const currentUserId = useMemo(() => {
    const candidates = [userProfileId, profileId, fallbackUserId];
    for (const candidate of candidates) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
    return null;
  }, [userProfileId, profileId, fallbackUserId]);

  const currentUsername = useMemo(() => {
    const candidates = [
      userProfile?.username,
      profile?.username,
      fallbackPayload?.username,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length) {
        return candidate;
      }
    }
    return "";
  }, [userProfile?.username, profile?.username, fallbackPayload?.username]);

  const depositRef = useRef(null);
  const transferRef = useRef(null);
  const otpInputRef = useRef(null);
  const otpShakeTimerRef = useRef(null);

  const showToast = useCallback(
    (type, serverMessage, fallbackMessage) => {
      setToast({
        show: true,
        type,
        message: localizeBackendMessage(
          language,
          serverMessage,
          fallbackMessage
        ),
      });
    },
    [language]
  );

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  useEffect(() => {
    const timerRef = otpShakeTimerRef;
    return () => {
      const timerId = timerRef.current;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [otpShakeTimerRef]);

  useEffect(() => {
    let mounted = true;

    const fetchHistory = async () => {
      if (!token) return;
      setDataLoading(true);
      try {
        const res = await api.get("/api/transactions/history");
        if (!mounted) return;
        setBalance(res.data?.balance || 0);
        setTransactions(
          decorateTransactions(res.data?.transactions || [], currentUserId)
        );
      } catch (error) {
        if (mounted) {
          showToast(
            "error",
            error.response?.data?.error,
            language === "vi"
              ? "Không thể tải lịch sử giao dịch"
              : "Unable to load history"
          );
        }
      } finally {
        if (mounted) {
          setDataLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      mounted = false;
    };
  }, [token, language, currentUserId, showToast]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const res = await api.get("/api/auth/me");
        if (cancelled) return;
        setUserProfile(res.data?.user || null);
        setProfileError(null);
      } catch (error) {
        if (cancelled) return;
        const message = localizeBackendMessage(
          language,
          error.response?.data?.error,
          language === "vi"
            ? "Không thể tải hồ sơ người dùng"
            : "Unable to load user profile"
        );
        setProfileError(message);
        showToast("error", error.response?.data?.error, message);
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [token, language, showToast]);

  const handleDepositChange = (event) => {
    setDepositAmount(event.target.value);
  };

  const handleTransferChange = (event) => {
    const { name } = event.target;
    const rawValue = event.target.value;
    const sanitizedValue =
      name === "otp" ? rawValue.replace(/\D/g, "").slice(0, 6) : rawValue;
    const shouldResetOtp = name === "toUsername" || name === "amount";

    setTransferData((current) => ({
      ...current,
      [name]: sanitizedValue,
      ...(shouldResetOtp ? { otp: "" } : {}),
    }));

    if (shouldResetOtp) {
      setTransferOtpStatus(createInitialOtpStatus());
      setOtpErrorMessage(null);
      setOtpShake(false);
      if (otpShakeTimerRef.current) {
        clearTimeout(otpShakeTimerRef.current);
        otpShakeTimerRef.current = null;
      }
    }

    if (name === "otp") {
      setOtpErrorMessage(null);
      setOtpShake(false);
      if (otpShakeTimerRef.current) {
        clearTimeout(otpShakeTimerRef.current);
        otpShakeTimerRef.current = null;
      }
    }
  };

  const triggerOtpError = useCallback((message) => {
    setOtpErrorMessage(message);
    setOtpShake(true);
    if (otpShakeTimerRef.current) {
      clearTimeout(otpShakeTimerRef.current);
    }
    otpShakeTimerRef.current = setTimeout(() => {
      setOtpShake(false);
      otpShakeTimerRef.current = null;
    }, 450);
    if (otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, []);

  const handleCopyReference = useCallback(
    async (reference) => {
      if (!reference) return;
      try {
        const clipboardAvailable =
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function";

        if (clipboardAvailable) {
          await navigator.clipboard.writeText(reference);
        } else if (typeof document !== "undefined") {
          const tempInput = document.createElement("textarea");
          tempInput.value = reference;
          tempInput.setAttribute("readonly", "");
          tempInput.style.position = "absolute";
          tempInput.style.left = "-9999px";
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand("copy");
          document.body.removeChild(tempInput);
        } else {
          throw new Error("Clipboard unavailable");
        }
        showToast("success", null, text.transferSuccessCopied);
      } catch (error) {
        showToast("error", null, text.transferSuccessCopyFail);
      }
    },
    [showToast, text.transferSuccessCopied, text.transferSuccessCopyFail]
  );

  const handleRequestTransferOtp = async () => {
    if (transferOtpStatus.sending) return;

    const trimmedRecipient = transferData.toUsername.trim();
    const amountValue = Number(transferData.amount);

    if (
      !trimmedRecipient ||
      !Number.isFinite(amountValue) ||
      amountValue <= 0
    ) {
      showToast("error", null, text.transferOtpIncomplete);
      return;
    }

    setTransferData((current) => ({
      ...current,
      otp: "",
    }));

    setOtpErrorMessage(null);
    setOtpShake(false);
    if (otpShakeTimerRef.current) {
      clearTimeout(otpShakeTimerRef.current);
      otpShakeTimerRef.current = null;
    }

    setTransferOtpStatus({
      ...createInitialOtpStatus(),
      sending: true,
    });

    try {
      const res = await api.post("/api/transactions/transfer/request-otp");
      setTransferOtpStatus({
        sending: false,
        sent: true,
        expiresIn: res.data?.expiresIn ?? null,
        requestedAt: Date.now(),
      });
      showToast("success", res.data?.message, text.transferOtpSent);
    } catch (error) {
      setTransferOtpStatus(createInitialOtpStatus());
      showToast("error", error.response?.data?.error, text.transferFail);
    }
  };

  const handleDepositSubmit = async (event) => {
    event.preventDefault();
    setDepositLoading(true);
    try {
      const res = await api.post("/api/transactions/deposit", {
        amount: Number(depositAmount),
      });
      showToast("success", res.data?.message, text.depositSuccess);
      setDepositAmount("");
      const historyRes = await api.get("/api/transactions/history");
      setBalance(historyRes.data?.balance || 0);
      setTransactions(
        decorateTransactions(historyRes.data?.transactions || [], currentUserId)
      );
      await refreshNotifications().catch(() => {});
    } catch (error) {
      showToast("error", error.response?.data?.error, text.depositFail);
    } finally {
      setDepositLoading(false);
    }
  };

  const handleTransferSubmit = (event) => {
    event.preventDefault();

    if (transferSuccess.show) {
      setTransferSuccess({ show: false, details: null });
    }

    const trimmedRecipient = transferData.toUsername.trim();
    const amountValue = Number(transferData.amount);
    const sanitizedDescription = (transferData.description || "").trim();
    const sanitizedOtp = (transferData.otp || "").trim();

    if (
      !trimmedRecipient ||
      !Number.isFinite(amountValue) ||
      amountValue <= 0
    ) {
      showToast("error", null, text.transferInvalid);
      return;
    }

    if (!sanitizedOtp) {
      triggerOtpError(text.transferOtpMissing);
      showToast("error", null, text.transferOtpMissing);
      return;
    }

    if (!/^\d{6}$/.test(sanitizedOtp)) {
      triggerOtpError(text.transferOtpInvalid);
      showToast("error", null, text.transferOtpInvalid);
      return;
    }

    setOtpErrorMessage(null);
    setOtpShake(false);

    setConfirm({
      show: true,
      payload: {
        toUsername: trimmedRecipient,
        amountValue,
        amountLabel: formatCurrency(amountValue),
        description: sanitizedDescription,
        otp: sanitizedOtp,
      },
      confirming: false,
    });
  };

  const confirmTransfer = async () => {
    setConfirm((curr) => ({ ...curr, confirming: true }));
    setTransferLoading(true);
    try {
      const payload = {
        toUsername: confirm.payload?.toUsername,
        amount: confirm.payload?.amountValue,
        description: confirm.payload?.description || "",
        otp: confirm.payload?.otp,
      };
      const res = await api.post("/api/transactions/transfer", payload);
      showToast("success", res.data?.message, text.transferSuccess);

      const transferResponse = res.data?.transfer || null;
      const numericAmount = Number(
        transferResponse?.amount ??
          confirm.payload?.amountValue ??
          payload.amount
      );
      const resolvedReference = getReferenceCode({
        id: transferResponse?.id,
        createdAt: transferResponse?.createdAt || new Date().toISOString(),
        amount: numericAmount,
        type: "transfer",
        status: transferResponse?.status || "completed",
        description:
          transferResponse?.description || confirm.payload?.description || "",
        referenceCode: transferResponse?.reference,
      });

      setTransferSuccess({
        show: true,
        details: {
          reference: transferResponse?.reference || resolvedReference,
          amountLabel: formatSignedCurrency(-Math.abs(numericAmount)),
          sender: transferResponse?.fromUsername || currentUsername || "",
          recipient:
            transferResponse?.toUsername ||
            confirm.payload?.toUsername ||
            payload.toUsername,
          createdAt: transferResponse?.createdAt || new Date().toISOString(),
          description:
            transferResponse?.description || confirm.payload?.description || "",
        },
      });

      setTransferData({
        toUsername: "",
        amount: "",
        description: "",
        otp: "",
      });
      setTransferOtpStatus(createInitialOtpStatus());
      const historyRes = await api.get("/api/transactions/history");
      setBalance(historyRes.data?.balance || 0);
      setTransactions(
        decorateTransactions(historyRes.data?.transactions || [], currentUserId)
      );
      await refreshNotifications().catch(() => {});
    } catch (error) {
      const serverError = error.response?.data?.error;
      if (serverError?.includes("OTP")) {
        setTransferOtpStatus(createInitialOtpStatus());
        setTransferData((curr) => ({
          ...curr,
          otp: "",
        }));
        triggerOtpError(
          localizeBackendMessage(language, serverError, text.transferOtpInvalid)
        );
      }
      showToast("error", serverError, text.transferFail);
    } finally {
      setTransferLoading(false);
      setConfirm({ show: false, payload: null, confirming: false });
    }
  };

  const formatCurrency = useCallback(
    (amount) => {
      const locale = language === "vi" ? "vi-VN" : "en-US";
      const formattedNumber = Number(amount || 0).toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
      return `${formattedNumber} VND`;
    },
    [language]
  );

  const formatSignedCurrency = useCallback(
    (value) => {
      const numeric = Number(value || 0);
      const prefix = numeric >= 0 ? "+" : "-";
      return `${prefix}${formatCurrency(Math.abs(numeric))}`;
    },
    [formatCurrency]
  );

  const insightData = useMemo(() => {
    if (!transactions.length) {
      return {
        monthlyIncoming: 0,
        monthlyOutgoing: 0,
        pendingCount: 0,
        lastTransaction: null,
      };
    }
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthly = transactions.filter((tx) => {
      const created = new Date(tx.createdAt);
      return (
        created.getMonth() === currentMonth &&
        created.getFullYear() === currentYear
      );
    });

    const monthlyIncoming = monthly
      .filter((tx) => tx.isIncoming)
      .reduce(
        (total, tx) =>
          total + Math.abs(tx.signedAmount ?? Number(tx.amount || 0)),
        0
      );

    const monthlyOutgoing = monthly
      .filter((tx) => !tx.isIncoming)
      .reduce(
        (total, tx) =>
          total + Math.abs(tx.signedAmount ?? Number(tx.amount || 0)),
        0
      );

    const pendingCount = transactions.filter(
      (tx) => tx.status === "pending"
    ).length;

    return {
      monthlyIncoming,
      monthlyOutgoing,
      pendingCount,
      lastTransaction: transactions[0] || null,
    };
  }, [transactions]);

  const advancedInsights = useMemo(() => {
    if (!transactions.length) {
      return {
        successRate: 100,
        completed: 0,
        failed: 0,
        averageTicket: 0,
        largestTx: null,
      };
    }
    const completedTx = transactions.filter((tx) => tx.status === "completed");
    const failedTx = transactions.filter((tx) => tx.status === "failed");
    const successRate =
      completedTx.length + failedTx.length === 0
        ? 100
        : (completedTx.length / (completedTx.length + failedTx.length)) * 100;
    const averageTicket =
      completedTx.length === 0
        ? 0
        : completedTx.reduce(
            (sum, tx) =>
              sum + Math.abs(tx.signedAmount ?? Number(tx.amount || 0)),
            0
          ) / completedTx.length;
    const largestTx = transactions.reduce((largest, tx) => {
      const amount = Math.abs(tx.signedAmount ?? Number(tx.amount || 0));
      if (!largest || amount > largest.amount) {
        return { ...tx, amount };
      }
      return largest;
    }, null);
    return {
      successRate,
      completed: completedTx.length,
      failed: failedTx.length,
      averageTicket,
      largestTx,
    };
  }, [transactions]);

  const netChange = useMemo(
    () => insightData.monthlyIncoming - insightData.monthlyOutgoing,
    [insightData]
  );

  const heroMetrics = useMemo(
    () => [
      {
        key: "incoming",
        label: text.analyticsIncoming,
        value: insightData.monthlyIncoming,
        tone: "positive",
        caption:
          language === "vi"
            ? "Tổng tiền nhận trong kỳ"
            : "Total inbound this month",
      },
      {
        key: "outgoing",
        label: text.analyticsOutgoing,
        value: insightData.monthlyOutgoing,
        tone: "negative",
        caption:
          language === "vi"
            ? "Tổng tiền chi trong kỳ"
            : "Total outbound this month",
      },
      {
        key: "pending",
        label: text.analyticsPending,
        value: insightData.pendingCount,
        tone: "neutral",
        caption: text.transactionsFollow,
      },
    ],
    [insightData, text, language]
  );

  const recentTransactions = useMemo(
    () => transactions.slice(0, 6),
    [transactions]
  );

  const dailyStats = useMemo(() => {
    const today = new Date();
    const template = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        key: date.toISOString(),
        date,
        incoming: 0,
        outgoing: 0,
        label: date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
          weekday: "short",
        }),
        tooltip: date.toLocaleDateString(
          language === "vi" ? "vi-VN" : "en-US",
          {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
          }
        ),
      };
    });

    if (!transactions.length) {
      return template;
    }

    const buckets = template.reduce((acc, item) => {
      acc[item.date.toDateString()] = item;
      return acc;
    }, {});

    transactions.forEach((tx) => {
      const created = new Date(tx.createdAt);
      const bucket = buckets[created.toDateString()];
      if (!bucket) return;
      const amount = Math.abs(tx.signedAmount ?? Number(tx.amount || 0));
      if (tx.isIncoming) {
        bucket.incoming += amount;
      } else {
        bucket.outgoing += amount;
      }
    });

    return template;
  }, [transactions, language]);

  const chartMax = useMemo(() => {
    const values = dailyStats.flatMap((item) => [item.incoming, item.outgoing]);
    const max = Math.max(...values, 0);
    return max === 0 ? 1 : max;
  }, [dailyStats]);

  const handleQuickAction = useCallback((action) => {
    if (action.key === "deposit") {
      depositRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    if (action.key === "transfer") {
      transferRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    setInfoModal({ show: true, key: action.key });
  }, []);

  const closeInfoModal = useCallback(() => {
    setInfoModal({ show: false, key: null });
  }, []);

  const formatTimestamp = useCallback(
    (timestamp) =>
      new Date(timestamp).toLocaleString(
        language === "vi" ? "vi-VN" : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        }
      ),
    [language]
  );

  const statusLabel = (status) => {
    if (status === "completed") return text.statusCompleted;
    if (status === "pending") return text.statusPending;
    return text.statusFailed;
  };

  const transactionLabel = (type) => {
    if (type === "deposit") return text.transactionType.deposit;
    if (type === "transfer") return text.transactionType.transfer;
    return text.transactionType.fallback;
  };

  const toggleBalance = () => setShowBalance((prev) => !prev);

  const modalCopy = infoModal.key ? text.quickActions[infoModal.key] : null;

  const heroName = useMemo(() => {
    return (
      userProfile?.fullName ||
      userProfile?.name ||
      userProfile?.username ||
      profile?.displayName ||
      (language === "vi" ? "Người dùng" : "User")
    );
  }, [userProfile, profile, language]);

  const avatarInitial = useMemo(() => {
    if (!heroName) return null;
    return heroName.trim().charAt(0).toUpperCase();
  }, [heroName]);

  const heroIdentifier = useMemo(() => {
    const source =
      userProfile?.email ||
      userProfile?.username ||
      profile?.email ||
      profile?.username ||
      "";
    return source ? maskIdentifier(source) : "";
  }, [userProfile, profile]);

  const profileRoleLabel = useMemo(() => {
    if (!userProfile?.role) return text.profileRoleUser;
    if (userProfile.role === "admin") return text.profileRoleAdmin;
    if (userProfile.role === "staff") return text.profileRoleStaff;
    return text.profileRoleUser;
  }, [userProfile, text]);

  const formatPercent = useCallback(
    (value) => {
      const locale = language === "vi" ? "vi-VN" : "en-US";
      return Number(value / 100).toLocaleString(locale, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    },
    [language]
  );

  const confirmAmountLabel = confirm.payload?.amountLabel;

  const confirmTitle = confirm.payload
    ? language === "vi"
      ? `Xác nhận chuyển ${confirmAmountLabel || ""}`
      : `Confirm transfer of ${confirmAmountLabel || ""}`
    : "";

  const confirmBodyIntro = confirm.payload
    ? language === "vi"
      ? `Bạn sẽ chuyển ${confirmAmountLabel} tới ${confirm.payload.toUsername}.`
      : `You are about to send ${confirmAmountLabel} to ${confirm.payload.toUsername}.`
    : "";

  const confirmNoteLabel = language === "vi" ? "Ghi chú" : "Note";
  const confirmPrompt =
    language === "vi"
      ? "Bạn có chắc chắn muốn tiếp tục?"
      : "Are you sure you want to continue?";

  const otpInputClasses = [
    "form-control",
    otpErrorMessage ? "is-invalid" : "",
    otpShake ? "field-animate-shake" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="dashboard-page">
      <InfoModal
        show={infoModal.show}
        title={modalCopy?.label || ""}
        description={modalCopy?.description || ""}
        primaryLabel={text.modalDismiss}
        onClose={closeInfoModal}
      />

      <TransferSuccessModal
        show={transferSuccess.show}
        details={transferSuccess.details}
        onClose={() => setTransferSuccess({ show: false, details: null })}
        onCopy={handleCopyReference}
        text={text}
        language={language}
      />

      <ConfirmModal
        show={confirm.show}
        title={confirmTitle}
        body={
          <div>
            <p>{confirmBodyIntro}</p>
            {confirm.payload?.description && (
              <p className="mb-0">
                {confirmNoteLabel}: {confirm.payload.description}
              </p>
            )}
            {confirm.payload?.otp && (
              <p className="mb-0">
                OTP: <code>{confirm.payload.otp}</code>
              </p>
            )}
            <p>{confirmPrompt}</p>
          </div>
        }
        onConfirm={confirmTransfer}
        onCancel={() =>
          setConfirm({ show: false, payload: null, confirming: false })
        }
        confirming={confirm.confirming}
      />

      <Toast
        show={toast.show}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((curr) => ({ ...curr, show: false }))}
      />

      <section className="dashboard-hero gradient-card mb-4">
        <div className="dashboard-hero__grid">
          <div className="dashboard-hero__main">
            <div className="hero-header">
              <div className="hero-avatar">
                {avatarInitial ? (
                  <span className="hero-avatar__initial">{avatarInitial}</span>
                ) : (
                  <i className="bi bi-person-fill" aria-hidden></i>
                )}
              </div>
              <div>
                <span className="hero-subheading">{text.greeting}</span>
                <h1 className="hero-title">{heroName}</h1>
                <p className="hero-caption">
                  {text.heroCaption}
                  {heroIdentifier && (
                    <>
                      {" · "}
                      <span className="hero-caption__meta">
                        {heroIdentifier}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="hero-balance">
              <span className="hero-balance__label">{text.balanceLabel}</span>
              <div className="hero-balance__value">
                {showBalance ? formatCurrency(balance) : "•••••••• VND"}
              </div>
              <div className="hero-balance__trend">
                <span
                  className={
                    netChange >= 0 ? "trend-positive" : "trend-negative"
                  }
                >
                  {formatSignedCurrency(netChange)}
                </span>
                <small>{text.netChange}</small>
              </div>
              <button
                type="button"
                className="hero-balance__toggle"
                onClick={toggleBalance}
              >
                <i
                  className={`bi ${
                    showBalance ? "bi-eye-slash" : "bi-eye"
                  } me-2`}
                  aria-hidden
                ></i>
                {showBalance ? text.hideBalance : text.showBalance}
              </button>
              {dataLoading && (
                <span className="badge bg-light text-primary mt-2">
                  {text.syncing}
                </span>
              )}
            </div>
            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-light hero-action"
                onClick={() => handleQuickAction({ key: "transfer" })}
              >
                <i className="bi bi-arrow-left-right me-2" aria-hidden></i>
                {text.quickTransfer}
              </button>
              <button
                type="button"
                className="btn btn-outline-light hero-action"
                onClick={() => navigate("/notifications")}
              >
                <i className="bi bi-bell me-2" aria-hidden></i>
                {text.quickViewNotifications}
              </button>
            </div>
            <div className="hero-meta">
              {profileLoading && (
                <div className="hero-meta__item">
                  <i className="bi bi-arrow-repeat" aria-hidden></i>
                  {text.profileLoading}
                </div>
              )}
              {profileError && (
                <div className="hero-meta__item text-warning">
                  <i className="bi bi-exclamation-triangle" aria-hidden></i>
                  {profileError}
                </div>
              )}
              {insightData.lastTransaction ? (
                <div className="hero-meta__item">
                  <i className="bi bi-lightning-charge-fill" aria-hidden></i>
                  {text.lastActivityPrefix} ·{" "}
                  {formatTimestamp(insightData.lastTransaction.createdAt)} ·{" "}
                  {transactionLabel(insightData.lastTransaction.type)}{" "}
                  {formatSignedCurrency(
                    insightData.lastTransaction.signedAmount ??
                      insightData.lastTransaction.amount
                  )}
                </div>
              ) : (
                <div className="hero-meta__item">{text.lastActivityEmpty}</div>
              )}
              <div className="hero-meta__item">
                <i className="bi bi-shield-lock" aria-hidden></i>
                {profileRoleLabel}
              </div>
              {userProfile?.email && (
                <div className="hero-meta__item">
                  <i className="bi bi-envelope-open" aria-hidden></i>
                  {text.profileEmailLabel}: {maskIdentifier(userProfile.email)}
                </div>
              )}
              {userProfile?.username && (
                <div className="hero-meta__item">
                  <i className="bi bi-person-badge" aria-hidden></i>
                  {text.profileUsernameLabel}:{" "}
                  {maskIdentifier(userProfile.username)}
                </div>
              )}
            </div>
          </div>
          <div className="dashboard-hero__side">
            {heroMetrics.map((metric) => (
              <div
                className={`hero-metric hero-metric--${metric.tone}`}
                key={metric.key}
              >
                <span className="hero-metric__label">{metric.label}</span>
                <div className="hero-metric__value">
                  {metric.key === "pending"
                    ? `${metric.value} ${
                        language === "vi" ? "giao dịch" : "tx"
                      }`
                    : formatCurrency(metric.value)}
                </div>
                <small className="hero-metric__caption">{metric.caption}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card shadow-sm quick-actions-card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">{text.quickActionsTitle}</h5>
            <small className="text-muted">{text.quickActionsSubtitle}</small>
          </div>
          <span className="badge bg-primary-subtle text-primary">
            Digital Banking
          </span>
        </div>
        <div className="card-body">
          <div className="row row-cols-2 row-cols-md-4 g-3">
            {quickActionCatalog.map((action) => {
              const copy = text.quickActions[action.key];
              return (
                <div className="col" key={action.key}>
                  <button
                    type="button"
                    className={`quick-action-tile ${action.accent}`}
                    onClick={() => handleQuickAction(action)}
                  >
                    <span className="quick-action-tile__icon">
                      <i className={`bi ${action.icon}`} aria-hidden></i>
                    </span>
                    <span className="quick-action-tile__content">
                      <span className="quick-action-tile__label">
                        {copy?.label}
                      </span>
                      <small className="quick-action-tile__tagline">
                        {copy?.tagline}
                      </small>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="row g-4 mb-4">
        <div className="col-xl-7">
          <div className="card shadow-sm mb-4" ref={depositRef}>
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{text.depositTitle}</h5>
              <span className="badge bg-primary-subtle text-primary">
                {text.depositLimit}
              </span>
            </div>
            <div className="card-body">
              <form onSubmit={handleDepositSubmit} className="form-stacked">
                <div className="form-floating">
                  <input
                    id="depositAmount"
                    name="depositAmount"
                    type="number"
                    min="1000"
                    step="1000"
                    value={depositAmount}
                    onChange={handleDepositChange}
                    className="form-control"
                    placeholder={text.depositPlaceholder}
                    required
                  />
                  <label htmlFor="depositAmount">
                    {text.depositPlaceholder}
                  </label>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={depositLoading}
                >
                  {depositLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden
                      ></span>
                      {text.processing}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-wallet2 me-2" aria-hidden></i>
                      {text.submitDeposit}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="card shadow-sm" ref={transferRef}>
            <div className="card-header">
              <h5 className="mb-0">{text.transferTitle}</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleTransferSubmit} className="form-stacked">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="form-floating">
                      <input
                        id="toUsername"
                        name="toUsername"
                        value={transferData.toUsername}
                        onChange={handleTransferChange}
                        className="form-control"
                        placeholder={text.transferAccount}
                        required
                      />
                      <label htmlFor="toUsername">{text.transferAccount}</label>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="form-floating">
                      <input
                        id="transferAmount"
                        name="amount"
                        type="number"
                        min="1000"
                        step="1000"
                        value={transferData.amount}
                        onChange={handleTransferChange}
                        className="form-control"
                        placeholder={text.transferAmount}
                        required
                      />
                      <label htmlFor="transferAmount">
                        {text.transferAmount}
                      </label>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="form-floating">
                      <input
                        id="transferDescription"
                        name="description"
                        value={transferData.description}
                        onChange={handleTransferChange}
                        className="form-control"
                        placeholder={text.transferNote}
                      />
                      <label htmlFor="transferDescription">
                        {text.transferNote}
                      </label>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-sm-7">
                        <div
                          className={`form-floating ${
                            otpErrorMessage ? "has-validation-error" : ""
                          }`}
                        >
                          <input
                            id="transferOtp"
                            name="otp"
                            inputMode="numeric"
                            maxLength={6}
                            autoComplete="one-time-code"
                            value={transferData.otp}
                            onChange={handleTransferChange}
                            className={otpInputClasses}
                            ref={otpInputRef}
                            aria-invalid={otpErrorMessage ? "true" : undefined}
                            aria-describedby={
                              otpErrorMessage ? "transferOtpError" : undefined
                            }
                            placeholder={text.transferOtpPlaceholder}
                          />
                          <label htmlFor="transferOtp">
                            {text.transferOtpLabel}
                          </label>
                        </div>
                        {otpErrorMessage && (
                          <small
                            id="transferOtpError"
                            className="text-danger d-block mt-1"
                          >
                            {otpErrorMessage}
                          </small>
                        )}
                      </div>
                      <div className="col-12 col-sm-5">
                        <button
                          type="button"
                          className="btn btn-outline-primary w-100"
                          onClick={handleRequestTransferOtp}
                          disabled={
                            transferOtpStatus.sending || transferLoading
                          }
                        >
                          {transferOtpStatus.sending ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden
                              ></span>
                              {text.transferOtpRequesting}
                            </>
                          ) : (
                            <>
                              <i
                                className="bi bi-shield-lock me-2"
                                aria-hidden
                              ></i>
                              {transferOtpStatus.sent
                                ? text.transferOtpResend
                                : text.transferOtpRequest}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <small className="text-muted d-block mt-2">
                      {text.transferOtpHint}
                    </small>
                    {transferOtpStatus.sent && (
                      <small className="text-success d-block">
                        {text.transferOtpSent}
                      </small>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary mt-3"
                  disabled={transferLoading}
                >
                  {transferLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden
                      ></span>
                      {text.processing}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2" aria-hidden></i>
                      {text.submitTransfer}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card shadow-sm mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{text.analyticsTitle}</h5>
              <span
                className={`balance-chip ${
                  netChange >= 0 ? "balance-chip--up" : "balance-chip--down"
                }`}
              >
                {netChange >= 0 ? text.badgeUp : text.badgeDown}{" "}
                {formatCurrency(Math.abs(netChange))}
              </span>
            </div>
            <div className="card-body">
              <div className="insight-grid">
                <div className="insight-item">
                  <span className="insight-label text-muted">
                    {text.analyticsIncoming}
                  </span>
                  <div className="insight-value text-success">
                    {formatCurrency(insightData.monthlyIncoming)}
                  </div>
                </div>
                <div className="insight-item">
                  <span className="insight-label text-muted">
                    {text.analyticsOutgoing}
                  </span>
                  <div className="insight-value text-danger">
                    {formatCurrency(insightData.monthlyOutgoing)}
                  </div>
                </div>
                <div className="insight-item">
                  <span className="insight-label text-muted">
                    {text.analyticsPending}
                  </span>
                  <div className="insight-value">
                    {insightData.pendingCount}{" "}
                    {language === "vi" ? "giao dịch" : "tx"}
                  </div>
                </div>
              </div>
              <div className="insight-flush">
                <div className="insight-flush__item">
                  <span className="insight-label text-muted">
                    {text.analyticsSuccessRate}
                  </span>
                  <div className="insight-flush__value">
                    {formatPercent(advancedInsights.successRate)}
                  </div>
                  <small className="text-muted">
                    {language === "vi"
                      ? `${advancedInsights.completed} hoàn tất / ${advancedInsights.failed} lỗi`
                      : `${advancedInsights.completed} completed / ${advancedInsights.failed} failed`}
                  </small>
                </div>
                <div className="insight-flush__item">
                  <span className="insight-label text-muted">
                    {text.analyticsAvgTicket}
                  </span>
                  <div className="insight-flush__value text-primary">
                    {formatCurrency(advancedInsights.averageTicket)}
                  </div>
                  <small className="text-muted">
                    {language === "vi"
                      ? "Giá trị trung bình giao dịch hoàn tất"
                      : "Average settled transaction value"}
                  </small>
                </div>
                <div className="insight-flush__item insight-flush__item--wide">
                  <span className="insight-label text-muted">
                    {text.analyticsLargest}
                  </span>
                  {advancedInsights.largestTx ? (
                    <>
                      <div className="insight-flush__value text-success">
                        {formatCurrency(advancedInsights.largestTx.amount)}
                      </div>
                      <small className="text-muted">
                        {transactionLabel(advancedInsights.largestTx.type)} ·{" "}
                        {formatTimestamp(advancedInsights.largestTx.createdAt)}{" "}
                        · {advancedInsights.largestTx.reference}
                      </small>
                    </>
                  ) : (
                    <small className="text-muted">{text.analyticsNoData}</small>
                  )}
                </div>
              </div>
              <div className="mt-3 p-3 bg-light rounded">
                <p className="mb-1 fw-semibold">{text.analyticsSecurity}</p>
                <small className="text-muted">
                  {text.analyticsSecurityNote}
                </small>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mb-4 chart-card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{text.chartTitle}</h5>
              <div className="chart-legend">
                <span className="legend-dot legend-dot--in"></span>
                <small>{text.chartLegendIn}</small>
                <span className="legend-dot legend-dot--out"></span>
                <small>{text.chartLegendOut}</small>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-bars">
                {dailyStats.map((day) => {
                  const incomeHeight = Math.max(
                    4,
                    Math.round((day.incoming / chartMax) * 100)
                  );
                  const expenseHeight = Math.max(
                    4,
                    Math.round((day.outgoing / chartMax) * 100)
                  );
                  return (
                    <div className="chart-bars__column" key={day.key}>
                      <div className="chart-bars__stack">
                        <div
                          className="chart-bar chart-bar--incoming"
                          style={{ height: `${incomeHeight}%` }}
                          title={`${text.chartLegendIn} ${formatCurrency(
                            day.incoming
                          )} · ${day.tooltip}`}
                        ></div>
                        <div
                          className="chart-bar chart-bar--outgoing"
                          style={{ height: `${expenseHeight}%` }}
                          title={`${text.chartLegendOut} ${formatCurrency(
                            day.outgoing
                          )} · ${day.tooltip}`}
                        ></div>
                      </div>
                      <span className="chart-bars__label">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card shadow-sm security-card">
            <div className="card-header border-0">
              <h5 className="mb-0">
                {language === "vi" ? "Bảo mật đa lớp" : "Multi-layer security"}
              </h5>
            </div>
            <div className="card-body">
              <div className="security-card__content">
                <MfaSetup />
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">{text.recentTitle}</h5>
          <small className="text-muted">{text.recentSubtitle}</small>
        </div>
        <div className="list-group list-group-flush">
          {recentTransactions.length === 0 ? (
            <div className="list-group-item text-muted text-center py-4">
              {text.recentEmpty}
            </div>
          ) : (
            recentTransactions.map((tx) => {
              const label = transactionLabel(tx.type);
              const statusText = statusLabel(tx.status);
              const statusClass =
                statusText === text.statusCompleted
                  ? "badge bg-success-subtle text-success"
                  : statusText === text.statusPending
                  ? "badge bg-warning-subtle text-warning"
                  : "badge bg-danger-subtle text-danger";
              return (
                <button
                  key={tx.id}
                  type="button"
                  className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  onClick={() => {
                    setSelectedTx(tx);
                    setShowTxModal(true);
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <span className={`transaction-icon ${tx.type}`}>
                      <i
                        className={`bi ${
                          tx.type === "deposit"
                            ? "bi-arrow-down-circle"
                            : "bi-arrow-up-circle"
                        }`}
                        aria-hidden
                      ></i>
                    </span>
                    <div>
                      <div className="fw-semibold">
                        {label} · {tx.reference}
                      </div>
                      <small className="text-muted">
                        {maskAccount(tx.fromUsername)} →{" "}
                        {maskAccount(tx.toUsername)} ·{" "}
                        {formatTimestamp(tx.createdAt)}
                      </small>
                    </div>
                  </div>
                  <div className="text-end">
                    <div
                      className={tx.isIncoming ? "text-success" : "text-danger"}
                    >
                      {tx.isIncoming ? "+" : "-"}
                      {formatCurrency(
                        Math.abs(tx.signedAmount ?? Number(tx.amount || 0))
                      )}
                    </div>
                    <span className={statusClass}>{statusText}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <TransactionDetailsModal
        tx={selectedTx}
        show={showTxModal}
        onClose={() => setShowTxModal(false)}
      />
    </div>
  );
};

export default Dashboard;
