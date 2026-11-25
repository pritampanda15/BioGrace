import React, { useEffect, useRef } from 'react';
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion';
import { X } from 'lucide-react';
import { APPLE_SPRINGS, playAppleTick, project, rubberband } from '../../motion/applePhysics';

interface FluidSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  soundEnabled?: boolean;
  children: React.ReactNode;
}

/**
 * Apple Fluid Sheet (§2, §3, §5, §6, §7, §9, §12):
 * - Enters & exits from the right along the exact same spatial path (§7)
 * - 1:1 pointer drag-to-dismiss with setPointerCapture respecting grab offset (§2)
 * - Interruptible mid-flight: grabbing cancels active spring and tracks live x (§3)
 * - Rubber-banding resistance when dragged past the left resting edge (§9)
 * - Velocity handoff + Apple exponential-decay momentum projection (§5, §6)
 */
export const FluidSheet: React.FC<FluidSheetProps> = ({
  open,
  onClose,
  title,
  subtitle,
  soundEnabled = false,
  children,
}) => {
  const x = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const dragRef = useRef<{
    startX: number;
    baseX: number;
    history: { x: number; t: number }[];
  } | null>(null);

  useEffect(() => {
    if (open) {
      x.set(0);
    }
  }, [open, x]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Allow grabbing the header/drag handle directly to interrupt & drag-dismiss
    if ((e.target as HTMLElement).closest('button')) return;
    animRef.current?.stop();
    e.currentTarget.setPointerCapture(e.pointerId);
    const liveX = x.get();
    dragRef.current = {
      startX: e.clientX,
      baseX: liveX,
      history: [{ x: e.clientX, t: performance.now() }],
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st) return;
    const rawX = st.baseX + (e.clientX - st.startX);
    const width = sheetRef.current?.offsetWidth ?? 560;
    // Rubber-band left past resting boundary (rawX < 0), 1:1 track rightward (rawX >= 0)
    const nextX = rawX < 0 ? rubberband(rawX, width, 0.55) : rawX;
    x.set(nextX);

    const now = performance.now();
    st.history.push({ x: e.clientX, t: now });
    if (st.history.length > 6) st.history.shift();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragRef.current;
    if (!st) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;

    // Estimate release velocity (px/s) from recent pointer history
    const first = st.history[0];
    const last = st.history[st.history.length - 1];
    const dtSec = Math.max(0.016, (last.t - first.t) / 1000);
    const velocity = (last.x - first.x) / dtSec;

    const width = sheetRef.current?.offsetWidth ?? 560;
    const currentX = x.get();
    const projectedX = currentX + project(velocity, 0.996);

    if (projectedX > width * 0.36) {
      playAppleTick(soundEnabled, 'snap');
      animRef.current = animate(x, width + 40, {
        ...APPLE_SPRINGS.sheet,
        velocity,
        onComplete: () => onClose(),
      });
    } else {
      playAppleTick(soundEnabled, 'snap');
      animRef.current = animate(x, 0, {
        ...APPLE_SPRINGS.momentum,
        velocity,
      });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Translucent dimming scrim (§12 Dim to focus) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onPointerDown={onClose}
            className="absolute inset-0 bg-black/28 backdrop-blur-[3px]"
          />

          {/* Spatial right-edge sheet — enters & exits along the exact same axis */}
          <motion.div
            ref={sheetRef}
            style={{ x }}
            initial={{ x: '100%', opacity: 0.85 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.85 }}
            transition={APPLE_SPRINGS.sheet}
            className="relative z-10 w-full max-w-2xl h-full material-sheet flex flex-col rounded-l-3xl overflow-hidden"
          >
            {/* Draggable Header Grab Region */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="px-6 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between gap-4 cursor-grab active:cursor-grabbing select-none"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5 rounded-full bg-[var(--text-tertiary)]/40" />
                  <h2 className="type-title text-lg font-bold text-[var(--text-primary)]">{title}</h2>
                </div>
                {subtitle && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 ml-3.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Close panel"
                onPointerDown={onClose}
                className="apple-press p-2 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--border-hairline)] text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 scroll-mask-y">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
