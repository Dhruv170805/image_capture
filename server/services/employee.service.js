/**
 * Employee Service — MongoDB Layer
 */

const Employee = require("../models/Employee");

async function getEmployee(code) {
  if (!code || typeof code !== "string") {
    return { success: false, error: "INVALID_CODE", message: "Employee code is required." };
  }

  const trimmed = code.trim().toUpperCase();

  if (!/^[A-Z0-9]{3,20}$/.test(trimmed)) {
    return { success: false, error: "INVALID_FORMAT", message: "Invalid employee code format." };
  }

  try {
    const employee = await Employee.findOne({ EmployeeCode: trimmed });

    if (!employee) {
      return { success: false, error: "NOT_FOUND", message: "Employee not found." };
    }

    if (!employee.IsActive) {
      return { success: false, error: "INACTIVE", message: "Employee account is inactive." };
    }

    return {
      success: true,
      data: {
        EmployeeCode: employee.EmployeeCode,
        Name: employee.Name,
        Department: employee.Department,
      },
    };
  } catch (err) {
    console.error("[Employee Service Error]", err);
    throw err;
  }
}

module.exports = { getEmployee };
