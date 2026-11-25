import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import type { StatisticalRecommendation } from '../../types/biograce';
import { formatPValue } from '../../lib/statsEngine';
import { APPLE_SPRINGS } from '../../motion/applePhysics';

interface StatAdvisorPanelProps {
  analysis: StatisticalRecommendation;
  collapsePseudoreplicates: boolean;
  onToggleCollapseReplicates: () => void;
}

export const StatAdvisorPanel: React.FC<StatAdvisorPanelProps> = ({
  analysis,
  collapsePseudoreplicates,
  onToggleCollapseReplicates,
}) => {
  return (
    <motion.div
      layout
      transition={APPLE_SPRINGS.criticallyDamped}
      className="space-y-4"
    >
      {/* Pseudoreplication Guard Alert (High Priority) */}
      {analysis.pseudoreplicationWarning && (
        <div
          className={`rounded-2xl p-4 border ${
            analysis.collapsedReplicates
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/12 border-amber-500/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                analysis.collapsedReplicates ? 'text-emerald-500' : 'text-amber-500'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                  {analysis.collapsedReplicates
                    ? 'Pseudoreplication Corrected (Biological Replicate Means)'
                    : 'Pseudoreplication Risk Detected'}
                </h4>
                <button
                  type="button"
                  onPointerDown={onToggleCollapseReplicates}
                  className="apple-press text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--accent)] text-white"
                >
                  {collapsePseudoreplicates ? 'Show Uncollapsed Wells' : 'Collapse to Biological Means'}
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                {analysis.pseudoreplicationWarning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Recommendation Card */}
      <div className="material-card rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              <Sparkles className="w-3.5 h-3.5" />
              Recommended Statistical Protocol
            </div>
            <h3 className="type-title text-lg font-bold text-[var(--text-primary)] mt-1">
              {analysis.primaryTest}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs tabular-nums">
            <span className="px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium">
              {analysis.isPaired ? 'Paired Design' : 'Independent Groups'}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-semibold">
              p = {formatPValue(analysis.omnibus.pValue)}
            </span>
          </div>
        </div>

        {/* Assumption Traffic Lights */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              {analysis.assumptions.normalityPassed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              Normality (Shapiro–Wilk)
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
              {analysis.assumptions.normalityDetail}
            </p>
          </div>

          <div className="rounded-xl p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              {analysis.assumptions.variancePassed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              Variance Homogeneity (Levene)
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
              {analysis.assumptions.varianceDetail}
            </p>
          </div>
        </div>

        {/* Rationale & Why Not Others */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="font-semibold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-emerald-500" />
              Why this test fits
            </div>
            <ul className="space-y-1.5 text-[var(--text-secondary)]">
              {analysis.rationale.map((line, i) => (
                <li key={i} className="leading-relaxed">
                  • {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              Why common alternatives fail here
            </div>
            <ul className="space-y-1.5 text-[var(--text-secondary)]">
              {analysis.whyNotOthers.map((line, i) => (
                <li key={i} className="leading-relaxed">
                  • {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Pairwise Comparisons & Group Diagnostics Table */}
      <div className="material-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Pairwise Contrasts ({analysis.correctionMethod === 'None' ? 'Unadjusted' : `${analysis.correctionMethod} Adjustment`})
          </h4>
          <span className="text-xs text-[var(--text-tertiary)] tabular-nums">
            Omnibus {analysis.omnibus.statisticLabel} = {analysis.omnibus.statistic.toFixed(2)}
            {analysis.omnibus.df ? ` (df ${analysis.omnibus.df})` : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left tabular-nums">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Contrast</th>
                <th className="px-4 py-2.5 font-semibold">Test</th>
                <th className="px-4 py-2.5 font-semibold">Stat</th>
                <th className="px-4 py-2.5 font-semibold">Raw p</th>
                <th className="px-4 py-2.5 font-semibold">Adj. q</th>
                <th className="px-4 py-2.5 font-semibold">Effect Size</th>
                <th className="px-4 py-2.5 font-semibold text-right">Call</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {analysis.pairwise.map((pw) => (
                <tr key={`${pw.groupA}-${pw.groupB}`} className="hover:bg-[var(--bg-subtle)]/60">
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                    {pw.groupA} vs {pw.groupB}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{pw.testName}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {pw.statisticLabel} = {pw.statistic.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{formatPValue(pw.pValue)}</td>
                  <td className="px-4 py-2.5 font-semibold text-[var(--text-primary)]">
                    {formatPValue(pw.pAdjusted)}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {pw.effectLabel} = {pw.effectSize.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        pw.significant
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-tertiary)]'
                      }`}
                    >
                      {pw.stars}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Group Shapiro-Wilk & Distribution Summary */}
      <div className="material-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-hairline)]">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Per-Group Distribution &amp; Normality Diagnostics
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left tabular-nums">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Group</th>
                <th className="px-4 py-2.5 font-semibold">n</th>
                <th className="px-4 py-2.5 font-semibold">Mean ± SD</th>
                <th className="px-4 py-2.5 font-semibold">Median (IQR)</th>
                <th className="px-4 py-2.5 font-semibold">Skew</th>
                <th className="px-4 py-2.5 font-semibold">Shapiro–Wilk W (p)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {analysis.groups.map((g) => (
                <tr key={g.group}>
                  <td className="px-4 py-2.5 font-semibold text-[var(--text-primary)]">{g.group}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{g.n}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {g.mean.toFixed(2)} ± {g.sd.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {g.median.toFixed(2)} ({g.iqr.toFixed(2)})
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{g.skewness.toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        g.isNormal
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-amber-600 dark:text-amber-400 font-semibold'
                      }
                    >
                      W = {g.shapiroW.toFixed(3)} (p = {formatPValue(g.shapiroP)})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
