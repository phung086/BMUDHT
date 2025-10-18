require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
// Use a lightweight double-submit CSRF implementation to avoid csurf misconfiguration
const {
  csrfTokenRoute,
  csrfProtection,
} = require("./middleware/csrfDoubleSubmit");
const { Sequelize } = require("sequelize");
const winston = require("winston");

// Import routes
const authRoutes = require("./routes/auth");
const transactionRoutes = require("./routes/transactions");
const adminRoutes = require("./routes/admin");

// Initialize Express app
const app = express();

app.set("trust proxy", 1); // Trust first proxy for rate limiting behind proxy

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cookieParser = require("cookie-parser");
app.use(cookieParser());

// Mount our lightweight CSRF protection
// The GET /api/csrf-token route issues a token and sets the XSRF-TOKEN cookie
app.get("/api/csrf-token", csrfTokenRoute);

// Apply csrfProtection middleware for all API routes (it will only enforce
// on mutating methods). Attach before routes are mounted so all API endpoints
// are protected.
app.use((req, res, next) => {
  // allow the csrf token route through
  if (req.path === "/api/csrf-token") return next();
  return csrfProtection(req, res, next);
});

// Rate limiting (after cookie parsing so downstream middleware that relies on cookies)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
});

app.use(limiter);

// Serve favicon.ico and manifest.json from frontend public folder
const path = require("path");
app.use(
  "/favicon.ico",
  express.static(path.join(__dirname, "../frontend/public/favicon.ico"))
);
app.use(
  "/manifest.json",
  express.static(path.join(__dirname, "../frontend/public/manifest.json"))
);

// ...csrf token route is mounted above from middleware/csrfDoubleSubmit

// Logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "fintech-backend" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Database connection
const db = require("./models/index");
const sequelize = db.sequelize;

// Test DB connection
sequelize
  .authenticate()
  .then(() => logger.info("Database connected"))
  .catch((err) => logger.error("Database connection failed:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  logger.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
