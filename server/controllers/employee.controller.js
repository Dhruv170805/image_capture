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

module.exports = { validateEmployee };
