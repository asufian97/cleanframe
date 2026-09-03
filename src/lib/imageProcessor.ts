/**
 * CleanFrame Pixel Disturbance Engine & Canvas Processor
 * 100% Client-Side offscreen canvas rendering & pixel perturbation
 */

export interface DisturbanceConfig {
  noiseLevel: number;         // 0.0 to 5.0 (percentage)
  contrast: number;           // -5.0 to +5.0 (percentage)
  brightness: number;         // -5.0 to +5.0 (percentage)
  cropPixels: number;         // 0 to 4 (pixels shaved off borders)
  chrominanceDither: number;  // 0.0 to 5.0 (percentage Cb/Cr color channel jitter)
  spatialJitter: number;      // 0.00 to 0.10 (degrees sub-pixel rotation)
  unsharpMask: number;        // 0.0 to 2.0 (micro edge acuity restoration factor)
  outputFormat: 'image/jpeg' | 'image/png' | 'image/webp';
  quality: number;            // 0.80 to 1.0 (re-quantization factor)
}

export const PRESETS: Record<string, { name: string; description: string; config: DisturbanceConfig }> = {
  basic: {
    name: 'Basic Strip',
    description: '100% Metadata scrub (EXIF/C2PA). Zero visual alterations.',
    config: {
      noiseLevel: 0,
      contrast: 0,
      brightness: 0,
      cropPixels: 0,
      chrominanceDither: 0,
      spatialJitter: 0,
      unsharpMask: 0,
      outputFormat: 'image/png',
      quality: 1.0,
    },
  },
  deep: {
    name: 'Deep Pass',
    description: 'Metadata scrub + 1% noise + 1.5% Cb/Cr dither + 1px crop + 95% JPEG.',
    config: {
      noiseLevel: 1.0,
      contrast: 0.5,
      brightness: 0.2,
      cropPixels: 1,
      chrominanceDither: 1.5,
      spatialJitter: 0.03,
      unsharpMask: 0.5,
      outputFormat: 'image/jpeg',
      quality: 0.95,
    },
  },
  stealth: {
    name: 'Stealth Max',
    description: 'Advanced: 2.5% noise, 3% Cb/Cr dither, 0.06° spatial jitter, unsharp pass & 92% JPEG.',
    config: {
      noiseLevel: 2.5,
      contrast: 1.2,
      brightness: -0.5,
      cropPixels: 2,
      chrominanceDither: 3.0,
      spatialJitter: 0.06,
      unsharpMask: 1.0,
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
 * Process image client-side via HTML5 Canvas with advanced anti-watermark disturbance vectors
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

  // Apply Sub-Pixel Spatial Jitter (Micro-rotation to break coordinate lattice)
  if (config.spatialJitter > 0) {
    const angleRad = (config.spatialJitter * Math.PI) / 180;
    ctx.save();
    ctx.translate(targetWidth / 2, targetHeight / 2);
    ctx.rotate(angleRad);
    ctx.scale(1.002, 1.002); // slight scale to cover rotation edge clipping
    ctx.translate(-targetWidth / 2, -targetHeight / 2);
    ctx.drawImage(
      sourceImage,
      crop, crop, targetWidth, targetHeight,
      0, 0, targetWidth, targetHeight
    );
    ctx.restore();
  } else {
    ctx.drawImage(
      sourceImage,
      crop, crop, targetWidth, targetHeight,
      0, 0, targetWidth, targetHeight
    );
  }

  // Pixel manipulation: Noise, Contrast/Brightness, Chrominance Cb/Cr Dithering, and Unsharp Mask
  const needsPixelAdjustment =
    config.noiseLevel > 0 ||
    config.contrast !== 0 ||
    config.brightness !== 0 ||
    config.chrominanceDither > 0 ||
    config.unsharpMask > 0;

  if (needsPixelAdjustment) {
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;
    const len = data.length;

    const contrastFactor = 1 + config.contrast / 100;
    const brightnessOffset = (config.brightness / 100) * 255;
    const noiseStdDev = (config.noiseLevel / 100) * 12.0;
    const chrominanceStdDev = (config.chrominanceDither / 100) * 16.0;

    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 1. Contrast, Brightness, and Luminance Micro-Noise
      if (contrastFactor !== 1 || brightnessOffset !== 0 || noiseStdDev > 0) {
        const noise = noiseStdDev > 0 ? gaussianRandom() * noiseStdDev : 0;
        r = (r - 128) * contrastFactor + 128 + brightnessOffset + noise;
        g = (g - 128) * contrastFactor + 128 + brightnessOffset + noise;
        b = (b - 128) * contrastFactor + 128 + brightnessOffset + noise;
      }

      // 2. Chrominance (Cb/Cr) Channel Dithering (Synthetically Neutralizes SynthID Sub-bands)
      if (chrominanceStdDev > 0) {
        // Convert to YCbCr
        const y = 0.299 * r + 0.587 * g + 0.114 * b;
        let cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        let cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        // Perturb chrominance components
        cb += gaussianRandom() * chrominanceStdDev;
        cr += gaussianRandom() * chrominanceStdDev;

        // Convert back to RGB
        r = y + 1.402 * (cr - 128);
        g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
        b = y + 1.772 * (cb - 128);
      }

      data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }

    // 3. Optional Micro Unsharp Mask (Edge Acuity Restoration)
    if (config.unsharpMask > 0 && targetWidth > 4 && targetHeight > 4) {
      const copy = new Uint8ClampedArray(data);
      const amount = config.unsharpMask * 0.35;
      const rowBytes = targetWidth * 4;

      // 3x3 high-pass laplacian edge boost
      for (let y = 1; y < targetHeight - 1; y++) {
        const yOffset = y * rowBytes;
        for (let x = 1; x < targetWidth - 1; x++) {
          const idx = yOffset + x * 4;

          for (let c = 0; c < 3; c++) {
            const center = copy[idx + c];
            const up = copy[idx - rowBytes + c];
            const down = copy[idx + rowBytes + c];
            const left = copy[idx - 4 + c];
            const right = copy[idx + 4 + c];

            const laplacian = 4 * center - (up + down + left + right);
            const val = center + laplacian * amount;
            data[idx + c] = val < 0 ? 0 : val > 255 ? 255 : val;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // Export blob with chosen mime-type and quality factor
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
