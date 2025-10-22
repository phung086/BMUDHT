const express = require("express");
const { Op } = require("sequelize");
const {
  sequelize,
  CreditRequest,
  CreditCard,
  OtpSession,
  FraudTransaction,
  CardUnlockRequest,
  User,
  Log,
} = require("../models");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

const maskCardNumber = (cardNumber = "") => {
  if (!cardNumber) return "";
  return cardNumber.replace(/\d(?=\d{4})/g, "*");
};

const randomDigits = (length) => {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
};

const generateCardPayload = () => {
  const now = new Date();
  const expiryYear = now.getFullYear() + 4;
  const expiryMonth = now.getMonth() + 1 === 12 ? 12 : now.getMonth() + 1;
  return {
    cardNumber: randomDigits(16),
    expiryMonth,
    expiryYear,
    cvv: randomDigits(3),
  };
};

const serializeRequest = (request) => ({
  id: request.id,
  status: request.status,
  fullName: request.fullName,
  dateOfBirth: request.dateOfBirth,
  email: request.email,
  phone: request.phone,
  nationalId: request.nationalId,
  incomeLevel: request.incomeLevel,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  card: request.card
    ? {
        id: request.card.id,
        maskedNumber: maskCardNumber(request.card.cardNumber),
        expiryMonth: request.card.expiryMonth,
        expiryYear: request.card.expiryYear,
        status: request.card.status,
        leakedAt: request.card.leakedAt,
      }
    : null,
});

const serializeCard = (card) => ({
  id: card.id,
  maskedNumber: maskCardNumber(card.cardNumber),
  cardNumber: card.cardNumber,
  expiryMonth: card.expiryMonth,
  expiryYear: card.expiryYear,
  cvv: card.cvv,
  status: card.status,
  leakedAt: card.leakedAt,
  creditLimit: Number(card.creditLimit || 0),
  requestId: card.requestId,
  createdAt: card.createdAt,
});

const BLOCKED_MARKER = "[blocked_by_user]";

const extractDefenseMeta = (attackerNote) => {
  if (typeof attackerNote !== "string") {
    return { action: null, reason: null };
  }
  const match = attackerNote.match(/\[blocked_by_user\]\s*(.*)$/);
  if (!match) {
    return { action: null, reason: null };
  }
  const reason = match[1]?.trim() || null;
  return { action: "blocked", reason };
};

const serializeOtpSession = (session) => {
  const defense = extractDefenseMeta(session.attackerNote);
  return {
    id: session.id,
    status: session.status,
    attackerNote: session.attackerNote,
    amountTarget: session.amountTarget ? Number(session.amountTarget) : null,
    merchant: session.merchant,
    expiresAt: session.expiresAt,
    userSharedAt: session.userSharedAt,
    consumedAt: session.consumedAt,
    createdAt: session.createdAt,
    defenseAction: defense.action,
    defenseReason: defense.reason,
  };
};

const serializeFraudTransaction = (txn) => ({
  id: txn.id,
  amount: Number(txn.amount || 0),
  merchant: txn.merchant,
  status: txn.status,
  executedAt: txn.executedAt,
  createdAt: txn.createdAt,
  description: txn.description,
});

const UNLOCK_OTP_TTL_MINUTES = 5;
const UNLOCK_OTP_LENGTH = 6;
const UNLOCK_MAX_ATTEMPTS = 5;

const sanitizeIdentityField = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeComparable = (value) =>
  sanitizeIdentityField(value).toLowerCase();

const normalizeDigits = (value) =>
  sanitizeIdentityField(value).replace(/\D/g, "");

const normalizeDateOnly = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const matchesIdentityProfile = (creditRequest, payload) => {
  if (!creditRequest) {
    return false;
  }
  const requestSnapshot = {
    fullName: normalizeComparable(creditRequest.fullName),
    email: normalizeComparable(creditRequest.email),
    phone: normalizeDigits(creditRequest.phone),
    nationalId: normalizeComparable(creditRequest.nationalId),
    dateOfBirth: normalizeDateOnly(creditRequest.dateOfBirth),
  };

  const attempt = {
    fullName: normalizeComparable(payload.fullName),
    email: normalizeComparable(payload.email),
    phone: normalizeDigits(payload.phone),
    nationalId: normalizeComparable(payload.nationalId),
    dateOfBirth: normalizeDateOnly(payload.dateOfBirth),
  };

  if (
    !attempt.fullName ||
    !attempt.email ||
    !attempt.phone ||
    !attempt.nationalId
  ) {
    return false;
  }

  return (
    requestSnapshot.fullName === attempt.fullName &&
    requestSnapshot.email === attempt.email &&
    requestSnapshot.phone === attempt.phone &&
    requestSnapshot.nationalId === attempt.nationalId &&
    requestSnapshot.dateOfBirth === attempt.dateOfBirth
  );
};

