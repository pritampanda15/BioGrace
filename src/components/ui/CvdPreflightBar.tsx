import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import type { PublicationStyleSettings } from '../../types/biograce';
import {
  CVD_MODES,
  runPreflightAudit,
  type CvdSimulationMode,
} from '../../lib/preflight';
import { JOURNAL_PRESETS } from '../../lib/palettes';
import { playAppleTick } from '../../motion/applePhysics';

interface CvdPreflightBarProps {
  cvdMode: CvdSimulationMode;
  onChangeCvdMode: (mode: CvdSimulationMode) => void;
  styleSettings: PublicationStyleSettings;
  darkMode: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  soundEnabled: boolean;
  onAutoFixJournal: (patch: Partial<PublicationStyleSettings>) => void;
}

export const CvdPreflightBar: React.FC<CvdPreflightBarProps> = ({
  cvdMode,
  onChangeCvdMode,
  styleSettings,
  darkMode,
  svgRef,
  soundEnabled,
  onAutoFixJournal,
}) => {
  const [expanded, setExpanded] = useState(false);

  const report = useMemo(
    () => runPreflightAudit(styleSettings, darkMode, expanded ? svgRef.current : null),
    [styleSettings, darkMode, expanded, svgRef]
  );

  const journal = JOURNAL_PRESETS[styleSettings.preset];
  const hasIssues = report.failCount > 0 || report.warnCount > 0;

  return (
    <div className="space-y-2">
      {/* Hidden SVG defining GPU-accelerated Brettel/Viénot CVD & B&W color matrices */}
      <svg aria-hidden="true" width="0" height="0" className="absolute pointer-events-none">
        <defs>
          {CVD_MODES.filter((m) => m.id !== 'none').map((m) => (
            <filter key={m.id} id={`biograce-cvd-${m.id}`} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values={m.matrix} />
            </filter>
          ))}
        </defs>
      </svg>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--bg-subtle)]/80 border border-[var(--border-hairline)]">
        {/* 1-Click Colorblindness & Grayscale Print Proof */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-tertiary)] mr-1">
            <Eye className="w-3.5 h-3.5 text-[var(--accent)]" />
            CVD Proof:
          </span>
          {CVD_MODES.map((m) => {
            const active = cvdMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                title={m.description}
                onPointerDown={() => {
                  onChangeCvdMode(m.id);
                  playAppleTick(soundEnabled, 'select');
                }}
                className={`apple-press px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  active
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]'
                }`}
              >
                {m.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Journal Submission Preflight Guard Badge */}
        <button
          type="button"
          onPointerDown={() => {
            setExpanded((v) => !v);
            playAppleTick(soundEnabled, 'select');
          }}
          className={`apple-press inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
            report.failCount > 0
              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
              : report.warnCount > 0
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Preflight ({journal.shortName}):{' '}
          {report.failCount > 0
            ? `${report.failCount} Fix Needed`
            : report.warnCount > 0
            ? `${report.passCount}/${report.checks.length} · ${report.warnCount} Note`
            : `${report.passCount}/${report.checks.length} Ready`}
        </button>
      </div>

      {/* Expandable Preflight Checklist Card */}
      {expanded && (
        <div className="rounded-xl p-3.5 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-[var(--text-primary)]">
                Journal Submission Preflight — {report.journalName} ({report.targetWidthMm} mm)
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                Automated print-readiness check for typography, stroke weight, DPI, CVD contrast, and label spacing.
              </div>
            </div>
            {hasIssues && (
              <button
                type="button"
                onPointerDown={() => {
                  onAutoFixJournal({
                    paperExport: true,
                    fontSizePt: Math.max(journal.fontSize, styleSettings.fontSizePt),
                    lineWidth: Math.min(2.0, Math.max(0.75, styleSettings.lineWidth)),
                    dpi: styleSettings.dpi < 600 ? 600 : styleSettings.dpi,
                    palette:
                      styleSettings.palette === 'nature-npg' || styleSettings.palette === 'acs-classic'
                        ? 'okabe-ito'
                        : styleSettings.palette,
                  });
                  playAppleTick(soundEnabled, 'commit');
                }}
                className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[var(--accent)] text-white"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-Fix for {journal.shortName}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.checks.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-2 rounded-lg p-2 bg-[var(--bg-subtle)]/70 border border-[var(--border-hairline)] text-[11px]"
              >
                {c.status === 'pass' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : c.status === 'warn' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{c.label}</div>
                  <div className="text-[var(--text-secondary)] leading-snug">{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
