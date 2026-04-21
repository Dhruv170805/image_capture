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
 * Formats date for filename: DD-MM-YYYY_HH-mm-ss
 */
function formatISTForFilename(date) {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${pad(date.getUTCDate())}-${pad(date.getUTCMonth() + 1)}-${date.getUTCFullYear()}_${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}`;
}

async function insertLog(entry) {
  try {
    const istNow = getISTDate();
    const timestampStr = formatISTForFilename(istNow);
    const safeCode = entry.EmployeeCode.toString().replace(/[^A-Za-z0-9]/g, "").toUpperCase();

    // 1. Update or Create the PRIMARY record (EmployeeCode.jpg)
    // This record always holds the LATEST photo for this employee.
    await ImageLog.findOneAndUpdate(
      { FileName: `${safeCode}.jpg` },
      {
        EmployeeCode: safeCode,
        EmployeeName: entry.EmployeeName,
        Department: entry.Department,
        FileName: `${safeCode}.jpg`,
        FileSizeBytes: entry.FileSizeBytes,
        ImageData: entry.ImageData,
        CapturedAt: istNow,
      },
      { upsert: true, new: true }
    );

    // 2. Insert the ARCHIVE record (EmployeeCode_Date_Time.jpg)
    // This preserves the full history with the requested naming convention.
    const archiveFileName = `${safeCode}_${timestampStr}.jpg`;
    
    const archiveLog = new ImageLog({
      EmployeeCode: safeCode,
      EmployeeName: entry.EmployeeName,
      Department: entry.Department,
      FileName: archiveFileName,
      FileSizeBytes: entry.FileSizeBytes,
      ImageData: entry.ImageData,
      CapturedAt: istNow,
    });

    return await archiveLog.save();
  } catch (err) {
    console.error("[Log Utility Error]", err);
    throw err;
  }
}

async function getLogs({ page = 1, limit = 20, empCode = null } = {}) {
  try {
    const query = {};
    if (empCode) {
      query.EmployeeCode = empCode.trim().toUpperCase();
    }

    const total = await ImageLog.countDocuments(query);
    const logs = await ImageLog.find(query)
      .select("-ImageData")
      .sort({ CapturedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      total,
      page,
      limit,
      data: logs,
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
