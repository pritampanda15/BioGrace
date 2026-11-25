import React, { useMemo } from 'react';
import type { DEPlotConfig } from '../../types/biograce';
import type { PairXYRow } from '../../lib/bioAnalytics';
import type { EditablePlotField } from '../ui/InlinePlotEditor';
import { computeCorrelationBlandAltman } from '../../lib/bioAnalytics';
import { formatPValue } from '../../lib/statsEngine';
import { resolvePlotTheme } from '../../lib/palettes';

interface CorrelationBlandAltmanPlotProps {
  rows: PairXYRow[];
  viewMode: 'correlation' | 'bland-altman';
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: (field: EditablePlotField, label: string, currentValue: string) => void;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 64, right: 44, bottom: 66, left: 78 };

export const CorrelationBlandAltmanPlot: React.FC<CorrelationBlandAltmanPlotProps> = ({
  rows,
  viewMode,
  config,
  darkMode,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette } = theme;
  const stats = useMemo(() => computeCorrelationBlandAltman(rows), [rows]);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const strokeHalo = paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const gridColor = paperBg ? '#CBD5E1' : '#334155';
  const baseFs = 12 * theme.fontScale;
  const tickLen = theme.tickDirection === 'in' ? -5.5 : 5.5;

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const isBA = viewMode === 'bland-altman';
  const xs = isBA ? stats.baPoints.map((p) => p.avg) : rows.map((r) => r.x);
  const ys = isBA ? stats.baPoints.map((p) => p.diff) : rows.map((r) => r.y);

  const xMin = Math.floor(Math.min(...xs)) - 0.5;
  const xMax = Math.ceil(Math.max(...xs)) + 0.5;
  const yLoRaw = isBA ? Math.min(...ys, stats.loaLower) : Math.min(...ys);
  const yHiRaw = isBA ? Math.max(...ys, stats.loaUpper) : Math.max(...ys);
  const yPad = (yHiRaw - yLoRaw) * 0.16 || 1;
  const yMin = yLoRaw - yPad;
  const yMax = yHiRaw + yPad;

  const toX = (v: number) => MARGIN.left + ((v - xMin) / (xMax - xMin || 1)) * plotW;
  const toY = (v: number) => MARGIN.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const xTicks = Array.from({ length: 5 }, (_, i) => Number((xMin + ((xMax - xMin) * i) / 4).toFixed(1)));
  const yTicks = Array.from({ length: 5 }, (_, i) => Number((yMin + ((yMax - yMin) * i) / 4).toFixed(1)));

  const defaultTitle = isBA
    ? 'Bland–Altman Assay Agreement'
    : 'Method Validation Correlation (qPCR vs. RNA-seq)';
  const defaultSub = isBA
    ? `Mean bias = ${stats.bias > 0 ? '+' : ''}${stats.bias.toFixed(2)} · 95% Limits of Agreement: [${stats.loaLower.toFixed(2)}, ${stats.loaUpper.toFixed(2)}] · n = ${stats.n}`
    : `Pearson r = ${stats.pearsonR.toFixed(3)} (p = ${formatPValue(stats.pearsonP)}) · Spearman ρ = ${stats.spearmanRho.toFixed(3)} · R² = ${stats.rSquared.toFixed(3)}`;

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto rounded-2xl"
        style={{ fontFamily: theme.fontFamilyCss }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={16} fill={bgFill} />

        <text
          x={MARGIN.left}
          y={28}
          fill={inkPrimary}
          fontSize={baseFs + 3.5}
          fontWeight={700}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('title', 'Plot Title', config.title || defaultTitle);
          }}
        >
          {config.title || defaultTitle}
        </text>
        <text
          x={MARGIN.left}
          y={46}
          fill={inkSecondary}
          fontSize={baseFs - 1}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('subtitle', 'Subtitle', config.subtitle || defaultSub);
          }}
        >
          {config.subtitle || defaultSub}
        </text>

        {/* Grid */}
        <g stroke={gridColor} strokeOpacity={0.32} strokeDasharray="3 3" strokeWidth={0.7}>
          {yTicks.map((t) => (
            <line key={`bg-${t}`} x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(t)} y2={toY(t)} />
          ))}
        </g>

        {/* Spines */}
        <g stroke={inkAxis} strokeWidth={theme.axesLinewidth}>
          <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH} />
          <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + plotH} />
          {theme.topRightSpines && (
            <>
              <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={MARGIN.top} y2={MARGIN.top} />
              <line x1={MARGIN.left + plotW} x2={MARGIN.left + plotW} y1={MARGIN.top} y2={MARGIN.top + plotH} />
            </>
          )}
        </g>

        {/* Ticks */}
        <g fill={inkSecondary} fontSize={baseFs - 1}>
          {xTicks.map((t) => (
            <g key={`cx-${t}`}>
              <line x1={toX(t)} x2={toX(t)} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={toX(t)} y={MARGIN.top + plotH + 20} textAnchor="middle">{t}</text>
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={`cy-${t}`}>
              <line x1={MARGIN.left} x2={MARGIN.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={MARGIN.left - 11} y={toY(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
        </g>

        {isBA ? (
          <>
            {/* Shaded 95% Limits of Agreement Band */}
            <rect
              x={MARGIN.left}
              y={toY(stats.loaUpper)}
              width={plotW}
              height={Math.max(2, toY(stats.loaLower) - toY(stats.loaUpper))}
              fill={palette.colors[0]}
              fillOpacity={0.08}
            />
            <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(0)} y2={toY(0)} stroke={inkSecondary} strokeOpacity={0.45} />
            <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(stats.bias)} y2={toY(stats.bias)} stroke={palette.colors[0]} strokeWidth={theme.lineWidth * 1.8} />
            <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(stats.loaUpper)} y2={toY(stats.loaUpper)} stroke={palette.upColor} strokeDasharray="5 4" strokeWidth={1.3} />
            <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(stats.loaLower)} y2={toY(stats.loaLower)} stroke={palette.upColor} strokeDasharray="5 4" strokeWidth={1.3} />
            <text x={MARGIN.left + plotW - 6} y={toY(stats.loaUpper) - 6} textAnchor="end" fill={palette.upColor} fontSize={baseFs - 1.5} fontWeight={600}>
              +1.96 SD ({stats.loaUpper.toFixed(2)})
            </text>
            <text x={MARGIN.left + plotW - 6} y={toY(stats.bias) - 6} textAnchor="end" fill={palette.colors[0]} fontSize={baseFs - 1.5} fontWeight={700}>
              Mean Bias ({stats.bias > 0 ? '+' : ''}{stats.bias.toFixed(2)})
            </text>
            <text x={MARGIN.left + plotW - 6} y={toY(stats.loaLower) + 14} textAnchor="end" fill={palette.upColor} fontSize={baseFs - 1.5} fontWeight={600}>
              −1.96 SD ({stats.loaLower.toFixed(2)})
            </text>
            {stats.baPoints.map((p) => (
              <circle key={p.id} cx={toX(p.avg)} cy={toY(p.diff)} r={5} fill={palette.colors[0]} fillOpacity={0.85} stroke={strokeHalo} strokeWidth={1.3} />
            ))}
          </>
        ) : (
          <>
            {/* Identity line y = x */}
            <line
              x1={toX(Math.max(xMin, yMin))}
              y1={toY(Math.max(xMin, yMin))}
              x2={toX(Math.min(xMax, yMax))}
              y2={toY(Math.min(xMax, yMax))}
              stroke={inkSecondary}
              strokeOpacity={0.45}
              strokeDasharray="4 4"
            />
            {/* OLS regression fit line */}
            <line
              x1={toX(xMin)}
              y1={toY(stats.slope * xMin + stats.intercept)}
              x2={toX(xMax)}
              y2={toY(stats.slope * xMax + stats.intercept)}
              stroke={palette.colors[0]}
              strokeWidth={theme.lineWidth * 2}
            />
            {rows.map((r) => (
              <circle key={r.id} cx={toX(r.x)} cy={toY(r.y)} r={5} fill={palette.colors[0]} fillOpacity={0.82} stroke={strokeHalo} strokeWidth={1.3} />
            ))}
          </>
        )}

        {/* Axis Titles */}
        <text
          x={MARGIN.left + plotW / 2}
          y={HEIGHT - 16}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs + 0.5}
          fontWeight={600}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField(
              'xLabel',
              'X-Axis Label',
              config.xLabel || (isBA ? 'Average of Method A & Method B' : 'RNA-seq Expression (log2 TPM)')
            );
          }}
        >
          {config.xLabel || (isBA ? 'Average of Method A & Method B' : 'RNA-seq Expression (log2 TPM)')}
        </text>
        <text
          transform={`translate(22, ${MARGIN.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs + 0.5}
          fontWeight={600}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField(
              'yLabel',
              'Y-Axis Label',
              config.yLabel || (isBA ? 'Difference (Method B − Method A)' : 'RT-qPCR Expression (−ΔCt)')
            );
          }}
        >
          {config.yLabel || (isBA ? 'Difference (Method B − Method A)' : 'RT-qPCR Expression (−ΔCt)')}
        </text>
      </svg>
    </div>
  );
};
