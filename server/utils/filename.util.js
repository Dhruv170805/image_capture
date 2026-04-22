/**
 * Filename Utility
 * Generates primary (latest) and archive (timestamped) filenames.
 * Primary file is always overwritten; archive preserves history.
 */

const { getISTDate } = require("./time.util");

function generateFileNames(empCode) {
  const istNow = getISTDate();

  // Format: 2026-04-21_15-30-10
  const pad = (n) => n.toString().padStart(2, "0");
  const formatted = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}_${pad(istNow.getUTCHours())}-${pad(istNow.getUTCMinutes())}-${pad(istNow.getUTCSeconds())}`;

  const safe = empCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  return {
    primary: `${safe}.jpg`,
    archive: `${safe}_${formatted}.jpg`,
  };
}

module.exports = { generateFileNames };
