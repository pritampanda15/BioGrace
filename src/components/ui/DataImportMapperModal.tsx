import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardPaste, Columns3, FileSpreadsheet, Play, Table2, Upload } from 'lucide-react';
import { parseDelimitedText, detectBestPlotForCsv, type ParsedTable } from '../../lib/csvParser';
import {
  guessInitialColumnMapping,
  parseExcelWorkbook,
  PLOT_COLUMN_ROLES,
  remapTableToCsv,
  type ParsedWorkbook,
} from '../../lib/spreadsheetImport';
import { CSV_TEMPLATE_LIST, type CsvTemplateKey } from '../../lib/csvTemplates';
import type { DEPlotType } from '../../types/biograce';
import { playAppleTick } from '../../motion/applePhysics';

interface DataImportMapperModalProps {
  initialText?: string;
  initialFilename?: string;
  currentPlot: DEPlotType;
  currentStudio: 'plotter' | 'gallery' | 'stats';
  soundEnabled: boolean;
  onCommitMappedCsv: (csvText: string, filename: string, targetPlot: CsvTemplateKey) => void;
}

const SAMPLE_PASTE = `Gene_ID\tLog2_FC\tAdj_Pval\tMean_TPM
CXCL10\t4.85\t1.2e-22\t2450
IDO1\t4.12\t4.5e-18\t1810
STAT1\t2.74\t2.1e-12\t5120
MRC1\t-3.25\t6.3e-15\t1940
ARG1\t-2.98\t1.8e-11\t980
GAPDH\t0.06\t0.87\t19800`;

