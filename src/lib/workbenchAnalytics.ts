import { adjustPValues, fDistUpperP, normalCdf, welchTTest } from './statsEngine';

/** Accurate rational approximation of inverse standard normal CDF (Acklam's algorithm) */
export function normalInv(p: number): number {
  const clamped = Math.max(1e-12, Math.min(1 - 1e-12, p));
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (clamped < pLow) {
    const q = Math.sqrt(-2 * Math.log(clamped));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (clamped <= pHigh) {
    const q = clamped - 0.5;
    const r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - clamped));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/* ============================================================================
 * 1. Sample Size & Statistical Power Calculator (Grant / IACUC / IRB Ready)
 * ============================================================================ */

export type PowerDesign = 'two-sample' | 'paired' | 'anova' | 'survival';

export interface PowerInput {
  design: PowerDesign;
  effectSize: number; // Cohen's d, dz, f, or Hazard Ratio (HR) for survival
  alpha: number; // e.g. 0.05
  targetPower: number; // e.g. 0.80 or 0.90
  groups?: number; // for ANOVA (default 3)
  eventRate?: number; // for survival (fraction experiencing event, default 0.65)
}

export interface PowerResult {
  requiredPerGroup: number;
  requiredTotal: number;
  requiredEvents?: number;
  curve: { nPerGroup: number; power: number }[];
  grantParagraph: string;
}

export function computePowerAtN(input: PowerInput, nPerGroup: number): number {
  const zAlpha = normalInv(1 - input.alpha / 2);
  const n = Math.max(2, nPerGroup);

  if (input.design === 'two-sample') {
    const d = Math.abs(input.effectSize);
    const ncp = d * Math.sqrt(n / 2);
    return Math.min(0.9999, Math.max(input.alpha, 1 - normalCdf(zAlpha - ncp) + normalCdf(-zAlpha - ncp)));
  }

  if (input.design === 'paired') {
    const dz = Math.abs(input.effectSize);
    const ncp = dz * Math.sqrt(n);
    return Math.min(0.9999, Math.max(input.alpha, 1 - normalCdf(zAlpha - ncp) + normalCdf(-zAlpha - ncp)));
  }

  if (input.design === 'anova') {
    const k = Math.max(3, Math.round(input.groups ?? 3));
    const f = Math.abs(input.effectSize);
    const df1 = k - 1;
    const lambda = k * n * f * f;
    // Patnaik normal approximation to non-central chi-square / F power
    const meanNc = df1 + lambda;
    const sdNc = Math.sqrt(2 * (df1 + 2 * lambda));
    // Critical chi-square approx for df1 at alpha (Wilson-Hilferty)
    const zCrit = normalInv(1 - input.alpha);
    const critChi2 = df1 * Math.pow(1 - 2 / (9 * df1) + zCrit * Math.sqrt(2 / (9 * df1)), 3);
    const z = (critChi2 - meanNc) / (sdNc || 1);
    return Math.min(0.9999, Math.max(input.alpha, 1 - normalCdf(z)));
  }

  // Survival Log-Rank (Schoenfeld formula): total events D = 2 * n * eventRate
  const hr = Math.max(0.05, input.effectSize);
  const logHr = Math.abs(Math.log(hr));
  const pEvent = Math.max(0.1, Math.min(1, input.eventRate ?? 0.65));
  const events = 2 * n * pEvent;
  const ncp = logHr * Math.sqrt(events / 4);
  return Math.min(0.9999, Math.max(input.alpha, 1 - normalCdf(zAlpha - ncp)));
}

export function calculateSampleSizeAndPower(input: PowerInput): PowerResult {
  const zAlpha = normalInv(1 - input.alpha / 2);
  const zBeta = normalInv(input.targetPower);

  let reqPerGroup = 10;
  let requiredEvents: number | undefined;

  if (input.design === 'two-sample') {
    const d = Math.max(0.05, Math.abs(input.effectSize));
    reqPerGroup = Math.max(3, Math.ceil((2 * (zAlpha + zBeta) ** 2) / (d * d) + (zAlpha * zAlpha) / 4));
  } else if (input.design === 'paired') {
    const dz = Math.max(0.05, Math.abs(input.effectSize));
    reqPerGroup = Math.max(3, Math.ceil(((zAlpha + zBeta) ** 2) / (dz * dz) + (zAlpha * zAlpha) / 2));
  } else if (input.design === 'anova') {
    // Iterative search using computePowerAtN so exact curve & recommendation agree 100%
    let n = 3;
    while (n < 500 && computePowerAtN(input, n) < input.targetPower) n++;
    reqPerGroup = n;
  } else {
    // Schoenfeld survival events
    const hr = Math.max(0.05, input.effectSize === 1 ? 0.65 : input.effectSize);
    const logHr = Math.max(0.05, Math.abs(Math.log(hr)));
    const pEvent = Math.max(0.1, Math.min(1, input.eventRate ?? 0.65));
    requiredEvents = Math.ceil((4 * (zAlpha + zBeta) ** 2) / (logHr * logHr));
    reqPerGroup = Math.max(4, Math.ceil(requiredEvents / (2 * pEvent)));
  }

  const k = input.design === 'anova' ? Math.max(3, Math.round(input.groups ?? 3)) : input.design === 'paired' ? 1 : 2;
  const requiredTotal = reqPerGroup * k;

  const maxN = Math.max(20, Math.ceil(reqPerGroup * 2.2));
  const step = Math.max(1, Math.floor(maxN / 36));
  const curve: { nPerGroup: number; power: number }[] = [];
  for (let n = 2; n <= maxN; n += step) {
    curve.push({ nPerGroup: n, power: Number(computePowerAtN(input, n).toFixed(4)) });
  }
  if (curve[curve.length - 1]?.nPerGroup !== maxN) {
    curve.push({ nPerGroup: maxN, power: Number(computePowerAtN(input, maxN).toFixed(4)) });
  }

  const pct = Math.round(input.targetPower * 100);
  const designLabel =
    input.design === 'two-sample'
      ? `two-sided two-sample t-test (Cohen's d = ${input.effectSize.toFixed(2)})`
      : input.design === 'paired'
      ? `two-sided paired t-test (Cohen's dz = ${input.effectSize.toFixed(2)})`
      : input.design === 'anova'
      ? `one-way ANOVA across ${k} groups (Cohen's f = ${input.effectSize.toFixed(2)})`
      : `two-sided Log-Rank survival test (HR = ${input.effectSize.toFixed(2)}, expected event rate = ${Math.round((input.eventRate ?? 0.65) * 100)}%)`;

  const grantParagraph =
    input.design === 'survival'
      ? `Power calculation (Schoenfeld method): To achieve ${pct}% statistical power at a two-sided α = ${input.alpha} to detect a hazard ratio of ${input.effectSize.toFixed(2)} under a ${designLabel}, at least ${requiredEvents} total events are required, corresponding to n = ${reqPerGroup} subjects per arm (N = ${requiredTotal} total; recommend enrolling ~${Math.ceil(requiredTotal * 1.1)} accounting for 10% attrition).`
      : input.design === 'paired'
      ? `Sample size justification: Based on an a priori power analysis for a ${designLabel} at two-sided α = ${input.alpha}, n = ${reqPerGroup} matched biological subjects are required to achieve ${pct}% power (recommend n = ${Math.ceil(reqPerGroup * 1.1)} to accommodate 10% dropout).`
      : `Sample size justification: Based on an a priori power analysis for a ${designLabel} at α = ${input.alpha}, n = ${reqPerGroup} independent biological replicates per group (N = ${requiredTotal} total across ${k} groups) provide ≥${pct}% power to detect the target biological effect.`;

  return {
    requiredPerGroup: reqPerGroup,
    requiredTotal,
    requiredEvents,
    curve,
    grantParagraph,
  };
}

/* ============================================================================
 * 2. Two-Way Factorial ANOVA (Genotype × Treatment + Interaction p-value)
 * ============================================================================ */

export interface FactorialRow {
  factorA: string;
  factorB: string;
  value: number;
}

export interface TwoWayAnovaResult {
  levelsA: string[];
  levelsB: string[];
  cells: {
    factorA: string;
    factorB: string;
    n: number;
    mean: number;
    sd: number;
    ci95: number;
    values: number[];
  }[];
  table: {
    source: string;
    ss: number;
    df: number;
    ms: number;
    f: number;
    p: number;
  }[];
  summary: string;
}

export function runTwoWayAnova(rows: FactorialRow[]): TwoWayAnovaResult {
  const levelsA = [...new Set(rows.map((r) => r.factorA))];
  const levelsB = [...new Set(rows.map((r) => r.factorB))];
  const grandMean = rows.reduce((s, r) => s + r.value, 0) / Math.max(1, rows.length);

  const cells: TwoWayAnovaResult['cells'] = [];
  const cellMeanMap = new Map<string, number>();

  for (const a of levelsA) {
    for (const b of levelsB) {
      const vals = rows.filter((r) => r.factorA === a && r.factorB === b).map((r) => r.value);
      const n = vals.length;
      const mean = n > 0 ? vals.reduce((s, v) => s + v, 0) / n : grandMean;
      const sd =
        n > 1
          ? Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
          : 0;
      const ci95 = n > 1 ? 1.96 * (sd / Math.sqrt(n)) : 0;
      cells.push({ factorA: a, factorB: b, n, mean, sd, ci95, values: vals });
      cellMeanMap.set(`${a}|||${b}`, mean);
    }
  }

  const meanA = new Map<string, number>();
  const countA = new Map<string, number>();
  for (const a of levelsA) {
    const vals = rows.filter((r) => r.factorA === a).map((r) => r.value);
    meanA.set(a, vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length));
    countA.set(a, vals.length);
  }

  const meanB = new Map<string, number>();
  const countB = new Map<string, number>();
  for (const b of levelsB) {
    const vals = rows.filter((r) => r.factorB === b).map((r) => r.value);
    meanB.set(b, vals.reduce((s, v) => s + v, 0) / Math.max(1, vals.length));
    countB.set(b, vals.length);
  }

  let ssA = 0;
  for (const a of levelsA) ssA += (countA.get(a) ?? 0) * ((meanA.get(a) ?? grandMean) - grandMean) ** 2;

  let ssB = 0;
  for (const b of levelsB) ssB += (countB.get(b) ?? 0) * ((meanB.get(b) ?? grandMean) - grandMean) ** 2;

  let ssAB = 0;
  let ssErr = 0;
  for (const c of cells) {
    const mA = meanA.get(c.factorA) ?? grandMean;
    const mB = meanB.get(c.factorB) ?? grandMean;
    ssAB += c.n * (c.mean - mA - mB + grandMean) ** 2;
    for (const v of c.values) ssErr += (v - c.mean) ** 2;
  }

  const dfA = Math.max(1, levelsA.length - 1);
  const dfB = Math.max(1, levelsB.length - 1);
  const dfAB = Math.max(1, dfA * dfB);
  const dfErr = Math.max(1, rows.length - levelsA.length * levelsB.length);

  const msA = ssA / dfA;
  const msB = ssB / dfB;
  const msAB = ssAB / dfAB;
  const msErr = Math.max(1e-12, ssErr / dfErr);

  const fA = msA / msErr;
  const fB = msB / msErr;
  const fAB = msAB / msErr;

  const pA = fDistUpperP(fA, dfA, dfErr);
  const pB = fDistUpperP(fB, dfB, dfErr);
  const pAB = fDistUpperP(fAB, dfAB, dfErr);

  const table = [
    { source: 'Factor A (Main Effect)', ss: ssA, df: dfA, ms: msA, f: fA, p: pA },
    { source: 'Factor B (Main Effect)', ss: ssB, df: dfB, ms: msB, f: fB, p: pB },
    { source: 'A × B Interaction', ss: ssAB, df: dfAB, ms: msAB, f: fAB, p: pAB },
    { source: 'Residual Error', ss: ssErr, df: dfErr, ms: msErr, f: NaN, p: NaN },
  ];

  const summary =
    pAB < 0.05
      ? `Significant Factor A × B interaction detected (F(${dfAB},${dfErr}) = ${fAB.toFixed(2)}, p = ${pAB < 0.001 ? pAB.toExponential(2) : pAB.toFixed(4)}): the effect of Factor B depends strongly on Factor A.`
      : `No significant A × B interaction (p = ${pAB.toFixed(3)}). Main effects: Factor A p = ${pA < 0.001 ? pA.toExponential(2) : pA.toFixed(4)}, Factor B p = ${pB < 0.001 ? pB.toExponential(2) : pB.toFixed(4)}.`;

  return { levelsA, levelsB, cells, table, summary };
}

