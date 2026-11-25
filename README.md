# BioGrace

**Publication-Grade DE & Single-Cell Plotter · Biologist's Statistical Test Advisor & Anti-Barplot Studio**

[![Live Studio](https://img.shields.io/badge/Live_Studio-GitHub_Pages-0071e3?style=flat-square)](https://pritampanda15.github.io/BioGrace/)
[![License: Academic Only](https://img.shields.io/badge/License-Academic_%26_Non--Commercial_Only-d55e00?style=flat-square)](./LICENSE)
[![CLI Included](https://img.shields.io/badge/CLI-biograce-009e73?style=flat-square)](#biograce-cli-commands)

BioGrace eliminates two daily bottlenecks between wet-lab and dry-lab biology inside a fluid, Apple-designed interface that runs **100% client-side in the browser** (zero server upload — your unpublished data never leaves your machine) and ships with a matching **headless CLI** and **auto-generated R & Python code**.

---

## Live Demo

- **Web Studio (GitHub Pages):** [https://pritampanda15.github.io/BioGrace/](https://pritampanda15.github.io/BioGrace/)

---

## Two Integrated Studios

### 1. DE & Single-Cell Publication Plotter
Stop fighting `ggplot2` and `matplotlib` layouts for hours after finishing `DESeq2`, `edgeR`, `limma`, `Scanpy`, or `Seurat`:
- **Drag-and-drop CSV/TSV** with automatic tool & column detection (`DESeq2`, `edgeR`, `limma`, `Scanpy`, `Seurat`, `fgsea`, binary UpSet tables).
- **Five publication chart types:**
  - **Volcano Plot** — animated `|log2FC|` & FDR threshold planes, click any point to pin/unpin a gene label, and **1:1 direct pointer drag** on gene callouts to eliminate label overlap.
  - **MA Plot** — `log10(baseMean)` vs `log2FoldChange` with interactive gene pinning.
  - **Single-Cell Marker Dot Plot** — dot size = `% expressed`, perceptual ramp = mean expression, self-contained vector colorbar & size legend.
  - **DEG UpSet Plot** — multi-contrast intersection bars, connection matrix, set-size bars, and clickable overlapping gene lists.
  - **Ranked Pathway Lollipop Chart** — diverging NES lollipops sized by gene count.
- **7 Scientific Journal Presets (full `gmxgrace` parity):**
  - **Nature Portfolio** (`89 / 120 / 183 mm`, open frame, outward ticks)
  - **Science (AAAS)** (`75 / 120 / 175 mm`, open frame, outward ticks)
  - **Cell Press** (`85 / 114 / 174 mm`, open frame, outward ticks)
  - **ACS (JCTC / JACS / JCIM)** (`84.6 / 130 / 177.8 mm`, 4-spine boxed frame, inward ticks)
  - **Biophysical Journal** (`85 / 128 / 178 mm`, 4-spine boxed frame, inward ticks)
  - **PNAS** (`87 / 114 / 178 mm`, open frame, outward ticks)
  - **Modern xmgrace** (`110 / 145 / 185 mm`, 4-spine boxed frame, bold inward ticks)
- **7 Colorblind-Safe & Publication Palettes:** `Okabe–Ito`, `Nature (NPG)`, `ACS Classic`, `Paul Tol Bright`, `Paul Tol Muted`, `Viridis Discrete`, and `Grayscale Pub`.
- **12 Continuous Colormaps (for scRNA Dot Plots & continuous scales):** `RdYlBu_r`, `viridis`, `plasma`, `inferno`, `magma`, `cividis`, `coolwarm`, `Spectral_r`, `turbo`, `Blues`, `YlGnBu`, and `cubehelix_r`.
- **Typography & Export Controls:** `Sans-Serif (Helvetica/Arial)`, `Serif (Times New Roman/Georgia)`, `Monospace`, custom font size (`pt`), stroke line width (`pt`), Single / 1.5 / Double column widths (`mm`), Transparent Background, and `300 / 600 / 1200 DPI` PNG plus vector **SVG** & **PDF** (`svg2pdf.js`).

### 2. 20 Open-Source Top-Journal Figure Archetypes
Interactive vector SVG gallery inspired by the MIT-licensed [`GeneticistHere/ggplot2-20-journal-cases`](https://github.com/GeneticistHere/ggplot2-20-journal-cases) collection (*Nature*, *Nature Microbiology*, *Nature Cell Biology*, *Nature Communications*, *iMeta*, *IJMS*):
- **Distribution & Stats:** Individualized Error Dot-Plot (`01`), Grouped Error Dot-Plot (`02`), Paired Boxplot (`05`), Horizontal Raincloud (`06`), Variance Bars with CLD Letters (`09`), Split Violin (`20`).
- **Genomics & Clinical:** Multi-Group Volcano (`03`), Manhattan GWAS/TWAS (`04`), Clinical Cohort Swimmer Plot (`07`), Importance Bars + Abundance Streams (`08`).
- **Networks & Flows:** Circos Fusion-Gene Diagram (`10`), Module Interaction Network (`11`), Sankey + Enrichment Bubble Panel (`12`), Multi-Level Alluvial Flow (`17`).
- **Heatmaps & Composition:** Discrete Binned Heatmap (`13`), Mantel Composite Correlation Heatmap (`14`), Multi-Group Correlation Heatmap (`15`), Polar-Coordinate Circular Heatmap (`16`), Hierarchical Pathway Treemap (`18`), Mosaic & Sunburst Ring (`19`).
- Every figure responds live to all 7 journal presets, 7 color palettes, 12 colormaps, fonts, and stroke widths, with vector SVG/PDF export and reproducible `ggplot2` R & Python starter code.

### 3. Biologist's Statistical Test Advisor, Anti-Barplot Studio & Plain-English Coach
Stop choosing inappropriate statistical tests, hiding distributions behind dynamite bar charts + SEM, or decoding opaque statistical jargon:
- **Plain-English Biology Translator:** Explains your exact result in everyday language (what the $p$-value means about luck, whether the effect size is practically small/medium/large, a visual 4-step **Decision Path Flowchart**, a one-click **Ready-to-Paste Methods & Figure Legend Paragraph**, and a 7-concept **Biologist's Pocket Guide to Statistics**).
- **Automated assumption & study-design engine** (pure client-side TypeScript):
  - **Normality check:** Shapiro–Wilk test (Royston approximation) and skewness per group.
  - **Variance check:** Brown–Forsythe median-centered Levene's test.
  - **Pseudoreplication Guard:** Detects repeated technical measurements nested within biological replicates/donors, warns against inflated $N$, and provides one-click **Collapse to Biological Means** plus `lme4::lmer` mixed-model code.
  - **Smart protocol advisor:** Recommends and explains Welch's t-test, Paired t-test, Mann–Whitney U, Wilcoxon signed-rank, Welch's one-way ANOVA, Kruskal–Wallis, or Friedman + **Benjamini–Hochberg (BH-FDR)** or **Holm** correction alongside effect sizes (Hedges' $g$, Cohen's $d_z$, Cliff's $\delta$, rank-biserial $r$, $\eta^2$, $\epsilon^2$).
- **Anti-Barplot Studio:** Fluidly spring-morphs between the misleading **Barplot + SEM Trap** and honest **Raincloud** (half-violin KDE + Tukey boxplot + collision-free beeswarm), **Box + Beeswarm**, and **Paired Slopegraph** plots.
- **Four built-in biological case studies:** *Bimodal Responder Split*, *Multi-Dose Skewed Viability*, *Paired Patient Pre/Post*, and *qPCR Technical Replicates (Pseudoreplication Guard)*.

---

## Interface & Motion Craft

Built using Apple's *Designing Fluid Interfaces* (WWDC) principles for the web:
- Critically damped springs (`damping 1.0`) for UI chrome and plot threshold updates; momentum-driven springs for gesture flicks.
- Interruptible right-edge Code & CLI sheet with 1:1 pointer drag, soft-boundary rubber-banding, and exponential-decay momentum projection.
- Translucent frosted materials (`backdrop-filter`), optical SF Pro typography with `tabular-nums`, and full `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast` accessibility support.

---

## Quick Start

```bash
git clone https://github.com/pritampanda15/BioGrace.git
cd BioGrace
npm install
npm run dev
```

---

## BioGrace CLI Commands

Run headless figure generation, statistical assumption diagnostics, and R/Python script synthesis directly from your terminal:

```bash
# Show CLI help
npm run cli -- help

# Volcano Plot + reproducible R & Python scripts from DESeq2/edgeR/limma/Seurat CSV
npm run cli -- plot deseq2_results.csv \
  --type volcano \
  --preset nature \
  --fc 1.0 \
  --fdr 0.05 \
  --label "CXCL10,IDO1,STAT1,MRC1" \
  --out out/volcano.svg \
  --code-r out/volcano.R \
  --code-py out/volcano.py

# Statistical Advisor + Raincloud SVG + JSON diagnostics + R/Python scripts
npm run cli -- stats experiment.csv \
  --preset okabe-ito \
  --adjust BH-FDR \
  --out out/raincloud.svg \
  --report out/stats_report.json \
  --code-r out/analysis.R \
  --code-py out/analysis.py

# Optional flags for paired designs & nested technical replicates
npm run cli -- stats paired_study.csv --paired --out out/paired.svg
npm run cli -- stats qpcr_wells.csv --collapse-replicates --out out/bio_means.svg

# Run built-in biological demos immediately
npm run cli -- demo volcano --out out/demo_volcano.svg --code-r out/demo_volcano.R
npm run cli -- demo stats --out out/demo_raincloud.svg --report out/demo_report.json
```

If linked globally (`npm link`), run commands directly as `biograce plot ...` or `biograce stats ...`.

---

## Deploying to GitHub Pages

BioGrace ships with both a GitHub Actions workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) and a one-command CLI deploy:

```bash
# Automatic deployment: push to main (Settings -> Pages -> Source: GitHub Actions)
git push origin main

# Or deploy directly to the gh-pages branch via CLI
npm run deploy
# (or: npm run cli -- deploy)
```

---

## Academic & Non-Commercial License Only

BioGrace is released strictly under the **BioGrace Academic & Non-Commercial Research License (v1.0)** — see [`LICENSE`](./LICENSE) for full terms.

- **Permitted:** Free use, modification, and academic citation for university research, teaching, workshops, theses, and non-commercial scientific publications.
- **Restricted:** Commercial use (biotech/pharma commercial R&D, paid consulting, fee-for-service, or commercial SaaS/product integration) requires prior written permission from the author.

### Citation
If you use BioGrace figures, statistical reports, or generated scripts in an academic publication, please cite:

```bibtex
@software{panda2026biograce,
  author       = {Panda, Pritam},
  title        = {BioGrace: Publication DE/Single-Cell Plotter and Biologist's Statistical Test Advisor},
  year         = {2026},
  url          = {https://github.com/pritampanda15/BioGrace}
}
```
