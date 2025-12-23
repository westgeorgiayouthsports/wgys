import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { test as base, chromium, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PW_ADMIN_PASS;
// Load .env.local (if present) so PW_ADMIN_EMAIL/PW_ADMIN_PASS from env.local are available
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageDir = path.join(__dirname, '.auth');
const storagePath = path.join(storageDir, 'adminStorageState.json');

// Allow overriding base URL via env (falls back to Playwright default dev server)
const BASE_URL = process.env.PW_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

// Extend the base test to provide an automatic storageState fixture.
export const test = base.extend({
  // Override storageState so contexts created by Playwright use the saved auth state.
  // Use a per-browser storage file so storageState captured for Chromium doesn't
  // get re-used for Firefox/WebKit (which can be incompatible across engines).
  storageState: async ({ browser, browserName }, use) => {
    const perBrowserStoragePath = path.join(storageDir, `adminStorageState.${browserName}.json`);

    // If storage state already exists on disk for this browser, use it
    if (fs.existsSync(perBrowserStoragePath)) {
      await use(perBrowserStoragePath);
      return;
    }

    // If no admin creds provided, leave storageState undefined (tests can skip themselves)
    if (!ADMIN_EMAIL || !ADMIN_PASS) {
      await use(undefined);
      return;
    }

    // Ensure .auth directory exists
    try {
      fs.mkdirSync(storageDir, { recursive: true });
    } catch (e) {
      // ignore
    }

    // Create a browser context and sign in via UI to capture storage state
    const context = await browser.newContext();
    const page = await context.newPage();
    // Use absolute URL so this context (not the test-run page) can navigate
    await page.goto(`${BASE_URL}/signin`);

    // Fill credentials and sign in
    await page.fill('input[placeholder="Email address"]', ADMIN_EMAIL);
    await page.fill('input[placeholder="Password"]', ADMIN_PASS);
    await page.click('button:has-text("Sign In")');
    // Wait for dashboard redirect
    await page.waitForURL(/.*dashboard/);

    // Save storage state
    await context.storageState({ path: perBrowserStoragePath });
    await context.close();

    await use(perBrowserStoragePath);
  },
});

export { expect };
