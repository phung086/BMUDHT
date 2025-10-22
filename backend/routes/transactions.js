const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { User, Transaction, Log } = require("../models");
const { verifyToken, logAction } = require("../middleware/authMiddleware");
const { generateReferenceCode } = require("../utils/reference");
const {
  registerReference,
  lookupReference,
  listRecentReferences,
} = require("../utils/referenceLedger");

const router = express.Router();

const transferOtpStore = new Map();
const TRANSFER_OTP_EXPIRY_MS = 5 * 60 * 1000;

const createOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: "Dữ liệu không hợp lệ" });
  }
  next();
};

// Middleware to verify token and log actions
router.use(verifyToken);
router.use(logAction);

// Get current user's balance and transaction history
router.get("/history", async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const transactions = await Transaction.findAll({
      where: {
        [require("sequelize").Op.or]: [
          { fromUserId: userId },
          { toUserId: userId },
        ],
      },
      order: [["createdAt", "DESC"]],
    });
    // Mask or decrypt sensitive details before sending (for demo we'll not expose raw encryptedDetails)
    // Include from/to usernames for display while keeping encryptedDetails private
    const sanitized = await Promise.all(
      transactions.map(async (tx) => {
        const plain = tx.get({ plain: true });
        const fromUser = await User.findByPk(plain.fromUserId, {
          attributes: ["username"],
        });
        const toUser = await User.findByPk(plain.toUserId, {
          attributes: ["username"],
        });
        const reference = generateReferenceCode(plain);
        return {
          id: plain.id,
          fromUserId: plain.fromUserId,
          toUserId: plain.toUserId,
          fromUsername: fromUser?.username,
          toUsername: toUser?.username,
          amount: plain.amount,
          type: plain.type,
          status: plain.status,
          description: plain.description,
          createdAt: plain.createdAt,
          reference,
          referenceCode: reference,
        };
      })
    );

    res.json({
      balance: user.balance,
      transactions: sanitized,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Request OTP before transfer
router.post("/transfer/request-otp", async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "email"],
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const otp = createOtp();
    const expiresAt = Date.now() + TRANSFER_OTP_EXPIRY_MS;
    transferOtpStore.set(userId, { otp, expiresAt });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[Transfer OTP] user=${user.username} email=${user.email} otp=${otp}`
      );
    }

    res.json({
      message: "OTP đã được gửi tới email bảo mật.",
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
      expiresIn: TRANSFER_OTP_EXPIRY_MS / 1000,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to issue transfer OTP" });
  }
});

// Transfer money to another user
router.post(
  "/transfer",
  [
    body("toUsername").isString().isLength({ min: 3, max: 50 }).trim(),
    body("amount").isFloat({ gt: 0 }).toFloat(),
    body("otp").isString().isLength({ min: 6, max: 6 }).trim(),
    body("description").optional().isString().isLength({ max: 255 }).trim(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const fromUserId = req.user.id;
      const { toUsername, amount, otp, description } = req.body;
      const numericAmount = Number(amount);

      const fromUser = await User.findByPk(fromUserId);
      if (!fromUser) {
        return res.status(404).json({ error: "Sender not found" });
      }

      const toUser = await User.findOne({ where: { username: toUsername } });
      if (!toUser) {
        return res.status(404).json({ error: "Recipient not found" });
      }

      if (fromUser.balance < numericAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      const otpRecord = transferOtpStore.get(fromUserId);
      if (!otpRecord) {
        return res
          .status(400)
          .json({ error: "Transfer OTP not found. Please request a new OTP." });
      }

      if (otpRecord.expiresAt < Date.now()) {
        transferOtpStore.delete(fromUserId);
        return res
          .status(400)
          .json({ error: "Transfer OTP has expired. Request a new code." });
      }

      if (otpRecord.otp !== String(otp)) {
        return res.status(400).json({ error: "Invalid transfer OTP" });
      }

      // Transaction atomicity
      const sequelize = require("../models").sequelize;
      let createdTransaction = null;

      await sequelize.transaction(async (t) => {
        fromUser.balance -= numericAmount;
        toUser.balance += numericAmount;

        await fromUser.save({ transaction: t });
        await toUser.save({ transaction: t });

        const details = { from: fromUser.username, to: toUser.username };
        const { encrypt } = require("../utils/aes");

        const sanitizedDescription = description?.trim();

        createdTransaction = await Transaction.create(
          {
            fromUserId,
            toUserId: toUser.id,
            amount: numericAmount,
            type: "transfer",
            status: "completed",
            description:
              sanitizedDescription && sanitizedDescription.length
                ? sanitizedDescription
                : `Transfer from ${fromUser.username} to ${toUser.username}`,
            encryptedDetails: encrypt(JSON.stringify(details)),
          },
          { transaction: t }
        );

        // Insert audit log (append-only)
        await Log.create(
          {
            userId: fromUserId,
            action: "transfer",
            details: `Transferred ${numericAmount} to ${toUser.username}`,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          },
          { transaction: t }
        );
      });

      transferOtpStore.delete(fromUserId);

      const referencePayload = {
        id: createdTransaction.id,
        createdAt: createdTransaction.createdAt,
        amount: createdTransaction.amount,
        type: createdTransaction.type,
        status: createdTransaction.status,
        description: createdTransaction.description,
      };

      const reference = generateReferenceCode(referencePayload);

      registerReference(reference, {
        amount: numericAmount,
        fromUser: fromUser.username,
        toUser: toUser.username,
        createdAt: createdTransaction.createdAt,
        description: createdTransaction.description,
      });

      await Log.create({
        userId: fromUserId,
        action: "transfer_reference",
        details: `Reference ${reference} issued for transfer to ${toUser.username}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      req.sanitizedBody = {
        toUsername: toUser.username,
        amount: numericAmount,
        description:
          sanitizedDescription && sanitizedDescription.length
            ? sanitizedDescription
            : undefined,
      };

      res.json({
        message: "Transfer successful",
        transfer: {
          id: createdTransaction.id,
          reference,
          amount: numericAmount,
          fromUsername: fromUser.username,
          toUsername: toUser.username,
          createdAt: createdTransaction.createdAt,
          description: createdTransaction.description,
          status: createdTransaction.status,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Transfer failed" });
    }
  }
);

router.get(
  "/reference/:code",
  [param("code").isString().isLength({ min: 6, max: 128 }).trim()],
  handleValidation,
  (req, res) => {
    if (process.env.ENABLE_REFERENCE_LOOKUP !== "true") {
      return res.status(404).json({ error: "Reference lookup is disabled" });
    }

    const record = lookupReference(req.params.code);
    if (!record) {
      return res.status(404).json({ error: "Reference not found" });
    }

    res.json({
      reference: record.reference,
      amount: record.amount,
      fromUser: record.fromUser,
      toUser: record.toUser,
      createdAt: record.createdAt,
      description: record.description,
      recordedAt: record.recordedAt,
    });
  }
);

router.get("/reference", (req, res) => {
  if (process.env.ENABLE_REFERENCE_LOOKUP !== "true") {
    return res.status(404).json({ error: "Reference lookup is disabled" });
  }

  res.json({ references: listRecentReferences() });
});

// Deposit money (for demo purposes)
router.post(
  "/deposit",
  [body("amount").isFloat({ gt: 0 }).toFloat()],
  handleValidation,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { amount } = req.body;

      const numericAmount = Number(amount);

      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      user.balance += numericAmount;
      await user.save();

      const { encrypt } = require("../utils/aes");
      await Transaction.create({
        fromUserId: userId,
        toUserId: userId,
        amount: numericAmount,
        type: "deposit",
        status: "completed",
        description: "Deposit",
        encryptedDetails: encrypt(JSON.stringify({ method: "demo-deposit" })),
      });

      await Log.create({
        userId: userId,
        action: "deposit",
        details: `Deposited ${numericAmount}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      req.sanitizedBody = {
        amount: numericAmount,
      };

      res.json({ message: "Deposit successful", newBalance: user.balance });
    } catch (error) {
      res.status(500).json({ error: "Deposit failed" });
    }
  }
);

module.exports = router;