/* ============================================================================
 * 3. Longitudinal Time-Course Growth Curve Analyzer (Mean ± 95% CI + AUC + FDR)
 * ============================================================================ */

export interface TimeCourseRow {
  group: string;
  time: number;
  value: number;
}

export interface TimeCourseAnalysis {
  groups: string[];
  timepoints: number[];
  series: {
    group: string;
    auc: number;
    points: { time: number; mean: number; sem: number; ci95: number; n: number }[];
  }[];
  perTimepointP: { time: number; pRaw: number; pAdj: number; stars: string }[];
}

export function analyzeTimeCourse(rows: TimeCourseRow[]): TimeCourseAnalysis {
  const groups = [...new Set(rows.map((r) => r.group))];
  const timepoints = [...new Set(rows.map((r) => r.time))].sort((a, b) => a - b);

  const series = groups.map((g) => {
    const points = timepoints.map((t) => {
      const vals = rows.filter((r) => r.group === g && r.time === t).map((r) => r.value);
      const n = vals.length;
      const mean = n > 0 ? vals.reduce((a, b) => a + b, 0) / n : 0;
      const sd = n > 1 ? Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1)) : 0;
      const sem = n > 0 ? sd / Math.sqrt(n) : 0;
      return { time: t, mean, sem, ci95: 1.96 * sem, n };
    });
    // Trapezoidal AUC
    let auc = 0;
    for (let i = 1; i < points.length; i++) {
      auc += 0.5 * (points[i].mean + points[i - 1].mean) * (points[i].time - points[i - 1].time);
    }
    return { group: g, auc, points };
  });

  const rawPs = timepoints.map((t) => {
    if (groups.length < 2) return 1;
    const a = rows.filter((r) => r.group === groups[0] && r.time === t).map((r) => r.value);
    const b = rows.filter((r) => r.group === groups[1] && r.time === t).map((r) => r.value);
    if (a.length < 2 || b.length < 2) return 1;
    return welchTTest(a, b).p;
  });
  const adjPs = adjustPValues(rawPs, 'BH-FDR');
  const perTimepointP = timepoints.map((t, i) => ({
    time: t,
    pRaw: rawPs[i],
    pAdj: adjPs[i],
    stars: adjPs[i] < 0.001 ? '***' : adjPs[i] < 0.01 ? '**' : adjPs[i] < 0.05 ? '*' : 'ns',
  }));

  return { groups, timepoints, series, perTimepointP };
}

