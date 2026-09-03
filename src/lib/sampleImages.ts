/**
 * Sample Image Generator for Quick Testing
 * Creates a canvas image with simulated AI prompts, EXIF markers, and C2PA metadata text
 */

export async function createSampleAiImage(): Promise<{ file: File; name: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create sample canvas');

  // Draw vibrant cyber/AI futuristic artwork
  const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(0.3, '#1e1b4b');
  gradient.addColorStop(0.6, '#31104b');
  gradient.addColorStop(0.85, '#0c4a6e');
  gradient.addColorStop(1, '#064e3b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  // Geometric abstract shapes resembling AI generation
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.arc(512, 512, 100 + i * 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Glowing core
  const radial = ctx.createRadialGradient(512, 512, 10, 512, 512, 250);
  radial.addColorStop(0, '#38bdf8');
  radial.addColorStop(0.5, '#a855f7');
  radial.addColorStop(1, 'transparent');
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(512, 512, 250, 0, Math.PI * 2);
  ctx.fill();

  // Subtle grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1024; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y < 1024; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Visual text on canvas
  ctx.font = '600 32px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('SYNTHETIC AI ARTIFACT', 512, 480);
  ctx.font = '400 18px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('C2PA Manifest & Prompt Metadata Attached', 512, 530);

  // Export to JPEG blob
  const rawBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
  });

  // Inject simulated AI metadata (EXIF APP1 segment with C2PA and prompt strings)
  const arrayBuffer = await rawBlob.arrayBuffer();
  const sourceBytes = new Uint8Array(arrayBuffer);

  // Create an artificial EXIF / XMP / C2PA segment
  const simulatedMetadata =
    'Exif\0\0MM\0*<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">' +
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
    '<rdf:Description xmlns:c2pa="urn:c2pa:manifest" xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    '<c2pa:claim>urn:uuid:9f4e223d-c2pa-ai-export</c2pa:claim>' +
    '<dc:description>prompt: highly detailed futuristic digital avatar, synthid watermark embedded, steps: 50, sampler: Euler a</dc:description>' +
    '<c2pa:signature>valid_cryptographic_manifest_signature_block</c2pa:signature>' +
    '</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>';

  const metadataBytes = new TextEncoder().encode(simulatedMetadata);

  // In JPEG, APP1 is 0xFF, 0xE1, length (2 bytes), then data
  const app1Length = metadataBytes.length + 2;
  const app1Header = new Uint8Array([0xff, 0xe1, (app1Length >> 8) & 0xff, app1Length & 0xff]);

  // Merge after SOI (first 2 bytes: 0xFF, 0xD8)
  const combined = new Uint8Array(2 + app1Header.length + metadataBytes.length + (sourceBytes.length - 2));
  combined.set(sourceBytes.subarray(0, 2), 0);
  combined.set(app1Header, 2);
  combined.set(metadataBytes, 2 + app1Header.length);
  combined.set(sourceBytes.subarray(2), 2 + app1Header.length + metadataBytes.length);

  const finalBlob = new Blob([combined], { type: 'image/jpeg' });
  const file = new File([finalBlob], 'sample_ai_gen_c2pa.jpg', { type: 'image/jpeg' });

  return {
    file,
    name: 'sample_ai_gen_c2pa.jpg',
  };
}
