/**
 * Download Service — Streaming ZIP Generation
 * Handles memory-efficient bulk image downloading from MongoDB Atlas
 */

const archiver = require("archiver");
const ImageLog = require("../models/ImageLog");

const MAX_DOWNLOAD_LIMIT = 100;

/**
 * Streams images from MongoDB directly into a ZIP response
 * @param {Object} res Express Response Object
 * @param {Object} query MongoDB Query Object
 * @param {String} zipFilename Name of the output ZIP file
 */
async function streamImagesToZip(res, query, zipFilename) {
  // Use a cursor to fetch documents one by one (Memory Efficient)
  const cursor = ImageLog.find(query).limit(MAX_DOWNLOAD_LIMIT).cursor();

  // Set response headers for file download
  res.attachment(zipFilename);
  const archive = archiver("zip", { zlib: { level: 5 } });

  archive.on("error", (err) => {
    console.error("❌ [Archiver Error]", err);
    if (!res.headersSent) {
      res.status(500).send({ success: false, message: "Failed to generate ZIP." });
    }
  });

  // Pipe archive stream directly to the HTTP response
  archive.pipe(res);

  let count = 0;
  let manifestCSV = "EmployeeCode,EmployeeName,Department,FileName,CapturedAt\n";

  // Process documents one by one without loading all into memory
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    if (doc.ImageData && doc.EmployeeCode) {
      // Group images by EmployeeCode folder inside the ZIP
      const folderName = doc.EmployeeCode.toUpperCase();
      const fileName = doc.FileName || `image_${doc._id}.jpg`;
      
      // Append binary buffer to ZIP
      archive.append(doc.ImageData, { name: `${folderName}/${fileName}` });
      
      // Add to manifest
      const capturedAt = doc.CapturedAt ? new Date(doc.CapturedAt).toISOString() : "N/A";
      manifestCSV += `"${doc.EmployeeCode}","${doc.EmployeeName}","${doc.Department}","${fileName}","${capturedAt}"\n`;
      
      count++;
    }
  }

  if (count === 0) {
    archive.append("No images found matching your criteria.", { name: "info.txt" });
  } else {
    archive.append(manifestCSV, { name: "manifest.csv" });
  }

  // Finalize the archive (this flushes the stream and completes the response)
  await archive.finalize();
  console.log(`✅ [Download] Streamed ${count} images into ${zipFilename}`);
}

module.exports = { streamImagesToZip, MAX_DOWNLOAD_LIMIT };
