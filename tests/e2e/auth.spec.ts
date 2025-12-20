import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display sign in page', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to sign in if not authenticated
    await expect(page).toHaveURL(/.*signin/);
    // Page uses a heading and a prominent 'Sign In' button — assert visible text/button
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
    // Use exact label to avoid matching the Google sign-in button
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  });

  test('should navigate to sign up page', async ({ page }) => {
    // Directly navigate to the signup route and assert the page renders
    await page.goto('/signup');
    await expect(page).toHaveURL(/.*signup/);
    // Sign-up page uses a "Create Account" heading and a "Create Account" button
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account', exact: true })).toBeVisible();
  });
});