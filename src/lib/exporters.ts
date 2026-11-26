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

/** Serialize an SVG element to a standalone XML string */
export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  if (!clone.getAttribute('width')) clone.setAttribute('width', '840');
  if (!clone.getAttribute('height')) clone.setAttribute('height', '560');
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

/** Download high-DPI raster PNG (300 / 600 / 1200 DPI) for slides & manuscripts */
export async function exportPngFile(svg: SVGSVGElement | null, baseName: string, dpi = 300): Promise<void> {
  if (!svg) return;
  const scale = Math.min(6, Math.max(2, dpi / 100));
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
    canvas.toBlob((pngBlob) => {
      if (pngBlob) triggerBlobDownload(pngBlob, `${baseName}_${dpi}dpi.png`);
    }, 'image/png');
  }
  URL.revokeObjectURL(url);
}

/** Download plain-text source code or JSON recipes (.R, .py, .sh, .json, .csv) */
export function exportTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  triggerBlobDownload(blob, filename);
}
