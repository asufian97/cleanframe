# CleanFrame 🛡️

> **100% Client-Side AI Metadata & Watermark Stripper**  
> Strip C2PA manifests, EXIF, IPTC, and XMP metadata, and perturb latent watermarks (e.g., SynthID) right in your browser with zero server uploads.

![CleanFrame Shield](https://img.shields.io/badge/Privacy-100%25%20Client--Side-emerald?style=for-the-badge&logo=shield)
![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38bdf8?style=for-the-badge&logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-Bundler-646cff?style=for-the-badge&logo=vite)

---

## ✨ Features

- **100% Client-Side Sandbox:** No images are ever uploaded to any backend or cloud service. All processing happens in local browser memory via HTML5 Canvas.
- **C2PA & Metadata Eraser:** Renders source images to an off-screen HTML5 Canvas and exports fresh blobs, severing cryptographic verification blocks and discarding EXIF, IPTC, XMP, and JUMBF manifests.
- **Pixel Disturbance Engine (Anti-Watermark / SynthID Disruption):**
  - **Micro-Grain / Noise:** Subtle Box-Muller Gaussian noise injection (0.0% to 5.0%) across RGB channels to disrupt high-frequency steganographic correlations.
  - **Micro-Contrast & Brightness:** Gentle sub-percent adjustments (-5% to +5%) to shift tonal curves.
  - **Micro-Crop / Border Shave:** Shaves 1–4 border pixels to disrupt spatial grid-coordinate alignment.
  - **Re-Quantization Quality:** Controlled JPEG/WebP quantization slider (80% to 100%) to flush latent frequency residuals.
- **Interactive UI & Split-Slider:**
  - Draggable split-slider before/after viewer with keyboard arrow navigation (`←`/`→`).
  - Side-by-side mode and zoom inspection up to 300% to inspect pixel-level grain.
  - Drag-and-drop upload zone, clipboard paste (<kbd>Ctrl+V</kbd>), and built-in AI test asset loader.
- **Binary Metadata Audit Panel:**
  - Real-time side-by-side binary inspection verifying the complete eradication of C2PA, EXIF, XMP, and prompt tags.
  - File size delta & compression telemetry.
- **Sanitized One-Click Export:** Download clean assets with safe filenames (`cleanframe_export_[timestamp].[ext]`) or copy straight to clipboard.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm or yarn / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/asufian97/cleanframe.git
cd cleanframe

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🛡️ Technical & Privacy Architecture

1. **Deterministic Canvas Re-encoding:**  
   Image decoders parse binary files into raw RGBA pixel arrays. When drawn to an off-screen `<canvas>` and exported via `canvas.toBlob()`, all existing container chunks (`c2pa`, `jumb`, `Exif`, `tEXt`, `iTXt`, `xmpmeta`) are discarded.
2. **Box-Muller Gaussian Disruption:**  
   Latent watermarks (such as SynthID) embed imperceptible frequency patterns. By perturbing pixel distributions with low-variance Gaussian noise and gentle DCT re-quantization, the spatial and frequency correlations required by watermark decoders are broken while preserving perceptual visual quality.

---

## 📄 License

MIT License. Free for personal and commercial privacy preservation.

