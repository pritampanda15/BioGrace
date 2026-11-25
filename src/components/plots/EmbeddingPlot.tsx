import React, { useMemo, useRef, useState } from 'react';
import type { DEPlotConfig } from '../../types/biograce';
import type { EmbeddingCell } from '../../lib/advancedDemoData';
import type { OnEditPlotField } from '../ui/InlinePlotEditor';
import { resolvePlotTheme, sampleRamp } from '../../lib/palettes';
import { playAppleTick } from '../../motion/applePhysics';

interface EmbeddingPlotProps {
  mode: 'umap' | 'tsne';
  cells: EmbeddingCell[];
  markers: string[];
  colorBy: 'cluster' | string; // 'cluster' or gene name (FeaturePlot)
  splitByCondition: boolean;
  config: DEPlotConfig;
  darkMode: boolean;
  soundEnabled: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: OnEditPlotField;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 64, right: 156, bottom: 56, left: 56 };

export const EmbeddingPlot: React.FC<EmbeddingPlotProps> = ({
  mode,
  cells,
  colorBy,
  splitByCondition,
  config,
  darkMode,
  soundEnabled,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette, colormap } = theme;
  const [isolatedCluster, setIsolatedCluster] = useState<string | null>(null);
  const [labelOffsets, setLabelOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const dragRef = useRef<{
    cluster: string;
    startX: number;
    startY: number;
    origDx: number;
    origDy: number;
    sx: number;
    sy: number;
  } | null>(null);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const strokeHalo = paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const baseFs = 12 * theme.fontScale;

  const isFeatureMode = colorBy !== 'cluster';
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const { clusters, xMin, xMax, yMin, yMax, exprMax } = useMemo(() => {
    const cOrder: string[] = [];
    let xLo = Infinity;
    let xHi = -Infinity;
    let yLo = Infinity;
    let yHi = -Infinity;
    let eHi = 0.01;
    for (const c of cells) {
      if (!cOrder.includes(c.cluster)) cOrder.push(c.cluster);
      const x = mode === 'umap' ? c.umap1 : c.tsne1;
      const y = mode === 'umap' ? c.umap2 : c.tsne2;
      if (x < xLo) xLo = x;
      if (x > xHi) xHi = x;
      if (y < yLo) yLo = y;
      if (y > yHi) yHi = y;
      if (isFeatureMode) {
        const val = c.expr[colorBy] ?? 0;
        if (val > eHi) eHi = val;
      }
    }
    const padX = (xHi - xLo) * 0.08 || 1;
    const padY = (yHi - yLo) * 0.08 || 1;
    return {
      clusters: cOrder,
      xMin: xLo - padX,
      xMax: xHi + padX,
      yMin: yLo - padY,
      yMax: yHi + padY,
      exprMax: eHi,
    };
  }, [cells, mode, isFeatureMode, colorBy]);

  const panels = splitByCondition ? (['Control', 'Treated'] as const) : (['All'] as const);
  const subGap = 24;
  const subW = splitByCondition ? (plotW - subGap) / 2 : plotW;

  const toSubX = (v: number, panelIdx: number) =>
    MARGIN.left + panelIdx * (subW + subGap) + ((v - xMin) / (xMax - xMin || 1)) * subW;
  const toY = (v: number) => MARGIN.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

  // Cluster centroids for clean publication labels
  const centroids = useMemo(() => {
    return clusters.map((cl, idx) => {
      const sub = cells.filter((c) => c.cluster === cl);
      const mx = sub.reduce((a, c) => a + (mode === 'umap' ? c.umap1 : c.tsne1), 0) / Math.max(1, sub.length);
      const my = sub.reduce((a, c) => a + (mode === 'umap' ? c.umap2 : c.tsne2), 0) / Math.max(1, sub.length);
      return { cluster: cl, idx, mx, my, count: sub.length };
    });
  }, [clusters, cells, mode]);

  const axisPrefix = mode === 'umap' ? 'UMAP' : 't-SNE';
  const defaultTitle = isFeatureMode
    ? `${colorBy} Expression (${axisPrefix} FeaturePlot)`
    : `Single-Cell ${axisPrefix} Clustering`;
  const defaultSub = `${cells.length} cells · ${clusters.length} populations${splitByCondition ? ' · Split by Condition' : ''}`;
  const gradId = `emb-grad-${colormap.id}`;

  const onDragStart = (e: React.PointerEvent<SVGTextElement>, cluster: string) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cur = labelOffsets[cluster] ?? { dx: 0, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      cluster,
      startX: e.clientX,
      startY: e.clientY,
      origDx: cur.dx,
      origDy: cur.dy,
      sx: WIDTH / rect.width,
      sy: HEIGHT / rect.height,
    };
  };

  const onDragMove = (e: React.PointerEvent<SVGTextElement>) => {
    const st = dragRef.current;
    if (!st) return;
    setLabelOffsets((prev) => ({
      ...prev,
      [st.cluster]: {
        dx: st.origDx + (e.clientX - st.startX) * st.sx,
        dy: st.origDy + (e.clientY - st.startY) * st.sy,
      },
    }));
  };

  const onDragEnd = (e: React.PointerEvent<SVGTextElement>) => {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragRef.current = null;
      playAppleTick(soundEnabled, 'snap');
    }
  };

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
            {colormap.stops.map((c, i) => (
              <stop key={i} offset={`${(i / (colormap.stops.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={16} fill={bgFill} />

        {/* Click-to-edit Title & Subtitle */}
        <text
          x={MARGIN.left}
          y={28}
          fill={inkPrimary}
          fontSize={baseFs + 3.5}
          fontWeight={700}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('title', 'Plot Title', config.title || defaultTitle);
          }}
        >
          {config.title || defaultTitle}
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

        {panels.map((panName, pIdx) => {
          const panelCells =
            panName === 'All' ? cells : cells.filter((c) => c.condition === panName);
          const x0 = MARGIN.left + pIdx * (subW + subGap);

          // Render high-expression cells on top in FeaturePlot mode
          const sortedCells = isFeatureMode
            ? [...panelCells].sort((a, b) => (a.expr[colorBy] ?? 0) - (b.expr[colorBy] ?? 0))
            : panelCells;

          return (
            <g key={panName}>
              {splitByCondition && (
                <text
                  x={x0 + subW / 2}
                  y={MARGIN.top - 4}
                  textAnchor="middle"
                  fill={inkPrimary}
                  fontSize={baseFs}
                  fontWeight={700}
                >
                  {panName} (n = {panelCells.length})
                </text>
              )}

              {theme.topRightSpines && (
                <rect
                  x={x0}
                  y={MARGIN.top}
                  width={subW}
                  height={plotH}
                  fill="none"
                  stroke={inkAxis}
                  strokeWidth={theme.axesLinewidth}
                />
              )}

              {/* Cells */}
              {sortedCells.map((cell) => {
                const vx = mode === 'umap' ? cell.umap1 : cell.tsne1;
                const vy = mode === 'umap' ? cell.umap2 : cell.tsne2;
                const ci = clusters.indexOf(cell.cluster);
                const dimmed = isolatedCluster !== null && isolatedCluster !== cell.cluster;
                const fill = isFeatureMode
                  ? sampleRamp(colormap.stops, (cell.expr[colorBy] ?? 0) / exprMax)
                  : palette.colors[ci % palette.colors.length];

                return (
                  <circle
                    key={`${panName}-${cell.id}`}
                    cx={toSubX(vx, pIdx)}
                    cy={toY(vy)}
                    r={splitByCondition ? 2.8 : config.pointSize}
                    fill={fill}
                    fillOpacity={dimmed ? 0.1 : 0.85}
                  />
                );
              })}

              {/* Draggable Centroid Labels (on non-feature or primary panel) */}
              {!isFeatureMode &&
                centroids.map((cent) => {
                  const off = labelOffsets[cent.cluster] ?? { dx: 0, dy: 0 };
                  const lx = toSubX(cent.mx, pIdx) + off.dx;
                  const ly = toY(cent.my) + off.dy;
                  return (
                    <text
                      key={`${panName}-lbl-${cent.cluster}`}
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      fill={inkPrimary}
                      fontSize={splitByCondition ? baseFs - 1.8 : baseFs - 0.5}
                      fontWeight={700}
                      paintOrder="stroke"
                      stroke={strokeHalo}
                      strokeWidth={4}
                      strokeLinejoin="round"
                      style={{ cursor: 'grab' }}
                      onPointerDown={(e) => onDragStart(e, cent.cluster)}
                      onPointerMove={onDragMove}
                      onPointerUp={onDragEnd}
                    >
                      {config.legendLabels?.[`emb_${cent.cluster}`] ?? cent.cluster}
                    </text>
                  );
                })}

              {/* Nature/Cell Corner-Arrow Axes (Bottom-left of first panel) */}
              {pIdx === 0 && (
                <g stroke={inkAxis} strokeWidth={theme.axesLinewidth * 1.15}>
                  <line x1={x0 + 6} x2={x0 + 78} y1={MARGIN.top + plotH - 6} y2={MARGIN.top + plotH - 6} />
                  <polygon
                    points={`${x0 + 82},${MARGIN.top + plotH - 6} ${x0 + 74},${MARGIN.top + plotH - 10} ${x0 + 74},${MARGIN.top + plotH - 2}`}
                    fill={inkAxis}
                    stroke="none"
                  />
                  <line x1={x0 + 6} x2={x0 + 6} y1={MARGIN.top + plotH - 6} y2={MARGIN.top + plotH - 78} />
                  <polygon
                    points={`${x0 + 6},${MARGIN.top + plotH - 82} ${x0 + 2},${MARGIN.top + plotH - 74} ${x0 + 10},${MARGIN.top + plotH - 74}`}
                    fill={inkAxis}
                    stroke="none"
                  />
                  <text
                    x={x0 + 42}
                    y={MARGIN.top + plotH + 14}
                    textAnchor="middle"
                    stroke="none"
                    fill={inkPrimary}
                    fontSize={baseFs - 1}
                    fontWeight={600}
                    style={{ cursor: 'text' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onEditField('xLabel', 'X-Axis Label', config.xLabel || `${axisPrefix} 1`);
                    }}
                  >
                    {config.xLabel || `${axisPrefix} 1`}
                  </text>
                  <text
                    transform={`translate(${x0 - 10}, ${MARGIN.top + plotH - 42}) rotate(-90)`}
                    textAnchor="middle"
                    stroke="none"
                    fill={inkPrimary}
                    fontSize={baseFs - 1}
                    fontWeight={600}
                    style={{ cursor: 'text' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onEditField('yLabel', 'Y-Axis Label', config.yLabel || `${axisPrefix} 2`);
                    }}
                  >
                    {config.yLabel || `${axisPrefix} 2`}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Right Side Legend (Click circle to isolate; click any text to edit inline) */}
        <g transform={`translate(${WIDTH - MARGIN.right + 20}, ${MARGIN.top + 8})`}>
          {isFeatureMode ? (
            <>
              <text
                x={0}
                y={0}
                fill={inkPrimary}
                fontSize={11 * theme.fontScale}
                fontWeight={700}
                style={{ cursor: 'text' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onEditField('legend', 'Legend Title', config.legendLabels?.['emb_feat'] ?? `${colorBy} (log1p)`, 'emb_feat');
                }}
              >
                {config.legendLabels?.['emb_feat'] ?? `${colorBy} (log1p)`}
              </text>
              <rect x={0} y={14} width={15} height={140} rx={3} fill={`url(#${gradId})`} stroke={inkAxis} strokeOpacity={0.3} />
              <text x={22} y={24} fill={inkSecondary} fontSize={10 * theme.fontScale}>{exprMax.toFixed(1)}</text>
              <text x={22} y={86} fill={inkSecondary} fontSize={10 * theme.fontScale}>{(exprMax / 2).toFixed(1)}</text>
              <text x={22} y={154} fill={inkSecondary} fontSize={10 * theme.fontScale}>0.0</text>
            </>
          ) : (
            <>
              <text
                x={0}
                y={0}
                fill={inkPrimary}
                fontSize={11 * theme.fontScale}
                fontWeight={700}
                style={{ cursor: 'text' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onEditField('legend', 'Legend Title', config.legendLabels?.['emb_title'] ?? 'Cell Types', 'emb_title');
                }}
              >
                {config.legendLabels?.['emb_title'] ?? 'Cell Types'}
              </text>
              {centroids.map((cent, i) => {
                const active = isolatedCluster === cent.cluster;
                const dimmed = isolatedCluster !== null && !active;
                const displayName = config.legendLabels?.[`emb_${cent.cluster}`] ?? cent.cluster;
                return (
                  <g
                    key={cent.cluster}
                    transform={`translate(0, ${22 + i * 24})`}
                    style={{ opacity: dimmed ? 0.35 : 1 }}
                  >
                    <circle
                      cx={6}
                      cy={-3}
                      r={5.5}
                      fill={palette.colors[i % palette.colors.length]}
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setIsolatedCluster(active ? null : cent.cluster);
                        playAppleTick(soundEnabled, 'select');
                      }}
                    />
                    <text
                      x={18}
                      y={1}
                      fill={inkPrimary}
                      fontSize={10.5 * theme.fontScale}
                      fontWeight={active ? 700 : 500}
                      style={{ cursor: 'text' }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        onEditField('legend', `Legend (${cent.cluster})`, displayName, `emb_${cent.cluster}`);
                      }}
                    >
                      {displayName} ({cent.count})
                    </text>
                  </g>
                );
              })}
              <text x={0} y={28 + centroids.length * 24} fill={inkSecondary} fontSize={9.5}>
                Dot = isolate · Text = edit
              </text>
            </>
          )}
        </g>
      </svg>
    </div>
  );
};
