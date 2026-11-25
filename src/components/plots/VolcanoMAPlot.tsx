import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { DEPlotConfig, VolcanoRow } from '../../types/biograce';
import { resolvePlotTheme } from '../../lib/palettes';
import { APPLE_SPRINGS, playAppleTick } from '../../motion/applePhysics';

interface VolcanoMAPlotProps {
  mode: 'volcano' | 'ma';
  rows: VolcanoRow[];
  config: DEPlotConfig;
  darkMode: boolean;
  soundEnabled: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onToggleLabel: (gene: string) => void;
  onMoveLabel: (gene: string, dx: number, dy: number) => void;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 58, right: 44, bottom: 64, left: 74 };

export const VolcanoMAPlot: React.FC<VolcanoMAPlotProps> = ({
  mode,
  rows,
  config,
  darkMode,
  soundEnabled,
  svgRef,
  onToggleLabel,
  onMoveLabel,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette } = theme;
  const [hovered, setHovered] = useState<{
    row: VolcanoRow;
    sx: number;
    sy: number;
  } | null>(null);

  const dragStateRef = useRef<{
    gene: string;
    startClientX: number;
    startClientY: number;
    origDx: number;
    origDy: number;
    scaleX: number;
    scaleY: number;
  } | null>(null);

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

  const { points, xMin, xMax, yMin, yMax, upCount, downCount, nsCount } = useMemo(() => {
    const negLogPs = rows.map((r) => Math.min(50, -Math.log10(Math.max(1e-50, r.padj))));
    const logMeans = rows.map((r) => Math.log10(Math.max(1, r.baseMean)));
    const fcs = rows.map((r) => r.log2FC);

    let xLo: number;
    let xHi: number;
    let yLo: number;
    let yHi: number;

    if (mode === 'volcano') {
      const maxAbsFc = Math.max(2.5, Math.ceil(Math.max(...fcs.map(Math.abs), config.fcThreshold + 0.5)));
      xLo = -maxAbsFc;
      xHi = maxAbsFc;
      yLo = 0;
      yHi = Math.max(5, Math.ceil(Math.max(...negLogPs) * 1.12));
    } else {
      xLo = Math.floor(Math.min(...logMeans, 0.5));
      xHi = Math.ceil(Math.max(...logMeans, 4.5));
      const maxAbsFc = Math.max(2.5, Math.ceil(Math.max(...fcs.map(Math.abs), config.fcThreshold + 0.5)));
      yLo = -maxAbsFc;
      yHi = maxAbsFc;
    }

    let up = 0;
    let down = 0;
    let ns = 0;

    const mapped = rows.map((r, idx) => {
      const nlp = negLogPs[idx];
      const lm = logMeans[idx];
      const isSigP = r.padj <= config.fdrThreshold;
      const status: 'up' | 'down' | 'ns' =
        isSigP && r.log2FC >= config.fcThreshold
          ? 'up'
          : isSigP && r.log2FC <= -config.fcThreshold
          ? 'down'
          : 'ns';

      if (status === 'up') up++;
      else if (status === 'down') down++;
      else ns++;

      const xVal = mode === 'volcano' ? r.log2FC : lm;
      const yVal = mode === 'volcano' ? nlp : r.log2FC;
      const sx = MARGIN.left + ((xVal - xLo) / (xHi - xLo || 1)) * plotW;
      const sy = MARGIN.top + plotH - ((yVal - yLo) / (yHi - yLo || 1)) * plotH;

      return { row: r, status, sx, sy, nlp, lm };
    });

    mapped.sort((a, b) => (a.status === 'ns' ? -1 : 1) - (b.status === 'ns' ? -1 : 1));

    return {
      points: mapped,
      xMin: xLo,
      xMax: xHi,
      yMin: yLo,
      yMax: yHi,
      upCount: up,
      downCount: down,
      nsCount: ns,
    };
  }, [rows, mode, config.fcThreshold, config.fdrThreshold, plotW, plotH]);

  const toX = (v: number) => MARGIN.left + ((v - xMin) / (xMax - xMin || 1)) * plotW;
  const toY = (v: number) => MARGIN.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  const xTicks = useMemo(() => {
    const step = mode === 'volcano' ? (xMax - xMin > 10 ? 2 : 1) : 1;
    const ticks: number[] = [];
    for (let t = Math.ceil(xMin); t <= Math.floor(xMax); t += step) ticks.push(t);
    return ticks;
  }, [mode, xMin, xMax]);

  const yTicks = useMemo(() => {
    const count = 6;
    const rawStep = (yMax - yMin) / count;
    const step =
      mode === 'volcano'
        ? Math.max(1, Math.round(rawStep / 5) * 5 || Math.ceil(rawStep))
        : Math.max(1, Math.round(rawStep));
    const ticks: number[] = [];
    for (let t = Math.ceil(yMin / step) * step; t <= yMax; t += step) ticks.push(t);
    return ticks;
  }, [mode, yMin, yMax]);

  const labeledSet = useMemo(() => new Set(config.labeledGenes), [config.labeledGenes]);
  const labeledPoints = useMemo(() => {
    const hits = points.filter((p) => labeledSet.has(p.row.gene));
    return hits.map((pt, idx) => {
      const saved = config.labelOffsets[pt.row.gene];
      const defaultDx = pt.row.log2FC >= 0 ? 18 + (idx % 3) * 10 : -18 - (idx % 3) * 10;
      const defaultDy = -16 - (idx % 4) * 11;
      return {
        ...pt,
        dx: saved ? saved.dx : defaultDx,
        dy: saved ? saved.dy : defaultDy,
      };
    });
  }, [points, labeledSet, config.labelOffsets]);

  const handleLabelPointerDown = (e: React.PointerEvent<SVGGElement>, gene: string, dx: number, dy: number) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      gene,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origDx: dx,
      origDy: dy,
      scaleX: WIDTH / rect.width,
      scaleY: HEIGHT / rect.height,
    };
  };

  const handleLabelPointerMove = (e: React.PointerEvent<SVGGElement>) => {
    const st = dragStateRef.current;
    if (!st) return;
    const nextDx = st.origDx + (e.clientX - st.startClientX) * st.scaleX;
    const nextDy = st.origDy + (e.clientY - st.startClientY) * st.scaleY;
    onMoveLabel(st.gene, Math.round(nextDx), Math.round(nextDy));
  };

  const handleLabelPointerUp = (e: React.PointerEvent<SVGGElement>) => {
    if (dragStateRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragStateRef.current = null;
      playAppleTick(soundEnabled, 'snap');
    }
  };

  const negLogFdrThresh = -Math.log10(Math.max(1e-50, config.fdrThreshold));

  return (
    <div className="relative w-full select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto rounded-2xl overflow-visible"
        style={{ fontFamily: theme.fontFamilyCss }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={16} fill={bgFill} />

        {/* Title & Subtitle */}
        <text
          x={MARGIN.left}
          y={28}
          fill={inkPrimary}
          fontSize={baseFs + 3.5}
          fontWeight={700}
          letterSpacing="-0.015em"
        >
          {config.title}
        </text>
        <text x={MARGIN.left} y={45} fill={inkSecondary} fontSize={baseFs - 1}>
          {config.subtitle ||
            `${theme.journal.shortName} · ${theme.widthMm} mm · |log2FC| ≥ ${config.fcThreshold.toFixed(1)}, FDR ≤ ${config.fdrThreshold}`}
        </text>

        {/* Legend */}
        <g transform={`translate(${WIDTH - MARGIN.right - 256}, 22)`} fontSize={Math.max(10, baseFs - 1)}>
          <circle cx={6} cy={0} r={4.5} fill={palette.upColor} />
          <text x={15} y={4} fill={inkPrimary} fontWeight={600}>
            Up ({upCount})
          </text>
          <circle cx={90} cy={0} r={4.5} fill={palette.downColor} />
          <text x={99} y={4} fill={inkPrimary} fontWeight={600}>
            Down ({downCount})
          </text>
          <circle cx={185} cy={0} r={4} fill={palette.nsColor} />
          <text x={194} y={4} fill={inkSecondary}>
            NS ({nsCount})
          </text>
        </g>

        {/* Subtle Grid */}
        {config.showGrid && (
          <g stroke={gridColor} strokeOpacity={0.35} strokeDasharray="3 3" strokeWidth={0.7}>
            {xTicks.map((t) => (
              <line key={`gx-${t}`} x1={toX(t)} x2={toX(t)} y1={MARGIN.top} y2={MARGIN.top + plotH} />
            ))}
            {yTicks.map((t) => (
              <line key={`gy-${t}`} x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(t)} y2={toY(t)} />
            ))}
          </g>
        )}

        {/* Animated Threshold Lines */}
        {config.showThresholds && mode === 'volcano' && (
          <g stroke={inkSecondary} strokeOpacity={0.55} strokeDasharray="5 4" strokeWidth={theme.lineWidth}>
            <motion.line
              animate={{ x1: toX(config.fcThreshold), x2: toX(config.fcThreshold) }}
              transition={APPLE_SPRINGS.criticallyDamped}
              y1={MARGIN.top}
              y2={MARGIN.top + plotH}
            />
            <motion.line
              animate={{ x1: toX(-config.fcThreshold), x2: toX(-config.fcThreshold) }}
              transition={APPLE_SPRINGS.criticallyDamped}
              y1={MARGIN.top}
              y2={MARGIN.top + plotH}
            />
            {negLogFdrThresh <= yMax && (
              <motion.line
                x1={MARGIN.left}
                x2={MARGIN.left + plotW}
                animate={{ y1: toY(negLogFdrThresh), y2: toY(negLogFdrThresh) }}
                transition={APPLE_SPRINGS.criticallyDamped}
              />
            )}
          </g>
        )}

        {config.showThresholds && mode === 'ma' && (
          <g stroke={inkSecondary} strokeOpacity={0.55} strokeDasharray="5 4" strokeWidth={theme.lineWidth}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotW}
              y1={toY(0)}
              y2={toY(0)}
              strokeDasharray="none"
              strokeOpacity={0.35}
            />
            <motion.line
              x1={MARGIN.left}
              x2={MARGIN.left + plotW}
              animate={{ y1: toY(config.fcThreshold), y2: toY(config.fcThreshold) }}
              transition={APPLE_SPRINGS.criticallyDamped}
            />
            <motion.line
              x1={MARGIN.left}
              x2={MARGIN.left + plotW}
              animate={{ y1: toY(-config.fcThreshold), y2: toY(-config.fcThreshold) }}
              transition={APPLE_SPRINGS.criticallyDamped}
            />
          </g>
        )}

        {/* Journal-Specific Spines (Open L-frame vs 4-Spine Boxed ACS/BiophysJ/xmgrace) */}
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

        {/* Journal-Specific Ticks (Inward vs Outward + Optional Top/Right Mirror Ticks) */}
        <g fill={inkSecondary} fontSize={baseFs - 1}>
          {xTicks.map((t) => (
            <g key={`xt-${t}`}>
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
              <text x={toX(t)} y={MARGIN.top + plotH + 20} textAnchor="middle">
                {t}
              </text>
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={`yt-${t}`}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left - tickLen}
                y1={toY(t)}
                y2={toY(t)}
                stroke={inkAxis}
                strokeWidth={theme.axesLinewidth}
              />
              {theme.tickTopRight && (
                <line
                  x1={MARGIN.left + plotW}
                  x2={MARGIN.left + plotW + tickLen}
                  y1={toY(t)}
                  y2={toY(t)}
                  stroke={inkAxis}
                  strokeWidth={theme.axesLinewidth}
                />
              )}
              <text x={MARGIN.left - 11} y={toY(t) + 4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
        </g>

        <text
          x={MARGIN.left + plotW / 2}
          y={HEIGHT - 16}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs + 0.5}
          fontWeight={600}
        >
          {mode === 'volcano' ? 'log2 Fold Change' : 'log10 Mean Expression (baseMean)'}
        </text>
        <text
          transform={`translate(22, ${MARGIN.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs + 0.5}
          fontWeight={600}
        >
          {mode === 'volcano' ? '−log10 Adjusted P-value (FDR)' : 'log2 Fold Change'}
        </text>

        {/* Data Points */}
        <g>
          {points.map((pt) => {
            const isLabeled = labeledSet.has(pt.row.gene);
            const fill =
              pt.status === 'up'
                ? palette.upColor
                : pt.status === 'down'
                ? palette.downColor
                : palette.nsColor;
            const r = isLabeled
              ? config.pointSize + 1.8
              : pt.status === 'ns'
              ? config.pointSize * 0.85
              : config.pointSize;
            return (
              <circle
                key={pt.row.gene}
                cx={pt.sx}
                cy={pt.sy}
                r={r}
                fill={fill}
                fillOpacity={isLabeled ? 1 : pt.status === 'ns' ? config.pointAlpha * 0.65 : config.pointAlpha}
                stroke={isLabeled ? inkPrimary : 'none'}
                strokeWidth={isLabeled ? 1.4 : 0}
                style={{ cursor: 'pointer', transition: 'fill 160ms ease, r 140ms ease' }}
                onPointerEnter={() => setHovered({ row: pt.row, sx: pt.sx, sy: pt.sy })}
                onPointerLeave={() => setHovered(null)}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onToggleLabel(pt.row.gene);
                  playAppleTick(soundEnabled, 'select');
                }}
              />
            );
          })}
        </g>

        {/* Draggable Gene Callout Labels */}
        <g>
          {labeledPoints.map((lp) => {
            const lx = Math.max(MARGIN.left + 8, Math.min(WIDTH - MARGIN.right - 8, lp.sx + lp.dx));
            const ly = Math.max(MARGIN.top + 12, Math.min(MARGIN.top + plotH - 8, lp.sy + lp.dy));
            const anchor = lx >= lp.sx ? 'start' : 'end';
            return (
              <g
                key={`lbl-${lp.row.gene}`}
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => handleLabelPointerDown(e, lp.row.gene, lp.dx, lp.dy)}
                onPointerMove={handleLabelPointerMove}
                onPointerUp={handleLabelPointerUp}
              >
                <line
                  x1={lp.sx}
                  y1={lp.sy}
                  x2={lx}
                  y2={ly}
                  stroke={inkPrimary}
                  strokeOpacity={0.55}
                  strokeWidth={0.95}
                />
                <text
                  x={lx + (anchor === 'start' ? 4 : -4)}
                  y={ly + 3.5}
                  textAnchor={anchor}
                  fill={inkPrimary}
                  fontSize={baseFs - 0.5}
                  fontWeight={700}
                  paintOrder="stroke"
                  stroke={strokeHalo}
                  strokeWidth={3.5}
                  strokeLinejoin="round"
                >
                  {lp.row.gene}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-20 rounded-xl px-3 py-2 text-xs material-sheet"
          style={{
            left: `${Math.min(72, Math.max(6, (hovered.sx / WIDTH) * 100 + 2))}%`,
            top: `${Math.max(4, (hovered.sy / HEIGHT) * 100 - 14)}%`,
          }}
        >
          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span>{hovered.row.gene}</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              {labeledSet.has(hovered.row.gene) ? 'Labeled (click to hide)' : 'Click to label'}
            </span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[var(--text-secondary)] tabular-nums">
            <span>log2FC: {hovered.row.log2FC.toFixed(2)}</span>
            <span>FDR: {hovered.row.padj < 1e-3 ? hovered.row.padj.toExponential(2) : hovered.row.padj.toFixed(4)}</span>
            <span>baseMean: {hovered.row.baseMean.toFixed(0)}</span>
            <span>−log10 q: {(-Math.log10(Math.max(1e-50, hovered.row.padj))).toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
