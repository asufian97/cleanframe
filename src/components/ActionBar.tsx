import { useState } from 'react';
import { Download, Copy, Check, RotateCcw, ShieldCheck } from 'lucide-react';
import { generateSanitizedFilename, triggerFileDownload } from '../lib/imageProcessor';


interface ActionBarProps {
  processedBlob: Blob | null;
  outputFormat: string;
  onReset: () => void;
  isProcessing: boolean;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  processedBlob,
  outputFormat,
  onReset,
  isProcessing,
}) => {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    if (!processedBlob) return;
    const filename = generateSanitizedFilename(outputFormat);
    triggerFileDownload(processedBlob, filename);
  };

  const handleCopyToClipboard = async () => {
    if (!processedBlob) return;
    try {
      // Browsers usually only support image/png in ClipboardItem
      if (processedBlob.type === 'image/png') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': processedBlob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Convert blob to png for clipboard
        const img = new Image();
        const url = URL.createObjectURL(processedBlob);
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(async (pngBlob) => {
              if (pngBlob) {
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': pngBlob }),
                ]);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
              URL.revokeObjectURL(url);
            }, 'image/png');
          }
        };
        img.src = url;
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const sanitizedPreviewName = generateSanitizedFilename(outputFormat);

  return (
    <div className="w-full bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-[0_0_25px_rgba(16,185,129,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* File status & sanitized naming notice */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">Sanitized Asset Ready</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Safe Export
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 truncate max-w-[280px] sm:max-w-md">
            {sanitizedPreviewName}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        {/* Reset / New Image */}
        <button
          onClick={onReset}
          className="px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Process another image"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">New Image</span>
        </button>

        {/* Copy to Clipboard */}
        <button
          onClick={handleCopyToClipboard}
          disabled={!processedBlob || isProcessing}
          className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-400" />
              <span>Copy</span>
            </>
          )}
        </button>

        {/* Main Download Button */}
        <button
          onClick={handleDownload}
          disabled={!processedBlob || isProcessing}
          className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-slate-950 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          <span>Download Clean Image</span>
        </button>
      </div>
    </div>
  );
};
