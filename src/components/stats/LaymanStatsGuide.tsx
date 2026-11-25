import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  GraduationCap,
  HelpCircle,
  Lightbulb,
  Route,
  Sparkles,
} from 'lucide-react';
import type { StatisticalRecommendation } from '../../types/biograce';
import { formatPValue } from '../../lib/statsEngine';
import { APPLE_SPRINGS, playAppleTick } from '../../motion/applePhysics';

interface LaymanStatsGuideProps {
  analysis: StatisticalRecommendation;
  soundEnabled: boolean;
}

const LAYMAN_GLOSSARY = [
  {
    term: 'p-value vs. Biological Effect Size',
    tagline: '"Could this be luck?" vs. "Is it big enough to matter?"',
    plain:
      'A p-value tells you how surprising your data would be if the treatment actually did nothing. p < 0.05 means less than a 1-in-20 chance of seeing this gap purely by luck. Effect size (Hedges’ g, Cliff’s δ, η²) tells you HOW BIG the actual shift is. With huge sample sizes, a tiny 1% shift can have p = 0.001 — always report both!',
  },
  {
    term: 'Normality (Shapiro–Wilk Test)',
    tagline: 'Does your data form a symmetric bell curve?',
    plain:
      'Many classic tests (like t-tests and ANOVA) compare group averages (means). Averages work great on symmetric bell curves, but get dragged wildly by outliers, skewed qPCR ratios, or bimodal responder/non-responder splits. When Shapiro–Wilk gives p < 0.05, BioGrace switches to rank-based (non-parametric) tests that compare medians and orderings safely.',
  },
  {
    term: 'Parametric vs. Non-Parametric Tests',
    tagline: 'Comparing Averages vs. Comparing Rankings',
    plain:
      'Parametric tests (Welch’s t-test, Paired t-test, ANOVA) assume bell-shaped data and compare averages. Non-parametric tests (Mann–Whitney U, Wilcoxon signed-rank, Kruskal–Wallis) line up all values from smallest to largest and compare their ranks — immune to extreme outliers and skewed biological assays.',
  },
  {
    term: 'Welch’s t-test vs. Student’s t-test',
    tagline: 'Why Welch’s is the modern safe default',
    plain:
      'Classic Student’s t-test assumes both groups have the exact same variance (spread). In real biology, a drug-treated group almost always spreads differently than DMSO control! Welch’s t-test drops that fragile assumption and stays accurate either way.',
  },
  {
    term: 'Multiple Testing & BH-FDR (Adjusted q-value)',
    tagline: 'Avoiding the "20-Coin-Flip" false positive trap',
    plain:
      'If you run 20 separate tests at p < 0.05, you expect 1 fake "significant" hit purely by chance. Benjamini–Hochberg FDR (q-value) adjusts your p-values when comparing 3+ groups so your false discovery rate stays controlled across the whole experiment.',
  },
  {
    term: 'Pseudoreplication (Technical vs. Biological N)',
    tagline: '4 qPCR wells from 1 mouse = 1 mouse, NOT 4 mice!',
    plain:
      'Technical replicates (triplicate pipetting wells, multiple microscope fields from the same slide) measure instrument noise, not biological variation. Feeding all technical wells directly into a t-test tricks the math into thinking N is 3×–4× larger than it really is, creating fake p-values. Average technical wells per biological sample first — or fit a Mixed-Effects Model (lmer).',
  },
  {
    term: 'Why Barplots + Error Bars Lie',
    tagline: 'Friends don’t let friends hide data behind dynamite bars',
    plain:
      'A bar chart with an error bar reduces an entire biological distribution to two numbers (mean & SEM). A bimodal split (50% complete responders + 50% resistant cells) looks identical to a single uniform cluster! Raincloud and Box+Beeswarm plots show every real data point transparently.',
  },
];

