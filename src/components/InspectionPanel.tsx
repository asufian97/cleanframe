import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  Binary,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import type { MetadataAuditResult } from '../lib/metadataScanner';


interface InspectionPanelProps {
  originalAudit: MetadataAuditResult | null;
  processedAudit: MetadataAuditResult | null;
  originalSizeBytes: number;
  processedSizeBytes?: number;
  processingTimeMs?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const InspectionPanel: React.FC<InspectionPanelProps> = ({
  originalAudit,
  processedAudit,
  originalSizeBytes,
  processedSizeBytes,
  processingTimeMs,
}) => {
  if (!originalAudit) return null;

  const sizeDiff = processedSizeBytes ? processedSizeBytes - originalSizeBytes : 0;
  const sizePercentage = processedSizeBytes
    ? Math.round((processedSizeBytes / originalSizeBytes) * 100)
    : 100;

  return (
    <div className="w-full bg-slate-900/50 border border-slate-800/90 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Binary className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">
            Cryptographic & Metadata Inspection Audit
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {processedAudit?.status === 'CLEAN_VERIFIED' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Export Status: 100% Scrubbed</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Scanning Export...</span>
            </span>
          )}
        </div>
      </div>

      {/* File Size & Telemetry Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1">Source File Size</div>
          <div className="text-sm font-semibold font-mono text-slate-200">
            {formatBytes(originalSizeBytes)}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1">Clean Export Size</div>
          <div className="text-sm font-semibold font-mono text-emerald-400">
            {processedSizeBytes ? formatBytes(processedSizeBytes) : 'Calculating...'}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1">Size Delta</div>
          <div className="text-sm font-semibold font-mono text-slate-300">
            {sizeDiff < 0 ? (
              <span className="text-emerald-400">{sizeDiff < 0 ? '-' : ''}{formatBytes(Math.abs(sizeDiff))} ({sizePercentage}%)</span>
            ) : sizeDiff > 0 ? (
              <span className="text-cyan-400">+{formatBytes(sizeDiff)} ({sizePercentage}%)</span>
            ) : (
              '0 B'
            )}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1">Processing Time</div>
          <div className="text-sm font-semibold font-mono text-cyan-400">
            {processingTimeMs !== undefined ? `${processingTimeMs} ms` : '—'}
          </div>
        </div>
      </div>

      {/* Detected Signatures / Warnings in Original Image */}
      {originalAudit.detectedSignatures.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Signatures Detected in Original Upload ({originalAudit.detectedSignatures.length}):</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-300">
            {originalAudit.detectedSignatures.map((sig, idx) => (
              <li key={idx} className="flex items-center gap-2 bg-slate-950/50 px-2.5 py-1 rounded border border-slate-800/80 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="truncate">{sig}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Side-by-Side Metadata Chunk Verification Table */}
      <div className="border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-950/80 px-4 py-2.5 text-[11px] font-mono font-semibold text-slate-400 border-b border-slate-800">
          <div className="col-span-6 sm:col-span-6">METADATA VECTOR</div>
          <div className="col-span-3 sm:col-span-3 text-center">ORIGINAL SOURCE</div>
          <div className="col-span-3 sm:col-span-3 text-center">CLEANFRAME EXPORT</div>
        </div>

        <div className="divide-y divide-slate-800/60 bg-slate-950/30 text-xs">
          {originalAudit.details.map((item, idx) => {
            const processedDetail = processedAudit?.details.find((d) => d.name === item.name);
            const isCleanInProcessed = processedDetail ? !processedDetail.found : true;

            return (
              <div
                key={idx}
                className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-900/30 transition-colors"
              >
                {/* Name & Description */}
                <div className="col-span-6 sm:col-span-6 pr-2">
                  <div className="font-medium text-slate-200">{item.name}</div>
                  <div className="text-[11px] text-slate-400 leading-tight hidden sm:block">
                    {item.description}
                  </div>
                </div>

                {/* Original state */}
                <div className="col-span-3 sm:col-span-3 flex items-center justify-center">
                  {item.found ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-medium">
                      <XCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Embedded</span>
                      <span className="sm:hidden">Yes</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40">
                      Not Present
                    </span>
                  )}
                </div>

                {/* Processed state */}
                <div className="col-span-3 sm:col-span-3 flex items-center justify-center">
                  {isCleanInProcessed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Scrubbed (0 B)</span>
                      <span className="sm:hidden">Clean</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      Residual
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Assurance Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Canvas rasterization breaks byte-level cryptographic integrity. C2PA cert chains are permanently severed.
          </span>
        </div>
        <span className="font-mono text-[10px] text-emerald-400 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/20 whitespace-nowrap">
          Deterministic Cleansing
        </span>
      </div>
    </div>
  );
};
