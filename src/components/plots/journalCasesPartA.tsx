import React from 'react';
import type { JournalCaseId } from '../../lib/journalCasesCatalog';
import type { ResolvedPlotTheme } from '../../types/biograce';
import { computeKDE } from '../../lib/statsEngine';

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

/** Render Cases 01 through 10 as crisp, journal-styled vector SVG groups */
export function renderCasePartA(caseId: JournalCaseId, ctx: CaseRenderCtx): React.ReactNode {
  const { W, H, theme, inkPrimary, inkAxis, inkSecondary, bgStroke, baseFs, tickLen } = ctx;
  const pal = theme.palette.colors;
  const M = { top: 68, right: 44, bottom: 68, left: 82 };
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;

  if (caseId === '01-error-dotplot') {
    const rng = mulberry32(101);
    const groups = [
      { name: 'Control', mu: 18, sd: 2.8 },
      { name: '0.1 µM', mu: 25, sd: 3.4 },
      { name: '1.0 µM', mu: 36, sd: 4.1 },
      { name: '10 µM', mu: 49, sd: 4.6 },
    ];
    const toY = (v: number) => M.top + ph - ((v - 8) / 56) * ph;
    const step = pw / groups.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {[15, 25, 35, 45, 55].map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const cx = M.left + (gi + 0.5) * step;
          const col = pal[gi % pal.length];
          const pts = Array.from({ length: 14 }, () => g.mu + randn(rng) * g.sd);
          const m = pts.reduce((a, b) => a + b, 0) / pts.length;
          const s = Math.sqrt(pts.reduce((a, b) => a + (b - m) ** 2, 0) / (pts.length - 1));
          return (
            <g key={g.name}>
              {pts.map((v, i) => (
                <circle key={i} cx={cx + (rng() - 0.5) * 44} cy={toY(v)} r={4.2} fill={col} fillOpacity={0.42} stroke={col} strokeWidth={0.7} />
              ))}
              <line x1={cx} x2={cx} y1={toY(m + s)} y2={toY(m - s)} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.5} />
              <line x1={cx - 10} x2={cx + 10} y1={toY(m + s)} y2={toY(m + s)} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.5} />
              <line x1={cx - 10} x2={cx + 10} y1={toY(m - s)} y2={toY(m - s)} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.5} />
              <circle cx={cx} cy={toY(m)} r={6.2} fill={col} stroke={bgStroke} strokeWidth={1.8} />
              <text x={cx} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>{g.name}</text>
            </g>
          );
        })}
        <text x={M.left + pw / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Treatment Concentration</text>
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Cytokine Secretion (pg/mL)</text>
      </g>
    );
  }

  if (caseId === '02-grouped-error-dotplot') {
    const rng = mulberry32(202);
    const genotypes = ['Wild-Type', 'STAT1 KO', 'Rescue'];
    const treats = ['Vehicle', 'IFN-γ', 'IFN-γ + Inh'];
    const mus = [
      [18, 46, 26],
      [16, 20, 17],
      [19, 43, 24],
    ];
    const toY = (v: number) => M.top + ph - ((v - 6) / 56) * ph;
    const gStep = pw / genotypes.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {[10, 20, 30, 40, 50, 60].map((t) => (
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
                const cx = gCx + (ti - 1) * 52;
                const col = pal[ti % pal.length];
                const mu = mus[gi][ti];
                const pts = Array.from({ length: 9 }, () => mu + randn(rng) * 3.4);
                const m = pts.reduce((a, b) => a + b, 0) / pts.length;
                const s = Math.sqrt(pts.reduce((a, b) => a + (b - m) ** 2, 0) / (pts.length - 1));
                return (
                  <g key={`${gen}-${tr}`}>
                    {pts.map((v, k) => (
                      <circle key={k} cx={cx + (rng() - 0.5) * 18} cy={toY(v)} r={3.6} fill={col} fillOpacity={0.42} />
                    ))}
                    <line x1={cx} x2={cx} y1={toY(m + s)} y2={toY(m - s)} stroke={col} strokeWidth={theme.lineWidth * 1.6} />
                    <circle cx={cx} cy={toY(m)} r={5.4} fill={col} stroke={bgStroke} strokeWidth={1.6} />
                  </g>
                );
              })}
            </g>
          );
        })}
        <g transform={`translate(${W - M.right - 255}, ${M.top - 22})`}>
          {treats.map((tr, i) => (
            <g key={tr} transform={`translate(${i * 86}, 0)`}>
              <circle cx={0} cy={0} r={4.5} fill={pal[i % pal.length]} />
              <text x={10} y={4} fill={inkPrimary} fontSize={baseFs - 1.2} fontWeight={600}>{tr}</text>
            </g>
          ))}
        </g>
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Phospho-STAT1 Activity (AU)</text>
      </g>
    );
  }

  if (caseId === '03-multi-volcano') {
    const rng = mulberry32(303);
    const clusters = ['CD4 T', 'CD8 T', 'NK', 'B Cell', 'Mono', 'cDC'];
    const topGenes = [
      ['IL7R', 'CCR7'],
      ['GZMB', 'CD8A'],
      ['GNLY', 'NKG7'],
      ['MS4A1', 'CD79A'],
      ['S100A8', 'LYZ'],
      ['HLA-DRA', 'CD1C'],
    ];
    const step = pw / clusters.length;
    const toY = (v: number) => M.top + ph - ((v + 4.5) / 9) * ph;
    const zeroY = toY(0);
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {[-4, -2, 0, 2, 4].map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {clusters.map((cl, ci) => {
          const cx = M.left + (ci + 0.5) * step;
          const col = pal[ci % pal.length];
          const dots = Array.from({ length: 68 }, () => {
            const fc = randn(rng) * 1.45;
            return { x: cx + (rng() - 0.5) * (step * 0.68), fc };
          });
          return (
            <g key={cl}>
              <rect x={cx - step * 0.42} y={M.top + 4} width={step * 0.84} height={ph - 8} rx={6} fill={inkPrimary} fillOpacity={0.03} />
              {dots.map((d, i) => {
                if (Math.abs(d.fc) < 0.35) return null;
                const sig = Math.abs(d.fc) > 1.3;
                return (
                  <circle
                    key={i}
                    cx={d.x}
                    cy={toY(Math.max(-4.2, Math.min(4.2, d.fc)))}
                    r={sig ? 2.8 : 2.1}
                    fill={sig ? (d.fc > 0 ? theme.palette.upColor : theme.palette.downColor) : theme.palette.nsColor}
                    fillOpacity={sig ? 0.85 : 0.45}
                  />
                );
              })}
              {/* Cluster Color Band at y=0 */}
              <rect x={cx - step * 0.42} y={zeroY - 13} width={step * 0.84} height={26} rx={5} fill={col} />
              <text x={cx} y={zeroY + 4} textAnchor="middle" fill="#FFFFFF" fontSize={baseFs - 1.2} fontWeight={700}>{cl}</text>
              <text x={cx} y={toY(3.65)} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={700}>{topGenes[ci][0]}</text>
              <text x={cx} y={toY(-3.5)} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={700}>{topGenes[ci][1]}</text>
            </g>
          );
        })}
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Average log2 Fold Change</text>
      </g>
    );
  }

  if (caseId === '04-manhattan-twas') {
    const rng = mulberry32(404);
    const chrs = 16;
    const pts: { x: number; y: number; chr: number; gene?: string }[] = [];
    const peaks: Record<number, { gene: string; val: number }> = {
      2: { gene: 'IL23R', val: 12.6 },
      6: { gene: 'HLA-DRB1', val: 14.8 },
      11: { gene: 'FADS2', val: 10.4 },
      14: { gene: 'APOE', val: 13.4 },
    };
    let cursor = 0;
    const chrCenters: { chr: number; x: number }[] = [];
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
    const toX = (x: number) => M.left + (x / (cursor + 2)) * pw;
    const toY = (y: number) => M.top + ph - (y / 16.5) * ph;
    const sigY = toY(7.3);
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {[0, 4, 8, 12, 16].map((t) => (
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
            r={p.gene ? 4.8 : p.y > 7.3 ? 3.2 : 2.3}
            fill={p.y > 7.3 ? theme.palette.upColor : p.chr % 2 === 1 ? pal[0] : pal[5] ?? '#94A3B8'}
            fillOpacity={p.y > 7.3 ? 0.95 : 0.72}
            stroke={p.gene ? inkPrimary : 'none'}
            strokeWidth={p.gene ? 1.2 : 0}
          />
        ))}
        {pts.filter((p) => p.gene).map((p) => (
          <text key={p.gene} x={toX(p.x)} y={toY(p.y) - 9} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={700}>{p.gene}</text>
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
    const pairs = Array.from({ length: 14 }, () => {
      const a = 24 + randn(rng) * 7.5;
      return { a, b: a + 12.5 + randn(rng) * 3.8 };
    });
    const toY = (v: number) => M.top + ph - ((v - 8) / 56) * ph;
    const x1 = M.left + pw * 0.3;
    const x2 = M.left + pw * 0.7;
    const boxStats = (vals: number[]) => {
      const s = [...vals].sort((a, b) => a - b);
      return { min: s[0], q1: s[3], med: s[7], q3: s[10], max: s[13] };
    };
    const b1 = boxStats(pairs.map((p) => p.a));
    const b2 = boxStats(pairs.map((p) => p.b));
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {[15, 25, 35, 45, 55].map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {[
          { x: x1, b: b1, col: pal[0], lbl: 'Baseline (Day 0)' },
          { x: x2, b: b2, col: pal[1], lbl: 'Post-Tx (Day 28)' },
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
            <line x1={x1} y1={toY(p.a)} x2={x2} y2={toY(p.b)} stroke={inkSecondary} strokeOpacity={0.42} strokeWidth={1.2} />
            <circle cx={x1} cy={toY(p.a)} r={4.3} fill={pal[0]} stroke={bgStroke} strokeWidth={1.2} />
            <circle cx={x2} cy={toY(p.b)} r={4.3} fill={pal[1]} stroke={bgStroke} strokeWidth={1.2} />
          </g>
        ))}
        <path d={`M ${x1} ${M.top + 26} L ${x1} ${M.top + 18} L ${x2} ${M.top + 18} L ${x2} ${M.top + 26}`} fill="none" stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
        <text x={(x1 + x2) / 2} y={M.top + 12} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={700}>Paired t-test · p = 1.4e-6 (****)</text>
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>CD8+ Infiltration Score</text>
      </g>
    );
  }

  if (caseId === '06-raincloud') {
    const rng = mulberry32(606);
    const cohorts = [
      { name: 'Healthy', vals: Array.from({ length: 28 }, () => 24 + randn(rng) * 4.5) },
      { name: 'Early Stage', vals: Array.from({ length: 28 }, () => 38 + randn(rng) * 6.5) },
      { name: 'Advanced', vals: [...Array.from({ length: 14 }, () => 42 + randn(rng) * 3.8), ...Array.from({ length: 14 }, () => 64 + randn(rng) * 4.4)] },
    ];
    const toX = (v: number) => M.left + 20 + ((v - 8) / 72) * (pw - 24);
    const rowH = ph / cohorts.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left + 20, M.top, pw - 24, ph)}
        {[15, 30, 45, 60, 75].map((t) => (
          <g key={t}>
            <line x1={toX(t)} x2={toX(t)} y1={M.top + ph} y2={M.top + ph + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={toX(t)} y={M.top + ph + 20} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {cohorts.map((c, idx) => {
          const cy = M.top + (idx + 0.58) * rowH;
          const col = pal[idx % pal.length];
          const kde = computeKDE(c.vals, 10, 76, 48);
          const maxD = Math.max(1e-9, ...kde.map((p) => p.density));
          const path = [
            `M ${toX(kde[0].y).toFixed(1)} ${(cy - 8).toFixed(1)}`,
            ...kde.map((p) => `L ${toX(p.y).toFixed(1)} ${(cy - 8 - (p.density / maxD) * (rowH * 0.48)).toFixed(1)}`),
            `L ${toX(kde[kde.length - 1].y).toFixed(1)} ${(cy - 8).toFixed(1)} Z`,
          ].join(' ');
          const sorted = [...c.vals].sort((a, b) => a - b);
          const q1 = sorted[7];
          const med = sorted[14];
          const q3 = sorted[21];
          return (
            <g key={c.name}>
              <path d={path} fill={col} fillOpacity={0.28} stroke={col} strokeWidth={theme.lineWidth * 1.25} />
              <rect x={toX(q1)} y={cy - 5} width={Math.max(4, toX(q3) - toX(q1))} height={12} rx={3} fill={col} fillOpacity={0.2} stroke={inkPrimary} strokeWidth={1.3} />
              <line x1={toX(med)} x2={toX(med)} y1={cy - 5} y2={cy + 7} stroke={inkPrimary} strokeWidth={2.3} />
              {c.vals.map((v, k) => (
                <circle key={k} cx={toX(v)} cy={cy + 16 + (k % 3) * 5.5} r={3.3} fill={col} fillOpacity={0.78} />
              ))}
              <text x={M.left + 10} y={cy + 4} textAnchor="end" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>{c.name}</text>
            </g>
          );
        })}
        <text x={M.left + 20 + (pw - 24) / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Immune Exhaustion Signature Score</text>
      </g>
    );
  }

  if (caseId === '07-swimmer') {
    const patients = [
      { id: 'PT-01', mo: 22.5, arm: 0, cr: 5.5, pr: 2.2, ongoing: true },
      { id: 'PT-02', mo: 20.0, arm: 0, cr: 7.0, pr: 3.1, ongoing: true },
      { id: 'PT-03', mo: 18.2, arm: 1, cr: null, pr: 3.8, ongoing: true },
      { id: 'PT-04', mo: 16.4, arm: 0, cr: 6.2, pr: 2.6, ongoing: false },
      { id: 'PT-05', mo: 14.5, arm: 1, cr: null, pr: 4.1, ongoing: true },
      { id: 'PT-06', mo: 12.8, arm: 0, cr: null, pr: 3.0, ongoing: false },
      { id: 'PT-07', mo: 10.6, arm: 1, cr: null, pr: 4.5, ongoing: false },
      { id: 'PT-08', mo: 8.4, arm: 1, cr: null, pr: null, ongoing: false },
      { id: 'PT-09', mo: 6.5, arm: 0, cr: null, pr: null, ongoing: false },
      { id: 'PT-10', mo: 4.4, arm: 1, cr: null, pr: null, ongoing: false },
    ];
    const toX = (m: number) => M.left + (m / 25) * pw;
    const rowH = ph / patients.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {[0, 5, 10, 15, 20, 25].map((t) => (
          <g key={t}>
            <line x1={toX(t)} x2={toX(t)} y1={M.top + ph} y2={M.top + ph + tickLen} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={toX(t)} y={M.top + ph + 20} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {patients.map((p, idx) => {
          const cy = M.top + (idx + 0.5) * rowH;
          const col = pal[p.arm];
          const barW = toX(p.mo) - M.left;
          return (
            <g key={p.id}>
              <rect x={M.left} y={cy - 9} width={barW} height={18} rx={4} fill={col} fillOpacity={0.78} />
              <text x={M.left - 10} y={cy + 4} textAnchor="end" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={600}>{p.id}</text>
              {p.pr && <circle cx={toX(p.pr)} cy={cy} r={5} fill="#FFFFFF" stroke={inkPrimary} strokeWidth={1.6} />}
              {p.cr && <polygon points={`${toX(p.cr)},${cy - 6} ${toX(p.cr) + 6},${cy} ${toX(p.cr)},${cy + 6} ${toX(p.cr) - 6},${cy}`} fill={pal[2] ?? '#009E73'} stroke="#FFFFFF" strokeWidth={1.2} />}
              {p.ongoing && <text x={toX(p.mo) + 8} y={cy + 5} fill={col} fontSize={14} fontWeight={700}>→</text>}
            </g>
          );
        })}
        <g transform={`translate(${W - M.right - 295}, ${M.top + 8})`} fontSize={baseFs - 1.5}>
          <rect x={0} y={-8} width={12} height={10} rx={2} fill={pal[0]} />
          <text x={17} y={1} fill={inkPrimary}>Combo</text>
          <rect x={70} y={-8} width={12} height={10} rx={2} fill={pal[1]} />
          <text x={87} y={1} fill={inkPrimary}>Mono</text>
          <circle cx={142} cy={-3} r={4.5} fill="#FFFFFF" stroke={inkPrimary} strokeWidth={1.5} />
          <text x={152} y={1} fill={inkPrimary}>PR</text>
          <polygon points="184,-8 189,-3 184,2 179,-3" fill={pal[2] ?? '#009E73'} />
          <text x={194} y={1} fill={inkPrimary}>CR</text>
          <text x={225} y={1} fill={inkPrimary} fontWeight={700}>→ Ongoing</text>
        </g>
        <text x={M.left + pw / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Months on Protocol</text>
      </g>
    );
  }

  if (caseId === '08-importance-streams') {
    const taxa = [
      { name: 'Akkermansia', imp: 0.94, s: [0.42, 0.34, 0.24] },
      { name: 'Faecalibacterium', imp: 0.85, s: [0.38, 0.36, 0.26] },
      { name: 'Bacteroides', imp: 0.76, s: [0.22, 0.44, 0.34] },
      { name: 'Roseburia', imp: 0.67, s: [0.48, 0.28, 0.24] },
      { name: 'Prevotella', imp: 0.55, s: [0.18, 0.32, 0.50] },
      { name: 'Blautia', imp: 0.44, s: [0.33, 0.37, 0.30] },
      { name: 'Ruminococcus', imp: 0.33, s: [0.41, 0.29, 0.30] },
    ];
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
          const bw = t.imp * (leftW - 56);
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
        <text x={rightX + rightW / 2} y={H - 16} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>Relative Abundance by Cohort (HC / Mild / Severe)</text>
      </g>
    );
  }

  if (caseId === '09-cld-variance-bars') {
    const rng = mulberry32(909);
    const groups = [
      { name: 'Control', mu: 15, sd: 2.3, cld: 'c' },
      { name: 'Drug A', mu: 24, sd: 3.1, cld: 'b' },
      { name: 'Drug B', mu: 26, sd: 3.4, cld: 'b' },
      { name: 'A + B Combo', mu: 43, sd: 4.1, cld: 'a' },
    ];
    const toY = (v: number) => M.top + ph - (v / 56) * ph;
    const step = pw / groups.length;
    return (
      <g>
        {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
        {[0, 10, 20, 30, 40, 50].map((t) => (
          <g key={t}>
            <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
            <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const cx = M.left + (gi + 0.5) * step;
          const col = pal[gi % pal.length];
          const pts = Array.from({ length: 10 }, () => g.mu + randn(rng) * g.sd);
          const m = pts.reduce((a, b) => a + b, 0) / pts.length;
          const s = Math.sqrt(pts.reduce((a, b) => a + (b - m) ** 2, 0) / (pts.length - 1));
          const topY = toY(m + s);
          return (
            <g key={g.name}>
              <rect x={cx - 34} y={toY(m)} width={68} height={toY(0) - toY(m)} rx={4} fill={col} fillOpacity={0.35} stroke={inkPrimary} strokeWidth={theme.lineWidth} />
              <line x1={cx} x2={cx} y1={topY} y2={toY(m - s)} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.4} />
              <line x1={cx - 12} x2={cx + 12} y1={topY} y2={topY} stroke={inkPrimary} strokeWidth={theme.lineWidth * 1.4} />
              {pts.map((v, i) => (
                <circle key={i} cx={cx + (rng() - 0.5) * 32} cy={toY(v)} r={3.8} fill={col} stroke={bgStroke} strokeWidth={1} />
              ))}
              <text x={cx} y={topY - 12} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 2} fontWeight={700}>{g.cld}</text>
              <text x={cx} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontWeight={600}>{g.name}</text>
            </g>
          );
        })}
        <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Luciferase Fold Induction</text>
      </g>
    );
  }

  // Case 10: Circos Fusion-Gene Diagram
  const cx = W / 2;
  const cy = H / 2 + 16;
  const R = 192;
  const chrs = ['chr2', 'chr7', 'chr9', 'chr11', 'chr14', 'chr17', 'chr21', 'chr22'];
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
  const fusions = [
    { a: 2, b: 7, lbl: 'BCR–ABL1', w: 9 },
    { a: 0, b: 6, lbl: 'EML4–ALK', w: 7 },
    { a: 3, b: 4, lbl: 'CCND1–IGH', w: 6 },
    { a: 1, b: 5, lbl: 'BRAF–KIAA', w: 5 },
    { a: 5, b: 6, lbl: 'TMPRSS2–ERG', w: 7.5 },
  ];
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
          <g key={f.lbl}>
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
      <g transform={`translate(34, ${H - 115})`} fontSize={baseFs - 1.5}>
        <text x={0} y={0} fill={inkPrimary} fontWeight={700}>Recurrent Fusions</text>
        {fusions.map((f, i) => (
          <g key={f.lbl} transform={`translate(0, ${18 + i * 17})`}>
            <line x1={0} x2={14} y1={-4} y2={-4} stroke={pal[i % pal.length]} strokeWidth={3.5} />
            <text x={20} y={0} fill={inkSecondary} fontWeight={600}>{f.lbl}</text>
          </g>
        ))}
      </g>
    </g>
  );
}