function interpretPPlain(p: number): string {
  if (p < 0.0001) {
    return 'Very strong statistical evidence: if the treatment truly had zero effect, you would see a difference this extreme less than 1 in 10,000 times by pure luck.';
  }
  if (p < 0.01) {
    return 'Strong statistical evidence: less than a 1% probability of seeing a shift this large by random sampling noise alone.';
  }
  if (p < 0.05) {
    return 'Moderate statistical evidence (p < 0.05): unlikely to be pure luck (< 5%), though you should check the effect size and replicate spread carefully.';
  }
  return 'Not statistically distinguishable from random variation (p ≥ 0.05). Note: "not significant" does NOT prove "no effect" — check if your sample size n is small or if subpopulations are mixed.';
}

function interpretEffectPlain(label?: string, val?: number): string {
  if (!label || val === undefined || !Number.isFinite(val)) {
    return 'Check the raw data spread and median shift on the Raincloud plot to judge practical biological magnitude.';
  }
  const abs = Math.abs(val);
  let tier = 'small';
  if (label.includes('g') || label.includes('d')) {
    tier = abs >= 0.8 ? 'large' : abs >= 0.5 ? 'medium' : 'small';
  } else if (label.includes('δ') || label.includes('r')) {
    tier = abs >= 0.47 ? 'large' : abs >= 0.33 ? 'medium' : 'small';
  } else {
    tier = abs >= 0.14 ? 'large' : abs >= 0.06 ? 'medium' : 'small';
  }
  return `${label} = ${val.toFixed(2)} indicates a ${tier} practical biological effect size — always weigh this alongside whether the shift is biologically meaningful in your assay.`;
}

function buildMethodsParagraph(analysis: StatisticalRecommendation): string {
  const normText = analysis.assumptions.normalityPassed
    ? 'Data distributions were consistent with normality (Shapiro–Wilk test, all p ≥ 0.05)'
    : 'Data deviated from normality in at least one group (Shapiro–Wilk test, p < 0.05)';
  const pseudoText = analysis.pseudoreplicationDetected
    ? analysis.collapsedReplicates
      ? ' Technical replicates were averaged within each biological replicate prior to inference to avoid pseudoreplication.'
      : ' Because nested technical replicates were present, a linear mixed-effects model (biological replicate as random intercept) or collapsing to biological replicate means is recommended.'
    : '';
  const adjText =
    analysis.pairwise.length > 1 && analysis.correctionMethod !== 'None'
      ? ` Pairwise post-hoc comparisons were adjusted for multiple testing using the ${analysis.correctionMethod} method.`
      : '';
  return `Statistical analysis was performed in BioGrace (n = ${analysis.totalN} across ${analysis.groupCount} ${analysis.isPaired ? 'matched/paired' : 'independent'} groups). ${normText}, and variance homogeneity was evaluated with the median-centered Brown–Forsythe Levene's test.${pseudoText} Groups were compared using ${analysis.primaryTest} (omnibus ${analysis.omnibus.statisticLabel} = ${analysis.omnibus.statistic.toFixed(2)}, p = ${formatPValue(analysis.omnibus.pValue)}).${adjText} All individual observations are displayed alongside distribution density and quartiles (Raincloud plot).`;
}

