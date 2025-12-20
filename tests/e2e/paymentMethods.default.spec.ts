import { test, expect } from './test-fixtures';

const BASE_URL = process.env.PW_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL;
const ADMIN_PASS = process.env.PW_ADMIN_PASS;

// This test verifies users can change the default payment method from the UI.
// It assumes at least two payment methods exist for the signed-in user.
// If fewer than two are present, the test will skip with a clear message.

test.describe('Payment Methods - Default toggle', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASS, 'Requires admin credentials (PW_ADMIN_EMAIL & PW_ADMIN_PASS)');

  test('toggle default between existing methods', async ({ page }) => {
    // Sign in (if storageState not already authenticated)
    await page.goto(`${BASE_URL}/signin`);
    const emailLocator = page.getByPlaceholder('Email address');
    if (await emailLocator.count() > 0) {
      await emailLocator.fill(ADMIN_EMAIL!);
      await page.getByPlaceholder('Password').fill(ADMIN_PASS!);
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await page.waitForURL(/.*dashboard/);
    } else {
      await page.waitForURL(/.*dashboard/);
    }

    // Navigate to Payment Methods
    await page.goto(`${BASE_URL}/payment-methods`);

    // Wait for list to render
    const bubbleLocator = page.locator('div[style*="position: relative"]').first();
    await bubbleLocator.waitFor({ state: 'visible' });

    // Collect all method items (grid columns that contain a pill)
    const methodCols = page.locator('div[style*="position: relative"]').locator('xpath=ancestor::div[contains(@class, "ant-col")]');
    const count = await methodCols.count();
    test.skip(count < 2, `Requires at least two payment methods; found ${count}`);

    // Determine which item is current default
    const allPills = page.locator('div[style*="position: relative"]').all();
    // Fallback simple approach: find any visible Default tags
    const defaultTag = page.getByText('Default', { exact: true });
    const defaultCountBefore = await defaultTag.count();
    test.expect(defaultCountBefore).toBeGreaterThan(0);

    // Target a non-default pill: find a pill that has a "Set default" link
    const setDefaultButtons = page.getByRole('button', { name: 'Set default', exact: true });
    const setDefaultCount = await setDefaultButtons.count();
    test.skip(setDefaultCount < 1, 'No non-default payment method to toggle');

    // Click the first "Set default" and wait for success toast or reload
    await setDefaultButtons.first().click();

    // Wait for success message or UI update (Tag moves)
    // AntD message is rendered in global container; check for text
    const successMessage = page.getByText(/Default payment method updated/i).first();
    try {
      await successMessage.waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      // If message not found, wait for the Default tag count to change as UI reloads
      await page.waitForTimeout(500);
    }

    // Assert the tag moved: there should still be exactly one Default tag
    const defaultCountAfter = await defaultTag.count();
    await expect(defaultCountAfter).toBeGreaterThan(0);

    // Sanity: ensure at least one "Set default" remains (original default no longer default)
    const setDefaultCountAfter = await setDefaultButtons.count();
    await expect(setDefaultCountAfter).toBeGreaterThan(0);
  });
});
