import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, X } from 'lucide-react';
import { APPLE_SPRINGS } from '../../motion/applePhysics';

export type EditablePlotField = 'title' | 'subtitle' | 'xLabel' | 'yLabel' | 'legend';

export interface ActivePlotEdit {
  field: EditablePlotField;
  label: string;
  value: string;
  legendKey?: string;
}

export type OnEditPlotField = (
  field: EditablePlotField,
  label: string,
  currentValue: string,
  legendKey?: string
) => void;

interface InlinePlotEditorProps {
  activeEdit: ActivePlotEdit | null;
  onCommit: (field: EditablePlotField, nextValue: string, legendKey?: string) => void;
  onClose: () => void;
}

/**
 * Floating Apple Glass Inline Plot Text Editor.
 * Appears directly over the figure when the user clicks any Title, Subtitle, X-axis, Y-axis, or Legend label.
 */
export const InlinePlotEditor: React.FC<InlinePlotEditorProps> = ({
  activeEdit,
  onCommit,
  onClose,
}) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeEdit) {
      setDraft(activeEdit.value);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    }
  }, [activeEdit]);

  const commit = () => {
    if (!activeEdit) return;
    onCommit(activeEdit.field, draft, activeEdit.legendKey);
    onClose();
  };

  return (
    <AnimatePresence>
      {activeEdit && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={APPLE_SPRINGS.snappy}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[min(92%,520px)] material-sheet rounded-2xl p-3 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Pencil className="w-3 h-3 text-[var(--accent)]" />
              Editing {activeEdit.label}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Enter to save · Esc to cancel
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                onCommit(activeEdit.field, e.target.value, activeEdit.legendKey);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') onClose();
              }}
              placeholder={`Enter ${activeEdit.label.toLowerCase()}...`}
              className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--accent)]/35"
            />
            <button
              type="button"
              onPointerDown={commit}
              className="apple-press inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-white"
            >
              <Check className="w-3.5 h-3.5" />
              Done
            </button>
            <button
              type="button"
              aria-label="Close editor"
              onPointerDown={onClose}
              className="apple-press p-1.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
