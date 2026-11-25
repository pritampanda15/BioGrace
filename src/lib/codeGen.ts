import type {
  DEPlotConfig,
  StatisticalRecommendation,
  StatsConfig,
} from '../types/biograce';
import { JOURNAL_PRESETS } from './palettes';

/* ============================================================================
 * Reproducible R (ggplot2) Code Generators
 * ========================================================================== */

export function generateDERCode(config: DEPlotConfig, inputFile = 'deseq2_results.csv'): string {
  const preset = JOURNAL_PRESETS[config.preset];
  const genesVec =
    config.labeledGenes.length > 0
      ? `c(${config.labeledGenes.map((g) => `"${g}"`).join(', ')})`
      : 'character(0)';

  if (config.plotType === 'volcano' || config.plotType === 'ma') {
    const isVolcano = config.plotType === 'volcano';
    return `# BioGrace Reproducible R Script (${preset.name} Preset)
# Install once: install.packages(c("ggplot2", "ggrepel", "dplyr", "readr"))
library(ggplot2)
library(ggrepel)
library(dplyr)
library(readr)

df <- read_csv("${inputFile}", show_col_types = FALSE) |>
  mutate(
    padj = pmax(padj, 1e-300),
    neg_log10_fdr = -log10(padj),
    log10_mean = log10(pmax(baseMean, 1)),
    status = case_when(
      padj <= ${config.fdrThreshold} & log2FoldChange >= ${config.fcThreshold}  ~ "Up",
      padj <= ${config.fdrThreshold} & log2FoldChange <= -${config.fcThreshold} ~ "Down",
      TRUE ~ "NS"
    )
  )

label_genes <- ${genesVec}

p <- ggplot(df, aes(x = ${isVolcano ? 'log2FoldChange' : 'log10_mean'}, y = ${isVolcano ? 'neg_log10_fdr' : 'log2FoldChange'}, color = status)) +
  geom_point(size = ${(config.pointSize * 0.65).toFixed(2)}, alpha = ${config.pointAlpha.toFixed(2)}) +
  scale_color_manual(values = c(Up = "${preset.upColor}", Down = "${preset.downColor}", NS = "${preset.nsColor}")) +
${
  isVolcano
    ? `  geom_vline(xintercept = c(-${config.fcThreshold}, ${config.fcThreshold}), linetype = "dashed", color = "#64748b", linewidth = 0.45) +
  geom_hline(yintercept = -log10(${config.fdrThreshold}), linetype = "dashed", color = "#64748b", linewidth = 0.45) +`
    : `  geom_hline(yintercept = c(-${config.fcThreshold}, ${config.fcThreshold}), linetype = "dashed", color = "#64748b", linewidth = 0.45) +
  geom_hline(yintercept = 0, color = "#334155", linewidth = 0.4) +`
}
  geom_text_repel(
    data = filter(df, gene %in% label_genes),
    aes(label = gene),
    color = "#1d1d1f",
    fontface = "bold",
    size = 3.3,
    box.padding = 0.45,
    max.overlaps = 30
  ) +
  labs(
    title = "${config.title}",
    subtitle = "|log2FC| >= ${config.fcThreshold}, FDR <= ${config.fdrThreshold}",
    x = "${isVolcano ? 'log2 Fold Change' : 'log10 Mean Expression (baseMean)'}",
    y = "${isVolcano ? '-log10 Adjusted P-value (FDR)' : 'log2 Fold Change'}",
    color = NULL
  ) +
  theme_classic(base_size = ${config.fontSize}, base_family = "Helvetica") +
  theme(
    plot.title = element_text(face = "bold"),
    legend.position = "top"
  )

ggsave("biograce_${config.plotType}.pdf", p, width = 7.2, height = 5.0, device = cairo_pdf)
ggsave("biograce_${config.plotType}.svg", p, width = 7.2, height = 5.0)
`;
  }

  if (config.plotType === 'dotplot') {
    return `# BioGrace Single-Cell Marker Dot Plot (${preset.name} Preset)
library(ggplot2)
library(readr)

df <- read_csv("${inputFile}", show_col_types = FALSE)

p <- ggplot(df, aes(x = gene, y = cluster, size = pct_expr, color = avg_expr)) +
  geom_point() +
  scale_color_gradientn(colors = c(${preset.sequential.map((c) => `"${c}"`).join(', ')})) +
  scale_size_area(max_size = 9, limits = c(0, 100)) +
  labs(
    title = "${config.title}",
    x = NULL, y = NULL,
    color = "Mean Expr (z)",
    size = "% Expressed"
  ) +
  theme_bw(base_size = ${config.fontSize}, base_family = "Helvetica") +
  theme(
    axis.text.x = element_text(angle = 45, hjust = 1, face = "italic"),
    panel.grid.minor = element_blank()
  )

ggsave("biograce_dotplot.pdf", p, width = 8.0, height = 5.2, device = cairo_pdf)
`;
  }

  if (config.plotType === 'upset') {
    return `# BioGrace Publication UpSet Plot (${preset.name} Preset)
# Install once: install.packages(c("ComplexUpset", "ggplot2", "readr"))
library(ComplexUpset)
library(ggplot2)
library(readr)

df <- read_csv("${inputFile}", show_col_types = FALSE)
set_cols <- setdiff(colnames(df), c("gene", "id"))

p <- upset(
  df,
  intersect = set_cols,
  base_annotations = list(
    "Intersection Size" = intersection_size(
      fill = "${preset.downColor}",
      counts = TRUE
    )
  ),
  set_sizes = upset_set_size(geom = geom_bar(fill = "${preset.accentColor}"))
) +
  ggtitle("${config.title}")

ggsave("biograce_upset.pdf", p, width = 8.2, height = 5.4, device = cairo_pdf)
`;
  }

  return `# BioGrace Ranked Pathway Lollipop Chart (${preset.name} Preset)
library(ggplot2)
library(dplyr)
library(readr)

df <- read_csv("${inputFile}", show_col_types = FALSE) |>
  arrange(nes) |>
  mutate(
    pathway = factor(pathway, levels = pathway),
    direction = ifelse(nes >= 0, "Activated", "Suppressed")
  )

p <- ggplot(df, aes(x = nes, y = pathway, color = direction)) +
  geom_vline(xintercept = 0, color = "#334155", linewidth = 0.5) +
  geom_segment(aes(x = 0, xend = nes, yend = pathway), linewidth = 0.9) +
  geom_point(aes(size = geneCount)) +
  scale_color_manual(values = c(Activated = "${preset.upColor}", Suppressed = "${preset.downColor}")) +
  scale_size_area(max_size = 8) +
  labs(
    title = "${config.title}",
    x = "Normalized Enrichment Score (NES)",
    y = NULL, color = "Direction", size = "Gene Count"
  ) +
  theme_classic(base_size = ${config.fontSize}, base_family = "Helvetica")

ggsave("biograce_lollipop.pdf", p, width = 8.4, height = 5.6, device = cairo_pdf)
`;
}

