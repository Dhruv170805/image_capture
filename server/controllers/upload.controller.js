/**
 * Upload Controller
 * Handles image receive → process → store in MongoDB Atlas.
 */

const { processImage, MAX_INPUT_BYTES } = require("../services/image.service");
const { generateFileNames } = require("../utils/filename.util");
const { insertLog, getLogs: getLogsUtil, getImageById } = require("../utils/imageLog.util");
const employeeService = require("../services/employee.service");

async function uploadImage(req, res) {
  try {
    const { empCode, image } = req.body;

    if (!empCode || !image) {
      return res.status(400).json({ success: false, error: "MISSING_FIELDS", message: "empCode and image are required." });
    }

    const empResult = await employeeService.getEmployee(empCode);
    if (!empResult.success) {
      return res.status(403).json({ success: false, error: "UNAUTHORIZED", message: empResult.message });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const inputBuffer = Buffer.from(base64Data, "base64");

    if (inputBuffer.length > MAX_INPUT_BYTES) {
      return res.status(413).json({ success: false, error: "IMAGE_TOO_LARGE", message: `Image must be under 5MB.` });
    }

    const processed = await processImage(inputBuffer);
    const { archive } = generateFileNames(empCode);

    const logEntry = await insertLog({
      EmployeeCode: empResult.data.EmployeeCode,
      EmployeeName: empResult.data.Name,
      Department: empResult.data.Department,
      FileName: archive,
      ImageData: processed, // The actual binary data
      FileSizeBytes: processed.length,
    });

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

const archiver = require("archiver");
const ImageLog = require("../models/ImageLog");

async function downloadAll(req, res) {
  try {
    const archive = archiver("zip", { zlib: { level: 5 } });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    res.attachment(`employee_captures_${timestamp}.zip`);

    archive.on("error", (err) => { throw err; });
    archive.pipe(res);

    // Create CSV Header
    let csvContent = "EmployeeCode,EmployeeName,Department,FileName,CapturedAt_IST\n";

    const cursor = ImageLog.find({}).cursor();

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      if (doc.ImageData) {
        // Add image to ZIP
        archive.append(doc.ImageData, { name: `images/${doc.FileName}` });
        
        // Add row to CSV Manifest
        const istTime = doc.CapturedAt ? new Date(doc.CapturedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
        csvContent += `"${doc.EmployeeCode}","${doc.EmployeeName}","${doc.Department}","${doc.FileName}","${istTime}"\n`;
      }
    }

    // Add the CSV manifest to the ZIP
    archive.append(csvContent, { name: "manifest.csv" });

    await archive.finalize();

  } catch (err) {
    console.error("[Admin Export Error]", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Export failed: " + err.message });
    }
  }
}

module.exports = { uploadImage, getLogs, serveImage, downloadAll };
