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
