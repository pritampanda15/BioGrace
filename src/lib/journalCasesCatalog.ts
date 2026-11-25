export type JournalCaseId =
  | '01-error-dotplot'
  | '02-grouped-error-dotplot'
  | '03-multi-volcano'
  | '04-manhattan-twas'
  | '05-paired-boxplot'
  | '06-raincloud'
  | '07-swimmer'
  | '08-importance-streams'
  | '09-cld-variance-bars'
  | '10-circos-fusion'
  | '11-module-network'
  | '12-sankey-bubble'
  | '13-binned-heatmap'
  | '14-mantel-composite'
  | '15-multi-corr-heatmap'
  | '16-polar-heatmap'
  | '17-multilevel-sankey'
  | '18-treemap'
  | '19-mosaic-sunburst'
  | '20-split-violin';

export type CaseCategory = 'Distribution & Stats' | 'Genomics & Clinical' | 'Networks & Flows' | 'Heatmaps & Composition';

export interface JournalCaseMeta {
  id: JournalCaseId;
  number: string;
  title: string;
  journalSource: string;
  category: CaseCategory;
  bestFor: string;
  plainEnglishTip: string;
  rPackages: string[];
}

export const JOURNAL_CASES_20: JournalCaseMeta[] = [
  {
    id: '01-error-dotplot',
    number: '01',
    title: 'Individualized Error Dot-Plot',
    journalSource: 'Nature Microbiology',
    category: 'Distribution & Stats',
    bestFor: 'Showing every biological replicate alongside mean ± SD instead of opaque bar charts.',
    plainEnglishTip: 'Each dot is one real replicate; the bold point and whisker show average ± spread.',
    rPackages: ['ggplot2', 'dplyr'],
  },
  {
    id: '02-grouped-error-dotplot',
    number: '02',
    title: 'Grouped Error Dot-Plot',
    journalSource: 'Nature Cell Biology',
    category: 'Distribution & Stats',
    bestFor: 'Comparing multiple treatments across genotypes or timepoints with transparent raw replicates.',
    plainEnglishTip: 'Side-by-side dodging lets reviewers compare treatment shift within every genotype at a glance.',
    rPackages: ['ggplot2', 'dplyr'],
  },
  {
    id: '03-multi-volcano',
    number: '03',
    title: 'Multi-Group Volcano Plot',
    journalSource: 'Nature Communications',
    category: 'Genomics & Clinical',
    bestFor: 'Differential expression across 4–8 single-cell clusters or conditions in a single compact panel.',
    plainEnglishTip: 'Each column is one cell type; dots above the band are upregulated markers, below are downregulated.',
    rPackages: ['ggplot2', 'ggrepel', 'dplyr'],
  },
  {
    id: '04-manhattan-twas',
    number: '04',
    title: 'Manhattan Plot (GWAS / TWAS)',
    journalSource: 'iMeta',
    category: 'Genomics & Clinical',
    bestFor: 'Genome-wide association or transcriptome-wide association scans across chromosomes.',
    plainEnglishTip: 'Tall skyscrapers above the dashed line are loci significantly linked to the trait after multiple testing.',
    rPackages: ['ggplot2', 'ggrepel', 'dplyr'],
  },
  {
    id: '05-paired-boxplot',
    number: '05',
    title: 'Paired Boxplot with Subject Lines',
    journalSource: 'Nature Microbiology',
    category: 'Distribution & Stats',
    bestFor: 'Before-vs-after matched patient, donor, or animal cohorts showing individual trajectories.',
    plainEnglishTip: 'Connecting lines reveal whether almost every subject moved in the same direction even if baselines vary.',
    rPackages: ['ggplot2', 'dplyr'],
  },
  {
    id: '06-raincloud',
    number: '06',
    title: 'Horizontal Raincloud Plot',
    journalSource: 'Nature Communications',
    category: 'Distribution & Stats',
    bestFor: 'Combining smooth density (cloud), quartile box (umbrella), and raw points (rain) without hiding skew.',
    plainEnglishTip: 'The gold-standard replacement for bar charts — shows distribution shape, median, and every sample.',
    rPackages: ['ggplot2', 'gghalves', 'ggdist'],
  },
  {
    id: '07-swimmer',
    number: '07',
    title: 'Clinical Cohort Swimmer Plot',
    journalSource: 'Nature',
    category: 'Genomics & Clinical',
    bestFor: 'Individual patient treatment durations, response milestones (CR/PR/PD), and ongoing follow-up.',
    plainEnglishTip: 'Each horizontal lane is one patient; icons mark clinical milestones and arrows show ongoing response.',
    rPackages: ['ggplot2', 'dplyr'],
  },
  {
    id: '08-importance-streams',
    number: '08',
    title: 'Importance Bars + Abundance Streams',
    journalSource: 'Nature Communications',
    category: 'Genomics & Clinical',
    bestFor: 'Pairing machine-learning feature importance (Random Forest / SHAP) with relative abundance across cohorts.',
    plainEnglishTip: 'Left bars rank which biomarkers matter most; right streams show how abundant they are per condition.',
    rPackages: ['ggplot2', 'patchwork', 'tidyr'],
  },
  {
    id: '09-cld-variance-bars',
    number: '09',
    title: 'Grouped Variance + Significance Letters (CLD)',
    journalSource: 'Int. J. Mol. Sci.',
    category: 'Distribution & Stats',
    bestFor: 'Multi-group ANOVA/Kruskal comparisons where compact letters (a, b, c) summarize all pairwise contrasts.',
    plainEnglishTip: 'Groups that share a letter are NOT significantly different; groups with no shared letter differ (q < 0.05).',
    rPackages: ['ggplot2', 'multcompView', 'dplyr'],
  },
  {
    id: '10-circos-fusion',
    number: '10',
    title: 'Circos Fusion-Gene Diagram',
    journalSource: 'Nature Communications',
    category: 'Networks & Flows',
    bestFor: 'Chromosomal translocations, oncogenic gene fusions, or inter-chromosomal chromatin loops.',
    plainEnglishTip: 'Outer ring arcs are chromosomes; curved ribbons connect partner genes fused across breakpoints.',
    rPackages: ['circlize', 'ggplot2'],
  },
  {
    id: '11-module-network',
    number: '11',
    title: 'Module Interaction Network',
    journalSource: 'Nature Communications',
    category: 'Networks & Flows',
    bestFor: 'WGCNA co-expression modules, PPI clusters, or transcription-factor regulatory subnetworks.',
    plainEnglishTip: 'Larger nodes are hub genes with many connections; colored clusters highlight co-regulated biological modules.',
    rPackages: ['igraph', 'ggraph', 'ggplot2'],
  },
  {
    id: '12-sankey-bubble',
    number: '12',
    title: 'Sankey + Enrichment Bubble Panel',
    journalSource: 'Nature Communications',
    category: 'Networks & Flows',
    bestFor: 'Linking key DEGs on the left to enriched GO/KEGG pathways with FDR & gene-ratio bubbles on the right.',
    plainEnglishTip: 'Follow ribbons from each gene to see which pathways it drives, then read bubble size and color for strength.',
    rPackages: ['ggalluvial', 'ggplot2', 'patchwork'],
  },
  {
    id: '13-binned-heatmap',
    number: '13',
    title: 'Discrete (Binned) Heatmap',
    journalSource: 'Nature Microbiology',
    category: 'Heatmaps & Composition',
    bestFor: 'Microbiome abundance tiers, mutation status, or categorized z-scores where exact thresholds matter.',
    plainEnglishTip: 'Grouping continuous values into crisp color bins makes key biological cutoffs easy to read in print.',
    rPackages: ['ggplot2', 'tidyr'],
  },
  {
    id: '14-mantel-composite',
    number: '14',
    title: 'Mantel Composite Correlation Heatmap',
    journalSource: 'Nature Microbiology',
    category: 'Heatmaps & Composition',
    bestFor: 'Correlating microbial/transcriptomic communities (Mantel test ribbons) against clinical/environmental variables.',
    plainEnglishTip: 'Upper triangle shows variable-to-variable correlation; curved edges show how strongly each community links to them.',
    rPackages: ['ggplot2', 'linkET', 'dplyr'],
  },
  {
    id: '15-multi-corr-heatmap',
    number: '15',
    title: 'Multi-Group Correlation Heatmap',
    journalSource: 'Nature Communications',
    category: 'Heatmaps & Composition',
    bestFor: 'Comparing pairwise biomarker correlations (with * / ** / *** stars) side by side across cohorts.',
    plainEnglishTip: 'Instantly highlights gene or cytokine correlations that flip sign or strengthen in disease vs. healthy tissue.',
    rPackages: ['ggplot2', 'ggh4x', 'tidyr'],
  },
  {
    id: '16-polar-heatmap',
    number: '16',
    title: 'Polar-Coordinate Circular Heatmap',
    journalSource: 'Nature Communications',
    category: 'Heatmaps & Composition',
    bestFor: 'Circadian gene rhythms, pan-cancer subtype signatures, or compact multi-omic radial comparisons.',
    plainEnglishTip: 'Each concentric ring is a condition or timepoint, and radial wedges are genes or taxa.',
    rPackages: ['ggplot2', 'tidyr'],
  },
  {
    id: '17-multilevel-sankey',
    number: '17',
    title: 'Multi-Level Alluvial / Sankey Flow',
    journalSource: 'Nature Communications',
    category: 'Networks & Flows',
    bestFor: 'Tracking cell-state transitions, clinical cohort stratification, or sample metadata flows across 3+ stages.',
    plainEnglishTip: 'Ribbon thickness is proportional to the number of cells or patients flowing from one category to the next.',
    rPackages: ['ggalluvial', 'ggplot2'],
  },
  {
    id: '18-treemap',
    number: '18',
    title: 'Hierarchical Pathway Treemap',
    journalSource: 'Nature Communications',
    category: 'Heatmaps & Composition',
    bestFor: 'Showing part-to-whole proportions of gene families, immune cell subsets, or metabolic categories.',
    plainEnglishTip: 'Rectangle area represents exact share of total counts; color groups sub-pathways into parent families.',
    rPackages: ['treemapify', 'ggplot2'],
  },
  {
    id: '19-mosaic-sunburst',
    number: '19',
    title: 'Hierarchical Sunburst & Taxonomy Ring',
    journalSource: 'Nature Communications',
    category: 'Heatmaps & Composition',
    bestFor: 'Multi-level taxonomy (Phylum → Class → Genus) or nested single-cell lineage hierarchies.',
    plainEnglishTip: 'Read from inner ring (broad lineage) outward to finer subtypes; angular width equals proportion.',
    rPackages: ['ggplot2', 'dplyr'],
  },
  {
    id: '20-split-violin',
    number: '20',
    title: 'Split Violin Comparison Plot',
    journalSource: 'Nature Communications',
    category: 'Distribution & Stats',
    bestFor: 'Back-to-back single-cell expression comparison of two conditions (e.g., WT vs. KO) across marker genes.',
    plainEnglishTip: 'Left half-violin is Control, right half-violin is Treated — directly reveals bimodal shifts across markers.',
    rPackages: ['ggplot2', 'gghalves', 'dplyr'],
  },
];
