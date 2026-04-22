const mongoose = require("mongoose");

const EmployeePalmSchema = new mongoose.Schema({
  EmployeeCode: { type: String, required: true, index: true },
  PalmType: { type: String, default: "RIGHT" },
  FileName: { type: String, required: true },
  FileSizeBytes: { type: Number, required: true },
  ImageData: { type: Buffer, required: true },
  ContentType: { type: String, default: "image/jpeg" },
  CapturedAt: { type: Date, default: Date.now },
  Features: { type: Array, default: [] } // For future biometric embeddings
}, { timestamps: true });

// Ensure one latest palm per employee (or history if preferred, currently enforcing latest via logic)
module.exports = mongoose.model("EmployeePalm", EmployeePalmSchema);
