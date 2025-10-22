const express = require("express");
const { Op } = require("sequelize");
const {
  sequelize,
  CreditCard,
  CreditRequest,
  User,
  Transaction,
  OtpSession,
  FraudTransaction,
  Log,
  PhishingCapture,
} = require("../models");

const router = express.Router();

const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const BLOCKED_MARKER = "[blocked_by_user]";

const extractDefenseMeta = (note) => {
  if (typeof note !== "string") {
    return { action: null, reason: null };
  }
  const match = note.match(/\[blocked_by_user\]\s*(.*)$/);
  if (!match) {
    return { action: null, reason: null };
  }
  const reason = match[1]?.trim() || null;
  return { action: "blocked", reason };
};

const serializeLeakCard = (card) => ({
  id: card.id,
  userId: card.userId,
  requestId: card.requestId,
  cardNumber: card.cardNumber,
  expiryMonth: card.expiryMonth,
  expiryYear: card.expiryYear,
  cvv: card.cvv,
  leakedAt: card.leakedAt,
  leakNotes: card.leakNotes,
  status: card.status,
  fullName: card.request ? card.request.fullName : null,
  email: card.request ? card.request.email : null,
  phone: card.request ? card.request.phone : null,
  nationalId: card.request ? card.request.nationalId : null,
});

// Ensure there is a merchant account to receive fraudulent funds during the demo flow.
const resolveMerchantAccount = async () => {
  const username = process.env.FRAUD_MERCHANT_USERNAME || "blackmarket_store";
  const email =
    process.env.FRAUD_MERCHANT_EMAIL ||
    `${username}@fraud-merchant.fintech-one.test`;
  const password = process.env.FRAUD_MERCHANT_PASSWORD || "Merchant#123456";

  const [merchant] = await User.findOrCreate({
    where: { username },
    defaults: {
      email,
      password,
      role: "user",
      balance: 0,
    },
  });

  return merchant;
};

const parseAmount = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
};

const serializePhishingCapture = (capture) => ({
  id: capture.id,
  baitDomain: capture.baitDomain,
  landingPath: capture.landingPath,
  capturedUsername: capture.capturedUsername,
  capturedPassword: capture.capturedPassword,
  capturedAt: capture.capturedAt,
  victimMatched: Boolean(capture.victimMatched),
  victimUserId: capture.victimUserId,
  victim:
    capture.victim && capture.victim.username
      ? {
          id: capture.victim.id,
          username: capture.victim.username,
          email: capture.victim.email,
          fullName: capture.victim.fullName || null,
        }
      : null,
  ipAddress: capture.ipAddress,
  userAgent: capture.userAgent,
  createdAt: capture.createdAt,
  updatedAt: capture.updatedAt,
});

router.get("/leaked-cards", async (req, res) => {
  try {
    const cards = await CreditCard.findAll({
      where: { leakedAt: { [Op.not]: null } },
      include: [
        { model: CreditRequest, as: "request" },
        { model: User, as: "user" },
      ],
      order: [["leakedAt", "DESC"]],
    });
    res.json({ cards: cards.map(serializeLeakCard) });
  } catch (err) {
    console.error("Fetch leaked cards error:", err);
    res.status(500).json({ error: "Không thể lấy dữ liệu bị rò rỉ" });
  }
});

router.post("/otp/initiate", async (req, res) => {
  try {
    const {
      cardId,
      note = "",
      amount = 5000000,
      merchant = "E-Commerce Mall",
    } = req.body || {};
    const parsedCardId = parseInt(cardId, 10);
    if (Number.isNaN(parsedCardId)) {
      return res.status(400).json({ error: "CardId không hợp lệ" });
    }

    const card = await CreditCard.findByPk(parsedCardId, {
      include: [{ model: CreditRequest, as: "request" }],
    });

    if (!card) {
      return res.status(404).json({ error: "Không tìm thấy thẻ" });
    }

    if (!card.leakedAt) {
      return res
        .status(400)
        .json({ error: "Thẻ chưa bị rò rỉ, không thể mô phỏng tấn công" });
    }

    const now = new Date();
    const activeSession = await OtpSession.findOne({
      where: {
        cardId: parsedCardId,
        status: { [Op.in]: ["pending", "shared"] },
        expiresAt: { [Op.gt]: now },
      },
      order: [["createdAt", "DESC"]],
    });

    if (activeSession) {
      return res.json({
        message: "Đang có OTP chưa hết hạn, hãy tiếp tục khai thác nó",
        session: {
          id: activeSession.id,
          status: activeSession.status,
          expiresAt: activeSession.expiresAt,
        },
      });
    }

    const otpCode = randomOtp();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    const session = await OtpSession.create({
      userId: card.userId,
      cardId: card.id,
      otpCode,
      status: "pending",
      attackerNote: note || null,
      amountTarget: amount,
      merchant,
      expiresAt,
    });

    await Log.create({
      userId: card.userId,
      action: "fraud_otp_initiated",
      details: `OTP initiated for card ${card.id}`,
    });

    res.status(201).json({
      message: "Đã yêu cầu OTP giả mạo. Chờ nạn nhân cung cấp mã.",
      session: {
        id: session.id,
        status: session.status,
        expiresAt: session.expiresAt,
        merchant,
        amountTarget: Number(amount),
      },
    });
  } catch (err) {
    console.error("Fraud OTP initiate error:", err);
    res.status(500).json({ error: "Không thể tạo OTP giả mạo" });
  }
});

