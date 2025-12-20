import '@testing-library/jest-dom';

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
  auth: {},
  db: {},
}));

// Mock environment variables
process.env.VITE_FIREBASE_API_KEY = 'test-api-key';
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.VITE_FIREBASE_DATABASE_URL = 'https://test-default-rtdb.firebaseio.com';
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project';
process.env.VITE_FIREBASE_STORAGE_BUCKET = 'test.firebasestorage.app';
process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.VITE_FIREBASE_APP_ID = 'test-app-id';

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