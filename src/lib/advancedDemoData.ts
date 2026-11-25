import type { DosePoint, PairXYRow, ROCInputRow, SurvivalRow } from './bioAnalytics';

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, rng()))) * Math.cos(2 * Math.PI * rng());
}

/* ============================================================================
 * 1. Single-Cell UMAP & t-SNE Embedding Demo (560 PBMC cells × 6 markers)
 * ========================================================================== */

export interface EmbeddingCell {
  id: string;
  cluster: string;
  condition: 'Control' | 'Treated';
  umap1: number;
  umap2: number;
  tsne1: number;
  tsne2: number;
  expr: Record<string, number>;
}

export const EMBEDDING_MARKERS = ['IL7R', 'CD8A', 'NKG7', 'MS4A1', 'LYZ', 'HLA-DRA'] as const;

export function generateDemoEmbeddingData(): EmbeddingCell[] {
  const rng = mulberry32(8842);
  const clusters: {
    name: string;
    n: number;
    u: [number, number, number];
    t: [number, number, number];
    markerPeaks: Record<string, number>;
  }[] = [
    { name: 'CD4 T', n: 120, u: [-4.8, 3.2, 1.05], t: [-22, 18, 5.2], markerPeaks: { IL7R: 4.4 } },
    { name: 'CD8 T', n: 95, u: [-2.2, 5.1, 0.95], t: [-8, 28, 4.8], markerPeaks: { CD8A: 4.6, NKG7: 2.2 } },
    { name: 'NK Cell', n: 75, u: [1.6, 5.8, 0.85], t: [14, 26, 4.4], markerPeaks: { NKG7: 5.1 } },
    { name: 'B Cell', n: 85, u: [5.4, 1.4, 0.9], t: [28, -4, 4.6], markerPeaks: { MS4A1: 4.9, 'HLA-DRA': 3.4 } },
    { name: 'CD14 Mono', n: 115, u: [1.8, -4.2, 1.15], t: [8, -24, 5.6], markerPeaks: { LYZ: 5.2, 'HLA-DRA': 2.5 } },
    { name: 'cDC', n: 70, u: [-3.4, -4.6, 0.82], t: [-18, -22, 4.2], markerPeaks: { 'HLA-DRA': 5.0, LYZ: 2.3 } },
  ];

  const cells: EmbeddingCell[] = [];
  let idx = 1;
  for (const c of clusters) {
    for (let i = 0; i < c.n; i++) {
      const treated = rng() < 0.5;
      const shiftX = treated ? (c.name === 'CD14 Mono' ? 0.65 : 0.25) : -0.2;
      const shiftY = treated ? (c.name === 'CD8 T' ? 0.55 : -0.15) : 0.15;
      const expr: Record<string, number> = {};
      for (const m of EMBEDDING_MARKERS) {
        const peak = c.markerPeaks[m] ?? 0.25;
        const boost = treated && (m === 'NKG7' || m === 'HLA-DRA') ? 0.6 : 0;
        expr[m] = Number(Math.max(0, peak + boost + randn(rng) * 0.55).toFixed(2));
      }
      cells.push({
        id: `CELL_${idx++}`,
        cluster: c.name,
        condition: treated ? 'Treated' : 'Control',
        umap1: Number((c.u[0] + shiftX + randn(rng) * c.u[2]).toFixed(2)),
        umap2: Number((c.u[1] + shiftY + randn(rng) * c.u[2]).toFixed(2)),
        tsne1: Number((c.t[0] + shiftX * 4 + randn(rng) * c.t[2]).toFixed(2)),
        tsne2: Number((c.t[1] + shiftY * 4 + randn(rng) * c.t[2]).toFixed(2)),
        expr,
      });
    }
  }
  return cells;
}

/* ============================================================================
 * 2. PCA Bulk RNA-seq QC Demo (PC1 46.8%, PC2 21.4% across 3 groups)
 * ========================================================================== */

export interface PCASampleRow {
  sample: string;
  group: string;
  pc1: number;
  pc2: number;
}

export function generateDemoPCAData(): {
  rows: PCASampleRow[];
  pc1Var: number;
  pc2Var: number;
} {
  const rng = mulberry32(7101);
  const groups = [
    { name: 'Control', cx: -24, cy: -8, sx: 6.5, sy: 5.5, n: 8 },
    { name: 'IFN-γ 6h', cx: 8, cy: 18, sx: 7.2, sy: 6.1, n: 8 },
    { name: 'IFN-γ 24h', cx: 26, cy: -11, sx: 6.8, sy: 5.8, n: 8 },
  ];
  const rows: PCASampleRow[] = [];
  for (const g of groups) {
    for (let i = 1; i <= g.n; i++) {
      rows.push({
        sample: `${g.name.replace(/\s+/g, '')}_${i}`,
        group: g.name,
        pc1: Number((g.cx + randn(rng) * g.sx).toFixed(2)),
        pc2: Number((g.cy + randn(rng) * g.sy).toFixed(2)),
      });
    }
  }
  return { rows, pc1Var: 46.8, pc2Var: 21.4 };
}

