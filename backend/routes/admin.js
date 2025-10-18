const express = require("express");
const { User, Log, Transaction } = require("../models");
const {
  verifyToken,
  requireAdmin,
  logAction,
} = require("../middleware/authMiddleware");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

const router = express.Router();

router.use(verifyToken);
router.use(requireAdmin);
router.use(logAction);

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  balance: Number(user.balance || 0),
  status: user.isLocked ? "locked" : "active",
  failedLoginAttempts: user.failedLoginAttempts,
  lastFailedLogin: user.lastFailedLogin,
  createdAt: user.createdAt,
});

router.get("/summary", async (req, res) => {
  try {
    const [
      totalUsers,
      lockedUsers,
      adminUsers,
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      failedTransactions,
      totalVolume,
      totalLogs,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isLocked: true } }),
      User.count({ where: { role: "admin" } }),
      Transaction.count(),
      Transaction.count({ where: { status: "completed" } }),
      Transaction.count({ where: { status: "pending" } }),
      Transaction.count({ where: { status: "failed" } }),
      Transaction.sum("amount", { where: { status: { [Op.ne]: "failed" } } }),
      Log.count(),
    ]);

    res.json({
      totalUsers,
      lockedUsers,
      adminUsers,
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      failedTransactions,
      totalVolume: Number(totalVolume || 0),
      totalLogs,
    });
  } catch (err) {
    console.error("Fetch admin summary error:", err);
    res.status(500).json({ error: "Failed to fetch admin summary" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { username, email, password, role = "user", balance = 0 } = req.body;
    const trimmedUsername = typeof username === "string" ? username.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    if (!trimmedUsername || !trimmedEmail || !password) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
    }

    const usernamePattern = /^(?=.{3,})[\p{L}\p{N}._@+-]+$/u;
    if (!usernamePattern.test(trimmedUsername)) {
      return res.status(400).json({
        error:
          "Tên tài khoản phải từ 3 ký tự, không chứa khoảng trắng và có thể dùng chữ có dấu.",
      });
    }

    const normalizedRole = role === "admin" ? "admin" : "user";

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username: trimmedUsername }, { email: trimmedEmail }],
      },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Tên đăng nhập hoặc email đã được sử dụng" });
    }

    const user = await User.create({
      username: trimmedUsername,
      email: trimmedEmail,
      password,
      role: normalizedRole,
      balance,
    });

    req.sanitizedBody = {
      action: "createUser",
      username: trimmedUsername,
      email: trimmedEmail,
      role: normalizedRole,
    };

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Không thể tạo người dùng mới" });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { status } = req.body || {};

    if (!userId || !status || !["locked", "active"].includes(status)) {
      return res.status(400).json({ error: "Yêu cầu không hợp lệ" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        error: "Không thể tự khóa hoặc mở khóa tài khoản của chính bạn",
      });
    }

    const lockUser = status === "locked";
    user.isLocked = lockUser;
    if (!lockUser) {
      user.failedLoginAttempts = 0;
      user.lastFailedLogin = null;
    }
    await user.save();

    req.sanitizedBody = {
      action: lockUser ? "lockUser" : "unlockUser",
      targetUserId: user.id,
    };

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error("Update user status error:", err);
    res.status(500).json({ error: "Không thể cập nhật trạng thái người dùng" });
  }
});

