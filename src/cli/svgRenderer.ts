import type {
  DEPlotConfig,
  StatisticalRecommendation,
  StatsConfig,
  VolcanoRow,
} from '../types/biograce';
import { JOURNAL_PRESETS } from '../lib/palettes';
import { computeBeeswarmOffsets, computeKDE, formatPValue } from '../lib/statsEngine';

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Headless vector SVG renderer for Volcano / MA plots (used by BioGrace CLI) */
export function renderVolcanoMASvgString(rows: VolcanoRow[], config: DEPlotConfig): string {
  const preset = JOURNAL_PRESETS[config.preset];
  const W = 840;
  const H = 560;
  const M = { top: 58, right: 44, bottom: 64, left: 74 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const isVolcano = config.plotType !== 'ma';

  const negLogPs = rows.map((r) => Math.min(50, -Math.log10(Math.max(1e-50, r.padj))));
  const logMeans = rows.map((r) => Math.log10(Math.max(1, r.baseMean)));
  const maxAbsFc = Math.max(2.5, Math.ceil(Math.max(...rows.map((r) => Math.abs(r.log2FC)), config.fcThreshold + 0.5)));

  const xMin = isVolcano ? -maxAbsFc : Math.floor(Math.min(...logMeans, 0.5));
  const xMax = isVolcano ? maxAbsFc : Math.ceil(Math.max(...logMeans, 4.5));
  const yMin = isVolcano ? 0 : -maxAbsFc;
  const yMax = isVolcano ? Math.max(5, Math.ceil(Math.max(...negLogPs) * 1.12)) : maxAbsFc;

  const toX = (v: number) => M.left + ((v - xMin) / (xMax - xMin || 1)) * plotW;
  const toY = (v: number) => M.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  let up = 0;
  let down = 0;
  let ns = 0;
  const labelSet = new Set(config.labeledGenes);
  const circles: string[] = [];
  const labels: string[] = [];

  rows.forEach((r, idx) => {
    const nlp = negLogPs[idx];
    const lm = logMeans[idx];
    const isSig = r.padj <= config.fdrThreshold;
    const status = isSig && r.log2FC >= config.fcThreshold ? 'up' : isSig && r.log2FC <= -config.fcThreshold ? 'down' : 'ns';
    if (status === 'up') up++;
    else if (status === 'down') down++;
    else ns++;

    const cx = toX(isVolcano ? r.log2FC : lm);
    const cy = toY(isVolcano ? nlp : r.log2FC);
    const fill = status === 'up' ? preset.upColor : status === 'down' ? preset.downColor : preset.nsColor;
    const isLbl = labelSet.has(r.gene);
    circles.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${isLbl ? config.pointSize + 1.5 : config.pointSize}" fill="${fill}" fill-opacity="${status === 'ns' ? 0.5 : 0.88}" ${isLbl ? 'stroke="#1D1D1F" stroke-width="1.3"' : ''}/>`
    );
    if (isLbl) {
      const dx = r.log2FC >= 0 ? 14 : -14;
      const dy = -12;
      const anchor = dx >= 0 ? 'start' : 'end';
      labels.push(
        `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy + dy).toFixed(1)}" stroke="#1D1D1F" stroke-opacity="0.55" stroke-width="0.9"/>`,
        `<text x="${(cx + dx + (dx >= 0 ? 3 : -3)).toFixed(1)}" y="${(cy + dy + 3).toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="#1D1D1F">${esc(r.gene)}</text>`
      );
    }
  });

  const fdrY = toY(-Math.log10(Math.max(1e-50, config.fdrThreshold)));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family: ${esc(preset.fontFamily)}">
  <rect width="${W}" height="${H}" rx="16" fill="#FFFFFF"/>
  <text x="${M.left}" y="28" font-size="16" font-weight="700" fill="#1D1D1F">${esc(config.title)}</text>
  <text x="${M.left}" y="46" font-size="11.5" fill="#515154">${isVolcano ? 'Volcano' : 'MA'} · |log2FC| &gt;= ${config.fcThreshold}, FDR &lt;= ${config.fdrThreshold} · Up ${up} / Down ${down} / NS ${ns}</text>
  ${
    isVolcano
      ? `<line x1="${toX(config.fcThreshold).toFixed(1)}" x2="${toX(config.fcThreshold).toFixed(1)}" y1="${M.top}" y2="${M.top + plotH}" stroke="#64748B" stroke-dasharray="5 4" stroke-width="1.1"/>
         <line x1="${toX(-config.fcThreshold).toFixed(1)}" x2="${toX(-config.fcThreshold).toFixed(1)}" y1="${M.top}" y2="${M.top + plotH}" stroke="#64748B" stroke-dasharray="5 4" stroke-width="1.1"/>
         <line x1="${M.left}" x2="${M.left + plotW}" y1="${fdrY.toFixed(1)}" y2="${fdrY.toFixed(1)}" stroke="#64748B" stroke-dasharray="5 4" stroke-width="1.1"/>`
      : `<line x1="${M.left}" x2="${M.left + plotW}" y1="${toY(0).toFixed(1)}" y2="${toY(0).toFixed(1)}" stroke="#64748B" stroke-width="1"/>`
  }
  <line x1="${M.left}" x2="${M.left + plotW}" y1="${M.top + plotH}" y2="${M.top + plotH}" stroke="#1D1D1F" stroke-width="${preset.axisWidth}"/>
  <line x1="${M.left}" x2="${M.left}" y1="${M.top}" y2="${M.top + plotH}" stroke="#1D1D1F" stroke-width="${preset.axisWidth}"/>
  <text x="${M.left + plotW / 2}" y="${H - 16}" text-anchor="middle" font-size="13" font-weight="600" fill="#1D1D1F">${isVolcano ? 'log2 Fold Change' : 'log10 Mean Expression'}</text>
  <text transform="translate(22, ${M.top + plotH / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="600" fill="#1D1D1F">${isVolcano ? '-log10 Adjusted P-value (FDR)' : 'log2 Fold Change'}</text>
  ${circles.join('\n  ')}
  ${labels.join('\n  ')}
</svg>`;
}

/** Headless vector SVG renderer for Raincloud Anti-Barplot (used by BioGrace CLI) */
export function renderRaincloudSvgString(
  analysis: StatisticalRecommendation,
  config: StatsConfig
): string {
  const preset = JOURNAL_PRESETS[config.preset];
  const W = 840;
  const H = 560;
  const M = { top: 76, right: 44, bottom: 72, left: 78 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const groups = analysis.groups;
  const allVals = groups.flatMap((g) => g.values);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const span = Math.max(1e-3, rawMax - rawMin);
  const yMin = rawMin - span * 0.14;
  const yMax = rawMax + span * 0.28;
  const toY = (v: number) => M.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const step = plotW / Math.max(1, groups.length);
  const centerX = (idx: number) => M.left + (idx + 0.5) * step;

  const layers: string[] = [];
  groups.forEach((g, idx) => {
    const cx = centerX(idx);
    const color = preset.categorical[idx % preset.categorical.length];
    const kdeLo = Math.max(yMin, g.min - g.sd * 0.45);
    const kdeHi = Math.min(yMax, g.max + g.sd * 0.45);
    const kde = computeKDE(g.values, kdeLo, kdeHi, 48);
    const maxD = Math.max(1e-9, ...kde.map((p) => p.density));
    const maxW = Math.min(60, step * 0.3);
    const baseX = cx + 10;
    const dPath = [
      `M ${baseX} ${toY(kde[0].y).toFixed(1)}`,
      ...kde.map((p) => `L ${(baseX + (p.density / maxD) * maxW).toFixed(1)} ${toY(p.y).toFixed(1)}`),
      `L ${baseX} ${toY(kde[kde.length - 1].y).toFixed(1)} Z`,
    ].join(' ');

    const pys = g.values.map((v) => toY(v));
    const offsets = computeBeeswarmOffsets(pys, 4, Math.min(26, step * 0.14));
    const dots = pys
      .map(
        (py, i) =>
          `<circle cx="${(cx - 22 + offsets[i]).toFixed(1)}" cy="${py.toFixed(1)}" r="4" fill="${color}" fill-opacity="0.88" stroke="#FFFFFF" stroke-width="1"/>`
      )
      .join('\n  ');

    const boxX = cx - 2;
    const boxW = 18;
    layers.push(
      `<path d="${dPath}" fill="${color}" fill-opacity="0.26" stroke="${color}" stroke-width="1.5"/>`,
      `<line x1="${boxX + boxW / 2}" x2="${boxX + boxW / 2}" y1="${toY(g.whiskerHigh).toFixed(1)}" y2="${toY(g.whiskerLow).toFixed(1)}" stroke="#1D1D1F" stroke-width="1.3"/>`,
      `<rect x="${boxX}" y="${toY(g.q3).toFixed(1)}" width="${boxW}" height="${Math.max(2, toY(g.q1) - toY(g.q3)).toFixed(1)}" rx="3" fill="${color}" fill-opacity="0.2" stroke="#1D1D1F" stroke-width="1.4"/>`,
      `<line x1="${boxX}" x2="${boxX + boxW}" y1="${toY(g.median).toFixed(1)}" y2="${toY(g.median).toFixed(1)}" stroke="#1D1D1F" stroke-width="2.3"/>`,
      dots,
      `<text x="${cx}" y="${M.top + plotH + 22}" text-anchor="middle" font-size="12.5" font-weight="600" fill="#1D1D1F">${esc(g.group)}</text>`,
      `<text x="${cx}" y="${M.top + plotH + 38}" text-anchor="middle" font-size="10.5" fill="#515154">n = ${g.n}</text>`
    );
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="font-family: ${esc(preset.fontFamily)}">
  <rect width="${W}" height="${H}" rx="16" fill="#FFFFFF"/>
  <text x="${M.left}" y="28" font-size="16" font-weight="700" fill="#1D1D1F">${esc(config.title)}</text>
  <text x="${M.left}" y="48" font-size="11.5" fill="#515154">${esc(analysis.primaryTest)} · Omnibus p = ${formatPValue(analysis.omnibus.pValue)} · n = ${analysis.totalN}</text>
  <line x1="${M.left}" x2="${M.left + plotW}" y1="${M.top + plotH}" y2="${M.top + plotH}" stroke="#1D1D1F" stroke-width="${preset.axisWidth}"/>
  <line x1="${M.left}" x2="${M.left}" y1="${M.top}" y2="${M.top + plotH}" stroke="#1D1D1F" stroke-width="${preset.axisWidth}"/>
  <text x="${M.left + plotW / 2}" y="${H - 16}" text-anchor="middle" font-size="13" font-weight="600" fill="#1D1D1F">${esc(config.xLabel)}</text>
  <text transform="translate(22, ${M.top + plotH / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="600" fill="#1D1D1F">${esc(config.yLabel)}</text>
  ${layers.join('\n  ')}
</svg>`;
}
