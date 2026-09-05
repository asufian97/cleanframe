/**
 * Reverse Alpha Blending Engine for Gemini Watermarks
 * Based on GargantuaX/gemini-watermark-remover mathematical formulation
 *
 * Principle:
 * When Gemini creates the visible watermark:
 *   watermarked = alpha * logoValue + (1 - alpha) * original
 *
 * Reverse solve to recover the pristine original without blurring:
 *   original = (watermarked - alpha * logoValue) / (1 - alpha)
 */

import { getEmbeddedAlphaMap } from './embeddedAlphaMaps';

const ALPHA_NOISE_FLOOR = 3 / 255;
const ALPHA_THRESHOLD = 0.002;
const MAX_ALPHA = 0.99;
const LOGO_VALUE = 255; // White watermark logo

/**
 * Resize a square alpha map using area-weighted interpolation
 */
export function resizeAlphaMapArea(
  sourceAlpha: Float32Array,
  sourceSize: number,
  targetWidth: number,
  targetHeight: number
): Float32Array {
  if (targetWidth <= 0 || targetHeight <= 0) return new Float32Array(0);

  const out = new Float32Array(targetWidth * targetHeight);
  const scaleX = sourceSize / targetWidth;
  const scaleY = sourceSize / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const yStart = y * scaleY;
    const yEnd = (y + 1) * scaleY;
    const y0 = Math.floor(yStart);
    const y1 = Math.ceil(yEnd);

    for (let x = 0; x < targetWidth; x++) {
      const xStart = x * scaleX;
      const xEnd = (x + 1) * scaleX;
      const x0 = Math.floor(xStart);
      const x1 = Math.ceil(xEnd);

      let sum = 0;
      let areaSum = 0;

      for (let sy = y0; sy < y1; sy++) {
        if (sy < 0 || sy >= sourceSize) continue;
        const wy = Math.max(0, Math.min(yEnd, sy + 1) - Math.max(yStart, sy));
        for (let sx = x0; sx < x1; sx++) {
          if (sx < 0 || sx >= sourceSize) continue;
          const wx = Math.max(0, Math.min(xEnd, sx + 1) - Math.max(xStart, sx));
          const area = wx * wy;
          sum += sourceAlpha[sy * sourceSize + sx] * area;
          areaSum += area;
        }
      }

      out[y * targetWidth + x] = areaSum > 0 ? sum / areaSum : 0;
    }
  }

  return out;
}

export interface ReverseAlphaOptions {
  alphaGain?: number;
  logoValue?: number;
  alphaProfile?: '96-20260520' | '96' | '48' | '36-v2';
}

/**
 * Remove watermark in-place on an ImageData region using mathematically exact Reverse Alpha Blending
 */
export function removeWatermarkReverseAlpha(
  imageData: ImageData,
  alphaMap: Float32Array,
  position: { x: number; y: number; width: number; height: number },
  options: ReverseAlphaOptions = {}
): void {
  const { x, y, width, height } = position;
  const alphaGain = Number.isFinite(options.alphaGain) && options.alphaGain! > 0 ? options.alphaGain! : 1.0;
  const defaultLogoVal = Number.isFinite(options.logoValue) ? options.logoValue! : LOGO_VALUE;

  for (let row = 0; row < height; row++) {
    const imgY = y + row;
    if (imgY < 0 || imgY >= imageData.height) continue;

    for (let col = 0; col < width; col++) {
      const imgX = x + col;
      if (imgX < 0 || imgX >= imageData.width) continue;

      const imgIdx = (imgY * imageData.width + imgX) * 4;
      const alphaIdx = row * width + col;
      if (alphaIdx >= alphaMap.length) continue;

      const rawAlpha = alphaMap[alphaIdx];
      const alphaMagnitude = Math.abs(rawAlpha);
      const logoValue = rawAlpha < 0 ? 0 : defaultLogoVal;

      // Filter quantization noise
      const signalAlpha = Math.max(0, alphaMagnitude - ALPHA_NOISE_FLOOR) * alphaGain;
      if (signalAlpha < ALPHA_THRESHOLD) continue;

      // Safety guard against dark hole / ghost watermark artifacts:
      // If the pixel is already darker than (alpha * logoValue), subtracting white would yield negative numbers,
      // meaning this pixel didn't actually contain a white watermark (e.g. misaligned box).
      // Continuous edge boundary feather to guarantee zero rectangular seam or edge line
      const edgeDist = Math.min(row, height - 1 - row, col, width - 1 - col);
      const edgeFactor = edgeDist < 4 ? Math.sin((edgeDist / 4) * (Math.PI / 2)) : 1.0;
      let effectiveAlpha = Math.min(alphaMagnitude * alphaGain, MAX_ALPHA) * edgeFactor;
      if (logoValue > 0) {
        const avgChannel = (imageData.data[imgIdx] + imageData.data[imgIdx + 1] + imageData.data[imgIdx + 2]) / 3;
        const minWatermarkedVal = effectiveAlpha * logoValue;
        if (avgChannel < minWatermarkedVal) {
          const factor = Math.max(0, avgChannel / (minWatermarkedVal + 1e-4));
          effectiveAlpha = effectiveAlpha * (factor * factor);
        }
      }

      if (effectiveAlpha < ALPHA_THRESHOLD) continue;
      const oneMinusAlpha = 1.0 - effectiveAlpha;

      // Reverse solve each RGB channel
      for (let c = 0; c < 3; c++) {
        const watermarked = imageData.data[imgIdx + c];
        const original = (watermarked - effectiveAlpha * logoValue) / oneMinusAlpha;
        imageData.data[imgIdx + c] = Math.max(0, Math.min(255, Math.round(original)));
      }
    }
  }
}

// Cached scaled alpha maps
const alphaMapCache = new Map<string, Float32Array>();

/**
 * Retrieve or build a calibrated Gemini alpha map resized to the requested width and height
 */
export function getCalibratedGeminiAlphaMap(
  width: number,
  height: number,
  profile: '96-20260520' | '96' | '48' | '36-v2' = '96-20260520'
): Float32Array {
  const cacheKey = `${profile}_${width}x${height}`;
  if (alphaMapCache.has(cacheKey)) {
    return alphaMapCache.get(cacheKey)!;
  }

  // Choose best source profile: if small target size, use 48 or 36
  let srcProfile = profile;
  if (Math.max(width, height) <= 48 && profile !== '48' && profile !== '36-v2') {
    srcProfile = '48';
  }

  const baseMap = getEmbeddedAlphaMap(srcProfile) || getEmbeddedAlphaMap('96-20260520') || getEmbeddedAlphaMap(48);
  if (!baseMap) {
    return new Float32Array(width * height);
  }

  const baseSize = Math.round(Math.sqrt(baseMap.length));
  const resized = resizeAlphaMapArea(baseMap, baseSize, width, height);
  alphaMapCache.set(cacheKey, resized);
  return resized;
}

/**
 * Apply Reverse Alpha Blending directly to a target region on an HTML Canvas context
 */
export function applyReverseAlphaToCanvas(
  ctx: CanvasRenderingContext2D,
  region: { x: number; y: number; width: number; height: number },
  options: ReverseAlphaOptions = {}
): void {
  const { x, y, width, height } = region;
  if (width <= 0 || height <= 0) return;

  const alphaMap = getCalibratedGeminiAlphaMap(width, height, options.alphaProfile);
  const imageData = ctx.getImageData(x, y, width, height);

  removeWatermarkReverseAlpha(
    imageData,
    alphaMap,
    { x: 0, y: 0, width, height },
    options
  );

  ctx.putImageData(imageData, x, y);
}