router.post("/payment", async (req, res) => {
  try {
    const {
      sessionId,
      otpCode = "",
      merchant = "E-Commerce Mall",
      amount = null,
      description = "Giao dịch giả mạo",
    } = req.body || {};
    const parsedSessionId = parseInt(sessionId, 10);
    if (Number.isNaN(parsedSessionId)) {
      return res.status(400).json({ error: "SessionId không hợp lệ" });
    }

    const session = await OtpSession.findByPk(parsedSessionId, {
      include: [{ model: CreditCard, as: "card" }],
    });

    if (!session) {
      return res.status(404).json({ error: "Không tồn tại phiên OTP" });
    }

    if (session.card && session.card.status === "blocked") {
      return res
        .status(403)
        .json({ error: "Thẻ đã bị khóa do nghi ngờ gian lận" });
    }

    if (
      session.status === "expired" ||
      new Date(session.expiresAt) < new Date()
    ) {
      await session.update({ status: "expired" });
      return res.status(400).json({ error: "OTP đã hết hạn" });
    }

    if (session.status === "consumed") {
      return res.status(400).json({ error: "OTP đã được sử dụng" });
    }

    if (session.otpCode !== otpCode.trim()) {
      return res.status(401).json({ error: "OTP không đúng" });
    }

    if (session.status !== "shared") {
      return res.status(400).json({ error: "Nạn nhân chưa cung cấp OTP" });
    }

    const now = new Date();
    const finalAmountRaw =
      amount !== null ? Number(amount) : Number(session.amountTarget || 0);
    const finalAmount = parseAmount(finalAmountRaw, 0);

    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: "Số tiền giao dịch không hợp lệ" });
    }

    const victim = await User.findByPk(session.userId);
    if (!victim) {
      return res.status(404).json({ error: "Không tìm thấy chủ thẻ" });
    }

    const merchantAccount = await resolveMerchantAccount();

    const ledgerDescription =
      typeof description === "string" && description.trim().length
        ? description.trim()
        : `Thanh toán giả mạo tại ${merchant}`;

    let fraudTransaction = null;
    let ledgerTransaction = null;
    let updatedVictimBalance = Number(victim.balance || 0);

    await sequelize.transaction(async (t) => {
      fraudTransaction = await FraudTransaction.create(
        {
          cardId: session.cardId,
          otpSessionId: session.id,
          amount: finalAmount,
          merchant,
          status: "success",
          description: ledgerDescription,
          executedAt: now,
        },
        { transaction: t }
      );

      const currentVictimBalance = parseAmount(victim.balance || 0, 0);
      const currentMerchantBalance = parseAmount(
        merchantAccount.balance || 0,
        0
      );

      updatedVictimBalance = Number(
        (currentVictimBalance - finalAmount).toFixed(2)
      );
      const updatedMerchantBalance = Number(
        (currentMerchantBalance + finalAmount).toFixed(2)
      );

      victim.balance = updatedVictimBalance;
      merchantAccount.balance = updatedMerchantBalance;

      await victim.save({ transaction: t });
      await merchantAccount.save({ transaction: t });

      ledgerTransaction = await Transaction.create(
        {
          fromUserId: victim.id,
          toUserId: merchantAccount.id,
          amount: finalAmount,
          type: "transfer",
          status: "completed",
          description: ledgerDescription,
          encryptedDetails: null,
        },
        { transaction: t }
      );

      await session.update(
        { status: "consumed", consumedAt: now },
        { transaction: t }
      );
      await session.card.update({ status: "compromised" }, { transaction: t });

      await Log.create(
        {
          userId: session.userId,
          action: "fraud_payment_success",
          details: `Fraud transaction ${fraudTransaction.id} executed for card ${session.cardId}`,
        },
        { transaction: t }
      );

      await Log.create(
        {
          userId: session.userId,
          action: "account_debited",
          details: `Balance reduced by ${finalAmount} due to fraud transaction ${fraudTransaction.id}`,
        },
        { transaction: t }
      );

      await Log.create(
        {
          userId: merchantAccount.id,
          action: "fraud_payment_credit",
          details: `Received ${finalAmount} from compromised card ${session.cardId}`,
        },
        { transaction: t }
      );
    });

    res.json({
      message: "Giao dịch giả mạo đã hoàn tất",
      transaction: {
        id: fraudTransaction.id,
        amount: Number(fraudTransaction.amount),
        merchant: fraudTransaction.merchant,
        executedAt: fraudTransaction.executedAt,
        ledgerId: ledgerTransaction?.id || null,
      },
      accountImpact: {
        victimBalance: updatedVictimBalance,
        merchantBalance: Number(merchantAccount.balance || 0),
      },
    });
  } catch (err) {
    console.error("Fraud payment error:", err);
    res.status(500).json({ error: "Không thể thực hiện thanh toán giả" });
  }
});

