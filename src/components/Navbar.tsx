import React from 'react';
import { Shield, Lock, Sparkles, Image as ImageIcon, Film } from 'lucide-react';

interface NavbarProps {
  activeTab: 'image' | 'video';
  onTabChange: (tab: 'image' | 'video') => void;
  onOpenPrivacyInfo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenPrivacyInfo,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
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
                v2.0 Media
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI Metadata & Gemini Video Watermark Disruptor
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
          <button
            onClick={() => onTabChange('image')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'image'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Image Cleaner</span>
          </button>

          <button
            onClick={() => onTabChange('video')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'video'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-cyan-400" />
            <span className="flex items-center gap-1.5">
              <span>Video Watermark</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold uppercase">
                Gemini
              </span>
            </span>
          </button>
        </div>

        {/* Security & Client-Side Badges */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden md:inline">100% Client-Side</span>
            <span className="md:hidden">Local</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 text-xs">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>0 Bytes Uploaded</span>
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
