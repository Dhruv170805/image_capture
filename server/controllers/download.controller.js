/**
 * Download Controller
 * Handles HTTP endpoints for bulk ZIP downloads
 */

const mongoose = require("mongoose");
const { streamImagesToZip, MAX_DOWNLOAD_LIMIT } = require("../services/download.service");
const ImageLog = require("../models/ImageLog");
const Employee = require("../models/Employee");
const XLSX = require("xlsx");
const { getISTDate, formatIST } = require("../utils/time.util");

const EmployeePalm = require("../models/EmployeePalm");
const Config = require("../models/Config");

async function getDynamicRegisteredCodes() {
  const faceCodes = await ImageLog.distinct("EmployeeCode");
  const palmCodes = await EmployeePalm.distinct("EmployeeCode");
  
  let modeConfig = await Config.findOne({ key: "registration_mode" });
  const mode = modeConfig ? modeConfig.value : "FACE";

  let registeredCodes = new Set();
  
  if (mode === "FACE") {
    registeredCodes = new Set(faceCodes);
  } else if (mode === "PALM") {
    registeredCodes = new Set(palmCodes);
  } else if (mode === "BOTH") {
    const palmSet = new Set(palmCodes);
    faceCodes.forEach(code => {
      if (palmSet.has(code)) {
        registeredCodes.add(code);
      }
    });
  }
  return Array.from(registeredCodes);
}

// GET /api/download/registered-excel
async function downloadRegisteredExcel(req, res) {
  try {
    const faceLogs = await ImageLog.find({}).sort({ CapturedAt: -1 }).select("-ImageData").lean();
    const palmLogs = await EmployeePalm.find({}).sort({ CapturedAt: -1 }).select("-ImageData").lean();
    const employees = await Employee.find({}).lean();
    const empMap = new Map(employees.map(e => [e.EmployeeCode, e]));

    const registeredCodes = await getDynamicRegisteredCodes();

    const data = [];

    for (const code of registeredCodes) {
      const face = faceLogs.find(l => l.EmployeeCode === code);
      const palm = palmLogs.find(l => l.EmployeeCode === code);
      const emp = empMap.get(code) || {};
      
      data.push({
        "Employee Code": code,
        "Employee Name": emp.Name || (face ? face.EmployeeName : "Registered (Palm)"),
        "Department": emp.Department || (face ? face.Department : "N/A"),
        "Face Status": face ? "Captured" : "Pending",
        "Face Time (IST)": face ? formatIST(face.CapturedAt) : "-",
        "Palm Status": palm ? "Captured" : "Pending",
        "Palm Time (IST)": palm ? formatIST(palm.CapturedAt) : "-"
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
    const allRegistered = await getDynamicRegisteredCodes();

    const missing = await Employee.find({ 
      EmployeeCode: { $nin: allRegistered },
      IsActive: true 
    }).sort({ EmployeeCode: 1 });

    const data = missing.map(emp => ({
      "Employee Code": emp.EmployeeCode,
      "Employee Name": emp.Name,
      "Department": emp.Department,
      "Status": "Pending Registration"
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
    const registeredCodes = await getDynamicRegisteredCodes();
    const faceLogs = await ImageLog.find({ EmployeeCode: { $in: registeredCodes } }).select("-ImageData").lean();
    const palmLogs = await EmployeePalm.find({ EmployeeCode: { $in: registeredCodes } }).select("-ImageData").lean();
    const employees = await Employee.find({ EmployeeCode: { $in: registeredCodes } }).lean();
    const empMap = new Map(employees.map(e => [e.EmployeeCode, e]));

    let csv = "EmployeeCode,EmployeeName,Department,FaceStatus,FaceTimeIST,PalmStatus,PalmTimeIST\n";
    
    registeredCodes.forEach(code => {
      const face = faceLogs.find(l => l.EmployeeCode === code);
      const palm = palmLogs.find(l => l.EmployeeCode === code);
      const emp = empMap.get(code) || {};
      
      const name = emp.Name || (face ? face.EmployeeName : "N/A");
      const dept = emp.Department || (face ? face.Department : "N/A");
      const faceStatus = face ? "Captured" : "Pending";
      const faceTime = face ? formatIST(face.CapturedAt) : "-";
      const palmStatus = palm ? "Captured" : "Pending";
      const palmTime = palm ? formatIST(palm.CapturedAt) : "-";

      csv += `"${code}","${name}","${dept}","${faceStatus}","${faceTime}","${palmStatus}","${palmTime}"\n`;
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
    const registeredCodes = await getDynamicRegisteredCodes();
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

    const istNow = getISTDate();
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

// POST /api/download/range
async function downloadByEmployeeRange(req, res) {
  try {
    const { startCode, endCode } = req.body;
    if (!startCode || !endCode) {
      return res.status(400).json({ success: false, message: "startCode and endCode are required." });
    }

    const s = startCode.trim().toUpperCase();
    const e = endCode.trim().toUpperCase();

    const istNow = getISTDate();
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}`;
    const zipFilename = `biometric_range_${s}_to_${e}_${timestamp}.zip`;

    // Filter using range
    await streamImagesToZip(res, { EmployeeCode: { $gte: s, $lte: e } }, zipFilename);
  } catch (err) {
    console.error("[Download By Range Error]", err);
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
    const istNow = getISTDate();
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

    const istNow = getISTDate();
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
  downloadByEmployeeRange,
  downloadByDate, 
  downloadRegisteredCSV, 
  downloadNotRegisteredCSV,
  downloadRegisteredExcel,
  downloadNotRegisteredExcel
};
