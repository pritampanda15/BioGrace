import Papa from 'papaparse';
import type {
  DotPlotRow,
  PathwayRow,
  TidyStatRow,
  UpSetItem,
  VolcanoRow,
} from '../types/biograce';
import type { DosePoint, PairXYRow, ROCInputRow, SurvivalRow } from './bioAnalytics';
import type {
  DEGHeatmapData,
  EmbeddingCell,
  ForestRow,
  PCASampleRow,
  PseudotimeGeneSeries,
} from './advancedDemoData';

export interface ParsedTable {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseDelimitedText(text: string): ParsedTable {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

function findColumn(headers: string[], candidates: string[]): string | undefined {
  const lowerMap = new Map(headers.map((h) => [h.toLowerCase().trim(), h]));
  for (const cand of candidates) {
    const exact = lowerMap.get(cand.toLowerCase());
    if (exact) return exact;
  }
  for (const cand of candidates) {
    const partial = headers.find((h) => h.toLowerCase().includes(cand.toLowerCase()));
    if (partial) return partial;
  }
  return undefined;
}

/** Auto-detect DESeq2 / edgeR / limma / Scanpy / Seurat DE tables */
export function parseDERows(table: ParsedTable): {
  rows: VolcanoRow[];
  detectedTool: string;
  columns: { gene: string; log2FC: string; padj: string; baseMean?: string };
} {
  const { headers, rows } = table;
  const geneCol =
    findColumn(headers, ['gene', 'symbol', 'gene_symbol', 'gene_name', 'names', 'feature', 'id']) ??
    headers[0];
  const fcCol =
    findColumn(headers, ['log2foldchange', 'avg_log2fc', 'logfc', 'log2fc', 'logfoldchanges', 'lfc']) ??
    headers[1];
  const padjCol =
    findColumn(headers, ['padj', 'p_val_adj', 'fdr', 'adj.p.val', 'pvals_adj', 'qvalue', 'q_value', 'pvalue', 'p_val', 'p.value']) ??
    headers[2];
  const pvalCol = findColumn(headers, ['pvalue', 'p_val', 'p.value', 'pvals']) ?? padjCol;
  const meanCol = findColumn(headers, ['basemean', 'aveexpr', 'logcpm', 'mean', 'pct.1', 'expr']);

  let detectedTool = 'Generic DE Table';
  if (headers.some((h) => h === 'log2FoldChange' || h === 'baseMean')) detectedTool = 'DESeq2';
  else if (headers.some((h) => h === 'avg_log2FC' || h === 'p_val_adj')) detectedTool = 'Seurat';
  else if (headers.some((h) => h === 'logFC' && headers.includes('adj.P.Val'))) detectedTool = 'limma';
  else if (headers.some((h) => h === 'logFC' && headers.includes('FDR'))) detectedTool = 'edgeR';
  else if (headers.some((h) => h === 'logfoldchanges' || h === 'pvals_adj')) detectedTool = 'Scanpy';

  const parsed: VolcanoRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const gene = (r[geneCol] ?? `Gene_${i + 1}`).trim();
    const log2FC = Number(r[fcCol]);
    const padj = Number(r[padjCol]);
    const pvalue = Number(r[pvalCol]);
    const baseMean = meanCol ? Number(r[meanCol]) : Math.pow(10, 1.5 + ((i * 37) % 100) / 35);
    if (!Number.isFinite(log2FC) || !Number.isFinite(padj)) continue;
    parsed.push({
      gene,
      log2FC,
      padj: Math.max(1e-300, padj),
      pvalue: Number.isFinite(pvalue) ? Math.max(1e-300, pvalue) : Math.max(1e-300, padj),
      baseMean: Number.isFinite(baseMean) && baseMean > 0 ? baseMean : 10,
    });
  }

