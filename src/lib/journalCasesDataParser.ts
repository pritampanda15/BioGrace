import type { ParsedTable } from './csvParser';
import type { JournalCaseId } from './journalCasesCatalog';

export function pickCol(headers: string[], candidates: string[], fallbackIdx = 0): string {
  const lower = new Map(headers.map((h) => [h.toLowerCase().trim(), h]));
  for (const c of candidates) {
    const exact = lower.get(c.toLowerCase());
    if (exact) return exact;
  }
  for (const c of candidates) {
    const partial = headers.find((h) => h.toLowerCase().includes(c.toLowerCase()));
    if (partial) return partial;
  }
  return headers[Math.min(fallbackIdx, Math.max(0, headers.length - 1))] ?? '';
}

export function niceTicks(minVal: number, maxVal: number, count = 5): number[] {
  const span = maxVal - minVal || 1;
  const rawStep = span / Math.max(1, count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const niceStep = norm <= 1.2 ? 1 * mag : norm <= 2.5 ? 2 * mag : norm <= 5.5 ? 5 * mag : 10 * mag;
  const start = Math.ceil(minVal / niceStep) * niceStep;
  const out: number[] = [];
  for (let v = start; v <= maxVal + niceStep * 0.001; v += niceStep) {
    out.push(Number(v.toFixed(4)));
    if (out.length > 10) break;
  }
  return out.length >= 2 ? out : [Number(minVal.toFixed(1)), Number(maxVal.toFixed(1))];
}

/** Auto-detect if a CSV matches one of the 20 Journal Figure schemas */
export function detectJournalCaseForCsv(table: ParsedTable): JournalCaseId | null {
  const lo = table.headers.map((h) => h.toLowerCase().trim());
  const has = (ks: string[]) => ks.some((k) => lo.some((h) => h === k || h.includes(k)));

  if (has(['from_chr', 'chr1']) && has(['to_chr', 'chr2'])) return '10-circos-fusion';
  if (has(['mantel_r', 'mantel_p'])) return '14-mantel-composite';
  if (has(['pr_month', 'cr_month', 'ongoing'])) return '07-swimmer';
  if (has(['cld_letter', 'group_sig'])) return '09-cld-variance-bars';
  if (has(['superfamily']) && has(['pathway'])) return '18-treemap';
  if (has(['lineage']) && has(['subtype'])) return '19-mosaic-sunburst';
  if (has(['gene_ratio']) && has(['pathway']) && has(['gene'])) return '12-sankey-bubble';
  if (has(['ring']) && has(['zscore'])) return '16-polar-heatmap';
  if (has(['chr']) && has(['pos', 'bp']) && has(['pvalue', 'p'])) return '04-manhattan-twas';
  if (has(['from', 'source']) && has(['to', 'target']) && has(['module', 'community'])) return '11-module-network';
  if (has(['var1']) && has(['var2']) && has(['cohort'])) return '15-multi-corr-heatmap';
  if (has(['freq']) && table.headers.length >= 4) return '17-multilevel-sankey';
  if (has(['importance', 'shap']) && table.headers.length >= 4) return '08-importance-streams';
  if (has(['marker']) && has(['condition']) && has(['expression'])) return '20-split-violin';
  if (has(['genotype']) && has(['treatment']) && has(['value'])) return '02-grouped-error-dotplot';
  if (has(['taxon']) && has(['sample']) && has(['zscore'])) return '13-binned-heatmap';
  if (has(['cluster']) && has(['gene']) && has(['log2fc', 'avg_log2fc'])) return '03-multi-volcano';
  return null;
}

export function quartiles(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) return { min: 0, q1: 0, med: 0, q3: 0, max: 0 };
  const at = (p: number) => {
    const idx = p * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
  };
  return { min: s[0], q1: at(0.25), med: at(0.5), q3: at(0.75), max: s[n - 1] };
}
