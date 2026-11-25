import { chiSquareUpperP, mean, normalCdf, sd, studentTTwoTailedP } from './statsEngine';

/* ============================================================================
 * 1. 4-Parameter Logistic (4PL) Hill Dose-Response Curve Fitter (IC50 / EC50)
 *    y(c) = bottom + (top - bottom) / (1 + (c / ic50)^hill)
 * ========================================================================== */

export interface DosePoint {
  compound: string;
  conc: number; // positive concentration (e.g. uM or nM)
  response: number; // e.g. % viability (0..100)
}

export interface HillFitResult {
  compound: string;
  bottom: number;
  top: number;
  ic50: number;
  log10Ic50: number;
  hillSlope: number;
  rSquared: number;
  points: DosePoint[];
  curve: { logConc: number; y: number }[];
}

function eval4PL(logC: number, bottom: number, top: number, logIc50: number, hill: number): number {
  const exponent = Math.max(-40, Math.min(40, hill * (logC - logIc50)));
  return bottom + (top - bottom) / (1 + Math.pow(10, exponent));
}

/** Fit 4PL Hill curve via coarse grid + Nelder-Mead-style coordinate refinement */
export function fitDoseResponse4PL(compound: string, points: DosePoint[]): HillFitResult {
  const valid = points.filter((p) => p.conc > 0 && Number.isFinite(p.response));
  const logCs = valid.map((p) => Math.log10(p.conc));
  const ys = valid.map((p) => p.response);
  const minLogC = Math.min(...logCs);
  const maxLogC = Math.max(...logCs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const sse = (b: number, t: number, lc: number, h: number) => {
    let err = 0;
    for (let i = 0; i < valid.length; i++) {
      const pred = eval4PL(logCs[i], b, t, lc, h);
      const diff = ys[i] - pred;
      err += diff * diff;
    }
    return err;
  };

  // Initial coarse search for logIc50 & hillSlope
  let bestB = Math.max(0, minY - 2);
  let bestT = maxY;
  let bestLc = (minLogC + maxLogC) / 2;
  let bestH = 1.0;
  let bestErr = sse(bestB, bestT, bestLc, bestH);

  for (let i = 0; i <= 24; i++) {
    const candLc = minLogC + ((maxLogC - minLogC) * i) / 24;
    for (const candH of [0.5, 0.9, 1.3, 2.0, -1.0]) {
      const e = sse(bestB, bestT, candLc, candH);
      if (e < bestErr) {
        bestErr = e;
        bestLc = candLc;
        bestH = candH;
      }
    }
  }

  // Coordinate-descent polishing with shrinking step sizes
  const steps = [0.4, 0.15, 0.05, 0.015, 0.004];
  for (const s of steps) {
    for (let iter = 0; iter < 6; iter++) {
      // Polish logIc50
      for (const delta of [-s, s]) {
        const e = sse(bestB, bestT, bestLc + delta, bestH);
        if (e < bestErr) {
          bestErr = e;
          bestLc += delta;
        }
      }
      // Polish hillSlope
      for (const delta of [-s * 1.2, s * 1.2]) {
        const nh = bestH + delta;
        if (Math.abs(nh) < 0.15 || Math.abs(nh) > 5) continue;
        const e = sse(bestB, bestT, bestLc, nh);
        if (e < bestErr) {
          bestErr = e;
          bestH = nh;
        }
      }
      // Polish bottom & top
      for (const delta of [-s * 14, s * 14]) {
        const nb = bestB + delta;
        if (nb >= -15 && nb < bestT - 5) {
          const e = sse(nb, bestT, bestLc, bestH);
          if (e < bestErr) {
            bestErr = e;
            bestB = nb;
          }
        }
        const nt = bestT + delta;
        if (nt > bestB + 5 && nt <= maxY + 25) {
          const e = sse(bestB, nt, bestLc, bestH);
          if (e < bestErr) {
            bestErr = e;
            bestT = nt;
          }
        }
      }
    }
  }

  const yMean = mean(ys);
  const sst = ys.reduce((acc, y) => acc + (y - yMean) ** 2, 0);
  const rSquared = sst > 1e-9 ? Math.max(0, 1 - bestErr / sst) : 1;

  const curve: { logConc: number; y: number }[] = [];
  const lo = minLogC - 0.35;
  const hi = maxLogC + 0.35;
  for (let i = 0; i <= 72; i++) {
    const lc = lo + ((hi - lo) * i) / 72;
    curve.push({ logConc: lc, y: eval4PL(lc, bestB, bestT, bestLc, bestH) });
  }

  return {
    compound,
    bottom: bestB,
    top: bestT,
    ic50: Math.pow(10, bestLc),
    log10Ic50: bestLc,
    hillSlope: bestH,
    rSquared,
    points: valid,
    curve,
  };
}

/* ============================================================================
 * 2. Kaplan–Meier Survival Estimator + Greenwood 95% CI + Mantel–Cox Log-Rank
 * ========================================================================== */

export interface SurvivalRow {
  group: string;
  time: number;
  event: 0 | 1; // 1 = event (death/progression), 0 = censored
}

export interface KMCurvePoint {
  time: number;
  survival: number;
  ciLow: number;
  ciHigh: number;
  atRisk: number;
  events: number;
  censored: number;
}

export interface KMArmResult {
  group: string;
  n: number;
  events: number;
  medianSurvival: number | null;
  steps: KMCurvePoint[];
  censoredTicks: { time: number; survival: number }[];
  riskAtTimes: number[];
}

export interface SurvivalAnalysisResult {
  arms: KMArmResult[];
  maxTime: number;
  riskTimes: number[];
  logRankChi2: number;
  logRankP: number;
  df: number;
}

export function computeKaplanMeier(rows: SurvivalRow[]): SurvivalAnalysisResult {
  const groupOrder: string[] = [];
  const byGroup = new Map<string, SurvivalRow[]>();
  for (const r of rows) {
    if (!byGroup.has(r.group)) {
      groupOrder.push(r.group);
      byGroup.set(r.group, []);
    }
    byGroup.get(r.group)!.push(r);
  }

  const maxTime = Math.max(1, ...rows.map((r) => r.time));
  const stepTick = maxTime > 48 ? 12 : maxTime > 20 ? 6 : Math.ceil(maxTime / 5);
  const riskTimes: number[] = [];
  for (let t = 0; t <= maxTime + 0.01; t += stepTick) riskTimes.push(t);

  const arms: KMArmResult[] = groupOrder.map((group) => {
    const items = [...byGroup.get(group)!].sort((a, b) => a.time - b.time);
    const uniqueTimes = [...new Set(items.map((x) => x.time))].sort((a, b) => a - b);

    let atRisk = items.length;
    let surv = 1.0;
    let greenwoodSum = 0;
    let medianSurvival: number | null = null;

    const steps: KMCurvePoint[] = [
      { time: 0, survival: 1, ciLow: 1, ciHigh: 1, atRisk, events: 0, censored: 0 },
    ];
    const censoredTicks: { time: number; survival: number }[] = [];

    for (const t of uniqueTimes) {
      const atT = items.filter((x) => x.time === t);
      const d = atT.filter((x) => x.event === 1).length;
      const c = atT.length - d;

      if (d > 0 && atRisk > 0) {
        const prevSurv = surv;
        surv *= (atRisk - d) / atRisk;
        if (atRisk > d) greenwoodSum += d / (atRisk * (atRisk - d));
        const se = surv * Math.sqrt(greenwoodSum);
        const ciLow = Math.max(0, surv - 1.96 * se);
        const ciHigh = Math.min(1, surv + 1.96 * se);

        if (medianSurvival === null && prevSurv > 0.5 && surv <= 0.5) {
          medianSurvival = t;
        }
        steps.push({ time: t, survival: surv, ciLow, ciHigh, atRisk, events: d, censored: c });
      }
      if (c > 0) {
        censoredTicks.push({ time: t, survival: surv });
      }
      atRisk -= atT.length;
    }

    const lastT = uniqueTimes[uniqueTimes.length - 1] ?? 0;
    if (steps[steps.length - 1].time < lastT) {
      const last = steps[steps.length - 1];
      steps.push({ ...last, time: lastT });
    }

    const riskAtTimes = riskTimes.map((rt) => items.filter((x) => x.time >= rt).length);

    return {
      group,
      n: items.length,
      events: items.filter((x) => x.event === 1).length,
      medianSurvival,
      steps,
      censoredTicks,
      riskAtTimes,
    };
  });

  // Mantel-Cox Log-Rank test (exact 2-arm variance; multi-arm chi-square approximation)
  const allEventTimes = [...new Set(rows.filter((r) => r.event === 1).map((r) => r.time))].sort((a, b) => a - b);
  const k = groupOrder.length;
  const O = new Array<number>(k).fill(0);
  const E = new Array<number>(k).fill(0);
  let var2Arm = 0;

  for (const t of allEventTimes) {
    const ni = groupOrder.map((g) => byGroup.get(g)!.filter((r) => r.time >= t).length);
    const di = groupOrder.map((g) => byGroup.get(g)!.filter((r) => r.time === t && r.event === 1).length);
    const N = ni.reduce((a, b) => a + b, 0);
    const D = di.reduce((a, b) => a + b, 0);
    if (N <= 1 || D === 0) continue;
    for (let i = 0; i < k; i++) {
      O[i] += di[i];
      E[i] += (ni[i] * D) / N;
    }
    if (k === 2) {
      var2Arm += (ni[0] * ni[1] * D * (N - D)) / (N * N * (N - 1));
    }
  }

  const df = Math.max(1, k - 1);
  let logRankChi2 = 0;
  if (k === 2 && var2Arm > 1e-12) {
    logRankChi2 = ((O[0] - E[0]) ** 2) / var2Arm;
  } else {
    for (let i = 0; i < k; i++) {
      if (E[i] > 1e-9) logRankChi2 += ((O[i] - E[i]) ** 2) / E[i];
    }
  }
  const logRankP = chiSquareUpperP(logRankChi2, df);

  return { arms, maxTime, riskTimes, logRankChi2, logRankP, df };
}

/* ============================================================================
 * 3. Exact ROC Curve + Trapezoidal AUROC + Hanley–McNeil 95% CI + Youden J
 * ========================================================================== */

export interface ROCInputRow {
  model: string;
  label: 0 | 1;
  score: number;
}

export interface ROCModelResult {
  model: string;
  auc: number;
  ciLow: number;
  ciHigh: number;
  bestThreshold: number;
  bestFpr: number;
  bestTpr: number;
  youdenJ: number;
  points: { fpr: number; tpr: number; threshold: number }[];
}

export function computeROCCurves(rows: ROCInputRow[]): ROCModelResult[] {
  const models: string[] = [];
  const byModel = new Map<string, ROCInputRow[]>();
  for (const r of rows) {
    if (!byModel.has(r.model)) {
      models.push(r.model);
      byModel.set(r.model, []);
    }
    byModel.get(r.model)!.push(r);
  }

  return models.map((model) => {
    const items = [...byModel.get(model)!].sort((a, b) => b.score - a.score);
    const P = items.filter((x) => x.label === 1).length;
    const N = items.length - P;
    const points: { fpr: number; tpr: number; threshold: number }[] = [
      { fpr: 0, tpr: 0, threshold: Infinity },
    ];
    let tp = 0;
    let fp = 0;
    let bestJ = -1;
    let bestFpr = 0;
    let bestTpr = 0;
    let bestThreshold = 0;

    for (let i = 0; i < items.length; i++) {
      if (items[i].label === 1) tp++;
      else fp++;
      const tpr = P > 0 ? tp / P : 0;
      const fpr = N > 0 ? fp / N : 0;
      points.push({ fpr, tpr, threshold: items[i].score });
      const j = tpr - fpr;
      if (j > bestJ) {
        bestJ = j;
        bestFpr = fpr;
        bestTpr = tpr;
        bestThreshold = items[i].score;
      }
    }

    let auc = 0;
    for (let i = 1; i < points.length; i++) {
      auc += (points[i].fpr - points[i - 1].fpr) * ((points[i].tpr + points[i - 1].tpr) / 2);
    }
    // Hanley & McNeil (1982) standard error for AUROC
    const q1 = auc / (2 - auc);
    const q2 = (2 * auc * auc) / (1 + auc);
    const se =
      P > 0 && N > 0
        ? Math.sqrt((auc * (1 - auc) + (P - 1) * (q1 - auc * auc) + (N - 1) * (q2 - auc * auc)) / (P * N))
        : 0;

    return {
      model,
      auc,
      ciLow: Math.max(0, auc - 1.96 * se),
      ciHigh: Math.min(1, auc + 1.96 * se),
      bestThreshold,
      bestFpr,
      bestTpr,
      youdenJ: bestJ,
      points,
    };
  });
}

/* ============================================================================
 * 4. Correlation (Pearson r, Spearman rho, OLS 95% CI) & Bland–Altman
 * ========================================================================== */

export interface PairXYRow {
  id: string;
  x: number;
  y: number;
  group?: string;
}

export interface CorrelationBAResult {
  n: number;
  pearsonR: number;
  pearsonP: number;
  rSquared: number;
  spearmanRho: number;
  spearmanP: number;
  slope: number;
  intercept: number;
  bias: number;
  sdDiff: number;
  loaUpper: number;
  loaLower: number;
  baPoints: { id: string; avg: number; diff: number; x: number; y: number }[];
}

function rankArray(vals: number[]): number[] {
  const idx = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(vals.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[idx[k].i] = avg;
    i = j + 1;
  }
  return ranks;
}

function pearsonCore(xs: number[], ys: number[]): { r: number; p: number } {
  const n = xs.length;
  if (n < 3) return { r: 0, p: 1 };
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  const r = den > 1e-12 ? Math.max(-0.99999, Math.min(0.99999, num / den)) : 0;
  const t = r * Math.sqrt((n - 2) / Math.max(1e-12, 1 - r * r));
  const p = studentTTwoTailedP(t, n - 2);
  return { r, p };
}

export function computeCorrelationBlandAltman(rows: PairXYRow[]): CorrelationBAResult {
  const xs = rows.map((r) => r.x);
  const ys = rows.map((r) => r.y);
  const n = rows.length;
  const pr = pearsonCore(xs, ys);
  const sp = pearsonCore(rankArray(xs), rankArray(ys));

  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const slope = sxx > 1e-12 ? sxy / sxx : 0;
  const intercept = my - slope * mx;

  const diffs = rows.map((r) => r.y - r.x);
  const bias = mean(diffs);
  const sdDiff = sd(diffs);

  return {
    n,
    pearsonR: pr.r,
    pearsonP: pr.p,
    rSquared: pr.r * pr.r,
    spearmanRho: sp.r,
    spearmanP: sp.p,
    slope,
    intercept,
    bias,
    sdDiff,
    loaUpper: bias + 1.96 * sdDiff,
    loaLower: bias - 1.96 * sdDiff,
    baPoints: rows.map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      avg: (r.x + r.y) / 2,
      diff: r.y - r.x,
    })),
  };
}