  return {
    rows: parsed,
    detectedTool,
    columns: { gene: geneCol, log2FC: fcCol, padj: padjCol, baseMean: meanCol },
  };
}

export function parseDotPlotRows(table: ParsedTable): DotPlotRow[] {
  const { headers, rows } = table;
  const geneCol = findColumn(headers, ['gene', 'feature', 'symbol', 'marker']) ?? headers[0];
  const clusterCol = findColumn(headers, ['cluster', 'cell_type', 'celltype', 'group', 'identity']) ?? headers[1];
  const exprCol = findColumn(headers, ['avg_expr', 'avgexpr', 'mean', 'expression', 'scaled', 'zscore']) ?? headers[2];
  const pctCol = findColumn(headers, ['pct_expr', 'pctexpr', 'pct', 'percent', 'fraction']) ?? headers[3];

  const out: DotPlotRow[] = [];
  for (const r of rows) {
    const gene = (r[geneCol] ?? '').trim();
    const cluster = (r[clusterCol] ?? '').trim();
    const avgExpr = Number(r[exprCol]);
    let pctExpr = Number(r[pctCol]);
    if (!gene || !cluster || !Number.isFinite(avgExpr)) continue;
    if (!Number.isFinite(pctExpr)) pctExpr = 50;
    if (pctExpr <= 1 && pctExpr >= 0) pctExpr *= 100;
    out.push({ gene, cluster, avgExpr, pctExpr: Math.max(0, Math.min(100, pctExpr)) });
  }
  return out;
}

export function parsePathwayRows(table: ParsedTable): PathwayRow[] {
  const { headers, rows } = table;
  const nameCol = findColumn(headers, ['pathway', 'term', 'description', 'name', 'geneset']) ?? headers[0];
  const nesCol = findColumn(headers, ['nes', 'enrichment', 'fold_enrichment', 'score', 'log2fc']) ?? headers[1];
  const padjCol = findColumn(headers, ['padj', 'fdr', 'qvalue', 'p.adjust', 'pvalue']) ?? headers[2];
  const countCol = findColumn(headers, ['genecount', 'count', 'size', 'overlap', 'n_genes']) ?? headers[3];
  const catCol = findColumn(headers, ['category', 'database', 'collection']);

  const out: PathwayRow[] = [];
  for (const r of rows) {
    const pathway = (r[nameCol] ?? '').trim();
    const nes = Number(r[nesCol]);
    const padj = Number(r[padjCol]);
    const geneCount = Number(r[countCol]);
    if (!pathway || !Number.isFinite(nes)) continue;
    out.push({
      pathway,
      nes,
      padj: Number.isFinite(padj) ? Math.max(1e-50, padj) : 0.01,
      geneCount: Number.isFinite(geneCount) && geneCount > 0 ? geneCount : 25,
      category: catCol ? r[catCol] : undefined,
    });
  }
  return out;
}

export function parseUpSetRows(table: ParsedTable): UpSetItem[] {
  const { headers, rows } = table;
  const idCol = findColumn(headers, ['gene', 'id', 'feature', 'item', 'name']) ?? headers[0];
  const setCols = headers.filter((h) => h !== idCol);
  const out: UpSetItem[] = [];
  for (const r of rows) {
    const id = (r[idCol] ?? '').trim();
    if (!id) continue;
    const sets = setCols.filter((c) => {
      const val = (r[c] ?? '').trim().toLowerCase();
      return val === '1' || val === 'true' || val === 'yes' || val === 'x';
    });
    if (sets.length > 0) out.push({ id, sets });
  }
  return out;
}

/** Auto-detect tidy wet-lab CSV (Group, Value, optional Subject/Donor/Replicate) */
export function parseTidyStatsTable(table: ParsedTable): {
  rows: TidyStatRow[];
  groupCol: string;
  valueCol: string;
  subjectCol?: string;
  replicateCol?: string;
} {
  const { headers, rows } = table;
  // Detect numeric columns vs categorical columns
  const numericCols = headers.filter((h) => {
    const sample = rows.slice(0, 20).map((r) => Number(r[h]));
    const finiteCount = sample.filter((v) => Number.isFinite(v)).length;
    return finiteCount >= Math.max(1, sample.length * 0.8);
  });

  const valueCol =
    findColumn(numericCols, ['value', 'expression', 'viability', 'response', 'fold', 'intensity', 'count', 'score', 'measurement', 'conc']) ??
    numericCols[numericCols.length - 1] ??
    headers[1];

  const nonNumeric = headers.filter((h) => h !== valueCol);
  const groupCol =
    findColumn(nonNumeric, ['group', 'condition', 'treatment', 'dose', 'genotype', 'arm', 'cohort', 'timepoint']) ??
    nonNumeric[0] ??
    headers[0];

  const subjectCol = findColumn(
    headers.filter((h) => h !== valueCol && h !== groupCol),
    ['subject', 'patient', 'donor', 'mouse', 'pair', 'sample_id', 'cell_line', 'id']
  );

  const replicateCol = findColumn(
    headers.filter((h) => h !== valueCol && h !== groupCol),
    ['bio_rep', 'biorep', 'biological_replicate', 'donor', 'mouse', 'animal', 'well_group', 'subject']
  );

  const parsed: TidyStatRow[] = [];
  for (const r of rows) {
    const group = (r[groupCol] ?? '').trim();
    const value = Number(r[valueCol]);
    if (!group || !Number.isFinite(value)) continue;
    parsed.push({
      group,
      value,
      subject: subjectCol ? r[subjectCol]?.trim() : undefined,
      replicate: replicateCol ? r[replicateCol]?.trim() : undefined,
      raw: r,
    });
  }

  return { rows: parsed, groupCol, valueCol, subjectCol, replicateCol };
}

/** Parse Seurat / Scanpy UMAP or t-SNE CSV (UMAP_1, UMAP_2, cluster, optional condition & gene columns) */
export function parseEmbeddingRows(table: ParsedTable): { cells: EmbeddingCell[]; markers: string[] } {
  const { headers, rows } = table;
  const u1 = findColumn(headers, ['umap_1', 'umap1', 'x', 'tsne_1', 'tsne1']) ?? headers[0];
  const u2 = findColumn(headers, ['umap_2', 'umap2', 'y', 'tsne_2', 'tsne2']) ?? headers[1];
  const t1 = findColumn(headers, ['tsne_1', 'tsne1']) ?? u1;
  const t2 = findColumn(headers, ['tsne_2', 'tsne2']) ?? u2;
  const clCol = findColumn(headers, ['cluster', 'cell_type', 'celltype', 'leiden', 'seurat_clusters', 'group']) ?? headers[2];
  const condCol = findColumn(headers, ['condition', 'treatment', 'stim', 'sample', 'batch']);
  const idCol = findColumn(headers, ['cell', 'barcode', 'id']);
  const reserved = new Set([u1, u2, t1, t2, clCol, condCol, idCol].filter(Boolean));
  const markers = headers.filter((h) => !reserved.has(h) && Number.isFinite(Number(rows[0]?.[h]))).slice(0, 8);

  const cells: EmbeddingCell[] = [];
  rows.forEach((r, i) => {
    const xU = Number(r[u1]);
    const yU = Number(r[u2]);
    const xT = Number(r[t1]);
    const yT = Number(r[t2]);
    if (!Number.isFinite(xU) || !Number.isFinite(yU)) return;
    const expr: Record<string, number> = {};
    for (const m of markers) {
      const v = Number(r[m]);
      expr[m] = Number.isFinite(v) ? v : 0;
    }
    const rawCond = condCol ? (r[condCol] ?? '').toLowerCase() : '';
    cells.push({
      id: idCol ? r[idCol] : `Cell_${i + 1}`,
      cluster: (r[clCol] ?? 'Cluster 1').trim(),
      condition: rawCond.includes('treat') || rawCond.includes('stim') || rawCond.includes('ko') ? 'Treated' : 'Control',
      umap1: xU,
      umap2: yU,
      tsne1: Number.isFinite(xT) ? xT : xU,
      tsne2: Number.isFinite(yT) ? yT : yU,
      expr,
    });
  });
  return { cells, markers };
}

export function parsePCARows(table: ParsedTable): PCASampleRow[] {
  const { headers, rows } = table;
  const pc1Col = findColumn(headers, ['pc1', 'pc_1', 'dim1', 'x']) ?? headers[1];
  const pc2Col = findColumn(headers, ['pc2', 'pc_2', 'dim2', 'y']) ?? headers[2];
  const groupCol = findColumn(headers, ['group', 'condition', 'treatment', 'cluster', 'cohort']) ?? headers[0];
  const sampleCol = findColumn(headers, ['sample', 'id', 'name']) ?? headers[0];
  return rows
    .map((r, i) => ({
      sample: (r[sampleCol] ?? `S${i + 1}`).trim(),
      group: (r[groupCol] ?? 'Group 1').trim(),
      pc1: Number(r[pc1Col]),
      pc2: Number(r[pc2Col]),
    }))
    .filter((r) => Number.isFinite(r.pc1) && Number.isFinite(r.pc2));
}

export function parseDoseResponseRows(table: ParsedTable): DosePoint[] {
  const { headers, rows } = table;
  const concCol = findColumn(headers, ['conc', 'concentration', 'dose', 'um', 'nm', 'x']) ?? headers[0];
  const respCol = findColumn(headers, ['response', 'viability', 'inhibition', 'activity', 'value', 'y']) ?? headers[1];
  const compCol = findColumn(headers, ['compound', 'drug', 'group', 'treatment', 'arm']);
  return rows
    .map((r) => ({
      compound: compCol ? (r[compCol] ?? 'Compound').trim() : 'Compound',
      conc: Number(r[concCol]),
      response: Number(r[respCol]),
    }))
    .filter((r) => r.conc > 0 && Number.isFinite(r.response));
}

export function parseSurvivalRows(table: ParsedTable): SurvivalRow[] {
  const { headers, rows } = table;
  const timeCol = findColumn(headers, ['time', 'months', 'days', 'os_time', 'pfs', 'duration']) ?? headers[0];
  const eventCol = findColumn(headers, ['event', 'status', 'death', 'os_event', 'censored']) ?? headers[1];
  const groupCol = findColumn(headers, ['group', 'arm', 'treatment', 'cohort', 'strata']) ?? headers[2];
  return rows
    .map((r) => ({
      group: (r[groupCol] ?? 'Arm 1').trim(),
      time: Number(r[timeCol]),
      event: (Number(r[eventCol]) >= 1 ? 1 : 0) as 0 | 1,
    }))
    .filter((r) => Number.isFinite(r.time) && r.time >= 0);
}

export function parseForestRows(table: ParsedTable): ForestRow[] {
  const { headers, rows } = table;
  const varCol = findColumn(headers, ['variable', 'term', 'feature', 'study', 'name']) ?? headers[0];
  const hrCol = findColumn(headers, ['hr', 'or', 'estimate', 'ratio', 'effect']) ?? headers[1];
  const loCol = findColumn(headers, ['ci_low', 'cilow', 'lower', 'low', 'lcl']) ?? headers[2];
  const hiCol = findColumn(headers, ['ci_high', 'cihigh', 'upper', 'high', 'ucl']) ?? headers[3];
  const pCol = findColumn(headers, ['pvalue', 'p_value', 'p', 'pval']);
  return rows
    .map((r) => ({
      variable: (r[varCol] ?? '').trim(),
      hr: Number(r[hrCol]),
      ciLow: Number(r[loCol]),
      ciHigh: Number(r[hiCol]),
      pValue: pCol ? Number(r[pCol]) : 0.05,
    }))
    .filter((r) => r.variable && r.hr > 0 && r.ciLow > 0 && r.ciHigh > 0);
}

export function parseROCRows(table: ParsedTable): ROCInputRow[] {
  const { headers, rows } = table;
  const lblCol = findColumn(headers, ['label', 'truth', 'y', 'class', 'outcome', 'status']) ?? headers[0];
  const scoreCol = findColumn(headers, ['score', 'prob', 'prediction', 'biomarker', 'value']) ?? headers[1];
  const modCol = findColumn(headers, ['model', 'biomarker_name', 'group', 'signature']);
  return rows
    .map((r) => ({
      model: modCol ? (r[modCol] ?? 'Model').trim() : 'Biomarker',
      label: (Number(r[lblCol]) >= 1 ? 1 : 0) as 0 | 1,
      score: Number(r[scoreCol]),
    }))
    .filter((r) => Number.isFinite(r.score));
}

export function parsePairXYRows(table: ParsedTable): PairXYRow[] {
  const { headers, rows } = table;
  const numericCols = headers.filter((h) => Number.isFinite(Number(rows[0]?.[h])));
  const xCol = numericCols[0] ?? headers[0];
  const yCol = numericCols[1] ?? headers[1];
  const idCol = headers.find((h) => h !== xCol && h !== yCol);
  return rows
    .map((r, i) => ({
      id: idCol ? (r[idCol] ?? `S${i + 1}`) : `S${i + 1}`,
      x: Number(r[xCol]),
      y: Number(r[yCol]),
    }))
    .filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y));
}

