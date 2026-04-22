/**
 * Image Processing Service
 * Uses Sharp for server-side compression and resizing.
 */

const sharp = require("sharp");

const TARGET_WIDTH = 150; 
const TARGET_HEIGHT = 150;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const SIZE_BUDGET = 5000; 

async function processImage(buffer) {
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new Error(`Image too large`);
  }

  // 150x150 Color is the maximum viable resolution for a 5KB budget
  const basePipeline = sharp(buffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .sharpen({
      sigma: 0.5,
      m1: 1,
      j1: 1
    }); // Moderate sharpening for clarity without adding grain

  let quality = 50; 
  let processedBuffer;
  
  do {
    processedBuffer = await basePipeline
      .clone()
      .jpeg({ 
        quality: quality, 
        mozjpeg: true, 
        chromaSubsampling: '4:2:0', // Required for color efficiency at this size
        trellisQuantisation: true,
        overshootDeringing: true,
        optimizeScans: true,
        quantisationTable: 3 // Optimized for human faces
      })
      .toBuffer();

    if (processedBuffer.length <= SIZE_BUDGET) break;
    quality -= 3; // Finer steps for color tuning
  } while (quality > 5);

  return processedBuffer;
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
