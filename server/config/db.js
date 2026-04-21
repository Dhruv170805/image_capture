/**
 * MongoDB Atlas Connection Configuration
 */

const mongoose = require("mongoose");
require("dotenv").config(); // Load from root automatically

const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  if (!MONGODB_URI) {
    console.error("❌ [DB Error] MONGODB_URI is missing in environment variables.");
    if (process.env.NODE_ENV === "production") process.exit(1);
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ [DB] Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ [DB] Connection failed:", err.message);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

module.exports = { connectDB };
