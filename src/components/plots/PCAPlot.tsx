import React, { useMemo, useState } from 'react';
import type { DEPlotConfig } from '../../types/biograce';
import type { PCASampleRow } from '../../lib/advancedDemoData';
import type { EditablePlotField } from '../ui/InlinePlotEditor';
import { computeConfidenceEllipse } from '../../lib/bioAnalytics';
import { resolvePlotTheme } from '../../lib/palettes';

interface PCAPlotProps {
  rows: PCASampleRow[];
  pc1Var: number;
  pc2Var: number;
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: (field: EditablePlotField, label: string, currentValue: string) => void;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 64, right: 148, bottom: 66, left: 78 };

export const PCAPlot: React.FC<PCAPlotProps> = ({
  rows,
  pc1Var,
  pc2Var,
  config,
  darkMode,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette } = theme;
  const [hovered, setHovered] = useState<PCASampleRow | null>(null);

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

  const { groups, xMin, xMax, yMin, yMax } = useMemo(() => {
    const gOrder: string[] = [];
    for (const r of rows) if (!gOrder.includes(r.group)) gOrder.push(r.group);
    const xs = rows.map((r) => r.pc1);
    const ys = rows.map((r) => r.pc2);
    const xSpan = Math.max(10, Math.max(...xs) - Math.min(...xs));
    const ySpan = Math.max(10, Math.max(...ys) - Math.min(...ys));
    return {
      groups: gOrder,
      xMin: Math.min(...xs) - xSpan * 0.28,
      xMax: Math.max(...xs) + xSpan * 0.28,
      yMin: Math.min(...ys) - ySpan * 0.28,
      yMax: Math.max(...ys) + ySpan * 0.28,
    };
  }, [rows]);

  const toX = (v: number) => MARGIN.left + ((v - xMin) / (xMax - xMin || 1)) * plotW;
  const toY = (v: number) => MARGIN.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const scaleX = plotW / (xMax - xMin || 1);
  const scaleY = plotH / (yMax - yMin || 1);

  const ellipses = useMemo(
    () =>
      groups.map((g, gi) => {
        const sub = rows.filter((r) => r.group === g);
        const ell = computeConfidenceEllipse(
          sub.map((r) => r.pc1),
          sub.map((r) => r.pc2)
        );
        return { group: g, gi, ell, n: sub.length };
      }),
    [groups, rows]
  );

  const xTicks = [-40, -20, 0, 20, 40].filter((t) => t >= xMin && t <= xMax);
  const yTicks = [-30, -15, 0, 15, 30].filter((t) => t >= yMin && t <= yMax);
  const defaultX = `PC1 (${pc1Var.toFixed(1)}% variance explained)`;
  const defaultY = `PC2 (${pc2Var.toFixed(1)}% variance explained)`;

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
            onEditField('title', 'Plot Title', config.title || 'Principal Component Analysis (PCA)');
          }}
        >
          {config.title || 'Principal Component Analysis (PCA)'}
        </text>
        <text
          x={MARGIN.left}
          y={46}
          fill={inkSecondary}
          fontSize={baseFs - 1}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            const cur = config.subtitle || `95% confidence ellipses · PC1 + PC2 capture ${(pc1Var + pc2Var).toFixed(1)}% of total variance`;
            onEditField('subtitle', 'Subtitle', cur);
          }}
        >
          {config.subtitle || `95% confidence ellipses · PC1 + PC2 capture ${(pc1Var + pc2Var).toFixed(1)}% of total variance`}
        </text>

        {/* Zero crosshairs & subtle grid */}
        <g stroke={gridColor} strokeOpacity={0.35} strokeDasharray="3 3" strokeWidth={0.8}>
          <line x1={toX(0)} x2={toX(0)} y1={MARGIN.top} y2={MARGIN.top + plotH} />
          <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(0)} y2={toY(0)} />
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
            <g key={`px-${t}`}>
              <line x1={toX(t)} x2={toX(t)} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={toX(t)} y={MARGIN.top + plotH + 20} textAnchor="middle">{t}</text>
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={`py-${t}`}>
              <line x1={MARGIN.left} x2={MARGIN.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
              <text x={MARGIN.left - 11} y={toY(t) + 4} textAnchor="end">{t}</text>
            </g>
          ))}
        </g>

        {/* 95% Confidence Ellipses */}
        {ellipses.map(({ group, gi, ell }) => {
          if (!ell) return null;
          const col = palette.colors[gi % palette.colors.length];
          const cx = toX(ell.cx);
          const cy = toY(ell.cy);
          return (
            <g key={`ell-${group}`}>
              <ellipse
                cx={cx}
                cy={cy}
                rx={ell.rx * scaleX}
                ry={ell.ry * scaleY}
                transform={`rotate(${-ell.angleDeg}, ${cx}, ${cy})`}
                fill={col}
                fillOpacity={0.14}
                stroke={col}
                strokeWidth={theme.lineWidth * 1.25}
                strokeDasharray="5 3"
              />
            </g>
          );
        })}

        {/* Sample Dots */}
        {rows.map((r) => {
          const gi = groups.indexOf(r.group);
          const col = palette.colors[gi % palette.colors.length];
          const active = hovered?.sample === r.sample;
          return (
            <circle
              key={r.sample}
              cx={toX(r.pc1)}
              cy={toY(r.pc2)}
              r={active ? 7 : 5.2}
              fill={col}
              stroke={strokeHalo}
              strokeWidth={1.6}
              style={{ cursor: 'pointer' }}
              onPointerEnter={() => setHovered(r)}
              onPointerLeave={() => setHovered(null)}
            />
          );
        })}

        {/* Axis Titles (Click to edit) */}
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
            onEditField('xLabel', 'X-Axis Label', config.xLabel || defaultX);
          }}
        >
          {config.xLabel || defaultX}
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
            onEditField('yLabel', 'Y-Axis Label', config.yLabel || defaultY);
          }}
        >
          {config.yLabel || defaultY}
        </text>

        {/* Legend */}
        <g transform={`translate(${WIDTH - MARGIN.right + 18}, ${MARGIN.top + 12})`}>
          <text x={0} y={0} fill={inkPrimary} fontSize={11 * theme.fontScale} fontWeight={700}>Group (95% CI)</text>
          {ellipses.map((e, i) => (
            <g key={e.group} transform={`translate(0, ${22 + i * 24})`}>
              <circle cx={6} cy={-3} r={5} fill={palette.colors[i % palette.colors.length]} />
              <text x={18} y={1} fill={inkPrimary} fontSize={10.5 * theme.fontScale} fontWeight={500}>
                {e.group} (n={e.n})
              </text>
            </g>
          ))}
        </g>
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute top-4 right-4 z-20 rounded-xl px-3.5 py-2 text-xs material-sheet tabular-nums">
          <div className="font-semibold text-[var(--text-primary)]">{hovered.sample}</div>
          <div className="text-[var(--text-secondary)]">
            {hovered.group} · PC1: <strong>{hovered.pc1.toFixed(1)}</strong> · PC2: <strong>{hovered.pc2.toFixed(1)}</strong>
          </div>
        </div>
      )}
    </div>
  );
};
