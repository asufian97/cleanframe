/**
 * Automated Gemini Watermark Detector
 * Uses Normalized Cross-Correlation (NCC) template matching against calibrated
 * Gemini alpha profiles to pinpoint watermark coordinates with pixel accuracy.
 */

import { getCalibratedGeminiAlphaMap } from './reverseAlphaRemover';
import type { WatermarkRegion } from '../videoProcessor';

export interface DetectionResult {
  region: WatermarkRegion;
  pixelRegion: { x: number; y: number; width: number; height: number };
  confidence: number;
  found: boolean;
}

const EPSILON = 1e-8;

function meanAndVariance(data: Float32Array): { mean: number; variance: number } {
  const len = data.length;
  if (len === 0) return { mean: 0, variance: 0 };

  let sum = 0;
  for (let i = 0; i < len; i++) sum += data[i];
  const mean = sum / len;

  let sq = 0;
  for (let i = 0; i < len; i++) {
    const d = data[i] - mean;
    sq += d * d;
  }
  return { mean, variance: sq / len };
}

function normalizedCrossCorrelation(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;

  const statsA = meanAndVariance(a);
  const statsB = meanAndVariance(b);
  const den = Math.sqrt(statsA.variance * statsB.variance) * a.length;

  if (den < EPSILON) return 0;

  let num = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - statsA.mean) * (b[i] - statsB.mean);
  }
  return num / den;
}

function extractGrayscaleRegion(
  imageData: ImageData,
  x: number,
  y: number,
  size: number
): Float32Array {
  const { width, height, data } = imageData;
  const out = new Float32Array(size * size);

  for (let row = 0; row < size; row++) {
    const imgY = y + row;
    if (imgY < 0 || imgY >= height) continue;

    for (let col = 0; col < size; col++) {
      const imgX = x + col;
      if (imgX < 0 || imgX >= width) continue;

      const idx = (imgY * width + imgX) * 4;
      // Perceptual grayscale luminance
      out[row * size + col] =
        (0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2]) / 255;
    }
  }

  return out;
}

/**
 * Scan an ImageData frame and locate the Gemini watermark coordinates
 */
export function detectGeminiWatermark(
  imageData: ImageData,
  hintRegion?: WatermarkRegion
): DetectionResult {
  const { width, height } = imageData;

  // Determine search space in the bottom-right quadrant
  // Gemini watermarks are always located in the lower-right area
  const searchMinX = Math.round(width * 0.60);
  const searchMaxX = width - 10;
  const searchMinY = Math.round(height * 0.60);
  const searchMaxY = height - 10;

  // Candidate watermark sizes to test based on frame resolution
  const candidateSizes: number[] = [];
  if (width >= 1600 || height >= 900) {
    candidateSizes.push(72, 96, 64, 56);
  } else if (width >= 1000 || height >= 600) {
    candidateSizes.push(48, 56, 64, 72);
  } else {
    candidateSizes.push(48, 56, 36, 40);
  }

  let bestScore = -1;
  let bestX = 0;
  let bestY = 0;
  let bestSize = candidateSizes[0] || 48;

  // Step size for coarse scan (skip every 4 pixels for speed)
  const coarseStep = 4;

  for (const size of candidateSizes) {
    if (size > width || size > height) continue;

    const template = getCalibratedGeminiAlphaMap(size, size, size >= 72 ? '96-20260520' : '48');
    const maxX = searchMaxX - size;
    const maxY = searchMaxY - size;

    for (let y = searchMinY; y <= maxY; y += coarseStep) {
      for (let x = searchMinX; x <= maxX; x += coarseStep) {
        const patch = extractGrayscaleRegion(imageData, x, y, size);
        const score = normalizedCrossCorrelation(patch, template);

        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
          bestSize = size;
        }
      }
    }
  }

  // Refine around the best match with 1px fine scan
  if (bestScore > 0.15) {
    const fineRadius = coarseStep + 2;
    const template = getCalibratedGeminiAlphaMap(bestSize, bestSize, bestSize >= 72 ? '96-20260520' : '48');
    const fineMinX = Math.max(searchMinX, bestX - fineRadius);
    const fineMaxX = Math.min(width - bestSize, bestX + fineRadius);
    const fineMinY = Math.max(searchMinY, bestY - fineRadius);
    const fineMaxY = Math.min(height - bestSize, bestY + fineRadius);

    for (let y = fineMinY; y <= fineMaxY; y++) {
      for (let x = fineMinX; x <= fineMaxX; x++) {
        const patch = extractGrayscaleRegion(imageData, x, y, bestSize);
        const score = normalizedCrossCorrelation(patch, template);

        if (score > bestScore) {
          bestScore = score;
          bestX = x;
          bestY = y;
        }
      }
    }
  }

  const found = bestScore >= 0.22;

  // If not found with high confidence and hintRegion given, respect hint
  if (!found && hintRegion) {
    const pxX = hintRegion.isPercentage ? (hintRegion.x / 100) * width : hintRegion.x;
    const pxY = hintRegion.isPercentage ? (hintRegion.y / 100) * height : hintRegion.y;
    const pxW = hintRegion.isPercentage ? (hintRegion.width / 100) * width : hintRegion.width;
    const pxH = hintRegion.isPercentage ? (hintRegion.height / 100) * height : hintRegion.height;
    return {
      region: hintRegion,
      pixelRegion: { x: Math.round(pxX), y: Math.round(pxY), width: Math.round(pxW), height: Math.round(pxH) },
      confidence: bestScore,
      found: false,
    };
  }

  const resultRegion: WatermarkRegion = {
    x: Math.round((bestX / width) * 1000) / 10,
    y: Math.round((bestY / height) * 1000) / 10,
    width: Math.round((bestSize / width) * 1000) / 10,
    height: Math.round((bestSize / height) * 1000) / 10,
    isPercentage: true,
  };

  return {
    region: resultRegion,
    pixelRegion: {
      x: bestX,
      y: bestY,
      width: bestSize,
      height: bestSize,
    },
    confidence: bestScore,
    found,
  };
}
