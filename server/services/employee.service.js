/**
 * Employee Service — MongoDB & Data Processing Layer
 */

const Employee = require("../models/Employee");
const XLSX = require("xlsx");

/**
 * Intelligent Lookup: Search by Code OR EmpAliasCode
 */
async function getEmployee(input) {
  if (!input || typeof input !== "string") {
    return { success: false, error: "INVALID_INPUT", message: "Input is required." };
  }

  const trimmed = input.trim().toUpperCase();

  try {
    // Search both fields
    const employee = await Employee.findOne({
      $or: [
        { EmployeeCode: trimmed },
        { EmpAliasCode: trimmed }
      ]
    });

    if (!employee) {
      return { success: false, error: "NOT_FOUND", message: "Employee not found." };
    }

    if (!employee.IsActive) {
      return { success: false, error: "INACTIVE", message: "Employee account is inactive." };
    }

    return {
      success: true,
      data: {
        EmployeeCode: employee.EmployeeCode || "-",
        EmpAliasCode: employee.EmpAliasCode || "-",
        Name: employee.Name,
        Department: employee.Department,
      },
    };
  } catch (err) {
    console.error("[Employee Service Error]", err);
    throw err;
  }
}

/**
 * Generates an Excel Template with strict headers and sample data
 */
async function generateTemplate() {
  const workbook = XLSX.utils.book_new();

  // 1. Template Sheet
  const templateData = [
    ["Employee_Code", "EMPALIAS_Code", "Employee_Name"],
    ["1001", "PE001", "John Doe"],
    ["", "PE002", "Jane Smith"],
    ["1003", "", "Bob Wilson"]
  ];
  const wsTemplate = XLSX.utils.aoa_to_sheet(templateData);
  wsTemplate["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, wsTemplate, "Employee_Data");

  // 2. Instructions Sheet
  const guideData = [
    ["UPLOAD INSTRUCTIONS"],
    ["1. At least ONE of 'Employee_Code' or 'EMPALIAS_Code' must be filled for each row."],
    ["2. 'Employee_Name' is MANDATORY for all employees."],
    ["3. Codes and Alias Codes must be unique across the system."],
    ["4. Use only plain text. No special formatting."],
    ["5. Delete sample rows before uploading your real data."]
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, wsGuide, "Instructions");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

/**
 * Production-grade Excel Upload with strict validation and detailed reporting
 */
async function uploadExcelEmployees(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const errors = [];
    const validOperations = [];
    const seenCodesInFile = new Set();
    const seenAliasInFile = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +1 for 0-index, +1 for header row

      const code = (row.Employee_Code || row.Code || "").toString().trim().toUpperCase();
      const alias = (row.EMPALIAS_Code || row["EMPALIAS Code"] || "").toString().trim().toUpperCase();
      const name = (row.Employee_Name || row.Name || "").toString().trim();
      const dept = (row.Dept || "").toString().trim();

      // Validation Rules
      if (!code && !alias) {
        errors.push({ row: rowNum, error: "Missing both Employee_Code and EMPALIAS_Code (At least one required)" });
        continue;
      }
      if (!name) {
        errors.push({ row: rowNum, error: "Employee_Name is required" });
        continue;
      }

      // Check duplicate in same file
      if (code && seenCodesInFile.has(code)) {
        errors.push({ row: rowNum, error: `Duplicate Employee_Code in file: ${code}` });
        continue;
      }
      if (alias && seenAliasInFile.has(alias)) {
        errors.push({ row: rowNum, error: `Duplicate EMPALIAS_Code in file: ${alias}` });
        continue;
      }

      if (code) seenCodesInFile.add(code);
      if (alias) seenAliasInFile.add(alias);

      // Build Upsert Operation
      // We prioritize EmployeeCode as the main filter if it exists, otherwise EmpAliasCode
      const filter = code ? { EmployeeCode: code } : { EmpAliasCode: alias };
      
      validOperations.push({
        updateOne: {
          filter,
          update: { 
            $set: { 
              EmployeeCode: code || undefined,
              EmpAliasCode: alias || undefined,
              Name: name, 
              Department: dept,
              IsActive: true 
            } 
          },
          upsert: true
        }
      });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    if (validOperations.length === 0) {
      return { success: false, message: "No data found in Excel file." };
    }

    // Execute bulk write
    await Employee.bulkWrite(validOperations);
    return { success: true, count: validOperations.length };

  } catch (err) {
    console.error("[Excel Process Error]", err);
    return { success: false, message: "Invalid Excel format or structure." };
  }
}

// Support for old bulkUpload
async function bulkUploadEmployees(employees) {
  const operations = employees.map(emp => ({
    updateOne: {
      filter: { EmployeeCode: (emp.EmployeeCode || emp.Code).toUpperCase() },
      update: { $set: { Name: emp.Name, Department: emp.Department, IsActive: true } },
      upsert: true
    }
  }));
  await Employee.bulkWrite(operations);
  return { success: true, count: employees.length };
}

module.exports = { 
  getEmployee, 
  generateTemplate, 
  uploadExcelEmployees,
  bulkUploadEmployees 
};
