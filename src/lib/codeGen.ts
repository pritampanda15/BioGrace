import type {
  DEPlotConfig,
  PublicationStyleSettings,
  StatisticalRecommendation,
  StatsConfig,
} from '../types/biograce';
import { FONT_FAMILIES, resolvePlotTheme } from './palettes';

function buildPythonRcBlock(settings: PublicationStyleSettings): string {
  const t = resolvePlotTheme(settings);
  const wIn = (t.widthMm / 25.4).toFixed(2);
  const hIn = ((t.widthMm * 0.68) / 25.4).toFixed(2);
  return `# Journal Typography & Style (${t.journal.name} · ${t.widthMm} mm · ${t.dpi} DPI)
plt.rcParams.update({
    "font.family": "${t.fontFamilyKey}",
    "font.sans-serif": ["Helvetica", "Arial", "DejaVu Sans", "Liberation Sans"],
    "font.serif": ["Times New Roman", "Georgia", "DejaVu Serif"],
    "font.size": ${settings.fontSizePt.toFixed(1)},
    "axes.linewidth": ${t.journal.axesLinewidth},
    "axes.spines.top": ${t.topRightSpines ? 'True' : 'False'},
    "axes.spines.right": ${t.topRightSpines ? 'True' : 'False'},
    "xtick.direction": "${t.tickDirection}",
    "ytick.direction": "${t.tickDirection}",
    "xtick.top": ${t.tickTopRight ? 'True' : 'False'},
    "ytick.right": ${t.tickTopRight ? 'True' : 'False'},
    "lines.linewidth": ${t.lineWidth.toFixed(2)},
    "pdf.fonttype": 42,
    "ps.fonttype": 42,
    "svg.fonttype": "none",
})
FIGSIZE = (${wIn}, ${hIn})  # ${t.widthMm} mm (${settings.columnWidth} column)`;
}

/* ============================================================================
 * Studio 1: Reproducible R / Python / CLI Code Generators
 * ========================================================================== */

