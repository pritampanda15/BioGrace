import type { JournalCaseId } from './journalCasesCatalog';

export interface JournalCaseCsvSpec {
  key: JournalCaseId;
  label: string;
  filename: string;
  compatibleTools: string;
  requiredColumns: { name: string; aliases: string; description: string }[];
  tip: string;
  sampleCsv: string;
}

export const JOURNAL_CASE_CSV_TEMPLATES: Record<JournalCaseId, JournalCaseCsvSpec> = {
  '01-error-dotplot': {
    key: '01-error-dotplot',
    label: '01 · Individualized Error Dot-Plot',
    filename: '01_error_dotplot.csv',
    compatibleTools: 'ggplot2 (Nature Microbiology archetype)',
    requiredColumns: [
      { name: 'group', aliases: 'treatment, condition', description: 'Experimental group label' },
      { name: 'value', aliases: 'measurement, readout', description: 'Numeric value per biological replicate' },
    ],
    tip: 'Use with R script from "R · Python · CLI" or upload directly to Stat Advisor & Anti-Barplot Studio.',
    sampleCsv: `group,value
Control,17.4
Control,19.1
Control,16.8
Control,18.5
Low_Dose,23.2
Low_Dose,26.1
Low_Dose,24.8
Low_Dose,25.5
Mid_Dose,34.6
Mid_Dose,37.8
Mid_Dose,35.2
Mid_Dose,36.4
High_Dose,47.2
High_Dose,51.4
High_Dose,48.6
High_Dose,49.9`,
  },

  '02-grouped-error-dotplot': {
    key: '02-grouped-error-dotplot',
    label: '02 · Grouped Error Dot-Plot',
    filename: '02_grouped_error_dotplot.csv',
    compatibleTools: 'ggplot2 (Nature Cell Biology archetype)',
    requiredColumns: [
      { name: 'genotype', aliases: 'group, background', description: 'Outer X-axis category' },
      { name: 'treatment', aliases: 'condition, arm', description: 'Dodged color subgroup' },
      { name: 'value', aliases: 'activity, readout', description: 'Numeric measurement per replicate' },
    ],
    tip: 'Ideal for 2-factor wet-lab designs (Genotype × Drug) showing every individual replicate.',
    sampleCsv: `genotype,treatment,value
Wild-Type,Vehicle,18.2
Wild-Type,Vehicle,17.5
Wild-Type,IFN-g,46.4
Wild-Type,IFN-g,44.8
Wild-Type,IFN-g+Inh,25.9
Wild-Type,IFN-g+Inh,27.1
STAT1_KO,Vehicle,16.1
STAT1_KO,Vehicle,15.4
STAT1_KO,IFN-g,20.2
STAT1_KO,IFN-g,19.5
STAT1_KO,IFN-g+Inh,17.4
STAT1_KO,IFN-g+Inh,16.8`,
  },

  '03-multi-volcano': {
    key: '03-multi-volcano',
    label: '03 · Multi-Group Volcano Plot',
    filename: '03_multi_group_volcano.csv',
    compatibleTools: 'Seurat FindAllMarkers(), Scanpy rank_genes_groups',
    requiredColumns: [
      { name: 'cluster', aliases: 'cell_type, contrast', description: 'Cluster or contrast column' },
      { name: 'gene', aliases: 'symbol, feature', description: 'Gene symbol' },
      { name: 'log2FC', aliases: 'avg_log2FC, logFC', description: 'Average log2 fold change' },
      { name: 'padj', aliases: 'p_val_adj, FDR', description: 'Adjusted p-value' },
    ],
    tip: 'Export directly from Seurat FindAllMarkers() to visualize top up/down markers across all cell clusters in one panel.',
    sampleCsv: `cluster,gene,log2FC,padj
CD4 T,IL7R,2.85,1.2e-24
CD4 T,CCR7,2.14,4.5e-18
CD4 T,LYZ,-2.90,8.1e-20
CD8 T,CD8A,3.42,2.1e-32
CD8 T,GZMB,2.76,3.4e-21
CD8 T,MS4A1,-2.65,9.2e-16
NK,NKG7,3.88,1.1e-38
NK,GNLY,3.54,6.4e-31
B Cell,MS4A1,3.72,4.2e-35
B Cell,CD79A,3.45,7.8e-29
Mono,LYZ,4.10,1.9e-42
Mono,S100A8,3.92,3.1e-36`,
  },

  '04-manhattan-twas': {
    key: '04-manhattan-twas',
    label: '04 · Manhattan Plot (GWAS / TWAS)',
    filename: '04_manhattan_twas.csv',
    compatibleTools: 'PLINK, SAIGE, FUSION TWAS, REGENIE',
    requiredColumns: [
      { name: 'chr', aliases: 'CHR, chromosome', description: 'Chromosome number (1–22)' },
      { name: 'pos', aliases: 'BP, position', description: 'Base-pair genomic position' },
      { name: 'gene', aliases: 'SNP, rsid, locus', description: 'Variant or gene label' },
      { name: 'pvalue', aliases: 'P, p_val', description: 'Association p-value (plotted as −log10 P)' },
    ],
    tip: 'Standard genome-wide significance threshold is p = 5e-8 (−log10 P = 7.30).',
    sampleCsv: `chr,pos,gene,pvalue
1,14250000,PTPN22,2.4e-05
2,67650000,IL23R,2.5e-13
3,46410000,CCR5,1.8e-04
6,32550000,HLA-DRB1,1.6e-15
6,32580000,HLA-DQA1,4.2e-11
11,61600000,FADS2,3.9e-11
12,56400000,STAT6,8.4e-06
14,75200000,APOE,4.1e-14
16,50740000,NOD2,9.2e-07
19,45410000,TOMM40,6.1e-09`,
  },

  '05-paired-boxplot': {
    key: '05-paired-boxplot',
    label: '05 · Paired Boxplot with Subject Lines',
    filename: '05_paired_boxplot.csv',
    compatibleTools: 'ggplot2 / BioGrace Stat Advisor (Paired mode)',
    requiredColumns: [
      { name: 'subject', aliases: 'patient, donor, mouse', description: 'Matched subject ID linking Pre & Post' },
      { name: 'group', aliases: 'timepoint, condition', description: 'Before vs. After condition' },
      { name: 'value', aliases: 'score, measurement', description: 'Numeric measurement' },
    ],
    tip: 'Can also be uploaded directly into BioGrace Stat Advisor — auto-detects paired subjects!',
    sampleCsv: `subject,group,value
PT_01,Baseline,22.4
PT_01,Post_Tx,36.8
PT_02,Baseline,31.2
PT_02,Post_Tx,44.5
PT_03,Baseline,18.9
PT_03,Post_Tx,29.4
PT_04,Baseline,27.6
PT_04,Post_Tx,41.2
PT_05,Baseline,35.0
PT_05,Post_Tx,48.1
PT_06,Baseline,24.8
PT_06,Post_Tx,35.9`,
  },

  '06-raincloud': {
    key: '06-raincloud',
    label: '06 · Horizontal Raincloud Plot',
    filename: '06_raincloud_distribution.csv',
    compatibleTools: 'ggdist / gghalves / BioGrace Anti-Barplot Studio',
    requiredColumns: [
      { name: 'group', aliases: 'cohort, condition', description: 'Cohort or treatment group' },
      { name: 'value', aliases: 'score, expression', description: 'Continuous observation per sample' },
    ],
    tip: 'Upload directly into BioGrace Anti-Barplot Studio for live interactive Raincloud + statistical assumption tests!',
    sampleCsv: `group,value
Healthy,21.4
Healthy,24.8
Healthy,22.9
Healthy,26.1
Early_Stage,34.2
Early_Stage,39.5
Early_Stage,36.8
Early_Stage,41.0
Advanced,42.5
Advanced,44.1
Advanced,63.8
Advanced,66.2`,
  },

  '07-swimmer': {
    key: '07-swimmer',
    label: '07 · Clinical Cohort Swimmer Plot',
    filename: '07_clinical_swimmer.csv',
    compatibleTools: 'ggplot2 (Nature clinical trial archetype)',
    requiredColumns: [
      { name: 'patient', aliases: 'subject, id', description: 'Patient lane ID' },
      { name: 'months', aliases: 'duration, time', description: 'Total months on treatment' },
      { name: 'arm', aliases: 'cohort, treatment', description: 'Treatment arm (bar color)' },
      { name: 'pr_month / cr_month / ongoing', aliases: 'milestones', description: 'Response milestone times and ongoing status (1/0)' },
    ],
    tip: 'Sort rows by descending duration so the longest-responding patients appear cleanly at the top.',
    sampleCsv: `patient,months,arm,pr_month,cr_month,ongoing
PT-01,22.5,Combination,2.2,5.5,1
PT-02,20.0,Combination,3.1,7.0,1
PT-03,18.2,Monotherapy,3.8,,1
PT-04,16.4,Combination,2.6,6.2,0
PT-05,14.5,Monotherapy,4.1,,1
PT-06,12.8,Combination,3.0,,0
PT-07,10.6,Monotherapy,4.5,,0
PT-08,8.4,Monotherapy,,,0`,
  },

  '08-importance-streams': {
    key: '08-importance-streams',
    label: '08 · Feature Importance + Abundance Streams',
    filename: '08_importance_streams.csv',
    compatibleTools: 'Random Forest / SHAP + Microbiome/Omics Relative Abundance',
    requiredColumns: [
      { name: 'feature', aliases: 'taxon, gene, biomarker', description: 'Ranked biomarker name' },
      { name: 'importance', aliases: 'shap, mda, gini', description: 'Model importance score (left bars)' },
      { name: 'Cohort columns', aliases: 'HC, Mild, Severe', description: 'Relative abundance fractions per cohort (right streams)' },
    ],
    tip: 'Combine ML model feature importance with cohort-level abundance so reviewers see both predictive weight and biological direction.',
    sampleCsv: `feature,importance,HC,Mild,Severe
Akkermansia,0.94,0.42,0.34,0.24
Faecalibacterium,0.85,0.38,0.36,0.26
Bacteroides,0.76,0.22,0.44,0.34
Roseburia,0.67,0.48,0.28,0.24
Prevotella,0.55,0.18,0.32,0.50
Blautia,0.44,0.33,0.37,0.30
Ruminococcus,0.33,0.41,0.29,0.30`,
  },

  '09-cld-variance-bars': {
    key: '09-cld-variance-bars',
    label: '09 · Grouped Variance + CLD Letters',
    filename: '09_cld_variance_groups.csv',
    compatibleTools: 'multcompView / emmeans / ggplot2',
    requiredColumns: [
      { name: 'group', aliases: 'treatment, condition', description: 'Experimental group' },
      { name: 'value', aliases: 'fold_induction, measurement', description: 'Numeric value per replicate' },
      { name: 'cld_letter', aliases: 'letter, group_sig', description: 'Compact letter display (a, ab, b, c) summarizing pairwise significance' },
    ],
    tip: 'Groups sharing any letter are NOT significantly different; groups with distinct letters differ at q < 0.05.',
    sampleCsv: `group,value,cld_letter
Control,14.2,c
Control,15.8,c
Control,13.9,c
Drug_A,23.5,b
Drug_A,25.1,b
Drug_A,22.8,b
Drug_B,25.9,b
Drug_B,27.4,b
Drug_B,24.6,b
Combo,41.8,a
Combo,44.5,a
Combo,42.9,a`,
  },

  '10-circos-fusion': {
    key: '10-circos-fusion',
    label: '10 · Circos Fusion-Gene Links',
    filename: '10_circos_fusions.csv',
    compatibleTools: 'circlize, STAR-Fusion, Arriba',
    requiredColumns: [
      { name: 'from_chr / to_chr', aliases: 'chr1, chr2', description: 'Source and partner chromosome ideograms' },
      { name: 'fusion_name', aliases: 'gene_pair, label', description: 'Oncogenic fusion label (e.g. BCR-ABL1)' },
      { name: 'supporting_reads', aliases: 'weight, count', description: 'Ribbon thickness / recurrent cohort count' },
    ],
    tip: 'Works directly with STAR-Fusion or Arriba summary tables.',
    sampleCsv: `from_chr,from_pos,to_chr,to_pos,fusion_name,supporting_reads
chr9,130854000,chr22,23290000,BCR-ABL1,48
chr2,42290000,chr21,39750000,EML4-ALK,34
chr11,69640000,chr14,106050000,CCND1-IGH,28
chr7,140753000,chr17,39700000,BRAF-KIAA1549,21
chr17,40300000,chr21,41460000,TMPRSS2-ERG,39`,
  },

  '11-module-network': {
    key: '11-module-network',
    label: '11 · Module Interaction Network (Edge List)',
    filename: '11_module_network_edges.csv',
    compatibleTools: 'igraph, ggraph, WGCNA, STRING PPI',
    requiredColumns: [
      { name: 'from / to', aliases: 'source, target', description: 'Connected gene/protein pairs' },
      { name: 'module', aliases: 'cluster, community', description: 'Co-expression module or pathway group' },
      { name: 'weight', aliases: 'score, correlation', description: 'Interaction confidence or correlation weight' },
    ],
    tip: 'Export edge lists directly from STRING or WGCNA exportNetworkToCytoscape().',
    sampleCsv: `from,to,module,weight
STAT1,IRF1,IFN_Antiviral,0.96
STAT1,CXCL10,IFN_Antiviral,0.92
STAT1,GBP1,IFN_Antiviral,0.89
IRF1,ISG15,IFN_Antiviral,0.84
MYC,CDK4,Cell_Cycle,0.94
MYC,E2F1,Cell_Cycle,0.91
CDK4,MKI67,Cell_Cycle,0.87
MRC1,ARG1,Tissue_Repair,0.90
MRC1,CD163,Tissue_Repair,0.88
STAT1,MYC,Cross_Module,0.45`,
  },

  '12-sankey-bubble': {
    key: '12-sankey-bubble',
    label: '12 · Sankey + Enrichment Bubble Table',
    filename: '12_sankey_enrichment_bubble.csv',
    compatibleTools: 'ggalluvial + clusterProfiler / Enrichr',
    requiredColumns: [
      { name: 'gene', aliases: 'source', description: 'Leading-edge DEG on left side of Sankey' },
      { name: 'pathway', aliases: 'target, term', description: 'Enriched GO/KEGG pathway' },
      { name: 'gene_ratio', aliases: 'ratio, fold_enrichment', description: 'Bubble X-position' },
      { name: 'padj / count', aliases: 'FDR, size', description: 'Bubble color (−log10 FDR) and area' },
    ],
    tip: 'One row per gene-to-pathway link connects the alluvial ribbons seamlessly to the enrichment bubbles.',
    sampleCsv: `gene,pathway,gene_ratio,padj,count
STAT1,IFN-g Response,0.44,6.3e-15,62
CXCL10,IFN-g Response,0.44,6.3e-15,62
IRF1,IFN-g Response,0.44,6.3e-15,62
STAT1,JAK-STAT Signaling,0.36,2.5e-11,44
IRF1,Antiviral Defense,0.31,1.6e-09,38
GBP1,Antiviral Defense,0.31,1.6e-09,38
MRC1,M2 Tissue Repair,0.28,3.1e-08,32
ARG1,M2 Tissue Repair,0.28,3.1e-08,32
PPARG,Lipid Metabolism,0.22,6.3e-06,24`,
  },

  '13-binned-heatmap': {
    key: '13-binned-heatmap',
    label: '13 · Discrete (Binned) Heatmap',
    filename: '13_binned_heatmap.csv',
    compatibleTools: 'ggplot2 (Nature Microbiology archetype)',
    requiredColumns: [
      { name: 'taxon', aliases: 'gene, row', description: 'Row label (species or gene)' },
      { name: 'sample', aliases: 'col, cohort', description: 'Column label' },
      { name: 'zscore', aliases: 'value, abundance', description: 'Numeric value binned into discrete color tiers' },
    ],
    tip: 'Discrete bins make threshold cutoffs (e.g., |z| > 1.5) much easier to read than continuous gradients in print.',
    sampleCsv: `taxon,sample,zscore
Akkermansia,HC-1,1.62
Akkermansia,HC-2,1.24
Akkermansia,DIS-1,-1.48
Akkermansia,DIS-2,-1.85
Bacteroides,HC-1,-0.92
Bacteroides,HC-2,-0.64
Bacteroides,DIS-1,1.35
Bacteroides,DIS-2,1.72
Prevotella,HC-1,-1.10
Prevotella,HC-2,-0.45
Prevotella,DIS-1,0.88
Prevotella,DIS-2,1.64`,
  },

  '14-mantel-composite': {
    key: '14-mantel-composite',
    label: '14 · Mantel Composite Correlation Table',
    filename: '14_mantel_composite.csv',
    compatibleTools: 'vegan::mantel(), linkET, ggplot2',
    requiredColumns: [
      { name: 'community', aliases: 'spec, omics_layer', description: 'Community matrix name (left nodes)' },
      { name: 'env_var', aliases: 'clinical_var, factor', description: 'Environmental / clinical variable' },
      { name: 'mantel_r', aliases: 'r, statistic', description: 'Mantel correlation coefficient (edge thickness)' },
      { name: 'mantel_p', aliases: 'p, pvalue', description: 'Mantel permutation p-value (edge color)' },
    ],
    tip: 'Pair this Mantel summary table with your sample × environment matrix for the upper-right correlation triangle.',
    sampleCsv: `community,env_var,mantel_r,mantel_p
Taxonomic_16S,pH,0.52,0.001
Taxonomic_16S,Temp,0.34,0.012
Taxonomic_16S,TOC,0.18,0.14
Functional_KO,pH,0.44,0.004
Functional_KO,NO3,0.49,0.002
Functional_KO,Salinity,0.28,0.038
Metabolome,TOC,0.58,0.001
Metabolome,NH4,0.41,0.006`,
  },

  '15-multi-corr-heatmap': {
    key: '15-multi-corr-heatmap',
    label: '15 · Multi-Group Correlation Matrix',
    filename: '15_multi_group_correlation.csv',
    compatibleTools: 'ggplot2 / ggh4x / Hmisc::rcorr',
    requiredColumns: [
      { name: 'cohort', aliases: 'group, condition', description: 'Facet cohort (e.g. Healthy vs. Disease)' },
      { name: 'var1 / var2', aliases: 'x, y', description: 'Biomarker pair' },
      { name: 'r / pvalue', aliases: 'cor, p', description: 'Correlation r (−1 to +1) and significance for * / ** / *** stars' },
    ],
    tip: 'Highlights rewiring of cytokine or gene co-expression correlations between healthy and diseased tissue.',
    sampleCsv: `cohort,var1,var2,r,pvalue
Healthy,IFNG,CXCL10,0.68,0.002
Healthy,IFNG,IL10,0.42,0.041
Healthy,TNF,IL6,0.55,0.011
Disease,IFNG,CXCL10,0.91,1.2e-06
Disease,IFNG,IL10,-0.62,0.004
Disease,TNF,IL6,0.84,4.5e-05`,
  },

  '16-polar-heatmap': {
    key: '16-polar-heatmap',
    label: '16 · Polar-Coordinate Circular Heatmap',
    filename: '16_polar_circadian_heatmap.csv',
    compatibleTools: 'ggplot2 coord_polar() (Nature Communications archetype)',
    requiredColumns: [
      { name: 'gene', aliases: 'feature, taxon', description: 'Radial wedge label around perimeter' },
      { name: 'ring', aliases: 'timepoint, condition', description: 'Concentric ring (e.g. 0h, 6h, 12h, 18h)' },
      { name: 'zscore', aliases: 'expr, value', description: 'Scaled expression value' },
    ],
    tip: 'Ideal for circadian rhythms, cell-cycle phase genes, or compact multi-condition signatures.',
    sampleCsv: `gene,ring,zscore
ARNTL,0h,1.82
ARNTL,6h,0.45
ARNTL,12h,-1.65
ARNTL,18h,-0.40
PER1,0h,-1.52
PER1,6h,-0.32
PER1,12h,1.74
PER1,18h,0.58
CLOCK,0h,1.24
CLOCK,6h,0.62
CLOCK,12h,-1.18
CLOCK,18h,-0.55`,
  },

  '17-multilevel-sankey': {
    key: '17-multilevel-sankey',
    label: '17 · Multi-Level Alluvial / Sankey Flow',
    filename: '17_multilevel_sankey.csv',
    compatibleTools: 'ggalluvial (Nature Communications archetype)',
    requiredColumns: [
      { name: 'stage1 / stage2 / stage3', aliases: 'cohort, state, outcome', description: 'Categorical stratum columns from left to right' },
      { name: 'freq', aliases: 'count, n_cells, patients', description: 'Number of cells or patients flowing through each path' },
    ],
    tip: 'Each row is a unique path across stages with its count — ribbon width scales directly to freq.',
    sampleCsv: `cohort,cell_state,outcome,freq
Primary,Effector,CR_PR,42
Primary,Memory,CR_PR,19
Primary,Exhausted,Non_Responder,28
Metastatic,Effector,CR_PR,14
Metastatic,Memory,CR_PR,18
Metastatic,Exhausted,Non_Responder,36`,
  },

  '18-treemap': {
    key: '18-treemap',
    label: '18 · Hierarchical Pathway Treemap',
    filename: '18_pathway_treemap.csv',
    compatibleTools: 'treemapify / ggplot2',
    requiredColumns: [
      { name: 'superfamily', aliases: 'parent, category', description: 'Parent grouping (tile color & outer border)' },
      { name: 'pathway', aliases: 'label, term', description: 'Individual rectangle label' },
      { name: 'genes', aliases: 'area, count, abundance', description: 'Positive numeric value controlling rectangle area' },
    ],
    tip: 'Area encodes exact part-to-whole proportion — far easier to compare accurately than pie charts.',
    sampleCsv: `superfamily,pathway,genes
Immune,IFN-g Signaling,162
Immune,Chemokine Axis,118
Immune,Antigen Presentation,94
Metabolism,Oxidative Phosphorylation,148
Metabolism,Lipid Oxidation,86
Cell_Cycle,MYC Targets,132
Cell_Cycle,G2M Checkpoint,96`,
  },

  '19-mosaic-sunburst': {
    key: '19-mosaic-sunburst',
    label: '19 · Hierarchical Sunburst & Lineage Ring',
    filename: '19_lineage_sunburst.csv',
    compatibleTools: 'ggplot2 coord_polar() / Taxonomy or PBMC Atlas',
    requiredColumns: [
      { name: 'lineage', aliases: 'phylum, major_type', description: 'Inner ring broad category' },
      { name: 'subtype', aliases: 'genus, cluster', description: 'Outer ring nested sub-population' },
      { name: 'percent', aliases: 'count, fraction', description: 'Proportion or cell count (angular width)' },
    ],
    tip: 'Ensure subtype percentages sum neatly within each parent lineage.',
    sampleCsv: `lineage,subtype,percent
T_Lymphocytes,CD4_Naive,19
T_Lymphocytes,CD4_Memory,11
T_Lymphocytes,CD8_Effector,16
Myeloid,CD14_Monocyte,17
Myeloid,cDC_Macrophage,11
B_Lineage,Memory_B,16
NK_ILC,CD56dim_NK,10`,
  },

  '20-split-violin': {
    key: '20-split-violin',
    label: '20 · Split Violin Comparison Plot',
    filename: '20_split_violin_markers.csv',
    compatibleTools: 'gghalves / Seurat / Scanpy (Nature Communications archetype)',
    requiredColumns: [
      { name: 'marker', aliases: 'gene, feature', description: 'Gene on X-axis (one split violin per gene)' },
      { name: 'condition', aliases: 'group, arm', description: 'Exactly 2 conditions (Left half vs. Right half)' },
      { name: 'expression', aliases: 'value, log1p', description: 'Per-cell expression measurement' },
    ],
    tip: 'Back-to-back half-violins let you compare bimodal single-cell distributions between Control and Treated across many genes at once.',
    sampleCsv: `marker,condition,expression
CXCL10,Control,1.9
CXCL10,Control,2.3
CXCL10,Treated,4.6
CXCL10,Treated,5.1
STAT1,Control,2.4
STAT1,Control,2.8
STAT1,Treated,4.3
STAT1,Treated,4.7
GZMB,Control,1.7
GZMB,Control,2.1
GZMB,Treated,4.0
GZMB,Treated,4.5
MRC1,Control,4.4
MRC1,Control,4.8
MRC1,Treated,1.6
MRC1,Treated,2.0`,
  },
};

export const JOURNAL_CASE_CSV_LIST = Object.values(JOURNAL_CASE_CSV_TEMPLATES);