router.patch("/users/:id/password", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { password } = req.body || {};

    if (!userId || !password || password.length < 6) {
      return res
        .status(400)
        .json({ error: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    user.password = password;
    user.mfaEnabled = false;
    user.mfaSecret = null;
    await user.save();

    req.sanitizedBody = {
      action: "resetPassword",
      targetUserId: user.id,
    };

    res.json({ message: "Đã đổi mật khẩu và tắt MFA cho người dùng" });
  } catch (err) {
    console.error("Reset user password error:", err);
    res.status(500).json({ error: "Không thể đổi mật khẩu" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) {
      return res.status(400).json({ error: "Yêu cầu không hợp lệ" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    if (user.role === "admin") {
      return res
        .status(400)
        .json({ error: "Không thể xóa tài khoản quản trị" });
    }

    const transaction = await User.sequelize.transaction();
    try {
      await Transaction.destroy({
        where: {
          [Op.or]: [{ fromUserId: userId }, { toUserId: userId }],
        },
        transaction,
      });

      await Log.destroy({ where: { userId }, transaction });

      await user.destroy({ transaction });

      await transaction.commit();

      req.sanitizedBody = {
        action: "deleteUser",
        targetUserId: userId,
      };

      res.json({ message: "Đã xóa người dùng" });
    } catch (err) {
      await transaction.rollback();
      if (err.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({
          error:
            "Không thể xóa người dùng do còn dữ liệu liên quan. Vui lòng kiểm tra giao dịch/nhật ký.",
        });
      }
      throw err;
    }
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Không thể xóa người dùng" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { search = "", status = "all" } = req.query;

    const where = {};
    if (status === "locked") where.isLocked = true;
    if (status === "active") where.isLocked = false;

    const trimmed = search.trim();
    if (trimmed.length > 0) {
      const like = `%${trimmed}%`;
      where[Op.or] = [
        { username: { [Op.like]: like } },
        { email: { [Op.like]: like } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: [
        "id",
        "username",
        "email",
        "role",
        "balance",
        "isLocked",
        "failedLoginAttempts",
        "lastFailedLogin",
        "createdAt",
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const users = rows.map(sanitizeUser);

    res.json({ total: count, page, limit, users });
  } catch (err) {
    console.error("Fetch admin users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/transactions", async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { search = "", status = "all" } = req.query;

    const where = {};
    if (["pending", "completed", "failed"].includes(status)) {
      where.status = status;
    }

    const trimmed = search.trim();
    if (trimmed.length > 0) {
      const like = `%${trimmed}%`;
      where[Op.or] = [
        { description: { [Op.like]: like } },
        { type: { [Op.like]: like } },
        { "$fromUser.username$": { [Op.like]: like } },
        { "$toUser.username$": { [Op.like]: like } },
      ];
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [
        { model: User, as: "fromUser", attributes: ["username"] },
        { model: User, as: "toUser", attributes: ["username"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    const transactions = rows.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount || 0),
      status: tx.status,
      createdAt: tx.createdAt,
      description: tx.description,
      fromUser: tx.fromUser ? tx.fromUser.username : null,
      toUser: tx.toUser ? tx.toUser.username : null,
    }));

    res.json({ total: count, page, limit, transactions });
  } catch (err) {
    console.error("Fetch admin transactions error:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

router.get("/users/:id/transactions", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) {
      return res.status(400).json({ error: "Yêu cầu không hợp lệ" });
    }

    const { page, limit, offset } = parsePagination(req);

    const user = await User.findByPk(userId, {
      attributes: ["id", "username", "email"],
    });
    if (!user) {
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where: {
        [Op.or]: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: [
        { model: User, as: "fromUser", attributes: ["username"] },
        { model: User, as: "toUser", attributes: ["username"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    const transactions = rows.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount || 0),
      status: tx.status,
      createdAt: tx.createdAt,
      description: tx.description,
      fromUser: tx.fromUser ? tx.fromUser.username : null,
      toUser: tx.toUser ? tx.toUser.username : null,
    }));

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      total: count,
      page,
      limit,
      transactions,
    });
  } catch (err) {
    console.error("Fetch user transactions error:", err);
    res.status(500).json({ error: "Không thể lấy lịch sử giao dịch" });
  }
});

// Reset admin password, unlock account, disable MFA
router.post("/reset-admin", async (req, res) => {
  try {
    const adminUser = await User.findOne({ where: { role: "admin" } });
    if (!adminUser) {
      return res.status(404).json({ error: "Admin user not found" });
    }
    const newPassword = "admin123";
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    adminUser.password = hashedPassword;
    adminUser.isLocked = false;
    adminUser.failedLoginAttempts = 0;
    adminUser.mfaEnabled = false;
    adminUser.mfaSecret = null;

    await adminUser.save();

    res.json({
      message:
        'Admin password reset to "admin123", account unlocked, MFA disabled',
    });
  } catch (error) {
    console.error("Reset admin error:", error);
    res.status(500).json({ error: "Failed to reset admin account" });
  }
});

// Get audit logs (admin only) with pagination
router.get("/audit", async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { search = "" } = req.query;

    const where = {};
    const trimmed = search.trim();
    if (trimmed.length > 0) {
      const like = `%${trimmed}%`;
      where[Op.or] = [
        { action: { [Op.like]: like } },
        { details: { [Op.like]: like } },
        { ipAddress: { [Op.like]: like } },
      ];
    }

    const { count, rows } = await Log.findAndCountAll({
      where,
      include: [{ model: User, as: "user", attributes: ["username", "email"] }],
      order: [["timestamp", "DESC"]],
      limit,
      offset,
    });

    const logs = rows.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      userId: log.userId,
      ipAddress: log.ipAddress,
      details: log.details,
      username: log.user ? log.user.username : null,
      email: log.user ? log.user.email : null,
    }));

    res.json({ total: count, page, limit, logs });
  } catch (err) {
    console.error("Fetch audit logs error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

module.exports = router;
