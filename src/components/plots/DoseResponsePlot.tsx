import React, { useMemo } from 'react';
import type { DEPlotConfig } from '../../types/biograce';
import type { DosePoint, HillFitResult } from '../../lib/bioAnalytics';
import type { OnEditPlotField } from '../ui/InlinePlotEditor';
import { fitDoseResponse4PL, formatConc } from '../../lib/bioAnalytics';
import { resolvePlotTheme } from '../../lib/palettes';

interface DoseResponsePlotProps {
  points: DosePoint[];
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: OnEditPlotField;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 64, right: 44, bottom: 68, left: 78 };

export const DoseResponsePlot: React.FC<DoseResponsePlotProps> = ({
  points,
  config,
  darkMode,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette } = theme;

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const strokeHalo = paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const gridColor = paperBg ? '#CBD5E1' : '#334155';
  const baseFs = 12 * theme.fontScale;
  const tickLen = theme.tickDirection === 'in' ? -5.5 : 5.5;

  const fits: HillFitResult[] = useMemo(() => {
    const comps: string[] = [];
    for (const p of points) if (!comps.includes(p.compound)) comps.push(p.compound);
    return comps.map((c) => fitDoseResponse4PL(c, points.filter((p) => p.compound === c)));
  }, [points]);

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const allLogC = points.filter((p) => p.conc > 0).map((p) => Math.log10(p.conc));
  const xMin = Math.floor(Math.min(...allLogC, -3)) - 0.35;
  const xMax = Math.ceil(Math.max(...allLogC, 1)) + 0.35;
  const yMin = 0;
  const yMax = Math.max(112, Math.ceil(Math.max(...points.map((p) => p.response)) / 10) * 10);

  const toX = (lc: number) => MARGIN.left + ((lc - xMin) / (xMax - xMin || 1)) * plotW;
  const toY = (v: number) => MARGIN.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const xTicks: number[] = [];
  for (let t = Math.ceil(xMin); t <= Math.floor(xMax); t++) xTicks.push(t);
  const yTicks = [0, 25, 50, 75, 100];

  const defaultSub = fits
    .map((f) => `${f.compound}: IC50 = ${formatConc(f.ic50)} (Hill = ${f.hillSlope.toFixed(2)}, R² = ${f.rSquared.toFixed(3)})`)
    .join('  ·  ');

  return (
    <div className="relative w-full select-none space-y-3">
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
            onEditField('title', 'Plot Title', config.title || 'Dose–Response Inhibition Curve (4PL Hill Fit)');
          }}
        >
          {config.title || 'Dose–Response Inhibition Curve (4PL Hill Fit)'}
        </text>
        <text
          x={MARGIN.left}
          y={46}
          fill={inkSecondary}
          fontSize={baseFs - 1.2}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('subtitle', 'Subtitle', config.subtitle || defaultSub);
          }}
        >
          {config.subtitle || defaultSub}
        </text>

        {/* Grid & 50% Reference Line */}
        <g stroke={gridColor} strokeOpacity={0.35} strokeDasharray="3 3" strokeWidth={0.7}>
          {yTicks.map((t) => (
            <line key={t} x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(t)} y2={toY(t)} />
          ))}
        </g>
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + plotW}
          y1={toY(50)}
          y2={toY(50)}
          stroke={inkSecondary}
          strokeOpacity={0.55}
          strokeDasharray="5 4"
          strokeWidth={1.1}
        />
        <text x={MARGIN.left + plotW - 4} y={toY(50) - 5} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 2}>
          50% Response
        </text>

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
            <g key={`dx-${t}`}>
              <line x1={toX(t)} x2={toX(t)} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={toX(t)} y={MARGIN.top + plotH + 20} textAnchor="middle">
                {`10^${t}`}
              </text>
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={`dy-${t}`}>
              <line x1={MARGIN.left} x2={MARGIN.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={MARGIN.left - 11} y={toY(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
        </g>

        {/* 4PL Curves, IC50 Drop-Lines, and Raw Replicate Dots */}
        {fits.map((fit, idx) => {
          const col = palette.colors[idx % palette.colors.length];
          const pathD = fit.curve
            .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.logConc).toFixed(1)} ${toY(pt.y).toFixed(1)}`)
            .join(' ');
          const icX = toX(fit.log10Ic50);
          const midY = toY((fit.top + fit.bottom) / 2);

          return (
            <g key={fit.compound}>
              {/* Vertical IC50 Drop Line */}
              <line
                x1={icX}
                x2={icX}
                y1={midY}
                y2={MARGIN.top + plotH}
                stroke={col}
                strokeDasharray="4 3"
                strokeWidth={1.2}
                strokeOpacity={0.75}
              />
              <path d={pathD} fill="none" stroke={col} strokeWidth={theme.lineWidth * 2.1} strokeLinecap="round" />
              {fit.points.map((pt, k) => (
                <circle
                  key={k}
                  cx={toX(Math.log10(pt.conc))}
                  cy={toY(pt.response)}
                  r={4.2}
                  fill={col}
                  fillOpacity={0.72}
                  stroke={strokeHalo}
                  strokeWidth={1.1}
                />
              ))}
              {/* IC50 inflection marker */}
              <circle cx={icX} cy={midY} r={5.8} fill={strokeHalo} stroke={col} strokeWidth={2.4} />
              <text
                x={icX + (idx === 0 ? -10 : 10)}
                y={midY - 12}
                textAnchor={idx === 0 ? 'end' : 'start'}
                fill={col}
                fontSize={baseFs - 1}
                fontWeight={700}
                paintOrder="stroke"
                stroke={strokeHalo}
                strokeWidth={4}
                strokeLinejoin="round"
              >
                IC50 = {formatConc(fit.ic50)}
              </text>
            </g>
          );
        })}

        {/* Legend (Top Right inside plot — click to edit compound names) */}
        <g transform={`translate(${WIDTH - MARGIN.right - 220}, ${MARGIN.top + 16})`}>
          {fits.map((f, i) => {
            const lbl = config.legendLabels?.[`dose_${f.compound}`] ?? f.compound;
            return (
              <g key={f.compound} transform={`translate(0, ${i * 22})`}>
                <line x1={0} x2={18} y1={0} y2={0} stroke={palette.colors[i % palette.colors.length]} strokeWidth={2.8} />
                <circle cx={9} cy={0} r={3.5} fill={palette.colors[i % palette.colors.length]} />
                <text
                  x={24}
                  y={4}
                  fill={inkPrimary}
                  fontSize={baseFs - 1}
                  fontWeight={600}
                  style={{ cursor: 'text' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onEditField('legend', `Compound (${f.compound})`, lbl, `dose_${f.compound}`);
                  }}
                >
                  {lbl}
                </text>
              </g>
            );
          })}
        </g>

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
            onEditField('xLabel', 'X-Axis Label', config.xLabel || 'Log10 Concentration (µM)');
          }}
        >
          {config.xLabel || 'Log10 Concentration (µM)'}
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
            onEditField('yLabel', 'Y-Axis Label', config.yLabel || 'Cell Viability (% of DMSO)');
          }}
        >
          {config.yLabel || 'Cell Viability (% of DMSO)'}
        </text>
      </svg>

      {/* Parameter Fit Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs tabular-nums">
        {fits.map((f, idx) => (
          <div key={f.compound} className="rounded-xl p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: palette.colors[idx % palette.colors.length] }} />
                {f.compound}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Hill Slope: <strong>{f.hillSlope.toFixed(2)}</strong> · R²: <strong>{f.rSquared.toFixed(3)}</strong> · Bottom: {f.bottom.toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-[var(--text-tertiary)] font-semibold">IC50</div>
              <div className="text-sm font-bold text-[var(--accent)]">{formatConc(f.ic50)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
