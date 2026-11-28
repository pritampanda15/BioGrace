import type { ParsedTable } from './csvParser';
import type { CsvTemplateKey } from './csvTemplates';

export interface ParsedWorkbook {
  fileName: string;
  sheetNames: string[];
  sheetsCsv: Record<string, string>;
}

/**
 * Lazy-load SheetJS (`xlsx`) only when the user drops an .xlsx/.xls workbook
 * so initial page load stays lean.
 */
export async function parseExcelWorkbook(file: File): Promise<ParsedWorkbook> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetsCsv: Record<string, string> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    sheetsCsv[name] = XLSX.utils.sheet_to_csv(ws, { blankrows: false });
  }
  return {
    fileName: file.name,
    sheetNames: wb.SheetNames,
    sheetsCsv,
  };
}

export interface ColumnRoleSpec {
  targetHeader: string;
  label: string;
  required: boolean;
  aliases: string[];
}

export const PLOT_COLUMN_ROLES: Partial<Record<CsvTemplateKey, ColumnRoleSpec[]>> = {
  volcano: [
    { targetHeader: 'gene', label: 'Gene / Feature ID', required: true, aliases: ['gene', 'symbol', 'gene_symbol', 'names', 'feature', 'id'] },
    { targetHeader: 'log2FoldChange', label: 'Log2 Fold Change', required: true, aliases: ['log2foldchange', 'avg_log2fc', 'logfc', 'log2fc', 'lfc'] },
    { targetHeader: 'padj', label: 'Adjusted P-Value / FDR', required: true, aliases: ['padj', 'fdr', 'p_val_adj', 'adj.p.val', 'qvalue', 'pvalue'] },
    { targetHeader: 'baseMean', label: 'Mean Expression (optional)', required: false, aliases: ['basemean', 'aveexpr', 'logcpm', 'mean', 'expr'] },
  ],
  ma: [
    { targetHeader: 'gene', label: 'Gene / Feature ID', required: true, aliases: ['gene', 'symbol', 'id'] },
    { targetHeader: 'baseMean', label: 'Mean Expression (A-axis)', required: true, aliases: ['basemean', 'aveexpr', 'logcpm', 'mean'] },
    { targetHeader: 'log2FoldChange', label: 'Log2 Fold Change (M-axis)', required: true, aliases: ['log2foldchange', 'logfc', 'log2fc', 'lfc'] },
    { targetHeader: 'padj', label: 'Adjusted P-Value / FDR', required: true, aliases: ['padj', 'fdr', 'adj.p.val', 'pvalue'] },
  ],
  'stats-tidy': [
    { targetHeader: 'group', label: 'Experimental Group / Arm', required: true, aliases: ['group', 'condition', 'treatment', 'dose', 'genotype', 'arm'] },
    { targetHeader: 'value', label: 'Measured Numeric Value', required: true, aliases: ['value', 'expression', 'viability', 'response', 'fold', 'measurement', 'signal', 'score'] },
    { targetHeader: 'subject', label: 'Subject / Donor ID (for pairing/replicates)', required: false, aliases: ['subject', 'donor', 'patient', 'mouse', 'bio_rep', 'pair', 'id'] },
  ],
  'dose-response': [
    { targetHeader: 'compound', label: 'Compound / Curve Name', required: false, aliases: ['compound', 'drug', 'group', 'treatment'] },
    { targetHeader: 'conc', label: 'Concentration (uM / nM)', required: true, aliases: ['conc', 'concentration', 'dose', 'um', 'nm', 'x'] },
    { targetHeader: 'response', label: 'Response / % Viability', required: true, aliases: ['response', 'viability', 'inhibition', 'activity', 'value', 'y'] },
  ],
  survival: [
    { targetHeader: 'time', label: 'Follow-up Time (Months / Days)', required: true, aliases: ['time', 'months', 'days', 'os_time', 'pfs', 'duration'] },
    { targetHeader: 'event', label: 'Event Status (1=Event, 0=Censored)', required: true, aliases: ['event', 'status', 'death', 'os_event'] },
    { targetHeader: 'group', label: 'Treatment Arm / Strata', required: true, aliases: ['group', 'arm', 'treatment', 'cohort'] },
  ],
  pca: [
    { targetHeader: 'sample', label: 'Sample ID', required: false, aliases: ['sample', 'id', 'name'] },
    { targetHeader: 'group', label: 'Condition / Group', required: true, aliases: ['group', 'condition', 'treatment', 'cluster'] },
    { targetHeader: 'PC1', label: 'PC1 Coordinate', required: true, aliases: ['pc1', 'pc_1', 'dim1', 'x'] },
    { targetHeader: 'PC2', label: 'PC2 Coordinate', required: true, aliases: ['pc2', 'pc_2', 'dim2', 'y'] },
  ],
  umap: [
    { targetHeader: 'UMAP_1', label: 'UMAP 1 (X)', required: true, aliases: ['umap_1', 'umap1', 'x'] },
    { targetHeader: 'UMAP_2', label: 'UMAP 2 (Y)', required: true, aliases: ['umap_2', 'umap2', 'y'] },
    { targetHeader: 'cluster', label: 'Cell Type / Cluster', required: true, aliases: ['cluster', 'cell_type', 'leiden', 'seurat_clusters', 'group'] },
    { targetHeader: 'condition', label: 'Condition (Ctrl vs Tx)', required: false, aliases: ['condition', 'treatment', 'stim', 'sample'] },
  ],
  forest: [
    { targetHeader: 'variable', label: 'Covariate / Subgroup', required: true, aliases: ['variable', 'term', 'study', 'feature', 'name'] },
    { targetHeader: 'hr', label: 'Hazard / Odds Ratio', required: true, aliases: ['hr', 'or', 'estimate', 'ratio'] },
    { targetHeader: 'ci_low', label: '95% CI Lower', required: true, aliases: ['ci_low', 'lower', 'low', 'lcl'] },
    { targetHeader: 'ci_high', label: '95% CI Upper', required: true, aliases: ['ci_high', 'upper', 'high', 'ucl'] },
    { targetHeader: 'pvalue', label: 'P-Value', required: false, aliases: ['pvalue', 'p_value', 'p', 'pval'] },
  ],
  roc: [
    { targetHeader: 'model', label: 'Biomarker / Model', required: false, aliases: ['model', 'biomarker_name', 'group', 'signature'] },
    { targetHeader: 'label', label: 'True Class (0 or 1)', required: true, aliases: ['label', 'truth', 'outcome', 'class'] },
    { targetHeader: 'score', label: 'Predicted Score / Value', required: true, aliases: ['score', 'prob', 'prediction', 'biomarker'] },
  ],
  correlation: [
    { targetHeader: 'sample', label: 'Sample ID', required: false, aliases: ['sample', 'id', 'name'] },
    { targetHeader: 'method_x', label: 'Method A (X)', required: true, aliases: ['x', 'qpcr', 'method_a', 'ref', 'baseline'] },
    { targetHeader: 'method_y', label: 'Method B (Y)', required: true, aliases: ['y', 'rnaseq', 'method_b', 'test', 'new'] },
  ],
  lollipop: [
    { targetHeader: 'pathway', label: 'Pathway / GO Term', required: true, aliases: ['pathway', 'term', 'description', 'name'] },
    { targetHeader: 'nes', label: 'NES / Enrichment Score', required: true, aliases: ['nes', 'enrichment', 'score', 'log2fc'] },
    { targetHeader: 'padj', label: 'Adjusted P-Value / FDR', required: true, aliases: ['padj', 'fdr', 'qvalue', 'p.adjust'] },
    { targetHeader: 'geneCount', label: 'Gene Count', required: false, aliases: ['genecount', 'count', 'size', 'overlap'] },
  ],
  dotplot: [
    { targetHeader: 'gene', label: 'Marker Gene', required: true, aliases: ['gene', 'marker', 'feature', 'symbol'] },
    { targetHeader: 'cluster', label: 'Cell Cluster', required: true, aliases: ['cluster', 'cell_type', 'group', 'identity'] },
    { targetHeader: 'avg_expr', label: 'Mean Expression', required: true, aliases: ['avg_expr', 'mean', 'scaled', 'expression'] },
    { targetHeader: 'pct_expr', label: '% Cells Expressing', required: true, aliases: ['pct_expr', 'pct', 'percent', 'fraction'] },
  ],
};

