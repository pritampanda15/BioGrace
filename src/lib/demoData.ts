import type {
  DotPlotRow,
  PathwayRow,
  TidyStatRow,
  UpSetItem,
  VolcanoRow,
} from '../types/biograce';

/* Deterministic Mulberry32 PRNG so plots & demos are 100% reproducible */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number): number {
  const u1 = Math.max(1e-9, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/* ============================================================================
 * Studio 1 Demos: DESeq2 Volcano/MA, Scanpy Dot Plot, DEG UpSet, GSEA Lollipop
 * ========================================================================== */

export function generateDemoVolcanoData(): VolcanoRow[] {
  const rng = mulberry32(42026);
  const landmarks: VolcanoRow[] = [
    // Classic IFN-gamma stimulated macrophage signature (upregulated)
    { gene: 'CXCL10', log2FC: 4.82, padj: 1.2e-42, pvalue: 2.1e-46, baseMean: 18420 },
    { gene: 'GBP1', log2FC: 4.15, padj: 4.5e-36, pvalue: 1.1e-39, baseMean: 9640 },
    { gene: 'STAT1', log2FC: 3.24, padj: 8.4e-31, pvalue: 2.3e-34, baseMean: 24100 },
    { gene: 'IDO1', log2FC: 5.12, padj: 3.1e-29, pvalue: 9.8e-33, baseMean: 3420 },
    { gene: 'IRF1', log2FC: 2.95, padj: 2.2e-25, pvalue: 7.4e-29, baseMean: 11250 },
    { gene: 'IFIT3', log2FC: 3.68, padj: 5.9e-23, pvalue: 2.1e-26, baseMean: 6780 },
    { gene: 'CXCL9', log2FC: 4.46, padj: 1.8e-20, pvalue: 8.2e-24, baseMean: 4210 },
    { gene: 'ISG15', log2FC: 2.74, padj: 6.4e-18, pvalue: 3.1e-21, baseMean: 14800 },
    { gene: 'SOCS1', log2FC: 2.41, padj: 1.3e-14, pvalue: 6.5e-18, baseMean: 2890 },
    { gene: 'CD274', log2FC: 2.86, padj: 4.1e-16, pvalue: 1.8e-19, baseMean: 3180 },
    { gene: 'HLA-DRA', log2FC: 1.92, padj: 3.7e-12, pvalue: 1.7e-15, baseMean: 41200 },
    { gene: 'OAS1', log2FC: 2.18, padj: 9.2e-11, pvalue: 4.8e-14, baseMean: 5340 },
    // Repressed M2 / homeostatic tissue-repair genes (downregulated)
    { gene: 'MRC1', log2FC: -3.42, padj: 2.4e-28, pvalue: 8.8e-32, baseMean: 12900 },
    { gene: 'CD163', log2FC: -3.88, padj: 6.1e-24, pvalue: 2.4e-27, baseMean: 15400 },
    { gene: 'PPARG', log2FC: -2.64, padj: 4.9e-19, pvalue: 2.1e-22, baseMean: 4820 },
    { gene: 'ARG1', log2FC: -4.12, padj: 1.7e-17, pvalue: 7.9e-21, baseMean: 1890 },
    { gene: 'TREM2', log2FC: -2.28, padj: 8.1e-14, pvalue: 4.2e-17, baseMean: 8340 },
    { gene: 'MAFB', log2FC: -1.96, padj: 2.6e-11, pvalue: 1.4e-14, baseMean: 6210 },
    { gene: 'IGF1', log2FC: -3.05, padj: 5.2e-13, pvalue: 2.7e-16, baseMean: 2420 },
    { gene: 'APOE', log2FC: -1.72, padj: 4.1e-9, pvalue: 2.5e-12, baseMean: 31400 },
  ];

  const rows: VolcanoRow[] = [...landmarks];
  const prefixes = ['SLC', 'ZNF', 'RPL', 'TMEM', 'FAM', 'MAP', 'CDK', 'USP', 'RAB', 'TRIM', 'IL', 'CCL', 'DUSP', 'KLF'];
  for (let i = 0; i < 480; i++) {
    const prefix = prefixes[i % prefixes.length];
    const gene = `${prefix}${10 + Math.floor(rng() * 890)}`;
    const isSig = rng() < 0.22;
    let log2FC: number;
    let negLog10P: number;
    if (isSig) {
      const dir = rng() < 0.56 ? 1 : -1;
      log2FC = dir * (0.9 + Math.abs(randn(rng)) * 1.15);
      negLog10P = 1.4 + Math.abs(log2FC) * (1.8 + rng() * 3.1) + rng() * 4;
    } else {
      log2FC = randn(rng) * 0.65;
      negLog10P = Math.max(0.01, Math.abs(randn(rng)) * 0.85 + Math.abs(log2FC) * 0.45);
    }
    const padj = Math.min(1, Math.max(1e-35, Math.pow(10, -negLog10P)));
    const baseMean = Math.pow(10, 1.2 + rng() * 3.2);
    rows.push({
      gene: `${gene}${i > 220 ? 'A' : ''}`,
      log2FC: Number(log2FC.toFixed(3)),
      padj,
      pvalue: Math.max(1e-38, padj / 8),
      baseMean: Number(baseMean.toFixed(1)),
    });
  }
  return rows;
}

export function generateDemoDotPlotData(): DotPlotRow[] {
  const clusters = ['CD4 T', 'CD8 T', 'NK', 'B Cell', 'CD14 Mono', 'FCGR3A Mono', 'cDC', 'Platelet'];
  const genes = [
    'IL7R', 'CCR7', 'CD8A', 'GZMB', 'NKG7', 'GNLY',
    'MS4A1', 'CD79A', 'LYZ', 'S100A8', 'FCGR3A', 'HLA-DQA1', 'PPBP',
  ];
  // Canonical expression matrix [geneIdx][clusterIdx] => [avgExpr, pctExpr]
  const peaks: Record<string, Record<string, [number, number]>> = {
    IL7R: { 'CD4 T': [2.4, 88], 'CD8 T': [0.8, 34] },
    CCR7: { 'CD4 T': [1.9, 72], 'B Cell': [0.6, 28] },
    CD8A: { 'CD8 T': [2.6, 91], NK: [0.5, 22] },
    GZMB: { 'CD8 T': [1.8, 64], NK: [2.7, 94] },
    NKG7: { 'CD8 T': [1.7, 68], NK: [2.8, 97] },
    GNLY: { NK: [2.6, 92], 'CD8 T': [0.9, 32] },
    MS4A1: { 'B Cell': [2.5, 93] },
    CD79A: { 'B Cell': [2.7, 96] },
    LYZ: { 'CD14 Mono': [2.8, 98], 'FCGR3A Mono': [2.1, 86], cDC: [1.5, 68] },
    S100A8: { 'CD14 Mono': [2.7, 95], 'FCGR3A Mono': [0.8, 38] },
    FCGR3A: { 'FCGR3A Mono': [2.5, 92], NK: [1.2, 48] },
    'HLA-DQA1': { cDC: [2.6, 94], 'B Cell': [1.8, 76], 'CD14 Mono': [1.1, 52] },
    PPBP: { Platelet: [2.9, 97] },
  };
  const rng = mulberry32(9001);
  const rows: DotPlotRow[] = [];
  for (const gene of genes) {
    for (const cluster of clusters) {
      const hit = peaks[gene]?.[cluster];
      const avgExpr = hit ? hit[0] : Number((-0.45 + rng() * 0.55).toFixed(2));
      const pctExpr = hit ? hit[1] : Number((2 + rng() * 14).toFixed(1));
      rows.push({ gene, cluster, avgExpr, pctExpr });
    }
  }
  return rows;
}

export function generateDemoUpSetData(): UpSetItem[] {
  const rng = mulberry32(1337);
  const combos: { sets: string[]; count: number; prefix: string }[] = [
    { sets: ['IFN-γ', 'IFN-α', 'TNF-α', 'LPS'], count: 64, prefix: 'CORE_ISG' },
    { sets: ['IFN-γ', 'IFN-α'], count: 118, prefix: 'IFN_DUAL' },
    { sets: ['TNF-α', 'LPS'], count: 92, prefix: 'NFKB_AXIS' },
    { sets: ['IFN-γ'], count: 84, prefix: 'IFNG_ONLY' },
    { sets: ['LPS'], count: 106, prefix: 'TLR4_SPEC' },
    { sets: ['IFN-α'], count: 53, prefix: 'IFNA_SPEC' },
    { sets: ['TNF-α'], count: 47, prefix: 'TNFA_SPEC' },
    { sets: ['IFN-γ', 'TNF-α', 'LPS'], count: 38, prefix: 'PROINFLAM' },
    { sets: ['IFN-γ', 'LPS'], count: 44, prefix: 'M1_SYNERGY' },
    { sets: ['IFN-α', 'LPS'], count: 29, prefix: 'TRIF_IRF3' },
  ];
  const items: UpSetItem[] = [];
  for (const c of combos) {
    for (let i = 0; i < c.count; i++) {
      items.push({ id: `${c.prefix}_${i + 1}_${Math.floor(rng() * 99)}`, sets: c.sets });
    }
  }
  return items;
}

export function generateDemoPathwayData(): PathwayRow[] {
  return [
    { pathway: 'HALLMARK_INTERFERON_GAMMA_RESPONSE', nes: 2.94, padj: 1.2e-18, geneCount: 162, category: 'Immune' },
    { pathway: 'HALLMARK_INTERFERON_ALPHA_RESPONSE', nes: 2.71, padj: 4.8e-15, geneCount: 89, category: 'Immune' },
    { pathway: 'HALLMARK_INFLAMMATORY_RESPONSE', nes: 2.28, padj: 1.9e-10, geneCount: 124, category: 'Immune' },
    { pathway: 'HALLMARK_IL6_JAK_STAT3_SIGNALING', nes: 2.12, padj: 3.4e-8, geneCount: 64, category: 'Signaling' },
    { pathway: 'HALLMARK_ALLOGRAFT_REJECTION', nes: 1.96, padj: 8.7e-7, geneCount: 118, category: 'Immune' },
    { pathway: 'HALLMARK_TNFA_SIGNALING_VIA_NFKB', nes: 1.84, padj: 4.1e-5, geneCount: 141, category: 'Signaling' },
    { pathway: 'HALLMARK_COMPLEMENT', nes: 1.62, padj: 0.0018, geneCount: 88, category: 'Immune' },
    { pathway: 'HALLMARK_OXIDATIVE_PHOSPHORYLATION', nes: -2.41, padj: 2.1e-11, geneCount: 154, category: 'Metabolism' },
    { pathway: 'HALLMARK_FATTY_ACID_METABOLISM', nes: -2.08, padj: 6.5e-8, geneCount: 92, category: 'Metabolism' },
    { pathway: 'HALLMARK_MYC_TARGETS_V1', nes: -1.94, padj: 2.8e-6, geneCount: 138, category: 'Proliferation' },
    { pathway: 'HALLMARK_E2F_TARGETS', nes: -1.78, padj: 0.00042, geneCount: 116, category: 'Proliferation' },
    { pathway: 'HALLMARK_CHOLESTEROL_HOMEOSTASIS', nes: -1.56, padj: 0.0064, geneCount: 54, category: 'Metabolism' },
  ];
}

/* ============================================================================
 * Studio 2 Demos: Statistical Test Advisor & Anti-Barplot Studio
 * ========================================================================== */

export interface StatsDemoPreset {
  id: string;
  name: string;
  badge: string;
  summary: string;
  yLabel: string;
  xLabel: string;
  isPaired: boolean;
  rows: TidyStatRow[];
}

export function getStatsDemoPresets(): StatsDemoPreset[] {
  const rng1 = mulberry32(202601);
  // 1. The Anti-Barplot Showcase: Bimodal Drug Response vs Normal Control
  // Means are close, yet Drug splits into clear responders & non-responders!
  const bimodalRows: TidyStatRow[] = [];
  for (let i = 0; i < 24; i++) {
    bimodalRows.push({
      group: 'Vehicle',
      value: Number((50 + randn(rng1) * 5.2).toFixed(2)),
    });
  }
  for (let i = 0; i < 12; i++) {
    bimodalRows.push({
      group: 'Kinase Inhibitor',
      value: Number((26 + randn(rng1) * 3.1).toFixed(2)),
    });
  }
  for (let i = 0; i < 12; i++) {
    bimodalRows.push({
      group: 'Kinase Inhibitor',
      value: Number((66 + randn(rng1) * 3.4).toFixed(2)),
    });
  }

  // 2. Multi-Dose Skewed Viability (Kruskal-Wallis + BH FDR)
  const rng2 = mulberry32(202602);
  const multiDoseRows: TidyStatRow[] = [];
  const doses: { name: string; base: number; skew: number }[] = [
    { name: 'DMSO', base: 98, skew: 3 },
    { name: '0.1 µM', base: 89, skew: 7 },
    { name: '1.0 µM', base: 62, skew: 15 },
    { name: '10 µM', base: 24, skew: 11 },
  ];
  for (const d of doses) {
    for (let i = 0; i < 14; i++) {
      // Right-skewed log-normal tail
      const raw = d.base + (Math.exp(randn(rng2) * 0.58) - 1) * d.skew;
      multiDoseRows.push({
        group: d.name,
        value: Number(Math.max(4, Math.min(135, raw)).toFixed(2)),
      });
    }
  }

  // 3. Paired Patient Pre vs Post Immunotherapy (Paired t-test / Slopegraph)
  const rng3 = mulberry32(202603);
  const pairedRows: TidyStatRow[] = [];
  for (let i = 1; i <= 14; i++) {
    const subj = `PT_${String(i).padStart(2, '0')}`;
    const baseline = 28 + randn(rng3) * 14;
    const shift = 11.8 + randn(rng3) * 4.1;
    pairedRows.push({ group: 'Baseline (Day 0)', value: Number(baseline.toFixed(2)), subject: subj });
    pairedRows.push({ group: 'Post-Tx (Day 28)', value: Number((baseline + shift).toFixed(2)), subject: subj });
  }

  // 4. Pseudoreplication Trap: 4 Mice/group × 4 technical qPCR wells each (N=16 wells, n=4 mice!)
  const rng4 = mulberry32(202604);
  const pseudoRows: TidyStatRow[] = [];
  const mouseOffsetsWT = [1.02, 0.88, 1.15, 0.94];
  const mouseOffsetsKO = [1.46, 1.18, 1.62, 1.29];
  mouseOffsetsWT.forEach((mVal, idx) => {
    const donor = `WT_Mouse_${idx + 1}`;
    for (let w = 0; w < 4; w++) {
      pseudoRows.push({
        group: 'Wild-Type',
        value: Number((mVal + randn(rng4) * 0.045).toFixed(3)),
        replicate: donor,
        subject: donor,
      });
    }
  });
  mouseOffsetsKO.forEach((mVal, idx) => {
    const donor = `KO_Mouse_${idx + 1}`;
    for (let w = 0; w < 4; w++) {
      pseudoRows.push({
        group: 'CRISPR KO',
        value: Number((mVal + randn(rng4) * 0.045).toFixed(3)),
        replicate: donor,
        subject: donor,
      });
    }
  });

  return [
    {
      id: 'bimodal-trap',
      name: 'Bimodal Responder Split',
      badge: 'Anti-Barplot Classic',
      summary:
        'A barplot shows almost identical heights (~50 vs ~46), hiding two distinct responder & resistant subpopulations.',
      yLabel: 'Phospho-ERK Signal (AU)',
      xLabel: 'Treatment Arm',
      isPaired: false,
      rows: bimodalRows,
    },
    {
      id: 'multi-dose-kw',
      name: 'Multi-Dose Viability (4 Groups)',
      badge: 'Kruskal–Wallis + BH',
      summary:
        'Skewed dose-response assay across 4 concentrations requiring Kruskal–Wallis + BH FDR adjustment.',
      yLabel: 'Relative Cell Viability (%)',
      xLabel: 'Compound Concentration',
      isPaired: false,
      rows: multiDoseRows,
    },
    {
      id: 'paired-clinical',
      name: 'Paired Patient Pre/Post',
      badge: 'Paired Design',
      summary:
        '14 matched patient biopsies before and after checkpoint blockade — pairing removes inter-patient baseline noise.',
      yLabel: 'CD8+ T-Cell Infiltration Score',
      xLabel: 'Timepoint',
      isPaired: true,
      rows: pairedRows,
    },
    {
      id: 'pseudorep-qpcr',
      name: 'qPCR Technical Replicates',
      badge: 'Pseudoreplication Guard',
      summary:
        '4 mice per genotype with 4 technical qPCR wells each (32 rows, but only 8 biological replicates!).',
      yLabel: 'Normalized Relative Expression (2^-ΔΔCt)',
      xLabel: 'Genotype',
      isPaired: false,
      rows: pseudoRows,
    },
  ];
}
