/**
 * Time Utility for IST (Indian Standard Time)
 */

/**
 * Returns a new Date object shifted to IST (UTC + 5:30)
 * This is used to store dates in MongoDB that represent local time directly
 */
function getISTDate() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
}

/**
 * Formats a date object/string to IST string for display.
 * This handles the case where the date might already be stored as IST.
 */
function formatIST(date) {
  if (!date) return "N/A";
  
  // If we are storing dates as IST (shifted UTC), 
  // we just need to format the UTC parts to get the local string.
  const d = new Date(date);
  const pad = (n) => n.toString().padStart(2, "0");
  
  const day = pad(d.getUTCDate());
  const month = pad(d.getUTCMonth() + 1);
  const year = d.getUTCFullYear();
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

module.exports = {
  getISTDate,
  formatIST
};
