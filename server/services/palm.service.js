const sharp = require("sharp");

const TARGET_WIDTH = 200; 
const TARGET_HEIGHT = 260;
const SIZE_BUDGET = 8000; // Increased to 8KB for better biometric detail

async function processPalmImage(buffer) {
  // Palm-specific processing: high contrast, normalized lighting
  const basePipeline = sharp(buffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true
    })
    .modulate({
      brightness: 1.05,
      contrast: 1.2
    })
    .sharpen({ sigma: 1.2 });

  let quality = 85; // Start with high quality
  let processedBuffer;

  do {
    processedBuffer = await basePipeline
      .clone()
      .jpeg({ 
        quality: quality, 
        mozjpeg: true, 
        chromaSubsampling: '4:2:0',
        trellisQuantisation: true,
        optimizeScans: true
      })
      .toBuffer();

    if (processedBuffer.length <= SIZE_BUDGET) break;
    quality -= 5;
  } while (quality > 10);

  return processedBuffer;
}
module.exports = { processPalmImage };
