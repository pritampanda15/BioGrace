export type StudioMode = 'plotter' | 'gallery' | 'stats' | 'workbench' | 'composer';

export type DEPlotType =
  | 'volcano'
  | 'ma'
  | 'dotplot'
  | 'upset'
  | 'lollipop'
  | 'umap'
  | 'tsne'
  | 'pca'
  | 'heatmap'
  | 'pseudotime'
  | 'dose-response'
  | 'survival'
  | 'forest'
  | 'roc'
  | 'correlation';

export type StatsPlotType = 'raincloud' | 'box-beeswarm' | 'paired-slope' | 'barplot-trap';

export type JournalPresetId =
  | 'nature'
  | 'science'
  | 'cell'
  | 'acs'
  | 'biophysj'
  | 'pnas';

export type PaletteId =
  | 'okabe-ito'
  | 'nature-npg'
  | 'acs-classic'
  | 'tol-bright'
  | 'tol-muted'
  | 'viridis-discrete'
  | 'grayscale-pub';

export type ColormapId =
  | 'RdYlBu_r'
  | 'viridis'
  | 'plasma'
  | 'inferno'
  | 'magma'
  | 'cividis'
  | 'coolwarm'
  | 'Spectral_r'
  | 'turbo'
  | 'Blues'
  | 'YlGnBu'
  | 'cubehelix_r'
  | 'Greys';

export type FontFamilyChoice = 'sans-serif' | 'serif' | 'monospace';

export type ColumnWidthChoice = 'single' | 'one_half' | 'double';

export interface JournalPreset {
  id: JournalPresetId;
  name: string;
  shortName: string;
  description: string;
  widthsMm: {
    single: number;
    one_half: number;
    double: number;
  };
  fontFamily: FontFamilyChoice;
  fontSize: number;
  titleSize: number;
  labelSize: number;
  tickSize: number;
  legendSize: number;
  lineWidth: number;
  axesLinewidth: number;
  tickDirection: 'out' | 'in';
  topRightSpines: boolean;
  tickTopRight: boolean;
  defaultPalette: PaletteId;
  defaultPanelLabels: 'lowercase' | 'uppercase' | 'parens_lower' | 'parens_upper';
}

export interface ColorPaletteSpec {
  id: PaletteId;
  name: string;
  subtitle: string;
  colors: string[];
  upColor: string;
  downColor: string;
  nsColor: string;
  accentColor: string;
}

export interface ColormapSpec {
  id: ColormapId;
  name: string;
  stops: string[];
}

export interface ResolvedPlotTheme {
  journal: JournalPreset;
  palette: ColorPaletteSpec;
  colormap: ColormapSpec;
  fontFamilyCss: string;
  fontFamilyKey: FontFamilyChoice;
  fontScale: number;
  lineWidth: number;
  axesLinewidth: number;
  tickDirection: 'out' | 'in';
  topRightSpines: boolean;
  tickTopRight: boolean;
  transparentBg: boolean;
  widthMm: number;
  dpi: number;
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

export interface PublicationStyleSettings {
  preset: JournalPresetId;
  palette: PaletteId;
  colormap: ColormapId;
  fontFamily: FontFamilyChoice;
  fontSizePt: number;
  lineWidth: number;
  columnWidth: ColumnWidthChoice;
  dpi: 300 | 600 | 1200;
  transparentBg: boolean;
  paperExport: boolean;
  legendLabels?: Record<string, string>;
}

export interface DEPlotConfig extends PublicationStyleSettings {
  plotType: DEPlotType;
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  fcThreshold: number;
  fdrThreshold: number;
  pointSize: number;
  pointAlpha: number;
  fontSize: number;
  labeledGenes: string[];
  labelOffsets: Record<string, LabelOffset>;
  showThresholds: boolean;
  showGrid: boolean;
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

export interface StatsConfig extends PublicationStyleSettings {
  plotType: StatsPlotType;
  title: string;
  subtitle: string;
  yLabel: string;
  xLabel: string;
  isPaired: boolean;
  collapsePseudoreplicates: boolean;
  correctionMethod: 'BH-FDR' | 'Holm' | 'None';
  alpha: number;
  showSignificanceBrackets: boolean;
  showMeanDiamond: boolean;
  showRawPoints: boolean;
}
