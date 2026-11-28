import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  BookOpen,
  Calculator,
  Check,
  ClipboardPaste,
  Code2,
  Copy,
  Download,
  FileCode2,
  FileSpreadsheet,
  FlaskConical,
  FolderKanban,
  FolderOpen,
  Grid2x2,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Lock,
  Moon,
  Palette,
  Pencil,
  Pin,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Sun,
  Terminal,
  Type,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import type {
  ColormapId,
  ColumnWidthChoice,
  DEPlotConfig,
  DEPlotType,
  DotPlotRow,
  FontFamilyChoice,
  JournalPresetId,
  PaletteId,
  PathwayRow,
  PublicationStyleSettings,
  StatsConfig,
  StatsPlotType,
  StudioMode,
  TidyStatRow,
  UpSetItem,
  VolcanoRow,
} from './types/biograce';
import {
  COLORMAP_LIST,
  FONT_FAMILIES,
  JOURNAL_PRESET_LIST,
  JOURNAL_PRESETS,
  PALETTE_LIST,
  resolvePlotTheme,
} from './lib/palettes';
import {
  generateDemoDotPlotData,
  generateDemoPathwayData,
  generateDemoUpSetData,
  generateDemoVolcanoData,
  getStatsDemoPresets,
} from './lib/demoData';
import {
  detectBestPlotForCsv,
  parseDERows,
  parseDelimitedText,
  parseDoseResponseRows,
  parseDotPlotRows,
  parseEmbeddingRows,
  parseForestRows,
  parseHeatmapMatrix,
  parsePairXYRows,
  parsePathwayRows,
  parsePCARows,
  parsePseudotimeRows,
  parseROCRows,
  parseSurvivalRows,
  parseTidyStatsTable,
  parseUpSetRows,
} from './lib/csvParser';
import type { CsvTemplateKey } from './lib/csvTemplates';
import {
  EMBEDDING_MARKERS,
  generateDemoCorrelationData,
  generateDemoDEGHeatmap,
  generateDemoDoseResponse,
  generateDemoEmbeddingData,
  generateDemoForestData,
  generateDemoPCAData,
  generateDemoPseudotime,
  generateDemoROCData,
  generateDemoSurvivalData,
  type EmbeddingCell,
  type ForestRow,
  type PCASampleRow,
} from './lib/advancedDemoData';
import type { DosePoint, PairXYRow, ROCInputRow, SurvivalRow } from './lib/bioAnalytics';
import { analyzeTidyDataset } from './lib/statsEngine';
import {
  generateDECliCommand,
  generateDEPythonCode,
  generateDERCode,
  generateStatsCliCommand,
  generateStatsPythonCode,
  generateStatsRCode,
} from './lib/codeGen';
import {
  exportPngFile,
  exportSvgFile,
  exportTextFile,
  exportTiffFile,
  exportVectorPdfFile,
} from './lib/exporters';
import { APPLE_SPRINGS, playAppleTick } from './motion/applePhysics';
import { AppleSegmentedControl } from './components/ui/AppleSegmentedControl';
import { FluidSheet } from './components/ui/FluidSheet';
import { CsvFormatGuide, type AnyCsvGuideKey } from './components/ui/CsvFormatGuide';
import { CvdPreflightBar } from './components/ui/CvdPreflightBar';
import { DataImportMapperModal } from './components/ui/DataImportMapperModal';
import { ManuscriptProjectDrawer } from './components/ui/ManuscriptProjectDrawer';
import { WetLabWorkbench, type WorkbenchSubTab } from './components/workbench/WetLabWorkbench';
import { FigureComposerStudio } from './components/composer/FigureComposerStudio';
import type { CvdSimulationMode } from './lib/preflight';
import { detectJournalCaseForCsv } from './lib/journalCasesDataParser';
import { parseExcelWorkbook } from './lib/spreadsheetImport';
import type { ParsedTable } from './lib/csvParser';
import {
  loadComposerPanels,
  loadSavedFigures,
  persistComposerPanels,
  persistSavedFigures,
  svgElementToDataUrl,
  type BioGraceProjectFile,
  type ComposerPanelItem,
  type ComposerPanelSource,
  type ManuscriptFigureRecord,
} from './lib/workspaceStore';
import {
  InlinePlotEditor,
  type ActivePlotEdit,
  type EditablePlotField,
} from './components/ui/InlinePlotEditor';
import { VolcanoMAPlot } from './components/plots/VolcanoMAPlot';
import { DotPlotChart } from './components/plots/DotPlotChart';
import { UpSetPlot } from './components/plots/UpSetPlot';
import { PathwayLollipopPlot } from './components/plots/PathwayLollipopPlot';
import { EmbeddingPlot } from './components/plots/EmbeddingPlot';
import { PCAPlot } from './components/plots/PCAPlot';
import { DEGHeatmapPlot } from './components/plots/DEGHeatmapPlot';
import { PseudotimePlot } from './components/plots/PseudotimePlot';
import { DoseResponsePlot } from './components/plots/DoseResponsePlot';
import { SurvivalKMPlot } from './components/plots/SurvivalKMPlot';
import { ForestPlotChart } from './components/plots/ForestPlotChart';
import { ROCPlotChart } from './components/plots/ROCPlotChart';
import { CorrelationBlandAltmanPlot } from './components/plots/CorrelationBlandAltmanPlot';
import { AntiBarplotCanvas } from './components/plots/AntiBarplotCanvas';
import { StatAdvisorPanel } from './components/stats/StatAdvisorPanel';
import { LaymanStatsGuide } from './components/stats/LaymanStatsGuide';
import { PlotLaymanExplainer } from './components/stats/PlotLaymanExplainer';
import { JournalCaseRenderer } from './components/plots/JournalCaseRenderer';
import {
  JOURNAL_CASES_20,
  type CaseCategory,
  type JournalCaseId,
} from './lib/journalCasesCatalog';
import {
  generateJournalCasePythonCode,
  generateJournalCaseRCode,
} from './lib/journalCasesCodeGen';

