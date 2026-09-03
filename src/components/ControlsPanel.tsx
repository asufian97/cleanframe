import {
  Sliders,
  Sparkles,
  Crop,
  SunMedium,
  Contrast,
  FileCheck,
  Palette,
  RotateCw,
  Feather,
} from 'lucide-react';
import type { DisturbanceConfig } from '../lib/imageProcessor';
import { PRESETS } from '../lib/imageProcessor';


interface ControlsPanelProps {
  config: DisturbanceConfig;
  onChange: (newConfig: DisturbanceConfig) => void;
  activePresetKey: string;
  onSelectPreset: (key: string) => void;
  isProcessing?: boolean;
}

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  config,
  onChange,
  activePresetKey,
  onSelectPreset,
}) => {

  const updateField = <K extends keyof DisturbanceConfig>(
    key: K,
    val: DisturbanceConfig[K]
  ) => {
    onChange({
      ...config,
      [key]: val,
    });
  };

  return (
    <div className="w-full bg-slate-900/50 border border-slate-800/90 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col gap-6">
      {/* Header & Preset Switcher */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              Pixel Disturbance Engine
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Anti-SynthID Active
          </span>
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {Object.entries(PRESETS).map(([key, preset]) => {
            const isSelected = activePresetKey === key;
            return (
              <button
                key={key}
                onClick={() => onSelectPreset(key)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-semibold text-xs ${
                      isSelected ? 'text-emerald-300' : 'text-slate-200'
                    }`}
                  >
                    {preset.name}
                  </span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Granular Adjustment Sliders */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Fine-Tune Disturbance Sliders
          </span>
          {activePresetKey === 'custom' && (
            <span className="text-[10px] text-cyan-400 font-mono">
              (Custom Mode)
            </span>
          )}
        </div>

        {/* 1. Micro-Grain / Noise */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Micro-Grain / Noise</span>
            </div>
            <span className="font-mono text-emerald-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
              {config.noiseLevel.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={config.noiseLevel}
            onChange={(e) => updateField('noiseLevel', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Injects subtle Box-Muller Gaussian noise to mask latent AI frequency patterns without blurring details.
          </p>
        </div>

        {/* 2. Micro-Contrast */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Contrast className="w-3.5 h-3.5 text-cyan-400" />
              <span>Micro-Contrast Shift</span>
            </div>
            <span className="font-mono text-cyan-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
              {config.contrast > 0 ? `+${config.contrast.toFixed(1)}%` : `${config.contrast.toFixed(1)}%`}
            </span>
          </div>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.1}
            value={config.contrast}
            onChange={(e) => updateField('contrast', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Slightly expands or compresses dynamic curves to offset high-frequency watermark vectors.
          </p>
        </div>

        {/* 3. Micro-Brightness */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <SunMedium className="w-3.5 h-3.5 text-amber-400" />
              <span>Micro-Brightness Jitter</span>
            </div>
            <span className="font-mono text-amber-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
              {config.brightness > 0 ? `+${config.brightness.toFixed(1)}%` : `${config.brightness.toFixed(1)}%`}
            </span>
          </div>
          <input
            type="range"
            min={-5}
            max={5}
            step={0.1}
            value={config.brightness}
            onChange={(e) => updateField('brightness', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* 4. Micro-Crop / Border Shave */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Crop className="w-3.5 h-3.5 text-indigo-400" />
              <span>Micro-Crop (Border Shave)</span>
            </div>
            <span className="font-mono text-indigo-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
              {config.cropPixels} px / side
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4].map((px) => (
              <button
                key={px}
                onClick={() => updateField('cropPixels', px)}
                className={`py-1 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                  config.cropPixels === px
                    ? 'border-indigo-500/60 bg-indigo-950/40 text-indigo-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {px === 0 ? '0 (Off)' : `${px}px`}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            Shaves 1-4 outer pixels to alter spatial coordinate alignment and break grid-aligned fingerprint detectors.
          </p>
        </div>

        {/* 5. Chrominance (Cb/Cr) Channel Dither */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Palette className="w-3.5 h-3.5 text-pink-400" />
              <span>Chrominance (Cb/Cr) Dither</span>
            </div>
            <span className="font-mono text-pink-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
              {config.chrominanceDither.toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={config.chrominanceDither}
            onChange={(e) => updateField('chrominanceDither', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Disrupts color sub-bands where SynthID and latent neural models hide watermarks without luminance loss.
          </p>
        </div>

        {/* 6. Sub-Pixel Spatial Jitter */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <RotateCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Spatial Grid Jitter</span>
            </div>
            <span className="font-mono text-purple-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
              {config.spatialJitter > 0 ? `${config.spatialJitter.toFixed(2)}°` : 'Off (0°)'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={0.10}
            step={0.01}
            value={config.spatialJitter}
            onChange={(e) => updateField('spatialJitter', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Applies sub-pixel angular rotation with bilinear resampling, invalidating lattice-based coordinate decoders.
          </p>
        </div>

        {/* 7. Edge-Preserving Micro-Sharpen */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Feather className="w-3.5 h-3.5 text-teal-400" />
              <span>Edge-Preserving Micro-Sharpen</span>
            </div>
            <span className="font-mono text-teal-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
              {config.unsharpMask > 0 ? `${config.unsharpMask.toFixed(1)}x` : 'Off'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2.0}
            step={0.1}
            value={config.unsharpMask}
            onChange={(e) => updateField('unsharpMask', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-[11px] text-slate-500">
            Restores crisp edge acuity with an unsharp mask pass to offset blur while removing steganography.
          </p>
        </div>
      </div>


      {/* Output Format & Re-Quantization */}
      <div className="pt-4 border-t border-slate-800/80 space-y-4">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Export Format & Re-Quantization
        </span>

        {/* Format selector */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'image/jpeg', label: 'JPEG (Recommended)', desc: 'Best re-quantization' },
              { id: 'image/png', label: 'PNG', desc: 'Lossless' },
              { id: 'image/webp', label: 'WebP', desc: 'High compression' },
            ] as const
          ).map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => updateField('outputFormat', fmt.id)}
              className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                config.outputFormat === fmt.id
                  ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-semibold">{fmt.label}</div>
              <div className="text-[10px] text-slate-500">{fmt.desc}</div>
            </button>
          ))}
        </div>

        {/* Quality Slider (when JPEG or WebP) */}
        {config.outputFormat !== 'image/png' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quantization Factor (Quality)</span>
              </div>
              <span className="font-mono text-emerald-400 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                {Math.round(config.quality * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.0}
              step={0.01}
              value={config.quality}
              onChange={(e) => updateField('quality', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              DCT compression re-quantizes high frequencies where subtle steganographic watermarks reside.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
