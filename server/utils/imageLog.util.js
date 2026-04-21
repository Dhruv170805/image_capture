/**
 * Image Log Store — MongoDB Implementation
 */

const ImageLog = require("../models/ImageLog");

/**
 * Utility to get current time in Indian Standard Time (IST)
 */
function getISTDate() {
  const now = new Date();
  // IST is UTC + 5:30. We force the date object to represent that time in UTC
  // so that MongoDB displays it as the "Local" value.
  const istOffsetMinutes = 330; // 5 hours * 60 + 30
  return new Date(now.getTime() + (istOffsetMinutes * 60000));
}

async function insertLog(entry) {
  try {
    const newLog = new ImageLog({
      EmployeeCode: entry.EmployeeCode,
      EmployeeName: entry.EmployeeName,
      Department: entry.Department,
      FileName: entry.FileName,
      FileSizeBytes: entry.FileSizeBytes,
      ImageData: entry.ImageData,
      CapturedAt: getISTDate(), // Forced IST Timestamp
    });
    return await newLog.save();
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
