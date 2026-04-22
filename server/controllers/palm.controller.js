const EmployeePalm = require("../models/EmployeePalm");
const Employee = require("../models/Employee");
const { processPalmImage } = require("../services/palm.service");

async function registerPalm(req, res) {
  try {
    const { empCode, image } = req.body;

    if (!empCode || !image) {
      return res.status(400).json({ success: false, message: "empCode and image are required." });
    }

    const employee = await Employee.findOne({ EmployeeCode: empCode.toUpperCase() });
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found." });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const inputBuffer = Buffer.from(base64Data, "base64");

    const processed = await processPalmImage(inputBuffer);

    // Enforce one latest palm (Right)
    await EmployeePalm.deleteMany({ EmployeeCode: employee.EmployeeCode, PalmType: "RIGHT" });

    const newPalm = new EmployeePalm({
      EmployeeCode: employee.EmployeeCode,
      PalmType: "RIGHT",
      FileName: `${employee.EmployeeCode}_PALM_RIGHT.jpg`,
      FileSizeBytes: processed.length,
      ImageData: processed,
      CapturedAt: new Date(), // Standard UTC, utilities will handle IST display
    });

    await newPalm.save();

    // Notify clients via WebSocket
    try {
      const io = require("../utils/socket").getIO();
      io.emit("registration_updated", { type: "PALM", employeeCode: employee.EmployeeCode });
    } catch (sErr) { console.error("Socket error", sErr); }

    return res.status(200).json({
      success: true,
      message: "Right palm registered successfully.",
      size: `${(processed.length / 1024).toFixed(2)} KB`,
      data: {
        Name: employee.Name,
        Department: employee.Department
      }
    });
  } catch (err) {
    console.error("[Palm Register Error]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getPalm(req, res) {
  try {
    const { code } = req.params;
    const palm = await EmployeePalm.findOne({ EmployeeCode: code.toUpperCase() }).select("-ImageData");
    if (!palm) return res.status(404).json({ success: false, message: "Palm not found." });
    return res.status(200).json({ success: true, data: palm });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { registerPalm, getPalm };
