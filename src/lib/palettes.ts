import type {
  ColorPaletteSpec,
  ColormapId,
  ColormapSpec,
  FontFamilyChoice,
  JournalPreset,
  JournalPresetId,
  PaletteId,
  PublicationStyleSettings,
  ResolvedPlotTheme,
} from '../types/biograce';

/* ============================================================================
 * Publication Font Stacks (ported from gmxgrace/styles.py)
 * ========================================================================== */

export const FONT_FAMILIES: Record<FontFamilyChoice, { label: string; css: string; rFamily: string }> = {
  'sans-serif': {
    label: 'Sans-Serif (Helvetica / Arial)',
    css: '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", -apple-system, sans-serif',
    rFamily: 'Helvetica',
  },
  serif: {
    label: 'Serif (Times New Roman / Georgia)',
    css: '"Times New Roman", Georgia, "DejaVu Serif", Times, serif',
    rFamily: 'Times',
  },
  monospace: {
    label: 'Monospace (SF Mono / DejaVu)',
    css: '"SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace',
    rFamily: 'mono',
  },
};

/* ============================================================================
 * 7 Scientific Journal Presets (full gmxgrace parity + Cell Press)
 * ========================================================================== */

export const JOURNAL_PRESETS: Record<JournalPresetId, JournalPreset> = {
  nature: {
    id: 'nature',
    name: 'Nature Portfolio',
    shortName: 'Nature',
    description: 'Nature / Nature Methods / Nature Comm (89 / 183 mm, sans-serif, outward ticks, open top/right)',
    widthsMm: { single: 89.0, one_half: 120.0, double: 183.0 },
    fontFamily: 'sans-serif',
    fontSize: 7.5,
    titleSize: 8.5,
    labelSize: 8.0,
    tickSize: 7.0,
    legendSize: 7.0,
    lineWidth: 1.15,
    axesLinewidth: 0.75,
    tickDirection: 'out',
    topRightSpines: false,
    tickTopRight: false,
    defaultPalette: 'nature-npg',
    defaultPanelLabels: 'lowercase',
  },
  science: {
    id: 'science',
    name: 'Science (AAAS)',
    shortName: 'Science',
    description: 'Science / Science Advances (75 / 120 / 175 mm, crisp sans-serif, outward ticks)',
    widthsMm: { single: 75.0, one_half: 120.0, double: 175.0 },
    fontFamily: 'sans-serif',
    fontSize: 7.5,
    titleSize: 8.5,
    labelSize: 8.0,
    tickSize: 7.0,
    legendSize: 6.8,
    lineWidth: 1.1,
    axesLinewidth: 0.75,
    tickDirection: 'out',
    topRightSpines: false,
    tickTopRight: false,
    defaultPalette: 'okabe-ito',
    defaultPanelLabels: 'uppercase',
  },
  cell: {
    id: 'cell',
    name: 'Cell Press',
    shortName: 'Cell Press',
    description: 'Cell / Molecular Cell / Immunity (85 / 114 / 174 mm, clean open frame, outward ticks)',
    widthsMm: { single: 85.0, one_half: 114.0, double: 174.0 },
    fontFamily: 'sans-serif',
    fontSize: 8.0,
    titleSize: 9.0,
    labelSize: 8.5,
    tickSize: 7.5,
    legendSize: 7.5,
    lineWidth: 1.2,
    axesLinewidth: 0.85,
    tickDirection: 'out',
    topRightSpines: false,
    tickTopRight: false,
    defaultPalette: 'nature-npg',
    defaultPanelLabels: 'uppercase',
  },
  acs: {
    id: 'acs',
    name: 'ACS (JCTC / JACS / JCIM)',
    shortName: 'ACS',
    description: 'American Chemical Society (84.6 / 177.8 mm, 4-spine boxed frame, inward ticks)',
    widthsMm: { single: 84.6, one_half: 130.0, double: 177.8 },
    fontFamily: 'sans-serif',
    fontSize: 8.0,
    titleSize: 9.0,
    labelSize: 8.5,
    tickSize: 7.5,
    legendSize: 7.5,
    lineWidth: 1.25,
    axesLinewidth: 0.85,
    tickDirection: 'in',
    topRightSpines: true,
    tickTopRight: true,
    defaultPalette: 'acs-classic',
    defaultPanelLabels: 'parens_lower',
  },
  biophysj: {
    id: 'biophysj',
    name: 'Biophysical Journal',
    shortName: 'Biophys. J.',
    description: 'Biophysical Journal / Cell Press (85 / 178 mm, 4-spine frame, inward ticks, high contrast)',
    widthsMm: { single: 85.0, one_half: 128.0, double: 178.0 },
    fontFamily: 'sans-serif',
    fontSize: 8.0,
    titleSize: 9.0,
    labelSize: 8.5,
    tickSize: 7.5,
    legendSize: 7.5,
    lineWidth: 1.3,
    axesLinewidth: 0.9,
    tickDirection: 'in',
    topRightSpines: true,
    tickTopRight: true,
    defaultPalette: 'okabe-ito',
    defaultPanelLabels: 'uppercase',
  },
  pnas: {
    id: 'pnas',
    name: 'PNAS',
    shortName: 'PNAS',
    description: 'Proceedings of the National Academy of Sciences (87 / 114 / 178 mm, clean open frame)',
    widthsMm: { single: 87.0, one_half: 114.0, double: 178.0 },
    fontFamily: 'sans-serif',
    fontSize: 8.0,
    titleSize: 9.0,
    labelSize: 8.5,
    tickSize: 7.5,
    legendSize: 7.5,
    lineWidth: 1.2,
    axesLinewidth: 0.8,
    tickDirection: 'out',
    topRightSpines: false,
    tickTopRight: false,
    defaultPalette: 'tol-bright',
    defaultPanelLabels: 'uppercase',
  },
};

