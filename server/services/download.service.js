/**
 * Download Service — Streaming ZIP Generation
 * Handles memory-efficient bulk image downloading from MongoDB Atlas
 */

const archiver = require("archiver");
const ImageLog = require("../models/ImageLog");
const EmployeePalm = require("../models/EmployeePalm");

const MAX_DOWNLOAD_LIMIT = 200; // Increased to accommodate both types

/**
 * Streams images from both Face and Palm collections into a ZIP
 */
async function streamImagesToZip(res, query, zipFilename) {
  res.attachment(zipFilename);
  const archive = archiver("zip", { zlib: { level: 5 } });
  archive.on("error", (err) => { throw err; });
  archive.pipe(res);

  let count = 0;
  let manifestCSV = "Type,EmployeeCode,EmployeeName,Department,FileName,CapturedAt_IST\n";

  // 1. Process Face Images
  const faceCursor = ImageLog.find(query).limit(MAX_DOWNLOAD_LIMIT / 2).cursor();
  for (let doc = await faceCursor.next(); doc != null; doc = await faceCursor.next()) {
    if (doc.ImageData) {
      const folderName = doc.EmployeeCode.toUpperCase();
      let fileName = doc.FileName || `${folderName}_FACE.jpg`;
      if (fileName.toLowerCase().endsWith(".jpeg")) fileName = fileName.slice(0, -5) + ".jpg";
      
      archive.append(doc.ImageData, { name: `${folderName}/FACE_${fileName}` });
      const istTime = doc.CapturedAt ? new Date(doc.CapturedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
      manifestCSV += `FACE,"${doc.EmployeeCode}","${doc.EmployeeName}","${doc.Department}","FACE_${fileName}","${istTime}"\n`;
      count++;
    }
  }

  // 2. Process Palm Images
  const palmCursor = EmployeePalm.find(query).limit(MAX_DOWNLOAD_LIMIT / 2).cursor();
  for (let doc = await palmCursor.next(); doc != null; doc = await palmCursor.next()) {
    if (doc.ImageData) {
      const folderName = doc.EmployeeCode.toUpperCase();
      const fileName = doc.FileName || `${folderName}_PALM_RIGHT.jpg`;
      
      archive.append(doc.ImageData, { name: `${folderName}/PALM_${fileName}` });
      const istTime = doc.CapturedAt ? new Date(doc.CapturedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A";
      // Note: We don't have Name/Dept in Palm model yet, but we'll use Code
      manifestCSV += `PALM,"${doc.EmployeeCode}","N/A","N/A","PALM_${fileName}","${istTime}"\n`;
      count++;
    }
  }

  if (count === 0) {
    archive.append("No biometric data found matching your criteria.", { name: "info.txt" });
  } else {
    archive.append(manifestCSV, { name: "manifest.csv" });
  }

  await archive.finalize();
}

module.exports = { streamImagesToZip, MAX_DOWNLOAD_LIMIT };
