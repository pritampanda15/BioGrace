import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { DEPlotConfig, PathwayRow } from '../../types/biograce';
import { JOURNAL_PRESETS } from '../../lib/palettes';
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
  const preset = JOURNAL_PRESETS[config.preset];
  const [hovered, setHovered] = useState<PathwayRow | null>(null);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#1D1D1F' : '#F5F5F7';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const gridColor = paperBg ? '#CBD5E1' : '#334155';

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.nes - a.nes).slice(0, 14),
    [rows]
  );

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
        style={{ fontFamily: preset.fontFamily }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={16} fill={bgFill} />

        <text
          x={32}
          y={28}
          fill={inkPrimary}
          fontSize={config.fontSize + 4}
          fontWeight={700}
          letterSpacing="-0.02em"
        >
          {config.title || 'Ranked Pathway Enrichment (GSEA Lollipop)'}
        </text>
        <text x={32} y={46} fill={inkSecondary} fontSize={config.fontSize - 1}>
          {config.subtitle || 'Normalized Enrichment Score (NES) · Dot area scaled by leading-edge gene count'}
        </text>

        {/* Vertical Grid */}
        {config.showGrid && (
          <g stroke={gridColor} strokeOpacity={preset.gridOpacity} strokeWidth={1}>
            {xTicks.map((t) => (
              <line key={`lgx-${t}`} x1={toX(t)} x2={toX(t)} y1={MARGIN.top} y2={MARGIN.top + plotH} />
            ))}
          </g>
        )}

        {/* Zero Reference Axis */}
        <line
          x1={zeroX}
          x2={zeroX}
          y1={MARGIN.top - 4}
          y2={MARGIN.top + plotH}
          stroke={inkPrimary}
          strokeOpacity={0.55}
          strokeWidth={1.3}
        />

        {/* Bottom Axis */}
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + plotW}
          y1={MARGIN.top + plotH}
          y2={MARGIN.top + plotH}
          stroke={inkPrimary}
          strokeWidth={preset.axisWidth}
        />
        {xTicks.map((t) => (
          <g key={`lxt-${t}`} transform={`translate(${toX(t)}, ${MARGIN.top + plotH})`}>
            <line y2={5} stroke={inkPrimary} strokeWidth={preset.axisWidth} />
            <text y={20} textAnchor="middle" fill={inkSecondary} fontSize={config.fontSize - 1}>
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}
        <text
          x={MARGIN.left + plotW / 2}
          y={HEIGHT - 16}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={config.fontSize + 1}
          fontWeight={600}
        >
          Normalized Enrichment Score (NES)
        </text>

        {/* Lollipop Stems, Dots, and Pathway Names */}
        {sorted.map((row, idx) => {
          const cy = MARGIN.top + (idx + 0.5) * rowStep;
          const x = toX(row.nes);
          const color = row.nes >= 0 ? preset.upColor : preset.downColor;
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
                fontSize={config.fontSize - 1}
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
                strokeWidth={isHov ? 3 : 2.2}
                strokeOpacity={0.85}
                strokeLinecap="round"
              />
              <motion.circle
                cy={cy}
                initial={{ cx: zeroX, r: 0 }}
                animate={{ cx: x, r: isHov ? radius + 1.5 : radius }}
                transition={{ ...APPLE_SPRINGS.criticallyDamped, delay: idx * 0.018 }}
                fill={color}
                stroke={bgFill}
                strokeWidth={1.5}
              />
            </g>
          );
        })}

        {/* Legend (Right Side) */}
        <g transform={`translate(${WIDTH - MARGIN.right + 20}, ${MARGIN.top + 12})`}>
          <text x={0} y={0} fill={inkPrimary} fontSize={11} fontWeight={700}>
            Direction
          </text>
          <circle cx={6} cy={18} r={5} fill={preset.upColor} />
          <text x={18} y={22} fill={inkSecondary} fontSize={10.5}>
            Activated
          </text>
          <circle cx={6} cy={38} r={5} fill={preset.downColor} />
          <text x={18} y={42} fill={inkSecondary} fontSize={10.5}>
            Suppressed
          </text>

          <text x={0} y={82} fill={inkPrimary} fontSize={11} fontWeight={700}>
            Gene Count
          </text>
          {[50, 100, 150].map((cnt, i) => {
            const rad = 4.5 + Math.sqrt(Math.min(cnt, maxCount) / maxCount) * 7.5;
            const yy = 104 + i * 28;
            return (
              <g key={cnt} transform={`translate(10, ${yy})`}>
                <circle r={rad} fill={inkSecondary} fillOpacity={0.35} stroke={inkPrimary} strokeWidth={0.8} />
                <text x={18} y={4} fill={inkSecondary} fontSize={10.5}>
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