export const DataImportMapperModal: React.FC<DataImportMapperModalProps> = ({
  initialText = '',
  initialFilename = 'pasted_spreadsheet.tsv',
  currentPlot,
  currentStudio,
  soundEnabled,
  onCommitMappedCsv,
}) => {
  const [tab, setTab] = useState<'paste' | 'excel' | 'map'>(initialText ? 'map' : 'paste');
  const [rawText, setRawText] = useState(initialText);
  const [filename, setFilename] = useState(initialFilename);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialText) {
      setRawText(initialText);
      setFilename(initialFilename);
      setTab('map');
    }
  }, [initialText, initialFilename]);

  const parsedTable: ParsedTable | null = useMemo(() => {
    if (!rawText.trim()) return null;
    const t = parseDelimitedText(rawText);
    return t.headers.length >= 2 && t.rows.length > 0 ? t : null;
  }, [rawText]);

  const [targetPlot, setTargetPlot] = useState<CsvTemplateKey>('volcano');
  const [colMapping, setColMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!parsedTable) return;
    const detected = detectBestPlotForCsv(parsedTable, currentPlot, currentStudio);
    setTargetPlot(detected);
    setColMapping(guessInitialColumnMapping(parsedTable.headers, detected));
  }, [parsedTable, currentPlot, currentStudio]);

  const handleChangeTargetPlot = (nextPlot: CsvTemplateKey) => {
    setTargetPlot(nextPlot);
    if (parsedTable) {
      setColMapping(guessInitialColumnMapping(parsedTable.headers, nextPlot));
    }
  };

  const handleExcelFile = async (file: File) => {
    setErrorMsg(null);
    setLoadingXlsx(true);
    try {
      const wb = await parseExcelWorkbook(file);
      setWorkbook(wb);
      const first = wb.sheetNames[0] ?? '';
      setSelectedSheet(first);
      if (first) {
        setRawText(wb.sheetsCsv[first] ?? '');
        setFilename(`${file.name} [${first}]`);
      }
      playAppleTick(soundEnabled, 'commit');
    } catch (err) {
      setErrorMsg(`Could not read Excel workbook: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingXlsx(false);
    }
  };

  const roles = PLOT_COLUMN_ROLES[targetPlot] ?? [];

  const handleApplyAndPlot = () => {
    if (!parsedTable) return;
    const finalCsv =
      roles.length > 0
        ? remapTableToCsv(parsedTable, colMapping, targetPlot === 'umap' || targetPlot === 'tsne')
        : rawText;
    playAppleTick(soundEnabled, 'commit');
    onCommitMappedCsv(finalCsv, filename, targetPlot);
  };

  return (
    <div className="space-y-4">
      {/* Mode Switcher */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
        {[
          { id: 'paste', label: 'Paste Excel/Prism', icon: <ClipboardPaste className="w-3.5 h-3.5" /> },
          { id: 'excel', label: 'Excel (.xlsx)', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
          { id: 'map', label: 'Column Mapper', icon: <Columns3 className="w-3.5 h-3.5" /> },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onPointerDown={() => {
              setTab(item.id as 'paste' | 'excel' | 'map');
              playAppleTick(soundEnabled, 'select');
            }}
            className={`apple-press px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              tab === item.id
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Direct Paste from Excel / Google Sheets / Prism */}
      {tab === 'paste' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-[var(--text-primary)]">
              Paste copied cells directly from Excel, Google Sheets, Numbers, or GraphPad Prism:
            </label>
            <button
              type="button"
              onPointerDown={() => {
                setRawText(SAMPLE_PASTE);
                setFilename('pasted_excel_demo.tsv');
                playAppleTick(soundEnabled, 'select');
              }}
              className="apple-press text-[11px] font-semibold text-[var(--accent)] hover:underline"
            >
              Insert Example
            </button>
          </div>
          <textarea
            rows={7}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setFilename('pasted_spreadsheet.tsv');
            }}
            placeholder="Paste tab-separated or comma-separated rows here (including header row)..."
            className="w-full p-3 rounded-xl font-mono text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
          {parsedTable && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                Detected {parsedTable.rows.length} rows × {parsedTable.headers.length} columns → suggested:{' '}
                <strong className="uppercase">{targetPlot}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onPointerDown={() => setTab('map')}
                  className="apple-press px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                >
                  Map Columns →
                </button>
                <button
                  type="button"
                  onPointerDown={handleApplyAndPlot}
                  className="apple-press inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold bg-[var(--accent)] text-white"
                >
                  <Play className="w-3 h-3" />
                  Plot Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Multi-sheet Excel (.xlsx / .xls) Upload */}
      {tab === 'excel' && (
        <div className="space-y-3">
          <label className="apple-press flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 hover:border-[var(--accent)] cursor-pointer transition-colors">
            <Upload className="w-6 h-6 text-[var(--accent)]" />
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              {loadingXlsx ? 'Reading Excel workbook locally...' : 'Drop or select an Excel (.xlsx / .xls) workbook'}
            </div>
            <div className="text-[11px] text-[var(--text-tertiary)]">
              Parsed 100% inside your browser — supports multi-sheet workbooks
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.ods"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleExcelFile(f);
                e.currentTarget.value = '';
              }}
            />
          </label>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          {workbook && (
            <div className="space-y-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Workbook Sheets ({workbook.sheetNames.length}) — {workbook.fileName}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {workbook.sheetNames.map((sheet) => (
                  <button
                    key={sheet}
                    type="button"
                    onPointerDown={() => {
                      setSelectedSheet(sheet);
                      setRawText(workbook.sheetsCsv[sheet] ?? '');
                      setFilename(`${workbook.fileName} [${sheet}]`);
                      playAppleTick(soundEnabled, 'select');
                    }}
                    className={`apple-press px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      selectedSheet === sheet
                        ? 'bg-[var(--accent)] text-white border-transparent'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-hairline)]'
                    }`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
              {parsedTable && (
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onPointerDown={() => setTab('map')}
                    className="apple-press px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                  >
                    Review Column Mapping
                  </button>
                  <button
                    type="button"
                    onPointerDown={handleApplyAndPlot}
                    className="apple-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Plot Sheet &ldquo;{selectedSheet}&rdquo;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Visual Column Mapper */}
      {tab === 'map' && (
        <div className="space-y-3.5">
          {!parsedTable ? (
            <div className="p-4 rounded-xl bg-[var(--bg-subtle)] text-xs text-[var(--text-secondary)]">
              First paste spreadsheet cells in the <strong>Paste Excel/Prism</strong> tab or upload an{' '}
              <strong>.xlsx</strong> workbook to map arbitrary column names.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block mb-1">
                    Target BioGrace Plot Format
                  </label>
                  <select
                    value={targetPlot}
                    onChange={(e) => handleChangeTargetPlot(e.target.value as CsvTemplateKey)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  >
                    {CSV_TEMPLATE_LIST.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onPointerDown={handleApplyAndPlot}
                    className="apple-press w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Apply Mapping &amp; Plot ({parsedTable.rows.length} rows)
                  </button>
                </div>
              </div>

              {roles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {roles.map((role) => (
                    <div
                      key={role.targetHeader}
                      className="rounded-xl p-2.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)]"
                    >
                      <label className="text-[11px] font-semibold text-[var(--text-primary)] block mb-1">
                        {role.label}{' '}
                        {role.required ? (
                          <span className="text-red-500">*</span>
                        ) : (
                          <span className="text-[var(--text-tertiary)] font-normal">(optional)</span>
                        )}
                      </label>
                      <select
                        value={colMapping[role.targetHeader] ?? ''}
                        onChange={(e) =>
                          setColMapping((prev) => ({ ...prev, [role.targetHeader]: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                      >
                        <option value="">— None —</option>
                        {parsedTable.headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] text-xs text-[var(--text-secondary)]">
                  This matrix format uses all columns directly — click <strong>Apply Mapping &amp; Plot</strong> to ingest as-is.
                </div>
              )}

              {/* 5-row data preview */}
              <div className="rounded-xl border border-[var(--border-hairline)] overflow-hidden bg-[var(--bg-elevated)]">
                <div className="px-3 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--border-hairline)] text-[11px] font-semibold text-[var(--text-secondary)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Table2 className="w-3.5 h-3.5" />
                    Preview ({filename})
                  </span>
                  <span className="tabular-nums">{parsedTable.rows.length} rows</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono text-left tabular-nums">
                    <thead className="bg-[var(--bg-subtle)]/50 text-[var(--text-primary)]">
                      <tr>
                        {parsedTable.headers.slice(0, 8).map((h) => (
                          <th key={h} className="px-2.5 py-1.5 whitespace-nowrap font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-hairline)] text-[var(--text-secondary)]">
                      {parsedTable.rows.slice(0, 5).map((r, ri) => (
                        <tr key={ri}>
                          {parsedTable.headers.slice(0, 8).map((h) => (
                            <td key={h} className="px-2.5 py-1 whitespace-nowrap">
                              {r[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
