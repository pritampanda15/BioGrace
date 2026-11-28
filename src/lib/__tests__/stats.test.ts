import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  adjustPValues,
  analyzeTidyDataset,
  brownForsytheLevene,
  kruskalWallis,
  mannWhitneyU,
  pairedTTest,
  shapiroWilk,
  welchTTest,
} from '../statsEngine';
import {
  computeCorrelationBlandAltman,
  computeKaplanMeier,
  computeROCCurves,
  fitDoseResponse4PL,
} from '../bioAnalytics';
import { detectBestPlotForCsv, parseDelimitedText } from '../csvParser';
import {
  analyzeTimeCourse,
  calculateSampleSizeAndPower,
  computeQpcrDeltaDeltaCt,
  DEMO_ELISA_STANDARDS,
  DEMO_ELISA_UNKNOWNS,
  DEMO_FACTORIAL_ROWS,
  DEMO_KINETICS_POINTS,
  DEMO_QPCR_ROWS,
  DEMO_TIMECOURSE_ROWS,
  fitElisaStandardCurve,
  fitMichaelisMenten,
  runTwoWayAnova,
} from '../workbenchAnalytics';
import { encodeRgbaToTiff } from '../exporters';
import { detectJournalCaseForCsv } from '../journalCasesDataParser';
import { runPreflightAudit } from '../preflight';

describe('BioGrace Statistical Engine (Cross-checked against R / SciPy)', () => {
  it('Welch t-test matches R t.test(..., var.equal = FALSE)', () => {
    const a = [10, 12, 11, 13, 12, 11];
    const b = [16, 18, 21, 19, 17, 22];
    const res = welchTTest(a, b);
    // Exact Welch: meanDiff = 7.3333, SE = sqrt((1.1 + 5.3667)/6) = 1.03816, t = 7.064, df = 6.99
    expect(Math.abs(res.t)).toBeCloseTo(7.064, 2);
    expect(res.df).toBeCloseTo(6.99, 1);
    expect(res.p).toBeLessThan(0.001);
    expect(res.hedgesG).toBeGreaterThan(3.0);
  });

  it('Paired t-test removes baseline subject variance', () => {
    const pre = [10, 20, 30, 40, 50, 60];
    const post = [14, 25, 34, 46, 55, 64];
    const res = pairedTTest(pre, post);
    expect(res.meanDiff).toBeCloseTo(4.667, 2);
    expect(res.df).toBe(5);
    expect(res.p).toBeLessThan(0.0005);
  });

  it('Shapiro-Wilk distinguishes Gaussian vs bimodal distributions', () => {
    const normal = [44.2, 46.8, 48.1, 49.5, 50.1, 50.9, 51.8, 53.2, 55.6];
    const bimodal = [10, 11, 10.5, 12, 11.2, 10.8, 90, 91, 89.5, 92, 90.2, 91.1];
    expect(shapiroWilk(normal).p).toBeGreaterThan(0.2);
    expect(shapiroWilk(bimodal).p).toBeLessThan(0.005);
  });

  it('Brown-Forsythe Levene detects unequal variances', () => {
    const tight = [10, 10.1, 9.9, 10.2, 9.8, 10.0, 10.1, 9.9];
    const wide = [1, 20, 2, 19, 3, 18, 0, 22];
    const lev = brownForsytheLevene([tight, wide]);
    expect(lev.p).toBeLessThan(0.001);
  });

  it('Mann-Whitney U and Kruskal-Wallis separate shifted rank distributions', () => {
    const g1 = [1, 2, 3, 4, 5, 6];
    const g2 = [11, 12, 13, 14, 15, 16];
    const g3 = [21, 22, 23, 24, 25, 26];
    const mw = mannWhitneyU(g1, g2);
    expect(mw.U).toBe(0);
    expect(mw.p).toBeLessThan(0.01);
    expect(mw.cliffsDelta).toBeCloseTo(1.0, 3);

    const kw = kruskalWallis([g1, g2, g3]);
    expect(kw.H).toBeGreaterThan(14);
    expect(kw.p).toBeLessThan(0.001);
  });

  it('Benjamini-Hochberg FDR and Holm match R p.adjust exactly', () => {
    const raw = [0.001, 0.01, 0.04, 0.2];
    const bh = adjustPValues(raw, 'BH-FDR');
    expect(bh[0]).toBeCloseTo(0.004, 5);
    expect(bh[1]).toBeCloseTo(0.02, 5);
    expect(bh[2]).toBeCloseTo(0.05333, 4);
    expect(bh[3]).toBeCloseTo(0.2, 5);

    const holm = adjustPValues(raw, 'Holm');
    expect(holm[0]).toBeCloseTo(0.004, 5);
    expect(holm[1]).toBeCloseTo(0.03, 5);
    expect(holm[2]).toBeCloseTo(0.08, 5);
    expect(holm[3]).toBeCloseTo(0.2, 5);
  });

  it('Pseudoreplication guard flags nested technical wells and collapses to biological N', () => {
    const rows = [
      { group: 'WT', value: 1.0, replicate: 'M1' },
      { group: 'WT', value: 1.02, replicate: 'M1' },
      { group: 'WT', value: 0.9, replicate: 'M2' },
      { group: 'WT', value: 0.92, replicate: 'M2' },
      { group: 'WT', value: 1.1, replicate: 'M3' },
      { group: 'WT', value: 1.08, replicate: 'M3' },
      { group: 'KO', value: 2.0, replicate: 'M4' },
      { group: 'KO', value: 2.04, replicate: 'M4' },
      { group: 'KO', value: 1.9, replicate: 'M5' },
      { group: 'KO', value: 1.92, replicate: 'M5' },
      { group: 'KO', value: 2.1, replicate: 'M6' },
      { group: 'KO', value: 2.08, replicate: 'M6' },
    ];
    const flagged = analyzeTidyDataset(rows, {
      isPaired: false,
      collapsePseudoreplicates: false,
      correctionMethod: 'BH-FDR',
      alpha: 0.05,
    });
    expect(flagged.pseudoreplicationDetected).toBe(true);
    expect(flagged.effectiveBioN).toBe(6);

    const collapsed = analyzeTidyDataset(rows, {
      isPaired: false,
      collapsePseudoreplicates: true,
      correctionMethod: 'BH-FDR',
      alpha: 0.05,
    });
    expect(collapsed.collapsedReplicates).toBe(true);
    expect(collapsed.totalN).toBe(6);
  });
});

