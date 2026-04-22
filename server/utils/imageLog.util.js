/**
 * Image Log Store — MongoDB Implementation
 */

const ImageLog = require("../models/ImageLog");
const { getISTDate } = require("./time.util");

/**
 * Formats date for filename: DD-MM-YYYY_HH-mm-ss in IST
 */
function formatISTForFilename(date) {
  // If the date is already stored as IST, we can just use it directly for extraction
  // but let's keep it safe by using a fresh date object
  const istDate = new Date(date);
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
      CapturedAt: getISTDate(),
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
    const Employee = require("../models/Employee");
    
    const query = {};
    if (empCode) {
      query.EmployeeCode = empCode.trim().toUpperCase();
    }

    const faceLogs = await ImageLog.find(query).select("-ImageData").lean();
    const palmLogs = await EmployeePalm.find(query).select("-ImageData").lean();
    
    // We also want to make sure we have the latest name/department, so let's get employees
    const allCodes = new Set([...faceLogs.map(l => l.EmployeeCode), ...palmLogs.map(l => l.EmployeeCode)]);
    const employees = await Employee.find({ EmployeeCode: { $in: Array.from(allCodes) } }).lean();
    const empMap = new Map(employees.map(e => [e.EmployeeCode, e]));

    const userMap = new Map();

    const getOrCreateUser = (code) => {
      if (!userMap.has(code)) {
        const emp = empMap.get(code) || {};
        userMap.set(code, {
          EmployeeCode: code,
          EmployeeName: emp.Name || "Unknown",
          Department: emp.Department || "N/A",
          hasFace: false,
          hasPalm: false,
          faceSize: 0,
          palmSize: 0,
          CapturedAt: new Date(0),
          faceId: null,
          palmId: null
        });
      }
      return userMap.get(code);
    };

    faceLogs.forEach(l => {
      const user = getOrCreateUser(l.EmployeeCode);
      user.hasFace = true;
      user.faceSize = l.FileSizeBytes || 0;
      user.faceId = l._id;
      if (new Date(l.CapturedAt) > new Date(user.CapturedAt)) {
        user.CapturedAt = l.CapturedAt;
      }
    });

    palmLogs.forEach(l => {
      const user = getOrCreateUser(l.EmployeeCode);
      user.hasPalm = true;
      user.palmSize = l.FileSizeBytes || 0;
      user.palmId = l._id;
      if (new Date(l.CapturedAt) > new Date(user.CapturedAt)) {
        user.CapturedAt = l.CapturedAt;
      }
    });

    const combined = Array.from(userMap.values());

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