/* ============================================================================
 * 5. Exact 2D Covariance 95% Confidence Ellipse (Chi-square df=2 = 5.991)
 * ========================================================================== */

export interface Ellipse2D {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  angleDeg: number;
}

export function computeConfidenceEllipse(xs: number[], ys: number[], chi2Val = 5.991): Ellipse2D | null {
  const n = xs.length;
  if (n < 3) return null;
  const cx = mean(xs);
  const cy = mean(ys);
  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - cx;
    const dy = ys[i] - cy;
    cxx += dx * dx;
    cyy += dy * dy;
    cxy += dx * dy;
  }
  cxx /= n - 1;
  cyy /= n - 1;
  cxy /= n - 1;

  const trace = cxx + cyy;
  const det = Math.max(0, cxx * cyy - cxy * cxy);
  const disc = Math.sqrt(Math.max(0, (trace * trace) / 4 - det));
  const lam1 = Math.max(1e-6, trace / 2 + disc);
  const lam2 = Math.max(1e-6, trace / 2 - disc);
  const angleRad = Math.abs(cxy) < 1e-10 ? (cxx >= cyy ? 0 : Math.PI / 2) : Math.atan2(lam1 - cxx, cxy);

  return {
    cx,
    cy,
    rx: Math.sqrt(chi2Val * lam1),
    ry: Math.sqrt(chi2Val * lam2),
    angleDeg: (angleRad * 180) / Math.PI,
  };
}

export function formatConc(val: number): string {
  if (val >= 1) return `${val.toFixed(2)} µM`;
  if (val >= 0.001) return `${(val * 1000).toFixed(1)} nM`;
  return `${(val * 1e6).toFixed(1)} pM`;
}

export { normalCdf };
