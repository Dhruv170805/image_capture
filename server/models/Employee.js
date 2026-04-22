const mongoose = require("mongoose");

const EmployeeSchema = new mongoose.Schema({
  EmployeeCode: { 
    type: String, 
    unique: true, 
    sparse: true, // Allows null/missing if EmpAliasCode exists
    index: true,
    uppercase: true,
    trim: true
  },
  EmpAliasCode: { 
    type: String, 
    unique: true, 
    sparse: true, 
    index: true,
    uppercase: true,
    trim: true
  },
  Name: { type: String, required: true, trim: true },
  Department: { type: String, required: true, trim: true },
  IsActive: { type: Boolean, default: true },
}, { timestamps: true });

// Ensure at least one code is present
EmployeeSchema.pre('save', function(next) {
  if (!this.EmployeeCode && !this.EmpAliasCode) {
    return next(new Error('At least one of EmployeeCode or EmpAliasCode is required'));
  }
  next();
});

module.exports = mongoose.model("Employee", EmployeeSchema);
