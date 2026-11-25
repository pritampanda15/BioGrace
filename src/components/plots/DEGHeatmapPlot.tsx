import React, { useState } from 'react';
import type { DEPlotConfig } from '../../types/biograce';
import type { DEGHeatmapData } from '../../lib/advancedDemoData';
import type { OnEditPlotField } from '../ui/InlinePlotEditor';
import { resolvePlotTheme, sampleRamp } from '../../lib/palettes';

interface DEGHeatmapPlotProps {
  data: DEGHeatmapData;
  config: DEPlotConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: OnEditPlotField;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 88, right: 146, bottom: 72, left: 108 };

export const DEGHeatmapPlot: React.FC<DEGHeatmapPlotProps> = ({
  data,
  config,
  darkMode,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette, colormap } = theme;
  const [hovered, setHovered] = useState<{ gene: string; sample: string; group: string; z: number } | null>(null);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const baseFs = 12 * theme.fontScale;

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const cw = plotW / Math.max(1, data.samples.length);
  const rh = plotH / Math.max(1, data.genes.length);
  const groups = [...new Set(data.samples.map((s) => s.group))];
  const gradId = `deg-hm-grad-${colormap.id}`;

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

        <text
          x={MARGIN.left}
          y={28}
          fill={inkPrimary}
          fontSize={baseFs + 3.5}
          fontWeight={700}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('title', 'Plot Title', config.title || 'Z-Scored DEG Expression Heatmap');
          }}
        >
          {config.title || 'Z-Scored DEG Expression Heatmap'}
        </text>
        <text
          x={MARGIN.left}
          y={46}
          fill={inkSecondary}
          fontSize={baseFs - 1}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('subtitle', 'Subtitle', config.subtitle || 'Row-scaled expression z-scores across experimental conditions');
          }}
        >
          {config.subtitle || 'Row-scaled expression z-scores across experimental conditions'}
        </text>

        {/* Top Condition Annotation Bar */}
        {data.samples.map((s, ci) => {
          const gi = groups.indexOf(s.group);
          return (
            <rect
              key={`cond-${s.id}`}
              x={MARGIN.left + ci * cw + 1}
              y={MARGIN.top - 18}
              width={cw - 2}
              height={12}
              rx={3}
              fill={palette.colors[gi % palette.colors.length]}
            />
          );
        })}
        <text x={MARGIN.left - 10} y={MARGIN.top - 9} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 2} fontWeight={700}>
          Condition
        </text>

        {/* Heatmap Tiles */}
        {data.genes.map((gene, ri) => (
          <g key={gene}>
            <text
              x={MARGIN.left - 10}
              y={MARGIN.top + (ri + 0.5) * rh + 4}
              textAnchor="end"
              fill={inkPrimary}
              fontSize={baseFs - 1}
              fontStyle="italic"
              fontWeight={hovered?.gene === gene ? 700 : 500}
            >
              {gene}
            </text>
            {data.samples.map((s, ci) => {
              const z = data.zMatrix[ri][ci];
              const norm = (z + 2.5) / 5;
              const isHov = hovered?.gene === gene && hovered?.sample === s.id;
              return (
                <rect
                  key={`${gene}-${s.id}`}
                  x={MARGIN.left + ci * cw + 1}
                  y={MARGIN.top + ri * rh + 1}
                  width={cw - 2}
                  height={rh - 2}
                  rx={3}
                  fill={sampleRamp(colormap.stops, norm)}
                  stroke={isHov ? inkPrimary : 'none'}
                  strokeWidth={isHov ? 1.8 : 0}
                  style={{ cursor: 'pointer' }}
                  onPointerEnter={() => setHovered({ gene, sample: s.id, group: s.group, z })}
                  onPointerLeave={() => setHovered(null)}
                />
              );
            })}
          </g>
        ))}

        {/* Sample labels */}
        {data.samples.map((s, ci) => (
          <text
            key={`sl-${s.id}`}
            transform={`translate(${MARGIN.left + (ci + 0.5) * cw}, ${MARGIN.top + plotH + 14}) rotate(-38)`}
            textAnchor="end"
            fill={inkPrimary}
            fontSize={baseFs - 1.5}
            fontWeight={500}
          >
            {s.id}
          </text>
        ))}

        {/* Legend (Click any header or group label to edit inline) */}
        <g transform={`translate(${WIDTH - MARGIN.right + 20}, ${MARGIN.top})`}>
          <text
            x={0}
            y={0}
            fill={inkPrimary}
            fontSize={11 * theme.fontScale}
            fontWeight={700}
            style={{ cursor: 'text' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onEditField('legend', 'Colorbar Title', config.legendLabels?.['hm_z'] ?? 'Row Z-Score', 'hm_z');
            }}
          >
            {config.legendLabels?.['hm_z'] ?? 'Row Z-Score'}
          </text>
          <rect x={0} y={12} width={14} height={118} rx={3} fill={`url(#${gradId})`} stroke={inkAxis} strokeOpacity={0.3} />
          <text x={22} y={22} fill={inkSecondary} fontSize={10 * theme.fontScale}>+2.5</text>
          <text x={22} y={74} fill={inkSecondary} fontSize={10 * theme.fontScale}>0.0</text>
          <text x={22} y={128} fill={inkSecondary} fontSize={10 * theme.fontScale}>−2.5</text>

          <text
            x={0}
            y={168}
            fill={inkPrimary}
            fontSize={11 * theme.fontScale}
            fontWeight={700}
            style={{ cursor: 'text' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onEditField('legend', 'Condition Legend Title', config.legendLabels?.['hm_cond'] ?? 'Condition', 'hm_cond');
            }}
          >
            {config.legendLabels?.['hm_cond'] ?? 'Condition'}
          </text>
          {groups.map((g, i) => {
            const lbl = config.legendLabels?.[`hm_${g}`] ?? g;
            return (
              <g key={g} transform={`translate(0, ${188 + i * 22})`}>
                <rect width={12} height={12} y={-9} rx={3} fill={palette.colors[i % palette.colors.length]} />
                <text
                  x={18}
                  y={1}
                  fill={inkPrimary}
                  fontSize={10.5 * theme.fontScale}
                  style={{ cursor: 'text' }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onEditField('legend', `Condition (${g})`, lbl, `hm_${g}`);
                  }}
                >
                  {lbl}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {hovered && (
        <div className="pointer-events-none absolute top-4 right-4 z-20 rounded-xl px-3.5 py-2 text-xs material-sheet tabular-nums">
          <div className="font-semibold text-[var(--text-primary)]">
            <span className="italic">{hovered.gene}</span> · {hovered.sample} ({hovered.group})
          </div>
          <div className="text-[var(--text-secondary)]">
            Row Z-score: <strong>{hovered.z > 0 ? `+${hovered.z.toFixed(2)}` : hovered.z.toFixed(2)}</strong>
          </div>
        </div>
      )}
    </div>
  );
};
