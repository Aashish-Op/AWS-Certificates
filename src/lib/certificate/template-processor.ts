import 'server-only';
import sharp from 'sharp';

export interface ProcessedTemplate {
  printMaster: Buffer;
  webVersion: Buffer;
  width: number;
  height: number;
}

export async function processTemplateImage(fileBuffer: Buffer): Promise<ProcessedTemplate> {
  const metadata = await sharp(fileBuffer).metadata();

  if (!metadata.format || !['jpeg', 'jpg', 'png'].includes(metadata.format)) {
    throw new Error('Only PNG and JPEG images are supported for certificate templates.');
  }

  const originalWidth = metadata.width || 3508;
  const originalHeight = metadata.height || 2480;

  // 1. Print master: flatten onto white, max 3508px wide, JPEG quality 88
  let printMasterPipeline = sharp(fileBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } });

  if (originalWidth > 3508) {
    printMasterPipeline = printMasterPipeline.resize({ width: 3508, withoutEnlargement: true });
  }

  const printMaster = await printMasterPipeline
    .jpeg({ quality: 88, progressive: true })
    .toBuffer();

  const printMeta = await sharp(printMaster).metadata();
  const finalWidth = printMeta.width || originalWidth;
  const finalHeight = printMeta.height || originalHeight;

  // 2. Web version: max 1600px wide, JPEG quality 82
  let webPipeline = sharp(fileBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } });

  if (finalWidth > 1600) {
    webPipeline = webPipeline.resize({ width: 1600, withoutEnlargement: true });
  }

  const webVersion = await webPipeline
    .jpeg({ quality: 82, progressive: true })
    .toBuffer();

  return {
    printMaster,
    webVersion,
    width: finalWidth,
    height: finalHeight,
  };
}
