import React from 'react';
import type { JournalCaseId } from '../../lib/journalCasesCatalog';
import type { ParsedTable } from '../../lib/csvParser';
import type { ResolvedPlotTheme } from '../../types/biograce';
import { computeKDE } from '../../lib/statsEngine';
import { niceTicks, pickCol, quartiles } from '../../lib/journalCasesDataParser';

export interface CaseRenderCtx {
  W: number;
  H: number;
  theme: ResolvedPlotTheme;
  inkPrimary: string;
  inkAxis: string;
  inkSecondary: string;
  bgStroke: string;
  baseFs: number;
  tickLen: number;
  customTable?: ParsedTable | null;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-9, rng()))) * Math.cos(2 * Math.PI * rng());
}

export function renderAxisFrame(
  ctx: CaseRenderCtx,
  x0: number,
  y0: number,
  w: number,
  h: number
) {
  return (
    <g stroke={ctx.inkAxis} strokeWidth={ctx.theme.axesLinewidth}>
      <line x1={x0} x2={x0 + w} y1={y0 + h} y2={y0 + h} />
      <line x1={x0} x2={x0} y1={y0} y2={y0 + h} />
      {ctx.theme.topRightSpines && (
        <>
          <line x1={x0} x2={x0 + w} y1={y0} y2={y0} />
          <line x1={x0 + w} x2={x0 + w} y1={y0} y2={y0 + h} />
        </>
      )}
    </g>
  );
}