/* ============================================================================
 * 4. Wet-Lab Assay Calculators: qPCR ΔΔCt, ELISA 4PL Standard Curve, Michaelis-Menten
 * ============================================================================ */

export interface QpcrRawRow {
  sample: string;
  group: string;
  targetCt: number;
  hkCt: number;
}

export interface QpcrComputedRow extends QpcrRawRow {
  deltaCt: number;
  deltaDeltaCt: number;
  foldChange: number;
}

export function computeQpcrDeltaDeltaCt(
  rows: QpcrRawRow[],
  controlGroup?: string
): { controlGroup: string; meanControlDeltaCt: number; results: QpcrComputedRow[]; tidyCsv: string } {
  const ctrl = controlGroup || rows[0]?.group || 'Control';
  const withDct = rows.map((r) => ({ ...r, deltaCt: r.targetCt - r.hkCt }));
  const ctrlRows = withDct.filter((r) => r.group === ctrl);
  const meanControlDeltaCt =
    ctrlRows.length > 0
      ? ctrlRows.reduce((s, r) => s + r.deltaCt, 0) / ctrlRows.length
      : withDct.reduce((s, r) => s + r.deltaCt, 0) / Math.max(1, withDct.length);

  const results: QpcrComputedRow[] = withDct.map((r) => {
    const ddct = r.deltaCt - meanControlDeltaCt;
    const fc = Math.pow(2, -ddct);
    return {
      ...r,
      deltaCt: Number(r.deltaCt.toFixed(3)),
      deltaDeltaCt: Number(ddct.toFixed(3)),
      foldChange: Number(fc.toFixed(3)),
    };
  });

  const tidyCsv = [
    'group,value,subject',
    ...results.map((r) => `${r.group},${r.foldChange},${r.sample}`),
  ].join('\n');

  return { controlGroup: ctrl, meanControlDeltaCt, results, tidyCsv };
}

