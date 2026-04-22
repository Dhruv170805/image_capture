const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const { registerPalm, getPalm } = require("../controllers/palm.controller");

// POST /api/palm/register
router.post("/register", upload.single("image"), registerPalm);

// GET /api/palm/:code
router.get("/:code", getPalm);

module.exports = router;