export function generateDERCode(config: DEPlotConfig, inputFile = 'deseq2_results.csv'): string {
  const t = resolvePlotTheme(config);
  const rFont = FONT_FAMILIES[t.fontFamilyKey].rFamily;
  const rBaseTheme = t.topRightSpines ? 'theme_bw' : 'theme_classic';
  const rTicks =
    t.tickDirection === 'in'
      ? `    axis.ticks.length = unit(-0.14, "cm"),\n    panel.border = element_rect(color = "#1F2937", linewidth = ${t.journal.axesLinewidth}),`
      : `    axis.ticks.length = unit(0.14, "cm"),`;
  const rBg = t.transparentBg
    ? `    plot.background = element_rect(fill = "transparent", color = NA),\n    panel.background = element_rect(fill = "transparent", color = NA),`
    : '';
  const wMm = t.widthMm;
  const hMm = Math.round(wMm * 0.68);
  const genesVec =
    config.labeledGenes.length > 0
      ? `c(${config.labeledGenes.map((g) => `"${g}"`).join(', ')})`
      : 'character(0)';

  if (config.plotType === 'volcano' || config.plotType === 'ma') {
    const isVolcano = config.plotType === 'volcano';
    return `# BioGrace Reproducible R Script (${t.journal.name} · ${t.palette.name})
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
  scale_color_manual(values = c(Up = "${t.palette.upColor}", Down = "${t.palette.downColor}", NS = "${t.palette.nsColor}")) +
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
    color = "#111827",
    fontface = "bold",
    family = "${rFont}",
    size = 3.0,
    box.padding = 0.45,
    max.overlaps = 30
  ) +
  labs(
    title = "${config.title}",
    subtitle = "${t.journal.shortName} · |log2FC| >= ${config.fcThreshold}, FDR <= ${config.fdrThreshold}",
    x = "${isVolcano ? 'log2 Fold Change' : 'log10 Mean Expression (baseMean)'}",
    y = "${isVolcano ? '-log10 Adjusted P-value (FDR)' : 'log2 Fold Change'}",
    color = NULL
  ) +
  ${rBaseTheme}(base_size = ${config.fontSizePt.toFixed(1)}, base_family = "${rFont}") +
  theme(
    plot.title = element_text(face = "bold"),
    legend.position = "top",
${rTicks}
${rBg}
    panel.grid.minor = element_blank()
  )

ggsave("biograce_${config.plotType}.pdf", p, width = ${wMm}, height = ${hMm}, units = "mm", device = cairo_pdf${t.transparentBg ? ', bg = "transparent"' : ''})
ggsave("biograce_${config.plotType}.svg", p, width = ${wMm}, height = ${hMm}, units = "mm"${t.transparentBg ? ', bg = "transparent"' : ''})
`;
  }

  if (config.plotType === 'dotplot') {
    return `# BioGrace Single-Cell Marker Dot Plot (${t.journal.name} · ${t.colormap.name})
library(ggplot2)
library(readr)

df <- read_csv("${inputFile}", show_col_types = FALSE)

p <- ggplot(df, aes(x = gene, y = cluster, size = pct_expr, color = avg_expr)) +
  geom_point() +
  scale_color_gradientn(colors = c(${t.colormap.stops.map((c) => `"${c}"`).join(', ')})) +
  scale_size_area(max_size = 9, limits = c(0, 100)) +
  labs(
    title = "${config.title}",
    x = NULL, y = NULL,
    color = "Mean Expr (${t.colormap.name})",
    size = "% Expressed"
  ) +
  theme_bw(base_size = ${config.fontSizePt.toFixed(1)}, base_family = "${rFont}") +
  theme(
    axis.text.x = element_text(angle = 45, hjust = 1, face = "italic"),
${rTicks}
${rBg}
    panel.grid.minor = element_blank()
  )

ggsave("biograce_dotplot.pdf", p, width = ${wMm}, height = ${hMm}, units = "mm", device = cairo_pdf${t.transparentBg ? ', bg = "transparent"' : ''})
`;
  }

  if (config.plotType === 'upset') {
    return `# BioGrace Publication UpSet Plot (${t.journal.name} · ${t.palette.name})
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
    "Intersection Size" = intersection_size(fill = "${t.palette.downColor}", counts = TRUE)
  ),
  set_sizes = upset_set_size(geom = geom_bar(fill = "${t.palette.accentColor}"))
) +
  ggtitle("${config.title}")

ggsave("biograce_upset.pdf", p, width = ${wMm}, height = ${hMm}, units = "mm", device = cairo_pdf)
`;
  }

  return `# BioGrace Ranked Pathway Lollipop Chart (${t.journal.name} · ${t.palette.name})
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
  geom_segment(aes(x = 0, xend = nes, yend = pathway), linewidth = ${(t.lineWidth * 0.8).toFixed(2)}) +
  geom_point(aes(size = geneCount)) +
  scale_color_manual(values = c(Activated = "${t.palette.upColor}", Suppressed = "${t.palette.downColor}")) +
  scale_size_area(max_size = 8) +
  labs(
    title = "${config.title}",
    x = "Normalized Enrichment Score (NES)",
    y = NULL, color = "Direction", size = "Gene Count"
  ) +
  ${rBaseTheme}(base_size = ${config.fontSizePt.toFixed(1)}, base_family = "${rFont}") +
  theme(${t.tickDirection === 'in' ? 'axis.ticks.length = unit(-0.14, "cm")' : 'axis.ticks.length = unit(0.14, "cm")'})

ggsave("biograce_lollipop.pdf", p, width = ${wMm}, height = ${hMm}, units = "mm", device = cairo_pdf)
`;
}

