import type { DEPlotType, PublicationStyleSettings, StatsPlotType } from '../types/biograce';
import type { JournalCaseId } from './journalCasesCatalog';
import type { WorkbenchSubTab } from '../components/workbench/WetLabWorkbench';

export type ComposerPanelSource =
  | {
      type: 'plotter';
      plotType: DEPlotType;
      title: string;
      subtitle: string;
      xLabel: string;
      yLabel: string;
    }
  | {
      type: 'gallery';
      caseId: JournalCaseId;
      title?: string;
      subtitle?: string;
    }
  | {
      type: 'stats';
      plotType: StatsPlotType;
      title: string;
      subtitle: string;
      xLabel: string;
      yLabel: string;
    }
  | {
      type: 'workbench';
      subTab: WorkbenchSubTab;
    };

export interface ComposerPanelItem {
  id: string;
  label: string;
  kind: 'biograce-svg' | 'external-image';
  dataUrl: string;
  aspectRatio: number; // width / height
  scaleBarText?: string; // e.g. "50 µm" for microscopy panels
  source?: ComposerPanelSource;
  lockStyle?: boolean;
}

export interface ManuscriptFigureRecord {
  id: string;
  tag: string; // e.g. "Fig 1A"
  title: string;
  studio: 'plotter' | 'gallery' | 'stats' | 'workbench' | 'composer';
  plotType?: DEPlotType;
  caseId?: JournalCaseId;
  styleSettings: PublicationStyleSettings;
  previewDataUrl: string;
  savedAt: string;
}

export interface BioGraceProjectFile {
  version: '2.0';
  name: string;
  exportedAt: string;
  figures: ManuscriptFigureRecord[];
  composerPanels: ComposerPanelItem[];
}

const STORAGE_KEY_FIGURES = 'biograce_manuscript_figures_v2';
const STORAGE_KEY_PANELS = 'biograce_composer_panels_v2';

export function svgElementToDataUrl(svg: SVGSVGElement): { dataUrl: string; aspectRatio: number } {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  const vb = svg.viewBox?.baseVal;
  const w = vb && vb.width > 0 ? vb.width : 840;
  const h = vb && vb.height > 0 ? vb.height : 560;
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  const xml = new XMLSerializer().serializeToString(clone);
  // Safe UTF-8 -> base64 encoding for Unicode symbols (µ, γ, Δ, ±, −)
  const b64 = btoa(unescape(encodeURIComponent(xml)));
  return {
    dataUrl: `data:image/svg+xml;base64,${b64}`,
    aspectRatio: w / h,
  };
}

export function loadSavedFigures(): ManuscriptFigureRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIGURES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedFigures(figures: ManuscriptFigureRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FIGURES, JSON.stringify(figures.slice(0, 24)));
  } catch {
    // Graceful no-op if browser storage quota is full
  }
}

export function loadComposerPanels(): ComposerPanelItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PANELS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistComposerPanels(panels: ComposerPanelItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PANELS, JSON.stringify(panels.slice(0, 6)));
  } catch {
    // Ignore quota overflow
  }
}