/* ============================================================================
 * 3. Z-Scored DEG Expression Heatmap Demo (14 Top DEGs × 12 Samples)
 * ========================================================================== */

export interface DEGHeatmapData {
  genes: string[];
  samples: { id: string; group: string }[];
  zMatrix: number[][]; // [geneIdx][sampleIdx]
}

export function generateDemoDEGHeatmap(): DEGHeatmapData {
  const rng = mulberry32(9201);
  const genes = [
    'CXCL10', 'GBP1', 'IDO1', 'STAT1', 'IRF1', 'IFIT3', 'ISG15',
    'MRC1', 'CD163', 'ARG1', 'PPARG', 'TREM2', 'MAFB', 'IGF1',
  ];
  const samples = [
    { id: 'Ctrl_1', group: 'Control' },
    { id: 'Ctrl_2', group: 'Control' },
    { id: 'Ctrl_3', group: 'Control' },
    { id: 'Ctrl_4', group: 'Control' },
    { id: 'Low_1', group: 'IFN-γ Low' },
    { id: 'Low_2', group: 'IFN-γ Low' },
    { id: 'Low_3', group: 'IFN-γ Low' },
    { id: 'Low_4', group: 'IFN-γ Low' },
    { id: 'High_1', group: 'IFN-γ High' },
    { id: 'High_2', group: 'IFN-γ High' },
    { id: 'High_3', group: 'IFN-γ High' },
    { id: 'High_4', group: 'IFN-γ High' },
  ];

  const zMatrix = genes.map((_, gi) => {
    const isUp = gi < 7;
    return samples.map((s) => {
      const base =
        s.group === 'Control'
          ? isUp
            ? -1.35
            : 1.3
          : s.group === 'IFN-γ Low'
          ? isUp
            ? 0.25
            : -0.2
          : isUp
          ? 1.55
          : -1.45;
      return Number(Math.max(-2.5, Math.min(2.5, base + randn(rng) * 0.38)).toFixed(2));
    });
  });

  return { genes, samples, zMatrix };
}

/* ============================================================================
 * 4. Single-Cell Pseudotime Trajectory Ribbon Demo
 * ========================================================================== */

export interface PseudotimeGeneSeries {
  gene: string;
  points: { t: number; mean: number; ci: number }[];
}

export function generateDemoPseudotime(): {
  stages: { label: string; start: number; end: number }[];
  series: PseudotimeGeneSeries[];
} {
  const steps = 40;
  const makeSeries = (gene: string, fn: (t: number) => number, ciBase: number): PseudotimeGeneSeries => ({
    gene,
    points: Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return {
        t,
        mean: Number(Math.max(0.1, fn(t)).toFixed(3)),
        ci: Number((ciBase * (0.75 + 0.45 * Math.sin(t * Math.PI))).toFixed(3)),
      };
    }),
  });

  return {
    stages: [
      { label: 'Naive Stem', start: 0, end: 0.28 },
      { label: 'Activated', start: 0.28, end: 0.64 },
      { label: 'Terminal Effector', start: 0.64, end: 1.0 },
    ],
    series: [
      makeSeries('TCF7 (Stemness)', (t) => 4.2 * Math.exp(-3.4 * t) + 0.35, 0.32),
      makeSeries('IRF4 (Activation)', (t) => 0.5 + 3.6 * Math.exp(-((t - 0.46) ** 2) / 0.045), 0.36),
      makeSeries('GZMB (Cytotoxic)', (t) => 0.3 + 4.4 / (1 + Math.exp(-9.5 * (t - 0.62))), 0.34),
      makeSeries('PDCD1 (Exhaustion)', (t) => 0.25 + 3.5 / (1 + Math.exp(-11 * (t - 0.78))), 0.28),
    ],
  };
}

/* ============================================================================
 * 5. Dose-Response / IC50 4PL Demo (2 Inhibitors, 8 concentrations × 3 reps)
 * ========================================================================== */

export function generateDemoDoseResponse(): DosePoint[] {
  const rng = mulberry32(5501);
  const concs = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0, 3.0, 10.0];
  const drugs = [
    { name: 'Lead Inhibitor (BG-104)', top: 99, bottom: 7, ic50: 0.045, hill: 1.25 },
    { name: 'Reference Compound', top: 98, bottom: 14, ic50: 0.58, hill: 1.05 },
  ];
  const pts: DosePoint[] = [];
  for (const d of drugs) {
    for (const c of concs) {
      for (let r = 0; r < 3; r++) {
        const y = d.bottom + (d.top - d.bottom) / (1 + Math.pow(c / d.ic50, d.hill));
        pts.push({
          compound: d.name,
          conc: c,
          response: Number(Math.max(0, Math.min(115, y + randn(rng) * 3.8)).toFixed(2)),
        });
      }
    }
  }
  return pts;
}