export interface ElisaStandardPoint {
  conc: number;
  od: number;
}

export interface ElisaUnknownInput {
  sample: string;
  odReplicates: number[];
}

export interface ElisaResult {
  bottom: number;
  top: number;
  ec50: number;
  hill: number;
  r2: number;
  curve: { conc: number; od: number }[];
  unknowns: {
    sample: string;
    meanOd: number;
    cvPct: number;
    interpolatedConc: number | null;
    qcFlag: 'Pass' | 'Warn (>10% CV)' | 'Out of Range';
  }[];
}

export function fitElisaStandardCurve(
  standards: ElisaStandardPoint[],
  unknowns: ElisaUnknownInput[]
): ElisaResult {
  const valid = standards.filter((s) => s.conc >= 0 && Number.isFinite(s.od));
  const ods = valid.map((s) => s.od);
  const bottom = Math.min(...ods) * 0.95;
  const top = Math.max(...ods) * 1.05;
  const posConcs = valid.filter((s) => s.conc > 0).map((s) => s.conc);
  const minC = Math.min(...posConcs, 0.1);
  const maxC = Math.max(...posConcs, 100);

  const eval4PL = (c: number, b: number, t: number, ec: number, h: number) =>
    c <= 0 ? b : b + (t - b) / (1 + Math.pow(ec / c, h));

  // Coarse + fine grid search in log10(EC50) and Hill slope (fast, deterministic, guaranteed convergence)
  let bestEc = Math.sqrt(minC * maxC);
  let bestHill = 1.0;
  let bestSse = Infinity;
  const logMin = Math.log10(minC * 0.25);
  const logMax = Math.log10(maxC * 4);

  for (let i = 0; i <= 40; i++) {
    const ec = Math.pow(10, logMin + (i / 40) * (logMax - logMin));
    for (let j = 0; j <= 20; j++) {
      const h = 0.5 + (j / 20) * 2.0;
      let sse = 0;
      for (const p of valid) {
        const pred = eval4PL(p.conc, bottom, top, ec, h);
        sse += (p.od - pred) ** 2;
      }
      if (sse < bestSse) {
        bestSse = sse;
        bestEc = ec;
        bestHill = h;
      }
    }
  }

  // Fine local polish
  const baseLogEc = Math.log10(bestEc);
  const baseHill = bestHill;
  for (let i = -10; i <= 10; i++) {
    const ec = Math.pow(10, baseLogEc + i * 0.015);
    for (let j = -10; j <= 10; j++) {
      const h = Math.max(0.3, baseHill + j * 0.02);
      let sse = 0;
      for (const p of valid) {
        const pred = eval4PL(p.conc, bottom, top, ec, h);
        sse += (p.od - pred) ** 2;
      }
      if (sse < bestSse) {
        bestSse = sse;
        bestEc = ec;
        bestHill = h;
      }
    }
  }

  const meanOdAll = ods.reduce((a, b) => a + b, 0) / Math.max(1, ods.length);
  const sst = ods.reduce((a, y) => a + (y - meanOdAll) ** 2, 0) || 1e-9;
  const r2 = Math.max(0, 1 - bestSse / sst);

  const curve: { conc: number; od: number }[] = [];
  for (let i = 0; i <= 40; i++) {
    const c = Math.pow(10, Math.log10(minC * 0.5) + (i / 40) * (Math.log10(maxC * 1.5) - Math.log10(minC * 0.5)));
    curve.push({ conc: c, od: eval4PL(c, bottom, top, bestEc, bestHill) });
  }

  const minStdOd = Math.min(...ods);
  const maxStdOd = Math.max(...ods);
  const interpUnknowns = unknowns.map((u) => {
    const m = u.odReplicates.reduce((a, b) => a + b, 0) / Math.max(1, u.odReplicates.length);
    const sd =
      u.odReplicates.length > 1
        ? Math.sqrt(u.odReplicates.reduce((a, v) => a + (v - m) ** 2, 0) / (u.odReplicates.length - 1))
        : 0;
    const cvPct = m > 0 ? (sd / m) * 100 : 0;
    if (m <= minStdOd || m >= maxStdOd) {
      return { sample: u.sample, meanOd: m, cvPct, interpolatedConc: null, qcFlag: 'Out of Range' as const };
    }
    const ratio = (top - bottom) / (m - bottom) - 1;
    const conc = ratio > 0 ? bestEc / Math.pow(ratio, 1 / bestHill) : null;
    return {
      sample: u.sample,
      meanOd: m,
      cvPct,
      interpolatedConc: conc !== null && Number.isFinite(conc) ? Number(conc.toFixed(2)) : null,
      qcFlag: cvPct > 10 ? ('Warn (>10% CV)' as const) : ('Pass' as const),
    };
  });

  return { bottom, top, ec50: bestEc, hill: bestHill, r2, curve, unknowns: interpUnknowns };
}

