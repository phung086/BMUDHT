const express = require("express");
const { User, Transaction, Log } = require("../models");
const { verifyToken, logAction } = require("../middleware/authMiddleware");

const router = express.Router();

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
        const fromUser = await User.findByPk(tx.fromUserId, {
          attributes: ["username"],
        });
        const toUser = await User.findByPk(tx.toUserId, {
          attributes: ["username"],
        });
        return {
          id: tx.id,
          fromUserId: tx.fromUserId,
          toUserId: tx.toUserId,
          fromUsername: fromUser?.username,
          toUsername: toUser?.username,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          description: tx.description,
          createdAt: tx.createdAt,
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

// Transfer money to another user
router.post("/transfer", async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUsername, amount } = req.body;

    if (!toUsername || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid transfer data" });
    }

    const fromUser = await User.findByPk(fromUserId);
    if (!fromUser) {
      return res.status(404).json({ error: "Sender not found" });
    }

    const toUser = await User.findOne({ where: { username: toUsername } });
    if (!toUser) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    if (fromUser.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Transaction atomicity
    const sequelize = require("../models").sequelize;
    await sequelize.transaction(async (t) => {
      fromUser.balance -= amount;
      toUser.balance += amount;

      await fromUser.save({ transaction: t });
      await toUser.save({ transaction: t });

      const details = { from: fromUser.username, to: toUser.username };
      const { encrypt } = require("../utils/aes");

      await Transaction.create(
        {
          fromUserId,
          toUserId: toUser.id,
          amount,
          type: "transfer",
          status: "completed",
          description: `Transfer from ${fromUser.username} to ${toUser.username}`,
          encryptedDetails: encrypt(JSON.stringify(details)),
        },
        { transaction: t }
      );

      // Insert audit log (append-only)
      await Log.create(
        {
          userId: fromUserId,
          action: "transfer",
          details: `Transferred ${amount} to ${toUser.username}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        },
        { transaction: t }
      );
    });

    res.json({ message: "Transfer successful" });
  } catch (error) {
    res.status(500).json({ error: "Transfer failed" });
  }
});

// Deposit money (for demo purposes)
router.post("/deposit", async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid deposit amount" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.balance += amount;
    await user.save();

    const { encrypt } = require("../utils/aes");
    await Transaction.create({
      fromUserId: userId,
      toUserId: userId,
      amount,
      type: "deposit",
      status: "completed",
      description: "Deposit",
      encryptedDetails: encrypt(JSON.stringify({ method: "demo-deposit" })),
    });

    await Log.create({
      userId: userId,
      action: "deposit",
      details: `Deposited ${amount}`,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({ message: "Deposit successful", newBalance: user.balance });
  } catch (error) {
    res.status(500).json({ error: "Deposit failed" });
  }
});

module.exports = router;
