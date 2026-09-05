/**
 * Client-Side Video Watermark Processor for CleanFrame
 * 100% In-Browser - Zero Server Uploads - Audio Preserved
 */

export type WatermarkRemovalMode = 'inpaint' | 'blur' | 'crop';

export interface WatermarkRegion {
  x: number; // percentage (0-100) or absolute px
  y: number; // percentage (0-100) or absolute px
  width: number; // percentage (0-100) or absolute px
  height: number; // percentage (0-100) or absolute px
  isPercentage: boolean;
}

export interface VideoProcessingConfig {
  mode: WatermarkRemovalMode;
  region: WatermarkRegion;
  blurRadius: number; // 4 to 32px
  featherRadius: number; // 2 to 24px
  cropBottomPercent: number; // For crop mode, 4% to 15%
  quality: number; // 1 to 10 (MediaRecorder bitrate factor)
}

export const DEFAULT_GEMINI_REGION: WatermarkRegion = {
  // Standard Gemini/Veo bottom-right positioning
  x: 82,
  y: 86,
  width: 15,
  height: 11,
  isPercentage: true,
};

export const DEFAULT_VIDEO_CONFIG: VideoProcessingConfig = {
  mode: 'inpaint',
  region: DEFAULT_GEMINI_REGION,
  blurRadius: 14,
  featherRadius: 10,
  cropBottomPercent: 8,
  quality: 8,
};

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
  hasAudio: boolean;
  mimeType: string;
}

/**
 * Extract metadata from a video file
 */
export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const duration = video.duration || 0;
      const aspectRatio = width / height;
      const hasAudio = true;

      URL.revokeObjectURL(url);
      resolve({
        duration,
        width,
        height,
        aspectRatio,
        hasAudio,
        mimeType: file.type || 'video/mp4',
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata. File format may be unsupported.'));
    };

    video.src = url;
  });
}

/**
 * Calculate absolute pixel coordinates for watermark region
 */
export function getAbsoluteRegion(
  region: WatermarkRegion,
  frameWidth: number,
  frameHeight: number
): { x: number; y: number; width: number; height: number } {
  if (region.isPercentage) {
    const x = Math.round((region.x / 100) * frameWidth);
    const y = Math.round((region.y / 100) * frameHeight);
    const width = Math.round((region.width / 100) * frameWidth);
    const height = Math.round((region.height / 100) * frameHeight);
    return {
      x: Math.max(0, Math.min(x, frameWidth - width)),
      y: Math.max(0, Math.min(y, frameHeight - height)),
      width: Math.min(width, frameWidth),
      height: Math.min(height, frameHeight),
    };
  }
  return {
    x: Math.max(0, Math.min(region.x, frameWidth - region.width)),
    y: Math.max(0, Math.min(region.y, frameHeight - region.height)),
    width: Math.min(region.width, frameWidth),
    height: Math.min(region.height, frameHeight),
  };
}

/**
 * Process a single video frame on a canvas, removing the watermark according to configuration
 */
