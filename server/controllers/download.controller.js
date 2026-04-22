/**
 * Download Controller
 * Handles HTTP endpoints for bulk ZIP downloads
 */

const mongoose = require("mongoose");
const { streamImagesToZip, MAX_DOWNLOAD_LIMIT } = require("../services/download.service");
const ImageLog = require("../models/ImageLog");
const Employee = require("../models/Employee");
const XLSX = require("xlsx");

const EmployeePalm = require("../models/EmployeePalm");

// GET /api/download/registered-excel
async function downloadRegisteredExcel(req, res) {
  try {
    // Get all face logs and palm registrations
    const faceLogs = await ImageLog.find({}).sort({ CapturedAt: -1 }).select("-ImageData");
    const palmLogs = await EmployeePalm.find({}).sort({ CapturedAt: -1 }).select("-ImageData");

    // Create a map of all unique employee codes seen in either collection
    const allCodes = Array.from(new Set([
      ...faceLogs.map(l => l.EmployeeCode),
      ...palmLogs.map(l => l.EmployeeCode)
    ]));

    const data = [];

    for (const code of allCodes) {
      const face = faceLogs.find(l => l.EmployeeCode === code);
      const palm = palmLogs.find(l => l.EmployeeCode === code);
      
      data.push({
        "Employee Code": code,
        "Employee Name": face ? face.EmployeeName : (palm ? "Registered (Palm)" : "N/A"),
        "Department": face ? face.Department : "N/A",
        "Face Status": face ? "Captured" : "Pending",
        "Face Time (IST)": face ? new Date(face.CapturedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "-",
        "Palm Status": palm ? "Captured" : "Pending",
        "Palm Time (IST)": palm ? new Date(palm.CapturedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "-"
      });
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Biometric Registry");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.attachment("biometric_registered_list.xlsx");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/download/not-registered-excel
async function downloadNotRegisteredExcel(req, res) {
  try {
    const registeredFaceCodes = await ImageLog.find({}).distinct("EmployeeCode");
    const registeredPalmCodes = await EmployeePalm.find({}).distinct("EmployeeCode");
    
    // Union of all registered codes
    const allRegistered = Array.from(new Set([...registeredFaceCodes, ...registeredPalmCodes]));

    const missing = await Employee.find({ 
      EmployeeCode: { $nin: allRegistered },
      IsActive: true 
    }).sort({ EmployeeCode: 1 });

    const data = missing.map(emp => ({
      "Employee Code": emp.EmployeeCode,
      "Employee Name": emp.Name,
      "Department": emp.Department,
      "Status": "No Biometrics Captured"
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Missing Biometrics");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.attachment("missing_biometric_list.xlsx");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

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

    const now = new Date();
    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}_${pad(istNow.getUTCHours())}-${pad(istNow.getUTCMinutes())}`;
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
    const now = new Date();
    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}_${pad(istNow.getUTCHours())}-${pad(istNow.getUTCMinutes())}`;
    const zipFilename = `biometric_${safeCode}_${timestamp}.zip`;

    // streamImagesToZip already handles merging Face + Palm for the given query
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
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format provided." });
    }

    const now = new Date();
    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}`;
    const zipFilename = `biometric_export_${timestamp}.zip`;

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
  downloadNotRegisteredCSV,
  downloadRegisteredExcel,
  downloadNotRegisteredExcel
};
