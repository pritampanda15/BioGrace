import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Calculator,
  Check,
  Copy,
  FlaskConical,
  GitBranch,
  TrendingUp,
} from 'lucide-react';
import type { PublicationStyleSettings } from '../../types/biograce';
import { resolvePlotTheme } from '../../lib/palettes';
import {
  analyzeTimeCourse,
  calculateSampleSizeAndPower,
  computeQpcrDeltaDeltaCt,
  DEMO_ELISA_STANDARDS,
  DEMO_ELISA_UNKNOWNS,
  DEMO_FACTORIAL_ROWS,
  DEMO_KINETICS_POINTS,
  DEMO_QPCR_ROWS,
  DEMO_TIMECOURSE_ROWS,
  fitElisaStandardCurve,
  fitMichaelisMenten,
  runTwoWayAnova,
  type PowerDesign,
} from '../../lib/workbenchAnalytics';
import { niceTicks } from '../../lib/journalCasesDataParser';
import { playAppleTick } from '../../motion/applePhysics';

export type WorkbenchSubTab = 'power' | 'factorial' | 'timecourse' | 'qpcr' | 'elisa' | 'kinetics';

interface WetLabWorkbenchProps {
  activeSubTab: WorkbenchSubTab;
  onChangeSubTab: (tab: WorkbenchSubTab) => void;
  styleSettings: PublicationStyleSettings;
  darkMode: boolean;
  soundEnabled: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onSendQpcrToStats: (tidyCsv: string, filename: string) => void;
}

const WIDTH = 840;
const HEIGHT = 480;

