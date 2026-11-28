function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Serialize an SVG element to a standalone XML string with exact viewBox dimensions */
export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  const vb = svg.viewBox?.baseVal;
  const w = vb && vb.width > 0 ? vb.width : 840;
  const h = vb && vb.height > 0 ? vb.height : 560;
  if (!clone.getAttribute('width')) clone.setAttribute('width', String(w));
  if (!clone.getAttribute('height')) clone.setAttribute('height', String(h));
  clone.style.background = 'transparent';
  const serializer = new XMLSerializer();
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(clone)}`;
}

/** Download crisp publication vector SVG */
export function exportSvgFile(svg: SVGSVGElement | null, baseName: string): void {
  if (!svg) return;
  const xml = serializeSvg(svg);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  triggerBlobDownload(blob, `${baseName}.svg`);
}

/**
 * Download true vector PDF via lazy-loaded jsPDF + svg2pdf.js.
 * Dynamic import keeps initial page load fast (~400 kB smaller first paint).
 */
export async function exportVectorPdfFile(svg: SVGSVGElement | null, baseName: string): Promise<void> {
  if (!svg) return;
  const [{ jsPDF }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);
  const vb = svg.viewBox.baseVal;
  const width = vb && vb.width > 0 ? vb.width : 840;
  const height = vb && vb.height > 0 ? vb.height : 560;

  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [width, height],
  });

  await (pdf as unknown as {
    svg: (el: Element, opts: { x: number; y: number; width: number; height: number }) => Promise<unknown>;
  }).svg(svg, { x: 0, y: 0, width, height });

  pdf.save(`${baseName}.pdf`);
}

async function renderSvgToCanvas(
  svg: SVGSVGElement,
  dpi: number,
  maxScale = 6
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const scale = Math.min(maxScale, Math.max(2, dpi / 100));
  const xml = serializeSvg(svg);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (err) => reject(err);
    img.src = url;
  });

  const vb = svg.viewBox.baseVal;
  const w = vb && vb.width > 0 ? vb.width : 840;
  const h = vb && vb.height > 0 ? vb.height : 560;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
  }
  URL.revokeObjectURL(url);
  return { canvas, width: canvas.width, height: canvas.height };
}

/** Download high-DPI raster PNG (300 / 600 / 1200 DPI) with full alpha transparency */
export async function exportPngFile(svg: SVGSVGElement | null, baseName: string, dpi = 300): Promise<void> {
  if (!svg) return;
  const { canvas } = await renderSvgToCanvas(svg, dpi, 6);
  canvas.toBlob((pngBlob) => {
    if (pngBlob) triggerBlobDownload(pngBlob, `${baseName}_${dpi}dpi.png`);
  }, 'image/png');
}

/**
 * Pure TypeScript Baseline 32-bit RGBA TIFF encoder with embedded print DPI tags
 * (XResolution / YResolution / ResolutionUnit=inches). Compatible with PLOS, eLife,
 * JBC, ACS, Adobe Photoshop/Illustrator, macOS Preview, and ImageJ/FIJI.
 */
export function encodeRgbaToTiff(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  dpi = 600
): Uint8Array {
  const numEntries = 13;
  const headerSize = 8;
  const ifdOffset = headerSize;
  const ifdSize = 2 + numEntries * 12 + 4;
  // Extra data block: BitsPerSample (4 x uint16 = 8B) + XRes (8B) + YRes (8B)
  const bitsPerSampleOffset = ifdOffset + ifdSize;
  const xResOffset = bitsPerSampleOffset + 8;
  const yResOffset = xResOffset + 8;
  const pixelDataOffset = yResOffset + 8;
  const pixelByteLength = width * height * 4;
  const totalBytes = pixelDataOffset + pixelByteLength;

  const buffer = new ArrayBuffer(totalBytes);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Little-endian TIFF header ("II", 42, offset to IFD0)
  view.setUint8(0, 0x49);
  view.setUint8(1, 0x49);
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);

  let pos = ifdOffset;
  view.setUint16(pos, numEntries, true);
  pos += 2;

  const writeEntry = (tag: number, type: number, count: number, valueOrOffset: number) => {
    view.setUint16(pos, tag, true);
    view.setUint16(pos + 2, type, true);
    view.setUint32(pos + 4, count, true);
    if (type === 3 && count === 1) {
      view.setUint16(pos + 8, valueOrOffset, true);
      view.setUint16(pos + 10, 0, true);
    } else {
      view.setUint32(pos + 8, valueOrOffset, true);
    }
    pos += 12;
  };

  // Tags MUST be in strictly ascending numerical order per TIFF 6.0 spec
  writeEntry(256, 4, 1, width); // ImageWidth (LONG)
  writeEntry(257, 4, 1, height); // ImageLength (LONG)
  writeEntry(258, 3, 4, bitsPerSampleOffset); // BitsPerSample (4x SHORT: 8,8,8,8)
  writeEntry(259, 3, 1, 1); // Compression = 1 (Uncompressed, universally supported)
  writeEntry(262, 3, 1, 2); // PhotometricInterpretation = 2 (RGB)
  writeEntry(273, 4, 1, pixelDataOffset); // StripOffsets
  writeEntry(277, 3, 1, 4); // SamplesPerPixel = 4 (RGBA)
  writeEntry(278, 4, 1, height); // RowsPerStrip
  writeEntry(279, 4, 1, pixelByteLength); // StripByteCounts
  writeEntry(282, 5, 1, xResOffset); // XResolution (RATIONAL)
  writeEntry(283, 5, 1, yResOffset); // YResolution (RATIONAL)
  writeEntry(296, 3, 1, 2); // ResolutionUnit = 2 (Inches)
  writeEntry(338, 3, 1, 2); // ExtraSamples = 2 (Unassociated alpha)

  // Next IFD offset = 0 (single-page TIFF)
  view.setUint32(pos, 0, true);

  // BitsPerSample values: [8, 8, 8, 8]
  view.setUint16(bitsPerSampleOffset, 8, true);
  view.setUint16(bitsPerSampleOffset + 2, 8, true);
  view.setUint16(bitsPerSampleOffset + 4, 8, true);
  view.setUint16(bitsPerSampleOffset + 6, 8, true);

  // XResolution & YResolution rationals (dpi / 1)
  view.setUint32(xResOffset, Math.round(dpi), true);
  view.setUint32(xResOffset + 4, 1, true);
  view.setUint32(yResOffset, Math.round(dpi), true);
  view.setUint32(yResOffset + 4, 1, true);

  // Copy RGBA pixel payload
  bytes.set(rgba.subarray(0, pixelByteLength), pixelDataOffset);
  return bytes;
}

/** Download journal-grade 300/600 DPI RGBA TIFF with embedded print resolution metadata */
export async function exportTiffFile(svg: SVGSVGElement | null, baseName: string, dpi = 600): Promise<void> {
  if (!svg) return;
  // Cap raster scale at 4x (~3360x2240 px, ~30 MB uncompressed) to stay instant in browser memory
  const { canvas, width, height } = await renderSvgToCanvas(svg, dpi, 4);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imgData = ctx.getImageData(0, 0, width, height);
  const tiffBytes = encodeRgbaToTiff(imgData.data, width, height, dpi);
  const blob = new Blob([tiffBytes.buffer as ArrayBuffer], { type: 'image/tiff' });
  triggerBlobDownload(blob, `${baseName}_${dpi}dpi.tiff`);
}

/** Download plain-text source code or JSON recipes (.R, .py, .sh, .json, .csv) */
export function exportTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerBlobDownload(blob, filename);
}
