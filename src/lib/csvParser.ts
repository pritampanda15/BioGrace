import Papa from 'papaparse';
import type {
  DotPlotRow,
  PathwayRow,
  TidyStatRow,
  UpSetItem,
  VolcanoRow,
} from '../types/biograce';

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
