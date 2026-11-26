import type {
  GroupSummary,
  PairwiseResult,
  StatisticalRecommendation,
  TidyStatRow,
} from '../types/biograce';

/* ============================================================================
 * Mathematical Special Functions (Pure TypeScript, Zero Dependencies)
 * ========================================================================== */

function logGamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const zz = z - 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (zz + i);
  }
  const t = zz + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Standard normal CDF using Abramowitz & Stegun 7.1.26 error function */
export function normalCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  return 0.5 * (1 + sign * erf);
}

/** Inverse standard normal CDF (Acklam's rational approximation) */
export function normalQuantile(p: number): number {
  const clamped = Math.max(1e-12, Math.min(1 - 1e-12, p));
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (clamped < pLow) {
    const q = Math.sqrt(-2 * Math.log(clamped));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (clamped <= pHigh) {
    const q = clamped - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - clamped));
  return -(
    (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

/** Regularized incomplete beta I_x(a, b) via Lentz's continued fraction */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-10;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** Two-tailed p-value from Student's t-distribution */
export function studentTTwoTailedP(t: number, df: number): number {
  if (!Number.isFinite(t) || df <= 0) return 1;
  const x = df / (df + t * t);
  return Math.max(0, Math.min(1, regularizedIncompleteBeta(x, df / 2, 0.5)));
}

/** Upper-tail p-value from F-distribution */
export function fDistUpperP(f: number, df1: number, df2: number): number {
  if (!Number.isFinite(f) || f <= 0 || df1 <= 0 || df2 <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return Math.max(0, Math.min(1, regularizedIncompleteBeta(x, df2 / 2, df1 / 2)));
}

/** Upper-tail p-value from Chi-squared distribution (regularized upper gamma Q(a, x)) */
export function chiSquareUpperP(chi2: number, df: number): number {
  if (!Number.isFinite(chi2) || chi2 <= 0 || df <= 0) return 1;
  const a = df / 2;
  const x = chi2 / 2;
  if (x < a + 1) {
    // Series representation for P(a, x)
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 200; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-10) break;
    }
    const p = sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
    return Math.max(0, Math.min(1, 1 - p));
  }
  // Continued fraction for Q(a, x)
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-10) break;
  }
  return Math.max(0, Math.min(1, Math.exp(-x + a * Math.log(x) - logGamma(a)) * h));
}

/** Critical t value for 95% CI via Newton-bisection */
function tCritical95(df: number): number {
  if (df <= 0) return 1.96;
  let lo = 1.95;
  let hi = df < 2 ? 15 : 5;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (studentTTwoTailedP(mid, df) > 0.05) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/* ============================================================================
 * Basic Descriptive Statistics & Quantiles
 * ========================================================================== */

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1);
}

export function sd(xs: number[]): number {
  return Math.sqrt(variance(xs));
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return quantile(s, 0.5);
}

