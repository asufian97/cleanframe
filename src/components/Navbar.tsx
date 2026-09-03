import { Shield, Lock, Cpu, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenPrivacyInfo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPrivacyInfo }) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-blue-500/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <Shield className="w-5 h-5" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-sans">
                Clean<span className="text-emerald-400">Frame</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold tracking-wider">
                v1.0 Local
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI Metadata (C2PA / EXIF) Eraser & Latent Watermark Disruptor
            </p>
          </div>
        </div>

        {/* Security & Client-Side Badges */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">100% Client-Side</span>
            <span className="sm:hidden">Client-Only</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 text-xs">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>0 Bytes Uploaded</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 text-xs">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>HTML5 Canvas Sandbox</span>
          </div>

          {onOpenPrivacyInfo && (
            <button
              onClick={onOpenPrivacyInfo}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
              title="Privacy & Architecture Details"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
