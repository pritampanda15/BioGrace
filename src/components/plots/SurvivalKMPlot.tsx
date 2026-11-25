import React, { useMemo } from 'react';
import type { DEPlotConfig } from '../../types/biograce';
import type { SurvivalRow } from '../../lib/bioAnalytics';
import type { EditablePlotField } from '../ui/InlinePlotEditor';
import { computeKaplanMeier } from '../../lib/bioAnalytics';
import { formatPValue } from '../../lib/statsEngine';
import { resolvePlotTheme } from '../../lib/palettes';

interface SurvivalKMPlotProps {
  rows: SurvivalRow[];
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: (field: EditablePlotField, label: string, currentValue: string) => void;
}

const WIDTH = 840;
const HEIGHT = 590;
const MARGIN = { top: 64, right: 44, bottom: 138, left: 118 };

export const SurvivalKMPlot: React.FC<SurvivalKMPlotProps> = ({
  rows,
  config,
  darkMode,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette } = theme;
  const km = useMemo(() => computeKaplanMeier(rows), [rows]);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const gridColor = paperBg ? '#CBD5E1' : '#334155';
  const baseFs = 12 * theme.fontScale;
  const tickLen = theme.tickDirection === 'in' ? -5.5 : 5.5;

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxX = Math.max(km.maxTime, km.riskTimes[km.riskTimes.length - 1] ?? 12);
  const toX = (t: number) => MARGIN.left + (t / (maxX || 1)) * plotW;
  const toY = (s: number) => MARGIN.top + plotH - s * plotH;

  const buildStepPath = (pts: { time: number; survival: number }[]) => {
    if (pts.length === 0) return '';
    const d: string[] = [`M ${toX(pts[0].time).toFixed(1)} ${toY(pts[0].survival).toFixed(1)}`];
    for (let i = 1; i < pts.length; i++) {
      d.push(`L ${toX(pts[i].time).toFixed(1)} ${toY(pts[i - 1].survival).toFixed(1)}`);
      d.push(`L ${toX(pts[i].time).toFixed(1)} ${toY(pts[i].survival).toFixed(1)}`);
    }
    return d.join(' ');
  };

  const buildStepRibbon = (pts: { time: number; ciLow: number; ciHigh: number }[]) => {
    if (pts.length < 2) return '';
    const topPts: string[] = [];
    const botPts: string[] = [];
    for (let i = 0; i < pts.length; i++) {
      const x = toX(pts[i].time).toFixed(1);
      if (i > 0) {
        topPts.push(`${x},${toY(pts[i - 1].ciHigh).toFixed(1)}`);
        botPts.push(`${x},${toY(pts[i - 1].ciLow).toFixed(1)}`);
      }
      topPts.push(`${x},${toY(pts[i].ciHigh).toFixed(1)}`);
      botPts.push(`${x},${toY(pts[i].ciLow).toFixed(1)}`);
    }
    return [...topPts, ...botPts.reverse()].join(' ');
  };

  const defaultSub = `Log-rank χ² = ${km.logRankChi2.toFixed(2)}, p = ${formatPValue(km.logRankP)} · Shaded bands = 95% Greenwood CI · '+' = censored`;

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
            onEditField('title', 'Plot Title', config.title || 'Kaplan–Meier Overall Survival');
          }}
        >
          {config.title || 'Kaplan–Meier Overall Survival'}
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

        {/* Grid & Median 0.50 Reference Line */}
        <g stroke={gridColor} strokeOpacity={0.32} strokeDasharray="3 3" strokeWidth={0.7}>
          {[0.25, 0.5, 0.75, 1.0].map((v) => (
            <line key={v} x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(v)} y2={toY(v)} />
          ))}
        </g>
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + plotW}
          y1={toY(0.5)}
          y2={toY(0.5)}
          stroke={inkSecondary}
          strokeOpacity={0.45}
          strokeDasharray="5 4"
        />

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
          {km.riskTimes.map((t) => (
            <g key={`kmt-${t}`}>
              <line x1={toX(t)} x2={toX(t)} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={toX(t)} y={MARGIN.top + plotH + 19} textAnchor="middle">{t}</text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((s) => (
            <g key={`kms-${s}`}>
              <line x1={MARGIN.left} x2={MARGIN.left - tickLen} y1={toY(s)} y2={toY(s)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={MARGIN.left - 11} y={toY(s) + 4} textAnchor="end">{Math.round(s * 100)}%</text>
            </g>
          ))}
        </g>

        {/* KM Step Curves, 95% CI Ribbons & Censored '+' Marks */}
        {km.arms.map((arm, idx) => {
          const col = palette.colors[idx % palette.colors.length];
          return (
            <g key={arm.group}>
              <polygon points={buildStepRibbon(arm.steps)} fill={col} fillOpacity={0.14} />
              <path d={buildStepPath(arm.steps)} fill="none" stroke={col} strokeWidth={theme.lineWidth * 2.1} />
              {arm.censoredTicks.map((ct, k) => (
                <g key={k} stroke={col} strokeWidth={1.4}>
                  <line x1={toX(ct.time)} x2={toX(ct.time)} y1={toY(ct.survival) - 4} y2={toY(ct.survival) + 4} />
                  <line x1={toX(ct.time) - 4} x2={toX(ct.time) + 4} y1={toY(ct.survival)} y2={toY(ct.survival)} />
                </g>
              ))}
            </g>
          );
        })}

        {/* Log-Rank Callout & Legend */}
        <g transform={`translate(${MARGIN.left + 16}, ${MARGIN.top + plotH - 42})`}>
          <text x={0} y={0} fill={inkPrimary} fontSize={baseFs - 0.5} fontWeight={700}>
            Log-rank p = {formatPValue(km.logRankP)}
          </text>
          <text x={0} y={16} fill={inkSecondary} fontSize={baseFs - 1.5}>
            χ² = {km.logRankChi2.toFixed(2)} (df = {km.df})
          </text>
        </g>

        <g transform={`translate(${WIDTH - MARGIN.right - 235}, ${MARGIN.top + 16})`}>
          {km.arms.map((arm, i) => (
            <g key={arm.group} transform={`translate(0, ${i * 22})`}>
              <line x1={0} x2={18} y1={0} y2={0} stroke={palette.colors[i % palette.colors.length]} strokeWidth={2.8} />
              <text x={24} y={4} fill={inkPrimary} fontSize={baseFs - 1.2} fontWeight={600}>
                {arm.group} (med: {arm.medianSurvival !== null ? `${arm.medianSurvival} mo` : 'NR'})
              </text>
            </g>
          ))}
        </g>

        {/* Axis Titles */}
        <text
          x={MARGIN.left + plotW / 2}
          y={MARGIN.top + plotH + 40}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs}
          fontWeight={600}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('xLabel', 'X-Axis Label', config.xLabel || 'Time (Months)');
          }}
        >
          {config.xLabel || 'Time (Months)'}
        </text>
        <text
          transform={`translate(24, ${MARGIN.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs + 0.5}
          fontWeight={600}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('yLabel', 'Y-Axis Label', config.yLabel || 'Survival Probability (%)');
          }}
        >
          {config.yLabel || 'Survival Probability (%)'}
        </text>

        {/* Aligned Publication Number-at-Risk Table */}
        <g transform={`translate(0, ${MARGIN.top + plotH + 66})`}>
          <text x={MARGIN.left - 12} y={0} textAnchor="end" fill={inkPrimary} fontSize={baseFs - 1.2} fontWeight={700}>
            Number at Risk
          </text>
          {km.arms.map((arm, idx) => (
            <g key={`risk-${arm.group}`} transform={`translate(0, ${22 + idx * 22})`}>
              <text
                x={MARGIN.left - 12}
                y={0}
                textAnchor="end"
                fill={palette.colors[idx % palette.colors.length]}
                fontSize={baseFs - 1.4}
                fontWeight={600}
              >
                {arm.group}
              </text>
              {km.riskTimes.map((t, ti) => (
                <text
                  key={`${arm.group}-${t}`}
                  x={toX(t)}
                  y={0}
                  textAnchor="middle"
                  fill={inkSecondary}
                  fontSize={baseFs - 1.2}
                >
                  {arm.riskAtTimes[ti]}
                </text>
              ))}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};
