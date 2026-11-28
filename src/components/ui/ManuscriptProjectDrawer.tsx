import React, { useState } from 'react';
import { Download, FolderKanban, LayoutGrid, Plus, Trash2, Upload } from 'lucide-react';
import type {
  BioGraceProjectFile,
  ComposerPanelItem,
  ManuscriptFigureRecord,
} from '../../lib/workspaceStore';
import { exportTextFile } from '../../lib/exporters';
import { playAppleTick } from '../../motion/applePhysics';

interface ManuscriptProjectDrawerProps {
  figures: ManuscriptFigureRecord[];
  composerPanels: ComposerPanelItem[];
  soundEnabled: boolean;
  onSaveCurrentFigure: (tag: string) => void;
  onPinSavedToComposer: (rec: ManuscriptFigureRecord) => void;
  onDeleteFigure: (id: string) => void;
  onImportProject: (project: BioGraceProjectFile) => void;
}

export const ManuscriptProjectDrawer: React.FC<ManuscriptProjectDrawerProps> = ({
  figures,
  composerPanels,
  soundEnabled,
  onSaveCurrentFigure,
  onPinSavedToComposer,
  onDeleteFigure,
  onImportProject,
}) => {
  const [nextTag, setNextTag] = useState(`Fig ${Math.floor(figures.length / 4) + 1}${String.fromCharCode(65 + (figures.length % 4))}`);
  const [projectName, setProjectName] = useState('Manuscript_2026_Figures');
  const [importError, setImportError] = useState<string | null>(null);

  const handleExportProject = () => {
    const payload: BioGraceProjectFile = {
      version: '2.0',
      name: projectName,
      exportedAt: new Date().toISOString(),
      figures,
      composerPanels,
    };
    exportTextFile(JSON.stringify(payload, null, 2), `${projectName}.biograce-project.json`);
    playAppleTick(soundEnabled, 'commit');
  };

  const handleImportFile = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as BioGraceProjectFile;
      if (!parsed || !Array.isArray(parsed.figures)) {
        throw new Error('Not a valid .biograce-project.json file.');
      }
      onImportProject(parsed);
      playAppleTick(soundEnabled, 'commit');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4">
      {/* Save Active Figure Card */}
      <div className="rounded-2xl p-4 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-2.5">
        <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
          <FolderKanban className="w-4 h-4 text-[var(--accent)]" />
          Save Current Figure to Local Manuscript Workspace
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nextTag}
            onChange={(e) => setNextTag(e.target.value)}
            placeholder="e.g. Fig 1A, Fig 2B, Supp Fig 1"
            className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
          />
          <button
            type="button"
            onPointerDown={() => {
              onSaveCurrentFigure(nextTag.trim() || `Fig ${figures.length + 1}`);
              const nextIdx = figures.length + 1;
              setNextTag(`Fig ${Math.floor(nextIdx / 4) + 1}${String.fromCharCode(65 + (nextIdx % 4))}`);
              playAppleTick(soundEnabled, 'commit');
            }}
            className="apple-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Save Snapshot
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Stored 100% locally in your browser — persists across refreshes so you can manage every panel of a paper.
        </p>
      </div>

      {/* Export / Import Full Manuscript Bundle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={handleExportProject}
            className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            Export Project (.json)
          </button>
          <label className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-primary)] cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Load Project
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImportFile(f);
                e.currentTarget.value = '';
              }}
            />
          </label>
        </div>
      </div>

      {importError && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
          {importError}
        </div>
      )}

      {/* Saved Manuscript Figures Grid */}
      {figures.length === 0 ? (
        <div className="p-6 rounded-2xl border border-dashed border-[var(--border-hairline)] text-center text-xs text-[var(--text-tertiary)]">
          No saved manuscript snapshots yet. Click <strong>Save Snapshot</strong> above to save your active plot as Fig 1A.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {figures.map((fig) => (
            <div
              key={fig.id}
              className="rounded-2xl overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex flex-col"
            >
              <div className="aspect-[3/2] bg-white p-1.5 border-b border-[var(--border-hairline)] flex items-center justify-center">
                <img src={fig.previewDataUrl} alt={fig.title} className="w-full h-full object-contain" />
              </div>
              <div className="p-2.5 space-y-2">
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {fig.tag} · {fig.title}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {fig.styleSettings.preset.toUpperCase()} · {new Date(fig.savedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onPointerDown={() => {
                      onPinSavedToComposer(fig);
                      playAppleTick(soundEnabled, 'commit');
                    }}
                    className="apple-press flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--accent)] text-white"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    Pin to Figure Board
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => onDeleteFigure(fig.id)}
                    className="apple-press p-1.5 rounded-lg bg-[var(--bg-subtle)] text-red-500"
                    title="Delete snapshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