export const WetLabWorkbench: React.FC<WetLabWorkbenchProps> = ({
  activeSubTab,
  onChangeSubTab,
  styleSettings,
  darkMode,
  soundEnabled,
  svgRef,
  onSendQpcrToStats,
}) => {
  const theme = resolvePlotTheme(styleSettings);
  const paperBg = styleSettings.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkAxis = paperBg ? '#1F2937' : '#E5E7EB';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const pal = theme.palette.colors;
  const baseFs = 12 * theme.fontScale;
  const tickLen = theme.tickDirection === 'in' ? -5.5 : 5.5;

  // Power Calculator state
  const [powerDesign, setPowerDesign] = useState<PowerDesign>('two-sample');
  const [effectSize, setEffectSize] = useState(0.8);
  const [alpha, setAlpha] = useState(0.05);
  const [targetPower, setTargetPower] = useState(0.8);
  const [anovaGroups, setAnovaGroups] = useState(3);
  const [eventRate, setEventRate] = useState(0.65);
  const [copiedGrant, setCopiedGrant] = useState(false);

  // Editable qPCR rows
  const [qpcrRows, setQpcrRows] = useState(DEMO_QPCR_ROWS);

  const powerRes = useMemo(
    () =>
      calculateSampleSizeAndPower({
        design: powerDesign,
        effectSize,
        alpha,
        targetPower,
        groups: anovaGroups,
        eventRate,
      }),
    [powerDesign, effectSize, alpha, targetPower, anovaGroups, eventRate]
  );

  const anovaRes = useMemo(() => runTwoWayAnova(DEMO_FACTORIAL_ROWS), []);
  const tcRes = useMemo(() => analyzeTimeCourse(DEMO_TIMECOURSE_ROWS), []);
  const qpcrRes = useMemo(() => computeQpcrDeltaDeltaCt(qpcrRows, 'Control'), [qpcrRows]);
  const elisaRes = useMemo(() => fitElisaStandardCurve(DEMO_ELISA_STANDARDS, DEMO_ELISA_UNKNOWNS), []);
  const kinRes = useMemo(() => fitMichaelisMenten(DEMO_KINETICS_POINTS), []);

  const M = { top: 64, right: 44, bottom: 64, left: 78 };
  const pw = WIDTH - M.left - M.right;
  const ph = HEIGHT - M.top - M.bottom;

  const axisFrame = (
    <g stroke={inkAxis} strokeWidth={theme.axesLinewidth}>
      <line x1={M.left} x2={M.left + pw} y1={M.top + ph} y2={M.top + ph} />
      <line x1={M.left} x2={M.left} y1={M.top} y2={M.top + ph} />
      {theme.topRightSpines && (
        <>
          <line x1={M.left} x2={M.left + pw} y1={M.top} y2={M.top} />
          <line x1={M.left + pw} x2={M.left + pw} y1={M.top} y2={M.top + ph} />
        </>
      )}
    </g>
  );

  const subTabs: { id: WorkbenchSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'power', label: 'Power & Sample Size', icon: <Calculator className="w-3.5 h-3.5" /> },
    { id: 'factorial', label: '2-Way ANOVA', icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: 'timecourse', label: 'Time-Course', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'qpcr', label: 'qPCR ΔΔCt', icon: <FlaskConical className="w-3.5 h-3.5" /> },
    { id: 'elisa', label: 'ELISA 4PL', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'kinetics', label: 'Enzyme Kinetics', icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tool Selector Pill Bar */}
      <div className="flex flex-wrap gap-1.5">
        {subTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onPointerDown={() => {
              onChangeSubTab(t.id);
              playAppleTick(soundEnabled, 'select');
            }}
            className={`apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              activeSubTab === t.id
                ? 'bg-[var(--accent)] text-white border-transparent shadow-sm'
                : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Controls Strip for Power Calculator */}
      {activeSubTab === 'power' && (
        <div className="material-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1">
              Study Design
            </label>
            <select
              value={powerDesign}
              onChange={(e) => {
                const next = e.target.value as PowerDesign;
                setPowerDesign(next);
                setEffectSize(next === 'survival' ? 0.55 : next === 'anova' ? 0.4 : 0.8);
              }}
              className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
            >
              <option value="two-sample">Two-Sample t-test (Cohen&apos;s d)</option>
              <option value="paired">Paired t-test (Cohen&apos;s dz)</option>
              <option value="anova">One-Way ANOVA (Cohen&apos;s f)</option>
              <option value="survival">Survival Log-Rank (Hazard Ratio)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold mb-1 tabular-nums">
              <span className="uppercase text-[var(--text-tertiary)]">
                {powerDesign === 'survival' ? 'Hazard Ratio (HR)' : 'Effect Size'}
              </span>
              <span className="text-[var(--text-primary)]">{effectSize.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={powerDesign === 'survival' ? 0.25 : 0.2}
              max={powerDesign === 'survival' ? 0.85 : 2.0}
              step={0.05}
              value={effectSize}
              onChange={(e) => setEffectSize(Number(e.target.value))}
              className="apple-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold mb-1 tabular-nums">
              <span className="uppercase text-[var(--text-tertiary)]">Target Power (1−β)</span>
              <span className="text-[var(--text-primary)]">{Math.round(targetPower * 100)}%</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[0.8, 0.85, 0.9].map((v) => (
                <button
                  key={v}
                  type="button"
                  onPointerDown={() => setTargetPower(v)}
                  className={`apple-press py-1 rounded-lg text-[11px] font-semibold ${
                    targetPower === v ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {Math.round(v * 100)}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold mb-1 tabular-nums">
              <span className="uppercase text-[var(--text-tertiary)]">
                {powerDesign === 'anova' ? 'Groups (k)' : powerDesign === 'survival' ? 'Event Rate' : 'Significance α'}
              </span>
              <span className="text-[var(--text-primary)]">
                {powerDesign === 'anova' ? anovaGroups : powerDesign === 'survival' ? `${Math.round(eventRate * 100)}%` : alpha}
              </span>
            </div>
            {powerDesign === 'anova' ? (
              <input type="range" min={3} max={8} step={1} value={anovaGroups} onChange={(e) => setAnovaGroups(Number(e.target.value))} className="apple-slider" />
            ) : powerDesign === 'survival' ? (
              <input type="range" min={0.2} max={1} step={0.05} value={eventRate} onChange={(e) => setEventRate(Number(e.target.value))} className="apple-slider" />
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {[0.05, 0.01, 0.001].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onPointerDown={() => setAlpha(a)}
                    className={`apple-press py-1 rounded-lg text-[11px] font-semibold ${
                      alpha === a ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publication Vector SVG Figure (exportable as SVG / PDF / PNG / 600 DPI TIFF) */}
      <div className="relative w-full select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto rounded-2xl"
          style={{ fontFamily: theme.fontFamilyCss }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={16} fill={bgFill} />

          {/* 1. Power vs Sample Size Curve */}
          {activeSubTab === 'power' && (() => {
            const maxN = powerRes.curve[powerRes.curve.length - 1]?.nPerGroup ?? 40;
            const toX = (n: number) => M.left + (n / maxN) * pw;
            const toY = (p: number) => M.top + ph - p * ph;
            const xTicks = niceTicks(0, maxN, 6);
            const pathD = powerRes.curve
              .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.nPerGroup).toFixed(1)} ${toY(pt.power).toFixed(1)}`)
              .join(' ');
            const reqX = toX(powerRes.requiredPerGroup);
            const reqY = toY(targetPower);
            return (
              <g>
                <text x={40} y={32} fill={inkPrimary} fontSize={baseFs + 3.5} fontWeight={700}>
                  A Priori Power Curve — n = {powerRes.requiredPerGroup} per group (Total N = {powerRes.requiredTotal})
                </text>
                {axisFrame}
                {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t) => (
                  <g key={t}>
                    <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={M.left - 10} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{Math.round(t * 100)}%</text>
                  </g>
                ))}
                {xTicks.map((t) => (
                  <g key={t}>
                    <line x1={toX(t)} x2={toX(t)} y1={M.top + ph} y2={M.top + ph + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={toX(t)} y={M.top + ph + 20} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
                  </g>
                ))}
                <line x1={M.left} x2={reqX} y1={reqY} y2={reqY} stroke={pal[1]} strokeDasharray="5 4" strokeWidth={theme.lineWidth} />
                <line x1={reqX} x2={reqX} y1={reqY} y2={M.top + ph} stroke={pal[1]} strokeDasharray="5 4" strokeWidth={theme.lineWidth} />
                <path d={pathD} fill="none" stroke={pal[0]} strokeWidth={theme.lineWidth * 2.2} strokeLinecap="round" />
                <circle cx={reqX} cy={reqY} r={6.5} fill={pal[1]} stroke="#FFFFFF" strokeWidth={2} />
                <text x={Math.min(M.left + pw - 10, reqX + 12)} y={reqY - 10} fill={inkPrimary} fontSize={baseFs - 0.5} fontWeight={700}>
                  n = {powerRes.requiredPerGroup}/group ({Math.round(targetPower * 100)}% power)
                </text>
                <text x={M.left + pw / 2} y={HEIGHT - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>
                  Sample Size per Group (n)
                </text>
                <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>
                  Statistical Power (1 − β)
                </text>
              </g>
            );
          })()}

          {/* 2. Two-Way Factorial ANOVA Interaction Plot */}
          {activeSubTab === 'factorial' && (() => {
            const allV = DEMO_FACTORIAL_ROWS.map((r) => r.value);
            const yMin = Math.min(...allV) * 0.8;
            const yMax = Math.max(...allV) * 1.15;
            const toY = (v: number) => M.top + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;
            const ticks = niceTicks(yMin, yMax, 5);
            const stepX = pw / Math.max(1, anovaRes.levelsA.length);
            const interP = anovaRes.table[2].p;
            return (
              <g>
                <text x={40} y={32} fill={inkPrimary} fontSize={baseFs + 3.5} fontWeight={700}>
                  Two-Way Factorial Interaction Plot (Genotype × IFN-γ · Interaction p = {interP < 0.001 ? interP.toExponential(2) : interP.toFixed(4)})
                </text>
                {axisFrame}
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={M.left - 10} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
                  </g>
                ))}
                {anovaRes.levelsA.map((a, ai) => (
                  <text key={a} x={M.left + (ai + 0.5) * stepX} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>
                    {a}
                  </text>
                ))}
                {anovaRes.levelsB.map((b, bi) => {
                  const col = pal[bi % pal.length];
                  const pts = anovaRes.levelsA.map((a, ai) => {
                    const cell = anovaRes.cells.find((c) => c.factorA === a && c.factorB === b)!;
                    return { x: M.left + (ai + 0.5) * stepX + (bi - 0.5) * 18, cell };
                  });
                  return (
                    <g key={b}>
                      <path
                        d={pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${toY(p.cell.mean)}`).join(' ')}
                        fill="none"
                        stroke={col}
                        strokeWidth={theme.lineWidth * 2}
                      />
                      {pts.map((p, i) => (
                        <g key={i}>
                          {p.cell.values.map((v, vi) => (
                            <circle key={vi} cx={p.x + (vi - 1.5) * 4} cy={toY(v)} r={3.5} fill={col} fillOpacity={0.4} />
                          ))}
                          <line x1={p.x} x2={p.x} y1={toY(p.cell.mean + p.cell.ci95)} y2={toY(p.cell.mean - p.cell.ci95)} stroke={col} strokeWidth={theme.lineWidth * 1.6} />
                          <circle cx={p.x} cy={toY(p.cell.mean)} r={6} fill={col} stroke="#FFFFFF" strokeWidth={1.8} />
                        </g>
                      ))}
                    </g>
                  );
                })}
                <g transform={`translate(${WIDTH - M.right - 175}, ${M.top + 14})`} fontSize={baseFs - 1}>
                  {anovaRes.levelsB.map((b, i) => (
                    <g key={b} transform={`translate(${i * 88}, 0)`}>
                      <circle cx={0} cy={0} r={5} fill={pal[i % pal.length]} />
                      <text x={10} y={4} fill={inkPrimary} fontWeight={600}>{b}</text>
                    </g>
                  ))}
                </g>
                <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>
                  Phospho-STAT1 Activity (Mean ± 95% CI)
                </text>
              </g>
            );
          })()}

          {/* 3. Longitudinal Time-Course Growth Curve */}
          {activeSubTab === 'timecourse' && (() => {
            const maxT = Math.max(...tcRes.timepoints);
            const maxV = Math.max(...tcRes.series.flatMap((s) => s.points.map((p) => p.mean + p.ci95))) * 1.15;
            const toX = (t: number) => M.left + (t / (maxT || 1)) * pw;
            const toY = (v: number) => M.top + ph - (v / (maxV || 1)) * ph;
            const yTicks = niceTicks(0, maxV, 5);
            return (
              <g>
                <text x={40} y={32} fill={inkPrimary} fontSize={baseFs + 3.5} fontWeight={700}>
                  Longitudinal Tumor Growth Curve (Mean ± 95% CI · Per-Day BH-FDR)
                </text>
                {axisFrame}
                {yTicks.map((t) => (
                  <g key={t}>
                    <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={M.left - 10} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
                  </g>
                ))}
                {tcRes.timepoints.map((t) => (
                  <g key={t}>
                    <line x1={toX(t)} x2={toX(t)} y1={M.top + ph} y2={M.top + ph + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={toX(t)} y={M.top + ph + 20} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1}>Day {t}</text>
                  </g>
                ))}
                {tcRes.series.map((s, si) => {
                  const col = pal[si % pal.length];
                  const upper = s.points.map((p) => `${toX(p.time).toFixed(1)},${toY(p.mean + p.ci95).toFixed(1)}`);
                  const lower = [...s.points].reverse().map((p) => `${toX(p.time).toFixed(1)},${toY(Math.max(0, p.mean - p.ci95)).toFixed(1)}`);
                  return (
                    <g key={s.group}>
                      <polygon points={[...upper, ...lower].join(' ')} fill={col} fillOpacity={0.18} />
                      <path
                        d={s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.time).toFixed(1)} ${toY(p.mean).toFixed(1)}`).join(' ')}
                        fill="none"
                        stroke={col}
                        strokeWidth={theme.lineWidth * 2}
                      />
                      {s.points.map((p) => (
                        <circle key={p.time} cx={toX(p.time)} cy={toY(p.mean)} r={4.5} fill={col} stroke="#FFFFFF" strokeWidth={1.4} />
                      ))}
                    </g>
                  );
                })}
                {tcRes.perTimepointP.map((tp) => {
                  if (tp.stars === 'ns') return null;
                  const topMean = Math.max(...tcRes.series.map((s) => s.points.find((p) => p.time === tp.time)?.mean ?? 0));
                  return (
                    <text key={tp.time} x={toX(tp.time)} y={Math.max(M.top + 16, toY(topMean) - 22)} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={700}>
                      {tp.stars}
                    </text>
                  );
                })}
                <g transform={`translate(${M.left + 16}, ${M.top + 16})`} fontSize={baseFs - 1}>
                  {tcRes.series.map((s, i) => (
                    <g key={s.group} transform={`translate(0, ${i * 20})`}>
                      <line x1={0} x2={16} y1={0} y2={0} stroke={pal[i % pal.length]} strokeWidth={3} />
                      <text x={22} y={4} fill={inkPrimary} fontWeight={600}>
                        {s.group} (AUC = {Math.round(s.auc)})
                      </text>
                    </g>
                  ))}
                </g>
                <text x={M.left + pw / 2} y={HEIGHT - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Time Post-Treatment (Days)</text>
                <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Tumor Volume (mm³)</text>
              </g>
            );
          })()}

          {/* 4. qPCR 2^-ΔΔCt Fold Change Plot */}
          {activeSubTab === 'qpcr' && (() => {
            const groups = [...new Set(qpcrRes.results.map((r) => r.group))];
            const maxFc = Math.max(2, ...qpcrRes.results.map((r) => r.foldChange)) * 1.2;
            const toY = (v: number) => M.top + ph - (v / maxFc) * ph;
            const ticks = niceTicks(0, maxFc, 5);
            const step = pw / Math.max(1, groups.length);
            return (
              <g>
                <text x={40} y={32} fill={inkPrimary} fontSize={baseFs + 3.5} fontWeight={700}>
                  RT-qPCR Relative Expression (2⁻ΔΔCt · Normalized to Housekeeping)
                </text>
                {axisFrame}
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={M.left - 10} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
                  </g>
                ))}
                <line x1={M.left} x2={M.left + pw} y1={toY(1)} y2={toY(1)} stroke={inkSecondary} strokeDasharray="4 4" strokeOpacity={0.5} />
                {groups.map((g, gi) => {
                  const vals = qpcrRes.results.filter((r) => r.group === g).map((r) => r.foldChange);
                  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
                  const s = vals.length > 1 ? Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1)) : 0;
                  const cx = M.left + (gi + 0.5) * step;
                  const col = pal[gi % pal.length];
                  return (
                    <g key={g}>
                      <rect x={cx - 32} y={toY(m)} width={64} height={Math.max(2, toY(0) - toY(m))} rx={4} fill={col} fillOpacity={0.28} stroke={col} strokeWidth={theme.lineWidth} />
                      <line x1={cx} x2={cx} y1={toY(m + s)} y2={toY(Math.max(0, m - s))} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.4} />
                      {vals.map((v, vi) => (
                        <circle key={vi} cx={cx + (vi - (vals.length - 1) / 2) * 11} cy={toY(v)} r={4.5} fill={col} stroke="#FFFFFF" strokeWidth={1.3} />
                      ))}
                      <text x={cx} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>{g}</text>
                    </g>
                  );
                })}
                <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>
                  Relative Fold Change (2⁻ΔΔCt)
                </text>
              </g>
            );
          })()}

          {/* 5. ELISA 4PL Standard Curve + Interpolated Unknowns */}
          {activeSubTab === 'elisa' && (() => {
            const logMin = Math.log10(3);
            const logMax = Math.log10(1500);
            const maxOd = Math.max(2.8, elisaRes.top * 1.05);
            const toX = (c: number) => M.left + ((Math.log10(Math.max(3, c)) - logMin) / (logMax - logMin)) * pw;
            const toY = (od: number) => M.top + ph - (od / maxOd) * ph;
            const pathD = elisaRes.curve
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.conc).toFixed(1)} ${toY(p.od).toFixed(1)}`)
              .join(' ');
            return (
              <g>
                <text x={40} y={32} fill={inkPrimary} fontSize={baseFs + 3.5} fontWeight={700}>
                  ELISA 4PL Standard Curve (R² = {elisaRes.r2.toFixed(4)} · EC50 = {elisaRes.ec50.toFixed(1)} pg/mL)
                </text>
                {axisFrame}
                {[0, 0.5, 1.0, 1.5, 2.0, 2.5].map((t) => (
                  <g key={t}>
                    <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={M.left - 10} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t.toFixed(1)}</text>
                  </g>
                ))}
                {[10, 30, 100, 300, 1000].map((c) => (
                  <g key={c}>
                    <line x1={toX(c)} x2={toX(c)} y1={M.top + ph} y2={M.top + ph + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={toX(c)} y={M.top + ph + 20} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1}>{c}</text>
                  </g>
                ))}
                <path d={pathD} fill="none" stroke={pal[0]} strokeWidth={theme.lineWidth * 2} />
                {DEMO_ELISA_STANDARDS.filter((s) => s.conc > 0).map((s) => (
                  <circle key={s.conc} cx={toX(s.conc)} cy={toY(s.od)} r={4.8} fill={pal[0]} stroke="#FFFFFF" strokeWidth={1.4} />
                ))}
                {elisaRes.unknowns.filter((u) => u.interpolatedConc !== null).map((u) => (
                  <g key={u.sample}>
                    <polygon
                      points={`${toX(u.interpolatedConc!)},${toY(u.meanOd) - 6} ${toX(u.interpolatedConc!) + 6},${toY(u.meanOd)} ${toX(u.interpolatedConc!)},${toY(u.meanOd) + 6} ${toX(u.interpolatedConc!) - 6},${toY(u.meanOd)}`}
                      fill={pal[1]}
                      stroke="#FFFFFF"
                      strokeWidth={1.3}
                    />
                  </g>
                ))}
                <text x={M.left + pw / 2} y={HEIGHT - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>
                  Standard Concentration (pg/mL, log scale)
                </text>
                <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>
                  Absorbance (OD 450 nm)
                </text>
              </g>
            );
          })()}

          {/* 6. Michaelis-Menten Enzyme Kinetics */}
          {activeSubTab === 'kinetics' && (() => {
            const maxS = Math.max(...DEMO_KINETICS_POINTS.map((p) => p.substrate)) * 1.08;
            const maxV = Math.max(kinRes.vmax * 1.15, 100);
            const toX = (s: number) => M.left + (s / maxS) * pw;
            const toY = (v: number) => M.top + ph - (v / maxV) * ph;
            const yTicks = niceTicks(0, maxV, 5);
            const xTicks = niceTicks(0, maxS, 5);
            const pathD = kinRes.curve
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.s).toFixed(1)} ${toY(p.v).toFixed(1)}`)
              .join(' ');
            return (
              <g>
                <text x={40} y={32} fill={inkPrimary} fontSize={baseFs + 3.5} fontWeight={700}>
                  Michaelis–Menten Kinetics (Vmax = {kinRes.vmax.toFixed(1)} · Km = {kinRes.km.toFixed(2)} µM · R² = {kinRes.r2.toFixed(4)})
                </text>
                {axisFrame}
                {yTicks.map((t) => (
                  <g key={t}>
                    <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={M.left - 10} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
                  </g>
                ))}
                {xTicks.map((t) => (
                  <g key={t}>
                    <line x1={toX(t)} x2={toX(t)} y1={M.top + ph} y2={M.top + ph + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
                    <text x={toX(t)} y={M.top + ph + 20} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
                  </g>
                ))}
                {/* Vmax asymptote & Km/half-Vmax crosshair */}
                <line x1={M.left} x2={M.left + pw} y1={toY(kinRes.vmax)} y2={toY(kinRes.vmax)} stroke={inkSecondary} strokeDasharray="4 4" strokeOpacity={0.6} />
                <text x={M.left + pw - 6} y={toY(kinRes.vmax) - 6} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1.5} fontWeight={600}>Vmax = {kinRes.vmax.toFixed(1)}</text>
                <line x1={M.left} x2={toX(kinRes.km)} y1={toY(kinRes.vmax / 2)} y2={toY(kinRes.vmax / 2)} stroke={pal[1]} strokeDasharray="4 4" strokeWidth={theme.lineWidth} />
                <line x1={toX(kinRes.km)} x2={toX(kinRes.km)} y1={toY(kinRes.vmax / 2)} y2={M.top + ph} stroke={pal[1]} strokeDasharray="4 4" strokeWidth={theme.lineWidth} />
                <path d={pathD} fill="none" stroke={pal[0]} strokeWidth={theme.lineWidth * 2.1} />
                {DEMO_KINETICS_POINTS.map((p) => (
                  <circle key={p.substrate} cx={toX(p.substrate)} cy={toY(p.velocity)} r={5} fill={pal[0]} stroke="#FFFFFF" strokeWidth={1.5} />
                ))}
                <circle cx={toX(kinRes.km)} cy={toY(kinRes.vmax / 2)} r={5.5} fill={pal[1]} stroke="#FFFFFF" strokeWidth={1.8} />
                <text x={toX(kinRes.km) + 10} y={toY(kinRes.vmax / 2) + 4} fill={pal[1]} fontSize={baseFs - 1} fontWeight={700}>
                  Km = {kinRes.km.toFixed(2)} µM
                </text>
                <text x={M.left + pw / 2} y={HEIGHT - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Substrate Concentration [S] (µM)</text>
                <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Initial Velocity v (µM / min)</text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Contextual Summary & Direct-to-Plot Actions */}
      {activeSubTab === 'power' && (
        <div className="material-card rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Ready-to-Paste Grant / IACUC / IRB Power Justification
            </span>
            <button
              type="button"
              onPointerDown={() => {
                void navigator.clipboard.writeText(powerRes.grantParagraph);
                setCopiedGrant(true);
                playAppleTick(soundEnabled, 'commit');
                setTimeout(() => setCopiedGrant(false), 1600);
              }}
              className="apple-press inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
            >
              {copiedGrant ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedGrant ? 'Copied' : 'Copy Paragraph'}
            </button>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{powerRes.grantParagraph}</p>
        </div>
      )}

      {activeSubTab === 'factorial' && (
        <div className="material-card rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-[var(--text-primary)]">Two-Way ANOVA Summary Table</div>
          <p className="text-xs text-[var(--text-secondary)]">{anovaRes.summary}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono tabular-nums">
              <thead className="border-b border-[var(--border-hairline)] text-[var(--text-tertiary)]">
                <tr>
                  <th className="py-1.5 pr-3">Source</th>
                  <th className="py-1.5 px-2">SS</th>
                  <th className="py-1.5 px-2">df</th>
                  <th className="py-1.5 px-2">MS</th>
                  <th className="py-1.5 px-2">F</th>
                  <th className="py-1.5 pl-2">p-value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)] text-[var(--text-primary)]">
                {anovaRes.table.map((row) => (
                  <tr key={row.source}>
                    <td className="py-1.5 pr-3 font-sans font-semibold">{row.source}</td>
                    <td className="py-1.5 px-2">{row.ss.toFixed(2)}</td>
                    <td className="py-1.5 px-2">{row.df}</td>
                    <td className="py-1.5 px-2">{row.ms.toFixed(2)}</td>
                    <td className="py-1.5 px-2">{Number.isFinite(row.f) ? row.f.toFixed(2) : '—'}</td>
                    <td className="py-1.5 pl-2 font-semibold">
                      {Number.isFinite(row.p) ? (row.p < 0.001 ? row.p.toExponential(2) : row.p.toFixed(4)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'qpcr' && (
        <div className="material-card rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">
                RT-qPCR ΔΔCt Calculator (Calibrator: {qpcrRes.controlGroup}, Mean ΔCt = {qpcrRes.meanControlDeltaCt.toFixed(2)})
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                Edit raw Ct values inline or send computed 2⁻ΔΔCt fold changes directly to Anti-Barplot Studio for full assumption-checked stats.
              </div>
            </div>
            <button
              type="button"
              onPointerDown={() => {
                onSendQpcrToStats(qpcrRes.tidyCsv, 'qpcr_ddct_fold_changes.csv');
                playAppleTick(soundEnabled, 'commit');
              }}
              className="apple-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
            >
              Send to Anti-Barplot Studio
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-xs text-left font-mono tabular-nums">
              <thead className="border-b border-[var(--border-hairline)] text-[var(--text-tertiary)]">
                <tr>
                  <th className="py-1.5 pr-2">Sample</th>
                  <th className="py-1.5 px-2">Group</th>
                  <th className="py-1.5 px-2">Target Ct</th>
                  <th className="py-1.5 px-2">HK Ct</th>
                  <th className="py-1.5 px-2">ΔCt</th>
                  <th className="py-1.5 px-2">ΔΔCt</th>
                  <th className="py-1.5 pl-2">2⁻ΔΔCt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {qpcrRes.results.map((r, idx) => (
                  <tr key={r.sample}>
                    <td className="py-1 pr-2 font-sans font-medium text-[var(--text-primary)]">{r.sample}</td>
                    <td className="py-1 px-2 font-sans text-[var(--text-secondary)]">{r.group}</td>
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        step="0.1"
                        value={r.targetCt}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v)) return;
                          setQpcrRows((prev) => prev.map((row, i) => (i === idx ? { ...row, targetCt: v } : row)));
                        }}
                        className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        step="0.1"
                        value={r.hkCt}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v)) return;
                          setQpcrRows((prev) => prev.map((row, i) => (i === idx ? { ...row, hkCt: v } : row)));
                        }}
                        className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                      />
                    </td>
                    <td className="py-1 px-2 text-[var(--text-secondary)]">{r.deltaCt.toFixed(2)}</td>
                    <td className="py-1 px-2 text-[var(--text-secondary)]">{r.deltaDeltaCt.toFixed(2)}</td>
                    <td className="py-1 pl-2 font-bold text-[var(--accent)]">{r.foldChange.toFixed(2)}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'elisa' && (
        <div className="material-card rounded-2xl p-4 space-y-2.5">
          <div className="text-xs font-bold text-[var(--text-primary)]">
            Interpolated Unknown Sample Concentrations (4PL Fit · R² = {elisaRes.r2.toFixed(4)})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono tabular-nums">
              <thead className="border-b border-[var(--border-hairline)] text-[var(--text-tertiary)]">
                <tr>
                  <th className="py-1.5 pr-2">Sample</th>
                  <th className="py-1.5 px-2">Mean OD450</th>
                  <th className="py-1.5 px-2">%CV</th>
                  <th className="py-1.5 px-2">Conc (pg/mL)</th>
                  <th className="py-1.5 pl-2">QC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {elisaRes.unknowns.map((u) => (
                  <tr key={u.sample}>
                    <td className="py-1.5 pr-2 font-sans font-semibold text-[var(--text-primary)]">{u.sample}</td>
                    <td className="py-1.5 px-2">{u.meanOd.toFixed(3)}</td>
                    <td className="py-1.5 px-2">{u.cvPct.toFixed(1)}%</td>
                    <td className="py-1.5 px-2 font-bold text-[var(--accent)]">
                      {u.interpolatedConc !== null ? `${u.interpolatedConc.toFixed(1)}` : 'OOR'}
                    </td>
                    <td className="py-1.5 pl-2 font-sans text-[11px]">{u.qcFlag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
