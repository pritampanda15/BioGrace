/**
 * Apple Fluid Interfaces Physics Engine (WWDC 2018)
 * - Critically damped springs for UI chrome (damping 1.0, response 0.3-0.4)
 * - Momentum springs with subtle bounce only for gesture flicks (damping ~0.8)
 * - Exponential decay momentum projection (project)
 * - Progressive rubber-banding at soft boundaries (rubberband)
 * - Optional harmonized micro-tactile audio feedback
 */

export const APPLE_SPRINGS = {
  /** Default UI transition — critically damped, zero overshoot */
  criticallyDamped: {
    type: 'spring' as const,
    bounce: 0,
    duration: 0.4,
  },
  /** Snappy control / segmented pill — crisp settle */
  snappy: {
    type: 'spring' as const,
    bounce: 0,
    duration: 0.3,
  },
  /** Momentum-driven drag/flick — slight natural overshoot */
  momentum: {
    type: 'spring' as const,
    bounce: 0.2,
    duration: 0.38,
  },
  /** Drawer / bottom sheet — Apple shipped values (damping 0.8, response 0.3) */
  sheet: {
    type: 'spring' as const,
    bounce: 0.18,
    duration: 0.32,
  },
  /** Morph between plot states (e.g. Barplot -> Raincloud points) */
  plotMorph: {
    type: 'spring' as const,
    bounce: 0.08,
    duration: 0.46,
  },
};

/**
 * Apple's exact momentum projection function (Designing Fluid Interfaces, WWDC 2018).
 * Projects resting coordinate from release velocity (px/s) using exponential scroll decay.
 */
export function project(initialVelocityPxPerSec: number, decelerationRate = 0.998): number {
  return ((initialVelocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past soft boundaries (§9 Rubber-banding).
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Relative velocity normalization for spring handoff (§5).
 */
export function relativeVelocity(gestureVelocity: number, current: number, target: number): number {
  const distance = target - current;
  if (Math.abs(distance) < 1e-4) return 0;
  return gestureVelocity / distance;
}

/**
 * Pick nearest snap point from a projected momentum endpoint (§6).
 */
export function nearestSnapPoint(projectedValue: number, snapPoints: number[]): number {
  return snapPoints.reduce((best, candidate) =>
    Math.abs(candidate - projectedValue) < Math.abs(best - projectedValue) ? candidate : best
  );
}

/**
 * Harmonized subtle Web Audio tactile click (§13 Multimodal feedback).
 * Only plays when user explicitly enables sound feedback; fires synchronously on causal frame.
 */
let audioCtx: AudioContext | null = null;

export function playAppleTick(enabled: boolean, kind: 'snap' | 'select' | 'commit' = 'select'): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const freq = kind === 'commit' ? 660 : kind === 'snap' ? 420 : 520;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.62, now + 0.028);

    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch {
    // Audio unavailable; silently ignore
  }
}
