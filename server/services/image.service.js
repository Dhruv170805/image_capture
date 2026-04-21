/**
 * Image Processing Service
 * Uses Sharp for server-side compression and resizing.
 */

const sharp = require("sharp");

const TARGET_WIDTH = 300; // Increased for better quality
const TARGET_HEIGHT = 300;
const JPEG_QUALITY = 60;   // Balanced quality/size
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5 MB limit for high-res uploads

async function processImage(buffer) {
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new Error(`Image too large: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB (max 5MB)`);
  }

  const processed = await sharp(buffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return processed;
}

async function getImageMetadata(buffer) {
  const meta = await sharp(buffer).metadata();
  return {
    width: meta.width,
    height: meta.height,
    format: meta.format,
    size: buffer.length,
  };
}

module.exports = { processImage, getImageMetadata, MAX_INPUT_BYTES };