export function skewness(xs: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const m = mean(xs);
  const s = sd(xs);
  if (s === 0) return 0;
  const sum3 = xs.reduce((acc, x) => acc + ((x - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum3;
}

/* ============================================================================
 * Assumption Tests: Shapiro–Wilk Normality & Brown–Forsythe Levene's Variance
 * ========================================================================== */

/**
 * Shapiro–Wilk test (Royston 1995 approximation)
 * Returns { W, p } for n >= 3.
 */
export function shapiroWilk(values: number[]): { W: number; p: number } {
  const n = values.length;
  if (n < 3) return { W: 1, p: 1 };

  const x = [...values].sort((a, b) => a - b);
  const xMean = mean(x);
  const ss = x.reduce((acc, v) => acc + (v - xMean) ** 2, 0);
  if (ss < 1e-14) return { W: 1, p: 1 };

  // Blom expected normal order statistics
  const m = x.map((_, i) => normalQuantile((i + 1 - 0.375) / (n + 0.25)));
  const mSumSq = m.reduce((acc, v) => acc + v * v, 0);
  const u = 1 / Math.sqrt(n);

  const a = new Array<number>(n).fill(0);
  // Royston polynomial coefficients for extreme weights
  const an =
    -2.706056 * u ** 5 +
    4.434685 * u ** 4 -
    2.07119 * u ** 3 -
    0.147981 * u ** 2 +
    0.221157 * u +
    m[n - 1] / Math.sqrt(mSumSq);

  a[n - 1] = an;
  a[0] = -an;

  let phi: number;
  if (n <= 5) {
    phi = (mSumSq - 2 * m[n - 1] ** 2) / (1 - 2 * an * an);
    for (let i = 1; i < n - 1; i++) {
      a[i] = m[i] / Math.sqrt(phi);
    }
  } else {
    const an1 =
      -3.582633 * u ** 5 +
      5.682633 * u ** 4 -
      1.752461 * u ** 3 -
      0.293762 * u ** 2 +
      0.042981 * u +
      m[n - 2] / Math.sqrt(mSumSq);
    a[n - 2] = an1;
    a[1] = -an1;
    phi = (mSumSq - 2 * m[n - 1] ** 2 - 2 * m[n - 2] ** 2) / (1 - 2 * an * an - 2 * an1 * an1);
    for (let i = 2; i < n - 2; i++) {
      a[i] = m[i] / Math.sqrt(phi);
    }
  }

  let num = 0;
  for (let i = 0; i < n; i++) num += a[i] * x[i];
  const W = Math.max(0, Math.min(1, (num * num) / ss));

  // Royston 1995 p-value transformation
  let p = 1;
  if (n === 3) {
    const sqr = Math.max(0, W - 0.75);
    p = Math.max(0, Math.min(1, 1 - (6 / Math.PI) * Math.asin(Math.sqrt(sqr * 4))));
  } else if (n <= 11) {
    const gamma = 0.459 * n - 2.273;
    const wLog = Math.log(Math.max(1e-12, 1 - W));
    const mu = -0.0006714 * n ** 3 + 0.025054 * n ** 2 - 0.39978 * n + 0.544;
    const sigma = Math.exp(-0.0020322 * n ** 3 + 0.062767 * n ** 2 - 0.77857 * n + 1.3822);
    const z = (-Math.log(Math.max(1e-12, gamma - wLog)) - mu) / sigma;
    p = 1 - normalCdf(z);
  } else {
    const lnN = Math.log(n);
    const mu = 0.0038915 * lnN ** 3 - 0.083751 * lnN ** 2 - 0.31082 * lnN - 1.5861;
    const sigma = Math.exp(0.0030302 * lnN ** 2 - 0.082676 * lnN - 0.4803);
    const z = (Math.log(Math.max(1e-12, 1 - W)) - mu) / sigma;
    p = 1 - normalCdf(z);
  }

  return { W, p: Math.max(0, Math.min(1, p)) };
}

/** Brown–Forsythe Levene's test (median-centered, robust to non-normality) */
export function brownForsytheLevene(groups: number[][]): { F: number; p: number } {
  const k = groups.length;
  const N = groups.reduce((acc, g) => acc + g.length, 0);
  if (k < 2 || N <= k) return { F: 0, p: 1 };

  const zGroups = groups.map((g) => {
    const med = median(g);
    return g.map((x) => Math.abs(x - med));
  });
  const allZ = zGroups.flat();
  const grandMean = mean(allZ);

  let ssBetween = 0;
  let ssWithin = 0;
  for (const zg of zGroups) {
    const zm = mean(zg);
    ssBetween += zg.length * (zm - grandMean) ** 2;
    for (const z of zg) ssWithin += (z - zm) ** 2;
  }

  if (ssWithin < 1e-14) return { F: 0, p: 1 };
  const F = (ssBetween / (k - 1)) / (ssWithin / (N - k));
  const p = fDistUpperP(F, k - 1, N - k);
  return { F, p };
}

/* ============================================================================
 * Two-Sample & Paired Hypothesis Tests
 * ========================================================================== */

/** Welch's two-sample t-test (does NOT assume equal variances) */
export function welchTTest(a: number[], b: number[]) {
  const n1 = a.length;
  const n2 = b.length;
  const m1 = mean(a);
  const m2 = mean(b);
  const v1 = variance(a);
  const v2 = variance(b);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const diff = m2 - m1;
  if (se < 1e-14) {
    return { t: 0, df: Math.max(1, n1 + n2 - 2), p: 1, hedgesG: 0, meanDiff: diff, ciLow: diff, ciHigh: diff };
  }
  const t = diff / se;
  const dfNum = (v1 / n1 + v2 / n2) ** 2;
  const dfDen = (v1 / n1) ** 2 / Math.max(1, n1 - 1) + (v2 / n2) ** 2 / Math.max(1, n2 - 1);
  const df = dfDen > 0 ? dfNum / dfDen : Math.max(1, n1 + n2 - 2);
  const p = studentTTwoTailedP(t, df);
  const sPooled = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / Math.max(1, n1 + n2 - 2));
  const J = 1 - 3 / (4 * (n1 + n2 - 2) - 1);
  const hedgesG = sPooled > 0 ? (diff / sPooled) * J : 0;
  const tCrit = tCritical95(df);
  return {
    t,
    df,
    p,
    hedgesG,
    meanDiff: diff,
    ciLow: diff - tCrit * se,
    ciHigh: diff + tCrit * se,
  };
}

/** Paired t-test on matched differences (b_i - a_i) */
export function pairedTTest(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  const diffs = Array.from({ length: n }, (_, i) => b[i] - a[i]);
  const m = mean(diffs);
  const s = sd(diffs);
  const se = s / Math.sqrt(n);
  const df = Math.max(1, n - 1);
  if (se < 1e-14) {
    return { t: 0, df, p: 1, cohensDz: 0, meanDiff: m, ciLow: m, ciHigh: m, diffs };
  }
  const t = m / se;
  const p = studentTTwoTailedP(t, df);
  const tCrit = tCritical95(df);
  return {
    t,
    df,
    p,
    cohensDz: s > 0 ? m / s : 0,
    meanDiff: m,
    ciLow: m - tCrit * se,
    ciHigh: m + tCrit * se,
    diffs,
  };
}

/** Average ranks with tie adjustment */
function assignRanks(values: number[]): { ranks: number[]; tieCorrection: number } {
  const indexed = values.map((v, idx) => ({ v, idx })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let tieCorrection = 0;
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const avgRank = (i + 1 + (j + 1)) / 2;
    const t = j - i + 1;
    if (t > 1) tieCorrection += t ** 3 - t;
    for (let k = i; k <= j; k++) ranks[indexed[k].idx] = avgRank;
    i = j + 1;
  }
  return { ranks, tieCorrection };
}

/** Mann–Whitney U test (tie-corrected normal approximation + Cliff's delta) */
export function mannWhitneyU(a: number[], b: number[]) {
  const n1 = a.length;
  const n2 = b.length;
  const N = n1 + n2;
  const combined = [...a, ...b];
  const { ranks, tieCorrection } = assignRanks(combined);
  const r1 = ranks.slice(0, n1).reduce((acc, r) => acc + r, 0);
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const U = Math.min(u1, u2);
  const mu = (n1 * n2) / 2;
  const sigmaSq = ((n1 * n2) / 12) * (N + 1 - tieCorrection / (N * (N - 1)));
  const sigma = Math.sqrt(Math.max(1e-12, sigmaSq));
  const z = (Math.abs(u1 - mu) - 0.5) / sigma;
  const p = Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.max(0, z)))));
  // Cliff's delta: P(b > a) - P(b < a)
  let gt = 0;
  let lt = 0;
  for (const va of a) {
    for (const vb of b) {
      if (vb > va) gt++;
      else if (vb < va) lt++;
    }
  }
  const cliffsDelta = n1 * n2 > 0 ? (gt - lt) / (n1 * n2) : 0;
  return { U, z, p, cliffsDelta, meanDiff: median(b) - median(a) };
}

