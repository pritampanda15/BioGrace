import React from 'react';
import type { JournalCaseId } from '../../lib/journalCasesCatalog';
import { sampleRamp } from '../../lib/palettes';
import { computeKDE } from '../../lib/statsEngine';
import { niceTicks, pickCol } from '../../lib/journalCasesDataParser';
import type { CaseRenderCtx } from './journalCasesPartA';
import { renderAxisFrame } from './journalCasesPartA';

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

/** Render Cases 11 through 20 as crisp, journal-styled vector SVG groups (live CSV + demo fallback) */
export function renderCasePartB(caseId: JournalCaseId, ctx: CaseRenderCtx): React.ReactNode {
  const { W, H, theme, inkPrimary, inkAxis, inkSecondary, bgStroke, baseFs, tickLen, customTable } = ctx;
  const pal = theme.palette.colors;
  const cmap = theme.colormap.stops;
  const M = { top: 68, right: 44, bottom: 64, left: 82 };
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;

  if (caseId === '11-module-network') {
    let modules: { name: string; cx: number; cy: number; nodes: string[] }[] = [];
    let rawEdges: { from: string; to: string; w: number }[] = [];

    if (customTable && customTable.rows.length > 0) {
      const fCol = pickCol(customTable.headers, ['from', 'source'], 0);
      const tCol = pickCol(customTable.headers, ['to', 'target'], 1);
      const mCol = pickCol(customTable.headers, ['module', 'cluster', 'community'], 2);
      const wCol = pickCol(customTable.headers, ['weight', 'score', 'correlation'], 3);
      const nodeMod = new Map<string, string>();
      const degree = new Map<string, number>();

      for (const r of customTable.rows) {
        const a = (r[fCol] ?? '').trim();
        const b = (r[tCol] ?? '').trim();
        const mod = (r[mCol] ?? 'Module 1').trim();
        const w = Number(r[wCol]) || 0.7;
        if (!a || !b) continue;
        rawEdges.push({ from: a, to: b, w });
        if (!nodeMod.has(a) && !mod.toLowerCase().includes('cross')) nodeMod.set(a, mod);
        if (!nodeMod.has(b) && !mod.toLowerCase().includes('cross')) nodeMod.set(b, mod);
        degree.set(a, (degree.get(a) ?? 0) + 1);
        degree.set(b, (degree.get(b) ?? 0) + 1);
      }

      const byMod = new Map<string, string[]>();
      for (const [node, mod] of nodeMod.entries()) {
        if (!byMod.has(mod)) byMod.set(mod, []);
        byMod.get(mod)!.push(node);
      }
      const modEntries = [...byMod.entries()].slice(0, 4);
      const centers = [
        { cx: 235, cy: 235 },
        { cx: 585, cy: 215 },
        { cx: 420, cy: 405 },
        { cx: 640, cy: 405 },
      ];
      modules = modEntries.map(([name, nodes], idx) => ({
        name: name.replace(/_/g, ' '),
        cx: centers[idx].cx,
        cy: centers[idx].cy,
        nodes: [...nodes].sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0)).slice(0, 8),
      }));
    }

    if (modules.length === 0) {
      modules = [
        { name: 'IFN / Antiviral', cx: 235, cy: 235, nodes: ['STAT1', 'IRF1', 'CXCL10', 'GBP1', 'ISG15', 'OAS1'] },
        { name: 'Cell Cycle', cx: 585, cy: 215, nodes: ['MYC', 'CDK4', 'E2F1', 'MKI67', 'CCNB1'] },
        { name: 'Tissue Repair', cx: 420, cy: 405, nodes: ['MRC1', 'ARG1', 'PPARG', 'CD163', 'TREM2'] },
      ];
    }

    const placed: { id: string; x: number; y: number; mod: number; hub: boolean }[] = [];
    modules.forEach((m, mi) => {
      m.nodes.forEach((id, ni) => {
        const ang = (ni / Math.max(1, m.nodes.length)) * Math.PI * 2 - 0.5;
        const rad = ni === 0 ? 10 : 76;
        placed.push({ id, x: m.cx + Math.cos(ang) * rad, y: m.cy + Math.sin(ang) * rad, mod: mi, hub: ni === 0 });
      });
    });

    const idxById = new Map(placed.map((p, i) => [p.id, i]));
    const edges: [number, number, number][] = [];
    if (rawEdges.length > 0) {
      for (const e of rawEdges) {
        const i = idxById.get(e.from);
        const j = idxById.get(e.to);
        if (i !== undefined && j !== undefined) edges.push([i, j, e.w]);
      }
    } else {
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          if (placed[i].mod === placed[j].mod && (placed[i].hub || (i + j) % 2 === 0)) {
            edges.push([i, j, 0.85]);
          }
        }
      }
      if (placed.length > 13) edges.push([0, 6, 0.45], [2, 11, 0.45], [7, 13, 0.45]);
    }

    return (
      <g>
        {modules.map((m, mi) => (
          <g key={m.name}>
            <circle cx={m.cx} cy={m.cy} r={108} fill={pal[mi % pal.length]} fillOpacity={0.08} stroke={pal[mi % pal.length]} strokeOpacity={0.3} strokeDasharray="4 4" />
            <text x={m.cx} y={m.cy - 92} textAnchor="middle" fill={pal[mi % pal.length]} fontSize={baseFs - 0.5} fontWeight={700}>{m.name}</text>
          </g>
        ))}
        {edges.map(([i, j, w], k) => (
          <line
            key={k}
            x1={placed[i].x}
            y1={placed[i].y}
            x2={placed[j].x}
            y2={placed[j].y}
            stroke={placed[i].mod === placed[j].mod ? pal[placed[i].mod % pal.length] : inkSecondary}
            strokeOpacity={placed[i].mod === placed[j].mod ? 0.52 : 0.28}
            strokeWidth={Math.max(1, w * 2.4)}
          />
        ))}
        {placed.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.hub ? 15 : 9.5} fill={pal[n.mod % pal.length]} stroke={bgStroke} strokeWidth={2} />
            <text x={n.x} y={n.y + (n.hub ? 27 : 21)} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={n.hub ? 700 : 600}>{n.id}</text>
          </g>
        ))}
      </g>
    );
  }

  if (caseId === '12-sankey-bubble') {
    let genes: string[] = [];
    let paths: { name: string; fdr: number; ratio: number; count: number }[] = [];
    let links: [number, number][] = [];

    if (customTable && customTable.rows.length > 0) {
      const gCol = pickCol(customTable.headers, ['gene', 'source'], 0);
      const pCol = pickCol(customTable.headers, ['pathway', 'target', 'term'], 1);
      const rCol = pickCol(customTable.headers, ['gene_ratio', 'ratio', 'fold_enrichment'], 2);
      const fCol = pickCol(customTable.headers, ['padj', 'fdr', 'pvalue'], 3);
      const cCol = pickCol(customTable.headers, ['count', 'size', 'genes'], 4);
      const pathMap = new Map<string, { name: string; fdr: number; ratio: number; count: number }>();
      const rawLinks: [string, string][] = [];
      for (const r of customTable.rows) {
        const g = (r[gCol] ?? '').trim();
        const p = (r[pCol] ?? '').trim();
        if (!g || !p) continue;
        if (!genes.includes(g)) genes.push(g);
        if (!pathMap.has(p)) {
          const pv = Math.max(1e-25, Number(r[fCol]) || 0.01);
          pathMap.set(p, {
            name: p,
            fdr: Math.min(20, -Math.log10(pv)),
            ratio: Number(r[rCol]) || 0.25,
            count: Number(r[cCol]) || 25,
          });
        }
        rawLinks.push([g, p]);
      }
      genes = genes.slice(0, 10);
      paths = [...pathMap.values()].slice(0, 7);
      links = rawLinks
        .map(([g, p]) => [genes.indexOf(g), paths.findIndex((x) => x.name === p)] as [number, number])
        .filter(([gi, pi]) => gi >= 0 && pi >= 0);
    }

    if (genes.length === 0 || paths.length === 0) {
      genes = ['STAT1', 'CXCL10', 'IRF1', 'GBP1', 'MRC1', 'ARG1', 'PPARG'];
      paths = [
        { name: 'IFN-γ Response', fdr: 14.2, ratio: 0.44, count: 62 },
        { name: 'JAK-STAT Signal', fdr: 10.6, ratio: 0.36, count: 44 },
        { name: 'Antiviral Defense', fdr: 8.8, ratio: 0.31, count: 38 },
        { name: 'M2 Tissue Repair', fdr: 7.5, ratio: 0.28, count: 32 },
        { name: 'Lipid Metabolism', fdr: 5.2, ratio: 0.22, count: 24 },
      ];
      links = [
        [0, 0], [0, 1], [1, 0], [2, 0], [2, 2], [3, 2], [4, 3], [5, 3], [5, 4], [6, 4],
      ];
    }

    const gx = 128;
    const px = 420;
    const gY = (i: number) => M.top + 36 + i * ((ph - 60) / Math.max(1, genes.length - 1));
    const pY = (i: number) => M.top + 46 + i * ((ph - 84) / Math.max(1, paths.length - 1));
    const bubLeft = 570;
    const bubW = W - bubLeft - 44;
    const minRatio = Math.min(...paths.map((p) => p.ratio)) * 0.8;
    const maxRatio = Math.max(...paths.map((p) => p.ratio)) * 1.15;
    const maxCount = Math.max(1, ...paths.map((p) => p.count));
    const maxFdr = Math.max(1, ...paths.map((p) => p.fdr));
    const toBx = (ratio: number) => bubLeft + ((ratio - minRatio) / (maxRatio - minRatio || 1)) * bubW;

    return (
      <g>
        {links.map(([gi, pi], idx) => {
          const y1 = gY(gi);
          const y2 = pY(pi);
          const mx = (gx + px) / 2;
          return (
            <path
              key={idx}
              d={`M ${gx + 14} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${px - 14} ${y2}`}
              fill="none"
              stroke={pal[pi % pal.length]}
              strokeOpacity={0.42}
              strokeWidth={9}
            />
          );
        })}
        {genes.map((g, i) => (
          <g key={g}>
            <rect x={gx} y={gY(i) - 11} width={14} height={22} rx={3} fill={pal[i % pal.length]} />
            <text x={gx - 10} y={gY(i) + 4} textAnchor="end" fill={inkPrimary} fontSize={baseFs - 1} fontStyle="italic" fontWeight={700}>{g}</text>
          </g>
        ))}
        {paths.map((p, i) => (
          <g key={p.name}>
            <rect x={px - 14} y={pY(i) - 14} width={14} height={28} rx={3} fill={pal[i % pal.length]} />
            <text x={px + 8} y={pY(i) + 4} fill={inkPrimary} fontSize={baseFs - 1.2} fontWeight={600}>{p.name}</text>
          </g>
        ))}
        {renderAxisFrame(ctx, bubLeft, M.top + 14, bubW, ph - 32)}
        {paths.map((p, i) => {
          const bx = toBx(p.ratio);
          const by = pY(i);
          const r = 6 + (p.count / maxCount) * 11;
          return (
            <g key={`b-${p.name}`}>
              <line x1={bubLeft} x2={bx} y1={by} y2={by} stroke={inkSecondary} strokeOpacity={0.25} strokeDasharray="3 3" />
              <circle cx={bx} cy={by} r={r} fill={sampleRamp(cmap, p.fdr / maxFdr)} stroke={inkPrimary} strokeWidth={1} />
            </g>
          );
        })}
        <text x={bubLeft + bubW / 2} y={H - 18} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 0.5} fontWeight={600}>Gene Ratio (Color = −log10 FDR)</text>
        <text x={(gx + px) / 2} y={H - 18} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 0.5} fontWeight={600}>Gene → Pathway Alluvial Flow</text>
      </g>
    );
  }

  if (caseId === '13-binned-heatmap') {
    const rng = mulberry32(1313);
    let rows: string[] = [];
    let cols: string[] = [];
    const valMap = new Map<string, number>();

    if (customTable && customTable.rows.length > 0) {
      const rCol = pickCol(customTable.headers, ['taxon', 'gene', 'row'], 0);
      const cCol = pickCol(customTable.headers, ['sample', 'col', 'cohort'], 1);
      const zCol = pickCol(customTable.headers, ['zscore', 'value', 'abundance'], 2);
      for (const r of customTable.rows) {
        const rn = (r[rCol] ?? '').trim();
        const cn = (r[cCol] ?? '').trim();
        const z = Number(r[zCol]);
        if (!rn || !cn || !Number.isFinite(z)) continue;
        if (!rows.includes(rn)) rows.push(rn);
        if (!cols.includes(cn)) cols.push(cn);
        valMap.set(`${rn}|||${cn}`, z);
      }
      rows = rows.slice(0, 12);
      cols = cols.slice(0, 12);
    }

    if (rows.length === 0 || cols.length === 0) {
      rows = ['Akkermansia', 'Bacteroides', 'Prevotella', 'Roseburia', 'Blautia', 'Lactobacillus', 'Faecalibact.', 'Clostridium'];
      cols = ['HC-1', 'HC-2', 'HC-3', 'HC-4', 'HC-5', 'DIS-1', 'DIS-2', 'DIS-3', 'DIS-4', 'DIS-5'];
      rows.forEach((rn, ri) =>
        cols.forEach((cn, ci) => {
          const shift = (ci >= 5 ? 1 : -1) * (ri < 4 ? 0.9 : -0.8);
          valMap.set(`${rn}|||${cn}`, shift + randn(rng) * 0.9);
        })
      );
    }

    const bins = ['< −1.5', '−1.5 to −0.5', '−0.5 to 0.5', '0.5 to 1.5', '> 1.5'];
    const binColors = bins.map((_, i) => sampleRamp(cmap, i / (bins.length - 1)));
    const hmLeft = 148;
    const hmW = W - hmLeft - 150;
    const cw = hmW / cols.length;
    const rh = ph / rows.length;
    return (
      <g>
        {rows.map((rName, ri) => (
          <g key={rName}>
            <text x={hmLeft - 10} y={M.top + (ri + 0.5) * rh + 4} textAnchor="end" fill={inkPrimary} fontSize={baseFs - 1} fontStyle="italic">{rName}</text>
            {cols.map((cName, ci) => {
              const z = valMap.get(`${rName}|||${cName}`) ?? 0;
              const bIdx = z < -1.5 ? 0 : z < -0.5 ? 1 : z < 0.5 ? 2 : z < 1.5 ? 3 : 4;
              return (
                <rect
                  key={`${rName}-${cName}`}
                  x={hmLeft + ci * cw + 1.5}
                  y={M.top + ri * rh + 1.5}
                  width={Math.max(4, cw - 3)}
                  height={Math.max(4, rh - 3)}
                  rx={4}
                  fill={binColors[bIdx]}
                />
              );
            })}
          </g>
        ))}
        {cols.map((c, ci) => (
          <text key={c} x={hmLeft + (ci + 0.5) * cw} y={M.top + ph + 20} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={600}>{c}</text>
        ))}
        <g transform={`translate(${hmLeft + hmW + 20}, ${M.top + 12})`} fontSize={baseFs - 1.5}>
          <text x={0} y={0} fill={inkPrimary} fontWeight={700}>Z-Score Bin</text>
          {bins.map((b, i) => (
            <g key={b} transform={`translate(0, ${18 + i * 24})`}>
              <rect width={16} height={16} rx={3} fill={binColors[i]} stroke={inkAxis} strokeOpacity={0.25} />
              <text x={24} y={12} fill={inkSecondary}>{b}</text>
            </g>
          ))}
        </g>
      </g>
    );
  }

  if (caseId === '14-mantel-composite') {
    let vars: string[] = [];
    let comms: string[] = [];
    const mantelMap = new Map<string, { r: number; p: number }>();

    if (customTable && customTable.rows.length > 0) {
      const cCol = pickCol(customTable.headers, ['community', 'spec', 'omics_layer'], 0);
      const eCol = pickCol(customTable.headers, ['env_var', 'clinical_var', 'factor'], 1);
      const rCol = pickCol(customTable.headers, ['mantel_r', 'r', 'statistic'], 2);
      const pCol = pickCol(customTable.headers, ['mantel_p', 'p', 'pvalue'], 3);
      for (const row of customTable.rows) {
        const c = (row[cCol] ?? '').trim();
        const e = (row[eCol] ?? '').trim();
        const mr = Number(row[rCol]);
        const mp = Number(row[pCol]);
        if (!c || !e || !Number.isFinite(mr)) continue;
        if (!comms.includes(c)) comms.push(c);
        if (!vars.includes(e)) vars.push(e);
        mantelMap.set(`${c}|||${e}`, { r: Math.abs(mr), p: Number.isFinite(mp) ? mp : 0.05 });
      }
      comms = comms.slice(0, 4);
      vars = vars.slice(0, 8);
    }

    if (vars.length < 2 || comms.length === 0) {
      vars = ['pH', 'Temp', 'TOC', 'NO3⁻', 'NH4⁺', 'O2', 'Salinity'];
      comms = ['Taxonomic (16S)', 'Functional (KO)', 'Metabolome'];
    }

    const cell = Math.min(48, Math.floor(330 / Math.max(3, vars.length)));
    const ox = 390;
    const oy = 96;
    const rng = mulberry32(1414);
    const commPos = comms.map((name, i) => ({
      name: name.replace(/_/g, ' '),
      rawName: name,
      x: 168,
      y: 165 + i * (250 / Math.max(1, comms.length - 1 || 1)),
    }));
    return (
      <g>
        {vars.map((vRow, i) =>
          vars.map((vCol, j) => {
            if (j <= i) return null;
            const r = Math.max(-0.95, Math.min(0.95, (rng() - 0.48) * 1.9));
            const size = 10 + Math.abs(r) * (cell - 14);
            const x = ox + j * cell;
            const y = oy + i * cell;
            return (
              <g key={`${vRow}-${vCol}`}>
                <rect x={x} y={y} width={cell} height={cell} fill="none" stroke={inkSecondary} strokeOpacity={0.22} />
                <rect
                  x={x + (cell - size) / 2}
                  y={y + (cell - size) / 2}
                  width={size}
                  height={size}
                  rx={3}
                  fill={sampleRamp(cmap, (r + 1) / 2)}
                />
              </g>
            );
          })
        )}
        {vars.map((v, i) => {
          const dx = ox + i * cell + cell / 2;
          const dy = oy + i * cell + cell / 2;
          return (
            <g key={v}>
              <text x={dx} y={dy + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={700}>{v}</text>
              {commPos.map((c, ci) => {
                const rec = mantelMap.get(`${c.rawName}|||${v}`);
                const strong = rec ? rec.p < 0.01 || rec.r >= 0.4 : (i + ci) % 3 === 0;
                const med = rec ? rec.p < 0.05 || rec.r >= 0.25 : (i + ci) % 3 === 1;
                if (mantelMap.size > 0 && !rec) return null;
                return (
                  <path
                    key={`${c.name}-${v}`}
                    d={`M ${c.x + 8} ${c.y} Q ${(c.x + dx) / 2 - 20} ${(c.y + dy) / 2 + 25} ${dx - 16} ${dy + 8}`}
                    fill="none"
                    stroke={strong ? pal[1] : med ? pal[2] ?? '#009E73' : inkSecondary}
                    strokeOpacity={strong ? 0.85 : med ? 0.58 : 0.25}
                    strokeWidth={rec ? Math.max(1, rec.r * 6) : strong ? 3.2 : med ? 1.8 : 0.9}
                  />
                );
              })}
            </g>
          );
        })}
        {commPos.map((c, ci) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r={8} fill={pal[ci % pal.length]} stroke={bgStroke} strokeWidth={2} />
            <text x={c.x - 14} y={c.y + 4} textAnchor="end" fill={inkPrimary} fontSize={baseFs - 0.5} fontWeight={700}>{c.name}</text>
          </g>
        ))}
        <text x={W - 44} y={H - 22} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1.5}>
          Mantel r: thick = strong (&gt;0.4) · color = significance (p &lt; 0.01)
        </text>
      </g>
    );
  }

  if (caseId === '15-multi-corr-heatmap') {
    let markers: string[] = [];
    let cohortNames: string[] = [];
    const pairMap = new Map<string, { r: number; p: number }>();

    if (customTable && customTable.rows.length > 0) {
      const cCol = pickCol(customTable.headers, ['cohort', 'group', 'condition'], 0);
      const v1Col = pickCol(customTable.headers, ['var1', 'x'], 1);
      const v2Col = pickCol(customTable.headers, ['var2', 'y'], 2);
      const rCol = pickCol(customTable.headers, ['r', 'cor'], 3);
      const pCol = pickCol(customTable.headers, ['pvalue', 'p'], 4);
      for (const row of customTable.rows) {
        const c = (row[cCol] ?? '').trim();
        const a = (row[v1Col] ?? '').trim();
        const b = (row[v2Col] ?? '').trim();
        const rVal = Number(row[rCol]);
        const pVal = Number(row[pCol]);
        if (!c || !a || !b || !Number.isFinite(rVal)) continue;
        if (!cohortNames.includes(c)) cohortNames.push(c);
        if (!markers.includes(a)) markers.push(a);
        if (!markers.includes(b)) markers.push(b);
        const rec = { r: Math.max(-1, Math.min(1, rVal)), p: Number.isFinite(pVal) ? pVal : 0.05 };
        pairMap.set(`${c}|||${a}|||${b}`, rec);
        pairMap.set(`${c}|||${b}|||${a}`, rec);
      }
      cohortNames = cohortNames.slice(0, 2);
      markers = markers.slice(0, 7);
    }

    const useDemo = markers.length < 2 || cohortNames.length === 0;
    if (useDemo) {
      markers = ['IFNG', 'TNF', 'IL6', 'IL10', 'CXCL10', 'STAT1'];
      cohortNames = ['Healthy Control', 'Active Disease'];
    }
    const cell = Math.min(54, Math.floor(290 / markers.length));
    const panels = cohortNames.map((title, idx) => ({
      title,
      x0: idx === 0 ? 96 : 468,
      seed: 1501 + idx,
    }));

    return (
      <g>
        {panels.map((pan) => {
          const rng = mulberry32(pan.seed);
          return (
            <g key={pan.title}>
              <text x={pan.x0 + (markers.length * cell) / 2} y={M.top + 10} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={700}>{pan.title}</text>
              {markers.map((rM, i) =>
                markers.map((cM, j) => {
                  const rec = pairMap.get(`${pan.title}|||${rM}|||${cM}`);
                  const r =
                    i === j
                      ? 1
                      : rec
                      ? rec.r
                      : useDemo
                      ? Math.max(-0.95, Math.min(0.95, (rng() - 0.45) * 1.85))
                      : 0;
                  const p = rec ? rec.p : 1;
                  const stars =
                    i === j
                      ? ''
                      : !useDemo && rec
                      ? p < 0.001
                        ? '***'
                        : p < 0.01
                        ? '**'
                        : p < 0.05
                        ? '*'
                        : ''
                      : Math.abs(r) > 0.7
                      ? '***'
                      : Math.abs(r) > 0.5
                      ? '**'
                      : Math.abs(r) > 0.35
                      ? '*'
                      : '';
                  const x = pan.x0 + j * cell;
                  const y = M.top + 26 + i * cell;
                  return (
                    <g key={`${pan.title}-${rM}-${cM}`}>
                      <rect x={x + 1} y={y + 1} width={cell - 2} height={cell - 2} rx={4} fill={sampleRamp(cmap, (r + 1) / 2)} />
                      {stars && (
                        <text x={x + cell / 2} y={y + cell / 2 + 5} textAnchor="middle" fill={Math.abs(r) > 0.5 ? '#FFFFFF' : '#111827'} fontSize={12} fontWeight={700}>{stars}</text>
                      )}
                    </g>
                  );
                })
              )}
              {markers.map((m, i) => (
                <g key={`lbl-${pan.title}-${m}`}>
                  <text x={pan.x0 - 8} y={M.top + 26 + (i + 0.5) * cell + 4} textAnchor="end" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={600}>{m}</text>
                  <text x={pan.x0 + (i + 0.5) * cell} y={M.top + 26 + markers.length * cell + 18} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={600}>{m}</text>
                </g>
              ))}
            </g>
          );
        })}
      </g>
    );
  }

  if (caseId === '16-polar-heatmap') {
    const cx = W / 2;
    const cy = H / 2 + 20;
    let genes: string[] = [];
    let rings: string[] = [];
    const valMap = new Map<string, number>();

    if (customTable && customTable.rows.length > 0) {
      const gCol = pickCol(customTable.headers, ['gene', 'feature', 'taxon'], 0);
      const rCol = pickCol(customTable.headers, ['ring', 'timepoint', 'condition'], 1);
      const zCol = pickCol(customTable.headers, ['zscore', 'expr', 'value'], 2);
      for (const row of customTable.rows) {
        const g = (row[gCol] ?? '').trim();
        const rg = (row[rCol] ?? '').trim();
        const z = Number(row[zCol]);
        if (!g || !rg || !Number.isFinite(z)) continue;
        if (!genes.includes(g)) genes.push(g);
        if (!rings.includes(rg)) rings.push(rg);
        valMap.set(`${g}|||${rg}`, z);
      }
      genes = genes.slice(0, 20);
      rings = rings.slice(0, 5);
    }

    const useDemo = genes.length < 2 || rings.length === 0;
    if (useDemo) {
      genes = ['ARNTL', 'CLOCK', 'PER1', 'PER2', 'CRY1', 'CRY2', 'NR1D1', 'DBP', 'STAT1', 'IRF1', 'CXCL10', 'IL6', 'TNF', 'NFKB1', 'MYC', 'CDK4'];
      rings = ['0h', '6h', '12h', '18h'];
    }
    const vals = [...valMap.values()];
    const minZ = vals.length ? Math.min(...vals) : -2;
    const maxZ = vals.length ? Math.max(...vals) : 2;
    const rng = mulberry32(1616);
    const stepAng = (2 * Math.PI) / genes.length;
    const polar = (a: number, r: number) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    const sector = (a1: number, a2: number, r1: number, r2: number) => {
      const large = a2 - a1 > Math.PI ? 1 : 0;
      const p1 = polar(a1, r2);
      const p2 = polar(a2, r2);
      const p3 = polar(a2, r1);
      const p4 = polar(a1, r1);
      return `M ${p1.x} ${p1.y} A ${r2} ${r2} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r1} ${r1} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
    };
    const ringBand = Math.floor(124 / Math.max(1, rings.length));
    return (
      <g>
        {genes.map((g, gi) => {
          const a1 = -Math.PI / 2 + gi * stepAng + 0.025;
          const a2 = a1 + stepAng - 0.05;
          const mid = (a1 + a2) / 2;
          const lp = polar(mid, 212);
          return (
            <g key={g}>
              {rings.map((ring, ri) => {
                const r1 = 68 + ri * ringBand;
                const r2 = r1 + Math.max(12, ringBand - 4);
                const raw = valMap.get(`${g}|||${ring}`);
                const normVal =
                  raw !== undefined
                    ? (raw - minZ) / (maxZ - minZ || 1)
                    : 0.5 + 0.45 * Math.sin(gi * 0.5 + ri * 1.1) + (rng() - 0.5) * 0.25;
                return <path key={`${g}-${ring}`} d={sector(a1, a2, r1, r2)} fill={sampleRamp(cmap, normVal)} stroke={bgStroke} strokeWidth={1.2} />;
              })}
              <text x={lp.x} y={lp.y + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.8} fontWeight={700}>{g}</text>
            </g>
          );
        })}
        <text x={cx} y={cy + 4} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1} fontWeight={700}>
          {rings.join(' → ')}
        </text>
      </g>
    );
  }

  if (caseId === '17-multilevel-sankey') {
    if (customTable && customTable.rows.length > 0 && customTable.headers.length >= 4) {
      const fCol = pickCol(customTable.headers, ['freq', 'count', 'n_cells', 'patients'], customTable.headers.length - 1);
      const stageCols = customTable.headers.filter((h) => h !== fCol).slice(0, 3);
      if (stageCols.length === 3) {
        const parsed = customTable.rows
          .map((r) => ({
            s0: (r[stageCols[0]] ?? '').trim(),
            s1: (r[stageCols[1]] ?? '').trim(),
            s2: (r[stageCols[2]] ?? '').trim(),
            freq: Number(r[fCol]) || 1,
          }))
          .filter((x) => x.s0 && x.s1 && x.s2 && x.freq > 0);
        if (parsed.length > 0) {
          const xs = [110, 405, 695];
          const totalFreq = parsed.reduce((a, b) => a + b.freq, 0);
          const usableH = 350;
          const cols = stageCols.map((title, ci) => {
            const sums = new Map<string, number>();
            for (const row of parsed) {
              const key = ci === 0 ? row.s0 : ci === 1 ? row.s1 : row.s2;
              sums.set(key, (sums.get(key) ?? 0) + row.freq);
            }
            let yCur = 105;
            const nodes = [...sums.entries()].map(([lbl, val]) => {
              const h = Math.max(26, (val / totalFreq) * usableH);
              const node = { lbl, h, y: yCur, midY: yCur + h / 2 };
              yCur += h + 16;
              return node;
            });
            return { title, x: xs[ci], nodes };
          });
          const findMid = (ci: number, lbl: string) => cols[ci].nodes.find((n) => n.lbl === lbl)?.midY ?? 240;
          return (
            <g>
              {parsed.map((row, i) => {
                const w = Math.max(6, (row.freq / totalFreq) * 140);
                const y0 = findMid(0, row.s0);
                const y1 = findMid(1, row.s1);
                const y2 = findMid(2, row.s2);
                const col = pal[i % pal.length];
                return (
                  <g key={i}>
                    <path d={`M ${xs[0] + 18} ${y0} C ${(xs[0] + xs[1]) / 2} ${y0}, ${(xs[0] + xs[1]) / 2} ${y1}, ${xs[1] - 18} ${y1}`} fill="none" stroke={col} strokeOpacity={0.38} strokeWidth={w} />
                    <path d={`M ${xs[1] + 18} ${y1} C ${(xs[1] + xs[2]) / 2} ${y1}, ${(xs[1] + xs[2]) / 2} ${y2}, ${xs[2] - 18} ${y2}`} fill="none" stroke={col} strokeOpacity={0.38} strokeWidth={w} />
                  </g>
                );
              })}
              {cols.map((c, ci) => (
                <g key={c.title}>
                  <text x={c.x} y={84} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 0.5} fontWeight={700}>{c.title}</text>
                  {c.nodes.map((n, ni) => (
                    <g key={n.lbl}>
                      <rect x={c.x - 18} y={n.y} width={36} height={n.h} rx={6} fill={pal[(ci + ni) % pal.length]} stroke={bgStroke} strokeWidth={2} />
                      <text x={c.x} y={n.y + n.h / 2 + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={700} paintOrder="stroke" stroke={bgStroke} strokeWidth={4}>{n.lbl}</text>
                    </g>
                  ))}
                </g>
              ))}
            </g>
          );
        }
      }
    }

    const cols = [
      { title: 'Tissue Cohort', x: 110, nodes: [{ lbl: 'Primary Tumor', h: 175, y: 110 }, { lbl: 'Metastatic', h: 165, y: 310 }] },
      { title: 'T-Cell State', x: 405, nodes: [{ lbl: 'Effector', h: 115, y: 105 }, { lbl: 'Memory', h: 95, y: 242 }, { lbl: 'Exhausted', h: 120, y: 360 }] },
      { title: 'Clinical Response', x: 695, nodes: [{ lbl: 'CR / PR', h: 165, y: 115 }, { lbl: 'Non-Responder', h: 175, y: 305 }] },
    ];
    const ribbons = [
      { x1: 128, y1: 155, x2: 387, y2: 152, w: 66, col: pal[0] },
      { x1: 128, y1: 222, x2: 387, y2: 274, w: 46, col: pal[2] ?? '#009E73' },
      { x1: 128, y1: 266, x2: 387, y2: 392, w: 32, col: pal[1] },
      { x1: 128, y1: 350, x2: 387, y2: 310, w: 36, col: pal[3] ?? '#CC79A7' },
      { x1: 128, y1: 420, x2: 387, y2: 432, w: 68, col: pal[1] },
      { x1: 423, y1: 160, x2: 677, y2: 168, w: 88, col: pal[0] },
      { x1: 423, y1: 280, x2: 677, y2: 246, w: 58, col: pal[2] ?? '#009E73' },
      { x1: 423, y1: 416, x2: 677, y2: 392, w: 102, col: pal[1] },
    ];
    return (
      <g>
        {ribbons.map((r, i) => {
          const mx = (r.x1 + r.x2) / 2;
          return (
            <path key={i} d={`M ${r.x1} ${r.y1} C ${mx} ${r.y1}, ${mx} ${r.y2}, ${r.x2} ${r.y2}`} fill="none" stroke={r.col} strokeOpacity={0.42} strokeWidth={r.w} />
          );
        })}
        {cols.map((c, ci) => (
          <g key={c.title}>
            <text x={c.x} y={84} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 0.5} fontWeight={700}>{c.title}</text>
            {c.nodes.map((n, ni) => (
              <g key={n.lbl}>
                <rect x={c.x - 18} y={n.y} width={36} height={n.h} rx={6} fill={pal[(ci + ni) % pal.length]} stroke={bgStroke} strokeWidth={2} />
                <text x={c.x} y={n.y + n.h / 2 + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={700} paintOrder="stroke" stroke={bgStroke} strokeWidth={4}>{n.lbl}</text>
              </g>
            ))}
          </g>
        ))}
      </g>
    );
  }

  if (caseId === '18-treemap') {
    let rects: { x: number; y: number; w: number; h: number; lbl: string; sub: string; col: string }[] = [];
    if (customTable && customTable.rows.length > 0) {
      const sCol = pickCol(customTable.headers, ['superfamily', 'parent', 'category'], 0);
      const pCol = pickCol(customTable.headers, ['pathway', 'label', 'term'], 1);
      const gCol = pickCol(customTable.headers, ['genes', 'area', 'count', 'abundance'], 2);
      const bySup = new Map<string, { lbl: string; val: number }[]>();
      for (const r of customTable.rows) {
        const sup = (r[sCol] ?? 'Group').trim();
        const lbl = (r[pCol] ?? '').trim();
        const val = Number(r[gCol]);
        if (!lbl || !Number.isFinite(val) || val <= 0) continue;
        if (!bySup.has(sup)) bySup.set(sup, []);
        bySup.get(sup)!.push({ lbl, val });
      }
      const total = [...bySup.values()].flat().reduce((a, b) => a + b.val, 0);
      if (total > 0) {
        const x0 = 52;
        const y0 = 74;
        const totalW = 740;
        const totalH = 446;
        let xCur = x0;
        [...bySup.entries()].forEach(([sup, items], si) => {
          const supSum = items.reduce((a, b) => a + b.val, 0);
          const colW = (supSum / total) * totalW;
          let yCur = y0;
          items.forEach((it) => {
            const tileH = (it.val / supSum) * totalH;
            rects.push({
              x: xCur + 2,
              y: yCur + 2,
              w: Math.max(20, colW - 4),
              h: Math.max(20, tileH - 4),
              lbl: it.lbl,
              sub: `${it.val} · ${sup.replace(/_/g, ' ')}`,
              col: pal[si % pal.length],
            });
            yCur += tileH;
          });
          xCur += colW;
        });
      }
    }
    if (rects.length === 0) {
      rects = [
        { x: 52, y: 74, w: 325, h: 248, lbl: 'IFN-γ Signaling', sub: '162 genes · Immune', col: pal[0] },
        { x: 52, y: 328, w: 185, h: 192, lbl: 'Chemokine Axis', sub: '118 genes', col: pal[0] },
        { x: 243, y: 328, w: 134, h: 192, lbl: 'Antigen Pres.', sub: '94 genes', col: pal[0] },
        { x: 385, y: 74, w: 235, h: 268, lbl: 'Oxidative Phos.', sub: '148 genes · Metabolism', col: pal[1] },
        { x: 385, y: 348, w: 235, h: 172, lbl: 'Lipid Oxidation', sub: '86 genes', col: pal[1] },
        { x: 628, y: 74, w: 164, h: 234, lbl: 'MYC Targets', sub: '132 genes · Cycle', col: pal[2] ?? '#009E73' },
        { x: 628, y: 314, w: 164, h: 206, lbl: 'G2M Checkpt', sub: '96 genes', col: pal[2] ?? '#009E73' },
      ];
    }
    return (
      <g>
        {rects.map((r, i) => (
          <g key={`${r.lbl}-${i}`}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={10} fill={r.col} fillOpacity={0.85} stroke={bgStroke} strokeWidth={3} />
            <text x={r.x + 12} y={r.y + 26} fill="#FFFFFF" fontSize={baseFs} fontWeight={700}>{r.lbl.slice(0, Math.floor(r.w / 7.5))}</text>
            {r.h > 50 && <text x={r.x + 12} y={r.y + 44} fill="#FFFFFF" fillOpacity={0.88} fontSize={baseFs - 1.5}>{r.sub}</text>}
          </g>
        ))}
      </g>
    );
  }

  if (caseId === '19-mosaic-sunburst') {
    const cx = W / 2 - 48;
    const cy = H / 2 + 18;
    let inner: { lbl: string; frac: number; col: string }[] = [];
    let outer: { lbl: string; frac: number; col: string; op: number }[] = [];

    if (customTable && customTable.rows.length > 0) {
      const lCol = pickCol(customTable.headers, ['lineage', 'phylum', 'major_type'], 0);
      const sCol = pickCol(customTable.headers, ['subtype', 'genus', 'cluster'], 1);
      const pCol = pickCol(customTable.headers, ['percent', 'count', 'fraction'], 2);
      const byLin = new Map<string, { lbl: string; val: number }[]>();
      for (const r of customTable.rows) {
        const lin = (r[lCol] ?? '').trim();
        const sub = (r[sCol] ?? '').trim();
        const val = Number(r[pCol]);
        if (!lin || !sub || !Number.isFinite(val) || val <= 0) continue;
        if (!byLin.has(lin)) byLin.set(lin, []);
        byLin.get(lin)!.push({ lbl: sub, val });
      }
      const total = [...byLin.values()].flat().reduce((a, b) => a + b.val, 0);
      if (total > 0) {
        [...byLin.entries()].forEach(([lin, subs], li) => {
          const col = pal[li % pal.length];
          const lSum = subs.reduce((a, b) => a + b.val, 0);
          inner.push({ lbl: lin.replace(/_/g, ' '), frac: lSum / total, col });
          subs.forEach((s, si) => {
            outer.push({
              lbl: s.lbl.replace(/_/g, ' '),
              frac: s.val / total,
              col,
              op: Math.max(0.42, 0.88 - si * 0.18),
            });
          });
        });
      }
    }

    if (inner.length === 0) {
      inner = [
        { lbl: 'T Lymphocytes', frac: 0.46, col: pal[0] },
        { lbl: 'Myeloid', frac: 0.28, col: pal[1] },
        { lbl: 'B Lineage', frac: 0.16, col: pal[2] ?? '#009E73' },
        { lbl: 'NK / ILC', frac: 0.10, col: pal[3] ?? '#CC79A7' },
      ];
      outer = [
        { lbl: 'CD4 Naive', frac: 0.19, col: pal[0], op: 0.85 },
        { lbl: 'CD4 Mem', frac: 0.11, col: pal[0], op: 0.65 },
        { lbl: 'CD8 Eff', frac: 0.16, col: pal[0], op: 0.48 },
        { lbl: 'CD14 Mono', frac: 0.17, col: pal[1], op: 0.85 },
        { lbl: 'cDC / Mac', frac: 0.11, col: pal[1], op: 0.55 },
        { lbl: 'B Cell', frac: 0.16, col: pal[2] ?? '#009E73', op: 0.78 },
        { lbl: 'NK', frac: 0.10, col: pal[3] ?? '#CC79A7', op: 0.78 },
      ];
    }

    const polar = (a: number, r: number) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    const wedge = (a1: number, a2: number, r1: number, r2: number) => {
      const large = a2 - a1 > Math.PI ? 1 : 0;
      const p1 = polar(a1, r2);
      const p2 = polar(a2, r2);
      const p3 = polar(a2, r1);
      const p4 = polar(a1, r1);
      return `M ${p1.x} ${p1.y} A ${r2} ${r2} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r1} ${r1} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
    };
    let ang1 = -Math.PI / 2;
    let ang2 = -Math.PI / 2;
    return (
      <g>
        {inner.map((s) => {
          const next = ang1 + s.frac * Math.PI * 2;
          const d = wedge(ang1, next, 58, 128);
          ang1 = next;
          return <path key={s.lbl} d={d} fill={s.col} stroke={bgStroke} strokeWidth={2.5} />;
        })}
        {outer.map((s) => {
          const next = ang2 + s.frac * Math.PI * 2;
          const mid = (ang2 + next) / 2;
          const lp = polar(mid, 212);
          const d = wedge(ang2, next, 132, 192);
          ang2 = next;
          return (
            <g key={s.lbl}>
              <path d={d} fill={s.col} fillOpacity={s.op} stroke={bgStroke} strokeWidth={2} />
              <text x={lp.x} y={lp.y + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={600}>{s.lbl}</text>
            </g>
          );
        })}
        <text x={cx} y={cy + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={700}>Atlas Ring</text>
        <g transform={`translate(${W - 196}, ${M.top + 36})`} fontSize={baseFs - 1.2}>
          <text x={0} y={0} fill={inkPrimary} fontWeight={700}>Major Lineages</text>
          {inner.map((s, i) => (
            <g key={s.lbl} transform={`translate(0, ${22 + i * 24})`}>
              <rect width={13} height={13} rx={3} fill={s.col} />
              <text x={20} y={11} fill={inkSecondary} fontWeight={600}>{s.lbl} ({Math.round(s.frac * 100)}%)</text>
            </g>
          ))}
        </g>
      </g>
    );
  }

  // Case 20: Split Violin Comparison Plot
  const rng = mulberry32(2020);
  let condNames: [string, string] = ['Control', 'Treated'];
  let markerGroups: { name: string; valsA: number[]; valsB: number[] }[] = [];

  if (customTable && customTable.rows.length > 0) {
    const mCol = pickCol(customTable.headers, ['marker', 'gene', 'feature'], 0);
    const cCol = pickCol(customTable.headers, ['condition', 'group', 'arm'], 1);
    const eCol = pickCol(customTable.headers, ['expression', 'value', 'log1p'], 2);
    const conds: string[] = [];
    const byMarker = new Map<string, Record<string, number[]>>();
    for (const r of customTable.rows) {
      const m = (r[mCol] ?? '').trim();
      const c = (r[cCol] ?? '').trim();
      const v = Number(r[eCol]);
      if (!m || !c || !Number.isFinite(v)) continue;
      if (!conds.includes(c)) conds.push(c);
      if (!byMarker.has(m)) byMarker.set(m, {});
      if (!byMarker.get(m)![c]) byMarker.get(m)![c] = [];
      byMarker.get(m)![c].push(v);
    }
    if (conds.length >= 2) {
      condNames = [conds[0], conds[1]];
      markerGroups = [...byMarker.entries()].slice(0, 7).map(([name, rec]) => ({
        name,
        valsA: rec[condNames[0]] ?? [],
        valsB: rec[condNames[1]] ?? [],
      })).filter((g) => g.valsA.length > 0 && g.valsB.length > 0);
    }
  }

  if (markerGroups.length === 0) {
    const demo = [
      { name: 'CXCL10', a: 2.1, b: 4.8 },
      { name: 'STAT1', a: 2.6, b: 4.4 },
      { name: 'GZMB', a: 1.9, b: 4.2 },
      { name: 'IL7R', a: 4.3, b: 2.3 },
      { name: 'MRC1', a: 4.5, b: 1.8 },
    ];
    markerGroups = demo.map((g) => ({
      name: g.name,
      valsA: Array.from({ length: 36 }, () => Math.max(0.2, Math.min(6.2, g.a + randn(rng) * 0.72))),
      valsB: Array.from({ length: 36 }, () => Math.max(0.2, Math.min(6.2, g.b + randn(rng) * 0.78))),
    }));
  }

  const allV = markerGroups.flatMap((g) => [...g.valsA, ...g.valsB]);
  const lo = Math.min(0, Math.min(...allV));
  const hi = Math.max(...allV) * 1.15;
  const toY = (v: number) => M.top + ph - ((v - lo) / (hi - lo || 1)) * ph;
  const ticks = niceTicks(lo, hi, 6);
  const step = pw / markerGroups.length;
  return (
    <g>
      {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
          <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
        </g>
      ))}
      {markerGroups.map((g, idx) => {
        const cx = M.left + (idx + 0.5) * step;
        const meanA = g.valsA.reduce((a, b) => a + b, 0) / g.valsA.length;
        const meanB = g.valsB.reduce((a, b) => a + b, 0) / g.valsB.length;
        const kdeA = computeKDE(g.valsA, lo + 0.1, hi - 0.1, 42);
        const kdeB = computeKDE(g.valsB, lo + 0.1, hi - 0.1, 42);
        const maxD = Math.max(1e-9, ...kdeA.map((p) => p.density), ...kdeB.map((p) => p.density));
        const maxW = step * 0.36;
        const leftPath = [
          `M ${cx - 1} ${toY(kdeA[0].y).toFixed(1)}`,
          ...kdeA.map((p, i) => {
            const edge = Math.min(i, kdeA.length - 1 - i);
            const taper = edge < 4 ? edge / 4 : 1;
            return `L ${(cx - 1 - (p.density / maxD) * taper * maxW).toFixed(1)} ${toY(p.y).toFixed(1)}`;
          }),
          `L ${cx - 1} ${toY(kdeA[kdeA.length - 1].y).toFixed(1)} Z`,
        ].join(' ');
        const rightPath = [
          `M ${cx + 1} ${toY(kdeB[0].y).toFixed(1)}`,
          ...kdeB.map((p, i) => {
            const edge = Math.min(i, kdeB.length - 1 - i);
            const taper = edge < 4 ? edge / 4 : 1;
            return `L ${(cx + 1 + (p.density / maxD) * taper * maxW).toFixed(1)} ${toY(p.y).toFixed(1)}`;
          }),
          `L ${cx + 1} ${toY(kdeB[kdeB.length - 1].y).toFixed(1)} Z`,
        ].join(' ');
        return (
          <g key={g.name}>
            <path d={leftPath} fill={pal[0]} fillOpacity={0.62} stroke={pal[0]} strokeWidth={theme.lineWidth} />
            <path d={rightPath} fill={pal[1]} fillOpacity={0.62} stroke={pal[1]} strokeWidth={theme.lineWidth} />
            <circle cx={cx - 8} cy={toY(meanA)} r={3.8} fill="#FFFFFF" stroke={inkPrimary} strokeWidth={1.5} />
            <circle cx={cx + 8} cy={toY(meanB)} r={3.8} fill="#FFFFFF" stroke={inkPrimary} strokeWidth={1.5} />
            <text x={cx} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontStyle="italic" fontWeight={700}>{g.name}</text>
          </g>
        );
      })}
      <g transform={`translate(${W - M.right - 190}, ${M.top - 22})`} fontSize={baseFs - 1.2}>
        <rect width={12} height={10} y={-8} rx={2} fill={pal[0]} />
        <text x={17} y={1} fill={inkPrimary} fontWeight={600}>{condNames[0]}</text>
        <rect x={92} width={12} height={10} y={-8} rx={2} fill={pal[1]} />
        <text x={109} y={1} fill={inkPrimary} fontWeight={600}>{condNames[1]}</text>
      </g>
      <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Log-Normalized Expression</text>
    </g>
  );
}