/* ============================================================================
 * 6. Kaplan-Meier Clinical Survival Demo (72 Patients, 2 Arms)
 * ========================================================================== */

export function generateDemoSurvivalData(): SurvivalRow[] {
  const rng = mulberry32(6602);
  const rows: SurvivalRow[] = [];
  // Arm 1: Targeted + IO (longer survival)
  for (let i = 0; i < 36; i++) {
    const rawT = -Math.log(Math.max(1e-4, rng())) * 34;
    const censorT = 18 + rng() * 30;
    const event: 0 | 1 = rawT <= censorT && rawT <= 48 ? 1 : 0;
    const time = Number(Math.min(48, Math.min(rawT, censorT)).toFixed(1));
    rows.push({ group: 'Targeted + IO', time: Math.max(0.5, time), event });
  }
  // Arm 2: Standard of Care (shorter survival)
  for (let i = 0; i < 36; i++) {
    const rawT = -Math.log(Math.max(1e-4, rng())) * 16.5;
    const censorT = 16 + rng() * 32;
    const event: 0 | 1 = rawT <= censorT && rawT <= 48 ? 1 : 0;
    const time = Number(Math.min(48, Math.min(rawT, censorT)).toFixed(1));
    rows.push({ group: 'Standard of Care', time: Math.max(0.5, time), event });
  }
  return rows;
}

/* ============================================================================
 * 7. Forest Plot Demo (Multivariate Cox Hazard Ratios)
 * ========================================================================== */

export interface ForestRow {
  variable: string;
  hr: number;
  ciLow: number;
  ciHigh: number;
  pValue: number;
  isSummary?: boolean;
}

export function generateDemoForestData(): ForestRow[] {
  return [
    { variable: 'IFN-γ Signature (High vs Low)', hr: 0.44, ciLow: 0.28, ciHigh: 0.69, pValue: 0.0004 },
    { variable: 'CD8+ T-Cell Density', hr: 0.56, ciLow: 0.37, ciHigh: 0.84, pValue: 0.0052 },
    { variable: 'TMB ≥ 10 mut/Mb', hr: 0.64, ciLow: 0.43, ciHigh: 0.95, pValue: 0.027 },
    { variable: 'PD-L1 TPS ≥ 50%', hr: 0.72, ciLow: 0.49, ciHigh: 1.06, pValue: 0.094 },
    { variable: 'Age (>65 vs ≤65 yr)', hr: 1.14, ciLow: 0.81, ciHigh: 1.61, pValue: 0.45 },
    { variable: 'Liver Metastasis (Yes)', hr: 1.88, ciLow: 1.24, ciHigh: 2.85, pValue: 0.0029 },
    { variable: 'ECOG PS ≥ 2', hr: 2.24, ciLow: 1.41, ciHigh: 3.55, pValue: 0.0007 },
    { variable: 'Pooled Biomarker Score', hr: 0.52, ciLow: 0.39, ciHigh: 0.69, pValue: 0.0001, isSummary: true },
  ];
}

/* ============================================================================
 * 8. Multi-Biomarker ROC / AUC Demo
 * ========================================================================== */

export function generateDemoROCData(): ROCInputRow[] {
  const rng = mulberry32(7703);
  const rows: ROCInputRow[] = [];
  const models = [
    { name: 'BioGrace 6-Gene Panel', sep: 2.15 },
    { name: 'Single Gene (CXCL10)', sep: 1.25 },
    { name: 'Clinical Stage Only', sep: 0.62 },
  ];
  for (const m of models) {
    for (let i = 0; i < 65; i++) {
      rows.push({ model: m.name, label: 0, score: Number(randn(rng).toFixed(3)) });
      rows.push({ model: m.name, label: 1, score: Number((m.sep + randn(rng)).toFixed(3)) });
    }
  }
  return rows;
}

/* ============================================================================
 * 9. Assay Validation Correlation & Bland-Altman Demo (qPCR vs RNA-seq)
 * ========================================================================== */

export function generateDemoCorrelationData(): PairXYRow[] {
  const rng = mulberry32(8804);
  const rows: PairXYRow[] = [];
  for (let i = 1; i <= 32; i++) {
    const x = 1.5 + rng() * 9.5;
    // Slight systematic +0.35 offset & realistic assay noise
    const y = x * 1.03 + 0.35 + randn(rng) * 0.68;
    rows.push({
      id: `Sample_${i}`,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    });
  }
  return rows;
}
