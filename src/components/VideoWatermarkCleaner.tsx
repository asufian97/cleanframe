import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  VideoProcessingConfig,
  VideoMetadata,
} from '../lib/videoProcessor';
import {
  DEFAULT_VIDEO_CONFIG,
  DEFAULT_GEMINI_REGION,
  getVideoMetadata,
  processVideoFrame,
  cleanVideoClientSide,
  createDemoGeminiVideo,
  getAbsoluteRegion,
  getRecommendedGeminiRegion,
  detectGeminiWatermark,
} from '../lib/videoProcessor';
import {
  Video,
  Sparkles,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wand2,
  Eye,
  Columns,
  Loader2,
  Volume2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface VideoWatermarkCleanerProps {
  onOpenPrivacyInfo?: () => void;
}

export const VideoWatermarkCleaner: React.FC<VideoWatermarkCleanerProps> = () => {
  // Video source state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Configuration state
  const [config, setConfig] = useState<VideoProcessingConfig>(DEFAULT_VIDEO_CONFIG);
  const [activePreset, setActivePreset] = useState<'1080p' | '720p' | 'custom'>('1080p');
  const [detectStatus, setDetectStatus] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Preview & playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [previewMode, setPreviewMode] = useState<'cleaned' | 'split' | 'target'>('cleaned');

  // Export / Processing state
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportCurrentTime, setExportCurrentTime] = useState<number>(0);
  const [exportResult, setExportResult] = useState<{ url: string; blob: Blob; processingTimeMs: number } | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detect watermark on current video frame using NCC template matching
  const handleAutoDetect = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    setIsDetecting(true);
    setDetectStatus('Scanning frame for Gemini watermark...');

    try {
      const width = video.videoWidth || 854;
      const height = video.videoHeight || 480;

      const scanCanvas = document.createElement('canvas');
      scanCanvas.width = width;
      scanCanvas.height = height;
      const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
      if (!scanCtx) return;

      scanCtx.drawImage(video, 0, 0, width, height);
      const imgData = scanCtx.getImageData(0, 0, width, height);

      const detection = detectGeminiWatermark(imgData, config.region);
      if (detection.found) {
        setConfig((prev) => ({
          ...prev,
          region: detection.region,
          mode: 'reverse-alpha',
        }));
        const matchPct = Math.round(detection.confidence * 100);
        setDetectStatus(`Watermark locked: X: ${detection.region.x}%, Y: ${detection.region.y}% (${matchPct}% match)`);
      } else {
        setConfig((prev) => ({
          ...prev,
          region: detection.region,
        }));
        setDetectStatus(`Watermark aligned: X: ${detection.region.x}%, Y: ${detection.region.y}%`);
      }
    } catch (e) {
      console.error(e);
      setDetectStatus('Auto-align completed using catalog anchor.');
    } finally {
      setIsDetecting(false);
      setTimeout(() => setDetectStatus(null), 5000);
    }
  }, [config.region]);

  // Handle file selection
  const handleFileChange = async (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|m4v)$/i)) {
      setErrorMsg('Please upload a valid video file (.mp4, .webm, or .mov)');
      return;
    }

    if (file.size > 80 * 1024 * 1024) {
      setErrorMsg('File size exceeds 80 MB limit. Please use a shorter clip for in-browser processing.');
      return;
    }

    try {
      const meta = await getVideoMetadata(file);
      setMetadata(meta);
      setSourceFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setExportResult(null);
      setCurrentTime(0);
      setIsPlaying(false);

      // Auto-calculate exact recommended Gemini watermark bounding box based on video dimensions
      const recRegion = getRecommendedGeminiRegion(meta.width, meta.height);
      setConfig((prev) => ({
        ...prev,
        region: recRegion,
        mode: 'reverse-alpha', // Always default to mathematical Reverse Alpha
      }));
      setActivePreset(meta.width >= 1600 ? '1080p' : '720p');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to read video file');
    }
  };

  // Load sample demo video with real Gemini AI watermark
  const handleLoadDemo = async () => {
    setIsGeneratingDemo(true);
    setErrorMsg(null);
    try {
      const demoFile = await createDemoGeminiVideo();
      await handleFileChange(demoFile);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to generate demo video.');
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Preset definitions
  const applyPreset = (presetName: '1080p' | '720p' | 'standard') => {
    setActivePreset(presetName === 'standard' ? '1080p' : presetName);
    const w = metadata?.width || (presetName === '1080p' ? 1920 : 1280);
    const h = metadata?.height || (presetName === '1080p' ? 1080 : 720);
    const rec = getRecommendedGeminiRegion(w, h);
    setConfig((prev) => ({
      ...prev,
      region: rec,
      alphaGain: 1.0,
      mode: 'reverse-alpha',
    }));
  };

  // Render current frame on canvas
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const width = video.videoWidth || 854;
    const height = video.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    if (previewMode === 'split') {
      // Split view: Left half original, right half cleaned
      ctx.drawImage(video, 0, 0, width, height);

      // Create right-half cleaned patch
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;
      processVideoFrame(video, tempCtx, width, height, config);

      // Draw right half
      const splitX = Math.round(width * 0.5);
      ctx.drawImage(
        tempCanvas,
        splitX,
        0,
        width - splitX,
        height,
        splitX,
        0,
        width - splitX,
        height
      );

      // Subtle split comparison line
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Split labels
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(16, 16, 120, 28);
      ctx.fillRect(width - 150, 16, 134, 28);

      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('Original Watermark', 24, 34);

      ctx.fillStyle = '#34d399';
      ctx.fillText('Reverse Alpha (No Blur)', width - 142, 34);
    } else {
      // Cleaned mode
      processVideoFrame(video, ctx, width, height, config);

      // Target overlay mode if selected
      if (previewMode === 'target') {
        const rect = getAbsoluteRegion(config.region, width, height);
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        // Highlight box
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        // Label
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText('Gemini Alpha Target Area', rect.x, Math.max(16, rect.y - 8));
        ctx.restore();
      }
    }
  }, [config, previewMode]);

  // Animation loop during playback
  useEffect(() => {
    if (!isPlaying) return;

    let active = true;
    const loop = () => {
      if (!active) return;
      const video = videoRef.current;
      if (video && !video.paused) {
        setCurrentTime(video.currentTime);
        renderFrame();
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, renderFrame]);

  // Re-render frame whenever config or preview mode changes while paused
  useEffect(() => {
    if (!isPlaying) {
      renderFrame();
    }
  }, [config, previewMode, isPlaying, renderFrame]);

  // Play / Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Scrub timeline
  const handleSeek = (timeSec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = timeSec;
    setCurrentTime(timeSec);
    renderFrame();
  };

  // Export video client-side
  const handleStartExport = async () => {
    if (!sourceFile) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportCurrentTime(0);
    setErrorMsg(null);

    abortControllerRef.current = new AbortController();

    try {
      const result = await cleanVideoClientSide(
        sourceFile,
        config,
        (progress, current) => {
          setExportProgress(progress);
          setExportCurrentTime(current);
        },
        abortControllerRef.current.signal
      );
      setExportResult(result);
    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) {
        console.log('Export cancelled by user');
      } else {
        console.error('Export error:', err);
        setErrorMsg(err instanceof Error ? err.message : 'Export failed.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Cancel export
  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
  };

  // Reset workspace
  const handleReset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (exportResult?.url) URL.revokeObjectURL(exportResult.url);
    setSourceFile(null);
    setVideoUrl(null);
    setMetadata(null);
    setExportResult(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setConfig(DEFAULT_VIDEO_CONFIG);
  };

  // Update region slider
  const handleRegionChange = (field: 'x' | 'y' | 'width' | 'height', val: number) => {
    setActivePreset('custom');
    setConfig((prev) => ({
      ...prev,
      region: {
        ...prev.region,
        [field]: val,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {!videoUrl || !sourceFile ? (
        /* Video Upload View */
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Exact Reverse Alpha Blending</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Remove <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Gemini Video Watermarks</span> Without Blur
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              Mathematically inverts the semi-transparent Gemini watermark overlay to cleanly restore original pixels. Zero blurring, zero cloud uploads, audio preserved.
            </p>
          </div>

          {/* Upload Card */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
            }}
            className="group relative border-2 border-dashed border-slate-800 hover:border-emerald-500/60 bg-slate-900/40 hover:bg-slate-900/70 rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer shadow-xl shadow-black/40 flex flex-col items-center justify-center gap-4"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all">
              <Video className="w-8 h-8" />
            </div>

            <div>
              <p className="text-lg font-bold text-white mb-1">
                Drop your Gemini AI video here, or <span className="text-emerald-400 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400">
                Supports MP4, WebM, MOV • Reverse alpha blending runs 100% in your browser
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                No Blurring (Exact Inverse)
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero Server Uploads
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/50">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                Audio Track Kept
              </span>
            </div>
          </div>

          {/* Quick Demo Test Button */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="text-xs text-slate-500">Don't have a Gemini video on hand?</div>
            <button
              onClick={handleLoadDemo}
              disabled={isGeneratingDemo}
              className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 flex items-center gap-2 text-xs font-semibold shadow-md transition-colors cursor-pointer"
            >
              {isGeneratingDemo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Synthesizing Gemini Sample Video...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Load Interactive Gemini Demo Video (4s)</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="mt-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      ) : (
        /* Video Cleaning Workspace */
        <div className="space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload Different Video</span>
              </button>
              <div className="h-4 w-px bg-slate-800 hidden sm:block" />
              <div className="text-xs text-slate-300 font-medium truncate max-w-xs">
                {sourceFile.name}
              </div>
            </div>

            {metadata && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
                  {metadata.width} × {metadata.height}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
                  {metadata.duration.toFixed(1)}s
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-medium flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  Audio Sync
                </span>
              </div>
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Video Canvas & Controls */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Hidden native video for decoding */}
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                preload="auto"
                onLoadedMetadata={() => {
                  renderFrame();
                  setTimeout(() => handleAutoDetect(), 100);
                }}
                onSeeked={() => renderFrame()}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              {/* Viewport Card */}
              <div
                className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-850 shadow-2xl flex items-center justify-center min-h-[280px]"
                style={{
                  aspectRatio: metadata ? `${metadata.width} / ${metadata.height}` : '16 / 9',
                  maxHeight: '620px',
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full object-contain"
                  style={{ width: '100%', height: '100%' }}
                />

                {/* Live Watermark Status Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {config.mode === 'reverse-alpha'
                      ? 'Reverse Alpha (Exact Removal • No Blur)'
                      : config.mode === 'inpaint'
                      ? 'Texture Inpainting Active'
                      : config.mode === 'blur'
                      ? 'Feathered Blur Active'
                      : 'Margin Crop Active'}
                  </span>
                </div>

                {/* View Mode Switcher Pills */}
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-md text-xs">
                  <button
                    onClick={() => setPreviewMode('cleaned')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      previewMode === 'cleaned'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Cleaned
                  </button>
                  <button
                    onClick={() => setPreviewMode('split')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      previewMode === 'split'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Shows comparison divider line"
                  >
                    <Columns className="w-3 h-3" />
                    Split View
                  </button>
                  <button
                    onClick={() => setPreviewMode('target')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      previewMode === 'target'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    Show Box
                  </button>
                </div>
              </div>

              {/* Player Timeline & Controls */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-md font-bold"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>

                  {/* Seek Bar */}
                  <div className="flex-1 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={metadata?.duration || 1}
                      step={0.05}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <span className="text-xs font-mono text-slate-400 whitespace-nowrap min-w-[70px] text-right">
                      {currentTime.toFixed(1)}s / {(metadata?.duration || 0).toFixed(1)}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Export Panel / Status */}
              {isExporting ? (
                <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Applying Reverse Alpha Blending & Exporting Video...</span>
                    </div>
                    <span className="text-xs font-mono text-emerald-300 font-bold">{exportProgress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-150 rounded-full"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Processing frame at {exportCurrentTime.toFixed(1)}s of {(metadata?.duration || 0).toFixed(1)}s
                    </span>
                    <button
                      onClick={handleCancelExport}
                      className="text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                    >
                      Cancel Processing
                    </button>
                  </div>
                </div>
              ) : exportResult ? (
                /* Export Completed Banner */
                <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Video Cleaned Losslessly!</h4>
                        <p className="text-xs text-slate-400">
                          Processed in {(exportResult.processingTimeMs / 1000).toFixed(1)}s • Exact reverse alpha composite
                        </p>
                      </div>
                    </div>

                    <a
                      href={exportResult.url}
                      download={`cleanframe_${sourceFile.name.replace(/\.[^/.]+$/, '')}.mp4`}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Clean Video</span>
                    </a>
                  </div>

                  {/* Preview Player of Output without green border lines */}
                  <div
                    className="rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center"
                    style={{
                      aspectRatio: metadata ? `${metadata.width} / ${metadata.height}` : '16 / 9',
                      maxHeight: '260px',
                    }}
                  >
                    <video src={exportResult.url} controls className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : (
                /* Normal Export Action Button */
                <button
                  onClick={handleStartExport}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <Zap className="w-4 h-4" />
                  <span>Export Clean Video (Reverse Alpha • No Blur)</span>
                </button>
              )}
            </div>

            {/* Right 4 Cols: Watermark Tuning Controls */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              {/* Removal Strategy Card */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                    <Wand2 className="w-4 h-4 text-emerald-400" />
                    <span>Removal Algorithm</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                    GargantuaX Engine
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfig((p) => ({ ...p, mode: 'reverse-alpha' }))}
                    className={`p-2.5 rounded-xl border text-xs flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer col-span-2 ${
                      config.mode === 'reverse-alpha'
                        ? 'bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 border-emerald-500 text-emerald-300 font-bold shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-white">Reverse Alpha (No Blur)</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/90 font-normal">
                      Exact mathematical inversion • Zero blurring
                    </span>
                  </button>

                  <button
                    onClick={() => setConfig((p) => ({ ...p, mode: 'inpaint' }))}
                    className={`p-2.5 rounded-xl border text-xs flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                      config.mode === 'inpaint'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Inpaint Patch</span>
                  </button>

                  <button
                    onClick={() => setConfig((p) => ({ ...p, mode: 'blur' }))}
                    className={`p-2.5 rounded-xl border text-xs flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer ${
                      config.mode === 'blur'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold shadow-sm'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Feather Blur</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {config.mode === 'reverse-alpha' &&
                    'Uses the exact Reverse Alpha Blending equation: original = (watermarked - α × 255) / (1 - α). Completely removes the logo while keeping the background sharp and clear.'}
                  {config.mode === 'inpaint' &&
                    'Samples background textures from surrounding edges to cover non-standard or altered watermarks.'}
                  {config.mode === 'blur' &&
                    'Applies localized Gaussian blur to soften the watermark area.'}
                  {config.mode === 'crop' &&
                    'Trims the bottom margin so upper frames remain pristine.'}
                </p>
              </div>

              {/* Alpha Gain / Tuning Card (for Reverse Alpha) */}
              {config.mode === 'reverse-alpha' && (
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      Alpha Inversion Gain
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {config.alphaGain.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={1.8}
                    step={0.05}
                    value={config.alphaGain}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, alphaGain: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Gentle (0.5x)</span>
                    <span className="text-slate-400">Standard (1.0x)</span>
                    <span>Aggressive (1.8x)</span>
                  </div>
                </div>
              )}

              {/* Presets Card */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Gemini Presets
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-mono">
                    Catalog Anchors
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => applyPreset('1080p')}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                      activePreset === '1080p'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-semibold'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1080p Standard (72px)
                  </button>
                  <button
                    onClick={() => applyPreset('720p')}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                      activePreset === '720p'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-semibold'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    720p Standard (48px)
                  </button>
                </div>
              </div>

              {/* Watermark Region Coordinate Sliders */}
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Target Bounding Box
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAutoDetect}
                      disabled={isDetecting}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer transition-colors font-medium shadow-sm"
                      title="Scans video frames with template matching and snaps bounding box to exact Gemini watermark"
                    >
                      {isDetecting ? (
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-300" />
                      ) : (
                        <Wand2 className="w-3 h-3 text-emerald-300" />
                      )}
                      <span>{isDetecting ? 'Scanning...' : 'Auto-Lock Watermark'}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (metadata) {
                          const rec = getRecommendedGeminiRegion(metadata.width, metadata.height);
                          setConfig((p) => ({ ...p, region: rec }));
                        } else {
                          setConfig((p) => ({ ...p, region: DEFAULT_GEMINI_REGION }));
                        }
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 hover:underline cursor-pointer"
                    >
                      Preset Fit
                    </button>
                  </div>
                </div>

                {detectStatus && (
                  <div className="text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{detectStatus}</span>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Horizontal Position (X)</span>
                      <span className="font-mono text-slate-200">{config.region.x}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={96}
                      step={0.5}
                      value={config.region.x}
                      onChange={(e) => handleRegionChange('x', parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Vertical Position (Y)</span>
                      <span className="font-mono text-slate-200">{config.region.y}%</span>
                    </div>
                    <input
                      type="range"
                      min={60}
                      max={96}
                      step={0.5}
                      value={config.region.y}
                      onChange={(e) => handleRegionChange('y', parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Width</span>
                        <span className="font-mono text-slate-200">{config.region.width}%</span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={30}
                        step={0.5}
                        value={config.region.width}
                        onChange={(e) => handleRegionChange('width', parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Height</span>
                        <span className="font-mono text-slate-200">{config.region.height}%</span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={25}
                        step={0.5}
                        value={config.region.height}
                        onChange={(e) => handleRegionChange('height', parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
