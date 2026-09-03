import { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { createSampleAiImage } from '../lib/sampleImages';

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
  isLoadingSample?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onImageSelected, isLoadingSample }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSampleInternal, setLoadingSampleInternal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste listener so users can copy any image from web or snipping tool and press Ctrl+V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          onImageSelected(file);
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImageSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelected(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelected(e.target.files[0]);
    }
  };

  const handleLoadSample = async () => {
    try {
      setLoadingSampleInternal(true);
      const sample = await createSampleAiImage();
      onImageSelected(sample.file);
    } catch (err) {
      console.error('Failed to generate sample image:', err);
    } finally {
      setLoadingSampleInternal(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Hero Headline */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
          <ShieldCheck className="w-4 h-4" />
          <span>Strip C2PA Credentials & Neutralize Latent Fingerprints</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3">
          Purge AI Watermarks & Metadata. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            100% In Your Browser.
          </span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Social platforms and detection bots crawl files for C2PA manifests, EXIF tags, and frequency patterns.
          CleanFrame scrubs metadata via Canvas re-encoding and applies micro-disturbances so your creations stay private.
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 transition-all duration-200 flex flex-col items-center justify-center text-center ${
          isDragging
            ? 'border-emerald-400 bg-emerald-950/20 scale-[1.01] shadow-[0_0_30px_rgba(16,185,129,0.25)]'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          className="hidden"
          onChange={handleFileInput}
        />

        {/* Upload Icon with Glowing Circle */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:border-emerald-400/60 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-slate-950 border border-slate-700 rounded-full p-1 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
        </div>

        {/* Text Instructions */}
        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-emerald-300 transition-colors">
          Click or drop your image here
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mb-4">
          Drag & drop any file, browse your files, or press <kbd className="px-1.5 py-0.5 text-xs bg-slate-800 text-slate-300 rounded border border-slate-700 font-mono">Ctrl+V</kbd> to paste
        </p>

        {/* Format Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono font-medium">
            PNG
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono font-medium">
            JPEG / JPG
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono font-medium">
            WEBP
          </span>
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
            Zero Size Limit (Local)
          </span>
        </div>
      </div>

      {/* Quick Action Sample Image Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/30 border border-slate-800/60 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <ImageIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Don't have an AI image handy? Test CleanFrame with an embedded C2PA test asset:</span>
        </div>
        <button
          onClick={handleLoadSample}
          disabled={isLoadingSample || loadingSampleInternal}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-all duration-150 font-medium whitespace-nowrap cursor-pointer hover:border-emerald-500/50 disabled:opacity-50"
        >
          {loadingSampleInternal ? (
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          )}
          <span>Load Sample AI Image (with C2PA)</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