/** Parse wide Gene x Sample expression matrix and compute row-wise z-scores */
export function parseHeatmapMatrix(table: ParsedTable): DEGHeatmapData | null {
  const { headers, rows } = table;
  if (headers.length < 3 || rows.length === 0) return null;
  const geneCol = headers[0];
  const sampleCols = headers.slice(1);
  const samples = sampleCols.map((id) => ({
    id,
    group: id.includes('_') ? id.split('_')[0] : id.replace(/\d+$/, '') || 'Group',
  }));
  const genes: string[] = [];
  const zMatrix: number[][] = [];
  for (const r of rows) {
    const g = (r[geneCol] ?? '').trim();
    if (!g) continue;
    const vals = sampleCols.map((c) => Number(r[c]));
    if (vals.some((v) => !Number.isFinite(v))) continue;
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const s = Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / Math.max(1, vals.length - 1)) || 1;
    genes.push(g);
    zMatrix.push(vals.map((v) => Number(Math.max(-2.5, Math.min(2.5, (v - m) / s)).toFixed(2))));
  }
  return genes.length > 0 ? { genes, samples, zMatrix } : null;
}

/** Parse tidy pseudotime table (pseudotime, gene, expression) into smoothed ribbons */
export function parsePseudotimeRows(table: ParsedTable): {
  stages: { label: string; start: number; end: number }[];
  series: PseudotimeGeneSeries[];
} | null {
  const { headers, rows } = table;
  const tCol = findColumn(headers, ['pseudotime', 'time', 't', 'pt']) ?? headers[0];
  const gCol = findColumn(headers, ['gene', 'marker', 'feature']) ?? headers[1];
  const eCol = findColumn(headers, ['expression', 'expr', 'value', 'y']) ?? headers[2];
  const byGene = new Map<string, { t: number; v: number }[]>();
  for (const r of rows) {
    const t = Number(r[tCol]);
    const v = Number(r[eCol]);
    const g = (r[gCol] ?? '').trim();
    if (!g || !Number.isFinite(t) || !Number.isFinite(v)) continue;
    if (!byGene.has(g)) byGene.set(g, []);
    byGene.get(g)!.push({ t, v });
  }
  if (byGene.size === 0) return null;
  const allT = [...byGene.values()].flat().map((x) => x.t);
  const tMin = Math.min(...allT);
  const tMax = Math.max(...allT);
  const span = tMax - tMin || 1;
  const series: PseudotimeGeneSeries[] = [...byGene.entries()].slice(0, 6).map(([gene, pts]) => {
    const normPts = pts.map((p) => ({ t: (p.t - tMin) / span, v: p.v }));
    const smoothed = Array.from({ length: 25 }, (_, i) => {
      const gridT = i / 24;
      let wSum = 0;
      let ySum = 0;
      for (const p of normPts) {
        const w = Math.exp(-((p.t - gridT) ** 2) / 0.018);
        wSum += w;
        ySum += w * p.v;
      }
      const meanVal = wSum > 0 ? ySum / wSum : 0;
      let varSum = 0;
      for (const p of normPts) {
        const w = Math.exp(-((p.t - gridT) ** 2) / 0.018);
        varSum += w * (p.v - meanVal) ** 2;
      }
      const sdVal = wSum > 0 ? Math.sqrt(varSum / wSum) : 0.2;
      return { t: gridT, mean: Number(meanVal.toFixed(3)), ci: Number(Math.min(0.8, sdVal * 0.6).toFixed(3)) };
    });
    return { gene, points: smoothed };
  });
  return {
    stages: [
      { label: 'Early', start: 0, end: 0.33 },
      { label: 'Intermediate', start: 0.33, end: 0.67 },
      { label: 'Late', start: 0.67, end: 1.0 },
    ],
    series,
  };
}