export function generateDEPythonCode(config: DEPlotConfig, inputFile = 'deseq2_results.csv'): string {
  const preset = JOURNAL_PRESETS[config.preset];
  const genesPy = `[${config.labeledGenes.map((g) => `"${g}"`).join(', ')}]`;

  if (config.plotType === 'volcano' || config.plotType === 'ma') {
    const isVolcano = config.plotType === 'volcano';
    return `# BioGrace Reproducible Python Script (${preset.name} Preset)
# pip install pandas numpy matplotlib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("${inputFile}")
df["padj"] = df["padj"].clip(lower=1e-300)
df["neg_log10_fdr"] = -np.log10(df["padj"])
df["log10_mean"] = np.log10(df["baseMean"].clip(lower=1))

up = (df["padj"] <= ${config.fdrThreshold}) & (df["log2FoldChange"] >= ${config.fcThreshold})
down = (df["padj"] <= ${config.fdrThreshold}) & (df["log2FoldChange"] <= -${config.fcThreshold})
ns = ~(up | down)

fig, ax = plt.subplots(figsize=(7.4, 5.1), dpi=300)
x_col = "${isVolcano ? 'log2FoldChange' : 'log10_mean'}"
y_col = "${isVolcano ? 'neg_log10_fdr' : 'log2FoldChange'}"

ax.scatter(df.loc[ns, x_col], df.loc[ns, y_col], s=${(config.pointSize * 5).toFixed(0)}, c="${preset.nsColor}", alpha=${(config.pointAlpha * 0.65).toFixed(2)}, linewidths=0, label=f"NS ({ns.sum()})")
ax.scatter(df.loc[down, x_col], df.loc[down, y_col], s=${(config.pointSize * 6).toFixed(0)}, c="${preset.downColor}", alpha=${config.pointAlpha.toFixed(2)}, linewidths=0, label=f"Down ({down.sum()})")
ax.scatter(df.loc[up, x_col], df.loc[up, y_col], s=${(config.pointSize * 6).toFixed(0)}, c="${preset.upColor}", alpha=${config.pointAlpha.toFixed(2)}, linewidths=0, label=f"Up ({up.sum()})")

${
  isVolcano
    ? `ax.axvline(${config.fcThreshold}, ls="--", lw=1, color="#64748b", alpha=0.6)
ax.axvline(-${config.fcThreshold}, ls="--", lw=1, color="#64748b", alpha=0.6)
ax.axhline(-np.log10(${config.fdrThreshold}), ls="--", lw=1, color="#64748b", alpha=0.6)`
    : `ax.axhline(${config.fcThreshold}, ls="--", lw=1, color="#64748b", alpha=0.6)
ax.axhline(-${config.fcThreshold}, ls="--", lw=1, color="#64748b", alpha=0.6)
ax.axhline(0, lw=0.8, color="#334155", alpha=0.4)`
}

for _, row in df[df["gene"].isin(${genesPy})].iterrows():
    ax.annotate(row["gene"], (row[x_col], row[y_col]), xytext=(6, 6), textcoords="offset points", fontsize=9, fontweight="bold")

ax.set_title("${config.title}", loc="left", fontweight="bold", pad=12)
ax.set_xlabel("${isVolcano ? 'log2 Fold Change' : 'log10 Mean Expression (baseMean)'}")
ax.set_ylabel("${isVolcano ? '-log10 Adjusted P-value (FDR)' : 'log2 Fold Change'}")
ax.spines[["top", "right"]].set_visible(False)
ax.legend(frameon=False, ncol=3, loc="upper right")
fig.tight_layout()
fig.savefig("biograce_${config.plotType}.svg")
fig.savefig("biograce_${config.plotType}.pdf")
`;
  }

  return `# BioGrace Reproducible Python Script (${config.plotType} · ${preset.name} Preset)
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv("${inputFile}")
sns.set_theme(style="ticks", font_scale=1.05)
fig, ax = plt.subplots(figsize=(8.0, 5.2), dpi=300)
${
  config.plotType === 'dotplot'
    ? `sns.scatterplot(data=df, x="gene", y="cluster", size="pct_expr", hue="avg_expr", sizes=(20, 260), palette="viridis", ax=ax)
plt.xticks(rotation=45, ha="right", style="italic")`
    : config.plotType === 'lollipop'
    ? `df = df.sort_values("nes")
colors = ["${preset.upColor}" if v >= 0 else "${preset.downColor}" for v in df["nes"]]
ax.axvline(0, color="#334155", lw=1)
ax.hlines(df["pathway"], 0, df["nes"], color=colors, lw=2.2)
ax.scatter(df["nes"], df["pathway"], s=df["geneCount"] * 1.4, c=colors, zorder=3)
ax.set_xlabel("Normalized Enrichment Score (NES)")`
    : `# For UpSet plots in Python: pip install upsetplot
from upsetplot import from_indicators, plot
set_cols = [c for c in df.columns if c not in ("gene", "id")]
upset_series = from_indicators(set_cols, df[set_cols].astype(bool))
plot(upset_series, sort_by="cardinality", show_counts=True)`
}
ax.set_title("${config.title}", loc="left", fontweight="bold")
sns.despine()
fig.tight_layout()
fig.savefig("biograce_${config.plotType}.pdf")
fig.savefig("biograce_${config.plotType}.svg")
`;
}

