import React from 'react';
import type { JournalCaseId } from '../../lib/journalCasesCatalog';
import { sampleRamp } from '../../lib/palettes';
import { computeKDE } from '../../lib/statsEngine';
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

/** Render Cases 11 through 20 as crisp, journal-styled vector SVG groups */
export function renderCasePartB(caseId: JournalCaseId, ctx: CaseRenderCtx): React.ReactNode {
  const { W, H, theme, inkPrimary, inkAxis, inkSecondary, bgStroke, baseFs, tickLen } = ctx;
  const pal = theme.palette.colors;
  const cmap = theme.colormap.stops;
  const M = { top: 68, right: 44, bottom: 64, left: 82 };
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;

  if (caseId === '11-module-network') {
    const modules = [
      { name: 'IFN / Antiviral', cx: 235, cy: 235, nodes: ['STAT1', 'IRF1', 'CXCL10', 'GBP1', 'ISG15', 'OAS1'] },
      { name: 'Cell Cycle', cx: 585, cy: 215, nodes: ['MYC', 'CDK4', 'E2F1', 'MKI67', 'CCNB1'] },
      { name: 'Tissue Repair', cx: 420, cy: 405, nodes: ['MRC1', 'ARG1', 'PPARG', 'CD163', 'TREM2'] },
    ];
    const placed: { id: string; x: number; y: number; mod: number; hub: boolean }[] = [];
    modules.forEach((m, mi) => {
      m.nodes.forEach((id, ni) => {
        const ang = (ni / m.nodes.length) * Math.PI * 2 - 0.5;
        const rad = ni === 0 ? 10 : 76;
        placed.push({ id, x: m.cx + Math.cos(ang) * rad, y: m.cy + Math.sin(ang) * rad, mod: mi, hub: ni === 0 });
      });
    });
    const edges: [number, number][] = [];
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        if (placed[i].mod === placed[j].mod && (placed[i].hub || (i + j) % 2 === 0)) {
          edges.push([i, j]);
        }
      }
    }
    edges.push([0, 6], [2, 11], [7, 13]);
    return (
      <g>
        {modules.map((m, mi) => (
          <g key={m.name}>
            <circle cx={m.cx} cy={m.cy} r={108} fill={pal[mi % pal.length]} fillOpacity={0.08} stroke={pal[mi % pal.length]} strokeOpacity={0.3} strokeDasharray="4 4" />
            <text x={m.cx} y={m.cy - 92} textAnchor="middle" fill={pal[mi % pal.length]} fontSize={baseFs - 0.5} fontWeight={700}>{m.name}</text>
          </g>
        ))}
        {edges.map(([i, j], k) => (
          <line
            key={k}
            x1={placed[i].x}
            y1={placed[i].y}
            x2={placed[j].x}
            y2={placed[j].y}
            stroke={placed[i].mod === placed[j].mod ? pal[placed[i].mod % pal.length] : inkSecondary}
            strokeOpacity={placed[i].mod === placed[j].mod ? 0.45 : 0.25}
            strokeWidth={placed[i].hub || placed[j].hub ? 2 : 1.1}
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
    const genes = ['STAT1', 'CXCL10', 'IRF1', 'GBP1', 'MRC1', 'ARG1', 'PPARG'];
    const paths = [
      { name: 'IFN-γ Response', fdr: 14.2, ratio: 0.44, count: 62 },
      { name: 'JAK-STAT Signal', fdr: 10.6, ratio: 0.36, count: 44 },
      { name: 'Antiviral Defense', fdr: 8.8, ratio: 0.31, count: 38 },
      { name: 'M2 Tissue Repair', fdr: 7.5, ratio: 0.28, count: 32 },
      { name: 'Lipid Metabolism', fdr: 5.2, ratio: 0.22, count: 24 },
    ];
    const links: [number, number][] = [
      [0, 0], [0, 1], [1, 0], [2, 0], [2, 2], [3, 2], [4, 3], [5, 3], [5, 4], [6, 4],
    ];
    const gx = 128;
    const px = 420;
    const gY = (i: number) => M.top + 36 + i * ((ph - 60) / (genes.length - 1));
    const pY = (i: number) => M.top + 46 + i * ((ph - 84) / (paths.length - 1));
    const bubLeft = 570;
    const bubW = W - bubLeft - 44;
    const toBx = (ratio: number) => bubLeft + ((ratio - 0.15) / 0.36) * bubW;

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
        {/* Right Enrichment Bubble Subpanel */}
        {renderAxisFrame(ctx, bubLeft, M.top + 14, bubW, ph - 32)}
        {paths.map((p, i) => {
          const bx = toBx(p.ratio);
          const by = pY(i);
          const r = 6 + (p.count / 65) * 11;
          return (
            <g key={`b-${p.name}`}>
              <line x1={bubLeft} x2={bx} y1={by} y2={by} stroke={inkSecondary} strokeOpacity={0.25} strokeDasharray="3 3" />
              <circle cx={bx} cy={by} r={r} fill={sampleRamp(cmap, p.fdr / 15)} stroke={inkPrimary} strokeWidth={1} />
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
    const rows = ['Akkermansia', 'Bacteroides', 'Prevotella', 'Roseburia', 'Blautia', 'Lactobacillus', 'Faecalibact.', 'Clostridium'];
    const cols = ['HC-1', 'HC-2', 'HC-3', 'HC-4', 'HC-5', 'DIS-1', 'DIS-2', 'DIS-3', 'DIS-4', 'DIS-5'];
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
              const shift = (ci >= 5 ? 1 : -1) * (ri < 4 ? 0.9 : -0.8);
              const z = shift + randn(rng) * 0.9;
              const bIdx = z < -1.5 ? 0 : z < -0.5 ? 1 : z < 0.5 ? 2 : z < 1.5 ? 3 : 4;
              return (
                <rect
                  key={`${rName}-${cName}`}
                  x={hmLeft + ci * cw + 1.5}
                  y={M.top + ri * rh + 1.5}
                  width={cw - 3}
                  height={rh - 3}
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
    const vars = ['pH', 'Temp', 'TOC', 'NO3⁻', 'NH4⁺', 'O2', 'Salinity'];
    const comms = ['Taxonomic (16S)', 'Functional (KO)', 'Metabolome'];
    const n = vars.length;
    const cell = 42;
    const ox = 390;
    const oy = 96;
    const rng = mulberry32(1414);
    const commPos = comms.map((name, i) => ({ name, x: 168, y: 175 + i * 115 }));
    return (
      <g>
        {/* Upper-right correlation matrix */}
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
        {/* Diagonal labels */}
        {vars.map((v, i) => {
          const dx = ox + i * cell + cell / 2;
          const dy = oy + i * cell + cell / 2;
          return (
            <g key={v}>
              <text x={dx} y={dy + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.5} fontWeight={700}>{v}</text>
              {/* Curved Mantel links from communities to diagonal nodes */}
              {commPos.map((c, ci) => {
                const strong = (i + ci) % 3 === 0;
                const med = (i + ci) % 3 === 1;
                return (
                  <path
                    key={`${c.name}-${v}`}
                    d={`M ${c.x + 8} ${c.y} Q ${(c.x + dx) / 2 - 20} ${(c.y + dy) / 2 + 25} ${dx - 16} ${dy + 8}`}
                    fill="none"
                    stroke={strong ? pal[1] : med ? pal[2] ?? '#009E73' : inkSecondary}
                    strokeOpacity={strong ? 0.85 : med ? 0.55 : 0.2}
                    strokeWidth={strong ? 3.2 : med ? 1.8 : 0.9}
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
    const markers = ['IFNG', 'TNF', 'IL6', 'IL10', 'CXCL10', 'STAT1'];
    const panels = [
      { title: 'Healthy Control', x0: 96, seed: 1501 },
      { title: 'Active Disease', x0: 468, seed: 1502 },
    ];
    const cell = 48;
    return (
      <g>
        {panels.map((pan) => {
          const rng = mulberry32(pan.seed);
          return (
            <g key={pan.title}>
              <text x={pan.x0 + (markers.length * cell) / 2} y={M.top + 10} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={700}>{pan.title}</text>
              {markers.map((rM, i) =>
                markers.map((cM, j) => {
                  const r = i === j ? 1 : Math.max(-0.95, Math.min(0.95, (rng() - 0.45) * 1.85));
                  const stars = i === j ? '' : Math.abs(r) > 0.7 ? '***' : Math.abs(r) > 0.5 ? '**' : Math.abs(r) > 0.35 ? '*' : '';
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
    const genes = ['ARNTL', 'CLOCK', 'PER1', 'PER2', 'CRY1', 'CRY2', 'NR1D1', 'DBP', 'STAT1', 'IRF1', 'CXCL10', 'IL6', 'TNF', 'NFKB1', 'MYC', 'CDK4'];
    const rings = ['0h', '6h', '12h', '18h'];
    const rng = mulberry32(1616);
    const stepAng = (2 * Math.PI) / genes.length;
    const polar = (a: number, r: number) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    const sector = (a1: number, a2: number, r1: number, r2: number) => {
      const p1 = polar(a1, r2);
      const p2 = polar(a2, r2);
      const p3 = polar(a2, r1);
      const p4 = polar(a1, r1);
      return `M ${p1.x} ${p1.y} A ${r2} ${r2} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${r1} ${r1} 0 0 0 ${p4.x} ${p4.y} Z`;
    };
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
                const r1 = 68 + ri * 31;
                const r2 = r1 + 27;
                const val = 0.5 + 0.45 * Math.sin(gi * 0.5 + ri * 1.1) + (rng() - 0.5) * 0.25;
                return <path key={`${g}-${ring}`} d={sector(a1, a2, r1, r2)} fill={sampleRamp(cmap, val)} stroke={bgStroke} strokeWidth={1.2} />;
              })}
              <text x={lp.x} y={lp.y + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1.8} fontWeight={700}>{g}</text>
            </g>
          );
        })}
        <text x={cx} y={cy + 4} textAnchor="middle" fill={inkSecondary} fontSize={baseFs - 1} fontWeight={700}>Circadian</text>
      </g>
    );
  }

  if (caseId === '17-multilevel-sankey') {
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
    const rects = [
      { x: 52, y: 74, w: 325, h: 248, lbl: 'IFN-γ Signaling', sub: '162 genes · Immune', col: pal[0] },
      { x: 52, y: 328, w: 185, h: 192, lbl: 'Chemokine Axis', sub: '118 genes', col: pal[0] },
      { x: 243, y: 328, w: 134, h: 192, lbl: 'Antigen Pres.', sub: '94 genes', col: pal[0] },
      { x: 385, y: 74, w: 235, h: 268, lbl: 'Oxidative Phos.', sub: '148 genes · Metabolism', col: pal[1] },
      { x: 385, y: 348, w: 235, h: 172, lbl: 'Lipid Oxidation', sub: '86 genes', col: pal[1] },
      { x: 628, y: 74, w: 164, h: 234, lbl: 'MYC Targets', sub: '132 genes · Cycle', col: pal[2] ?? '#009E73' },
      { x: 628, y: 314, w: 164, h: 206, lbl: 'G2M Checkpt', sub: '96 genes', col: pal[2] ?? '#009E73' },
    ];
    return (
      <g>
        {rects.map((r) => (
          <g key={r.lbl}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={10} fill={r.col} fillOpacity={0.85} stroke={bgStroke} strokeWidth={3} />
            <text x={r.x + 14} y={r.y + 28} fill="#FFFFFF" fontSize={baseFs + 0.5} fontWeight={700}>{r.lbl}</text>
            <text x={r.x + 14} y={r.y + 46} fill="#FFFFFF" fillOpacity={0.88} fontSize={baseFs - 1.5}>{r.sub}</text>
          </g>
        ))}
      </g>
    );
  }

  if (caseId === '19-mosaic-sunburst') {
    const cx = W / 2 - 48;
    const cy = H / 2 + 18;
    const inner = [
      { lbl: 'T Lymphocytes', frac: 0.46, col: pal[0] },
      { lbl: 'Myeloid', frac: 0.28, col: pal[1] },
      { lbl: 'B Lineage', frac: 0.16, col: pal[2] ?? '#009E73' },
      { lbl: 'NK / ILC', frac: 0.10, col: pal[3] ?? '#CC79A7' },
    ];
    const outer = [
      { lbl: 'CD4 Naive', frac: 0.19, col: pal[0], op: 0.85 },
      { lbl: 'CD4 Mem', frac: 0.11, col: pal[0], op: 0.65 },
      { lbl: 'CD8 Eff', frac: 0.16, col: pal[0], op: 0.48 },
      { lbl: 'CD14 Mono', frac: 0.17, col: pal[1], op: 0.85 },
      { lbl: 'cDC / Mac', frac: 0.11, col: pal[1], op: 0.55 },
      { lbl: 'B Cell', frac: 0.16, col: pal[2] ?? '#009E73', op: 0.78 },
      { lbl: 'NK', frac: 0.10, col: pal[3] ?? '#CC79A7', op: 0.78 },
    ];
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
        <text x={cx} y={cy + 4} textAnchor="middle" fill={inkPrimary} fontSize={baseFs - 1} fontWeight={700}>PBMC Atlas</text>
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
  const genes = [
    { name: 'CXCL10', a: 2.1, b: 4.8 },
    { name: 'STAT1', a: 2.6, b: 4.4 },
    { name: 'GZMB', a: 1.9, b: 4.2 },
    { name: 'IL7R', a: 4.3, b: 2.3 },
    { name: 'MRC1', a: 4.5, b: 1.8 },
  ];
  const toY = (v: number) => M.top + ph - (v / 6.5) * ph;
  const step = pw / genes.length;
  return (
    <g>
      {renderAxisFrame(ctx, M.left, M.top, pw, ph)}
      {[0, 1, 2, 3, 4, 5, 6].map((t) => (
        <g key={t}>
          <line x1={M.left} x2={M.left - tickLen} y1={toY(t)} y2={toY(t)} stroke={inkAxis} strokeWidth={theme.axesLinewidth} />
          <text x={M.left - 11} y={toY(t) + 4} textAnchor="end" fill={inkSecondary} fontSize={baseFs - 1}>{t}</text>
        </g>
      ))}
      {genes.map((g, idx) => {
        const cx = M.left + (idx + 0.5) * step;
        const valsA = Array.from({ length: 36 }, () => Math.max(0.2, Math.min(6.2, g.a + randn(rng) * 0.72)));
        const valsB = Array.from({ length: 36 }, () => Math.max(0.2, Math.min(6.2, g.b + randn(rng) * 0.78)));
        const kdeA = computeKDE(valsA, 0.2, 6.2, 42);
        const kdeB = computeKDE(valsB, 0.2, 6.2, 42);
        const maxD = Math.max(1e-9, ...kdeA.map((p) => p.density), ...kdeB.map((p) => p.density));
        const maxW = step * 0.36;
        const leftPath = [
          `M ${cx - 1} ${toY(kdeA[0].y).toFixed(1)}`,
          ...kdeA.map((p) => `L ${(cx - 1 - (p.density / maxD) * maxW).toFixed(1)} ${toY(p.y).toFixed(1)}`),
          `L ${cx - 1} ${toY(kdeA[kdeA.length - 1].y).toFixed(1)} Z`,
        ].join(' ');
        const rightPath = [
          `M ${cx + 1} ${toY(kdeB[0].y).toFixed(1)}`,
          ...kdeB.map((p) => `L ${(cx + 1 + (p.density / maxD) * maxW).toFixed(1)} ${toY(p.y).toFixed(1)}`),
          `L ${cx + 1} ${toY(kdeB[kdeB.length - 1].y).toFixed(1)} Z`,
        ].join(' ');
        return (
          <g key={g.name}>
            <path d={leftPath} fill={pal[0]} fillOpacity={0.62} stroke={pal[0]} strokeWidth={theme.lineWidth} />
            <path d={rightPath} fill={pal[1]} fillOpacity={0.62} stroke={pal[1]} strokeWidth={theme.lineWidth} />
            <circle cx={cx - 8} cy={toY(g.a)} r={3.8} fill="#FFFFFF" stroke={inkPrimary} strokeWidth={1.5} />
            <circle cx={cx + 8} cy={toY(g.b)} r={3.8} fill="#FFFFFF" stroke={inkPrimary} strokeWidth={1.5} />
            <text x={cx} y={M.top + ph + 24} textAnchor="middle" fill={inkPrimary} fontSize={baseFs} fontStyle="italic" fontWeight={700}>{g.name}</text>
          </g>
        );
      })}
      <g transform={`translate(${W - M.right - 172}, ${M.top - 22})`} fontSize={baseFs - 1.2}>
        <rect width={12} height={10} y={-8} rx={2} fill={pal[0]} />
        <text x={17} y={1} fill={inkPrimary} fontWeight={600}>Control</text>
        <rect x={80} width={12} height={10} y={-8} rx={2} fill={pal[1]} />
        <text x={97} y={1} fill={inkPrimary} fontWeight={600}>Treated</text>
      </g>
      <text transform={`translate(24, ${M.top + ph / 2}) rotate(-90)`} textAnchor="middle" fill={inkPrimary} fontSize={baseFs + 0.5} fontWeight={600}>Log-Normalized Expression</text>
    </g>
  );
}
