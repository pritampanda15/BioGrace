import React from 'react';
import type { DEPlotConfig } from '../../types/biograce';
import type { ForestRow } from '../../lib/advancedDemoData';
import type { EditablePlotField } from '../ui/InlinePlotEditor';
import { formatPValue } from '../../lib/statsEngine';
import { resolvePlotTheme } from '../../lib/palettes';

interface ForestPlotChartProps {
  rows: ForestRow[];
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: (field: EditablePlotField, label: string, currentValue: string) => void;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 82, right: 205, bottom: 64, left: 235 };

export const ForestPlotChart: React.FC<ForestPlotChartProps> = ({
  rows,
  config,
  darkMode,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette } = theme;

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const baseFs = 12 * theme.fontScale;
  const tickLen = theme.tickDirection === 'in' ? -5 : 5;

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const minLog = Math.log2(0.2);
  const maxLog = Math.log2(4.2);
  const toX = (hr: number) =>
    MARGIN.left + ((Math.log2(Math.max(0.2, Math.min(4.2, hr))) - minLog) / (maxLog - minLog)) * plotW;
  const nullX = toX(1.0);
  const rowStep = plotH / Math.max(1, rows.length);
  const ticks = [0.25, 0.5, 1.0, 2.0, 4.0];

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
          x={28}
          y={28}
          fill={inkPrimary}
          fontSize={baseFs + 3.5}
          fontWeight={700}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('title', 'Plot Title', config.title || 'Multivariate Cox Regression Forest Plot');
          }}
        >
          {config.title || 'Multivariate Cox Regression Forest Plot'}
        </text>
        <text
          x={28}
          y={46}
          fill={inkSecondary}
          fontSize={baseFs - 1}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('subtitle', 'Subtitle', config.subtitle || 'Hazard Ratio (HR) with 95% Confidence Intervals · HR < 1 favors survival');
          }}
        >
          {config.subtitle || 'Hazard Ratio (HR) with 95% Confidence Intervals · HR < 1 favors survival'}
        </text>

        {/* Table Column Headers */}
        <g fill={inkSecondary} fontSize={baseFs - 1.2} fontWeight={700}>
          <text x={MARGIN.left - 14} y={MARGIN.top - 12} textAnchor="end">Covariate</text>
          <text x={MARGIN.left + plotW / 2} y={MARGIN.top - 12} textAnchor="middle">Hazard Ratio (Log Scale)</text>
          <text x={WIDTH - MARGIN.right + 16} y={MARGIN.top - 12}>HR (95% CI)</text>
          <text x={WIDTH - 24} y={MARGIN.top - 12} textAnchor="end">P-value</text>
        </g>
        <line x1={28} x2={WIDTH - 24} y1={MARGIN.top - 4} y2={MARGIN.top - 4} stroke={inkAxis} strokeOpacity={0.35} />

        {/* Vertical Null Line at HR = 1.0 */}
        <line x1={nullX} x2={nullX} y1={MARGIN.top} y2={MARGIN.top + plotH} stroke={inkAxis} strokeDasharray="5 4" strokeWidth={1.2} />

        {/* Bottom Log Axis */}
        <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={toX(t)} x2={toX(t)} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={toX(t)} y={MARGIN.top + plotH + 20} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1}>
              {t}
            </text>
          </g>
        ))}

        {/* Rows */}
        {rows.map((r, idx) => {
          const cy = MARGIN.top + (idx + 0.5) * rowStep;
          const xLo = toX(r.ciLow);
          const xHi = toX(r.ciHigh);
          const xMid = toX(r.hr);
          const crossesNull = r.ciLow <= 1 && r.ciHigh >= 1;
          const col = crossesNull ? inkSecondary : r.hr < 1 ? palette.downColor : palette.upColor;

          return (
            <g key={r.variable}>
              {idx % 2 === 0 && (
                <rect x={24} y={cy - rowStep / 2 + 2} width={WIDTH - 48} height={rowStep - 4} rx={5} fill={inkPrimary} fillOpacity={0.03} />
              )}
              {r.isSummary && (
                <line x1={28} x2={WIDTH - 24} y1={cy - rowStep / 2} y2={cy - rowStep / 2} stroke={inkAxis} strokeOpacity={0.3} />
              )}
              <text
                x={MARGIN.left - 14}
                y={cy + 4}
                textAnchor="end"
                fill={inkPrimary}
                fontSize={baseFs - 1}
                fontWeight={r.isSummary ? 700 : 500}
              >
                {r.variable}
              </text>

              {r.isSummary ? (
                <polygon
                  points={`${xLo},${cy} ${xMid},${cy - 8} ${xHi},${cy} ${xMid},${cy + 8}`}
                  fill={col}
                  fillOpacity={0.85}
                  stroke={inkPrimary}
                  strokeWidth={1.2}
                />
              ) : (
                <>
                  <line x1={xLo} x2={xHi} y1={cy} y2={cy} stroke={col} strokeWidth={theme.lineWidth * 1.7} />
                  <line x1={xLo} x2={xLo} y1={cy - 4.5} y2={cy + 4.5} stroke={col} strokeWidth={theme.lineWidth * 1.4} />
                  <line x1={xHi} x2={xHi} y1={cy - 4.5} y2={cy + 4.5} stroke={col} strokeWidth={theme.lineWidth * 1.4} />
                  <rect x={xMid - 5} y={cy - 5} width={10} height={10} rx={2} fill={col} />
                </>
              )}

              <text x={WIDTH - MARGIN.right + 16} y={cy + 4} fill={inkPrimary} fontSize={baseFs - 1.3} fontWeight={r.isSummary ? 700 : 500}>
                {`${r.hr.toFixed(2)} (${r.ciLow.toFixed(2)}–${r.ciHigh.toFixed(2)})`}
              </text>
              <text
                x={WIDTH - 24}
                y={cy + 4}
                textAnchor="end"
                fill={r.pValue < 0.05 ? inkPrimary : inkSecondary}
                fontSize={baseFs - 1.3}
                fontWeight={r.pValue < 0.05 ? 700 : 400}
              >
                {formatPValue(r.pValue)}
              </text>
            </g>
          );
        })}

        <text
          x={MARGIN.left + plotW / 2}
          y={HEIGHT - 16}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs}
          fontWeight={600}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('xLabel', 'X-Axis Label', config.xLabel || '← Lower Risk (Protective)   |   Higher Risk →');
          }}
        >
          {config.xLabel || '← Lower Risk (Protective)   |   Higher Risk →'}
        </text>
      </svg>
    </div>
  );
};
