import { test, expect } from './test-fixtures';

const BASE_URL = process.env.PW_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

// Require admin creds via environment variables to run this test.
const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PW_ADMIN_PASS;

test.describe('Programs Date Picker', () => {
  // Skip the test if admin credentials are not provided
  test.skip(!ADMIN_EMAIL || !ADMIN_PASS, 'Requires admin credentials (PW_ADMIN_EMAIL & PW_ADMIN_PASS)');

  test('user can pick a date and submit the form', async ({ page }) => {
    // Sign in via UI to get an authenticated session (skip if storageState already logged-in)
    await page.goto(`${BASE_URL}/signin`);
    const emailLocator = page.getByPlaceholder('Email address');
    if (await emailLocator.count() > 0) {
      await emailLocator.fill(ADMIN_EMAIL!);
      await page.getByPlaceholder('Password').fill(ADMIN_PASS!);
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      // Wait for dashboard or redirect
      await page.waitForURL(/.*dashboard/);
    } else {
      // Already signed in (storageState used) — wait for dashboard to ensure app is ready
      await page.waitForURL(/.*dashboard/);
    }

    // Go to Programs page
    await page.goto(`${BASE_URL}/programs`);

    // Click the Add Program button (UI shows "Add Program")
    await page.getByRole('button', { name: /add program/i }).click();

    // Fill in the name field
    await page.getByLabel('Program Name').fill('Test Program');

    // Select required dropdowns: Sport and Sex (robustly handle AntD overlay)
    const chooseSelectOption = async (label: string, optionText: string) => {
      await page.getByLabel(label).click();
      const option = page.getByRole('option', { name: new RegExp(optionText, 'i') });
      try {
        await option.waitFor({ state: 'attached', timeout: 2000 });
        await option.scrollIntoViewIfNeeded();
        await option.click({ timeout: 2000 });
      } catch (e) {
        // Fallback 1: try keyboard selection (ArrowDown + Enter)
        try {
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
          return;
        } catch {}

        // Fallback 2: click via DOM evaluate if Playwright deems it not visible/stable
        const fallback = page.locator('div[role="option"]', { hasText: optionText }).first();
        try {
          await fallback.evaluate((el: HTMLElement) => (el as HTMLElement).click());
        } catch (err) {
          // Last resort: force click
          await fallback.click({ force: true });
        }
      }
    };

    await chooseSelectOption('Sport', 'Baseball');
    await chooseSelectOption('Sex', 'Co');

    // Interact with the registration date picker
    // Open the registration start picker then choose a day (today + 2)
    await page.getByLabel('Registration Start').click();
    const today = new Date();
    const day = String(today.getDate() + 2);
    const dayCell = page.locator('.ant-picker-cell-inner', { hasText: day }).first();
    await dayCell.waitFor({ state: 'attached', timeout: 5000 });
    await dayCell.click({ timeout: 10000 });

    // Submit the form
    // Fill required base price
    await page.getByLabel('Base Price ($)').fill('0.00');
    await page.getByRole('button', { name: /create program/i }).click();

    // Wait for the programs table to update and show the new program
    const programRow = page.getByText('Test Program').first();
    await programRow.waitFor({ state: 'visible', timeout: 10000 });
    await expect(programRow).toBeVisible({ timeout: 10000 });
  });
});
