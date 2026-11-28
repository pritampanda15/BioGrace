import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  LayoutGrid,
  Lock,
  Ruler,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import type { PublicationStyleSettings } from '../../types/biograce';
import {
  svgElementToDataUrl,
  type ComposerPanelItem,
  type ComposerPanelSource,
} from '../../lib/workspaceStore';
import { JOURNAL_PRESETS, resolvePlotTheme } from '../../lib/palettes';
import { playAppleTick } from '../../motion/applePhysics';

interface FigureComposerStudioProps {
  panels: ComposerPanelItem[];
  onChangePanels: (next: ComposerPanelItem[]) => void;
  styleSettings: PublicationStyleSettings;
  darkMode: boolean;
  soundEnabled: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  renderLivePanel?: (
    source: ComposerPanelSource,
    panelSvgRef: React.RefObject<SVGSVGElement | null>
  ) => React.ReactNode;
}

type GridPreset = '2x1' | '2x2' | '3x2' | '1x2';
type PanelLabelStyle = 'lowercase' | 'uppercase' | 'parens_lower' | 'parens_upper';

function formatPanelLetter(index: number, style: PanelLabelStyle): string {
  const ch = String.fromCharCode(97 + (index % 26));
  if (style === 'uppercase') return ch.toUpperCase();
  if (style === 'parens_lower') return `(${ch})`;
  if (style === 'parens_upper') return `(${ch.toUpperCase()})`;
  return ch;
}

/**
 * Offscreen live SVG renderer for a pinned BioGrace panel.
 * Re-renders the real plot component whenever the user changes Journal Preset,
 * Color Palette (e.g. Grayscale Pub, Okabe-Ito), Colormap, Font, Line Width,
 * or Transparent Background in the left sidebar — keeping every panel 100% live!
 */
const LivePanelSyncer: React.FC<{
  panelId: string;
  source: ComposerPanelSource;
  styleSignature: string;
  renderLivePanel: (
    source: ComposerPanelSource,
    panelSvgRef: React.RefObject<SVGSVGElement | null>
  ) => React.ReactNode;
  onSynced: (panelId: string, dataUrl: string) => void;
}> = ({ panelId, source, styleSignature, renderLivePanel, onSynced }) => {
  const hiddenSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (!hiddenSvgRef.current) return;
      try {
        const { dataUrl } = svgElementToDataUrl(hiddenSvgRef.current);
        onSynced(panelId, dataUrl);
      } catch {
        // Fallback to cached snapshot if serialization fails
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [panelId, source, styleSignature, onSynced]);

  return (
    <div style={{ width: 840, height: 560 }}>
      {renderLivePanel(source, hiddenSvgRef)}
    </div>
  );
};