export interface KineticsPoint {
  substrate: number; // [S] (uM)
  velocity: number; // v (uM/min)
}

export interface MichaelisMentenResult {
  vmax: number;
  km: number;
  r2: number;
  curve: { s: number; v: number }[];
}

export function fitMichaelisMenten(points: KineticsPoint[]): MichaelisMentenResult {
  const valid = points.filter((p) => p.substrate >= 0 && p.velocity >= 0);
  const maxV = Math.max(1e-6, ...valid.map((p) => p.velocity));
  const maxS = Math.max(1e-6, ...valid.map((p) => p.substrate));

  let bestVmax = maxV * 1.1;
  let bestKm = maxS * 0.25;
  let bestSse = Infinity;

  // Coarse grid over Vmax and Km
  for (let i = 0; i <= 40; i++) {
    const vm = maxV * (0.6 + (i / 40) * 1.2);
    for (let j = 0; j <= 40; j++) {
      const km = maxS * Math.pow(10, -2.5 + (j / 40) * 2.8);
      let sse = 0;
      for (const p of valid) {
        const pred = (vm * p.substrate) / (km + p.substrate);
        sse += (p.velocity - pred) ** 2;
      }
      if (sse < bestSse) {
        bestSse = sse;
        bestVmax = vm;
        bestKm = km;
      }
    }
  }

  // Fine polish
  const bVm = bestVmax;
  const bKm = bestKm;
  for (let i = -12; i <= 12; i++) {
    const vm = bVm * (1 + i * 0.008);
    for (let j = -12; j <= 12; j++) {
      const km = Math.max(1e-6, bKm * (1 + j * 0.012));
      let sse = 0;
      for (const p of valid) {
        const pred = (vm * p.substrate) / (km + p.substrate);
        sse += (p.velocity - pred) ** 2;
      }
      if (sse < bestSse) {
        bestSse = sse;
        bestVmax = vm;
        bestKm = km;
      }
    }
  }

  const meanV = valid.reduce((a, p) => a + p.velocity, 0) / Math.max(1, valid.length);
  const sst = valid.reduce((a, p) => a + (p.velocity - meanV) ** 2, 0) || 1e-9;
  const r2 = Math.max(0, 1 - bestSse / sst);

  const curve = Array.from({ length: 45 }, (_, i) => {
    const s = (i / 44) * maxS * 1.1;
    return { s, v: (bestVmax * s) / (bestKm + s) };
  });

  return { vmax: bestVmax, km: bestKm, r2, curve };
}