/** Wilcoxon signed-rank test (for paired non-parametric data) */
export function wilcoxonSignedRank(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  const diffs = Array.from({ length: n }, (_, i) => b[i] - a[i]).filter((d) => Math.abs(d) > 1e-12);
  const nr = diffs.length;
  if (nr === 0) return { W: 0, z: 0, p: 1, rankBiserial: 0, meanDiff: 0 };

  const absDiffs = diffs.map((d) => Math.abs(d));
  const { ranks, tieCorrection } = assignRanks(absDiffs);
  let wPlus = 0;
  let wMinus = 0;
  for (let i = 0; i < nr; i++) {
    if (diffs[i] > 0) wPlus += ranks[i];
    else wMinus += ranks[i];
  }
  const W = Math.min(wPlus, wMinus);
  const mu = (nr * (nr + 1)) / 4;
  const sigmaSq = (nr * (nr + 1) * (2 * nr + 1)) / 24 - tieCorrection / 48;
  const sigma = Math.sqrt(Math.max(1e-12, sigmaSq));
  const z = (Math.abs(wPlus - mu) - 0.5) / sigma;
  const p = Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.max(0, z)))));
  const totalRankSum = (nr * (nr + 1)) / 2;
  const rankBiserial = totalRankSum > 0 ? (wPlus - wMinus) / totalRankSum : 0;
  return { W, z, p, rankBiserial, meanDiff: median(diffs) };
}

/* ============================================================================
 * Multi-Group Omnibus Tests: Welch ANOVA, Kruskal–Wallis, Friedman
 * ========================================================================== */

/** Welch's one-way ANOVA (heteroscedasticity-safe omnibus test) */
export function welchAnova(groups: number[][]) {
  const k = groups.length;
  const ns = groups.map((g) => g.length);
  const ms = groups.map((g) => mean(g));
  const vs = groups.map((g) => Math.max(1e-10, variance(g)));
  const ws = ns.map((n, i) => n / vs[i]);
  const wSum = ws.reduce((a, b) => a + b, 0);
  const weightedGrandMean = ws.reduce((acc, w, i) => acc + w * ms[i], 0) / wSum;

  const num = ws.reduce((acc, w, i) => acc + w * (ms[i] - weightedGrandMean) ** 2, 0) / (k - 1);
  const lambda =
    (3 / (k * k - 1)) *
    ws.reduce((acc, w, i) => acc + (1 / Math.max(1, ns[i] - 1)) * (1 - w / wSum) ** 2, 0);
  const F = num / (1 + (2 * (k - 2)) / 3 * lambda);
  const df1 = k - 1;
  const df2 = lambda > 1e-10 ? 1 / lambda : groups.flat().length - k;
  const p = fDistUpperP(F, df1, df2);

  // Eta squared
  const all = groups.flat();
  const grand = mean(all);
  const ssTotal = all.reduce((acc, x) => acc + (x - grand) ** 2, 0);
  const ssBetween = groups.reduce((acc, g, i) => acc + g.length * (ms[i] - grand) ** 2, 0);
  const etaSq = ssTotal > 0 ? ssBetween / ssTotal : 0;

  return { F, df1, df2, p, etaSq };
}

