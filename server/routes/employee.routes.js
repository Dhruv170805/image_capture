/**
 * Employee Routes
 */

const express = require("express");
const router = express.Router();
const { validateEmployee } = require("../controllers/employee.controller");

// GET /api/employee/:code
router.get("/:code", validateEmployee);

module.exports = router;
