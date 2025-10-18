const jwt = require("jsonwebtoken");
const { User, Log } = require("../models");

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer token

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Verify refresh token
const verifyRefreshToken = (req, res, next) => {
  // Support refresh token via httpOnly cookie or in body
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid refresh token" });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Log user actions
const logAction = async (req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    // Log after response is sent
    setImmediate(async () => {
      try {
        const userId = req.user?.id;
        const action = req.originalUrl + " " + req.method;
        const auditPayload =
          req.sanitizedBody !== undefined ? req.sanitizedBody : req.body;
        const details = `Status: ${res.statusCode}, Body: ${JSON.stringify(
          auditPayload
        )}`;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get("User-Agent");

        await Log.create({
          userId,
          action,
          details,
          ipAddress,
          userAgent,
        });
        if (req.sanitizedBody !== undefined) {
          delete req.sanitizedBody;
        }
      } catch (error) {
        console.error("Logging error:", error);
      }
    });

    originalSend.call(this, data);
  };
  next();
};

module.exports = {
  verifyToken,
  verifyRefreshToken,
  requireAdmin,
  logAction,
};
