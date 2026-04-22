/**
 * Image Log Store — MongoDB Implementation
 */

const ImageLog = require("../models/ImageLog");

/**
 * Utility to get current time in Indian Standard Time (IST)
 */
function getISTDate() {
  const now = new Date();
  // IST is UTC + 5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
}

/**
 * Formats date for filename: DD-MM-YYYY_HH-mm-ss in IST
 */
function formatISTForFilename(date) {
  // Create a date object shifted to IST for extraction
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  const pad = (n) => n.toString().padStart(2, "0");
  
  return `${pad(istDate.getUTCDate())}-${pad(istDate.getUTCMonth() + 1)}-${istDate.getUTCFullYear()}_${pad(istDate.getUTCHours())}-${pad(istDate.getUTCMinutes())}-${pad(istDate.getUTCSeconds())}`;
}

async function insertLog(entry) {
  try {
    const safeCode = entry.EmployeeCode.toString().replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    // Remove all previous records for this employee to ensure only the latest one stays
    await ImageLog.deleteMany({ EmployeeCode: safeCode });

    // Create the new latest record
    const newLog = new ImageLog({
      EmployeeCode: safeCode,
      EmployeeName: entry.EmployeeName,
      Department: entry.Department,
      FileName: `${safeCode}.jpg`,
      FileSizeBytes: entry.FileSizeBytes,
      ImageData: entry.ImageData,
      CapturedAt: new Date(), // Store in standard UTC
    });

    return await newLog.save();
  } catch (err) {
    console.error("[Log Utility Error]", err);
    throw err;
  }
}

async function getLogs({ page = 1, limit = 20, empCode = null } = {}) {
  try {
    const EmployeePalm = require("../models/EmployeePalm");
    const query = {};
    if (empCode) {
      query.EmployeeCode = empCode.trim().toUpperCase();
    }

    const faceLogs = await ImageLog.find(query).select("-ImageData").lean();
    const palmLogs = await EmployeePalm.find(query).select("-ImageData").lean();

    // Merge and Tag
    const combined = [
      ...faceLogs.map(l => ({ ...l, BiometricType: "FACE" })),
      ...palmLogs.map(l => ({ ...l, BiometricType: "PALM", EmployeeName: l.EmployeeName || "Registered (Palm)" }))
    ];

    // Sort combined by date DESC
    combined.sort((a, b) => new Date(b.CapturedAt) - new Date(a.CapturedAt));

    const paginatedData = combined.slice((page - 1) * limit, page * limit);

    return {
      total: combined.length,
      page,
      limit,
      data: paginatedData,
    };
  } catch (err) {
    console.error("[Log Utility Error]", err);
    throw err;
  }
}

async function getImageById(id) {
  return await ImageLog.findById(id).select("ImageData ContentType");
}

module.exports = { insertLog, getLogs, getImageById };
