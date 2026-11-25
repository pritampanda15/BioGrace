import type { JournalCaseId } from './journalCasesCatalog';
import type { PublicationStyleSettings } from '../types/biograce';
import { FONT_FAMILIES, resolvePlotTheme } from './palettes';

/**
 * Reproducible R (ggplot2) & Python (matplotlib/seaborn) recipes for all 20 top-journal cases
 * Inspired by open-source MIT gallery: https://github.com/GeneticistHere/ggplot2-20-journal-cases
 */
export function generateJournalCaseRCode(
  caseId: JournalCaseId,
  title: string,
  journalSource: string,
  settings: PublicationStyleSettings
): string {
  const t = resolvePlotTheme(settings);
  const rFont = FONT_FAMILIES[t.fontFamilyKey].rFamily;
  const rTheme = t.topRightSpines ? 'theme_bw' : 'theme_classic';
  const palVec = `c(${t.palette.colors.slice(0, 6).map((c) => `"${c}"`).join(', ')})`;
  const cmapVec = `c(${t.colormap.stops.map((c) => `"${c}"`).join(', ')})`;
  const wMm = t.widthMm;
  const hMm = Math.round(wMm * 0.68);

  const header = `# BioGrace · Journal Case: ${title} (${journalSource} archetype)
# Styled with ${t.journal.name} (${wMm} mm) · Palette: ${t.palette.name} · Font: ${rFont}
# Attribution: Inspired by MIT open-source github.com/GeneticistHere/ggplot2-20-journal-cases
library(ggplot2)
library(dplyr)
library(tidyr)

pal <- ${palVec}
cmap <- ${cmapVec}
base_theme <- ${rTheme}(base_size = ${settings.fontSizePt.toFixed(1)}, base_family = "${rFont}") +
  theme(
    plot.title = element_text(face = "bold"),
    axis.ticks.length = unit(${t.tickDirection === 'in' ? '-0.14' : '0.14'}, "cm")
  )
`;

  const bodies: Record<JournalCaseId, string> = {
    '01-error-dotplot': `set.seed(42)
df <- tibble(
  group = factor(rep(c("Control", "Low Dose", "Mid Dose", "High Dose"), each = 14),
                 levels = c("Control", "Low Dose", "Mid Dose", "High Dose")),
  value = c(rnorm(14, 18, 2.5), rnorm(14, 24, 3.1), rnorm(14, 34, 4.0), rnorm(14, 46, 4.8))
)
summary_df <- df |> group_by(group) |> summarise(mean = mean(value), sd = sd(value))

p <- ggplot(df, aes(group, value, color = group)) +
  geom_jitter(width = 0.16, size = 2.0, alpha = 0.48) +
  geom_errorbar(data = summary_df, aes(y = mean, ymin = mean - sd, ymax = mean + sd), width = 0.16, linewidth = 0.8) +
  geom_point(data = summary_df, aes(y = mean), size = 3.8) +
  scale_color_manual(values = pal) +
  labs(title = "${title}", x = "Treatment Group", y = "Readout (AU)") +
  base_theme + theme(legend.position = "none")`,

    '02-grouped-error-dotplot': `set.seed(42)
df <- expand_grid(genotype = c("WT", "KO", "Rescue"), treatment = c("Vehicle", "Drug A", "Drug B"), rep = 1:8) |>
  mutate(value = 20 + as.numeric(factor(genotype)) * 6 + as.numeric(factor(treatment)) * 7 + rnorm(n(), 0, 3))

p <- ggplot(df, aes(genotype, value, color = treatment)) +
  geom_point(position = position_jitterdodge(jitter.width = 0.14, dodge.width = 0.65), alpha = 0.45, size = 1.8) +
  stat_summary(fun.data = mean_sdl, fun.args = list(mult = 1), geom = "pointrange",
               position = position_dodge(width = 0.65), size = 0.65) +
  scale_color_manual(values = pal) +
  labs(title = "${title}", x = "Genotype", y = "Relative Activity", color = "Treatment") +
  base_theme`,

    '03-multi-volcano': `library(ggrepel)
set.seed(42)
clusters <- c("CD4 T", "CD8 T", "NK", "B Cell", "Mono", "cDC")
df <- expand_grid(cluster = factor(clusters, levels = clusters), idx = 1:160) |>
  mutate(log2FC = rnorm(n(), 0, 1.4), sig = abs(log2FC) > 1.2)

p <- ggplot(df, aes(cluster, log2FC, color = sig)) +
  geom_jitter(width = 0.34, size = 1.1, alpha = 0.75) +
  geom_tile(data = tibble(cluster = factor(clusters, levels = clusters)),
            aes(cluster, 0, fill = cluster), height = 0.45, width = 0.85, inherit.aes = FALSE) +
  scale_color_manual(values = c("FALSE" = "#CBD5E1", "TRUE" = pal[2])) +
  scale_fill_manual(values = pal) +
  labs(title = "${title}", x = NULL, y = "Average log2 Fold Change") +
  base_theme + theme(legend.position = "none")`,

    '04-manhattan-twas': `library(ggrepel)
set.seed(42)
df <- tibble(chr = rep(1:22, each = 70)) |>
  mutate(pos = row_number(), neg_log10_p = rexp(n(), 1.3)) |>
  mutate(neg_log10_p = ifelse(pos %in% c(180, 460, 920, 1280), runif(n(), 8.5, 14), neg_log10_p))

p <- ggplot(df, aes(pos, neg_log10_p, color = factor(chr %% 2))) +
  geom_point(size = 1.4, alpha = 0.85) +
  geom_hline(yintercept = -log10(5e-8), linetype = "dashed", color = pal[2]) +
  scale_color_manual(values = c(pal[1], "#94A3B8")) +
  labs(title = "${title}", x = "Genomic Position (Chr 1–22)", y = "-log10(P-value)") +
  base_theme + theme(legend.position = "none")`,

    '05-paired-boxplot': `set.seed(42)
subj <- paste0("S", 1:14)
base <- rnorm(14, 30, 8)
df <- tibble(subject = rep(subj, 2),
             timepoint = factor(rep(c("Pre-Tx", "Post-Tx"), each = 14), levels = c("Pre-Tx", "Post-Tx")),
             value = c(base, base + rnorm(14, 12, 4)))

p <- ggplot(df, aes(timepoint, value, fill = timepoint)) +
  geom_boxplot(width = 0.38, alpha = 0.28, outlier.shape = NA) +
  geom_line(aes(group = subject), color = "#64748B", alpha = 0.55) +
  geom_point(aes(color = timepoint), size = 2.4) +
  scale_fill_manual(values = pal) + scale_color_manual(values = pal) +
  labs(title = "${title}", x = NULL, y = "Biomarker Score") +
  base_theme + theme(legend.position = "none")`,

    '06-raincloud': `library(ggdist)
set.seed(42)
df <- tibble(
  cohort = factor(rep(c("Healthy", "Early", "Advanced"), each = 32), levels = c("Healthy", "Early", "Advanced")),
  score = c(rnorm(32, 22, 4), rnorm(32, 34, 6), c(rnorm(16, 40, 4), rnorm(16, 62, 5)))
)

p <- ggplot(df, aes(x = score, y = cohort, fill = cohort, color = cohort)) +
  stat_halfeye(adjust = 0.7, justification = -0.22, .width = 0, point_colour = NA, alpha = 0.35) +
  geom_boxplot(width = 0.16, outlier.shape = NA, alpha = 0.25, color = "#111827") +
  geom_jitter(height = 0.08, size = 1.6, alpha = 0.75) +
  scale_fill_manual(values = pal) + scale_color_manual(values = pal) +
  labs(title = "${title}", x = "Immune Signature Score", y = NULL) +
  base_theme + theme(legend.position = "none")`,

    '07-swimmer': `df <- tibble(
  patient = factor(paste0("PT-", sprintf("%02d", 1:12)), levels = rev(paste0("PT-", sprintf("%02d", 1:12)))),
  months = c(22, 19, 17, 15, 14, 12, 11, 9.5, 8, 6.5, 5, 3.5),
  arm = rep(c("Combination", "Monotherapy"), length.out = 12)
)

p <- ggplot(df, aes(months, patient, fill = arm)) +
  geom_col(width = 0.65, alpha = 0.85) +
  scale_fill_manual(values = pal) +
  labs(title = "${title}", x = "Months on Treatment", y = "Patient ID", fill = "Cohort") +
  base_theme`,

    '08-importance-streams': `library(patchwork)
imp <- tibble(feature = factor(paste0("Taxon_", 1:8), levels = rev(paste0("Taxon_", 1:8))),
              score = c(0.92, 0.81, 0.74, 0.63, 0.52, 0.44, 0.35, 0.27))
p1 <- ggplot(imp, aes(score, feature)) + geom_col(fill = pal[1], width = 0.65) +
  labs(x = "Importance (MDA)", y = NULL) + base_theme
p <- p1 + plot_annotation(title = "${title}")`,

    '09-cld-variance-bars': `set.seed(42)
df <- tibble(group = factor(rep(c("Ctrl", "Drug A", "Drug B", "Combo"), each = 10),
                            levels = c("Ctrl", "Drug A", "Drug B", "Combo")),
             value = c(rnorm(10, 14, 2), rnorm(10, 22, 2.5), rnorm(10, 24, 3), rnorm(10, 38, 3.5)))
cld <- tibble(group = levels(df$group), y = c(19, 28, 31, 46), letter = c("c", "b", "b", "a"))

p <- ggplot(df, aes(group, value, fill = group)) +
  stat_summary(fun = mean, geom = "col", width = 0.56, alpha = 0.45, color = "#111827") +
  stat_summary(fun.data = mean_sdl, fun.args = list(mult = 1), geom = "errorbar", width = 0.18) +
  geom_jitter(aes(color = group), width = 0.14, size = 2.0) +
  geom_text(data = cld, aes(group, y, label = letter), inherit.aes = FALSE, fontface = "bold", size = 4) +
  scale_fill_manual(values = pal) + scale_color_manual(values = pal) +
  labs(title = "${title}", x = NULL, y = "Fold Induction") +
  base_theme + theme(legend.position = "none")`,

    '10-circos-fusion': `library(circlize)
# Circular chromosomal fusion ribbons
fusions <- data.frame(
  from = c("chr9", "chr2", "chr21", "chr11", "chr17"),
  to   = c("chr22", "chr2", "chr21", "chr14", "chr15"),
  value = c(18, 14, 12, 9, 8)
)
pdf("biograce_10_circos.pdf", width = ${(wMm / 25.4).toFixed(2)}, height = ${(wMm / 25.4).toFixed(2)})
chordDiagram(fusions, grid.col = setNames(pal[1:8], unique(c(fusions$from, fusions$to))), transparency = 0.35)
title("${title}")
dev.off()
p <- ggplot() + theme_void()`,

    '11-module-network': `library(igraph)
library(ggraph)
edges <- tibble(from = c("STAT1","STAT1","STAT1","IRF1","CXCL10","MYC","MYC","CDK4","PPARG","ARG1"),
                to   = c("IRF1","CXCL10","GBP1","GBP1","CXCL9","CDK4","E2F1","E2F1","ARG1","MRC1"))
g <- graph_from_data_frame(edges, directed = FALSE)

p <- ggraph(g, layout = "fr") +
  geom_edge_link(alpha = 0.45, color = "#64748B") +
  geom_node_point(size = 7, color = pal[1]) +
  geom_node_text(aes(label = name), repel = TRUE, fontface = "bold", size = 3.2) +
  labs(title = "${title}") + theme_void()`,

    '12-sankey-bubble': `library(ggalluvial)
library(patchwork)
flows <- tibble(
  gene = c("STAT1","STAT1","CXCL10","IRF1","MRC1","ARG1"),
  pathway = c("IFN-gamma","JAK-STAT","IFN-gamma","Antiviral","M2 Repair","Metabolism"),
  weight = c(4, 3, 5, 4, 4, 3)
)
p <- ggplot(flows, aes(axis1 = gene, axis2 = pathway, y = weight)) +
  geom_alluvium(aes(fill = pathway), alpha = 0.65) +
  geom_stratum(width = 0.22, fill = "white", color = "#111827") +
  geom_text(stat = "stratum", aes(label = after_stat(stratum)), size = 3) +
  scale_fill_manual(values = pal) +
  labs(title = "${title}") + theme_void()`,

    '13-binned-heatmap': `set.seed(42)
df <- expand_grid(sample = paste0("S", 1:10), taxon = paste0("Species_", 1:8)) |>
  mutate(bin = cut(rnorm(n()), breaks = c(-Inf, -1.5, -0.5, 0.5, 1.5, Inf),
                   labels = c("<-1.5", "-1.5..-0.5", "-0.5..0.5", "0.5..1.5", ">1.5")))

p <- ggplot(df, aes(sample, taxon, fill = bin)) +
  geom_tile(color = "white", linewidth = 0.6) +
  scale_fill_manual(values = colorRampPalette(cmap)(5)) +
  labs(title = "${title}", x = "Sample", y = NULL, fill = "Z-score Bin") +
  base_theme`,

    '14-mantel-composite': `# Mantel composite correlation heatmap (see linkET / vegan::mantel)
set.seed(42)
vars <- c("pH", "Temp", "TOC", "NO3", "NH4", "Salinity")
mat <- cor(matrix(rnorm(180), ncol = 6, dimnames = list(NULL, vars)))
df <- as.data.frame(as.table(mat)) |> filter(as.numeric(Var1) < as.numeric(Var2))

p <- ggplot(df, aes(Var1, Var2, fill = Freq, size = abs(Freq))) +
  geom_point(shape = 22, color = "#111827", stroke = 0.35) +
  scale_fill_gradientn(colors = cmap, limits = c(-1, 1)) +
  labs(title = "${title}", x = NULL, y = NULL, fill = "Pearson r") +
  base_theme`,

    '15-multi-corr-heatmap': `set.seed(42)
df <- expand_grid(cohort = c("Healthy", "Disease"), x = paste0("M", 1:5), y = paste0("M", 1:5)) |>
  mutate(r = ifelse(x == y, 1, runif(n(), -0.85, 0.85)),
         stars = ifelse(abs(r) > 0.65 & x != y, "**", ifelse(abs(r) > 0.45 & x != y, "*", "")))

p <- ggplot(df, aes(x, y, fill = r)) +
  geom_tile(color = "white", linewidth = 0.5) +
  geom_text(aes(label = stars), size = 3.5) +
  facet_wrap(~cohort) +
  scale_fill_gradientn(colors = cmap, limits = c(-1, 1)) +
  labs(title = "${title}", x = NULL, y = NULL, fill = "r") +
  base_theme`,

    '16-polar-heatmap': `set.seed(42)
df <- expand_grid(gene = paste0("G", 1:18), ring = factor(c("0h", "6h", "12h", "24h"))) |>
  mutate(expr = rnorm(n()))

p <- ggplot(df, aes(gene, ring, fill = expr)) +
  geom_tile(color = "white", linewidth = 0.4) +
  coord_polar(theta = "x") +
  scale_fill_gradientn(colors = cmap) +
  labs(title = "${title}", fill = "Z-score") +
  theme_minimal(base_family = "${rFont}")`,

    '17-multilevel-sankey': `library(ggalluvial)
df <- tibble(
  cohort = c("Primary","Primary","Metastatic","Metastatic"),
  state  = c("Exhausted","Effector","Exhausted","Memory"),
  outcome = c("NR","CR","NR","PR"),
  freq   = c(28, 42, 36, 18)
)

p <- ggplot(df, aes(axis1 = cohort, axis2 = state, axis3 = outcome, y = freq)) +
  geom_alluvium(aes(fill = state), alpha = 0.72) +
  geom_stratum(width = 0.24, fill = "white", color = "#111827") +
  geom_text(stat = "stratum", aes(label = after_stat(stratum)), size = 3.1) +
  scale_fill_manual(values = pal) +
  labs(title = "${title}") + theme_void()`,

    '18-treemap': `library(treemapify)
df <- tibble(
  parent = c("Immune","Immune","Immune","Metabolism","Metabolism","Cell Cycle","Cell Cycle"),
  pathway = c("IFN-gamma","Chemokine","Antigen Pres.","OXPHOS","Lipid Ox.","MYC Targets","G2M Checkpt"),
  genes = c(162, 118, 94, 148, 86, 132, 96)
)

p <- ggplot(df, aes(area = genes, fill = parent, label = pathway, subgroup = parent)) +
  geom_treemap(color = "white", linewidth = 1.2) +
  geom_treemap_subgroup_border(color = "#111827", linewidth = 1.6) +
  geom_treemap_text(color = "white", place = "centre", fontface = "bold") +
  scale_fill_manual(values = pal) +
  labs(title = "${title}", fill = "Superfamily")`,

    '19-mosaic-sunburst': `df <- tibble(
  lineage = c("T Cells","T Cells","B Cells","Myeloid","Myeloid","NK"),
  subtype = c("CD4+","CD8+","Memory B","CD14 Mono","cDC","CD56dim"),
  pct = c(28, 22, 16, 18, 8, 8)
)

p <- ggplot(df, aes(x = 2, y = pct, fill = lineage)) +
  geom_col(color = "white", linewidth = 0.7) +
  coord_polar(theta = "y") + xlim(0.6, 2.5) +
  scale_fill_manual(values = pal) +
  labs(title = "${title}", fill = "Lineage") + theme_void()`,

    '20-split-violin': `library(gghalves)
set.seed(42)
df <- expand_grid(marker = c("CXCL10", "STAT1", "GZMB", "IL7R"), cond = c("Control", "Treated"), i = 1:35) |>
  mutate(expr = rnorm(n(), ifelse(cond == "Treated", 4.2, 2.1), 0.9))

p <- ggplot(df, aes(marker, expr, fill = cond)) +
  geom_half_violin(data = filter(df, cond == "Control"), side = "l", alpha = 0.75) +
  geom_half_violin(data = filter(df, cond == "Treated"), side = "r", alpha = 0.75) +
  scale_fill_manual(values = pal[1:2]) +
  labs(title = "${title}", x = "Canonical Marker", y = "Log-Normalized Expression", fill = "Condition") +
  base_theme`,
  };

  return `${header}
${bodies[caseId]}

ggsave("biograce_${caseId}.pdf", p, width = ${wMm}, height = ${hMm}, units = "mm", device = cairo_pdf${t.transparentBg ? ', bg = "transparent"' : ''})
ggsave("biograce_${caseId}.svg", p, width = ${wMm}, height = ${hMm}, units = "mm"${t.transparentBg ? ', bg = "transparent"' : ''})
`;
}