/* ============================================================================
 * Curated Built-in Biological Demos for the Workbench
 * ============================================================================ */

export const DEMO_FACTORIAL_ROWS: FactorialRow[] = [
  { factorA: 'Wild-Type', factorB: 'Vehicle', value: 18.4 },
  { factorA: 'Wild-Type', factorB: 'Vehicle', value: 17.2 },
  { factorA: 'Wild-Type', factorB: 'Vehicle', value: 19.6 },
  { factorA: 'Wild-Type', factorB: 'Vehicle', value: 16.9 },
  { factorA: 'Wild-Type', factorB: 'IFN-γ', value: 47.8 },
  { factorA: 'Wild-Type', factorB: 'IFN-γ', value: 44.5 },
  { factorA: 'Wild-Type', factorB: 'IFN-γ', value: 50.1 },
  { factorA: 'Wild-Type', factorB: 'IFN-γ', value: 46.2 },
  { factorA: 'STAT1 KO', factorB: 'Vehicle', value: 16.8 },
  { factorA: 'STAT1 KO', factorB: 'Vehicle', value: 15.9 },
  { factorA: 'STAT1 KO', factorB: 'Vehicle', value: 17.5 },
  { factorA: 'STAT1 KO', factorB: 'Vehicle', value: 16.1 },
  { factorA: 'STAT1 KO', factorB: 'IFN-γ', value: 19.4 },
  { factorA: 'STAT1 KO', factorB: 'IFN-γ', value: 18.2 },
  { factorA: 'STAT1 KO', factorB: 'IFN-γ', value: 20.6 },
  { factorA: 'STAT1 KO', factorB: 'IFN-γ', value: 18.9 },
];

