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
const toolsRoutes = require("./routes/toolsRoutes");
const trackerRoutes = require("./routes/trackerRoutes");
const mongoose = require("mongoose");
const gemini = require("./utils/gemini");
const { requireAuth } = require("./middleware/auth");
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

// ---------- Health (declared BEFORE rate limiting & DB guard so monitors/UI can always poll) ----------
const dbState = () => ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState] || "unknown";
const aiStatus = () => (typeof gemini.getAIStatus === "function" ? gemini.getAIStatus() : null);

app.get("/api/health", (req, res) => {
  const ai = aiStatus();
  res.json({
    success: true,
    status: "ok",
    time: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    db: dbState(),
    ai: ai ? { status: ai.status, message: ai.message } : null,
  });
});

app.get("/api/health/ai", (req, res) => {
  const ai = aiStatus();
  if (!ai) return res.status(200).json({ success: true, data: { status: "offline_engine", message: "Smart Engine active." } });
  res.json({ success: true, data: ai });
});

// Live "Test AI connection" probe (authenticated so it cannot be abused anonymously).
app.post("/api/ai/test", requireAuth, async (req, res) => {
  if (typeof gemini.pingAI !== "function") return res.json({ success: true, ok: false, reason: "unavailable" });
  const result = await gemini.pingAI();
  res.json({ success: true, ...result, status: aiStatus() });
});

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

// Stricter limit on endpoints that spend AI quota
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { success: false, message: "You're going a bit fast — please wait a few minutes before running more AI analyses." },
});
app.use(["/api/resume/upload", "/api/resume/sample", "/api/resume/match", "/api/interview/questions", "/api/interview/mock", "/api/tools"], aiLimiter);

// While MongoDB is unreachable answer with a clear 503 instead of hanging (enabled by index.js only).
app.use("/api", (req, res, next) => {
  if (app.locals.requireDb && mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      code: "DB_UNAVAILABLE",
      message: "The database is reconnecting. Please try again in a few seconds.",
    });
  }
  next();
});

app.get("/", (req, res) => {
  res.send("🚀 PrepAI Backend is Running Successfully!");
});

// ---------- Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/resume", matchRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/tools", toolsRoutes);
app.use("/api/tracker", trackerRoutes);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ---------- Global error handler ----------
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "test") console.error(err.stack || err);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON in request body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request is too large." });
  }
  if (err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 10 MB)." : "Upload failed. Please try again.";
    return res.status(400).json({ success: false, message });
  }
  if (err.message === "Only PDF and DOCX files are allowed") {
    return res.status(400).json({ success: false, message: err.message });
  }
  res.status(err.status || 500).json({
    success: false,
    message: safeErrorMessage(err, "Internal server error."),
  });
});

module.exports = app;
