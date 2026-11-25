import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { parseDelimitedText, parseDERows, parseTidyStatsTable } from '../lib/csvParser';
import { analyzeTidyDataset, formatPValue } from '../lib/statsEngine';
import { generateDemoVolcanoData, getStatsDemoPresets } from '../lib/demoData';
import {
  generateDEPythonCode,
  generateDERCode,
  generateStatsPythonCode,
  generateStatsRCode,
} from '../lib/codeGen';
import { renderRaincloudSvgString, renderVolcanoMASvgString } from './svgRenderer';
import type { DEPlotConfig, DEPlotType, JournalPresetId, StatsConfig } from '../types/biograce';

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string | boolean> } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function printHelp(): void {
  console.log(`
BioGrace CLI — Publication DE/Single-Cell Plotter & Biologist's Statistical Test Advisor

USAGE:
  biograce plot <file.csv> [options]     Render Volcano/MA SVG + R/Python scripts from DESeq2/edgeR/limma/Seurat CSV
  biograce stats <file.csv> [options]    Run assumption checks, select optimal test, render Raincloud SVG + report
  biograce demo <volcano|stats> [opts]   Generate instant publication SVG + scripts from built-in biological demos
  biograce deploy                        Build & deploy static BioGrace Studio to GitHub Pages (gh-pages branch)
  biograce help                          Show this help message

PLOT OPTIONS:
  --type <volcano|ma>                    Plot type (default: volcano)
  --preset <nature|cell|science|okabe-ito|viridis|tol-muted>
  --fc <number>                          |log2FC| threshold (default: 1.0)
  --fdr <number>                         Adjusted P-value threshold (default: 0.05)
  --label <GENE1,GENE2,...>              Comma-separated genes to annotate
  --out <path.svg>                       Output SVG path (default: biograce_plot.svg)
  --code-r <path.R>                      Optional reproducible ggplot2 script output
  --code-py <path.py>                    Optional reproducible matplotlib script output

STATS OPTIONS:
  --preset <nature|cell|science|okabe-ito|viridis|tol-muted>
  --paired                               Treat data as matched/paired by Subject column
  --collapse-replicates                  Collapse nested technical replicates to biological replicate means
  --adjust <BH-FDR|Holm|None>            Multiple testing adjustment (default: BH-FDR)
  --out <path.svg>                       Output Raincloud SVG path (default: biograce_raincloud.svg)
  --report <path.json>                   Optional full statistical diagnostic JSON report
  --code-r <path.R>                      Optional reproducible R (rstatix + ggdist) script
  --code-py <path.py>                    Optional reproducible Python (scipy + seaborn) script
`);
}

