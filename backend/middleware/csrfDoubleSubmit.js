const crypto = require("crypto");

// Generate a random token
function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

// Route handler to issue CSRF token and set cookie
function csrfTokenRoute(req, res) {
  try {
    const token = generateToken();
    // Set readable cookie for double-submit (frontend JS can read it)
    res.cookie("XSRF-TOKEN", token, { httpOnly: false, sameSite: "lax" });
    res.json({ csrfToken: token });
  } catch (err) {
    // fallback
    res.json({ csrfToken: "nocheck" });
  }
}

// Middleware to protect mutating requests using double-submit cookie pattern
function csrfProtection(req, res, next) {
  const method = (req.method || "GET").toUpperCase();
  // Only enforce for state-changing methods
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const header = req.get("x-csrf-token");
    const cookie = req.cookies && req.cookies["XSRF-TOKEN"];
    if (!header || !cookie || header !== cookie) {
      return res.status(403).json({ error: "Invalid CSRF token" });
    }
  }
  next();
}

module.exports = {
  csrfTokenRoute,
  csrfProtection,
};