/** Kruskal–Wallis H test (non-parametric omnibus with tie correction) */
export function kruskalWallis(groups: number[][]) {
  const k = groups.length;
  const all = groups.flat();
  const N = all.length;
  if (k < 2 || N <= k) return { H: 0, df: Math.max(1, k - 1), p: 1, epsilonSq: 0 };

  const { ranks, tieCorrection } = assignRanks(all);
  let offset = 0;
  let sumR2OverN = 0;
  for (const g of groups) {
    let rSum = 0;
    for (let i = 0; i < g.length; i++) rSum += ranks[offset + i];
    offset += g.length;
    sumR2OverN += (rSum * rSum) / g.length;
  }
  const Hraw = (12 / (N * (N + 1))) * sumR2OverN - 3 * (N + 1);
  const tieFactor = 1 - tieCorrection / (N ** 3 - N);
  const H = tieFactor > 1e-9 ? Hraw / tieFactor : Hraw;
  const df = k - 1;
  const p = chiSquareUpperP(H, df);
  const epsilonSq = N > k ? Math.max(0, (H - k + 1) / (N - k)) : 0;
  return { H, df, p, epsilonSq };
}

/** Friedman test for >=3 matched/repeated groups */
export function friedmanTest(alignedMatrix: number[][]) {
  // alignedMatrix: array of subjects, each having k group values
  const b = alignedMatrix.length;
  const k = alignedMatrix[0]?.length ?? 0;
  if (b < 2 || k < 3) return { Q: 0, df: Math.max(1, k - 1), p: 1, kendallW: 0 };

  const colRankSums = new Array<number>(k).fill(0);
  for (const row of alignedMatrix) {
    const { ranks } = assignRanks(row);
    for (let j = 0; j < k; j++) colRankSums[j] += ranks[j];
  }
  const sumSq = colRankSums.reduce((acc, r) => acc + r * r, 0);
  const Q = (12 / (b * k * (k + 1))) * sumSq - 3 * b * (k + 1);
  const df = k - 1;
  const p = chiSquareUpperP(Q, df);
  const kendallW = Q / (b * (k - 1));
  return { Q, df, p, kendallW };
}

/* ============================================================================
 * Multiple Testing Corrections: Benjamini–Hochberg (FDR) & Holm–Bonferroni
 * ========================================================================== */

export function adjustPValues(pValues: number[], method: 'BH-FDR' | 'Holm' | 'None'): number[] {
  const m = pValues.length;
  if (m <= 1 || method === 'None') return [...pValues];

  const indexed = pValues.map((p, idx) => ({ p, idx })).sort((a, b) => a.p - b.p);
  const adjusted = new Array<number>(m);

  if (method === 'BH-FDR') {
    let runningMin = 1;
    for (let i = m - 1; i >= 0; i--) {
      const rank = i + 1;
      const val = Math.min(runningMin, (indexed[i].p * m) / rank);
      runningMin = val;
      adjusted[indexed[i].idx] = Math.max(0, Math.min(1, val));
    }
  } else {
    // Holm–Bonferroni
    let runningMax = 0;
    for (let i = 0; i < m; i++) {
      const val = Math.max(runningMax, indexed[i].p * (m - i));
      runningMax = val;
      adjusted[indexed[i].idx] = Math.max(0, Math.min(1, val));
    }
  }
  return adjusted;
}

export function pToStars(p: number): string {
  if (p < 0.0001) return '****';
  if (p < 0.001) return '***';
  if (p < 0.01) return '**';
  if (p < 0.05) return '*';
  return 'ns';
}

export function formatPValue(p: number): string {
  if (!Number.isFinite(p)) return 'NA';
  if (p < 1e-4) return p.toExponential(2);
  return p.toFixed(4);
}

/* ============================================================================
 * Complete Biologist's Statistical Test Advisor Pipeline
 * ========================================================================== */

export function summarizeGroup(group: string, values: number[]): GroupSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const m = mean(sorted);
  const s = sd(sorted);
  const sem = n > 0 ? s / Math.sqrt(n) : 0;
  const q1 = quantile(sorted, 0.25);
  const med = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const inliers = sorted.filter((v) => v >= lowFence && v <= highFence);
  const whiskerLow = inliers.length > 0 ? inliers[0] : sorted[0];
  const whiskerHigh = inliers.length > 0 ? inliers[inliers.length - 1] : sorted[n - 1];
  const outlierCount = sorted.length - inliers.length;
  const tCrit = tCritical95(Math.max(1, n - 1));
  const sw = shapiroWilk(sorted);
  const sk = skewness(sorted);

  return {
    group,
    n,
    mean: m,
    sd: s,
    sem,
    median: med,
    q1,
    q3,
    iqr,
    min: sorted[0] ?? 0,
    max: sorted[n - 1] ?? 0,
    whiskerLow,
    whiskerHigh,
    ci95Low: m - tCrit * sem,
    ci95High: m + tCrit * sem,
    skewness: sk,
    shapiroW: sw.W,
    shapiroP: sw.p,
    isNormal: n < 3 ? true : sw.p >= 0.05,
    outlierCount,
    values,
  };
}

