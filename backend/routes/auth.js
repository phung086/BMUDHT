const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const slowDown = require("express-slow-down");
const { body, validationResult } = require("express-validator");
const { User } = require("../models");
const {
  verifyToken,
  verifyRefreshToken,
} = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");

const router = express.Router();
// Validation chains reused across handlers
const loginValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 64 }).trim(),
];

const registerValidation = [
  body("username").isLength({ min: 3, max: 50 }).trim(),
  body("email").isEmail().normalizeEmail(),
  body("password").isString().isLength({ min: 8, max: 64 }).trim(),
];

const otpValidation = [
  body("userId").isInt({ min: 1 }).toInt(),
  body("otp").isString().isLength({ min: 6, max: 6 }).trim(),
];

const toggleMfaValidation = [body("enable").optional().isBoolean().toBoolean()];

const changePasswordValidation = [
  body("currentPassword").isString().isLength({ min: 8, max: 128 }),
  body("newPassword").isString().isLength({ min: 12, max: 128 }),
];

// Helper to handle validation results
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: "Dữ liệu không hợp lệ" });
  }
  return next();
};

// Rate limiting & slow down middleware
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều lần đăng nhập thất bại, thử lại sau." },
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    return `${req.ip}:${email}`;
  },
  skipSuccessfulRequests: true,
});

const loginSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (hits) => hits * 250,
  keyGenerator: loginLimiter.keyGenerator,
});

const { authenticator } = require("otplib");
const qrcode = require("qrcode");

// Setup nodemailer transporter (simulate email sending)
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
} else {
  // fallback to a no-op transporter that logs to console
  transporter = {
    sendMail: async (opts) => console.log("Sending email (simulated):", opts),
  };
}

