/**
 * Image Log Store — MongoDB Implementation
 */

const ImageLog = require("../models/ImageLog");

async function insertLog(entry) {
  try {
    const newLog = new ImageLog({
      EmployeeCode: entry.EmployeeCode,
      EmployeeName: entry.EmployeeName,
      Department: entry.Department,
      FileName: entry.FileName,
      FileSizeBytes: entry.FileSizeBytes,
      ImageData: entry.ImageData, // Saving binary data
      CapturedAt: new Date(),
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
      .select("-ImageData") // Do NOT return the heavy image data in the list
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
