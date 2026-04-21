/**
 * MongoDB Atlas Connection Configuration
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("[DB Error] MONGODB_URI is not defined in .env file.");
}

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ [DB] Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ [DB] Connection failed:", err.message);
    // In production, you might want to retry or exit
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

module.exports = { connectDB };
