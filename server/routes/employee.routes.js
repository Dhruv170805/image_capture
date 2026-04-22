/**
 * Employee Routes
 */

const express = require("express");
const router = express.Router();
const { validateEmployee, uploadEmployeesCSV } = require("../controllers/employee.controller");

// GET /api/employee/:code
router.get("/:code", validateEmployee);

// POST /api/employee/upload-csv
router.post("/upload-csv", uploadEmployeesCSV);

module.exports = router;