function writeOut(filePath: string, content: string): void {
  const abs = path.resolve(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  console.log(`  ✓ Wrote ${path.relative(process.cwd(), abs)}`);
}

function runPlot(positional: string[], flags: Record<string, string | boolean>): void {
  const inputFile = positional[0];
  let rows = generateDemoVolcanoData();
  let sourceName = 'demo_ifng_deseq2.csv';

  if (inputFile && inputFile !== 'demo') {
    const raw = fs.readFileSync(path.resolve(process.cwd(), inputFile), 'utf8');
    const parsed = parseDERows(parseDelimitedText(raw));
    rows = parsed.rows;
    sourceName = path.basename(inputFile);
    console.log(`BioGrace Plotter · Parsed ${rows.length} genes (${parsed.detectedTool}) from ${sourceName}`);
  } else {
    console.log(`BioGrace Plotter · Using built-in IFN-γ Macrophage DESeq2 dataset (${rows.length} genes)`);
  }

  const plotType = (String(flags.type || 'volcano') as DEPlotType);
  const preset = (String(flags.preset || 'nature') as JournalPresetId);
  const fcThreshold = Number(flags.fc ?? 1.0);
  const fdrThreshold = Number(flags.fdr ?? 0.05);
  const labeledGenes =
    typeof flags.label === 'string'
      ? flags.label.split(',').map((s) => s.trim()).filter(Boolean)
      : rows
          .filter((r) => r.padj <= fdrThreshold && Math.abs(r.log2FC) >= fcThreshold)
          .sort((a, b) => a.padj - b.padj)
          .slice(0, 8)
          .map((r) => r.gene);

  const config: DEPlotConfig = {
    plotType,
    preset,
    title: String(flags.title || `Differential Expression (${preset.toUpperCase()})`),
    subtitle: '',
    fcThreshold,
    fdrThreshold,
    pointSize: 3.6,
    pointAlpha: 0.85,
    fontSize: 12,
    labeledGenes,
    labelOffsets: {},
    showThresholds: true,
    showGrid: true,
    paperExport: true,
    topAutoLabelCount: 8,
  };

  const svg = renderVolcanoMASvgString(rows, config);
  writeOut(String(flags.out || `biograce_${plotType}.svg`), svg);

  if (typeof flags['code-r'] === 'string') {
    writeOut(flags['code-r'], generateDERCode(config, sourceName));
  }
  if (typeof flags['code-py'] === 'string') {
    writeOut(flags['code-py'], generateDEPythonCode(config, sourceName));
  }
}

function runStats(positional: string[], flags: Record<string, string | boolean>): void {
  const inputFile = positional[0];
  let rows = getStatsDemoPresets()[1].rows;
  let sourceName = 'demo_multidose_viability.csv';
  let yLabel = 'Relative Cell Viability (%)';
  let xLabel = 'Compound Concentration';

  if (inputFile && inputFile !== 'demo') {
    const raw = fs.readFileSync(path.resolve(process.cwd(), inputFile), 'utf8');
    const parsed = parseTidyStatsTable(parseDelimitedText(raw));
    rows = parsed.rows;
    sourceName = path.basename(inputFile);
    xLabel = parsed.groupCol;
    yLabel = parsed.valueCol;
    console.log(`BioGrace Stats · Parsed ${rows.length} tidy rows from ${sourceName}`);
  } else {
    console.log(`BioGrace Stats · Using built-in Multi-Dose Skewed Viability demo (${rows.length} rows)`);
  }

  const preset = (String(flags.preset || 'okabe-ito') as JournalPresetId);
  const isPaired = Boolean(flags.paired);
  const collapsePseudoreplicates = Boolean(flags['collapse-replicates']);
  const correctionMethod = (String(flags.adjust || 'BH-FDR') as 'BH-FDR' | 'Holm' | 'None');

  const analysis = analyzeTidyDataset(rows, {
    isPaired,
    collapsePseudoreplicates,
    correctionMethod,
    alpha: 0.05,
  });

  console.log(`\n  Recommended Protocol : ${analysis.primaryTest}`);
  console.log(`  Normality            : ${analysis.assumptions.normalityDetail}`);
  console.log(`  Variance             : ${analysis.assumptions.varianceDetail}`);
  console.log(
    `  Omnibus Result       : ${analysis.omnibus.testName} (${analysis.omnibus.statisticLabel} = ${analysis.omnibus.statistic.toFixed(2)}, p = ${formatPValue(analysis.omnibus.pValue)})`
  );
  if (analysis.pseudoreplicationWarning) {
    console.log(`  Pseudoreplication    : ${analysis.pseudoreplicationWarning}`);
  }
  console.log('');

  const config: StatsConfig = {
    plotType: 'raincloud',
    preset,
    title: String(flags.title || 'BioGrace Anti-Barplot Raincloud Summary'),
    yLabel,
    xLabel,
    isPaired,
    collapsePseudoreplicates,
    correctionMethod,
    alpha: 0.05,
    showSignificanceBrackets: true,
    showMeanDiamond: true,
    showRawPoints: true,
    paperExport: true,
  };

  writeOut(String(flags.out || 'biograce_raincloud.svg'), renderRaincloudSvgString(analysis, config));

  if (typeof flags.report === 'string') {
    writeOut(flags.report, JSON.stringify(analysis, null, 2));
  }
  if (typeof flags['code-r'] === 'string') {
    writeOut(flags['code-r'], generateStatsRCode(config, analysis, sourceName));
  }
  if (typeof flags['code-py'] === 'string') {
    writeOut(flags['code-py'], generateStatsPythonCode(config, analysis, sourceName));
  }
}

function runDeploy(): void {
  console.log('BioGrace Deploy · Building production bundle for GitHub Pages...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('BioGrace Deploy · Publishing dist/ to gh-pages branch...');
  execSync('npx gh-pages -d dist', { stdio: 'inherit' });
  console.log('  ✓ Deployed! Enable GitHub Pages (branch: gh-pages) in your repository settings.');
}

const [cmd, ...rest] = process.argv.slice(2);
const { positional, flags } = parseFlags(rest);

switch (cmd) {
  case 'plot':
    runPlot(positional, flags);
    break;
  case 'stats':
    runStats(positional, flags);
    break;
  case 'demo':
    if (positional[0] === 'stats') runStats(['demo'], flags);
    else runPlot(['demo'], flags);
    break;
  case 'deploy':
    runDeploy();
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: "${cmd}". Run "biograce help" for usage.`);
    process.exit(1);
}