router.get("/timeline", async (req, res) => {
  try {
    const [sessions, transactions] = await Promise.all([
      OtpSession.findAll({ order: [["createdAt", "ASC"]] }),
      FraudTransaction.findAll({ order: [["createdAt", "ASC"]] }),
    ]);

    res.json({
      otpSessions: sessions.map((session) => {
        const defense = extractDefenseMeta(session.attackerNote);
        return {
          id: session.id,
          cardId: session.cardId,
          userId: session.userId,
          status: session.status,
          expiresAt: session.expiresAt,
          userSharedAt: session.userSharedAt,
          consumedAt: session.consumedAt,
          amountTarget: session.amountTarget
            ? Number(session.amountTarget)
            : null,
          merchant: session.merchant,
          createdAt: session.createdAt,
          defenseAction: defense.action,
          defenseReason: defense.reason,
        };
      }),
      fraudTransactions: transactions.map((txn) => ({
        id: txn.id,
        cardId: txn.cardId,
        otpSessionId: txn.otpSessionId,
        amount: Number(txn.amount || 0),
        merchant: txn.merchant,
        executedAt: txn.executedAt,
        status: txn.status,
        description: txn.description,
      })),
    });
  } catch (err) {
    console.error("Fraud timeline error:", err);
    res.status(500).json({ error: "Không thể lấy timeline" });
  }
});

router.post("/phishing/capture", async (req, res) => {
  try {
    const {
      username = "",
      password = "",
      baitDomain = "",
      landingPath = "",
    } = req.body || {};

    const sanitizedUsername = (username || "").trim();
    const sanitizedPassword = (password || "").trim();
    const sanitizedDomain = (baitDomain || "").trim() || "vietcornbank.com";
    const sanitizedPath = (landingPath || "").trim() || null;

    if (!sanitizedUsername || !sanitizedPassword) {
      return res
        .status(400)
        .json({ error: "Thiếu thông tin đăng nhập cần thu thập" });
    }

    const victim = await User.findOne({
      where: {
        [Op.or]: [
          { username: sanitizedUsername },
          { email: sanitizedUsername },
        ],
      },
    });

    const capture = await PhishingCapture.create({
      baitDomain: sanitizedDomain,
      landingPath: sanitizedPath,
      capturedUsername: sanitizedUsername,
      capturedPassword: sanitizedPassword,
      victimUserId: victim ? victim.id : null,
      victimMatched: Boolean(victim),
      capturedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || null,
    });

    if (victim) {
      await Log.create({
        userId: victim.id,
        action: "phishing_credentials_compromised",
        details: `Credentials harvested via bait domain ${sanitizedDomain}`,
      });
    }

    res.status(201).json({
      message: "Thông tin đang được xác minh, vui lòng chờ...",
      capture: serializePhishingCapture(capture),
    });
  } catch (err) {
    console.error("Phishing capture error:", err);
    res.status(500).json({ error: "Không thể ghi nhận thông tin lừa đảo" });
  }
});

router.get("/phishing/captures", async (req, res) => {
  try {
    const captures = await PhishingCapture.findAll({
      include: [{ model: User, as: "victim" }],
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    res.json({
      captures: captures.map(serializePhishingCapture),
    });
  } catch (err) {
    console.error("Fetch phishing captures error:", err);
    res
      .status(500)
      .json({ error: "Không thể tải danh sách thông tin bị thu thập" });
  }
});

module.exports = router;
