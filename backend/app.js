const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const matchRoutes = require("./routes/matchRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const { safeErrorMessage } = require("./utils/safeError");

const app = express();

// ---------- Core middleware ----------
app.use(helmet({ crossOriginResourcePolicy: false }));

// Quiet request logging during automated tests; identical behavior for
// dev/production.
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
  : true; // reflect request origin in dev if not configured

if (process.env.NODE_ENV === "production" && !process.env.CLIENT_ORIGIN) {
  // Not fatal — the reflect-origin fallback still works — but this is
  // almost certainly a misconfiguration in production, where CORS should
  // be locked to a specific known frontend origin.
  console.warn(
    "⚠️  CLIENT_ORIGIN is not set in production. CORS is reflecting any request origin, which is overly permissive. Set CLIENT_ORIGIN to your deployed frontend URL(s)."
  );
}

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "5mb" }));

// Basic rate limiting on all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// Stricter limiting specifically on login/register: a legitimate user will
// never approach this many attempts in 15 minutes, but it meaningfully
// slows down credential-stuffing / brute-force attempts against accounts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please wait a few minutes and try again.",
  },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ---------- Health check ----------
app.get("/", (req, res) => {
  res.send("🚀 PrepAI Backend is Running Successfully!");
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok", time: new Date().toISOString() });
});

// ---------- Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/resume", matchRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/analytics", analyticsRoutes);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ---------- Global error handler ----------
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "test") console.error(err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: safeErrorMessage(err, "Internal server error."),
  });
});

module.exports = app;
