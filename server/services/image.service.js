/**
 * Image Processing Service
 * Uses Sharp for server-side compression and resizing.
 */

const sharp = require("sharp");

const TARGET_WIDTH = 128; 
const TARGET_HEIGHT = 128;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const SIZE_BUDGET = 5000; 

async function processImage(buffer) {
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new Error(`Image too large`);
  }

  // Grayscale + 128x128 is the "sweet spot" for 5KB
  const basePipeline = sharp(buffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .grayscale() // SAVE 30-50% size -> re-invested into quality
    .sharpen({
      sigma: 1,
      m1: 2,
      j1: 2
    }); // Stronger edge definition

  let quality = 70; // Start MUCH higher because grayscale is efficient
  let processedBuffer;
  
  do {
    processedBuffer = await basePipeline
      .clone()
      .jpeg({ 
        quality: quality, 
        mozjpeg: true, 
        chromaSubsampling: '4:4:4', // Best detail for grayscale
        trellisQuantisation: true,
        overshootDeringing: true,
        optimizeScans: true
      })
      .toBuffer();

    if (processedBuffer.length <= SIZE_BUDGET) break;
    quality -= 5;
  } while (quality > 10);

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
