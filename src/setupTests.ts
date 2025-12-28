import '@testing-library/jest-dom';

// Silence noisy React act() warnings from third-party async flows we don't control
// in tests by filtering that specific message. This keeps test output clean while
// still allowing other console.error messages to surface.
const _origConsoleError = console.error;
console.error = (...args: any[]) => {
  try {
    const first = String(args[0] || '');
    if (first.includes('An update to') && first.includes('inside a test was not wrapped in act')) {
      return;
    }
    // Suppress known non-actionable Ant Design deprecation warnings during tests
    // if (first.includes('[antd: Tabs]') && first.includes('TabPane')) {
    //   return;
    // }
  } catch {
    // swallow parsing errors and fall through to original
  }
  _origConsoleError.apply(console, args as any);
};

if (!window.matchMedia) {
  // Minimal mock for Ant Design responsive hooks
  window.matchMedia = function matchMedia(query: string): MediaQueryList {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},            // deprecated
      removeListener: () => {},         // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  };
}

// Polyfill MessageChannel for AntD/@rc-component select
if (typeof (globalThis as any).MessageChannel === 'undefined') {
  (globalThis as any).MessageChannel = class {
    port1 = {
      postMessage: () => {},
      onmessage: null,
      close: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      start: () => {},
    };
    port2 = {
      postMessage: () => {},
      onmessage: null,
      close: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      start: () => {},
    };
  } as any;
}

// Mock Firebase
jest.mock('./services/firebase', () => ({
  auth: {
    // Minimal async signOut used by App geo flow tests
    signOut: async () => {},
  },
  db: {},
}));

// Mock firebase/database functions used by services so tests don't need a live RTDB
jest.mock('firebase/database', () => {
  const snapshotFalse = { exists: () => false, val: () => null };
  return {
    ref: (_db: any, _path: string) => ({ path: _path }),
    get: async (_ref: any) => snapshotFalse,
    set: async (_ref: any, _value: any) => ({}),
    update: async (_ref: any, _value: any) => ({}),
    remove: async (_ref: any) => ({}),
    query: (_ref: any, ..._args: any[]) => _ref,
    orderByChild: (k: string) => k,
    equalTo: (v: any) => v,
  };
});

// Provide a simple global fetch mock to prevent "fetch is not defined" in jsdom/node
// Default global fetch returns a North American country so geo checks pass in tests.
if (typeof (globalThis as any).fetch === 'undefined') {
  (globalThis as any).fetch = jest.fn(async (_input: any, _init?: any) => {
    // Simple shape matching the ipapi.co/json/ response used by App
    return {
      ok: true,
      json: async () => ({ country_code: 'US' }),
    };
  });
}

// Mock environment variables
process.env.VITE_FIREBASE_API_KEY = 'test-api-key';
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.VITE_FIREBASE_DATABASE_URL = 'https://test-default-rtdb.firebaseio.com';
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project';
process.env.VITE_FIREBASE_STORAGE_BUCKET = 'test.firebasestorage.app';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.VITE_FIREBASE_APP_ID = 'test-app-id';

// Expose a Vite-like runtime env shim for code paths that read from
// `globalThis.__VITE_ENV__` (getEnv helper relies on this). This keeps
// tests consistent with the browser runtime shim we add in `main.tsx`.
(globalThis as any).__VITE_ENV__ = process.env;
(globalThis as any).__vite_env__ = process.env;

// jsdom in Node may not provide TextEncoder/TextDecoder used by some libs
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Minimal ResizeObserver polyfill for tests (some antd internals rely on it)
if (typeof (global as any).ResizeObserver === 'undefined') {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (global as any).ResizeObserver = ResizeObserverPolyfill;
}