export const JOURNAL_PRESET_LIST = Object.values(JOURNAL_PRESETS);

/* ============================================================================
 * All 7 Colorblind-Safe & Publication Palettes (exact gmxgrace hex codes)
 * ========================================================================== */

export const PALETTES: Record<PaletteId, ColorPaletteSpec> = {
  'okabe-ito': {
    id: 'okabe-ito',
    name: 'Okabe–Ito',
    subtitle: 'Universal colorblind-safe gold standard',
    colors: ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#000000', '#F0E442'],
    upColor: '#D55E00',
    downColor: '#0072B2',
    nsColor: '#BFC4CC',
    accentColor: '#009E73',
  },
  'nature-npg': {
    id: 'nature-npg',
    name: 'Nature (NPG)',
    subtitle: 'Cobalt, vermilion & emerald editorial palette',
    colors: ['#3C5488', '#E64B35', '#00A087', '#4DBBD5', '#F39B7F', '#8491B4', '#91D1C2', '#DC0000'],
    upColor: '#E64B35',
    downColor: '#3C5488',
    nsColor: '#B8BEC8',
    accentColor: '#00A087',
  },
  'acs-classic': {
    id: 'acs-classic',
    name: 'ACS Classic',
    subtitle: 'Deep navy, crimson, forest & amber',
    colors: ['#1B4F72', '#C0392B', '#1E8449', '#D68910', '#6C3483', '#2E86C1', '#7F8C8D', '#117A65'],
    upColor: '#C0392B',
    downColor: '#1B4F72',
    nsColor: '#BFC5CC',
    accentColor: '#1E8449',
  },
  'tol-bright': {
    id: 'tol-bright',
    name: 'Paul Tol Bright',
    subtitle: 'High-clarity CVD-safe scientific hues',
    colors: ['#4477AA', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB', '#000000'],
    upColor: '#EE6677',
    downColor: '#4477AA',
    nsColor: '#C4C8D0',
    accentColor: '#228833',
  },
  'tol-muted': {
    id: 'tol-muted',
    name: 'Paul Tol Muted',
    subtitle: 'Low-glare palette for dense multi-group figures',
    colors: ['#332288', '#88CCEE', '#44AA99', '#117733', '#999933', '#DDCC77', '#CC6677', '#882255', '#AA4499'],
    upColor: '#CC6677',
    downColor: '#332288',
    nsColor: '#C8CCD4',
    accentColor: '#44AA99',
  },
  'viridis-discrete': {
    id: 'viridis-discrete',
    name: 'Viridis Discrete',
    subtitle: 'Perceptually uniform & greyscale-safe luminance',
    colors: ['#440154', '#3B528B', '#21918C', '#5EC962', '#D6B717', '#FDE725'],
    upColor: '#21918C',
    downColor: '#440154',
    nsColor: '#C5C8CE',
    accentColor: '#3B528B',
  },
  'grayscale-pub': {
    id: 'grayscale-pub',
    name: 'Grayscale Pub',
    subtitle: 'Print-ready monochrome journal tones',
    colors: ['#111111', '#555555', '#888888', '#222222', '#666666', '#AAAAAA'],
    upColor: '#111111',
    downColor: '#555555',
    nsColor: '#CBD5E1',
    accentColor: '#333333',
  },
};

export const PALETTE_LIST = Object.values(PALETTES);

/* ============================================================================
 * All 12 Sequential & Diverging Colormaps (exact gmxgrace SEQUENTIAL_CMAPS)
 * ========================================================================== */

export const COLORMAPS: Record<ColormapId, ColormapSpec> = {
  RdYlBu_r: {
    id: 'RdYlBu_r',
    name: 'RdYlBu_r',
    stops: ['#313695', '#4575B4', '#ABD9E9', '#FFFFBF', '#FDAE61', '#D73027', '#A50026'],
  },
  viridis: {
    id: 'viridis',
    name: 'Viridis',
    stops: ['#440154', '#3B528B', '#21918C', '#5EC962', '#FDE725'],
  },
  plasma: {
    id: 'plasma',
    name: 'Plasma',
    stops: ['#0D0887', '#6A00A8', '#B12A90', '#E16462', '#FCA636', '#F0F921'],
  },
  inferno: {
    id: 'inferno',
    name: 'Inferno',
    stops: ['#000004', '#420A68', '#932667', '#DD513A', '#FCA50A', '#FCFFA4'],
  },
  magma: {
    id: 'magma',
    name: 'Magma',
    stops: ['#000004', '#3B0F70', '#8C2981', '#DE4968', '#FE9F6D', '#FCFDBF'],
  },
  cividis: {
    id: 'cividis',
    name: 'Cividis',
    stops: ['#00224E', '#35456C', '#666970', '#968F6F', '#CBBA69', '#FEE838'],
  },
  coolwarm: {
    id: 'coolwarm',
    name: 'Coolwarm',
    stops: ['#3B4CC0', '#7092F3', '#C0D4F5', '#F2CAB5', '#EE8468', '#B40426'],
  },
  Spectral_r: {
    id: 'Spectral_r',
    name: 'Spectral_r',
    stops: ['#5E4FA2', '#3288BD', '#66C2A5', '#E6F598', '#FEE08B', '#F46D43', '#9E0142'],
  },
  turbo: {
    id: 'turbo',
    name: 'Turbo',
    stops: ['#30123B', '#4662D7', '#1AE4B6', '#A2FC3C', '#FABA39', '#E4460A', '#7A0403'],
  },
  Blues: {
    id: 'Blues',
    name: 'Blues',
    stops: ['#F7FBFF', '#C6DBEF', '#6BAED6', '#2171B5', '#08306B'],
  },
  YlGnBu: {
    id: 'YlGnBu',
    name: 'YlGnBu',
    stops: ['#FFFFD9', '#C7E9B4', '#41B6C4', '#225EA8', '#081D58'],
  },
  cubehelix_r: {
    id: 'cubehelix_r',
    name: 'Cubehelix_r',
    stops: ['#FFFFFF', '#D8C7E2', '#9D88B8', '#5B6284', '#284550', '#16271C', '#000000'],
  },
};

export const COLORMAP_LIST = Object.values(COLORMAPS);

/* ============================================================================
 * Theme Resolver & Color Ramp Interpolation
 * ========================================================================== */

export function resolvePlotTheme(settings: PublicationStyleSettings): ResolvedPlotTheme {
  const journal = JOURNAL_PRESETS[settings.preset] ?? JOURNAL_PRESETS.nature;
  const palette = PALETTES[settings.palette] ?? PALETTES[journal.defaultPalette];
  const colormap = COLORMAPS[settings.colormap] ?? COLORMAPS.viridis;
  const fontFamilyKey = settings.fontFamily || journal.fontFamily;
  const fontScale = settings.fontSizePt > 0 ? settings.fontSizePt / 8.0 : 1.0;

  return {
    journal,
    palette,
    colormap,
    fontFamilyCss: FONT_FAMILIES[fontFamilyKey].css,
    fontFamilyKey,
    fontScale,
    lineWidth: settings.lineWidth > 0 ? settings.lineWidth : journal.lineWidth,
    axesLinewidth: journal.axesLinewidth * 1.35, // Crisp SVG stroke mapping
    tickDirection: journal.tickDirection,
    topRightSpines: journal.topRightSpines,
    tickTopRight: journal.tickTopRight,
    transparentBg: settings.transparentBg,
    widthMm: journal.widthsMm[settings.columnWidth] ?? journal.widthsMm.double,
    dpi: settings.dpi,
  };
}

/** Interpolate a 0..1 normalized value across a sequential color ramp */
export function sampleRamp(ramp: string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (ramp.length - 1);
  const idx = Math.min(ramp.length - 2, Math.floor(scaled));
  const localT = scaled - idx;
  return lerpHex(ramp[idx], ramp[idx + 1], localT);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