export function App() {
  const [studio, setStudio] = useState<StudioMode>('plotter');
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [codeSheetOpen, setCodeSheetOpen] = useState(false);
  const [csvGuideOpen, setCsvGuideOpen] = useState(false);
  const [mapperSheetOpen, setMapperSheetOpen] = useState(false);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const [licenseSheetOpen, setLicenseSheetOpen] = useState(false);
  const [cvdMode, setCvdMode] = useState<CvdSimulationMode>('none');
  const [workbenchSubTab, setWorkbenchSubTab] = useState<WorkbenchSubTab>('power');
  const [galleryTables, setGalleryTables] = useState<
    Partial<Record<JournalCaseId, { table: ParsedTable; fileName: string }>>
  >({});
  const [composerPanels, setComposerPanels] = useState<ComposerPanelItem[]>(() => loadComposerPanels());
  const [savedFigures, setSavedFigures] = useState<ManuscriptFigureRecord[]>(() => loadSavedFigures());
  const [mapperInitText, setMapperInitText] = useState('');
  const [mapperInitName, setMapperInitName] = useState('pasted_spreadsheet.tsv');
  const [codeTab, setCodeTab] = useState<'r' | 'python' | 'cli'>('r');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadBanner, setUploadBanner] = useState<{
    kind: 'success' | 'warning';
    title: string;
    detail: string;
  } | null>(null);
  const [deUploadStatus, setDeUploadStatus] = useState<{
    fileName: string;
    rowCount: number;
    isCustom: boolean;
  }>({ fileName: 'Demo dataset', rowCount: 500, isCustom: false });
  const [statsUploadStatus, setStatsUploadStatus] = useState<{
    fileName: string;
    rowCount: number;
    isCustom: boolean;
  }>({ fileName: 'Demo dataset', rowCount: 48, isCustom: false });
  const toastTimerRef = useRef<number | null>(null);
  const [geneQuery, setGeneQuery] = useState('');
  const [activeCaseId, setActiveCaseId] = useState<JournalCaseId>('03-multi-volcano');
  const [caseCategoryFilter, setCaseCategoryFilter] = useState<'All' | CaseCategory>('All');
  const [activePlotEdit, setActivePlotEdit] = useState<ActivePlotEdit | null>(null);
  const [galleryTitles, setGalleryTitles] = useState<Record<string, { title?: string; subtitle?: string }>>({});

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recipeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    persistComposerPanels(composerPanels);
  }, [composerPanels]);

  useEffect(() => {
    persistSavedFigures(savedFigures);
  }, [savedFigures]);

  // ---------------- Studio 1 State (DE & Single-Cell) ----------------
  const [volcanoRows, setVolcanoRows] = useState<VolcanoRow[]>(() => generateDemoVolcanoData());
  const [dotPlotRows, setDotPlotRows] = useState<DotPlotRow[]>(() => generateDemoDotPlotData());
  const [upsetItems, setUpsetItems] = useState<UpSetItem[]>(() => generateDemoUpSetData());
  const [pathwayRows, setPathwayRows] = useState<PathwayRow[]>(() => generateDemoPathwayData());
  const [embeddingCells, setEmbeddingCells] = useState<EmbeddingCell[]>(() => generateDemoEmbeddingData());
  const [embeddingMarkers, setEmbeddingMarkers] = useState<string[]>([...EMBEDDING_MARKERS]);
  const [embeddingColorBy, setEmbeddingColorBy] = useState<'cluster' | string>('cluster');
  const [embeddingSplit, setEmbeddingSplit] = useState(false);
  const [pcaData, setPcaData] = useState<{ rows: PCASampleRow[]; pc1Var: number; pc2Var: number }>(() =>
    generateDemoPCAData()
  );
  const [degHeatmap, setDegHeatmap] = useState(() => generateDemoDEGHeatmap());
  const [pseudotime, setPseudotime] = useState(() => generateDemoPseudotime());
  const [dosePoints, setDosePoints] = useState<DosePoint[]>(() => generateDemoDoseResponse());
  const [survivalRows, setSurvivalRows] = useState<SurvivalRow[]>(() => generateDemoSurvivalData());
  const [forestRows, setForestRows] = useState<ForestRow[]>(() => generateDemoForestData());
  const [rocRows, setRocRows] = useState<ROCInputRow[]>(() => generateDemoROCData());
  const [corrRows, setCorrRows] = useState<PairXYRow[]>(() => generateDemoCorrelationData());
  const [corrViewMode, setCorrViewMode] = useState<'correlation' | 'bland-altman'>('correlation');
  const [plotGroupTab, setPlotGroupTab] = useState<'de' | 'sc' | 'clinical'>('de');
  const [deSourceFile, setDeSourceFile] = useState('ifng_macrophage_deseq2.csv');

  const [deConfig, setDeConfig] = useState<DEPlotConfig>({
    plotType: 'volcano',
    preset: 'nature',
    palette: 'nature-npg',
    colormap: 'RdYlBu_r',
    fontFamily: 'sans-serif',
    fontSizePt: 8.0,
    lineWidth: 1.15,
    columnWidth: 'double',
    dpi: 300,
    transparentBg: false,
    paperExport: true,
    title: 'IFN-γ Stimulated Macrophages vs. Control',
    subtitle: '',
    xLabel: '',
    yLabel: '',
    fcThreshold: 1.0,
    fdrThreshold: 0.05,
    pointSize: 3.6,
    pointAlpha: 0.85,
    fontSize: 12,
    labeledGenes: ['CXCL10', 'IDO1', 'GBP1', 'STAT1', 'MRC1', 'CD163', 'ARG1', 'PPARG'],
    labelOffsets: {
      STAT1: { dx: -24, dy: -22 },
      GBP1: { dx: 22, dy: -18 },
      CXCL10: { dx: -22, dy: -14 },
      IDO1: { dx: 18, dy: 18 },
    },
    showThresholds: true,
    showGrid: true,
    topAutoLabelCount: 8,
  });

  // ---------------- Studio 2 State (Stats & Anti-Barplot) ----------------
  const statsDemos = useMemo(() => getStatsDemoPresets(), []);
  const [activeStatsDemoId, setActiveStatsDemoId] = useState(statsDemos[0].id);
  const [statsRows, setStatsRows] = useState<TidyStatRow[]>(() => statsDemos[0].rows);
  const [statsSourceFile, setStatsSourceFile] = useState('bimodal_responder_assay.csv');

  const [statsConfig, setStatsConfig] = useState<StatsConfig>({
    plotType: 'raincloud',
    preset: 'science',
    palette: 'okabe-ito',
    colormap: 'viridis',
    fontFamily: 'sans-serif',
    fontSizePt: 8.0,
    lineWidth: 1.1,
    columnWidth: 'double',
    dpi: 300,
    transparentBg: false,
    paperExport: true,
    title: statsDemos[0].name,
    subtitle: '',
    yLabel: statsDemos[0].yLabel,
    xLabel: statsDemos[0].xLabel,
    isPaired: statsDemos[0].isPaired,
    collapsePseudoreplicates: false,
    correctionMethod: 'BH-FDR',
    alpha: 0.05,
    showSignificanceBrackets: true,
    showMeanDiamond: true,
    showRawPoints: true,
  });

  const statsAnalysis = useMemo(
    () =>
      analyzeTidyDataset(statsRows, {
        isPaired: statsConfig.isPaired,
        collapsePseudoreplicates: statsConfig.collapsePseudoreplicates,
        correctionMethod: statsConfig.correctionMethod,
        alpha: statsConfig.alpha,
      }),
    [
      statsRows,
      statsConfig.isPaired,
      statsConfig.collapsePseudoreplicates,
      statsConfig.correctionMethod,
      statsConfig.alpha,
    ]
  );

  const activeCase = useMemo(
    () => JOURNAL_CASES_20.find((c) => c.id === activeCaseId) ?? JOURNAL_CASES_20[0],
    [activeCaseId]
  );

  const filteredCases = useMemo(
    () =>
      caseCategoryFilter === 'All'
        ? JOURNAL_CASES_20
        : JOURNAL_CASES_20.filter((c) => c.category === caseCategoryFilter),
    [caseCategoryFilter]
  );

  // ---------------- Shared Style Updaters ----------------
  const activeStyle: PublicationStyleSettings = studio === 'stats' ? statsConfig : deConfig;
  const resolvedTheme = useMemo(() => resolvePlotTheme(activeStyle), [activeStyle]);

  const patchActiveStyle = (patch: Partial<PublicationStyleSettings>) => {
    if (studio === 'stats') setStatsConfig((p) => ({ ...p, ...patch }));
    else setDeConfig((p) => ({ ...p, ...patch }));
  };

  const applyJournalPreset = (journalId: JournalPresetId) => {
    const j = JOURNAL_PRESETS[journalId];
    patchActiveStyle({
      preset: j.id,
      palette: j.defaultPalette,
      fontFamily: j.fontFamily,
      fontSizePt: j.fontSize,
      lineWidth: j.lineWidth,
    });
    playAppleTick(soundEnabled, 'select');
  };

  const handleOpenPlotEdit = useCallback(
    (field: EditablePlotField, label: string, currentValue: string, legendKey?: string) => {
      setActivePlotEdit({ field, label, value: currentValue, legendKey });
      playAppleTick(soundEnabled, 'select');
    },
    [soundEnabled]
  );

  const handleCommitPlotEdit = useCallback(
    (field: EditablePlotField, nextValue: string, legendKey?: string) => {
      if (field === 'legend' && legendKey) {
        if (studio === 'stats') {
          setStatsConfig((prev) => ({
            ...prev,
            legendLabels: { ...(prev.legendLabels ?? {}), [legendKey]: nextValue },
          }));
        } else {
          setDeConfig((prev) => ({
            ...prev,
            legendLabels: { ...(prev.legendLabels ?? {}), [legendKey]: nextValue },
          }));
        }
        return;
      }
      if (studio === 'gallery') {
        setGalleryTitles((prev) => ({
          ...prev,
          [activeCaseId]: {
            ...prev[activeCaseId],
            [field === 'subtitle' ? 'subtitle' : 'title']: nextValue,
          },
        }));
      } else if (studio === 'plotter') {
        setDeConfig((prev) => ({ ...prev, [field]: nextValue }));
      } else {
        setStatsConfig((prev) => ({
          ...prev,
          [field]: field === 'subtitle' && nextValue.trim() === '' ? '__HIDDEN__' : nextValue,
        }));
      }
    },
    [studio, activeCaseId]
  );

  // ---------------- Handlers ----------------
  const selectStatsDemo = (demoId: string) => {
    const found = statsDemos.find((d) => d.id === demoId);
    if (!found) return;
    setActiveStatsDemoId(found.id);
    setStatsRows(found.rows);
    setStatsSourceFile(`${found.id}.csv`);
    setStatsUploadStatus({ fileName: found.name, rowCount: found.rows.length, isCustom: false });
    setStatsConfig((prev) => ({
      ...prev,
      title: found.name,
      subtitle: '',
      yLabel: found.yLabel,
      xLabel: found.xLabel,
      isPaired: found.isPaired,
      plotType: found.isPaired ? 'paired-slope' : 'raincloud',
      collapsePseudoreplicates: false,
    }));
    playAppleTick(soundEnabled, 'select');
  };

  const handleToggleGeneLabel = useCallback((gene: string) => {
    setDeConfig((prev) => {
      const exists = prev.labeledGenes.includes(gene);
      return {
        ...prev,
        labeledGenes: exists
          ? prev.labeledGenes.filter((g) => g !== gene)
          : [...prev.labeledGenes, gene],
      };
    });
  }, []);

  const handleMoveGeneLabel = useCallback((gene: string, dx: number, dy: number) => {
    setDeConfig((prev) => ({
      ...prev,
      labelOffsets: {
        ...prev.labelOffsets,
        [gene]: { dx, dy },
      },
    }));
  }, []);

  const handleAutoLabelTop = () => {
    const top = [...volcanoRows]
      .filter((r) => r.padj <= deConfig.fdrThreshold && Math.abs(r.log2FC) >= deConfig.fcThreshold)
      .sort((a, b) => a.padj - b.padj)
      .slice(0, deConfig.topAutoLabelCount)
      .map((r) => r.gene);
    setDeConfig((prev) => ({ ...prev, labeledGenes: top, labelOffsets: {} }));
    playAppleTick(soundEnabled, 'commit');
  };

  const notifyUpload = useCallback(
    (kind: 'success' | 'warning', title: string, detail: string) => {
      setUploadBanner({ kind, title, detail });
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setUploadBanner(null);
      }, 6500);
    },
    []
  );

  const isJournalCaseKey = (key: AnyCsvGuideKey): key is JournalCaseId =>
    JOURNAL_CASES_20.some((c) => c.id === key);

  const ingestCsvText = (
    text: string,
    fileName: string,
    explicitTarget?: AnyCsvGuideKey
  ) => {
    const table = parseDelimitedText(text);
    if (table.rows.length === 0) {
      notifyUpload(
        'warning',
        `Could not read ${fileName}`,
        'No data rows were detected — verify the file has a valid CSV or TSV header row.'
      );
      return;
    }

    // Check explicit or auto-detected 20 Journal Figure schema first
    const explicitJournal =
      explicitTarget && isJournalCaseKey(explicitTarget) ? explicitTarget : null;
    const autoJournal = !explicitTarget ? detectJournalCaseForCsv(table) : null;
    const journalTarget =
      explicitJournal ?? (studio === 'gallery' && !explicitTarget ? autoJournal ?? activeCaseId : autoJournal);

    if (journalTarget && (explicitJournal || autoJournal || studio === 'gallery')) {
      setStudio('gallery');
      setActiveCaseId(journalTarget);
      setGalleryTables((prev) => ({ ...prev, [journalTarget]: { table, fileName } }));
      const meta = JOURNAL_CASES_20.find((c) => c.id === journalTarget);
      notifyUpload(
        'success',
        `CSV Uploaded: ${fileName} → ${meta?.title ?? journalTarget}`,
        `Live-rendered ${table.rows.length} rows directly onto Journal Figure ${meta?.number ?? ''}.`
      );
      playAppleTick(soundEnabled, 'commit');
      return;
    }

    const detectedTarget: CsvTemplateKey =
      explicitTarget && !isJournalCaseKey(explicitTarget)
        ? explicitTarget
        : detectBestPlotForCsv(
            table,
            deConfig.plotType,
            studio === 'stats' ? 'stats' : studio === 'gallery' ? 'gallery' : 'plotter'
          );
    const isStatsTarget = detectedTarget === 'stats-tidy';
    if (isStatsTarget) {
      const parsed = parseTidyStatsTable(table);
      if (parsed.rows.length > 0) {
        setStudio('stats');
        setStatsRows(parsed.rows);
        setStatsSourceFile(fileName);
        setStatsUploadStatus({ fileName, rowCount: parsed.rows.length, isCustom: true });
        setActiveStatsDemoId('custom');
        setStatsConfig((prev) => ({
          ...prev,
          title: fileName.replace(/\.(csv|tsv|txt)$/i, '').replace(/[_-]+/g, ' '),
          subtitle: '',
          xLabel: parsed.groupCol,
          yLabel: parsed.valueCol,
          isPaired: Boolean(parsed.subjectCol && !parsed.replicateCol),
          collapsePseudoreplicates: false,
        }));
        notifyUpload(
          'success',
          `CSV Uploaded: ${fileName} → Stat Advisor & Anti-Barplot`,
          `Auto-detected tidy stats CSV · Loaded ${parsed.rows.length} rows (Group: ${parsed.groupCol}, Value: ${parsed.valueCol}).`
        );
        playAppleTick(soundEnabled, 'commit');
      } else {
        notifyUpload(
          'warning',
          `${fileName} uploaded — columns not matched`,
          'Expected a categorical Group column and a numeric Value column. Open CSV Guide for an example.'
        );
      }
      return;
    }

    const targetPlot: DEPlotType = detectedTarget;

    setStudio('plotter');
    setDeConfig((p) => ({
      ...p,
      plotType: targetPlot,
      title: fileName.replace(/\.(csv|tsv|txt)$/i, '').replace(/[_-]+/g, ' '),
      subtitle: '',
      xLabel: '',
      yLabel: '',
    }));
    if (['umap', 'tsne', 'dotplot', 'pseudotime'].includes(targetPlot)) setPlotGroupTab('sc');
    else if (['dose-response', 'survival', 'forest', 'roc', 'correlation'].includes(targetPlot))
      setPlotGroupTab('clinical');
    else setPlotGroupTab('de');

    let loadedCount = 0;
    let detailMsg = '';

    if (targetPlot === 'dotplot') {
      const rows = parseDotPlotRows(table);
      if (rows.length) {
        setDotPlotRows(rows);
        loadedCount = rows.length;
        detailMsg = `Loaded ${rows.length} marker × cluster entries.`;
      }
    } else if (targetPlot === 'upset') {
      const items = parseUpSetRows(table);
      if (items.length) {
        setUpsetItems(items);
        loadedCount = items.length;
        detailMsg = `Loaded ${items.length} set-membership items.`;
      }
    } else if (targetPlot === 'lollipop') {
      const rows = parsePathwayRows(table);
      if (rows.length) {
        setPathwayRows(rows);
        loadedCount = rows.length;
        detailMsg = `Loaded ${rows.length} enriched pathways.`;
      }
    } else if (targetPlot === 'umap' || targetPlot === 'tsne') {
      const parsed = parseEmbeddingRows(table);
      if (parsed.cells.length) {
        setEmbeddingCells(parsed.cells);
        if (parsed.markers.length) setEmbeddingMarkers(parsed.markers);
        setEmbeddingColorBy('cluster');
        loadedCount = parsed.cells.length;
        detailMsg = `Loaded ${parsed.cells.length} single cells${parsed.markers.length ? ` with ${parsed.markers.length} FeaturePlot genes` : ''}.`;
      }
    } else if (targetPlot === 'pca') {
      const rows = parsePCARows(table);
      if (rows.length) {
        setPcaData((p) => ({ ...p, rows }));
        loadedCount = rows.length;
        detailMsg = `Loaded ${rows.length} PCA samples with 95% confidence ellipses.`;
      }
    } else if (targetPlot === 'heatmap') {
      const hm = parseHeatmapMatrix(table);
      if (hm) {
        setDegHeatmap(hm);
        loadedCount = hm.genes.length;
        detailMsg = `Loaded ${hm.genes.length} genes × ${hm.samples.length} samples (row z-scored).`;
      }
    } else if (targetPlot === 'pseudotime') {
      const pt = parsePseudotimeRows(table);
      if (pt) {
        setPseudotime(pt);
        loadedCount = pt.series.length;
        detailMsg = `Smoothed ${pt.series.length} gene trajectories along pseudotime.`;
      }
    } else if (targetPlot === 'dose-response') {
      const pts = parseDoseResponseRows(table);
      if (pts.length) {
        setDosePoints(pts);
        loadedCount = pts.length;
        detailMsg = `Fitted 4PL dose-response curve on ${pts.length} assay points.`;
      }
    } else if (targetPlot === 'survival') {
      const rows = parseSurvivalRows(table);
      if (rows.length) {
        setSurvivalRows(rows);
        loadedCount = rows.length;
        detailMsg = `Computed Kaplan–Meier & Log-Rank test on ${rows.length} subjects.`;
      }
    } else if (targetPlot === 'forest') {
      const rows = parseForestRows(table);
      if (rows.length) {
        setForestRows(rows);
        loadedCount = rows.length;
        detailMsg = `Loaded ${rows.length} hazard/odds ratios.`;
      }
    } else if (targetPlot === 'roc') {
      const rows = parseROCRows(table);
      if (rows.length) {
        setRocRows(rows);
        loadedCount = rows.length;
        detailMsg = `Computed ROC / AUROC on ${rows.length} observations.`;
      }
    } else if (targetPlot === 'correlation') {
      const rows = parsePairXYRows(table);
      if (rows.length) {
        setCorrRows(rows);
        loadedCount = rows.length;
        detailMsg = `Computed Pearson/Spearman & Bland–Altman on ${rows.length} sample pairs.`;
      }
    } else {
      const parsed = parseDERows(table);
      if (parsed.rows.length) {
        const autoTop = [...parsed.rows]
          .filter((r) => r.padj <= deConfig.fdrThreshold && Math.abs(r.log2FC) >= deConfig.fcThreshold)
          .sort((a, b) => a.padj - b.padj)
          .slice(0, 8)
          .map((r) => r.gene);
        setVolcanoRows(parsed.rows);
        setDeConfig((prev) => ({
          ...prev,
          title: `${fileName.replace(/\.(csv|tsv|txt)$/i, '')}`,
          labeledGenes: autoTop,
          labelOffsets: {},
        }));
        loadedCount = parsed.rows.length;
        detailMsg = `Detected ${parsed.detectedTool} format · Loaded ${parsed.rows.length} genes.`;
      }
    }

    if (loadedCount > 0) {
      setDeSourceFile(fileName);
      setDeUploadStatus({ fileName, rowCount: loadedCount, isCustom: true });
      notifyUpload('success', `CSV Uploaded: ${fileName}`, detailMsg);
      playAppleTick(soundEnabled, 'commit');
    } else {
      notifyUpload(
        'warning',
        `${fileName} uploaded — columns did not match ${targetPlot}`,
        `Found headers [${table.headers.slice(0, 5).join(', ')}]. Click "CSV Guide" to see required columns for this plot.`
      );
    }
  };

  const handleFileIngest = async (file: File) => {
    if (/\.(xlsx|xls|ods)$/i.test(file.name)) {
      try {
        const wb = await parseExcelWorkbook(file);
        const firstSheet = wb.sheetNames[0];
        if (!firstSheet) return;
        const csv = wb.sheetsCsv[firstSheet] ?? '';
        if (wb.sheetNames.length > 1) {
          setMapperInitText(csv);
          setMapperInitName(`${file.name} [${firstSheet}]`);
          setMapperSheetOpen(true);
          notifyUpload(
            'success',
            `Excel Workbook Loaded: ${file.name}`,
            `Found ${wb.sheetNames.length} sheets (${wb.sheetNames.slice(0, 3).join(', ')}). Map columns or click Plot Now.`
          );
        } else {
          ingestCsvText(csv, `${file.name} [${firstSheet}]`);
        }
      } catch (err) {
        notifyUpload(
          'warning',
          `Could not read Excel file ${file.name}`,
          err instanceof Error ? err.message : 'Ensure the workbook is a valid .xlsx/.xls file.'
        );
      }
      return;
    }
    const text = await file.text();
    ingestCsvText(text, file.name);
  };

  const handlePinActiveToComposer = () => {
    if (!svgRef.current || studio === 'composer') return;
    const { dataUrl, aspectRatio } = svgElementToDataUrl(svgRef.current);
    const label =
      studio === 'gallery'
        ? galleryTitles[activeCase.id]?.title ?? activeCase.title
        : studio === 'stats'
        ? statsConfig.title
        : studio === 'workbench'
        ? `Workbench (${workbenchSubTab.toUpperCase()})`
        : deConfig.title;
    const source: ComposerPanelSource =
      studio === 'gallery'
        ? {
            type: 'gallery',
            caseId: activeCase.id,
            title: galleryTitles[activeCase.id]?.title,
            subtitle: galleryTitles[activeCase.id]?.subtitle,
          }
        : studio === 'stats'
        ? {
            type: 'stats',
            plotType: statsConfig.plotType,
            title: statsConfig.title,
            subtitle: statsConfig.subtitle,
            xLabel: statsConfig.xLabel,
            yLabel: statsConfig.yLabel,
          }
        : studio === 'workbench'
        ? { type: 'workbench', subTab: workbenchSubTab }
        : {
            type: 'plotter',
            plotType: deConfig.plotType,
            title: deConfig.title,
            subtitle: deConfig.subtitle,
            xLabel: deConfig.xLabel,
            yLabel: deConfig.yLabel,
          };
    const item: ComposerPanelItem = {
      id: `panel-${Date.now()}`,
      label,
      kind: 'biograce-svg',
      dataUrl,
      aspectRatio,
      source,
      lockStyle: false,
    };
    setComposerPanels((prev) => [...prev, item].slice(0, 6));
    notifyUpload(
      'success',
      `Pinned to Figure Board (${Math.min(6, composerPanels.length + 1)} panels)`,
      `"${label}" pinned with Live Style Sync — sidebar palettes, colormaps, fonts & strokes will update it automatically.`
    );
    playAppleTick(soundEnabled, 'commit');
  };

  const renderLiveComposerPanel = useCallback(
    (source: ComposerPanelSource, panelSvgRef: React.RefObject<SVGSVGElement | null>): React.ReactNode => {
      const noopEdit = () => {};
      if (source.type === 'gallery') {
        const meta = JOURNAL_CASES_20.find((c) => c.id === source.caseId) ?? JOURNAL_CASES_20[0];
        return (
          <JournalCaseRenderer
            item={meta}
            customTable={galleryTables[source.caseId]?.table ?? null}
            customTitle={source.title}
            customSubtitle={source.subtitle}
            styleSettings={deConfig}
            darkMode={darkMode}
            svgRef={panelSvgRef}
            onEditField={noopEdit}
          />
        );
      }
      if (source.type === 'stats') {
        const syncedStats: StatsConfig = {
          ...statsConfig,
          preset: deConfig.preset,
          palette: deConfig.palette,
          colormap: deConfig.colormap,
          fontFamily: deConfig.fontFamily,
          fontSizePt: deConfig.fontSizePt,
          lineWidth: deConfig.lineWidth,
          columnWidth: deConfig.columnWidth,
          dpi: deConfig.dpi,
          transparentBg: deConfig.transparentBg,
          paperExport: deConfig.paperExport,
          plotType: source.plotType,
          title: source.title,
          subtitle: source.subtitle,
          xLabel: source.xLabel,
          yLabel: source.yLabel,
        };
        return (
          <AntiBarplotCanvas
            rows={statsRows}
            analysis={statsAnalysis}
            config={syncedStats}
            darkMode={darkMode}
            svgRef={panelSvgRef}
            onEditField={noopEdit}
          />
        );
      }
      if (source.type === 'workbench') {
        return (
          <WetLabWorkbench
            activeSubTab={source.subTab}
            onChangeSubTab={() => {}}
            styleSettings={deConfig}
            darkMode={darkMode}
            soundEnabled={false}
            svgRef={panelSvgRef}
            onSendQpcrToStats={() => {}}
          />
        );
      }
      const syncedDe: DEPlotConfig = {
        ...deConfig,
        plotType: source.plotType,
        title: source.title,
        subtitle: source.subtitle,
        xLabel: source.xLabel,
        yLabel: source.yLabel,
      };
      switch (source.plotType) {
        case 'volcano':
        case 'ma':
          return (
            <VolcanoMAPlot
              mode={source.plotType}
              rows={volcanoRows}
              config={syncedDe}
              darkMode={darkMode}
              soundEnabled={false}
              svgRef={panelSvgRef}
              onToggleLabel={() => {}}
              onMoveLabel={() => {}}
              onEditField={noopEdit}
            />
          );
        case 'dotplot':
          return <DotPlotChart rows={dotPlotRows} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'upset':
          return <UpSetPlot items={upsetItems} config={syncedDe} darkMode={darkMode} soundEnabled={false} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'lollipop':
          return <PathwayLollipopPlot rows={pathwayRows} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'umap':
        case 'tsne':
          return (
            <EmbeddingPlot
              mode={source.plotType}
              cells={embeddingCells}
              markers={embeddingMarkers}
              colorBy={embeddingColorBy}
              splitByCondition={embeddingSplit}
              config={syncedDe}
              darkMode={darkMode}
              soundEnabled={false}
              svgRef={panelSvgRef}
              onEditField={noopEdit}
            />
          );
        case 'pca':
          return <PCAPlot rows={pcaData.rows} pc1Var={pcaData.pc1Var} pc2Var={pcaData.pc2Var} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'heatmap':
          return <DEGHeatmapPlot data={degHeatmap} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'pseudotime':
          return <PseudotimePlot stages={pseudotime.stages} series={pseudotime.series} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'dose-response':
          return <DoseResponsePlot points={dosePoints} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'survival':
          return <SurvivalKMPlot rows={survivalRows} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'forest':
          return <ForestPlotChart rows={forestRows} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'roc':
          return <ROCPlotChart rows={rocRows} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
        case 'correlation':
          return <CorrelationBlandAltmanPlot rows={corrRows} viewMode={corrViewMode} config={syncedDe} darkMode={darkMode} svgRef={panelSvgRef} onEditField={noopEdit} />;
      }
    },
    [
      galleryTables,
      deConfig,
      darkMode,
      statsConfig,
      statsRows,
      statsAnalysis,
      volcanoRows,
      dotPlotRows,
      upsetItems,
      pathwayRows,
      embeddingCells,
      embeddingColorBy,
      embeddingSplit,
      pcaData,
      degHeatmap,
      pseudotime,
      dosePoints,
      survivalRows,
      forestRows,
      rocRows,
      corrRows,
      corrViewMode,
    ]
  );

  const handleSaveSnapshotToWorkspace = (tag: string) => {
    if (!svgRef.current) return;
    const { dataUrl } = svgElementToDataUrl(svgRef.current);
    const title =
      studio === 'gallery'
        ? galleryTitles[activeCase.id]?.title ?? activeCase.title
        : studio === 'stats'
        ? statsConfig.title
        : studio === 'workbench'
        ? `Workbench · ${workbenchSubTab}`
        : studio === 'composer'
        ? 'Multi-Panel Composite Figure'
        : deConfig.title;
    const rec: ManuscriptFigureRecord = {
      id: `fig-${Date.now()}`,
      tag,
      title,
      studio,
      plotType: studio === 'plotter' ? deConfig.plotType : undefined,
      caseId: studio === 'gallery' ? activeCase.id : undefined,
      styleSettings: activeStyle,
      previewDataUrl: dataUrl,
      savedAt: new Date().toISOString(),
    };
    setSavedFigures((prev) => [rec, ...prev]);
    notifyUpload('success', `Saved ${tag} to Local Manuscript Workspace`, `Stored locally in your browser for multi-figure manuscript management.`);
  };

  const handleSaveRecipe = () => {
    const recipe = {
      biograceVersion: '1.0.0',
      savedAt: new Date().toISOString(),
      studio,
      plotGroupTab,
      activeCaseId,
      galleryTitles,
      deConfig,
      statsConfig,
      embeddingColorBy,
      embeddingSplit,
      corrViewMode,
    };
    exportTextFile(JSON.stringify(recipe, null, 2), `${generatedCode.baseName}.biograce.json`);
    notifyUpload('success', 'Saved Figure Recipe (.biograce.json)', 'Reload this recipe anytime to restore your exact styling, thresholds, and edited labels.');
    playAppleTick(soundEnabled, 'commit');
  };

  const handleLoadRecipe = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.studio) setStudio(parsed.studio);
      if (parsed.plotGroupTab) setPlotGroupTab(parsed.plotGroupTab);
      if (parsed.activeCaseId) setActiveCaseId(parsed.activeCaseId);
      if (parsed.galleryTitles) setGalleryTitles(parsed.galleryTitles);
      if (parsed.deConfig) setDeConfig((p) => ({ ...p, ...parsed.deConfig }));
      if (parsed.statsConfig) setStatsConfig((p) => ({ ...p, ...parsed.statsConfig }));
      if (parsed.embeddingColorBy !== undefined) setEmbeddingColorBy(parsed.embeddingColorBy);
      if (parsed.embeddingSplit !== undefined) setEmbeddingSplit(parsed.embeddingSplit);
      if (parsed.corrViewMode) setCorrViewMode(parsed.corrViewMode);
      notifyUpload('success', `Loaded Recipe: ${file.name}`, 'Restored plot layout, journal preset, palette, thresholds, and inline edits.');
      playAppleTick(soundEnabled, 'commit');
    } catch {
      notifyUpload('warning', `Could not parse recipe ${file.name}`, 'Make sure you selected a valid .biograce.json recipe file.');
    }
  };

  const handleResetDemo = () => {
    if (studio === 'stats') {
      selectStatsDemo(statsDemos[0].id);
      notifyUpload('success', 'Restored Demo Dataset', 'Loaded the default Bimodal Responder Split wet-lab showcase.');
    } else {
      setVolcanoRows(generateDemoVolcanoData());
      setDotPlotRows(generateDemoDotPlotData());
      setUpsetItems(generateDemoUpSetData());
      setPathwayRows(generateDemoPathwayData());
      setEmbeddingCells(generateDemoEmbeddingData());
      setEmbeddingMarkers([...EMBEDDING_MARKERS]);
      setEmbeddingColorBy('cluster');
      setPcaData(generateDemoPCAData());
      setDegHeatmap(generateDemoDEGHeatmap());
      setPseudotime(generateDemoPseudotime());
      setDosePoints(generateDemoDoseResponse());
      setSurvivalRows(generateDemoSurvivalData());
      setForestRows(generateDemoForestData());
      setRocRows(generateDemoROCData());
      setCorrRows(generateDemoCorrelationData());
      setDeSourceFile('ifng_macrophage_deseq2.csv');
      setDeUploadStatus({ fileName: 'Demo dataset', rowCount: 500, isCustom: false });
      notifyUpload('success', 'Restored Built-In Demo Datasets', 'All plots are now displaying the default biological example datasets.');
    }
    playAppleTick(soundEnabled, 'snap');
  };

  const generatedCode = useMemo(() => {
    if (studio === 'composer') {
      return {
        r: `# Multi-panel composite figure assembled in BioGrace Figure Composer\n# Exported directly as publication vector SVG, PDF, PNG, or 600 DPI TIFF.\n# Recommended R layout package for programmatic assembly: patchwork::wrap_plots(pA, pB, pC, pD, ncol = 2) + plot_annotation(tag_levels = "a")`,
        python: `# Multi-panel composite figure assembled in BioGrace Figure Composer\n# For programmatic Python assembly use: fig, axes = plt.subplots(2, 2, figsize=(7.2, 4.8), constrained_layout=True)`,
        cli: `# BioGrace Multi-Panel Figure Composer\n# Use the Export buttons (SVG / PDF / PNG / 600 DPI TIFF) for journal-ready multi-panel output.`,
        baseName: `biograce_multipanel_${activeStyle.preset}`,
      };
    }
    if (studio === 'workbench') {
      return {
        r: `# BioGrace Power & Wet-Lab Workbench (${workbenchSubTab})\n# R equivalents: pwr::pwr.t.test(), aov(value ~ factorA * factorB), drc::drm(..., fct = LL.4())`,
        python: `# BioGrace Power & Wet-Lab Workbench (${workbenchSubTab})\n# Python equivalents: statsmodels.stats.power, scipy.optimize.curve_fit`,
        cli: `# BioGrace Power & Wet-Lab Workbench (${workbenchSubTab}) — exported directly from browser`,
        baseName: `biograce_${workbenchSubTab}_${activeStyle.preset}`,
      };
    }
    if (studio === 'gallery') {
      return {
        r: generateJournalCaseRCode(
          activeCase.id,
          activeCase.title,
          activeCase.journalSource,
          deConfig
        ),
        python: generateJournalCasePythonCode(
          activeCase.id,
          activeCase.title,
          activeCase.journalSource,
          deConfig
        ),
        cli: `# Open-source ggplot2-20-journal-cases recipe (${activeCase.number} · ${activeCase.title})\n# Run the R script exported from BioGrace:\nRscript biograce_${activeCase.id}.R`,
        baseName: `biograce_${activeCase.id}_${deConfig.preset}`,
      };
    }
    if (studio === 'plotter') {
      return {
        r: generateDERCode(deConfig, deSourceFile),
        python: generateDEPythonCode(deConfig, deSourceFile),
        cli: generateDECliCommand(deConfig, deSourceFile),
        baseName: `biograce_${deConfig.plotType}_${deConfig.preset}`,
      };
    }
    return {
      r: generateStatsRCode(statsConfig, statsAnalysis, statsSourceFile),
      python: generateStatsPythonCode(statsConfig, statsAnalysis, statsSourceFile),
      cli: generateStatsCliCommand(statsConfig, statsSourceFile),
      baseName: `biograce_${statsConfig.plotType}_${statsConfig.preset}`,
    };
  }, [studio, activeCase, deConfig, deSourceFile, statsConfig, statsAnalysis, statsSourceFile]);

  const handleCopy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    playAppleTick(soundEnabled, 'commit');
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const filteredGeneSuggestions = useMemo(() => {
    if (!geneQuery.trim()) return [];
    const q = geneQuery.toLowerCase();
    return volcanoRows.filter((r) => r.gene.toLowerCase().includes(q)).slice(0, 6);
  }, [geneQuery, volcanoRows]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]"
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDraggingFile) setIsDraggingFile(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setIsDraggingFile(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFileIngest(file);
        }}
      >
        {/* Drag-and-drop Overlay */}
        <AnimatePresence>
          {isDraggingFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                transition={APPLE_SPRINGS.criticallyDamped}
                className="material-sheet rounded-3xl px-10 py-8 text-center max-w-md"
              >
                <Upload className="w-10 h-10 mx-auto text-[var(--accent)] mb-3" />
                <h3 className="type-title text-xl font-bold">Drop CSV or TSV to Plot</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                  Auto-detects DESeq2, edgeR, limma, Scanpy, Seurat, IC50, Kaplan–Meier, ROC, or tidy wet-lab CSVs.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Lock className="w-3.5 h-3.5" />
                  100% Client-Side · Your data never leaves your browser
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Apple Glass Upload Toast (Always Visible Regardless of Scroll Position) */}
        <AnimatePresence>
          {uploadBanner && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={APPLE_SPRINGS.snappy}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,540px)] material-sheet rounded-2xl px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                    uploadBanner.kind === 'success'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {uploadBanner.kind === 'success' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {uploadBanner.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                    {uploadBanner.detail}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onPointerDown={() => setUploadBanner(null)}
                className="apple-press text-[11px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] shrink-0"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Apple Translucent Toolbar */}
        <header className="sticky top-0 z-30 material-toolbar">
          <div className="max-w-[1460px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm shrink-0">
                <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" aria-hidden="true">
                  <defs>
                    <linearGradient id="biograce-brand-grad" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#0A84FF" />
                      <stop offset="100%" stopColor="#30D158" />
                    </linearGradient>
                  </defs>
                  <rect width="64" height="64" rx="16" fill="url(#biograce-brand-grad)" />
                  <path
                    d="M13 48C20 37 26 24 33 24C40 24 44 37 51 48"
                    stroke="white"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeOpacity="0.45"
                  />
                  <circle cx="22" cy="39" r="6.5" fill="white" fillOpacity="0.95" />
                  <circle cx="35" cy="23" r="7.5" fill="white" />
                  <circle cx="46" cy="37" r="5.5" fill="#E0F2FE" />
                </svg>
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="type-title text-base font-bold tracking-tight">BioGrace</span>
                  <button
                    type="button"
                    onPointerDown={() => {
                      setLicenseSheetOpen(true);
                      playAppleTick(soundEnabled, 'select');
                    }}
                    className="apple-press hidden md:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                  >
                    Academic Only
                  </button>
                </div>
                <p className="hidden sm:block text-[11px] text-[var(--text-tertiary)] truncate">
                  Zero-friction figures, honest statistics &amp; reproducible R / Python / CLI
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <AppleSegmentedControl<StudioMode>
                layoutId="studio-nav-pill"
                size="sm"
                value={studio}
                onChange={setStudio}
                soundEnabled={soundEnabled}
                options={[
                  {
                    value: 'plotter',
                    label: 'DE & scRNA',
                    icon: <Activity className="w-3.5 h-3.5" />,
                  },
                  {
                    value: 'gallery',
                    label: '20 Journals',
                    icon: <Grid2x2 className="w-3.5 h-3.5" />,
                  },
                  {
                    value: 'stats',
                    label: 'Stat Advisor',
                    icon: <FlaskConical className="w-3.5 h-3.5" />,
                  },
                  {
                    value: 'workbench',
                    label: 'Power & Lab',
                    icon: <Calculator className="w-3.5 h-3.5" />,
                  },
                  {
                    value: 'composer',
                    label: composerPanels.length > 0 ? `Composer (${composerPanels.length})` : 'Composer',
                    icon: <LayoutGrid className="w-3.5 h-3.5" />,
                  },
                ]}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileIngest(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                title="Browse CSV schemas & sample data for all 36 plots"
                onPointerDown={() => {
                  setCsvGuideOpen(true);
                  playAppleTick(soundEnabled, 'select');
                }}
                className="apple-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden xl:inline">CSV Guide</span>
              </button>

              <button
                type="button"
                title="Paste from Excel / Prism, import .xlsx, or map arbitrary column headers"
                onPointerDown={() => {
                  setMapperSheetOpen(true);
                  playAppleTick(soundEnabled, 'select');
                }}
                className="apple-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="hidden xl:inline">Excel / Map</span>
              </button>

              <button
                type="button"
                title="Manage saved manuscript figures (Fig 1A, Fig 1B, etc.) locally"
                onPointerDown={() => {
                  setProjectSheetOpen(true);
                  playAppleTick(soundEnabled, 'select');
                }}
                className="apple-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <FolderKanban className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden xl:inline">
                  Workspace{savedFigures.length > 0 ? ` (${savedFigures.length})` : ''}
                </span>
              </button>

              <button
                type="button"
                onPointerDown={() => fileInputRef.current?.click()}
                className={`apple-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium ${
                  (studio === 'stats'
                    ? statsUploadStatus.isCustom
                    : studio === 'gallery'
                    ? Boolean(galleryTables[activeCase.id])
                    : deUploadStatus.isCustom)
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/35'
                    : 'bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-primary)]'
                }`}
              >
                {(studio === 'stats'
                  ? statsUploadStatus.isCustom
                  : studio === 'gallery'
                  ? Boolean(galleryTables[activeCase.id])
                  : deUploadStatus.isCustom) ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline max-w-[115px] truncate">
                  {studio === 'stats' && statsUploadStatus.isCustom
                    ? statsUploadStatus.fileName
                    : studio === 'gallery' && galleryTables[activeCase.id]
                    ? galleryTables[activeCase.id]!.fileName
                    : deUploadStatus.isCustom
                    ? deUploadStatus.fileName
                    : 'Upload'}
                </span>
              </button>

              <button
                type="button"
                onPointerDown={() => {
                  setCodeSheetOpen(true);
                  playAppleTick(soundEnabled, 'select');
                }}
                className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white shadow-sm"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Code</span>
              </button>

              <button
                type="button"
                aria-label="Toggle tactile audio"
                title={soundEnabled ? 'Tactile audio on' : 'Tactile audio muted'}
                onPointerDown={() => setSoundEnabled((s) => !s)}
                className="apple-press p-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                aria-label="Toggle light and dark theme"
                onPointerDown={() => setDarkMode((d) => !d)}
                className="apple-press p-2 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="lg:hidden px-4 pb-3">
            <AppleSegmentedControl<StudioMode>
              layoutId="studio-nav-pill-mobile"
              value={studio}
              onChange={setStudio}
              soundEnabled={soundEnabled}
              fullWidth
              size="sm"
              options={[
                { value: 'plotter', label: 'DE', icon: <Activity className="w-3.5 h-3.5" /> },
                { value: 'gallery', label: '20 Figs', icon: <Grid2x2 className="w-3.5 h-3.5" /> },
                { value: 'stats', label: 'Stats', icon: <FlaskConical className="w-3.5 h-3.5" /> },
                { value: 'workbench', label: 'Lab', icon: <Calculator className="w-3.5 h-3.5" /> },
                { value: 'composer', label: 'Board', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
              ]}
            />
          </div>
        </header>

        {/* Main Workbench */}
        <main className="flex-1 max-w-[1460px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-[356px_minmax(0,1fr)] gap-6 items-start">
          {/* LEFT INSPECTOR SIDEBAR */}
          <aside className="material-sidebar rounded-3xl border p-5 space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.2rem)] lg:overflow-y-auto">
            {studio === 'gallery' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)]">
                    20 Open-Source Journal Figures
                  </label>
                  <span className="text-[10px] font-medium text-[var(--text-tertiary)]">MIT Gallery</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      'All',
                      'Distribution & Stats',
                      'Genomics & Clinical',
                      'Networks & Flows',
                      'Heatmaps & Composition',
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onPointerDown={() => {
                        setCaseCategoryFilter(cat);
                        playAppleTick(soundEnabled, 'select');
                      }}
                      className={`apple-press px-2 py-1 rounded-lg text-[10.5px] font-semibold ${
                        caseCategoryFilter === cat
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {cat === 'All' ? 'All (20)' : cat.split(' & ')[0]}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto p-1.5 rounded-2xl bg-[var(--bg-subtle)]/45 border border-[var(--border-hairline)]">
                  {filteredCases.map((item) => {
                    const active = item.id === activeCase.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onPointerDown={() => {
                          setActiveCaseId(item.id);
                          playAppleTick(soundEnabled, 'select');
                        }}
                        className={`apple-press w-full px-2.5 py-2 rounded-xl text-left border transition-colors ${
                          active
                            ? 'bg-[var(--accent)]/12 border-[var(--accent)]/50'
                            : 'bg-[var(--bg-elevated)]/65 border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                            {item.title}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                          {item.journalSource} · {item.rPackages.join(', ')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : studio === 'plotter' ? (
              <>
                {/* Categorized Publication Plot Picker (15 Plots across DE/Bulk, Single-Cell, Clinical & Assays) */}
                <div className="space-y-2.5">
                  <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] block">
                    Publication Plot Type (15)
                  </label>
                  <AppleSegmentedControl<'de' | 'sc' | 'clinical'>
                    layoutId="plot-group-pill"
                    size="sm"
                    fullWidth
                    soundEnabled={soundEnabled}
                    value={plotGroupTab}
                    onChange={setPlotGroupTab}
                    options={[
                      { value: 'de', label: 'DE & Bulk' },
                      { value: 'sc', label: 'Single-Cell' },
                      { value: 'clinical', label: 'Assays & Stats' },
                    ]}
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    {(plotGroupTab === 'de'
                      ? ([
                          { id: 'volcano', label: 'Volcano Plot', title: 'IFN-γ Stimulated Macrophages vs. Control' },
                          { id: 'ma', label: 'MA Plot', title: 'Expression Abundance vs. Fold Change (MA)' },
                          { id: 'pca', label: 'PCA + 95% Ellipses', title: 'Principal Component Analysis (PCA)' },
                          { id: 'heatmap', label: 'Z-Score Heatmap', title: 'Z-Scored DEG Expression Heatmap' },
                          { id: 'upset', label: 'DEG UpSet', title: 'Cytokine-Responsive DEG Intersections' },
                          { id: 'lollipop', label: 'Pathway Lollipop', title: 'GSEA Hallmark Pathway Enrichment' },
                        ] as { id: DEPlotType; label: string; title: string }[])
                      : plotGroupTab === 'sc'
                      ? ([
                          { id: 'umap', label: 'scRNA UMAP', title: 'Single-Cell UMAP Clustering' },
                          { id: 'tsne', label: 'scRNA t-SNE', title: 'Single-Cell t-SNE Clustering' },
                          { id: 'dotplot', label: 'scRNA Dot Plot', title: 'PBMC Canonical Lineage Markers' },
                          { id: 'pseudotime', label: 'Pseudotime Ribbon', title: 'Differentiation Pseudotime Gene Dynamics' },
                        ] as { id: DEPlotType; label: string; title: string }[])
                      : ([
                          { id: 'dose-response', label: 'IC50 Dose–Response', title: 'Dose–Response Inhibition Curve (4PL Hill Fit)' },
                          { id: 'survival', label: 'Kaplan–Meier Survival', title: 'Kaplan–Meier Overall Survival' },
                          { id: 'forest', label: 'Forest Plot (HR)', title: 'Multivariate Cox Regression Forest Plot' },
                          { id: 'roc', label: 'ROC & AUC Curves', title: 'Biomarker Diagnostic Performance (ROC Curve)' },
                          { id: 'correlation', label: 'Corr / Bland–Altman', title: 'Method Validation Correlation (qPCR vs. RNA-seq)' },
                        ] as { id: DEPlotType; label: string; title: string }[])
                    ).map((item, idx, arr) => {
                      const active = deConfig.plotType === item.id;
                      const spanFull = arr.length % 2 === 1 && idx === arr.length - 1;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onPointerDown={() => {
                            setDeConfig((p) => ({
                              ...p,
                              plotType: item.id,
                              title: item.title,
                              subtitle: '',
                              xLabel: '',
                              yLabel: '',
                            }));
                            playAppleTick(soundEnabled, 'select');
                          }}
                          className={`apple-press px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-colors border ${
                            spanFull ? 'col-span-2' : ''
                          } ${
                            active
                              ? 'bg-[var(--accent)] text-white border-transparent shadow-sm'
                              : 'bg-[var(--bg-elevated)]/70 text-[var(--text-primary)] border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contextual Controls for UMAP / t-SNE (FeaturePlot Gene Overlay + Split by Condition) */}
                {(deConfig.plotType === 'umap' || deConfig.plotType === 'tsne') && (
                  <div className="space-y-3 pt-3 border-t border-[var(--border-hairline)]">
                    <div>
                      <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1.5">
                        Color Cells By (FeaturePlot)
                      </label>
                      <select
                        value={embeddingColorBy}
                        onChange={(e) => setEmbeddingColorBy(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                      >
                        <option value="cluster">Cell Type Clusters</option>
                        {embeddingMarkers.map((m) => (
                          <option key={m} value={m}>
                            Gene Expression: {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label className="flex items-center justify-between text-xs cursor-pointer">
                      <span className="font-medium text-[var(--text-primary)]">Split by Condition (Ctrl vs Tx)</span>
                      <input
                        type="checkbox"
                        checked={embeddingSplit}
                        onChange={(e) => setEmbeddingSplit(e.target.checked)}
                        className="accent-[var(--accent)] w-4 h-4 rounded"
                      />
                    </label>
                  </div>
                )}

                {/* Contextual Controls for Correlation / Bland-Altman Toggle */}
                {deConfig.plotType === 'correlation' && (
                  <div className="pt-3 border-t border-[var(--border-hairline)]">
                    <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1.5">
                      Agreement Analysis View
                    </label>
                    <AppleSegmentedControl<'correlation' | 'bland-altman'>
                      layoutId="corr-ba-pill"
                      size="sm"
                      fullWidth
                      soundEnabled={soundEnabled}
                      value={corrViewMode}
                      onChange={(m) => {
                        setCorrViewMode(m);
                        setDeConfig((p) => ({
                          ...p,
                          title:
                            m === 'bland-altman'
                              ? 'Bland–Altman Assay Agreement'
                              : 'Method Validation Correlation (qPCR vs. RNA-seq)',
                          subtitle: '',
                          xLabel: '',
                          yLabel: '',
                        }));
                      }}
                      options={[
                        { value: 'correlation', label: 'Pearson / Spearman' },
                        { value: 'bland-altman', label: 'Bland–Altman' },
                      ]}
                    />
                  </div>
                )}

                {/* Threshold Sliders (Volcano / MA) */}
                {(deConfig.plotType === 'volcano' || deConfig.plotType === 'ma') && (
                  <div className="space-y-4 pt-3 border-t border-[var(--border-hairline)]">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                        <span className="font-medium text-[var(--text-secondary)]">|log2FC| Cutoff</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {deConfig.fcThreshold.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={3.5}
                        step={0.1}
                        value={deConfig.fcThreshold}
                        onChange={(e) =>
                          setDeConfig((p) => ({ ...p, fcThreshold: Number(e.target.value) }))
                        }
                        className="apple-slider"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                        <span className="font-medium text-[var(--text-secondary)]">FDR Cutoff (q)</span>
                        <span className="font-semibold text-[var(--text-primary)]">{deConfig.fdrThreshold}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[0.1, 0.05, 0.01, 0.001].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onPointerDown={() => {
                              setDeConfig((p) => ({ ...p, fdrThreshold: val }));
                              playAppleTick(soundEnabled, 'select');
                            }}
                            className={`apple-press py-1 rounded-lg text-[11px] font-semibold tabular-nums ${
                              deConfig.fdrThreshold === val
                                ? 'bg-[var(--accent)] text-white'
                                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Gene Search & Label Manager */}
                    <div className="pt-2 border-t border-[var(--border-hairline)]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)]">
                          Clickable Gene Labels ({deConfig.labeledGenes.length})
                        </span>
                        <button
                          type="button"
                          onPointerDown={handleAutoLabelTop}
                          className="apple-press text-[11px] font-semibold text-[var(--accent)] flex items-center gap-1"
                        >
                          <Wand2 className="w-3 h-3" /> Auto Top 8
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                        <input
                          type="text"
                          value={geneQuery}
                          onChange={(e) => setGeneQuery(e.target.value)}
                          placeholder="Search gene to pin label..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                        />
                      </div>
                      {filteredGeneSuggestions.length > 0 && (
                        <div className="mt-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)] overflow-hidden">
                          {filteredGeneSuggestions.map((g) => (
                            <button
                              key={g.gene}
                              type="button"
                              onPointerDown={() => {
                                handleToggleGeneLabel(g.gene);
                                setGeneQuery('');
                                playAppleTick(soundEnabled, 'select');
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs flex justify-between hover:bg-[var(--bg-subtle)]"
                            >
                              <span className="font-semibold">{g.gene}</span>
                              <span className="text-[var(--text-tertiary)] tabular-nums">
                                FC {g.log2FC.toFixed(1)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {deConfig.labeledGenes.map((gene) => (
                          <button
                            key={gene}
                            type="button"
                            onPointerDown={() => {
                              handleToggleGeneLabel(gene);
                              playAppleTick(soundEnabled, 'select');
                            }}
                            title="Click to unlabel"
                            className="apple-press px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-elevated)] border border-[var(--border-hairline)] hover:border-rose-400"
                          >
                            {gene} ×
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : studio === 'workbench' ? (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Power &amp; Wet-Lab Workbench
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  A priori sample-size &amp; power curves (NIH/IACUC ready), Two-Way Factorial ANOVA, longitudinal growth curves, qPCR ΔΔCt, ELISA 4PL standard curves, and Michaelis–Menten enzyme kinetics.
                </p>
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[11px] text-[var(--text-secondary)]">
                  All journal presets, CVD palettes, fonts, transparent background, and SVG/PDF/PNG/TIFF exports below apply live to every workbench figure.
                </div>
              </div>
            ) : studio === 'composer' ? (
              <div className="space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Multi-Panel Figure Composer
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Pin plots from any BioGrace studio or upload microscopy / Western blot images to assemble journal-aligned multi-panel figures (a, b, c, d).
                </p>
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[11px] text-[var(--text-secondary)]">
                  Active Board: <strong>{composerPanels.length} pinned panel{composerPanels.length === 1 ? '' : 's'}</strong> · Target width: <strong>{resolvedTheme.widthMm} mm</strong> ({resolvedTheme.journal.shortName}).
                </div>
              </div>
            ) : (
              <>
                {/* Studio 2 Wet-Lab Demos */}
                <div>
                  <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] block mb-2">
                    Wet-Lab Case Studies (or Drop CSV)
                  </label>
                  <div className="space-y-1.5">
                    {statsDemos.map((demo) => {
                      const active = activeStatsDemoId === demo.id;
                      return (
                        <button
                          key={demo.id}
                          type="button"
                          onPointerDown={() => selectStatsDemo(demo.id)}
                          className={`apple-press w-full p-2.5 rounded-xl text-left border transition-colors ${
                            active
                              ? 'bg-[var(--accent)]/12 border-[var(--accent)]/50'
                              : 'bg-[var(--bg-elevated)]/65 border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                              {demo.name}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                              {demo.badge}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-snug text-[var(--text-secondary)]">
                            {demo.summary}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Anti-Barplot Visual Switcher */}
                <div className="pt-3 border-t border-[var(--border-hairline)]">
                  <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] block mb-2">
                    Anti-Barplot Visualization
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'raincloud', label: 'Raincloud' },
                        { id: 'box-beeswarm', label: 'Box + Beeswarm' },
                        { id: 'paired-slope', label: 'Paired Slope' },
                        { id: 'barplot-trap', label: 'Barplot Trap ⚠️' },
                      ] as { id: StatsPlotType; label: string }[]
                    ).map((opt) => {
                      const active = statsConfig.plotType === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onPointerDown={() => {
                            setStatsConfig((p) => ({ ...p, plotType: opt.id }));
                            playAppleTick(soundEnabled, 'select');
                          }}
                          className={`apple-press px-2.5 py-2 rounded-xl text-xs font-medium border ${
                            active
                              ? opt.id === 'barplot-trap'
                                ? 'bg-rose-600 text-white border-transparent'
                                : 'bg-[var(--accent)] text-white border-transparent shadow-sm'
                              : 'bg-[var(--bg-elevated)]/70 text-[var(--text-primary)] border-[var(--border-hairline)]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Study Design & Multiple Testing */}
                <div className="space-y-3 pt-3 border-t border-[var(--border-hairline)]">
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="font-medium text-[var(--text-primary)]">Paired / Matched Subjects</span>
                    <input
                      type="checkbox"
                      checked={statsConfig.isPaired}
                      onChange={(e) => setStatsConfig((p) => ({ ...p, isPaired: e.target.checked }))}
                      className="accent-[var(--accent)] w-4 h-4 rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="font-medium text-[var(--text-primary)]">Significance Brackets</span>
                    <input
                      type="checkbox"
                      checked={statsConfig.showSignificanceBrackets}
                      onChange={(e) =>
                        setStatsConfig((p) => ({ ...p, showSignificanceBrackets: e.target.checked }))
                      }
                      className="accent-[var(--accent)] w-4 h-4 rounded"
                    />
                  </label>
                  <div>
                    <span className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] block mb-1.5">
                      Multiple Testing Correction
                    </span>
                    <AppleSegmentedControl<'BH-FDR' | 'Holm' | 'None'>
                      layoutId="fdr-method-pill"
                      size="sm"
                      fullWidth
                      soundEnabled={soundEnabled}
                      value={statsConfig.correctionMethod}
                      onChange={(v) => setStatsConfig((p) => ({ ...p, correctionMethod: v }))}
                      options={[
                        { value: 'BH-FDR', label: 'BH-FDR' },
                        { value: 'Holm', label: 'Holm' },
                        { value: 'None', label: 'None' },
                      ]}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ==============================================================
             * FULL GMXGRACE JOURNAL, PALETTE, COLORMAP & TYPOGRAPHY SYSTEM
             * ============================================================ */}
            <div className="pt-3 border-t border-[var(--border-hairline)] space-y-3">
              <div className="flex items-center justify-between">
                <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  Journal Presets ({JOURNAL_PRESET_LIST.length})
                </label>
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] tabular-nums">
                  {resolvedTheme.widthMm} mm · {resolvedTheme.topRightSpines ? '4-spine' : 'open'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {JOURNAL_PRESET_LIST.map((journal) => {
                  const active = activeStyle.preset === journal.id;
                  return (
                    <button
                      key={journal.id}
                      type="button"
                      title={journal.description}
                      onPointerDown={() => applyJournalPreset(journal.id)}
                      className={`apple-press p-2 rounded-xl text-left border transition-colors ${
                        active
                          ? 'bg-[var(--bg-elevated)] border-[var(--accent)] ring-1 ring-[var(--accent)]/30'
                          : 'bg-[var(--bg-elevated)]/55 border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                          {journal.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-[var(--text-tertiary)] tabular-nums">
                        <span>
                          {journal.widthsMm.single}/{journal.widthsMm.double} mm
                        </span>
                        <span>{journal.topRightSpines ? 'Box · In' : 'Open · Out'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Column Width & Export DPI */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-1">
                    Column Width
                  </label>
                  <select
                    value={activeStyle.columnWidth}
                    onChange={(e) =>
                      patchActiveStyle({ columnWidth: e.target.value as ColumnWidthChoice })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  >
                    <option value="single">Single ({resolvedTheme.journal.widthsMm.single} mm)</option>
                    <option value="one_half">1.5 Col ({resolvedTheme.journal.widthsMm.one_half} mm)</option>
                    <option value="double">Double ({resolvedTheme.journal.widthsMm.double} mm)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-1">
                    Export DPI
                  </label>
                  <select
                    value={activeStyle.dpi}
                    onChange={(e) =>
                      patchActiveStyle({ dpi: Number(e.target.value) as 300 | 600 | 1200 })
                    }
                    className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] tabular-nums"
                  >
                    <option value={300}>300 DPI</option>
                    <option value={600}>600 DPI</option>
                    <option value={1200}>1200 DPI</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 7 Colorblind-Safe & Publication Palettes */}
            <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  Color Palettes (7)
                </label>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  CVD Safe
                </span>
              </div>
              <div className="space-y-1.5">
                {PALETTE_LIST.map((pal) => {
                  const active = activeStyle.palette === pal.id;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onPointerDown={() => {
                        const pid = pal.id as PaletteId;
                        const syncedCmap: Partial<PublicationStyleSettings> =
                          pid === 'grayscale-pub'
                            ? { colormap: 'Greys' }
                            : pid === 'viridis-discrete'
                            ? { colormap: 'viridis' }
                            : activeStyle.colormap === 'Greys'
                            ? { colormap: 'RdYlBu_r' }
                            : {};
                        patchActiveStyle({ palette: pid, ...syncedCmap });
                        playAppleTick(soundEnabled, 'select');
                      }}
                      className={`apple-press w-full px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                        active
                          ? 'bg-[var(--bg-elevated)] border-[var(--accent)] ring-1 ring-[var(--accent)]/30'
                          : 'bg-[var(--bg-elevated)]/55 border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                        {pal.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {pal.colors.slice(0, 6).map((hex) => (
                          <span
                            key={hex}
                            className="w-3.5 h-2.5 rounded-sm border border-black/10"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 12 Continuous Colormaps (for scRNA Dot Plot & Continuous Scales) */}
              <div className="pt-1">
                <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-1">
                  Continuous Colormap ({COLORMAP_LIST.length} · Heatmaps &amp; Dot Plots)
                </label>
                <select
                  value={activeStyle.colormap}
                  onChange={(e) => patchActiveStyle({ colormap: e.target.value as ColormapId })}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                >
                  {COLORMAP_LIST.map((cm) => (
                    <option key={cm.id} value={cm.id}>
                      {cm.name}
                    </option>
                  ))}
                </select>
                <div
                  className="mt-1.5 h-2 rounded-full border border-black/10"
                  style={{
                    background: `linear-gradient(to right, ${resolvedTheme.colormap.stops.join(', ')})`,
                  }}
                />
              </div>
            </div>

            {/* Typography, Line Width & Canvas Controls */}
            <div className="pt-3 border-t border-[var(--border-hairline)] space-y-3">
              <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                Typography &amp; Strokes
              </label>

              <div>
                <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-1">
                  Font Family
                </label>
                <select
                  value={activeStyle.fontFamily}
                  onChange={(e) =>
                    patchActiveStyle({ fontFamily: e.target.value as FontFamilyChoice })
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                >
                  {(Object.keys(FONT_FAMILIES) as FontFamilyChoice[]).map((k) => (
                    <option key={k} value={k}>
                      {FONT_FAMILIES[k].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1 tabular-nums">
                    <span className="text-[var(--text-secondary)]">Font (pt)</span>
                    <span className="font-semibold">{activeStyle.fontSizePt.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={6}
                    max={12}
                    step={0.5}
                    value={activeStyle.fontSizePt}
                    onChange={(e) => patchActiveStyle({ fontSizePt: Number(e.target.value) })}
                    className="apple-slider"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1 tabular-nums">
                    <span className="text-[var(--text-secondary)]">Line (pt)</span>
                    <span className="font-semibold">{activeStyle.lineWidth.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={2.4}
                    step={0.1}
                    value={activeStyle.lineWidth}
                    onChange={(e) => patchActiveStyle({ lineWidth: Number(e.target.value) })}
                    className="apple-slider"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="font-medium text-[var(--text-secondary)]">Transparent Background</span>
                  <input
                    type="checkbox"
                    checked={activeStyle.transparentBg}
                    onChange={(e) => patchActiveStyle({ transparentBg: e.target.checked })}
                    className="accent-[var(--accent)] w-4 h-4 rounded"
                  />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="font-medium text-[var(--text-secondary)]">Print-Ready White Canvas</span>
                  <input
                    type="checkbox"
                    checked={activeStyle.paperExport}
                    onChange={(e) => patchActiveStyle({ paperExport: e.target.checked })}
                    className="accent-[var(--accent)] w-4 h-4 rounded"
                  />
                </label>
              </div>
            </div>
          </aside>

          {/* MAIN STAGE */}
          <section className="space-y-5 min-w-0">
            {/* Persistent Uploaded File Status Strip (Shows clearly whenever a custom CSV is active) */}
            {(() => {
              const galleryUpload = studio === 'gallery' ? galleryTables[activeCase.id] : undefined;
              const activeUpload =
                studio === 'stats'
                  ? statsUploadStatus
                  : studio === 'gallery'
                  ? {
                      fileName: galleryUpload?.fileName ?? '',
                      rowCount: galleryUpload?.table.rows.length ?? 0,
                      isCustom: Boolean(galleryUpload),
                    }
                  : deUploadStatus;
              if (studio === 'workbench' || studio === 'composer' || !activeUpload.isCustom) return null;
              return (
                <div className="rounded-2xl px-4 py-2.5 bg-emerald-500/12 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold min-w-0">
                    <Check className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      CSV Uploaded: <code className="font-mono">{activeUpload.fileName}</code> ({activeUpload.rowCount} items active)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onPointerDown={() => fileInputRef.current?.click()}
                      className="apple-press text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300"
                    >
                      Replace File
                    </button>
                    <button
                      type="button"
                      onPointerDown={() => {
                        if (studio === 'gallery') {
                          setGalleryTables((prev) => {
                            const copy = { ...prev };
                            delete copy[activeCase.id];
                            return copy;
                          });
                          notifyUpload('success', 'Restored Journal Figure Demo', `Reset ${activeCase.title} back to its built-in biological showcase.`);
                        } else {
                          handleResetDemo();
                        }
                      }}
                      className="apple-press inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Demo
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Quick Stage Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="type-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                  {studio === 'plotter'
                    ? 'DE & Single-Cell Publication Plotter'
                    : studio === 'gallery'
                    ? galleryTitles[activeCase.id]?.title ?? activeCase.title
                    : studio === 'workbench'
                    ? 'Power, Factorial & Wet-Lab Workbench'
                    : studio === 'composer'
                    ? 'Multi-Panel Figure Composer'
                    : "Biologist's Statistical Advisor & Anti-Barplot Studio"}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 tabular-nums">
                  {studio === 'gallery'
                    ? `${activeCase.category} · ${resolvedTheme.journal.name} (${resolvedTheme.widthMm} mm) · ${resolvedTheme.palette.name}`
                    : `${resolvedTheme.journal.name} (${resolvedTheme.widthMm} mm) · ${resolvedTheme.palette.name} · ${activeStyle.fontFamily} · ${activeStyle.dpi} DPI`}
                </p>
              </div>

              {/* Export & Pin Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {studio === 'stats' && (
                  <button
                    type="button"
                    onPointerDown={() => {
                      setStatsConfig((p) => ({
                        ...p,
                        plotType: p.plotType === 'barplot-trap' ? 'raincloud' : 'barplot-trap',
                      }));
                      playAppleTick(soundEnabled, 'commit');
                    }}
                    className={`apple-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border ${
                      statsConfig.plotType === 'barplot-trap'
                        ? 'bg-emerald-600 text-white border-transparent'
                        : 'bg-rose-500/12 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    {statsConfig.plotType === 'barplot-trap'
                      ? 'Morph to Honest Raincloud'
                      : 'Compare vs. Barplot Trap'}
                  </button>
                )}

                {studio !== 'composer' && (
                  <button
                    type="button"
                    title="Pin a crisp vector snapshot of this plot into the Multi-Panel Figure Composer"
                    onPointerDown={handlePinActiveToComposer}
                    className="apple-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)]/12 text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    Pin to Board
                  </button>
                )}

                <button
                  type="button"
                  onPointerDown={() => {
                    exportSvgFile(svgRef.current, generatedCode.baseName);
                    playAppleTick(soundEnabled, 'commit');
                  }}
                  className="apple-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] shadow-xs hover:border-[var(--accent)]"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                  SVG
                </button>

                <button
                  type="button"
                  onPointerDown={() => {
                    void exportVectorPdfFile(svgRef.current, generatedCode.baseName);
                    playAppleTick(soundEnabled, 'commit');
                  }}
                  className="apple-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] shadow-xs hover:border-[var(--accent)]"
                >
                  <Layers className="w-3.5 h-3.5 text-rose-500" />
                  PDF
                </button>

                <button
                  type="button"
                  onPointerDown={() => {
                    void exportPngFile(svgRef.current, generatedCode.baseName, activeStyle.dpi);
                    playAppleTick(soundEnabled, 'commit');
                  }}
                  className="apple-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] shadow-xs hover:border-[var(--accent)]"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  {activeStyle.dpi} PNG
                </button>

                <button
                  type="button"
                  title="Download 600 DPI 32-bit RGBA TIFF with embedded print DPI tags (PLOS / eLife / JBC / ACS)"
                  onPointerDown={() => {
                    void exportTiffFile(svgRef.current, generatedCode.baseName, 600);
                    playAppleTick(soundEnabled, 'commit');
                  }}
                  className="apple-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] shadow-xs hover:border-[var(--accent)]"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                  600 TIFF
                </button>

                <input
                  ref={recipeInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleLoadRecipe(f);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  title="Save figure recipe (.biograce.json) for Reviewer #2 revisions"
                  onPointerDown={handleSaveRecipe}
                  className="apple-press inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-secondary)]"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Save Recipe</span>
                </button>
                <button
                  type="button"
                  title="Load a saved .biograce.json figure recipe"
                  onPointerDown={() => recipeInputRef.current?.click()}
                  className="apple-press inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-secondary)]"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Load</span>
                </button>
              </div>
            </div>

            {/* 1-Click Colorblindness Simulator (CVD Proof) & Journal Preflight Guard */}
            <CvdPreflightBar
              cvdMode={cvdMode}
              onChangeCvdMode={setCvdMode}
              styleSettings={activeStyle}
              darkMode={darkMode}
              svgRef={svgRef}
              soundEnabled={soundEnabled}
              onAutoFixJournal={(patch) => {
                patchActiveStyle(patch);
                notifyUpload('success', `Auto-Fixed for ${resolvedTheme.journal.shortName}`, 'Applied print-ready white canvas, legible font size, CVD-safe palette, and ≥600 DPI.');
              }}
            />

            {/* Interactive Publication Figure Card (Click any title or axis to edit inline) */}
            <motion.div
              key={`${studio}-${studio === 'plotter' ? deConfig.plotType : studio === 'gallery' ? activeCase.id : studio === 'workbench' ? workbenchSubTab : studio === 'composer' ? 'board' : statsConfig.plotType}`}
              initial={{ opacity: 0.72, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={APPLE_SPRINGS.criticallyDamped}
              className="relative material-card rounded-3xl p-3 sm:p-5"
              style={{
                ...(activeStyle.transparentBg
                  ? {
                      backgroundImage:
                        'repeating-conic-gradient(rgba(128,128,128,0.12) 0% 25%, transparent 0% 50%)',
                      backgroundSize: '16px 16px',
                    }
                  : {}),
                filter: cvdMode !== 'none' ? `url(#biograce-cvd-${cvdMode})` : undefined,
              }}
            >
              {/* Inline Floating Glass Plot Text Editor */}
              <InlinePlotEditor
                activeEdit={activePlotEdit}
                onCommit={handleCommitPlotEdit}
                onClose={() => setActivePlotEdit(null)}
              />

              {/* Subtle Quick-Edit Hint Bar (outside exported SVG) */}
              <div className="mb-2.5 px-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1.5">
                  <Pencil className="w-3 h-3 text-[var(--accent)]" />
                  Click any title, axis, or legend label on the plot to edit inline
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onPointerDown={() =>
                      handleOpenPlotEdit(
                        'title',
                        'Plot Title',
                        studio === 'gallery'
                          ? galleryTitles[activeCase.id]?.title ?? activeCase.title
                          : studio === 'plotter'
                          ? deConfig.title
                          : statsConfig.title
                      )
                    }
                    className="apple-press px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-secondary)] font-medium"
                  >
                    Edit Title
                  </button>
                  <button
                    type="button"
                    onPointerDown={() =>
                      handleOpenPlotEdit(
                        'subtitle',
                        'Subtitle',
                        studio === 'gallery'
                          ? galleryTitles[activeCase.id]?.subtitle ?? ''
                          : studio === 'plotter'
                          ? deConfig.subtitle
                          : statsConfig.subtitle === '__HIDDEN__'
                          ? ''
                          : statsConfig.subtitle
                      )
                    }
                    className="apple-press px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-secondary)] font-medium"
                  >
                    Edit Subtitle
                  </button>
                  {studio !== 'gallery' && (
                    <>
                      <button
                        type="button"
                        onPointerDown={() =>
                          handleOpenPlotEdit(
                            'xLabel',
                            'X-Axis Label',
                            studio === 'plotter' ? deConfig.xLabel : statsConfig.xLabel
                          )
                        }
                        className="apple-press px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-secondary)] font-medium"
                      >
                        Edit X-Axis
                      </button>
                      <button
                        type="button"
                        onPointerDown={() =>
                          handleOpenPlotEdit(
                            'yLabel',
                            'Y-Axis Label',
                            studio === 'plotter' ? deConfig.yLabel : statsConfig.yLabel
                          )
                        }
                        className="apple-press px-2 py-0.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-secondary)] font-medium"
                      >
                        Edit Y-Axis
                      </button>
                    </>
                  )}
                </div>
              </div>

              {studio === 'workbench' ? (
                <WetLabWorkbench
                  activeSubTab={workbenchSubTab}
                  onChangeSubTab={setWorkbenchSubTab}
                  styleSettings={deConfig}
                  darkMode={darkMode}
                  soundEnabled={soundEnabled}
                  svgRef={svgRef}
                  onSendQpcrToStats={(tidyCsv, fname) => ingestCsvText(tidyCsv, fname, 'stats-tidy')}
                />
              ) : studio === 'composer' ? (
                <FigureComposerStudio
                  panels={composerPanels}
                  onChangePanels={setComposerPanels}
                  styleSettings={deConfig}
                  darkMode={darkMode}
                  soundEnabled={soundEnabled}
                  svgRef={svgRef}
                  renderLivePanel={renderLiveComposerPanel}
                />
              ) : studio === 'gallery' ? (
                <JournalCaseRenderer
                  item={activeCase}
                  customTable={galleryTables[activeCase.id]?.table ?? null}
                  customTitle={galleryTitles[activeCase.id]?.title}
                  customSubtitle={galleryTitles[activeCase.id]?.subtitle}
                  styleSettings={deConfig}
                  darkMode={darkMode}
                  svgRef={svgRef}
                  onEditField={handleOpenPlotEdit}
                />
              ) : studio === 'plotter' ? (
                <>
                  {(deConfig.plotType === 'volcano' || deConfig.plotType === 'ma') && (
                    <VolcanoMAPlot
                      mode={deConfig.plotType}
                      rows={volcanoRows}
                      config={deConfig}
                      darkMode={darkMode}
                      soundEnabled={soundEnabled}
                      svgRef={svgRef}
                      onToggleLabel={handleToggleGeneLabel}
                      onMoveLabel={handleMoveGeneLabel}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'dotplot' && (
                    <DotPlotChart
                      rows={dotPlotRows}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'upset' && (
                    <UpSetPlot
                      items={upsetItems}
                      config={deConfig}
                      darkMode={darkMode}
                      soundEnabled={soundEnabled}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'lollipop' && (
                    <PathwayLollipopPlot
                      rows={pathwayRows}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {(deConfig.plotType === 'umap' || deConfig.plotType === 'tsne') && (
                    <EmbeddingPlot
                      mode={deConfig.plotType}
                      cells={embeddingCells}
                      markers={embeddingMarkers}
                      colorBy={embeddingColorBy}
                      splitByCondition={embeddingSplit}
                      config={deConfig}
                      darkMode={darkMode}
                      soundEnabled={soundEnabled}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'pca' && (
                    <PCAPlot
                      rows={pcaData.rows}
                      pc1Var={pcaData.pc1Var}
                      pc2Var={pcaData.pc2Var}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'heatmap' && (
                    <DEGHeatmapPlot
                      data={degHeatmap}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'pseudotime' && (
                    <PseudotimePlot
                      stages={pseudotime.stages}
                      series={pseudotime.series}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'dose-response' && (
                    <DoseResponsePlot
                      points={dosePoints}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'survival' && (
                    <SurvivalKMPlot
                      rows={survivalRows}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'forest' && (
                    <ForestPlotChart
                      rows={forestRows}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'roc' && (
                    <ROCPlotChart
                      rows={rocRows}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                  {deConfig.plotType === 'correlation' && (
                    <CorrelationBlandAltmanPlot
                      rows={corrRows}
                      viewMode={corrViewMode}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                      onEditField={handleOpenPlotEdit}
                    />
                  )}
                </>
              ) : (
                <AntiBarplotCanvas
                  rows={statsRows}
                  analysis={statsAnalysis}
                  config={statsConfig}
                  darkMode={darkMode}
                  svgRef={svgRef}
                  onEditField={handleOpenPlotEdit}
                />
              )}
            </motion.div>

            {/* Studio 2 Statistical Advisor + Layman Plain-English Guide */}
            {studio === 'stats' && (
              <>
                <StatAdvisorPanel
                  analysis={statsAnalysis}
                  collapsePseudoreplicates={statsConfig.collapsePseudoreplicates}
                  onToggleCollapseReplicates={() => {
                    setStatsConfig((p) => ({
                      ...p,
                      collapsePseudoreplicates: !p.collapsePseudoreplicates,
                    }));
                    playAppleTick(soundEnabled, 'commit');
                  }}
                />
                <LaymanStatsGuide analysis={statsAnalysis} soundEnabled={soundEnabled} />
                <div className="material-card rounded-2xl p-5">
                  <CsvFormatGuide
                    activeKey="stats-tidy"
                    soundEnabled={soundEnabled}
                    onTestLoadCsv={(csv, name, key) => ingestCsvText(csv, name, key)}
                  />
                </div>
              </>
            )}

            {/* 20 Journal Figures Guide, CSV Example & Attribution Strip */}
            {studio === 'gallery' && (
              <>
                <div className="material-card rounded-2xl p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                        {activeCase.category} · Based on {activeCase.journalSource}
                      </div>
                      <h3 className="type-title text-base font-bold text-[var(--text-primary)] mt-0.5">
                        When to Use This Figure &amp; How to Read It
                      </h3>
                    </div>
                    <button
                      type="button"
                      onPointerDown={() => {
                        setCodeSheetOpen(true);
                        playAppleTick(soundEnabled, 'select');
                      }}
                      className="apple-press px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
                    >
                      Get ggplot2 R / Python Code →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <div className="font-semibold text-[var(--text-primary)] mb-1">Best Biological Use Case</div>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{activeCase.bestFor}</p>
                    </div>
                    <div className="rounded-xl p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                      <div className="font-semibold text-[var(--text-primary)] mb-1">Plain-English Reading Guide</div>
                      <p className="text-[var(--text-secondary)] leading-relaxed">{activeCase.plainEnglishTip}</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--text-tertiary)] flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span>
                      R packages: <code className="font-mono">{activeCase.rPackages.join(', ')}</code>
                    </span>
                    <span>
                      Inspired by MIT open-source{' '}
                      <a
                        href="https://github.com/GeneticistHere/ggplot2-20-journal-cases"
                        target="_blank"
                        rel="noreferrer"
                        className="underline hover:text-[var(--accent)]"
                      >
                        GeneticistHere/ggplot2-20-journal-cases
                      </a>
                    </span>
                  </div>
                </div>
                <div className="material-card rounded-2xl p-5">
                  <CsvFormatGuide
                    activeKey={activeCase.id}
                    soundEnabled={soundEnabled}
                    onTestLoadCsv={(csv, name, key) => ingestCsvText(csv, name, key)}
                  />
                </div>
              </>
            )}

            {/* Studio 1 Plain-English Statistical Explainer, CSV Format Guide & Reproducibility Strip */}
            {studio === 'plotter' && (
              <>
                <PlotLaymanExplainer
                  plotType={deConfig.plotType}
                  pc1Var={pcaData.pc1Var}
                  pc2Var={pcaData.pc2Var}
                  dosePoints={dosePoints}
                  survivalRows={survivalRows}
                  rocRows={rocRows}
                  corrRows={corrRows}
                  soundEnabled={soundEnabled}
                />
                <div className="material-card rounded-2xl p-5">
                  <CsvFormatGuide
                    activeKey={deConfig.plotType}
                    soundEnabled={soundEnabled}
                    onTestLoadCsv={(csv, name, key) => ingestCsvText(csv, name, key)}
                  />
                </div>
                <div className="material-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      100% Reproducible Publication Code &amp; CLI
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Every journal spine rule, font family, palette, colormap, and threshold stays synced with R, Python, and <code className="font-mono">biograce</code> CLI.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onPointerDown={() => {
                    setCodeSheetOpen(true);
                    playAppleTick(soundEnabled, 'select');
                  }}
                  className="apple-press px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-primary)]"
                >
                  Inspect Code Drawer →
                </button>
              </div>
              </>
            )}
          </section>
        </main>

        {/* Minimal Public Launch Footer with Privacy Lock & Feedback Links */}
        <footer className="mt-6 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)]/60">
          <div className="max-w-[1460px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--text-tertiary)]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                100% Local · Zero Data Leaves Your Browser
              </span>
              <span className="hidden sm:inline">·</span>
              <button
                type="button"
                onPointerDown={() => setLicenseSheetOpen(true)}
                className="underline hover:text-[var(--text-primary)]"
              >
                Academic &amp; Non-Commercial License
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/pritampanda15/BioGrace"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--text-primary)] font-medium"
              >
                GitHub Repo
              </a>
              <a
                href="https://github.com/pritampanda15/BioGrace/issues/new"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--text-primary)] font-medium"
              >
                Request a Plot / Report Bug
              </a>
              <a
                href="https://github.com/GeneticistHere/ggplot2-20-journal-cases"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--text-primary)]"
              >
                20-Cases Attribution (MIT)
              </a>
            </div>
          </div>
        </footer>

        {/* Fluid Right-Edge Reproducible Code & CLI Sheet */}
        <FluidSheet
          open={codeSheetOpen}
          onClose={() => setCodeSheetOpen(false)}
          title="Reproducible Code & CLI"
          subtitle="Drag right to dismiss with momentum · Synced live to your figure"
          soundEnabled={soundEnabled}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <AppleSegmentedControl<'r' | 'python' | 'cli'>
                layoutId="code-tab-pill"
                size="sm"
                soundEnabled={soundEnabled}
                value={codeTab}
                onChange={setCodeTab}
                options={[
                  { value: 'r', label: 'R (ggplot2)', icon: <FileCode2 className="w-3.5 h-3.5" /> },
                  { value: 'python', label: 'Python (matplotlib)', icon: <Code2 className="w-3.5 h-3.5" /> },
                  { value: 'cli', label: 'BioGrace CLI', icon: <Terminal className="w-3.5 h-3.5" /> },
                ]}
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onPointerDown={() =>
                    void handleCopy(
                      codeTab,
                      codeTab === 'r'
                        ? generatedCode.r
                        : codeTab === 'python'
                        ? generatedCode.python
                        : generatedCode.cli
                    )
                  }
                  className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
                >
                  {copiedKey === codeTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === codeTab ? 'Copied' : 'Copy'}
                </button>

                <button
                  type="button"
                  onPointerDown={() => {
                    const ext = codeTab === 'r' ? 'R' : codeTab === 'python' ? 'py' : 'sh';
                    const content =
                      codeTab === 'r'
                        ? generatedCode.r
                        : codeTab === 'python'
                        ? generatedCode.python
                        : generatedCode.cli;
                    exportTextFile(content, `${generatedCode.baseName}.${ext}`);
                    playAppleTick(soundEnabled, 'commit');
                  }}
                  className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save .{codeTab === 'r' ? 'R' : codeTab === 'python' ? 'py' : 'sh'}
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-2xl bg-[#111319] text-[#E6EDF3] text-xs leading-relaxed overflow-x-auto font-mono border border-white/10">
              <code>
                {codeTab === 'r'
                  ? generatedCode.r
                  : codeTab === 'python'
                  ? generatedCode.python
                  : generatedCode.cli}
              </code>
            </pre>
          </div>
        </FluidSheet>

        {/* CSV Format Guide & Sample Templates Fluid Sheet */}
        <FluidSheet
          open={csvGuideOpen}
          onClose={() => setCsvGuideOpen(false)}
          title="CSV Format Guide & Sample Data"
          subtitle="Downloadable templates & test data for all 36 plot formats (including all 20 journal figures)"
          soundEnabled={soundEnabled}
        >
          <CsvFormatGuide
            activeKey={studio === 'stats' ? 'stats-tidy' : studio === 'gallery' ? activeCase.id : deConfig.plotType}
            soundEnabled={soundEnabled}
            showSelector
            onTestLoadCsv={(csv, name, key) => {
              ingestCsvText(csv, name, key);
              setCsvGuideOpen(false);
            }}
            onOpenJournalCase={(caseId) => {
              setStudio('gallery');
              setActiveCaseId(caseId);
              setCsvGuideOpen(false);
            }}
          />
        </FluidSheet>

        {/* Excel Paste, .xlsx Workbook & Visual Column Mapper Sheet */}
        <FluidSheet
          open={mapperSheetOpen}
          onClose={() => setMapperSheetOpen(false)}
          title="Excel / Prism Paste & Visual Column Mapper"
          subtitle="Paste copied spreadsheet cells, upload multi-sheet .xlsx workbooks, or map arbitrary column names"
          soundEnabled={soundEnabled}
        >
          <DataImportMapperModal
            initialText={mapperInitText}
            initialFilename={mapperInitName}
            currentPlot={deConfig.plotType}
            currentStudio={studio === 'stats' ? 'stats' : studio === 'gallery' ? 'gallery' : 'plotter'}
            soundEnabled={soundEnabled}
            onCommitMappedCsv={(csv, name, target) => {
              ingestCsvText(csv, name, target);
              setMapperSheetOpen(false);
            }}
          />
        </FluidSheet>

        {/* Local Manuscript Project Workspace Sheet */}
        <FluidSheet
          open={projectSheetOpen}
          onClose={() => setProjectSheetOpen(false)}
          title="Manuscript Figure Workspace"
          subtitle="Save Fig 1A–F locally in your browser · Pin snapshots to the Multi-Panel Figure Composer"
          soundEnabled={soundEnabled}
        >
          <ManuscriptProjectDrawer
            figures={savedFigures}
            composerPanels={composerPanels}
            soundEnabled={soundEnabled}
            onSaveCurrentFigure={handleSaveSnapshotToWorkspace}
            onPinSavedToComposer={(rec) => {
              setComposerPanels((prev) =>
                [
                  ...prev,
                  {
                    id: `pin-${Date.now()}`,
                    label: `${rec.tag}: ${rec.title}`,
                    kind: 'biograce-svg' as const,
                    dataUrl: rec.previewDataUrl,
                    aspectRatio: 1.5,
                  },
                ].slice(0, 6)
              );
              setStudio('composer');
              setProjectSheetOpen(false);
            }}
            onDeleteFigure={(id) => setSavedFigures((prev) => prev.filter((f) => f.id !== id))}
            onImportProject={(proj: BioGraceProjectFile) => {
              setSavedFigures(proj.figures ?? []);
              if (Array.isArray(proj.composerPanels)) setComposerPanels(proj.composerPanels);
              notifyUpload('success', `Imported Project: ${proj.name}`, `Restored ${proj.figures.length} figures and ${proj.composerPanels?.length ?? 0} composer panels.`);
            }}
          />
        </FluidSheet>

        {/* Academic-Only License Sheet */}
        <FluidSheet
          open={licenseSheetOpen}
          onClose={() => setLicenseSheetOpen(false)}
          title="Academic & Non-Commercial License"
          subtitle="BioGrace v1.0 · Copyright © 2026 Pritam Panda"
          soundEnabled={soundEnabled}
        >
          <div className="space-y-4 text-xs leading-relaxed text-[var(--text-secondary)]">
            <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/30 text-[var(--text-primary)]">
              <strong>Academic &amp; Non-Commercial Research Only:</strong> BioGrace is free for universities,
              non-profit research institutes, teaching, theses, and non-commercial scientific publications.
              Commercial use requires written permission from the copyright holder.
            </div>
            <p>
              <strong>Permitted Uses:</strong> Generating publication figures, statistical analyses, and reproducible
              R/Python scripts for academic manuscripts, lab notebooks, workshops, and classroom instruction with
              attribution to <code className="font-mono">github.com/pritampanda15/BioGrace</code>.
            </p>
            <p>
              <strong>Restricted Uses:</strong> Commercial pharmaceutical/biotech R&amp;D, paid consulting,
              fee-for-service analytics, or integration into commercial/SaaS products without a separate commercial
              license.
            </p>
          </div>
        </FluidSheet>
      </div>
    </MotionConfig>
  );
}

export default App;