export function generateDECliCommand(config: DEPlotConfig, inputFile = 'deseq2_results.csv'): string {
  const labelFlag =
    config.labeledGenes.length > 0 ? ` \\\n  --label "${config.labeledGenes.slice(0, 8).join(',')}"` : '';
  return `# Run directly from your terminal (zero browser required)
npx biograce plot ${inputFile} \\
  --type ${config.plotType} \\
  --preset ${config.preset} \\
  --fc ${config.fcThreshold} \\
  --fdr ${config.fdrThreshold}${labelFlag} \\
  --out figure_${config.plotType}.svg \\
  --code-r plot_${config.plotType}.R \\
  --code-py plot_${config.plotType}.py`;
}

/* ============================================================================
 * Studio 2: Statistical Advisor & Anti-Barplot R / Python / CLI Code Generators
 * ========================================================================== */

export function generateStatsRCode(
  config: StatsConfig,
  analysis: StatisticalRecommendation,
  inputFile = 'experiment_tidy.csv'
): string {
  const preset = JOURNAL_PRESETS[config.preset];
  const paletteStr = `c(${preset.categorical.slice(0, Math.max(2, analysis.groupCount)).map((c) => `"${c}"`).join(', ')})`;
  const padjR = config.correctionMethod === 'BH-FDR' ? 'BH' : config.correctionMethod === 'Holm' ? 'holm' : 'none';

  const testBlock = analysis.pseudoreplicationDetected && !analysis.collapsedReplicates
    ? `# Linear Mixed-Effects Model to account for nested technical replicates
library(lme4)
library(lmerTest)
fit <- lmer(value ~ group + (1 | replicate), data = df)
anova(fit)
summary(fit)`
    : analysis.groupCount === 2
    ? analysis.isPaired
      ? analysis.family === 'parametric'
        ? `stat_test <- df |> t_test(value ~ group, paired = TRUE) |> add_significance()`
        : `stat_test <- df |> wilcox_test(value ~ group, paired = TRUE) |> add_significance()`
      : analysis.family === 'parametric'
      ? `stat_test <- df |> t_test(value ~ group, var.equal = FALSE) |> add_significance() # Welch's t-test`
      : `stat_test <- df |> wilcox_test(value ~ group) |> add_significance() # Mann-Whitney U`
    : analysis.family === 'parametric'
    ? `omnibus <- welch_anova_test(df, value ~ group)
stat_test <- df |> pairwise_t_test(value ~ group, pool.sd = FALSE, p.adjust.method = "${padjR}")`
    : `omnibus <- kruskal_test(df, value ~ group)
stat_test <- df |> pairwise_wilcox_test(value ~ group, p.adjust.method = "${padjR}")`;

  return `# BioGrace Statistical Test Advisor & Anti-Barplot Script (${preset.name} Preset)
# Recommended Protocol: ${analysis.primaryTest}
# Install once: install.packages(c("ggplot2", "ggdist", "ggbeeswarm", "rstatix", "dplyr", "readr"))
library(ggplot2)
library(ggdist)
library(ggbeeswarm)
library(rstatix)
library(dplyr)
library(readr)

df <- read_csv("${inputFile}", show_col_types = FALSE)
${
  analysis.collapsedReplicates
    ? `\n# Collapse technical replicates to biological replicate means (prevents pseudoreplication)
df <- df |> group_by(group, replicate) |> summarise(value = mean(value), .groups = "drop")\n`
    : ''
}
# 1. Assumption Diagnostics
df |> group_by(group) |> shapiro_test(value)
df |> levene_test(value ~ group, center = median)

# 2. Recommended Hypothesis Test
${testBlock}
print(stat_test)

# 3. Anti-Barplot Publication Figure (Raincloud = Half-Violin + Boxplot + Raw Beeswarm)
pal <- ${paletteStr}

p <- ggplot(df, aes(x = group, y = value, fill = group, color = group)) +
  stat_halfeye(
    adjust = 0.75, width = 0.55, .width = 0,
    justification = -0.22, point_colour = NA, alpha = 0.35
  ) +
  geom_boxplot(width = 0.14, outlier.shape = NA, alpha = 0.25, color = "#1d1d1f") +
  geom_beeswarm(side = -1L, cex = 2.0, size = 2.1, alpha = 0.85) +
  scale_fill_manual(values = pal) +
  scale_color_manual(values = pal) +
  labs(
    title = "${config.title}",
    subtitle = "${analysis.primaryTest}",
    x = "${config.xLabel}",
    y = "${config.yLabel}"
  ) +
  theme_classic(base_size = 12, base_family = "Helvetica") +
  theme(legend.position = "none", plot.title = element_text(face = "bold"))

ggsave("biograce_raincloud.pdf", p, width = 7.2, height = 5.0, device = cairo_pdf)
ggsave("biograce_raincloud.svg", p, width = 7.2, height = 5.0)
`;
}