export const FigureComposerStudio: React.FC<FigureComposerStudioProps> = ({
  panels,
  onChangePanels,
  styleSettings,
  darkMode,
  soundEnabled,
  svgRef,
  renderLivePanel,
}) => {
  const theme = resolvePlotTheme(styleSettings);
  const journal = JOURNAL_PRESETS[styleSettings.preset];
  const [grid, setGrid] = useState<GridPreset>('2x2');
  const [labelStyle, setLabelStyle] = useState<PanelLabelStyle>(journal.defaultPanelLabels);
  const [figureTitle, setFigureTitle] = useState('Figure 1 · Integrated Multi-Panel Manuscript Board');
  const [liveUrls, setLiveUrls] = useState<Record<string, string>>({});

  // Sync panel letter convention automatically when switching journal preset (Nature -> a,b,c; Science/Cell/ACS -> A,B,C)
  useEffect(() => {
    setLabelStyle(journal.defaultPanelLabels);
  }, [journal.defaultPanelLabels]);

  const styleSignature = JSON.stringify({
    preset: styleSettings.preset,
    palette: styleSettings.palette,
    colormap: styleSettings.colormap,
    fontFamily: styleSettings.fontFamily,
    fontSizePt: styleSettings.fontSizePt,
    lineWidth: styleSettings.lineWidth,
    transparentBg: styleSettings.transparentBg,
    paperExport: styleSettings.paperExport,
    darkMode,
  });

  const handleSynced = React.useCallback((panelId: string, dataUrl: string) => {
    setLiveUrls((prev) => (prev[panelId] === dataUrl ? prev : { ...prev, [panelId]: dataUrl }));
  }, []);

  const paperBg = styleSettings.paperExport || !darkMode;
  const bgFill = theme.transparentBg ? 'none' : paperBg ? '#FFFFFF' : '#13141A';
  const inkPrimary = paperBg ? '#111827' : '#F5F5F7';
  const inkSecondary = paperBg ? '#515154' : '#A1A1AA';
  const isGrayscalePub = styleSettings.palette === 'grayscale-pub';

  const cols = grid === '3x2' ? 3 : grid === '1x2' ? 1 : 2;
  const rows = grid === '2x1' ? 1 : 2;
  const totalSlots = cols * rows;

  const W = 1120;
  const padX = 16;
  const padTop = figureTitle.trim() ? 46 : 18;
  const padBottom = 16;
  const gap = 16;
  const cellW = (W - padX * 2 - gap * (cols - 1)) / cols;
  const cellH = Math.round(cellW * (2 / 3));
  const H = padTop + rows * cellH + (rows - 1) * gap + padBottom;

  const handleUploadExternalImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        const next: ComposerPanelItem = {
          id: `ext-${Date.now()}`,
          label: file.name.replace(/\.[^.]+$/, ''),
          kind: 'external-image',
          dataUrl,
          aspectRatio: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5,
          scaleBarText: '50 µm',
        };
        onChangePanels([...panels, next].slice(0, 6));
        playAppleTick(soundEnabled, 'commit');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const movePanel = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= panels.length) return;
    const copy = [...panels];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onChangePanels(copy);
    playAppleTick(soundEnabled, 'select');
  };

  const removePanel = (id: string) => {
    onChangePanels(panels.filter((p) => p.id !== id));
    playAppleTick(soundEnabled, 'select');
  };

  const toggleLockStyle = (id: string) => {
    onChangePanels(
      panels.map((p) =>
        p.id === id
          ? {
              ...p,
              lockStyle: !p.lockStyle,
              // Snapshot current live styling when locking so it freezes cleanly
              dataUrl: !p.lockStyle && liveUrls[id] ? liveUrls[id] : p.dataUrl,
            }
          : p
      )
    );
    playAppleTick(soundEnabled, 'select');
  };

  const updateScaleBar = (id: string, text: string) => {
    onChangePanels(panels.map((p) => (p.id === id ? { ...p, scaleBarText: text } : p)));
  };

  const liveSyncedCount = panels.filter((p) => p.source && !p.lockStyle).length;

  return (
    <div className="space-y-4">
      {/* Hidden offscreen live re-renderers so sidebar Palettes, Colormaps, Fonts & Strokes update every pinned BioGrace panel in real time */}
      {renderLivePanel && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: -20000,
            top: 0,
            width: 840,
            opacity: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {panels.map((p) =>
            p.source && !p.lockStyle ? (
              <LivePanelSyncer
                key={p.id}
                panelId={p.id}
                source={p.source}
                styleSignature={styleSignature}
                renderLivePanel={renderLivePanel}
                onSynced={handleSynced}
              />
            ) : null
          )}
        </div>
      )}

      {/* Top Composer Controls */}
      <div className="material-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
            <LayoutGrid className="w-4 h-4 text-[var(--accent)]" />
            Grid:
          </span>
          {(['2x1', '2x2', '3x2', '1x2'] as GridPreset[]).map((g) => (
            <button
              key={g}
              type="button"
              onPointerDown={() => {
                setGrid(g);
                playAppleTick(soundEnabled, 'select');
              }}
              className={`apple-press px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                grid === g
                  ? 'bg-[var(--accent)] text-white border-transparent'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-hairline)]'
              }`}
            >
              {g}
            </button>
          ))}

          <span className="text-xs text-[var(--text-tertiary)] ml-2">Panel Letters:</span>
          <select
            value={labelStyle}
            onChange={(e) => setLabelStyle(e.target.value as PanelLabelStyle)}
            className="px-2.5 py-1 rounded-lg text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
          >
            <option value="lowercase">a, b, c (Nature)</option>
            <option value="uppercase">A, B, C (Science / Cell / ACS)</option>
            <option value="parens_lower">(a), (b), (c)</option>
            <option value="parens_upper">(A), (B), (C)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] cursor-pointer">
            <ImagePlus className="w-3.5 h-3.5 text-[var(--accent)]" />
            Add Microscopy / Blot Image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadExternalImage(f);
                e.currentTarget.value = '';
              }}
            />
          </label>
          {panels.length > 0 && (
            <button
              type="button"
              onPointerDown={() => onChangePanels([])}
              className="apple-press px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-red-500"
            >
              Clear Board
            </button>
          )}
        </div>
      </div>

      {/* Live Style Sync Banner + Board Title Input */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={figureTitle}
          onChange={(e) => setFigureTitle(e.target.value)}
          placeholder="Optional multi-panel figure header (leave blank for clean submission)"
          className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
        />
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 tabular-nums">
          <Sparkles className="w-3.5 h-3.5" />
          Live Style Sync ({liveSyncedCount}/{panels.length}) · {theme.palette.name} · {styleSettings.fontSizePt}pt
        </span>
      </div>

      {/* Unified Exportable Multi-Panel SVG Canvas */}
      <div className="relative w-full select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto rounded-2xl"
          style={{ fontFamily: theme.fontFamilyCss }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="biograce-composer-grayscale" colorInterpolationFilters="sRGB">
              <feColorMatrix
                type="matrix"
                values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"
              />
            </filter>
          </defs>
          <rect x={0} y={0} width={W} height={H} rx={16} fill={bgFill} />

          {figureTitle.trim() && (
            <text x={padX} y={32} fill={inkPrimary} fontSize={17 * theme.fontScale} fontWeight={700}>
              {figureTitle}
            </text>
          )}

          {Array.from({ length: totalSlots }).map((_, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const x = padX + col * (cellW + gap);
            const y = padTop + row * (cellH + gap);
            const panel = panels[idx];
            const letter = formatPanelLetter(idx, labelStyle);
            const href =
              panel && panel.source && !panel.lockStyle && liveUrls[panel.id]
                ? liveUrls[panel.id]
                : panel?.dataUrl;
            // Apply monochrome print filter to legacy snapshots or external blots when Grayscale Pub is selected
            const applyGrayFilter =
              panel && !panel.lockStyle && isGrayscalePub && (!panel.source || panel.kind === 'external-image');

            return (
              <g key={idx}>
                {panel && href ? (
                  <>
                    <image
                      href={href}
                      x={x + 18}
                      y={y + 8}
                      width={cellW - 22}
                      height={cellH - 12}
                      preserveAspectRatio="xMidYMid meet"
                      filter={applyGrayFilter ? 'url(#biograce-composer-grayscale)' : undefined}
                    />
                    {/* Optional Microscopy Scale Bar Overlay */}
                    {panel.kind === 'external-image' && panel.scaleBarText?.trim() && (
                      <g transform={`translate(${x + cellW - 92}, ${y + cellH - 26})`}>
                        <rect x={-6} y={-14} width={82} height={24} rx={4} fill="#000000" fillOpacity={0.55} />
                        <line x1={6} x2={64} y1={4} y2={4} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
                        <text x={35} y={-2} textAnchor="middle" fill="#FFFFFF" fontSize={10} fontWeight={700}>
                          {panel.scaleBarText}
                        </text>
                      </g>
                    )}
                  </>
                ) : (
                  <g>
                    <rect
                      x={x + 18}
                      y={y + 8}
                      width={cellW - 22}
                      height={cellH - 12}
                      rx={12}
                      fill={inkSecondary}
                      fillOpacity={0.06}
                      stroke={inkSecondary}
                      strokeOpacity={0.28}
                      strokeDasharray="6 5"
                    />
                    <text
                      x={x + cellW / 2 + 8}
                      y={y + cellH / 2 - 4}
                      textAnchor="middle"
                      fill={inkSecondary}
                      fontSize={13}
                      fontWeight={600}
                    >
                      Panel {letter} — Empty Slot
                    </text>
                    <text
                      x={x + cellW / 2 + 8}
                      y={y + cellH / 2 + 16}
                      textAnchor="middle"
                      fill={inkSecondary}
                      fillOpacity={0.75}
                      fontSize={11}
                    >
                      Click &ldquo;Pin to Board&rdquo; on any BioGrace plot or add an image above
                    </text>
                  </g>
                )}

                {/* Bold Journal Panel Letter (a, b, c, d) */}
                <text
                  x={x + 2}
                  y={y + 22}
                  fill={inkPrimary}
                  fontSize={20 * theme.fontScale}
                  fontWeight={800}
                >
                  {letter}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Panel Management Strip */}
      {panels.length > 0 && (
        <div className="material-card rounded-2xl p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-[var(--text-primary)]">
              Pinned Panels ({panels.length}/{totalSlots}) — Reorder, Lock Style, or Adjust Scale Bars
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              Unlocked panels automatically update with every sidebar palette, colormap, font &amp; stroke change.
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {panels.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[var(--text-primary)] truncate">
                    {formatPanelLetter(i, labelStyle)} · {p.label}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {p.lockStyle
                      ? 'Style locked (frozen)'
                      : p.source
                      ? 'Live-synced to sidebar theme'
                      : 'Snapshot / External image'}
                  </div>
                  {p.kind === 'external-image' && (
                    <div className="flex items-center gap-1 mt-1">
                      <Ruler className="w-3 h-3 text-[var(--text-tertiary)]" />
                      <input
                        type="text"
                        value={p.scaleBarText ?? ''}
                        onChange={(e) => updateScaleBar(p.id, e.target.value)}
                        placeholder="Scale bar (e.g. 50 µm)"
                        className="w-24 px-1.5 py-0.5 rounded text-[11px] bg-[var(--bg-elevated)] border border-[var(--border-hairline)]"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onPointerDown={() => toggleLockStyle(p.id)}
                    className={`apple-press p-1 rounded-lg ${
                      p.lockStyle
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                    }`}
                    title={p.lockStyle ? 'Unlock to sync with sidebar styles' : 'Lock this panel style'}
                  >
                    {p.lockStyle ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    disabled={i === 0}
                    onPointerDown={() => movePanel(i, -1)}
                    className="apple-press p-1 rounded-lg bg-[var(--bg-elevated)] disabled:opacity-30"
                    title="Move left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={i === panels.length - 1}
                    onPointerDown={() => movePanel(i, 1)}
                    className="apple-press p-1 rounded-lg bg-[var(--bg-elevated)] disabled:opacity-30"
                    title="Move right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => removePanel(p.id)}
                    className="apple-press p-1 rounded-lg bg-[var(--bg-elevated)] text-red-500"
                    title="Remove panel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
