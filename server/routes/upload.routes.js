/**
 * Upload Routes
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { uploadImage, getLogs, serveImage, downloadAll, getStats } = require("../controllers/upload.controller");

// POST /api/upload - Upload to DB (supports multipart image field)
router.post("/", upload.single("image"), uploadImage);

// GET /api/upload/stats - Get total counts
router.get("/stats", getStats);

// GET /api/upload/logs - List history
router.get("/logs", getLogs);

// GET /api/upload/image/:id - View image from DB
router.get("/image/:id", serveImage);

// GET /api/upload/download-all - Admin ZIP download
router.get("/download-all", downloadAll);

module.exports = router;
