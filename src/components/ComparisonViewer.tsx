import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Columns,
  SplitSquareVertical,
  ZoomIn,
  ZoomOut,
  Eye,
  Sparkles,
} from 'lucide-react';


interface ComparisonViewerProps {
  originalUrl: string;
  processedUrl: string | null;
  isProcessing: boolean;
  originalWidth: number;
  originalHeight: number;
  processedWidth?: number;
  processedHeight?: number;
}

type ViewMode = 'split' | 'side-by-side' | 'processed-only' | 'original-only';

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  originalUrl,
  processedUrl,
  isProcessing,
  originalWidth,
  originalHeight,
  processedWidth,
  processedHeight,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = 100%, 2 = 200%, etc.

  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  }, [isDragging]);

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Keyboard navigation for split slider (left/right arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'split') return;
      if (e.key === 'ArrowLeft') {
        setSliderPos((prev) => Math.max(0, prev - 5));
      } else if (e.key === 'ArrowRight') {
        setSliderPos((prev) => Math.min(100, prev + 5));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Viewer Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs">
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
              viewMode === 'split'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Interactive Split Slider"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split Slider</span>
          </button>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
              viewMode === 'side-by-side'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Side-by-Side Comparison"
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Side by Side</span>
          </button>
          <button
            onClick={() => setViewMode('processed-only')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
              viewMode === 'processed-only'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="View Cleaned Image Only"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Cleaned Only</span>
          </button>
          <button
            onClick={() => setViewMode('original-only')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer font-medium ${
              viewMode === 'original-only'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="View Original Raw Image Only"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Original</span>
          </button>
        </div>

        {/* Zoom & Inspect controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-slate-500 text-[11px] font-mono hidden md:inline">
            {originalWidth}×{originalHeight} px
            {processedWidth && processedHeight && (processedWidth !== originalWidth || processedHeight !== originalHeight) && (
              <span className="text-cyan-400 ml-1">
                → {processedWidth}×{processedHeight} px
              </span>
            )}
          </span>


          <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
              disabled={zoomLevel <= 1}
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-300 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
              disabled={zoomLevel >= 3}
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
              title="Zoom In (Inspect Micro-Grain)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel > 1 && (
              <button
                onClick={() => setZoomLevel(1)}
                className="p-1 text-emerald-400 hover:text-emerald-300 text-[10px] font-mono"
                title="Reset Zoom"
              >
                1x
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Display Area */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex items-center justify-center min-h-[380px] max-h-[620px] select-none group"
        style={{ touchAction: 'none' }}
      >
        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-30 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-emerald-300 animate-pulse">
              Re-quantizing Canvas & Erasing Metadata...
            </p>
          </div>
        )}

        {/* 1. Split Slider Mode */}
        {viewMode === 'split' && (
          <div
            className="relative w-full h-full flex items-center justify-center overflow-auto p-2"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* The Image Wrapper scaled by zoom */}
            <div
              className="relative inline-block max-w-full max-h-[580px] overflow-hidden transition-transform duration-100 ease-out"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            >
              {/* Underneath: Processed Image (Right Side) */}
              <img
                src={processedUrl || originalUrl}
                alt="CleanFrame Processed Output"
                className="block max-w-full max-h-[580px] object-contain select-none pointer-events-none"
                draggable={false}
              />

              {/* Labeled corner badges */}
              <div className="absolute bottom-3 right-3 z-10 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-medium backdrop-blur-md shadow-lg pointer-events-none">
                CLEANED & PERTURBED
              </div>

              {/* Overlaid: Original Image clipped to slider percentage (Left Side) */}
              <div
                className="absolute inset-0 overflow-hidden select-none pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <img
                  src={originalUrl}
                  alt="Original Image with Metadata"
                  className="block max-w-full max-h-[580px] object-contain select-none"
                  draggable={false}
                />
                <div className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded bg-slate-950/80 border border-slate-700/60 text-slate-300 text-[11px] font-mono font-medium backdrop-blur-md shadow-lg">
                  ORIGINAL (RAW AI EXPORT)
                </div>
              </div>

              {/* The Draggable Divider Bar */}
              <div
                className="absolute top-0 bottom-0 z-20 cursor-ew-resize select-none"
                style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
              >
                {/* Vertical glowing divider line */}
                <div className="w-0.5 h-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.9)]" />

                {/* Handle Icon */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.6)] group-hover:scale-110 transition-transform">
                  <SplitSquareVertical className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Side by Side Mode */}
        {viewMode === 'side-by-side' && (
          <div
            className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-3 p-3 overflow-auto max-h-[580px]"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          >
            {/* Original Card */}
            <div className="relative rounded-xl border border-slate-800 bg-slate-900/40 p-2 flex flex-col items-center justify-center">
              <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 border border-slate-700 text-slate-300 text-[10px] font-mono">
                ORIGINAL (HAS METADATA)
              </span>
              <img
                src={originalUrl}
                alt="Original AI export"
                className="max-h-[520px] max-w-full object-contain rounded"
              />
            </div>

            {/* Cleaned Card */}
            <div className="relative rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-2 flex flex-col items-center justify-center">
              <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono">
                CLEANED & PERTURBED
              </span>
              <img
                src={processedUrl || originalUrl}
                alt="Cleaned export"
                className="max-h-[520px] max-w-full object-contain rounded"
              />
            </div>
          </div>
        )}

        {/* 3. Processed Only Mode */}
        {viewMode === 'processed-only' && (
          <div
            className="w-full h-full flex items-center justify-center p-3 overflow-auto max-h-[580px]"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          >
            <div className="relative">
              <img
                src={processedUrl || originalUrl}
                alt="Processed output"
                className="max-h-[550px] max-w-full object-contain rounded-lg"
              />
              <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                VERIFIED CLEAN EXPORT
              </span>
            </div>
          </div>
        )}

        {/* 4. Original Only Mode */}
        {viewMode === 'original-only' && (
          <div
            className="w-full h-full flex items-center justify-center p-3 overflow-auto max-h-[580px]"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
          >
            <div className="relative">
              <img
                src={originalUrl}
                alt="Original raw"
                className="max-h-[550px] max-w-full object-contain rounded-lg"
              />
              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-slate-950/90 border border-slate-700 text-slate-300 text-xs font-mono">
                ORIGINAL RAW FILE
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Helper hint */}
      {viewMode === 'split' && (
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <span>Drag the green divider or use ← / → arrow keys to compare</span>
        </div>
      )}
    </div>
  );
};