// Helper to send OTP email
async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is: ${otp}`,
  };
  await transporter.sendMail(mailOptions);
}

// Register new user
router.post(
  "/register",
  registerValidation,
  handleValidation,
  async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const trimmedUsername = username.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (!trimmedUsername || !normalizedEmail || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const existingUser = await User.findOne({
        where: {
          [require("sequelize").Op.or]: [
            { email: normalizedEmail },
            { username: trimmedUsername },
          ],
        },
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ error: "Username or email already registered" });
      }
      const user = await User.create({
        username: trimmedUsername,
        email: normalizedEmail,
        password,
      });
      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
    }
  }
);

// Login step 1: verify credentials and send OTP if MFA enabled
router.post(
  "/login",
  loginLimiter,
  loginSpeedLimiter,
  loginValidation,
  handleValidation,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.trim().toLowerCase();
      const user = await User.findOne({ where: { email: normalizedEmail } });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (user.isLocked && user.role !== "admin") {
        return res.status(403).json({
          error: "Account locked due to multiple failed login attempts",
        });
      }
      const validPassword = await user.checkPassword(password);
      if (!validPassword) {
        // Increment failed login attempts only for non-admin users
        if (user.role !== "admin") {
          user.failedLoginAttempts += 1;
          user.lastFailedLogin = new Date();
          if (user.failedLoginAttempts >= 5) {
            user.isLocked = true;
          }
          await user.save();
        }
        return res.status(401).json({ error: "Invalid email or password" });
      }
      // Reset failed login attempts on success for all users
      user.failedLoginAttempts = 0;
      user.isLocked = false;

      if (user.role === "admin" && user.mfaEnabled) {
        // Admin accounts default to single-factor unless explicitly re-enabled later
        user.mfaEnabled = false;
        user.mfaSecret = null;
      }

      await user.save();

      if (user.mfaEnabled) {
        // Generate OTP and send email
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.mfaSecret = otp;
        await user.save();
        await sendOTPEmail(user.email, otp);
        return res.status(200).json({
          message: "OTP sent to email",
          mfaRequired: true,
          userId: user.id,
        });
      } else {
        // Issue tokens
        const accessToken = jwt.sign(
          { id: user.id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
        );
        const refreshToken = jwt.sign(
          { id: user.id, role: user.role },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: "7d" }
        );
        // set refresh token as httpOnly secure cookie (in production set secure: true)
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 7 * 24 * 3600 * 1000,
        });
        return res.status(200).json({ accessToken });
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// Login step 2: verify OTP and issue tokens
router.post("/login/mfa", otpValidation, handleValidation, async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findByPk(userId);
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({ error: "Invalid request" });
    }
    if (user.mfaSecret !== otp) {
      return res.status(401).json({ error: "Invalid OTP" });
    }
    // Clear OTP after successful verification
    user.mfaSecret = null;
    await user.save();

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 3600 * 1000,
    });
    res.status(200).json({ accessToken });
  } catch (error) {
    res.status(500).json({ error: "MFA verification failed" });
  }
});

// Refresh token endpoint
router.post("/refresh-token", verifyRefreshToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.status(200).json({ accessToken });
  } catch (error) {
    res.status(500).json({ error: "Token refresh failed" });
  }
});

// Logout - clear refresh token cookie
router.post("/logout", async (req, res) => {
  try {
    res.clearCookie("refreshToken", { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ error: "Logout failed" });
  }
});

// Enable or disable MFA for user
router.post(
  "/mfa/toggle",
  verifyToken,
  toggleMfaValidation,
  handleValidation,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      const { enable } = req.body;
      if (typeof enable === "boolean") {
        user.mfaEnabled = enable;
      } else {
        user.mfaEnabled = !user.mfaEnabled;
      }
      await user.save();
      res.status(200).json({ mfaEnabled: user.mfaEnabled });
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle MFA" });
    }
  }
);

// Get current user profile
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "username", "email", "balance", "mfaEnabled", "role"],
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update current user profile (username, email)
router.put(
  "/me",
  verifyToken,
  [
    body("username").optional().isLength({ min: 3, max: 50 }).trim(),
    body("email").optional().isEmail().normalizeEmail(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { username, email } = req.body;
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (username) user.username = username;
      if (email) user.email = email;
      await user.save();
      res.json({
        message: "Profile updated",
        user: { id: user.id, username: user.username, email: user.email },
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);

// Change password
router.post(
  "/change-password",
  verifyToken,
  changePasswordValidation,
  handleValidation,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword)
        return res.status(400).json({ error: "Missing fields" });
      const user = await User.findByPk(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      const valid = await user.checkPassword(currentPassword);
      if (!valid)
        return res.status(401).json({ error: "Current password incorrect" });
      user.password = newPassword; // will be hashed in beforeUpdate hook
      await user.save();
      res.json({ message: "Password changed" });
    } catch (err) {
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);

// Generate TOTP secret and QR (for enabling via authenticator apps)
router.post("/mfa/setup", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, "FintechDemo", secret);
    const qr = await qrcode.toDataURL(otpauth);

    // Temporarily store secret in mfaSecret until verified
    user.mfaSecret = secret;
    await user.save();

    res.json({ secret, qr });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate MFA setup" });
  }
});

// Verify TOTP and enable MFA
router.post(
  "/mfa/verify",
  verifyToken,
  [body("token").isString().isLength({ min: 6, max: 10 }).trim()],
  handleValidation,
  async (req, res) => {
    try {
      const { token } = req.body;
      const user = await User.findByPk(req.user.id);
      if (!user || !user.mfaSecret)
        return res.status(400).json({ error: "MFA not initialized" });

      const isValid = authenticator.check(token, user.mfaSecret);
      if (!isValid) return res.status(401).json({ error: "Invalid MFA token" });

      user.mfaEnabled = true;
      await user.save();
      res.json({ message: "MFA enabled" });
    } catch (err) {
      res.status(500).json({ error: "Failed to verify MFA" });
    }
  }
);
/*
const { sequelize } = require("../models");
router.post("/login-insecure-demo", async (req, res) => {
  const { email = "", password = "" } = req.body || {};
  // Ghép chuỗi trực tiếp => dễ bị chèn mã
  const [rows] = await sequelize.query(
    `SELECT * FROM users WHERE email = '${email}' AND password = '${password}' LIMIT 1`
  );
  if (rows.length > 0) {
    return res.json({ message: "Login (insecure) thành công", user: rows[0] });
  }
  return res.status(401).json({ error: "Sai email hoặc mật khẩu" });
});
*/
module.exports = router;