const generateUnlockOtp = () => randomDigits(UNLOCK_OTP_LENGTH);

const serializeUnlockRequest = (request, { includeOtp = false } = {}) => {
  const payload = {
    id: request.id,
    cardId: request.cardId,
    status: request.status,
    expiresAt: request.expiresAt,
    verifiedAt: request.verifiedAt,
    attempts: request.attempts,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };

  if (includeOtp) {
    payload.otpCode = request.otpCode;
  }

  return payload;
};

const ensureFutureSessionsMarked = async (sessions) => {
  const now = new Date();
  const expiredIds = sessions
    .filter(
      (session) =>
        session.status !== "expired" && new Date(session.expiresAt) < now
    )
    .map((session) => session.id);
  if (expiredIds.length > 0) {
    await OtpSession.update(
      { status: "expired" },
      {
        where: {
          id: { [Op.in]: expiredIds },
        },
      }
    );
  }
};

router.post("/requests", verifyToken, async (req, res) => {
  try {
    const {
      fullName = "",
      dateOfBirth = "",
      email = "",
      phone = "",
      nationalId = "",
      incomeLevel = "",
    } = req.body || {};

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedNationalId = nationalId.trim();

    if (
      !trimmedName ||
      !dateOfBirth ||
      !trimmedEmail ||
      !trimmedPhone ||
      !trimmedNationalId
    ) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
    }

    const parsedDob = new Date(dateOfBirth);
    if (Number.isNaN(parsedDob.getTime())) {
      return res.status(400).json({ error: "Ngày sinh không hợp lệ" });
    }

    const request = await CreditRequest.create({
      userId: req.user.id,
      fullName: trimmedName,
      dateOfBirth,
      email: trimmedEmail,
      phone: trimmedPhone,
      nationalId: trimmedNationalId,
      incomeLevel: incomeLevel ? incomeLevel.trim() : null,
      status: "pending",
    });

    await Log.create({
      userId: req.user.id,
      action: "credit_request_created",
      details: `Credit request ${request.id} created`,
    });

    res.status(201).json({ request: serializeRequest(request) });
  } catch (err) {
    console.error("Create credit request error:", err);
    res.status(500).json({ error: "Không thể gửi yêu cầu mở thẻ" });
  }
});

router.get("/requests/me", verifyToken, async (req, res) => {
  try {
    const requests = await CreditRequest.findAll({
      where: { userId: req.user.id },
      include: [{ model: CreditCard, as: "card" }],
      order: [["createdAt", "DESC"]],
    });
    res.json({ requests: requests.map(serializeRequest) });
  } catch (err) {
    console.error("Fetch my credit requests error:", err);
    res.status(500).json({ error: "Không thể lấy danh sách yêu cầu" });
  }
});

router.get("/cards/me", verifyToken, async (req, res) => {
  try {
    const cards = await CreditCard.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    res.json({ cards: cards.map(serializeCard) });
  } catch (err) {
    console.error("Fetch my credit cards error:", err);
    res.status(500).json({ error: "Không thể lấy thông tin thẻ" });
  }
});

router.get("/otp/pending", verifyToken, async (req, res) => {
  try {
    const sessions = await OtpSession.findAll({
      where: {
        userId: req.user.id,
        status: { [Op.in]: ["pending", "shared"] },
      },
      order: [["createdAt", "DESC"]],
    });

    await ensureFutureSessionsMarked(sessions);

    const freshSessions = sessions.filter(
      (session) =>
        session.status !== "expired" && new Date(session.expiresAt) > new Date()
    );

    if (freshSessions.length === 0) {
      return res.json({ session: null });
    }

    const latest = freshSessions[0];
    res.json({
      session: {
        ...serializeOtpSession(latest),
        otpCode: latest.otpCode,
      },
    });
  } catch (err) {
    console.error("Fetch pending OTP error:", err);
    res.status(500).json({ error: "Không thể lấy thông tin OTP" });
  }
});