/** Render Cases 01 through 10 as crisp, journal-styled vector SVG groups (live CSV + demo fallback) */
export function renderCasePartA(caseId: JournalCaseId, ctx: CaseRenderCtx): React.ReactNode {
  const { W, H, theme, inkPrimary, inkAxis, inkSecondary, bgStroke, baseFs, tickLen, customTable } = ctx;
  const pal = theme.palette.colors;
  const M = { top: 68, right: 44, bottom: 68, left: 82 };
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;

  if (caseId === '01-error-dotplot') {
    const rng = mulberry32(101);
    let groupSeries: { name: string; pts: number[] }[] = [];
    let yLabel = 'Cytokine Secretion (pg/mL)';
    if (customTable && customTable.rows.length > 0) {
      const gCol = pickCol(customTable.headers, ['group', 'treatment', 'condition'], 0);
      const vCol = pickCol(customTable.headers, ['value', 'measurement', 'readout'], 1);
      yLabel = vCol;
      const map = new Map<string, number[]>();
      for (const r of customTable.rows) {
        const g = (r[gCol] ?? '').trim();
        const v = Number(r[vCol]);
        if (!g || !Number.isFinite(v)) continue;
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(v);
      }
      groupSeries = [...map.entries()].slice(0, 8).map(([name, pts]) => ({ name, pts }));
    }
    if (groupSeries.length === 0) {
      groupSeries = [
        { name: 'Control', pts: Array.from({ length: 14 }, () => 18 + randn(rng) * 2.8) },
        { name: '0.1 µM', pts: Array.from({ length: 14 }, () => 25 + randn(rng) * 3.4) },
        { name: '1.0 µM', pts: Array.from({ length: 14 }, () => 36 + randn(rng) * 4.1) },
        { name: '10 µM', pts: Array.from({ length: 14 }, () => 49 + randn(rng) * 4.6) },
      ];
    }
    const allVals = groupSeries.flatMap((g) => g.pts);
    const lo = Math.min(...allVals);
    const hi = Math.max(...allVals);
    const pad = (hi - lo || 10) * 0.18;
    const yMin = lo - pad;
    const yMax = hi + pad;
    const toY = (v: number) => M.top + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;
    const ticks = niceTicks(yMin, yMax, 5);
    const step = pw / groupSeries.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {groupSeries.map((g, gi) => {
          const cx = M.left + (gi + 0.5) * step;
          const col = pal[gi % pal.length];
          const m = g.pts.reduce((a, b) => a + b, 0) / g.pts.length;
          const s = g.pts.length > 1 ? Math.sqrt(g.pts.reduce((a, b) => a + (b - m) ** 2, 0) / (g.pts.length - 1)) : 0;
          return (
            <g key={g.name}>
              {g.pts.map((v, i) => (
                <circle key={i} cx={cx + (rng() - 0.5) * Math.min(44, step * 0.4)} cy={toY(v)} r={4.2} fill={col} fillOpacity={0.45} stroke={col} strokeWidth={0.7} />
              ))}
              <line x1={cx} x2={cx} y1={toY(m + s)} y2={toY(m - s)} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.5} />
              <line x1={cx - 10} x2={cx + 10} y1={toY(m + s)} y2={toY(m + s)} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.5} />
              <line x1={cx - 10} x2={cx + 10} y1={toY(m - s)} y2={toY(m - s)} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.5} />
              <circle cx={cx} cy={toY(m)} r={6.2} fill={col} stroke={bgStroke} strokeWidth={1.8} />
              <text x={cx} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>{g.name}</text>
            </g>
          );
        })}
        <text x={M.left + pw / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Experimental Group</text>
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>{yLabel}</text>
      </g>
    );
  }

  if (caseId === '02-grouped-error-dotplot') {
    const rng = mulberry32(202);
    let genotypes: string[] = [];
    let treats: string[] = [];
    const cellMap = new Map<string, number[]>();
    let yLabel = 'Phospho-STAT1 Activity (AU)';

    if (customTable && customTable.rows.length > 0) {
      const gCol = pickCol(customTable.headers, ['genotype', 'group', 'background'], 0);
      const tCol = pickCol(customTable.headers, ['treatment', 'condition', 'arm'], 1);
      const vCol = pickCol(customTable.headers, ['value', 'activity', 'readout'], 2);
      yLabel = vCol;
      for (const r of customTable.rows) {
        const g = (r[gCol] ?? '').trim();
        const t = (r[tCol] ?? '').trim();
        const v = Number(r[vCol]);
        if (!g || !t || !Number.isFinite(v)) continue;
        if (!genotypes.includes(g)) genotypes.push(g);
        if (!treats.includes(t)) treats.push(t);
        const key = `${g}|||${t}`;
        if (!cellMap.has(key)) cellMap.set(key, []);
        cellMap.get(key)!.push(v);
      }
      genotypes = genotypes.slice(0, 5);
      treats = treats.slice(0, 4);
    }

    if (genotypes.length === 0 || treats.length === 0) {
      genotypes = ['Wild-Type', 'STAT1 KO', 'Rescue'];
      treats = ['Vehicle', 'IFN-γ', 'IFN-γ + Inh'];
      const mus = [
        [18, 46, 26],
        [16, 20, 17],
        [19, 43, 24],
      ];
      genotypes.forEach((g, gi) =>
        treats.forEach((t, ti) => {
          cellMap.set(
            `${g}|||${t}`,
            Array.from({ length: 9 }, () => mus[gi][ti] + randn(rng) * 3.4)
          );
        })
      );
    }

    const allVals = [...cellMap.values()].flat();
    const lo = Math.min(...allVals);
    const hi = Math.max(...allVals);
    const pad = (hi - lo || 10) * 0.2;
    const yMin = lo - pad;
    const yMax = hi + pad;
    const toY = (v: number) => M.top + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;
    const ticks = niceTicks(yMin, yMax, 5);
    const gStep = pw / genotypes.length;
    const subSpan = Math.min(52, (gStep * 0.65) / Math.max(1, treats.length));

    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {genotypes.map((gen, gi) => {
          const gCx = M.left + (gi + 0.5) * gStep;
          return (
            <g key={gen}>
              <text x={gCx} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>{gen}</text>
              {treats.map((tr, ti) => {
                const cx = gCx + (ti - (treats.length - 1) / 2) * subSpan;
                const col = pal[ti % pal.length];
                const pts = cellMap.get(`${gen}|||${tr}`) ?? [];
                if (pts.length === 0) return null;
                const m = pts.reduce((a, b) => a + b, 0) / pts.length;
                const s = pts.length > 1 ? Math.sqrt(pts.reduce((a, b) => a + (b - m) ** 2, 0) / (pts.length - 1)) : 0;
                return (
                  <g key={`${gen}-${tr}`}>
                    {pts.map((v, k) => (
                      <circle key={k} cx={cx + (rng() - 0.5) * 14} cy={toY(v)} r={3.6} fill={col} fillOpacity={0.45} />
                    ))}
                    <line x1={cx} x2={cx} y1={toY(m + s)} y2={toY(m - s)} stroke={col} strokeWidth={theme.lineWidth * 1.6} />
                    <circle cx={cx} cy={toY(m)} r={5.4} fill={col} stroke={bgStroke} strokeWidth={1.6} />
                  </g>
                );
              })}
            </g>
          );
        })}
        <g transform={`translate(${W - M.right - Math.min(340, treats.length * 92)}, ${M.top - 22})`}>
          {treats.map((tr, i) => (
            <g key={tr} transform={`translate(${i * 92}, 0)`}>
              <circle cx={0} cy={0} r={4.5} fill={pal[i % pal.length]} />
              <text x={10} y={4} fill={inkPrimary} fontSize={baseFs - 1.2} fontWeight={600}>{tr}</text>
            </g>
          ))}
        </g>
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>{yLabel}</text>
      </g>
    );
  }

  if (caseId === '03-multi-volcano') {
    const rng = mulberry32(303);
    let clusterData: { name: string; dots: { gene: string; fc: number; sig: boolean }[] }[] = [];
    if (customTable && customTable.rows.length > 0) {
      const cCol = pickCol(customTable.headers, ['cluster', 'cell_type', 'contrast'], 0);
      const gCol = pickCol(customTable.headers, ['gene', 'symbol', 'feature'], 1);
      const fcCol = pickCol(customTable.headers, ['log2fc', 'avg_log2fc', 'logfc'], 2);
      const pCol = pickCol(customTable.headers, ['padj', 'p_val_adj', 'fdr', 'pvalue'], 3);
      const map = new Map<string, { gene: string; fc: number; sig: boolean }[]>();
      for (const r of customTable.rows) {
        const cl = (r[cCol] ?? '').trim();
        const gene = (r[gCol] ?? '').trim();
        const fc = Number(r[fcCol]);
        const p = Number(r[pCol]);
        if (!cl || !Number.isFinite(fc)) continue;
        if (!map.has(cl)) map.set(cl, []);
        map.get(cl)!.push({ gene, fc, sig: (Number.isFinite(p) ? p < 0.05 : true) && Math.abs(fc) >= 1.0 });
      }
      clusterData = [...map.entries()].slice(0, 8).map(([name, dots]) => ({ name, dots }));
    }
    if (clusterData.length === 0) {
      const clusters = ['CD4 T', 'CD8 T', 'NK', 'B Cell', 'Mono', 'cDC'];
      const topGenes = [
        ['IL7R', 'CCR7'],
        ['GZMB', 'CD8A'],
        ['GNLY', 'NKG7'],
        ['MS4A1', 'CD79A'],
        ['S100A8', 'LYZ'],
        ['HLA-DRA', 'CD1C'],
      ];
      clusterData = clusters.map((name, ci) => {
        const dots = Array.from({ length: 64 }, () => {
          const fc = randn(rng) * 1.45;
          return { gene: '', fc, sig: Math.abs(fc) > 1.3 };
        });
        dots.push({ gene: topGenes[ci][0], fc: 3.4, sig: true });
        dots.push({ gene: topGenes[ci][1], fc: -3.2, sig: true });
        return { name, dots };
      });
    }

    const maxAbs = Math.max(4.5, ...clusterData.flatMap((c) => c.dots.map((d) => Math.abs(d.fc) + 0.6)));
    const step = pw / clusterData.length;
    const toY = (v: number) => M.top + ph - ((v + maxAbs) / (2 * maxAbs)) * ph;
    const zeroY = toY(0);
    const ticks = niceTicks(-maxAbs, maxAbs, 5);
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {clusterData.map((cl, ci) => {
          const cx = M.left + (ci + 0.5) * step;
          const col = pal[ci % pal.length];
          const topUp = [...cl.dots].filter((d) => d.gene && d.fc > 0).sort((a, b) => b.fc - a.fc)[0];
          const topDn = [...cl.dots].filter((d) => d.gene && d.fc < 0).sort((a, b) => a.fc - b.fc)[0];
          return (
            <g key={cl.name}>
              <rect x={cx - step * 0.42} y={M.top + 4} width={step * 0.84} height={ph - 8} rx={6} fill={inkPrimary} fillOpacity={0.03} />
              {cl.dots.map((d, i) => {
                if (Math.abs(d.fc) < 0.25) return null;
                return (
                  <circle
                    key={i}
                    cx={cx + (rng() - 0.5) * (step * 0.62)}
                    cy={toY(Math.max(-maxAbs * 0.95, Math.min(maxAbs * 0.95, d.fc)))}
                    r={d.sig ? 3.2 : 2.1}
                    fill={d.sig ? (d.fc > 0 ? theme.palette.upColor : theme.palette.downColor) : theme.palette.nsColor}
                    fillOpacity={d.sig ? 0.88 : 0.45}
                  />
                );
              })}
              <rect x={cx - step * 0.42} y={zeroY - 13} width={step * 0.84} height={26} rx={5} fill={col} />
              <text x={cx} y={zeroY + 4} textAnchor="middle" fill="#FFFFFF" fontSize={baseFs - 1.2} fontWeight={700}>{cl.name}</text>
              {topUp && <text x={cx} y={Math.max(M.top + 16, toY(topUp.fc) - 8)} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={700}>{topUp.gene}</text>}
              {topDn && <text x={cx} y={Math.min(M.top + ph - 6, toY(topDn.fc) + 14)} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={700}>{topDn.gene}</text>}
            </g>
          );
        })}
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Average log2 Fold Change</text>
      </g>
    );
  }

  if (caseId === '04-manhattan-twas') {
    const rng = mulberry32(404);
    let pts: { x: number; y: number; chr: number; gene?: string }[] = [];
    let chrCenters: { chr: number; x: number }[] = [];
    let totalX = 1;

    if (customTable && customTable.rows.length > 0) {
      const cCol = pickCol(customTable.headers, ['chr', 'chromosome'], 0);
      const posCol = pickCol(customTable.headers, ['pos', 'bp', 'position'], 1);
      const gCol = pickCol(customTable.headers, ['gene', 'snp', 'rsid', 'locus'], 2);
      const pCol = pickCol(customTable.headers, ['pvalue', 'p', 'p_val'], 3);
      const raw = customTable.rows
        .map((r) => ({
          chr: Number(String(r[cCol] ?? '').replace(/^chr/i, '')) || 1,
          pos: Number(r[posCol]) || 0,
          gene: (r[gCol] ?? '').trim(),
          p: Number(r[pCol]),
        }))
        .filter((d) => Number.isFinite(d.p) && d.p > 0)
        .sort((a, b) => a.chr - b.chr || a.pos - b.pos);

      if (raw.length > 0) {
        const chrSet = [...new Set(raw.map((r) => r.chr))];
        let cursor = 0;
        for (const c of chrSet) {
          const rowsC = raw.filter((r) => r.chr === c);
          const start = cursor + 1;
          for (const r of rowsC) {
            cursor += 1;
            const nlp = Math.min(30, -Math.log10(Math.max(1e-30, r.p)));
            pts.push({ x: cursor, y: nlp, chr: c, gene: nlp >= 7.3 ? r.gene : undefined });
          }
          chrCenters.push({ chr: c, x: (start + cursor) / 2 });
        }
        totalX = Math.max(2, cursor + 1);
      }
    }

    if (pts.length === 0) {
      const chrs = 16;
      const peaks: Record<number, { gene: string; val: number }> = {
        2: { gene: 'IL23R', val: 12.6 },
        6: { gene: 'HLA-DRB1', val: 14.8 },
        11: { gene: 'FADS2', val: 10.4 },
        14: { gene: 'APOE', val: 13.4 },
      };
      let cursor = 0;
      for (let c = 1; c <= chrs; c++) {
        const n = 28;
        const start = cursor;
        for (let i = 0; i < n; i++) {
          cursor++;
          let nlp = -Math.log10(Math.max(1e-4, rng())) * 1.45;
          let gene: string | undefined;
          if (peaks[c] && i === 14) {
            nlp = peaks[c].val;
            gene = peaks[c].gene;
          } else if (peaks[c] && Math.abs(i - 14) <= 2) {
            nlp = peaks[c].val * (0.62 + rng() * 0.22);
          }
          pts.push({ x: cursor, y: Math.min(15.5, nlp), chr: c, gene });
        }
        chrCenters.push({ chr: c, x: (start + cursor) / 2 });
      }
      totalX = cursor + 2;
    }

    const maxY = Math.max(10, ...pts.map((p) => p.y)) * 1.12;
    const toX = (x: number) => M.left + (x / totalX) * pw;
    const toY = (y: number) => M.top + ph - (y / maxY) * ph;
    const sigY = toY(7.3);
    const ticks = niceTicks(0, maxY, 5);
    const labeledPts = pts.filter((p) => p.gene).sort((a, b) => b.y - a.y).slice(0, 8);
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        <line x1={M.left} x2={M.left + pw} y1={sigY} y2={sigY} stroke={theme.palette.upColor} strokeDasharray="5 4" strokeWidth={theme.lineWidth} />
        <text x={M.left + pw - 6} y={sigY - 6} textAnchor="end" fill={theme.palette.upColor} fontSize={baseFs - 1.5} fontWeight={600}>Genome-wide p = 5×10⁻⁸</text>
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.x)}
            cy={toY(p.y)}
            r={p.gene ? 4.8 : p.y > 7.3 ? 3.4 : 2.6}
            fill={p.y > 7.3 ? theme.palette.upColor : p.chr % 2 === 1 ? pal[0] : pal[5] ?? '#94A3B8'}
            fillOpacity={p.y > 7.3 ? 0.95 : 0.72}
            stroke={p.gene ? inkPrimary : 'none'}
            strokeWidth={p.gene ? 1.2 : 0}
          />
        ))}
        {labeledPts.map((p, idx) => (
          <text key={`${p.gene}-${idx}`} x={toX(p.x)} y={toY(p.y) - 9} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={700}>{p.gene}</text>
        ))}
        {chrCenters.map((c) => (
          <text key={c.chr} x={toX(c.x)} y={M.top + ph + 19} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1.8}>{c.chr}</text>
        ))}
        <text x={M.left + pw / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Chromosome</text>
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>−log10(P-value)</text>
      </g>
    );
  }

  if (caseId === '05-paired-boxplot') {
    const rng = mulberry32(505);
    let pairs: { a: number; b: number }[] = [];
    let lblA = 'Baseline (Day 0)';
    let lblB = 'Post-Tx (Day 28)';
    let yLabel = 'CD8+ Infiltration Score';

    if (customTable && customTable.rows.length > 0) {
      const sCol = pickCol(customTable.headers, ['subject', 'patient', 'donor', 'mouse'], 0);
      const gCol = pickCol(customTable.headers, ['group', 'timepoint', 'condition'], 1);
      const vCol = pickCol(customTable.headers, ['value', 'score', 'measurement'], 2);
      yLabel = vCol;
      const groups: string[] = [];
      const bySubj = new Map<string, Record<string, number>>();
      for (const r of customTable.rows) {
        const s = (r[sCol] ?? '').trim();
        const g = (r[gCol] ?? '').trim();
        const v = Number(r[vCol]);
        if (!s || !g || !Number.isFinite(v)) continue;
        if (!groups.includes(g)) groups.push(g);
        if (!bySubj.has(s)) bySubj.set(s, {});
        bySubj.get(s)![g] = v;
      }
      if (groups.length >= 2) {
        lblA = groups[0];
        lblB = groups[1];
        for (const rec of bySubj.values()) {
          if (Number.isFinite(rec[lblA]) && Number.isFinite(rec[lblB])) {
            pairs.push({ a: rec[lblA], b: rec[lblB] });
          }
        }
      }
    }

    if (pairs.length < 2) {
      pairs = Array.from({ length: 14 }, () => {
        const a = 24 + randn(rng) * 7.5;
        return { a, b: a + 12.5 + randn(rng) * 3.8 };
      });
    }

    const allV = pairs.flatMap((p) => [p.a, p.b]);
    const lo = Math.min(...allV);
    const hi = Math.max(...allV);
    const pad = (hi - lo || 10) * 0.22;
    const yMin = lo - pad * 0.7;
    const yMax = hi + pad * 1.1;
    const toY = (v: number) => M.top + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;
    const ticks = niceTicks(yMin, yMax, 5);
    const x1 = M.left + pw * 0.3;
    const x2 = M.left + pw * 0.7;
    const b1 = quartiles(pairs.map((p) => p.a));
    const b2 = quartiles(pairs.map((p) => p.b));
    const diffs = pairs.map((p) => p.b - p.a);
    const meanD = diffs.reduce((a, b) => a + b, 0) / diffs.length;

    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {[
          { x: x1, b: b1, col: pal[0], lbl: lblA },
          { x: x2, b: b2, col: pal[1], lbl: lblB },
        ].map(({ x, b, col, lbl }) => (
          <g key={lbl}>
            <line x1={x} x2={x} y1={toY(b.max)} y2={toY(b.min)} stroke={inkPrimary} strokeWidth={theme.lineWidth} />
            <rect x={x - 36} y={toY(b.q3)} width={72} height={Math.max(4, toY(b.q1) - toY(b.q3))} rx={4} fill={col} fillOpacity={0.22} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.2} />
            <line x1={x - 36} x2={x + 36} y1={toY(b.med)} y2={toY(b.med)} stroke={inkPrimary} strokeWidth={theme.lineWidth * 2.2} />
            <text x={x} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>{lbl}</text>
          </g>
        ))}
        {pairs.map((p, i) => (
          <g key={i}>
            <line x1={x1} y1={toY(p.a)} x2={x2} y2={toY(p.b)} stroke={inkSecondary} strokeOpacity={0.45} strokeWidth={1.2} />
            <circle cx={x1} cy={toY(p.a)} r={4.3} fill={pal[0]} stroke={bgStroke} strokeWidth={1.2} />
            <circle cx={x2} cy={toY(p.b)} r={4.3} fill={pal[1]} stroke={bgStroke} strokeWidth={1.2} />
          </g>
        ))}
        <path d={`M ${x1} ${M.top + 26} L ${x1} ${M.top + 18} L ${x2} ${M.top + 18} L ${x2} ${M.top + 26}`} fill="none" stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
        <text x={(x1 + x2) / 2} y={M.top + 12} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={700}>
          Paired N = {pairs.length} · Mean Δ = {meanD >= 0 ? '+' : ''}{meanD.toFixed(2)}
        </text>
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>{yLabel}</text>
      </g>
    );
  }

  if (caseId === '06-raincloud') {
    const rng = mulberry32(606);
    let cohorts: { name: string; vals: number[] }[] = [];
    let xLabel = 'Immune Exhaustion Signature Score';
    if (customTable && customTable.rows.length > 0) {
      const gCol = pickCol(customTable.headers, ['group', 'cohort', 'condition'], 0);
      const vCol = pickCol(customTable.headers, ['value', 'score', 'expression'], 1);
      xLabel = vCol;
      const map = new Map<string, number[]>();
      for (const r of customTable.rows) {
        const g = (r[gCol] ?? '').trim();
        const v = Number(r[vCol]);
        if (!g || !Number.isFinite(v)) continue;
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(v);
      }
      cohorts = [...map.entries()].slice(0, 6).map(([name, vals]) => ({ name, vals }));
    }
    if (cohorts.length === 0) {
      cohorts = [
        { name: 'Healthy', vals: Array.from({ length: 28 }, () => 24 + randn(rng) * 4.5) },
        { name: 'Early Stage', vals: Array.from({ length: 28 }, () => 38 + randn(rng) * 6.5) },
        { name: 'Advanced', vals: [...Array.from({ length: 14 }, () => 42 + randn(rng) * 3.8), ...Array.from({ length: 14 }, () => 64 + randn(rng) * 4.4)] },
      ];
    }
    const allV = cohorts.flatMap((c) => c.vals);
    const lo = Math.min(...allV);
    const hi = Math.max(...allV);
    const pad = (hi - lo || 10) * 0.16;
    const xMin = lo - pad;
    const xMax = hi + pad;
    const toX = (v: number) => M.left + 20 + ((v - xMin) / (xMax - xMin || 1)) * (pw - 24);
    const ticks = niceTicks(xMin, xMax, 5);
    const rowH = ph / cohorts.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left + 20, M.top, pw - 24, ph)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={toX(t)} x2={toX(t)} y1={M.top + ph} y2={M.top + ph + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={toX(t)} y={M.top + ph + 20} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {cohorts.map((c, idx) => {
          const cy = M.top + (idx + 0.58) * rowH;
          const col = pal[idx % pal.length];
          const kde = computeKDE(c.vals, xMin + pad * 0.2, xMax - pad * 0.2, 48);
          const maxD = Math.max(1e-9, ...kde.map((p) => p.density));
          const path = [
            `M ${toX(kde[0].y).toFixed(1)} ${(cy - 8).toFixed(1)}`,
            ...kde.map((p, i) => {
              const edge = Math.min(i, kde.length - 1 - i);
              const taper = edge < 4 ? edge / 4 : 1;
              return `L ${toX(p.y).toFixed(1)} ${(cy - 8 - (p.density / maxD) * taper * (rowH * 0.45)).toFixed(1)}`;
            }),
            `L ${toX(kde[kde.length - 1].y).toFixed(1)} ${(cy - 8).toFixed(1)} Z`,
          ].join(' ');
          const q = quartiles(c.vals);
          return (
            <g key={c.name}>
              <path d={path} fill={col} fillOpacity={0.28} stroke={col} strokeWidth={theme.lineWidth * 1.25} />
              <rect x={toX(q.q1)} y={cy - 5} width={Math.max(4, toX(q.q3) - toX(q.q1))} height={12} rx={3} fill={col} fillOpacity={0.2} stroke={inkPrimary} strokeWidth={1.3} />
              <line x1={toX(q.med)} x2={toX(q.med)} y1={cy - 5} y2={cy + 7} stroke={inkPrimary} strokeWidth={2.3} />
              {c.vals.map((v, k) => (
                <circle key={k} cx={toX(v)} cy={cy + 16 + (k % 3) * 5.5} r={3.3} fill={col} fillOpacity={0.78} />
              ))}
              <text x={M.left + 10} y={cy + 4} textAnchor="end" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>{c.name}</text>
            </g>
          );
        })}
        <text x={M.left + 20 + (pw - 24) / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>{xLabel}</text>
      </g>
    );
  }

  if (caseId === '07-swimmer') {
    let patients: { id: string; mo: number; armName: string; cr: number | null; pr: number | null; ongoing: boolean }[] = [];
    if (customTable && customTable.rows.length > 0) {
      const idCol = pickCol(customTable.headers, ['patient', 'subject', 'id'], 0);
      const moCol = pickCol(customTable.headers, ['months', 'duration', 'time'], 1);
      const armCol = pickCol(customTable.headers, ['arm', 'cohort', 'treatment'], 2);
      const prCol = pickCol(customTable.headers, ['pr_month', 'pr'], 3);
      const crCol = pickCol(customTable.headers, ['cr_month', 'cr'], 4);
      const ongCol = pickCol(customTable.headers, ['ongoing', 'active'], 5);
      patients = customTable.rows
        .map((r, idx) => {
          const mo = Number(r[moCol]);
          const prV = r[prCol] ? Number(r[prCol]) : NaN;
          const crV = r[crCol] ? Number(r[crCol]) : NaN;
          const ongRaw = String(r[ongCol] ?? '').toLowerCase();
          return {
            id: (r[idCol] ?? `PT-${idx + 1}`).trim(),
            mo,
            armName: (r[armCol] ?? 'Cohort').trim(),
            pr: Number.isFinite(prV) ? prV : null,
            cr: Number.isFinite(crV) ? crV : null,
            ongoing: ongRaw === '1' || ongRaw === 'true' || ongRaw === 'yes',
          };
        })
        .filter((p) => Number.isFinite(p.mo) && p.mo > 0)
        .sort((a, b) => b.mo - a.mo)
        .slice(0, 14);
    }
    if (patients.length === 0) {
      patients = [
        { id: 'PT-01', mo: 22.5, armName: 'Combo', cr: 5.5, pr: 2.2, ongoing: true },
        { id: 'PT-02', mo: 20.0, armName: 'Combo', cr: 7.0, pr: 3.1, ongoing: true },
        { id: 'PT-03', mo: 18.2, armName: 'Mono', cr: null, pr: 3.8, ongoing: true },
        { id: 'PT-04', mo: 16.4, armName: 'Combo', cr: 6.2, pr: 2.6, ongoing: false },
        { id: 'PT-05', mo: 14.5, armName: 'Mono', cr: null, pr: 4.1, ongoing: true },
        { id: 'PT-06', mo: 12.8, armName: 'Combo', cr: null, pr: 3.0, ongoing: false },
        { id: 'PT-07', mo: 10.6, armName: 'Mono', cr: null, pr: 4.5, ongoing: false },
        { id: 'PT-08', mo: 8.4, armName: 'Mono', cr: null, pr: null, ongoing: false },
        { id: 'PT-09', mo: 6.5, armName: 'Combo', cr: null, pr: null, ongoing: false },
        { id: 'PT-10', mo: 4.4, armName: 'Mono', cr: null, pr: null, ongoing: false },
      ];
    }
    const arms = [...new Set(patients.map((p) => p.armName))];
    const maxMo = Math.max(12, ...patients.map((p) => p.mo)) * 1.12;
    const toX = (m: number) => M.left + (m / maxMo) * pw;
    const ticks = niceTicks(0, maxMo, 6);
    const rowH = ph / patients.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={toX(t)} x2={toX(t)} y1={M.top + ph} y2={M.top + ph + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={toX(t)} y={M.top + ph + 20} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {patients.map((p, idx) => {
          const cy = M.top + (idx + 0.5) * rowH;
          const armIdx = Math.max(0, arms.indexOf(p.armName));
          const col = pal[armIdx % pal.length];
          const barW = Math.max(2, toX(p.mo) - M.left);
          const barH = Math.min(20, rowH * 0.56);
          return (
            <g key={`${p.id}-${idx}`}>
              <rect x={M.left} y={cy - barH / 2} width={barW} height={barH} rx={4} fill={col} fillOpacity={0.78} />
              <text x={M.left - 10} y={cy + 4} textAnchor="end" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={600}>{p.id}</text>
              {p.pr !== null && <circle cx={toX(p.pr)} cy={cy} r={5} fill="#FFFFFF" stroke={inkPrimary} strokeWidth={1.6} />}
              {p.cr !== null && <polygon points={`${toX(p.cr)},${cy - 6} ${toX(p.cr) + 6},${cy} ${toX(p.cr)},${cy + 6} ${toX(p.cr) - 6},${cy}`} fill={pal[2] ?? '#009E73'} stroke="#FFFFFF" strokeWidth={1.2} />}
              {p.ongoing && <text x={toX(p.mo) + 8} y={cy + 5} fill={col} fontSize={14} fontWeight={700}>→</text>}
            </g>
          );
        })}
        <g transform={`translate(${W - M.right - 310}, ${M.top + 8})`} fontSize={baseFs - 1.5}>
          {arms.slice(0, 2).map((a, i) => (
            <g key={a} transform={`translate(${i * 86}, 0)`}>
              <rect x={0} y={-8} width={12} height={10} rx={2} fill={pal[i % pal.length]} />
              <text x={17} y={1} fill={inkPrimary}>{a.slice(0, 10)}</text>
            </g>
          ))}
          <circle cx={180} cy={-3} r={4.5} fill="#FFFFFF" stroke={inkPrimary} strokeWidth={1.5} />
          <text x={190} y={1} fill={inkPrimary}>PR</text>
          <polygon points="222,-8 227,-3 222,2 217,-3" fill={pal[2] ?? '#009E73'} />
          <text x={232} y={1} fill={inkPrimary}>CR</text>
          <text x={256} y={1} fill={inkPrimary} fontWeight={700}>→ Ongoing</text>
        </g>
        <text x={M.left + pw / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Months on Protocol</text>
      </g>
    );
  }

  if (caseId === '08-importance-streams') {
    let taxa: { name: string; imp: number; s: number[] }[] = [];
    let cohortLabels = ['HC', 'Mild', 'Severe'];
    if (customTable && customTable.rows.length > 0 && customTable.headers.length >= 4) {
      const fCol = pickCol(customTable.headers, ['feature', 'taxon', 'gene', 'biomarker'], 0);
      const impCol = pickCol(customTable.headers, ['importance', 'shap', 'mda', 'gini'], 1);
      const cohCols = customTable.headers.filter((h) => h !== fCol && h !== impCol).slice(0, 5);
      cohortLabels = cohCols;
      taxa = customTable.rows
        .map((r) => {
          const imp = Number(r[impCol]);
          const vals = cohCols.map((c) => Math.max(0, Number(r[c]) || 0));
          const sum = vals.reduce((a, b) => a + b, 0) || 1;
          return { name: (r[fCol] ?? '').trim(), imp, s: vals.map((v) => v / sum) };
        })
        .filter((t) => t.name && Number.isFinite(t.imp))
        .sort((a, b) => b.imp - a.imp)
        .slice(0, 10);
    }
    if (taxa.length === 0) {
      taxa = [
        { name: 'Akkermansia', imp: 0.94, s: [0.42, 0.34, 0.24] },
        { name: 'Faecalibacterium', imp: 0.85, s: [0.38, 0.36, 0.26] },
        { name: 'Bacteroides', imp: 0.76, s: [0.22, 0.44, 0.34] },
        { name: 'Roseburia', imp: 0.67, s: [0.48, 0.28, 0.24] },
        { name: 'Prevotella', imp: 0.55, s: [0.18, 0.32, 0.50] },
        { name: 'Blautia', imp: 0.44, s: [0.33, 0.37, 0.30] },
        { name: 'Ruminococcus', imp: 0.33, s: [0.41, 0.29, 0.30] },
      ];
    }
    const maxImp = Math.max(1e-6, ...taxa.map((t) => t.imp));
    const leftW = pw * 0.42;
    const rightX = M.left + leftW + 44;
    const rightW = pw - leftW - 44;
    const rowH = ph / taxa.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left + 44, M.top, leftW - 44, ph)}
        {renderAxisFrame(ctx, rightX, M.top, rightW, ph)}
        {taxa.map((t, idx) => {
          const cy = M.top + (idx + 0.5) * rowH;
          const bw = (t.imp / maxImp) * (leftW - 76);
          let acc = 0;
          return (
            <g key={t.name}>
              <text x={M.left + 36} y={cy + 4} textAnchor="end" fill={inkPrimary} fontSize={baseFs - 1.2} fontStyle="italic" fontWeight={600}>{t.name}</text>
              <rect x={M.left + 44} y={cy - 10} width={bw} height={20} rx={4} fill={pal[0]} fillOpacity={0.82} />
              <text x={M.left + 49 + bw} y={cy + 4} fill={inkSecondary} fontSize={baseFs - 1.8}>{t.imp.toFixed(2)}</text>
              {t.s.map((frac, si) => {
                const segX = rightX + acc * rightW;
                const segW = frac * rightW;
                acc += frac;
                return (
                  <rect key={si} x={segX} y={cy - 11} width={Math.max(1, segW - 1.5)} height={22} rx={3} fill={pal[(si + 1) % pal.length]} fillOpacity={0.85} />
                );
              })}
            </g>
          );
        })}
        <text x={M.left + 44 + (leftW - 44) / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>Feature Importance (SHAP)</text>
        <text x={rightX + rightW / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>
          Relative Abundance ({cohortLabels.join(' / ')})
        </text>
      </g>
    );
  }

  if (caseId === '09-cld-variance-bars') {
    const rng = mulberry32(909);
    let groups: { name: string; pts: number[]; cld: string }[] = [];
    let yLabel = 'Luciferase Fold Induction';
    if (customTable && customTable.rows.length > 0) {
      const gCol = pickCol(customTable.headers, ['group', 'treatment', 'condition'], 0);
      const vCol = pickCol(customTable.headers, ['value', 'fold_induction', 'measurement'], 1);
      const cldCol = pickCol(customTable.headers, ['cld_letter', 'letter', 'group_sig'], 2);
      yLabel = vCol;
      const map = new Map<string, { pts: number[]; cld: string }>();
      for (const r of customTable.rows) {
        const g = (r[gCol] ?? '').trim();
        const v = Number(r[vCol]);
        const cld = (r[cldCol] ?? '').trim();
        if (!g || !Number.isFinite(v)) continue;
        if (!map.has(g)) map.set(g, { pts: [], cld });
        map.get(g)!.pts.push(v);
        if (cld && !map.get(g)!.cld) map.get(g)!.cld = cld;
      }
      groups = [...map.entries()].slice(0, 8).map(([name, rec]) => ({ name, pts: rec.pts, cld: rec.cld || 'a' }));
    }
    if (groups.length === 0) {
      groups = [
        { name: 'Control', pts: Array.from({ length: 10 }, () => 15 + randn(rng) * 2.3), cld: 'c' },
        { name: 'Drug A', pts: Array.from({ length: 10 }, () => 24 + randn(rng) * 3.1), cld: 'b' },
        { name: 'Drug B', pts: Array.from({ length: 10 }, () => 26 + randn(rng) * 3.4), cld: 'b' },
        { name: 'A + B Combo', pts: Array.from({ length: 10 }, () => 43 + randn(rng) * 4.1), cld: 'a' },
      ];
    }
    const maxV = Math.max(...groups.flatMap((g) => g.pts)) * 1.25;
    const toY = (v: number) => M.top + ph - (v / (maxV || 1)) * ph;
    const ticks = niceTicks(0, maxV, 5);
    const step = pw / groups.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const cx = M.left + (gi + 0.5) * step;
          const col = pal[gi % pal.length];
          const m = g.pts.reduce((a, b) => a + b, 0) / g.pts.length;
          const s = g.pts.length > 1 ? Math.sqrt(g.pts.reduce((a, b) => a + (b - m) ** 2, 0) / (g.pts.length - 1)) : 0;
          const topY = toY(m + s);
          return (
            <g key={g.name}>
              <rect x={cx - 34} y={toY(m)} width={68} height={Math.max(2, toY(0) - toY(m))} rx={4} fill={col} fillOpacity={0.35} stroke={inkPrimary} strokeWidth={theme.lineWidth} />
              <line x1={cx} x2={cx} y1={topY} y2={toY(Math.max(0, m - s))} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.4} />
              <line x1={cx - 12} x2={cx + 12} y1={topY} y2={topY} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.4} />
              {g.pts.map((v, i) => (
                <circle key={i} cx={cx + (rng() - 0.5) * 32} cy={toY(v)} r={3.8} fill={col} stroke={bgStroke} strokeWidth={1} />
              ))}
              <text x={cx} y={topY - 12} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 2} fontWeight={700}>{g.cld}</text>
              <text x={cx} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>{g.name}</text>
            </g>
          );
        })}
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>{yLabel}</text>
      </g>
    );
  }

  // Case 10: Circos Fusion-Gene Diagram
  let chrs: string[] = [];
  let fusions: { a: number; b: number; lbl: string; w: number }[] = [];
  if (customTable && customTable.rows.length > 0) {
    const c1 = pickCol(customTable.headers, ['from_chr', 'chr1'], 0);
    const c2 = pickCol(customTable.headers, ['to_chr', 'chr2'], 2);
    const fCol = pickCol(customTable.headers, ['fusion_name', 'gene_pair', 'label'], 4);
    const rCol = pickCol(customTable.headers, ['supporting_reads', 'weight', 'count'], 5);
    const parsed = customTable.rows
      .map((r) => ({
        from: (r[c1] ?? '').trim(),
        to: (r[c2] ?? '').trim(),
        lbl: (r[fCol] ?? '').trim() || `${r[c1]}–${r[c2]}`,
        reads: Number(r[rCol]) || 10,
      }))
      .filter((x) => x.from && x.to);
    if (parsed.length > 0) {
      chrs = [...new Set(parsed.flatMap((p) => [p.from, p.to]))].slice(0, 12);
      const maxR = Math.max(1, ...parsed.map((p) => p.reads));
      fusions = parsed.slice(0, 10).map((p) => ({
        a: chrs.indexOf(p.from),
        b: chrs.indexOf(p.to),
        lbl: p.lbl,
        w: 3 + (p.reads / maxR) * 8,
      })).filter((f) => f.a >= 0 && f.b >= 0);
    }
  }
  if (chrs.length < 2 || fusions.length === 0) {
    chrs = ['chr2', 'chr7', 'chr9', 'chr11', 'chr14', 'chr17', 'chr21', 'chr22'];
    fusions = [
      { a: 2, b: 7, lbl: 'BCR–ABL1', w: 9 },
      { a: 0, b: 6, lbl: 'EML4–ALK', w: 7 },
      { a: 3, b: 4, lbl: 'CCND1–IGH', w: 6 },
      { a: 1, b: 5, lbl: 'BRAF–KIAA', w: 5 },
      { a: 5, b: 6, lbl: 'TMPRSS2–ERG', w: 7.5 },
    ];
  }

  const cx = W / 2;
  const cy = H / 2 + 16;
  const R = 192;
  const nChr = chrs.length;
  const gap = 0.08;
  const seg = (2 * Math.PI) / nChr - gap;
  const polar = (ang: number, rad: number) => ({
    x: cx + Math.cos(ang) * rad,
    y: cy + Math.sin(ang) * rad,
  });
  const arcPath = (a1: number, a2: number, rOut: number, rIn: number) => {
    const p1 = polar(a1, rOut);
    const p2 = polar(a2, rOut);
    const p3 = polar(a2, rIn);
    const p4 = polar(a1, rIn);
    return `M ${p1.x} ${p1.y} A ${rOut} ${rOut} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rIn} ${rIn} 0 0 0 ${p4.x} ${p4.y} Z`;
  };
  const midAngle = (i: number) => -Math.PI / 2 + i * (seg + gap) + seg / 2;
  return (
    <g>
      {chrs.map((chr, i) => {
        const a1 = -Math.PI / 2 + i * (seg + gap);
        const a2 = a1 + seg;
        const mid = (a1 + a2) / 2;
        const lblPos = polar(mid, R + 22);
        return (
          <g key={chr}>
            <path d={arcPath(a1, a2, R, R - 18)} fill={pal[i % pal.length]} fillOpacity={0.88} />
            <text x={lblPos.x} y={lblPos.y + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 0.5} fontWeight={700}>{chr}</text>
          </g>
        );
      })}
      {fusions.map((f, idx) => {
        const p1 = polar(midAngle(f.a), R - 20);
        const p2 = polar(midAngle(f.b), R - 20);
        const col = pal[idx % pal.length];
        return (
          <g key={`${f.lbl}-${idx}`}>
            <path
              d={`M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`}
              fill="none"
              stroke={col}
              strokeWidth={f.w}
              strokeOpacity={0.55}
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <g transform={`translate(34, ${H - 130})`} fontSize={baseFs - 1.5}>
        <text x={0} y={0} fill={inkPrimary} fontWeight={700}>Recurrent Fusions</text>
        {fusions.slice(0, 6).map((f, i) => (
          <g key={`${f.lbl}-${i}`} transform={`translate(0, ${18 + i * 17})`}>
            <line x1={0} x2={14} y1={-4} y2={-4} stroke={pal[i % pal.length]} strokeWidth={3.5} />
            <text x={20} y={0} fill={inkSecondary} fontWeight={600}>{f.lbl}</text>
          </g>
        ))}
      </g>
    </g>
  );
}
