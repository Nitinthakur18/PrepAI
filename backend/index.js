require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const app = require("./app");

connectDB();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
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