describe('BioGrace Assay & Clinical Analytics', () => {
  it('4PL Hill dose-response fitter recovers synthetic IC50 & Hill slope accurately', () => {
    const trueIc50 = 0.05;
    const trueHill = 1.3;
    const concs = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0, 3.0, 10.0];
    const pts = concs.map((c) => ({
      compound: 'TestDrug',
      conc: c,
      response: 5 + 95 / (1 + Math.pow(c / trueIc50, trueHill)),
    }));
    const fit = fitDoseResponse4PL('TestDrug', pts);
    expect(fit.ic50).toBeCloseTo(trueIc50, 2);
    expect(fit.hillSlope).toBeCloseTo(trueHill, 1);
    expect(fit.rSquared).toBeGreaterThan(0.999);
  });

  it('Kaplan-Meier computes exact survival steps and Log-Rank significance', () => {
    const rows = [
      { group: 'A', time: 2, event: 1 as const },
      { group: 'A', time: 4, event: 1 as const },
      { group: 'A', time: 6, event: 1 as const },
      { group: 'A', time: 8, event: 1 as const },
      { group: 'B', time: 20, event: 0 as const },
      { group: 'B', time: 24, event: 0 as const },
      { group: 'B', time: 28, event: 1 as const },
      { group: 'B', time: 32, event: 0 as const },
    ];
    const km = computeKaplanMeier(rows);
    expect(km.arms[0].medianSurvival).toBe(4);
    expect(km.logRankP).toBeLessThan(0.01);
  });

  it('ROC computes AUROC = 1.0 for perfect separation', () => {
    const rows = [
      { model: 'Perfect', label: 0 as const, score: 0.1 },
      { model: 'Perfect', label: 0 as const, score: 0.2 },
      { model: 'Perfect', label: 0 as const, score: 0.3 },
      { model: 'Perfect', label: 1 as const, score: 0.7 },
      { model: 'Perfect', label: 1 as const, score: 0.8 },
      { model: 'Perfect', label: 1 as const, score: 0.9 },
    ];
    const [res] = computeROCCurves(rows);
    expect(res.auc).toBeCloseTo(1.0, 4);
    expect(res.youdenJ).toBeCloseTo(1.0, 4);
  });

  it('Correlation & Bland-Altman detect systematic bias despite r = 1.0', () => {
    const rows = [1, 2, 3, 4, 5, 6].map((x, i) => ({ id: `S${i}`, x, y: x + 2.5 }));
    const res = computeCorrelationBlandAltman(rows);
    expect(res.pearsonR).toBeCloseTo(1.0, 4);
    expect(res.bias).toBeCloseTo(2.5, 4);
    expect(res.sdDiff).toBeCloseTo(0, 4);
  });
});

