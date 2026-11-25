import React from 'react';
import { motion } from 'framer-motion';
import { APPLE_SPRINGS, playAppleTick } from '../../motion/applePhysics';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface AppleSegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  soundEnabled?: boolean;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export function AppleSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  layoutId,
  soundEnabled = false,
  size = 'md',
  fullWidth = false,
}: AppleSegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-hairline)] ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onPointerDown={() => {
              if (!active) {
                onChange(opt.value);
                playAppleTick(soundEnabled, 'select');
              }
            }}
            className={`relative apple-press flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors ${
              fullWidth ? 'flex-1' : ''
            } ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm'} ${
              active
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={APPLE_SPRINGS.snappy}
                className="absolute inset-0 rounded-lg bg-[var(--bg-elevated)] shadow-sm border border-[var(--border-hairline)]"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 whitespace-nowrap">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
