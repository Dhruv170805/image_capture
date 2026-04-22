const mongoose = require("mongoose");
const { getISTDate } = require("../utils/time.util");

const ImageLogSchema = new mongoose.Schema({
  EmployeeCode: { type: String, required: true, index: true },
  EmployeeName: { type: String, required: true },
  Department: { type: String },
  FileName: { type: String, required: true },
  FileSizeBytes: { type: Number, required: true },
  ImageData: { type: Buffer, required: true }, // Store the actual image
  ContentType: { type: String, default: "image/jpeg" },
  CapturedAt: { type: Date, default: getISTDate, index: true },
}, { timestamps: true });

module.exports = mongoose.model("ImageLog", ImageLogSchema);
