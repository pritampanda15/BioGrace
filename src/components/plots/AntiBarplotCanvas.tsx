import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type {
  StatisticalRecommendation,
  StatsConfig,
  TidyStatRow,
} from '../../types/biograce';
import { JOURNAL_PRESETS } from '../../lib/palettes';
import { computeBeeswarmOffsets, computeKDE, formatPValue } from '../../lib/statsEngine';
import { APPLE_SPRINGS } from '../../motion/applePhysics';

interface AntiBarplotCanvasProps {
  rows: TidyStatRow[];
  analysis: StatisticalRecommendation;
  config: StatsConfig;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
}

const WIDTH = 840;
const HEIGHT = 560;
const MARGIN = { top: 76, right: 44, bottom: 72, left: 78 };

export const AntiBarplotCanvas: React.FC<AntiBarplotCanvasProps> = ({
  rows,
  analysis,
  config,
  darkMode,
  svgRef,
}) => {
  const preset = JOURNAL_PRESETS[config.preset];
  const [hoveredPoint, setHoveredPoint] = useState<{
    group: string;
    value: number;
    subject?: string;
    sx: number;
    sy: number;
  } | null>(null);

  const paperBg = config.paperExport || !darkMode;
  const bgFill = paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#1D1D1F' : '#F5F5F7';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const gridColor = paperBg ? '#CBD5E1' : '#334155';

  const groups = analysis.groups;
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const significantPairs = useMemo(
    () =>
      analysis.pairwise
        .filter((p) => config.showSignificanceBrackets && (p.significant || analysis.pairwise.length === 1))
        .slice(0, 4),
    [analysis.pairwise, config.showSignificanceBrackets]
  );

  const { yMin, yMax, yTicks } = useMemo(() => {
    const allVals = groups.flatMap((g) => g.values);
    const rawMin = allVals.length ? Math.min(...allVals) : 0;
    const rawMax = allVals.length ? Math.max(...allVals) : 100;
    const span = Math.max(1e-3, rawMax - rawMin);
    const lo = config.plotType === 'barplot-trap' ? Math.min(0, rawMin - span * 0.08) : rawMin - span * 0.14;
    const topPad = significantPairs.length > 0 ? 0.24 + significantPairs.length * 0.095 : 0.14;
    const hi = rawMax + span * topPad;

    const tickCount = 5;
    const rawStep = (hi - lo) / tickCount;
    const mag = 10 ** Math.floor(Math.log10(rawStep));
    const norm = rawStep / mag;
    const niceStep = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const ticks: number[] = [];
    for (let t = Math.ceil(lo / niceStep) * niceStep; t <= hi; t += niceStep) {
      ticks.push(Number(t.toFixed(4)));
    }
    return { yMin: lo, yMax: hi, yTicks: ticks };
  }, [groups, config.plotType, significantPairs.length]);

  const toY = (v: number) => MARGIN.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const groupStep = plotW / Math.max(1, groups.length);
  const groupCenterX = (idx: number) => MARGIN.left + (idx + 0.5) * groupStep;

  // Build KDE half-violins and deterministic beeswarm coordinates
  const groupGeometries = useMemo(() => {
    const cloudMaxW = Math.min(62, groupStep * 0.32);
    return groups.map((g, gIdx) => {
      const cx = groupCenterX(gIdx);
      const color = preset.categorical[gIdx % preset.categorical.length];
      const kdeLo = Math.max(yMin, g.min - g.sd * 0.45);
      const kdeHi = Math.min(yMax, g.max + g.sd * 0.45);
      const kde = computeKDE(g.values, kdeLo, kdeHi, 56);
      const maxDens = Math.max(1e-9, ...kde.map((p) => p.density));

      // Half-violin path extending rightward from cx + 10
      const cloudBaseX = cx + 10;
      const cloudPath =
        kde.length > 1
          ? [
              `M ${cloudBaseX} ${toY(kde[0].y).toFixed(1)}`,
              ...kde.map(
                (p) =>
                  `L ${(cloudBaseX + (p.density / maxDens) * cloudMaxW).toFixed(1)} ${toY(p.y).toFixed(1)}`
              ),
              `L ${cloudBaseX} ${toY(kde[kde.length - 1].y).toFixed(1)} Z`,
            ].join(' ')
          : '';

      const pixelYs = g.values.map((v) => toY(v));
      const spread = config.plotType === 'raincloud' ? Math.min(26, groupStep * 0.15) : Math.min(44, groupStep * 0.24);
      const offsets = computeBeeswarmOffsets(pixelYs, 4.2, spread);
      const groupRows = rows.filter((r) => r.group === g.group);

      const points = g.values.map((v, i) => {
        const baseX = config.plotType === 'raincloud' ? cx - 22 : cx;
        return {
          key: `${g.group}-${i}`,
          value: v,
          subject: groupRows[i]?.subject,
          px: config.plotType === 'paired-slope' ? cx : baseX + offsets[i],
          py: pixelYs[i],
          meanY: toY(g.mean),
        };
      });

      return { g, gIdx, cx, color, cloudPath, points };
    });
  }, [groups, rows, config.plotType, groupStep, preset.categorical, yMin, yMax]);

  // Paired trajectory lines when paired mode is active
  const pairedLines = useMemo(() => {
    if (!analysis.isPaired && config.plotType !== 'paired-slope') return [];
    const bySubject = new Map<string, { gIdx: number; px: number; py: number; value: number }[]>();
    for (const geom of groupGeometries) {
      for (const pt of geom.points) {
        if (!pt.subject) continue;
        if (!bySubject.has(pt.subject)) bySubject.set(pt.subject, []);
        bySubject.get(pt.subject)!.push({ gIdx: geom.gIdx, px: pt.px, py: pt.py, value: pt.value });
      }
    }
    const segments: { key: string; x1: number; y1: number; x2: number; y2: number; delta: number }[] = [];
    for (const [subj, pts] of bySubject.entries()) {
      const sortedPts = pts.sort((a, b) => a.gIdx - b.gIdx);
      for (let i = 0; i < sortedPts.length - 1; i++) {
        segments.push({
          key: `${subj}-${i}`,
          x1: sortedPts[i].px,
          y1: sortedPts[i].py,
          x2: sortedPts[i + 1].px,
          y2: sortedPts[i + 1].py,
          delta: sortedPts[i + 1].value - sortedPts[i].value,
        });
      }
    }
    return segments;
  }, [analysis.isPaired, config.plotType, groupGeometries]);

  const baselineY = toY(Math.max(yMin, 0));

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

        {/* Title & Omnibus Subtitle */}
        <text
          x={MARGIN.left}
          y={28}
          fill={inkPrimary}
          fontSize={16}
          fontWeight={700}
          letterSpacing="-0.02em"
        >
          {config.title}
        </text>
        <text x={MARGIN.left} y={48} fill={inkSecondary} fontSize={11.5}>
          {`${analysis.omnibus.testName}: ${analysis.omnibus.statisticLabel} = ${analysis.omnibus.statistic.toFixed(2)}, p = ${formatPValue(analysis.omnibus.pValue)}${
            analysis.omnibus.effectLabel && analysis.omnibus.effectSize !== undefined
              ? ` · ${analysis.omnibus.effectLabel} = ${analysis.omnibus.effectSize.toFixed(2)}`
              : ''
          } · n = ${analysis.totalN}`}
        </text>

        {/* Anti-Barplot Educational Callout Banner when in Barplot Trap mode */}
        {config.plotType === 'barplot-trap' && (
          <g transform={`translate(${WIDTH - MARGIN.right - 292}, 14)`}>
            <rect width={292} height={36} rx={10} fill="#FF3B30" fillOpacity={0.12} stroke="#FF3B30" strokeOpacity={0.35} />
            <text x={14} y={16} fill="#D70015" fontSize={10.5} fontWeight={700}>
              BARPLOT + SEM WARNING
            </text>
            <text x={14} y={29} fill={inkSecondary} fontSize={9.5}>
              Hides bimodality, skew, outliers &amp; true sample size
            </text>
          </g>
        )}

        {/* Horizontal Gridlines */}
        <g stroke={gridColor} strokeOpacity={preset.gridOpacity} strokeWidth={1}>
          {yTicks.map((t) => (
            <line key={`sgy-${t}`} x1={MARGIN.left} x2={MARGIN.left + plotW} y1={toY(t)} y2={toY(t)} />
          ))}
        </g>

        {/* Axes */}
        <g stroke={inkPrimary} strokeWidth={preset.axisWidth}>
          <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH} />
          <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + plotH} />
        </g>

        {/* Y Ticks */}
        <g fill={inkSecondary} fontSize={11.5}>
          {yTicks.map((t) => (
            <g key={`syt-${t}`} transform={`translate(${MARGIN.left}, ${toY(t)})`}>
              <line x2={-5} stroke={inkPrimary} strokeWidth={preset.axisWidth} />
              <text x={-10} y={4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
        </g>

        {/* Axis Titles */}
        <text
          x={MARGIN.left + plotW / 2}
          y={HEIGHT - 16}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={13}
          fontWeight={600}
        >
          {config.xLabel}
        </text>
        <text
          transform={`translate(22, ${MARGIN.top + plotH / 2}) rotate(-90)`}
          textAnchor="middle"
          fill={inkPrimary}
          fontSize={13}
          fontWeight={600}
        >
          {config.yLabel}
        </text>

        {/* Paired Lines */}
        {(config.plotType === 'paired-slope' || (analysis.isPaired && config.plotType !== 'barplot-trap')) && (
          <g>
            {pairedLines.map((seg) => (
              <motion.line
                key={seg.key}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: config.plotType === 'paired-slope' ? 0.55 : 0.25 }}
                transition={APPLE_SPRINGS.criticallyDamped}
                stroke={seg.delta >= 0 ? preset.upColor : preset.downColor}
                strokeWidth={config.plotType === 'paired-slope' ? 1.8 : 1.1}
              />
            ))}
          </g>
        )}

        {/* Per-Group Visuals */}
        {groupGeometries.map(({ g, cx, color, cloudPath, points }) => {
          const boxW = config.plotType === 'raincloud' ? 18 : 38;
          const boxX = config.plotType === 'raincloud' ? cx - 2 : cx - boxW / 2;
          const q1Y = toY(g.q1);
          const q3Y = toY(g.q3);
          const medY = toY(g.median);
          const wLowY = toY(g.whiskerLow);
          const wHighY = toY(g.whiskerHigh);
          const meanY = toY(g.mean);
          const barW = Math.min(72, groupStep * 0.44);

          return (
            <g key={g.group}>
              {/* X-axis group label & sample size */}
              <text
                x={cx}
                y={MARGIN.top + plotH + 22}
                textAnchor="middle"
                fill={inkPrimary}
                fontSize={12.5}
                fontWeight={600}
              >
                {g.group}
              </text>
              <text
                x={cx}
                y={MARGIN.top + plotH + 38}
                textAnchor="middle"
                fill={inkSecondary}
                fontSize={10.5}
              >
                n = {g.n}
              </text>

              {/* MODE 1: Barplot Trap (dynamite bar + SEM) */}
              {config.plotType === 'barplot-trap' && (
                <g>
                  <motion.rect
                    x={cx - barW / 2}
                    width={barW}
                    rx={6}
                    initial={{ y: baselineY, height: 0 }}
                    animate={{
                      y: Math.min(meanY, baselineY),
                      height: Math.max(2, Math.abs(baselineY - meanY)),
                    }}
                    transition={APPLE_SPRINGS.criticallyDamped}
                    fill={color}
                    fillOpacity={0.78}
                    stroke={inkPrimary}
                    strokeOpacity={0.25}
                    strokeWidth={1}
                  />
                  {/* SEM error bar */}
                  <line
                    x1={cx}
                    x2={cx}
                    y1={toY(g.mean + g.sem)}
                    y2={toY(g.mean - g.sem)}
                    stroke={inkPrimary}
                    strokeWidth={1.8}
                  />
                  <line
                    x1={cx - 10}
                    x2={cx + 10}
                    y1={toY(g.mean + g.sem)}
                    y2={toY(g.mean + g.sem)}
                    stroke={inkPrimary}
                    strokeWidth={1.8}
                  />
                  <line
                    x1={cx - 10}
                    x2={cx + 10}
                    y1={toY(g.mean - g.sem)}
                    y2={toY(g.mean - g.sem)}
                    stroke={inkPrimary}
                    strokeWidth={1.8}
                  />
                </g>
              )}

              {/* MODE 2: Raincloud Half-Violin KDE Cloud */}
              {config.plotType === 'raincloud' && cloudPath && (
                <motion.path
                  d={cloudPath}
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={APPLE_SPRINGS.plotMorph}
                  style={{ transformOrigin: `${cx + 10}px ${medY}px` }}
                  fill={color}
                  fillOpacity={0.26}
                  stroke={color}
                  strokeWidth={1.6}
                />
              )}

              {/* Tukey Boxplot (Raincloud & Box+Beeswarm) */}
              {(config.plotType === 'raincloud' || config.plotType === 'box-beeswarm') && (
                <g>
                  <line
                    x1={boxX + boxW / 2}
                    x2={boxX + boxW / 2}
                    y1={wHighY}
                    y2={q3Y}
                    stroke={inkPrimary}
                    strokeWidth={1.35}
                  />
                  <line
                    x1={boxX + boxW / 2}
                    x2={boxX + boxW / 2}
                    y1={q1Y}
                    y2={wLowY}
                    stroke={inkPrimary}
                    strokeWidth={1.35}
                  />
                  <line
                    x1={boxX + boxW * 0.25}
                    x2={boxX + boxW * 0.75}
                    y1={wHighY}
                    y2={wHighY}
                    stroke={inkPrimary}
                    strokeWidth={1.35}
                  />
                  <line
                    x1={boxX + boxW * 0.25}
                    x2={boxX + boxW * 0.75}
                    y1={wLowY}
                    y2={wLowY}
                    stroke={inkPrimary}
                    strokeWidth={1.35}
                  />
                  <motion.rect
                    x={boxX}
                    y={q3Y}
                    width={boxW}
                    height={Math.max(2, q1Y - q3Y)}
                    rx={4}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={APPLE_SPRINGS.criticallyDamped}
                    fill={color}
                    fillOpacity={0.18}
                    stroke={inkPrimary}
                    strokeWidth={1.45}
                  />
                  <line
                    x1={boxX}
                    x2={boxX + boxW}
                    y1={medY}
                    y2={medY}
                    stroke={inkPrimary}
                    strokeWidth={2.4}
                  />
                </g>
              )}

              {/* Mean Diamond Indicator */}
              {config.showMeanDiamond && config.plotType !== 'barplot-trap' && (
                <polygon
                  points={`${boxX + boxW / 2},${meanY - 5.5} ${boxX + boxW / 2 + 5.5},${meanY} ${boxX + boxW / 2},${meanY + 5.5} ${boxX + boxW / 2 - 5.5},${meanY}`}
                  fill={bgFill}
                  stroke={inkPrimary}
                  strokeWidth={1.6}
                />
              )}

              {/* Raw Data Points — Spring Morph from Mean (Barplot) -> True Distribution! */}
              {config.showRawPoints && config.plotType !== 'barplot-trap' && (
                <g>
                  {points.map((pt, idx) => (
                    <motion.circle
                      key={pt.key}
                      initial={{ cx: cx, cy: pt.meanY, opacity: 0.2 }}
                      animate={{ cx: pt.px, cy: pt.py, opacity: 0.9 }}
                      transition={{ ...APPLE_SPRINGS.plotMorph, delay: Math.min(0.18, idx * 0.008) }}
                      r={4.2}
                      fill={color}
                      stroke={bgFill}
                      strokeWidth={1.15}
                      style={{ cursor: 'pointer' }}
                      onPointerEnter={() =>
                        setHoveredPoint({
                          group: g.group,
                          value: pt.value,
                          subject: pt.subject,
                          sx: pt.px,
                          sy: pt.py,
                        })
                      }
                      onPointerLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </g>
              )}
            </g>
          );
        })}

        {/* Significance Brackets with Adjusted P-values / Stars */}
        {config.showSignificanceBrackets &&
          significantPairs.map((pw, idx) => {
            const idxA = groups.findIndex((g) => g.group === pw.groupA);
            const idxB = groups.findIndex((g) => g.group === pw.groupB);
            if (idxA < 0 || idxB < 0) return null;
            const x1 = groupCenterX(idxA);
            const x2 = groupCenterX(idxB);
            const maxDataY = Math.min(...groups.map((g) => toY(g.max)));
            const y = Math.max(MARGIN.top + 8, maxDataY - 22 - idx * 28);
            const label =
              pw.pAdjusted < 0.05
                ? `${pw.stars} (${analysis.correctionMethod === 'None' ? 'p' : 'q'} = ${formatPValue(pw.pAdjusted)})`
                : `ns (p = ${formatPValue(pw.pAdjusted)})`;

            return (
              <g key={`sig-${pw.groupA}-${pw.groupB}`}>
                <path
                  d={`M ${x1} ${y + 7} L ${x1} ${y} L ${x2} ${y} L ${x2} ${y + 7}`}
                  fill="none"
                  stroke={inkPrimary}
                  strokeWidth={1.25}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fill={pw.significant ? inkPrimary : inkSecondary}
                  fontSize={10.5}
                  fontWeight={pw.significant ? 700 : 500}
                >
                  {label}
                </text>
              </g>
            );
          })}
      </svg>

      {hoveredPoint && (
        <div
          className="pointer-events-none absolute z-20 rounded-xl px-3 py-2 text-xs material-sheet tabular-nums"
          style={{
            left: `${Math.min(72, Math.max(8, (hoveredPoint.sx / WIDTH) * 100 + 2))}%`,
            top: `${Math.max(4, (hoveredPoint.sy / HEIGHT) * 100 - 12)}%`,
          }}
        >
          <div className="font-semibold text-[var(--text-primary)]">{hoveredPoint.group}</div>
          <div className="text-[var(--text-secondary)]">
            Value: <strong>{hoveredPoint.value.toFixed(2)}</strong>
            {hoveredPoint.subject && <span className="ml-2">ID: {hoveredPoint.subject}</span>}
          </div>
        </div>
      )}
    </div>
  );
};
