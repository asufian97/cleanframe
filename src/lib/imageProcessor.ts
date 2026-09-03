/**
 * CleanFrame Pixel Disturbance Engine & Canvas Processor
 * 100% Client-Side offscreen canvas rendering & pixel perturbation
 */

export interface DisturbanceConfig {
  noiseLevel: number; // 0.0 to 5.0 (percentage)
  contrast: number;   // -5.0 to +5.0 (percentage)
  brightness: number; // -5.0 to +5.0 (percentage)
  cropPixels: number; // 0 to 4 (pixels shaved off borders to disrupt spatial watermarks)
  outputFormat: 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number;    // 0.80 to 1.0 (re-quantization factor)
}

export const PRESETS: Record<string, { name: string; description: string; config: DisturbanceConfig }> = {
  basic: {
    name: 'Basic Strip',
    description: '100% Metadata scrub (EXIF/C2PA). Zero visual alterations to the image.',
    config: {
      noiseLevel: 0,
      contrast: 0,
      brightness: 0,
      cropPixels: 0,
      outputFormat: 'image/png',
      quality: 1.0,
    },
  },
  deep: {
    name: 'Deep Pass',
    description: 'Metadata scrub + 1% micro-grain + 1px border crop + 95% JPEG re-quantization.',
    config: {
      noiseLevel: 1.0,
      contrast: 0.5,
      brightness: 0.2,
      cropPixels: 1,
      outputFormat: 'image/jpeg',
      quality: 0.95,
    },
  },
  stealth: {
    name: 'Stealth Max',
    description: 'Stronger perturbation: 2.5% micro-grain, micro-contrast shift, 2px crop & 92% re-quantization.',
    config: {
      noiseLevel: 2.5,
      contrast: 1.2,
      brightness: -0.5,
      cropPixels: 2,
      outputFormat: 'image/jpeg',
      quality: 0.92,
    },
  },
};

export interface ProcessedImageResult {
  blob: Blob;
  objectUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  originalSizeBytes: number;
  processingTimeMs: number;
}

/**
 * Applies Box-Muller transform for natural Gaussian micro-noise distribution
 */
function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Process image client-side via HTML5 Canvas
 */
export async function processImageClientSide(
  sourceImage: HTMLImageElement,
  originalSizeBytes: number,
  config: DisturbanceConfig
): Promise<ProcessedImageResult> {
  const startTime = performance.now();

  const origWidth = sourceImage.naturalWidth || sourceImage.width;
  const origHeight = sourceImage.naturalHeight || sourceImage.height;

  // Calculate cropped dimensions (shaving cropPixels from all 4 borders)
  const crop = Math.max(0, Math.min(Math.floor(config.cropPixels), 8));
  const targetWidth = Math.max(1, origWidth - crop * 2);
  const targetHeight = Math.max(1, origHeight - crop * 2);

  // Create off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not obtain 2D rendering context for Canvas.');
  }

  // Draw source image with micro-crop applied
  ctx.drawImage(
    sourceImage,
    crop, crop, targetWidth, targetHeight, // Source crop coordinates
    0, 0, targetWidth, targetHeight        // Destination coordinates
  );

  // Apply pixel manipulation if noise, contrast, or brightness are requested
  const needsPixelAdjustment =
    config.noiseLevel > 0 || config.contrast !== 0 || config.brightness !== 0;

  if (needsPixelAdjustment) {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;
    const len = data.length;

    // Precalculate contrast and brightness multipliers
    // contrast slider is -5 to +5 percent
    const contrastFactor = 1 + (config.contrast / 100);
    // brightness slider is -5 to +5 percent (in 0-255 scale)
    const brightnessOffset = (config.brightness / 100) * 255;
    // noise level: 0 to 5% translates to standard deviation in 0-255 range
    const noiseStdDev = (config.noiseLevel / 100) * 12.0;

    for (let i = 0; i < len; i += 4) {
      // Calculate micro-noise perturbation per pixel
      const noise = noiseStdDev > 0 ? gaussianRandom() * noiseStdDev : 0;

      // Red
      let r = data[i];
      r = (r - 128) * contrastFactor + 128 + brightnessOffset + noise;
      data[i] = r < 0 ? 0 : r > 255 ? 255 : r;

      // Green
      let g = data[i + 1];
      g = (g - 128) * contrastFactor + 128 + brightnessOffset + noise;
      data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;

      // Blue
      let b = data[i + 2];
      b = (b - 128) * contrastFactor + 128 + brightnessOffset + noise;
      data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;

      // Keep alpha intact (data[i + 3])
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // Export blob with chosen mime-type and quality factor
  // This completely generates a fresh stream discarding any EXIF/C2PA/XMP
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob returned null'));
      },
      config.outputFormat,
      config.outputFormat === 'image/png' ? undefined : config.quality
    );
  });

  const objectUrl = URL.createObjectURL(blob);
  const processingTimeMs = Math.round(performance.now() - startTime);

  return {
    blob,
    objectUrl,
    width: targetWidth,
    height: targetHeight,
    sizeBytes: blob.size,
    originalSizeBytes,
    processingTimeMs,
  };
}

/**
 * Creates a sanitized download filename stripping original metadata or camera strings
 */
export function generateSanitizedFilename(format: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let ext = 'jpg';
  if (format === 'image/png') ext = 'png';
  if (format === 'image/webp') ext = 'webp';
  return `cleanframe_export_${timestamp}.${ext}`;
}

/**
 * Helper to trigger immediate browser download
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
