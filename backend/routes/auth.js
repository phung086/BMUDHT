const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User } = require("../models");
const {
  verifyToken,
  verifyRefreshToken,
  logAction,
} = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");

const router = express.Router();

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
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const user = await User.create({ username, email, password });
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login step 1: verify credentials and send OTP if MFA enabled
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
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
});

// Login step 2: verify OTP and issue tokens
router.post("/login/mfa", async (req, res) => {
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
router.post("/mfa/toggle", verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    user.mfaEnabled = !user.mfaEnabled;
    await user.save();
    res.status(200).json({ mfaEnabled: user.mfaEnabled });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle MFA" });
  }
});

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
router.put("/me", verifyToken, async (req, res) => {
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
});

// Change password
router.post("/change-password", verifyToken, async (req, res) => {
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
});

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
router.post("/mfa/verify", verifyToken, async (req, res) => {
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
});

module.exports = router;