export function generateJournalCasePythonCode(
  caseId: JournalCaseId,
  title: string,
  journalSource: string,
  settings: PublicationStyleSettings
): string {
  const t = resolvePlotTheme(settings);
  const wIn = (t.widthMm / 25.4).toFixed(2);
  const hIn = ((t.widthMm * 0.68) / 25.4).toFixed(2);
  const palPy = `[${t.palette.colors.slice(0, 6).map((c) => `"${c}"`).join(', ')}]`;

  return `# BioGrace · Python Starter for ${title} (${journalSource} archetype)
# Styled with ${t.journal.name} (${t.widthMm} mm · ${t.dpi} DPI) · Palette: ${t.palette.name}
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

plt.rcParams.update({
    "font.family": "${t.fontFamilyKey}",
    "font.size": ${settings.fontSizePt.toFixed(1)},
    "axes.linewidth": ${t.journal.axesLinewidth},
    "axes.spines.top": ${t.topRightSpines ? 'True' : 'False'},
    "axes.spines.right": ${t.topRightSpines ? 'True' : 'False'},
    "xtick.direction": "${t.tickDirection}",
    "ytick.direction": "${t.tickDirection}",
    "pdf.fonttype": 42,
    "svg.fonttype": "none",
})

PALETTE = ${palPy}
CMAP = "${t.colormap.id}"
FIGSIZE = (${wIn}, ${hIn})

# Export directly as editable vector SVG/PDF from BioGrace or customize in matplotlib/seaborn:
fig, ax = plt.subplots(figsize=FIGSIZE, dpi=${t.dpi})
ax.set_title("${title} (${journalSource})", loc="left", fontweight="bold")
# Replace with your dataframe columns for case "${caseId}"
fig.tight_layout()
fig.savefig("biograce_${caseId}.svg", dpi=${t.dpi}, transparent=${t.transparentBg ? 'True' : 'False'})
fig.savefig("biograce_${caseId}.pdf", dpi=${t.dpi}, transparent=${t.transparentBg ? 'True' : 'False'})
`;
}
