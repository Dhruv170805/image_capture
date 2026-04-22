const sharp = require("sharp");

const TARGET_WIDTH = 160; 
const TARGET_HEIGHT = 220;
const SIZE_BUDGET = 5000; // 5KB strict

async function processPalmImage(buffer) {
  // Palm-specific processing: high contrast, normalized lighting
  const basePipeline = sharp(buffer)
    .resize(TARGET_WIDTH, TARGET_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true
    })
    .modulate({
      brightness: 1.05,
      contrast: 1.15
    })
    .sharpen({ sigma: 1 });

  let quality = 60;
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
  } while (quality > 5);

  return processedBuffer;
}

module.exports = { processPalmImage };
