import React, { useMemo, useState } from 'react';
import type { DEPlotConfig, DotPlotRow } from '../../types/biograce';
import type { OnEditPlotField } from '../ui/InlinePlotEditor';
import { resolvePlotTheme, sampleRamp } from '../../lib/palettes';

interface DotPlotChartProps {
  rows: DotPlotRow[];
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: OnEditPlotField;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 64, right: 142, bottom: 92, left: 108 };

export const DotPlotChart: React.FC<DotPlotChartProps> = ({
  rows,
  config,
  darkMode,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette, colormap } = theme;
  const [hovered, setHovered] = useState<DotPlotRow | null>(null);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const gridColor = paperBg ? '#CBD5E1' : '#334155';
  const baseFs = 12 * theme.fontScale;

  const { genes, clusters, minExpr, maxExpr } = useMemo(() => {
    const gList: string[] = [];
    const cList: string[] = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of rows) {
      if (!gList.includes(r.gene)) gList.push(r.gene);
      if (!cList.includes(r.cluster)) cList.push(r.cluster);
      if (r.avgExpr < lo) lo = r.avgExpr;
      if (r.avgExpr > hi) hi = r.avgExpr;
    }
    return { genes: gList, clusters: cList, minExpr: lo, maxExpr: hi === lo ? lo + 1 : hi };
  }, [rows]);

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const colStep = plotW / Math.max(1, genes.length);
  const rowStep = plotH / Math.max(1, clusters.length);
  const maxR = Math.min(13.5, Math.min(colStep, rowStep) * 0.4);

  const gradId = `dotplot-grad-${colormap.id}`;

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto rounded-2xl"
        style={{ fontFamily: theme.fontFamilyCss }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="100%" x2="0%" y2="0%">
            {colormap.stops.map((col, idx) => (
              <stop
                key={`${colormap.id}-${idx}`}
                offset={`${(idx / (colormap.stops.length - 1)) * 100}%`}
                stopColor={col}
              />
            ))}
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={16} fill={bgFill} />

        <text
          x={MARGIN.left}
          y={28}
          fill={inkPrimary}
          fontSize={baseFs + 3.5}
          fontWeight={700}
          letterSpacing="-0.015em"
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('title', 'Plot Title', config.title || 'Single-Cell Canonical Marker Dot Plot');
          }}
        >
          {config.title || 'Single-Cell Canonical Marker Dot Plot'}
        </text>
        <text
          x={MARGIN.left}
          y={46}
          fill={inkSecondary}
          fontSize={baseFs - 1}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            const cur = config.subtitle || `${genes.length} marker genes × ${clusters.length} cell populations`;
            onEditField('subtitle', 'Subtitle', cur);
          }}
        >
          {config.subtitle || `${genes.length} marker genes × ${clusters.length} cell populations`}
        </text>

        {/* Plot Frame (respects journal axis linewidth & 4-spine vs subtle frame) */}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={plotW}
          height={plotH}
          fill="none"
          stroke={inkAxis}
          strokeOpacity={theme.topRightSpines ? 0.9 : 0.42}
          strokeWidth={theme.axesLinewidth}
          rx={theme.topRightSpines ? 0 : 4}
        />

        {/* Subtle Grid */}
        {config.showGrid && (
          <g stroke={gridColor} strokeOpacity={0.32} strokeDasharray="2 3" strokeWidth={0.7}>
            {genes.map((g, i) => {
              const cx = MARGIN.left + (i + 0.5) * colStep;
              return <line key={`dgx-${g}`} x1={cx} x2={cx} y1={MARGIN.top} y2={MARGIN.top + plotH} />;
            })}
            {clusters.map((c, j) => {
              const cy = MARGIN.top + (j + 0.5) * rowStep;
              return <line key={`dgy-${c}`} x1={MARGIN.left} x2={MARGIN.left + plotW} y1={cy} y2={cy} />;
            })}
          </g>
        )}

        {/* Hover Highlight Bands */}
        {hovered && (
          <g pointerEvents="none">
            <rect
              x={MARGIN.left}
              y={MARGIN.top + clusters.indexOf(hovered.cluster) * rowStep}
              width={plotW}
              height={rowStep}
              fill={palette.accentColor}
              fillOpacity={0.08}
            />
            <rect
              x={MARGIN.left + genes.indexOf(hovered.gene) * colStep}
              y={MARGIN.top}
              width={colStep}
              height={plotH}
              fill={palette.accentColor}
              fillOpacity={0.08}
            />
          </g>
        )}

        {/* Y-Axis Cell Type Labels */}
        <g fill={inkPrimary} fontSize={baseFs - 0.5} fontWeight={500}>
          {clusters.map((c, j) => (
            <text
              key={`cl-${c}`}
              x={MARGIN.left - 12}
              y={MARGIN.top + (j + 0.5) * rowStep + 4}
              textAnchor="end"
              fontWeight={hovered?.cluster === c ? 700 : 500}
            >
              {c}
            </text>
          ))}
        </g>

        {/* X-Axis Gene Labels (italicized) */}
        <g fill={inkPrimary} fontSize={baseFs - 0.5} fontStyle="italic" fontWeight={500}>
          {genes.map((g, i) => {
            const x = MARGIN.left + (i + 0.5) * colStep;
            const y = MARGIN.top + plotH + 14;
            return (
              <text
                key={`gn-${g}`}
                transform={`translate(${x}, ${y}) rotate(-42)`}
                textAnchor="end"
                fontWeight={hovered?.gene === g ? 700 : 500}
              >
                {g}
              </text>
            );
          })}
        </g>

        {/* Dots colored with selected gmxgrace continuous colormap */}
        <g>
          {rows.map((r) => {
            const gi = genes.indexOf(r.gene);
            const ci = clusters.indexOf(r.cluster);
            if (gi < 0 || ci < 0) return null;
            const cx = MARGIN.left + (gi + 0.5) * colStep;
            const cy = MARGIN.top + (ci + 0.5) * rowStep;
            const normExpr = (r.avgExpr - minExpr) / (maxExpr - minExpr);
            const radius = Math.max(1.8, Math.sqrt(r.pctExpr / 100) * maxR);
            const isActive = hovered?.gene === r.gene && hovered?.cluster === r.cluster;

            return (
              <circle
                key={`${r.gene}-${r.cluster}`}
                cx={cx}
                cy={cy}
                r={radius}
                fill={sampleRamp(colormap.stops, normExpr)}
                stroke={isActive ? inkPrimary : paperBg ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.22)'}
                strokeWidth={isActive ? 1.8 : 0.7}
                style={{ cursor: 'pointer', transition: 'r 180ms ease' }}
                onPointerEnter={() => setHovered(r)}
                onPointerLeave={() => setHovered(null)}
              />
            );
          })}
        </g>

        {/* Self-contained Publication Legend (Click headers to edit inline) */}
        <g transform={`translate(${WIDTH - MARGIN.right + 22}, ${MARGIN.top + 8})`}>
          <text
            x={0}
            y={0}
            fill={inkPrimary}
            fontSize={11 * theme.fontScale}
            fontWeight={700}
            style={{ cursor: 'text' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onEditField('legend', 'Colorbar Title', config.legendLabels?.['dot_color'] ?? 'Mean Expr (z)', 'dot_color');
            }}
          >
            {config.legendLabels?.['dot_color'] ?? 'Mean Expr (z)'}
          </text>
          <rect
            x={0}
            y={12}
            width={14}
            height={116}
            rx={3}
            fill={`url(#${gradId})`}
            stroke={inkAxis}
            strokeOpacity={0.35}
          />
          <text x={22} y={22} fill={inkSecondary} fontSize={10 * theme.fontScale}>
            {maxExpr.toFixed(1)}
          </text>
          <text x={22} y={74} fill={inkSecondary} fontSize={10 * theme.fontScale}>
            {((maxExpr + minExpr) / 2).toFixed(1)}
          </text>
          <text x={22} y={128} fill={inkSecondary} fontSize={10 * theme.fontScale}>
            {minExpr.toFixed(1)}
          </text>

          <text
            x={0}
            y={168}
            fill={inkPrimary}
            fontSize={11 * theme.fontScale}
            fontWeight={700}
            style={{ cursor: 'text' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onEditField('legend', 'Size Legend Title', config.legendLabels?.['dot_size'] ?? '% Expressed', 'dot_size');
            }}
          >
            {config.legendLabels?.['dot_size'] ?? '% Expressed'}
          </text>
          {[25, 50, 75, 100].map((pct, idx) => {
            const rad = Math.max(2, Math.sqrt(pct / 100) * maxR);
            const yy = 192 + idx * 34;
            return (
              <g key={`leg-${pct}`} transform={`translate(14, ${yy})`}>
                <circle r={rad} fill={inkSecondary} fillOpacity={0.45} stroke={inkPrimary} strokeWidth={0.7} />
                <text x={22} y={4} fill={inkSecondary} fontSize={10.5 * theme.fontScale}>
                  {pct}%
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute top-4 right-4 z-20 rounded-xl px-3.5 py-2 text-xs material-sheet tabular-nums">
          <div className="font-semibold text-[var(--text-primary)]">
            <span className="italic">{hovered.gene}</span> · {hovered.cluster}
          </div>
          <div className="mt-1 flex gap-3 text-[var(--text-secondary)]">
            <span>Mean expr: <strong>{hovered.avgExpr.toFixed(2)}</strong></span>
            <span>Expressed: <strong>{hovered.pctExpr.toFixed(1)}%</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
