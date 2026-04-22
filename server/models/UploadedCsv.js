const mongoose = require("mongoose");

const UploadedCsvSchema = new mongoose.Schema({
  FileName: { type: String, required: true },
  Content: { type: String, required: true },
  ProcessedCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("UploadedCsv", UploadedCsvSchema);