export function generateDEPythonCode(config: DEPlotConfig, inputFile = 'deseq2_results.csv'): string {
  const t = resolvePlotTheme(config);
  const rcBlock = buildPythonRcBlock(config);
  const genesPy = `[${config.labeledGenes.map((g) => `"${g}"`).join(', ')}]`;
  const saveArgs = `dpi=${t.dpi}, transparent=${t.transparentBg ? 'True' : 'False'}, bbox_inches="tight"`;

  if (config.plotType === 'volcano' || config.plotType === 'ma') {
    const isVolcano = config.plotType === 'volcano';
    return `# BioGrace Reproducible Python Script (${t.journal.name} · ${t.palette.name})
# pip install pandas numpy matplotlib
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

${rcBlock}

df = pd.read_csv("${inputFile}")
df["padj"] = df["padj"].clip(lower=1e-300)
df["neg_log10_fdr"] = -np.log10(df["padj"])
df["log10_mean"] = np.log10(df["baseMean"].clip(lower=1))

up = (df["padj"] <= ${config.fdrThreshold}) & (df["log2FoldChange"] >= ${config.fcThreshold})
down = (df["padj"] <= ${config.fdrThreshold}) & (df["log2FoldChange"] <= -${config.fcThreshold})
ns = ~(up | down)

fig, ax = plt.subplots(figsize=FIGSIZE, dpi=${t.dpi})
x_col = "${isVolcano ? 'log2FoldChange' : 'log10_mean'}"
y_col = "${isVolcano ? 'neg_log10_fdr' : 'log2FoldChange'}"

ax.scatter(df.loc[ns, x_col], df.loc[ns, y_col], s=${(config.pointSize * 4.5).toFixed(0)}, c="${t.palette.nsColor}", alpha=${(config.pointAlpha * 0.65).toFixed(2)}, linewidths=0, label=f"NS ({ns.sum()})")
ax.scatter(df.loc[down, x_col], df.loc[down, y_col], s=${(config.pointSize * 5.5).toFixed(0)}, c="${t.palette.downColor}", alpha=${config.pointAlpha.toFixed(2)}, linewidths=0, label=f"Down ({down.sum()})")
ax.scatter(df.loc[up, x_col], df.loc[up, y_col], s=${(config.pointSize * 5.5).toFixed(0)}, c="${t.palette.upColor}", alpha=${config.pointAlpha.toFixed(2)}, linewidths=0, label=f"Up ({up.sum()})")

${
  isVolcano
    ? `ax.axvline(${config.fcThreshold}, ls="--", lw=${t.lineWidth.toFixed(2)}, color="#64748b", alpha=0.6)
ax.axvline(-${config.fcThreshold}, ls="--", lw=${t.lineWidth.toFixed(2)}, color="#64748b", alpha=0.6)
ax.axhline(-np.log10(${config.fdrThreshold}), ls="--", lw=${t.lineWidth.toFixed(2)}, color="#64748b", alpha=0.6)`
    : `ax.axhline(${config.fcThreshold}, ls="--", lw=${t.lineWidth.toFixed(2)}, color="#64748b", alpha=0.6)
ax.axhline(-${config.fcThreshold}, ls="--", lw=${t.lineWidth.toFixed(2)}, color="#64748b", alpha=0.6)
ax.axhline(0, lw=0.8, color="#334155", alpha=0.4)`
}

for _, row in df[df["gene"].isin(${genesPy})].iterrows():
    ax.annotate(row["gene"], (row[x_col], row[y_col]), xytext=(5, 5), textcoords="offset points", fontweight="bold")

ax.set_title("${config.title}", loc="left", fontweight="bold", pad=10)
ax.set_xlabel("${isVolcano ? 'log2 Fold Change' : 'log10 Mean Expression (baseMean)'}")
ax.set_ylabel("${isVolcano ? '-log10 Adjusted P-value (FDR)' : 'log2 Fold Change'}")
ax.legend(frameon=False, ncol=3, loc="upper right")
fig.tight_layout()
fig.savefig("biograce_${config.plotType}.svg", ${saveArgs})
fig.savefig("biograce_${config.plotType}.pdf", ${saveArgs})
`;
  }

  return `# BioGrace Reproducible Python Script (${config.plotType} · ${t.journal.name} · ${t.palette.name})
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

${rcBlock}

df = pd.read_csv("${inputFile}")
fig, ax = plt.subplots(figsize=FIGSIZE, dpi=${t.dpi})
${
  config.plotType === 'dotplot'
    ? `sns.scatterplot(data=df, x="gene", y="cluster", size="pct_expr", hue="avg_expr", sizes=(18, 240), palette="${t.colormap.id}", ax=ax)
plt.xticks(rotation=45, ha="right", style="italic")`
    : config.plotType === 'lollipop'
    ? `df = df.sort_values("nes")
colors = ["${t.palette.upColor}" if v >= 0 else "${t.palette.downColor}" for v in df["nes"]]
ax.axvline(0, color="#334155", lw=1)
ax.hlines(df["pathway"], 0, df["nes"], color=colors, lw=${(t.lineWidth * 1.6).toFixed(2)})
ax.scatter(df["nes"], df["pathway"], s=df["geneCount"] * 1.3, c=colors, zorder=3)
ax.set_xlabel("Normalized Enrichment Score (NES)")`
    : `# pip install upsetplot
from upsetplot import from_indicators, plot
set_cols = [c for c in df.columns if c not in ("gene", "id")]
plot(from_indicators(set_cols, df[set_cols].astype(bool)), sort_by="cardinality", show_counts=True)`
}
ax.set_title("${config.title}", loc="left", fontweight="bold")
fig.tight_layout()
fig.savefig("biograce_${config.plotType}.pdf", ${saveArgs})
fig.savefig("biograce_${config.plotType}.svg", ${saveArgs})
`;
}