export function processVideoFrame(
  source: CanvasImageSource,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: VideoProcessingConfig
) {
  if (config.mode === 'crop') {
    // Mode Crop: Clip bottom margin
    const cropPx = Math.round((config.cropBottomPercent / 100) * height);
    const cleanHeight = height - cropPx;

    ctx.clearRect(0, 0, width, height);
    // Draw cropped portion
    ctx.drawImage(source, 0, 0, width, cleanHeight, 0, 0, width, cleanHeight);
    // Fill remaining bottom with seamless edge extension
    ctx.drawImage(source, 0, cleanHeight - 1, width, 1, 0, cleanHeight, width, cropPx);
    return;
  }

  // Draw base frame
  ctx.drawImage(source, 0, 0, width, height);

  const rect = getAbsoluteRegion(config.region, width, height);
  if (rect.width <= 0 || rect.height <= 0) return;

  const feather = Math.max(2, config.featherRadius);

  if (config.mode === 'blur') {
    // Mode Blur: Feathered localized blur
    ctx.save();

    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = rect.width + feather * 2;
    patchCanvas.height = rect.height + feather * 2;
    const patchCtx = patchCanvas.getContext('2d');

    if (patchCtx) {
      const srcX = Math.max(0, rect.x - feather);
      const srcY = Math.max(0, rect.y - feather);
      const srcW = Math.min(width - srcX, rect.width + feather * 2);
      const srcH = Math.min(height - srcY, rect.height + feather * 2);

      patchCtx.filter = `blur(${config.blurRadius}px)`;
      patchCtx.drawImage(source, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.width, rect.height, feather);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = feather;
      ctx.drawImage(patchCanvas, 0, 0, srcW, srcH, srcX, srcY, srcW, srcH);
    }
    ctx.restore();
    return;
  }

  // Mode Inpaint: Intelligent neighbor sampling + directional blending
  ctx.save();

  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = rect.width;
  patchCanvas.height = rect.height;
  const patchCtx = patchCanvas.getContext('2d');

  if (patchCtx) {
    // 1. Sample from above the watermark box
    const sampleAboveY = Math.max(0, rect.y - rect.height);
    const sampleAboveH = Math.min(rect.height, rect.y);

    if (sampleAboveH > 5) {
      patchCtx.drawImage(
        source,
        rect.x,
        sampleAboveY,
        rect.width,
        sampleAboveH,
        0,
        0,
        rect.width,
        rect.height
      );
    }

    // 2. Sample from left of the watermark box with 50% opacity blend
    const sampleLeftX = Math.max(0, rect.x - rect.width);
    const sampleLeftW = Math.min(rect.width, rect.x);

    if (sampleLeftW > 5) {
      patchCtx.globalAlpha = 0.5;
      patchCtx.drawImage(
        source,
        sampleLeftX,
        rect.y,
        sampleLeftW,
        rect.height,
        0,
        0,
        rect.width,
        rect.height
      );
      patchCtx.globalAlpha = 1.0;
    }

    // 3. Apply subtle smoothing filter to patch to eliminate high-frequency logo lines
    const smoothCanvas = document.createElement('canvas');
    smoothCanvas.width = rect.width;
    smoothCanvas.height = rect.height;
    const smoothCtx = smoothCanvas.getContext('2d');

    if (smoothCtx) {
      smoothCtx.filter = `blur(${Math.max(4, config.blurRadius * 0.5)}px)`;
      smoothCtx.drawImage(patchCanvas, 0, 0);

      // 4. Feathered draw back to main context
      ctx.save();
      ctx.beginPath();
      const r = Math.min(feather, rect.width / 4, rect.height / 4);
      ctx.roundRect(rect.x, rect.y, rect.width, rect.height, r);
      ctx.clip();

      // Draw smoothed texture patch
      ctx.drawImage(smoothCanvas, rect.x, rect.y);

      // Gentle edge gradient over boundary to erase seam
      const edgeGrad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
      edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
      edgeGrad.addColorStop(0.2, 'rgba(255,255,255,0.02)');
      edgeGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      ctx.restore();
    }
  }

  ctx.restore();
}

/**
 * Clean and export video client-side using MediaRecorder
 */
export async function cleanVideoClientSide(
  videoFile: File,
  config: VideoProcessingConfig,
  onProgress?: (progress: number, currentTime: number, totalDuration: number) => void,
  abortSignal?: AbortSignal
): Promise<{ blob: Blob; url: string; processingTimeMs: number }> {
  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = false;
    video.autoplay = false;
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;

    const cleanup = () => {
      video.pause();
      URL.revokeObjectURL(videoUrl);
      video.remove();
    };

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        cleanup();
        reject(new Error('Video processing cancelled by user.'));
      });
    }

    video.onloadedmetadata = async () => {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const duration = video.duration || 1;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        cleanup();
        reject(new Error('Could not create canvas 2D rendering context.'));
        return;
      }

      // Prepare MediaStream from canvas
      const fps = 30;
      const stream = canvas.captureStream(fps);

      // Add audio track if available
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const sourceNode = audioCtx.createMediaElementSource(video);
          const destination = audioCtx.createMediaStreamDestination();
          sourceNode.connect(destination);
          sourceNode.connect(audioCtx.destination);

          const audioTrack = destination.stream.getAudioTracks()[0];
          if (audioTrack) {
            stream.addTrack(audioTrack);
          }
        }
      } catch {
        // Audio capture not available or restricted; proceed with video stream
      }

      // Determine supported MIME type
      let mimeType = 'video/webm;codecs=vp9';
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }

      const baseBitrate = width * height * fps * 0.15;
      const bitrate = Math.min(12_000_000, Math.max(2_500_000, baseBitrate * (config.quality / 5)));

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: bitrate,
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType });
        const finalUrl = URL.createObjectURL(finalBlob);
        const processingTimeMs = Math.round(performance.now() - startTime);
        cleanup();
        resolve({
          blob: finalBlob,
          url: finalUrl,
          processingTimeMs,
        });
      };

      recorder.onerror = (err) => {
        cleanup();
        reject(err);
      };

      recorder.start(100);

      let animationFrameId: number;

      const renderLoop = () => {
        if (abortSignal?.aborted) {
          cancelAnimationFrame(animationFrameId);
          recorder.stop();
          return;
        }

        if (video.paused || video.ended) {
          if (video.ended || video.currentTime >= duration - 0.05) {
            cancelAnimationFrame(animationFrameId);
            setTimeout(() => {
              if (recorder.state === 'recording') {
                recorder.stop();
              }
            }, 300);
            return;
          }
        }

        processVideoFrame(video, ctx, width, height, config);

        const progress = Math.min(100, Math.round((video.currentTime / duration) * 100));
        onProgress?.(progress, video.currentTime, duration);

        animationFrameId = requestAnimationFrame(renderLoop);
      };

      video.onended = () => {
        cancelAnimationFrame(animationFrameId);
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, 300);
      };

      try {
        await video.play();
        renderLoop();
      } catch {
        video.muted = true;
        await video.play();
        renderLoop();
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video file for processing.'));
    };
  });
}