export const DEMO_TIMECOURSE_ROWS: TimeCourseRow[] = [
  // Vehicle tumor volume (mm3)
  ...[0, 4, 8, 12, 16, 20, 24].flatMap((day) => {
    const base = 95 * Math.exp(0.115 * day);
    return [0.91, 0.98, 1.04, 1.09, 0.95].map((m) => ({
      group: 'Vehicle Control',
      time: day,
      value: Number((base * m).toFixed(1)),
    }));
  }),
  // Anti-PD1 + Kinase Inhibitor
  ...[0, 4, 8, 12, 16, 20, 24].flatMap((day) => {
    const base = 95 * Math.exp(0.032 * day);
    return [0.89, 0.97, 1.03, 1.11, 0.96].map((m) => ({
      group: 'Combination Therapy',
      time: day,
      value: Number((base * m).toFixed(1)),
    }));
  }),
];

export const DEMO_QPCR_ROWS: QpcrRawRow[] = [
  { sample: 'Ctrl_1', group: 'Control', targetCt: 26.4, hkCt: 18.1 },
  { sample: 'Ctrl_2', group: 'Control', targetCt: 26.8, hkCt: 18.3 },
  { sample: 'Ctrl_3', group: 'Control', targetCt: 26.1, hkCt: 17.9 },
  { sample: 'Ctrl_4', group: 'Control', targetCt: 26.5, hkCt: 18.0 },
  { sample: 'Low_1', group: 'Low_Dose', targetCt: 24.8, hkCt: 18.2 },
  { sample: 'Low_2', group: 'Low_Dose', targetCt: 24.4, hkCt: 18.0 },
  { sample: 'Low_3', group: 'Low_Dose', targetCt: 24.9, hkCt: 18.1 },
  { sample: 'Low_4', group: 'Low_Dose', targetCt: 24.6, hkCt: 18.0 },
  { sample: 'High_1', group: 'High_Dose', targetCt: 22.9, hkCt: 18.0 },
  { sample: 'High_2', group: 'High_Dose', targetCt: 23.2, hkCt: 18.2 },
  { sample: 'High_3', group: 'High_Dose', targetCt: 22.7, hkCt: 17.9 },
  { sample: 'High_4', group: 'High_Dose', targetCt: 23.1, hkCt: 18.1 },
];

export const DEMO_ELISA_STANDARDS: ElisaStandardPoint[] = [
  { conc: 0, od: 0.082 },
  { conc: 7.8, od: 0.145 },
  { conc: 15.6, od: 0.242 },
  { conc: 31.25, od: 0.435 },
  { conc: 62.5, od: 0.782 },
  { conc: 125, od: 1.325 },
  { conc: 250, od: 1.894 },
  { conc: 500, od: 2.312 },
  { conc: 1000, od: 2.518 },
];

export const DEMO_ELISA_UNKNOWNS: ElisaUnknownInput[] = [
  { sample: 'Donor_1_Ctrl', odReplicates: [0.312, 0.326] },
  { sample: 'Donor_2_Ctrl', odReplicates: [0.285, 0.294] },
  { sample: 'Donor_1_Stim', odReplicates: [1.624, 1.658] },
  { sample: 'Donor_2_Stim', odReplicates: [1.815, 1.792] },
  { sample: 'High_Outlier', odReplicates: [2.62, 2.59] },
];

export const DEMO_KINETICS_POINTS: KineticsPoint[] = [
  { substrate: 0, velocity: 0 },
  { substrate: 2.5, velocity: 14.8 },
  { substrate: 5, velocity: 26.2 },
  { substrate: 10, velocity: 43.5 },
  { substrate: 20, velocity: 62.1 },
  { substrate: 40, velocity: 78.4 },
  { substrate: 80, velocity: 89.2 },
  { substrate: 160, velocity: 95.8 },
  { substrate: 320, velocity: 98.9 },
];