export function analyzeTidyDataset(
  rawRows: TidyStatRow[],
  options: {
    isPaired: boolean;
    collapsePseudoreplicates: boolean;
    correctionMethod: 'BH-FDR' | 'Holm' | 'None';
    alpha: number;
  }
): StatisticalRecommendation {
  // 1. Detect pseudoreplication: multiple rows sharing the same (group, replicate/subject) ID
  const hasReplicateCol = rawRows.some((r) => Boolean(r.replicate && r.replicate.trim()));
  const cellCounts = new Map<string, number>();
  for (const r of rawRows) {
    const bioId = r.replicate?.trim() || (options.isPaired ? r.subject?.trim() : undefined);
    if (bioId) {
      const key = `${r.group}|||${bioId}`;
      cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }
  }
  const repeatedCells = [...cellCounts.values()].filter((c) => c > 1).length;
  const pseudoreplicationDetected = repeatedCells > 0;
  const effectiveBioN = pseudoreplicationDetected ? cellCounts.size : rawRows.length;

  let workingRows = rawRows;
  let collapsedReplicates = false;
  if (pseudoreplicationDetected && options.collapsePseudoreplicates) {
    const cellVals = new Map<string, { group: string; bioId: string; values: number[] }>();
    for (const r of rawRows) {
      const bioId = r.replicate?.trim() || r.subject?.trim() || 'unknown';
      const key = `${r.group}|||${bioId}`;
      const existing = cellVals.get(key);
      if (existing) existing.values.push(r.value);
      else cellVals.set(key, { group: r.group, bioId, values: [r.value] });
    }
    workingRows = [...cellVals.values()].map((c) => ({
      group: c.group,
      value: mean(c.values),
      subject: c.bioId,
      replicate: c.bioId,
    }));
    collapsedReplicates = true;
  }

  const pseudoreplicationWarning = pseudoreplicationDetected
    ? collapsedReplicates
      ? `Technical replicates detected (${rawRows.length} observations across ${effectiveBioN} biological replicates). Automatically collapsed to biological replicate means to prevent inflated N. For full variance partitioning, use the generated mixed-effects model (lmer / MixedLM).`
      : `Pseudoreplication alert! Found ${rawRows.length} measurements nested within only ${effectiveBioN} biological ${hasReplicateCol ? 'replicates/donors' : 'subjects'}. Treating technical replicates as independent inflates N and causes false positives — enable "Collapse to biological means" or fit a Linear Mixed-Effects Model.`
    : null;

  // 2. Partition into ordered groups
  const groupOrder: string[] = [];
  const groupMap = new Map<string, TidyStatRow[]>();
  for (const row of workingRows) {
    if (!groupMap.has(row.group)) {
      groupOrder.push(row.group);
      groupMap.set(row.group, []);
    }
    groupMap.get(row.group)!.push(row);
  }

  const groups: GroupSummary[] = groupOrder.map((g) =>
    summarizeGroup(
      g,
      groupMap.get(g)!.map((r) => r.value)
    )
  );
  const groupCount = groups.length;
  const totalN = workingRows.length;

  // 3. Check paired alignment if requested
  const canPair =
    options.isPaired &&
    groupCount >= 2 &&
    workingRows.some((r) => Boolean(r.subject && r.subject.trim()));

  let alignedPairedRows: { subject: string; values: number[] }[] = [];
  if (canPair) {
    const bySubject = new Map<string, Map<string, number>>();
    for (const r of workingRows) {
      const subj = r.subject?.trim();
      if (!subj) continue;
      if (!bySubject.has(subj)) bySubject.set(subj, new Map());
      bySubject.get(subj)!.set(r.group, r.value);
    }
    alignedPairedRows = [...bySubject.entries()]
      .filter(([, gMap]) => groupOrder.every((g) => gMap.has(g)))
      .map(([subject, gMap]) => ({
        subject,
        values: groupOrder.map((g) => gMap.get(g)!),
      }));
  }
  const effectivePaired = canPair && alignedPairedRows.length >= 3;

  // 4. Assumption Checks
  const minGroupN = Math.min(...groups.map((g) => g.n));
  const smallNSkewWarning = minGroupN < 6;

  let normalityPassed = true;
  let normalityDetail = '';
  if (effectivePaired && groupCount === 2) {
    const diffs = alignedPairedRows.map((r) => r.values[1] - r.values[0]);
    const swDiff = shapiroWilk(diffs);
    normalityPassed = swDiff.p >= 0.05 && Math.abs(skewness(diffs)) < 1.5;
    normalityDetail = `Shapiro–Wilk on paired differences: W = ${swDiff.W.toFixed(3)}, p = ${formatPValue(swDiff.p)} (${normalityPassed ? 'consistent with normality' : 'non-normal differences'})`;
  } else {
    const failing = groups.filter((g) => !g.isNormal || Math.abs(g.skewness) > 1.8);
    normalityPassed = failing.length === 0;
    const minP = Math.min(...groups.map((g) => g.shapiroP));
    normalityDetail = normalityPassed
      ? `All ${groupCount} groups pass Shapiro–Wilk normality (min p = ${formatPValue(minP)}).`
      : `${failing.map((f) => f.group).join(', ')} ${failing.length === 1 ? 'deviates' : 'deviate'} from normality (min Shapiro–Wilk p = ${formatPValue(minP)}).`;
  }

  let leveneF: number | null = null;
  let leveneP: number | null = null;
  let variancePassed = true;
  let varianceDetail = 'Not required for paired within-subject differences.';
  if (!effectivePaired && groupCount >= 2) {
    const lev = brownForsytheLevene(groups.map((g) => g.values));
    leveneF = lev.F;
    leveneP = lev.p;
    variancePassed = lev.p >= 0.05;
    varianceDetail = variancePassed
      ? `Brown–Forsythe Levene's test: F = ${lev.F.toFixed(2)}, p = ${formatPValue(lev.p)} (variances comparable; Welch's test still preferred by default).`
      : `Brown–Forsythe Levene's test: F = ${lev.F.toFixed(2)}, p = ${formatPValue(lev.p)} (unequal variances detected — Student's t / classic ANOVA invalid).`;
  }

  // 5. Select optimal test & compute omnibus + pairwise
  let primaryTest = '';
  let family: 'parametric' | 'nonparametric' | 'mixed' = 'parametric';
  let omnibus: StatisticalRecommendation['omnibus'] = {
    testName: '',
    statisticLabel: 't',
    statistic: 0,
    pValue: 1,
  };
  const rawPairwise: Omit<PairwiseResult, 'pAdjusted' | 'significant' | 'stars'>[] = [];
  const rationale: string[] = [];
  const whyNotOthers: string[] = [];

  if (groupCount === 2) {
    const gA = groups[0];
    const gB = groups[1];
    if (effectivePaired) {
      const aVals = alignedPairedRows.map((r) => r.values[0]);
      const bVals = alignedPairedRows.map((r) => r.values[1]);
      if (normalityPassed) {
        const res = pairedTTest(aVals, bVals);
        primaryTest = 'Paired t-test';
        family = 'parametric';
        omnibus = {
          testName: 'Paired t-test',
          statisticLabel: 't',
          statistic: res.t,
          df: `${res.df}`,
          pValue: res.p,
          effectLabel: "Cohen's dz",
          effectSize: res.cohensDz,
        };
        rawPairwise.push({
          groupA: gA.group,
          groupB: gB.group,
          testName: 'Paired t-test',
          statisticLabel: 't',
          statistic: res.t,
          pValue: res.p,
          effectLabel: "Cohen's dz",
          effectSize: res.cohensDz,
          meanDiff: res.meanDiff,
          ciLow: res.ciLow,
          ciHigh: res.ciHigh,
        });
        rationale.push(
          `Matched subjects (${alignedPairedRows.length} pairs) detected — paired analysis removes inter-subject baseline variance and dramatically improves statistical power.`,
          `Paired differences pass Shapiro–Wilk normality, making the parametric Paired t-test optimal.`
        );
        whyNotOthers.push(
          `Independent Welch's t-test would ignore within-subject pairing and waste power on inter-individual noise.`,
          `Wilcoxon signed-rank is less efficient when differences are symmetrically normal.`
        );
      } else {
        const res = wilcoxonSignedRank(aVals, bVals);
        primaryTest = 'Wilcoxon signed-rank test';
        family = 'nonparametric';
        omnibus = {
          testName: 'Wilcoxon signed-rank test',
          statisticLabel: 'W',
          statistic: res.W,
          pValue: res.p,
          effectLabel: 'Rank-biserial r',
          effectSize: res.rankBiserial,
        };
        rawPairwise.push({
          groupA: gA.group,
          groupB: gB.group,
          testName: 'Wilcoxon signed-rank',
          statisticLabel: 'W',
          statistic: res.W,
          pValue: res.p,
          effectLabel: 'Rank-biserial r',
          effectSize: res.rankBiserial,
          meanDiff: res.meanDiff,
        });
        rationale.push(
          `Matched subjects (${alignedPairedRows.length} pairs) detected, but paired differences deviate from normality.`,
          `Wilcoxon signed-rank compares paired shifts via signed ranks without requiring Gaussian differences.`
        );
        whyNotOthers.push(
          `Paired t-test relies on normal differences and can be distorted by heavy skew or outliers.`
        );
      }
    } else if (normalityPassed) {
      const res = welchTTest(gA.values, gB.values);
      primaryTest = "Welch's two-sample t-test";
      family = 'parametric';
      omnibus = {
        testName: "Welch's t-test",
        statisticLabel: 't',
        statistic: res.t,
        df: res.df.toFixed(1),
        pValue: res.p,
        effectLabel: "Hedges' g",
        effectSize: res.hedgesG,
      };
      rawPairwise.push({
        groupA: gA.group,
        groupB: gB.group,
        testName: "Welch's t-test",
        statisticLabel: 't',
        statistic: res.t,
        pValue: res.p,
        effectLabel: "Hedges' g",
        effectSize: res.hedgesG,
        meanDiff: res.meanDiff,
        ciLow: res.ciLow,
        ciHigh: res.ciHigh,
      });
      rationale.push(
        `Both independent groups are compatible with normality (Shapiro–Wilk p ≥ 0.05).`,
        `Welch's t-test is recommended over Student's t-test by default (Delacre et al., 2017): it stays exact under unequal variances with virtually zero power loss when variances are equal.`
      );
      whyNotOthers.push(
        `Student's t-test assumes exact homoscedasticity and inflates Type I error when group spreads or sample sizes differ.`,
        `Mann–Whitney U tests stochastic dominance rather than means and has lower power on Gaussian data.`
      );
    } else {
      const res = mannWhitneyU(gA.values, gB.values);
      primaryTest = 'Mann–Whitney U test';
      family = 'nonparametric';
      omnibus = {
        testName: 'Mann–Whitney U test',
        statisticLabel: 'U',
        statistic: res.U,
        pValue: res.p,
        effectLabel: "Cliff's δ",
        effectSize: res.cliffsDelta,
      };
      rawPairwise.push({
        groupA: gA.group,
        groupB: gB.group,
        testName: 'Mann–Whitney U',
        statisticLabel: 'U',
        statistic: res.U,
        pValue: res.p,
        effectLabel: "Cliff's δ",
        effectSize: res.cliffsDelta,
        meanDiff: res.meanDiff,
      });
      rationale.push(
        `At least one group shows non-normality, multimodality, or strong skew (Shapiro–Wilk p < 0.05).`,
        `Mann–Whitney U (Wilcoxon rank-sum) compares rank distributions robustly alongside Cliff's δ effect size.`
      );
      whyNotOthers.push(
        `A t-test compares arithmetic means — misleading when a group is skewed, bimodal, or contains extreme biological responders.`,
        `A barplot + SEM completely hides this non-normal distribution.`
      );
    }
  } else if (groupCount >= 3) {
    if (effectivePaired) {
      const mat = alignedPairedRows.map((r) => r.values);
      const fr = friedmanTest(mat);
      primaryTest = `Friedman test + Pairwise Wilcoxon (${options.correctionMethod})`;
      family = 'nonparametric';
      omnibus = {
        testName: 'Friedman rank test',
        statisticLabel: 'χ²',
        statistic: fr.Q,
        df: `${fr.df}`,
        pValue: fr.p,
        effectLabel: "Kendall's W",
        effectSize: fr.kendallW,
      };
      for (let i = 0; i < groupCount; i++) {
        for (let j = i + 1; j < groupCount; j++) {
          const aVals = alignedPairedRows.map((r) => r.values[i]);
          const bVals = alignedPairedRows.map((r) => r.values[j]);
          const res = wilcoxonSignedRank(aVals, bVals);
          rawPairwise.push({
            groupA: groups[i].group,
            groupB: groups[j].group,
            testName: 'Wilcoxon signed-rank',
            statisticLabel: 'W',
            statistic: res.W,
            pValue: res.p,
            effectLabel: 'Rank-biserial r',
            effectSize: res.rankBiserial,
            meanDiff: res.meanDiff,
          });
        }
      }
      rationale.push(
        `${groupCount} matched conditions across ${alignedPairedRows.length} subjects detected.`,
        `Friedman test avoids sphericity assumptions of repeated-measures ANOVA, followed by pairwise Wilcoxon signed-rank with ${options.correctionMethod} correction.`
      );
      whyNotOthers.push(
        `Standard one-way ANOVA or Kruskal–Wallis ignores subject pairing across conditions.`,
        `Uncorrected pairwise tests inflate family-wise false discovery rate across ${(groupCount * (groupCount - 1)) / 2} comparisons.`
      );
    } else if (normalityPassed) {
      const wa = welchAnova(groups.map((g) => g.values));
      primaryTest = `Welch's One-Way ANOVA + Pairwise Welch t-tests (${options.correctionMethod})`;
      family = 'parametric';
      omnibus = {
        testName: "Welch's ANOVA",
        statisticLabel: 'F',
        statistic: wa.F,
        df: `${wa.df1}, ${wa.df2.toFixed(1)}`,
        pValue: wa.p,
        effectLabel: 'η²',
        effectSize: wa.etaSq,
      };
      for (let i = 0; i < groupCount; i++) {
        for (let j = i + 1; j < groupCount; j++) {
          const res = welchTTest(groups[i].values, groups[j].values);
          rawPairwise.push({
            groupA: groups[i].group,
            groupB: groups[j].group,
            testName: "Welch's t-test",
            statisticLabel: 't',
            statistic: res.t,
            pValue: res.p,
            effectLabel: "Hedges' g",
            effectSize: res.hedgesG,
            meanDiff: res.meanDiff,
            ciLow: res.ciLow,
            ciHigh: res.ciHigh,
          });
        }
      }
      rationale.push(
        `${groupCount} independent groups satisfy normality checks; Welch's ANOVA handles both equal and unequal group variances cleanly.`,
        `All ${(groupCount * (groupCount - 1)) / 2} pairwise contrasts are controlled using ${options.correctionMethod} multiple-testing adjustment.`
      );
      whyNotOthers.push(
        `Running unadjusted pairwise t-tests across ${groupCount} groups inflates false-positive risk above ${(100 * (1 - (1 - options.alpha) ** ((groupCount * (groupCount - 1)) / 2))).toFixed(0)}%.`,
        `Classic Fisher ANOVA breaks down when variances differ across treatment doses.`
      );
    } else {
      const kw = kruskalWallis(groups.map((g) => g.values));
      primaryTest = `Kruskal–Wallis + Pairwise Mann–Whitney (${options.correctionMethod})`;
      family = 'nonparametric';
      omnibus = {
        testName: 'Kruskal–Wallis H test',
        statisticLabel: 'H',
        statistic: kw.H,
        df: `${kw.df}`,
        pValue: kw.p,
        effectLabel: 'ε²',
        effectSize: kw.epsilonSq,
      };
      for (let i = 0; i < groupCount; i++) {
        for (let j = i + 1; j < groupCount; j++) {
          const res = mannWhitneyU(groups[i].values, groups[j].values);
          rawPairwise.push({
            groupA: groups[i].group,
            groupB: groups[j].group,
            testName: 'Mann–Whitney U',
            statisticLabel: 'U',
            statistic: res.U,
            pValue: res.p,
            effectLabel: "Cliff's δ",
            effectSize: res.cliffsDelta,
            meanDiff: res.meanDiff,
          });
        }
      }
      rationale.push(
        `${groupCount} independent groups with non-normal/skewed distributions — Kruskal–Wallis tests rank-order differences without Gaussian assumptions.`,
        `Post-hoc pairwise comparisons are adjusted with ${options.correctionMethod} to control false discoveries.`
      );
      whyNotOthers.push(
        `One-way ANOVA assumes normally distributed residuals and is sensitive to heavy tails or skewed assay readouts (e.g. qPCR fold-change, luminescence).`,
        `Uncorrected pairwise Mann–Whitney tests inflate false discoveries across ${(groupCount * (groupCount - 1)) / 2} pairs.`
      );
    }
  }

  if (pseudoreplicationDetected && !collapsedReplicates) {
    family = 'mixed';
    primaryTest = `Linear Mixed-Effects Model (or collapse replicates → ${primaryTest})`;
  }

  // Adjust pairwise p-values
  const adjP = adjustPValues(
    rawPairwise.map((p) => p.pValue),
    rawPairwise.length > 1 ? options.correctionMethod : 'None'
  );
  const pairwise: PairwiseResult[] = rawPairwise.map((pw, idx) => {
    const pAdjusted = adjP[idx];
    return {
      ...pw,
      pAdjusted,
      significant: pAdjusted < options.alpha,
      stars: pToStars(pAdjusted),
    };
  });

  if (smallNSkewWarning) {
    rationale.push(
      `Small-N note (min n = ${minGroupN}): Shapiro–Wilk has limited power when n < 6. Always inspect the raw points and raincloud density directly.`
    );
  }

  return {
    primaryTest,
    family,
    isPaired: effectivePaired,
    groupCount,
    totalN,
    effectiveBioN,
    pseudoreplicationDetected,
    pseudoreplicationWarning,
    collapsedReplicates,
    assumptions: {
      normalityPassed,
      normalityDetail,
      variancePassed,
      varianceDetail,
      leveneF,
      leveneP,
      smallNSkewWarning,
    },
    omnibus,
    pairwise,
    correctionMethod: rawPairwise.length > 1 ? options.correctionMethod : 'None',
    rationale,
    whyNotOthers,
    groups,
  };
}

