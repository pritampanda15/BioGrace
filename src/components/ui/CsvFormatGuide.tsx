import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, FileSpreadsheet, Play, Table2 } from 'lucide-react';
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
  onTestLoadCsv?: (csvText: string, filename: string, targetKey: CsvTemplateKey) => void;
  showSelector?: boolean;
}

function isStudioCsvKey(key: AnyCsvGuideKey): key is CsvTemplateKey {
  return key in CSV_TEMPLATES;
}

export const CsvFormatGuide: React.FC<CsvFormatGuideProps> = ({
  activeKey,
  soundEnabled,
  onTestLoadCsv,
  showSelector = false,
}) => {
  const [selectedKey, setSelectedKey] = useState<AnyCsvGuideKey>(activeKey);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setSelectedKey(activeKey);
  }, [activeKey]);

  const effectiveKey = showSelector ? selectedKey : activeKey;
  const spec = isStudioCsvKey(effectiveKey)
    ? CSV_TEMPLATES[effectiveKey]
    : JOURNAL_CASE_CSV_TEMPLATES[effectiveKey] ?? CSV_TEMPLATES.volcano;

  const canDirectLoad = isStudioCsvKey(effectiveKey) && Boolean(onTestLoadCsv);

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
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1.5">
            Browse CSV Template by Plot Type (All 36 Formats)
          </label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value as AnyCsvGuideKey)}
            className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
          >
            <optgroup label="Interactive Plotter & Stat Advisor (16 Live Upload Formats)">
              {CSV_TEMPLATE_LIST.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="20 Open-Source Top-Journal Figures (01–20)">
              {JOURNAL_CASE_CSV_LIST.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      )}

      {/* Header & Action Buttons */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Expected CSV / TSV Format
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
                onTestLoadCsv?.(spec.sampleCsv, spec.filename, effectiveKey as CsvTemplateKey);
                playAppleTick(soundEnabled, 'commit');
              }}
              className="apple-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
            >
              <Play className="w-3 h-3" />
              Load Test CSV
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
