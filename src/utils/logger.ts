function logError(...args: any[]) {
  try {
    // Only emit error/debug logs when enabled. We cache the flag in localStorage
    // for fast sync; the canonical source is users/{uid}/preferences in RTDB.
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('wgys.debugLogging') : null;
    if (v !== '1') return;

    if (console && console.error) console.error(...args);
  } catch {
    // ignored
  }
}

function logInfo(...args: any[]) {
  try {
    // Info logs can be controlled separately from debug/error logs.
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem('wgys.infoLogging') : null;
    if (v !== '1') return;

    if (console && console.info) console.info(...args);
    else if (console && console.log) console.log(...args);
  } catch {
    // ignored
  }
}

export interface Logger {
  error: (...args: any[]) => void;
  info: (...args: any[]) => void;
}

const logger: Logger = {
  error: logError,
  info: logInfo,
};

export default logger;