router.post("/otp/share", verifyToken, async (req, res) => {
  try {
    const { sessionId, otpCode = "" } = req.body || {};
    const session = await OtpSession.findOne({
      where: {
        id: sessionId,
        userId: req.user.id,
      },
      include: [{ model: CreditCard, as: "card" }],
    });

    if (!session) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu OTP" });
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
      return res.status(401).json({ error: "OTP không chính xác" });
    }

    const now = new Date();
    await session.update({ status: "shared", userSharedAt: now });

    await Log.create({
      userId: req.user.id,
      action: "otp_shared",
      details: `User ${req.user.id} shared OTP for card ${session.cardId}`,
    });

    res.json({
      message: "Bạn đã cung cấp OTP. (Đây chỉ là mô phỏng hãy luôn cảnh giác!)",
      session: serializeOtpSession(session),
    });
  } catch (err) {
    console.error("Share OTP error:", err);
    res.status(500).json({ error: "Không thể xác nhận OTP" });
  }
});

router.post("/otp/report", verifyToken, async (req, res) => {
  try {
    const { sessionId, reason = "OTP nghi ngờ lừa đảo" } = req.body || {};
    const sanitizedReason =
      typeof reason === "string" && reason.trim().length
        ? reason.trim()
        : "OTP nghi ngờ lừa đảo";

    const session = await OtpSession.findOne({
      where: {
        id: sessionId,
        userId: req.user.id,
      },
      include: [{ model: CreditCard, as: "card" }],
    });

    if (!session) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu OTP" });
    }

    if (session.status === "consumed") {
      return res
        .status(400)
        .json({ error: "Giao dịch đã hoàn tất, không thể báo cáo" });
    }

    if (session.status === "expired") {
      return res.status(400).json({ error: "OTP đã hết hiệu lực" });
    }

    const now = new Date();
    const defenseNote = `${BLOCKED_MARKER} ${sanitizedReason}`;
    const updatedNote = session.attackerNote?.includes(BLOCKED_MARKER)
      ? session.attackerNote
      : [session.attackerNote, defenseNote].filter(Boolean).join(" | ");

    let blockedTransaction = null;

    await sequelize.transaction(async (t) => {
      await session.update(
        {
          status: "expired",
          expiresAt: now,
          attackerNote: updatedNote,
        },
        { transaction: t }
      );
      session.status = "expired";
      session.expiresAt = now;
      session.attackerNote = updatedNote;

      if (session.card && session.card.status !== "blocked") {
        await session.card.update({ status: "blocked" }, { transaction: t });
        session.card.status = "blocked";
      }

      blockedTransaction = await FraudTransaction.create(
        {
          cardId: session.cardId,
          otpSessionId: session.id,
          amount: Number(session.amountTarget || 0),
          merchant: session.merchant || "Không xác định",
          status: "failed",
          description: `OTP bị báo cáo: ${sanitizedReason}. Giao dịch đã bị chặn bởi hệ thống.`,
          executedAt: now,
        },
        { transaction: t }
      );

      await Log.create(
        {
          userId: req.user.id,
          action: "otp_reported",
          details: `User ${req.user.id} reported OTP session ${session.id}: ${sanitizedReason}`,
        },
        { transaction: t }
      );

      if (session.card) {
        await Log.create(
          {
            userId: session.card.userId,
            action: "card_blocked_by_user",
            details: `Card ${session.cardId} blocked after suspicious OTP: ${sanitizedReason}`,
          },
          { transaction: t }
        );
      }
    });

    res.json({
      message:
        "Đã ghi nhận báo cáo. Thẻ bị khóa tạm thời và giao dịch bị chặn.",
      session: serializeOtpSession(session.reload()),
      blockedTransaction: blockedTransaction
        ? serializeFraudTransaction(blockedTransaction)
        : null,
    });
  } catch (err) {
    console.error("Report suspicious OTP error:", err);
    res.status(500).json({ error: "Không thể báo cáo OTP" });
  }
});

