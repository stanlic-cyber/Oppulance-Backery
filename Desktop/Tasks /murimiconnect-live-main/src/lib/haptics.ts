/**
 * Tiny haptics helper. Safely no-ops on unsupported devices.
 * Patterns chosen for subtle, native-feeling feedback.
 */
type Pattern = 'tap' | 'success' | 'warning' | 'error' | 'selection';

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 10,
  selection: 5,
  success: [12, 40, 18],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50, 60],
};

export function haptic(pattern: Pattern = 'tap') {
  try {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    // Respect reduced motion preferences
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    navigator.vibrate(PATTERNS[pattern]);
  } catch { /* ignore */ }
}
