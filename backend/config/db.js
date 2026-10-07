const mongoose = require("mongoose");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Connects to MongoDB and keeps retrying with backoff instead of crashing the
 * process. While the DB is down the API answers 503 (see dbGuard in app.js)
 * and recovers by itself as soon as the database is reachable again.
 */
const connectDB = async () => {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      console.log("⏳ Connecting to MongoDB...");
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
      console.log("✅ MongoDB Connected Successfully");
      return true;
    } catch (error) {
      attempt += 1;
      const wait = Math.min(30000, 2000 * 2 ** Math.min(attempt, 4));
      console.error(`❌ MongoDB connection failed (attempt ${attempt}): ${error.message}`);
      if (!process.env.MONGODB_URI) {
        console.error("   MONGODB_URI is not set — check backend/.env");
      }
      console.error(`   Retrying in ${Math.round(wait / 1000)}s…`);
      await sleep(wait);
    }
  }
};

mongoose.connection.on("disconnected", () => console.warn("⚠️  MongoDB disconnected — driver will try to reconnect."));
mongoose.connection.on("reconnected", () => console.log("✅ MongoDB reconnected"));

module.exports = connectDB;
