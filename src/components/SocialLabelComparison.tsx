import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ThumbsUp,
  MessageCircle,
  Share2,
  Globe,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';


interface SocialLabelComparisonProps {
  customImage?: string;
  brandName?: string;
}

export const SocialLabelComparison: React.FC<SocialLabelComparisonProps> = ({
  customImage,
  brandName = 'PawKoda',
}) => {
  const [activeTab, setActiveTab] = useState<'before' | 'after' | 'side-by-side'>('side-by-side');

  // Default demonstration image (adventure harness product matching the real-world scenario)
  const previewImage =
    customImage ||
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Real-World Impact: Social Platform AI Badging</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
          How CleanFrame Prevents the Automatic{' '}
          <span className="text-rose-400">"AI content"</span> Label
        </h3>
        <p className="text-slate-400 text-xs sm:text-sm">
          Meta (Facebook & Instagram), TikTok, and LinkedIn scan uploaded files for C2PA manifests.
          When detected, they automatically stamp your post with public AI warning labels that lower engagement and trust.
        </p>
      </div>

      {/* Tab Switcher for mobile / compact screens */}
      <div className="flex items-center justify-center gap-1 mb-6 sm:hidden bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('before')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'before'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400'
          }`}
        >
          Raw AI (With Label)
        </button>
        <button
          onClick={() => setActiveTab('after')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'after'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400'
          }`}
        >
          CleanFrame (No Label)
        </button>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Card 1: Raw AI Export (BEFORE) */}
        {(activeTab === 'before' || activeTab === 'side-by-side') && (
          <div className="flex flex-col rounded-2xl border-2 border-rose-500/40 bg-slate-950/80 overflow-hidden shadow-[0_0_25px_rgba(244,63,94,0.15)] relative">
            {/* Status Pill */}
            <div className="bg-rose-950/80 border-b border-rose-500/30 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                <XCircle className="w-4 h-4 text-rose-400" />
                <span>Raw AI Export (C2PA Detected)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                FLAGGED
              </span>
            </div>

            {/* Simulated Social Post */}
            <div className="p-4 bg-white text-slate-900 flex-1 flex flex-col justify-between">
              {/* Post Header */}
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    PK
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 leading-tight">
                      {brandName}
                    </div>
                    {/* The dreaded AI content label */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5 font-medium">
                      <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded text-[11px] border border-slate-300 shadow-xs">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        AI content
                      </span>
                      <span>·</span>
                      <span className="text-slate-500 text-[11px]">4d</span>
                      <span>·</span>
                      <Globe className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Post Caption */}
                <p className="text-xs text-slate-700 mb-3 leading-relaxed">
                  Meet the {brandName} Premium Adventure Gear. Built with breathable comfort, reflective safety strips, and secure fit for every outdoor adventure. 🐕✨
                </p>
              </div>

              {/* Post Media */}
              <div className="relative rounded-lg overflow-hidden bg-slate-100 mb-3 aspect-square flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Simulated Social Post"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/75 backdrop-blur-md text-rose-300 text-[10px] font-mono border border-rose-500/40">
                  C2PA Manifest Active
                </div>
              </div>

              {/* Social Actions */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-around text-slate-500 text-xs font-semibold">
                <button className="flex items-center gap-1.5 hover:text-blue-600">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Like</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600">
                  <MessageCircle className="w-4 h-4" />
                  <span>Comment</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Impact Explanation */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-rose-300">Penalized:</strong> Platform algorithm detected metadata tags. Warning banner is placed publicly, depressing click-through rate.
              </span>
            </div>
          </div>
        )}

        {/* Card 2: After CleanFrame (AFTER) */}
        {(activeTab === 'after' || activeTab === 'side-by-side') && (
          <div className="flex flex-col rounded-2xl border-2 border-emerald-500/40 bg-slate-950/80 overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.15)] relative">
            {/* Status Pill */}
            <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Processed by CleanFrame</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                100% CLEAN
              </span>
            </div>

            {/* Simulated Social Post */}
            <div className="p-4 bg-white text-slate-900 flex-1 flex flex-col justify-between">
              {/* Post Header */}
              <div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                    PK
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 leading-tight">
                      {brandName}
                    </div>
                    {/* Clean Subtitle - NO AI LABEL */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <span className="text-[11px]">4d</span>
                      <span>·</span>
                      <Globe className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Post Caption */}
                <p className="text-xs text-slate-700 mb-3 leading-relaxed">
                  Meet the {brandName} Premium Adventure Gear. Built with breathable comfort, reflective safety strips, and secure fit for every outdoor adventure. 🐕✨
                </p>
              </div>

              {/* Post Media */}
              <div className="relative rounded-lg overflow-hidden bg-slate-100 mb-3 aspect-square flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Simulated Social Post"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 px-2 py-1 rounded bg-emerald-950/85 backdrop-blur-md text-emerald-300 text-[10px] font-mono border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Metadata Scrubbed</span>
                </div>
              </div>

              {/* Social Actions */}
              <div className="border-t border-slate-200 pt-2 flex items-center justify-around text-slate-500 text-xs font-semibold">
                <button className="flex items-center gap-1.5 hover:text-blue-600">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Like</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600">
                  <MessageCircle className="w-4 h-4" />
                  <span>Comment</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Impact Explanation */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-emerald-300">Protected:</strong> C2PA manifest eradicated via canvas re-encoding + pixel perturbation. Post displays as authentic organic content.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3-Step Process Infographic */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-rose-400 font-semibold font-mono text-[11px]">
            <span>01</span>
            <span>AI Generators Stamp Manifests</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            DALL-E, Midjourney, and Photoshop inject cryptographic C2PA JUMBF boxes into the image binary.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono text-[11px]">
            <span>02</span>
            <span>Platforms Scan & Flag</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Facebook, Instagram, and TikTok crawlers parse header segments and automatically attach the public "AI content" tag.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-500/30 bg-emerald-950/10 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono text-[11px]">
            <span>03</span>
            <span>CleanFrame Eradication</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Canvas re-encoding discards binary manifest blocks, while micro-grain disrupts latent frequency watermarks.
          </p>
        </div>
      </div>
    </div>
  );
};
