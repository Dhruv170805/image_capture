const express = require("express");
const router = express.Router();
const { getRegistrationMode, updateRegistrationMode } = require("../controllers/config.controller");

router.get("/registration-mode", getRegistrationMode);
router.post("/update-mode", updateRegistrationMode);

module.exports = router;