/* ============================================================================
 * Visual Geometry Helpers: Gaussian KDE & Deterministic Beeswarm
 * ========================================================================== */

export function computeKDE(
  values: number[],
  domainMin: number,
  domainMax: number,
  steps = 64
): { y: number; density: number }[] {
  const n = values.length;
  if (n === 0) return [];
  const s = sd(values);
  const sorted = [...values].sort((a, b) => a - b);
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const spread = iqr > 0 ? Math.min(s || iqr, iqr / 1.34) : s || (domainMax - domainMin) * 0.08;
  const bw = Math.max(1e-4, 0.9 * spread * n ** -0.2);

  const pts: { y: number; density: number }[] = [];
  const invSqrt2Pi = 1 / Math.sqrt(2 * Math.PI);
  for (let i = 0; i <= steps; i++) {
    const y = domainMin + ((domainMax - domainMin) * i) / steps;
    let sum = 0;
    for (const v of values) {
      const z = (y - v) / bw;
      sum += Math.exp(-0.5 * z * z) * invSqrt2Pi;
    }
    pts.push({ y, density: sum / (n * bw) });
  }
  return pts;
}

/** Deterministic collision-free beeswarm horizontal offsets in pixel coordinates */
export function computeBeeswarmOffsets(
  pixelYs: number[],
  radius: number,
  maxSpread: number
): number[] {
  const indexed = pixelYs.map((py, idx) => ({ py, idx })).sort((a, b) => a.py - b.py);
  const placed: { py: number; dx: number }[] = [];
  const offsets = new Array<number>(pixelYs.length).fill(0);
  const minDist = radius * 2.18;

  for (const item of indexed) {
    let bestDx = 0;
    const collides = (dx: number) =>
      placed.some((p) => {
        const dy = p.py - item.py;
        if (Math.abs(dy) >= minDist) return false;
        const distSq = dy * dy + (p.dx - dx) ** 2;
        return distSq < minDist * minDist;
      });

    if (collides(0)) {
      let found = false;
      for (let step = 1; step <= 40; step++) {
        const cand = step * (radius * 0.65);
        if (cand > maxSpread) break;
        const order = item.idx % 2 === 0 ? [cand, -cand] : [-cand, cand];
        for (const c of order) {
          if (!collides(c)) {
            bestDx = c;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) {
        bestDx = (((item.idx * 73) % 100) / 100 - 0.5) * maxSpread * 1.8;
      }
    }
    placed.push({ py: item.py, dx: bestDx });
    offsets[item.idx] = bestDx;
  }
  return offsets;
}
