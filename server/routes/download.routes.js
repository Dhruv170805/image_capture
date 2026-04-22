/**
 * Download Routes
 */

const express = require("express");
const router = express.Router();
const { 
  downloadByIds, 
  downloadByEmployee, 
  downloadByDate, 
  downloadRegisteredCSV, 
  downloadNotRegisteredCSV,
  downloadRegisteredExcel,
  downloadNotRegisteredExcel
} = require("../controllers/download.controller");

// POST /api/download/zip - Download specific selection
router.post("/zip", downloadByIds);

// GET /api/download/employee/:code - Download all for a specific employee
router.get("/employee/:code", downloadByEmployee);

// POST /api/download/date - Download by date range
router.post("/date", downloadByDate);

// GET /api/download/registered-excel
router.get("/registered-excel", downloadRegisteredExcel);

// GET /api/download/not-registered-excel
router.get("/not-registered-excel", downloadNotRegisteredExcel);

// GET /api/download/registered-csv
router.get("/registered-csv", downloadRegisteredCSV);

// GET /api/download/not-registered-csv
router.get("/not-registered-csv", downloadNotRegisteredCSV);

module.exports = router;
