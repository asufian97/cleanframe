import { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { UploadZone } from './components/UploadZone';
import { ComparisonViewer } from './components/ComparisonViewer';
import { ControlsPanel } from './components/ControlsPanel';
import { InspectionPanel } from './components/InspectionPanel';
import { ActionBar } from './components/ActionBar';
import { PrivacyModal } from './components/PrivacyModal';
import type { MetadataAuditResult } from './lib/metadataScanner';
import { scanImageMetadata } from './lib/metadataScanner';
import type {
  DisturbanceConfig,
  ProcessedImageResult,
} from './lib/imageProcessor';
import { PRESETS, processImageClientSide } from './lib/imageProcessor';
import { Shield, ArrowLeft, FileText } from 'lucide-react';


export function App() {
  // Image state
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);

  // Disturbance configuration & presets
  const [activePresetKey, setActivePresetKey] = useState<string>('deep');
  const [config, setConfig] = useState<DisturbanceConfig>(PRESETS.deep.config);

  // Processing state & results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedResult, setProcessedResult] = useState<ProcessedImageResult | null>(null);

  // Metadata audit results
  const [originalAudit, setOriginalAudit] = useState<MetadataAuditResult | null>(null);
  const [processedAudit, setProcessedAudit] = useState<MetadataAuditResult | null>(null);

  // Privacy modal
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  // Handle image selection
  const handleImageSelected = async (file: File) => {
    setSourceFile(file);
    const url = URL.createObjectURL(file);
    setOriginalImageUrl(url);

    // Create Image element for canvas operations
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageElement(img);
    };
    img.src = url;

    // Scan original file for metadata
    try {
      const audit = await scanImageMetadata(file);
      setOriginalAudit(audit);
    } catch (err) {
      console.error('Error scanning metadata:', err);
    }
  };

  // Re-process image when imageElement or config changes
  const debounceTimerRef = useRef<number | null>(null);

  const triggerProcessing = useCallback(
    async (img: HTMLImageElement, currentConfig: DisturbanceConfig, fileSizeBytes: number) => {
      setIsProcessing(true);
      try {
        const result = await processImageClientSide(img, fileSizeBytes, currentConfig);
        setProcessedResult(result);

        // Audit the clean output
        const audit = await scanImageMetadata(result.blob);
        setProcessedAudit(audit);
      } catch (err) {
        console.error('Failed to process image:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!imageElement || !sourceFile) return;

    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      triggerProcessing(imageElement, config, sourceFile.size);
    }, 120);

    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [imageElement, config, sourceFile, triggerProcessing]);


  // Preset switching
  const handleSelectPreset = (key: string) => {
    setActivePresetKey(key);
    if (PRESETS[key]) {
      setConfig(PRESETS[key].config);
    }
  };

  // Slider change (switches preset to custom if different)
  const handleConfigChange = (newConfig: DisturbanceConfig) => {
    setConfig(newConfig);
    // Check if it matches any existing preset
    let matchedKey = 'custom';
    for (const [k, p] of Object.entries(PRESETS)) {
      if (
        p.config.noiseLevel === newConfig.noiseLevel &&
        p.config.contrast === newConfig.contrast &&
        p.config.brightness === newConfig.brightness &&
        p.config.cropPixels === newConfig.cropPixels &&
        p.config.chrominanceDither === newConfig.chrominanceDither &&
        Math.abs(p.config.spatialJitter - newConfig.spatialJitter) < 0.001 &&
        Math.abs(p.config.unsharpMask - newConfig.unsharpMask) < 0.01 &&
        p.config.outputFormat === newConfig.outputFormat &&
        Math.abs(p.config.quality - newConfig.quality) < 0.001
      ) {
        matchedKey = k;
        break;
      }
    }
    setActivePresetKey(matchedKey);

  };

  // Reset workspace
  const handleReset = () => {
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    if (processedResult?.objectUrl) URL.revokeObjectURL(processedResult.objectUrl);
    setSourceFile(null);
    setOriginalImageUrl(null);
    setImageElement(null);
    setProcessedResult(null);
    setOriginalAudit(null);
    setProcessedAudit(null);
    setActivePresetKey('deep');
    setConfig(PRESETS.deep.config);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar onOpenPrivacyInfo={() => setIsPrivacyModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!sourceFile || !originalImageUrl ? (
          /* Upload view */
          <UploadZone onImageSelected={handleImageSelected} />
        ) : (
          /* Processing workspace */
          <div className="space-y-6">
            {/* Top Workspace Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Choose Another Image</span>
                </button>
                <div className="h-4 w-px bg-slate-800 hidden sm:block" />
                <div className="text-xs text-slate-300 truncate max-w-[200px] sm:max-w-xs font-medium">
                  {sourceFile.name}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                <button
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>How CleanFrame Protects You</span>
                </button>
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Live Preview & Inspection */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                {/* Comparison Viewer with interactive split-slider & zoom */}
                <ComparisonViewer
                  originalUrl={originalImageUrl}
                  processedUrl={processedResult?.objectUrl || null}
                  isProcessing={isProcessing}
                  originalWidth={imageElement?.naturalWidth || 0}
                  originalHeight={imageElement?.naturalHeight || 0}
                  processedWidth={processedResult?.width}
                  processedHeight={processedResult?.height}
                />

                {/* Primary Action Bar */}
                <ActionBar
                  processedBlob={processedResult?.blob || null}
                  outputFormat={config.outputFormat}
                  onReset={handleReset}
                  isProcessing={isProcessing}
                />

                {/* Cryptographic & Metadata Inspection Panel */}
                <InspectionPanel
                  originalAudit={originalAudit}
                  processedAudit={processedAudit}
                  originalSizeBytes={sourceFile.size}
                  processedSizeBytes={processedResult?.sizeBytes}
                  processingTimeMs={processedResult?.processingTimeMs}
                />
              </div>

              {/* Right Column: Controls Panel & Presets */}
              <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 sticky top-20">
                <ControlsPanel
                  config={config}
                  onChange={handleConfigChange}
                  activePresetKey={activePresetKey}
                  onSelectPreset={handleSelectPreset}
                  isProcessing={isProcessing}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-400">CleanFrame</span>
            <span>— Zero Cloud Telemetry. HTML5 Canvas Memory Sandbox.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Stripping C2PA, EXIF, IPTC & XMP</span>
            <span>•</span>
            <span>Box-Muller Gaussian Perturbation</span>
          </div>
        </div>
      </footer>

      {/* Privacy Architecture Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
}

export default App;
