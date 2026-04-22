/**
 * Employee Controller
 * Handles HTTP layer for employee management.
 */

const employeeService = require("../services/employee.service");

async function validateEmployee(req, res) {
  try {
    const { code } = req.params;
    const result = await employeeService.getEmployee(code);

    if (!result.success) {
      const statusMap = {
        NOT_FOUND: 404,
        INACTIVE: 403,
        INVALID_CODE: 400,
        INVALID_FORMAT: 400,
        INVALID_INPUT: 400
      };
      return res.status(statusMap[result.error] || 400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[Employee Controller]", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "Server error." });
  }
}

async function downloadTemplate(req, res) {
  try {
    const buffer = await employeeService.generateTemplate();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=employee_template.xlsx");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: "Template generation failed." });
  }
}

async function uploadEmployeesExcel(req, res) {
  try {
    const { excelData } = req.body; // Expecting base64 string
    if (!excelData) {
      return res.status(400).json({ success: false, message: "excelData is required." });
    }

    const buffer = Buffer.from(excelData, "base64");
    const result = await employeeService.uploadExcelEmployees(buffer);

    if (!result.success && result.errors) {
      return res.status(422).json({ 
        success: false, 
        message: "Excel validation failed. Please check your data.",
        errors: result.errors 
      });
    }

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[Excel Upload Controller]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// Support for old CSV upload (kept for backward compatibility)
async function uploadEmployeesCSV(req, res) {
  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ success: false, message: "csvData is required." });
    
    const { Readable } = require("stream");
    const csv = require("csv-parser");
    const results = [];
    const stream = Readable.from([csvData]);

    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        const result = await employeeService.bulkUploadEmployees(results);
        return res.status(200).json(result);
      });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { 
  validateEmployee, 
  downloadTemplate, 
  uploadEmployeesExcel,
  uploadEmployeesCSV 
};
