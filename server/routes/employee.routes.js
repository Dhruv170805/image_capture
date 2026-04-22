/**
 * Employee Routes
 */

const express = require("express");
const router = express.Router();
const { 
  validateEmployee, 
  uploadEmployeesCSV, 
  downloadTemplate, 
  uploadEmployeesExcel 
} = require("../controllers/employee.controller");

// Static routes first to avoid matching dynamic :code
// GET /api/employee/template/download - Download Excel template
router.get("/template/download", downloadTemplate);

// POST /api/employee/upload-excel - Upload employee data via Excel
router.post("/upload-excel", uploadEmployeesExcel);

// POST /api/employee/upload-csv - Legacy CSV upload
router.post("/upload-csv", uploadEmployeesCSV);

// GET /api/employee/:code - Intelligent lookup (Code or EMPALIAS Code)
router.get("/:code", validateEmployee);

module.exports = router;