/**
 * Generate a synthetic 4-second demo video containing an animated background
 * and the iconic Gemini sparkle watermark at the bottom right.
 */
export async function createDemoGeminiVideo(): Promise<File> {
  const width = 854;
  const height = 480;
  const durationSec = 4;
  const fps = 30;
  const totalFrames = durationSec * fps;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm',
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const mime = recorder.mimeType || 'video/webm';
      const extension = mime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mime });
      const file = new File([blob], `gemini_ai_video_sample.${extension}`, { type: mime });
      resolve(file);
    };

    recorder.start();

    let frame = 0;
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
        return;
      }

      const t = frame / totalFrames;
      const angle = t * Math.PI * 2;

      // Animated futuristic scene
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, `hsl(${220 + Math.sin(angle) * 20}, 70%, 15%)`);
      grad.addColorStop(0.5, `hsl(${260 + Math.cos(angle) * 20}, 65%, 25%)`);
      grad.addColorStop(1, `hsl(${180 + Math.sin(angle) * 30}, 60%, 20%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Glowing shapes
      for (let i = 0; i < 5; i++) {
        const x = ((width * 0.2 * i + frame * 3) % (width + 100)) - 50;
        const y = height * 0.5 + Math.sin(angle + i) * 60;
        ctx.beginPath();
        ctx.arc(x, y, 40 + i * 10, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${200 + i * 30}, 80%, 60%, 0.15)`;
        ctx.fill();
      }

      // Title overlay on video
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('Gemini AI Cinematic Video Render', 40, 60);

      ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(`Frame ${frame + 1} / ${totalFrames} • Ultra-HD Veo Synthesis`, 40, 88);

      // --- GEMINI WATERMARK IN BOTTOM-RIGHT CORNER ---
      const wmX = width - 130;
      const wmY = height - 55;

      // Watermark translucent pill
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.beginPath();
      ctx.roundRect(wmX - 10, wmY - 18, 125, 42, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Gemini 4-pointed sparkle star icon
      const starX = wmX + 10;
      const starY = wmY + 4;
      const starPulse = 1 + Math.sin(angle * 4) * 0.15;
      const starGrad = ctx.createLinearGradient(starX - 12, starY - 12, starX + 12, starY + 12);
      starGrad.addColorStop(0, '#38bdf8');
      starGrad.addColorStop(0.5, '#818cf8');
      starGrad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = starGrad;

      ctx.beginPath();
      const rOuter = 11 * starPulse;
      const rInner = 3.5 * starPulse;
      for (let p = 0; p < 8; p++) {
        const rad = (p * Math.PI) / 4 - Math.PI / 2;
        const radDist = p % 2 === 0 ? rOuter : rInner;
        const px = starX + Math.cos(rad) * radDist;
        const py = starY + Math.sin(rad) * radDist;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Gemini text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = '600 15px system-ui, sans-serif';
      ctx.fillText('Gemini', starX + 18, starY + 5);

      ctx.restore();

      frame++;
    }, 1000 / fps);
  });
}
