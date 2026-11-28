import type { PublicationStyleSettings } from '../types/biograce';
import { JOURNAL_PRESETS, PALETTES } from './palettes';

export type CvdSimulationMode =
  | 'none'
  | 'deuteranopia'
  | 'protanopia'
  | 'tritanopia'
  | 'grayscale';

export interface CvdModeMeta {
  id: CvdSimulationMode;
  label: string;
  shortLabel: string;
  description: string;
  /** 4x5 SVG feColorMatrix values (Viénot / Brettel 1999 & ITU-R BT.709 luminance) */
  matrix: string;
}

export const CVD_MODES: CvdModeMeta[] = [
  {
    id: 'none',
    label: 'Normal Vision',
    shortLabel: 'Normal',
    description: 'Full trichromatic color rendering.',
    matrix: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0',
  },
  {
    id: 'deuteranopia',
    label: 'Deuteranopia (Red-Green)',
    shortLabel: 'Deuteranopia',
    description: 'Most common CVD (~6% of men): green-cone deficiency.',
    matrix: '0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0',
  },
  {
    id: 'protanopia',
    label: 'Protanopia (Red-Blind)',
    shortLabel: 'Protanopia',
    description: 'Red-cone deficiency (~2% of men): reds darken and shift toward olive.',
    matrix: '0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0',
  },
  {
    id: 'tritanopia',
    label: 'Tritanopia (Blue-Yellow)',
    shortLabel: 'Tritanopia',
    description: 'Rare blue-cone deficiency: blues shift teal, yellows shift pink.',
    matrix: '1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0',
  },
  {
    id: 'grayscale',
    label: 'B&W Print Proof',
    shortLabel: 'B&W Print',
    description: 'Perceptual luminance grayscale to check photocopy & print contrast.',
    matrix: '0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0',
  },
];

export interface PreflightCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface PreflightReport {
  journalName: string;
  targetWidthMm: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  checks: PreflightCheck[];
}

const STRICT_CVD_SAFE_PALETTES = new Set([
  'okabe-ito',
  'tol-bright',
  'tol-muted',
  'viridis-discrete',
  'grayscale-pub',
]);

/**
 * Audit the active figure settings (and optionally live SVG DOM text boxes)
 * against Nature/Science/Cell/ACS/PNAS manuscript submission rules.
 */
export function runPreflightAudit(
  style: PublicationStyleSettings,
  darkMode: boolean,
  svgEl?: SVGSVGElement | null
): PreflightReport {
  const journal = JOURNAL_PRESETS[style.preset];
  const palette = PALETTES[style.palette];
  const targetWidthMm = journal.widthsMm[style.columnWidth];
  const checks: PreflightCheck[] = [];

  // 1. Font legibility at physical journal column width
  const minFontPt = style.preset === 'nature' || style.preset === 'science' ? 5.5 : 6.0;
  if (style.fontSizePt >= minFontPt) {
    checks.push({
      id: 'font-size',
      label: 'Typography Legibility',
      status: 'pass',
      detail: `${style.fontSizePt} pt ${style.fontFamily} meets ${journal.shortName} minimum (≥ ${minFontPt} pt at ${targetWidthMm} mm).`,
    });
  } else {
    checks.push({
      id: 'font-size',
      label: 'Typography Too Small',
      status: 'fail',
      detail: `${style.fontSizePt} pt may become illegible when scaled to ${targetWidthMm} mm (recommend ≥ ${minFontPt} pt).`,
    });
  }

  // 2. Stroke weight check (>= 0.5 pt for clean print reproduction)
  if (style.lineWidth >= 0.5 && style.lineWidth <= 2.5) {
    checks.push({
      id: 'stroke',
      label: 'Line & Axis Stroke Weight',
      status: 'pass',
      detail: `${style.lineWidth.toFixed(2)} pt stroke prints cleanly without hairline dropout.`,
    });
  } else {
    checks.push({
      id: 'stroke',
      label: 'Stroke Weight Out of Range',
      status: 'warn',
      detail: `${style.lineWidth.toFixed(2)} pt is ${style.lineWidth < 0.5 ? 'below 0.5 pt print floor' : 'heavy for journal line art'}.`,
    });
  }

  // 3. Export DPI resolution
  if (style.dpi >= 600) {
    checks.push({
      id: 'dpi',
      label: 'Print Resolution',
      status: 'pass',
      detail: `${style.dpi} DPI raster PNG/TIFF + crisp vector SVG/PDF ready for press.`,
    });
  } else if (style.dpi >= 300) {
    checks.push({
      id: 'dpi',
      label: 'Print Resolution',
      status: 'pass',
      detail: `${style.dpi} DPI meets photographic/halftone spec (use 600 DPI or SVG/PDF for fine line art).`,
    });
  } else {
    checks.push({
      id: 'dpi',
      label: 'Low Export DPI',
      status: 'fail',
      detail: `${style.dpi} DPI is below the 300 DPI journal minimum.`,
    });
  }

  // 4. Print background check
  if (style.paperExport || style.transparentBg || !darkMode) {
    checks.push({
      id: 'background',
      label: 'Manuscript Canvas Contrast',
      status: 'pass',
      detail: style.transparentBg
        ? 'Transparent background enabled (RGBA alpha = 0 for slides & composite figures).'
        : 'High-contrast white publication canvas active.',
    });
  } else {
    checks.push({
      id: 'background',
      label: 'Dark Canvas Active for Export',
      status: 'warn',
      detail: 'Dark screen background is active; enable "Print-Ready White Canvas" or "Transparent Background" before manuscript export.',
    });
  }

  // 5. Colorblind accessibility
  if (STRICT_CVD_SAFE_PALETTES.has(style.palette)) {
    checks.push({
      id: 'cvd',
      label: 'Colorblind Accessibility',
      status: 'pass',
      detail: `${palette.name} is verified distinguishable under Deuteranopia & Protanopia.`,
    });
  } else {
    checks.push({
      id: 'cvd',
      label: 'Check Colorblind Contrast',
      status: 'warn',
      detail: `${palette.name} is journal-styled; preview with the Deuteranopia simulator or switch to Okabe–Ito / Paul Tol.`,
    });
  }

  // 6. Optional live SVG text-box overlap detection
  if (svgEl && typeof svgEl.querySelectorAll === 'function') {
    const texts = Array.from(svgEl.querySelectorAll('text'));
    const boxes: DOMRect[] = [];
    for (const t of texts) {
      try {
        const b = t.getBoundingClientRect();
        if (b.width > 2 && b.height > 2) boxes.push(b);
      } catch {
        // Ignore non-rendered elements
      }
    }
    let overlaps = 0;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const pad = 1.5;
        const hit =
          a.left + pad < b.right &&
          a.right - pad > b.left &&
          a.top + pad < b.bottom &&
          a.bottom - pad > b.top;
        if (hit) overlaps++;
      }
    }
    if (overlaps === 0) {
      checks.push({
        id: 'overlaps',
        label: 'Text & Label Collisions',
        status: 'pass',
        detail: `${boxes.length} text labels checked — zero bounding-box collisions detected.`,
      });
    } else {
      checks.push({
        id: 'overlaps',
        label: 'Minor Label Overlap Detected',
        status: 'warn',
        detail: `${overlaps} text pair${overlaps > 1 ? 's' : ''} touch slightly. Drag gene/cluster labels or reduce font size slightly.`,
      });
    }
  }

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  return {
    journalName: journal.name,
    targetWidthMm,
    passCount,
    warnCount,
    failCount,
    checks,
  };
}
