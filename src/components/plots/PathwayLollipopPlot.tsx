import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { DEPlotConfig, PathwayRow } from '../../types/biograce';
import { resolvePlotTheme } from '../../lib/palettes';
import { APPLE_SPRINGS } from '../../motion/applePhysics';

interface PathwayLollipopPlotProps {
  rows: PathwayRow[];
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 64, right: 118, bottom: 62, left: 268 };

function cleanPathwayLabel(raw: string): string {
  return raw
    .replace(/^HALLMARK_/, '')
    .replace(/^KEGG_/, '')
    .replace(/^GOBP_/, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PathwayLollipopPlot: React.FC<PathwayLollipopPlotProps> = ({
  rows,
  config,
  darkMode,
  svgRef,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette } = theme;
  const [hovered, setHovered] = useState<PathwayRow | null>(null);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const strokeHalo = paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const gridColor = paperBg ? '#CBD5E1' : '#334155';
  const baseFs = 12 * theme.fontScale;
  const tickLen = theme.tickDirection === 'in' ? -5 : 5;

  const sorted = useMemo(() => [...rows].sort((a, b) => b.nes - a.nes).slice(0, 14), [rows]);

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const maxAbsNes = Math.max(2.5, Math.ceil(Math.max(...sorted.map((r) => Math.abs(r.nes))) * 1.15));
  const maxCount = Math.max(1, ...sorted.map((r) => r.geneCount));
  const toX = (v: number) => MARGIN.left + ((v + maxAbsNes) / (2 * maxAbsNes)) * plotW;
  const zeroX = toX(0);
  const rowStep = plotH / Math.max(1, sorted.length);

  const xTicks = [-3, -2, -1, 0, 1, 2, 3].filter((t) => Math.abs(t) <= maxAbsNes);

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
          x={32}
          y={28}
          fill={inkPrimary}
          fontSize={baseFs + 3.5}
          fontWeight={700}
          letterSpacing="-0.015em"
        >
          {config.title || 'Ranked Pathway Enrichment (GSEA Lollipop)'}
        </text>
        <text x={32} y={46} fill={inkSecondary} fontSize={baseFs - 1}>
          {config.subtitle ||
            `${theme.journal.shortName} · Normalized Enrichment Score (NES) · Dot area scaled by gene count`}
        </text>

        {/* Vertical Grid */}
        {config.showGrid && (
          <g stroke={gridColor} strokeOpacity={0.35} strokeDasharray="3 3" strokeWidth={0.7}>
            {xTicks.map((t) => (
              <line key={`lgx-${t}`} x1={toX(t)} x2={toX(t)} y1={MARGIN.top} y2={MARGIN.top + plotH} />
            ))}
          </g>
        )}

        {/* Zero Reference Axis */}
        <line
          x1={zeroX}
          x2={zeroX}
          y1={MARGIN.top}
          y2={MARGIN.top + plotH}
          stroke={inkAxis}
          strokeOpacity={0.55}
          strokeWidth={theme.axesLinewidth}
        />

        {/* Spines */}
        <g stroke={inkAxis} strokeWidth={theme.axesLinewidth}>
          <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH} />
          {theme.topRightSpines && (
            <>
              <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={MARGIN.top} y2={MARGIN.top} />
              <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + plotH} />
              <line x1={MARGIN.left + plotW} x2={MARGIN.left + plotW} y1={MARGIN.top} y2={MARGIN.top + plotH} />
            </>
          )}
        </g>

        {xTicks.map((t) => (
          <g key={`lxt-${t}`}>
            <line
              x1={toX(t)}
              x2={toX(t)}
              y1={MARGIN.top + plotH}
              y2={MARGIN.top + plotH + tickLen}
              stroke={inkAxis}
              strokeWidth={theme.axesLinewidth}
            />
            {theme.tickTopRight && (
              <line
                x1={toX(t)}
                x2={toX(t)}
                y1={MARGIN.top}
                y2={MARGIN.top - tickLen}
                stroke={inkAxis}
                strokeWidth={theme.axesLinewidth}
              />
            )}
            <text
              x={toX(t)}
              y={MARGIN.top + plotH + 20}
              textAnchor="middle"
              fill={inkSecondary}
              fontSize={baseFs - 1}
            >
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}

        <text
          x={MARGIN.left + plotW / 2}
          y={HEIGHT - 16}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs + 0.5}
          fontWeight={600}
        >
          Normalized Enrichment Score (NES)
        </text>

        {/* Lollipop Stems & Dots */}
        {sorted.map((row, idx) => {
          const cy = MARGIN.top + (idx + 0.5) * rowStep;
          const x = toX(row.nes);
          const color = row.nes >= 0 ? palette.upColor : palette.downColor;
          const radius = 4.5 + Math.sqrt(row.geneCount / maxCount) * 7.5;
          const isHov = hovered?.pathway === row.pathway;

          return (
            <g
              key={row.pathway}
              style={{ cursor: 'pointer' }}
              onPointerEnter={() => setHovered(row)}
              onPointerLeave={() => setHovered(null)}
            >
              {isHov && (
                <rect
                  x={24}
                  y={cy - rowStep / 2 + 2}
                  width={WIDTH - 48}
                  height={rowStep - 4}
                  rx={6}
                  fill={color}
                  fillOpacity={0.08}
                />
              )}
              <text
                x={MARGIN.left - 12}
                y={cy + 4}
                textAnchor="end"
                fill={inkPrimary}
                fontSize={baseFs - 1}
                fontWeight={isHov ? 700 : 500}
              >
                {cleanPathwayLabel(row.pathway)}
              </text>

              <motion.line
                x1={zeroX}
                y1={cy}
                y2={cy}
                initial={{ x2: zeroX }}
                animate={{ x2: x }}
                transition={{ ...APPLE_SPRINGS.criticallyDamped, delay: idx * 0.018 }}
                stroke={color}
                strokeWidth={isHov ? theme.lineWidth * 2.4 : theme.lineWidth * 1.8}
                strokeOpacity={0.85}
                strokeLinecap="round"
              />
              <motion.circle
                cy={cy}
                initial={{ cx: zeroX, r: 0 }}
                animate={{ cx: x, r: isHov ? radius + 1.5 : radius }}
                transition={{ ...APPLE_SPRINGS.criticallyDamped, delay: idx * 0.018 }}
                fill={color}
                stroke={strokeHalo}
                strokeWidth={1.5}
              />
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${WIDTH - MARGIN.right + 20}, ${MARGIN.top + 12})`}>
          <text x={0} y={0} fill={inkPrimary} fontSize={11 * theme.fontScale} fontWeight={700}>
            Direction
          </text>
          <circle cx={6} cy={18} r={5} fill={palette.upColor} />
          <text x={18} y={22} fill={inkSecondary} fontSize={10.5 * theme.fontScale}>
            Activated
          </text>
          <circle cx={6} cy={38} r={5} fill={palette.downColor} />
          <text x={18} y={42} fill={inkSecondary} fontSize={10.5 * theme.fontScale}>
            Suppressed
          </text>

          <text x={0} y={82} fill={inkPrimary} fontSize={11 * theme.fontScale} fontWeight={700}>
            Gene Count
          </text>
          {[50, 100, 150].map((cnt, i) => {
            const rad = 4.5 + Math.sqrt(Math.min(cnt, maxCount) / maxCount) * 7.5;
            const yy = 104 + i * 28;
            return (
              <g key={cnt} transform={`translate(10, ${yy})`}>
                <circle r={rad} fill={inkSecondary} fillOpacity={0.35} stroke={inkPrimary} strokeWidth={0.8} />
                <text x={18} y={4} fill={inkSecondary} fontSize={10.5 * theme.fontScale}>
                  {cnt}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute top-4 right-4 z-20 rounded-xl px-3.5 py-2 text-xs material-sheet tabular-nums">
          <div className="font-semibold text-[var(--text-primary)]">{cleanPathwayLabel(hovered.pathway)}</div>
          <div className="mt-1 flex gap-3 text-[var(--text-secondary)]">
            <span>NES: <strong>{hovered.nes > 0 ? `+${hovered.nes.toFixed(2)}` : hovered.nes.toFixed(2)}</strong></span>
            <span>FDR: <strong>{hovered.padj < 1e-3 ? hovered.padj.toExponential(2) : hovered.padj.toFixed(4)}</strong></span>
            <span>Genes: <strong>{hovered.geneCount}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
