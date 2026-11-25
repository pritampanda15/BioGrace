import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { DEPlotConfig, UpSetItem } from '../../types/biograce';
import type { EditablePlotField } from '../ui/InlinePlotEditor';
import { resolvePlotTheme } from '../../lib/palettes';
import { APPLE_SPRINGS, playAppleTick } from '../../motion/applePhysics';

interface UpSetPlotProps {
  items: UpSetItem[];
  config: DEPlotConfig;
  darkMode: boolean;
  soundEnabled: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onEditField: (field: EditablePlotField, label: string, currentValue: string) => void;
}

const WIDTH = 840;
const HEIGHT = 560;

export const UpSetPlot: React.FC<UpSetPlotProps> = ({
  items,
  config,
  darkMode,
  soundEnabled,
  svgRef,
  onEditField,
}) => {
  const theme = resolvePlotTheme(config);
  const { palette } = theme;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const mutedDot = paperBg ? '#E2E8F0' : '#2C2F3A';
  const baseFs = 12 * theme.fontScale;

  const { setTotals, intersections } = useMemo(() => {
    const setCounts = new Map<string, number>();
    const comboMap = new Map<string, { sets: string[]; ids: string[] }>();

    for (const item of items) {
      const uniqueSets = [...new Set(item.sets)].sort();
      for (const s of uniqueSets) setCounts.set(s, (setCounts.get(s) ?? 0) + 1);
      const key = uniqueSets.join(' ∩ ');
      const existing = comboMap.get(key);
      if (existing) existing.ids.push(item.id);
      else comboMap.set(key, { sets: uniqueSets, ids: [item.id] });
    }

    const sortedSets = [...setCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    const sortedCombos = [...comboMap.entries()]
      .map(([key, val]) => ({ key, ...val, count: val.ids.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return { setTotals: sortedSets, intersections: sortedCombos };
  }, [items]);

  const activeCombo = intersections.find((c) => c.key === selectedKey) ?? intersections[0];

  const barTop = 64;
  const barBottom = 328;
  const barH = barBottom - barTop;
  const matrixLeft = 236;
  const matrixRight = WIDTH - 36;
  const matrixW = matrixRight - matrixLeft;
  const colW = matrixW / Math.max(1, intersections.length);
  const matrixTop = 356;
  const rowH = Math.min(38, (HEIGHT - matrixTop - 34) / Math.max(1, setTotals.length));

  const maxInter = Math.max(1, ...intersections.map((c) => c.count));
  const maxSetTotal = Math.max(1, ...setTotals.map((s) => s.count));

  return (
    <div className="relative w-full select-none space-y-3">
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
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onEditField('title', 'Plot Title', config.title || 'DEG Set Intersections');
          }}
        >
          {config.title || 'DEG Set Intersections'}
        </text>
        <text
          x={32}
          y={46}
          fill={inkSecondary}
          fontSize={baseFs - 1}
          style={{ cursor: 'text' }}
          onPointerDown={(e) => {
            e.stopPropagation();
            const cur = config.subtitle || `${items.length} unique features across ${setTotals.length} contrasts`;
            onEditField('subtitle', 'Subtitle', cur);
          }}
        >
          {config.subtitle || `${items.length} unique features across ${setTotals.length} contrasts`}
        </text>

        {/* Top Bar Axes (respecting 4-spine boxed vs open) */}
        <g stroke={inkAxis} strokeWidth={theme.axesLinewidth}>
          <line x1={matrixLeft - 8} x2={matrixLeft - 8} y1={barTop} y2={barBottom} />
          <line x1={matrixLeft - 8} x2={matrixRight} y1={barBottom} y2={barBottom} />
          {theme.topRightSpines && (
            <>
              <line x1={matrixLeft - 8} x2={matrixRight} y1={barTop} y2={barTop} />
              <line x1={matrixRight} x2={matrixRight} y1={barTop} y2={barBottom} />
            </>
          )}
        </g>

        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const val = Math.round(maxInter * frac);
          const y = barBottom - frac * barH;
          return (
            <g key={`uy-${frac}`}>
              {config.showGrid && frac > 0 && (
                <line
                  x1={matrixLeft - 8}
                  x2={matrixRight}
                  y1={y}
                  y2={y}
                  stroke={inkSecondary}
                  strokeOpacity={0.22}
                  strokeDasharray="3 3"
                />
              )}
              <text x={matrixLeft - 16} y={y + 4} textAnchor="end" fill={inkSecondary} fontSize={10.5 * theme.fontScale}>
                {val}
              </text>
            </g>
          );
        })}
        <text
          transform={`translate(${matrixLeft - 52}, ${(barTop + barBottom) / 2}) rotate(-90)`}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={baseFs}
          fontWeight={600}
        >
          Intersection Size
        </text>

        {/* Vertical Intersection Bars */}
        {intersections.map((combo, idx) => {
          const cx = matrixLeft + (idx + 0.5) * colW;
          const bw = Math.min(28, colW * 0.58);
          const h = (combo.count / maxInter) * (barH - 18);
          const isSelected = activeCombo?.key === combo.key;
          const fill = isSelected ? palette.upColor : palette.downColor;

          return (
            <g
              key={combo.key}
              style={{ cursor: 'pointer' }}
              onPointerDown={() => {
                setSelectedKey(combo.key);
                playAppleTick(soundEnabled, 'select');
              }}
            >
              <motion.rect
                x={cx - bw / 2}
                width={bw}
                rx={4}
                initial={{ y: barBottom, height: 0 }}
                animate={{ y: barBottom - h, height: h }}
                transition={APPLE_SPRINGS.criticallyDamped}
                fill={fill}
                fillOpacity={isSelected ? 0.96 : 0.8}
              />
              <text
                x={cx}
                y={barBottom - h - 7}
                textAnchor="middle"
                fill={isSelected ? palette.upColor : inkPrimary}
                fontSize={11 * theme.fontScale}
                fontWeight={700}
              >
                {combo.count}
              </text>
            </g>
          );
        })}

        {/* Zebra Stripes & Left Set-Size Horizontal Bars */}
        {setTotals.map((st, rIdx) => {
          const cy = matrixTop + (rIdx + 0.5) * rowH;
          const setBarMaxW = 104;
          const bw = (st.count / maxSetTotal) * setBarMaxW;
          const barRight = matrixLeft - 98;
          return (
            <g key={st.name}>
              {rIdx % 2 === 0 && (
                <rect
                  x={matrixLeft - 8}
                  y={cy - rowH / 2}
                  width={matrixW + 8}
                  height={rowH}
                  rx={6}
                  fill={inkPrimary}
                  fillOpacity={0.035}
                />
              )}
              <text
                x={matrixLeft - 14}
                y={cy + 4}
                textAnchor="end"
                fill={inkPrimary}
                fontSize={baseFs - 0.5}
                fontWeight={600}
              >
                {st.name}
              </text>
              <rect
                x={barRight - bw}
                y={cy - 7}
                width={bw}
                height={14}
                rx={4}
                fill={palette.colors[rIdx % palette.colors.length]}
                fillOpacity={0.88}
              />
              <text x={barRight - bw - 6} y={cy + 4} textAnchor="end" fill={inkSecondary} fontSize={10 * theme.fontScale}>
                {st.count}
              </text>
            </g>
          );
        })}

        <text
          x={matrixLeft - 140}
          y={matrixTop + setTotals.length * rowH + 18}
          textAnchor="middle"
          fill={inkSecondary}
          fontSize={10.5 * theme.fontScale}
          fontWeight={600}
        >
          Set Size
        </text>

        {/* Matrix Dots & Connectors */}
        {intersections.map((combo, cIdx) => {
          const cx = matrixLeft + (cIdx + 0.5) * colW;
          const memberIndices = setTotals
            .map((s, idx) => (combo.sets.includes(s.name) ? idx : -1))
            .filter((idx) => idx >= 0);
          const minR = Math.min(...memberIndices);
          const maxR = Math.max(...memberIndices);
          const isSelected = activeCombo?.key === combo.key;
          const dotColor = isSelected ? palette.upColor : inkPrimary;

          return (
            <g
              key={`mat-${combo.key}`}
              style={{ cursor: 'pointer' }}
              onPointerDown={() => {
                setSelectedKey(combo.key);
                playAppleTick(soundEnabled, 'select');
              }}
            >
              {memberIndices.length > 1 && (
                <line
                  x1={cx}
                  x2={cx}
                  y1={matrixTop + (minR + 0.5) * rowH}
                  y2={matrixTop + (maxR + 0.5) * rowH}
                  stroke={dotColor}
                  strokeWidth={Math.max(2, theme.lineWidth * 2)}
                />
              )}
              {setTotals.map((st, rIdx) => {
                const cy = matrixTop + (rIdx + 0.5) * rowH;
                const active = combo.sets.includes(st.name);
                return (
                  <circle
                    key={`${combo.key}-${st.name}`}
                    cx={cx}
                    cy={cy}
                    r={active ? 6.5 : 5}
                    fill={active ? dotColor : mutedDot}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {activeCombo && (
        <div className="rounded-xl px-4 py-3 text-xs border border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-[var(--text-primary)]">{activeCombo.key}</span>
            <span className="ml-2 text-[var(--text-secondary)] tabular-nums">
              ({activeCombo.count} features)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeCombo.ids.slice(0, 10).map((id) => (
              <span
                key={id}
                className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[11px] font-mono text-[var(--text-secondary)]"
              >
                {id}
              </span>
            ))}
            {activeCombo.ids.length > 10 && (
              <span className="px-2 py-0.5 text-[11px] text-[var(--text-tertiary)]">
                +{activeCombo.ids.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