router.post("/unlock/request", verifyToken, async (req, res) => {
  try {
    const {
      cardId,
      fullName = "",
      dateOfBirth = "",
      email = "",
      phone = "",
      nationalId = "",
    } = req.body || {};

    const parsedCardId = parseInt(cardId, 10);
    if (Number.isNaN(parsedCardId)) {
      return res.status(400).json({ error: "Thẻ không hợp lệ" });
    }

    const normalizedDob = normalizeDateOnly(dateOfBirth);
    if (!normalizedDob) {
      return res.status(400).json({ error: "Ngày sinh không hợp lệ" });
    }

    const card = await CreditCard.findOne({
      where: { id: parsedCardId, userId: req.user.id },
      include: [{ model: CreditRequest, as: "request" }],
    });

    if (!card) {
      return res.status(404).json({ error: "Không tìm thấy thẻ" });
    }

    if (card.status !== "blocked") {
      return res
        .status(400)
        .json({ error: "Thẻ hiện không bị khóa, không cần mở khóa" });
    }

    const identityMatches = matchesIdentityProfile(card.request, {
      fullName,
      email,
      phone,
      nationalId,
      dateOfBirth: normalizedDob,
    });

    if (!identityMatches) {
      return res
        .status(403)
        .json({ error: "Thông tin xác minh không khớp với hồ sơ mở thẻ" });
    }

    const now = new Date();

    await CardUnlockRequest.update(
      { status: "expired" },
      {
        where: {
          userId: req.user.id,
          cardId: card.id,
          status: "pending",
          expiresAt: { [Op.lte]: now },
        },
      }
    );

    const existing = await CardUnlockRequest.findOne({
      where: {
        userId: req.user.id,
        cardId: card.id,
        status: "pending",
        expiresAt: { [Op.gt]: now },
      },
      order: [["createdAt", "DESC"]],
    });

    if (existing) {
      return res.json({
        message: "OTP mở khóa đã được gửi. Vui lòng kiểm tra hộp thư mô phỏng.",
        request: serializeUnlockRequest(existing, { includeOtp: true }),
        card: serializeCard(card),
      });
    }

    const otpCode = generateUnlockOtp();
    const expiresAt = new Date(
      now.getTime() + UNLOCK_OTP_TTL_MINUTES * 60 * 1000
    );

    const unlockRequest = await CardUnlockRequest.create({
      userId: req.user.id,
      cardId: card.id,
      fullName: sanitizeIdentityField(fullName),
      email: sanitizeIdentityField(email),
      phone: sanitizeIdentityField(phone),
      nationalId: sanitizeIdentityField(nationalId),
      otpCode,
      expiresAt,
    });

    await Log.create({
      userId: req.user.id,
      action: "card_unlock_otp_sent",
      details: `Unlock OTP generated for card ${card.id}`,
    });

    res.status(201).json({
      message: "Đã gửi OTP xác nhận mở khóa thẻ.",
      request: serializeUnlockRequest(unlockRequest, { includeOtp: true }),
      card: serializeCard(card),
    });
  } catch (err) {
    console.error("Request card unlock OTP error:", err);
    res.status(500).json({ error: "Không thể tạo yêu cầu mở khóa thẻ" });
  }
});

