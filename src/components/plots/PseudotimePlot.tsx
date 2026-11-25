import React from 'react';
import type { DEPlotConfig } from '../../types/biograce';
import type { PseudotimeGeneSeries } from '../../lib/advancedDemoData';
import type { OnEditPlotField } from '../ui/InlinePlotEditor';
import { resolvePlotTheme } from '../../lib/palettes';

interface PseudotimePlotProps {
  stages: { label: string; start: number; end: number }[];
  series: PseudotimeGeneSeries[];
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: OnEditPlotField;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 82, right: 174, bottom: 64, left: 74 };

export const PseudotimePlot: React.FC<PseudotimePlotProps> = ({
  stages,
  series,
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
  const gridColor = paperBg ? '#CBD5E1' : '#334155';
  const baseFs = 12 * theme.fontScale;
  const tickLen = theme.tickDirection === 'in' ? -5.5 : 5.5;

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const toX = (t: number) => MARGIN.left + t * plotW;
  const toY = (v: number) => MARGIN.top + plotH - (v / 5.4) * plotH;

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
            onEditField('title', 'Plot Title', config.title || 'Differentiation Pseudotime Gene Dynamics');
          }}
        >
          {config.title || 'Differentiation Pseudotime Gene Dynamics'}
        </text>
        <text
          x={MARGIN.left}
          y={46}
          fill={inkSecondary}
          fontSize={baseFs - 1}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('subtitle', 'Subtitle', config.subtitle || 'GAM-smoothed expression trends with shaded 95% confidence ribbons');
          }}
        >
          {config.subtitle || 'GAM-smoothed expression trends with shaded 95% confidence ribbons'}
        </text>

        {/* Lineage Stage Header Strip */}
        {stages.map((st, i) => {
          const x1 = toX(st.start);
          const x2 = toX(st.end);
          return (
            <g key={st.label}>
              <rect
                x={x1 + 1}
                y={MARGIN.top - 22}
                width={Math.max(4, x2 - x1 - 2)}
                height={16}
                rx={4}
                fill={palette.colors[i % palette.colors.length]}
                fillOpacity={0.18}
              />
              <text
                x={(x1 + x2) / 2}
                y={MARGIN.top - 10}
                textAnchor="middle"
                fill={inkPrimary}
                fontSize={baseFs - 2}
                fontWeight={600}
              >
                {st.label}
              </text>
            </g>
          );
        })}

        {/* Grid */}
        <g stroke={gridColor} strokeOpacity={0.35} strokeDasharray="3 3" strokeWidth={0.7}>
          {[1, 2, 3, 4, 5].map((y) => (
            <line key={y} x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(y)} y2={toY(y)} />
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
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={toX(t)} x2={toX(t)} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={toX(t)} y={MARGIN.top + plotH + 20} textAnchor="middle">{t.toFixed(2)}</text>
            </g>
          ))}
          {[0, 1, 2, 3, 4, 5].map((y) => (
            <g key={y}>
              <line x1={MARGIN.left} x2={MARGIN.left - tickLen} y1={toY(y)} y2={toY(y)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={MARGIN.left - 11} y={toY(y) + 4} textAnchor="end">{y}</text>
            </g>
          ))}
        </g>

        {/* Confidence Ribbons & Mean Curves */}
        {series.map((s, idx) => {
          const col = palette.colors[idx % palette.colors.length];
          const upper = s.points.map((p) => `${toX(p.t).toFixed(1)},${toY(p.mean + p.ci).toFixed(1)}`);
          const lower = [...s.points].reverse().map((p) => `${toX(p.t).toFixed(1)},${toY(Math.max(0, p.mean - p.ci)).toFixed(1)}`);
          const lineD = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.t).toFixed(1)} ${toY(p.mean).toFixed(1)}`)
            .join(' ');
          return (
            <g key={s.gene}>
              <polygon points={[...upper, ...lower].join(' ')} fill={col} fillOpacity={0.16} />
              <path d={lineD} fill="none" stroke={col} strokeWidth={theme.lineWidth * 2.1} strokeLinecap="round" />
            </g>
          );
        })}

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
            onEditField('xLabel', 'X-Axis Label', config.xLabel || 'Differentiation Pseudotime (0 → 1)');
          }}
        >
          {config.xLabel || 'Differentiation Pseudotime (0 → 1)'}
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
            onEditField('yLabel', 'Y-Axis Label', config.yLabel || 'Normalized Expression (log1p)');
          }}
        >
          {config.yLabel || 'Normalized Expression (log1p)'}
        </text>

        {/* Legend (Click to edit inline) */}
        <g transform={`translate(${WIDTH - MARGIN.right + 18}, ${MARGIN.top + 12})`}>
          <text
            x={0}
            y={0}
            fill={inkPrimary}
            fontSize={11 * theme.fontScale}
            fontWeight={700}
            style={{ cursor: 'text' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onEditField('legend', 'Legend Title', config.legendLabels?.['pt_title'] ?? 'Marker Genes', 'pt_title');
            }}
          >
            {config.legendLabels?.['pt_title'] ?? 'Marker Genes'}
          </text>
          {series.map((s, i) => {
            const lbl = config.legendLabels?.[`pt_${s.gene}`] ?? s.gene;
            return (
              <g key={s.gene} transform={`translate(0, ${22 + i * 24})`}>
                <line x1={0} x2={16} y1={-3} y2={-3} stroke={palette.colors[i % palette.colors.length]} strokeWidth={3} strokeLinecap="round" />
                <text
                  x={22}
                  y={1}
                  fill={inkPrimary}
                  fontSize={10.5 * theme.fontScale}
                  fontWeight={500}
                  style={{ cursor: 'text' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onEditField('legend', `Legend (${s.gene})`, lbl, `pt_${s.gene}`);
                  }}
                >
                  {lbl}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
