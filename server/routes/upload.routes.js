/**
 * Upload Routes
 */

const express = require("express");
const router = express.Router();
const { uploadImage, getLogs, serveImage, downloadAll } = require("../controllers/upload.controller");

// POST /api/upload - Upload to DB
router.post("/", uploadImage);

// GET /api/upload/logs - List history
router.get("/logs", getLogs);

// GET /api/upload/image/:id - View image from DB
router.get("/image/:id", serveImage);

// GET /api/upload/download-all - Admin ZIP download
router.get("/download-all", downloadAll);

module.exports = router;
