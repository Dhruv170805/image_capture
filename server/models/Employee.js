const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
  EmployeeCode: { type: String, required: true, unique: true, index: true },
  Name: { type: String, required: true },
  Department: { type: String, required: true },
  IsActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Employee", EmployeeSchema);