export function generateStatsPythonCode(
  config: StatsConfig,
  analysis: StatisticalRecommendation,
  inputFile = 'experiment_tidy.csv'
): string {
  const preset = JOURNAL_PRESETS[config.preset];
  const palPy = `[${preset.categorical.slice(0, Math.max(2, analysis.groupCount)).map((c) => `"${c}"`).join(', ')}]`;
  const fdrMethod = config.correctionMethod === 'BH-FDR' ? 'fdr_bh' : config.correctionMethod === 'Holm' ? 'holm' : 'none';

  return `# BioGrace Statistical Test Advisor & Anti-Barplot Script (Python)
# Recommended Protocol: ${analysis.primaryTest}
# pip install pandas numpy scipy statsmodels matplotlib seaborn
import itertools
import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv("${inputFile}")
${
  analysis.collapsedReplicates
    ? `# Collapse technical replicates to biological replicate means
df = df.groupby(["group", "replicate"], as_index=False)["value"].mean()\n`
    : ''
}
groups = [g for g, _ in df.groupby("group", sort=False)]
arrays = [sub["value"].to_numpy() for _, sub in df.groupby("group", sort=False)]

# 1. Assumption Diagnostics
for g, arr in zip(groups, arrays):
    w, p = stats.shapiro(arr)
    print(f"Shapiro-Wilk [{g}]: W={w:.3f}, p={p:.4g}")
lev_stat, lev_p = stats.levene(*arrays, center="median")
print(f"Brown-Forsythe Levene: F={lev_stat:.3f}, p={lev_p:.4g}")

# 2. Recommended Hypothesis Test (${analysis.primaryTest})
${
  analysis.groupCount === 2
    ? analysis.isPaired
      ? analysis.family === 'parametric'
        ? `stat, pval = stats.ttest_rel(arrays[0], arrays[1])`
        : `stat, pval = stats.wilcoxon(arrays[0], arrays[1])`
      : analysis.family === 'parametric'
      ? `stat, pval = stats.ttest_ind(arrays[0], arrays[1], equal_var=False)  # Welch's t-test`
      : `stat, pval = stats.mannwhitneyu(arrays[0], arrays[1], alternative="two-sided")`
    : analysis.family === 'parametric'
    ? `stat, pval = stats.f_oneway(*arrays)  # Check Welch ANOVA via pingouin.welch_anova`
    : `stat, pval = stats.kruskal(*arrays)`
}
print(f"Omnibus: stat={stat:.3f}, p={pval:.4g}")

