import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  BookOpen,
  Check,
  Code2,
  Copy,
  Download,
  FileCode2,
  FileSpreadsheet,
  FlaskConical,
  Grid2x2,
  Image as ImageIcon,
  Layers,
  Moon,
  Palette,
  Pencil,
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
  exportVectorPdfFile,
} from './lib/exporters';
import { APPLE_SPRINGS, playAppleTick } from './motion/applePhysics';
import { AppleSegmentedControl } from './components/ui/AppleSegmentedControl';
import { FluidSheet } from './components/ui/FluidSheet';
import { CsvFormatGuide } from './components/ui/CsvFormatGuide';
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
  const [licenseSheetOpen, setLicenseSheetOpen] = useState(false);
  const [codeTab, setCodeTab] = useState<'r' | 'python' | 'cli'>('r');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadBanner, setUploadBanner] = useState<string | null>(null);
  const [geneQuery, setGeneQuery] = useState('');
  const [activeCaseId, setActiveCaseId] = useState<JournalCaseId>('03-multi-volcano');
  const [caseCategoryFilter, setCaseCategoryFilter] = useState<'All' | CaseCategory>('All');
  const [activePlotEdit, setActivePlotEdit] = useState<ActivePlotEdit | null>(null);
  const [galleryTitles, setGalleryTitles] = useState<Record<string, { title?: string; subtitle?: string }>>({});

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

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

  const ingestCsvText = (
    text: string,
    fileName: string,
    explicitTarget?: CsvTemplateKey
  ) => {
    const table = parseDelimitedText(text);
    if (table.rows.length === 0) {
      setUploadBanner('Could not parse any rows from that file — check that it has a CSV or TSV header.');
      return;
    }

    const isStatsTarget = explicitTarget ? explicitTarget === 'stats-tidy' : studio === 'stats';
    if (isStatsTarget) {
      const parsed = parseTidyStatsTable(table);
      if (parsed.rows.length > 0) {
        setStudio('stats');
        setStatsRows(parsed.rows);
        setStatsSourceFile(fileName);
        setActiveStatsDemoId('custom');
        setStatsConfig((prev) => ({
          ...prev,
          title: fileName.replace(/\.(csv|tsv|txt)$/i, ''),
          subtitle: '',
          xLabel: parsed.groupCol,
          yLabel: parsed.valueCol,
          isPaired: Boolean(parsed.subjectCol && !parsed.replicateCol),
          collapsePseudoreplicates: false,
        }));
        setUploadBanner(
          `Loaded ${parsed.rows.length} rows from ${fileName} (Group: ${parsed.groupCol}, Value: ${parsed.valueCol}).`
        );
        playAppleTick(soundEnabled, 'commit');
      }
      return;
    }

    const targetPlot: DEPlotType =
      explicitTarget && explicitTarget !== 'stats-tidy' ? explicitTarget : deConfig.plotType;

    if (explicitTarget && explicitTarget !== 'stats-tidy') {
      setStudio('plotter');
      setDeConfig((p) => ({ ...p, plotType: targetPlot }));
      if (['umap', 'tsne', 'dotplot', 'pseudotime'].includes(targetPlot)) setPlotGroupTab('sc');
      else if (['dose-response', 'survival', 'forest', 'roc', 'correlation'].includes(targetPlot))
        setPlotGroupTab('clinical');
      else setPlotGroupTab('de');
    }

    if (targetPlot === 'dotplot') {
      const rows = parseDotPlotRows(table);
      if (rows.length) {
        setDotPlotRows(rows);
        setDeSourceFile(fileName);
        setUploadBanner(`Loaded ${rows.length} marker × cluster entries from ${fileName}.`);
      }
    } else if (targetPlot === 'upset') {
      const items = parseUpSetRows(table);
      if (items.length) {
        setUpsetItems(items);
        setDeSourceFile(fileName);
        setUploadBanner(`Loaded ${items.length} set-membership items from ${fileName}.`);
      }
    } else if (targetPlot === 'lollipop') {
      const rows = parsePathwayRows(table);
      if (rows.length) {
        setPathwayRows(rows);
        setDeSourceFile(fileName);
        setUploadBanner(`Loaded ${rows.length} enriched pathways from ${fileName}.`);
      }
    } else if (targetPlot === 'umap' || targetPlot === 'tsne') {
      const parsed = parseEmbeddingRows(table);
      if (parsed.cells.length) {
        setEmbeddingCells(parsed.cells);
        if (parsed.markers.length) setEmbeddingMarkers(parsed.markers);
        setEmbeddingColorBy('cluster');
        setDeSourceFile(fileName);
        setUploadBanner(`Loaded ${parsed.cells.length} single cells from ${fileName}.`);
      }
    } else if (targetPlot === 'pca') {
      const rows = parsePCARows(table);
      if (rows.length) {
        setPcaData((p) => ({ ...p, rows }));
        setDeSourceFile(fileName);
        setUploadBanner(`Loaded ${rows.length} PCA samples from ${fileName}.`);
      }
    } else if (targetPlot === 'heatmap') {
      const hm = parseHeatmapMatrix(table);
      if (hm) {
        setDegHeatmap(hm);
        setDeSourceFile(fileName);
        setUploadBanner(`Loaded ${hm.genes.length} genes × ${hm.samples.length} samples from ${fileName} (row z-scored).`);
      }
    } else if (targetPlot === 'pseudotime') {
      const pt = parsePseudotimeRows(table);
      if (pt) {
        setPseudotime(pt);
        setDeSourceFile(fileName);
        setUploadBanner(`Smoothed ${pt.series.length} gene trajectories along pseudotime from ${fileName}.`);
      }
    } else if (targetPlot === 'dose-response') {
      const pts = parseDoseResponseRows(table);
      if (pts.length) {
        setDosePoints(pts);
        setDeSourceFile(fileName);
        setUploadBanner(`Fitted 4PL dose-response curve on ${pts.length} measurements from ${fileName}.`);
      }
    } else if (targetPlot === 'survival') {
      const rows = parseSurvivalRows(table);
      if (rows.length) {
        setSurvivalRows(rows);
        setDeSourceFile(fileName);
        setUploadBanner(`Computed Kaplan–Meier & Log-Rank test on ${rows.length} subjects from ${fileName}.`);
      }
    } else if (targetPlot === 'forest') {
      const rows = parseForestRows(table);
      if (rows.length) {
        setForestRows(rows);
        setDeSourceFile(fileName);
        setUploadBanner(`Loaded ${rows.length} hazard/odds ratios from ${fileName}.`);
      }
    } else if (targetPlot === 'roc') {
      const rows = parseROCRows(table);
      if (rows.length) {
        setRocRows(rows);
        setDeSourceFile(fileName);
        setUploadBanner(`Computed ROC/AUROC on ${rows.length} observations from ${fileName}.`);
      }
    } else if (targetPlot === 'correlation') {
      const rows = parsePairXYRows(table);
      if (rows.length) {
        setCorrRows(rows);
        setDeSourceFile(fileName);
        setUploadBanner(`Computed Pearson/Spearman & Bland–Altman on ${rows.length} pairs from ${fileName}.`);
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
        setDeSourceFile(fileName);
        setDeConfig((prev) => ({
          ...prev,
          title: `${fileName.replace(/\.(csv|tsv|txt)$/i, '')}`,
          labeledGenes: autoTop,
          labelOffsets: {},
        }));
        setUploadBanner(
          `Detected ${parsed.detectedTool} format · Loaded ${parsed.rows.length} genes from ${fileName}.`
        );
      }
    }
    playAppleTick(soundEnabled, 'commit');
  };

  const handleFileIngest = async (file: File) => {
    const text = await file.text();
    ingestCsvText(text, file.name);
  };

  const generatedCode = useMemo(() => {
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
                  Auto-detects DESeq2, edgeR, limma, Scanpy, Seurat, GSEA, or tidy experimental CSV tables.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Apple Translucent Toolbar */}
        <header className="sticky top-0 z-30 material-toolbar">
          <div className="max-w-[1460px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0A84FF] via-[#5E5CE6] to-[#30D158] flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
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
                value={studio}
                onChange={setStudio}
                soundEnabled={soundEnabled}
                options={[
                  {
                    value: 'plotter',
                    label: 'DE & Single-Cell',
                    icon: <Activity className="w-3.5 h-3.5" />,
                  },
                  {
                    value: 'gallery',
                    label: '20 Journal Figures',
                    icon: <Grid2x2 className="w-3.5 h-3.5" />,
                  },
                  {
                    value: 'stats',
                    label: 'Stat Advisor & Anti-Barplot',
                    icon: <FlaskConical className="w-3.5 h-3.5" />,
                  },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileIngest(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onPointerDown={() => {
                  setCsvGuideOpen(true);
                  playAppleTick(soundEnabled, 'select');
                }}
                className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden md:inline">CSV Guide</span>
              </button>

              <button
                type="button"
                onPointerDown={() => fileInputRef.current?.click()}
                className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-primary)]"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload CSV</span>
              </button>

              <button
                type="button"
                onPointerDown={() => {
                  setCodeSheetOpen(true);
                  playAppleTick(soundEnabled, 'select');
                }}
                className="apple-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white shadow-sm"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>R · Python · CLI</span>
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
                { value: 'plotter', label: 'DE & scRNA', icon: <Activity className="w-3.5 h-3.5" /> },
                { value: 'gallery', label: '20 Journals', icon: <Grid2x2 className="w-3.5 h-3.5" /> },
                { value: 'stats', label: 'Stat Advisor', icon: <FlaskConical className="w-3.5 h-3.5" /> },
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
                  Continuous Colormap (12 · Dot Plot)
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
            <AnimatePresence>
              {uploadBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={APPLE_SPRINGS.criticallyDamped}
                  className="rounded-2xl px-4 py-2.5 bg-emerald-500/12 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium">
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    <span>{uploadBanner}</span>
                  </div>
                  <button
                    type="button"
                    onPointerDown={() => setUploadBanner(null)}
                    className="text-[11px] font-semibold opacity-70 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Stage Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="type-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                  {studio === 'plotter'
                    ? 'DE & Single-Cell Publication Plotter'
                    : studio === 'gallery'
                    ? galleryTitles[activeCase.id]?.title ?? activeCase.title
                    : "Biologist's Statistical Advisor & Anti-Barplot Studio"}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 tabular-nums">
                  {studio === 'gallery'
                    ? `${activeCase.category} · ${resolvedTheme.journal.name} (${resolvedTheme.widthMm} mm) · ${resolvedTheme.palette.name}`
                    : `${resolvedTheme.journal.name} (${resolvedTheme.widthMm} mm) · ${resolvedTheme.palette.name} · ${activeStyle.fontFamily} · ${activeStyle.dpi} DPI`}
                </p>
              </div>

              {/* Export Buttons */}
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

                <button
                  type="button"
                  onPointerDown={() => {
                    exportSvgFile(svgRef.current, generatedCode.baseName);
                    playAppleTick(soundEnabled, 'commit');
                  }}
                  className="apple-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] shadow-xs hover:border-[var(--accent)]"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Vector SVG
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
                  Vector PDF
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
                  {activeStyle.dpi} DPI PNG
                </button>
              </div>
            </div>

            {/* Interactive Publication Figure Card (Click any title or axis to edit inline) */}
            <motion.div
              key={`${studio}-${studio === 'plotter' ? deConfig.plotType : studio === 'gallery' ? activeCase.id : statsConfig.plotType}`}
              initial={{ opacity: 0.72, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={APPLE_SPRINGS.criticallyDamped}
              className="relative material-card rounded-3xl p-3 sm:p-5"
              style={
                activeStyle.transparentBg
                  ? {
                      backgroundImage:
                        'repeating-conic-gradient(rgba(128,128,128,0.12) 0% 25%, transparent 0% 50%)',
                      backgroundSize: '16px 16px',
                    }
                  : undefined
              }
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

              {studio === 'gallery' ? (
                <JournalCaseRenderer
                  item={activeCase}
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

            {/* 20 Journal Figures Guide & Attribution Strip */}
            {studio === 'gallery' && (
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
          subtitle="Downloadable templates & 1-click test data for all 16 plot formats"
          soundEnabled={soundEnabled}
        >
          <CsvFormatGuide
            activeKey={studio === 'stats' ? 'stats-tidy' : deConfig.plotType}
            soundEnabled={soundEnabled}
            showSelector
            onTestLoadCsv={(csv, name, key) => {
              ingestCsvText(csv, name, key);
              setCsvGuideOpen(false);
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
