/**
 * Lightweight client error logger.
 * Captures uncaught errors and unhandled promise rejections,
 * keeps a rolling in-memory ring buffer, and best-effort persists
 * to localStorage so we can surface them in support diagnostics.
 *
 * Designed to be Sentry-compatible — swap `flush()` to POST to a real
 * collector when desired, without touching call sites.
 */

export interface AppErrorEvent {
  ts: number;
  type: 'error' | 'rejection' | 'react' | 'manual';
  message: string;
  stack?: string;
  url?: string;
  componentStack?: string;
}

const MAX = 50;
const STORAGE_KEY = 'mc.errorlog';

let buffer: AppErrorEvent[] = [];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) buffer = JSON.parse(raw).slice(-MAX);
  } catch { /* ignore */ }
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(buffer.slice(-MAX))); } catch { /* ignore */ }
}

export function logError(event: Omit<AppErrorEvent, 'ts' | 'url'> & { url?: string }) {
  const entry: AppErrorEvent = {
    ts: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    ...event,
  };
  buffer.push(entry);
  if (buffer.length > MAX) buffer = buffer.slice(-MAX);
  persist();
  // Always echo to console for dev visibility
  console.error(`[${entry.type}]`, entry.message, entry.stack || '');
}

export function getRecentErrors(): AppErrorEvent[] {
  return [...buffer];
}

export function clearErrors() {
  buffer = [];
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/**
 * Sentry-compatible flush. Sends buffered errors to a configured collector
 * URL via beacon (best-effort, non-blocking). Returns count flushed.
 * Currently a no-op unless `window.__ERROR_SINK_URL__` is set; designed so
 * we can wire a real endpoint later without touching call sites.
 */
export function flushErrors(): number {
  if (!buffer.length) return 0;
  const url = (window as any).__ERROR_SINK_URL__ as string | undefined;
  if (!url) return 0;
  try {
    const payload = JSON.stringify({ events: buffer });
    const blob = new Blob([payload], { type: 'application/json' });
    const ok = navigator.sendBeacon?.(url, blob);
    if (ok) {
      const n = buffer.length;
      clearErrors();
      return n;
    }
  } catch { /* ignore */ }
  return 0;
}

let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  load();

  window.addEventListener('error', (e) => {
    logError({
      type: 'error',
      message: e.message || 'Unknown error',
      stack: e.error?.stack,
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason: any = e.reason;
    logError({
      type: 'rejection',
      message: typeof reason === 'string' ? reason : (reason?.message || 'Unhandled promise rejection'),
      stack: reason?.stack,
    });
  });

  // Flush on page hide for Sentry-style delivery guarantees
  window.addEventListener('pagehide', () => { flushErrors(); });
}

