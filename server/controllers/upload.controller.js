/**
 * Upload Controller
 * Handles image receive → process → store in MongoDB Atlas.
 */

const { processImage, MAX_INPUT_BYTES } = require("../services/image.service");
const { streamImagesToZip } = require("../services/download.service");
const { generateFileNames } = require("../utils/filename.util");
const { insertLog, getLogs: getLogsUtil, getImageById } = require("../utils/imageLog.util");
const { getISTDate } = require("../utils/time.util");
const employeeService = require("../services/employee.service");
const ImageLog = require("../models/ImageLog");
const Employee = require("../models/Employee");
const EmployeePalm = require("../models/EmployeePalm");
const Config = require("../models/Config");
const sse = require("../utils/sse");

async function uploadImage(req, res) {
  try {
    let { empCode, image } = req.body;
    let inputBuffer;

    // Handle Multipart (multer)
    if (req.file) {
      inputBuffer = req.file.buffer;
    } else if (image) {
      // Handle Base64 (legacy)
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      inputBuffer = Buffer.from(base64Data, "base64");
    }

    if (!empCode || !inputBuffer) {
      return res.status(400).json({ success: false, error: "MISSING_FIELDS", message: "empCode and image are required." });
    }

    const empResult = await employeeService.getEmployee(empCode);
    if (!empResult.success) {
      return res.status(403).json({ success: false, error: "UNAUTHORIZED", message: empResult.message });
    }

    if (inputBuffer.length > MAX_INPUT_BYTES) {
      return res.status(413).json({ success: false, error: "IMAGE_TOO_LARGE", message: `Image must be under 5MB.` });
    }

    const processed = await processImage(inputBuffer);
    const { archive } = generateFileNames(empCode);

    // DELETE EXISTING REGISTRATIONS for this employee to prevent duplicates
    await ImageLog.deleteMany({ EmployeeCode: empResult.data.EmployeeCode });

    const logEntry = await insertLog({
      EmployeeCode: empResult.data.EmployeeCode,
      EmployeeName: empResult.data.Name,
      Department: empResult.data.Department,
      FileName: archive,
      ImageData: processed, // The actual binary data
      FileSizeBytes: processed.length,
    });

    // Notify clients via SSE
    sse.sendEvent("registration_updated", { type: "FACE", employeeCode: empResult.data.EmployeeCode });

    return res.status(200).json({
      success: true,
      message: "Image captured and saved to database successfully.",
      data: {
        employee: empResult.data,
        logId: logEntry._id,
        capturedAt: logEntry.CapturedAt,
      },
    });
  } catch (err) {
    console.error("[Upload Error]", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR", message: err.message });
  }
}

async function getLogs(req, res) {
  try {
    const { page = 1, limit = 20, empCode } = req.query;
    const result = await getLogsUtil({ page: parseInt(page), limit: parseInt(limit), empCode });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: "LOG_ERROR", message: err.message });
  }
}

async function serveImage(req, res) {
  try {
    const { id } = req.params;
    const log = await getImageById(id);
    if (!log || !log.ImageData) {
      return res.status(404).send("Image not found");
    }
    res.set("Content-Type", log.ContentType || "image/jpeg");
    res.send(log.ImageData);
  } catch (err) {
    res.status(500).send("Error retrieving image");
  }
}

async function downloadAll(req, res) {
  try {
    const istNow = getISTDate();
    const pad = (n) => n.toString().padStart(2, "0");
    const timestamp = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}_${size(istNow.getUTCHours())}-${pad(istNow.getUTCMinutes())}`;
    
    const zipFilename = `biometric_full_backup_${timestamp}.zip`;
    await streamImagesToZip(res, {}, zipFilename);
  } catch (err) {
    console.error("[Admin Export Error]", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Export failed: " + err.message });
    }
  }
}

function size(n) { return n.toString().padStart(2, "0"); }

async function getStats(req, res) {
  try {
    const totalEmployees = await Employee.countDocuments({ IsActive: true });
    
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

    const totalRegistered = registeredCodes.size;
    const remaining = Math.max(0, totalEmployees - totalRegistered);

    return res.status(200).json({ 
      success: true, 
      totalEmployees,
      totalRegistered,
      remaining,
      totalFace: faceCodes.length,
      totalPalm: palmCodes.length,
      mode
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { uploadImage, getLogs, serveImage, downloadAll, getStats };
