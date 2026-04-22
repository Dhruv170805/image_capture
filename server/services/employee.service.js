/**
 * Employee Service — MongoDB Layer
 */

const Employee = require("../models/Employee");

async function getEmployee(code) {
  if (!code || typeof code !== "string") {
    return { success: false, error: "INVALID_CODE", message: "Employee code is required." };
  }

  const trimmed = code.trim().toUpperCase();

  if (!/^[A-Z0-9]{1,20}$/.test(trimmed)) {
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

async function bulkUploadEmployees(employees) {
  try {
    // 1. Validate the data first
    const validEmployees = employees.filter(emp => emp.EmployeeCode && emp.Name && emp.Department);
    
    if (validEmployees.length === 0) {
      return { success: false, message: "No valid employee data found in CSV." };
    }

    // 2. Clear existing employees (if that's the desired behavior for a "new list")
    // Or we could use upsert. Given the request "if registration is from other list", 
    // it implies replacing or extending. We'll go with upsert to be safe.
    
    const operations = validEmployees.map(emp => ({
      updateOne: {
        filter: { EmployeeCode: emp.EmployeeCode.trim().toUpperCase() },
        update: { 
          $set: { 
            Name: emp.Name.trim(), 
            Department: emp.Department.trim(),
            IsActive: true 
          } 
        },
        upsert: true
      }
    }));

    await Employee.bulkWrite(operations);
    return { success: true, count: validEmployees.length };
  } catch (err) {
    console.error("[Bulk Upload Error]", err);
    throw err;
  }
}

module.exports = { getEmployee, bulkUploadEmployees };