export function generateDECliCommand(config: DEPlotConfig, inputFile = 'deseq2_results.csv'): string {
  const labelFlag =
    config.labeledGenes.length > 0 ? ` \\\n  --label "${config.labeledGenes.slice(0, 8).join(',')}"` : '';
  const transFlag = config.transparentBg ? ' \\\n  --transparent' : '';
  return `# Run headless via BioGrace CLI (exact journal, palette, font & colormap parity)
npm run cli -- plot ${inputFile} \\
  --type ${config.plotType} \\
  --journal ${config.preset} \\
  --palette ${config.palette} \\
  --cmap ${config.colormap} \\
  --font ${config.fontFamily} \\
  --font-size ${config.fontSizePt} \\
  --line-width ${config.lineWidth} \\
  --fc ${config.fcThreshold} \\
  --fdr ${config.fdrThreshold}${labelFlag}${transFlag} \\
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
  const t = resolvePlotTheme(config);
  const rFont = FONT_FAMILIES[t.fontFamilyKey].rFamily;
  const rBaseTheme = t.topRightSpines ? 'theme_bw' : 'theme_classic';
  const wMm = t.widthMm;
  const hMm = Math.round(wMm * 0.68);
  const paletteStr = `c(${t.palette.colors.slice(0, Math.max(2, analysis.groupCount)).map((c) => `"${c}"`).join(', ')})`;
  const padjR = config.correctionMethod === 'BH-FDR' ? 'BH' : config.correctionMethod === 'Holm' ? 'holm' : 'none';

  const testBlock =
    analysis.pseudoreplicationDetected && !analysis.collapsedReplicates
      ? `# Linear Mixed-Effects Model for nested technical replicates
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

  return `# BioGrace Statistical Test Advisor & Anti-Barplot Script (${t.journal.name} · ${t.palette.name})
# Recommended Protocol: ${analysis.primaryTest}
library(ggplot2)
library(ggdist)
library(ggbeeswarm)
library(rstatix)
library(dplyr)
library(readr)

df <- read_csv("${inputFile}", show_col_types = FALSE)
${
  analysis.collapsedReplicates
    ? `\n# Collapse technical replicates to biological replicate means
df <- df |> group_by(group, replicate) |> summarise(value = mean(value), .groups = "drop")\n`
    : ''
}
# 1. Assumption Diagnostics
df |> group_by(group) |> shapiro_test(value)
df |> levene_test(value ~ group, center = median)

# 2. Recommended Hypothesis Test
${testBlock}
print(stat_test)

# 3. Anti-Barplot Publication Figure (${t.journal.name} · ${wMm} mm)
pal <- ${paletteStr}

p <- ggplot(df, aes(x = group, y = value, fill = group, color = group)) +
  stat_halfeye(adjust = 0.75, width = 0.55, .width = 0, justification = -0.22, point_colour = NA, alpha = 0.35) +
  geom_boxplot(width = 0.14, outlier.shape = NA, alpha = 0.25, color = "#111827") +
  geom_beeswarm(side = -1L, cex = 2.0, size = 2.1, alpha = 0.85) +
  scale_fill_manual(values = pal) +
  scale_color_manual(values = pal) +
  labs(title = "${config.title}", subtitle = "${analysis.primaryTest}", x = "${config.xLabel}", y = "${config.yLabel}") +
  ${rBaseTheme}(base_size = ${config.fontSizePt.toFixed(1)}, base_family = "${rFont}") +
  theme(
    legend.position = "none",
    plot.title = element_text(face = "bold"),
    axis.ticks.length = unit(${t.tickDirection === 'in' ? '-0.14' : '0.14'}, "cm")
  )

ggsave("biograce_raincloud.pdf", p, width = ${wMm}, height = ${hMm}, units = "mm", device = cairo_pdf${t.transparentBg ? ', bg = "transparent"' : ''})
ggsave("biograce_raincloud.svg", p, width = ${wMm}, height = ${hMm}, units = "mm"${t.transparentBg ? ', bg = "transparent"' : ''})
`;
}

