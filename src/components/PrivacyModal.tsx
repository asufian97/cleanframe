import { X, ShieldCheck, Lock, Cpu, Layers } from 'lucide-react';


interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">CleanFrame Privacy Architecture</h3>
            <p className="text-xs text-slate-400">Technical documentation of client-side processing & metadata neutralization</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 pr-1 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <Lock className="w-4 h-4" />
              <span>100% In-Browser Execution (Zero Server Traffic)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              CleanFrame does not make a single network request for your images. All parsing, canvas rendering, pixel transformations, and re-encodings occur strictly inside your browser's V8 Javascript runtime and HTML5 Canvas API sandbox.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
              <Layers className="w-4 h-4" />
              <span>C2PA & Manifest Eradication</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              C2PA (Content Credentials) relies on cryptographic JUMBF boxes and digital certificates inserted into image file headers. When CleanFrame draws the image into an off-screen HTML5 Canvas and exports fresh pixel buffers via <code className="text-cyan-300 font-mono">canvas.toBlob()</code>, the original binary wrapper is permanently discarded. The resulting file contains 0 manifest bytes, severing cryptographic verification.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
              <Cpu className="w-4 h-4" />
              <span>Latent Watermark / SynthID Perturbation</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Algorithmic watermarks (like DeepMind SynthID or invisible frequency imperceptible marks) modulate pixel frequencies in subtle statistical distributions. CleanFrame provides 4 perturbation vectors:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
              <li><strong className="text-slate-200">Micro-Grain (0.1–5%):</strong> Injects Gaussian noise breaking high-frequency statistical correlations.</li>
              <li><strong className="text-slate-200">Micro-Contrast & Luminance:</strong> Shifts tonal response curves to dislodge latent feature boundaries.</li>
              <li><strong className="text-slate-200">Border Shave (1–2px crop):</strong> Alters spatial pixel grid coordinate indexing.</li>
              <li><strong className="text-slate-200">DCT Re-quantization:</strong> Re-encodes Discrete Cosine Transform matrices, flushing fragile watermark residuals.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
          >
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
};
