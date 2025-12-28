import logger from "./logger";

// Lightweight preference cache helpers for wgys.pref.* localStorage keys
export function getCachedPref<T = any>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`wgys.pref.${key}`);
    if (raw === null || raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      logger.error(e);
      // not JSON, return raw as string/primitive
      return (raw as unknown) as T;
    }
  } catch (e) {
    logger.error(e);
    return null;
  }
}

export function setCachedPref<T = any>(key: string, value: T): void {
  try {
    if (value === undefined) {
      localStorage.removeItem(`wgys.pref.${key}`);
      return;
    }
    const toStore = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : JSON.stringify(value);
    localStorage.setItem(`wgys.pref.${key}`, toStore);
  } catch (e) {
    logger.error(e);
  }
}

// Async helper: if cached value exists return it; otherwise call fallback(), cache, and return result.
export async function getPrefWithFallback<T = any>(key: string, fallback?: () => Promise<T | null | undefined>): Promise<T | null> {
  const cached = getCachedPref<T>(key);
  if (cached !== null) return cached;
  if (!fallback) return null;
  try {
    const v = await fallback();
    if (v !== undefined) setCachedPref(key, v as any);
    return (v as T) ?? null;
  } catch (e) {
    logger.error(e);
    return null;
  }
}

export default {
  getCachedPref,
  setCachedPref,
  getPrefWithFallback,
};