export const LaymanStatsGuide: React.FC<LaymanStatsGuideProps> = ({ analysis, soundEnabled }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [copiedMethods, setCopiedMethods] = useState(false);

  const methodsSentence = buildMethodsParagraph(analysis);

  const handleCopyMethods = async () => {
    await navigator.clipboard.writeText(methodsSentence);
    setCopiedMethods(true);
    playAppleTick(soundEnabled, 'commit');
    setTimeout(() => setCopiedMethods(false), 1800);
  };

  // Visual decision path highlight
  const pathSteps = [
    {
      q: '1. Independence',
      choice: analysis.isPaired ? 'Paired / Same Subjects' : 'Independent Samples',
      detail: analysis.isPaired
        ? 'Same donor/mouse measured repeatedly'
        : 'Separate animals, wells, or patients per group',
    },
    {
      q: '2. Group Count',
      choice: analysis.groupCount === 2 ? '2 Groups' : `${analysis.groupCount} Groups (3+)`,
      detail:
        analysis.groupCount === 2
          ? 'Direct two-group contrast'
          : `Omnibus test + ${analysis.correctionMethod} multiple-testing guard`,
    },
    {
      q: '3. Data Shape',
      choice: analysis.assumptions.normalityPassed ? 'Bell-Shaped (Normal)' : 'Skewed / Bimodal / Outliers',
      detail: analysis.assumptions.normalityPassed
        ? 'Safe to compare averages (Parametric)'
        : 'Compare ranks instead of averages (Non-Parametric)',
    },
    {
      q: '4. Winning Test',
      choice: analysis.omnibus.testName,
      detail: analysis.pseudoreplicationDetected
        ? 'Nested replicates detected — collapse or use Mixed Model'
        : 'Optimal balance of accuracy & statistical power',
    },
  ];

  return (
    <motion.div
      layout
      transition={APPLE_SPRINGS.criticallyDamped}
      className="space-y-4"
    >
      {/* Plain-English Translation Card */}
      <div className="material-card rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="w-4 h-4" />
              Plain-English Biology Translator
            </div>
            <h3 className="type-title text-lg font-bold text-[var(--text-primary)] mt-0.5">
              What Does This Result Actually Mean?
            </h3>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
            No stats degree required
          </span>
        </div>

        {/* 4-Step Human Storyboard */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            <div className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              1. Plain-English Verdict on Chance (p-value)
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {interpretPPlain(analysis.omnibus.pValue)}
            </p>
          </div>

          <div className="rounded-xl p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            <div className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              2. How Big Is the Real Biological Shift?
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {interpretEffectPlain(analysis.omnibus.effectLabel, analysis.omnibus.effectSize)}
            </p>
          </div>
        </div>

        {/* Interactive Visual Decision Path Flowchart */}
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5" />
            How BioGrace Chose Your Test (Decision Path)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {pathSteps.map((step, idx) => (
              <div
                key={step.q}
                className={`rounded-xl p-3 border text-xs ${
                  idx === 3
                    ? 'bg-[var(--accent-soft)] border-[var(--accent)]/40'
                    : 'bg-[var(--bg-elevated)] border-[var(--border-hairline)]'
                }`}
              >
                <div className="text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">
                  {step.q}
                </div>
                <div className="mt-0.5 font-bold text-[var(--text-primary)]">{step.choice}</div>
                <div className="mt-1 text-[11px] text-[var(--text-secondary)] leading-snug">
                  {step.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ready-to-Paste Manuscript Methods Paragraph */}
        <div className="mt-4 rounded-xl p-4 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
              Ready-to-Paste Methods &amp; Figure Legend Text
            </div>
            <button
              type="button"
              onPointerDown={() => void handleCopyMethods()}
              className="apple-press inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-white"
            >
              {copiedMethods ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedMethods ? 'Copied to Clipboard' : 'Copy Methods Text'}
            </button>
          </div>
          <p className="text-xs italic text-[var(--text-secondary)] leading-relaxed">
            “{methodsSentence}”
          </p>
        </div>
      </div>

      {/* Expandable Wet-Lab Biologist's Statistics Glossary */}
      <div className="material-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[var(--accent)]" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Biologist’s Pocket Guide to Statistics (Click Any Concept)
            </h4>
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)]">7 essential concepts</span>
        </div>

        <div className="divide-y divide-[var(--border-hairline)]">
          {LAYMAN_GLOSSARY.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={item.term}>
                <button
                  type="button"
                  onPointerDown={() => {
                    setOpenIdx(isOpen ? null : idx);
                    playAppleTick(soundEnabled, 'select');
                  }}
                  className="w-full px-5 py-3 text-left flex items-center justify-between gap-3 hover:bg-[var(--bg-subtle)]/60 transition-colors"
                >
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-primary)]">{item.term}</div>
                    <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{item.tagline}</div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--text-tertiary)] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-subtle)]/35 pt-1">
                    {item.plain}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
