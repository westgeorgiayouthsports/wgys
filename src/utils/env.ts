// Safe environment accessor for both browser (Vite) and Jest/Node.
// Strongly typed: restrict `name` to keys present on the compile-time
// `__VITE_ENV__` declaration and return `string | undefined`.
import type { ViteEnv } from '../types/viteEnv';
import logger from './logger';

type ViteEnvKeys = keyof ViteEnv;

export function getEnv<K extends ViteEnvKeys>(name: K): string | undefined {
  try {
    if (typeof process !== 'undefined' && (process.env as any)[name]) {
      return (process.env as any)[name];
    }
  } catch {
    // ignore
  }
  try {
    const g = (globalThis as any).__VITE_ENV__ || (globalThis as any).__vite_env__;
    if (g && g[name]) return g[name];
  } catch (e) {
    logger.error('Error accessing process.env for', name, e);
  }
  return undefined;
}

export default getEnv;
