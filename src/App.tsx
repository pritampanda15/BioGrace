import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Check,
  Code2,
  Copy,
  Download,
  FileCode2,
  FileSpreadsheet,
  FlaskConical,
  Image as ImageIcon,
  Layers,
  Moon,
  Search,
  Sparkles,
  Sun,
  Terminal,
  Upload,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import type {
  DEPlotConfig,
  DEPlotType,
  DotPlotRow,
  JournalPresetId,
  PathwayRow,
  StatsConfig,
  StatsPlotType,
  StudioMode,
  TidyStatRow,
  UpSetItem,
  VolcanoRow,
} from './types/biograce';
import { JOURNAL_PRESET_LIST, JOURNAL_PRESETS } from './lib/palettes';
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
  parseDotPlotRows,
  parsePathwayRows,
  parseTidyStatsTable,
  parseUpSetRows,
} from './lib/csvParser';
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
import { VolcanoMAPlot } from './components/plots/VolcanoMAPlot';
import { DotPlotChart } from './components/plots/DotPlotChart';
import { UpSetPlot } from './components/plots/UpSetPlot';
import { PathwayLollipopPlot } from './components/plots/PathwayLollipopPlot';
import { AntiBarplotCanvas } from './components/plots/AntiBarplotCanvas';
import { StatAdvisorPanel } from './components/stats/StatAdvisorPanel';