# Pairwise post-hoc with ${config.correctionMethod} adjustment
pairs = list(itertools.combinations(range(len(groups)), 2))
raw_p = [
    ${analysis.family === 'parametric' ? 'stats.ttest_ind(arrays[i], arrays[j], equal_var=False).pvalue' : 'stats.mannwhitneyu(arrays[i], arrays[j]).pvalue'}
    for i, j in pairs
]
${fdrMethod !== 'none' ? `_, adj_p, _, _ = multipletests(raw_p, method="${fdrMethod}")` : 'adj_p = raw_p'}
for (i, j), p_r, p_a in zip(pairs, raw_p, adj_p):
    print(f"{groups[i]} vs {groups[j]}: raw p={p_r:.4g}, adj q={p_a:.4g}")

# 3. Anti-Barplot Figure (Violin + Boxplot + Raw Swarm)
fig, ax = plt.subplots(figsize=(7.2, 5.0), dpi=300)
pal = ${palPy}
sns.violinplot(data=df, x="group", y="value", palette=pal, inner=None, alpha=0.28, cut=0, ax=ax)
sns.boxplot(data=df, x="group", y="value", width=0.22, showcaps=True, boxprops={"facecolor": "none", "zorder": 3}, showfliers=False, ax=ax)
sns.swarmplot(data=df, x="group", y="value", palette=pal, size=5.2, edgecolor="white", linewidth=0.8, ax=ax)

ax.set_title("${config.title}", loc="left", fontweight="bold", pad=12)
ax.set_xlabel("${config.xLabel}")
ax.set_ylabel("${config.yLabel}")
sns.despine()
fig.tight_layout()
fig.savefig("biograce_raincloud.svg")
fig.savefig("biograce_raincloud.pdf")
`;
}

export function generateStatsCliCommand(config: StatsConfig, inputFile = 'experiment_tidy.csv'): string {
  const pairedFlag = config.isPaired ? ' \\\n  --paired' : '';
  const collapseFlag = config.collapsePseudoreplicates ? ' \\\n  --collapse-replicates' : '';
  return `# Run statistical assumption checks + raincloud SVG + R/Python scripts via CLI
npx biograce stats ${inputFile} \\
  --plot ${config.plotType} \\
  --preset ${config.preset} \\
  --adjust ${config.correctionMethod}${pairedFlag}${collapseFlag} \\
  --out raincloud.svg \\
  --report stats_report.json \\
  --code-r stats_analysis.R \\
  --code-py stats_analysis.py`;
}