router.post("/unlock/verify", verifyToken, async (req, res) => {
  try {
    const { requestId, otpCode = "" } = req.body || {};
    const parsedRequestId = parseInt(requestId, 10);

    if (Number.isNaN(parsedRequestId)) {
      return res.status(400).json({ error: "Yêu cầu mở khóa không hợp lệ" });
    }

    const unlockRequest = await CardUnlockRequest.findByPk(parsedRequestId, {
      include: [
        {
          model: CreditCard,
          as: "card",
          include: [{ model: CreditRequest, as: "request" }],
        },
      ],
    });

    if (!unlockRequest || unlockRequest.userId !== req.user.id) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu mở khóa" });
    }

    const { card } = unlockRequest;
    if (!card || card.userId !== req.user.id) {
      return res.status(404).json({ error: "Không tìm thấy thẻ" });
    }

    if (unlockRequest.status === "verified") {
      return res.json({
        message: "Thẻ đã được mở khóa trước đó.",
        request: serializeUnlockRequest(unlockRequest),
        card: serializeCard(card),
      });
    }

    if (unlockRequest.status === "failed") {
      return res.status(400).json({
        error:
          "Yêu cầu đã bị khóa do nhập sai nhiều lần. Vui lòng gửi lại yêu cầu mới.",
        request: serializeUnlockRequest(unlockRequest),
      });
    }

    const now = new Date();
    if (new Date(unlockRequest.expiresAt) < now) {
      await unlockRequest.update({ status: "expired" });
      return res.status(400).json({
        error: "OTP đã hết hạn. Vui lòng gửi lại yêu cầu mới.",
        request: serializeUnlockRequest(unlockRequest),
      });
    }

    const trimmedOtp = sanitizeIdentityField(otpCode);
    if (!trimmedOtp) {
      return res.status(400).json({ error: "Cần nhập mã OTP" });
    }

    if (unlockRequest.otpCode !== trimmedOtp) {
      const attempts = unlockRequest.attempts + 1;
      const updates = { attempts };
      if (attempts >= UNLOCK_MAX_ATTEMPTS) {
        updates.status = "failed";
      }

      await unlockRequest.update(updates);
      unlockRequest.attempts = attempts;
      if (updates.status) {
        unlockRequest.status = updates.status;
      }

      await Log.create({
        userId: req.user.id,
        action: "card_unlock_otp_failed",
        details: `Unlock OTP failed for card ${unlockRequest.cardId} (attempt ${attempts})`,
      });

      return res.status(401).json({
        error:
          attempts >= UNLOCK_MAX_ATTEMPTS
            ? "OTP không chính xác quá số lần cho phép. Yêu cầu đã bị khóa."
            : "OTP không chính xác. Vui lòng thử lại.",
        request: serializeUnlockRequest(unlockRequest),
      });
    }

    await sequelize.transaction(async (t) => {
      await unlockRequest.update(
        {
          status: "verified",
          verifiedAt: now,
        },
        { transaction: t }
      );

      if (card.status === "blocked") {
        await card.update({ status: "active" }, { transaction: t });
        card.status = "active";
      }

      await CardUnlockRequest.update(
        { status: "expired" },
        {
          where: {
            cardId: card.id,
            status: "pending",
            id: { [Op.ne]: unlockRequest.id },
          },
          transaction: t,
        }
      );

      await Log.create(
        {
          userId: req.user.id,
          action: "card_unlocked",
          details: `Card ${card.id} unlocked via OTP verification`,
        },
        { transaction: t }
      );
    });

    await unlockRequest.reload();
    await card.reload();

    return res.json({
      message: "Xác thực thành công. Thẻ đã được mở khóa.",
      request: serializeUnlockRequest(unlockRequest),
      card: serializeCard(card),
    });
  } catch (err) {
    console.error("Verify card unlock OTP error:", err);
    res.status(500).json({ error: "Không thể xác thực OTP mở khóa thẻ" });
  }
});

router.get("/unlock/status", verifyToken, async (req, res) => {
  try {
    const { cardId } = req.query || {};
    const parsedCardId = parseInt(cardId, 10);

    if (Number.isNaN(parsedCardId)) {
      return res.status(400).json({ error: "Thẻ không hợp lệ" });
    }

    const card = await CreditCard.findOne({
      where: { id: parsedCardId, userId: req.user.id },
    });

    if (!card) {
      return res.status(404).json({ error: "Không tìm thấy thẻ" });
    }

    const now = new Date();
    await CardUnlockRequest.update(
      { status: "expired" },
      {
        where: {
          userId: req.user.id,
          cardId: card.id,
          status: "pending",
          expiresAt: { [Op.lte]: now },
        },
      }
    );

    const latest = await CardUnlockRequest.findOne({
      where: {
        userId: req.user.id,
        cardId: card.id,
      },
      order: [["createdAt", "DESC"]],
    });

    if (!latest) {
      return res.json({ request: null, card: serializeCard(card) });
    }

    const includeOtp = latest.status === "pending";

    return res.json({
      request: serializeUnlockRequest(latest, { includeOtp }),
      card: serializeCard(card),
    });
  } catch (err) {
    console.error("Fetch card unlock status error:", err);
    res.status(500).json({ error: "Không thể lấy trạng thái mở khóa thẻ" });
  }
});

