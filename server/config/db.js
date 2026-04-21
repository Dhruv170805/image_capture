/**
 * MongoDB Atlas Connection Configuration
 */

const mongoose = require("mongoose");
require("dotenv").config(); // Load from root automatically

const MONGODB_URI = process.env.MONGODB_URI;

// Global variable to cache the connection state in serverless environments
let isConnected = false;

async function connectDB() {
  if (isConnected) {
    console.log("✅ [DB] Using existing MongoDB connection");
    return;
  }

  if (!MONGODB_URI) {
    console.error("❌ [DB Error] MONGODB_URI is missing in environment variables.");
    if (process.env.NODE_ENV === "production" && process.env.VERCEL !== "1") process.exit(1);
    return;
  }

  try {
    const db = await mongoose.connect(MONGODB_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log("✅ [DB] Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ [DB] Connection failed:", err.message);
    if (process.env.NODE_ENV === "production" && process.env.VERCEL !== "1") {
      process.exit(1);
    }
  }
}

module.exports = { connectDB };
