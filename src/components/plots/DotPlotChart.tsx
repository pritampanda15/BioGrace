import React, { useMemo, useState } from 'react';
import type { DEPlotConfig, DotPlotRow } from '../../types/biograce';
import { JOURNAL_PRESETS, sampleRamp } from '../../lib/palettes';

interface DotPlotChartProps {
  rows: DotPlotRow[];
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 64, right: 138, bottom: 92, left: 108 };

export const DotPlotChart: React.FC<DotPlotChartProps> = ({
  rows,
  config,
  darkMode,
  svgRef,
}) => {
  const preset = JOURNAL_PRESETS[config.preset];
  const [hovered, setHovered] = useState<DotPlotRow | null>(null);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#1D1D1F' : '#F5F5F7';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const gridColor = paperBg ? '#CBD5E1' : '#334155';

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

  const gradId = `dotplot-grad-${config.preset}`;

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto rounded-2xl"
        style={{ fontFamily: preset.fontFamily }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="100%" x2="0%" y2="0%">
            {preset.sequential.map((col, idx) => (
              <stop
                key={col}
                offset={`${(idx / (preset.sequential.length - 1)) * 100}%`}
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
          fontSize={config.fontSize + 4}
          fontWeight={700}
          letterSpacing="-0.02em"
        >
          {config.title || 'Single-Cell Canonical Marker Dot Plot'}
        </text>
        <text x={MARGIN.left} y={46} fill={inkSecondary} fontSize={config.fontSize - 1}>
          {config.subtitle || `${genes.length} marker genes × ${clusters.length} cell populations · Size = % expressed, Color = scaled expression`}
        </text>

        {/* Plot Frame */}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={plotW}
          height={plotH}
          fill="none"
          stroke={inkPrimary}
          strokeOpacity={0.35}
          strokeWidth={preset.axisWidth}
          rx={4}
        />

        {/* Subtle Grid */}
        {config.showGrid && (
          <g stroke={gridColor} strokeOpacity={preset.gridOpacity} strokeWidth={1}>
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

        {/* Row & Column Hover Highlight Bands */}
        {hovered && (
          <g pointerEvents="none">
            <rect
              x={MARGIN.left}
              y={MARGIN.top + clusters.indexOf(hovered.cluster) * rowStep}
              width={plotW}
              height={rowStep}
              fill={preset.accentColor}
              fillOpacity={0.08}
            />
            <rect
              x={MARGIN.left + genes.indexOf(hovered.gene) * colStep}
              y={MARGIN.top}
              width={colStep}
              height={plotH}
              fill={preset.accentColor}
              fillOpacity={0.08}
            />
          </g>
        )}

        {/* Y-Axis Cell Type Labels */}
        <g fill={inkPrimary} fontSize={config.fontSize - 0.5} fontWeight={500}>
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

        {/* X-Axis Gene Labels (italicized per biological convention) */}
        <g fill={inkPrimary} fontSize={config.fontSize - 0.5} fontStyle="italic" fontWeight={500}>
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

        {/* Dots */}
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
                fill={sampleRamp(preset.sequential, normExpr)}
                stroke={isActive ? inkPrimary : paperBg ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isActive ? 1.8 : 0.7}
                style={{ cursor: 'pointer', transition: 'r 180ms ease' }}
                onPointerEnter={() => setHovered(r)}
                onPointerLeave={() => setHovered(null)}
              />
            );
          })}
        </g>

        {/* Self-contained Publication Legend (Right Side) */}
        <g transform={`translate(${WIDTH - MARGIN.right + 22}, ${MARGIN.top + 8})`}>
          <text x={0} y={0} fill={inkPrimary} fontSize={11} fontWeight={700}>
            Mean Expr (z)
          </text>
          <rect x={0} y={12} width={14} height={116} rx={4} fill={`url(#${gradId})`} stroke={inkSecondary} strokeOpacity={0.3} />
          <text x={22} y={22} fill={inkSecondary} fontSize={10}>
            {maxExpr.toFixed(1)}
          </text>
          <text x={22} y={74} fill={inkSecondary} fontSize={10}>
            {((maxExpr + minExpr) / 2).toFixed(1)}
          </text>
          <text x={22} y={128} fill={inkSecondary} fontSize={10}>
            {minExpr.toFixed(1)}
          </text>

          <text x={0} y={168} fill={inkPrimary} fontSize={11} fontWeight={700}>
            % Expressed
          </text>
          {[25, 50, 75, 100].map((pct, idx) => {
            const rad = Math.max(2, Math.sqrt(pct / 100) * maxR);
            const yy = 192 + idx * 34;
            return (
              <g key={`leg-${pct}`} transform={`translate(14, ${yy})`}>
                <circle r={rad} fill={inkSecondary} fillOpacity={0.45} stroke={inkPrimary} strokeWidth={0.7} />
                <text x={22} y={4} fill={inkSecondary} fontSize={10.5}>
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
