import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Copy, Download, ExternalLink, FileSpreadsheet, Play, Table2 } from 'lucide-react';
import {
  CSV_TEMPLATE_LIST,
  CSV_TEMPLATES,
  type CsvTemplateKey,
} from '../../lib/csvTemplates';
import {
  JOURNAL_CASE_CSV_LIST,
  JOURNAL_CASE_CSV_TEMPLATES,
} from '../../lib/journalCasesCsvTemplates';
import type { JournalCaseId } from '../../lib/journalCasesCatalog';
import { exportTextFile } from '../../lib/exporters';
import { playAppleTick } from '../../motion/applePhysics';

export type AnyCsvGuideKey = CsvTemplateKey | JournalCaseId;

interface CsvFormatGuideProps {
  activeKey: AnyCsvGuideKey;
  soundEnabled: boolean;
  onTestLoadCsv?: (csvText: string, filename: string, targetKey: AnyCsvGuideKey) => void;
  onOpenJournalCase?: (caseId: JournalCaseId) => void;
  showSelector?: boolean;
}

function isStudioCsvKey(key: AnyCsvGuideKey): key is CsvTemplateKey {
  return key in CSV_TEMPLATES;
}

export const CsvFormatGuide: React.FC<CsvFormatGuideProps> = ({
  activeKey,
  soundEnabled,
  onTestLoadCsv,
  onOpenJournalCase,
  showSelector = false,
}) => {
  const [selectedKey, setSelectedKey] = useState<AnyCsvGuideKey>(activeKey);
  const [browseGroup, setBrowseGroup] = useState<'studio' | 'journal'>(() =>
    isStudioCsvKey(activeKey) ? 'studio' : 'journal'
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedKey(activeKey);
    setBrowseGroup(isStudioCsvKey(activeKey) ? 'studio' : 'journal');
  }, [activeKey]);

  const effectiveKey = showSelector ? selectedKey : activeKey;
  const spec = isStudioCsvKey(effectiveKey)
    ? CSV_TEMPLATES[effectiveKey]
    : JOURNAL_CASE_CSV_TEMPLATES[effectiveKey] ?? CSV_TEMPLATES.volcano;

  const canDirectLoad = Boolean(onTestLoadCsv);
  const isJournalTemplate = !isStudioCsvKey(effectiveKey);

  const previewTable = useMemo(() => {
    const lines = spec.sampleCsv.trim().split('\n');
    const headers = lines[0].split(',');
    const rows = lines.slice(1, 8).map((line) => line.split(','));
    const totalRows = lines.length - 1;
    return { headers, rows, totalRows };
  }, [spec.sampleCsv]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(spec.sampleCsv);
    setCopied(true);
    playAppleTick(soundEnabled, 'commit');
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="space-y-4">
      {showSelector && (
        <div className="space-y-3">
          {/* 2-Tab Group Switcher: Interactive Plots (16) vs 20 Journal Figures (20) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
            <button
              type="button"
              onPointerDown={() => {
                setBrowseGroup('studio');
                if (!isStudioCsvKey(selectedKey)) {
                  setSelectedKey(CSV_TEMPLATE_LIST[0].key);
                }
                playAppleTick(soundEnabled, 'select');
              }}
              className={`apple-press px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                browseGroup === 'studio'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--accent)]" />
              Interactive Plots ({CSV_TEMPLATE_LIST.length})
            </button>
            <button
              type="button"
              onPointerDown={() => {
                setBrowseGroup('journal');
                if (isStudioCsvKey(selectedKey)) {
                  setSelectedKey(JOURNAL_CASE_CSV_LIST[0].key);
                }
                playAppleTick(soundEnabled, 'select');
              }}
              className={`apple-press px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                browseGroup === 'journal'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
              20 Journal Figures ({JOURNAL_CASE_CSV_LIST.length})
            </button>
          </div>

          {/* Clickable Grid of All Templates in Active Group */}
          <div className="max-h-44 overflow-y-auto pr-1 grid grid-cols-2 gap-1.5">
            {(browseGroup === 'studio' ? CSV_TEMPLATE_LIST : JOURNAL_CASE_CSV_LIST).map((item) => {
              const active = selectedKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onPointerDown={() => {
                    setSelectedKey(item.key);
                    playAppleTick(soundEnabled, 'select');
                  }}
                  className={`apple-press px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-left truncate border transition-colors ${
                    active
                      ? 'bg-[var(--accent)] text-white border-transparent shadow-sm'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)]'
                  }`}
                  title={item.label}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Header & Action Buttons */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {isJournalTemplate ? 'Journal Figure CSV Format' : 'Expected CSV / TSV Format'}
          </div>
          <h4 className="type-title text-sm font-bold text-[var(--text-primary)] mt-0.5">
            {spec.label}
          </h4>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            Compatible with: {spec.compatibleTools}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canDirectLoad && (
            <button
              type="button"
              onPointerDown={() => {
                onTestLoadCsv?.(spec.sampleCsv, spec.filename, effectiveKey);
                playAppleTick(soundEnabled, 'commit');
              }}
              className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
            >
              <Play className="w-3 h-3" />
              Load Test CSV
            </button>
          )}

          {isJournalTemplate && onOpenJournalCase && (
            <button
              type="button"
              onPointerDown={() => {
                onOpenJournalCase(effectiveKey as JournalCaseId);
                playAppleTick(soundEnabled, 'commit');
              }}
              className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
            >
              <ExternalLink className="w-3 h-3" />
              Open Figure
            </button>
          )}

          <button
            type="button"
            onPointerDown={() => {
              exportTextFile(spec.sampleCsv, spec.filename);
              playAppleTick(soundEnabled, 'commit');
            }}
            className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            Download .csv
          </button>

          <button
            type="button"
            onPointerDown={() => void handleCopy()}
            className="apple-press inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Column Requirements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {spec.requiredColumns.map((col) => (
          <div
            key={col.name}
            className="rounded-xl p-2.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
          >
            <div className="flex items-center justify-between gap-2">
              <code className="font-mono font-bold text-[var(--text-primary)]">{col.name}</code>
              <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                or {col.aliases}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
              {col.description}
            </p>
          </div>
        ))}
      </div>

      {/* Live Preview Table */}
      <div className="rounded-xl border border-[var(--border-hairline)] overflow-hidden bg-[var(--bg-elevated)]">
        <div className="px-3 py-2 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          <span className="font-semibold flex items-center gap-1.5">
            <Table2 className="w-3.5 h-3.5" />
            Example Data ({spec.filename})
          </span>
          <span className="tabular-nums">
            Showing {previewTable.rows.length} of {previewTable.totalRows} rows
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left font-mono tabular-nums">
            <thead className="bg-[var(--bg-subtle)]/50 text-[var(--text-primary)]">
              <tr>
                {previewTable.headers.map((h) => (
                  <th key={h} className="px-3 py-1.5 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-[var(--text-secondary)]">
              {previewTable.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
        <strong>Tip:</strong> {spec.tip}
      </p>
    </div>
  );
};
