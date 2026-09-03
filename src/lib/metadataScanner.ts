/**
 * Client-Side Binary Metadata Scanner
 * Inspects image files (JPEG, PNG, WebP) for EXIF, XMP, IPTC, C2PA JUMBF manifests,
 * and AI generation tags in raw ArrayBuffers.
 */

export interface MetadataAuditResult {
  hasExif: boolean;
  hasXmp: boolean;
  hasC2pa: boolean;
  hasIptc: boolean;
  hasPngText: boolean;
  detectedSignatures: string[];
  totalChunksDetected: number;
  status: 'INFECTED_WITH_METADATA' | 'CLEAN_VERIFIED';
  details: {
    name: string;
    description: string;
    found: boolean;
    confidence: 'High' | 'None';
  }[];
}

export async function scanImageMetadata(blobOrBuffer: Blob | ArrayBuffer): Promise<MetadataAuditResult> {
  const buffer = blobOrBuffer instanceof Blob ? await blobOrBuffer.arrayBuffer() : blobOrBuffer;
  const bytes = new Uint8Array(buffer);

  let hasExif = false;
  let hasXmp = false;
  let hasC2pa = false;
  let hasIptc = false;
  let hasPngText = false;
  const detectedSignatures: string[] = [];

  // Convert first 200KB or entire file into latin-1 string for fast pattern searches
  const maxSearchLength = Math.min(bytes.length, 512 * 1024);
  let binaryString = '';
  // Efficient chunked string conversion
  const chunkSize = 8192;
  for (let i = 0; i < maxSearchLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, maxSearchLength));
    binaryString += String.fromCharCode.apply(null, Array.from(chunk));
  }

  // 1. Check EXIF
  // In JPEG: 0xFF, 0xE1 followed by 'Exif\0\0'
  if (binaryString.includes('Exif\0\0') || binaryString.includes('Exif')) {
    hasExif = true;
    detectedSignatures.push('EXIF Header (Camera/Device/Timestamp)');
  }

  // 2. Check XMP packets
  if (
    binaryString.includes('http://ns.adobe.com/xap/1.0/') ||
    binaryString.includes('<?xpacket') ||
    binaryString.includes('<x:xmpmeta') ||
    binaryString.includes('xmlns:xmp')
  ) {
    hasXmp = true;
    detectedSignatures.push('XMP Data Block (Extensible Metadata)');
  }

  // 3. Check C2PA / JUMBF (Coalition for Content Provenance and Authenticity)
  // C2PA manifests use 'c2pa', 'jumb', or urn:c2pa / urn:uuid
  if (
    binaryString.includes('c2pa') ||
    binaryString.includes('jumb') ||
    binaryString.includes('c2pa.claim') ||
    binaryString.includes('c2pa.signature') ||
    binaryString.includes('C2PA')
  ) {
    hasC2pa = true;
    detectedSignatures.push('C2PA Content Provenance Manifest');
  }

  // 4. Check IPTC / Photoshop 8BIM
  if (binaryString.includes('Photoshop 3.0') || binaryString.includes('8BIM')) {
    hasIptc = true;
    detectedSignatures.push('IPTC / Adobe 8BIM Markers');
  }

  // 5. Check PNG chunks (tEXt, zTXt, iTXt, eXIf)
  if (
    binaryString.includes('tEXt') ||
    binaryString.includes('iTXt') ||
    binaryString.includes('zTXt') ||
    binaryString.includes('eXIf')
  ) {
    hasPngText = true;
    detectedSignatures.push('PNG Text Metadata Chunks');
  }

  // 6. Check common GenAI generator prompt tags
  if (binaryString.includes('prompt') && (binaryString.includes('steps') || binaryString.includes('sampler'))) {
    detectedSignatures.push('Stable Diffusion / Automatic1111 Generation Parameters');
  }
  if (binaryString.includes('Midjourney') || binaryString.includes('mj_')) {
    detectedSignatures.push('Midjourney Export Tag');
  }
  if (binaryString.includes('DALL-E') || binaryString.includes('open_ai') || binaryString.includes('openai')) {
    detectedSignatures.push('OpenAI / DALL-E Marker');
  }
  if (binaryString.includes('ComfyUI') || binaryString.includes('workflow')) {
    detectedSignatures.push('ComfyUI Node Graph / Workflow embedded JSON');
  }

  const totalChunks = (hasExif ? 1 : 0) + (hasXmp ? 1 : 0) + (hasC2pa ? 1 : 0) + (hasIptc ? 1 : 0) + (hasPngText ? 1 : 0);

  const isClean = totalChunks === 0 && detectedSignatures.length === 0;

  return {
    hasExif,
    hasXmp,
    hasC2pa,
    hasIptc,
    hasPngText,
    detectedSignatures,
    totalChunksDetected: totalChunks + (detectedSignatures.length > totalChunks ? detectedSignatures.length - totalChunks : 0),
    status: isClean ? 'CLEAN_VERIFIED' : 'INFECTED_WITH_METADATA',
    details: [
      {
        name: 'C2PA / JUMBF Manifest',
        description: 'Cryptographic provenance and authenticity signature tracking AI generation origin.',
        found: hasC2pa,
        confidence: hasC2pa ? 'High' : 'None',
      },
      {
        name: 'EXIF / Device Tags',
        description: 'Camera properties, software markers, modification dates, and hardware identifiers.',
        found: hasExif,
        confidence: hasExif ? 'High' : 'None',
      },
      {
        name: 'XMP Data Packet',
        description: 'Adobe Extensible Metadata Platform schema embedding generation and editing history.',
        found: hasXmp,
        confidence: hasXmp ? 'High' : 'None',
      },
      {
        name: 'IPTC / 8BIM Resource',
        description: 'International Press Telecommunications Council digital rights and legacy headers.',
        found: hasIptc,
        confidence: hasIptc ? 'High' : 'None',
      },
      {
        name: 'PNG Text & Workflow Chunks',
        description: 'Embedded generator prompt strings, seed values, model checkpoints, and node workflows.',
        found: hasPngText,
        confidence: hasPngText ? 'High' : 'None',
      },
    ],
  };
}