describe('Smart CSV Auto-Plot Routing on examples/', () => {
  const examplesDir = path.resolve(process.cwd(), 'examples');
  const checks: [string, string][] = [
    ['test_volcano_p53_response.csv', 'volcano'],
    ['test_ic50_egfr_inhibitors.csv', 'dose-response'],
    ['test_kaplan_meier_trial.csv', 'survival'],
    ['test_scrna_umap.csv', 'umap'],
    ['test_wetlab_qpcr_stats.csv', 'stats-tidy'],
  ];

  for (const [file, expected] of checks) {
    it(`auto-routes ${file} -> ${expected}`, () => {
      const text = fs.readFileSync(path.join(examplesDir, file), 'utf8');
      const table = parseDelimitedText(text);
      expect(detectBestPlotForCsv(table, 'volcano', 'plotter')).toBe(expected);
    });
  }
});

describe('BioGrace v2.0 Complete Suite Analytics, Preflight & TIFF', () => {
  it('Sample Size & Power Calculator matches R pwr.t.test (d=0.8, 80% power -> n~26/group)', () => {
    const res = calculateSampleSizeAndPower({
      design: 'two-sample',
      effectSize: 0.8,
      alpha: 0.05,
      targetPower: 0.8,
    });
    expect(res.requiredPerGroup).toBeGreaterThanOrEqual(25);
    expect(res.requiredPerGroup).toBeLessThanOrEqual(27);
    expect(res.requiredTotal).toBe(res.requiredPerGroup * 2);
    expect(res.grantParagraph).toContain('80%');

    const surv = calculateSampleSizeAndPower({
      design: 'survival',
      effectSize: 0.5,
      alpha: 0.05,
      targetPower: 0.8,
      eventRate: 0.7,
    });
    expect(surv.requiredEvents).toBeGreaterThanOrEqual(60);
    expect(surv.requiredEvents).toBeLessThanOrEqual(72);
  });

  it('Two-Way Factorial ANOVA detects strong Genotype x Treatment interaction', () => {
    const res = runTwoWayAnova(DEMO_FACTORIAL_ROWS);
    const inter = res.table.find((r) => r.source.includes('Interaction'))!;
    expect(inter.f).toBeGreaterThan(100);
    expect(inter.p).toBeLessThan(1e-6);
  });

  it('Longitudinal Time-Course computes AUC separation & per-day BH-FDR stars', () => {
    const res = analyzeTimeCourse(DEMO_TIMECOURSE_ROWS);
    expect(res.series).toHaveLength(2);
    expect(res.series[0].auc).toBeGreaterThan(res.series[1].auc * 2);
    const lastDay = res.perTimepointP[res.perTimepointP.length - 1];
    expect(lastDay.pAdj).toBeLessThan(0.01);
    expect(lastDay.stars).toMatch(/^\*+$/);
  });

  it('qPCR ΔΔCt normalizes control to ~1.0x and recovers high-dose induction', () => {
    const res = computeQpcrDeltaDeltaCt(DEMO_QPCR_ROWS, 'Control');
    const ctrlMean =
      res.results.filter((r) => r.group === 'Control').reduce((a, r) => a + r.foldChange, 0) / 4;
    const highMean =
      res.results.filter((r) => r.group === 'High_Dose').reduce((a, r) => a + r.foldChange, 0) / 4;
    expect(ctrlMean).toBeCloseTo(1.0, 1);
    expect(highMean).toBeGreaterThan(8);
    expect(res.tidyCsv).toContain('group,value,subject');
  });

  it('ELISA 4PL standard curve & Michaelis-Menten kinetics achieve R^2 > 0.99', () => {
    const elisa = fitElisaStandardCurve(DEMO_ELISA_STANDARDS, DEMO_ELISA_UNKNOWNS);
    expect(elisa.r2).toBeGreaterThan(0.99);
    const oor = elisa.unknowns.find((u) => u.sample === 'High_Outlier');
    expect(oor?.qcFlag).toBe('Out of Range');

    const kin = fitMichaelisMenten(DEMO_KINETICS_POINTS);
    expect(kin.r2).toBeGreaterThan(0.995);
    expect(kin.vmax).toBeGreaterThan(95);
    expect(kin.vmax).toBeLessThan(112);
    expect(kin.km).toBeGreaterThan(10);
    expect(kin.km).toBeLessThan(18);
  });

  it('Baseline 32-bit RGBA 600 DPI TIFF encoder produces valid TIFF 6.0 binary', () => {
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255, 0, 255, 0, 128,
      0, 0, 255, 0, 255, 255, 255, 255,
    ]);
    const tiff = encodeRgbaToTiff(rgba, 2, 2, 600);
    const view = new DataView(tiff.buffer);
    // "II" little-endian magic + 42
    expect(tiff[0]).toBe(0x49);
    expect(tiff[1]).toBe(0x49);
    expect(view.getUint16(2, true)).toBe(42);
    expect(view.getUint16(8, true)).toBe(13); // 13 IFD entries
    // Last 16 bytes match RGBA pixel payload verbatim
    expect(Array.from(tiff.slice(tiff.length - 16))).toEqual(Array.from(rgba));
  });

  it('Journal Submission Preflight Guard flags tiny fonts and passes Nature-compliant settings', () => {
    const good = runPreflightAudit(
      {
        preset: 'nature',
        palette: 'okabe-ito',
        colormap: 'RdYlBu_r',
        fontFamily: 'sans-serif',
        fontSizePt: 8,
        lineWidth: 1.0,
        columnWidth: 'double',
        dpi: 600,
        transparentBg: false,
        paperExport: true,
      },
      false
    );
    expect(good.failCount).toBe(0);
    expect(good.warnCount).toBe(0);

    const bad = runPreflightAudit(
      {
        preset: 'cell',
        palette: 'nature-npg',
        colormap: 'RdYlBu_r',
        fontFamily: 'sans-serif',
        fontSizePt: 4.5,
        lineWidth: 0.3,
        columnWidth: 'single',
        dpi: 300,
        transparentBg: false,
        paperExport: false,
      },
      true
    );
    expect(bad.failCount).toBeGreaterThanOrEqual(1);
    expect(bad.warnCount).toBeGreaterThanOrEqual(2);
  });

  it('Auto-detects 20 Journal Figures CSV schemas in examples/journal_cases/', () => {
    const jDir = path.resolve(process.cwd(), 'examples', 'journal_cases');
    const samples: [string, string][] = [
      ['04_manhattan_twas.csv', '04-manhattan-twas'],
      ['07_clinical_swimmer.csv', '07-swimmer'],
      ['10_circos_fusions.csv', '10-circos-fusion'],
      ['14_mantel_composite.csv', '14-mantel-composite'],
      ['18_pathway_treemap.csv', '18-treemap'],
      ['20_split_violin_markers.csv', '20-split-violin'],
    ];
    for (const [fname, expected] of samples) {
      const table = parseDelimitedText(fs.readFileSync(path.join(jDir, fname), 'utf8'));
      expect(detectJournalCaseForCsv(table)).toBe(expected);
    }
  });
});
