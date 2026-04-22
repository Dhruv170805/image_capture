/**
 * Image Processing Service
 * Uses Sharp for server-side compression and resizing.
 */

const sharp = require("sharp");

const TARGET_WIDTH = 256; 
const TARGET_HEIGHT = 256;
const JPEG_QUALITY = 50;   // Adjusted to hit ~5KB target with mozjpeg
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
    .sharpen({ sigma: 0.5 }) // Enhance detail before compression
    .jpeg({ 
      quality: JPEG_QUALITY, 
      mozjpeg: true, 
      progressive: true,
      chromaSubsampling: '4:2:0' 
    })
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
