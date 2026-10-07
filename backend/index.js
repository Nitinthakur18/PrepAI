require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const app = require("./app");

// Never let a stray rejected promise (e.g. a failed AI call) take the server down.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason && reason.stack ? reason.stack : reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err && err.stack ? err.stack : err);
});

// Reject API calls with a clear 503 while MongoDB is unreachable (see app.js).
app.locals.requireDb = true;
connectDB(); // retries with backoff; does not exit the process

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});

// Graceful shutdown: stop accepting new connections and close the DB
// connection cleanly on SIGTERM/SIGINT (sent by Docker, most PaaS hosts,
// and process managers like Ctrl+C or `docker stop`).
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
    } catch (err) {
      console.error("Error while closing MongoDB connection:", err.message);
    } finally {
      console.log("✅ Server closed.");
      process.exit(0);
    }
  });

  // Force-exit if shutdown hangs for too long.
  setTimeout(() => {
    console.error("⏱️  Forced shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
