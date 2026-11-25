export type StudioMode = 'plotter' | 'stats';

export type DEPlotType = 'volcano' | 'ma' | 'dotplot' | 'upset' | 'lollipop';

export type StatsPlotType = 'raincloud' | 'box-beeswarm' | 'paired-slope' | 'barplot-trap';

export type JournalPresetId =
  | 'nature'
  | 'cell'
  | 'science'
  | 'okabe-ito'
  | 'viridis'
  | 'tol-muted';

export interface JournalPreset {
  id: JournalPresetId;
  name: string;
  subtitle: string;
  colorblindSafe: boolean;
  fontFamily: string;
  upColor: string;
  downColor: string;
  nsColor: string;
  accentColor: string;
  categorical: string[];
  sequential: string[];
  diverging: [string, string, string];
  axisWidth: number;
  gridOpacity: number;
}

export interface VolcanoRow {
  gene: string;
  log2FC: number;
  padj: number;
  pvalue: number;
  baseMean: number;
}

export interface DotPlotRow {
  gene: string;
  cluster: string;
  avgExpr: number;
  pctExpr: number;
}

export interface UpSetItem {
  id: string;
  sets: string[];
}

export interface PathwayRow {
  pathway: string;
  nes: number;
  padj: number;
  geneCount: number;
  category?: string;
}

export interface LabelOffset {
  dx: number;
  dy: number;
}

export interface DEPlotConfig {
  plotType: DEPlotType;
  preset: JournalPresetId;
  title: string;
  subtitle: string;
  fcThreshold: number;
  fdrThreshold: number;
  pointSize: number;
  pointAlpha: number;
  fontSize: number;
  labeledGenes: string[];
  labelOffsets: Record<string, LabelOffset>;
  showThresholds: boolean;
  showGrid: boolean;
  paperExport: boolean;
  topAutoLabelCount: number;
}

export interface TidyStatRow {
  group: string;
  value: number;
  subject?: string;
  replicate?: string;
  raw?: Record<string, string>;
}

export interface GroupSummary {
  group: string;
  n: number;
  mean: number;
  sd: number;
  sem: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  min: number;
  max: number;
  whiskerLow: number;
  whiskerHigh: number;
  ci95Low: number;
  ci95High: number;
  skewness: number;
  shapiroW: number;
  shapiroP: number;
  isNormal: boolean;
  outlierCount: number;
  values: number[];
}

export interface PairwiseResult {
  groupA: string;
  groupB: string;
  testName: string;
  statisticLabel: string;
  statistic: number;
  pValue: number;
  pAdjusted: number;
  effectLabel: string;
  effectSize: number;
  meanDiff: number;
  ciLow?: number;
  ciHigh?: number;
  significant: boolean;
  stars: string;
}

export interface StatisticalRecommendation {
  primaryTest: string;
  family: 'parametric' | 'nonparametric' | 'mixed';
  isPaired: boolean;
  groupCount: number;
  totalN: number;
  effectiveBioN: number;
  pseudoreplicationDetected: boolean;
  pseudoreplicationWarning: string | null;
  collapsedReplicates: boolean;
  assumptions: {
    normalityPassed: boolean;
    normalityDetail: string;
    variancePassed: boolean;
    varianceDetail: string;
    leveneF: number | null;
    leveneP: number | null;
    smallNSkewWarning: boolean;
  };
  omnibus: {
    testName: string;
    statisticLabel: string;
    statistic: number;
    df?: string;
    pValue: number;
    effectLabel?: string;
    effectSize?: number;
  };
  pairwise: PairwiseResult[];
  correctionMethod: 'BH-FDR' | 'Holm' | 'None';
  rationale: string[];
  whyNotOthers: string[];
  groups: GroupSummary[];
}

export interface StatsConfig {
  plotType: StatsPlotType;
  preset: JournalPresetId;
  title: string;
  yLabel: string;
  xLabel: string;
  isPaired: boolean;
  collapsePseudoreplicates: boolean;
  correctionMethod: 'BH-FDR' | 'Holm' | 'None';
  alpha: number;
  showSignificanceBrackets: boolean;
  showMeanDiamond: boolean;
  showRawPoints: boolean;
  paperExport: boolean;
}
