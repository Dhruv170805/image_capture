/**
 * Filename Utility
 * Generates primary (latest) and archive (timestamped) filenames.
 * Primary file is always overwritten; archive preserves history.
 */

function generateFileNames(empCode) {
  const now = new Date();

  // Format: 2026-04-21_15-30-10-123
  const formatted = now
    .toISOString()
    .replace("T", "_")
    .replace(/[:.]/g, "-")
    .slice(0, 23); // trim milliseconds tail

  const safe = empCode.replace(/[^A-Za-z0-9]/g, "");

  return {
    primary: `${safe}.jpg`,
    archive: `${safe}_${formatted}.jpg`,
  };
}

module.exports = { generateFileNames };
