const express = require("express");
const router = express.Router();
const { registerPalm, getPalm } = require("../controllers/palm.controller");

// POST /api/palm/register
router.post("/register", registerPalm);

// GET /api/palm/:code
router.get("/:code", getPalm);

module.exports = router;
