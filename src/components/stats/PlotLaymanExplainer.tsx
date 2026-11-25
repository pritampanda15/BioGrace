import React, { useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, Check, Copy, GraduationCap, Lightbulb, Sparkles } from 'lucide-react';
import type { DEPlotType } from '../../types/biograce';
import type { DosePoint, PairXYRow, ROCInputRow, SurvivalRow } from '../../lib/bioAnalytics';
import {
  computeCorrelationBlandAltman,
  computeKaplanMeier,
  computeROCCurves,
  fitDoseResponse4PL,
  formatConc,
} from '../../lib/bioAnalytics';
import { formatPValue } from '../../lib/statsEngine';
import { playAppleTick } from '../../motion/applePhysics';

interface PlotLaymanExplainerProps {
  plotType: DEPlotType;
  pc1Var: number;
  pc2Var: number;
  dosePoints: DosePoint[];
  survivalRows: SurvivalRow[];
  rocRows: ROCInputRow[];
  corrRows: PairXYRow[];
  soundEnabled: boolean;
}

interface ExplainerContent {
  headline: string;
  whatItIs: string;
  statsMeaning: string;
  pitfall: string;
  methodsSentence: string;
}

export const PlotLaymanExplainer: React.FC<PlotLaymanExplainerProps> = ({
  plotType,
  pc1Var,
  pc2Var,
  dosePoints,
  survivalRows,
  rocRows,
  corrRows,
  soundEnabled,
}) => {
  const [copied, setCopied] = useState(false);

  const content: ExplainerContent = useMemo(() => {
    switch (plotType) {
      case 'umap':
        return {
          headline: 'Understanding Single-Cell UMAP Embeddings',
          whatItIs:
            'UMAP compresses 20,000+ gene measurements per cell down to a 2D map so cells with similar transcriptomes sit together in islands (clusters). Switch to "FeaturePlot" mode to light up where a specific marker gene is turned on.',
          statsMeaning:
            'UMAP preserves local cell neighborhoods well and keeps broad global structure better than t-SNE. Clusters that sit near each other often share developmental lineage (e.g., CD4 T and CD8 T), while distant islands represent distinct lineages (e.g., Myeloid vs. Lymphoid).',
          pitfall:
            'UMAP coordinates (UMAP 1, UMAP 2) have NO physical units and are non-linear — never run a t-test on UMAP coordinates or treat empty white space between two islands as exact biological distance. Always confirm differences with differential expression or marker dot plots.',
          methodsSentence:
            'Single-cell transcriptomic profiles were embedded in two dimensions using UMAP on top principal components; cell-type identities were assigned using canonical lineage markers and visualized with FeaturePlot overlays.',
        };

      case 'tsne':
        return {
          headline: 'Understanding Single-Cell t-SNE Plots',
          whatItIs:
            't-SNE (t-distributed Stochastic Neighbor Embedding) arranges thousands of single cells on a 2D canvas so each cell stays tightly grouped with its nearest transcriptional neighbors, making discrete cell clusters pop apart cleanly.',
          statsMeaning:
            't-SNE focuses strongly on local similarity controlled by its "perplexity" parameter (roughly the effective number of neighbors per cell). Tight, well-separated blobs indicate distinct cell populations with consistent marker signatures.',
          pitfall:
            'Classic t-SNE trap: cluster SIZE and the DISTANCE between two separate clusters are mathematically meaningless! A huge, spread-out cluster does NOT necessarily have higher biological variance than a tiny dense cluster, and two clusters placed far apart are not necessarily more different than closer ones.',
          methodsSentence:
            'Single-cell dimensionality reduction was visualized via t-SNE; local neighborhood structure and canonical marker expression were inspected across annotated clusters.',
        };

      case 'pca':
        return {
          headline: 'Understanding PCA & 95% Confidence Ellipses',
          whatItIs:
            'Principal Component Analysis (PCA) finds the single direction (PC1) across all your genes/proteins that captures the biggest differences between samples, then the second perpendicular direction (PC2). It is the #1 quality-control check to see whether biological replicates cluster by treatment — or accidentally by batch/date!',
          statsMeaning: `Here, PC1 captures ${pc1Var.toFixed(1)}% and PC2 captures ${pc2Var.toFixed(1)}% of total variance (${(pc1Var + pc2Var).toFixed(1)}% combined). Each dashed 95% confidence ellipse marks the region where ~95% of biological replicates from that condition are expected to fall — clearly separated ellipses indicate strong, reproducible global transcriptional shifts.`,
          pitfall:
            'If PC1 + PC2 explain less than ~30% of variance, two overlapping ellipses do NOT mean there is no biological difference — the treatment effect might live on PC3 or PC4, or a hidden batch effect (technician/sequencing lane) might be dominating PC1!',
          methodsSentence: `Global sample variance was evaluated by Principal Component Analysis (PCA); PC1 and PC2 explained ${pc1Var.toFixed(1)}% and ${pc2Var.toFixed(1)}% of total variance, respectively, with 95% bivariate normal confidence ellipses shown per group.`,
        };

      case 'dose-response': {
        const comps = [...new Set(dosePoints.map((p) => p.compound))];
        const fits = comps.map((c) =>
          fitDoseResponse4PL(c, dosePoints.filter((p) => p.compound === c))
        );
        const lead = fits[0];
        return {
          headline: 'Understanding 4PL Dose–Response Curves, IC₅₀ & Hill Slope',
          whatItIs:
            'A dose–response curve measures how strongly a drug inhibits (IC₅₀) or activates (EC₅₀) a biological target across serial dilutions on a log10 concentration scale, fitted with the 4-Parameter Logistic (4PL) Hill equation.',
          statsMeaning: lead
            ? `${lead.compound} reaches half-maximal inhibition at IC₅₀ = ${formatConc(lead.ic50)} (lower IC₅₀ = more potent drug!). Its Hill slope is ${lead.hillSlope.toFixed(2)} (~1.0 = classic 1:1 target binding; >2.0 = steep switch-like cooperativity or off-target toxicity), and R² = ${lead.rSquared.toFixed(3)} shows how tightly the curve matches your replicates.`
            : 'IC₅₀ is the drug concentration giving 50% of the maximal effect between the top and bottom plateaus.',
          pitfall:
            'Never trust an IC₅₀ if your curve lacks a clear upper plateau (at low doses) AND lower plateau (at high doses), or if you only tested 3–4 concentrations. Also check whether the drug hits 0% viability (complete killing) vs. plateaus at 40% (cytostatic/partial inhibitor) — IC₅₀ alone hides partial efficacy!',
          methodsSentence: lead
            ? `Dose–response curves were fitted using a four-parameter logistic (4PL) Hill model across log10-transformed concentrations (${lead.compound}: IC50 = ${formatConc(lead.ic50)}, Hill slope = ${lead.hillSlope.toFixed(2)}, R² = ${lead.rSquared.toFixed(3)}).`
            : 'Dose–response curves were fitted with a four-parameter logistic (4PL) nonlinear regression model.',
        };
      }

      case 'survival': {
        const km = computeKaplanMeier(survivalRows);
        const medStr = km.arms
          .map((a) => `${a.group}: ${a.medianSurvival !== null ? `${a.medianSurvival} mo` : 'Not Reached'}`)
          .join(' vs. ');
        return {
          headline: 'Understanding Kaplan–Meier Survival, Censoring & Log-Rank Test',
          whatItIs:
            'Kaplan–Meier curves track the percentage of patients or mice still event-free (alive or progression-free) over time. Unlike simple averages, it properly handles "censored" subjects (+ ticks) who are still alive when the study ends or left follow-up early.',
          statsMeaning: `Median survival (${medStr}) is the time when half the cohort has experienced an event. The Mantel–Cox Log-Rank test compares the entire curves over time (χ² = ${km.logRankChi2.toFixed(2)}, p = ${formatPValue(km.logRankP)})${km.logRankP < 0.05 ? ' — strong evidence that survival differs between arms.' : ' — insufficient evidence of a survival separation.'} Shaded ribbons are 95% Greenwood confidence intervals.`,
          pitfall:
            'Always include the "Number at Risk" table! Near the right tail of the plot, only 2–4 subjects remain, so a single late death creates a giant scary-looking drop that is actually tiny in sample size. Also, if two curves cross each other, the standard Log-Rank test loses power.',
          methodsSentence: `Survival probabilities were estimated using the Kaplan–Meier method with 95% Greenwood confidence intervals and compared between arms via the two-sided Mantel–Cox log-rank test (χ² = ${km.logRankChi2.toFixed(2)}, p = ${formatPValue(km.logRankP)}).`,
        };
      }

      case 'forest':
        return {
          headline: 'Understanding Forest Plots & Hazard / Odds Ratios',
          whatItIs:
            'A Forest Plot displays how much each biological factor or clinical variable raises or lowers risk, plotted on a log scale so a 2× risk increase (2.0) and a 2× risk reduction (0.5) sit symmetrically around the dashed "no effect" line at 1.0.',
          statsMeaning:
            'HR (or OR) < 1.0 means protective (e.g., HR = 0.44 means a 56% lower hazard rate); HR > 1.0 means higher risk (e.g., HR = 1.88 means an 88% higher hazard). The horizontal whisker is the 95% confidence interval: if the whisker does NOT cross 1.0, the effect is statistically significant at p < 0.05.',
          pitfall:
            'Watch the width of the 95% CI whisker, not just the square! A very wide whisker (e.g., 0.3 to 4.5) means low precision / small sample size even if the point estimate looks dramatic. Always plot ratios on a LOG scale — linear axes distort protective effects (<1).',
          methodsSentence:
            'Multivariable Cox proportional hazards regression estimates are presented as hazard ratios (HR) with 95% confidence intervals on a logarithmic scale relative to the null reference (HR = 1.0).',
        };

      case 'roc': {
        const models = computeROCCurves(rocRows);
        const best = models[0];
        return {
          headline: 'Understanding ROC Curves, AUROC & Youden Cutoff',
          whatItIs:
            'An ROC curve tests how accurately a biomarker or gene signature separates true positives (e.g., drug responders or cancer) from true negatives across every possible cutoff threshold.',
          statsMeaning: best
            ? `AUROC (Area Under the Curve) ranges from 0.50 (coin-flip diagonal) to 1.00 (perfect test). ${best.model} achieves AUROC = ${best.auc.toFixed(3)} (95% CI ${best.ciLow.toFixed(2)}–${best.ciHigh.toFixed(2)}) — meaning if you pick one random positive and one random negative patient, the biomarker ranks the positive higher ${(best.auc * 100).toFixed(1)}% of the time! The dot marks the optimal Youden J threshold (Sensitivity ${Math.round(best.bestTpr * 100)}%, Specificity ${Math.round((1 - best.bestFpr) * 100)}%).`
            : 'AUROC = 0.50 is random guessing; > 0.80 is strong diagnostic discrimination; > 0.90 is outstanding.',
          pitfall:
            'ROC curves can look overly optimistic when positives are rare (e.g., 2% disease prevalence) because specificity stays high even with many false alarms. Always validate biomarkers on an independent held-out cohort so you aren’t measuring overfitting!',
          methodsSentence: best
            ? `Diagnostic discrimination was quantified via receiver operating characteristic (ROC) analysis (${best.model}: AUROC = ${best.auc.toFixed(3)}, 95% CI ${best.ciLow.toFixed(2)}–${best.ciHigh.toFixed(2)}); optimal operating cutoffs were selected by maximizing Youden's J statistic.`
            : 'Biomarker performance was assessed using ROC analysis with trapezoidal AUROC and 95% confidence intervals.',
        };
      }

      case 'correlation': {
        const st = computeCorrelationBlandAltman(corrRows);
        return {
          headline: 'Correlation (Pearson r / Spearman ρ) vs. Bland–Altman Agreement',
          whatItIs:
            'Use Correlation to ask "Do Method A and Method B move up and down together?" Switch to Bland–Altman to ask the stricter wet-lab question: "Do both assays actually give the SAME numerical value, or is one systematically offset?"',
          statsMeaning: `Pearson r = ${st.pearsonR.toFixed(3)} (R² = ${st.rSquared.toFixed(3)}, p = ${formatPValue(st.pearsonP)}) measures linear tracking, while Spearman ρ = ${st.spearmanRho.toFixed(3)} measures rank agreement (immune to outliers). In Bland–Altman view, Mean Bias = ${st.bias > 0 ? '+' : ''}${st.bias.toFixed(2)} and 95% of sample differences fall between ${st.loaLower.toFixed(2)} and ${st.loaUpper.toFixed(2)} (Limits of Agreement).`,
          pitfall:
            'Famous assay-validation trap: if Method B always reads exactly 2× higher than Method A, Pearson r = 1.000 (looks "perfect"!), yet the two instruments completely disagree! Always inspect the Bland–Altman bias and Limits of Agreement before swapping assays.',
          methodsSentence: `Inter-assay concordance was assessed by Pearson (r = ${st.pearsonR.toFixed(3)}, p = ${formatPValue(st.pearsonP)}) and Spearman rank correlation (ρ = ${st.spearmanRho.toFixed(3)}), alongside Bland–Altman agreement analysis (mean bias = ${st.bias.toFixed(2)}, 95% LoA ${st.loaLower.toFixed(2)} to ${st.loaUpper.toFixed(2)}).`,
        };
      }

      case 'heatmap':
        return {
          headline: 'Understanding Row Z-Scored Expression Heatmaps',
          whatItIs:
            'Each row is a gene, each column is a sample, and colors show whether a gene is higher (warm) or lower (cool) than its own average across all samples. The top color bar shows which experimental group each sample belongs to.',
          statsMeaning:
            'Row Z-scoring subtracts each gene’s mean and divides by its standard deviation: +2.0 means 2 SDs above that gene’s average; 0.0 is average; −2.0 is 2 SDs below. This lets low-abundance transcription factors (like IRF1) and high-abundance genes (like HLA-DRA) share the same readable color scale.',
          pitfall:
            'Because every row is rescaled independently, a bright red square in Row A does NOT mean Gene A has more raw mRNA molecules than Gene B — only that Gene A is elevated in that sample relative to other samples in the same row!',
          methodsSentence:
            'Differentially expressed genes were visualized as row-wise z-scored expression heatmaps with sample condition annotations.',
        };

      case 'pseudotime':
        return {
          headline: 'Understanding Single-Cell Pseudotime Trajectories',
          whatItIs:
            'Pseudotime orders static snapshot single cells along a continuous biological progression (0 → 1, such as Stem → Activated → Terminal Effector) based on gradual transcriptional transitions, without needing time-lapse microscopy.',
          statsMeaning:
            'Solid curves show smoothed average expression along the trajectory, while shaded bands represent ±95% confidence intervals around the smoothed trend — showing exactly when early, transient, and late marker genes turn on or off.',
          pitfall:
            'Pseudotime is transcriptional progress, NOT real clock hours! A cell could zip through pseudotime 0.2→0.5 in 2 hours and linger at 0.8 for days. Always anchor the starting state (root = 0) with known biology or lineage-tracing experiments.',
          methodsSentence:
            'Continuous gene expression dynamics along inferred differentiation pseudotime were visualized as smoothed trend curves with 95% confidence ribbons.',
        };

      default:
        return {
          headline: 'Reading Publication Differential Expression Plots',
          whatItIs:
            'Differential expression plots balance biological magnitude (log2 Fold Change: how much a gene rose or fell) against statistical confidence (FDR-adjusted q-value: how unlikely the shift is due to noise after correcting for testing thousands of genes).',
          statsMeaning:
            'A log2FC of +1 means 2× higher expression; +2 means 4×; −1 means halved (0.5×). Always use FDR-adjusted p-values (padj / q-value) rather than raw p-values because testing 20,000 genes at raw p < 0.05 produces ~1,000 false hits purely by chance.',
          pitfall:
            'Huge fold changes in very lowly expressed genes can look dramatic on a Volcano plot — check the MA plot (abundance vs. fold change) or baseMean to verify your top hits are robustly expressed and not low-count noise!',
          methodsSentence:
            'Differential expression results were filtered by |log2 fold change| and Benjamini–Hochberg FDR thresholds and visualized with publication-ready vector annotations.',
        };
    }
  }, [plotType, pc1Var, pc2Var, dosePoints, survivalRows, rocRows, corrRows]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content.methodsSentence);
    setCopied(true);
    playAppleTick(soundEnabled, 'commit');
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="material-card rounded-2xl p-5 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <GraduationCap className="w-4 h-4" />
            Plain-English Guide for Biologists
          </div>
          <h3 className="type-title text-base font-bold text-[var(--text-primary)] mt-0.5">
            {content.headline}
          </h3>
        </div>
        <button
          type="button"
          onPointerDown={() => void handleCopy()}
          className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-white"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied Legend / Methods' : 'Copy Methods Text'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
          <div className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            What Am I Looking At?
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">{content.whatItIs}</p>
        </div>

        <div className="rounded-xl p-3.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
          <div className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
            What Do the Numbers Mean?
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">{content.statsMeaning}</p>
        </div>

        <div className="rounded-xl p-3.5 bg-amber-500/8 border border-amber-500/25">
          <div className="font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Common Pitfall to Avoid
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">{content.pitfall}</p>
        </div>
      </div>

      <div className="rounded-xl px-3.5 py-2.5 bg-[var(--bg-subtle)]/70 border border-[var(--border-hairline)] text-xs text-[var(--text-secondary)] flex items-start gap-2">
        <BookOpen className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
        <span className="italic leading-relaxed">“{content.methodsSentence}”</span>
      </div>
    </div>
  );
};
