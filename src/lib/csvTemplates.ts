import type { DEPlotType } from '../types/biograce';

export type CsvTemplateKey = DEPlotType | 'stats-tidy';

export interface CsvTemplateSpec {
  key: CsvTemplateKey;
  label: string;
  filename: string;
  compatibleTools: string;
  requiredColumns: { name: string; aliases: string; description: string }[];
  tip: string;
  sampleCsv: string;
}

export const CSV_TEMPLATES: Record<CsvTemplateKey, CsvTemplateSpec> = {
  volcano: {
    key: 'volcano',
    label: 'Volcano Plot (DESeq2 / edgeR / Seurat)',
    filename: 'sample_volcano_deseq2.csv',
    compatibleTools: 'DESeq2, edgeR, limma, Scanpy, Seurat',
    requiredColumns: [
      { name: 'gene', aliases: 'symbol, gene_name, names, feature', description: 'Gene or feature symbol' },
      { name: 'log2FoldChange', aliases: 'logFC, avg_log2FC, log2FC', description: 'Log2 fold change between conditions' },
      { name: 'padj', aliases: 'FDR, p_val_adj, adj.P.Val, qvalue', description: 'FDR-adjusted p-value (0 to 1)' },
      { name: 'baseMean', aliases: 'AveExpr, logCPM (optional)', description: 'Mean normalized expression (used in MA plot)' },
    ],
    tip: 'Export directly from R via write.csv(as.data.frame(res), "deseq2.csv") — BioGrace auto-detects DESeq2, edgeR, limma, Scanpy, and Seurat column names.',
    sampleCsv: `gene,baseMean,log2FoldChange,pvalue,padj
CXCL10,18420,4.82,2.1e-46,1.2e-42
GBP1,9640,4.15,1.1e-39,4.5e-36
STAT1,24100,3.24,2.3e-34,8.4e-31
IDO1,3420,5.12,9.8e-33,3.1e-29
IRF1,11250,2.95,7.4e-29,2.2e-25
IFIT3,6780,3.68,2.1e-26,5.9e-23
CD274,3180,2.86,1.8e-19,4.1e-16
MRC1,12900,-3.42,8.8e-32,2.4e-28
CD163,15400,-3.88,2.4e-27,6.1e-24
PPARG,4820,-2.64,2.1e-22,4.9e-19
ARG1,1890,-4.12,7.9e-21,1.7e-17
TREM2,8340,-2.28,4.2e-17,8.1e-14
ACTB,52100,0.14,0.42,0.78
GAPDH,68400,-0.09,0.58,0.89
RPL13,44200,0.32,0.19,0.46
EEF1A1,71200,-0.22,0.31,0.62`,
  },

  ma: {
    key: 'ma',
    label: 'MA Plot (Expression vs Fold Change)',
    filename: 'sample_ma_plot.csv',
    compatibleTools: 'DESeq2, edgeR, limma',
    requiredColumns: [
      { name: 'gene', aliases: 'symbol, feature', description: 'Gene identifier' },
      { name: 'baseMean', aliases: 'AveExpr, logCPM, mean', description: 'Average expression (plotted as log10)' },
      { name: 'log2FoldChange', aliases: 'logFC, avg_log2FC', description: 'Log2 fold change on Y-axis' },
      { name: 'padj', aliases: 'FDR, adj.P.Val', description: 'Adjusted p-value for significance coloring' },
    ],
    tip: 'Uses the exact same CSV file as Volcano Plot — just make sure baseMean (or AveExpr) is included!',
    sampleCsv: `gene,baseMean,log2FoldChange,padj
CXCL10,18420,4.82,1.2e-42
STAT1,24100,3.24,8.4e-31
IDO1,3420,5.12,3.1e-29
HLA-DRA,41200,1.92,3.7e-12
MRC1,12900,-3.42,2.4e-28
CD163,15400,-3.88,6.1e-24
ARG1,1890,-4.12,1.7e-17
APOE,31400,-1.72,4.1e-09
RPL13,44200,0.28,0.54
GAPDH,68400,-0.08,0.91
SLC2A1,540,0.45,0.34
ZNF42,120,-0.62,0.41`,
  },

  dotplot: {
    key: 'dotplot',
    label: 'Single-Cell Marker Dot Plot',
    filename: 'sample_scrna_dotplot.csv',
    compatibleTools: 'Seurat DotPlot()$data, Scanpy sc.pl.dotplot',
    requiredColumns: [
      { name: 'gene', aliases: 'feature, symbol, marker', description: 'Marker gene name (X-axis)' },
      { name: 'cluster', aliases: 'cell_type, identity, group', description: 'Cell population / cluster (Y-axis)' },
      { name: 'avg_expr', aliases: 'mean, scaled, zscore', description: 'Mean or z-scaled expression (dot color)' },
      { name: 'pct_expr', aliases: 'pct, percent, fraction', description: '% of cells expressing gene (0–100 or 0–1, dot size)' },
    ],
    tip: 'In Seurat, export directly with write.csv(DotPlot(obj, features=genes)$data, "dotplot.csv"). Both 0–1 fractions and 0–100 percentages work automatically.',
    sampleCsv: `gene,cluster,avg_expr,pct_expr
IL7R,CD4 T,2.45,89
IL7R,CD8 T,0.72,31
IL7R,B Cell,-0.35,4
IL7R,Mono,-0.41,3
CD8A,CD4 T,-0.28,5
CD8A,CD8 T,2.62,92
CD8A,B Cell,-0.42,2
CD8A,Mono,-0.39,3
MS4A1,CD4 T,-0.33,2
MS4A1,CD8 T,-0.31,2
MS4A1,B Cell,2.58,95
MS4A1,Mono,-0.40,4
LYZ,CD4 T,-0.25,6
LYZ,CD8 T,-0.22,5
LYZ,B Cell,-0.18,8
LYZ,Mono,2.84,98`,
  },

  upset: {
    key: 'upset',
    label: 'DEG UpSet Set-Intersection Matrix',
    filename: 'sample_upset_binary.csv',
    compatibleTools: 'Binary membership matrix (1/0 or TRUE/FALSE)',
    requiredColumns: [
      { name: 'gene', aliases: 'id, feature, item', description: 'Unique gene or feature name' },
      { name: 'Set Columns (2+)', aliases: 'Any column names', description: '1 / 0 (or TRUE / FALSE) indicating whether the gene belongs to that contrast' },
    ],
    tip: 'Put each experimental contrast (e.g., IFNg, TNFa, LPS, DrugA) as its own column with 1 if the gene is significant in that condition and 0 if not.',
    sampleCsv: `gene,IFNg,TNFa,LPS,IFNa
CXCL10,1,1,1,1
STAT1,1,0,1,1
GBP1,1,0,0,1
IDO1,1,0,0,0
NFKBIA,0,1,1,0
IL1B,0,1,1,0
TNFAIP3,0,1,1,0
ISG15,1,0,0,1
MX1,1,0,0,1
CCL2,0,1,1,0
TLR4,0,0,1,0
CD14,0,0,1,0
IRF1,1,1,1,1
OAS1,1,0,0,1`,
  },

  lollipop: {
    key: 'lollipop',
    label: 'Ranked Pathway Enrichment Lollipop',
    filename: 'sample_gsea_pathways.csv',
    compatibleTools: 'fgsea, clusterProfiler, GSEApy, Enrichr',
    requiredColumns: [
      { name: 'pathway', aliases: 'term, description, name', description: 'Pathway or GO term name' },
      { name: 'nes', aliases: 'enrichment, score, log2fc', description: 'Normalized Enrichment Score (positive or negative)' },
      { name: 'padj', aliases: 'FDR, qvalue, p.adjust', description: 'Adjusted p-value' },
      { name: 'geneCount', aliases: 'count, size, overlap', description: 'Number of leading-edge / overlapping genes (dot size)' },
    ],
    tip: 'Works directly with fgsea or GSEApy CSV exports — HALLMARK_ / KEGG_ / GOBP_ prefixes are automatically formatted cleanly.',
    sampleCsv: `pathway,nes,padj,geneCount
HALLMARK_INTERFERON_GAMMA_RESPONSE,2.94,1.2e-18,162
HALLMARK_INTERFERON_ALPHA_RESPONSE,2.71,4.8e-15,89
HALLMARK_INFLAMMATORY_RESPONSE,2.28,1.9e-10,124
HALLMARK_IL6_JAK_STAT3_SIGNALING,2.12,3.4e-08,64
HALLMARK_TNFA_SIGNALING_VIA_NFKB,1.84,4.1e-05,141
HALLMARK_OXIDATIVE_PHOSPHORYLATION,-2.41,2.1e-11,154
HALLMARK_FATTY_ACID_METABOLISM,-2.08,6.5e-08,92
HALLMARK_MYC_TARGETS_V1,-1.94,2.8e-06,138`,
  },

  umap: {
    key: 'umap',
    label: 'scRNA-seq UMAP Embedding + Gene Expression',
    filename: 'sample_scrna_umap.csv',
    compatibleTools: 'Seurat Embeddings(obj, "umap"), Scanpy adata.obsm["X_umap"]',
    requiredColumns: [
      { name: 'UMAP_1', aliases: 'umap1, x', description: 'UMAP dimension 1 coordinate' },
      { name: 'UMAP_2', aliases: 'umap2, y', description: 'UMAP dimension 2 coordinate' },
      { name: 'cluster', aliases: 'cell_type, leiden, seurat_clusters', description: 'Cell type / cluster label' },
      { name: 'condition + genes', aliases: 'Optional columns', description: 'Condition (Control/Treated) + any numeric marker gene columns for FeaturePlot!' },
    ],
    tip: 'Any extra numeric columns (like IL7R, CD8A, NKG7, MS4A1) automatically appear in the "Color Cells By (FeaturePlot)" dropdown!',
    sampleCsv: `cell,UMAP_1,UMAP_2,cluster,condition,IL7R,CD8A,NKG7,LYZ
C01,-4.8,3.1,CD4 T,Control,4.5,0.1,0.2,0.0
C02,-4.3,3.6,CD4 T,Treated,4.2,0.2,0.3,0.1
C03,-5.1,2.7,CD4 T,Control,4.8,0.0,0.1,0.0
C04,-2.1,5.2,CD8 T,Control,0.4,4.7,2.1,0.0
C05,-1.8,5.6,CD8 T,Treated,0.3,4.9,2.8,0.1
C06,-2.5,4.8,CD8 T,Treated,0.2,4.4,2.4,0.0
C07,1.8,5.9,NK Cell,Control,0.1,0.3,5.2,0.1
C08,2.2,5.5,NK Cell,Treated,0.0,0.2,5.6,0.0
C09,1.9,-4.1,CD14 Mono,Control,0.0,0.0,0.1,5.1
C10,2.4,-3.8,CD14 Mono,Treated,0.1,0.0,0.2,5.4
C11,1.5,-4.5,CD14 Mono,Control,0.0,0.1,0.0,4.9
C12,5.3,1.4,B Cell,Treated,0.2,0.0,0.1,0.2`,
  },

  tsne: {
    key: 'tsne',
    label: 'scRNA-seq t-SNE Embedding + Gene Expression',
    filename: 'sample_scrna_tsne.csv',
    compatibleTools: 'Seurat Embeddings(obj, "tsne"), Scanpy adata.obsm["X_tsne"]',
    requiredColumns: [
      { name: 'tSNE_1', aliases: 'tsne1, x', description: 't-SNE coordinate 1' },
      { name: 'tSNE_2', aliases: 'tsne2, y', description: 't-SNE coordinate 2' },
      { name: 'cluster', aliases: 'cell_type, leiden', description: 'Annotated cell cluster' },
      { name: 'condition + genes', aliases: 'Optional numeric columns', description: 'Enables Split-by-Condition and FeaturePlot overlay' },
    ],
    tip: 'Same tidy cell-level CSV format as UMAP — just provide tSNE_1 and tSNE_2 coordinates (or include both UMAP and tSNE columns in one file!).',
    sampleCsv: `cell,tSNE_1,tSNE_2,cluster,condition,IL7R,CD8A,NKG7,LYZ
C01,-22.4,18.2,CD4 T,Control,4.5,0.1,0.2,0.0
C02,-20.1,19.5,CD4 T,Treated,4.2,0.2,0.3,0.1
C03,-24.0,16.8,CD4 T,Control,4.8,0.0,0.1,0.0
C04,-8.2,27.5,CD8 T,Control,0.4,4.7,2.1,0.0
C05,-6.4,29.1,CD8 T,Treated,0.3,4.9,2.8,0.1
C06,14.2,25.8,NK Cell,Control,0.1,0.3,5.2,0.1
C07,15.8,24.1,NK Cell,Treated,0.0,0.2,5.6,0.0
C08,8.1,-23.5,CD14 Mono,Control,0.0,0.0,0.1,5.1
C09,10.4,-22.1,CD14 Mono,Treated,0.1,0.0,0.2,5.4
C10,27.6,-4.2,B Cell,Treated,0.2,0.0,0.1,0.2`,
  },

  pca: {
    key: 'pca',
    label: 'PCA Coordinates (Bulk RNA-seq / Proteomics QC)',
    filename: 'sample_pca_qc.csv',
    compatibleTools: 'DESeq2 plotPCA(returnData=TRUE), prcomp, sklearn PCA',
    requiredColumns: [
      { name: 'sample', aliases: 'id, name', description: 'Sample identifier' },
      { name: 'group', aliases: 'condition, treatment, cohort', description: 'Experimental group (draws 95% confidence ellipse per group)' },
      { name: 'PC1', aliases: 'pc_1, dim1, x', description: 'Principal Component 1 score' },
      { name: 'PC2', aliases: 'pc_2, dim2, y', description: 'Principal Component 2 score' },
    ],
    tip: 'Provide at least 3 samples per group so BioGrace can compute exact 95% bivariate confidence ellipses.',
    sampleCsv: `sample,group,PC1,PC2
Ctrl_1,Control,-26.4,-6.2
Ctrl_2,Control,-22.1,-10.5
Ctrl_3,Control,-24.8,-4.9
Ctrl_4,Control,-19.6,-9.8
Ctrl_5,Control,-28.2,-11.1
IFNg6h_1,IFN-g 6h,5.4,19.2
IFNg6h_2,IFN-g 6h,9.8,16.4
IFNg6h_3,IFN-g 6h,12.1,22.0
IFNg6h_4,IFN-g 6h,6.7,14.8
IFNg6h_5,IFN-g 6h,10.5,18.9
IFNg24h_1,IFN-g 24h,24.2,-12.4
IFNg24h_2,IFN-g 24h,28.9,-9.1
IFNg24h_3,IFN-g 24h,22.5,-14.6
IFNg24h_4,IFN-g 24h,26.8,-7.8
IFNg24h_5,IFN-g 24h,30.1,-11.5`,
  },

  heatmap: {
    key: 'heatmap',
    label: 'DEG Expression Matrix (Wide Format)',
    filename: 'sample_deg_matrix.csv',
    compatibleTools: 'DESeq2 VST / rlog / TPM / CPM expression table',
    requiredColumns: [
      { name: 'gene (1st col)', aliases: 'Any gene symbol column', description: 'Gene names in rows' },
      { name: 'Sample columns', aliases: 'Group_1, Group_2, ...', description: 'Normalized counts/TPM — BioGrace auto-computes row Z-scores & infers condition from prefix before "_"' },
    ],
    tip: 'Name sample columns like Ctrl_1, Ctrl_2, Treated_1, Treated_2 so the top Condition color bar groups them automatically!',
    sampleCsv: `gene,Ctrl_1,Ctrl_2,Ctrl_3,Drug_1,Drug_2,Drug_3
CXCL10,12.4,14.1,11.8,148.2,162.5,155.0
GBP1,24.5,21.8,26.2,118.4,129.0,121.6
STAT1,45.2,48.9,43.1,164.0,172.3,159.8
IDO1,4.2,3.8,4.9,88.4,95.2,91.0
MRC1,142.0,136.5,149.2,28.4,24.1,31.0
CD163,118.6,125.0,114.2,19.5,22.4,18.1
ARG1,84.2,79.5,88.1,12.4,10.8,14.2
PPARG,62.4,66.1,59.8,18.2,16.9,20.5`,
  },

  pseudotime: {
    key: 'pseudotime',
    label: 'Single-Cell Pseudotime Trajectory Table',
    filename: 'sample_pseudotime.csv',
    compatibleTools: 'Monocle3, Slingshot, Palantir, scVelo',
    requiredColumns: [
      { name: 'pseudotime', aliases: 'time, pt, t', description: 'Continuous pseudotime coordinate (auto-scaled 0 to 1)' },
      { name: 'gene', aliases: 'marker, feature', description: 'Gene name (1 curve per gene)' },
      { name: 'expression', aliases: 'expr, value, y', description: 'Log-normalized gene expression' },
    ],
    tip: 'BioGrace smoothly aggregates raw cells along pseudotime into publication curves with shaded confidence ribbons.',
    sampleCsv: `pseudotime,gene,expression
0.05,TCF7,4.1
0.20,TCF7,2.6
0.45,TCF7,1.2
0.70,TCF7,0.6
0.95,TCF7,0.3
0.05,IRF4,0.6
0.25,IRF4,2.4
0.48,IRF4,3.9
0.72,IRF4,2.1
0.95,IRF4,0.9
0.05,GZMB,0.3
0.30,GZMB,0.8
0.55,GZMB,2.2
0.78,GZMB,4.1
0.95,GZMB,4.6`,
  },

  'dose-response': {
    key: 'dose-response',
    label: 'Dose–Response / IC50 Assay Table',
    filename: 'sample_ic50_assay.csv',
    compatibleTools: 'Plate readers, GraphPad Prism tidy export, CellTiter-Glo',
    requiredColumns: [
      { name: 'compound', aliases: 'drug, group, treatment', description: 'Compound or drug arm name (optional for single drug)' },
      { name: 'conc', aliases: 'concentration, dose, uM, nM', description: 'Positive drug concentration (> 0, plotted on log10 scale)' },
      { name: 'response', aliases: 'viability, inhibition, activity', description: 'Assay readout (e.g., % cell viability 0–100)' },
    ],
    tip: 'Use 6–9 serial dilutions spanning both the top (~100%) and bottom plateaus with 2–3 replicates per concentration for accurate 4PL IC50 fits.',
    sampleCsv: `compound,conc,response
Drug_A,0.001,99.2
Drug_A,0.001,97.4
Drug_A,0.01,91.5
Drug_A,0.01,88.2
Drug_A,0.03,64.8
Drug_A,0.03,61.2
Drug_A,0.1,29.4
Drug_A,0.1,33.1
Drug_A,0.3,13.5
Drug_A,0.3,11.2
Drug_A,1.0,8.1
Drug_A,1.0,6.9
Drug_B,0.001,98.6
Drug_B,0.01,96.1
Drug_B,0.1,84.5
Drug_B,0.3,63.2
Drug_B,1.0,34.8
Drug_B,3.0,18.4
Drug_B,10.0,12.1`,
  },

  survival: {
    key: 'survival',
    label: 'Kaplan–Meier Survival Cohort Table',
    filename: 'sample_kaplan_meier.csv',
    compatibleTools: 'Clinical cohorts, mouse survival studies, TCGA, survminer',
    requiredColumns: [
      { name: 'time', aliases: 'months, days, os_time, duration', description: 'Follow-up duration (months or days)' },
      { name: 'event', aliases: 'status, death, os_event', description: '1 = event occurred (death/progression), 0 = right-censored (alive/lost)' },
      { name: 'group', aliases: 'arm, treatment, cohort', description: 'Treatment arm or biomarker high/low group' },
    ],
    tip: 'Code events strictly as 1 (event) and 0 (censored). BioGrace computes exact Kaplan–Meier steps, 95% Greenwood CI, Log-Rank p-value, and the Number-at-Risk table.',
    sampleCsv: `time,event,group
4.2,1,Standard
6.8,1,Standard
9.1,1,Standard
11.5,0,Standard
13.4,1,Standard
16.0,1,Standard
19.2,1,Standard
24.5,0,Standard
10.5,1,Combo_IO
15.2,0,Combo_IO
21.8,1,Combo_IO
26.4,0,Combo_IO
31.0,1,Combo_IO
36.5,0,Combo_IO
42.0,0,Combo_IO
48.0,0,Combo_IO`,
  },

  forest: {
    key: 'forest',
    label: 'Forest Plot (Cox HR / Odds Ratio Table)',
    filename: 'sample_forest_hr.csv',
    compatibleTools: 'Cox proportional hazards, logistic regression, meta-analysis',
    requiredColumns: [
      { name: 'variable', aliases: 'term, feature, study', description: 'Covariate or subgroup name' },
      { name: 'hr', aliases: 'or, estimate, ratio', description: 'Point estimate (Hazard Ratio or Odds Ratio, > 0)' },
      { name: 'ci_low', aliases: 'lower, low, lcl', description: 'Lower 95% confidence bound (> 0)' },
      { name: 'ci_high', aliases: 'upper, high, ucl', description: 'Upper 95% confidence bound (> 0)' },
      { name: 'pvalue', aliases: 'p_value, p', description: 'P-value for the covariate' },
    ],
    tip: 'Values < 1 indicate protective/reduced risk; values > 1 indicate increased risk. Ratios are automatically plotted on a symmetric log scale.',
    sampleCsv: `variable,hr,ci_low,ci_high,pvalue
IFN-g Signature High,0.44,0.28,0.69,0.0004
CD8+ T-Cell Density,0.56,0.37,0.84,0.0052
TMB >= 10 mut/Mb,0.64,0.43,0.95,0.027
PD-L1 >= 50%,0.72,0.49,1.06,0.094
Age > 65 yr,1.14,0.81,1.61,0.45
Liver Metastasis,1.88,1.24,2.85,0.0029
ECOG PS >= 2,2.24,1.41,3.55,0.0007`,
  },

  roc: {
    key: 'roc',
    label: 'Biomarker ROC / AUROC Classification Table',
    filename: 'sample_roc_biomarker.csv',
    compatibleTools: 'Diagnostic panels, ML classifiers, logistic regression',
    requiredColumns: [
      { name: 'model', aliases: 'biomarker_name, signature (optional)', description: 'Model or biomarker name (allows comparing multiple curves)' },
      { name: 'label', aliases: 'truth, y, outcome', description: 'True binary class: 1 = Positive (case), 0 = Negative (control)' },
      { name: 'score', aliases: 'prob, prediction, value', description: 'Continuous biomarker measurement or predicted probability' },
    ],
    tip: 'Include multiple rows per model with true 0/1 outcomes and continuous scores — BioGrace computes exact trapezoidal AUROC, 95% CI, and the optimal Youden cutoff.',
    sampleCsv: `model,label,score
6-Gene_Panel,0,0.12
6-Gene_Panel,0,0.24
6-Gene_Panel,0,0.31
6-Gene_Panel,0,0.48
6-Gene_Panel,0,0.19
6-Gene_Panel,1,0.68
6-Gene_Panel,1,0.82
6-Gene_Panel,1,0.91
6-Gene_Panel,1,0.77
6-Gene_Panel,1,0.88
Single_Gene,0,0.28
Single_Gene,0,0.41
Single_Gene,0,0.52
Single_Gene,0,0.35
Single_Gene,0,0.44
Single_Gene,1,0.58
Single_Gene,1,0.72
Single_Gene,1,0.49
Single_Gene,1,0.69
Single_Gene,1,0.76`,
  },

  correlation: {
    key: 'correlation',
    label: 'Method Correlation & Bland–Altman Pair Table',
    filename: 'sample_correlation_ba.csv',
    compatibleTools: 'Assay validation (qPCR vs RNA-seq, ELISA vs Mass Spec)',
    requiredColumns: [
      { name: 'sample', aliases: 'id, name (optional)', description: 'Matched sample ID' },
      { name: 'method_A', aliases: 'Any 1st numeric column', description: 'Reference method value (X-axis)' },
      { name: 'method_B', aliases: 'Any 2nd numeric column', description: 'Test method value (Y-axis)' },
    ],
    tip: 'Provide paired measurements from two assays on the same samples — switch between Pearson/Spearman Correlation and Bland–Altman Agreement in one click!',
    sampleCsv: `sample,RNAseq_log2TPM,qPCR_negDeltaCt
S01,2.4,2.8
S02,3.1,3.5
S03,4.2,4.9
S04,4.8,5.1
S05,5.5,6.2
S06,6.1,6.4
S07,6.9,7.5
S08,7.4,8.1
S09,8.2,8.6
S10,9.1,9.8
S11,9.6,10.1
S12,10.3,10.9`,
  },

  'stats-tidy': {
    key: 'stats-tidy',
    label: 'Statistical Advisor & Anti-Barplot (Tidy CSV)',
    filename: 'sample_wetlab_stats.csv',
    compatibleTools: 'qPCR, Western blot, ELISA, flow cytometry, viability assays',
    requiredColumns: [
      { name: 'group', aliases: 'condition, treatment, dose, genotype', description: 'Experimental group label (2 or more groups)' },
      { name: 'value', aliases: 'expression, viability, response, measurement', description: 'Numeric assay measurement (one observation per row)' },
      { name: 'subject (optional)', aliases: 'patient, donor, mouse, pair', description: 'Include for Paired designs OR to detect nested technical replicates (Pseudoreplication Guard!)' },
    ],
    tip: 'Keep data in "tidy / long" format: one measurement per row! If you have technical qPCR wells per mouse, include a donor/mouse column so BioGrace protects you from pseudoreplication.',
    sampleCsv: `group,value,subject
Vehicle,48.2,M01
Vehicle,51.4,M02
Vehicle,46.9,M03
Vehicle,53.1,M04
Vehicle,49.8,M05
Vehicle,50.5,M06
Vehicle,47.6,M07
Vehicle,52.2,M08
Drug_1uM,32.4,M09
Drug_1uM,29.8,M10
Drug_1uM,35.1,M11
Drug_1uM,31.2,M12
Drug_1uM,36.8,M13
Drug_1uM,33.5,M14
Drug_1uM,28.9,M15
Drug_1uM,34.4,M16
Drug_10uM,18.2,M17
Drug_10uM,21.5,M18
Drug_10uM,16.9,M19
Drug_10uM,19.4,M20
Drug_10uM,22.1,M21
Drug_10uM,17.8,M22
Drug_10uM,20.3,M23
Drug_10uM,18.9,M24`,
  },
};

export const CSV_TEMPLATE_LIST = Object.values(CSV_TEMPLATES);
