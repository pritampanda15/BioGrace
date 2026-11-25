import type { JournalPreset, JournalPresetId } from '../types/biograce';

export const JOURNAL_PRESETS: Record<JournalPresetId, JournalPreset> = {
  nature: {
    id: 'nature',
    name: 'Nature (NPG)',
    subtitle: 'Clean vermilion & cobalt, sans-serif Helvetica/SF',
    colorblindSafe: true,
    fontFamily: '"Helvetica Neue", -apple-system, Arial, sans-serif',
    upColor: '#E64B35',
    downColor: '#3C5488',
    nsColor: '#B8BEC8',
    accentColor: '#00A087',
    categorical: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4'],
    sequential: ['#F2F6FA', '#C5DBEE', '#7AB1DC', '#3C7FB8', '#1F4E8C'],
    diverging: ['#3C5488', '#F7F7F7', '#E64B35'],
    axisWidth: 1.15,
    gridOpacity: 0.16,
  },
  cell: {
    id: 'cell',
    name: 'Cell Press',
    subtitle: 'Editorial teal & crimson with crisp proportions',
    colorblindSafe: true,
    fontFamily: '"Helvetica Neue", Arial, sans-serif',
    upColor: '#C43C39',
    downColor: '#1F78B4',
    nsColor: '#C2C7D0',
    accentColor: '#2CA02C',
    categorical: ['#1F78B4', '#C43C39', '#33A02C', '#FF7F00', '#6A3D9A', '#A6CEE3'],
    sequential: ['#F4F9F9', '#B9E1DC', '#68B9B2', '#268383', '#0D5056'],
    diverging: ['#1F78B4', '#F8F9FA', '#C43C39'],
    axisWidth: 1.25,
    gridOpacity: 0.14,
  },
  science: {
    id: 'science',
    name: 'Science (AAAS)',
    subtitle: 'High-contrast sapphire & amber editorial tone',
    colorblindSafe: true,
    fontFamily: '"Helvetica Neue", Arial, sans-serif',
    upColor: '#BB0021',
    downColor: '#3B4992',
    nsColor: '#BDC3CC',
    accentColor: '#008B45',
    categorical: ['#3B4992', '#EE0000', '#008B45', '#631879', '#008280', '#BB0021'],
    sequential: ['#F7F7FB', '#D2D5EE', '#959CD6', '#5864B6', '#2B357A'],
    diverging: ['#3B4992', '#FAFAFA', '#BB0021'],
    axisWidth: 1.1,
    gridOpacity: 0.15,
  },
  'okabe-ito': {
    id: 'okabe-ito',
    name: 'Okabe–Ito',
    subtitle: 'Gold-standard universal colorblind-safe palette',
    colorblindSafe: true,
    fontFamily: '-apple-system, "Helvetica Neue", Arial, sans-serif',
    upColor: '#D55E00',
    downColor: '#0072B2',
    nsColor: '#BFC4CC',
    accentColor: '#009E73',
    categorical: ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9'],
    sequential: ['#F2F7FA', '#B9DCF0', '#56B4E9', '#0072B2', '#00436B'],
    diverging: ['#0072B2', '#F7F7F7', '#D55E00'],
    axisWidth: 1.2,
    gridOpacity: 0.18,
  },
  viridis: {
    id: 'viridis',
    name: 'Viridis Perceptual',
    subtitle: 'Perceptually uniform & greyscale-safe luminance',
    colorblindSafe: true,
    fontFamily: '-apple-system, "Helvetica Neue", Arial, sans-serif',
    upColor: '#35B779',
    downColor: '#440154',
    nsColor: '#C5C8CE',
    accentColor: '#21918C',
    categorical: ['#440154', '#31688E', '#35B779', '#B5DE2B', '#26828E', '#FDE725'],
    sequential: ['#440154', '#3B528B', '#21918C', '#5EC962', '#FDE725'],
    diverging: ['#440154', '#21918C', '#FDE725'],
    axisWidth: 1.15,
    gridOpacity: 0.16,
  },
  'tol-muted': {
    id: 'tol-muted',
    name: 'Paul Tol Muted',
    subtitle: 'Refined low-glare palette for dense panels',
    colorblindSafe: true,
    fontFamily: '-apple-system, "Helvetica Neue", Arial, sans-serif',
    upColor: '#CC6677',
    downColor: '#332288',
    nsColor: '#C8CCD4',
    accentColor: '#117733',
    categorical: ['#332288', '#88CCEE', '#44AA99', '#117733', '#DDCC77', '#CC6677'],
    sequential: ['#F4F3FA', '#C9C4E4', '#8B82C5', '#584DA3', '#332288'],
    diverging: ['#332288', '#F6F6F8', '#CC6677'],
    axisWidth: 1.1,
    gridOpacity: 0.15,
  },
};

export const JOURNAL_PRESET_LIST = Object.values(JOURNAL_PRESETS);

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
