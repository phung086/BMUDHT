const express = require("express");
const { User, Log, Transaction } = require("../models");
const {
  verifyToken,
  requireAdmin,
  logAction,
} = require("../middleware/authMiddleware");
const bcrypt = require("bcrypt");

const router = express.Router();

router.use(verifyToken);
router.use(requireAdmin);
router.use(logAction);

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

// Other admin routes (list users, lock/unlock, logs, etc.) can be here...

// Get audit logs (admin only) with pagination
router.get("/audit", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;

    const { count, rows } = await Log.findAndCountAll({
      order: [["timestamp", "DESC"]],
      limit,
      offset,
    });

    res.json({ total: count, page, limit, logs: rows });
  } catch (err) {
    console.error("Fetch audit logs error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

module.exports = router;