export function generateStatsPythonCode(
  config: StatsConfig,
  analysis: StatisticalRecommendation,
  inputFile = 'experiment_tidy.csv'
): string {
  const t = resolvePlotTheme(config);
  const rcBlock = buildPythonRcBlock(config);
  const palPy = `[${t.palette.colors.slice(0, Math.max(2, analysis.groupCount)).map((c) => `"${c}"`).join(', ')}]`;
  const fdrMethod =
    config.correctionMethod === 'BH-FDR' ? 'fdr_bh' : config.correctionMethod === 'Holm' ? 'holm' : 'none';
  const saveArgs = `dpi=${t.dpi}, transparent=${t.transparentBg ? 'True' : 'False'}, bbox_inches="tight"`;

  return `# BioGrace Statistical Test Advisor & Anti-Barplot Script (${t.journal.name} · ${t.palette.name})
# Recommended Protocol: ${analysis.primaryTest}
import itertools
import pandas as pd
import numpy as np
from scipy import stats
from statsmodels.stats.multitest import multipletests
import matplotlib.pyplot as plt
import seaborn as sns

${rcBlock}

df = pd.read_csv("${inputFile}")
${
  analysis.collapsedReplicates
    ? `df = df.groupby(["group", "replicate"], as_index=False)["value"].mean()\n`
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
      ? `stat, pval = stats.ttest_ind(arrays[0], arrays[1], equal_var=False)`
      : `stat, pval = stats.mannwhitneyu(arrays[0], arrays[1], alternative="two-sided")`
    : analysis.family === 'parametric'
    ? `stat, pval = stats.f_oneway(*arrays)`
    : `stat, pval = stats.kruskal(*arrays)`
}
print(f"Omnibus: stat={stat:.3f}, p={pval:.4g}")

pairs = list(itertools.combinations(range(len(groups)), 2))
raw_p = [
    ${analysis.family === 'parametric' ? 'stats.ttest_ind(arrays[i], arrays[j], equal_var=False).pvalue' : 'stats.mannwhitneyu(arrays[i], arrays[j]).pvalue'}
    for i, j in pairs
]
${fdrMethod !== 'none' ? `_, adj_p, _, _ = multipletests(raw_p, method="${fdrMethod}")` : 'adj_p = raw_p'}
for (i, j), p_r, p_a in zip(pairs, raw_p, adj_p):
    print(f"{groups[i]} vs {groups[j]}: raw p={p_r:.4g}, adj q={p_a:.4g}")

# 3. Anti-Barplot Figure
fig, ax = plt.subplots(figsize=FIGSIZE, dpi=${t.dpi})
pal = ${palPy}
sns.violinplot(data=df, x="group", y="value", palette=pal, inner=None, alpha=0.28, cut=0, ax=ax)
sns.boxplot(data=df, x="group", y="value", width=0.22, showcaps=True, boxprops={"facecolor": "none", "zorder": 3}, showfliers=False, ax=ax)
sns.swarmplot(data=df, x="group", y="value", palette=pal, size=4.8, edgecolor="white", linewidth=0.8, ax=ax)

ax.set_title("${config.title}", loc="left", fontweight="bold", pad=10)
ax.set_xlabel("${config.xLabel}")
ax.set_ylabel("${config.yLabel}")
fig.tight_layout()
fig.savefig("biograce_raincloud.svg", ${saveArgs})
fig.savefig("biograce_raincloud.pdf", ${saveArgs})
`;
}

export function generateStatsCliCommand(config: StatsConfig, inputFile = 'experiment_tidy.csv'): string {
  const pairedFlag = config.isPaired ? ' \\\n  --paired' : '';
  const collapseFlag = config.collapsePseudoreplicates ? ' \\\n  --collapse-replicates' : '';
  const transFlag = config.transparentBg ? ' \\\n  --transparent' : '';
  return `# Run statistical assumption checks + raincloud SVG + R/Python scripts via CLI
npm run cli -- stats ${inputFile} \\
  --journal ${config.preset} \\
  --palette ${config.palette} \\
  --font ${config.fontFamily} \\
  --font-size ${config.fontSizePt} \\
  --line-width ${config.lineWidth} \\
  --adjust ${config.correctionMethod}${pairedFlag}${collapseFlag}${transFlag} \\
  --out raincloud.svg \\
  --report stats_report.json \\
  --code-r stats_analysis.R \\
  --code-py stats_analysis.py`;
}
