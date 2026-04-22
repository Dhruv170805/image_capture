/**
 * Download Controller
 * Handles HTTP endpoints for bulk ZIP downloads
 */

const mongoose = require("mongoose");
const { streamImagesToZip, MAX_DOWNLOAD_LIMIT } = require("../services/download.service");
const ImageLog = require("../models/ImageLog");
const Employee = require("../models/Employee");

// GET /api/download/registered-csv
async function downloadRegisteredCSV(req, res) {
  try {
    const logs = await ImageLog.find({}).sort({ CapturedAt: -1 }).select("-ImageData");
    let csv = "EmployeeCode,EmployeeName,Department,CapturedAt_IST\n";
    logs.forEach(log => {
      const istTime = new Date(log.CapturedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      csv += `"${log.EmployeeCode}","${log.EmployeeName}","${log.Department}","${istTime}"\n`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.attachment("registered_employees.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/download/not-registered-csv
async function downloadNotRegisteredCSV(req, res) {
  try {
    const registeredCodes = await ImageLog.find({}).distinct("EmployeeCode");
    const missing = await Employee.find({ 
      EmployeeCode: { $nin: registeredCodes },
      IsActive: true 
    }).sort({ EmployeeCode: 1 });

    let csv = "EmployeeCode,Name,Department\n";
    missing.forEach(emp => {
      csv += `"${emp.EmployeeCode}","${emp.Name}","${emp.Department}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.attachment("missing_registration_list.csv");
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/download/zip
async function downloadByIds(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Please provide an array of image IDs." });
    }

    if (ids.length > MAX_DOWNLOAD_LIMIT) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_DOWNLOAD_LIMIT} images allowed per download.` });
    }

    // Safely cast string IDs to MongoDB ObjectIds
    const validIds = ids
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: "No valid IDs provided." });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const zipFilename = `custom_selection_${timestamp}.zip`;

    // Initiate streaming pipeline
    await streamImagesToZip(res, { _id: { $in: validIds } }, zipFilename);
  } catch (err) {
    console.error("[Download By IDs Error]", err);
    if (!res.headersSent) res.status(500).json({ success: false, message: "Server error during download." });
  }
}

// GET /api/download/employee/:code
async function downloadByEmployee(req, res) {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: "Employee code is required." });
    }

    const safeCode = code.trim().toUpperCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const zipFilename = `employee_${safeCode}_${timestamp}.zip`;

    await streamImagesToZip(res, { EmployeeCode: safeCode }, zipFilename);
  } catch (err) {
    console.error("[Download By Employee Error]", err);
    if (!res.headersSent) res.status(500).json({ success: false, message: "Server error during download." });
  }
}

// POST /api/download/date
async function downloadByDate(req, res) {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: "startDate and endDate are required." });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Ensure the end date covers the entire day
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format provided." });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 10);
    const zipFilename = `export_${timestamp}.zip`;

    await streamImagesToZip(res, { CapturedAt: { $gte: start, $lte: end } }, zipFilename);
  } catch (err) {
    console.error("[Download By Date Error]", err);
    if (!res.headersSent) res.status(500).json({ success: false, message: "Server error during download." });
  }
}

module.exports = { 
  downloadByIds, 
  downloadByEmployee, 
  downloadByDate, 
  downloadRegisteredCSV, 
  downloadNotRegisteredCSV 
};
