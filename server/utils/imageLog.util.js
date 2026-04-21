/**
 * Image Log Store — MongoDB Implementation
 */

const ImageLog = require("../models/ImageLog");

/**
 * Utility to get current time in Indian Standard Time (IST)
 */
function getISTDate() {
  const now = new Date();
  const istOffsetMinutes = 330; 
  return new Date(now.getTime() + (istOffsetMinutes * 60000));
}

async function insertLog(entry) {
  try {
    const istNow = getISTDate();
    const safeCode = entry.EmployeeCode.replace(/[^A-Za-z0-9]/g, "");

    // 1. Update or Create the PRIMARY record (EmployeeCode.jpg)
    // This record is always updated to reflect the LATEST photo.
    await ImageLog.findOneAndUpdate(
      { FileName: `${safeCode}.jpg` },
      {
        EmployeeCode: entry.EmployeeCode,
        EmployeeName: entry.EmployeeName,
        Department: entry.Department,
        FileName: `${safeCode}.jpg`,
        FileSizeBytes: entry.FileSizeBytes,
        ImageData: entry.ImageData,
        CapturedAt: istNow,
      },
      { upsert: true, new: true }
    );

    // 2. Insert the ARCHIVE record (EmployeeCode_Timestamp.jpg)
    // This preserves the full history.
    const archiveLog = new ImageLog({
      EmployeeCode: entry.EmployeeCode,
      EmployeeName: entry.EmployeeName,
      Department: entry.Department,
      FileName: entry.FileName, // This is the timestamped name from controller
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
