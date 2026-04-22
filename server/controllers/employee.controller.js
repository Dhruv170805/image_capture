/**
 * Employee Controller
 * Handles HTTP layer for employee validation endpoint.
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
      };
      return res.status(statusMap[result.error] || 400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[Employee Controller]", err);
    return res.status(500).json({ success: false, error: "INTERNAL_ERROR", message: "Server error." });
  }
}

const { Readable } = require("stream");
const csv = require("csv-parser");
const UploadedCsv = require("../models/UploadedCsv");

async function uploadEmployeesCSV(req, res) {
  try {
    const { csvData, fileName } = req.body;
    if (!csvData) {
      return res.status(400).json({ success: false, message: "csvData is required." });
    }

    // Save raw CSV to MongoDB
    const uploadedRecord = new UploadedCsv({
      FileName: fileName || "uploaded_list.csv",
      Content: csvData
    });
    await uploadedRecord.save();

    const results = [];
    const stream = Readable.from([csvData]);

    stream
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          const result = await employeeService.bulkUploadEmployees(results);
          
          // Update record with count
          if (result.success) {
            uploadedRecord.ProcessedCount = result.count;
            await uploadedRecord.save();
          }

          return res.status(200).json(result);
        } catch (err) {
          console.error("[Bulk Process Error]", err);
          return res.status(500).json({ success: false, message: "Database error during bulk write." });
        }
      });
  } catch (err) {
    console.error("[CSV Upload Controller]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { validateEmployee, uploadEmployeesCSV };
