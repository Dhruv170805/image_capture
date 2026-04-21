const mongoose = require("mongoose");

const ImageLogSchema = new mongoose.Schema({
  EmployeeCode: { type: String, required: true, index: true },
  EmployeeName: { type: String, required: true },
  Department: { type: String, required: true },
  FileName: { type: String, required: true },
  FileSizeBytes: { type: Number, required: true },
  ImageData: { type: Buffer, required: true }, // Store the actual image
  ContentType: { type: String, default: "image/jpeg" },
  CapturedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("ImageLog", ImageLogSchema);