router.get("/timeline", verifyToken, async (req, res) => {
  try {
    const [requests, cards, sessions, frauds] = await Promise.all([
      CreditRequest.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "ASC"]],
      }),
      CreditCard.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "ASC"]],
      }),
      OtpSession.findAll({
        where: { userId: req.user.id },
        order: [["createdAt", "ASC"]],
      }),
      FraudTransaction.findAll({
        include: [{ model: CreditCard, as: "card" }],
        order: [["createdAt", "ASC"]],
        where: { "$card.userId$": req.user.id },
      }),
    ]);

    res.json({
      requests: requests.map(serializeRequest),
      cards: cards.map(serializeCard),
      otpSessions: sessions.map(serializeOtpSession),
      fraudTransactions: frauds.map(serializeFraudTransaction),
    });
  } catch (err) {
    console.error("Fetch timeline error:", err);
    res.status(500).json({ error: "Không thể lấy dữ liệu timeline" });
  }
});

router.get("/requests", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status = "all" } = req.query;
    const where = {};
    if (["pending", "approved", "rejected"].includes(status)) {
      where.status = status;
    }
    const requests = await CreditRequest.findAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["id", "username", "email"] },
        { model: CreditCard, as: "card" },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({
      requests: requests.map((request) => ({
        ...serializeRequest(request),
        user: request.user,
      })),
    });
  } catch (err) {
    console.error("Admin fetch credit requests error:", err);
    res.status(500).json({ error: "Không thể lấy danh sách yêu cầu" });
  }
});

router.post(
  "/requests/:id/approve",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      const { creditLimit = 60000 } = req.body || {};
      if (Number.isNaN(requestId)) {
        return res.status(400).json({ error: "Yêu cầu không hợp lệ" });
      }
      const request = await CreditRequest.findByPk(requestId);
      if (!request) {
        return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
      }
      if (request.status === "approved") {
        return res.status(400).json({ error: "Yêu cầu đã được phê duyệt" });
      }
      const payload = generateCardPayload();
      const card = await CreditCard.create({
        userId: request.userId,
        requestId: request.id,
        cardNumber: payload.cardNumber,
        expiryMonth: payload.expiryMonth,
        expiryYear: payload.expiryYear,
        cvv: payload.cvv,
        creditLimit,
        status: "active",
      });
      await request.update({ status: "approved" });

      await Log.create({
        userId: req.user.id,
        action: "credit_request_approved",
        details: `Approved request ${request.id} for user ${request.userId}`,
      });

      res.json({
        message: "Đã phê duyệt và tạo thẻ tín dụng",
        card: serializeCard(card),
      });
    } catch (err) {
      console.error("Approve credit request error:", err);
      res.status(500).json({ error: "Không thể phê duyệt yêu cầu" });
    }
  }
);

router.post(
  "/requests/:id/reject",
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      const { reason = "" } = req.body || {};
      if (Number.isNaN(requestId)) {
        return res.status(400).json({ error: "Yêu cầu không hợp lệ" });
      }
      const request = await CreditRequest.findByPk(requestId);
      if (!request) {
        return res.status(404).json({ error: "Không tìm thấy yêu cầu" });
      }
      if (request.status === "approved") {
        return res
          .status(400)
          .json({ error: "Yêu cầu đã phê duyệt, không thể từ chối" });
      }
      await request.update({ status: "rejected", riskNotes: reason || null });

      await Log.create({
        userId: req.user.id,
        action: "credit_request_rejected",
        details: `Rejected request ${request.id}`,
      });

      res.json({ message: "Đã từ chối yêu cầu" });
    } catch (err) {
      console.error("Reject credit request error:", err);
      res.status(500).json({ error: "Không thể từ chối yêu cầu" });
    }
  }
);

router.post("/cards/:id/leak", verifyToken, requireAdmin, async (req, res) => {
  try {
    const cardId = parseInt(req.params.id, 10);
    const { note = "" } = req.body || {};

    if (Number.isNaN(cardId)) {
      return res.status(400).json({ error: "Yêu cầu không hợp lệ" });
    }

    const card = await CreditCard.findByPk(cardId);
    if (!card) {
      return res.status(404).json({ error: "Không tìm thấy thẻ" });
    }

    const now = new Date();
    await card.update({
      leakedAt: now,
      leakNotes: note || null,
      status: "compromised",
    });

    await Log.create({
      userId: req.user.id,
      action: "credit_card_leaked",
      details: `Card ${card.id} leaked`,
    });

    res.json({
      message: "Đã mô phỏng việc rò rỉ dữ liệu thẻ",
      card: serializeCard(card),
    });
  } catch (err) {
    console.error("Leak credit card error:", err);
    res.status(500).json({ error: "Không thể mô phỏng rò rỉ" });
  }
});

module.exports = router;
