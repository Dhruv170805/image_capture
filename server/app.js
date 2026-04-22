/**
 * app.js — Express Application Entry Point with SSE
 */

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const path = require("path");
const mongoose = require("mongoose");
const { connectDB } = require("./config/db");
const sse = require("./utils/sse");

const employeeRoutes = require("./routes/employee.routes");
const uploadRoutes = require("./routes/upload.routes");
const downloadRoutes = require("./routes/download.routes");
const palmRoutes = require("./routes/palm.routes");
const configRoutes = require("./routes/config.routes");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// ─── Database ─────────────────────────────────────────────────────────────────
connectDB();

const ensureDB = async (req, res, next) => {
  try { await connectDB(); next(); } 
  catch (err) { res.status(503).json({ success: false, message: "Database error." }); }
};

// ─── Security & Middleware ───────────────────────────────────────────────────
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false 
}));
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { success: false, error: "RATE_LIMIT", message: "Too many requests." },
});
app.use(globalLimiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.get("/api/stream", sse.handleConnection);
app.use("/api/employee", ensureDB, employeeRoutes);
app.use("/api/upload", ensureDB, uploadRoutes);
app.use("/api/download", ensureDB, downloadRoutes);
app.use("/api/palm", ensureDB, palmRoutes);
app.use("/api/config", ensureDB, configRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ─── Static Files & SPA ───────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../client")));

// Specific route for Admin
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/admin.html"));
});

app.get("*", (req, res) => {
  // If request is for an API that doesn't exist, return JSON 404 instead of index.html
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ success: false, message: `API endpoint not found: ${req.path}` });
  }
  const indexPath = path.join(__dirname, "../client/index.html");
  if (require("fs").existsSync(indexPath)) res.sendFile(indexPath);
  else res.status(404).send("UI Build not found.");
});

// ─── Start & Graceful Shutdown ────────────────────────────────────────────────
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`🔌 Real-time updates enabled via SSE`);
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

module.exports = server; // Export server for Vercel/Tests
