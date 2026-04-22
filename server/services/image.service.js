/**
 * Image Processing Service
 * Uses Sharp for server-side compression and resizing.
 */

const sharp = require("sharp");

const TARGET_WIDTH = 160; 
const TARGET_HEIGHT = 160;
const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5 MB raw limit
const SIZE_BUDGET = 5000; // Aim for slightly under 5KB to be safe

async function processImage(buffer) {
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new Error(`Image too large`);
  }

  // Pre-processing: Resize, noise reduction, and sharpening
  const basePipeline = sharp(buffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .blur(0.4) // Perceptual tuning: Slight blur to remove sensor noise
    .sharpen({ sigma: 0.8 }); // Enhance edges for visual clarity

  let quality = 45;
  let processedBuffer;
  
  // Adaptive compression loop
  do {
    processedBuffer = await basePipeline
      .clone()
      .jpeg({ 
        quality: quality, 
        mozjpeg: true, 
        chromaSubsampling: '4:2:0',
        trellisQuantisation: true,
        overshootDeringing: true,
        optimizeScans: true
      })
      .toBuffer();

    if (processedBuffer.length <= SIZE_BUDGET) break;
    quality -= 5;
  } while (quality > 10);

  // Safety fallback: If still over budget, shrink size slightly
  if (processedBuffer.length > SIZE_BUDGET) {
    processedBuffer = await basePipeline
      .clone()
      .resize(140, 140)
      .jpeg({ quality: 15, mozjpeg: true })
      .toBuffer();
  }

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