export function guessInitialColumnMapping(
  headers: string[],
  targetPlot: CsvTemplateKey
): Record<string, string> {
  const roles = PLOT_COLUMN_ROLES[targetPlot] ?? [];
  const mapping: Record<string, string> = {};
  const lowerHeaders = headers.map((h) => ({ raw: h, lo: h.toLowerCase().trim() }));

  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const exact = lowerHeaders.find((h) => role.aliases.includes(h.lo));
    const partial =
      exact ??
      lowerHeaders.find((h) => role.aliases.some((a) => h.lo.includes(a)));
    if (partial) {
      mapping[role.targetHeader] = partial.raw;
    } else if (role.required && headers[i]) {
      mapping[role.targetHeader] = headers[i];
    }
  }
  return mapping;
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

/**
 * Rebuild a clean CSV string with canonical target headers from an arbitrary table
 * using the user's explicit visual column mapping (preserving extra unmapped numeric columns).
 */
export function remapTableToCsv(
  table: ParsedTable,
  mapping: Record<string, string>,
  preserveUnmapped = false
): string {
  const mappedEntries = Object.entries(mapping).filter(([, src]) => Boolean(src));
  const usedSources = new Set(mappedEntries.map(([, src]) => src));
  const extraCols = preserveUnmapped
    ? table.headers.filter((h) => !usedSources.has(h))
    : [];

  const outHeaders = [...mappedEntries.map(([dst]) => dst), ...extraCols];
  const lines = [outHeaders.map(csvEscape).join(',')];

  for (const row of table.rows) {
    const vals = [
      ...mappedEntries.map(([, src]) => csvEscape((row[src] ?? '').trim())),
      ...extraCols.map((c) => csvEscape((row[c] ?? '').trim())),
    ];
    lines.push(vals.join(','));
  }
  return lines.join('\n');
}
