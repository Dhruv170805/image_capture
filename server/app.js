/**
 * app.js — Express Application Entry Point (Production Ready)
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const path = require("path");
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");

const employeeRoutes = require("./routes/employee.routes");
const uploadRoutes = require("./routes/upload.routes");
const downloadRoutes = require("./routes/download.routes");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Database ─────────────────────────────────────────────────────────────────
connectDB();

// Middleware to ensure DB is connected for API routes
const ensureDB = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ success: false, message: "Database connection error." });
  }
};

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Allow inline scripts for simpler UI if needed
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// Increased to 10MB to handle high-res base64 images
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200, // Higher limit for general API
  message: { success: false, error: "RATE_LIMIT", message: "Too many requests." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 captures per minute per IP
  message: { success: false, error: "RATE_LIMIT", message: "Too many captures." },
});

app.use(globalLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/employee", ensureDB, employeeRoutes);
app.use("/api/upload", ensureDB, uploadLimiter, uploadRoutes);
app.use("/api/download", ensureDB, downloadRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// ─── Static Files & SPA ───────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../client")));

app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "../client/index.html");
  if (require("fs").existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("UI Build not found. Please add index.html to client folder.");
  }
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Server Error]", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.code || "INTERNAL_ERROR",
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
  });
});

// ─── Start & Graceful Shutdown ────────────────────────────────────────────────
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down gracefully...");
    server.close(() => {
      mongoose.connection.close(false, () => {
        console.log("MongoDB connection closed.");
        process.exit(0);
      });
    });
  });
}

module.exports = app;