export function App() {
  const [studio, setStudio] = useState<StudioMode>('plotter');
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [codeSheetOpen, setCodeSheetOpen] = useState(false);
  const [codeTab, setCodeTab] = useState<'r' | 'python' | 'cli'>('r');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [uploadBanner, setUploadBanner] = useState<string | null>(null);
  const [geneQuery, setGeneQuery] = useState('');

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
  const [deSourceFile, setDeSourceFile] = useState('ifng_macrophage_deseq2.csv');

  const [deConfig, setDeConfig] = useState<DEPlotConfig>({
    plotType: 'volcano',
    preset: 'nature',
    title: 'IFN-γ Stimulated Macrophages vs. Control',
    subtitle: '',
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
    paperExport: true,
    topAutoLabelCount: 8,
  });

  // ---------------- Studio 2 State (Stats & Anti-Barplot) ----------------
  const statsDemos = useMemo(() => getStatsDemoPresets(), []);
  const [activeStatsDemoId, setActiveStatsDemoId] = useState(statsDemos[0].id);
  const [statsRows, setStatsRows] = useState<TidyStatRow[]>(() => statsDemos[0].rows);
  const [statsSourceFile, setStatsSourceFile] = useState('bimodal_responder_assay.csv');

  const [statsConfig, setStatsConfig] = useState<StatsConfig>({
    plotType: 'raincloud',
    preset: 'okabe-ito',
    title: statsDemos[0].name,
    yLabel: statsDemos[0].yLabel,
    xLabel: statsDemos[0].xLabel,
    isPaired: statsDemos[0].isPaired,
    collapsePseudoreplicates: false,
    correctionMethod: 'BH-FDR',
    alpha: 0.05,
    showSignificanceBrackets: true,
    showMeanDiamond: true,
    showRawPoints: true,
    paperExport: true,
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

  const handleFileIngest = async (file: File) => {
    const text = await file.text();
    const table = parseDelimitedText(text);
    if (table.rows.length === 0) {
      setUploadBanner('Could not parse any rows from that file — check that it has a CSV or TSV header.');
      return;
    }

    if (studio === 'stats') {
      const parsed = parseTidyStatsTable(table);
      if (parsed.rows.length > 0) {
        setStatsRows(parsed.rows);
        setStatsSourceFile(file.name);
        setActiveStatsDemoId('custom');
        setStatsConfig((prev) => ({
          ...prev,
          title: file.name.replace(/\.(csv|tsv|txt)$/i, ''),
          xLabel: parsed.groupCol,
          yLabel: parsed.valueCol,
          isPaired: Boolean(parsed.subjectCol && !parsed.replicateCol),
          collapsePseudoreplicates: false,
        }));
        setUploadBanner(
          `Loaded ${parsed.rows.length} rows from ${file.name} (Group: ${parsed.groupCol}, Value: ${parsed.valueCol}).`
        );
        playAppleTick(soundEnabled, 'commit');
      }
      return;
    }

    // Studio 1 smart routing by current plot type
    if (deConfig.plotType === 'dotplot') {
      const rows = parseDotPlotRows(table);
      if (rows.length) {
        setDotPlotRows(rows);
        setDeSourceFile(file.name);
        setUploadBanner(`Loaded ${rows.length} marker × cluster entries from ${file.name}.`);
      }
    } else if (deConfig.plotType === 'upset') {
      const items = parseUpSetRows(table);
      if (items.length) {
        setUpsetItems(items);
        setDeSourceFile(file.name);
        setUploadBanner(`Loaded ${items.length} set-membership items from ${file.name}.`);
      }
    } else if (deConfig.plotType === 'lollipop') {
      const rows = parsePathwayRows(table);
      if (rows.length) {
        setPathwayRows(rows);
        setDeSourceFile(file.name);
        setUploadBanner(`Loaded ${rows.length} enriched pathways from ${file.name}.`);
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
        setDeSourceFile(file.name);
        setDeConfig((prev) => ({
          ...prev,
          title: `${file.name.replace(/\.(csv|tsv|txt)$/i, '')} (${parsed.detectedTool})`,
          labeledGenes: autoTop,
          labelOffsets: {},
        }));
        setUploadBanner(
          `Detected ${parsed.detectedTool} format · Loaded ${parsed.rows.length} genes from ${file.name}.`
        );
      }
    }
    playAppleTick(soundEnabled, 'commit');
  };

  // Code outputs synced live with current studio & parameters
  const generatedCode = useMemo(() => {
    if (studio === 'plotter') {
      return {
        r: generateDERCode(deConfig, deSourceFile),
        python: generateDEPythonCode(deConfig, deSourceFile),
        cli: generateDECliCommand(deConfig, deSourceFile),
        baseName: `biograce_${deConfig.plotType}`,
      };
    }
    return {
      r: generateStatsRCode(statsConfig, statsAnalysis, statsSourceFile),
      python: generateStatsPythonCode(statsConfig, statsAnalysis, statsSourceFile),
      cli: generateStatsCliCommand(statsConfig, statsSourceFile),
      baseName: `biograce_${statsConfig.plotType}`,
    };
  }, [studio, deConfig, deSourceFile, statsConfig, statsAnalysis, statsSourceFile]);

  const handleCopy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    playAppleTick(soundEnabled, 'commit');
    setTimeout(() => setCopiedKey(null), 1600);
  };

  const filteredGeneSuggestions = useMemo(() => {
    if (!geneQuery.trim()) return [];
    const q = geneQuery.toLowerCase();
    return volcanoRows
      .filter((r) => r.gene.toLowerCase().includes(q))
      .slice(0, 6);
  }, [geneQuery, volcanoRows]);

  const activePresetId = studio === 'plotter' ? deConfig.preset : statsConfig.preset;
  const setPresetId = (id: JournalPresetId) => {
    if (studio === 'plotter') setDeConfig((p) => ({ ...p, preset: id }));
    else setStatsConfig((p) => ({ ...p, preset: id }));
    playAppleTick(soundEnabled, 'select');
  };

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
        {/* Drag-and-drop Translucent Overlay */}
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

        {/* Floating Apple Translucent Toolbar (§12) */}
        <header className="sticky top-0 z-30 material-toolbar">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            {/* Brand Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0A84FF] via-[#5E5CE6] to-[#30D158] flex items-center justify-center shadow-sm shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="type-title text-base font-bold tracking-tight">BioGrace</span>
                  <span className="hidden md:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    Publication Studio
                  </span>
                </div>
                <p className="hidden sm:block text-[11px] text-[var(--text-tertiary)] truncate">
                  Zero-friction figures, honest statistics &amp; reproducible R / Python / CLI
                </p>
              </div>
            </div>

            {/* Primary Studio Switcher (Wayfinding §16) */}
            <div className="hidden lg:block">
              <AppleSegmentedControl<StudioMode>
                layoutId="studio-nav-pill"
                value={studio}
                onChange={setStudio}
                soundEnabled={soundEnabled}
                options={[
                  {
                    value: 'plotter',
                    label: 'DE & Single-Cell Plotter',
                    icon: <Activity className="w-3.5 h-3.5" />,
                  },
                  {
                    value: 'stats',
                    label: 'Stat Advisor & Anti-Barplot',
                    icon: <FlaskConical className="w-3.5 h-3.5" />,
                  },
                ]}
              />
            </div>

            {/* Action Cluster */}
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

          {/* Mobile/Tablet Studio Switcher */}
          <div className="lg:hidden px-4 pb-3">
            <AppleSegmentedControl<StudioMode>
              layoutId="studio-nav-pill-mobile"
              value={studio}
              onChange={setStudio}
              soundEnabled={soundEnabled}
              fullWidth
              size="sm"
              options={[
                { value: 'plotter', label: 'DE & Single-Cell', icon: <Activity className="w-3.5 h-3.5" /> },
                { value: 'stats', label: 'Stat Advisor & Anti-Barplot', icon: <FlaskConical className="w-3.5 h-3.5" /> },
              ]}
            />
          </div>
        </header>

        {/* Main Workbench Layout */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 grid grid-cols-1 lg:grid-cols-[336px_minmax(0,1fr)] gap-6 items-start">
          {/* LEFT INSPECTOR SIDEBAR (Heavier Translucent Material §12) */}
          <aside className="material-sidebar rounded-3xl border p-5 space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6.2rem)] lg:overflow-y-auto scroll-mask-y">
            {studio === 'plotter' ? (
              <>
                {/* Plot Type Selector */}
                <div>
                  <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)] block mb-2">
                    Publication Plot Type
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'volcano', label: 'Volcano Plot' },
                        { id: 'ma', label: 'MA Plot' },
                        { id: 'dotplot', label: 'scRNA Dot Plot' },
                        { id: 'upset', label: 'DEG UpSet' },
                        { id: 'lollipop', label: 'Pathway Lollipop' },
                      ] as { id: DEPlotType; label: string }[]
                    ).map((item) => {
                      const active = deConfig.plotType === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onPointerDown={() => {
                            setDeConfig((p) => ({
                              ...p,
                              plotType: item.id,
                              title:
                                item.id === 'volcano'
                                  ? 'IFN-γ Stimulated Macrophages vs. Control'
                                  : item.id === 'ma'
                                  ? 'Expression Abundance vs. Fold Change (MA)'
                                  : item.id === 'dotplot'
                                  ? 'PBMC Canonical Lineage Markers'
                                  : item.id === 'upset'
                                  ? 'Cytokine-Responsive DEG Intersections'
                                  : 'GSEA Hallmark Pathway Enrichment',
                            }));
                            playAppleTick(soundEnabled, 'select');
                          }}
                          className={`apple-press px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors border ${
                            item.id === 'lollipop' ? 'col-span-2' : ''
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

                {/* Threshold Sliders (Volcano / MA) */}
                {(deConfig.plotType === 'volcano' || deConfig.plotType === 'ma') && (
                  <div className="space-y-4 pt-1 border-t border-[var(--border-hairline)]">
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
                        <span className="font-semibold text-[var(--text-primary)]">
                          {deConfig.fdrThreshold}
                        </span>
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

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 tabular-nums">
                        <span className="font-medium text-[var(--text-secondary)]">Point Size</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {deConfig.pointSize.toFixed(1)} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={6.5}
                        step={0.2}
                        value={deConfig.pointSize}
                        onChange={(e) =>
                          setDeConfig((p) => ({ ...p, pointSize: Number(e.target.value) }))
                        }
                        className="apple-slider"
                      />
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
                      <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                        Tip: Click any dot on the plot to toggle its label, or drag any gene label directly to reposition it.
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Studio 2 Inspector: Wet-Lab Demo Datasets */}
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

                {/* Study Design & Multiple Testing Controls */}
                <div className="space-y-3 pt-3 border-t border-[var(--border-hairline)]">
                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span className="font-medium text-[var(--text-primary)]">Paired / Matched Subjects</span>
                    <input
                      type="checkbox"
                      checked={statsConfig.isPaired}
                      onChange={(e) =>
                        setStatsConfig((p) => ({ ...p, isPaired: e.target.checked }))
                      }
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

            {/* Shared Journal Colorblind-Safe Presets */}
            <div className="pt-3 border-t border-[var(--border-hairline)]">
              <div className="flex items-center justify-between mb-2">
                <label className="type-label text-[11px] font-semibold uppercase text-[var(--text-tertiary)]">
                  Journal Colorblind-Safe Presets
                </label>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  CVD Safe
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {JOURNAL_PRESET_LIST.map((preset) => {
                  const active = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onPointerDown={() => setPresetId(preset.id)}
                      className={`apple-press p-2 rounded-xl text-left border transition-colors ${
                        active
                          ? 'bg-[var(--bg-elevated)] border-[var(--accent)] ring-1 ring-[var(--accent)]/30'
                          : 'bg-[var(--bg-elevated)]/55 border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                        {preset.name}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1">
                        {preset.categorical.slice(0, 5).map((hex) => (
                          <span
                            key={hex}
                            className="w-3.5 h-2 rounded-full"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* White Paper Publication Canvas Toggle */}
            <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-secondary)]">Print-Ready White Canvas</span>
              <input
                type="checkbox"
                checked={studio === 'plotter' ? deConfig.paperExport : statsConfig.paperExport}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (studio === 'plotter') setDeConfig((p) => ({ ...p, paperExport: checked }));
                  else setStatsConfig((p) => ({ ...p, paperExport: checked }));
                }}
                className="accent-[var(--accent)] w-4 h-4 rounded"
              />
            </div>
          </aside>

          {/* MAIN STAGE */}
          <section className="space-y-5 min-w-0">
            {/* Upload Confirmation Toast */}
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
                    : "Biologist's Statistical Advisor & Anti-Barplot Studio"}
                </h1>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
                  {studio === 'plotter'
                    ? `Source: ${deSourceFile} · Preset: ${JOURNAL_PRESETS[deConfig.preset].name}`
                    : `Source: ${statsSourceFile} · ${statsAnalysis.primaryTest}`}
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
                    void exportPngFile(svgRef.current, generatedCode.baseName, 3);
                    playAppleTick(soundEnabled, 'commit');
                  }}
                  className="apple-press inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] shadow-xs hover:border-[var(--accent)]"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                  300 DPI PNG
                </button>
              </div>
            </div>

            {/* Interactive Publication Figure Card */}
            <motion.div
              key={`${studio}-${studio === 'plotter' ? deConfig.plotType : statsConfig.plotType}`}
              initial={{ opacity: 0.72, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={APPLE_SPRINGS.criticallyDamped}
              className="material-card rounded-3xl p-3 sm:p-5"
            >
              {studio === 'plotter' ? (
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
                    />
                  )}
                  {deConfig.plotType === 'dotplot' && (
                    <DotPlotChart
                      rows={dotPlotRows}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
                    />
                  )}
                  {deConfig.plotType === 'upset' && (
                    <UpSetPlot
                      items={upsetItems}
                      config={deConfig}
                      darkMode={darkMode}
                      soundEnabled={soundEnabled}
                      svgRef={svgRef}
                    />
                  )}
                  {deConfig.plotType === 'lollipop' && (
                    <PathwayLollipopPlot
                      rows={pathwayRows}
                      config={deConfig}
                      darkMode={darkMode}
                      svgRef={svgRef}
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
                />
              )}
            </motion.div>

            {/* Studio 2 Statistical Advisor Decision Engine Panel */}
            {studio === 'stats' && (
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
            )}

            {/* Studio 1 Inline Reproducibility Preview Strip */}
            {studio === 'plotter' && (
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
                      Every threshold, journal palette, and gene annotation stays synced with R (ggplot2), Python (matplotlib), and <code className="font-mono">biograce</code> CLI.
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
            )}
          </section>
        </main>

        {/* Fluid Right-Edge Reproducible Code & CLI Sheet (Interruptible, Momentum-Projected) */}
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

            {/* GitHub Pages Deployment CLI Quick Reference */}
            <div className="rounded-2xl p-4 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-2">
              <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
                Deploy BioGrace via GitHub Pages CLI
              </div>
              <pre className="p-3 rounded-xl bg-[#111319] text-[#A5D6FF] text-[11px] font-mono overflow-x-auto">
{`# One-command static build & deploy to GitHub Pages
npm run deploy
# Or via the bundled BioGrace CLI
npx biograce deploy`}
              </pre>
            </div>
          </div>
        </FluidSheet>
      </div>
    </MotionConfig>
  );
}

export default App;
